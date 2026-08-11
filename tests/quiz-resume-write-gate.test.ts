// @vitest-environment jsdom
/**
 * tests/quiz-resume-write-gate.test.ts
 *
 * DOM proof of RESUME-02 / RESUME-03 / D-07 — the write side of resume — through the REAL
 * `QuizContainer`. Proves an untouched page load, the state gate, and patient-info typing all
 * leave zero trace (ROADMAP criterion 2's sharpest case: identity PHI typed and still nothing on
 * disk), that the first real answer to a quiz question starts the draft, that the write is
 * debounced, that Test Mode's synthetic sample is excluded, and that a successful submission
 * clears the draft while a failed one deliberately leaves it intact (D-08).
 *
 * WHY .ts, NOT .tsx — vitest.config.ts's `include` glob does not match `.test.tsx`. Elements are
 * constructed with `React.createElement`, never JSX.
 *
 * jsdom's `Storage` methods live on `Storage.prototype`, not as own properties of the
 * `window.localStorage` instance (confirmed in app/lib/quiz/draft-store.test.ts and
 * tests/quiz-resume-restore-dom.test.ts) — the debounce spy below targets `Storage.prototype`.
 *
 * Real timers throughout (never `vi.useFakeTimers()`): several cases here need `await waitFor`
 * against an async `fetch` mock, and mixing vitest's fake timers with testing-library's polling
 * `waitFor` is a well-known footgun. `waitForDebounce()` below is a real ~600ms wait, safely past
 * the 500ms debounce window — slower than a faked clock, but deterministic and simple.
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.history.pushState({}, "", "/");
});

/** Real ~600ms wait, safely past the 500ms debounce window. */
async function waitForDebounce() {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

function renderContainer() {
  return render(React.createElement(QuizContainer));
}

/** Fills patient info with valid values and advances into quiz_parts (currentPartIndex 0). */
function fillPatientInfoAndAdvance() {
  fireEvent.click(screen.getByRole("button", { name: "Yes — I live in Tennessee" }));
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Jane Doe" } });
  fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-01-15" } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "jane@example.com" } });
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "6155551234" } });
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
}

/** Every part complete, needs_testing branch — used only for the seeded-draft-to-consent tests
 *  below, where every part (including Part 7) must independently satisfy isPartComplete so
 *  handleResume's D-09 landing rule falls through to honouring draft.step === "consent". */
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
    symptomProfileId: "AOD_SEED_WRITE_GATE",
    currentPartIndex: QUIZ_PARTS.length - 1,
    answers: COMPLETE_ANSWERS,
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("D-07 — untouched page load leaves nothing in storage (RESUME-02)", () => {
  it("renders the state gate and writes nothing, even after the debounce window elapses", async () => {
    renderContainer();
    await waitForDebounce();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("D-07 — the state gate leaves nothing in storage (RESUME-02)", () => {
  it("clicking through the state gate writes nothing after the debounce window", async () => {
    renderContainer();
    fireEvent.click(screen.getByRole("button", { name: "Yes — I live in Tennessee" }));
    await waitForDebounce();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("D-07 — patient-info typing leaves nothing in storage (RESUME-02's sharpest case)", () => {
  it("typing identity PHI (name, DOB, email, phone) writes nothing after the debounce window", async () => {
    renderContainer();
    fireEvent.click(screen.getByRole("button", { name: "Yes — I live in Tennessee" }));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-01-15" } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "6155551234" } });
    await waitForDebounce();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("D-07 — zero answers on quiz_parts still writes nothing (RESUME-02)", () => {
  it("advancing past patient info with zero answers leaves the draft key null", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    await waitForDebounce();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("D-07 — the first real answer starts the draft (RESUME-02)", () => {
  it("answering one Part-0 question writes a draft with exactly one answers key", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I need allergy testing" }));
    await waitForDebounce();
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(Object.keys(parsed.answers)).toHaveLength(1);
    expect(parsed.answers.testing_status).toBe("needs_testing");
  });
});

describe("D-07 — the write is debounced (RESUME-02)", () => {
  it("ten rapid keystrokes within one debounce window write DRAFT_STORAGE_KEY strictly fewer than ten times", async () => {
    renderContainer();
    fillPatientInfoAndAdvance();
    fireEvent.click(screen.getByRole("radio", { name: "I've already had allergy testing" }));

    const yearInput = screen.getByLabelText("What year did you have your allergy testing done?");

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    for (let i = 0; i < 10; i++) {
      fireEvent.change(yearInput, { target: { value: `202${i}` } });
    }

    await waitForDebounce();

    const draftKeyWrites = setItemSpy.mock.calls.filter((call) => call[0] === DRAFT_STORAGE_KEY);
    expect(draftKeyWrites.length).toBeLessThan(10);
  });
});

describe("D-07 / T-4.2-19 — Test Mode's synthetic answers never persist a draft", () => {
  it("Test Mode's sample answers write nothing, because step jumps straight to results", async () => {
    window.history.pushState({}, "", "/?test=1");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Test Mode: jump to results" }));

    await waitForDebounce();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("D-08 — a successful submission clears the draft", () => {
  it("submitting a consent-ready resumed session clears the draft key on success", async () => {
    seedDraftAtConsent();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { success: true })));
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(screen.getByText("Informed consent")).toBeTruthy());

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.getByText("Preliminary Score")).toBeTruthy());
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("D-08 — a failed submission keeps the draft intact", () => {
  it("submitting a consent-ready resumed session leaves the draft key present and unchanged on failure", async () => {
    seedDraftAtConsent();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(screen.getByText("Informed consent")).toBeTruthy());

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.getByText("Error")).toBeTruthy());

    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.answers).toEqual(COMPLETE_ANSWERS);
  });
});
