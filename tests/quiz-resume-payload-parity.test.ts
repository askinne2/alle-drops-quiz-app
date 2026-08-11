// @vitest-environment jsdom
/**
 * tests/quiz-resume-payload-parity.test.ts
 *
 * THE LOAD-BEARING DELIVERABLE OF PHASE 04.2. Pins ROADMAP success criterion 5 / D-10 /
 * RESUME-04(c): "the score and submitted payload are identical whether an intake was completed
 * in one sitting or resumed — resume changes persistence only, never clinical data." Everything
 * before this plan proved pieces of resume; this file proves the whole thing, end to end, through
 * the REAL `QuizContainer` — the same answer fixture driven through two genuinely different
 * entries (a cold start through the state gate vs. a seeded draft plus an asserted `Resume`
 * click), asserting deep equality on what actually reaches `POST /api/quiz/submit`.
 *
 * WHY .ts, NOT .tsx — vitest.config.ts's `include` glob does not match `.test.tsx`. Elements are
 * constructed with `React.createElement`, never JSX.
 *
 * Anti-vacuity discipline (T-4.2-26): the two runs below share ONLY the per-part answering loop
 * (`driveAllPartsFromIndex`). They never share the entry. Run A goes through the state gate and
 * types patient info; Run B seeds a draft directly into `localStorage` and asserts the resume
 * offer's heading is on screen BEFORE `Resume` is clicked. If a future regression silently
 * skipped the offer, that assertion — not the payload comparison — is what would fail first.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { QuizContainer } from "../app/components/quiz/QuizContainer";
import { DRAFT_STORAGE_KEY, currentSchemaFingerprint } from "../app/lib/quiz/draft-store";
import { itemsForPart } from "../app/lib/quiz/schema";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers, QuizItem } from "../app/lib/quiz/types";
import { RESUME_PARITY_EXCLUDED_FIELDS, type SubmitPayload } from "../app/lib/quiz/payload";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Shared fixture — identical patient identity and clinical answers for both runs ───────────

const PATIENT_INFO = {
  name: "Parity Test Patient",
  dob: "1990-01-15",
  email: "parity.test@example.com",
  phone: "6155551234",
};

/**
 * One complete answer map covering every required question in every part of the REAL
 * `QUIZ_PARTS`, on the `had_testing` branch so Part 7's mandatory upload is exercised. Both runs
 * are driven to this exact same set of answers via `driveAllPartsFromIndex` below — `testing_files`
 * is deliberately absent here because it is never a plain fixture value; it is produced by a real
 * (stubbed) file upload interaction in both runs.
 */
const FULL_ANSWERS: QuizAnswers = {
  // Part 7 — allergy testing split (had_testing branch; testing_files handled separately)
  testing_status: "had_testing",
  testing_year: "2020",
  testing_location: "Test Clinic",
  testing_allergens: "Pollen",

  // Part 1 — symptom checklist
  symptoms_nasal: ["sneezing", "runny_nose"],
  symptoms_eye: ["itchy_eyes"],
  symptoms_sinus: ["headaches"],

  // Part 2 — timing & triggers
  timing_season: ["year_round"],
  timing_triggers: ["dust"],

  // Part 3 — severity
  severity_nasal_congestion: 3,
  severity_sneezing: 2,
  severity_runny_nose: 1,
  severity_nasal_itching: 2,
  severity_eye_itching: 1,

  // Part 4 — daily life impact
  impact_sleep: 3,
  impact_daily: 2,
  impact_concentrate: 1,
  impact_social: 2,
  bother_overall: 3,

  // Part 5 — current treatment (taking_meds: "yes" exercises the med_list/med_control reveal)
  taking_meds: "yes",
  med_list: "Claritin 10mg daily",
  med_control: "somewhat",
  diagnosed_allergic_condition: "yes",

  // Part 6 — medical history (every gate answered "yes" to exercise every reveal)
  history_comorbidities: ["asthma"],
  history_medications_has: "yes",
  current_medications: "Albuterol inhaler",
  history_surgeries_has: "yes",
  history_surgeries: "Appendectomy, 2010",
  history_allergies_has: "yes",
  history_allergies: "Penicillin",
  history_conditions_has: "yes",
  history_conditions: "Mild asthma",
  has_pcp: "yes",
  pcp_clinic_name: "Main Street Family Clinic",
  pcp_clinic_address: "123 Main St, Nashville, TN",
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** Sets one item's answer directly through the real DOM, matching how a patient would interact
 *  with the real, un-mocked `QuizPartRenderer`. `file_multi` is deliberately NOT handled here —
 *  it requires an async upload round trip and is handled inline by `driveAllPartsFromIndex`. */
function setDomAnswer(container: HTMLElement, item: QuizItem): void {
  if (item.kind !== "question") return;
  const value = FULL_ANSWERS[item.id];
  if (value === undefined) return;

  switch (item.type) {
    case "checkbox_multi":
    case "radio_multi": {
      const group = container.querySelector(`[aria-labelledby="q-${item.id}"]`) as HTMLElement;
      const optionValues = (item.options ?? []).map((opt) => opt.value);
      const checkboxes = Array.from(group.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const wanted = Array.isArray(value) ? value : [value as string];
      for (const v of wanted) {
        const idx = optionValues.indexOf(v);
        fireEvent.click(checkboxes[idx]);
      }
      break;
    }
    case "severity_0_3":
    case "frequency_0_4":
    case "bother_0_4": {
      const radios = Array.from(container.querySelectorAll(`input[name="${item.id}"]`)) as HTMLInputElement[];
      fireEvent.click(radios[value as number]);
      break;
    }
    case "yesno": {
      const radios = Array.from(container.querySelectorAll(`input[name="${item.id}"]`)) as HTMLInputElement[];
      fireEvent.click(radios[value === "yes" ? 0 : 1]);
      break;
    }
    case "text_input":
    case "text_input_short": {
      const el = container.querySelector(`#${item.id}`) as HTMLInputElement | HTMLTextAreaElement;
      fireEvent.change(el, { target: { value } });
      break;
    }
    case "control_0_3":
    case "radio_single": {
      const radios = Array.from(container.querySelectorAll(`input[name="${item.id}"]`)) as HTMLInputElement[];
      const optionValues = (item.options ?? []).map((opt) => opt.value);
      const idx = optionValues.indexOf(value as string);
      fireEvent.click(radios[idx]);
      break;
    }
    case "file_multi":
      // Handled by driveAllPartsFromIndex — a real async upload, not a plain DOM value set.
      break;
  }
}

/**
 * THE SHARED PER-PART ANSWERING LOOP. Deliberately covers ONLY the answering of a part already
 * on screen — it never decides how the patient GOT to `quiz_parts` in the first place, which is
 * what keeps Run A and Run B's entries genuinely distinct (see file header). Drives every visible
 * item in declaration order (gates before their `showIf` reveals, matching `questions.ts`'s own
 * order), performs a real stubbed file upload for `testing_files`, then advances past the part
 * once the real `isPartComplete`-gated Next/Continue button is enabled.
 */
async function driveAllPartsFromIndex(
  container: HTMLElement,
  startIndex: number,
  uploadFilename: string
): Promise<void> {
  for (let partIndex = startIndex; partIndex < QUIZ_PARTS.length; partIndex++) {
    const items = itemsForPart(QUIZ_PARTS, partIndex);
    for (const item of items) {
      if (item.kind !== "question") continue;
      if (item.type === "file_multi") {
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(["synthetic allergy test result bytes"], uploadFilename, {
          type: "application/pdf",
        });
        fireEvent.change(input, { target: { files: [file] } });
        continue;
      }
      setDomAnswer(container, item);
    }

    const isLastPart = partIndex === QUIZ_PARTS.length - 1;
    const buttonName = isLastPart ? "Continue" : "Next →";
    await waitFor(() => {
      const button = screen.getByRole("button", { name: buttonName }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
    fireEvent.click(screen.getByRole("button", { name: buttonName }));
  }
}

/** Run A's entry — a cold start through the state gate and typed patient info. Never shared with
 *  Run B's entry (see file header's anti-vacuity discipline). */
function enterOneSitting(): void {
  fireEvent.click(screen.getByRole("button", { name: "Yes — I live in Tennessee" }));
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: PATIENT_INFO.name } });
  fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: PATIENT_INFO.dob } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: PATIENT_INFO.email } });
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: PATIENT_INFO.phone } });
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
}

/** Seeds a draft representing the same patient interrupted partway through Part 7 — the same
 *  identity, the same testing_status/year/location/allergens text answers FULL_ANSWERS uses, and
 *  deliberately NO `testing_files` key (never persisted, D-11). Every other part (1-6) is left
 *  unanswered in the draft, so Run B's shared answering loop still has to answer them for real,
 *  exactly as Run A's loop does — the two runs share the loop, not its inputs' completeness. */
function seedInterruptedDraft(symptomProfileId: string): void {
  const draft = {
    schemaFingerprint: currentSchemaFingerprint(),
    savedAt: Date.now(),
    step: "quiz_parts",
    patientState: "tennessee",
    patientInfo: { ...PATIENT_INFO },
    symptomProfileId,
    currentPartIndex: 0,
    answers: {
      testing_status: FULL_ANSWERS.testing_status,
      testing_year: FULL_ANSWERS.testing_year,
      testing_location: FULL_ANSWERS.testing_location,
      testing_allergens: FULL_ANSWERS.testing_allergens,
    },
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

/** Run B's entry — a fresh mount reading the seeded draft, asserting the resume offer is showing
 *  BEFORE clicking Resume (T-4.2-26's non-vacuity requirement). Also asserts, immediately after
 *  Resume and before the shared answering loop touches anything, that the three Part 7 text
 *  answers seeded in `seedInterruptedDraft` actually landed in the DOM — this is what makes RED
 *  mutation proof #1 (dropping a restored answer key in `handleResume`) observable: the shared
 *  loop below re-types every item unconditionally (idempotent for an already-correct field), so a
 *  restore bug that merely blanks a field would otherwise be silently repaired before it ever
 *  reached the submitted payload. This assertion catches it at the point of restoration instead.
 */
function enterResumed(): void {
  expect(screen.getByText("You have an unfinished assessment from earlier.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));

  expect((screen.getByLabelText("What year did you have your allergy testing done?") as HTMLInputElement).value).toBe(
    FULL_ANSWERS.testing_year
  );
  expect(
    (screen.getByLabelText("Where did you have your allergy testing done? (Clinic or lab name and city)") as HTMLInputElement)
      .value
  ).toBe(FULL_ANSWERS.testing_location);
  expect((screen.getByLabelText("What Allergens Did You React To?") as HTMLInputElement).value).toBe(
    FULL_ANSWERS.testing_allergens
  );
}

async function submitAndAwaitResults(): Promise<void> {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(screen.getByText("Preliminary Score")).toBeTruthy());
}

/** Deletes every `RESUME_PARITY_EXCLUDED_FIELDS` key from a COPY of the payload. Imports the
 *  constant rather than re-declaring the three field names locally, per this plan's binding
 *  requirement — widening this list anywhere but `payload.ts` itself is exactly the edit that
 *  would make a real divergence disappear behind a passing test. */
function stripExcluded(payload: SubmitPayload): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...payload };
  for (const field of RESUME_PARITY_EXCLUDED_FIELDS) delete copy[field];
  return copy;
}

describe("ROADMAP success criterion 5 / D-10 / RESUME-04(c) — payload parity, one-sitting vs. resumed", () => {
  it("produces byte-for-byte identical submitted payloads (except the three named time-derived fields) whether the intake was completed in one sitting or resumed", async () => {
    const submittedBodies: SubmitPayload[] = [];
    const fetchStub = vi.fn(async (url: unknown, init?: RequestInit) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("/api/quiz/upload")) {
        // Same token in both runs, deliberately. The staging token is a server-issued opaque
        // value — holding the server constant here isolates the ONE variable this test exists to
        // prove: the resume path. This is NOT a fourth exclusion; RESUME_PARITY_EXCLUDED_FIELDS
        // stays at exactly three (enforced by payload.test.ts), and the companion
        // "tolerates divergent upload tokens" test below proves the production case where the
        // token legitimately differs.
        return jsonResponse(200, { token: "tok_parity_fixture", contentType: "application/pdf", sizeBytes: 11 });
      }
      if (u.includes("/api/quiz/submit")) {
        const body = init?.body ? (JSON.parse(init.body as string) as SubmitPayload) : ({} as SubmitPayload);
        submittedBodies.push(body);
        return jsonResponse(200, { success: true });
      }
      throw new Error(`Unexpected fetch call in payload-parity test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchStub);

    // ── Run A: one sitting ────────────────────────────────────────────────────────────────────
    const runA = render(React.createElement(QuizContainer));
    enterOneSitting();
    await driveAllPartsFromIndex(runA.container, 0, "run-a-results.pdf");
    await submitAndAwaitResults();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    cleanup();
    window.localStorage.clear();

    // ── Run B: resumed ────────────────────────────────────────────────────────────────────────
    seedInterruptedDraft("AOD_SEED_PARITY_RESUME");
    const runB = render(React.createElement(QuizContainer));
    enterResumed();
    await driveAllPartsFromIndex(runB.container, 0, "run-b-results.pdf");
    await submitAndAwaitResults();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    expect(submittedBodies).toHaveLength(2);
    const [payloadA, payloadB] = submittedBodies;

    const strippedA = stripExcluded(payloadA);
    const strippedB = stripExcluded(payloadB);

    expect(strippedB).toEqual(strippedA);
    expect(payloadB.quiz_score).toBe(payloadA.quiz_score);
    expect(payloadB.score_bracket).toBe(payloadA.score_bracket);
    expect(payloadB.answers).toEqual(payloadA.answers);

    // Non-vacuity: a construction where both payloads were merely empty could not pass the
    // toEqual assertions above by accident.
    expect(Object.keys(strippedA).length).toBeGreaterThanOrEqual(9);
    expect(Object.keys(payloadA.answers as unknown as Record<string, unknown>).length).toBeGreaterThanOrEqual(10);

    // Each excluded field is present and well-formed in BOTH payloads, so the exclusion never
    // hides a field that went missing entirely.
    for (const payload of [payloadA, payloadB]) {
      expect(typeof payload.completion_time).toBe("number");
      expect(new Date(payload.quiz_date).toISOString()).toBe(payload.quiz_date);
      expect(payload.symptom_profile_id).toMatch(/^AOD_/);
    }
  });

  /**
   * Companion to the parity test above. The parity test deliberately holds the mocked upload
   * token constant across both runs to isolate the resume path as the one variable under test —
   * but in production the token is `crypto.randomUUID()`
   * (`app/routes/api.quiz.upload.tsx:124`) and the two runs' tokens WILL differ. That constant-
   * token choice is reasoning, and this project's rule is that reasoning gets proven, not
   * asserted (see STATE.md's six-prior-UAT-defects history). This test proves it: serves a
   * DIFFERENT upload token to each run via a call-counter in the stub — never a property of the
   * request, since the client must have no way to influence which token it receives — and asserts
   * by SET DIFFERENCE that `testing_files` is the only field whose value differs.
   */
  it("tolerates divergent upload tokens", async () => {
    const submittedBodies: SubmitPayload[] = [];
    let uploadCallCount = 0;
    const fetchStub = vi.fn(async (url: unknown, init?: RequestInit) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("/api/quiz/upload")) {
        uploadCallCount += 1;
        // Switches on a call counter, never on any property of the request (e.g. filename,
        // headers) — the client must have no way to influence which token it gets back.
        const token = uploadCallCount === 1 ? "tok_run_a" : "tok_run_b";
        return jsonResponse(200, { token, contentType: "application/pdf", sizeBytes: 11 });
      }
      if (u.includes("/api/quiz/submit")) {
        const body = init?.body ? (JSON.parse(init.body as string) as SubmitPayload) : ({} as SubmitPayload);
        submittedBodies.push(body);
        return jsonResponse(200, { success: true });
      }
      throw new Error(`Unexpected fetch call in divergent-token test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchStub);

    // ── Run A: one sitting ────────────────────────────────────────────────────────────────────
    const runA = render(React.createElement(QuizContainer));
    enterOneSitting();
    await driveAllPartsFromIndex(runA.container, 0, "run-a-divergent.pdf");
    await submitAndAwaitResults();

    cleanup();
    window.localStorage.clear();

    // ── Run B: resumed ────────────────────────────────────────────────────────────────────────
    seedInterruptedDraft("AOD_SEED_DIVERGENT_RESUME");
    const runB = render(React.createElement(QuizContainer));
    enterResumed();
    await driveAllPartsFromIndex(runB.container, 0, "run-b-divergent.pdf");
    await submitAndAwaitResults();

    expect(submittedBodies).toHaveLength(2);
    const [payloadA, payloadB] = submittedBodies;

    // Flatten each stripped payload's `answers` alongside its own top-level fields into one
    // namespace before diffing, so a divergent ANSWER key (testing_files) surfaces by its own
    // name rather than being masked behind the single top-level "answers" key that contains it.
    // Real answer IDs (testing_files, symptoms_nasal, ...) never collide with SubmitPayload's own
    // top-level field names (state, name, dob, email, phone, quiz_score, score_bracket, answers,
    // consent_version), so this flattening is lossless for diffing purposes.
    const flattenForDiff = (payload: SubmitPayload): Record<string, unknown> => {
      const stripped = stripExcluded(payload);
      const { answers, ...rest } = stripped as { answers: QuizAnswers } & Record<string, unknown>;
      return { ...rest, ...(answers as unknown as Record<string, unknown>) };
    };

    const flatA = flattenForDiff(payloadA);
    const flatB = flattenForDiff(payloadB);

    const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
    const differingKeys = new Set<string>();
    for (const key of allKeys) {
      if (JSON.stringify(flatA[key]) !== JSON.stringify(flatB[key])) differingKeys.add(key);
    }

    // Set difference, not delete-then-compare: a second divergent field would surface here by
    // name in the failure output instead of being silently swallowed.
    expect(differingKeys).toEqual(new Set(["testing_files"]));

    // A differing upload token must never perturb either clinical value.
    expect(payloadB.quiz_score).toBe(payloadA.quiz_score);
    expect(payloadB.score_bracket).toBe(payloadA.score_bracket);
  });
});
