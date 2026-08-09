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

// Test-local fixture only — this phase ships no info-block content, so `questions.ts` must never
// gain a `kind: "info"` entry.
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
});
