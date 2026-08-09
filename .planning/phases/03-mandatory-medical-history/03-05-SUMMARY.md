---
phase: 03-mandatory-medical-history
plan: 05
subsystem: build
tags: [vite, vitest, theme-bundle, staleness-guard, phi]

# Dependency graph
requires:
  - phase: 03-mandatory-medical-history
    provides: "03-01: PART6_MEDICAL_HISTORY (HIST-01..HIST-04) + DIAG-01 in questions.ts; 03-02: getAnswerLabel label map, server PHI field removal; 03-03: QuizContainer.tsx/ResultsDisplay.tsx D-11/D-12 deletions; 03-04: InfoBlockCard visual identity, gate/reveal CSS fusion, DOM test infra"
provides:
  - "Rebuilt public/quiz-bundle.js (185796 -> 186699 bytes) and public/quiz-bundle.css carrying all Phase 3 quiz-source changes from plans 03-01, 03-03, and 03-04"
  - "tests/quiz-bundle-freshness.test.ts extended with 7 new Phase-3-specific assertions (5 presence markers, 2 absence markers), each independently measured 0 against the pre-rebuild bundle and proven to change after rebuild — the pre-existing 3 Phase-2 markers cannot detect Phase 3 staleness on their own"
  - "Full phase-wide absence/presence occurrence audit, recorded below, confirming zero live D-11/D-12/old-Part-6 code paths remain in app/, extensions/, scripts/ and that all Phase 3 markers are present"
  - "Compiled RED-count evidence trail across plans 03-01, 03-03, 03-04"
affects: [03-06, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bundle-freshness markers proven trustworthy by measuring BOTH the pre-rebuild (must be 0) and post-rebuild (must be >=1) occurrence count with SOURCE.split(needle).length - 1, never grep -c, following the existing file's own documented convention"
    - "Absence-audit needles that are legitimately self-referenced by the guard test files that assert their absence (tests/quiz-medical-history-deletion.test.ts, tests/quiz-bundle-freshness.test.ts) are distinguished from live occurrences by re-running the audit restricted to app/, extensions/, scripts/ only — same precedent 03-03 established for `medical_history`"

key-files:
  created: []
  modified:
    - public/quiz-bundle.js
    - public/quiz-bundle.css
    - tests/quiz-bundle-freshness.test.ts

key-decisions:
  - "All five candidate Phase-3 markers (has_pcp, history_comorbidities, pcp_clinic_address, infoBlockCard, \"before beginning SLIT\") survived the 0-before / >=1-after proof — none were discarded. All five were kept as assertions (plan asked for 'at least three'; keeping all five that measured cleanly is a stronger guard, not scope creep)."
  - "Task 2's phase-wide absence audit is reported at two granularities: full repo tree (app/, tests/, extensions/, scripts/) and application-code-only (app/, extensions/, scripts/, excluding tests/). The full-tree numbers are non-zero only inside the guard test files' own prose/needle-construction (tests/quiz-medical-history-deletion.test.ts, tests/quiz-bundle-freshness.test.ts) and two doc-comment historical references to the deleted isOptionDisabledByExclusive helper (app/lib/quiz/schema.ts, app/lib/quiz/schema.test.ts) — the same class of exception 03-03's own SUMMARY established for `medical_history` (9 occurrences, all in that file's own prose). The application-code-only numbers are the ones that matter for 'is the old code actually gone,' and they are all 0 except `rhinitis` = 1, which is natural-language prompt text for DIAG-01 (\"allergic rhinitis, asthma, or eczema\"), not the deleted old-Part-6 option ID."

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, DIAG-01]

# Metrics
duration: 35min (Tasks 1-2; Task 3 outstanding, human checkpoint)
completed: 2026-08-09
---

# Phase 3 Plan 5: Theme Bundle Rebuild + Extended Freshness Guard + Phase Gate Summary

**Rebuilt the committed theme bundle (185796 -> 186699 bytes) to carry three commits' worth of deferred Phase 3 quiz-source changes, extended the staleness guard with 7 new assertions each independently proven to measure 0 before the rebuild, and ran the full phase-wide absence/presence audit — all green. The mandatory human browser verification (Task 3, 8 checks) is outstanding and returned as a checkpoint below.**

## Performance

- **Duration:** ~35 min for Tasks 1-2 (automated)
- **Started:** 2026-08-09T19:22:00Z (approx)
- **Completed (Tasks 1-2):** 2026-08-09T19:26:00Z (approx)
- **Tasks:** 2 of 3 executed (Task 3 is a `checkpoint:human-verify` — outstanding, see below)
- **Files modified:** 3 (public/quiz-bundle.js, public/quiz-bundle.css, tests/quiz-bundle-freshness.test.ts)

## Accomplishments

- **Task 1:** Measured all five candidate Phase-3 markers against the pre-rebuild committed bundle first — all five measured **0**, confirming they are valid staleness markers before touching anything. Ran `npm run build:theme`, which rebuilt `public/quiz-bundle.js` (185796 → 186699 bytes) and `public/quiz-bundle.css`. Re-measured the same five markers against the fresh bundle — all five now measure **≥1** (`has_pcp`=4, `history_comorbidities`=2, `pcp_clinic_address`=1, `infoBlockCard`=15, `"before beginning SLIT"`=1). Added a new `describe` block to `tests/quiz-bundle-freshness.test.ts` with 7 assertions: the 5 presence markers plus 2 absence assertions (`history_personal`, `history_family` — both measured 6 against the pre-rebuild bundle, 0 against the fresh one). The 3 pre-existing Phase-2 assertions are byte-for-byte unmodified.
- **Task 2:** Ran the full phase gate: `npm run typecheck` clean, `npm test` green at **358/27** (up from the 282/23 phase-start baseline and the 351/27 plan-start baseline — the 7 new marker assertions account for the delta), `npm run build` succeeds. A second `npm run build:theme` produced **no** git change to either `public/quiz-bundle.js` or `public/quiz-bundle.css`, confirming the theme build is deterministic. Ran the full phase-wide absence and presence occurrence audits (recorded in full below) — every absence needle is 0 in live application code and every presence needle is ≥1. Compiled the RED-count evidence trail from plans 03-01, 03-03, and 03-04 (below).

## Task Commits

1. **Task 1: Extend the freshness guard with Phase 3 markers, then rebuild the bundle** - `5b4fe94` (feat)
2. **Task 2: Full phase gate** - verification-only, `<files></files>` in the plan, no code changes; results recorded in this SUMMARY

**Plan metadata:** (this commit, pending) `docs: complete 03-05 plan (Tasks 1-2), record Task 3 checkpoint`

## Files Created/Modified

- `public/quiz-bundle.js` — rebuilt via `npm run build:theme`; 185796 → 186699 bytes; now carries HIST-01..05/DIAG-01 content, the `InfoBlockCard` visual identity, and the gate/reveal CSS fusion from plans 03-01/03-03/03-04
- `public/quiz-bundle.css` — rebuilt alongside the JS bundle; 1-line diff (the new `.infoBlockCard*`/`.questionCard__gateParent`/`.questionCard__revealChild` selectors added by 03-04, minus the 4 orphaned `.proceedWarning*` rules it removed)
- `tests/quiz-bundle-freshness.test.ts` — new `describe` block, 7 assertions, each carrying a comment recording both the pre-rebuild and post-rebuild measured counts

## Bundle Sizes

| | Bytes |
|---|---|
| Pre-rebuild (committed at plan start) | 185796 |
| Post-rebuild | 186699 |
| Delta | +903 |

## Chosen Markers — Before/After Counts

| Marker | Pre-rebuild count | Post-rebuild count | Assertion type |
|---|---|---|---|
| `has_pcp` | 0 | 4 | presence, `>= 1` |
| `history_comorbidities` | 0 | 2 | presence, `>= 1` |
| `pcp_clinic_address` | 0 | 1 | presence, `>= 1` |
| `infoBlockCard` | 0 | 15 | presence, `>= 1` |
| `before beginning SLIT` | 0 | 1 | presence, `>= 1` |
| `history_personal` | 6 | 0 | absence, `=== 0` |
| `history_family` | 6 | 0 | absence, `=== 0` |

All five presence-marker candidates from the plan's `<the_central_task>` list survived the proof; none was discarded as minified-away. Counted with `SOURCE.split(needle).length - 1`, never `grep -c`.

## Phase-Wide Absence Audit

Full repo tree (`app/`, `tests/`, `extensions/`, `scripts/`, excluding `migrations/001_create_submissions.sql`):

| Needle | Full-tree count | Application-code-only count (excl. `tests/`) | Notes |
|---|---|---|---|
| `medical_history` | 9 | 0 | All 9 in `tests/quiz-medical-history-deletion.test.ts`'s own prose/doc comments — precedent established in 03-03's own SUMMARY |
| `history_personal` | 4 | 0 | 2 in `tests/quiz-bundle-freshness.test.ts` (this plan's new assertion), 2 in `tests/quiz-medical-history-deletion.test.ts` |
| `history_family` | 4 | 0 | Same as above |
| `personal_history` | 2 | 0 | `tests/quiz-medical-history-deletion.test.ts` prose only |
| `family_history` | 2 | 0 | `tests/quiz-medical-history-deletion.test.ts` prose only |
| `handleProceedWithoutTesting` | 2 | 0 | Guard test prose only |
| `handleConfirmProceedWithoutTesting` | 3 | 0 | Guard test prose only |
| `handleDeclineProceedWithoutTesting` | 2 | 0 | Guard test prose only |
| `showProceedWarning` | 2 | 0 | Guard test prose only |
| `onProceedWithoutTesting` | 3 | 0 | Guard test prose only |
| `isOptionDisabledByExclusive` | 4 | 2 | The 2 application-code hits are doc-comment prose in `app/lib/quiz/schema.ts:224` ("D-13 IS DELIBERATELY GONE...") and `app/lib/quiz/schema.test.ts:636`, both documenting the deletion, not reintroducing the function. Zero executable references. |
| `food_allergies` | 0 | 0 | Old Part 6 option value — fully gone |
| `positive_allergy_test` | 0 | 0 | Old Part 6 option value — fully gone |
| `ed_visits` | 0 | 0 | Old Part 6 option value — fully gone |
| `rhinitis` | 1 | 1 | `app/lib/quiz/questions.ts:248` — natural-language prompt text for DIAG-01 ("allergic rhinitis, asthma, or eczema"), not the deleted old-Part-6 option ID. Not a residual defect. |

**Verdict:** every needle is 0 in live, executable application code. The non-zero full-tree numbers are entirely accounted for by guard-test-file prose that documents what was deleted (the same pattern 03-03 already established and justified for `medical_history`), plus two harmless doc-comment historical notes and one unrelated natural-language occurrence of the word "rhinitis" in a diagnosis prompt.

## Phase-Wide Presence Audit

All ≥ 1 as required:

| Needle | Count |
|---|---|
| `history_comorbidities` | 39 |
| `current_medications` | 16 |
| `has_pcp` | 40 |
| `no_pcp_recommendation` | 11 |
| `diagnosed_allergic_condition` | 12 |
| `getAnswerLabel` | 15 |
| `infoBlockCard` | 18 |
| `itemsForPart` | 26 |
| `handleTestFirst` | 4 |
| `onProceedToPurchase` | 7 |

## Test/Build Evidence

- `npm run typecheck`: clean.
- `npm test`: **358 tests / 27 files passing** (up from 282/23 at phase start; up from 351/27 at this plan's start — the +7 delta is this plan's new marker assertions).
- `npm run build`: succeeds.
- Second `npm run build:theme`: `git status --porcelain public/quiz-bundle.js public/quiz-bundle.css` returns empty — the theme build is deterministic with respect to committed source.

## Compiled RED-Count Evidence Trail (plans 03-01, 03-03, 03-04)

**Plan 03-01:**
- `app/lib/quiz/schema.test.ts` (102 tests when green): entire file fails to even collect against pre-change `questions.ts` — `TypeError: Cannot read properties of undefined (reading 'showIf')` at the `no_pcp_recommendation` fixture lookup.
- `QuizPartRenderer.test.ts` new "Part 6 required-ness" block: 5 of 6 assertions failed against pre-change source (6th passes vacuously, as anticipated).
- `tests/quiz-schema-type-guarantees.test.ts`: new `kind === "info"` assertion fails against pre-change source (0 info blocks existed).
- `scoring.test.ts` DIAG-01 assertion: fails with `TypeError` (property read on `undefined`) against pre-change source.
- `scoring.test.ts` score-parity assertions: pass vacuously against pre-change `questions.ts` (anticipated); proved instead via a scratch variant swapping `ALL_SCORED_QUESTIONS` → `ALL_ITEMS` — all 3 parity assertions failed (0-2 bracket: 2 vs 5; 3-6 bracket: 5 vs 8; 7+ bracket: 9 vs 12).

**Plan 03-02:** `insertSubmission`'s INSERT column list / `VALUES` placeholder list / params array all renumbered from 17 to **15**, verified to agree at exactly 15/15/15.

**Plan 03-03:**
- `QuizContainer.tsx`: **11 of 11** absence assertions failed against pre-change source (`"medical_history"` quoted 0→3, bare 0→3, `PART6_MEDICAL_HISTORY` 0→1, `handleProceedWithoutTesting` 0→1, `handleConfirmProceedWithoutTesting` 0→1, `handleDeclineProceedWithoutTesting` 0→1, `showProceedWarning` 0→2, `history_personal` 0→1, `history_family` 0→1, `personal_history` 0→3, `family_history` 0→3).
- `ResultsDisplay.tsx`: **1 of 1** absence assertion failed (`onProceedWithoutTesting` 0→3).
- All 8 positive-control assertions passed against both pre- and post-change source.

**Plan 03-04:**
- Assertion 1 (HIST-04 info block, session-32 failure shape): **4 of 9** tests failed when a question-only filter was reintroduced.
- Assertion 3 (HIST-01 exclusivity, session-33 failure shape): **1 of 9** failed when the `disabled` binding regression was reintroduced.
- Assertion 4 (HIST-02 reveal): **1 of 9** failed (earlier than the plan's own prediction) when `current_medications`'s `showIf` was swapped from `isAnswered` to `equals: "asthma"` — root cause: `history_comorbidities`'s stored value is always an array, so a strict `equals` comparison against a bare string never matches for any selection.

## Decisions Made

- All five candidate markers kept (see key-decisions above) — stronger guard than the plan's "at least three" floor, no discarded candidates.
- Absence audit reported at two granularities to distinguish guard-test-file self-reference (expected, precedented by 03-03) from genuine live-code residue (none found).

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2. Task 3 (human checkpoint) is being returned to the orchestrator per its own instruction, not skipped or self-approved.

## Issues Encountered

None.

## Known Stubs

None. This plan is a build/test-infrastructure plan — no UI surface, no new data path.

## Threat Flags

None beyond what the plan's own threat register (T-3-14, T-3-15, T-3-16, T-3-01) already covers. No new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced.

## User Setup Required

None — no external service configuration required.

## Outstanding: Task 3 — Human Browser Verification (NOT COMPLETED)

**This task has NOT been performed.** It requires a human (Andrew) driving a real browser against the local dev server. Per the plan's own instruction ("Do NOT deploy, do not proceed to plan 03-06, and do not treat a green suite as a substitute"), it is recorded here as outstanding and returned as a checkpoint to the orchestrator. See the CHECKPOINT REACHED block in this agent's final response for the full 8-check script, exact command to start the dev server, and what a pass looks like for each check.

Until Task 3 is completed and approved:
- Do NOT proceed to plan 03-06 (migration/backup).
- Do NOT proceed to plan 03-07 (deploy).
- Do NOT deploy from this branch.

## Next Phase Readiness

- The committed theme bundle now carries all of Phase 3's quiz-source content; the freshness guard can detect Phase 3 staleness going forward (it could not before this plan).
- Typecheck, full suite, and both builds are green; the theme build is proven deterministic.
- The phase-wide absence and presence audits both pass with recorded counts.
- **Blocked on Task 3** (human browser verification, 8 checks) before plans 03-06/03-07 may proceed.

---
*Phase: 03-mandatory-medical-history*
*Completed (Tasks 1-2): 2026-08-09*
*Task 3 outstanding — see checkpoint*

## Self-Check: PASSED

- FOUND: public/quiz-bundle.js
- FOUND: public/quiz-bundle.css
- FOUND: tests/quiz-bundle-freshness.test.ts
- FOUND: .planning/phases/03-mandatory-medical-history/03-05-SUMMARY.md
- FOUND: 5b4fe94 (Task 1 commit)
- FOUND: 4f532dd (summary commit)
