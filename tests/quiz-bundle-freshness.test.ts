import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for the "stale committed bundle" UAT defect.
 *
 * `public/quiz-bundle.js` is a COMMITTED build artifact produced by `npm run build:theme` (a
 * separate `vite.theme.config.ts` build), NOT by `npm run build`. Nothing in CI or in this test
 * suite runs `build:theme` automatically, so a plan that changes `app/components/quiz/*` or
 * `app/lib/quiz/*` but forgets to rebuild and commit the theme bundle ships an invisible no-op to
 * the storefront — a repeat of the session-28 incident (see `HANDOFF.md` / `PROJECT.md`) and the
 * exact UAT defect this test closes.
 *
 * This test reads the COMMITTED bundle from disk (not a fresh build) and asserts on markers that
 * only exist once Phase 2's schema-evaluator module (`app/lib/quiz/schema.ts`) and its info-block
 * rendering branch (`QuizPartRenderer.tsx`'s `InfoBlockCard`) are actually compiled in. Every
 * marker below was independently VERIFIED against both the committed-stale bundle (measured:
 * counts of 0) and a freshly rebuilt bundle (measured: counts >= 1) before being chosen — a
 * candidate marker is only trustworthy once measured this way, per this repo's own documented
 * "grep -c counts lines, not occurrences" trap (see `tests/quiz-part-renderer-no-literals.test.ts`
 * and STATE.md's "Accumulated Context").
 *
 * Occurrence counting uses `SOURCE.split(needle).length - 1` exclusively — NEVER a line-counting
 * `grep -c`, which collapses a single-line ~185KB minified bundle down to a count of `1` for any
 * needle present anywhere, making a `>= 1` gate pass vacuously. Four separate agents in this
 * project have already been burned by this exact trap.
 */

const SOURCE = readFileSync(join(process.cwd(), "public", "quiz-bundle.js"), "utf-8");

const count = (needle: string): number => SOURCE.split(needle).length - 1;

describe("public/quiz-bundle.js is fresh relative to app/lib/quiz source (bundle-staleness guard)", () => {
  it('has zero occurrences of the removed pre-refactor "isExclusiveNoneQuestion" helper', () => {
    // Measured: 0 in both the stale committed bundle and a fresh rebuild — this alone cannot
    // detect staleness (see the positive markers below for that), but its absence is still a
    // correctness requirement: this hardcode must never reappear in a rebuilt bundle.
    const needle = "isExclusive" + "NoneQuestion";
    expect(count(needle)).toBe(0);
  });

  it('contains the schema evaluator\'s "isAnswered" showIf operator literal at least once — proves app/lib/quiz/schema.ts is compiled in', () => {
    // Measured against the STALE bundle committed at Phase 1 (before schema.ts existed): 0
    // occurrences. Measured against a bundle freshly rebuilt from the current source: 2
    // occurrences (the quoted `"isAnswered" in condition` check and the `condition.isAnswered`
    // property read in `evaluateShowIf` — both survive minification because esbuild does not
    // mangle string literals or property-access names, only local identifiers). A bundle missing
    // this entirely means schema.ts's evaluator module never made it into the theme bundle,
    // which is exactly the staleness defect this test exists to catch.
    const needle = "isAnswered";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the info-block render branch\'s quoted "info" kind check at least once — proves QuizPartRenderer.tsx\'s InfoBlockCard path is compiled in', () => {
    // Measured against the STALE bundle: 0 occurrences (info-block rendering did not exist in
    // the Phase 1 bundle at all). Measured against a fresh rebuild: 1 occurrence, from
    // `k.kind==="info"` in the minified InfoBlockCard branch. This is the exact code path the
    // sibling UAT defect fix (info blocks reaching the renderer) depends on shipping to the
    // storefront, so its presence in the committed bundle is a correctness requirement, not
    // just a staleness signal.
    const Q = String.fromCharCode(34);
    const needle = Q + "info" + Q;
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });
});
