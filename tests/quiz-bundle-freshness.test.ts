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

/**
 * Phase 4 upload-track rebuild — plan 04-18.
 *
 * Rebuilt 2026-08-09 via `npm run build:theme`, folding in plan 04-16's multi-file upload widget
 * (`file_multi` question type, `testing_files` question, its dropzone UI, empty/required-empty
 * copy, and its `POST /api/quiz/upload` client) — plan 04-17's promotion/lifecycle/VM-sizing work
 * touched only server-side and infra files, so it contributes no new client-bundle markers.
 * Committed bundle byte size moved 185946 -> 194939 bytes (+8993). Determinism was re-verified
 * (not inherited from 04-09) by running `npm run build:theme` twice in a row and confirming
 * byte-identical SHA-256 hashes
 * (`2e9bfd714bf191b4c2c067d0b2725cbb2e34569e7ec6ae39f53333d911d08655`) before any marker below was
 * trusted. Every count below uses `SOURCE.split(needle).length - 1`, never `grep -c`.
 *
 * `file_multi` was measured as a candidate marker (it is this plan's own suggested list) but
 * REJECTED and replaced: it counted 1 against the pre-rebuild committed bundle — not 0 — because
 * `app/lib/quiz/schema.ts`'s `case "file_multi":` switch arm (needed for showIf/scoring
 * compatibility, unrelated to the widget's rendered UI) was already compiled in as of 04-09's
 * rebuild, before the widget itself existed. A marker that is already nonzero before the change
 * it is meant to detect cannot prove staleness, so per this plan's own governing rule ("must be
 * replaced") it was swapped for `fileUpload__dropzone`, a CSS Modules class name that exists only
 * in the widget's actual rendered markup (`QuizPartRenderer.tsx`'s `case "file_multi":` render
 * branch, not the schema switch) — measured 0 before, 9 after.
 *
 * The Phase 2/Phase 3/plan-04-09 markers above CANNOT detect this staleness — the upload widget
 * did not exist when those markers were chosen.
 */
describe("public/quiz-bundle.js carries Phase 4's file-upload widget (plan 04-16) — the testing_files question and its multi-file dropzone", () => {
  it('contains the "testing_files" question id at least once — proves the file_multi upload question (TEST-04) is compiled in', () => {
    // Measured against the pre-rebuild committed bundle (04-09's output, 185946 bytes): 0
    // occurrences. Measured against the fresh rebuild (194939 bytes): 1 occurrence.
    const needle = "testing_files";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "fileUpload__dropzone" CSS class at least once — proves the widget\'s rendered dropzone markup (QuizPartRenderer.tsx\'s file_multi render branch) is compiled in, where the raw "file_multi" string alone cannot (see header note)', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 9 occurrences (the class family applied across the dropzone markup plus its
    // CSS Modules-generated selector names).
    const needle = "fileUpload__dropzone";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "Add files" dropzone label at least once', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "Add files";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "No files added yet." empty-state copy at least once', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "No files added yet.";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "Add at least one file to continue." required-but-empty error at least once', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "Add at least one file to continue.";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "Upload allergy test results" file input\'s aria-label at least once', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "Upload allergy test results";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "/api/quiz/upload" endpoint path at least once — proves the widget\'s upload POST target (plan 04-13\'s contract) is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "/api/quiz/upload";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });
});

/**
 * Phase 4.1 (testing-first-quiz-order) rebuild — plan 04.1-04.
 *
 * Rebuilt 2026-08-10 via `npm run build:theme`, folding in plan 04.1-01's reorder of `QUIZ_PARTS`
 * to `[PART7_ALLERGY_TESTING, PART1..PART5, PART6_MEDICAL_HISTORY]`. Committed bundle byte size
 * stayed at 195142 -> 195142 bytes (0 delta — a pure array-element reorder moves no bytes in or
 * out, only rearranges existing ones), but the SHA-256 changed
 * (`a2be1ab758cab05aa1f1f81890412636ba8076aa52afd286e221bf64fde8762c` ->
 * `ba35bdc5c2c148d1d55a6353cd48e768d3667c4d45ea98c7ed94e2717cc9ba18`). `quiz-bundle.css`'s SHA-256
 * is unchanged (`f28b21f24cc5b49da9f272281bcd865b01b35b5297c71aa41f3fb0053737b58d` both before and
 * after) — a pure part reorder touches no class names, so zero CSS delta is expected, not a bug.
 * Determinism was re-verified (not inherited from any prior plan) by running `npm run build:theme`
 * twice in a row and confirming byte-identical SHA-256 hashes for both files before either was
 * trusted.
 *
 * D-09 IN 04.1-CONTEXT.md ORIGINALLY SPECIFIED an `indexOf("testing_status") <
 * indexOf("symptoms_nasal")` relative-position assertion on raw string literals. THAT TECHNIQUE
 * DOES NOT WORK AND MUST NOT BE RESTORED. Measured against the committed pre-4.1 bundle on
 * 2026-08-10: `testing_status` occurs 7 times, first at index 160970; `symptoms_nasal` occurs 2
 * times, first at index 153560. Those positions are fixed because the string literals live inside
 * the minified `PART*` const declarations, whose order in the emitted module follows SOURCE
 * DECLARATION ORDER in `app/lib/quiz/questions.ts` (`…ns=[{kind:"question",id:"symptoms_nasal",…}]…
 * us=[{kind:"question",id:"testing_status",…}]…`), NOT `QUIZ_PARTS` array order. Reordering the
 * `QUIZ_PARTS` array literal moves seven one-to-two-character identifier tokens inside a `[...]`
 * literal — it moves no string literal. `indexOf("testing_status")` stays at ~160970 and
 * `indexOf("symptoms_nasal")` stays at ~153560 after a perfectly correct rebuild, so that assertion
 * would read a correctly-rebuilt bundle as stale. No identifier-pair substitution fixes this —
 * nothing about string positions changes when only the array literal is reordered.
 *
 * THE CORRECTED MECHANISM below proves order on the artifact's own bytes by extracting the
 * minified `QUIZ_PARTS` array's seven element identifiers (anchored on the `.flat()` call that
 * immediately follows the array, which uniquely identifies it in the whole bundle) and resolving
 * each part's minified identifier from the declaration that heads it with a known question id
 * (`<ident>=[{kind:"question",id:"<qid>"`). Minified identifier names are NOT stable across
 * builds, so this guard hardcodes none of them (`ns`, `us`, etc.) — it re-derives both extraction
 * results from the same `SOURCE` read on every run. Every count in this file uses
 * `SOURCE.split(needle).length - 1`, never a line-counting grep with the count flag, which
 * collapses this single-line ~185KB minified bundle down to a count of `1` for any match.
 */
describe("public/quiz-bundle.js — built QUIZ_PARTS element order proves Part 7 (allergy testing) now leads the flow (Phase 4.1 reorder, D-09 corrected mechanism)", () => {
  // Anchors on the array literal immediately followed by `.flat()` on the same variable — this
  // is what `ALL_ITEMS = QUIZ_PARTS.flat()` compiles to, and it is the only seven-identifier
  // array literal in the bundle followed by a `.flat()` call on itself.
  const partsMatch = SOURCE.match(
    /([A-Za-z_$][\w$]*)=\[((?:[A-Za-z_$][\w$]*,){6}[A-Za-z_$][\w$]*)\],[A-Za-z_$][\w$]*=\1\.flat\(\)/,
  );
  const extractedPartIdentifiers: string[] = partsMatch ? partsMatch[2].split(",") : [];

  // Resolves a known question id to the minified identifier of the part array that heads it, by
  // matching `<ident>=[{kind:"question",id:"<qid>"`. Re-derived on every run from the same
  // SOURCE read — no minified identifier is ever hardcoded.
  const resolvePartHeadIdentifier = (questionId: string): string | undefined => {
    const m = SOURCE.match(
      new RegExp(
        '([A-Za-z_$][\\w$]*)=\\[\\{kind:"question",id:"' + questionId + '"',
      ),
    );
    return m ? m[1] : undefined;
  };

  it("non-vacuity control: the seven-identifier QUIZ_PARTS extraction matched, and testing_status / symptoms_nasal / history_comorbidities each resolve to a non-empty minified identifier", () => {
    // Must run before any ordering claim below — an unresolved id would make every positional
    // assertion pass or fail for the wrong reason. Also confirms every needle used below is
    // present at least once in the bundle, per this file's own non-vacuity discipline.
    expect(partsMatch).not.toBeNull();
    expect(extractedPartIdentifiers).toHaveLength(7);
    expect(count("testing_status")).toBeGreaterThanOrEqual(1);
    expect(count("symptoms_nasal")).toBeGreaterThanOrEqual(1);
    expect(count("history_comorbidities")).toBeGreaterThanOrEqual(1);
    expect(resolvePartHeadIdentifier("testing_status")).toBeTruthy();
    expect(resolvePartHeadIdentifier("symptoms_nasal")).toBeTruthy();
    expect(resolvePartHeadIdentifier("history_comorbidities")).toBeTruthy();
  });

  it("element 0 of the built QUIZ_PARTS array is the testing_status (Part 7) head — Part 7 leads the flow", () => {
    expect(extractedPartIdentifiers[0]).toBe(resolvePartHeadIdentifier("testing_status"));
  });

  it("element 1 of the built QUIZ_PARTS array is the symptoms_nasal (Part 1) head — Part 1 immediately follows Part 7", () => {
    expect(extractedPartIdentifiers[1]).toBe(resolvePartHeadIdentifier("symptoms_nasal"));
  });

  it("element 6 (last) of the built QUIZ_PARTS array is the history_comorbidities (Part 6) head — medical history is last, immediately before consent", () => {
    expect(extractedPartIdentifiers[6]).toBe(resolvePartHeadIdentifier("history_comorbidities"));
  });

  it("distinctness control: all seven extracted QUIZ_PARTS identifiers are distinct, so a degenerate match cannot satisfy the order assertions above", () => {
    expect(new Set(extractedPartIdentifiers).size).toBe(7);
  });
});

/**
 * Phase 4.2 (resume-in-progress-intake) rebuild — plan 04.2-06.
 *
 * Rebuilt 2026-08-11 via `npm run build:theme`, folding in plans 04.2-01 through 04.2-05: the
 * `draft-store.ts` browser-local persistence module, the `resume_offer` FlowStep and its
 * `ResumeOffer`/`RestorationNotice`/`StartOverControl` components, the debounced D-07-gated write
 * effect, the D-09/D-11 resumed-dropzone copy, and the persistent in-flow "Start over" control.
 * Committed bundle byte size moved 195142 -> 201707 bytes (js, +6565) and 48834 -> 50431 bytes
 * (css, +1597). Determinism was verified by running `npm run build:theme` twice in a row and
 * confirming byte-identical SHA-256 hashes for both files
 * (js: `218bfa509630534ab83404a4f3df8777891659d5b3653ff5a4e413bc00741d54`, css:
 * `56da1f09197ab98874f38a67356c2e0ff311c9c15fafef72a2f6ab5a903eb8a9`) before any marker below was
 * trusted. Every count uses `SOURCE.split(needle).length - 1`, never `grep -c` — the file's own
 * documented trap, re-verified this session before any candidate was chosen (all five below
 * measured 0 against the PRE-rebuild committed bundle, ruling out a vacuous match).
 *
 * The Phase 4/4.1 markers above CANNOT detect this staleness — none of Phase 4.2's resume UI or
 * storage code existed when those markers were chosen, and Phase 4.1's `QUIZ_PARTS` order guard
 * (immediately above this block) re-passed unchanged after this rebuild, confirming the reorder
 * survived.
 */
describe("public/quiz-bundle.js carries Phase 4.2 (resume-in-progress-intake) content — the resume offer, draft store, and start-over control compiled in", () => {
  it('contains the "resume_offer" FlowStep literal at least once — proves the resume offer step and its QuizContainer wiring are compiled in', () => {
    // Measured against the pre-rebuild committed bundle (195142 bytes): 0 occurrences. Measured
    // against the fresh rebuild (201707 bytes): 2 occurrences.
    const needle = "resume_offer";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "alledrops_quiz_draft" localStorage key prefix at least once — proves draft-store.ts\'s DRAFT_STORAGE_KEY is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence (the quoted key string, which survives minification verbatim).
    const needle = "alledrops_quiz_draft";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "quizStartOver" CSS class family at least once — proves the persistent in-flow Start-over control (RESUME-03) is compiled in', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 12 occurrences (the class family applied across StartOverControl plus its
    // CSS Modules-generated selector names).
    const needle = "quizStartOver";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the resume-offer heading "You have an unfinished assessment from earlier." at least once — proves the D-06 no-identity offer copy shipped, not a placeholder', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "You have an unfinished assessment from earlier.";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });

  it('contains the "Your previous answers have been restored." restoration-notice copy at least once — proves the one-time post-resume notice shipped', () => {
    // Measured against the pre-rebuild committed bundle: 0 occurrences. Measured against the
    // fresh rebuild: 1 occurrence.
    const needle = "Your previous answers have been restored.";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });
});
