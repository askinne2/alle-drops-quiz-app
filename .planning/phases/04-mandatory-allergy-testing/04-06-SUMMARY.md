---
phase: 04-mandatory-allergy-testing
plan: 06
subsystem: quiz-schema
tags: [typescript, vitest, quiz-schema, part7, allergy-testing]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-02's QuestionType union widened with radio_single, text_input_short, file_multi and isAnswered coverage for all three"
provides:
  - "PART7_ALLERGY_TESTING attached to QUIZ_PARTS as declarative data (7th part)"
  - "testing_status two-option required gate + three showIf-gated required text fields (testing_year, testing_location, testing_allergens)"
  - "getQuestionById widened to resolve Part 7 IDs for evaluateShowIf"
  - "ANSWER_LABELS entries for all four Part 7 question IDs, consumed by both PHI renderers"
affects: ["04-08 (results/consent flow rewiring)", "04-09 (theme bundle rebuild)", "04-16 (appends testing_files/file_multi to this same array)", "04-19 (final requirements bookkeeping)"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Part 7 uses flat showIf on testing_status for all three children — no chained showIf, consistent with evaluateShowIf's non-transitive design (Phase 2 D-04)"]

key-files:
  created: []
  modified:
    - app/lib/quiz/questions.ts
    - app/lib/format.ts
    - tests/quiz-schema-type-guarantees.test.ts
    - tests/answer-labels.test.ts

key-decisions:
  - "PART7_ALLERGY_TESTING's banner comment describes the deferred file_multi upload question without spelling out its literal ID (testing_files) in prose, since the plan's own acceptance criteria requires zero occurrences of that substring in questions.ts — described as 'the required file_multi upload question for the had_testing branch' instead"
  - "testing_status option labels and testing_allergens question text kept verbatim per 04-UI-SPEC.md locked copy; testing_status's text/subtitle and testing_year/testing_location's question text carry UNCONFIRMED comments per the same spec's proposed-copy table"

patterns-established:
  - "Part 7 children are all required=true (omitted, defaults true) despite carrying showIf — deliberately NOT using the HIST-03 gate/reveal CSS fusion signature (showIf + required:false), per 04-UI-SPEC.md Component Inventory §4"

requirements-completed: [TEST-01, TEST-02, TEST-03]

# Metrics
duration: ~20min
completed: 2026-08-10
---

# Phase 4 Plan 6: Part 7 — Allergy Testing Split (Schema + Labels) Summary

**Added `PART7_ALLERGY_TESTING` (testing_status two-option gate + three required showIf-gated text fields) to `QUIZ_PARTS` as the 7th part, and gave all four IDs clinical labels in the single shared `ANSWER_LABELS` map — full suite 380/27 (up from 374), typecheck clean, scoring boundary unchanged.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-09T23:45:00Z (approx)
- **Completed:** 2026-08-10T00:04:58Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `PART7_ALLERGY_TESTING` defined in `app/lib/quiz/questions.ts` with a section banner matching `PART6_MEDICAL_HISTORY`'s style, stating: mandatory, no score, `ALL_SCORED_QUESTIONS` stays Parts 1-5 only, and that the file-upload question arrives via plan 04-16.
- `testing_status` (`radio_single`, part 7, order 70) carries exactly two locked-verbatim options (`needs_testing` → "I need allergy testing", `had_testing` → "I've already had allergy testing") and defaults to `required: true`. A code comment records D-08: the choice is honor-system, recorded in `answers_json`, never enforced server-side.
- `testing_year`, `testing_location` (`text_input_short`), and `testing_allergens` (`text_input`, locked verbatim "What Allergens Did You React To?") each carry a flat `showIf: { questionId: "testing_status", equals: "had_testing" }` — no chained `showIf`, per `evaluateShowIf`'s non-transitive design. All three default to `required: true`.
- Three wiring edits made exactly as scoped: `PART7_ALLERGY_TESTING` appended to `QUIZ_PARTS` (now length 7); `getQuestionById`'s spread widened to include it (without this, `evaluateShowIf` would fail OPEN per Phase 2 D-04 and render all three children unconditionally); `QUIZ_PARTS`'s doc comment updated from "parts 1-6" to "parts 1-7".
- `ALL_SCORED_QUESTIONS` was NOT touched — it remains Parts 1-5 only, proven by a new test assertion (`no ALL_SCORED_QUESTIONS member has part === 7`).
- Four `ANSWER_LABELS` entries added in `app/lib/format.ts` (`testing_status`, `testing_year`, `testing_location`, `testing_allergens`), the single map consumed by both `app/lib/pdf.ts` and `app/routes/app.quiz-results.tsx`. `tests/answer-labels.test.ts` gained per-key assertions, a fallback non-vacuity control (`getAnswerLabel('made_up_key')` still capitalizes), and the four new IDs were added to the existing `getQuestionById` non-vacuity list.
- `tests/quiz-schema-type-guarantees.test.ts`'s arithmetic guard now covers Parts 1-7 (`ALL_ITEMS.length === ALL_SCORED_QUESTIONS.length + PART6_MEDICAL_HISTORY.length + PART7_ALLERGY_TESTING.length`), plus four new assertions: `QUIZ_PARTS.length === 7`, the scoring-boundary non-regression, `getQuestionById` resolving `testing_status`/`testing_year`, and exactly 3 Part 7 items carrying a flat `showIf` pointed at `testing_status`.
- Full suite: **380 tests / 27 files**, up from the 374/27 baseline recorded entering this plan (and up from 04-02's 372/27). `npm run typecheck` clean throughout.
- `app/lib/quiz/questions.ts` and `app/lib/format.ts` both contain zero occurrences of the substring `testing_files` — confirmed via `split('testing_files').length - 1`, never `grep -c`.
- `public/quiz-bundle.js` was deliberately NOT rebuilt — plan 04-09 owns the single rebuild for the unblocked track.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define PART7_ALLERGY_TESTING and attach it to QUIZ_PARTS** - `5cb2186` (feat)
2. **Task 2: Add Part 7 clinical labels to the shared ANSWER_LABELS map** - `be1d54c` (feat)
3. **Task 3: Update the ALL_ITEMS arithmetic guard and prove the scoring boundary held** - `9eb41e3` (test)

_No TDD tasks; all three verified via `npm run typecheck` and/or targeted `vitest run` commands per the plan's stated verify steps._

## Files Created/Modified
- `app/lib/quiz/questions.ts` - `PART7_ALLERGY_TESTING` defined and attached to `QUIZ_PARTS`; `getQuestionById` widened; `QUIZ_PARTS` doc comment updated
- `app/lib/format.ts` - Four `ANSWER_LABELS` entries added for Part 7 question IDs
- `tests/quiz-schema-type-guarantees.test.ts` - Arithmetic guard updated for Parts 1-7; four new assertions pinning Part 7's shape, flat gate, and the scoring boundary
- `tests/answer-labels.test.ts` - Per-key assertions for the four new labels, a fallback non-vacuity control, and the four IDs added to the existing `getQuestionById` non-vacuity list

## Decisions Made
- Followed 04-UI-SPEC.md's locked copy exactly: both `testing_status` option labels and `testing_allergens`'s question text are verbatim, unmarked; `testing_status`'s text/subtitle and `testing_year`/`testing_location`'s question text are UNCONFIRMED per the spec's proposed-copy table.
- Worded the Part 7 banner comment to describe the deferred upload field ("the required `file_multi` upload question for the `had_testing` branch") without using the literal substring `testing_files`, since the plan's own automated acceptance check (`app/lib/quiz/questions.ts contains zero occurrences of testing_files`) would otherwise fail against the plan's own suggested banner prose. No functional deviation — the reader still learns the field's type, branch, and owning plan (04-16).

## Deviations from Plan

None in task content or scope — all three tasks match the plan's `<action>` blocks exactly.

**Two process deviations, both at the state-update step:**

1. The plan's Task 1 `<verify>` automated command used `node --experimental-strip-types`, which requires Node 22.6+; this environment runs Node 20.19.6, where that flag is unrecognized. Ran the equivalent assertions via a disposable `vitest` test file (same logic, same pass/fail conditions) instead, confirmed all assertions passed, then deleted the temp file before committing — it was never part of the plan's `files_modified` list and left no trace in the final diff.

2. This plan's frontmatter lists `requirements: [TEST-01, TEST-02, TEST-03]`, and the standard post-plan step is `requirements mark-complete` on those IDs. Grepping every Phase 4 plan's frontmatter shows all three are also claimed by 04-07 (renders Part 7 in `QuizPartRenderer.tsx`), 04-09 (rebuilds `public/quiz-bundle.js`), and 04-19 (final requirements bookkeeping) — because TEST-01/02/03's literal text describes patient-facing behavior ("every patient **reaches** a step", "**takes** the patient to the storefront page", persisted answers surviving an actual submission) that this plan's schema-only scope does not deliver: `QuizPartRenderer.tsx` does not yet render `radio_single`/`text_input_short` for Part 7, and `QuizContainer.tsx`'s flow/consent wiring (D-09) is untouched. `requirements mark-complete TEST-01 TEST-02 TEST-03` was run, observed to flip all three checkboxes and the traceability table to "Complete," then reverted via `git checkout -- .planning/REQUIREMENTS.md` before this plan's other state updates, following the identical precedent 04-02-SUMMARY.md already recorded for the same false-record risk. 04-07/04-09/04-19 remain the plans expected to actually close this bookkeeping.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This plan touched only `app/lib/quiz/questions.ts`, `app/lib/format.ts`, and two test files.

## Next Phase Readiness

- Part 7 exists as pure declarative data with a two-option required gate and three required `showIf` children, all resolvable by `evaluateShowIf`, carrying zero score contribution — ready for `QuizPartRenderer` to render it once plan 04-08/04-09 wires the flow and rebuilds `public/quiz-bundle.js`.
- The file-upload question (`testing_files`, `file_multi`) is deliberately absent from `PART7_ALLERGY_TESTING` — plan 04-16 appends it to this same array once Blockers 1-3 clear, with no other structural change required.
- Both PHI renderers (`app/lib/pdf.ts`, `app/routes/app.quiz-results.tsx`) will render all four Part 7 IDs as readable clinical labels rather than raw keys, the moment answers containing them reach either renderer.
- Full suite (380/27) and typecheck both clean going into 04-07/04-08.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

All claimed files found on disk (`app/lib/quiz/questions.ts`, `app/lib/format.ts`,
`tests/quiz-schema-type-guarantees.test.ts`, `tests/answer-labels.test.ts`). All claimed commit
hashes found in `git log` (`5cb2186`, `be1d54c`, `9eb41e3`).
