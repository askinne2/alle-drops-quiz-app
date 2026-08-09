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

describe("public/quiz-bundle.js carries Phase 3 (mandatory-medical-history) content — the Phase 2 markers above CANNOT detect Phase 3 staleness, since all three were already true of the Phase-3-stale bundle measured during plan 03-05 planning", () => {
  it('contains the "has_pcp" question ID at least once — proves the PCP branch (HIST-04) is compiled in', () => {
    // Measured against the pre-03-05-rebuild committed bundle (still carrying Phase-2-era
    // content, 185796 bytes): 0 occurrences. Measured against the bundle freshly rebuilt in
    // this plan (186699 bytes): 4 occurrences. A bundle missing this entirely means the PCP
    // yes/no gate and its two branches (clinic fields / no_pcp_recommendation info block) never
    // made it into the theme bundle.
    const needle = "has_pcp";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "history_comorbidities" question ID at least once — proves the eleven-option comorbidity checklist (HIST-01) is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 2 occurrences.
    const needle = "history_comorbidities";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "pcp_clinic_address" question ID at least once — proves the PCP "yes" branch\'s two clinic fields are compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "pcp_clinic_address";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "infoBlockCard" CSS class family at least once — proves InfoBlockCard\'s Phase-3 visual identity (plan 03-04) is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 15 occurrences (the class family applied across the component plus its
    // CSS Modules-generated selector names).
    const needle = "infoBlockCard";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the locked no_pcp_recommendation copy fragment "before beginning SLIT" at least once — proves the exact clinical copy shipped, not a placeholder', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence. esbuild does not mangle string literals, so this locked
    // sentence fragment survives minification verbatim.
    const needle = "before beginning SLIT";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('has zero occurrences of the deleted "history_personal" question ID — the old Part 6 must not survive the rebuild', () => {
    // Measured against the pre-rebuild committed bundle (which still carried the OLD Part 6):
    // 6 occurrences. Measured against the fresh rebuild: 0 occurrences.
    const needle = "history_personal";
    expect(count(needle)).toBe(0);
  });

  it('has zero occurrences of the deleted "history_family" question ID — the old Part 6 must not survive the rebuild', () => {
    // Measured against the pre-rebuild committed bundle: 6 occurrences. Measured against the
    // fresh rebuild: 0 occurrences.
    const needle = "history_family";
    expect(count(needle)).toBe(0);
  });
});
