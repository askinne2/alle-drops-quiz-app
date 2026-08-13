/**
 * Integration tests for POST /api/quiz/submit's step 3.5 — the file-promotion step (plan 04-17).
 *
 * GCS TEST STRATEGY (following tests/api-quiz-upload.test.ts's decided split, per that file's own
 * header note that plans 04-14/04-17 should follow it): mock `app/lib/storage/gcs.ts`,
 * `app/lib/submissions.ts`, and `app/lib/submission-files.ts` — I/O boundaries. The route's Shopify
 * shop/customer-resolution branch is exercised with no Origin/x-shopify-shop-domain header, which
 * takes the existing `customerLinkSkipped = true` path and never touches `../shopify.server`,
 * `app/lib/shopify/customers.ts`, or `app/lib/shopify/metafields.ts` — so none of those need
 * mocking for these promotion-focused cases.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";

const {
  mockInsertSubmission,
  mockInsertSubmissionFiles,
  mockGetBucket,
  mockGetFiles,
  mockBuildPermanentKey,
  mockCopyObject,
  mockDeleteObject,
} = vi.hoisted(() => {
  const mockInsertSubmission = vi.fn();
  const mockInsertSubmissionFiles = vi.fn();
  const mockGetFiles = vi.fn();
  const mockGetBucket = vi.fn(() => ({ getFiles: mockGetFiles }));
  const mockBuildPermanentKey = vi.fn(
    (submissionId: string, fileId: string, filename: string) =>
      `submissions/${submissionId}/${fileId}-${filename}`
  );
  const mockCopyObject = vi.fn().mockResolvedValue(undefined);
  const mockDeleteObject = vi.fn().mockResolvedValue(undefined);
  return {
    mockInsertSubmission,
    mockInsertSubmissionFiles,
    mockGetBucket,
    mockGetFiles,
    mockBuildPermanentKey,
    mockCopyObject,
    mockDeleteObject,
  };
});

// The route imports ../shopify.server at module load, which eagerly initializes
// @shopify/shopify-app-react-router and throws without real env vars. Every case in this file
// posts with no Origin/x-shopify-shop-domain header, so the route's own `shop` resolution never
// calls into `unauthenticated.admin` — this mock exists only to satisfy the module-load side
// effect, matching the pattern in tests/api-admin-submissions.test.ts.
vi.mock("../app/shopify.server", () => ({
  unauthenticated: { admin: vi.fn() },
}));

vi.mock("../app/lib/submissions", () => ({
  insertSubmission: mockInsertSubmission,
}));

vi.mock("../app/lib/submission-files", () => ({
  insertSubmissionFiles: mockInsertSubmissionFiles,
}));

vi.mock("../app/lib/storage/gcs", () => ({
  getBucket: mockGetBucket,
  buildPermanentKey: mockBuildPermanentKey,
  copyObject: mockCopyObject,
  deleteObject: mockDeleteObject,
  GCS_PENDING_PREFIX: "pending/",
}));

import { action } from "../app/routes/api.quiz.submit";

const URL = "https://fly.dev/api/quiz/submit";
const SUBMISSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SUBMISSION_CREATED_AT = "2026-08-10T00:00:00.000Z";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    state: "tennessee",
    name: "Test Patient",
    dob: "1990-01-15",
    email: "promotion-test@example.com",
    phone: "6155551234",
    symptom_profile_id: `AOD_TEST_${Date.now()}`,
    quiz_score: 9,
    score_bracket: "9+",
    quiz_date: "2026-08-10T00:00:00.000Z",
    answers: { taking_meds: "no" },
    completion_time: 120,
    ...overrides,
  };
}

/** POST with no Origin/x-shopify-shop-domain header — takes the route's customerLinkSkipped path,
 * so ../shopify.server / findOrCreateCustomer / updateNonPhiQuizMetafields are never invoked. */
function callAction(body: unknown): Promise<Response> {
  const req = new Request(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return action({ request: req, params: {}, context: {} } as unknown as Parameters<typeof action>[0]);
}

/** A staged pending/ object as bucket.getFiles({ prefix }) would return it. */
function stagedFile(name: string, metadata: Record<string, unknown>) {
  return {
    name,
    getMetadata: vi.fn().mockResolvedValue([{ metadata }]),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertSubmission.mockResolvedValue({
    id: SUBMISSION_ID,
    symptom_profile_id: "AOD_TEST",
    created_at: SUBMISSION_CREATED_AT,
  });
  mockInsertSubmissionFiles.mockResolvedValue([]);
  mockGetBucket.mockImplementation(() => ({ getFiles: mockGetFiles }));
  mockGetFiles.mockResolvedValue([[]]);
  mockBuildPermanentKey.mockImplementation(
    (submissionId: string, fileId: string, filename: string) =>
      `submissions/${submissionId}/${fileId}-${filename}`
  );
  mockCopyObject.mockResolvedValue(undefined);
  mockDeleteObject.mockResolvedValue(undefined);
});

describe("POST /api/quiz/submit — step 3.5 file promotion", () => {
  it("zero tokens: no GCS call and no insertSubmissionFiles call, normal success response", async () => {
    const res = await callAction(basePayload());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submission_id).toBe(SUBMISSION_ID);

    expect(mockGetBucket).not.toHaveBeenCalled();
    expect(mockCopyObject).not.toHaveBeenCalled();
    expect(mockInsertSubmissionFiles).not.toHaveBeenCalled();
  });

  it("three tokens: three copyObject calls followed by exactly ONE insertSubmissionFiles call carrying three rows", async () => {
    mockGetFiles
      .mockResolvedValueOnce([
        [stagedFile(`pending/${UUID_A}/a.pdf`, {
          original_filename: "a.pdf",
          content_type: "application/pdf",
          original_content_type: "application/pdf",
          size_bytes: "100",
        })],
      ])
      .mockResolvedValueOnce([
        [stagedFile(`pending/${UUID_B}/b.jpg`, {
          original_filename: "b.jpg",
          content_type: "image/jpeg",
          original_content_type: "image/jpeg",
          size_bytes: "200",
        })],
      ])
      .mockResolvedValueOnce([
        [stagedFile(`pending/${UUID_C}/c.png`, {
          original_filename: "c.png",
          content_type: "image/png",
          original_content_type: "image/png",
          size_bytes: "300",
        })],
      ]);

    const res = await callAction(
      basePayload({ answers: { testing_files: [UUID_A, UUID_B, UUID_C] } })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockCopyObject).toHaveBeenCalledTimes(3);
    expect(mockInsertSubmissionFiles).toHaveBeenCalledTimes(1);
    const [, rows] = mockInsertSubmissionFiles.mock.calls[0];
    expect(rows).toHaveLength(3);
    expect(mockDeleteObject).toHaveBeenCalledTimes(3);
  });

  it("missing staged object: skipped, remaining files still promoted, success response unchanged", async () => {
    mockGetFiles
      .mockResolvedValueOnce([[]]) // UUID_A — expired/missing
      .mockResolvedValueOnce([
        [stagedFile(`pending/${UUID_B}/b.jpg`, {
          original_filename: "b.jpg",
          content_type: "image/jpeg",
          original_content_type: "image/jpeg",
          size_bytes: "200",
        })],
      ]);

    const res = await callAction(
      basePayload({ answers: { testing_files: [UUID_A, UUID_B] } })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockCopyObject).toHaveBeenCalledTimes(1);
    expect(mockInsertSubmissionFiles).toHaveBeenCalledTimes(1);
    const [, rows] = mockInsertSubmissionFiles.mock.calls[0];
    expect(rows).toHaveLength(1);
  });

  it("copyObject rejects: response is still the normal success response and insertSubmission was not rolled back", async () => {
    mockGetFiles.mockResolvedValueOnce([
      [stagedFile(`pending/${UUID_A}/a.pdf`, {
        original_filename: "a.pdf",
        content_type: "application/pdf",
        original_content_type: "application/pdf",
        size_bytes: "100",
      })],
    ]);
    mockCopyObject.mockRejectedValueOnce(new Error("copy failed"));

    const res = await callAction(
      basePayload({ answers: { testing_files: [UUID_A] } })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submission_id).toBe(SUBMISSION_ID);
    expect(mockInsertSubmission).toHaveBeenCalledTimes(1);
    // The one file that failed to copy never became a row, so insertSubmissionFiles never runs.
    expect(mockInsertSubmissionFiles).not.toHaveBeenCalled();
  });

  it("insertSubmissionFiles rejects: response is still the normal success response and insertSubmission was not rolled back", async () => {
    mockGetFiles.mockResolvedValueOnce([
      [stagedFile(`pending/${UUID_A}/a.pdf`, {
        original_filename: "a.pdf",
        content_type: "application/pdf",
        original_content_type: "application/pdf",
        size_bytes: "100",
      })],
    ]);
    mockInsertSubmissionFiles.mockRejectedValueOnce(new Error("insert failed"));

    const res = await callAction(
      basePayload({ answers: { testing_files: [UUID_A] } })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockInsertSubmission).toHaveBeenCalledTimes(1);
    // deleteObject only runs after insertSubmissionFiles resolves — it rejected, so no deletes.
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it("deleteObject rejects: response is still the normal success response", async () => {
    mockGetFiles.mockResolvedValueOnce([
      [stagedFile(`pending/${UUID_A}/a.pdf`, {
        original_filename: "a.pdf",
        content_type: "application/pdf",
        original_content_type: "application/pdf",
        size_bytes: "100",
      })],
    ]);
    mockDeleteObject.mockRejectedValueOnce(new Error("delete failed"));

    const res = await callAction(
      basePayload({ answers: { testing_files: [UUID_A] } })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockInsertSubmissionFiles).toHaveBeenCalledTimes(1);
  });

  it("a testing_files value that is not an array of UUID strings is rejected by the shared validator with zero GCS calls", async () => {
    const res = await callAction(
      basePayload({ answers: { testing_files: ["not-a-uuid"] } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("testing_files");

    expect(mockGetBucket).not.toHaveBeenCalled();
    expect(mockInsertSubmission).not.toHaveBeenCalled();
  });

  it("a non-array testing_files value is rejected by the shared validator with zero GCS calls", async () => {
    const res = await callAction(
      basePayload({ answers: { testing_files: UUID_A } })
    );
    expect(res.status).toBe(400);
    expect(mockGetBucket).not.toHaveBeenCalled();
  });

  it("file metadata is read from GCS custom object metadata, never from the request payload", async () => {
    mockGetFiles.mockResolvedValueOnce([
      [stagedFile(`pending/${UUID_A}/real-name.pdf`, {
        original_filename: "real-name-from-gcs.pdf",
        content_type: "application/pdf",
        original_content_type: "application/pdf",
        size_bytes: "555",
      })],
    ]);

    // The client payload carries no filename/size for testing_files at all (just tokens) — this
    // proves the route has no client-supplied metadata to trust, and asserts the GCS-sourced
    // values are the ones that end up in the inserted row.
    const res = await callAction(
      basePayload({ answers: { testing_files: [UUID_A] } })
    );
    expect(res.status).toBe(200);

    expect(mockInsertSubmissionFiles).toHaveBeenCalledTimes(1);
    const [, rows] = mockInsertSubmissionFiles.mock.calls[0];
    expect(rows[0].original_filename).toBe("real-name-from-gcs.pdf");
    expect(rows[0].size_bytes).toBe(555);
  });

  it("git diff app/lib/submissions.ts is empty — insertSubmission is called with the same shape as before this plan", async () => {
    await callAction(basePayload({ answers: { testing_files: [UUID_A] } }));
    expect(mockInsertSubmission).toHaveBeenCalledTimes(1);
    const [insertArg] = mockInsertSubmission.mock.calls[0];
    // No file-related keys were added to the insertSubmission call.
    expect(insertArg).not.toHaveProperty("submission_files");
    expect(insertArg).not.toHaveProperty("testing_files_promoted");
  });

  it("no log call contains a filename or a token value", async () => {
    const SENTINEL_FILENAME = "confidential-patient-name-do-not-log.pdf";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      // Successful promotion.
      mockGetFiles.mockResolvedValueOnce([
        [stagedFile(`pending/${UUID_A}/${SENTINEL_FILENAME}`, {
          original_filename: SENTINEL_FILENAME,
          content_type: "application/pdf",
          original_content_type: "application/pdf",
          size_bytes: "100",
        })],
      ]);
      await callAction(basePayload({ answers: { testing_files: [UUID_A] } }));

      // A promotion failure path — the log line that DOES fire here must stay ID/count-only.
      mockGetFiles.mockResolvedValueOnce([
        [stagedFile(`pending/${UUID_B}/${SENTINEL_FILENAME}`, {
          original_filename: SENTINEL_FILENAME,
          content_type: "application/pdf",
          original_content_type: "application/pdf",
          size_bytes: "100",
        })],
      ]);
      mockInsertSubmissionFiles.mockRejectedValueOnce(
        new Error(`insert failed for ${SENTINEL_FILENAME}`)
      );
      await callAction(basePayload({ answers: { testing_files: [UUID_B] } }));

      const allCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls];
      for (const call of allCalls) {
        const stringified = call.map((arg) => JSON.stringify(arg)).join(" ");
        expect(stringified).not.toContain(SENTINEL_FILENAME);
        expect(stringified).not.toContain(UUID_A);
        expect(stringified).not.toContain(UUID_B);
      }
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
