---
phase: 03-mandatory-medical-history
plan: 06
subsystem: db
tags: [postgres, cloud-sql, migration, phi, hipaa, backup]

# Dependency graph
requires:
  - phase: 03-mandatory-medical-history
    provides: "Plan 03-02's app-code half of D-01 — insertSubmission now names exactly 15 columns, no longer writing personal_history_json/family_history_json"
provides:
  - "A named on-demand Cloud SQL backup (ID 1786306233540, SUCCESSFUL) as the restore point for the destructive column drop"
  - "migrations/003_drop_medical_history_legacy_columns.sql — the reviewable DROP COLUMN DDL, committed alone, carrying the backup ID and the deploy-first ordering requirement in its header"
  - "A measured pre-DDL baseline (42 rows, 18 with legacy history data) for plan 03-07 to diff against"
affects: [03-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Destructive-migration commit discipline (D-01/T-3-17): the DDL file is its own commit, never bundled with application changes, so it is reviewable in isolation"
    - "COUNT(*)-only / information_schema-only verification against a PHI table — never SELECT *, never a PHI column, per CLAUDE.md rules 5-6"

key-files:
  created:
    - migrations/003_drop_medical_history_legacy_columns.sql
  modified: []

key-decisions:
  - "Andrew's gcloud auth login (run in his own terminal earlier this session) resolved research's Pitfall 2 non-interactive-reauth blocker before this plan started. The orchestrator verified gcloud sql instances describe succeeded and passed --project=alledrops-quiz explicitly rather than gcloud config set project, per the human-gate note — this session's active gcloud project remained smart-rope-305817 throughout, untouched."
  - "Backup read back via gcloud sql backups list AND gcloud sql backups describe (not trusted from the create command's exit output) — both confirm ID 1786306233540, status SUCCESSFUL, description pre-phase3-drop-medical-history-legacy-columns, matching D-01's non-negotiable requirement."
  - "Pre-DDL COUNT(*) re-measured live via fly ssh console + pg (not reused from RESEARCH.md's snapshot): 42 total rows, 18 with non-null personal_history_json or family_history_json — exact match to the research measurement, confirming the table is unchanged since research."
  - "Migration file follows the 001/002 header convention exactly: no BEGIN/COMMIT wrapper (single ALTER TABLE is implicitly atomic), no GRANT block (DROP COLUMN doesn't change privileges). IF EXISTS on both columns so a re-run is a no-op."

requirements-completed: [HIST-05]

# Metrics
duration: ~15min
completed: 2026-08-09
---

# Phase 3 Plan 6: Pre-Migration Backup + DROP COLUMN Migration File Summary

**Took a named on-demand Cloud SQL backup (ID `1786306233540`, confirmed `SUCCESSFUL`) and authored `migrations/003_drop_medical_history_legacy_columns.sql` as its own reviewable commit — no DDL executed against the database in this plan.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 planned (1 checkpoint:human-action, 1 auto), both completed as 1 commit (Task 1 produces no file changes — it is a backup + evidence-recording step)

## Accomplishments

- **Task 1 — pre-migration backup, taken and verified:**
  - Confirmed Andrew's `gcloud auth login` (run earlier this session) resolved the non-interactive reauth blocker documented in `03-RESEARCH.md` Pitfall 2. `gcloud sql instances describe alledrops-quiz-data --project=alledrops-quiz` returned `state: RUNNABLE` before proceeding.
  - Ran `gcloud sql backups create --instance=alledrops-quiz-data --project=alledrops-quiz --description="pre-phase3-drop-medical-history-legacy-columns"` — completed successfully.
  - **Read the backup back rather than trusting the create command's exit status**, per the plan's explicit instruction: `gcloud sql backups list` and `gcloud sql backups describe 1786306233540` both confirm:
    - **Backup ID:** `1786306233540`
    - **Status:** `SUCCESSFUL`
    - **Description:** `pre-phase3-drop-medical-history-legacy-columns`
    - **Window start / taken at:** `2026-08-09T20:10:33.540Z`
  - Every `gcloud` command in this plan passed `--project=alledrops-quiz` explicitly. `gcloud config set project` was never run — Andrew's active gcloud project (`smart-rope-305817`) was left untouched.
- **Pre-DDL baseline measured** (COUNT(*)-only, no PHI column selected, via `fly ssh console` + a base64-encoded `pg` script against `DATABASE_URL`, `ssl: { rejectUnauthorized: false }`, `require('/app/node_modules/pg')` — not Prisma):
  - `{"total":"42","with_history":"18"}` — an exact match to `03-RESEARCH.md`'s measurement, confirming the table is unchanged since research and giving plan 03-07 a verified before-number.
- **Task 2 — migration file authored and committed alone:**
  - `migrations/003_drop_medical_history_legacy_columns.sql` created, following the `001`/`002` header-comment convention: purpose, run target (`alledrops_quiz_dev` ONLY), the recorded backup ID/status/timestamp verbatim, the hard deploy-first ordering requirement (plan 03-02's app code must be live on Fly first, or every `POST /api/quiz/submit` will fail with `column "personal_history_json" of relation "submissions" does not exist`), and the measured pre-migration state.
  - DDL: single `ALTER TABLE submissions DROP COLUMN IF EXISTS personal_history_json, DROP COLUMN IF EXISTS family_history_json` — no `BEGIN`/`COMMIT` wrapper, no `GRANT` block, matching both existing migration files exactly.
  - Verified before committing: `Backup ID:` line present with the real ID (no `<fill` / `TODO` placeholder), `alledrops_quiz_dev` present, zero `SELECT` statements, both `DROP COLUMN IF EXISTS` clauses present.
  - **Committed alone** — `git show --stat HEAD` lists exactly one file, `migrations/003_drop_medical_history_legacy_columns.sql`, satisfying D-01's non-negotiable "own commit, reviewed on its own" requirement.
- **Post-commit verification that no DDL executed:** re-queried `information_schema.columns` (column names only, no PHI) via the same `fly ssh` + `pg` route — both `personal_history_json` and `family_history_json` confirmed still present on `submissions`. The database is unchanged.
- `npm run typecheck` clean; `npm test` green at **361/27** (unchanged from plan start — this migration file is not compiled or imported by anything).

## Task Commits

1. **Task 1: Interactive gcloud auth and the named pre-migration backup (T-3-02)** — no code commit; evidence recorded above and in this SUMMARY (backup ID `1786306233540`, status `SUCCESSFUL`).
2. **Task 2: Author the migration file and commit it alone** — `84863a0` (feat)

**Plan metadata:** (this commit) `docs: complete 03-06 plan`

## Files Created/Modified

- `migrations/003_drop_medical_history_legacy_columns.sql` — new migration file, NOT executed. Header carries the backup ID, the deploy-first hard prerequisite, and the measured pre-migration row counts.

## Decisions Made

- Andrew's `gcloud auth login` (run in his own terminal, this session, before this plan started) resolved the Pitfall 2 blocker documented in research. This session ran the backup itself rather than waiting for a second human round-trip, per the orchestrator's explicit clearance — every command passed `--project=alledrops-quiz` explicitly rather than mutating Andrew's active gcloud config.
- The backup's status was read back from two independent `gcloud` read commands (`list` and `describe`), not inferred from the `create` command's exit code, per the plan's acceptance criteria ("An exit code is not evidence").
- The pre-DDL `COUNT(*)` was re-measured live in this plan rather than reused from `03-RESEARCH.md`, so plan 03-07 has a baseline taken in the same session as the eventual DDL run rather than a stale research-session number. It matched research exactly (42 / 18), so the "test data only" premise underlying D-01 is unchanged.

## Deviations from Plan

None — plan executed exactly as written. Task 1's `checkpoint:human-action` was cleared by the orchestrator's prior verification that Andrew had already run `gcloud auth login` this session; the executor ran the backup itself per the plan's own stated "either route is acceptable" language, then recorded the read-back evidence exactly as required.

## Issues Encountered

None.

## Verification Evidence

- `gcloud sql instances describe alledrops-quiz-data --project=alledrops-quiz --format="value(name,state)"` → `alledrops-quiz-data RUNNABLE` (confirmed before taking the backup).
- `gcloud sql backups create ...` → completed, backed up.
- `gcloud sql backups list --instance=alledrops-quiz-data --project=alledrops-quiz --limit=3` → top row `1786306233540 2026-08-09T20:10:33.540+00:00 - SUCCESSFUL alledrops-quiz-data`.
- `gcloud sql backups describe 1786306233540 ...` → `1786306233540 SUCCESSFUL pre-phase3-drop-medical-history-legacy-columns 2026-08-09T20:10:33.540Z`.
- Pre-DDL `COUNT(*)` via `fly ssh console` + `pg`: `{"total":"42","with_history":"18"}` — matches `03-RESEARCH.md`'s measurement exactly.
- `git show --stat --oneline HEAD` on the migration commit: exactly one file changed, `migrations/003_drop_medical_history_legacy_columns.sql`.
- Post-commit `information_schema.columns` check (column names only): `{"columns_present":["family_history_json","personal_history_json"]}` — both columns still exist, confirming zero DDL was executed.
- `npm run typecheck` clean; `npm test` → **361 tests / 27 files passing** (unchanged from plan start).
- No PHI value was read, printed, or recorded at any point in this plan — every database query was `COUNT(*)` or `information_schema.columns` (column names only).

## User Setup Required

None beyond the `gcloud auth login` Andrew already completed earlier this session (documented in the plan's `user_setup` frontmatter and cleared by the orchestrator before this plan began).

## Next Phase Readiness

- **Plan 03-07 must NOT run the DDL until plan 03-02's application code (already committed, `insertSubmission` naming 15 columns) is deployed to Fly and confirmed live on served bytes.** This plan changed nothing about that deployment status — it remains plan 03-07's own precondition to verify.
- **Backup ID `1786306233540` (status `SUCCESSFUL`, taken `2026-08-09T20:10:33.540Z`) is the restore point for plan 03-07.** It is recorded in this SUMMARY and in the migration file's own header.
- **Baseline for 03-07's after-count:** 42 total rows, 18 with legacy history data, measured `2026-08-09` in this plan. Plan 03-07 should re-measure immediately before running the DDL rather than trusting this number, per the migration file's own header instruction.
- **No DDL has executed.** Both `personal_history_json` and `family_history_json` are confirmed still present on `submissions` as of this plan's completion.
- No blockers. `npm run typecheck` clean, `npm test` green at 361/27.

---
*Phase: 03-mandatory-medical-history*
*Completed: 2026-08-09*

## Self-Check: PASSED

- FOUND: migrations/003_drop_medical_history_legacy_columns.sql
- FOUND: 84863a0 (Task 2 commit)
