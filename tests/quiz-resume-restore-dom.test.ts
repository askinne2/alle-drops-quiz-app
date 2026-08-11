// @vitest-environment jsdom
/**
 * tests/quiz-resume-restore-dom.test.ts
 *
 * DOM proof of ROADMAP criterion 1 (Phase 4.2, RESUME-01/RESUME-04(b)) end-to-end through the
 * REAL `QuizContainer`, seeding `localStorage` directly the way a returning patient's browser
 * would already hold a draft — never through `writeDraft` (that is plan 04.2-05's write-side
 * scope; this file only proves the READ side wired in 04.2-04).
 *
 * WHY .ts, NOT .tsx — same reason as every other DOM test in this repo:
 * vitest.config.ts's `include` glob does not match `.test.tsx`. Elements are constructed with
 * `React.createElement`, never JSX.
 *
 * jsdom's `Storage` methods live on `Storage.prototype`, not as own properties of the
 * `window.localStorage` instance (confirmed in app/lib/quiz/draft-store.test.ts) —
 * `vi.spyOn(window.localStorage, "setItem")` silently fails to intercept; every storage-failure
 * simulation below spies on `Storage.prototype` instead.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { QuizContainer } from "../app/components/quiz/QuizContainer";
import { DRAFT_STORAGE_KEY, currentSchemaFingerprint } from "../app/lib/quiz/draft-store";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers } from "../app/lib/quiz/types";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// ── Seed fixtures — real question IDs, never synthetic ones ──────────────────────────────────

const SEED_NAME = "Jane Seed Patient";
const SEED_DOB = "1985-03-14";
const SEED_EMAIL = "jane.seed@example.com";
const SEED_PHONE = "6155551234";

/** had_testing Part 7 answers with the three text fields filled and NO testing_files key —
 *  exactly the shape readDraft() produces after its D-11 strip. Leaves Part 7 incomplete
 *  (testing_files unanswered), which is what the D-09 landing-rule tests below rely on. */
const HAD_TESTING_ANSWERS: QuizAnswers = {
  testing_status: "had_testing",
  testing_year: "2020",
  testing_location: "Test Clinic",
  testing_allergens: "Pollen",
};

/** Every part complete, `needs_testing` branch so Part 7 needs no upload — used only by the
 *  consent-integrity test, where every part (including Part 7) must independently satisfy
 *  isPartComplete so the landing rule falls through to honouring draft.step === "consent". */
const COMPLETE_ANSWERS: QuizAnswers = {
  testing_status: "needs_testing",
  symptoms_nasal: ["none"],
  symptoms_eye: ["none"],
  symptoms_sinus: ["none"],
  timing_season: ["only_rarely"],
  timing_triggers: ["none"],
  severity_nasal_congestion: 0,
  severity_sneezing: 0,
  severity_runny_nose: 0,
  severity_nasal_itching: 0,
  severity_eye_itching: 0,
  impact_sleep: 0,
  impact_daily: 0,
  impact_concentrate: 0,
  impact_social: 0,
  bother_overall: 0,
  taking_meds: "no",
  diagnosed_allergic_condition: "no",
  history_comorbidities: ["none"],
  history_medications_has: "no",
  history_surgeries_has: "no",
  history_allergies_has: "no",
  history_conditions_has: "no",
  has_pcp: "no",
};

interface SeedDraftOverrides {
  step?: "quiz_parts" | "consent";
  savedAt?: number;
  currentPartIndex?: number;
  answers?: QuizAnswers;
  schemaFingerprint?: string;
}

/** Writes a valid draft directly to localStorage — the shape readDraft() expects, bypassing
 *  writeDraft entirely (out of this plan's scope). */
function seedDraft(overrides: SeedDraftOverrides = {}) {
  const draft = {
    schemaFingerprint: overrides.schemaFingerprint ?? currentSchemaFingerprint(),
    savedAt: overrides.savedAt ?? Date.now(),
    step: overrides.step ?? "consent",
    patientState: "tennessee",
    patientInfo: { name: SEED_NAME, dob: SEED_DOB, email: SEED_EMAIL, phone: SEED_PHONE },
    symptomProfileId: "AOD_SEED_1",
    currentPartIndex: overrides.currentPartIndex ?? QUIZ_PARTS.length - 1,
    answers: overrides.answers ?? HAD_TESTING_ANSWERS,
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function renderContainer() {
  return render(React.createElement(QuizContainer));
}

describe("D-01 — absent state is indistinguishable from 'no draft' (RESUME-01)", () => {
  it("no draft in storage: renders the state gate, never the resume offer", () => {
    renderContainer();
    expect(
      screen.getByText("Are you a resident of Tennessee or Texas?")
    ).toBeTruthy();
    expect(
      screen.queryByText("You have an unfinished assessment from earlier.")
    ).toBeNull();
  });

  it("storage throws on access (Safari ITP shape): identical rendered output to 'no draft'", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    renderContainer();
    expect(
      screen.getByText("Are you a resident of Tennessee or Texas?")
    ).toBeTruthy();
    expect(
      screen.queryByText("You have an unfinished assessment from earlier.")
    ).toBeNull();
    // No error text, no warning banner — D-01 forbids any patient-visible surface area beyond
    // today's behavior.
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("D-01 — expired draft (D-05, 24h) is treated as absent, with active cleanup", () => {
  it("a draft older than 24h renders the state gate and is actively removed from storage", () => {
    seedDraft({ savedAt: Date.now() - 25 * 60 * 60 * 1000 });
    renderContainer();
    expect(
      screen.getByText("Are you a resident of Tennessee or Texas?")
    ).toBeTruthy();
    expect(
      screen.queryByText("You have an unfinished assessment from earlier.")
    ).toBeNull();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("RESUME-01 — the offer reveals zero identity (D-06)", () => {
  it("a valid draft renders the offer, not the state gate", () => {
    seedDraft();
    renderContainer();
    expect(
      screen.getByText("You have an unfinished assessment from earlier.")
    ).toBeTruthy();
    expect(
      screen.queryByText("Are you a resident of Tennessee or Texas?")
    ).toBeNull();
  });

  it("the rendered document contains none of the seeded PHI values", () => {
    seedDraft();
    renderContainer();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain(SEED_NAME);
    expect(text).not.toContain(SEED_EMAIL);
    expect(text).not.toContain(SEED_PHONE);
    expect(text).not.toContain(SEED_DOB);
  });
});

describe("RESUME-01 — Resume restores answers and flow position", () => {
  it("clicking Resume shows the one-time restoration notice and pre-filled restored answers", () => {
    seedDraft();
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(
      screen.getByText("Your previous answers have been restored.")
    ).toBeTruthy();

    // A restored text answer is visibly reflected in the rendered part.
    const yearInput = screen.getByLabelText(
      "What year did you have your allergy testing done?"
    ) as HTMLInputElement;
    expect(yearInput.value).toBe("2020");

    // Landed inside the quiz, not back at the start.
    expect(
      screen.queryByText("Are you a resident of Tennessee or Texas?")
    ).toBeNull();
    expect(screen.queryByText("Patient information")).toBeNull();
  });
});

describe("D-09 — the 04.1 upload wall survives resume", () => {
  it("a had_testing draft recorded at step: consent lands on the file part, not consent", () => {
    seedDraft({ step: "consent", currentPartIndex: QUIZ_PARTS.length - 1 });
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    // Landed on Part 7 (index 0), not consent.
    expect(screen.queryByText("Informed consent")).toBeNull();
    expect(
      screen.getByText("Have you already had allergy testing?")
    ).toBeTruthy();

    // Dropzone empty — restored state never satisfied the file-required predicate. Shows the
    // D-09/D-11 resumed-session copy (wired in plan 04.2-05), not the default empty-state string,
    // since resumedSession is now threaded down from QuizContainer into QuizPartRenderer.
    expect(
      screen.getByText(
        "For your security, files aren't kept between visits. Please re-add your allergy test results below."
      )
    ).toBeTruthy();

    const nextButton = screen.getByRole("button", { name: "Next →" }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });

  it("a hand-planted testing_files token never reaches the DOM, and the forward button stays disabled", () => {
    seedDraft({
      step: "consent",
      currentPartIndex: QUIZ_PARTS.length - 1,
      answers: { ...HAD_TESTING_ANSWERS, testing_files: ["tok_tampered"] },
    });
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(document.body.textContent ?? "").not.toContain("tok_tampered");
    const nextButton = screen.getByRole("button", { name: "Next →" }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });
});

describe("RESUME-01 — Start over from the offer clears the draft (D-08)", () => {
  it("confirming Start over clears storage and lands on the state gate", () => {
    seedDraft();
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));

    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(
      screen.getByText("Are you a resident of Tennessee or Texas?")
    ).toBeTruthy();
  });
});

describe("Consent integrity — a resumed consent landing never pre-checks the box", () => {
  it("every part complete + step: consent lands on consent with the box unchecked and Submit disabled", async () => {
    seedDraft({ step: "consent", answers: COMPLETE_ANSWERS, currentPartIndex: QUIZ_PARTS.length - 1 });
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(screen.getByText("Informed consent")).toBeTruthy());
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    const submitButton = screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });
});
