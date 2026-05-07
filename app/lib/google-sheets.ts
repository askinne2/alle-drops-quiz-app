/**
 * DEPRECATED — Google Sheets path is removed for HIPAA compliance.
 *
 * PHI is now written exclusively to Cloud SQL Postgres. See:
 *   - app/lib/submissions.ts
 *   - app/lib/db.ts
 *   - migrations/001_create_submissions.sql
 *
 * This file remains as a guardrail: any code path that imports the old
 * function will fail loudly at runtime instead of silently writing PHI
 * to a non-BAA system.
 */

export function submitToGoogleSheets(): never {
  throw new Error(
    "submitToGoogleSheets() has been removed. PHI must be written to Cloud SQL only " +
      "(see app/lib/submissions.ts). This call indicates a regression — fix the caller."
  );
}
