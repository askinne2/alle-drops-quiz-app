// @vitest-environment jsdom
/**
 * tests/quiz-file-upload-dom.test.ts
 *
 * DOM coverage for the file_multi widget (04-16 / TEST-04), the single highest-abandonment
 * required field in the flow (D-02) and the only field with inline error copy by deliberate
 * exception (04-UI-SPEC.md Copywriting Contract). Renders the REAL `itemsForPart(QUIZ_PARTS, 6)`
 * (Part 7) through the REAL `QuizPartRenderer`, with `fetch` mocked at the global boundary —
 * `POST /api/quiz/upload` itself is covered end-to-end by `tests/api-quiz-upload.test.ts` (04-13);
 * this file proves the CLIENT's contract with that endpoint, not the endpoint's own behavior.
 *
 * WHY .ts, NOT .tsx — same reason as tests/quiz-part-renderer-dom.test.ts: vitest.config.ts's
 * `include` glob does not match `.test.tsx`. Elements are constructed with `React.createElement`.
 *
 * T-4-80's mitigation (a token is written ONLY for a `status: "uploaded"` entry) is the load-
 * bearing assertion across this whole file — it is what stops an uploading or failed file from
 * silently satisfying the required-upload clinical gate.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { QuizPartRenderer } from "../app/components/quiz/QuizPartRenderer";
import { itemsForPart } from "../app/lib/quiz/schema";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers } from "../app/lib/quiz/types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PART_7_ITEMS = itemsForPart(QUIZ_PARTS, 0);
const UPLOAD_LABEL = "Upload allergy test results";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderPart7(answers: QuizAnswers, onAnswerChange: ReturnType<typeof vi.fn> = vi.fn()) {
  const utils = render(
    React.createElement(QuizPartRenderer, { items: PART_7_ITEMS, answers, onAnswerChange })
  );
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onAnswerChange, input, ...utils };
}

/**
 * Stateful wrapper mirroring how QuizContainer.tsx actually drives QuizPartRenderer: every
 * onAnswerChange call is fed back into the `answers` prop on the next render, exactly like the
 * real parent. Plain `renderPart7` above freezes `answers` at its initial value, which is fine
 * for a single one-shot assertion but cannot correctly observe a SECOND transition back down to
 * zero tokens (the sync effect diffs the new token array against the CURRENT `answers` prop, so
 * a test harness that never updates that prop cannot distinguish "still zero" from "went from
 * one back to zero"). Used only by tests that need a faithful multi-step lifecycle.
 */
function ControlledPart7({
  initialAnswers,
  onAnswerChangeSpy,
}: {
  initialAnswers: QuizAnswers;
  onAnswerChangeSpy: ReturnType<typeof vi.fn>;
}) {
  const [answers, setAnswers] = React.useState<QuizAnswers>(initialAnswers);
  const handleChange = (id: string, value: string | string[] | number) => {
    onAnswerChangeSpy(id, value);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };
  return React.createElement(QuizPartRenderer, { items: PART_7_ITEMS, answers, onAnswerChange: handleChange });
}

function renderPart7Controlled(initialAnswers: QuizAnswers, onAnswerChangeSpy: ReturnType<typeof vi.fn> = vi.fn()) {
  const utils = render(React.createElement(ControlledPart7, { initialAnswers, onAnswerChangeSpy }));
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onAnswerChange: onAnswerChangeSpy, input, ...utils };
}

function makeFile(name: string, content = "file bytes", type = "application/pdf"): File {
  return new File([content], name, { type });
}

describe("file_multi item list sanity (non-vacuity control)", () => {
  it("itemsForPart(QUIZ_PARTS, 0) contains testing_files, gated on had_testing", () => {
    const testingFiles = PART_7_ITEMS.find((item) => item.id === "testing_files");
    expect(testingFiles).toBeDefined();
    expect(testingFiles?.kind).toBe("question");
  });
});

describe("file_multi — the native input and empty state", () => {
  it("renders the file input, keyboard reachable (not display: none), with the required aria-label", () => {
    const { input } = renderPart7({ testing_status: "had_testing" });
    expect(input).not.toBeNull();
    expect(input.getAttribute("aria-label")).toBe(UPLOAD_LABEL);
    expect(input.style.display).not.toBe("none");
    expect(input.multiple).toBe(true);
  });

  it('renders "No files added yet." before any file is picked', () => {
    renderPart7({ testing_status: "had_testing" });
    expect(screen.getByText("No files added yet.")).toBeTruthy();
  });
});

describe("file_multi — only status: 'uploaded' entries ever write a token (T-4-80)", () => {
  it("a successful upload adds a row and calls onAnswerChange with a one-token array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { token: "tok_abc123", contentType: "application/pdf", sizeBytes: 11 }))
    );
    const { input, onAnswerChange } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("results.pdf");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onAnswerChange).toHaveBeenCalledWith("testing_files", ["tok_abc123"]));
    expect(screen.getByText("results.pdf")).toBeTruthy();
  });

  it("a file left in 'uploading' (fetch never resolves) does NOT call onAnswerChange with a token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})) // never settles
    );
    const { input, onAnswerChange } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("pending.pdf");
    fireEvent.change(input, { target: { files: [file] } });

    // The row renders (picked), but no token is ever written while it's mid-flight.
    await waitFor(() => expect(screen.getByText("pending.pdf")).toBeTruthy());
    expect(onAnswerChange).not.toHaveBeenCalledWith("testing_files", expect.arrayContaining([expect.any(String)]));
  });

  it("a 415 response renders the exact wrong-type string with the filename and ⚠ prefix, and contributes no token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(415, { error: "Unsupported file type" })));
    const { input, onAnswerChange } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("notes.txt", "not a real pdf", "text/plain");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText("⚠ notes.txt isn't a supported file type. Please upload a PDF, JPEG, PNG, or HEIC file.")
      ).toBeTruthy()
    );
    expect(onAnswerChange).not.toHaveBeenCalledWith("testing_files", expect.arrayContaining([expect.any(String)]));
  });

  it("a 413 'File too large' response renders the exact too-large string with the filename", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(413, { error: "File too large" })));
    const { input } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("panel-scan.pdf");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText("⚠ panel-scan.pdf is over the 15 MB limit. Try a smaller photo or a lower-resolution scan.")
      ).toBeTruthy()
    );
  });

  it("a 413 'Total upload size exceeded' response renders the exact total-exceeded string", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(413, { error: "Total upload size exceeded" })));
    const { input } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("another.pdf");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText("⚠ Adding this file would put you over the 50 MB total limit. Remove a file first.")
      ).toBeTruthy()
    );
  });

  it("a 500 response renders the upload-failed copy AND a working Retry control", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { error: "Could not upload file" }))
      .mockResolvedValueOnce(jsonResponse(200, { token: "tok_retry_success", contentType: "application/pdf", sizeBytes: 11 }));
    vi.stubGlobal("fetch", fetchMock);
    const { input, onAnswerChange } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("scan.pdf");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("⚠ scan.pdf didn't upload. Check your connection and tap Retry.")).toBeTruthy()
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeTruthy();

    fireEvent.click(retryButton);

    await waitFor(() => expect(onAnswerChange).toHaveBeenCalledWith("testing_files", ["tok_retry_success"]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("file_multi — removal and additive picking", () => {
  it("removing a file drops both the row and its token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { token: "tok_remove_me", contentType: "application/pdf", sizeBytes: 11 }))
    );
    const { input, onAnswerChange } = renderPart7Controlled({ testing_status: "had_testing" });

    const file = makeFile("remove-me.pdf");
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onAnswerChange).toHaveBeenCalledWith("testing_files", ["tok_remove_me"]));

    const removeButton = screen.getByRole("button", { name: "Remove remove-me.pdf" });
    fireEvent.click(removeButton);

    await waitFor(() => expect(onAnswerChange).toHaveBeenCalledWith("testing_files", []));
    expect(screen.queryByText("remove-me.pdf")).toBeNull();
  });

  it("picking twice appends rather than replaces, and dedups by name+size", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { token: "tok_a", contentType: "application/pdf", sizeBytes: 11 }))
        .mockResolvedValueOnce(jsonResponse(200, { token: "tok_b", contentType: "application/pdf", sizeBytes: 11 }))
    );
    const { input, onAnswerChange } = renderPart7({ testing_status: "had_testing" });

    const fileA = makeFile("first.pdf", "aaaaaaaaaaa");
    fireEvent.change(input, { target: { files: [fileA] } });
    await waitFor(() => expect(onAnswerChange).toHaveBeenCalledWith("testing_files", ["tok_a"]));

    // Second pick: one duplicate of fileA (same name+size) and one genuinely new file. Only the
    // new one should trigger a second upload; the duplicate must not double the list.
    const fileADup = makeFile("first.pdf", "aaaaaaaaaaa");
    const fileB = makeFile("second.pdf", "bbbbbbbbbbb");
    fireEvent.change(input, { target: { files: [fileADup, fileB] } });

    await waitFor(() => expect(onAnswerChange).toHaveBeenCalledWith("testing_files", expect.arrayContaining(["tok_a", "tok_b"])));
    const lastCall = onAnswerChange.mock.calls[onAnswerChange.mock.calls.length - 1];
    expect(lastCall[1]).toHaveLength(2);

    expect(screen.getAllByText("first.pdf")).toHaveLength(1);
    expect(screen.getByText("second.pdf")).toBeTruthy();
  });
});

describe("file_multi — accessibility contract", () => {
  it("the file-list container carries aria-live=\"polite\"", () => {
    const { container } = renderPart7({ testing_status: "had_testing" });
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it("a per-file error line carries role=\"alert\"", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(415, { error: "Unsupported file type" })));
    const { input } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("bad.exe", "not allowed", "application/octet-stream");
    fireEvent.change(input, { target: { files: [file] } });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("⚠ bad.exe isn't a supported file type");
  });

  it("each row's status indicator is aria-hidden with a visually-hidden text equivalent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { token: "tok_a11y", contentType: "application/pdf", sizeBytes: 11 }))
    );
    const { input } = renderPart7({ testing_status: "had_testing" });

    const file = makeFile("a11y.pdf");
    fireEvent.change(input, { target: { files: [file] } });

    const row = await screen.findByText("a11y.pdf");
    const li = row.closest("li") as HTMLElement;
    await waitFor(() => expect(within(li).getByText("Uploaded")).toBeTruthy());

    const hiddenIcons = li.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBeGreaterThan(0);
  });
});
