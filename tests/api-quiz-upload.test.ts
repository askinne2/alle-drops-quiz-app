/**
 * Integration tests for POST /api/quiz/upload — the only route that accepts binary PHI.
 *
 * GCS TEST STRATEGY (decided here, per 04-VALIDATION.md's instruction that the planner pick ONE
 * strategy so no later executor has to choose): mock `app/lib/storage/gcs.ts` and
 * `app/lib/storage/heic.ts` with `vi.mock`. Do NOT use `STORAGE_EMULATOR_HOST` / `fake-gcs-server`
 * — every existing route test in this repo mocks its lib dependencies directly (see
 * tests/assessments-ledger.test.ts, tests/storage-gcs.test.ts) and none stands up a service, and a
 * live emulator adds a moving part to a suite whose whole value is a sub-20-second feedback loop.
 *
 * `app/lib/storage/upload-validation.ts` (sniffType/isAllowedType/effectiveContentType and the
 * ratified size constants) is deliberately used FOR REAL, not mocked. It is pure, deterministic,
 * has zero I/O, and is the exact security boundary the spoofing case (case 5) and the two cap
 * cases (6, 7) exist to prove — mocking it would mean testing a hand-rolled stand-in for the logic
 * under test instead of the logic itself. Plans 04-14/04-17 should follow this same split: mock
 * gcs.ts/heic.ts (I/O and native-library boundaries), use upload-validation.ts for real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSave,
  mockFile,
  mockBucket,
  mockGetBucket,
  mockBuildPendingKey,
  mockSanitizeObjectName,
  mockHeicBufferToJpeg,
} = vi.hoisted(() => {
  const mockSave = vi.fn().mockResolvedValue(undefined);
  const mockFile = vi.fn(() => ({ save: mockSave }));
  const mockBucket = { file: mockFile };
  const mockGetBucket = vi.fn(() => mockBucket);
  const mockBuildPendingKey = vi.fn(
    (token: string, filename: string) => `pending/${token}/${filename}`
  );
  const mockSanitizeObjectName = vi.fn((name: unknown) =>
    typeof name === "string" ? name.replace(/[/\\]/g, "_") : "unnamed"
  );
  const mockHeicBufferToJpeg = vi.fn();
  return {
    mockSave,
    mockFile,
    mockBucket,
    mockGetBucket,
    mockBuildPendingKey,
    mockSanitizeObjectName,
    mockHeicBufferToJpeg,
  };
});

vi.mock("../app/lib/storage/gcs", () => ({
  getBucket: mockGetBucket,
  buildPendingKey: mockBuildPendingKey,
  sanitizeObjectName: mockSanitizeObjectName,
}));

vi.mock("../app/lib/storage/heic", () => ({
  heicBufferToJpeg: mockHeicBufferToJpeg,
}));

import { action } from "../app/routes/api.quiz.upload";
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "../app/lib/storage/upload-validation";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL = "https://fly.dev/api/quiz/upload";

/** Copies a Buffer/Uint8Array's bytes into a fresh, plain ArrayBuffer-backed Uint8Array so it
 * satisfies BlobPart's stricter `ArrayBufferView<ArrayBuffer>` type (Buffer's backing store is
 * typed as ArrayBufferLike, which admits SharedArrayBuffer and doesn't structurally match). */
function toBlobPart(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

function pdfBytes(): Buffer {
  return Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(16, 0x20)]);
}

function heicBytes(): Buffer {
  // ftyp box header (bytes 4-7) + "heic" brand (bytes 8-11) — the only structure sniffType reads.
  return Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00,
  ]);
}

function makePostRequest(formData: FormData | null): Request {
  return new Request(URL, {
    method: "POST",
    body: formData ?? undefined,
  });
}

function callAction(request: Request) {
  return action({ request, params: {}, context: {} } as unknown as Parameters<typeof action>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
  mockFile.mockImplementation(() => ({ save: mockSave }));
  mockGetBucket.mockImplementation(() => mockBucket);
  mockBuildPendingKey.mockImplementation(
    (token: string, filename: string) => `pending/${token}/${filename}`
  );
  mockSanitizeObjectName.mockImplementation((name: unknown) =>
    typeof name === "string" ? name.replace(/[/\\]/g, "_") : "unnamed"
  );
  mockHeicBufferToJpeg.mockReset();
});

describe("POST /api/quiz/upload", () => {
  it("case 1: OPTIONS returns 204 with CORS headers", async () => {
    const res = await callAction(new Request(URL, { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("case 2: GET (non-POST) returns 405 with a generic body", async () => {
    const res = await callAction(new Request(URL, { method: "GET" }));
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body).toEqual({ error: "Method not allowed" });
  });

  it("case 3: a valid small PDF returns 200 with exactly {token, contentType, sizeBytes}", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([toBlobPart(pdfBytes())], { type: "application/pdf" }), "results.pdf");

    const res = await callAction(makePostRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual(["contentType", "sizeBytes", "token"]);
  });

  it("case 4: contentType is application/pdf and token matches UUID v4", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([toBlobPart(pdfBytes())], { type: "application/pdf" }), "results.pdf");

    const res = await callAction(makePostRequest(fd));
    const body = await res.json();

    expect(body.contentType).toBe("application/pdf");
    expect(body.token).toMatch(UUID_V4);
    expect(body.sizeBytes).toBe(pdfBytes().length);
  });

  it("case 5: spoofed .pdf (ASCII bytes, declared application/pdf) is rejected and GCS is never written", async () => {
    const fd = new FormData();
    fd.append(
      "file",
      new Blob([toBlobPart(Buffer.from("this is plain ascii text, not a real pdf at all"))], {
        type: "application/pdf",
      }),
      "results.pdf"
    );

    const res = await callAction(makePostRequest(fd));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body).toEqual({ error: "Unsupported file type" });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("case 6: MaxFileSizeExceededError maps to 413 File too large", async () => {
    const fd = new FormData();
    const oversized = Buffer.alloc(MAX_FILE_BYTES + 1, 0x41);
    fd.append("file", new Blob([toBlobPart(oversized)], { type: "application/pdf" }), "big.pdf");

    const res = await callAction(makePostRequest(fd));
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body).toEqual({ error: "File too large" });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("case 7: MaxTotalSizeExceededError maps to 413 Total upload size exceeded", async () => {
    const fd = new FormData();
    // Four fields, each under MAX_FILE_BYTES individually, summing well past MAX_TOTAL_BYTES —
    // trips the aggregate cap without any single part tripping the per-file cap first.
    const padSize = Math.floor(MAX_TOTAL_BYTES / 4) + 1024 * 1024;
    expect(padSize).toBeLessThan(MAX_FILE_BYTES);
    for (let i = 0; i < 4; i++) {
      fd.append(`pad${i}`, "A".repeat(padSize));
    }

    const res = await callAction(makePostRequest(fd));
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body).toEqual({ error: "Total upload size exceeded" });
    expect(mockSave).not.toHaveBeenCalled();
  }, 20000);

  it("case 8: a GCS write rejection maps to 500 and leaks nothing about the failure", async () => {
    mockSave.mockRejectedValueOnce(
      new Error("write failed for object pending/deadbeef/patient-jane-doe.pdf in bucket alledrops-quiz-uploads-dev")
    );

    const fd = new FormData();
    fd.append("file", new Blob([toBlobPart(pdfBytes())], { type: "application/pdf" }), "patient-jane-doe.pdf");

    const res = await callAction(makePostRequest(fd));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Could not upload file" });

    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("patient-jane-doe.pdf");
    expect(bodyText).not.toContain("pending/deadbeef");
    expect(bodyText).not.toContain("alledrops-quiz-uploads-dev");
    expect(bodyText).not.toContain("write failed for object");
  });

  it("case 9: a HEIC part is converted to JPEG, with original_content_type: image/heic in GCS metadata", async () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    mockHeicBufferToJpeg.mockResolvedValue({ ok: true, jpeg: jpegBuffer });

    const fd = new FormData();
    fd.append("file", new Blob([toBlobPart(heicBytes())], { type: "image/heic" }), "photo.heic");

    const res = await callAction(makePostRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contentType).toBe("image/jpeg");
    expect(body.sizeBytes).toBe(jpegBuffer.length);

    expect(mockHeicBufferToJpeg).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    const [, saveOptions] = mockSave.mock.calls[0];
    expect(saveOptions.metadata.contentType).toBe("image/jpeg");
    expect(saveOptions.metadata.metadata.content_type).toBe("image/jpeg");
    expect(saveOptions.metadata.metadata.original_content_type).toBe("image/heic");
  });

  it("case 10: no filename reaches console.log or console.error across every scenario", async () => {
    const SENTINEL_FILENAME = "confidential-patient-name-do-not-log.pdf";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      // Successful upload.
      const okForm = new FormData();
      okForm.append(
        "file",
        new Blob([toBlobPart(pdfBytes())], { type: "application/pdf" }),
        SENTINEL_FILENAME
      );
      await callAction(makePostRequest(okForm));

      // Spoofed type rejection.
      const spoofForm = new FormData();
      spoofForm.append(
        "file",
        new Blob([toBlobPart(Buffer.from("not a real pdf"))], { type: "application/pdf" }),
        SENTINEL_FILENAME
      );
      await callAction(makePostRequest(spoofForm));

      // Oversized rejection.
      const bigForm = new FormData();
      bigForm.append(
        "file",
        new Blob([toBlobPart(Buffer.alloc(MAX_FILE_BYTES + 1, 0x41))], { type: "application/pdf" }),
        SENTINEL_FILENAME
      );
      await callAction(makePostRequest(bigForm));

      // GCS failure.
      mockSave.mockRejectedValueOnce(new Error(`failed writing ${SENTINEL_FILENAME}`));
      const failForm = new FormData();
      failForm.append(
        "file",
        new Blob([toBlobPart(pdfBytes())], { type: "application/pdf" }),
        SENTINEL_FILENAME
      );
      await callAction(makePostRequest(failForm));

      // HEIC success.
      mockHeicBufferToJpeg.mockResolvedValue({
        ok: true,
        jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      });
      const heicForm = new FormData();
      heicForm.append("file", new Blob([toBlobPart(heicBytes())], { type: "image/heic" }), SENTINEL_FILENAME);
      await callAction(makePostRequest(heicForm));

      const allCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls];
      expect(allCalls.length).toBeGreaterThan(0);
      for (const call of allCalls) {
        const stringified = call.map((arg) => JSON.stringify(arg)).join(" ");
        expect(stringified).not.toContain(SENTINEL_FILENAME);
      }
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  }, 20000);
});
