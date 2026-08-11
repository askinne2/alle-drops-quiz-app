// @vitest-environment jsdom
/**
 * tests/quiz-resume-start-over-dom.test.ts
 *
 * DOM proof of RESUME-03 — the persistent in-flow "Start over" control — through the REAL
 * `QuizContainer`. Proves the control's visibility range traces D-07's write boundary exactly,
 * that the two-step confirm gate protects the draft on both the first tap and the dismiss, that
 * confirming destroys it and lands on the same state-gate screen the resume-offer's own
 * "Start over" produces, and that the write effect's step gate stops the just-cleared draft from
 * being immediately rewritten (the ordering-hazard guard named in QuizContainer.tsx).
 *
 * WHY .ts, NOT .tsx — vitest.config.ts's `include` glob does not match `.test.tsx`. Elements are
 * constructed with `React.createElement`, never JSX.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { QuizContainer } from "../app/components/quiz/QuizContainer";
import { DRAFT_STORAGE_KEY, currentSchemaFingerprint } from "../app/lib/quiz/draft-store";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers } from "../app/lib/quiz/types";
import quizStyles from "../app/styles/quiz.module.css";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Real ~600ms wait, safely past the 500ms debounce window (matches the other 04.2-05 test files). */
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

function seedDraftAtQuizParts() {
  const draft = {
    schemaFingerprint: currentSchemaFingerprint(),
    savedAt: Date.now(),
    step: "quiz_parts",
    patientState: "tennessee",
    patientInfo: { name: "Jane Seed", dob: "1985-03-14", email: "jane.seed@example.com", phone: "6155551234" },
    symptomProfileId: "AOD_SEED_START_OVER",
    currentPartIndex: 0,
    answers: { testing_status: "needs_testing" },
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

/** Every part complete, needs_testing branch — the D-09 landing rule only honours draft.step
 *  once every part independently re-verifies as complete, so a "present on consent" test needs
 *  this full fixture rather than the single-answer one above. */
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

function seedDraftAtConsent() {
  const draft = {
    schemaFingerprint: currentSchemaFingerprint(),
    savedAt: Date.now(),
    step: "consent",
    patientState: "tennessee",
    patientInfo: { name: "Jane Seed", dob: "1985-03-14", email: "jane.seed@example.com", phone: "6155551234" },
    symptomProfileId: "AOD_SEED_START_OVER_CONSENT",
    currentPartIndex: QUIZ_PARTS.length - 1,
    answers: COMPLETE_ANSWERS,
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

describe("RESUME-03 — visibility range traces D-07's write boundary", () => {
  it("is absent on the state gate", () => {
    renderContainer();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("is absent on patient info", () => {
    renderContainer();
    fireEvent.click(screen.getByRole("button", { name: "Yes — I live in Tennessee" }));
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("is absent on the resume offer", () => {
    seedDraftAtQuizParts();
    renderContainer();
    expect(screen.getByText("You have an unfinished assessment from earlier.")).toBeTruthy();
    // ResumeOffer itself renders its OWN "Start over" secondary button, sharing the identical
    // accessible name by design (UI-SPEC requires the same wording in both places so a patient
    // recognizes it as the same action). Disambiguate the PERSISTENT in-flow control specifically
    // via its unique row wrapper class, rather than the shared button name.
    expect(document.querySelector(`.${quizStyles.quizStartOverRow}`)).toBeNull();
    // Non-vacuity: exactly one "Start over" button exists (the resume-offer's own), proving this
    // assertion isn't vacuously true because no "Start over" text renders anywhere at all.
    expect(screen.getAllByRole("button", { name: "Start over" })).toHaveLength(1);
  });

  it("is present on quiz_parts", () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    expect(screen.getByRole("button", { name: "Start over" })).toBeTruthy();
  });

  it("is present on consent", () => {
    seedDraftAtConsent();
    renderContainer();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByText("Informed consent")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start over" })).toBeTruthy();
  });
});

describe("RESUME-03 — the two-step confirm gate protects the draft (D-08)", () => {
  it("the first tap opens the confirm panel without touching the draft or navigating away", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I need allergy testing" }));
    await waitForDebounce();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    expect(screen.getByText("Have you already had allergy testing?")).toBeTruthy();
  });

  it("dismissing the confirm panel (Keep my progress) leaves the draft and part position untouched", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I need allergy testing" }));
    await waitForDebounce();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep my progress" }));

    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    expect(screen.getByText("Have you already had allergy testing?")).toBeTruthy();
  });
});

describe("RESUME-03 — confirming destroys the draft (D-08)", () => {
  it("Yes, start over clears storage, lands on the state gate, and a prior answer is gone", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I need allergy testing" }));
    await waitForDebounce();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));

    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(screen.getByText("Are you a resident of Tennessee or Texas?")).toBeTruthy();
    expect(screen.queryByText("Have you already had allergy testing?")).toBeNull();
  });

  it("does not immediately rewrite the draft after the reset, even past the debounce window", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I need allergy testing" }));
    await waitForDebounce();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));

    await waitForDebounce();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("RESUME-03 — both Start over triggers land on the same screen", () => {
  it("the in-flow control's post-confirm screen matches the resume-offer's own Start over outcome", async () => {
    // In-flow trigger.
    const { unmount } = renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));
    const inFlowHeading = screen.getByText("Are you a resident of Tennessee or Texas?");
    expect(inFlowHeading).toBeTruthy();
    unmount();
    window.localStorage.clear();

    // Resume-offer trigger.
    seedDraftAtQuizParts();
    renderContainer();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));
    expect(screen.getByText("Are you a resident of Tennessee or Texas?")).toBeTruthy();
  });
});
