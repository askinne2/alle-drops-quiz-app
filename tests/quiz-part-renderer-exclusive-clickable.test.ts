import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for a UAT defect (session 33): `QuizPartRenderer.tsx` passed
 * `disabled={disabled || isOptionDisabledByExclusive(question, raw, opt)}` to every checkbox in a
 * checkbox_multi / radio_multi group, so selecting an option flagged `exclusive: true` ("None of
 * the above", present on 4 questions across Parts 1, 2 and 6) set the DOM `disabled` attribute on
 * every other option in that group.
 *
 * The patient-facing consequence: mis-click "None of the above" and there is no way to switch to
 * a real answer — the click on the real answer never fires, and nothing on screen says that
 * re-clicking "None" is the escape. `toggleOption` in `app/lib/quiz/schema.ts` had always handled
 * the switch correctly (`toggleOption(q, ["none"], "sneezing") === ["sneezing"]`, proven in
 * `schema.test.ts`); the `disabled` attribute was the sole reason that path was unreachable.
 *
 * The fix removes the disable and deletes `isOptionDisabledByExclusive` outright, so a future
 * renderer cannot wire it back in. This file guards the renderer half; `schema.test.ts` guards
 * the pure half. There is no DOM test infra in this repo (DIR-01), so a source-text guard is the
 * established substitute — see `tests/quiz-container-no-question-filter.test.ts`.
 *
 * Proven RED against the pre-fix file (`033af47` state): 1 occurrence of the helper call, 1
 * occurrence of the compound `disabled={disabled || ` binding.
 *
 * Occurrence counting uses `SOURCE.split(needle).length - 1` — NEVER `grep -c`, which counts
 * LINES and collapses every multi-match line to 1.
 */

const SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizPartRenderer.tsx"),
  "utf-8",
);

// Assembled from fragments so this file does not itself contain the contiguous literal it proves
// absent, keeping a naive repo-wide search for the banned symbol honest.
const HELPER_NEEDLE = "isOptionDisabled" + "ByExclusive";

describe("QuizPartRenderer.tsx keeps every option clickable (UAT defect fix)", () => {
  it("never calls the deleted exclusive-disable helper", () => {
    expect(SOURCE.split(HELPER_NEEDLE).length - 1).toBe(0);
  });

  it("has no compound disabled binding that could re-derive a disable from answer state", () => {
    expect(SOURCE.split("disabled={disabled || ").length - 1).toBe(0);
  });

  it("still honors the component's own `disabled` prop on the multi-select checkbox", () => {
    // Positive proof, not just absence — the submit-in-flight lockout must survive the fix.
    // One checkbox input exists in the file (checkbox_multi / radio_multi share a branch).
    expect(SOURCE.split('type="checkbox"').length - 1).toBe(1);
    expect(SOURCE.split("disabled={disabled}").length - 1).toBeGreaterThan(0);
  });

  it("still routes every option click through toggleOption, which clears the exclusive value", () => {
    expect(SOURCE.split("toggleOption(").length - 1).toBeGreaterThan(0);
  });
});
