---
phase: 03-mandatory-medical-history
plan: 02
subsystem: api
tags: [typescript, vitest, postgres, phi, hipaa, pdf, admin-ui]

# Dependency graph
requires:
  - phase: 03-mandatory-medical-history
    provides: "Plan 03-01's final 12 medical-history question IDs (HIST-01..04, DIAG-01) in app/lib/quiz/questions.ts, and getQuestionById"
provides:
  - "getAnswerLabel(key) in app/lib/format.ts — shared question-ID to clinical-label map (D-05), consumed by both PHI-facing renderers"
  - "Both Medical History render sections (pdf.ts, app.quiz-results.tsx) and the HistoryTagList helper deleted outright"
  - "personal_history/family_history removed from QuizSubmissionData, validateQuizData, QuizSubmission, insertSubmission, and scripts/e2e-test.ts (T-3-01 closed for the app-code half)"
  - "insertSubmission's INSERT renumbered to 15 columns / $1..$15 / 15 params, ready for plan 03-07's DROP COLUMN migration once this code is deployed and confirmed live"
affects: [03-03, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Question-ID to clinical-label map with a proven-identical fallback (getAnswerLabel), so an unmapped key can never regress today's capitalize(key.replace(/_/g, ' ')) output"
    - "Non-vacuity control for a static label map: every mapped key asserted to resolve through getQuestionById, so a map entry naming a question that doesn't exist fails the test rather than rotting silently"

key-files:
  created:
    - tests/answer-labels.test.ts
  modified:
    - app/lib/format.ts
    - app/lib/pdf.ts
    - app/routes/app.quiz-results.tsx
    - app/lib/submissions.ts
    - app/lib/quiz-validation.ts
    - app/lib/quiz/types.ts
    - scripts/e2e-test.ts
    - tests/pdf.test.ts
    - tests/api-admin-submission-detail.test.ts
    - tests/api-admin-assessment-pdf.test.ts

key-decisions:
  - "QuizContainer.tsx's 3 personal_history + 3 family_history occurrences (buildPayload's extra parameter, handleConsentSubmit) were deliberately left untouched — that file is not in this plan's files_modified list, and the plan's own threat model (T-3-01) states the client-side closure belongs to plan 03-03, alongside D-12's larger FlowStep/render-branch deletion. Confirmed this is the plan's own stated division of labor, not an oversight, before proceeding."
  - "app/lib/quiz/types.ts's QuizSubmission interface confirmed to have zero other references anywhere in the repo before editing — the two fields and the stale 'stored in Google Sheets only' comment were removed from dead-but-typed code, not live code."
  - "tests/pdf.test.ts's now-meaningless 'renders without history sections when history is null' test was replaced with a positive test asserting a history_comorbidities answer renders through getAnswerLabel and produces a valid %PDF buffer, per the plan's explicit instruction."

requirements-completed: [HIST-05]

# Metrics
duration: 6min
completed: 2026-08-09
---

# Phase 3 Plan 2: Legacy PHI Field Removal + Clinical Label Map Summary

**Added a shared question-ID to clinical-label map (`getAnswerLabel`) consumed by both PHI-facing renderers, deleted both vestigial Medical History sections, and removed `personal_history`/`family_history` from every application code path — the app-code half of D-01's asymmetric migration, ready for plan 03-07's `DROP COLUMN` DDL once deployed and confirmed live.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-09T18:34:00Z (approx, per baseline test run)
- **Completed:** 2026-08-09T18:40:09Z
- **Tasks:** 3 planned, 3 executed as 3 commits
- **Files modified:** 10 (1 created, 9 modified)

## Accomplishments

- `getAnswerLabel(key)` added to `app/lib/format.ts` with `ANSWER_LABELS` mapping all 12 Phase 3 medical-history question IDs plus 9 existing Parts 1-5 IDs, falling back to today's exact `capitalize(key.replace(/_/g, ' '))` output for every unmapped key.
- `tests/answer-labels.test.ts` (6 tests, new): mapped-key assertions, fallback-identity assertions against 3 real unmapped IDs, empty-string and no-underscore edge cases, and the non-vacuity control — every mapped key proven to resolve through `getQuestionById`.
- Both PHI-facing renderers (`app/lib/pdf.ts`, `app/routes/app.quiz-results.tsx`) now call `getAnswerLabel(key)` in their Symptom Responses loops; both Medical History conditional blocks and the `HistoryTagList` helper (plus its now-orphaned `historyTagStyle` constant) are deleted outright, not left vestigial.
- `personal_history`/`family_history` removed from `QuizSubmissionData`, `validateQuizData`'s two `Array.isArray` guards, the dead-but-typed `QuizSubmission` interface (plus its stale "stored in Google Sheets only" comment — a `CLAUDE.md` rule 3 forbidden surface), and `insertSubmission`'s `SubmissionFullRow`/INSERT/params.
- `insertSubmission`'s `INSERT INTO submissions (...)` column list, `VALUES` placeholder list, and params array all renumbered from 17 to **15**, verified to agree at exactly 15/15/15.
- `scripts/e2e-test.ts` stopped POSTing/SELECTing the two dropped columns and dropped the now-dead `hasHistory` flag/assertion block — the script will still run after plan 03-07's DDL lands.
- Three PHI fixtures (`tests/pdf.test.ts`, `tests/api-admin-submission-detail.test.ts`, `tests/api-admin-assessment-pdf.test.ts`) updated; `pdf.test.ts` gained a positive test proving a `history_comorbidities` answer renders through the label map in a valid PDF.
- Suite grew from 316/24 (plan start) to 322/25 (plan end) — the 6 new `answer-labels.test.ts` tests, no regressions, no test files deleted.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getAnswerLabel to format.ts with capitalize as the fallback** - `81ad1ef` (feat)
2. **Task 2: Both PHI renderers consume the label map and lose their Medical History sections** - `a30f978` (feat)
3. **Task 3: Drop the two legacy fields from the payload, validation, DB layer, types, fixtures, and the E2E script (T-3-01)** - `8908a0f` (feat)

**Plan metadata:** (this commit) `docs: complete 03-02 plan`

## Files Created/Modified

- `app/lib/format.ts` - Added `ANSWER_LABELS` map + `getAnswerLabel(key)`, fallback-safe (D-05)
- `tests/answer-labels.test.ts` - New: mapped/fallback/edge-case/non-vacuity assertions for `getAnswerLabel`
- `app/lib/pdf.ts` - Symptom Responses loop now calls `getAnswerLabel`; Medical History block deleted
- `app/routes/app.quiz-results.tsx` - Same swap; `HistoryTagList` helper + `historyTagStyle` deleted
- `app/lib/submissions.ts` - `SubmissionFullRow`/`insertSubmission` lose 2 columns; INSERT renumbered to 15
- `app/lib/quiz-validation.ts` - `QuizSubmissionData` and `validateQuizData` lose the two fields/guards
- `app/lib/quiz/types.ts` - Dead-but-typed `QuizSubmission` loses the two fields + stale comment
- `scripts/e2e-test.ts` - Payload, `DbRow`, SELECT column list, and `hasHistory` flag all cleaned up
- `tests/pdf.test.ts` - Fixture cleaned; dead negative test replaced with positive label-map PDF test
- `tests/api-admin-submission-detail.test.ts` - Fixture cleaned (compiler-enforced excess-property check)
- `tests/api-admin-assessment-pdf.test.ts` - Fixture cleaned (compiler-enforced excess-property check)

## Decisions Made

- **QuizContainer.tsx left untouched.** It still carries 3 `personal_history` + 3 `family_history` occurrences (`buildPayload`'s `extra` parameter, `handleConsentSubmit`), but this file is not in 03-02's `files_modified` list, and the plan's own threat model (T-3-01) states explicitly: "The client-side half (`buildPayload`'s `extra` parameter) is closed in plan 03-03." D-12's five `QuizContainer.tsx` deletion sites are a larger, coherent state-machine change assigned to 03-03/03-04. Verified this is the plan's stated division of labor (not a gap) before leaving it alone — see the "Repo-wide occurrence count" note below.
- `QuizSubmission` (in `types.ts`) confirmed to have zero other references anywhere in the repo (`grep -rn "QuizSubmission\b"` excluding `QuizSubmissionData`/`QuizSubmissionsTable`) before removing its two fields — dead-but-typed code, safe to edit without a wider blast radius.
- `tests/pdf.test.ts`'s "renders without history sections when history is null" test — meaningless once the fields are gone — was replaced per the plan's explicit instruction with a positive test: a row with `history_comorbidities: ['asthma']` and `has_pcp: 'no'` in `answers_json` renders a non-empty PDF starting with `%PDF`.

## Deviations from Plan

None - plan executed exactly as written. The QuizContainer.tsx scope boundary above is not a deviation; it is the plan's own stated scope (T-3-01, files_modified list), confirmed rather than assumed.

## Issues Encountered

None.

## Verification Evidence

- `npm run typecheck` clean after every task; `npm test` green at 322/25 at plan end (up from 316/24 baseline, unchanged file count from Task 1 through Task 3 — no test file deleted).
- `insertSubmission` INSERT: **15 columns**, `VALUES ($1..$15)` with no gaps, **15-element params array** — all three counted explicitly and confirmed to agree.
- Repo-wide occurrence count (`SOURCE.split(needle).length - 1`, never `grep -c`) of `personal_history` and `family_history` is **0** across every file in this plan's `files_modified` list (`app/lib/format.ts`, `app/lib/pdf.ts`, `app/routes/app.quiz-results.tsx`, `app/lib/submissions.ts`, `app/lib/quiz-validation.ts`, `app/lib/quiz/types.ts`, `scripts/e2e-test.ts`, `tests/answer-labels.test.ts`, `tests/pdf.test.ts`, `tests/api-admin-submission-detail.test.ts`, `tests/api-admin-assessment-pdf.test.ts`). `migrations/001_create_submissions.sql` retains both column definitions untouched (the intentional historical record the plan's acceptance criteria excepts). `app/components/quiz/QuizContainer.tsx` still has 3+3 occurrences — out of this plan's scope, see Decisions above.
- Task 2 positive/negative controls: `personal_history_json`/`family_history_json`/`HistoryTagList` = 0 in both `app/lib/pdf.ts` and `app/routes/app.quiz-results.tsx`; `getAnswerLabel` occurs 2x in each file; `Symptom Responses` section header occurs exactly 1x in each; `dangerouslySetInnerHTML` = 0 in both.
- `scripts/e2e-test.ts`: `personal_history_json`, `family_history_json`, and `hasHistory` all = 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **THIS PLAN'S CODE MUST BE DEPLOYED AND CONFIRMED LIVE ON FLY BEFORE PLAN 03-07'S DDL RUNS.** `insertSubmission` now writes exactly 15 named columns; running the `DROP COLUMN` migration (03-07) before this code is live will hard-fail every `/api/quiz/submit` INSERT with `column "personal_history_json" of relation "submissions" does not exist` (T-3-19, mitigated by wave/plan ordering, not by anything in this plan alone).
- Plan 03-03 must close the remaining client-side half of T-3-01: `QuizContainer.tsx`'s `buildPayload`'s `extra` parameter and `handleConsentSubmit`'s `personal_history`/`family_history` extraction, alongside D-12's larger FlowStep/render-branch deletion.
- `public/quiz-bundle.js` was NOT rebuilt in this plan — this plan touches no file under `app/lib/quiz/` or `app/components/quiz/`, so no theme bundle rebuild was required (confirmed against the plan's own `<verification>` note).
- No blockers. `npm run typecheck` clean, `npm test` green at 322/25 (up from 316/24).

---
*Phase: 03-mandatory-medical-history*
*Completed: 2026-08-09*

## Self-Check: PASSED

- FOUND: app/lib/format.ts
- FOUND: tests/answer-labels.test.ts
- FOUND: app/lib/pdf.ts
- FOUND: app/routes/app.quiz-results.tsx
- FOUND: app/lib/submissions.ts
- FOUND: app/lib/quiz-validation.ts
- FOUND: app/lib/quiz/types.ts
- FOUND: scripts/e2e-test.ts
- FOUND: tests/pdf.test.ts
- FOUND: tests/api-admin-submission-detail.test.ts
- FOUND: tests/api-admin-assessment-pdf.test.ts
- FOUND: 81ad1ef (Task 1 commit)
- FOUND: a30f978 (Task 2 commit)
- FOUND: 8908a0f (Task 3 commit)
- FOUND: c74d5cc (summary commit)
