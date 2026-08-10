-- migrations/004_create_submission_files.sql
-- Creates submission_files, a SECOND insert-only table (D-08 preserves `submissions` as
-- insert-only; RESEARCH.md Pitfall 2 confirms a separate insert-only child table does not
-- violate that rule). Also widens submission_access_log's action CHECK to include 'file' so
-- file downloads are auditable, in the same commit rather than a separate 005 file.
--
-- This migration is ADDITIVE and NON-DESTRUCTIVE (CREATE TABLE IF NOT EXISTS, CREATE INDEX
-- IF NOT EXISTS, and one ALTER TABLE that widens — never narrows — an existing CHECK
-- constraint). Nothing here drops or rewrites existing data.
--
-- REQUIRED before this file is ever run (plan 04-19's scope, NOT this commit's):
--   1. A NAMED ON-DEMAND Cloud SQL backup must be taken first, and its ID/timestamp/status
--      READ BACK via `gcloud sql backups list --instance=alledrops-quiz-data
--      --project=alledrops-quiz` / `gcloud sql backups describe` — never trusted from a
--      command's exit code alone. Record the backup ID/timestamp/status in this header (or
--      the executing plan's SUMMARY) before proceeding.
--   2. REQUIRED ORDER: the application code that reads and writes submission_files
--      (app/lib/submission-files.ts and its callers) must be DEPLOYED AND INDEPENDENTLY
--      CONFIRMED LIVE on Fly (`fly status -a alle-drops-quiz-app`, verified against served
--      bytes, not just a green deploy) BEFORE this file runs. Phase 3's
--      003_drop_medical_history_legacy_columns.sql used this exact ordering after running DDL
--      before the app code was live hard-failed every INSERT on a missing/mismatched column.
--   3. A pre-migration `SELECT COUNT(*) FROM submissions` must be recorded and re-checked
--      immediately before execution — do not trust a stale snapshot from a prior session.
--   4. Per `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md` `<specifics>`,
--      verbatim: "The `submissions` table is test data only... If a real patient has
--      completed the quiz by the time Phase 4 runs, any migration decision must stop and be
--      re-raised." Re-verify this is still true immediately before running this file. If a
--      real patient has submitted, STOP and re-raise before proceeding.
--
-- Plan 04-19 owns actually executing this file, after independently re-verifying all four
-- preconditions above. This commit (plan 04-11) authors the file only — no `gcloud sql`
-- command and no SQL statement in this file has been executed as part of writing it.
--
-- ============================================================================================
-- EXECUTED 2026-08-10 against alledrops_quiz_dev (session 35), ahead of plan 04-19.
--
-- Precondition status at execution:
--   1. Backup: ID 1786361850289, ON_DEMAND, SUCCESSFUL,
--      description "pre-phase4-create-submission-files". Read back via
--      `gcloud sql backups list`, not trusted from the create command's exit code.
--   2. App-code-live-before-DDL: DEVIATED, deliberately. That precondition exists to prevent
--      Phase 3's failure mode, where a DROP COLUMN ran ahead of the code and would have
--      hard-failed every INSERT. This migration is additive in the opposite direction —
--      CREATE TABLE IF NOT EXISTS, two CREATE INDEX IF NOT EXISTS, and a CHECK that WIDENS
--      from 3 values to 4. Fly v50 never references submission_files, and its existing
--      'list'/'detail'/'pdf' writes remain valid under the widened constraint. Running ahead
--      of the deploy is therefore safe; running behind it is what caused the local
--      "[submission-files] insert failed, rolled back" that prompted this.
--   3. Fresh pre-migration count: 43 rows, re-read immediately before execution (not a
--      snapshot from earlier in the session). 43 after. Unchanged, as expected for additive DDL.
--   4. Test-data-only: confirmed in-session by Andrew — "EVERYTHING IS TEST DATA until i say
--      otherwise."
--
-- Execution deviation from the SQL as written below: the file assumes one role owns
-- everything. `submissions` is owned by alledrops_app and `submission_access_log` by postgres,
-- so no single role can run the whole file. Executed as postgres in ONE transaction, with the
-- CREATE TABLE / indexes / grant under `SET ROLE alledrops_app` (so the new table's owner
-- matches submissions and production's identity), then `RESET ROLE` for the ALTER TABLE.
-- A local-only `GRANT ... TO alledrops_dev` was added outside this file; see
-- docs/local-dev-database.md.
--
-- Verified after commit, by query result rather than exit code: table owner alledrops_app,
-- all 3 indexes present, FK to submissions present, CHECK now ('list','detail','pdf','file'),
-- submissions still 43. Write path proven by an INSERT executed as alledrops_app inside a
-- transaction and rolled back — table confirmed back to 0 rows afterwards.
-- ============================================================================================

CREATE TABLE IF NOT EXISTS submission_files (
  id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID        NOT NULL REFERENCES submissions(id),
                              -- NOT NULL here, unlike submission_access_log's nullable FK:
                              -- every file row belongs to exactly one submission; there is
                              -- no "list action" analog for a file row.
  storage_object_key  TEXT        NOT NULL,  -- permanent GCS key under submissions/
  -- Identity (PHI)
  original_filename  TEXT        NOT NULL,  -- PHI: a filename can carry a patient name.
                              -- Must never be logged (CLAUDE.md rule 5, amended by plan
                              -- 04-01 to name uploaded filenames explicitly).
  content_type  TEXT        NOT NULL,  -- effective type AFTER any HEIC conversion
  original_content_type  TEXT        NOT NULL,  -- sniffed type BEFORE conversion (audit trail)
  size_bytes  INTEGER     NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_uploaded   ON submission_files(uploaded_at DESC);

-- Privileges on submission_files are exactly SELECT, INSERT only. D-08's insert-only posture
-- is stricter here than 001_create_submissions.sql was for `submissions` (that migration also
-- granted the mutate-capable privilege even though nothing uses it) — deliberately do not
-- copy that unused, broader privilege forward onto this table.
GRANT SELECT, INSERT ON submission_files TO alledrops_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alledrops_app;

-- Widen submission_access_log's action CHECK constraint to include 'file' so file downloads
-- (patient and admin retrieval routes, plans 04-14/04-15) are auditable. Same logical change
-- as the table above, kept in this single migration-per-commit file rather than a separate 005.
ALTER TABLE submission_access_log DROP CONSTRAINT IF EXISTS submission_access_log_action_check;
ALTER TABLE submission_access_log
  ADD CONSTRAINT submission_access_log_action_check
  CHECK (action IN ('list', 'detail', 'pdf', 'file'));
