---
phase: 03-mandatory-medical-history
plan: 01
subsystem: quiz-schema
tags: [typescript, vitest, quiz-data-model, phi]

# Dependency graph
requires:
  - phase: 02-quiz-schema-foundation
    provides: "showIf evaluator (equals/includes/isAnswered), required-default-true, exclusive option flag, QuizInfoBlock type, isQuestion narrowing"
provides:
  - "New PART6_MEDICAL_HISTORY content (HIST-01..HIST-04): 11-option comorbidity checklist, medications reveal, three gate+reveal pairs, PCP branch with info block"
  - "diagnosed_allergic_condition (DIAG-01) in PART5_TREATMENT"
  - "QUIZ_PARTS with six entries — 100% of patients now reach medical history"
  - "ALL_ITEMS derived from QUIZ_PARTS.flat() (no more Part-6 carve-out)"
  - "getQuestionById updated to handle PART6_MEDICAL_HISTORY: QuizItem[] without a circular import"
  - "app/lib/quiz/scoring.test.ts (new file) pinning score/bracket parity across all three brackets"
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate + reveal pairs via showIf equals (HIST-03, HIST-04) and showIf isAnswered (HIST-02) — no new schema mechanism, pure content reuse of Phase 2's evaluator"
    - "First production QuizInfoBlock (no_pcp_recommendation) — HIST-04's 'no' branch"
    - "getQuestionById filters a QuizItem[] with an inline `item.kind === 'question'` type predicate rather than importing isQuestion from ./schema, to avoid a circular import (schema.ts already imports getQuestionById from questions.ts)"

key-files:
  created:
    - app/lib/quiz/scoring.test.ts
  modified:
    - app/lib/quiz/questions.ts
    - app/lib/quiz/schema.test.ts
    - tests/quiz-schema-type-guarantees.test.ts
    - app/components/quiz/QuizPartRenderer.test.ts

key-decisions:
  - "Tasks 1 and 2 committed together (not as two separate commits) because Task 2's getQuestionById fix is a compile-time requirement for Task 1's PART6_MEDICAL_HISTORY type widening (QuizQuestion[] -> QuizItem[]) to typecheck — an intermediate single-task commit would have a known-broken build."
  - "current_medications keeps the Phase 2 required-by-default behavior (not required: false) per the plan's required_ness_decision — the comorbidity checklist being itself required means isAnswered is always true by completion time, so the field is visible for 100% of patients; a required safety field over-collects rather than silently omitting a medication list."
  - "HIST-03's three reveals use required: false (D-06) — each pairs with a required yesno gate, so a patient cannot skip the topic entirely, only decline to type free text once the gate is answered 'no'."

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04, DIAG-01]

# Metrics
duration: 45min
completed: 2026-08-09
---

# Phase 3 Plan 1: Mandatory Medical History — Data Layer Summary

**Replaced the old two-question Part 6 (history_personal/history_family) with eleven new HIST-01..HIST-04 items plus DIAG-01 in Part 5, wired medical history into `QUIZ_PARTS` as a mandatory sixth part reached by 100% of patients, with 34 new pinning tests (282 -> 316) proving visibility, required-ness, and score parity.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-09T18:19:00Z (approx, per orchestrator STATE.md kickoff)
- **Completed:** 2026-08-09T18:26:41Z
- **Tasks:** 3 planned, executed as 2 commits (Tasks 1+2 combined — see Deviations)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `PART6_MEDICAL_HISTORY` replaced wholesale with the eleven HIST-01..HIST-04 items: `history_comorbidities` (11-option checklist, `exclusive: true` on "None of the above" only), `current_medications` (revealed by `isAnswered`, not `equals` — D-08), three gate+reveal pairs for surgeries/allergies/other-conditions (D-06), `has_pcp` + two required clinic fields, and `no_pcp_recommendation` — the first production `QuizInfoBlock` in this codebase.
- `diagnosed_allergic_condition` (DIAG-01) added to `PART5_TREATMENT` at `order: 53`; contributes 0 to score (yesno type).
- `QUIZ_PARTS` now has six entries; `ALL_ITEMS` derives from `QUIZ_PARTS.flat()` instead of an explicit Part-6 carve-out; `getQuestionById` still returns `QuizQuestion | undefined` via an inline type predicate.
- `ALL_SCORED_QUESTIONS` unchanged in membership except DIAG-01 — contains zero Part 6 members, verified structurally in the new `scoring.test.ts`.
- 34 new tests added (282 -> 316), every new `showIf` assertion carries both a positive and a negative control (per D-04's fail-open behavior).

## Task Commits

Plan tasks were combined into 2 commits (see Deviations for why Tasks 1+2 were merged):

1. **Tasks 1+2: Replace PART6_MEDICAL_HISTORY, add DIAG-01, wire QUIZ_PARTS/ALL_ITEMS/getQuestionById** - `d6ea976` (feat)
2. **Task 3: Repoint tests, add visibility/required-ness/score-parity assertions** - `8b2777b` (test)

## Files Created/Modified

- `app/lib/quiz/questions.ts` — `PART6_MEDICAL_HISTORY` replaced (now `QuizItem[]`), DIAG-01 added to `PART5_TREATMENT`, `QUIZ_PARTS`/`ALL_ITEMS`/`getQuestionById` rewired
- `app/lib/quiz/schema.test.ts` — repointed `visibleAnswers` fixtures, added HIST-02/03/04 visibility describe blocks and HIST-01 `toggleOption` exclusivity block, added a reference-integrity non-vacuity count
- `app/lib/quiz/scoring.test.ts` (new) — score/bracket parity across all three brackets, structural guarantees on `ALL_SCORED_QUESTIONS`, DIAG-01 zero-score assertion
- `tests/quiz-schema-type-guarantees.test.ts` — corrected a stale comment, added a non-vacuous `kind === "info"` positive assertion
- `app/components/quiz/QuizPartRenderer.test.ts` — deleted the stale "Part 6 does not become un-completable" block, replaced with 6 required-ness assertions; two pre-existing PART5_TREATMENT fixtures updated for DIAG-01's new required field

## Decisions Made

- **Tasks 1+2 combined into one commit.** The plan splits "replace Part 6 content" (Task 1) from "wire QUIZ_PARTS/ALL_ITEMS/getQuestionById" (Task 2), but Task 1 alone leaves `getQuestionById`'s `.find()` result un-narrowed to `QuizQuestion` (a real `tsc` error: `Type 'QuizItem | undefined' is not assignable to type 'QuizQuestion | undefined'`), because `PART6_MEDICAL_HISTORY` changed from `QuizQuestion[]` to `QuizItem[]` in Task 1. Since Task 1's own acceptance criteria requires `npm run typecheck` to exit clean, and the fix belongs to Task 2's declared scope, the two were implemented and committed together to avoid a commit with a known-broken build. Documented under Deviations below (Rule 3).
- `current_medications` stays required (not `required: false`) per the plan's `<required_ness_decision>` — see key-decisions above.
- Three proposed-copy sites carry `UNCONFIRMED` code comments: the HIST-03 third label (truncated in William's 6/27 email), DIAG-01's text (scope unconfirmed), and `current_medications`'s subtitle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Combined Task 1 and Task 2 into a single commit**
- **Found during:** Task 1 (Replace PART6_MEDICAL_HISTORY)
- **Issue:** Task 1's acceptance criteria requires `npm run typecheck` to exit clean, but widening `PART6_MEDICAL_HISTORY`'s type to `QuizItem[]` (required by Task 1's own action to hold the new info block) breaks `getQuestionById`'s return-type narrowing — a `tsc` error that only Task 2's `getQuestionById` rewrite fixes. Committing Task 1 alone would produce a commit with a failing typecheck, violating the task-commit protocol's implicit "each commit is a working state" expectation and this plan's own Task 1 acceptance criteria.
- **Fix:** Implemented Task 2's `getQuestionById`/`QUIZ_PARTS`/`ALL_ITEMS` edits immediately after Task 1's content edits, verified `npm run typecheck` clean once both were in place, and committed both together as `d6ea976`.
- **Files modified:** `app/lib/quiz/questions.ts` (single file, both tasks' edits)
- **Verification:** `npm run typecheck` exits clean after the combined commit; all Task 1 and Task 2 acceptance criteria independently verified (see below).
- **Committed in:** `d6ea976`

**2. [Rule 1 - Bug] Fixed two pre-existing PART5_TREATMENT tests broken by DIAG-01's addition**
- **Found during:** Task 2 verification (`npx vitest run app/lib/quiz app/components/quiz`)
- **Issue:** `diagnosed_allergic_condition` (DIAG-01) joined `PART5_TREATMENT` as a required-by-default question (Phase 2 D-05). Two existing tests in `QuizPartRenderer.test.ts` — "does not block an otherwise complete part when the list is filled in" and "is complete when taking_meds is 'no'" — called `isPartComplete(PART5_TREATMENT, answers)` with fixtures that predate DIAG-01 and don't answer it, so both started failing (`isPartComplete` now correctly returns `false` for an unanswered required question).
- **Fix:** Added `diagnosed_allergic_condition: "yes"` / `"no"` to the three affected fixtures so each test stays scoped to the `taking_meds`/`med_list`/`med_control` interaction it was written to verify.
- **Files modified:** `app/components/quiz/QuizPartRenderer.test.ts`
- **Verification:** All three tests pass; full suite green (316/316).
- **Committed in:** `8b2777b`

---

**Total deviations:** 2 auto-fixed (1 blocking/Rule 3, 1 bug/Rule 1)
**Impact on plan:** Both auto-fixes were necessary side effects of the plan's own Task 1 content (DIAG-01 in a required-by-default part; PART6_MEDICAL_HISTORY's type widening). No scope creep — no new schema capability, no new files beyond the plan's own `scoring.test.ts`.

## Issues Encountered

None beyond the two deviations above.

## RED Proof (per plan's `<red_proof>` requirement)

Method: swapped `app/lib/quiz/questions.ts` for the pre-change (`git show HEAD:...` at plan start) version, ran the new/changed test files, recorded failures, then restored and re-verified green.

- **`app/lib/quiz/schema.test.ts`** (102 tests when green): the entire suite fails to even collect against pre-change `questions.ts` — `TypeError: Cannot read properties of undefined (reading 'showIf')` at the HIST-04 `no_pcp_recommendation` fixture lookup, since `no_pcp_recommendation` does not exist in the old data. This is the strongest possible RED signal: 100% of the file's assertions are unreachable against pre-change source.
- **`app/components/quiz/QuizPartRenderer.test.ts`** new "Part 6 required-ness" describe block: 5 of 6 assertions failed against pre-change source (the sixth, the "healthy patient" reachability test, passes vacuously against the old data because neither `history_personal` nor `history_family` is required — expected and consistent with the old code's own documented rationale).
- **`tests/quiz-schema-type-guarantees.test.ts`**: the new `ALL_ITEMS contains at least one member with kind === 'info'` assertion fails against pre-change source (0 info blocks existed before this plan).
- **`app/lib/quiz/scoring.test.ts` DIAG-01 assertion**: fails against pre-change source with `TypeError: Cannot read properties of undefined (reading 'type')` — `getQuestionById("diagnosed_allergic_condition")` returns `undefined` because the question didn't exist yet.
- **`app/lib/quiz/scoring.test.ts` score-parity assertions (3 brackets)**: pass vacuously against pre-change `questions.ts` (the extra medical-history answer keys have no matching question in `ALL_SCORED_QUESTIONS` either way, so `calculateTotalScore` ignores them regardless of source version) — exactly as the plan's `<red_proof>` section anticipated for this file. Per the plan's own instruction, proved instead via a scratch variant of the *current* `scoring.test.ts` with `ALL_SCORED_QUESTIONS` swapped for `ALL_ITEMS` in all `calculateTotalScore` call sites: all 3 parity assertions failed (0-2 bracket: 2 vs 5; 3-6 bracket: 5 vs 8; 7+ bracket: 9 vs 12), confirming the guard actually detects a score leak when medical-history answers reach the scored set.

All RED counts confirmed genuinely red; all guards confirmed green after restoring the real source (316/316 passing, `npm run typecheck` clean).

## Final Question-ID List (for downstream plans 03-02, 03-04)

All Part 6 items, in `order` sequence, `part: 6` unless noted:

| id | kind | type | order | showIf | required |
|---|---|---|---|---|---|
| `history_comorbidities` | question | checkbox_multi | 60 | — | true (default) |
| `current_medications` | question | text_input | 61 | `{ questionId: "history_comorbidities", isAnswered: true }` | true (default) |
| `history_surgeries_has` | question | yesno | 62 | — | true (default) |
| `history_surgeries` | question | text_input | 63 | `{ questionId: "history_surgeries_has", equals: "yes" }` | false |
| `history_allergies_has` | question | yesno | 64 | — | true (default) |
| `history_allergies` | question | text_input | 65 | `{ questionId: "history_allergies_has", equals: "yes" }` | false |
| `history_conditions_has` | question | yesno | 66 | — | true (default) |
| `history_conditions` | question | text_input | 67 | `{ questionId: "history_conditions_has", equals: "yes" }` | false |
| `has_pcp` | question | yesno | 68 | — | true (default) |
| `pcp_clinic_name` | question | text_input | 69 | `{ questionId: "has_pcp", equals: "yes" }` | true (default) |
| `pcp_clinic_address` | question | text_input | 70 | `{ questionId: "has_pcp", equals: "yes" }` | true (default) |
| `no_pcp_recommendation` | info | — | 71 | `{ questionId: "has_pcp", equals: "no" }` | n/a (info block) |

Plus, in `PART5_TREATMENT` (`part: 5`):

| id | kind | type | order | showIf | required |
|---|---|---|---|---|---|
| `diagnosed_allergic_condition` | question | yesno | 53 | — | true (default) |

`history_comorbidities` options, in order (labels are LOCKED verbatim copy): `asthma`/Asthma, `eczema`/Eczema, `anaphylaxis`/Anaphylaxis, `heart_disease`/Heart disease, `copd`/COPD, `lung_disease`/Lung disease, `cancer`/Cancer, `autoimmune`/Autoimmune conditions, `immune_deficiency`/Immune system deficiencies (acquired / induced), `angioedema`/Angioedema, `none`/None of the above (`exclusive: true`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Data layer complete: `questions.ts` exports everything downstream plans need (question IDs, `order` values, `showIf` wiring) without re-reading the file.
- 03-02 (label map / `format.ts` D-05) can now reference the final question-ID list above.
- 03-04 (DOM test infra) can build against the confirmed `showIf` targets and required-ness behavior pinned in this plan's tests.
- `public/quiz-bundle.js` was deliberately NOT rebuilt in this plan — per plan instructions, 03-05 owns the single rebuild for the whole phase.
- No blockers. `npm run typecheck` clean, `npm test` green at 316/316 (up from 282 baseline).

---
*Phase: 03-mandatory-medical-history*
*Completed: 2026-08-09*
