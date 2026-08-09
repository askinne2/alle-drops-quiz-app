---
phase: 03-mandatory-medical-history
plan: 03
subsystem: quiz-container
tags: [typescript, vitest, react, quiz-flow, phi, source-text-guard]

# Dependency graph
requires:
  - phase: 03-mandatory-medical-history
    provides: "03-01: QUIZ_PARTS with six entries (medical history is QUIZ_PARTS[5], reached by 100% of patients); 03-02: getAnswerLabel label map, server-side personal_history/family_history removal (T-3-01 server half)"
provides:
  - "QuizContainer.tsx with the medical_history FlowStep, its seeding effect, its render branch, the D-11 proceed-without-testing chain, and the extra payload parameter all removed — one flow, no bracket-conditional bypass"
  - "ResultsDisplay.tsx with three callback props (onScheduleConsult, onProceedToPurchase, onTestFirst) instead of four"
  - "buildPayload/submitPayload take zero parameters — T-3-01 closed on the client side"
  - "tests/quiz-medical-history-deletion.test.ts — source-text guard proving every D-11/D-12 deletion target is absent, with RED proof and positive controls"
affects: [03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fragment-assembled needle for a FlowStep string literal, both quoted (matching how the code actually wrote it) and bare (belt-and-suspenders against a future regression spelling it differently) — extends the quoted-only convention in tests/quiz-container-no-question-filter.test.ts"
    - "Collapsing a ternary to its surviving branch as a direct child, rather than leaving a null-returning husk, when one arm of the ternary is deleted"

key-files:
  created:
    - tests/quiz-medical-history-deletion.test.ts
  modified:
    - app/components/quiz/QuizContainer.tsx
    - app/components/quiz/ResultsDisplay.tsx
    - app/lib/quiz/schema.ts

key-decisions:
  - "The visibleAnswers doc comment in schema.ts (originally naming history_personal/history_family as its DIR-02 worked example) now names history_comorbidities — a real Part 6 question ID that is unknown to the Part-6-blind ALL_SCORED_QUESTIONS list, making it an equally valid (and now non-stale) example of an answer key that must survive visibleAnswers untouched when scoring."
  - "The guard test's own doc comment and describe/it string descriptions contain the prose phrase 'medical_history' nine times — this is consistent with the plan's own Task 3 acceptance criteria ('confirming it is 0 outside the doc comment's prose') and mirrors the existing analog (quiz-container-no-question-filter.test.ts uses the word 'question' freely in prose while fragment-assembling the executable needle). The repo-wide occurrence count of medical_history is 0 in every file EXCEPT this guard file itself; see Verification Evidence below."
  - "Updated the file-header doc comment (QuizContainer.tsx line 2) from 'parts 1-5, outcomes, optional part 6 + consent' to 'parts 1-6, outcomes, consent' — stale since 03-01 made Part 6 mandatory and non-optional; a same-file, same-task correctness fix (Rule 1), not a new deviation requiring separate tracking."

requirements-completed: [HIST-05]

# Metrics
duration: 25min
completed: 2026-08-09
---

# Phase 3 Plan 3: Delete D-11 Bypass and D-12 Dead FlowStep Summary

**Deleted the 7+ "Proceed Without Testing" bypass chain (D-11) and the now-redundant `medical_history` `FlowStep` bolt-on (D-12) from `QuizContainer.tsx`/`ResultsDisplay.tsx`, closed the client half of T-3-01 by removing `buildPayload`/`submitPayload`'s dead `extra` parameter, and added a new source-text guard proven RED (11 failing assertions) against pre-change source before going green.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-09T18:45:00Z (approx, per baseline test run timestamp)
- **Completed:** 2026-08-09T19:10:00Z (approx)
- **Tasks:** 3 planned, 3 executed as 3 commits
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `QuizContainer.tsx`: removed `showProceedWarning` state, `handleProceedWithoutTesting`, `handleConfirmProceedWithoutTesting`, `handleDeclineProceedWithoutTesting`, and collapsed the outcome-branch ternary so `<ResultsDisplay>` is the direct child (no `showProceedWarning ? null : ...` husk).
- `ResultsDisplay.tsx`: removed the `onProceedWithoutTesting` interface member, destructured prop, and its button — leaving exactly three callback props (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`).
- `QuizContainer.tsx`: removed the `"medical_history"` `FlowStep` union member (now 9 members), the `PART6_MEDICAL_HISTORY` import, the seeding `useEffect` that wrote `history_personal`/`history_family` to `[]`, the entire `step === "medical_history"` render branch (including its ad hoc "Medical history" `<h2>` — Part 6 now renders with no section heading, matching Parts 1-5 per UI-SPEC.md), and the consent back-button's `scoreBracket === "7+"` special case (now unconditionally `setStep("outcome")`).
- Closed T-3-01's client half: `buildPayload`/`submitPayload` now take zero parameters; `handleConsentSubmit` calls `submitPayload()` bare, with the `personal`/`family` extraction lines and `answers` dependency both removed.
- Updated `app/lib/quiz/schema.ts`'s `visibleAnswers` doc comment to reference `history_comorbidities` instead of the deleted `history_personal`/`history_family` as its DIR-02 worked example; the guarantee's wording is otherwise unchanged.
- New `tests/quiz-medical-history-deletion.test.ts`: 11 absence assertions against `QuizContainer.tsx`, 1 against `ResultsDisplay.tsx`, 8 positive controls proving surviving wiring (`itemsForPart`, `QUIZ_PARTS`, `handleTestFirst`, `autoSubmit0to2Attempted`, `quizPartsTotal`, `onTestFirst`, `onScheduleConsult`, `onProceedToPurchase`).
- Suite grew from 322/25 (plan start) to 342/26 (plan end) — 20 new assertions, zero regressions, zero test files deleted.

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete D-11 proceed-without-testing chain from both components** - `e951bcf` (feat)
2. **Task 2: Delete medical_history FlowStep, seeding effect, render branch, and dead extra parameter** - `f2cf856` (feat)
3. **Task 3: New source-text guard file, proven RED against pre-change source** - `f84aa36` (test)

**Plan metadata:** (this commit) `docs: complete 03-03 plan`

## Files Created/Modified

- `app/components/quiz/QuizContainer.tsx` — 5 D-12 deletion sites, 3 D-11 handlers + 1 state var + ternary collapse, `extra` parameter removed from `buildPayload`/`submitPayload`, file-header doc comment corrected
- `app/components/quiz/ResultsDisplay.tsx` — `onProceedWithoutTesting` prop/button removed, sibling "I'd Like Allergy Testing First" button and the other three callback props untouched
- `app/lib/quiz/schema.ts` — `visibleAnswers` doc comment's worked example updated (comment-only, DIR-02 guarantee preserved word-for-word apart from the ID)
- `tests/quiz-medical-history-deletion.test.ts` (new) — the D-11/D-12 source-text guard

## Decisions Made

- **`visibleAnswers` doc-comment example swapped to `history_comorbidities`.** This is a real, surviving Part 6 question ID that is genuinely unknown to the Part-6-blind `ALL_SCORED_QUESTIONS` list `visibleAnswers` is sometimes called with — so it is not just a stand-in, it demonstrates the exact DIR-02 scenario the comment describes (an answer key belonging to no item in the passed-in list surviving untouched). No executable line changed.
- **File-header doc comment fix (`QuizContainer.tsx:2`).** Changed "parts 1-5, outcomes, optional part 6 + consent" to "parts 1-6, outcomes, consent" — stale since plan 03-01 made Part 6 mandatory. This is Rule 1 (bug: stale comment in a file this task's own edits already touch), documented here rather than as a separate deviation entry since it required no additional investigation or fix-attempt cycle.
- **Guard file's own prose contains "medical_history" 9 times, non-vacuously.** See Verification Evidence — this is consistent with the plan's own Task 3 acceptance criteria and does not indicate an incomplete deletion.

## Deviations from Plan

None requiring the Rule 1-4 protocol — plan executed as written. Two same-task correctness touches are documented above under Decisions Made (the `schema.ts` comment update and the `QuizContainer.tsx` header comment) since both were explicitly anticipated in the plan's own action text (the `schema.ts` edit) or are a trivial same-file consistency fix directly caused by this task's own deletions (the header comment).

## Issues Encountered

None.

## RED Proof (per plan's `<red_proof>` requirement)

Method: saved copies of the pre-Task-1 `QuizContainer.tsx` and `ResultsDisplay.tsx` to the scratchpad before any edits. After writing and green-verifying the guard against post-change source, swapped the two pre-change files back into the working tree (git-diff confirmed an exact match against the pre-Task-1 commit — zero diff), ran `npx vitest run tests/quiz-medical-history-deletion.test.ts`, recorded the failures, then restored the post-change files (git-diff confirmed an exact match against HEAD — zero diff) and re-ran to confirm green.

**Recorded RED counts:**

- **`QuizContainer.tsx`: 11 of 11 absence assertions failed** against pre-change source:
  - quoted `"medical_history"` literal: 0 → 3 (FlowStep union member, seeding-effect guard, consent back-button ternary)
  - bare `medical_history` fragment: 0 → 3 (same three sites)
  - `PART6_MEDICAL_HISTORY`: 0 → 1 (the import)
  - `handleProceedWithoutTesting`: 0 → 1
  - `handleConfirmProceedWithoutTesting`: 0 → 1
  - `handleDeclineProceedWithoutTesting`: 0 → 1
  - `showProceedWarning`: 0 → 2 (state declaration + two read sites collapse to non-zero split count)
  - `history_personal`: 0 → 1 (seeding effect)
  - `history_family`: 0 → 1 (seeding effect)
  - `personal_history`: 0 → 3 (`extra` parameter type on `buildPayload` + `submitPayload`, plus `handleConsentSubmit`'s extraction)
  - `family_history`: 0 → 3 (same three sites)
- **`ResultsDisplay.tsx`: 1 of 1 absence assertion failed** against pre-change source: `onProceedWithoutTesting` 0 → 3 (interface member, destructured prop, button `onClick`).
- **All 8 positive-control assertions passed against BOTH pre-change and post-change source** — confirming they test surviving wiring that predates this plan, not something this plan newly introduced, and that the guard's positive half is non-vacuous in both directions.
- Both minimums from the plan's acceptance criteria exceeded: required "at least 10 in QuizContainer.tsx, 1 in ResultsDisplay.tsx" — actual 11 and 1.

Post-restore, `git diff` against `HEAD` for both files returned empty (byte-identical), confirming the RED-proof swap introduced no residual drift before the final green run.

## Verification Evidence

- `npm run typecheck` clean after every task; `npm test` green at 342/26 at plan end (up from 322/25 baseline).
- Occurrence counts (`SOURCE.split(needle).length - 1`, never `grep -c`) in `QuizContainer.tsx`, post-change: `medical_history` = 0, `PART6_MEDICAL_HISTORY` = 0, `handleProceedWithoutTesting` = 0, `handleConfirmProceedWithoutTesting` = 0, `handleDeclineProceedWithoutTesting` = 0, `showProceedWarning` = 0, `setShowProceedWarning` = 0, `history_personal` = 0, `history_family` = 0, `personal_history` = 0, `family_history` = 0.
- Positive controls, post-change, `QuizContainer.tsx`: `handleTestFirst` = 2, `handleProceedToPurchase` = 2, `itemsForPart` = 3, `QUIZ_PARTS` = 3, `autoSubmit0to2Attempted` = 4, `quizPartsTotal` = 4, `isPartComplete` = 7.
- `ResultsDisplay.tsx`, post-change: `onProceedWithoutTesting` = 0 (both interface + call site); `onTestFirst` = 3, `onScheduleConsult` = 3, `onProceedToPurchase` = 3; props interface declares exactly three callbacks (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`).
- `FlowStep` union: 9 members (`state_gate`, `patient_info`, `quiz_parts`, `outcome`, `consent`, `ineligible`, `submitting`, `completed`, `error`); `"medical_history"` is not one of them.
- `buildPayload`/`submitPayload`: both take zero parameters; `handleConsentSubmit`'s dependency array dropped `answers` since the body no longer references it.
- `schema.ts`: `history_personal` = 0, `history_family` = 0, `visibleAnswers` occurs 4x, `DIR-02` occurs 1x — comment updated, behavior untouched.
- **Repo-wide `medical_history` occurrence, after Task 2 (before the guard file existed):** 0 across `app/`, `tests/`, `extensions/`, `scripts/` — this is the strict reading of the plan's `<verification>` line and it holds at that point in the sequence.
- **Repo-wide `medical_history` occurrence, after Task 3 (final state):** 9, all 9 inside `tests/quiz-medical-history-deletion.test.ts`'s own doc comment and `describe`/`it` string descriptions (prose explaining what the guard proves absent) — zero in any executable needle construction and zero in `app/components/quiz/QuizContainer.tsx` or `app/components/quiz/ResultsDisplay.tsx` themselves. This is the expected, intended outcome per Task 3's own acceptance criteria ("confirming it is 0 outside the doc comment's prose") and mirrors the pre-existing analog convention in `tests/quiz-container-no-question-filter.test.ts` (which likewise uses its target word "question" freely in prose while fragment-assembling the executable needle).
- **Auto-submit effect (D-13) and progress-indicator block confirmed byte-identical to pre-plan source:** `git diff a8c13d7..HEAD -- app/components/quiz/QuizContainer.tsx` filtered for `autoSubmit0to2Attempted`, `TOTAL_FLOW_STEPS`, and `quizPartsTotal =` returns zero hits — neither block was touched by any of this plan's three commits.
- The 3-6 "Continue to Purchase AlleDrops" jump (`handleProceedToPurchase`) is present and wired unchanged; confirmed via the positive-control assertions above and by inspection — it is explicitly Phase 4/TEST-05's to remove, not this plan's.

## Orphaned CSS (for plan 03-04 to decide on)

`app/styles/quiz.module.css` was NOT touched by this plan (03-04 owns it in the same wave, per the plan's explicit instruction to avoid a merge conflict). The following classes are now unreferenced by any `.tsx` in the repo, since the `showProceedWarning` modal that used them was deleted in Task 1:

- `.proceedWarning` (quiz.module.css:592)
- `.proceedWarning__heading` (quiz.module.css:602)
- `.proceedWarning__body` (quiz.module.css:609)
- `.proceedWarning__actions` (quiz.module.css:616)

Plan 03-04 should decide whether to remove these or leave them (CSS Modules scope class names per-file at build time, so an orphaned class costs nothing at runtime beyond unused bytes in the source stylesheet).

## Known Stubs

None. This plan is purely subtractive — no new UI surface, no new data path, and no placeholder values were introduced.

## Threat Flags

None. This plan's threat register (T-3-01, T-3-08, T-3-09, T-3-10) covers every trust-boundary-relevant change made; no new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced. All four threats are `mitigate`-dispositioned and closed by this plan's own deletions and the new guard test (see Verification Evidence).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03-04 (DOM test infrastructure + `quiz.module.css` changes) can now proceed against a `QuizContainer.tsx`/`ResultsDisplay.tsx` with no `medical_history` dead path and no D-11 bypass — the orphaned `.proceedWarning*` CSS classes above are its decision to make.
- Plan 03-05 (theme bundle rebuild) has three commits of quiz-source changes since the last committed `public/quiz-bundle.js` freshness point (this plan plus 03-01) to fold into its single rebuild — this plan deliberately did NOT rebuild the bundle, per its own scope boundary and the project's `CLAUDE.md` rule 3.
- `buildPayload`/`submitPayload` now match the server-side contract closed in 03-02 exactly: neither side references `personal_history`/`family_history` anywhere. T-3-01 is fully closed (server half in 03-02, client half here).
- No blockers. `npm run typecheck` clean, `npm test` green at 342/26 (up from 322/25).

---
*Phase: 03-mandatory-medical-history*
*Completed: 2026-08-09*

## Self-Check: PASSED

- FOUND: app/components/quiz/QuizContainer.tsx
- FOUND: app/components/quiz/ResultsDisplay.tsx
- FOUND: app/lib/quiz/schema.ts
- FOUND: tests/quiz-medical-history-deletion.test.ts
- FOUND: .planning/phases/03-mandatory-medical-history/03-03-SUMMARY.md
- FOUND: e951bcf (Task 1 commit)
- FOUND: f2cf856 (Task 2 commit)
- FOUND: f84aa36 (Task 3 commit)
