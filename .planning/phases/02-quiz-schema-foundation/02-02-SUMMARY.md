---
phase: 02-quiz-schema-foundation
plan: 02
subsystem: quiz-schema
tags: [typescript, pure-functions, vitest, tdd, showif, exclusive-options]

# Dependency graph
requires:
  - phase: 02-quiz-schema-foundation
    plan: 01
    provides: "QuizItem discriminated union, required/showIf/exclusive on the schema, ALL_ITEMS export, getQuestionById"
provides:
  - "app/lib/quiz/schema.ts — isQuestion, selectedValues, isAnswered, evaluateShowIf, visibleItems, visibleAnswers, toggleOption, isOptionDisabledByExclusive"
  - "A proven-non-vacuous D-04 reference-integrity guard and non-transitive-showIf forward guard"
  - "The pure-function extraction QuizPartRenderer.tsx's literals will be replaced by in Plan 02-03"
affects: [02-03, 02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure evaluator module with explicit arguments (no React, no window, no throw) — follows navigation.ts/redirects.ts conventions in app/lib/quiz/"
    - "visibleAnswers implemented as a strip-known-and-hidden blacklist, not a keep-known-and-visible whitelist, specifically so an unknown answers key (e.g. a future Phase 3/4 field, or Part 6 when handed a Part-6-blind item list) can never be silently dropped (DIR-02)"
    - "Reference-integrity and chain-detection guards as reusable local functions in the test file, each proven able to fail via a real typo/chain injected into questions.ts, run, and reverted"

key-files:
  created:
    - app/lib/quiz/schema.ts
    - app/lib/quiz/schema.test.ts
  modified: []

key-decisions:
  - "visibleAnswers's exclusion set is 'every item that is NOT a currently-visible question' (strips hidden questions AND all info blocks regardless of their own visibility), not the plan action text's narrower 'items that ARE questions AND are NOT visible.' The narrower reading would leave a fabricated info-block answer un-stripped, contradicting the plan's own Task 1 behavior spec ('an info block's id never appears in the result, even if an answers entry is fabricated for it, D-11'). The broader form still only strips KNOWN items, so it cannot violate DIR-02's 'never drop unknown' rule — it only strips ids that are actually present in the items list. Documented in schema.ts's JSDoc."
  - "evaluateShowIf guards against both an undefined/malformed condition (already specified) and an undefined answers object (not explicitly specified, added per project convention 'nothing in app/lib/quiz throws') — uses answers?.[key] rather than answers[key] so a caller passing undefined answers gets false, not a TypeError."

requirements-completed: [SCH-01]

# Metrics
duration: ~14min
completed: 2026-08-09
---

# Phase 2 Plan 2: Pure Evaluator Module (schema.ts) Summary

**Built `app/lib/quiz/schema.ts` — the pure-function evaluator (showIf, required-ness, exclusive-option toggling, and the D-03 answer-visibility boundary filter) that Plan 02-03 will make `QuizPartRenderer.tsx` delegate to instead of holding hardcoded literals, with 77 tests (all green) and two D-04 integrity guards each proven able to fail against a real, injected-and-reverted defect.**

## Performance

- **Duration:** ~14 min (first commit 10:19:52 -04:00, last commit 10:24:57 -04:00, per `git log`)
- **Tasks:** 3/3 completed
- **Files created:** 2 (`app/lib/quiz/schema.ts`, `app/lib/quiz/schema.test.ts`)
- **Files modified:** 0 (no existing file was edited by this plan)

## Accomplishments

- `app/lib/quiz/schema.ts` exports all eight functions named in the plan's interfaces block:
  `isQuestion`, `selectedValues`, `isAnswered`, `evaluateShowIf`, `visibleItems`,
  `visibleAnswers`, `toggleOption`, `isOptionDisabledByExclusive`.
- `isAnswered` is the single shared predicate (D-07) — used both directly and via
  `evaluateShowIf`'s `isAnswered` operator — so the required check and the reveal trigger can
  never drift.
- `evaluateShowIf` implements exactly the three D-02 operators (`equals`, `includes`,
  `isAnswered`) and fails OPEN on a dangling reference (D-04) rather than silently omitting a
  clinical question.
- `visibleAnswers` implements the D-03 boundary filter as a blacklist, not a whitelist, so an
  answers key belonging to no known item (or to Part 6 when the caller passes a Part-6-blind
  item list) is never dropped — proven with a dedicated negative control (see below).
- `toggleOption` / `isOptionDisabledByExclusive` reproduce today's exclusive-option toggle
  behavior (D-13, D-16) and prove spelling independence (D-15) with a `none_of_the_above`
  fixture that is not the literal string `"none"`.
- Two D-04 integrity guards exist as reusable local functions in the test file and both have
  been observed failing against a real, injected defect — not merely a hypothetical.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write app/lib/quiz/schema.test.ts against the API spec, proven RED** — `358a4da` (test)
2. **Task 2: Implement app/lib/quiz/schema.ts until the spec is GREEN** — `f0ccbe3` (feat)
3. **Task 3: Add the D-04 reference-integrity and no-chained-showIf guards, each proven able to fail** — `43a6ca9` (test)

_Plan metadata commit intentionally omitted — worktree execution mode; the orchestrator handles the shared-file/metadata commit after merge._

## Files Created

- `app/lib/quiz/schema.ts` — the pure evaluator module. Named exports only, no React import, no
  browser-global read, never throws. Module header states its purpose (moving every
  renderer-owned decision into a testable pure function) and the sync obligation with
  `types.ts`'s `ShowIfCondition` union.
- `app/lib/quiz/schema.test.ts` — 77 tests across 10 describe blocks (`isQuestion`,
  `selectedValues`, `isAnswered`, `evaluateShowIf` with 5 nested operator blocks, `visibleItems`,
  `visibleAnswers`, `toggleOption`, `isOptionDisabledByExclusive`, `reference integrity (D-04)`,
  `no chained showIf (forward guard)`). Fixtures are pulled from the real `questions.ts` data
  everywhere the real data can express the case; test-local fixtures exist only for info blocks,
  the D-15 alternate-spelling row, and the two D-04 broken/chained fixtures.

## TDD Gate Compliance

- **RED (Task 1):** `358a4da` — `npx vitest run app/lib/quiz/schema.test.ts` failed to resolve
  `./schema` (module did not exist). Confirmed non-zero exit before any implementation code was
  written.
- **GREEN (Task 2):** `f0ccbe3` — `app/lib/quiz/schema.ts` created; all 72 tests from Task 1
  passed unmodified (`git diff HEAD~1 -- app/lib/quiz/schema.test.ts` empty at that commit).
- **Task 3** is `type="auto"` (not `tdd="true"`) per its own frontmatter — it appends two new,
  already-passing-by-design test blocks (each independently proven non-vacuous via a real
  negative control, documented below) rather than following a fresh RED/GREEN cycle. This
  matches the plan's own task-type declaration; no gate violation.

## Verification Results (all commands run, real output recorded)

- `npx vitest run app/lib/quiz/schema.test.ts` — **77/77 passing, zero skipped.**
- `npm run typecheck` — **exit 0**, clean, at every task boundary.
- `npx vitest run app/lib/quiz/schema.test.ts -t "visibleAnswers"` — **8/8 passing**, including
  the DIR-02 Part-6-blind row:
  ```
  ✓ app/lib/quiz/schema.test.ts (72 tests | 64 skipped) 2ms
  Test Files  1 passed (1)
       Tests  8 passed | 64 skipped (72)
  ```
- **DIR-02 negative control (Task 2), run and reverted:** temporarily rewrote `visibleAnswers`
  as a keep-known-and-visible whitelist. Result: **2 of 8 `visibleAnswers` tests FAILED** — the
  DIR-02 Part-6-blind row (`expected undefined to deeply equal ["asthma"]`) and the
  unknown-key-passthrough row (`expected undefined to be "some Phase 3/4 value"`). Reverted to
  the blacklist form; all 8 passed again. This proves the DIR-02 row was passing for the right
  reason, not vacuously.
- **Reference-integrity negative control (Task 3), run and reverted:** temporarily changed
  `med_list`'s `showIf.questionId` in `questions.ts` from `"taking_meds"` to `"typo_id"`.
  Result: **both `reference integrity (D-04)` tests FAILED** (`findDanglingShowIfReferences`
  returned `["typo_id"]` instead of `[]`). Reverted; both passed again.
  `git diff HEAD -- app/lib/quiz/questions.ts` confirmed empty after revert.
- **Chain negative control (Task 3), run and reverted:** temporarily added
  `showIf: { questionId: "med_list", isAnswered: true }` to `taking_meds` in `questions.ts`
  (creating a chain, since `med_list` itself carries a `showIf`). Result: the
  `finds zero chained showIf references in the real ALL_ITEMS` test **FAILED**, flagging both
  `taking_meds` and, transitively, `med_list`/`med_control` (whose target `taking_meds` now
  carried a `showIf`). Reverted; passed again.
  `git diff HEAD -- app/lib/quiz/questions.ts` confirmed empty after revert.
- **Full suite (`npm test`):** 20 files (19 passed, 1 file intentionally red), **255 passed / 5
  failed / 260 total.** The 5 failures are exactly the pre-existing, by-design red assertions in
  `tests/quiz-part-renderer-no-literals.test.ts` (unrelated to this plan — it stays red until
  Plan 02-03 refactors the renderer). Baseline before this plan was 178 passed / 5 failed / 183
  total, so this plan net-added **77 passing tests** with **zero removed, skipped, or weakened.**
- `git diff main -- app/components/quiz/QuizPartRenderer.test.ts` — **empty.** The 9 existing
  `it` blocks stay byte-identical, as required.
- `git diff main -- package.json package-lock.json` — **empty.** No dependency added (DIR-01).
- `tests/quiz-part-renderer-no-literals.test.ts` — **still fails, 5/5**, unchanged. This is the
  correct state at the end of this wave; the renderer has not been touched.
- `node -e '...' ` acceptance scripts: all eight function names present ≥1 time in
  `schema.test.ts`; `visibleAnswers(ALL_SCORED_QUESTIONS` substring present (1); `none_of_the_above`
  present (5); required substrings (`equals`, `isAnswered`, `includes`, `fails open`,
  `visibleAnswers`, `info block`, `empty array`, `toggleOption`) all present ≥1 time;
  `schema.ts` prints `throw 0 react 0 window 0 default 0`; `excludeFromScore` count in
  `schema.ts` is `0`.

## Chained-showIf Resolution (carried forward for Phase 3/4 planning)

The chained-`showIf` transitive-visibility question (RESEARCH.md Pitfall 4, Assumption A3) is
resolved as **NON-TRANSITIVE** in this plan: `evaluateShowIf` reads a target question's raw
answer only, with no awareness of whether that target is itself currently visible. This is safe
today because no chain exists in the locked scope — `med_list`/`med_control` both depend
directly on `taking_meds`, which carries no `showIf` of its own. A forward guard
(`findChainedShowIf` in `schema.test.ts`, `no chained showIf (forward guard)` describe block)
encodes this as an executable assertion rather than a comment: the day any real `showIf` targets
a question that itself carries a `showIf`, this guard goes red and the transitive-visibility
rule must be decided before the chain ships. Phase 3 (HIST-04) and Phase 4 (TEST-02/TEST-03)
planning should read this guard's presence as "decided, not open" and consult it rather than
re-deriving the question.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `visibleAnswers`'s exclusion algorithm broadened beyond the plan action text's literal wording to satisfy the plan's own behavior spec**
- **Found during:** Task 1 test authoring / Task 2 implementation.
- **Issue:** The plan's `<action>` text for Task 2 specifies building the strippable-id set from
  "items that ARE questions AND are NOT visible" — which would never include an info block's id,
  regardless of the info block's own visibility. But the plan's `<behavior>` spec for Task 1
  explicitly requires: "an info block's id never appears in the result, even if an answers entry
  is fabricated for it (D-11)." Implementing the action text literally would fail that
  behavior-spec test, since a fabricated info-block answer key would never enter the
  "known-and-hidden-question" set and would therefore pass through untouched.
- **Fix:** Implemented the exclusion set as "every item that is NOT a currently-visible
  question" — i.e., strip a hidden question's answer (as specified) AND strip any known info
  block's answer regardless of its own showIf state (extending D-11's "info blocks collect no
  answer" guarantee defensively, rather than trusting that no code path will ever write one).
  This still only strips ids that are actually present in `items` (known), so DIR-02's "never
  drop an unknown key" guarantee is unaffected — the DIR-02 test and its negative control both
  pass under this broader form.
- **Files modified:** `app/lib/quiz/schema.ts` (the `visibleAnswers` implementation and its JSDoc,
  which documents the broadened exclusion rule and the reasoning above).
- **Verification:** All 8 `visibleAnswers` tests pass, including the D-11 fabricated-info-block-key
  row and the DIR-02 Part-6-blind row; the DIR-02 negative control (whitelist rewrite) still fails
  correctly on the DIR-02-specific rows, confirming the broadened rule did not weaken that
  guarantee.
- **Committed in:** `f0ccbe3` (Task 2 commit).

---

**Total deviations:** 1 auto-fixed (Rule 1 — a bug in the plan's own action-text guidance,
reconciled against the plan's own authoritative behavior spec; no scope creep, no architectural
change).

## Known Stubs

None. This plan adds pure logic and its tests only; no UI, no data, no rendering.

## Threat Flags

None. All work stays inside the plan's declared trust boundary (`app/lib/quiz/schema.ts` and its
test file — a client-side pure-function module with no network I/O, no persistence, and no route
touched). The `visibleAnswers` boundary-filter logic (T-2-06/T-2-07 in the plan's threat
register) is implemented and tested per the plan's disposition; no new surface was introduced
beyond what the plan's threat model already accounted for.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `app/lib/quiz/schema.ts` is ready for Plan 02-03 to import into `QuizPartRenderer.tsx` and
  `QuizContainer.tsx`, deleting the renderer's hardcoded literals (`isExclusiveNoneQuestion`, the
  five `"none"` string checks, the `med_list`/`med_control` part-5 visibility gate) in favor of
  calling `toggleOption`, `isOptionDisabledByExclusive`, `visibleItems`, and (at the two
  `QuizContainer.tsx` D-03 sites only) `visibleAnswers`.
- The chained-`showIf` non-transitive decision is now encoded as an executable forward guard —
  Phase 3/4 planners adding a conditional question that targets an already-conditional question
  will see this guard fail immediately, rather than discovering the ambiguity live.
- `tests/quiz-part-renderer-no-literals.test.ts` remains red by design; it is Plan 02-03's
  acceptance signal, not a regression from this plan.
- No blockers.

---
*Phase: 02-quiz-schema-foundation*
*Completed: 2026-08-09*

## Self-Check: PASSED

All claimed files verified present on disk (`app/lib/quiz/schema.ts`, `app/lib/quiz/schema.test.ts`,
this SUMMARY). All three commit hashes (`358a4da`, `f0ccbe3`, `43a6ca9`) verified present in
`git log`.
