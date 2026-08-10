/**
 * submission_files storage — Cloud SQL Postgres.
 *
 * A SECOND, separate, insert-only table alongside `submissions` (D-08's insert-only posture
 * is preserved, not violated — see migrations/004_create_submission_files.sql). Every
 * customer-facing read proves ownership by joining through `submissions`, exactly like
 * `getSubmissionByIdForCustomer` in ./submissions.ts. There is no update or delete function
 * here, matching the migration's SELECT/INSERT-only grants.
 *
 * PHI note: `original_filename` is PHI (a filename can carry a patient name). Never log it,
 * never log a full row object, and never log a `storage_object_key` alongside a submission id
 * in a way that reconstructs a patient's file inventory in plaintext logs. Log IDs and counts
 * only, matching api.quiz.submit.tsx's `[submit]`-prefixed logging discipline.
 */
import { getPool } from "./db";

export interface SubmissionFileRow {
  id: string;
  submission_id: string;
  storage_object_key: string;
  original_filename: string;
  content_type: string;
  original_content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface NewSubmissionFile {
  storage_object_key: string;
  original_filename: string;
  content_type: string;
  original_content_type: string;
  size_bytes: number;
}

/**
 * Insert N file rows for one submission ATOMICALLY — the codebase's first client-level
 * transaction. Every row lands or none do; the client is always released, success or failure.
 */
export async function insertSubmissionFiles(
  submissionId: string,
  files: NewSubmissionFile[]
): Promise<SubmissionFileRow[]> {
  if (files.length === 0) return [];

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const rows: SubmissionFileRow[] = [];
    for (const file of files) {
      const result = await client.query<SubmissionFileRow>(
        `INSERT INTO submission_files (
           submission_id,
           storage_object_key,
           original_filename,
           content_type,
           original_content_type,
           size_bytes
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, submission_id, storage_object_key, original_filename,
                   content_type, original_content_type, size_bytes, uploaded_at`,
        [
          submissionId,
          file.storage_object_key,
          file.original_filename,
          file.content_type,
          file.original_content_type,
          file.size_bytes,
        ]
      );
      rows.push(result.rows[0]);
    }

    await client.query("COMMIT");
    console.log("[submission-files] inserted", {
      submissionId,
      count: rows.length,
    });
    return rows;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[submission-files] insert failed, rolled back:", {
      submissionId,
      attempted: files.length,
    });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ownership-bounded single-file fetch for the patient surface. Joins through `submissions`
 * and constrains by `customer_id_shopify` OR `patient_email`, exactly like
 * `getSubmissionByIdForCustomer` — never a bare `WHERE id = $1` on submission_files alone.
 * Also constrains `submission_files.submission_id` so a valid file id from a different
 * submission cannot be paired with a submission the caller does own.
 */
export async function getSubmissionFileForCustomer(args: {
  submissionId: string;
  fileId: string;
  customer_id_shopify?: string | null;
  email?: string | null;
}): Promise<SubmissionFileRow | null> {
  const pool = getPool();
  const sql = `
    SELECT sf.id, sf.submission_id, sf.storage_object_key, sf.original_filename,
           sf.content_type, sf.original_content_type, sf.size_bytes, sf.uploaded_at
      FROM submission_files sf
      JOIN submissions s ON s.id = sf.submission_id
     WHERE sf.id = $1
       AND sf.submission_id = $2
       AND (
         ($3::text IS NOT NULL AND s.customer_id_shopify = $3)
         OR
         ($4::text IS NOT NULL AND s.patient_email = $4)
       )
     LIMIT 1
  `;
  const result = await pool.query<SubmissionFileRow>(sql, [
    args.fileId,
    args.submissionId,
    args.customer_id_shopify ?? null,
    args.email ?? null,
  ]);
  return result.rows[0] ?? null;
}

/**
 * Admin fetch — no ownership filter (Shopify session auth is the gate at the route), but
 * still constrained by submission_id so an admin cannot accidentally fetch a file under the
 * wrong submission id.
 */
export async function getSubmissionFileForAdmin(
  submissionId: string,
  fileId: string
): Promise<SubmissionFileRow | null> {
  const pool = getPool();
  const result = await pool.query<SubmissionFileRow>(
    `SELECT id, submission_id, storage_object_key, original_filename,
            content_type, original_content_type, size_bytes, uploaded_at
       FROM submission_files
      WHERE id = $1
        AND submission_id = $2
      LIMIT 1`,
    [fileId, submissionId]
  );
  return result.rows[0] ?? null;
}

/**
 * All file rows for one submission, ordered oldest-first so PDF page order (app/lib/pdf.ts's
 * embedding step) is stable across regenerations.
 */
export async function listFilesForSubmission(
  submissionId: string
): Promise<SubmissionFileRow[]> {
  const pool = getPool();
  const result = await pool.query<SubmissionFileRow>(
    `SELECT id, submission_id, storage_object_key, original_filename,
            content_type, original_content_type, size_bytes, uploaded_at
       FROM submission_files
      WHERE submission_id = $1
      ORDER BY uploaded_at ASC`,
    [submissionId]
  );
  return result.rows;
}
