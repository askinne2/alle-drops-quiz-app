---
phase: 04-mandatory-allergy-testing
plan: 18
subsystem: ui
tags: [preact, customer-account-extension, vite, vitest, theme-bundle, staleness-guard]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-14 (dual JSON/redirect GET /api/me/assessment/:id/files/:fileId with ?token= support), 04-16 (file_multi upload widget + testing_files question), 04-17 (promotion step turning staged uploads into submission_files rows), 04-09 (bundle-freshness guard conventions and the pre-04-18 committed bundle baseline)"
provides:
  - "Per-file download links in the patient-facing quiz-history extension, wired to the existing ?token= convention"
  - "api.me.assessments.tsx ledger response extended with a non-PHI files array (id/filename/sizeBytes) per assessment"
  - "Second and final Phase-4 theme-bundle rebuild — public/quiz-bundle.js now carries the file_multi upload widget"
  - "7 new measured freshness-guard markers proving the upload widget shipped, with file_multi explicitly rejected as unreliable and replaced"
affects: ["04-19 (owns the deploy, the live 10-minute render check of this extension change, and closing TEST-04)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ledger file attachment: listFilesForSubmission is called per already-ownership-scoped entry via Promise.all, not given its own ownership filter — the ownership boundary lives entirely in step 1-3's Bearer verification + listSubmissionLedger scoping, unchanged by this plan"
    - "A presence marker measured nonzero against the pre-rebuild bundle cannot detect staleness and must be replaced, even if the plan's own candidate list names it — file_multi failed this test (schema.ts's switch arm predates the widget) and was swapped for fileUpload__dropzone, a CSS Modules class unique to the widget's actual render branch"
    - "npm run build:theme's CSS output (public/quiz-bundle.css) is committed in the same commit as the .js rebuild, even when a plan's files_modified list only names the .js file — same build invocation, same staleness risk if they diverge"

key-files:
  created: []
  modified:
    - app/routes/api.me.assessments.tsx
    - extensions/quiz-history/src/QuizHistoryBlock.jsx
    - extensions/quiz-history/src/QuizHistoryBlock.js
    - tests/assessments-ledger.test.ts
    - public/quiz-bundle.js
    - public/quiz-bundle.css
    - tests/quiz-bundle-freshness.test.ts

key-decisions:
  - "QuizHistoryBlock.js is orphaned, not a build artifact and not hand-maintained-in-parallel in the sense the plan anticipated: shopify.extension.toml's [[extensions.targeting]] points only at ./src/QuizHistoryBlock.jsx, and dist/quiz-history.metafile.json's build inputs list only the .jsx file. QuizHistoryBlock.js is a leftover from an earlier vanilla-JS rewrite (commit 7b9629d) superseded by the Preact rewrite (c46a240) two commits later. It is updated in parallel anyway, per the plan's 'if hand-maintained, apply the same change to both' instruction, to avoid leaving a stale near-duplicate that could confuse a future reader into thinking it's live."
  - "file_multi (the plan's own first-listed candidate marker) was measured and rejected: SOURCE.split('file_multi').length - 1 counted 1 against the pre-rebuild bundle, not 0, because app/lib/quiz/schema.ts's case \"file_multi\": switch arm (needed for showIf/scoring type-exhaustiveness) was already compiled in as of the 04-09 rebuild — before the widget's UI existed. Replaced with fileUpload__dropzone (a CSS Modules class emitted only by QuizPartRenderer.tsx's file_multi render branch), measured 0 before / 9 after."
  - "public/quiz-bundle.css was committed alongside public/quiz-bundle.js in the same commit despite not being named in the plan's files_modified — npm run build:theme regenerates both from the same vite.theme.config.ts invocation, and the new widget's CSS Modules classes (fileUpload__*) only ship if the .css file moves too. Committing the .js without the matching .css would recreate exactly the artifact-divergence risk this plan's own bundle_rebuild_rules warn about."

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-08-09
---

# Phase 4 Plan 18: Patient File Links + Second Theme Bundle Rebuild Summary

**Per-file download links added to the already-working quiz-history Preact extension (no rebuild, per the CONTEXT.md retraction), and the second/final Phase-4 theme-bundle rebuild folding in plan 04-16's file-upload widget — with `file_multi` measured, found unreliable, and replaced by a marker that actually proves the render branch (not just the schema switch) shipped.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 7

## Accomplishments

- **`app/routes/api.me.assessments.tsx`** — added step 4, a `Promise.all` over `listFilesForSubmission(e.id)` for each already-ownership-scoped ledger entry, and extended the response's `files` field with `{ id, filename, sizeBytes }` per submission. Steps 1-3 (CORS preflight, Bearer extraction/verification, GID-then-email-fallback ledger lookup + backfill) are byte-for-byte unchanged — `git diff` confirms no edits above the new step 4/5 block. A `listFilesForSubmission` rejection returns the route's existing 503 shape, matching the DB-throw path already in place for the ledger lookup itself.
- **`extensions/quiz-history/src/QuizHistoryBlock.jsx`** — added one `<s-link>` per file inside the existing per-assessment `<s-stack>`, pointing at `${FLY_BASE}/api/me/assessment/${a.id}/files/${f.id}?token=${encodeURIComponent(token)}` (the same `?token=` convention the pre-existing PDF link already used, and the exact shape plan 04-14's dual JSON/redirect route was built to support with no fetch-then-navigate rewrite). Renders nothing when `files` is empty — an assessment with no uploads looks identical to before this plan. No data fetching, auth handling, or component structure was touched; only `preact/hooks` is imported, no `react`.
- **`extensions/quiz-history/src/QuizHistoryBlock.js`** — updated in parallel with the same per-file link logic, even though this file is dead code: `shopify.extension.toml`'s `[[extensions.targeting]]` block and `dist/quiz-history.metafile.json`'s build-input list both confirm only `QuizHistoryBlock.jsx` is ever built or loaded. Kept in sync anyway per the plan's explicit "hand-maintained -> apply to both" instruction, and documented here so a future reader doesn't mistake it for the live surface.
- **`tests/assessments-ledger.test.ts`** — extended with two new cases: a `files` array populated end-to-end from a mocked `listFilesForSubmission`, and a 503 response when `listFilesForSubmission` rejects. The five other assertion sites that check the full response body were updated to expect `files: []` (mocked default). 11/11 passing (was 9).
- **`public/quiz-bundle.js`** rebuilt via `npm run build:theme`: 185946 -> 194939 bytes (+8993), now carrying plan 04-16's `file_multi` upload widget end to end (the `testing_files` question, its dropzone, empty/required-empty states, and its `POST /api/quiz/upload` client). `public/quiz-bundle.css` rebuilt and committed in the same commit (the widget's `fileUpload__*` CSS Modules classes). Determinism re-proved with two consecutive `build:theme` runs producing byte-identical output — SHA-256 `2e9bfd714bf191b4c2c067d0b2725cbb2e34569e7ec6ae39f53333d911d08655` both times.
- **`tests/quiz-bundle-freshness.test.ts`** extended with 7 new Phase-4-upload-track assertions, each independently measured against the pre-rebuild bundle (preserved to a scratch file, never overwritten) using `SOURCE.split(needle).length - 1` — never `grep -c`. See the Marker Table below. All 10 pre-existing Phase 2/Phase 3/plan-04-09 assertions still pass unmodified. Full guard file: 27/27 passing (was 20).
- Full suite grew from the 536/36 baseline to **545/36** (+2 ledger cases, +7 bundle markers), typecheck clean, `npm run build` clean, `npm run build:theme` deterministic.

## Task Commits

1. **Task 1: Add per-file download links to the patient ledger** — `066a498` (feat)
2. **Task 2: Rebuild the theme bundle and add measured upload markers** — `e3ff4df` (feat)

**Plan metadata:** (this commit, pending) `docs: complete 04-18 plan`

## Files Created/Modified

- `app/routes/api.me.assessments.tsx` — `files` array attached to each ledger entry; auth/ownership steps unchanged
- `extensions/quiz-history/src/QuizHistoryBlock.jsx` — per-file `<s-link>` added to the live Preact extension
- `extensions/quiz-history/src/QuizHistoryBlock.js` — orphaned dead file, updated in parallel (see key-decisions)
- `tests/assessments-ledger.test.ts` — 2 new cases (files populated, 503 on file-lookup failure), 5 existing body assertions updated for the new `files` field
- `public/quiz-bundle.js` — rebuilt, 185946 -> 194939 bytes
- `public/quiz-bundle.css` — rebuilt alongside it (same `build:theme` invocation)
- `tests/quiz-bundle-freshness.test.ts` — 7 new Phase-4 upload-track markers

## Bundle Sizes

| | Bytes | SHA-256 |
|---|---|---|
| Pre-rebuild (04-09's committed output, at this plan's start) | 185946 | `12cab4a52c7d549e4cd9117d89b14e2309b8f97bbf5b274d4bb965fc0faa4f0e` |
| Post-rebuild (run 1) | 194939 | `2e9bfd714bf191b4c2c067d0b2725cbb2e34569e7ec6ae39f53333d911d08655` |
| Post-rebuild (run 2, determinism check) | 194939 | `2e9bfd714bf191b4c2c067d0b2725cbb2e34569e7ec6ae39f53333d911d08655` |
| Delta | +8993 | — |

Determinism: **confirmed** — the two post-rebuild runs produced byte-identical output (`diff` empty).

## Chosen Markers — Before/After Counts

All counts measured with `SOURCE.split(needle).length - 1` against the pre-rebuild bundle (preserved to a scratch copy before rebuilding, never overwritten) and the fresh rebuild. `grep -c` was not used anywhere in this plan.

| Marker | Pre-rebuild count | Post-rebuild count | Assertion type |
|---|---|---|---|
| `testing_files` | 0 | 1 | presence, `>= 1` |
| `fileUpload__dropzone` | 0 | 9 | presence, `>= 1` |
| `Add files` | 0 | 1 | presence, `>= 1` |
| `No files added yet.` | 0 | 1 | presence, `>= 1` |
| `Add at least one file to continue.` | 0 | 1 | presence, `>= 1` |
| `Upload allergy test results` | 0 | 1 | presence, `>= 1` |
| `/api/quiz/upload` | 0 | 1 | presence, `>= 1` |

### Rejected candidate marker

| Marker | Pre-rebuild count | Post-rebuild count | Why rejected |
|---|---|---|---|
| `file_multi` | **1** | 4 | Nonzero pre-rebuild — `app/lib/quiz/schema.ts`'s `case "file_multi":` switch arm (showIf/scoring type-exhaustiveness) was already compiled into the bundle as of the 04-09 rebuild, before the widget's UI existed. A marker already true before the change it's meant to detect cannot prove staleness, per this plan's own governing rule ("must be replaced"). Replaced with `fileUpload__dropzone`, a CSS Modules class emitted only by the widget's actual render branch in `QuizPartRenderer.tsx`. |

All seven kept markers passed the 0-before/>=1-after proof required before being trusted. Every existing Phase 2, Phase 3, and plan-04-09 marker (10 assertions) still passes unmodified — confirmed by running the full guard file (27/27).

## Test/Build Evidence

- `npx vitest run tests/assessments-ledger.test.ts`: **11/11 passing**.
- `npx vitest run tests/quiz-bundle-freshness.test.ts`: **27/27 passing** (10 pre-existing + 7 new).
- `npm test`: **545 tests / 36 files passing** (up from 536/36 baseline — +9 delta is exactly this plan's new cases: 2 ledger + 7 bundle markers).
- `npm run typecheck`: clean.
- `npm run build`: clean.
- `npm run build:theme` run twice: byte-identical SHA-256 hashes both times.
- `node -e "..."` marker/import check from the plan's Task 1 verify command: `OK` (file link present, no `react` import).
- `git grep -n "from 'react'" extensions/quiz-history/src/`: empty (no matches).
- `git diff --diff-filter=D --name-only HEAD~1 HEAD` on both task commits: empty — no unexpected file deletions.

## Decisions Made

See `key-decisions` in frontmatter. Summary: the ledger's new `files` field is fetched per already-ownership-scoped entry, not given a second ownership check (the boundary lives entirely upstream); `QuizHistoryBlock.js` is confirmed orphaned (not built, not targeted by the extension manifest) but kept in sync anyway per the plan's instruction; `file_multi` was measured and rejected as a staleness marker because it predates the widget in the compiled bundle, and `fileUpload__dropzone` was substituted; `public/quiz-bundle.css` was committed alongside `public/quiz-bundle.js` even though only the `.js` file was named in `files_modified`, because both come from the same `build:theme` invocation and shipping one without the other would recreate the exact artifact-divergence risk this plan exists to prevent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rejected `file_multi` as a freshness-guard marker and replaced it**
- **Found during:** Task 2
- **Issue:** The plan's own candidate marker list named `file_multi`, but measuring it against the pre-rebuild bundle returned 1 occurrence, not 0 — `schema.ts`'s type-exhaustiveness switch arm already contained the string before the widget's UI was ever built (04-09's rebuild). A marker that is nonzero before the change it's supposed to detect provides no staleness signal and would have made the test suite lie about detection power.
- **Fix:** Measured `fileUpload__dropzone` (a CSS Modules class emitted only by the widget's actual render branch) — 0 before, 9 after — and used it instead, per the plan's own explicit rule that an unreliable candidate "must be replaced."
- **Files modified:** `tests/quiz-bundle-freshness.test.ts`
- **Verification:** Both counts re-measured and recorded in the guard's header comment and this SUMMARY; full guard file passes 27/27.
- **Committed in:** `e3ff4df` (Task 2 commit)

**2. [Rule 3 - Blocking] Committed `public/quiz-bundle.css` alongside `public/quiz-bundle.js`**
- **Found during:** Task 2
- **Issue:** `npm run build:theme` regenerates both `quiz-bundle.js` and `quiz-bundle.css` from the same `vite.theme.config.ts` invocation. This plan's `files_modified` frontmatter named only the `.js` file, but the widget's new `fileUpload__*` CSS Modules classes only reach the storefront if the `.css` file moves too — committing the `.js` alone would have shipped an unstyled dropzone, a live variant of the exact "artifact and source diverge" defect this plan's own guardrails warn about.
- **Fix:** Staged and committed `public/quiz-bundle.css` in the same commit as `public/quiz-bundle.js`.
- **Files modified:** `public/quiz-bundle.css`
- **Verification:** `git show --stat e3ff4df` lists both files in one commit.
- **Committed in:** `e3ff4df` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug-class marker rejection, 1 blocking artifact-completeness fix)
**Impact on plan:** Both were necessary for the guard to actually detect staleness and for the rebuilt bundle to render correctly. No scope creep — no files outside the upload-track/ledger/bundle surface were touched.

## Issues Encountered

None beyond the marker-rejection and CSS-artifact items documented above as deviations.

## Known Stubs

None. The ledger's `files` field is wired end-to-end (route -> `listFilesForSubmission` -> real Postgres rows -> JSON body -> rendered `<s-link>`), and the rebuilt bundle carries real, previously-shipped widget source — no placeholder data, no hardcoded empty arrays.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-4-94 through T-4-98, all `mitigate` except T-4-95 `accept`, all implemented/verified as specified):
- T-4-94 (elevation of privilege via the file link) — mitigated server-side in `api.me.assessment.$id.files.$fileId.tsx`, unchanged by this plan.
- T-4-96 (filename in a URL/log line) — verified: the route takes opaque IDs only; `filename` appears solely in the JSON response body and as `<s-link>` text, never in a request path or a `console.log` call in `api.me.assessments.tsx`.
- T-4-97/T-4-98 (stale bundle / vacuous line-counting guard) — mitigated by the seven measured markers and the exclusive use of `SOURCE.split(needle).length - 1`.

## User Setup Required

None — no external service configuration required. No `fly deploy` or `shopify app deploy` was run, per this plan's non-negotiable constraints; both belong to plan 04-19.

## Next Phase Readiness

- All three of D-05's patient-facing retrieval surfaces now exist: admin (`app.quiz-results.tsx`), patient ledger (this plan's `<s-link>` additions), and inline in the clinical PDF (plan 04-15). Plan 04-19's own live-render check is the first time this extension's storefront rendering is actually observed, per this plan's own `<objective>`.
- `public/quiz-bundle.js`/`.css` now carry the full upload track (`file_multi` widget + `testing_files` question) — the storefront will render current source, not a stale artifact, the moment plan 04-19 deploys.
- **Do not mark TEST-04 complete** — `.planning/REQUIREMENTS.md`'s TEST-04 checkbox (line 95) and traceability row (line 263, currently "Pending") are left untouched by this plan's final commit, per this plan's own non-negotiable constraints. Plan 04-19 owns that bookkeeping.
- `submissions` remains INSERT-ONLY; no `reviewed_at`, no `PATCH`, no `UPDATE submissions` was added by this plan.
- Plan 04-19 should independently re-verify (carried over from 04-17-SUMMARY.md, unresolved by this plan and out of its `files_modified` scope): the Fly-runtime GCP credential gap in `app/lib/storage/gcs.ts`, and that `fly secrets deploy` actually applies the staged `GCS_BUCKET_NAME`/`GCS_PROJECT_ID` secrets before any real upload/promote/file-link request reaches the deployed VM.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-09*

## Self-Check: PASSED

- FOUND: app/routes/api.me.assessments.tsx
- FOUND: extensions/quiz-history/src/QuizHistoryBlock.jsx
- FOUND: extensions/quiz-history/src/QuizHistoryBlock.js
- FOUND: tests/assessments-ledger.test.ts
- FOUND: public/quiz-bundle.js
- FOUND: public/quiz-bundle.css
- FOUND: tests/quiz-bundle-freshness.test.ts
- FOUND: .planning/phases/04-mandatory-allergy-testing/04-18-SUMMARY.md
- FOUND: 066a498 (Task 1 commit)
- FOUND: e3ff4df (Task 2 commit)
