import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUIZ_PARTS,
  ALL_SCORED_QUESTIONS,
  ALL_ITEMS,
  getQuestionById,
} from "../app/lib/quiz/questions";
import { quizFlowProgress } from "../app/lib/quiz/schema";

/**
 * Positive canary for the Phase 4.1 `QUIZ_PARTS` reorder (04.1-CONTEXT.md D-02).
 *
 * `QUIZ_PARTS` moved `PART7_ALLERGY_TESTING` from last to first so a patient who cannot supply
 * allergy test results discovers the hard upload requirement in the first ~30 seconds instead of
 * after a completed ten-minute clinical intake. This file is the POSITIVE assertion that the new
 * order landed and stays landed. The three DOM test files repointed in the same plan
 * (`tests/quiz-part-renderer-dom.test.ts`, `tests/quiz-file-upload-dom.test.ts`,
 * `tests/quiz-medical-history-deletion.test.ts`) are this guard's NEGATIVE canary — each hardcodes
 * a literal part index and fails loudly if a future reorder moves a part without updating them.
 *
 * Three describe blocks:
 *   1. QUIZ_PARTS flow order — proves index 0 is Part 7, index 1 is Part 1, index 6 is Part 6.
 *   2. Score invariance — proves the reorder cannot alter what `ALL_SCORED_QUESTIONS` contains,
 *      and that `ALL_ITEMS` (the payload-boundary membership) is exactly the union of all seven
 *      parts with no duplicates (T-4.1-02: reorder changes key ORDER, never key MEMBERSHIP).
 *   3. Consent invariant — proves `quizFlowProgress` still places consent at the final step and
 *      that `QuizContainer.tsx` still has exactly one submit path (T-4.1-06).
 *
 * Occurrence counting uses `SOURCE.split(needle).length - 1` exclusively — NEVER a line-counting
 * grep with the count flag, which collapses a match-dense single line down to a count of `1`.
 * This project has been burned by that trap twice (the Klaviyo "4 vs 10" incident and the
 * `apntly`/`appointly` wrong-needle incident, both recorded in STATE.md's "Accumulated Context").
 */

const count = (source: string, needle: string): number => source.split(needle).length - 1;

describe("QUIZ_PARTS flow order (04.1 D-02)", () => {
  it("non-vacuity control: the three positional anchor ids resolve to real questions before any positional claim is made", () => {
    // A typo'd id would make `.includes("...")` below fail loudly (good), but a typo'd id inside
    // a QUIZ_PARTS array member would make a positional assertion pass VACUOUSLY if the same typo
    // were repeated in the assertion itself. Resolving through the real getQuestionById closes
    // that gap: each anchor id must be a real, defined question before its position is trusted.
    expect(getQuestionById("testing_status")).toBeDefined();
    expect(getQuestionById("symptoms_nasal")).toBeDefined();
    expect(getQuestionById("history_comorbidities")).toBeDefined();
  });

  it("QUIZ_PARTS has exactly 7 entries", () => {
    expect(QUIZ_PARTS.length).toBe(7);
  });

  it("index 0 IS Part 7 (allergy testing) — leads the flow per D-02", () => {
    const ids = QUIZ_PARTS[0].map((item) => item.id);
    expect(ids).toContain("testing_status");
    expect(ids).toContain("testing_year");
    expect(ids).toContain("testing_location");
    expect(ids).toContain("testing_allergens");
    expect(ids).toContain("testing_files");
  });

  it("index 1 IS Part 1 (symptom checklist) — immediately follows Part 7", () => {
    const ids = QUIZ_PARTS[1].map((item) => item.id);
    expect(ids).toContain("symptoms_nasal");
  });

  it("index 6 IS Part 6 (medical history) — still last, immediately before consent", () => {
    const ids = QUIZ_PARTS[6].map((item) => item.id);
    expect(ids).toContain("history_comorbidities");
    expect(ids).toContain("has_pcp");
  });
});

describe("score invariance (ROADMAP success criterion 3)", () => {
  it("ALL_SCORED_QUESTIONS contains zero Part 7 (testing_*) question ids", () => {
    const testingIds = ALL_SCORED_QUESTIONS.filter((q) => q.id.startsWith("testing_"));
    expect(testingIds).toHaveLength(0);
  });

  it("ALL_SCORED_QUESTIONS contains zero Part 6 (medical history) question ids", () => {
    // NOTE: `diagnosed_allergic_condition` is deliberately NOT in this exclusion set. It is a
    // genuine Part 5 question (`part: 5`, adjacent to the Part 5 medication questions per
    // PROJECT.md's DIAG-01 requirement) that legitimately belongs in ALL_SCORED_QUESTIONS — its
    // `yesno` type just happens to contribute 0 points. Excluding it here would make this
    // assertion fail against correct code. Verified against questions.ts:241-260 before writing
    // this test.
    const part6Prefixes = ["history_", "has_pcp", "pcp_", "current_medications"];
    const part6Ids = ALL_SCORED_QUESTIONS.filter((q) =>
      part6Prefixes.some((prefix) => q.id.startsWith(prefix))
    );
    expect(part6Ids).toHaveLength(0);
  });

  it("every ALL_SCORED_QUESTIONS entry has part <= 5", () => {
    for (const q of ALL_SCORED_QUESTIONS) {
      expect(q.part).toBeLessThanOrEqual(5);
    }
  });

  it("ALL_ITEMS id SET equals the union of ids across all seven QUIZ_PARTS entries, with no duplicates", () => {
    const allItemsIds = ALL_ITEMS.map((item) => item.id);
    const unionIds = QUIZ_PARTS.flat().map((item) => item.id);

    // Membership proof (T-4.1-02): the reorder changes key ORDER in the emitted answers object,
    // never key MEMBERSHIP, so no PHI field enters or leaves the payload boundary.
    expect(new Set(allItemsIds)).toEqual(new Set(unionIds));
    expect(allItemsIds).toHaveLength(unionIds.length);

    // No duplicates within ALL_ITEMS itself.
    expect(new Set(allItemsIds).size).toBe(allItemsIds.length);
  });
});

describe("consent invariant survives the reorder (04-CONTEXT.md D-09, ROADMAP criterion 4)", () => {
  const QUIZ_CONTAINER_SOURCE = readFileSync(
    join(process.cwd(), "app", "components", "quiz", "QuizContainer.tsx"),
    "utf-8"
  );

  it('setStep("results") appears exactly twice — the post-submit transition and the Test Mode shortcut', () => {
    expect(count(QUIZ_CONTAINER_SOURCE, 'setStep("results")')).toBe(2);
  });

  it('setStep("consent") appears at least once', () => {
    expect(count(QUIZ_CONTAINER_SOURCE, 'setStep("consent")')).toBeGreaterThanOrEqual(1);
  });

  it("handleConsentSubmit appears at least twice — its definition plus its single call site", () => {
    expect(count(QUIZ_CONTAINER_SOURCE, "handleConsentSubmit")).toBeGreaterThanOrEqual(2);
  });

  it("submitPayload( appears exactly once — measured at HEAD; a second submit path must fail this loudly", () => {
    // Measured value at plan 04.1-01 time: 1 call site (inside handleConsentSubmit). If a future
    // edit adds a second submit path, this hardcoded count catches it instead of silently letting
    // a patient submit twice (the double-submit defect class closed by Phase 4 Plan 08).
    expect(count(QUIZ_CONTAINER_SOURCE, "submitPayload(")).toBe(1);
  });

  it('quizFlowProgress places consent at the FINAL step for QUIZ_PARTS.length', () => {
    const result = quizFlowProgress({ kind: "consent" }, QUIZ_PARTS.length);
    expect(result?.label).toBe("Step 10 of 10");
  });

  it("quizFlowProgress places the last quiz part (index 6, medical history) immediately before consent", () => {
    const result = quizFlowProgress({ kind: "quiz_part", index: 6 }, QUIZ_PARTS.length);
    expect(result?.label).toBe("Step 9 of 10");
  });
});
