-- migrations/002_create_submission_access_log.sql
-- Records every admin fetch of PHI for HIPAA audit trail.
-- Run in Cloud SQL Studio against alledrops_quiz_dev (and prod when ready).

CREATE TABLE IF NOT EXISTS submission_access_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID        REFERENCES submissions(id),   -- NULL for 'list' actions
  actor_shop     TEXT        NOT NULL,   -- Shopify store domain (from admin session)
  action         TEXT        NOT NULL CHECK (action IN ('list', 'detail', 'pdf')),
  accessed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_log_submission ON submission_access_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessed   ON submission_access_log(accessed_at DESC);

GRANT SELECT, INSERT ON submission_access_log TO alledrops_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alledrops_app;
