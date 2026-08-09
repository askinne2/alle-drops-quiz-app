import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract test for SCH-02: "no question-ID literals remain in QuizPartRenderer.tsx".
 *
 * WHY THIS FILE EXISTS. REQUIREMENTS.md's SCH-02 line references (`:36-38` and
 * `:276-278,295-299`) under-counted the real inventory — D-13 in 02-CONTEXT.md corrected this.
 * Two forbidden-literal classes were missing from the original enumeration entirely: the
 * `isExclusiveNoneQuestion` helper (`:26-28`) and five separate occurrences of the quoted option
 * value `"none"` (`:47, 57, 71, 74, 75`). This file guards the CORRECTED, complete inventory, not
 * the original under-count.
 *
 * Every assertion below computes occurrences with `SOURCE.split(needle).length - 1` — never a
 * line-counting grep invocation. A line-counting count collapses every multi-match line down to
 * `1`, which undercounts silently. Occurrence counting must use `split(needle).length - 1`
 * throughout this file; that is the only correct way to count matches, not lines. Three separate
 * executors and the orchestrator have each hit this exact line-vs-occurrence trap independently in
 * this project (see STATE.md "Accumulated Context" — the Klaviyo count reported as 4 when the real
 * occurrence count was 10).
 *
 * Needles are assembled from string fragments rather than written as contiguous literals, so this
 * file's own text does not itself match a naive repo-wide search for the forbidden tokens it is
 * proving absent from the renderer.
 */

const SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizPartRenderer.tsx"),
  "utf-8",
);

const Q = '"';
const quoted = (fragmentA: string, fragmentB: string) => `${Q}${fragmentA}${fragmentB}${Q}`;

// Quoted option-value literal: `"none"` as it appears in `raw.includes("none")`,
// `opt.value === "none"`, `["none"]`, and `cur.filter((v) => v !== "none")`.
const NONE_NEEDLE = quoted("no", "ne");

// Quoted question-ID literals: the four IDs hardcoded inside `isExclusiveNoneQuestion`'s array.
const TIMING_TRIGGERS_NEEDLE = quoted("timing_", "triggers");
const SYMPTOMS_NASAL_NEEDLE = quoted("symptoms_", "nasal");
const SYMPTOMS_EYE_NEEDLE = quoted("symptoms_", "eye");
const SYMPTOMS_SINUS_NEEDLE = quoted("symptoms_", "sinus");

// Quoted question-ID literals: the med_list / med_control conditional-visibility hardcode.
const MED_LIST_NEEDLE = quoted("med_", "list");
const MED_CONTROL_NEEDLE = quoted("med_", "control");

// Bare (unquoted) identifier: `answers.taking_meds` property reads at two sites. A quoted-only
// needle would miss both — this is the same class of error as STATE.md's `apntly` vs `appointly`
// retraction, a count against the wrong needle read as absence.
const TAKING_MEDS_NEEDLE = "taking" + "_meds";

// Helper-function name: the definition plus its one call site.
const IS_EXCLUSIVE_NONE_QUESTION_NEEDLE = "isExclusive" + "NoneQuestion";

describe("QuizPartRenderer.tsx has no question-ID or 'none'-value literals (SCH-02)", () => {
  it("has no quoted \"none\" option-value literal", () => {
    // Measured on pre-refactor main: 5 occurrences (:47, 57, 71, 74, 75).
    const count = SOURCE.split(NONE_NEEDLE).length - 1;
    expect(count).toBe(0);
  });

  it("has none of the four hardcoded question IDs (timing_triggers, symptoms_nasal, symptoms_eye, symptoms_sinus)", () => {
    // Measured on pre-refactor main: 1 occurrence each, all inside isExclusiveNoneQuestion's array.
    // expect.soft so every mismatched needle in this loop is reported, not just the first.
    const needles = [
      TIMING_TRIGGERS_NEEDLE,
      SYMPTOMS_NASAL_NEEDLE,
      SYMPTOMS_EYE_NEEDLE,
      SYMPTOMS_SINUS_NEEDLE,
    ];
    for (const needle of needles) {
      const count = SOURCE.split(needle).length - 1;
      expect.soft(count, `needle ${needle}`).toBe(0);
    }
  });

  it("has no quoted med_list or med_control literal", () => {
    // Measured on pre-refactor main: 3 occurrences each (the part-5 visibility guard in the
    // renderer body, the same guard in isPartComplete, and each question's own required-check).
    const medListCount = SOURCE.split(MED_LIST_NEEDLE).length - 1;
    expect.soft(medListCount, "med_list").toBe(0);
    const medControlCount = SOURCE.split(MED_CONTROL_NEEDLE).length - 1;
    expect.soft(medControlCount, "med_control").toBe(0);
  });

  it("has no bare taking_meds identifier reference", () => {
    // Measured on pre-refactor main: 2 occurrences (answers.taking_meds at :31 and :273).
    const count = SOURCE.split(TAKING_MEDS_NEEDLE).length - 1;
    expect(count).toBe(0);
  });

  it("has no isExclusiveNoneQuestion helper", () => {
    // Measured on pre-refactor main: 2 occurrences (the function definition and its one call site).
    const count = SOURCE.split(IS_EXCLUSIVE_NONE_QUESTION_NEEDLE).length - 1;
    expect(count).toBe(0);
  });
});
