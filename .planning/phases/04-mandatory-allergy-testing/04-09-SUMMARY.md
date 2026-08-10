---
phase: 04-mandatory-allergy-testing
plan: 09
subsystem: testing
tags: [vite, vitest, theme-bundle, staleness-guard]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-02 (schema markers text_input_short/radio_single question kinds), 04-03 (D-11 interim consent copy), 04-06 (Part 7 allergy-testing data: had_testing, locked option labels), 04-07 (radio_single/text_input_short render branches), 04-08 (consent-first single-path flow, terminal ResultsDisplay, deleted bypass handlers/copy)"
provides:
  - "Rebuilt public/quiz-bundle.js (186764 -> 185946 bytes) carrying all five unblocked-track plans' quiz-source changes"
  - "tests/quiz-bundle-freshness.test.ts extended with 10 new Phase-4-specific assertions (7 presence, 3 absence), each independently measured 0-before/>=1-after (or the reverse) against the pre-rebuild committed bundle"
  - "Proof that npm run build:theme is deterministic (two consecutive builds, byte-identical SHA-256 hashes)"
affects: ["Everything after this plan is gated on Phase 4's three client-side blockers; if Andrew splits Phase 4, plans 04-01 through 04-09 are the shippable set"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bundle-freshness markers proven trustworthy by measuring BOTH the pre-rebuild (must be 0, or nonzero for absence needles) and post-rebuild (inverse) occurrence count with SOURCE.split(needle).length - 1, never grep -c — same convention Phase 2 and Phase 3 established"
    - "Bundle rebuild + freshness-guard extension land in a single commit (precedent: 03-05's 5b4fe94), not one commit per plan task, because the guard's new assertions and the artifact they measure are inseparable — a guard extension without the rebuild it validates, or a rebuild without the guard proving it landed, both leave a window where the artifact and its proof diverge"

key-files:
  created: []
  modified:
    - public/quiz-bundle.js
    - tests/quiz-bundle-freshness.test.ts

key-decisions:
  - "Both tasks (rebuild + guard extension) were committed together as a single commit (f5ed3d3), not two separate task commits, per this plan's own <verification> section (\"git status shows public/quiz-bundle.js modified and staged in the SAME commit as the guard extension\") and the precedent 03-05 established for the identical rebuild-plus-guard shape."
  - "file_multi was measured (OLD:0, NEW:1) but deliberately NOT added as a guard marker, per the plan's explicit instruction — the upload widget it belongs to lands in a future plan (04-16), and pinning it now would make the guard permanently red until that plan ships. text_input_short was used instead for the 04-02 schema marker."

requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-05, TEST-07]

# Metrics
duration: ~20min
completed: 2026-08-10
---

# Phase 4 Plan 9: Theme Bundle Rebuild + Extended Freshness Guard Summary

**Rebuilt the committed theme bundle (186764 -> 185946 bytes, a net decrease since 04-08's deletions outweigh the other four plans' additions) to fold in all five unblocked-track plans' quiz-source changes, extended the staleness guard with 10 new assertions each independently proven to measure 0 (or nonzero, for absence needles) before the rebuild, and proved the theme build deterministic across two consecutive runs — full suite 426/28, typecheck clean, both builds clean.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-10T20:15:00Z (approx)
- **Completed:** 2026-08-10T20:35:00Z (approx)
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Rebuilt `public/quiz-bundle.js` via `npm run build:theme`**, folding in plans 04-02 (schema), 04-03 (consent copy), 04-06 (Part 7 allergy-testing data), 04-07 (render branches), and 04-08 (consent-first flow rewiring + terminal `ResultsDisplay`). Byte size moved 186764 -> 185946 bytes.
- **Proved the theme build deterministic.** Ran `npm run build:theme` twice in a row; both runs produced byte-identical output — SHA-256 `12cab4a52c7d549e4cd9117d89b14e2309b8f97bbf5b274d4bb965fc0faa4f0e`, 185946 bytes both times.
- **Measured every marker in both directions before trusting it.** All seven presence markers (04-02/04-03/04-06/04-07/04-08 content) counted 0 against the pre-change bundle (preserved to scratch before rebuilding) and >=1 against the rebuilt bundle. All three absence markers (deleted D-09/D-10 strings) counted nonzero against the pre-change bundle and exactly 0 against the rebuilt one. Every count used `SOURCE.split(needle).length - 1`, never `grep -c`.
- **Extended `tests/quiz-bundle-freshness.test.ts`** with a new `describe` block: 10 assertions (7 presence, 3 absence-with-fragment-assembled-needles), each carrying a comment recording its measured before/after counts, matching the file's existing per-marker convention. No pre-existing Phase 2/Phase 3 marker was removed or loosened.
- **Confirmed `file_multi`/`testing_files` do not appear in the guard** — deliberately withheld per the plan (upload widget ships in a future plan, 04-16), using `text_input_short` for the 04-02 schema slot instead.
- **Full suite green at 426 tests / 28 files** (up from the 416/28 baseline — the +10 delta is exactly this plan's new marker assertions), typecheck clean, `npm run build` clean.

## Task Commits

Both tasks were committed together as a single commit, per this plan's own `<verification>` requirement (`public/quiz-bundle.js` modified and staged in the SAME commit as the guard extension) and the 03-05 precedent for the identical rebuild-plus-guard shape:

1. **Task 1 (rebuild) + Task 2 (guard extension)** - `f5ed3d3` (feat)

**Plan metadata:** (this commit, pending) `docs: complete 04-09 plan`

## Files Created/Modified

- `public/quiz-bundle.js` — rebuilt via `npm run build:theme`; 186764 -> 185946 bytes; now carries Part 7's questions and locked labels, the `radio_single`/`text_input_short` render branches, the D-11 interim consent copy, and the consent-first single-path flow with the terminal `ResultsDisplay`; the deleted D-09/D-10 strings (`See results`, `Continue to Purchase AlleDrops`, `We recommend proceeding with allergy testing`) are gone
- `tests/quiz-bundle-freshness.test.ts` — new `describe` block, 10 assertions (7 presence + 3 absence), each with a comment recording both the pre-rebuild and post-rebuild measured counts; header note records the rebuild date, byte-size move, and the two-consecutive-builds determinism proof

## Bundle Sizes

| | Bytes | SHA-256 |
|---|---|---|
| Pre-rebuild (committed at plan start) | 186764 | `e6d7a066d9ed68f1eb2763265f2119ac640774c1e624a2e6572e7544f5ea9aac` |
| Post-rebuild (run 1) | 185946 | `12cab4a52c7d549e4cd9117d89b14e2309b8f97bbf5b274d4bb965fc0faa4f0e` |
| Post-rebuild (run 2, determinism check) | 185946 | `12cab4a52c7d549e4cd9117d89b14e2309b8f97bbf5b274d4bb965fc0faa4f0e` |
| Delta | -818 | — |

Determinism: **confirmed** — the two post-rebuild runs produced byte-identical output.

## Chosen Markers — Before/After Counts

Presence markers (contributing plan noted; all counted with `SOURCE.split(needle).length - 1`, never `grep -c`):

| Marker | Contributing plan | Pre-rebuild count | Post-rebuild count | Assertion type |
|---|---|---|---|---|
| `had_testing` | 04-06 | 0 | 6 | presence, `>= 1` |
| `I've already had allergy testing` | 04-06 | 0 | 2 | presence, `>= 1` |
| `radio_single` | 04-07 | 0 | 3 | presence, `>= 1` |
| `text_input_short` | 04-02 / 04-07 | 0 | 4 | presence, `>= 1` |
| `Schedule Allergy Testing` | 04-08 | 0 | 1 | presence, `>= 1` |
| `Your responses have been submitted.` | 04-08 | 0 | 1 | presence, `>= 1` |
| `insurance coverage is not guaranteed` | 04-03 | 0 | 1 | presence, `>= 1` |

Absence markers (fragment-assembled so the guard's own prose cannot self-match):

| Marker | Pre-rebuild count | Post-rebuild count | Assertion type |
|---|---|---|---|
| `See res` + `ults` | 1 | 0 | absence, `=== 0` |
| `Continue to Purchase ` + `AlleDrops` | 1 | 0 | absence, `=== 0` |
| `We recommend proceeding with allergy testing` | 1 | 0 | absence, `=== 0` |

Additional marker measured but deliberately NOT pinned in the guard (per plan instruction — belongs to a not-yet-shipped plan):

| Marker | Pre-rebuild count | Post-rebuild count | Why withheld |
|---|---|---|---|
| `file_multi` | 0 | 1 | Upload widget ships in plan 04-16; pinning now would make the guard permanently red until then |

All seven kept presence markers and all three absence markers survived the 0-before/>=1-after (or reverse) proof required before being trusted, per the plan's `acceptance_criteria`.

## Test/Build Evidence

- `npx vitest run tests/quiz-bundle-freshness.test.ts`: **20/20 passing** (10 pre-existing Phase 2/Phase 3 assertions unmodified + 10 new Phase 4 assertions).
- `npm test`: **426 tests / 28 files passing** (up from 416/28 baseline entering this plan — the +10 delta is exactly this plan's new marker assertions).
- `npm run typecheck`: clean.
- `npm run build`: clean.
- `npm run build:theme` run twice: byte-identical SHA-256 hashes both times — theme build proven deterministic.
- `grep -c "file_multi\|testing_files" tests/quiz-bundle-freshness.test.ts`: 0 occurrences — confirmed withheld per plan instruction.
- `git diff --diff-filter=D --name-only HEAD~1 HEAD`: empty — no unexpected file deletions in the commit.

## Decisions Made

- Both tasks committed together as a single commit (`f5ed3d3`), not two separate task commits, per this plan's own `<verification>` requirement and the 03-05 precedent.
- `file_multi` measured but withheld from the guard (see key-decisions in frontmatter) — `text_input_short` used instead for the 04-02 schema marker slot, which was explicitly offered as an alternative in the plan's `<action>` section ("04-02 (schema) -> `file_multi` or `text_input_short`").

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria were met without needing any auto-fix.

## Issues Encountered

None.

## Known Stubs

None. This plan is a build/test-infrastructure plan — no UI surface, no new data path.

## Threat Flags

None beyond what the plan's own threat register (T-4-33, T-4-34, T-4-35, T-4-36) already covers. No new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced — this plan only rebuilds a committed build artifact and extends a test file.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The committed theme bundle now carries all of the unblocked track's quiz-source content (Part 7, both render branches, the consent-first flow, the terminal results screen, the interim consent copy); the storefront will load current code, not the Phase-1-era artifact that caused the session-32 incident.
- The freshness guard can now detect Phase 4 staleness going forward (it could not before this plan) — 10 new assertions, all independently measured in both directions.
- Full suite (426/28), typecheck, and both builds (`npm run build` and `npm run build:theme`) are all green; the theme build is proven deterministic.
- Per the plan's own success criteria: everything from here forward is blocker-gated. If Andrew later decides to split Phase 4, plans 04-01 through 04-09 are the shippable set.
- No blockers introduced by this plan. Phase 4's three client-side blockers (referenced in the plan's objective) remain open and are out of scope for this plan.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: public/quiz-bundle.js
- FOUND: tests/quiz-bundle-freshness.test.ts
- FOUND: .planning/phases/04-mandatory-allergy-testing/04-09-SUMMARY.md
- FOUND: f5ed3d3 (Task 1+2 combined commit)
