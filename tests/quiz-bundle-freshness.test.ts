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

/**
 * Phase 4 (mandatory-allergy-testing) rebuild — plan 04-09.
 *
 * Rebuilt 2026-08-10 via `npm run build:theme`, folding in the unblocked track's five plans
 * (04-02 schema, 04-03 consent copy, 04-06 Part 7 data, 04-07 render branches, 04-08 flow
 * rewiring). Committed bundle byte size moved 186764 -> 185946 bytes (-818; net decrease because
 * 04-08's deletions of the auto-submit chain and three bypass handlers outweigh the additions
 * from the other four plans). Determinism was verified by running `npm run build:theme` twice in
 * a row and confirming byte-identical SHA-256 hashes
 * (`12cab4a52c7d549e4cd9117d89b14e2309b8f97bbf5b274d4bb965fc0faa4f0e`) before any marker below was
 * trusted, per this file's own documented "grep -c is vacuous" trap — every count here was
 * produced with `SOURCE.split(needle).length - 1`, never `grep -c`.
 *
 * The Phase 2/Phase 3 markers above CANNOT detect Phase 4 staleness — all of them were already
 * true of the Phase-4-stale bundle measured at the start of this plan.
 */
describe("public/quiz-bundle.js carries Phase 4 (mandatory-allergy-testing) content — the unblocked track's consent-first flow, Part 7, and its two render branches", () => {
  it('contains the "had_testing" Part 7 option value at least once — proves the had-testing branch of HIST-05/TEST-02 is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 6 occurrences. A quoted option value, so it survives minification verbatim.
    const needle = "had_testing";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the locked "I\'ve already had allergy testing" option label at least once — proves the exact clinical copy shipped, not a placeholder', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 2 occurrences.
    const needle = "I've already had allergy testing";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the quoted "radio_single" QuestionType at least once — proves 04-07\'s new render branch is compiled into the renderer switch', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 3 occurrences. esbuild does not mangle quoted string literals used as
    // discriminant values in a switch, only local identifiers.
    const needle = "radio_single";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the quoted "text_input_short" QuestionType at least once — proves 04-07\'s second new render branch is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 4 occurrences.
    const needle = "text_input_short";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the locked "Schedule Allergy Testing" results CTA at least once — proves 04-08\'s terminal ResultsDisplay action area is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "Schedule Allergy Testing";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "Your responses have been submitted." results confirmation line at least once — proves the post-consent terminal results screen (04-08) is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "Your responses have been submitted.";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the D-11 interim consent copy fragment "insurance coverage is not guaranteed" at least once — proves 04-03\'s consent copy shipped, not a placeholder', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "insurance coverage is not guaranteed";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('has zero occurrences of the deleted "See results" terminal-part button label — 04-08 renamed it to "Continue" (the button now leads to consent, not results)', () => {
    // Measured against the pre-rebuild committed bundle: 1 occurrence. Measured against the
    // fresh rebuild: 0 occurrences. Fragment-assembled so this test's own prose cannot self-match.
    const needle = "See res" + "ults";
    expect(count(needle)).toBe(0);
  });

  it('has zero occurrences of the deleted "Continue to Purchase AlleDrops" button — 04-08 deleted the 3-6 bracket\'s purchase-bypass handler and its button', () => {
    // Measured against the pre-rebuild committed bundle: 1 occurrence. Measured against the
    // fresh rebuild: 0 occurrences. Fragment-assembled so this test's own prose cannot self-match.
    const needle = "Continue to Purchase " + "AlleDrops";
    expect(count(needle)).toBe(0);
  });

  it('has zero occurrences of the deleted "We recommend proceeding with allergy testing" 7+ bracket clause — 04-08 (D-10) removed the last no-testing bypass copy', () => {
    // Measured against the pre-rebuild committed bundle: 1 occurrence. Measured against the
    // fresh rebuild: 0 occurrences.
    const needle = "We recommend proceeding with allergy testing";
    expect(count(needle)).toBe(0);
  });
});
