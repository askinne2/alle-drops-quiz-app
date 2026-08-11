---
phase: 05-preliminary-score-page
plan: 05
subsystem: build
tags: [theme-bundle, build, staleness-guard]
dependency-graph:
  requires:
    - phase: 05-preliminary-score-page (plan 02)
      provides: the .scaleBar__* CSS class family and three --quiz-color-tone-* custom properties in app/styles/quiz.module.css
    - phase: 05-preliminary-score-page (plan 03)
      provides: the rewritten ResultsDisplay.tsx (Preliminary Score title, data-driven scale bar, D-06 meaning section)
  provides:
    - "Rebuilt public/quiz-bundle.js and public/quiz-bundle.css carrying Phase 5's Preliminary Score page to the storefront"
    - "A Phase 5 describe block in tests/quiz-bundle-freshness.test.ts with 10 measured assertions that fail if a future plan changes ResultsDisplay/quiz.module.css without rebuilding"
    - "The Phase 4 confirmation-line marker repointed from a retired needle to a needle SCORE-01 actually shipped"
  affects: [public/quiz-bundle.js, public/quiz-bundle.css, tests/quiz-bundle-freshness.test.ts]
tech-stack:
  added: []
  patterns: ["Measure-before-rebuild admissibility discipline (0-before / >=1-after) for every candidate marker, per this repo's existing convention", "Word-boundary-safe needle narrowing (leading space) to exclude a substring match inside an unrelated identifier (isProvisional)"]
key-files:
  created: []
  modified:
    - public/quiz-bundle.js
    - public/quiz-bundle.css
    - tests/quiz-bundle-freshness.test.ts
decisions:
  - "The four 'scaleBar-family and tone-token' needles the plan's Task 1 instructs measuring against public/quiz-bundle.css are recorded in this SUMMARY as build-correctness evidence only, never as test-file assertions — Task 2 explicitly forbids adding a CSS-file read to tests/quiz-bundle-freshness.test.ts, which reads only the JS bundle (CSS Modules class names already surface there)"
  - "Narrowed the D-04 zero-marker from bare case-sensitive 'Provisional'/'provisional' to leading-space-prefixed variants ' Provisional'/' provisional', because the bare capitalized needle measures 1 against the fresh bundle solely due to the isProvisional boolean property name (esbuild preserves property-access names verbatim) — not because patient-facing text leaked. The space-prefixed needles measured 0 against both the pre- and post-rebuild bundle, confirming the property name is the only source of the substring."
requirements-completed: [SCORE-01, SCORE-02, SCORE-03]
metrics:
  duration: 25min
  completed: 2026-08-11
---

# Phase 5 Plan 05: Theme Bundle Rebuild + Bundle-Freshness Markers Summary

Rebuilt the committed theme bundle (`public/quiz-bundle.js`/`.css`) so the storefront actually
receives Phase 5's Preliminary Score page, proved the build deterministic across two consecutive
runs, repointed the Phase 4 freshness assertion that was about to go red the moment SCORE-01's
retired confirmation sentence left the source, and appended ten newly measured Phase 5 markers —
including a D-04 marker proving the `isProvisional` flag never reaches patient-facing markup — so a
future plan that forgets to rebuild fails a test instead of shipping an invisible no-op.

## What Was Built

- **`public/quiz-bundle.js`** and **`public/quiz-bundle.css`** — rebuilt via `npm run build:theme`,
  folding in plan 05-02's `.scaleBar__*` CSS class family + three `--quiz-color-tone-*` custom
  properties, and plan 05-03's `ResultsDisplay.tsx` rewrite (SCORE-01 header/subtitle, the retired
  chip block replaced by the data-driven scale bar, the D-06 meaning-section wrapper). Not
  hand-edited; committed as pure build output.
- **`tests/quiz-bundle-freshness.test.ts`**:
  1. Repointed the Phase 4 describe block's confirmation-line assertion from the retired needle
     (deleted by SCORE-01) to `"1-2 business days"`, the new Preliminary Score review sentence.
     Same purpose (proving the terminal results screen's confirmation copy is compiled in), same
     `toBeGreaterThanOrEqual(1)` shape, same location inside the Phase 4 describe block. The other
     nine assertions in that describe block are untouched (confirmed via `git diff`, see
     Verification).
  2. Appended a new Phase 5 describe block (10 `it` blocks) covering the five "at minimum" markers
     the plan named, plus a sixth admissible candidate (`data-tone`) and the D-04 zero-marker.

## Baseline Measurement (Task 1) — Fourteen-Needle Before/After Table

All counts produced by `SOURCE.split(needle).length - 1`, never `grep -c` (a line-counting method
that collapses this single-line minified bundle to a count of `1` for any needle present anywhere).

### JS needles (measured against `public/quiz-bundle.js`)

| Needle | Before (201707 bytes) | After (203588 bytes) | Admissible? |
|---|---|---|---|
| `Preliminary Score` | 0 | 1 | ✅ candidate, adopted |
| `1-2 business days` | 0 | 1 | ✅ candidate, adopted |
| `Symptom burden` | 0 | 2 | ✅ candidate, adopted |
| `What this means for you` | 0 | 1 | ✅ candidate, adopted |
| `scaleBar` | 0 | 36 | ✅ candidate, adopted (double-digit as predicted) |
| `data-tone` | 0 | 1 | ✅ candidate, adopted (present as a literal attribute name) |
| `Your Assessment Results` | 1 | 0 | ✅ zero-marker, adopted |
| `Your responses have been submitted.` | 1 | 0 | ✅ zero-marker (used to repoint the Phase 4 assertion, not re-adopted as a Phase 5 marker) |
| `Symptom Score:` | 1 | 0 | ✅ zero-marker, adopted |
| `severityValue` | 12 | 0 | ✅ zero-marker, adopted |

No candidate was rejected — all six positive candidates measured 0-before / ≥1-after on the first
attempt, and all four zero-markers measured nonzero-before / 0-after.

### CSS needles (measured against `public/quiz-bundle.css` — SUMMARY evidence only, NOT test assertions)

Per Task 2's explicit instruction, `tests/quiz-bundle-freshness.test.ts` reads only the JS bundle
(CSS Modules class names already surface there — this is why `scaleBar` above is measured against
the JS file). These four CSS-side measurements exist solely to prove the stylesheet build itself
moved correctly; they are not wired into the test file.

| Needle | Before (51134 bytes) | After (53670 bytes) |
|---|---|---|
| `scaleBar` | 0 | 27 |
| `--quiz-color-tone-low` | 0 | 4 |
| `--quiz-color-tone-mid` | 0 | 4 |
| `--quiz-color-tone-high` | 0 | 2 |

### D-04 provisional-flag needle (measured separately, narrowed per plan instruction)

| Needle | Before | After | Note |
|---|---|---|---|
| `Provisional` (bare, capitalized) | 0 | 1 | Rejected as-is — the 1 is `isProvisional`'s property name, not patient-facing text |
| `provisional` (bare, lowercase) | 0 | 0 | Not the source of the nonzero count above |
| `" Provisional"` (leading space) | 0 | 0 | Adopted — cannot match inside `isProvisional` (no space precedes "Provisional" there) |
| `" provisional"` (leading space) | 0 | 0 | Adopted (case-insensitive companion) |

## Build Determinism

`npm run build:theme` was run twice in a row. Both artifacts' SHA-256 hashes were identical across
both runs:

```
public/quiz-bundle.js:  cc84220deefdb60d6019256ec4510244451c083618941cb38ae71822d1496899
public/quiz-bundle.css: 2866b563377fe339badab7346b9dc210b2a6d35693c9d8bbb8a0f5ff903c4131
```

Byte size deltas: `quiz-bundle.js` 201707 → 203588 bytes (+1881); `quiz-bundle.css` 51134 → 53670
bytes (+2536). Both deltas are fully accounted for by plan 05-02's CSS additions/deletions (five
legacy severity rules deleted; the `.scaleBar__*` family plus three `--quiz-color-tone-*` custom
properties added) and plan 05-03's markup changes (the scale-bar render tree replacing the deleted
chip block) — no environment variable, API call, or patient data was introduced into either artifact.

The plan's exact verify command (`npm run build:theme && shasum ... && npm run build:theme &&
shasum ... && node -e "...freshness assertions..."`) was run and printed `bundle fresh`.

## Repointed Phase 4 Marker

| | Old | New |
|---|---|---|
| Needle | `Your responses have been submitted.` | `1-2 business days` |
| Status | Retired by SCORE-01 (Phase 5 subtitle rewrite) | Ships in the SCORE-01 clinical-review subtitle |
| Location | Phase 4 describe block, line ~177 (pre-change) | Same describe block, same position |
| Purpose | Proves the terminal results screen's confirmation copy is compiled in | Unchanged |

The assertion was repointed, not deleted — it remains the only bundle-level proof that the terminal
results screen's confirmation copy actually ships.

## Task Commits

1. **Task 1: Rebuild and commit both artifacts** — `c62ac1a` (feat)
2. **Task 2: Repoint Phase 4 marker, add Phase 5 marker block** — `83d07fe` (test)

## Verification

- `npm run build:theme` × 2 — byte-identical SHA-256 for both artifacts (quoted above).
- `npx vitest run tests/quiz-bundle-freshness.test.ts` — 47/47 green (up from 37 pre-plan; +10 new
  assertions, comfortably over the plan's "at least 9 new assertions" floor).
- `npm test` — **723 tests / 49 files green** (up from 713/49 in plan 05-04's baseline; +10 matches
  the 10 new `it` blocks — the repointed assertion is not a new test).
- `npm run typecheck` — exit 0.
- `git diff tests/quiz-bundle-freshness.test.ts` — confirms the nine other Phase 4 describe-block
  assertions are byte-identical to their pre-change text; only the one targeted `it` was replaced,
  plus the new Phase 5 block appended at end of file.
- `git status --porcelain public/` (at Task 1 commit time) — only `quiz-bundle.js`/`quiz-bundle.css`
  modified, nothing else under `public/`.
- `npx vitest run tests/quiz-bundle-freshness.test.ts -t "QUIZ_PARTS"` — 5/5 green, confirming the
  Phase 4.1 `QUIZ_PARTS` order guard survived this rebuild.
- `git status --porcelain` (final) — only `.planning/ROADMAP.md` remains modified, which predates
  this plan's execution and is explicitly out of scope (orchestrator-owned; not committed by this
  plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] The plan's own Task 2 acceptance script has an unsatisfiable `grep -c` threshold**

- **Found during:** Task 2 verification, running the plan's exact acceptance `node -e` script.
- **Issue:** The script asserts `s.split('grep -c').length - 1 > 4` must be false. The literal
  string `"grep -c"` already occurred **6 times** in `tests/quiz-bundle-freshness.test.ts` before
  this plan touched the file (in the Phase 2/3/4/4.1/4.2 header comments' documentation of the
  counting-trap convention — comments this plan's action text explicitly forbids editing: "Leave
  the other nine assertions in that describe block untouched"). The threshold of `4` was therefore
  already exceeded pre-plan; no edit consistent with the plan's own instructions could bring the
  count to ≤4 without rewriting prior plans' documentation, which is out of scope.
- **Fix:** Verified my own new content added **zero net new** `grep -c` occurrences (an early draft
  of the new header comment referenced it once; reworded to describe the same trap without the
  literal string, confirmed via `node -e` that the count returned to the pre-existing baseline of
  6). The script's other, semantically load-bearing check — confirming the retired needle string
  is absent from the file — passes cleanly (`s.includes('Your responses have been submitted.')` is
  `false`). This is the check that actually matters (proving the broken Phase 4 needle was removed,
  not merely duplicated); the `grep -c` count threshold is a secondary hygiene check whose numeric
  literal does not account for this file's accumulated history across five prior phases.
- **Files modified:** `tests/quiz-bundle-freshness.test.ts` (net effect: zero new `grep -c`
  mentions added).
- **Commit:** `83d07fe`

No other deviations. Both tasks otherwise executed exactly as the plan specified: the baseline was
measured before rebuilding, the build was proven deterministic before any marker was trusted, no
candidate marker needed rejection/replacement, both artifacts were committed as pure build output
with no hand-edits, and the new describe block's header comment records the rebuild date/command,
both plans folded in, both before/after byte sizes, both SHA-256 hashes, the counting-method
restatement, and the explicit statement that prior-phase markers cannot detect Phase 5 staleness.

## Threat Model Coverage

All six threats this plan's `<threat_model>` assigned `mitigate` are addressed:

- **T-5-25** (silent no-op ship) — mitigated; both artifacts rebuilt in Task 1, ten Phase 5 markers
  added in Task 2 that go red if a future plan forgets to rebuild.
- **T-5-26** (vacuous marker) — mitigated; every adopted marker's 0-before / ≥1-after measurement is
  recorded above and in the test file's own comments; `split().length - 1` used exclusively.
- **T-5-27** (non-deterministic build) — mitigated; two consecutive `build:theme` runs produced
  byte-identical SHA-256 hashes for both artifacts before any marker was trusted.
- **T-5-28** (secret/PHI in a public artifact) — mitigated; both byte deltas are fully accounted for
  by known markup/CSS additions (scale bar render tree, `.scaleBar__*`/tone-token CSS) — no env var,
  API call, or patient data was introduced.
- **T-5-29** (D-04 leaking to patients) — mitigated; the narrowed `" Provisional"`/`" provisional"`
  zero-markers measured 0 against the fresh bundle, confirming `isProvisional`'s property name is
  the only place either substring appears and it never reaches rendered copy.
- **T-5-30** (hand-edited build output) — mitigated; both artifacts are unmodified build output
  (verified via `git diff --stat public/` showing only the rebuild's natural diff, and by never
  running any editor tool against either file).

## Known Stubs

None. Both artifacts are real, deterministic build output from the current source tree; no
placeholder or mock content was introduced.

## Threat Flags

None. This plan rebuilt two existing committed build artifacts and extended an existing test file —
no new network endpoint, auth path, file access pattern, or schema change was introduced.

## Self-Check: PASSED

- FOUND: `public/quiz-bundle.js` (modified, contains "Preliminary Score" — confirmed via the
  Task 1 verify script printing `bundle fresh`)
- FOUND: `public/quiz-bundle.css` (modified)
- FOUND: `tests/quiz-bundle-freshness.test.ts` (modified, 47/47 tests passing)
- FOUND: commit `c62ac1a` (Task 1) — `git log --oneline --all | grep c62ac1a` matches
- FOUND: commit `83d07fe` (Task 2) — `git log --oneline --all | grep 83d07fe` matches

## Next Phase Readiness

- The storefront now actually receives Phase 5's Preliminary Score page — the committed bundle
  contains the retitled header, the data-driven scale bar, and the D-06 meaning section; the
  retired chip and title are confirmed absent.
- Ten new Phase 5 markers stand guard against a future plan changing `ResultsDisplay.tsx` or
  `quiz.module.css` without rebuilding, closing the exact gap that let five prior phases ship this
  same defect class.
- Plan 05-06 (or whichever plan performs the phase's human verification pass) can proceed against a
  storefront bundle that is confirmed fresh, deterministic, and free of the D-04
  provisional-language leak.
- No blockers. Full suite green (723/49), typecheck clean, `.planning/ROADMAP.md`'s pre-existing
  modification is unrelated to this plan and left untouched per this plan's explicit scope
  (orchestrator-owned).

---
*Phase: 05-preliminary-score-page*
*Completed: 2026-08-11*
