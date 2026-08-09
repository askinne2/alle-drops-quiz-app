---
phase: 02-quiz-schema-foundation
plan: 03
subsystem: quiz-schema
tags: [react, typescript, vitest, discriminated-union, refactor, sch-02]

# Dependency graph
requires:
  - phase: 02-quiz-schema-foundation
    plan: 02
    provides: "app/lib/quiz/schema.ts — isQuestion, selectedValues, isAnswered, evaluateShowIf, visibleItems, visibleAnswers, toggleOption, isOptionDisabledByExclusive"
provides:
  - "QuizPartRenderer.tsx with zero question-ID literals and zero \"none\"-value literals — near-dumb, delegates every decision to schema.ts"
  - "isPartComplete(items: QuizItem[], answers) with no switch/case, no per-ID special cases"
  - "InfoBlockCard — the first renderer for a static QuizInfoBlock, React-children-only, no HTML sink"
  - "QuizPartRenderer.test.ts extended with D-06 / Part 6 / showIf / info-block coverage, 9 original assertions provably untouched"
affects: [02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Info-block branch (item.kind === \"info\") sits ABOVE the per-type switch, not as a case inside it, so TypeScript's discriminated-union narrowing gives the six existing question cases a compile-time guarantee they can never receive a QuizInfoBlock (D-09)"
    - "Per-case `const question = item;` alias inside each switch case, so the switch discriminant is literally `switch (item.type)` (matching the acceptance script's exact needle) while the six case bodies keep their original `question.*` reads verbatim — a one-line addition per case, not a markup change"

key-files:
  created: []
  modified:
    - app/components/quiz/QuizPartRenderer.tsx
    - app/components/quiz/QuizContainer.tsx
    - app/components/quiz/QuizPartRenderer.test.ts

key-decisions:
  - "The InfoBlockCard doc comment describing 'no HTML sink' avoids writing the literal string `dangerouslySetInnerHTML` in the source, because the plan's own acceptance script counts occurrences of that exact needle across the whole file (including comments) and requires 0. Caught by re-running the acceptance node script after the first draft, which printed `dsi 1` — the needle was matching my own JSDoc, not a real sink. Reworded the comment to describe the constraint without reproducing the forbidden token, verified 0, documented here so a future editor does not reintroduce the literal in a comment."

requirements-completed: [SCH-01, SCH-02]

# Metrics
duration: ~5min
completed: 2026-08-09
---

# Phase 2 Plan 3: Delete Every Question-ID Literal From QuizPartRenderer Summary

**Refactored `QuizPartRenderer.tsx` to a near-dumb item-to-markup mapper that delegates every decision (visibility, required-ness, exclusive-option toggling) to `app/lib/quiz/schema.ts`, deleting `isExclusiveNoneQuestion`, `getMultiAnswer`, and all nine question-ID/`"none"`-literal occurrences — flipping `tests/quiz-part-renderer-no-literals.test.ts` from 5 failing to 5 passing, the phase's central piece of evidence for SCH-02.**

## Performance

- **Duration:** ~5 min (Task 1 commit 10:32:35 -04:00, Task 2 commit 10:34:31 -04:00)
- **Tasks:** 2/2 completed
- **Files modified:** 3 (`QuizPartRenderer.tsx`, `QuizContainer.tsx`, `QuizPartRenderer.test.ts`) — 0 created

## Accomplishments

- `QuizPartRenderer.tsx`'s prop widened from `questions: QuizQuestion[]` to `items: QuizItem[]`; the component now filters through `visibleItems(items, answers)` once, at the top of render, instead of a hardcoded `question.part === 5 && (question.id === "med_list" || question.id === "med_control")` guard plus a `takingMeds` local.
- `isExclusiveNoneQuestion` (a 4-ID hardcoded array) and `getMultiAnswer` are deleted outright — both are now `schema.ts` functions (`isOptionDisabledByExclusive`, `selectedValues`) called with the question's own declarative data.
- The `checkbox_multi`/`radio_multi` `onChange` handler collapsed from an 11-line exclusive-none branch (`exclusiveNone`, `hasNone`, `isNone`, `disableOthers` locals, three `"none"` string comparisons) to a single `onAnswerChange(question.id, toggleOption(question, raw, opt.value))` call.
- A new info-block branch (`item.kind === "info"`) sits above the per-type `switch`, not as a case inside it — the six existing question-type cases benefit from the compiler's discriminated-union narrowing (D-09) exactly as CONTEXT.md and RESEARCH.md Pattern 2 specify.
- A new `InfoBlockCard` component renders `heading` + `paragraphs` + optional `bullets` as plain React children — no `dangerouslySetInnerHTML`, no markdown, no sanitizer dependency. It reads no `answers` and calls no `onAnswerChange`, so it has no way to produce an `answers` entry (D-11).
- `isPartComplete(items, answers)` rewritten with **zero** `switch`/`case`: `visibleItems` first, then `if (!isQuestion(item)) continue;` (info blocks skip without a required check — D-12), then `if (item.required === false) continue;` (D-05's default-required), then `if (!isAnswered(item, answers[item.id])) return false;` (D-07's shared predicate).
- `QuizContainer.tsx` — mechanical-only change per the plan's scope restriction: `questions=` renamed to `items=` at both render sites (`quiz_parts` step and `medical_history` step). Nothing else in that file was touched; the `visibleAnswers` wiring and `handleAnswerChange` cleanup are explicitly Plan 02-04's job.
- `QuizPartRenderer.test.ts` extended with four new `describe` blocks (D-06 empty-array, Part 6 non-regression, showIf substitution, info-block contract) — 9 new `it` blocks, 0 existing lines touched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor QuizPartRenderer.tsx to delegate every decision to schema.ts** — `033af47` (refactor)
2. **Task 2: Append the D-06, Part 6, and info-block assertions without touching the existing 12** — `a03ba78` (test)

_Plan metadata commit intentionally omitted — worktree execution mode; the orchestrator handles the shared-file/metadata commit after merge._

## Files Modified

- `app/components/quiz/QuizPartRenderer.tsx` — prop rename, deleted two literal-driven helpers, added the info-block branch + `InfoBlockCard`, rewrote the multi-select onChange path, rewrote `isPartComplete`.
- `app/components/quiz/QuizContainer.tsx` — `questions=` → `items=` at both `QuizPartRenderer` render sites. No other change.
- `app/components/quiz/QuizPartRenderer.test.ts` — four new `describe` blocks appended below the existing content; imports for `PART6_MEDICAL_HISTORY` and `type QuizItem` added as new lines (not edits to the existing import line).

## Non-Vacuous SCH-02 Proof — RED (Plan 02-01) next to GREEN (this plan)

Per-needle occurrence counts, `SOURCE.split(needle).length - 1`, measured against pre-refactor `main` (`7ac835e`, recorded in `02-01-SUMMARY.md`) versus this plan's post-refactor `QuizPartRenderer.tsx`:

| Needle | RED (pre-refactor, 02-01) | GREEN (post-refactor, this plan) |
|---|---|---|
| quoted `"none"` | 5 | **0** |
| `"timing_triggers"` | 1 | **0** |
| `"symptoms_nasal"` | 1 | **0** |
| `"symptoms_eye"` | 1 | **0** |
| `"symptoms_sinus"` | 1 | **0** |
| `"med_list"` | 3 | **0** |
| `"med_control"` | 3 | **0** |
| bare `taking_meds` | 2 | **0** |
| `isExclusiveNoneQuestion` | 2 | **0** |
| `getMultiAnswer` | n/a (not a literal-inventory needle, but confirmed deleted) | **0** |

`npx vitest run tests/quiz-part-renderer-no-literals.test.ts` — **5/5 passing** (was 5/5 failing before this plan). Together with the recorded RED run this is the non-vacuous SCH-02 proof VALIDATION.md Rule 1 requires.

Independent confirmation, not routed through the test file itself (the exact node script from the plan's acceptance criteria, re-run after the final edit):

```
"none" 0
"timing_triggers" 0
"symptoms_nasal" 0
"symptoms_eye" 0
"symptoms_sinus" 0
"med_list" 0
"med_control" 0
taking_meds 0
isExclusiveNoneQuestion 0
getMultiAnswer 0
```

## Verification Results (all commands run, real output recorded)

- `npm run typecheck` — **exit 0**, clean, after both tasks.
- `npx vitest run tests/quiz-part-renderer-no-literals.test.ts app/components/quiz/QuizPartRenderer.test.ts` (post-Task-1) — **14/14 passing** (5 literal-inventory + 9 original renderer assertions).
- `npx vitest run app/components/quiz/QuizPartRenderer.test.ts` (post-Task-2) — **18/18 passing** (9 original + 9 new), 0 skipped.
- `node -e '...visibleAnswers.../dangerouslySetInnerHTML...'` — prints `visibleAnswers 0 dsi 0`. The renderer imports no boundary filter and holds no HTML sink.
- `node -e '...kind === "info" index < switch (item.type) index...'` — prints `true`. The info branch sits above the per-type switch, not inside it.
- `node -e '...isPartComplete body switch/case counts...'` — prints `switch 0 case 0`.
- `git diff main -- app/components/quiz/QuizPartRenderer.test.ts | grep -c '^-'` — prints **`1`** (the single `---` file-header line). The diff is additions-only; not one of the 9 original `it` blocks / 12 original `expect` assertions was modified, reordered, or reflowed.
- `git diff main -- app/lib/quiz/questions.ts | grep -c 'kind: "info"'` — prints **`0`**. The info-block fixture in Task 2 is test-local, as required.
- `git diff main -- app/styles/quiz.module.css package.json package-lock.json` — **empty**. No stylesheet edit, no new dependency.
- **Full suite (`npm test`):** **20 files passed, 269 tests passed, 0 failed, 0 skipped.** Immediately before this plan (Plan 02-02's exit state): 255 passed / 5 failed / 260 total. After Task 1 (the RED-to-GREEN flip): 260 passed / 0 failed / 260 total. After Task 2 (net +9 new assertions): **269 passed / 0 failed / 269 total.** Net add versus the Plan 02-02 baseline: **+14 tests, 0 removed, 0 skipped, 0 weakened.** Net add versus the Phase-2-entry 173-test baseline (per `02-CONTEXT.md`'s "Claude's Discretion" section): **+96 tests.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `InfoBlockCard`'s own JSDoc comment tripped the `dangerouslySetInnerHTML`-absence acceptance check**
- **Found during:** Task 1, running the acceptance script `node -e '...dsi...'` after the first draft of the file.
- **Issue:** The doc comment for `InfoBlockCard` originally read "...no HTML sink (no `dangerouslySetInnerHTML`, no markdown, no sanitizer)." — literally containing the forbidden needle. The acceptance script counts occurrences across the whole file (`SOURCE.split(needle).length - 1`), including comments, and requires `0`. It printed `dsi 1`.
- **Fix:** Reworded the comment to "...no HTML injection sink here (no raw-HTML-setting React prop, no markdown, no sanitizer)." — same meaning, no literal reproduction of the forbidden token.
- **Files modified:** `app/components/quiz/QuizPartRenderer.tsx`.
- **Verification:** Re-ran the node script; prints `dsi 0`. Re-ran typecheck and the targeted test files; both still green.
- **Committed in:** `033af47` (Task 1 commit — caught and fixed before the commit, not a follow-up).

---

**Total deviations:** 1 auto-fixed (Rule 1 — a bug in the plan's own draft-implementation self-check, caught by re-running the plan's own acceptance script before committing; no scope creep, no architectural change).

## Known Stubs

None. `InfoBlockCard` is fully wired to `QuizItem`'s `QuizInfoBlock` shape and renders real content when given real data; no info block exists in `questions.ts` yet by design (this phase ships mechanism, Phase 3/4 ship content), and no test or production code path presents an empty/placeholder value to a patient as a result.

## Threat Flags

None. All work stays inside the plan's declared trust boundaries (`InfoBlockCard`'s render path on `/quiz-embed`, and the `visibleItems`/`isPartComplete` decision path) — both dispositioned `mitigate` in the plan's own threat register (T-2-11 through T-2-15), and both mitigations are implemented and verified above (zero-occurrence HTML-sink check; positive Part-6 and showIf-substitution assertions).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `QuizPartRenderer.tsx` and `isPartComplete` are now fully `QuizItem`-driven; Plan 02-04 can wire `visibleAnswers` into `QuizContainer.tsx`'s two D-03 boundary-filter sites (before `calculateTotalScore` and before the `POST /api/quiz/submit` payload) without touching this plan's renderer changes.
- `QuizContainer.tsx`'s `currentPartQuestions` still applies the Plan 02-01 `kind === "question"` narrowing filter before passing to `QuizPartRenderer`'s now-wider `items` prop — this plan's scope explicitly excluded touching it ("Change nothing else in this file"). It remains a behavior-preserving no-op today (no info block exists in `QUIZ_PARTS`' actual content) and is available for Plan 02-04 or Phase 3 to revisit once real info-block content is authored.
- The four ROADMAP success criteria for this phase (required blocks advance / showIf shows-and-hides / static info block renders and collects no answer / med_list-med_control identical) are all positively asserted in `QuizPartRenderer.test.ts` now, not just claimed.
- No blockers.

---
*Phase: 02-quiz-schema-foundation*
*Completed: 2026-08-09*
