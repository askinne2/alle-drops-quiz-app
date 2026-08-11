// @vitest-environment jsdom
/**
 * tests/quiz-resume-no-file-token.test.ts
 *
 * D-11's explicitly required test: no staging token or file reference is ever written to the
 * draft, proven at the RAW SERIALIZED STRING level — never inferred from `answers` shape alone.
 * Also proves the D-09/D-11 resumed-session dropzone copy (Copywriting Contract) and that the
 * 04.1 mandatory-upload wall survives a resume and re-opens on a fresh upload.
 *
 * WHY .ts, NOT .tsx — vitest.config.ts's `include` glob does not match `.test.tsx`. Elements are
 * constructed with `React.createElement`, never JSX.
 *
 * Counting is always `source.split(needle).length - 1`, NEVER `grep -c` and never a regex `match`
 * count — this project has been burned by line-vs-occurrence counting repeatedly
 * (04.2-PATTERNS.md).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { QuizContainer } from "../app/components/quiz/QuizContainer";
import { DRAFT_STORAGE_KEY, currentSchemaFingerprint } from "../app/lib/quiz/draft-store";
import type { QuizAnswers } from "../app/lib/quiz/types";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Real ~600ms wait, safely past the 500ms debounce window (matches tests/quiz-resume-write-gate.test.ts). */
async function waitForDebounce() {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

function renderContainer() {
  return render(React.createElement(QuizContainer));
}

function fillPatientInfoAndAdvance() {
  fireEvent.click(screen.getByRole("button", { name: "Yes — I live in Tennessee" }));
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Jane Doe" } });
  fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-01-15" } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "jane@example.com" } });
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "6155551234" } });
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
}

function makeFile(name: string, content = "file bytes", type = "application/pdf"): File {
  return new File([content], name, { type });
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const RESUMED_DROPZONE_COPY =
  "For your security, files aren't kept between visits. Please re-add your allergy test results below.";
const DEFAULT_DROPZONE_COPY = "No files added yet.";

/** had_testing Part 7 answers with the three text fields filled and NO testing_files key — the
 *  exact shape readDraft() produces after its D-11 strip. */
const HAD_TESTING_ANSWERS_NO_FILE: QuizAnswers = {
  testing_status: "had_testing",
  testing_year: "2020",
  testing_location: "Test Clinic",
  testing_allergens: "Pollen",
};

function seedResumableDraft(answers: QuizAnswers = HAD_TESTING_ANSWERS_NO_FILE) {
  const draft = {
    schemaFingerprint: currentSchemaFingerprint(),
    savedAt: Date.now(),
    step: "quiz_parts",
    patientState: "tennessee",
    patientInfo: { name: "Jane Seed", dob: "1985-03-14", email: "jane.seed@example.com", phone: "6155551234" },
    symptomProfileId: "AOD_SEED_NO_TOKEN",
    currentPartIndex: 0,
    answers,
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

describe("D-11 — no staging token is ever persisted, proven on the raw serialized string", () => {
  it("uploading a file writes zero occurrences of the token or testing_files, while testing_year is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { token: "tok_never_persist_me", contentType: "application/pdf", sizeBytes: 11 })
      )
    );
    renderContainer();
    fillPatientInfoAndAdvance();

    fireEvent.click(screen.getByRole("radio", { name: "I've already had allergy testing" }));
    fireEvent.change(screen.getByLabelText("What year did you have your allergy testing done?"), {
      target: { value: "2020" },
    });
    fireEvent.change(
      screen.getByLabelText("Where did you have your allergy testing done? (Clinic or lab name and city)"),
      { target: { value: "Test Clinic" } }
    );
    fireEvent.change(screen.getByLabelText("What Allergens Did You React To?"), {
      target: { value: "Pollen" },
    });

    const fileInput = screen.getByLabelText("Upload allergy test results") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile("results.pdf")] } });

    const row = await screen.findByText("results.pdf");
    const li = row.closest("li") as HTMLElement;
    await waitFor(() => expect(within(li).getByText("Uploaded")).toBeTruthy());

    await waitForDebounce();

    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const source = raw as string;

    expect(source.split("tok_never_persist_me").length - 1).toBe(0);
    expect(source.split("testing_files").length - 1).toBe(0);
    expect(source.split("testing_year").length - 1).toBeGreaterThanOrEqual(1);
  });
});

describe("D-09/D-11 — resumed-session dropzone copy (Copywriting Contract)", () => {
  it("a resumed had_testing session with no testing_files shows the resumed copy, never the default", () => {
    seedResumableDraft();
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(screen.getByText(RESUMED_DROPZONE_COPY)).toBeTruthy();
    expect(screen.queryByText(DEFAULT_DROPZONE_COPY)).toBeNull();
  });
});

describe("Non-vacuity control — a non-resumed session still shows the default dropzone copy", () => {
  it("a fresh session with no draft shows the default copy, never the resumed string", () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I've already had allergy testing" }));

    expect(screen.getByText(DEFAULT_DROPZONE_COPY)).toBeTruthy();
    expect(screen.queryByText(RESUMED_DROPZONE_COPY)).toBeNull();
  });
});

describe("D-09 — the upload wall still stands on a resumed session", () => {
  it("the forward button is disabled and the required-but-empty error still fires on blur", () => {
    seedResumableDraft();
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    const nextButton = screen.getByRole("button", { name: "Next →" }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);

    const fileInput = screen.getByLabelText("Upload allergy test results") as HTMLInputElement;
    fireEvent.blur(fileInput);

    expect(screen.getByText("⚠ Add at least one file to continue.")).toBeTruthy();
  });
});

describe("D-09 — a re-upload on a resumed session opens the wall", () => {
  it("uploading a file on the resumed session enables the forward button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { token: "tok_reupload", contentType: "application/pdf", sizeBytes: 11 })
      )
    );
    seedResumableDraft();
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    const fileInput = screen.getByLabelText("Upload allergy test results") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile("reupload.pdf")] } });

    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: "Next →" }) as HTMLButtonElement;
      expect(nextButton.disabled).toBe(false);
    });
  });
});
