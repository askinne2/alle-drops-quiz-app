import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for Phase 3 Plan 03-03's D-11/D-12 deletions.
 *
 * D-11 deleted the 7+ "Proceed Without Testing" chain (`handleProceedWithoutTesting`,
 * `handleConfirmProceedWithoutTesting`, `handleDeclineProceedWithoutTesting`, the
 * `showProceedWarning` state, and the warning modal) from `QuizContainer.tsx`, plus the
 * `onProceedWithoutTesting` callback prop and its button from `ResultsDisplay.tsx`.
 *
 * D-12 deleted the `"medical_history"` `FlowStep` and everything that existed to serve it: the
 * `PART6_MEDICAL_HISTORY` import, the seeding effect that wrote `history_personal`/`history_family`
 * to `[]`, the `step === "medical_history"` render branch, and the consent back-button's
 * `scoreBracket === "7+"` special case (`handleConfirmProceedWithoutTesting` was the only remaining
 * call site setting `step` to `"medical_history"` — deleting it is what makes "no remaining code
 * path sets step to medical_history" true).
 *
 * This same plan closed T-3-01 (the client half): `buildPayload`/`submitPayload`'s `extra`
 * parameter, and the `personal_history`/`family_history` keys `handleConsentSubmit` used to
 * populate it, are also asserted absent here.
 *
 * Why a dead `FlowStep` is dangerous in THIS codebase specifically: `app/entry.theme.tsx`'s
 * `injectIframe` open redirect survived two independent code reviews because both reviews
 * inherited an earlier, narrower measurement ("the storefront never reaches this branch") and
 * generalized it into "this code is dead" without re-checking every entry path. A `FlowStep` union
 * member with no reachable `setStep(...)` call is exactly that failure shape waiting to happen
 * again — the type system does not flag an unreachable union member, so nothing but a source-text
 * assertion catches its silent revival in a future edit.
 *
 * `onScheduleConsult`, `onProceedToPurchase`, and `onTestFirst` are DELIBERATELY still asserted
 * PRESENT (not absent) in `ResultsDisplay.tsx` below. Phase 4 (TEST-05) owns stripping the
 * remaining callback props and deleting the 3-6 "Continue to Purchase AlleDrops" jump
 * (`handleProceedToPurchase`) — this plan's job was the 7+ bypass only. An absence-only guard
 * would pass just as well against a file that had been gutted entirely; the positive assertions
 * below are what make this guard non-vacuous.
 *
 * Per this repo's established convention (see `tests/quiz-container-no-question-filter.test.ts`,
 * `tests/quiz-part-renderer-exclusive-clickable.test.ts`), occurrence counting uses
 * `SOURCE.split(needle).length - 1` — NEVER a line-counting `grep -c`, which collapses every
 * multi-match line down to a count of `1` and would pass an absence gate vacuously against a
 * single long line. Four separate agents on this project have hit that exact trap (see
 * STATE.md's "Accumulated Context" — the Klaviyo "4 vs 10 occurrences" incident). Every needle
 * below is assembled from string fragments so this file's own text does not itself match a naive
 * repo-wide search for the patterns it proves absent.
 */

const QUIZ_CONTAINER_SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizContainer.tsx"),
  "utf-8",
);

const RESULTS_DISPLAY_SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "ResultsDisplay.tsx"),
  "utf-8",
);

const count = (source: string, needle: string): number => source.split(needle).length - 1;

const Q = '"';
const quoted = (fragmentA: string, fragmentB: string) => `${Q}${fragmentA}${fragmentB}${Q}`;

// D-12: the FlowStep literal. Quoted form first — this is how the deleted consent back-button's
// `setStep(scoreBracket === "7+" ? "medical_history" : "outcome")` call site actually wrote it, and
// using the quoted form means a surviving explanatory comment that mentions "medical history" in
// prose (unquoted, with a space) cannot make this gate fail spuriously.
const MEDICAL_HISTORY_QUOTED_NEEDLE = quoted("medical_", "history");
// Bare form second, belt-and-suspenders — catches the identifier even outside a quoted string
// literal (e.g. a computed property or template-literal interpolation a future regression might
// use instead of a plain string), since a future edit reintroducing the step need not spell it
// exactly the way the original code did.
const MEDICAL_HISTORY_BARE_NEEDLE = "medical_" + "history";

const PART6_NEEDLE = "PART6_MEDICAL" + "_HISTORY";
const HANDLE_PROCEED_NEEDLE = "handleProceed" + "WithoutTesting";
const HANDLE_CONFIRM_PROCEED_NEEDLE = "handleConfirmProceed" + "WithoutTesting";
const HANDLE_DECLINE_PROCEED_NEEDLE = "handleDeclineProceed" + "WithoutTesting";
const SHOW_PROCEED_WARNING_NEEDLE = "showProceed" + "Warning";
const HISTORY_PERSONAL_NEEDLE = "history_" + "personal";
const HISTORY_FAMILY_NEEDLE = "history_" + "family";
const PERSONAL_HISTORY_NEEDLE = "personal_" + "history";
const FAMILY_HISTORY_NEEDLE = "family_" + "history";
const ON_PROCEED_WITHOUT_TESTING_NEEDLE = "onProceed" + "WithoutTesting";

describe("QuizContainer.tsx has no remaining medical_history FlowStep or D-11 bypass chain (D-11/D-12)", () => {
  it('has no quoted "medical_history" FlowStep literal', () => {
    // RED (pre-change source): 3 occurrences — the FlowStep union member, the seeding effect's
    // guard, and the consent back-button's ternary. Recorded in 03-03-SUMMARY.md.
    expect(count(QUIZ_CONTAINER_SOURCE, MEDICAL_HISTORY_QUOTED_NEEDLE)).toBe(0);
  });

  it('has no bare "medical_history" fragment anywhere in the file, quoted or not', () => {
    expect(count(QUIZ_CONTAINER_SOURCE, MEDICAL_HISTORY_BARE_NEEDLE)).toBe(0);
  });

  it("no longer imports PART6_MEDICAL_HISTORY", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, PART6_NEEDLE)).toBe(0);
  });

  it("has no handleProceedWithoutTesting handler", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HANDLE_PROCEED_NEEDLE)).toBe(0);
  });

  it("has no handleConfirmProceedWithoutTesting handler (the only remaining setStep('medical_history') call site)", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HANDLE_CONFIRM_PROCEED_NEEDLE)).toBe(0);
  });

  it("has no handleDeclineProceedWithoutTesting handler", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HANDLE_DECLINE_PROCEED_NEEDLE)).toBe(0);
  });

  it("has no showProceedWarning state or its setter", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, SHOW_PROCEED_WARNING_NEEDLE)).toBe(0);
  });

  it("no longer seeds history_personal (T-3-01 client half)", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HISTORY_PERSONAL_NEEDLE)).toBe(0);
  });

  it("no longer seeds history_family (T-3-01 client half)", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, HISTORY_FAMILY_NEEDLE)).toBe(0);
  });

  it("no longer builds a personal_history payload key via the dead extra parameter", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, PERSONAL_HISTORY_NEEDLE)).toBe(0);
  });

  it("no longer builds a family_history payload key via the dead extra parameter", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, FAMILY_HISTORY_NEEDLE)).toBe(0);
  });

  // Positive controls — proves the surviving wiring is intact, not merely that the file was
  // gutted. An absence-only guard would pass just as well against an empty file.
  it("still selects the current part's items via itemsForPart", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "itemsForPart")).toBeGreaterThan(0);
  });

  it("still reads QUIZ_PARTS (now six entries, including medical history as QUIZ_PARTS[5])", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "QUIZ_PARTS")).toBeGreaterThan(0);
  });

  it("still wires handleTestFirst — the 7+ patient's only remaining exit", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "handleTestFirst")).toBeGreaterThan(0);
  });

  it("still guards the 0-2 auto-submit with autoSubmit0to2Attempted (D-13 — unedited by this plan)", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "autoSubmit0to2Attempted")).toBeGreaterThan(0);
  });

  it("still computes quizPartsTotal for the progress indicator (unedited by this plan)", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "quizPartsTotal")).toBeGreaterThan(0);
  });
});

describe("ResultsDisplay.tsx has no onProceedWithoutTesting prop or button (D-11)", () => {
  it("has no onProceedWithoutTesting prop, destructure, or button handler", () => {
    // RED (pre-change source): 3 occurrences — the interface member, the destructured parameter,
    // and the button's onClick binding. Recorded in 03-03-SUMMARY.md.
    expect(count(RESULTS_DISPLAY_SOURCE, ON_PROCEED_WITHOUT_TESTING_NEEDLE)).toBe(0);
  });

  // Positive controls — Phase 4 (TEST-05) owns removing these; they must survive this plan intact.
  it("still declares onTestFirst — the 7+ patient's surviving exit", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, "onTestFirst")).toBeGreaterThan(0);
  });

  it("still declares onScheduleConsult", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, "onScheduleConsult")).toBeGreaterThan(0);
  });

  it("still declares onProceedToPurchase — the 3-6 jump, deliberately deferred to Phase 4", () => {
    expect(count(RESULTS_DISPLAY_SOURCE, "onProceedToPurchase")).toBeGreaterThan(0);
  });
});
