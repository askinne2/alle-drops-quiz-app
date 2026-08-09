---
status: complete
phase: 02-quiz-schema-foundation
source: [02-04-PLAN.md Task 3 checkpoint:human-verify]
performed_by: Claude (Chrome automation, localhost dev server), at Andrew's explicit request
started: 2026-08-09
updated: 2026-08-09
---

## Current Test

Checks 1–3 PASSED in a real browser. Check 4 FAILED, root-caused, and fixed — but **not yet
re-verified end-to-end in a browser after the fix** (see "Residual" below).

## How this was run

`npx react-router dev` with `SHOPIFY_APP_URL=http://localhost:3000` (note: `npm run dev` is
`shopify app dev` and cannot run non-interactively — it blocks on a store-selection prompt).
Driven through Chrome. **No submission was completed — stopped before "See results" — so no PHI
row was written to Cloud SQL.** Synthetic data only (`UAT Test Patient` / `uat+test@example.com`).

## Tests

### 1. D-06 — an empty selection blocks step advance
expected: nothing answered → Next disabled; all three answered → Next enabled; a checklist emptied
back to `[]` → Next disabled again
result: **PASS**. Measured on the live DOM, not from screenshots:
- nothing answered → `next.disabled = true`
- Sneezing + both "None of the above" ticked → `next.disabled = false` ← non-vacuity control
- Sneezing unticked, leaving `symptoms_nasal: []` → `next.disabled = true`

The middle step matters: Next genuinely enables, so the disabled state is not vacuous.

### 2. D-16 — an exclusive option still deselects
expected: selecting "None of the above" disables the other options but stays clickable itself;
clicking it again clears the answer and re-enables the others
result: **PASS**.
- "None" checked → the other four eye options `disabled: true`, the exclusive box itself
  `disabled: false`
- clicked again → all five unchecked, all five re-enabled, Next disabled
- a real option could then be selected normally

### 3. D-03 — the medication list survives a taking_meds toggle
expected: type into the medication list, switch to "no" (fields hide), switch back to "yes" — the
typed text is still there
result: **PASS**. `preserved: true`. Typed `Cetirizine 10mg daily`; after yes→no→yes the textarea
still contained it verbatim. Both `med_list` and `med_control` correctly disappeared on "no" and
returned on "yes", confirming `showIf` drives visibility.

This is the fix for a live data-loss defect: `handleAnswerChange` previously deleted the patient's
typed medication list on a mis-click, with no undo.

### 4. D-10 — a static info block renders inside a quiz part
expected: an info block placed in a quiz part renders (heading, paragraphs, bullets), collects no
answer, and respects `showIf`
result: **FAILED, then fixed.** With two info-block fixtures injected into `QUIZ_PARTS[0]`, the
renderer's `items` prop contained **only the three questions** — both info blocks were stripped
before reaching it. Root cause: `QuizContainer.tsx` filtered `item.kind === "question"` before
passing items to `QuizPartRenderer`. This failed **Phase 2 Success Criterion 3** outright.

`QuizPartRenderer` was never at fault — it already had `InfoBlockCard` and branched on
`item.kind === "info"`, and `isPartComplete` already skipped non-questions. The container filter
was the only broken link.

Fixed by extracting `itemsForPart(parts, index)` into `app/lib/quiz/schema.ts` and removing the
filter, with a pure unit test proving an info block survives selection and a source-text guard
preventing the filter's return. Both tests were observed FAILING against the pre-fix code first.

## Defects found and closed

| # | Defect | Severity | Status |
|---|--------|----------|--------|
| 1 | `public/quiz-bundle.js` never rebuilt — Phase 2 would have been invisible on the storefront | High | Closed — rebuilt + freshness guard test added |
| 2 | Info blocks stripped before render — fails Success Criterion 3 | High | Closed — `itemsForPart` extracted, filter removed, 2 tests added |

**Defect 1 detail.** The committed bundle was last built in Phase 1 (`14e13ff`) and still contained
`med_list` ×5, `symptoms_nasal` ×3, and zero `isAnswered`. It is produced by `npm run build:theme`,
a separate vite config — `npm run build` does not touch it. This is a repeat of the session-28
incident. It also invalidated the first UAT pass: the browser was running Phase-1 code, which
produced a false D-06 failure. Caught only because the live React component took a prop named
`questions` while current source passes `items`.

## Residual

- **Check 4 has not been re-run in a browser since the fix.** It is verified by construction: the
  renderer was proven capable of drawing info blocks during the failed run, the filter is proven
  gone (0 occurrences), `itemsForPart` is proven to return info blocks by pure test, and the
  rebuilt bundle contains the info branch. That is strong but it is not the same as watching one
  render. Re-run check 4 in a browser before go-live.
- The remaining coverage limit from `02-VALIDATION.md` still stands: **no test renders
  `QuizContainer`**, so a wiring bug of exactly this class can still pass the whole suite. The two
  new source-text guards narrow it but do not remove it.

## Summary

total: 4
passed: 3
issues: 1 (fixed and re-verified in browser 2026-08-09)
pending: 0
skipped: 0
blocked: 0

## Gaps

None open. Check 4 was re-run in a live browser on 2026-08-09 after the `itemsForPart` fix and
**PASSED** on all four assertions (both blocks reach the renderer; heading/paragraphs/bullets
render; zero inputs inside the info card; `showIf` toggles the conditional block). Fixture reverted
and confirmed absent. Full detail in `02-VERIFICATION.md` under "Human verification closed".

Carried forward, not a gap in this phase: no test renders `QuizContainer`, so wiring bugs of this
class remain invisible to the suite. Phase 3 ships the first real info blocks (HIST-04) and should
budget a browser check.
