---
phase: 04-mandatory-allergy-testing
plan: 11
subsystem: database
tags: [postgres, cloud-sql, hipaa, ownership-bounded-query, transaction, migration]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-UPLOAD-DECISIONS.md's ratified constants/architecture (plan 04-10) and app/lib/submissions.ts's ownership-bounded query pattern (Phase 1-3)"
provides:
  - "migrations/004_create_submission_files.sql — additive, insert-only child-table migration, authored and committed alone, zero DDL executed"
  - "app/lib/submission-files.ts — insertSubmissionFiles (transactional), getSubmissionFileForCustomer (ownership-bounded), getSubmissionFileForAdmin, listFilesForSubmission"
  - "The codebase's first client-level pool.connect()/BEGIN/COMMIT/ROLLBACK transaction pattern"
affects: ["04-13 (upload endpoint calls insertSubmissionFiles)", "04-14 (patient file route calls getSubmissionFileForCustomer)", "04-15 (admin file route calls getSubmissionFileForAdmin)", "04-17 (app/lib/pdf.ts calls listFilesForSubmission for embedding)", "04-19 (executes migrations/004 after independently re-verifying all four preconditions)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-level transaction (pool.connect() + BEGIN/COMMIT/ROLLBACK, unconditional client.release() in finally) — new to this codebase, introduced for insertSubmissionFiles's N-row atomic insert"
    - "Ownership-bounded join query (JOIN submissions, constrain by customer_id_shopify OR patient_email AND submission_id) extended from app/lib/submissions.ts to a second, child table"

key-files:
  created:
    - migrations/004_create_submission_files.sql
    - app/lib/submission-files.ts
    - tests/submission-files.test.ts
  modified: []

key-decisions:
  - "Migration authored and committed alone (one file per commit, Phase 3 D-01) — no gcloud sql command run, no SQL statement executed; plan 04-19 owns execution after independently re-verifying backup/deploy-live/row-count/test-data-only preconditions"
  - "submission_access_log's action CHECK widened to include 'file' inside migrations/004 rather than a separate 005 file, since it is the same logical additive change kept to one migration-per-commit"
  - "insertSubmissionFiles loops parameterized single-row INSERT...RETURNING statements inside one transaction (rather than a single multi-row VALUES list) for simplicity and easy per-row RETURNING capture; still atomic via BEGIN/COMMIT/ROLLBACK"
  - "getSubmissionFileForCustomer constrains by fileId, submission_id, AND (customer_id_shopify OR patient_email) — the submission_id constraint is stricter than 04-PATTERNS.md's minimum, closing the case where a valid file id from a different submission is paired with a submission the caller does own"

requirements-completed: []

# Metrics
duration: ~10min
completed: 2026-08-10
---

# Phase 4 Plan 11: submission_files Migration + Ownership-Bounded Data-Access Layer Summary

**Additive, insert-only `submission_files` join-table migration (committed alone, zero DDL executed) plus a four-function data-access layer whose customer-facing reads prove ownership in SQL by joining through `submissions`, and whose multi-row insert is the codebase's first client-level Postgres transaction.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-10T01:02:00Z (approx)
- **Completed:** 2026-08-10T01:05:00Z (approx)
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 3 (all new)

## Accomplishments

- **`migrations/004_create_submission_files.sql`** — `submission_files` table (`id`, `submission_id`
  NOT NULL FK to `submissions(id)`, `storage_object_key`, `original_filename` [PHI-commented],
  `content_type`, `original_content_type`, `size_bytes`, `uploaded_at`), two indexes, and
  `GRANT SELECT, INSERT` only (no `UPDATE`, no `DELETE` — stricter than `001`'s unused `UPDATE`
  grant on `submissions`). Also widens `submission_access_log`'s `action` CHECK to include `'file'`
  in the same file. Header documents the four required preconditions (named backup read back via
  `gcloud sql backups describe`, deploy-before-migrate ordering, pre-migration row count, and the
  `04-CONTEXT.md` test-data-only re-verification) for plan 04-19, which owns execution. **No
  `gcloud sql` command was run and no SQL statement in this file was executed as part of this
  plan.** Committed alone — `git show --stat` for `5a6b3a3` lists exactly one file.
- **`app/lib/submission-files.ts`** — four exported functions:
  - `insertSubmissionFiles(submissionId, files[])`: `pool.connect()` → `BEGIN` → one
    parameterized `INSERT ... RETURNING` per file → `COMMIT`, with `ROLLBACK` in the catch and
    `client.release()` unconditional in `finally`. This is the first client-level transaction
    anywhere in the codebase (every existing function in `app/lib/submissions.ts` calls
    `pool.query` directly).
  - `getSubmissionFileForCustomer({ submissionId, fileId, customer_id_shopify, email })`: joins
    `submission_files` to `submissions` and requires `fileId` + `submission_id` match AND
    (`customer_id_shopify` OR `patient_email`) match — never a bare `WHERE id = $1`.
  - `getSubmissionFileForAdmin(submissionId, fileId)`: no ownership filter (Shopify session auth
    is the gate at the route layer) but still constrained by `submission_id`.
  - `listFilesForSubmission(submissionId)`: `ORDER BY uploaded_at ASC` for stable PDF page order.
  - No update/delete function exists; `app/lib/submissions.ts` was left untouched (the promotion
    caller wiring these two modules together is plan 04-17's scope).
- **`tests/submission-files.test.ts`** — 8 cases, all mocking `app/lib/db`'s `getPool` (no live
  Postgres): BEGIN→INSERT(s)→COMMIT ordering with single `release()` on success; ROLLBACK +
  single `release()` + propagated rejection on failure; no UPDATE/DELETE statement ever issued;
  the ownership boundary asserted on SQL **text** (not just return value) with the exact
  parameter-position array; the "wrong customer" zero-rows case returning plain `null`; the admin
  getter asserted to omit ownership predicates while keeping `submission_id`; `listFilesForSubmission`
  asserted to include `ORDER BY uploaded_at ASC`.
- **Non-vacuity proven by direct mutation, not just claimed.** Temporarily replaced
  `getSubmissionFileForCustomer`'s SQL with a bare `WHERE id = $1` (removing the join and all three
  ownership predicates), re-ran `tests/submission-files.test.ts`, and confirmed both ownership
  assertions failed RED (`expected '...' to contain 'submissions'` and
  `expected false to be true`). Restored the file via `cp` from a pre-mutation backup and confirmed
  `git diff app/lib/submission-files.ts` was empty before re-running the suite green.
- Full suite grew from the 426/28 baseline to **434/29**, typecheck clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author migration 004 (own commit, no DDL executed)** - `5a6b3a3` (feat)
2. **Task 2: Implement the ownership-bounded data-access layer** - `d6505a2` (feat)
3. **Task 3: Integration-test insert and ownership-bounded retrieval** - `d108d8c` (test)

**Plan metadata:** (this commit, pending) `docs: complete 04-11 plan`

## Files Created/Modified

- `migrations/004_create_submission_files.sql` — additive `submission_files` migration; no DDL executed
- `app/lib/submission-files.ts` — four ownership-aware data-access functions
- `tests/submission-files.test.ts` — 8 integration tests covering atomicity, rollback, and the
  ownership boundary at the SQL-text level

## Decisions Made

See `key-decisions` in frontmatter. Summary: migration committed alone per D-01 with execution
deferred to plan 04-19; access-log CHECK widening folded into the same migration file rather than a
separate `005`; the transactional insert uses a per-row parameterized loop inside one `BEGIN`/`COMMIT`
rather than a single multi-row `VALUES` list; the customer-facing getter constrains by `submission_id`
in addition to the plan's minimum ownership predicates, closing a cross-submission file-id pairing gap.

## Deviations from Plan

None — plan executed exactly as written. One verify-script alignment fix was needed while authoring
the migration (exact-substring occurrence checks required precise column-spacing and wording to avoid
a case-insensitive false match between the word "Grants" and the SQL keyword `GRANT`), corrected
in-place before the Task 1 commit — not a deviation from the plan's intent, just iteration on the
file's own prose to satisfy its own verify script.

## Issues Encountered

None. `npm run typecheck`, `npx vitest run tests/submission-files.test.ts`, and the full `npm test`
suite all passed on the first clean run after the wording fix above.

## User Setup Required

None for this plan. No external service was configured and no DDL was executed — `submission_files`
does not exist in `alledrops_quiz_dev` yet. Plan 04-19 will need the named on-demand Cloud SQL backup
and the deploy-live confirmation described in the migration's header before running it.

## Next Phase Readiness

- `app/lib/submission-files.ts` is ready for plan 04-13 (upload endpoint) to call
  `insertSubmissionFiles` and for plans 04-14/04-15 to call the two ownership-bounded getters.
- `migrations/004_create_submission_files.sql` is authored, reviewed, and committed alone; it must
  NOT be run until plan 04-19 independently re-verifies all four preconditions in its header.
- `submissions` remains untouched and insert-only; `submission_files` is confirmed a second,
  separate insert-only table (`SELECT, INSERT` grants only) — no code path and no database grant
  can mutate or delete a file row.
- **Do not mark TEST-04 complete from this plan.** No upload code exists yet (this plan is
  persistence-layer only); this SUMMARY's `requirements-completed` is intentionally empty. Plan
  04-19 owns that bookkeeping per this plan's explicit instruction.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: migrations/004_create_submission_files.sql
- FOUND: app/lib/submission-files.ts
- FOUND: tests/submission-files.test.ts
- FOUND: 5a6b3a3 (Task 1 commit)
- FOUND: d6505a2 (Task 2 commit)
- FOUND: d108d8c (Task 3 commit)
