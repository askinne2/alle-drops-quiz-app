import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for a UAT defect: `QuizContainer.tsx` used to narrow
 * `QUIZ_PARTS[currentPartIndex]` (a `QuizItem[]`, which can contain `QuizInfoBlock` members) down
 * to `QuizQuestion[]` with `.filter((item): item is QuizQuestion => item.kind === "question")`
 * before handing the result to `QuizPartRenderer`. `QuizPartRenderer` and `isPartComplete` both
 * already accept the full `QuizItem[]` union and already branch correctly on `item.kind ===
 * "info"` (see `QuizPartRenderer.tsx`'s `InfoBlockCard`) — the question-only filter was the sole
 * broken link, silently discarding every info block before it ever reached the renderer, failing
 * Phase 2 Success Criterion 3.
 *
 * The fix moves item selection into the pure, tested `itemsForPart` function in
 * `app/lib/quiz/schema.ts` (proven in `schema.test.ts`) and `QuizContainer.tsx` now calls that
 * function instead of filtering inline. This test proves the filter cannot silently return by
 * asserting the forbidden source pattern is entirely absent from the file's source text.
 *
 * Per this repo's established convention (see `tests/quiz-part-renderer-no-literals.test.ts`),
 * occurrence counting uses `SOURCE.split(needle).length - 1` — NEVER a line-counting `grep -c`,
 * which collapses every multi-match line down to `1` and would pass this gate vacuously against
 * a single long line. The needle is assembled from string fragments so this file's own text does
 * not itself match a naive repo-wide search for the forbidden pattern it proves absent.
 */

const SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizContainer.tsx"),
  "utf-8",
);

const Q = '"';
const quoted = (fragmentA: string, fragmentB: string) => `${Q}${fragmentA}${fragmentB}${Q}`;

// The forbidden pattern: `item.kind === "question"` used as a filter predicate before rendering.
// Assembled from fragments (kind + === + quoted "question") so this file does not itself contain
// the contiguous literal it is proving absent.
const KIND_EQUALS_QUESTION_NEEDLE = "kind" + " === " + quoted("que", "stion");

// The specific narrowing filter call the defect used — belt-and-suspenders in case a future edit
// reorders the comparison (`"question" === item.kind`) without reintroducing the exact needle
// above. Both needles must be absent for the guard to hold.
const REVERSED_NEEDLE = quoted("que", "stion") + " === " + "kind";

describe("QuizContainer.tsx has no question-only filter before rendering (UAT defect fix)", () => {
  it('has no `kind === "question"` filter predicate', () => {
    // Measured against the pre-fix file (02-04 state): 1 occurrence, in the
    // `.filter((item): item is QuizQuestion => item.kind === "question")` call.
    const count = SOURCE.split(KIND_EQUALS_QUESTION_NEEDLE).length - 1;
    expect(count).toBe(0);
  });

  it('has no reversed `"question" === kind` filter predicate either', () => {
    const count = SOURCE.split(REVERSED_NEEDLE).length - 1;
    expect(count).toBe(0);
  });

  it("calls itemsForPart to select the current part's items, so QuizPartRenderer receives the full QuizItem union", () => {
    // Positive proof, not just an absence proof — confirms the replacement wiring is actually
    // present, not merely that the old literal happens to be gone for an unrelated reason.
    const count = SOURCE.split("itemsForPart").length - 1;
    expect(count).toBeGreaterThan(0);
  });
});
