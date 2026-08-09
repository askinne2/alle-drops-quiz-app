-- migrations/003_drop_medical_history_legacy_columns.sql
-- Drops the vestigial Part 6 medical-history columns after Phase 3 replaces
-- PART6_MEDICAL_HISTORY wholesale (D-01). Every new medical-history answer now rides
-- answers_json, keyed by question ID (D-02) — nothing replaces these two columns.
--
-- Run in Cloud SQL Studio (or via `fly ssh console` + the `pg` pool) against
-- alledrops_quiz_dev ONLY. Production cutover to AOD's own Google Cloud project has not
-- happened; there is no second database to migrate yet.
--
-- REQUIRED before running: a named on-demand Cloud SQL backup, taken and confirmed
-- SUCCESSFUL via `gcloud sql backups list --instance=alledrops-quiz-data --project=alledrops-quiz`.
--   Backup ID: 1786306233540
--   Taken: 2026-08-09T20:10:33.540Z
--   Description: pre-phase3-drop-medical-history-legacy-columns
--   Status (read back, not assumed from exit code): SUCCESSFUL
--
-- REQUIRED order: the application code that stops writing/reading these two columns
-- (plan 03-02 — insertSubmission now names exactly 15 columns) must be DEPLOYED AND
-- CONFIRMED LIVE on Fly (fly status -a alle-drops-quiz-app, verified against served bytes,
-- not just a green deploy) BEFORE this file runs. Running this first will make every
-- POST /api/quiz/submit fail with:
--   column "personal_history_json" of relation "submissions" does not exist
-- for as long as the old release is still serving.
--
-- Measured pre-migration state (COUNT(*) only, no PHI column selected, 2026-08-09):
--   42 total rows in submissions; 18 rows carry a non-null value in personal_history_json
--   and/or family_history_json. Re-measure immediately before execution rather than
--   trusting this snapshot — do not run this migration without a fresh before-count to
--   compare against the after-count.

ALTER TABLE submissions
  DROP COLUMN IF EXISTS personal_history_json,
  DROP COLUMN IF EXISTS family_history_json;
