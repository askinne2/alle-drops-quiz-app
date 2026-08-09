import { describe, it, expect } from "vitest";
import {
  type QuizQuestion,
  type QuizInfoBlock,
} from "../app/lib/quiz/types";
import {
  ALL_SCORED_QUESTIONS,
  ALL_ITEMS,
  PART6_MEDICAL_HISTORY,
} from "../app/lib/quiz/questions";
import { calculateTotalScore } from "../app/lib/quiz/scoring";
import { isAnswered } from "../app/lib/quiz/schema";

/**
 * Compile-time proof of D-09: an info block cannot become a question, cannot enter the scored
 * question set, cannot reach calculateTotalScore, and cannot carry `required`.
 *
 * WHY THIS FILE EXISTS AS A TYPECHECK PROOF, NOT A RUNTIME ONE. A runtime test that merely
 * observes an info block scoring 0 would pass VACUOUSLY: `scoreQuestion`'s `default` branch
 * already returns 0 whenever `question.type` is unrecognized, so a test asserting "info blocks
 * score zero" would pass whether or not the type system enforces the exclusion. D-09's actual
 * claim is a typecheck claim — proven here by `npm run typecheck` failing if the guarantee is
 * ever lost.
 *
 * Each directive below is a two-way assertion, not a one-way suppression: if the union ever
 * widens so a marked line stops being a type error, `tsc` raises TS2578 ("Unused directive") and
 * the build breaks. That failure mode IS the proof mechanism — a directive that can never fail
 * proves nothing, which is why this file's own verification step includes a negative control (see
 * 02-01-SUMMARY.md for the observed TS2578 text from temporarily flipping INFO_FIXTURE's
 * discriminant to "question").
 */

// Test-local fixture, kept independent of questions.ts's own info-block content (HIST-04's
// no_pcp_recommendation, added in Phase 3) so these compile-time invariants are proven against a
// fixture the test fully controls, not against production data that could itself drift.
const INFO_FIXTURE: QuizInfoBlock = {
  kind: "info",
  id: "test-fixture-info-block",
  paragraphs: ["This is a test-local info block, never registered in questions.ts."],
  order: 999,
  part: 1,
};

describe("quiz schema type guarantees (D-09)", () => {
  it("invariant 1: QuizInfoBlock is not assignable to QuizQuestion", () => {
    // @ts-expect-error — QuizInfoBlock is missing QuizQuestion's required `type` and `text`
    // fields, and its `kind` literal ("info") is incompatible with QuizQuestion's ("question").
    const notAQuestion: QuizQuestion = INFO_FIXTURE;
    expect(notAQuestion).toBeDefined();
  });

  it("invariant 2: an info block cannot enter a QuizQuestion[]-typed array", () => {
    // @ts-expect-error — the array literal's element type widens to QuizInfoBlock, which is not
    // assignable to the QuizQuestion[] target type.
    const notQuestionArray: QuizQuestion[] = [INFO_FIXTURE];
    expect(notQuestionArray).toHaveLength(1);
  });

  it("invariant 3: calculateTotalScore refuses an argument containing a QuizInfoBlock", () => {
    // @ts-expect-error — calculateTotalScore's first parameter is QuizQuestion[]; an array literal
    // containing INFO_FIXTURE cannot be assigned to it, so an info block can never reach scoring.
    const score = calculateTotalScore([INFO_FIXTURE], {});
    expect(score).toBeDefined();
  });

  it("invariant 4: QuizInfoBlock has no required property", () => {
    // @ts-expect-error — `required` exists on QuizQuestion, not on QuizInfoBlock. Reading it here
    // is a compile error, not merely `undefined` at runtime.
    const hasRequired = INFO_FIXTURE.required;
    expect(hasRequired).toBeUndefined();
  });

  it("keeps every ALL_SCORED_QUESTIONS member kind: question, and ALL_ITEMS covers parts 1-6", () => {
    for (const question of ALL_SCORED_QUESTIONS) {
      expect(question.kind).toBe("question");
    }
    expect(ALL_ITEMS.length).toBe(ALL_SCORED_QUESTIONS.length + PART6_MEDICAL_HISTORY.length);
  });

  // Non-vacuous positive control (Phase 3, Task 3): the old Part 6 content had zero info blocks,
  // so this guarantee is new with HIST-04's no_pcp_recommendation and must be asserted, not
  // assumed.
  it("ALL_ITEMS contains at least one member with kind === 'info'", () => {
    const infoBlocks = ALL_ITEMS.filter((item) => item.kind === "info");
    expect(infoBlocks.length).toBeGreaterThanOrEqual(1);
  });
});

/**
 * isAnswered — Phase 4 question types (04-02, TEST-01/TEST-03/TEST-04).
 *
 * Synthetic QuizQuestion fixtures built inline, deliberately independent of QUIZ_PARTS /
 * PART7_TESTING — Part 7 lands in plan 04-05, so this coverage must be green before that plan
 * runs. Each new type is asserted in both directions (answered / not answered) per T-4-04: an
 * omission from isAnswered's switch fails CLOSED via `default: return false`, so a type that
 * never reaches its intended group would show up here as an always-false question, not a crash.
 */
function makeQuestion(type: QuizQuestion["type"]): QuizQuestion {
  return {
    kind: "question",
    id: `fixture-${type}`,
    type,
    text: "Fixture question text",
    order: 1,
    part: 7,
  };
}

describe("isAnswered — Phase 4 question types", () => {
  it("radio_single: a non-empty option value is answered", () => {
    const q = makeQuestion("radio_single");
    expect(isAnswered(q, "had_testing")).toBe(true);
  });

  it("radio_single: an empty string is not answered", () => {
    const q = makeQuestion("radio_single");
    expect(isAnswered(q, "")).toBe(false);
  });

  it("radio_single: undefined is not answered", () => {
    const q = makeQuestion("radio_single");
    expect(isAnswered(q, undefined)).toBe(false);
  });

  it("text_input_short: non-whitespace text is answered", () => {
    const q = makeQuestion("text_input_short");
    expect(isAnswered(q, "2019")).toBe(true);
  });

  it("text_input_short: whitespace-only text is not answered", () => {
    const q = makeQuestion("text_input_short");
    expect(isAnswered(q, "   ")).toBe(false);
  });

  it("text_input_short: undefined is not answered", () => {
    const q = makeQuestion("text_input_short");
    expect(isAnswered(q, undefined)).toBe(false);
  });

  it("file_multi: a non-empty token array is answered", () => {
    const q = makeQuestion("file_multi");
    expect(isAnswered(q, ["tok_a"])).toBe(true);
  });

  it("file_multi: an empty array is not answered (D-06 empty-array rule extends to files)", () => {
    const q = makeQuestion("file_multi");
    expect(isAnswered(q, [])).toBe(false);
  });

  it("file_multi: undefined is not answered", () => {
    const q = makeQuestion("file_multi");
    expect(isAnswered(q, undefined)).toBe(false);
  });

  it("file_multi: a bare string is not a token list and is not answered", () => {
    const q = makeQuestion("file_multi");
    expect(isAnswered(q, "tok_a")).toBe(false);
  });

  // Non-vacuity regression: proves an unchanged existing type still behaves as before this plan's
  // edit, so a future refactor that collapses the isAnswered groups incorrectly fails here too.
  it("regression: control_0_3 and text_input are unchanged by this plan's edit", () => {
    expect(isAnswered(makeQuestion("control_0_3"), "well")).toBe(true);
    expect(isAnswered(makeQuestion("text_input"), "  ")).toBe(false);
  });
});
