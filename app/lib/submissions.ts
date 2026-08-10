/**
 * Submissions storage — Cloud SQL Postgres.
 *
 * All PHI for AlleDrops symptom assessments lives in this table.
 * NO PHI may be written to Shopify metafields.
 *
 * Lookups for the Customer Account UI extension can use either
 * customer_id_shopify (preferred) or patient_email (fallback for
 * submissions where Admin API auth was unavailable at submit time).
 */
import { getPool } from "./db";
import type { QuizSubmissionData } from "./quiz-validation";

export interface InsertSubmissionInput extends QuizSubmissionData {
  customer_id_shopify?: string | null;
  consent_ip_address?: string | null;
  consent_user_agent?: string | null;
}

export interface SubmissionRow {
  id: string;
  symptom_profile_id: string;
  created_at: string;
}

export interface SubmissionLedgerEntry {
  id: string;
  symptom_profile_id: string;
  created_at: string;
  patient_state: string;
}

/** Typed full row returned by getSubmissionByIdForCustomer. */
export interface SubmissionFullRow {
  id: string;
  symptom_profile_id: string;
  customer_id_shopify: string | null;
  patient_name: string;
  patient_dob: string;       // DATE returned as string by pg
  patient_email: string;
  patient_phone: string;
  patient_state: string;
  quiz_score: number;
  score_bracket: string;
  answers_json: Record<string, unknown>;
  consent_version: string | null;
  consent_accepted_at: string | null;
  consent_ip_address: string | null;
  consent_user_agent: string | null;
  completion_time_seconds: number | null;
  created_at: string;
}

/** Insert a new symptom assessment submission. Returns id + profile_id + timestamp. */
export async function insertSubmission(
  input: InsertSubmissionInput
): Promise<SubmissionRow> {
  const pool = getPool();
  const sql = `
    INSERT INTO submissions (
      customer_id_shopify,
      symptom_profile_id,
      patient_name,
      patient_dob,
      patient_email,
      patient_phone,
      patient_state,
      quiz_score,
      score_bracket,
      answers_json,
      consent_version,
      consent_accepted_at,
      consent_ip_address,
      consent_user_agent,
      completion_time_seconds
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    RETURNING id, symptom_profile_id, created_at
  `;

  const params = [
    input.customer_id_shopify ?? null,
    input.symptom_profile_id,
    input.name,
    input.dob,
    input.email,
    input.phone,
    input.state,
    input.quiz_score,
    input.score_bracket,
    JSON.stringify(input.answers ?? {}),
    input.consent_version ?? null,
    input.consent_version ? new Date() : null,
    input.consent_ip_address ?? null,
    input.consent_user_agent ?? null,
    input.completion_time ?? null,
  ];

  const result = await pool.query<SubmissionRow>(sql, params);
  return result.rows[0];
}

/** Backfill customer_id_shopify on rows that previously matched only by email. */
export async function backfillCustomerIdByEmail(
  email: string,
  customer_id_shopify: string
): Promise<number> {
  const pool = getPool();
  const sql = `
    UPDATE submissions
       SET customer_id_shopify = $2
     WHERE patient_email = $1
       AND customer_id_shopify IS NULL
  `;
  const result = await pool.query(sql, [email, customer_id_shopify]);
  return result.rowCount ?? 0;
}

/** Ledger view for Customer Account UI extension — non-PHI list of completion records. */
export async function listSubmissionLedger(args: {
  customer_id_shopify?: string | null;
  email?: string | null;
}): Promise<SubmissionLedgerEntry[]> {
  const pool = getPool();
  if (args.customer_id_shopify) {
    const result = await pool.query<SubmissionLedgerEntry>(
      `SELECT id, symptom_profile_id, created_at, patient_state
         FROM submissions
        WHERE customer_id_shopify = $1
        ORDER BY created_at DESC`,
      [args.customer_id_shopify]
    );
    return result.rows;
  }
  if (args.email) {
    const result = await pool.query<SubmissionLedgerEntry>(
      `SELECT id, symptom_profile_id, created_at, patient_state
         FROM submissions
        WHERE patient_email = $1
        ORDER BY created_at DESC`,
      [args.email]
    );
    return result.rows;
  }
  return [];
}

/** Full row for PDF generation. Authorization is the caller's responsibility. */
export async function getSubmissionByIdForCustomer(args: {
  id: string;
  customer_id_shopify?: string | null;
  email?: string | null;
}): Promise<SubmissionFullRow | null> {
  const pool = getPool();
  // Require ID match AND ownership match (either customer_id or email).
  const sql = `
    SELECT *
      FROM submissions
     WHERE id = $1
       AND (
         ($2::text IS NOT NULL AND customer_id_shopify = $2)
         OR
         ($3::text IS NOT NULL AND patient_email = $3)
       )
     LIMIT 1
  `;
  const result = await pool.query<SubmissionFullRow>(sql, [
    args.id,
    args.customer_id_shopify ?? null,
    args.email ?? null,
  ]);
  return result.rows[0] ?? null;
}

// ─── Admin-only helpers ──────────────────────────────────────────────────────

export interface AdminSubmissionListRow {
  id: string;
  symptom_profile_id: string;
  patient_name: string;
  patient_email: string;
  patient_state: string;
  score_bracket: string;
  quiz_score: number;
  created_at: string;
  customer_id_shopify: string | null;
}

export interface AdminSubmissionsPage {
  rows: AdminSubmissionListRow[];
  hasNextPage: boolean;
  cursor: string | null; // base64-encoded offset; pass as ?cursor= for the next page
}

/** Paginated, filterable submission list for provider admin view. No ownership constraint. */
export async function listAdminSubmissions(args: {
  state?: string | null;
  score_bracket?: string | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<AdminSubmissionsPage> {
  const pool = getPool();
  const limit = args.limit ?? 50;
  const offset = args.cursor
    ? parseInt(Buffer.from(args.cursor, 'base64').toString('utf8'), 10)
    : 0;

  const sql = `
    SELECT
      id, symptom_profile_id, patient_name, patient_email,
      patient_state, score_bracket, quiz_score, created_at, customer_id_shopify
    FROM submissions
    WHERE
      ($1::text IS NULL OR patient_state = $1)
      AND ($2::text IS NULL OR score_bracket = $2)
      AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
      AND ($4::timestamptz IS NULL OR created_at <= $4::timestamptz)
      AND ($5::text IS NULL OR (
        patient_name ILIKE '%' || $5 || '%'
        OR patient_email ILIKE '%' || $5 || '%'
        OR symptom_profile_id ILIKE '%' || $5 || '%'
      ))
    ORDER BY created_at DESC
    LIMIT $6 OFFSET $7
  `;

  const result = await pool.query<AdminSubmissionListRow>(sql, [
    args.state ?? null,
    args.score_bracket ?? null,
    args.from ?? null,
    args.to ?? null,
    args.q ?? null,
    limit + 1,   // fetch one extra to detect hasNextPage
    offset,
  ]);

  const hasNextPage = result.rows.length > limit;
  const rows = hasNextPage ? result.rows.slice(0, limit) : result.rows;
  const nextOffset = offset + rows.length;
  const cursor = hasNextPage
    ? Buffer.from(String(nextOffset), 'utf8').toString('base64')
    : null;

  return { rows, hasNextPage, cursor };
}

/** Full row fetch for admin — no ownership constraint. */
export async function getSubmissionByIdForAdmin(
  id: string
): Promise<SubmissionFullRow | null> {
  const pool = getPool();
  const result = await pool.query<SubmissionFullRow>(
    'SELECT * FROM submissions WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] ?? null;
}

/** Write one row to submission_access_log for HIPAA audit trail. Fire-and-forget safe. */
export async function logSubmissionAccess({
  submission_id,
  actor_shop,
  action,
}: {
  submission_id: string | null
  actor_shop: string
  action: 'list' | 'detail' | 'pdf' | 'file'
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO submission_access_log (submission_id, actor_shop, action)
     VALUES ($1, $2, $3)`,
    [submission_id, actor_shop, action]
  );
}
