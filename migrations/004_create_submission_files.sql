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
