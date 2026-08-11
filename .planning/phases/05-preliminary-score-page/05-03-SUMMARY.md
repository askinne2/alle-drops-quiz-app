---
phase: 05-preliminary-score-page
plan: 03
subsystem: ui
tags: [results-display, copy, scale-bar, coupled-tests]
dependency-graph:
  requires:
    - phase: 05-preliminary-score-page (plan 01)
      provides: getScoreScale() accessor and PROVISIONAL_SCORE_SCALE constant (max=60, three zones)
    - phase: 05-preliminary-score-page (plan 02)
      provides: the full .scaleBar__* CSS class family, five [data-tone] selectors, [data-current] highlight, D-06 section-boundary CSS
  provides:
    - "ResultsDisplay retitled to Preliminary Score with the locked 1-2 business day subtitle"
    - "Data-driven scale bar wired to getScoreScale(), rendered inside ResultsDisplay"
    - "D-06 'What this means for you' meaning section wrapping the three unedited recommendation blocks"
    - "Retired Symptom Score chip and all severityValue markup"
  affects: [app/components/quiz/ResultsDisplay.tsx, tests/quiz-testing-bypass-deletion.test.ts, tests/quiz-resume-write-gate.test.ts, tests/quiz-resume-payload-parity.test.ts]
tech-stack:
  added: []
  patterns: ["getScoreScale() called once in component body, never threaded as a prop", "data-tone/data-current attribute-driven styling, zero shared source value with scoreBracket"]
key-files:
  created: []
  modified:
    - app/components/quiz/ResultsDisplay.tsx
    - tests/quiz-testing-bypass-deletion.test.ts
    - tests/quiz-resume-write-gate.test.ts
    - tests/quiz-resume-payload-parity.test.ts
decisions:
  - "Reworded the meaning-section comment to describe the wrapper's border in prose rather than quoting the literal .scaleBar__meaningSection class name, avoiding a false-positive double-count against the plan's own exactly-once occurrence assertion (same trap plan 05-02 hit)"
requirements-completed: [SCORE-01, SCORE-02, SCORE-03]
metrics:
  duration: 35min
  completed: 2026-08-11
---

# Phase 5 Plan 03: ResultsDisplay Rewrite — Preliminary Score, Scale Bar, Meaning Section Summary

Retitled the terminal `ResultsDisplay` to "Preliminary Score" with the locked clinical-review
subtitle, deleted the `Symptom Score` bracket chip outright, rendered a data-driven colour-banded
scale bar (`getScoreScale()`, zone tone independent of `scoreBracket`) with an unclipped marker, and
wrapped the three copy-frozen recommendation blocks under one new "What this means for you" heading
— then repointed the three existing test assertions coupled to the retired copy so the suite stays a
real positive control rather than silently going vacuous.

## What Was Built

- **`app/components/quiz/ResultsDisplay.tsx`** — three changes, in the order the plan specified:
  1. Header copy: `h2` → "Preliminary Score"; subtitle → the locked 1–2 business day sentence.
     `getScoreScale()` is imported from `../../lib/quiz/score-scale` and called exactly once in the
     component body (`const scale = getScoreScale();`), alongside `currentZone` (first zone where
     `score <= zone.upTo`, falling back to the last zone) and `markerPercent` (guarded against a
     zero/negative `scale.max`).
  2. The entire `quizResults__severity` chip block is deleted and replaced by the scale bar: an
     outer `.scaleBar` → `.scaleBar__axisRow` (axis label + `{score} of {max}` readout) →
     `.scaleBar__track` (`role="img"`, self-sufficient `aria-label`) containing two children —
     `.scaleBar__zones` (`aria-hidden="true"`, one `.scaleBar__zone` per config entry with
     `data-tone` and an inline `flex` proportional to its point-span) and, as its **sibling**,
     `.scaleBar__marker` (`aria-hidden="true"`, inline `left` percentage, unclamped) — followed by
     `.scaleBar__legend` (one span per zone, `data-current="true"` on the current zone only). Every
     value in this subtree derives from `score`/`scale` alone; `scoreBracket` never appears inside
     it (D-05).
  3. The three `scoreBracket === "0-2"|"3-6"|"7+"` conditional blocks are reparented — not
     rewritten — into a new `.scaleBar__meaningSection` wrapper, preceded by a single `<p
     className={styles.scaleBar__meaningHeading}>What this means for you</p>` sibling (not a child
     of any of the three branches, not a heading element).
- **`tests/quiz-testing-bypass-deletion.test.ts`** — the subtitle positive control now asserts
  presence of `"1-2 business days"` instead of the retired `"Your responses have been submitted."`,
  with a comment recording the needle's history and unchanged purpose. The five TEST-05
  callback-prop/bypass-copy absence assertions in the same describe block are untouched.
- **`tests/quiz-resume-write-gate.test.ts`** — the post-submit `waitFor` now queries
  `getByText("Preliminary Score")` instead of the retired `"Your Assessment Results"`. The
  `localStorage` assertion that follows is unchanged.
- **`tests/quiz-resume-payload-parity.test.ts`** — the identical query inside
  `submitAndAwaitResults()` is repointed the same way. No other assertion in the file changed.

## Measured Occurrence Counts (per plan's acceptance criteria, `split(needle).length - 1`)

| Needle | Count | Requirement |
|---|---|---|
| `Preliminary Score` | 1 | exactly 1 |
| `1-2 business days` | 1 | exactly 1 |
| `Your Assessment Results` | 0 | 0 |
| `Your responses have been submitted.` | 0 | 0 |
| `Symptom Score:` | 0 | 0 |
| `severityValue` | 0 | 0 |
| `getScoreScale()` | 1 | exactly 1 |
| `role="img"` | 1 | exactly 1 |
| `data-tone` | ≥1 | at least 1 |
| `aria-hidden="true"` | 2 | at least 2 |
| `What this means for you` | 1 | exactly 1 |
| `scaleBar__meaningSection` | 1 | exactly 1 |
| `Your Symptoms Appear Mild and Well-Controlled` | 1 | exactly 1, unchanged |
| `You May Benefit From Seeing an Allergist` | 1 | exactly 1, unchanged |
| `Sublingual Immunotherapy May Significantly Help You` | 1 | exactly 1, unchanged |
| `This assessment is a clinical symptom screening tool.` | 1 | exactly 1, unchanged |
| Source slice `styles.scaleBar}` → `styles.scaleBar__legend`, occurrences of `scoreBracket` | 0 | 0 (D-05 guard) |

`git grep "Your Assessment Results" -- app tests` returns nothing — the retired title is referenced
nowhere in application or test code (only in planning docs, `public/quiz-bundle.js` pending plan
05-05's rebuild, and unrelated repo docs).

## Marker/Zones DOM-Shape Confirmation

Directly confirmed by reading the final component (`ResultsDisplay.tsx:97-143`): `.scaleBar__marker`
is a child of `.scaleBar__track` and a **sibling** of `.scaleBar__zones`, never a descendant of the
clipped zones wrapper. This is the exact structural fix UI-SPEC revision 1 requires to prevent the
marker being sliced into a half-moon at score 0 or score max.

## Task Commits

1. **Task 1: SCORE-01 header copy, chip retirement, scale-bar render** — `16574f9` (feat)
2. **Task 2: D-06 meaning section wrapping the three unedited recommendation blocks** — `eb3e7c8` (feat)
3. **Task 3: Repoint the three coupled test assertions** — `f9c4ad0` (test)

## Verification

- `npm run typecheck` — exit 0, measured after each task.
- `npx vitest run tests/quiz-testing-bypass-deletion.test.ts tests/quiz-resume-write-gate.test.ts tests/quiz-resume-payload-parity.test.ts` — 35/35 green.
- `npm test` — **696 tests / 48 files green** (same count as the pre-plan baseline recorded in
  05-01-SUMMARY.md — this plan repoints existing assertions per its own instruction to add no new
  assertions, so the count is unchanged, well above the 677 floor named in the plan).
- `npm run build` — exit 0 (React Router client + SSR build both succeeded; confirms the new
  `score-scale.ts` import resolves in the full app build, not just the theme bundle).
- `git grep "Your Assessment Results" -- app tests` — no matches.
- `public/quiz-bundle.js`/`.css` were **not** rebuilt in this plan — confirmed via
  `git diff --stat public/quiz-bundle.js public/quiz-bundle.css` (empty) — plan 05-05 owns the
  single rebuild.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Reworded the D-06 wrapper comment to avoid a false-positive double-count**

- **Found during:** Task 2 verification.
- **Issue:** The plan's own Task 2 verification script asserts `scaleBar__meaningSection` occurs
  exactly once in the file. The plan's `<action>` text asked for a comment "recording that the
  border on `.scaleBar__meaningSection` is D-06's two-axes boundary," but writing that class name
  literally into the comment made the needle occur twice (comment + `className`), failing the
  script's own exactly-once assertion — the identical trap plan 05-02's SUMMARY documents hitting
  with a different retired-class comment.
- **Fix:** Reworded the comment to describe the border in prose ("the wrapper's top border") without
  quoting the literal class name. No functional or structural change — comment text only, same
  intent (warning a future refactor not to promote the heading or delete the border).
- **Files modified:** `app/components/quiz/ResultsDisplay.tsx`
- **Commit:** `eb3e7c8`

No other deviations. All three tasks executed exactly as the plan specified: `ResultsDisplayProps`
is byte-identical (verified via `git diff` showing zero prop-interface changes and zero new `on[A-Z]`
identifiers), `getScoreScale()` is called internally exactly once, the three band explanations and
disclaimer paragraph are reparented with zero character changes to their JSX text nodes (confirmed
by `git diff` showing indentation-only changes plus new wrapper lines), and the bar's `data-tone`
shares no source value or helper with the `scoreBracket` recommendation conditional.

## Threat Model Coverage

All six threats this plan's `<threat_model>` assigned `mitigate` are addressed:

- **T-5-12** (bar tone from `scoreBracket`) — mitigated; the source-slice guard confirms zero
  `scoreBracket` references inside the `styles.scaleBar` subtree, and the bar's `data-tone` derives
  solely from `getScoreScale().zones` and `score`.
- **T-5-13** (terminal-component invariant) — mitigated; `ResultsDisplayProps` is unchanged, no
  callback prop was added, and all five pre-existing absence assertions in
  `quiz-testing-bypass-deletion.test.ts` remain green and untouched.
- **T-5-14** (XSS via the ARIA label / readout) — mitigated; the `aria-label` template and the
  score-of-max readout interpolate only `score` (number), `scale.max` (number), and
  `currentZone.label` (a compiled-in string from a five-member union), never patient-supplied text.
  No `dangerouslySetInnerHTML` was added.
- **T-5-15** (PHI in logs) — mitigated; no `console.*` call was added anywhere in this plan's diff.
- **T-5-16** (accessible-name leak of the clinical bracket) — mitigated; the `aria-label` template
  names only the zone's display label (`low`/`mid`/`high` → "Low"/"Moderate"/"High"), never
  `scoreBracket`'s `0-2`/`3-6`/`7+` values.
- **T-5-17** (a green suite proving nothing) — mitigated; all three coupled assertions were
  repointed to the new locked strings rather than deleted, and the `git grep` check confirms the
  retired title is referenced nowhere in `app/` or `tests/`.

T-5-18 (Elevation of Privilege) was `accept`-dispositioned by the plan; no action required, none taken.

## Known Stubs

None. The scale bar renders real, fully-specified data from `getScoreScale()` (a real provisional
constant shipped by plan 05-01, not empty/null/placeholder data), and the meaning section wraps real,
unedited recommendation copy.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or schema change was introduced — this
plan is a pure display-layer rewrite of an already-terminal, already-display-only component, reading
an already-existing internal accessor (`getScoreScale()`, shipped by plan 05-01) and already-existing
CSS classes (shipped by plan 05-02).

## Self-Check: PASSED

- FOUND: `app/components/quiz/ResultsDisplay.tsx` (modified, contains "Preliminary Score" exactly once)
- FOUND: `tests/quiz-testing-bypass-deletion.test.ts` (modified)
- FOUND: `tests/quiz-resume-write-gate.test.ts` (modified)
- FOUND: `tests/quiz-resume-payload-parity.test.ts` (modified)
- FOUND: commit `16574f9` (Task 1)
- FOUND: commit `eb3e7c8` (Task 2)
- FOUND: commit `f9c4ad0` (Task 3)

## Next Phase Readiness

- Plan 05-04 can now write its dedicated DOM structural-guard test against the real rendered markup —
  `.scaleBar__marker`'s parent is `.scaleBar__track`, not `.scaleBar__zones`, exactly as required.
- Plan 05-05's bundle rebuild will pick up this component change (and 05-02's CSS change) together in
  a single rebuild — correctly not performed in this plan.
- No blockers. Full suite green (696/48), typecheck clean, production build green.

---
*Phase: 05-preliminary-score-page*
*Completed: 2026-08-11*
