import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for Phase 4 Plan 08's D-09 deletions (TEST-05, TEST-07).
 *
 * MEASURED RED, 2026-08-10, against pre-change source (before Tasks 2-3 of this plan landed):
 * `npx vitest run tests/quiz-testing-bypass-deletion.test.ts` FAILED with 18 of 24 assertions
 * failing (15 absence assertions non-zero + 3 red-by-design positive controls not yet true —
 * `testingStatus`, "Schedule Allergy Testing", and "Your responses have been submitted." on the
 * ResultsDisplay side; `setStep("consent")` on the QuizContainer side already passed pre-change
 * because `handleProceedToPurchase` already called it, so it is NOT red-by-design). See
 * 04-08-SUMMARY.md for the full per-needle count table. This header is written once, at RED
 * time, and is not rewritten after the deletions land — the SUMMARY carries the GREEN
 * confirmation.
 *
 * D-09 deletes six things from `QuizContainer.tsx` (the 0-2 auto-submit `useEffect`, the
 * `autoSubmit0to2Attempted` ref, `handleScheduleConsult`, `handleTestFirst`,
 * `handleProceedToPurchase`, and the `savedToServer` bookkeeping that existed only to stop
 * those three from double-submitting), the stale `"See results"` button label, and the
 * `setStep("outcome")` call that used to precede consent. D-10 additionally deletes two
 * locked copy clauses from `ResultsDisplay.tsx` (the 7+ "We recommend proceeding with allergy
 * testing" sentence and the entire 3-6 "Continue to Purchase AlleDrops" bypass button). The
 * three callback props (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`) are deleted
 * from BOTH files — the interface/destructure in `ResultsDisplay.tsx` and every call site in
 * `QuizContainer.tsx`.
 *
 * Per this repo's established convention (see `tests/quiz-medical-history-deletion.test.ts`,
 * `tests/quiz-container-no-question-filter.test.ts`), occurrence counting uses
 * `SOURCE.split(needle).length - 1` — NEVER a line-counting `grep -c`, which collapses every
 * multi-match line down to a count of `1` and would pass an absence gate vacuously against a
 * single long line (the Klaviyo "4 vs 10 occurrences" incident, recorded in STATE.md). Every
 * absence needle below is assembled from two or more string fragments so this file's own prose
 * — which necessarily names the identifiers it proves absent — cannot make its own assertions
 * self-match against a naive whole-file search.
 */

const QUIZ_CONTAINER_SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizContainer.tsx"),
  "utf-8",
);

const RESULTS_DISPLAY_SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "ResultsDisplay.tsx"),
  "utf-8",
);

const PAYLOAD_SOURCE = readFileSync(
  join(process.cwd(), "app", "lib", "quiz", "payload.ts"),
  "utf-8",
);

const count = (source: string, needle: string): number => source.split(needle).length - 1;

// --- Absence needles, fragment-assembled ---

const AUTO_SUBMIT_NEEDLE = "autoSubmit" + "0to2Attempted";
const HANDLE_SCHEDULE_CONSULT_NEEDLE = "handleSchedule" + "Consult";
const HANDLE_TEST_FIRST_NEEDLE = "handleTest" + "First";
const HANDLE_PROCEED_TO_PURCHASE_NEEDLE = "handleProceedTo" + "Purchase";
const SAVED_TO_SERVER_NEEDLE = "savedTo" + "Server";
const ON_SCHEDULE_CONSULT_NEEDLE = "onSchedule" + "Consult";
const ON_PROCEED_TO_PURCHASE_NEEDLE = "onProceedTo" + "Purchase";
const ON_TEST_FIRST_NEEDLE = "onTest" + "First";
const SEE_RESULTS_NEEDLE = "See res" + "ults";
const CONTINUE_TO_PURCHASE_NEEDLE = "Continue to Purchase " + "AlleDrops";
const RECOMMEND_TESTING_NEEDLE = "We recommend proceeding with allergy testing";
const SET_STEP_OUTCOME_NEEDLE = 'setStep("out' + 'come")';

describe("QuizContainer.tsx has no remaining D-09 bypass/auto-submit chain (TEST-07)", () => {
  it("has no autoSubmit0to2Attempted ref or references", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, AUTO_SUBMIT_NEEDLE)).toBe(0);
  });

  it("has no handleScheduleConsult handler", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HANDLE_SCHEDULE_CONSULT_NEEDLE)).toBe(0);
  });

  it("has no handleTestFirst handler", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HANDLE_TEST_FIRST_NEEDLE)).toBe(0);
  });

  it("has no handleProceedToPurchase handler", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HANDLE_PROCEED_TO_PURCHASE_NEEDLE)).toBe(0);
  });

  it("has no savedToServer state or references", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, SAVED_TO_SERVER_NEEDLE)).toBe(0);
  });

  it("has no onScheduleConsult call-site prop", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, ON_SCHEDULE_CONSULT_NEEDLE)).toBe(0);
  });

  it("has no onProceedToPurchase call-site prop", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, ON_PROCEED_TO_PURCHASE_NEEDLE)).toBe(0);
  });

  it("has no onTestFirst call-site prop", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, ON_TEST_FIRST_NEEDLE)).toBe(0);
  });

  it('has no stale "See results" terminal button label', () => {
    expect(count(QUIZ_CONTAINER_SOURCE, SEE_RESULTS_NEEDLE)).toBe(0);
  });

  it('has no setStep("outcome") call — that step no longer precedes consent', () => {
    expect(count(QUIZ_CONTAINER_SOURCE, SET_STEP_OUTCOME_NEEDLE)).toBe(0);
  });

  // Positive controls — proves the surviving wiring is intact, not merely that the file was
  // gutted. An absence-only guard would pass just as well against an empty file.
  it("still selects the current part's items via itemsForPart", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "itemsForPart")).toBeGreaterThan(0);
  });

  it("still reads QUIZ_PARTS", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "QUIZ_PARTS")).toBeGreaterThan(0);
  });

  it("still computes quizPartsTotal for the progress indicator", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "quizPartsTotal")).toBeGreaterThan(0);
  });

  it("still uses handleAnswerChange with no special-case behavior", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "handleAnswerChange")).toBeGreaterThan(0);
  });

  // Updated by 04.2-04 (Phase 4.2): buildPayload was reduced to a thin wrapper over
  // app/lib/quiz/payload.ts's buildSubmitPayload (D-10 — one construction site so the one-sitting
  // and resumed paths cannot diverge). CONSENT_VERSION is stamped there now, not inline in
  // QuizContainer.tsx; the positive control here is split into the two facts that together prove
  // the wiring is intact: QuizContainer calls buildSubmitPayload, and buildSubmitPayload itself
  // still stamps CONSENT_VERSION.
  it("still stamps CONSENT_VERSION on the submitted payload (via payload.ts's buildSubmitPayload)", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "buildSubmitPayload")).toBeGreaterThan(0);
    expect(count(PAYLOAD_SOURCE, "CONSENT_VERSION")).toBeGreaterThan(0);
  });

  // NOT red-by-design: `handleProceedToPurchase` already calls `setStep("consent")` pre-change
  // (it is deleted by Task 3, but Task 3's rewired terminal-part button replaces it as the call
  // site), so this control already passes in the RED state. Kept as a positive control because
  // after Task 3 it must remain true for a structurally different reason (the single-path route).
  it('routes the last quiz part forward through setStep("consent")', () => {
    expect(count(QUIZ_CONTAINER_SOURCE, 'setStep("consent")')).toBeGreaterThan(0);
  });
});

describe("ResultsDisplay.tsx is terminal: no callback props, no bypass copy (TEST-05, D-10)", () => {
  it("has no onScheduleConsult prop/destructure/handler", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, ON_SCHEDULE_CONSULT_NEEDLE)).toBe(0);
  });

  it("has no onProceedToPurchase prop/destructure/handler", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, ON_PROCEED_TO_PURCHASE_NEEDLE)).toBe(0);
  });

  it("has no onTestFirst prop/destructure/handler", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, ON_TEST_FIRST_NEEDLE)).toBe(0);
  });

  it('has no "Continue to Purchase AlleDrops" 3-6 bypass button (TEST-05)', () => {
    expect(count(RESULTS_DISPLAY_SOURCE, CONTINUE_TO_PURCHASE_NEEDLE)).toBe(0);
  });

  it('has no "We recommend proceeding with allergy testing" clause (D-10, 7+ bracket)', () => {
    expect(count(RESULTS_DISPLAY_SOURCE, RECOMMEND_TESTING_NEEDLE)).toBe(0);
  });

  // Positive controls, red-by-design in Task 1 — Task 2 introduces all three.
  it("declares testingStatus as a data-only prop", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, "testingStatus")).toBeGreaterThan(0);
  });

  it('renders the "Schedule Allergy Testing" CTA', () => {
    expect(count(RESULTS_DISPLAY_SOURCE, "Schedule Allergy Testing")).toBeGreaterThan(0);
  });

  // Needle repointed by Phase 5 Plan 03 (SCORE-01): the original needle,
  // "Your responses have been submitted.", was the pre-Phase-5 subtitle, retired when the page was
  // retitled "Preliminary Score." The assertion's purpose is unchanged: proving the file still
  // renders a submission-confirmation line rather than having lost it in a refactor.
  it('renders the "1-2 business days" clinical-review confirmation line', () => {
    expect(count(RESULTS_DISPLAY_SOURCE, "1-2 business days")).toBeGreaterThan(0);
  });
});
