---
phase: 05-preliminary-score-page
plan: 02
subsystem: ui
tags: [css-modules, scale-bar, legacy-cleanup, accessibility]

# Dependency graph
requires:
  - phase: 05-preliminary-score-page (plan 01)
    provides: getScoreScale() accessor and PROVISIONAL_SCORE_SCALE constant (max=60, three zones)
provides:
  - Retired .quizResults__severity/__severityLabel/__severityValue{,Minimal,Mild,Moderate,Severe} (7 rules total incl. media overrides)
  - Five --quiz-color-tone-* custom properties (low/low-mid/mid/mid-high/high)
  - Full .scaleBar__* class family (axisRow, axisLabel, value, track, zones, zone, marker, legend, legendItem, meaningSection, meaningHeading)
  - Five [data-tone] attribute selectors driving zone background color
  - Attribute-driven current-zone highlight ([data-current="true"])
  - D-06 section-boundary CSS (.scaleBar__meaningSection border-top)
affects: [05-03 (ResultsDisplay.tsx wiring), 05-04 (DOM structural guard test), 05-05 (bundle rebuild)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zone/tone color selected via [data-tone] attribute selector, never a per-value class name"
    - "Current-state highlight via [data-current] attribute, not a modifier class (CSS Modules hashes class names; attributes stay testable under jsdom)"

key-files:
  created: []
  modified:
    - app/styles/quiz.module.css

key-decisions:
  - "Left .quizResults__scoreMax and .quizResults__severityDescription in place — orphaned but out of D-07's locked seven-class deletion list; recorded here for a future cleanup pass, not deleted"
  - "Inserted the new .scaleBar__* family in the exact gap left by the deleted chip block (between .quizResults__scoreMax and .quizResults__severityDescription) so the diff reads as a direct replacement in place"

patterns-established:
  - "Pattern: scale-bar family reuses .quizResults__severity's exact container treatment (background/border-radius/padding) rather than inventing new values"

requirements-completed: [SCORE-03]

# Metrics
duration: 12min
completed: 2026-08-11
---

# Phase 5 Plan 2: Scale-Bar CSS Foundation Summary

**Retired the seven legacy per-bracket severity chip CSS rules, added a five-slot `--quiz-color-tone-*` token palette, and built the full `.scaleBar__*` class family (unclipped track, clipped zones, attribute-driven tone/current-zone signaling, D-06 section boundary) — all while proving the suite and typecheck stay green with `ResultsDisplay.tsx` still referencing the deleted classes.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2/2 completed
- **Files modified:** 1 (`app/styles/quiz.module.css`)

## Accomplishments
- Legacy severity chip CSS (`.quizResults__severity`, `__severityLabel`, `__severityValue` + its four hardcoded tone variants, 7 rules total) is fully deleted, including the orphaned `Moderate` variant.
- Five `--quiz-color-tone-*` tokens exist in `:root`, three reusing existing success/warning/error tokens and two new (`low-mid` lime, `mid-high` reusing the exact retired `#FF5722` hex — zero net-new hex values in that slot).
- The complete `.scaleBar__*` family (12 classes) exists with all five `[data-tone]` selectors shipped up front, so a future 4th/5th zone needs zero new CSS.
- `.scaleBar__track` is proven unclippable at the CSS-source level (no `overflow` declaration between it and `.scaleBar__zones`) — the fix for the marker-clipping regression the UI-SPEC calls out as a blocking finding.
- The current-zone highlight and zone tone are both attribute-driven (`data-tone`, `data-current`), never per-value class names — testable under jsdom despite CSS Modules' hashed class names.
- The D-06 two-axis section boundary (`.scaleBar__meaningSection`'s `border-top`) reuses `.questionCategory__title`'s existing divider treatment verbatim.

## Task Commits

Each task was committed atomically:

1. **Task 1: Retire the seven legacy severity classes and add the five tone tokens** - `f2f615e` (fix)
2. **Task 2: Add the .scaleBar__* class family, the five data-tone selectors, and the D-06 section boundary** - `fe34106` (feat)

_No TDD tasks in this plan — pure CSS Modules edit, verified by source-text assertions plus the existing suite/typecheck._

## Files Created/Modified
- `app/styles/quiz.module.css` - Deleted 7 legacy severity rules (+ 2 media overrides), added 5 tone tokens, added the 12-class `.scaleBar__*` family with 5 `[data-tone]` selectors and the `[data-current]` highlight

## Decisions Made
- Followed the plan's `<interfaces>` section exactly for line-region targeting; no re-derivation of the deletion boundaries was needed since they were measured and provided.
- Kept `.scaleBar__zone` and `.scaleBar__legendItem` free of any `flex` shorthand — confirmed by source-text check — since the proportional spans are data-driven and set inline by the component in plan 05-03, not by CSS.
- Reworded one code comment (originally quoted the literal retired class name `.quizResults__severityValueModerate`) to avoid tripping the plan's own `severityValue` legacy-occurrence assertion while still preserving the intent (documenting that `#FF5722` is reused, not new). No functional change — comment text only.

## Deviations from Plan

None - plan executed exactly as written. (One self-caught comment wording adjustment during Task 1 verification, noted above — not a deviation from the plan's required CSS content, just from an unstated assumption about how the plan's own verification script counts substrings.)

## Issues Encountered
- The Task 1 verification script initially failed because a code comment I added quoted the literal string `.quizResults__severityValueModerate`, which the plan's own "legacy classes gone" assertion (`split('severityValueModerate').length - 1 !== 0`) correctly flagged as a false positive. Reworded the comment to describe the retired class in prose instead of quoting its literal name; re-ran the assertion and it passed. No CSS content changed, only comment prose.

## Measured Verification (per plan's Task 1 acceptance criteria)

**Legacy-class occurrence counts, measured with `split(needle).length - 1` (never `grep -c`):**

| Needle | Before | After |
|---|---|---|
| `severityValueMinimal` | 1 | 0 |
| `severityValueMild` | 1 | 0 |
| `severityValueModerate` | 1 | 0 |
| `severityValueSevere` | 1 | 0 |
| `severityLabel` | 1 | 0 |
| `severityValue` | 4 (label+value+2 tone-variant prefixes) | 0 |
| `--quiz-color-tone-` | 0 | 5 |
| `severityDescription` | 2 | 2 (out-of-scope orphan, survived) |
| `scoreMax` | 2 | 2 (out-of-scope orphan, survived) |

**Suite/typecheck in the transient state (legacy classes deleted, `ResultsDisplay.tsx` not yet updated to plan 05-03):**
- `npm run typecheck` — exit 0, measured after both tasks.
- `npm test` — 48 test files, 696 tests, all passed, measured after both tasks. This confirms CSS Modules returns `undefined` for the now-missing keys rather than throwing, exactly as the plan's threat model (T-5-10) predicted.

**Task 2's structural guards, measured:**
- All twelve `.scaleBar__*` selectors plus `[data-current="true"]` present (≥1 occurrence each).
- All five `[data-tone="..."]` selectors present, including `low-mid` and `mid-high`.
- No `overflow` declaration in the source text between `.scaleBar__track` and `.scaleBar__zones`.
- `.scaleBar__zones` declares both `overflow: hidden` and `border-radius`.
- Neither `.scaleBar__zone` nor `.scaleBar__legendItem` declares a numeric `flex` shorthand.
- No rule in the `.scaleBar__*` family references `--color-button`.

**Diff scope, confirmed via `git diff --stat`:** only `app/styles/quiz.module.css` touched across both commits; no change to `.quizResults__scoreCircle`, `.quizResults__message`, `.quizResults__recommendation`, or `.quizResults__disclaimer`. No `@import` or `url(` added anywhere in either diff.

## Observed Orphans (recorded, not fixed — out of this plan's scope)

Two classes remain unreferenced by `ResultsDisplay.tsx` but were deliberately left in place because neither D-07 nor the UI-SPEC's seven-class deletion list names them:
- `.quizResults__scoreMax` (+ its `@media` override)
- `.quizResults__severityDescription` (+ its `@media` override)

A future cleanup plan can remove these if they remain unreferenced after plan 05-03 lands.

## Known Stubs

None. This plan is CSS-only; no data-flow or rendering stubs were introduced. (`ResultsDisplay.tsx` still renders the old, now-unstyled chip markup until plan 05-03 wires it to the new `.scaleBar__*` classes — this is the plan's explicitly designed, deliberate one-wave transient state, not a stub.)

## Threat Flags

None. No new trust boundary, network endpoint, auth path, or schema change was introduced — this plan is a pure stylesheet edit with zero `@import`/`url()`/remote-asset references, per the plan's own threat model (T-5-07 through T-5-11), all confirmed by diff review.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05-03 can now wire `ResultsDisplay.tsx` to the full `.scaleBar__*` class family and the five `[data-tone]` selectors — every class the UI-SPEC's Component Inventory §2/§3 names exists and is verified present.
- Plan 05-04's DOM structural guard test can rely on `.scaleBar__track` never clipping (verified at the CSS-source level in this plan) and on `.scaleBar__marker` needing to be a sibling of `.scaleBar__zones`, not a descendant, at the component level.
- Plan 05-05's bundle rebuild will pick up this CSS change along with 05-03's component change in a single rebuild, as planned — no rebuild was performed in this plan (correctly deferred).
- No blockers. The transient unstyled-chip state is proven harmless (green suite, green typecheck) and is expected to resolve the moment 05-03 lands.

## Self-Check: PASSED

- FOUND: `app/styles/quiz.module.css` (modified, exists)
- FOUND: commit `f2f615e` (`git log --oneline --all | grep f2f615e` matches)
- FOUND: commit `fe34106` (`git log --oneline --all | grep fe34106` matches)
- FOUND: `.planning/phases/05-preliminary-score-page/05-02-SUMMARY.md` (this file)

---
*Phase: 05-preliminary-score-page*
*Completed: 2026-08-11*
