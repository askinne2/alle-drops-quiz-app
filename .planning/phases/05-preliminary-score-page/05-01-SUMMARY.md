---
phase: 05-preliminary-score-page
plan: 01
subsystem: quiz-scoring
tags: [scoring, derived-ceiling, config-accessor]
dependency-graph:
  requires: []
  provides: [getQuestionMaxScore, getMaxScore, getScoreScale, PROVISIONAL_SCORE_SCALE, ScoreScale, ScaleZone, ScaleTone]
  affects: [app/lib/quiz/scoring.ts, app/lib/quiz/score-scale.ts]
tech-stack:
  added: []
  patterns: ["config-with-fallback module (redirects.ts convention)", "sibling-switch mirroring scoreQuestion"]
key-files:
  created:
    - app/lib/quiz/score-scale.ts
    - app/lib/quiz/score-scale.test.ts
  modified:
    - app/lib/quiz/scoring.ts
    - app/lib/quiz/scoring.test.ts
decisions: []
metrics:
  duration: 20min
  completed: 2026-08-11
---

# Phase 5 Plan 01: Derived Score Ceiling + Score Scale Accessor Summary

A compiled-in, provably-derived score ceiling (`getMaxScore`) and a `getScoreScale()` accessor
returning a UI-SPEC-locked provisional 0–60 three-zone scale — the two data primitives Phase 5's
`ResultsDisplay` scale bar reads, with the ceiling proven to change automatically rather than
asserted as a literal.

## What Was Built

- **`app/lib/quiz/scoring.ts`** — added `getQuestionMaxScore(question)` and
  `getMaxScore(questions)`, exported as public API. `getQuestionMaxScore` mirrors
  `scoreQuestion`'s switch member-for-member over all 10 `QuestionType` union members;
  `scoreWeight` is documented as deliberately unread. Inserted between `calculateTotalScore` and
  `getScoreBracket`; zero changes to any pre-existing function.
- **`app/lib/quiz/score-scale.ts`** (new) — `ScaleTone`/`ScaleZone`/`ScoreScale` types,
  `PROVISIONAL_SCORE_SCALE` constant (`max: getMaxScore(ALL_SCORED_QUESTIONS)`, three zones —
  20/low/Low, 40/mid/Moderate, 60/high/High), and `getScoreScale()` (no parameters, returns the
  constant). Follows the `redirects.ts`/`product-links.ts` config-with-fallback module
  convention. No `cfg` parameter, no `AlleDropsQuizConfig` read, no fetch — Phase 5.1 owns adding
  the config channel.
- **`app/lib/quiz/scoring.test.ts`** — two new `describe` blocks: the SCORE-02 ceiling proofs
  (static 60, 19/16 contributing-question count, and the `+3` delta proving derivation) and a
  per-`QuestionType` branch-coverage suite (11 members via a synthetic `makeQuestion` factory,
  including the `scoreWeight`-is-ignored case).
- **`app/lib/quiz/score-scale.test.ts`** (new) — max-derivation, `isProvisional: true`, the
  looped ascending-zone/no-gap/no-overhang invariant, `ScaleTone` membership, and the two
  source-guard regexes (`max: getMaxScore(` present, `max: <digit>` absent).

## Measured Value

`getMaxScore(ALL_SCORED_QUESTIONS)` = **60**, independently reproducing 05-RESEARCH.md's hand-counted
figure via the new designed function rather than manual summation. `ALL_SCORED_QUESTIONS.length` = 19,
of which 16 have `getQuestionMaxScore > 0` — matches 05-CONTEXT.md exactly.

## RED Proof (Task 1 — verbatim, `npx vitest run app/lib/quiz/scoring.test.ts`)

```
 ❯ app/lib/quiz/scoring.test.ts (18 tests | 12 failed) 6ms
   × SCORE-02: the score ceiling is derived from ALL_SCORED_QUESTIONS, not hardcoded > getMaxScore(ALL_SCORED_QUESTIONS) is 60 2ms
     → (0 , getMaxScore) is not a function
   × SCORE-02: the score ceiling is derived from ALL_SCORED_QUESTIONS, not hardcoded > ALL_SCORED_QUESTIONS has 19 members, 16 of which have getQuestionMaxScore > 0 0ms
     → (0 , getQuestionMaxScore) is not a function
   × SCORE-02: the score ceiling is derived from ALL_SCORED_QUESTIONS, not hardcoded > adding a synthetic severity_0_3 question raises the ceiling by exactly 3 (proves derivation, not a static 60) 0ms
     → (0 , getMaxScore) is not a function
   × getQuestionMaxScore: every QuestionType branch is individually correct (drift guard) > checkbox_multi returns the count of non-excluded options 0ms
     → (0 , getQuestionMaxScore) is not a function
   [... 8 more identical "is not a function" failures, one per remaining QuestionType/scoreWeight case ...]

 Test Files  1 failed (1)
      Tests  12 failed | 6 passed (18)
```

Separately, `npm run typecheck` at the same point reported the compile-time form of the same gap:

```
app/lib/quiz/scoring.test.ts(6,3): error TS2305: Module '"./scoring"' has no exported member 'getQuestionMaxScore'.
app/lib/quiz/scoring.test.ts(7,3): error TS2305: Module '"./scoring"' has no exported member 'getMaxScore'.
```

Note: the plan's acceptance criteria anticipated a whole-file module-resolution failure; the actual
failure mode under Vite/esbuild's transform is a per-assertion runtime `TypeError: ... is not a
function` (named imports of non-existent exports resolve to `undefined` at runtime rather than
throwing at import time), while `tsc --noEmit` independently confirms the missing-export condition
at compile time. Both name `getMaxScore`/`getQuestionMaxScore` as missing, satisfying the
acceptance criterion's intent.

## RED Proof (Task 3 — verbatim, `npx vitest run app/lib/quiz/score-scale.test.ts`)

```
Error: Cannot find module './score-scale' imported from '.../app/lib/quiz/score-scale.test.ts'
 ❯ app/lib/quiz/score-scale.test.ts:4:1
      4| import { getScoreScale } from "./score-scale";

Caused by: Error: Failed to load url ./score-scale (resolved id: ./score-scale) in
.../app/lib/quiz/score-scale.test.ts. Does the file exist?

 Test Files  1 failed (1)
      Tests  no tests
```

## Verification

- `npx vitest run app/lib/quiz/scoring.test.ts app/lib/quiz/score-scale.test.ts` — 25/25 green.
- `npm test` — **696 tests / 48 files green** (baseline was 677/47; +19 new tests, +1 new test file).
- `npm run typecheck` — exit 0.
- `git diff --stat` across the three task commits touches exactly the four `files_modified` files
  (a pre-existing, earlier `.planning/STATE.md` commit from phase setup also appears in a
  `main...HEAD` range diff but predates and is unrelated to this plan's three commits).
- Source guards confirmed by direct read: `score-scale.ts` contains zero numeric-literal
  assignments to `max`, zero `AlleDropsQuizConfig` references, zero `fetch(` calls;
  `scoring.ts`'s `scoreWeight` is mentioned once (doc comment) and read zero times.

## Deviations from Plan

None — plan executed exactly as written. The one documented divergence (Task 1's RED failure mode
being a runtime `TypeError` rather than a whole-file module-resolution error) is a description
correction, not a functional deviation: the underlying cause (missing exports) and remediation
(implement the functions) are identical to what the plan specified, and the acceptance criterion's
substance ("names getMaxScore or getQuestionMaxScore as missing") is satisfied either way.

## Threat Model Coverage

All three plan-identified threats (T-5-01 ceiling drift, T-5-02 hardcoded-max rot, T-5-03
unmarked-provisional values) are mitigated exactly as specified: T-5-01 by the per-branch +
delta test suite, T-5-02 by the two source-guard regex assertions in `score-scale.test.ts`, T-5-03
by the `PROVISIONAL_SCORE_SCALE` name, the literal-typed `isProvisional: true` field, and the doc
comment naming Phase 5.1 as the confirmation route. T-5-04 (no PHI/console calls) confirmed by
inspection — neither new/modified file contains a `console.*` call.

## Known Stubs

None. `getScoreScale()` returns a real, fully-specified provisional constant (not empty/null/
placeholder data) that Phase 5's `ResultsDisplay` (a later plan in this phase) can render directly.

## Threat Flags

None — no new network endpoint, auth path, file access pattern, or schema change was introduced.
Both new/modified modules are pure functions operating on already-in-process, already-validated
values (per the plan's own threat model: "This plan adds two pure functions and one pure module").

## Self-Check: PASSED

- FOUND: `app/lib/quiz/score-scale.ts`
- FOUND: `app/lib/quiz/score-scale.test.ts`
- FOUND: commit `a2c5c43` (Task 1 — RED test coverage)
- FOUND: commit `6a0bd2c` (Task 2 — getQuestionMaxScore/getMaxScore implementation)
- FOUND: commit `fcf99e7` (Task 3 — score-scale.ts module + tests)
