-- AlleDrops symptom quiz: submissions table
-- Cloud SQL Postgres (alledrops_quiz_dev). Holds PHI.
-- Run once against alledrops_quiz_dev — Cloud SQL Studio is the easiest path.
--
-- Pre-req: alledrops_app user exists. If GRANTs at the bottom fail, run them
-- as the postgres superuser separately.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS submissions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id_shopify      TEXT,                 -- Shopify customer GID, may be null if unauth
  symptom_profile_id       TEXT NOT NULL UNIQUE, -- public-safe ID (AOD_xxxxx)

  -- Identity (PHI)
  patient_name             TEXT NOT NULL,
  patient_dob              DATE NOT NULL,
  patient_email            TEXT NOT NULL,
  patient_phone            TEXT NOT NULL,
  patient_state            TEXT NOT NULL CHECK (patient_state IN ('tennessee', 'texas')),

  -- Quiz outcome (PHI)
  quiz_score               INTEGER NOT NULL,
  -- See migrations/005_widen_score_bracket_check.sql: the three-value list below is the
  -- original 2026 CHECK, superseded on 2026-08-13 by a widened five-value CHECK. This DDL is
  -- executed history and is left unchanged; do not rely on the constraint as written here.
  score_bracket            TEXT NOT NULL CHECK (score_bracket IN ('0-2', '3-6', '7+')),
  answers_json             JSONB NOT NULL,
  personal_history_json    JSONB,
  family_history_json      JSONB,

  -- Consent record
  consent_version          TEXT,
  consent_accepted_at      TIMESTAMPTZ,
  consent_ip_address       INET,
  consent_user_agent       TEXT,

  -- Audit
  completion_time_seconds  INTEGER,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_customer  ON submissions(customer_id_shopify);
CREATE INDEX IF NOT EXISTS idx_submissions_email     ON submissions(patient_email);
CREATE INDEX IF NOT EXISTS idx_submissions_created   ON submissions(created_at DESC);

-- Privileges. If you created alledrops_app via Cloud SQL Console, it likely already
-- has cloudsqlsuperuser, in which case these are redundant but harmless.
GRANT USAGE ON SCHEMA public TO alledrops_app;
GRANT SELECT, INSERT, UPDATE ON submissions TO alledrops_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alledrops_app;

-- Future migrations: add files to this directory, run in order.
