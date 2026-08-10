---
phase: 04-mandatory-allergy-testing
plan: 08
subsystem: ui
tags: [react, typescript, vitest, quiz-flow, consent, hipaa]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-07's Part 7 render branches (radio_single, text_input_short) so the last quiz part is real and its Continue button is reachable through the actual QUIZ_PARTS"
provides:
  - "Single-path quiz flow: quiz_parts (Part 7 last) -> consent -> submitting -> results (terminal), for every score bracket"
  - "ResultsDisplay.tsx as a data-only, callback-free terminal component (ResultsDisplayProps has zero function-typed props)"
  - "tests/quiz-testing-bypass-deletion.test.ts — source-text guard for the D-09/D-10 deletions, proven RED then GREEN"
affects: ["04-09 (theme bundle rebuild — must include this plan's QuizContainer/ResultsDisplay changes)", "04-19 (UAT checkpoint should re-confirm the needs_testing product-link omission is ratified, and re-run the 8-check human browser pass since this plan restructures the highest-risk part of the flow)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin browser-global wrappers (getRedirectUrl, navigateParent, getProductConfig) are duplicated per calling component rather than shared, to avoid a circular import between QuizContainer.tsx and ResultsDisplay.tsx — each component owns its own copy over the same pure underlying functions in redirects.ts/product-links.ts/navigation.ts"
    - "Source-text deletion guards that are later superseded (quiz-medical-history-deletion.test.ts's own comments predicted this) get their now-false positive controls flipped to absence assertions in the same commit that makes them false, rather than left stale"

key-files:
  created:
    - tests/quiz-testing-bypass-deletion.test.ts
  modified:
    - app/components/quiz/ResultsDisplay.tsx
    - app/components/quiz/QuizContainer.tsx
    - tests/quiz-medical-history-deletion.test.ts

key-decisions:
  - "The terminal FlowStep is named 'results', not reusing 'outcome'. The guard test (this plan's own artifact) asserts zero occurrences of setStep(\"outcome\") — keeping the pre-consent step name for the post-consent terminal step would have required either a name that reads wrong or a guard exception; renaming to 'results' avoided both and reads correctly (\"reach the results screen\") for its new position after submit."
  - "The 'completed' FlowStep and its Thank-You render block are deleted outright, not merged into 'results' as a separate transitional state — ResultsDisplay already absorbed both of its actions (Return Home, product-page link) in Task 2, so a distinct 'completed' step would have been dead weight with no unique content."
  - "getRedirectUrl, navigateParent, and getProductConfig are duplicated in ResultsDisplay.tsx rather than exported from QuizContainer.tsx and imported, because QuizContainer imports ResultsDisplay — an import in the other direction would be circular. Each is a thin, stateless wrapper over a pure function in redirects.ts/navigation.ts/product-links.ts, consistent with those modules' own doc comments (\"the thin browser-global wrapper belongs in the calling component\")."
  - "Test Mode's dev-only shortcut (?test=1) still jumps straight past consent to the results step. This is unchanged behavior (it never went through consent even before this plan) and performs no POST, so it does not reintroduce the TEST-07 defect this plan closes for real patients; documented inline so a future reader doesn't mistake it for a regression."

patterns-established:
  - "When a plan's own deletions falsify another test file's documented positive controls (a Phase 3 guard's own comments predicted this — 'Phase 4 (TEST-05) owns stripping the remaining callback props'), flip those controls to absence assertions in the commit that does the deletion, with a comment explaining the supersession, rather than leaving a red test or silently deleting the historical guard."

requirements-completed: [TEST-05, TEST-07]

# Metrics
duration: ~35min
completed: 2026-08-10
---

# Phase 4 Plan 8: Consent-First Single-Path Flow + Terminal ResultsDisplay Summary

**Closed a live production defect (0-2 patients auto-submitting with a stamped consent_version they never saw) by deleting the 0-2 auto-submit chain and both remaining no-testing bypasses, making ResultsDisplay a zero-callback terminal screen reached only through ConsentStep, for every score bracket — full suite 416 tests / 28 files (up from 392/27), typecheck clean.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-10T20:14:00Z (approx)
- **Completed:** 2026-08-10T20:22:30Z (approx)
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- **Closed the live TEST-07 defect.** Before this plan, a 0-2 bracket patient's `useEffect` auto-submitted the quiz payload — with `consent_version: CONSENT_VERSION` stamped on it — without `ConsentStep` ever rendering. That auto-submit `useEffect`, its `autoSubmit0to2Attempted` ref, and the `savedToServer` bookkeeping that existed only to stop it and two other handlers from double-submitting are all deleted. `handleConsentSubmit` (behind the single Submit button in `ConsentStep`) is now the *only* code path that calls `submitPayload`/`postQuiz`, and it is only reachable after the patient has seen and checked consent.
- **Deleted both remaining no-testing bypasses (TEST-05).** `handleScheduleConsult`, `handleTestFirst`, and `handleProceedToPurchase` are gone, along with the "Continue to Purchase AlleDrops" button and the 7+ bracket's "We recommend proceeding with allergy testing" clause (D-10). Phase 3's D-11 had already removed the 7+ "Proceed Without Testing" chain; this plan removes the 3-6 purchase jump, which was the last one.
- **`ResultsDisplay.tsx` is now callback-free and terminal.** `ResultsDisplayProps` shrank from three function props (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`) to pure data plus `testingStatus: "needs_testing" | "had_testing"`. A single `testingStatus`-conditioned action area (plain `<a>` / `navigateParent()` only, no callbacks) replaced all three per-bracket action blocks: `needs_testing` gets "Schedule Allergy Testing" (an anchor intercepted by `quiz-embed.tsx`) + "Return Home", with the product-page link deliberately omitted (TEST-06, planner-ratified per 04-UI-SPEC.md §5, flagged for 04-19's UAT checkpoint); `had_testing` gets "Return Home" + the product-page link, matching the deleted "completed" step's prior hierarchy.
- **Single path for every bracket, verified by enumeration.** Every `setStep(...)` call site in `QuizContainer.tsx` was enumerated (see "Reachability verification" below): there is exactly one entry into `"consent"` from the forward flow (`goToConsent`, called only from the terminal quiz part's Continue button, gated by `isPartComplete`), and exactly one submission call site (`handleConsentSubmit`). `"results"` is reached only after that submission succeeds (or via the dev-only `?test=1` Test Mode shortcut, which performs no POST).
- **Resolved the `symptom_profile_id` double-submit defect for free** (recorded in `STATE.md` §Deferred Items, 2026-07-30). The original defect required a pre-consent screen with *multiple independent submit-triggering buttons* ("Schedule a Telehealth Appointment" then, after navigating back, "Continue to Purchase"). That screen (the old `"outcome"` step) no longer exists — there is exactly one `submitPayload()` call site in the whole component. Verified by grep: `submitPayload()` appears once (`handleConsentSubmit`), and `postQuiz()` has exactly one caller (`submitPayload`).
- **The terminal-part button label fix.** `"See results"` → `"Continue"` (04-UI-SPEC.md's required copy fix — the button now leads to consent, not results).
- **The dead `"outcome"` FlowStep was removed from the union**, not left as an unreachable member. Per the guard's own header comment (copied from Phase 3's convention), a `FlowStep` union member with no reachable `setStep(...)` call is exactly the failure shape that let `entry.theme.tsx`'s open redirect survive two reviews — the terminal step is now named `"results"` and the union has no dead members.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the deletion guard and prove it RED against pre-change source** - `cd2b20d` (test)
2. **Task 2: Make ResultsDisplay terminal and update its call site** - `dfaccfb` (feat)
3. **Task 3: Rewire QuizContainer to the single consent-first path and take the guard GREEN** - `a02b7fa` (fix)

_No TDD tasks (tdd flag not set on this plan); Task 1 followed the project's separate "guard proven RED" convention instead, verified per its own inverted `<verify>` command._

## Deletion Guard: RED then GREEN

**RED (Task 1, measured against unmodified source, 2026-08-10):**
`npx vitest run tests/quiz-testing-bypass-deletion.test.ts` FAILED with **18 of 24 assertions failing** (`! npx vitest run ...` — the plan's inverted verify command — exited 0, confirming RED).

Per-needle pre-change counts (all absence needles, all non-zero = failing):

| Needle | Pre-change count | File |
|---|---|---|
| `autoSubmit0to2Attempted` | 4 | QuizContainer.tsx |
| `handleScheduleConsult` | 2 | QuizContainer.tsx |
| `handleTestFirst` | 2 | QuizContainer.tsx |
| `handleProceedToPurchase` | 2 | QuizContainer.tsx |
| `savedToServer` | 3 | QuizContainer.tsx |
| `onScheduleConsult` (call site) | 1 | QuizContainer.tsx |
| `onProceedToPurchase` (call site) | 1 | QuizContainer.tsx |
| `onTestFirst` (call site) | 1 | QuizContainer.tsx |
| `See results` | 1 | QuizContainer.tsx |
| `setStep("outcome")` | 3 | QuizContainer.tsx |
| `onScheduleConsult` (prop/destructure) | 4 | ResultsDisplay.tsx |
| `onProceedToPurchase` (prop/destructure) | 3 | ResultsDisplay.tsx |
| `onTestFirst` (prop/destructure) | 3 | ResultsDisplay.tsx |
| `Continue to Purchase AlleDrops` | 1 | ResultsDisplay.tsx |
| `We recommend proceeding with allergy testing` | 1 | ResultsDisplay.tsx |

That is 15 absence assertions failing (exceeding the required minimum of 10), plus 3 red-by-design positive controls not yet true (`testingStatus`, `Schedule Allergy Testing`, `Your responses have been submitted.` — all in `ResultsDisplay.tsx`, added by Task 2) = 18 total failing of 24. The 6 passing assertions were the QuizContainer-side positive controls (`itemsForPart`, `QUIZ_PARTS`, `quizPartsTotal`, `handleAnswerChange`, `CONSENT_VERSION`, and — not red-by-design, see the test file's own comment — `setStep("consent")`, which already existed pre-change via `handleProceedToPurchase`).

**GREEN (after Task 3):** `npx vitest run tests/quiz-testing-bypass-deletion.test.ts` — **24/24 passing.**

## Reachability Verification (Task 3 acceptance criterion)

Every `setStep(...)` call site in `QuizContainer.tsx` after this plan, enumerated:

| Call site | Target | Reachable from |
|---|---|---|
| `goToConsent` | `"consent"` | Terminal quiz part's Continue button, gated by `isPartComplete` — the **only** production entry into consent |
| Error step's Back button | `"consent"` | Only reachable after a failed `handleConsentSubmit` (retry, not a new submission) |
| `onEligible` | `"patient_info"` | StateGate's eligible callback |
| `onIneligible` | `"ineligible"` | StateGate's ineligible callback |
| `handleConsentSubmit` (start) | `"submitting"` | Consent's Submit button |
| `handleConsentSubmit` (success) | `"results"` | Successful `submitPayload()` — the **only** production entry into results |
| `handleConsentSubmit` (failure) | `"error"` | Failed `submitPayload()` |
| Ineligible screen's Back | `"state_gate"` | IneligibleMessage's onBack |
| Patient-info Previous | `"state_gate"` | Patient info step |
| Patient-info Next (validated) | `"quiz_parts"` | Patient info step, sets `currentPartIndex(0)` |
| Quiz-parts Previous (index 0) | `"patient_info"` | First quiz part |
| Consent's Previous | `"quiz_parts"` | Sets `currentPartIndex(quizPartsTotal - 1)` — re-enters the last part rather than a deleted step |
| Test Mode button | `"results"` | Dev-only, gated behind `?test=1`, performs no POST |

`submitPayload()` is called from exactly one place (`handleConsentSubmit`, confirmed by `grep -n "submitPayload()\|postQuiz("`), and `postQuiz()` has exactly one caller (`submitPayload`). There is no code path that reaches `"results"` in production without first passing through a successful `submitPayload()` call from `"consent"`.

## Files Created/Modified

- `tests/quiz-testing-bypass-deletion.test.ts` (new) - Source-text guard for the six D-09 deletions plus D-10's two copy clauses; 24 assertions (15 absence + 9 positive controls), proven RED then GREEN
- `app/components/quiz/ResultsDisplay.tsx` - Data-only `ResultsDisplayProps` (dropped 3 callbacks, added `testingStatus`); submitted-confirmation subtitle; deleted the 7+ and 3-6 locked-copy clauses; one shared `testingStatus`-conditioned action area with its own thin `getRedirectUrl`/`navigateParent`/`getProductConfig` wrappers (duplicated from QuizContainer to avoid a circular import)
- `app/components/quiz/QuizContainer.tsx` - FlowStep union: `"outcome"`/`"completed"` replaced by `"results"`; deleted the auto-submit chain, three handlers, and the `"completed"` render block; `goToOutcome` renamed `goToConsent`; consent's Previous rewired to re-enter `quiz_parts`; terminal button label "See results" → "Continue"; removed now-dead `getRedirectUrl`/`navigateParent`/`getProductConfig` (their only caller, the "completed" block, was deleted)
- `tests/quiz-medical-history-deletion.test.ts` - Five positive controls (`onTestFirst`, `onScheduleConsult`, `onProceedToPurchase`, `handleTestFirst`, `autoSubmit0to2Attempted`) that this plan's deletions made false — all five had comments documenting them as deliberately deferred to or "unedited by" a future plan — flipped to absence assertions with comments explaining the supersession

## Decisions Made

- Terminal step named `"results"` (not reused `"outcome"`) — see key-decisions in frontmatter.
- `"completed"` step deleted outright rather than kept as a transitional state — its actions were fully absorbed by `ResultsDisplay` in Task 2, so keeping it would have been dead weight.
- `getRedirectUrl`/`navigateParent`/`getProductConfig` duplicated into `ResultsDisplay.tsx` rather than exported from `QuizContainer.tsx`, to avoid a circular import (`QuizContainer` imports `ResultsDisplay`).
- Test Mode's `?test=1` shortcut still bypasses consent on the way to `"results"` — unchanged, pre-existing dev/QA behavior, performs no POST, does not reopen the TEST-07 defect for real patients.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale positive controls in `tests/quiz-medical-history-deletion.test.ts` became false assertions**
- **Found during:** Task 2 (ResultsDisplay callback removal) and Task 3 (QuizContainer rewiring)
- **Issue:** The Phase 3 guard (`tests/quiz-medical-history-deletion.test.ts`) asserted five identifiers stay *present*: `onTestFirst`, `onScheduleConsult`, `onProceedToPurchase` in `ResultsDisplay.tsx` (its own comment: "Phase 4 (TEST-05) owns stripping the remaining callback props"), and `handleTestFirst`, `autoSubmit0to2Attempted` in `QuizContainer.tsx` (its own comment: "D-13 — unedited by this plan"). This plan's own Tasks 2 and 3 legitimately delete all five, which turned five previously-passing assertions false — not a bug in the new code, but a guard whose documented assumption this plan was always going to invalidate.
- **Fix:** Flipped all five from `toBeGreaterThan(0)` to `toBe(0)`, with comments explaining the supersession and citing this plan (04-08, TEST-05/TEST-07, D-09) as the reason.
- **Files modified:** `tests/quiz-medical-history-deletion.test.ts`
- **Verification:** `npm test` full suite green (416/28) after each fix; the guard still asserts everything it originally asserted about D-11/D-12 (the medical_history FlowStep, the 7+ proceed-without-testing chain, `personal_history`/`family_history`) unchanged — only the five callback/handler controls it explicitly deferred to a future plan were updated.
- **Committed in:** `dfaccfb` (three controls, Task 2 commit), `a02b7fa` (two controls, Task 3 commit)

**2. [Rule 1 - Bug] Removed dead code left over from the deleted "completed" block and deleted handlers**
- **Found during:** Task 3
- **Issue:** After deleting the "completed" step block and the three handlers, `getRedirectUrl`, `navigateParent`, `getProductConfig`, and their associated imports (`getRedirectTarget`, `REDIRECT_FALLBACK`, `QuizRedirectConfig`, `RedirectKind`, `getProductHandle`, `QuizProductConfig`, `toRelativePath`) had no remaining callers in `QuizContainer.tsx`.
- **Fix:** Removed the dead functions and their now-unused imports. `ResultsDisplay.tsx` (from Task 2) already carries its own copies of the two wrappers it needs.
- **Files modified:** `app/components/quiz/QuizContainer.tsx`
- **Verification:** `npm run typecheck` clean; `npm test` green.
- **Committed in:** `a02b7fa` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs/staleness this plan's own deletions caused in sibling test files and dead code, not scope creep beyond the plan's stated deletion list)
**Impact on plan:** Both fixes were necessary consequences of executing the plan's own D-09/D-10 deletion list faithfully; no functionality beyond what the plan specified was added or changed.

## Issues Encountered

None beyond the two deviations above, both anticipated by the plan's own referenced files (the Phase 3 guard's comments explicitly named this plan as the one that would supersede its callback-prop controls).

## User Setup Required

None - no external service configuration required. This plan touched only `app/components/quiz/ResultsDisplay.tsx`, `app/components/quiz/QuizContainer.tsx`, `tests/quiz-testing-bypass-deletion.test.ts`, and `tests/quiz-medical-history-deletion.test.ts`.

## Next Phase Readiness

- `public/quiz-bundle.js` was deliberately NOT rebuilt — plan 04-09 owns the single rebuild for the whole unblocked track and must fold in this plan's `QuizContainer.tsx`/`ResultsDisplay.tsx` changes alongside plans 04-02, 04-03, 04-06, and 04-07.
- Full suite (416 tests / 28 files) and typecheck both clean going into 04-09.
- 04-19's UAT checkpoint should explicitly ratify or override the `needs_testing` product-link omission (T-4-29, planner-ratified per 04-UI-SPEC.md §5, not a CONTEXT.md lock) and re-run the 8-check human browser pass — this plan restructured the highest-risk part of the flow (`STATE.md`'s "Standing risk" table: defects 4 and 5 were judgment failures a DOM-test/guard-test suite cannot catch).
- The `symptom_profile_id` double-submit defect (`STATE.md` §Deferred Items) is now unreachable in production code — see "Reachability Verification" above. That STATE.md entry should be marked resolved when STATE.md is next updated.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

All claimed files found on disk (`tests/quiz-testing-bypass-deletion.test.ts`,
`app/components/quiz/ResultsDisplay.tsx`, `app/components/quiz/QuizContainer.tsx`,
`.planning/phases/04-mandatory-allergy-testing/04-08-SUMMARY.md`). All claimed commit hashes
found in `git log` (`cd2b20d`, `dfaccfb`, `a02b7fa`).
