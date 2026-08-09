---
phase: 02-quiz-schema-foundation
plan: 04
subsystem: quiz-schema
tags: [react, typescript, vitest, hipaa, phi-boundary, data-loss-fix]

# Dependency graph
requires:
  - phase: 02-quiz-schema-foundation
    plan: 03
    provides: "QuizPartRenderer.tsx with zero question-ID literals; QuizContainer.tsx already passing items= to QuizPartRenderer"
provides:
  - "D-03's boundary pass live at all three calculateTotalScore call sites (buildPayload, goToOutcome, Test Mode) plus the POST /api/quiz/submit payload"
  - "The med_list/med_control data-loss bug removed — handleAnswerChange no longer deletes a hidden answer, visibleAnswers strips it only at the score/payload boundary"
  - "Phase gate evidence: 269/269 tests, typecheck clean, build clean, TS2578 negative control re-confirmed (with its documented TS2322 deviation), score-equivalence proof (30 == 30, 3-point control delta)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Score and payload computation both derive from a single `visibleAnswers(ALL_ITEMS, answers)` call per site, so the score shown to the patient and the answers row written to Cloud SQL can never disagree (D-03)"

key-files:
  created: []
  modified:
    - app/components/quiz/QuizContainer.tsx

key-decisions:
  - "Task 2's 'push branch and open PR' step was not executed from this worktree. The plan text assumes a single continuous branch; this phase actually runs in a per-plan isolated git worktree (branch worktree-agent-a045fc9ddb97ced97), and the target integration branch phase-2-quiz-schema-foundation is checked out and locked in the main worktree at the same path — git cannot check it out here simultaneously. Prior plans (02-01 through 02-03) recorded the identical pattern: 'Plan metadata commit intentionally omitted — worktree execution mode; the orchestrator handles the shared-file/metadata commit after merge.' Push + PR creation is therefore left to the orchestrator once this worktree's commits are merged into phase-2-quiz-schema-foundation. All other Task 2 verification steps (1-8) were run directly and are recorded below with real output."

requirements-completed: [SCH-01, SCH-02]

# Metrics
duration: ~25min
completed: 2026-08-09
---

# Phase 2 Plan 4: Wire D-03's Boundary Pass and Close the Phase Summary

**Wired `visibleAnswers(ALL_ITEMS, answers)` into all three `calculateTotalScore` call sites and the `POST /api/quiz/submit` payload in `QuizContainer.tsx`, and deleted the `handleAnswerChange` special case that used to destroy a patient's typed medication list on a `taking_meds` toggle with no undo — closing Phase 2's mechanism work with the suite at 269/269, typecheck and build clean, and a non-vacuous score-equivalence proof (30 == 30, 3-point delta confirmed on the unfiltered control).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-09T10:39:00-04:00 (approx, first Edit)
- **Completed:** 2026-08-09T10:42:06-04:00 (last verification run)
- **Tasks:** 2/2 completed (Task 3 is a blocking human checkpoint, returned unresolved to the orchestrator per plan instructions)
- **Files modified:** 1 (`app/components/quiz/QuizContainer.tsx`)

## Accomplishments

- **Site 1 (`buildPayload`):** `const visible = visibleAnswers(ALL_ITEMS, answers);` inserted immediately after the `if (!patientState || !symptomProfileId) throw` guard. The score line now reads `calculateTotalScore(ALL_SCORED_QUESTIONS, visible)`, and the returned payload's `answers,` shorthand became `answers: visible,` — the score shown to the patient and the row sent to Cloud SQL now derive from the identical filtered set.
- **Site 2 (`goToOutcome`):** same `visibleAnswers(ALL_ITEMS, answers)` line inserted before `calculateTotalScore`, passing `visible`. The `[answers]` dependency array is unchanged per the plan (pure module imports are not React state).
- **Site 3 (Test Mode `onClick`, DIR-03):** `const visible = visibleAnswers(ALL_ITEMS, sample);` inserted after `setAnswers(sample)`, passed to `calculateTotalScore`. A comment notes `symptoms_sinus: []` is unanswered under D-06 but Test Mode bypasses `isPartComplete` entirely, so this is not a behavior change.
- **`handleAnswerChange`'s answer-deletion special case removed.** The `questionId === "taking_meds" && value === "no"` branch (`delete next.med_list; delete next.med_control;`) is gone; the callback is now a plain spread-and-set. A comment above it explains D-03's rationale: the hidden answer stays in React state (no data loss on a mis-click) and is stripped only at the score/payload boundary by `visibleAnswers`. This also removed the last three question-ID literals (`"taking_meds"`, `med_list`, `med_control`) from the file.
- `handleConsentSubmit`'s reads of `answers.history_personal` / `answers.history_family` were left against the raw `answers` object, unchanged — both Part 6 questions are unconditional (no `showIf`), so they are always visible and routing them through the filter would add a dependency without changing the result, exactly as the plan specifies.
- No route, `app/lib/db.ts`, `app/lib/submissions.ts`, or `app/lib/shopify/` file was touched. No dependency was added.

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply visibleAnswers at all three score sites and the payload, delete the answer-deletion special case** — `e9e5fd2` (feat)
2. **Task 2: Run the phase gate** — verification-only, no code changes, no separate commit (nothing to commit; results recorded below)

_Plan metadata commit intentionally omitted — worktree execution mode; the orchestrator handles the shared-file/metadata commit after merge (consistent with Plans 02-01 through 02-03)._

## Files Modified

- `app/components/quiz/QuizContainer.tsx` — `visibleAnswers` + `ALL_ITEMS` wired at `buildPayload`, `goToOutcome`, and the Test Mode button; `handleAnswerChange`'s deletion branch removed and replaced with a plain spread-and-set plus an explanatory comment.

## Decisions Made

- No deviations to the plan's implementation action were needed — the interfaces block in the plan (line numbers, function signatures, exact insertion points) matched the actual file exactly.
- The Task 2 "push + open PR" step was deliberately not executed from this isolated worktree; see `key-decisions` in frontmatter for the full reasoning. This is process deferral, not a plan deviation under Rules 1-4 — no code, test, or behavior changed as a result.

## Deviations from Plan

None in the code. Plan executed exactly as written for Task 1's implementation and Task 2's verification steps 1-8.

### Process note (not a Rule 1-4 deviation)

**Task 2 step 9 ("push `phase-2-quiz-schema-foundation` and open a PR") was not run from this worktree.** Explanation: this plan runs in an isolated per-plan git worktree on branch `worktree-agent-a045fc9ddb97ced97`. The plan's target integration branch, `phase-2-quiz-schema-foundation`, is checked out in the *main* worktree at the same repo path and is locked there — git refuses to check the same branch out twice, so it could not be pushed to correctly from here. Plans 02-01 through 02-03 recorded the identical situation and left the equivalent step to the orchestrator ("the orchestrator handles the shared-file/metadata commit after merge"). Push + PR creation is deferred to the orchestrator once this worktree's commit (`e9e5fd2`) is merged into `phase-2-quiz-schema-foundation`.

## Phase Gate Evidence (Task 2, steps 1-8 — all run directly, real output recorded)

1. **`npm run typecheck`** — exit 0, no output (clean).
2. **`npm test`** — **20 files passed, 269 tests passed, 0 failed, 0 skipped.** Baseline this phase must net-add against: 173 tests / 17 files (Phase-2 entry). Net add: **+96 tests / +3 files.** Against the immediately-prior Plan 02-03 exit state (also 269/269), this plan changed 0 test counts — expected, since Task 1 touches only `QuizContainer.tsx`, which carries no dedicated unit tests of its own in this repo (no DOM test infrastructure, per `02-VALIDATION.md`'s documented constraint).
3. **`npx vitest run tests/quiz-part-renderer-no-literals.test.ts`** — **5/5 passing.** Paired with Plan 02-01's recorded RED run (5/5 failing against pre-refactor `main`, `02-01-SUMMARY.md`) and Plan 02-03's GREEN flip (5/5 passing, `02-03-SUMMARY.md`) — this is the third confirmation of the non-vacuous SCH-02 proof, unchanged by this plan (expected, since this plan does not touch `QuizPartRenderer.tsx`).
4. **TS2578 negative control, re-run and reverted.** Flipped `INFO_FIXTURE.kind` from `"info"` to `"question"` in `tests/quiz-schema-type-guarantees.test.ts`. `npm run typecheck` failed with:
   ```
   tests/quiz-schema-type-guarantees.test.ts(35,3): error TS2322: Type '"question"' is not assignable to type '"info"'.
   ```
   This reproduces **exactly** the deviation Plan 02-01 documented (`02-01-SUMMARY.md`, "Task 3 negative control produced a different error code than the plan predicted"): the compiler catches the discriminant mismatch at `INFO_FIXTURE`'s own `const` declaration (its explicit `QuizInfoBlock` type annotation), one layer before any `@ts-expect-error` directive is reached — so TS2578 ("unused directive") never fires from this specific edit, because none of the four directives goes unused. This is a stronger, not weaker, proof: the guarantee is enforced at the fixture's construction site itself. Reverted `INFO_FIXTURE.kind` back to `"info"`; `npm run typecheck` re-ran clean (exit 0), `git status --short` showed no residual diff on the file.
5. **`npm run build`** — succeeded (exit 0). Client and SSR bundles both built; `QuizContainer-DZfLVD08.js` (41.73 kB / 11.45 kB gzip) is the only bundle whose content changed size-relevantly from this plan's edits.
6. **`git diff main -- app/components/quiz/QuizPartRenderer.test.ts | grep -c '^-'`** — **1** (the single `---` diff-header line only). Confirms the file's diff versus `main` remains additions-only, unchanged by this plan (this plan does not touch that file).
7. **`git diff main --name-only`** — exactly the nine expected source/test files plus `.planning/**`:
   `app/lib/quiz/types.ts`, `app/lib/quiz/questions.ts`, `app/lib/quiz/schema.ts`, `app/lib/quiz/schema.test.ts`, `app/components/quiz/QuizPartRenderer.tsx`, `app/components/quiz/QuizPartRenderer.test.ts`, `app/components/quiz/QuizContainer.tsx`, `tests/quiz-part-renderer-no-literals.test.ts`, `tests/quiz-schema-type-guarantees.test.ts`, plus `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/phases/02-quiz-schema-foundation/02-01-SUMMARY.md`, `.planning/phases/02-quiz-schema-foundation/02-02-SUMMARY.md`, `.planning/phases/02-quiz-schema-foundation/02-03-SUMMARY.md`. No additional file. Confirmed via `grep -E '^app/routes/|app/lib/db.ts|app/lib/submissions.ts|app/lib/shopify/|^package.json$|^package-lock.json$'` against this list — zero matches. `git diff main -- package.json package-lock.json` — empty (0 lines).
8. **PHI self-review checklist (`CLAUDE.md`) walked — zero items tripped:**
   - No `console.log`/`console.error` of any PHI field added. This plan adds zero new logging statements; the file's one pre-existing `console.warn` (rejected-navigation-target only, no PHI) and one pre-existing `console.error(e)` (error object only, in `handleScheduleConsult`/`handleTestFirst`/the auto-submit effect, all pre-existing) are untouched.
   - No route in this plan's diff — the auth-before-query and ownership-bounded-lookup items are not applicable.
   - No PHI-shaped values added to any URL, query string, or referrer header.
   - No new external dependency (`package.json`/`package-lock.json` diff empty, confirmed above).
   - No script added to the iframe embed page or any quiz-collection surface.

## Score-Equivalence Proof (Task 1 acceptance criterion, run and recorded)

Throwaway `tsx` script (not committed), using a full Parts-1-4 answer set plus `{ taking_meds: "no", med_list: "X", med_control: "not_at_all" }`:

| Scenario | Score |
|---|---|
| `visibleAnswers(ALL_ITEMS, answers)` fed to `calculateTotalScore` (the actual wired path) | **30** |
| Same base answers with `med_list`/`med_control` absent entirely | **30** |
| Control: same base answers WITHOUT the filter applied (`med_list`/`med_control` present, unfiltered) | **33** |

**EQUAL: true** (30 == 30) — the filtered payload's score matches the score computed as if the hidden answers were never entered at all, confirming `visibleAnswers` fully removes their scoring contribution. The unfiltered control's **3-point difference** matches `med_control`'s documented `not_at_all` score exactly (`questions.ts:236`), proving the check is non-vacuous — a filter that failed to strip `med_control` would show up as precisely this 3-point gap, and it does not appear in the wired path. `filtered` object also confirmed to contain neither `med_list` nor `med_control` as keys (`"med_list" in filtered: false`, `"med_control" in filtered: false`).

## Known Stubs

None. This plan wires existing pure functions into existing call sites; no new UI, no new data source, no placeholder value.

## Threat Flags

None. All changes stay inside the plan's declared trust boundary (`app/components/quiz/QuizContainer.tsx`'s payload-construction and score-computation paths, both dispositioned `mitigate` in the plan's own threat register as T-2-16 through T-2-18 and T-2-21). No new network endpoint, auth path, file-access pattern, or schema change was introduced. T-2-19 (PHI in logs, disposition `accept`) is unaffected — this plan adds zero logging statements.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- D-03's boundary pass is now live everywhere `calculateTotalScore` is called and everywhere the submit payload is built — Phase 3 (medical history content) and Phase 4 (testing split) can add new conditional/scored questions without re-deriving this filter.
- The `handleAnswerChange` special case is gone; any future conditional field that needs to be gated on a parent answer should follow the same pattern — `showIf` on the schema, `visibleAnswers` at the two boundary call classes (score, payload) — rather than a bespoke delete-on-toggle branch.
- **Task 3 (blocking human-verify checkpoint) is NOT complete.** Four manual checks (D-06 empty-selection-disables-Next, D-16 exclusive-deselect, D-03 medication-list-survives-toggle, D-10 info-block-render-and-revert) remain outstanding and must be confirmed in a real browser before this phase can be marked complete — see `02-VALIDATION.md`'s "Manual-Only Verifications" section, which states these checks are "not optional." This SUMMARY intentionally stops short of phase completion; the checkpoint is returned to the orchestrator unresolved.
- Task 2 step 9 (push branch, open PR) is also outstanding, deferred to the orchestrator for the reasons recorded above.
- Forward notes for Phase 3/4 planning, per the plan's `<output>` spec:
  - `required: false` is declared on exactly two questions today — `history_personal` and `history_family` (Part 6) — because both offer no "none of the above" option and `QuizContainer` seeds them to `[]`; applying D-06 uniformly would have made "no history" unselectable. Any new Part 6 question that also lacks a none-option needs the same flag or the same seeding contract.
  - The chained-`showIf` rule is **NON-TRANSITIVE** by design (`evaluateShowIf` reads a target's raw answer only, with no awareness of whether the target itself is currently visible) and is guarded by an executable forward guard (`findChainedShowIf` in `schema.test.ts`). Phase 3 (HIST-04) and Phase 4 (TEST-02/TEST-03) should read this guard's presence as "decided, not open," not re-derive the question — the day a real `showIf` targets an already-conditional question, this guard goes red and the transitive-visibility rule must be decided before that chain ships.
  - `visibleAnswers` strips **known-and-hidden**, not known-and-visible (a blacklist, not a whitelist) — this is deliberate (DIR-02) so that an item list deliberately blind to some part (e.g. `ALL_SCORED_QUESTIONS`, which excludes Part 6) never silently drops an unknown-but-real answer key like `history_personal`/`history_family`. Do not "simplify" this into a whitelist in a future phase; doing so would silently drop any answer belonging to a part the caller's item list doesn't cover.

---
*Phase: 02-quiz-schema-foundation*
*Completed: 2026-08-09*

## Self-Check: PASSED

Verified present on disk: `app/components/quiz/QuizContainer.tsx`, this SUMMARY
(`.planning/phases/02-quiz-schema-foundation/02-04-SUMMARY.md`). Verified present in
`git log --oneline --all`: commit `e9e5fd2` (Task 1).
