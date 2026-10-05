/**
 * E2E Bracket Test Suite (LAUNCH-04 evidence script for Cloud Run)
 *
 * Proves the full pipeline against a deployed Cloud Run service:
 *   upload -> submit -> DB row -> ledger -> PDF -> GCS signed-URL byte round trip -> cleanup.
 * Also checks that a forged X-Forwarded-For is not what lands in consent_ip_address, and that
 * PDF responses are streamed (no Content-Length). Cleanup deletes every test row child-first and
 * asserts zero remain.
 *
 * All data is synthetic (e2e+*@example.com). Real patient submissions wait on LAUNCH-05.
 *
 * Usage:
 *   cloud-sql-proxy --port 5436 aod-production-510006:us-east1:aod-quiz-db
 *   BASE_URL=https://alle-drops-quiz-app-502519175239.us-east1.run.app \
 *     DATABASE_URL="postgresql://postgres:<owner-password>@127.0.0.1:5436/alledrops_quiz?sslmode=disable" \
 *     SHOPIFY_API_SECRET=... npx tsx scripts/e2e-test.ts
 *
 * DATABASE_URL must be the DB owner role (postgres) - cleanup needs DELETE, which the runtime
 * role alledrops_app does not have. The password lives in Secret Manager (quiz-db-owner-password).
 *
 * Required env (from .env or process.env):
 *   BASE_URL             - explicit target, no default (refuses to guess a deployment)
 *   DATABASE_URL         - owner-role Postgres connection string (via the proxy)
 *   SHOPIFY_API_SECRET   - used to sign customer JWT tokens
 *
 * Optional env:
 *   SHOPIFY_API_KEY      - used as JWT audience claim (set if the service has this secret)
 *
 * Output logs IDs and counts only - never names, emails, filenames, tokens or signed URLs.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL || '';
const FORGED_XFF = '203.0.113.77';
// 1x1 transparent PNG (synthetic test file).
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const timestamp = Date.now();

// Unique fake customer GID per run — stamped via UPDATE after INSERT so JWT lookups work.
const FAKE_CUSTOMER_ID = `gid://shopify/Customer/E2ETEST${timestamp}`;
const NOW = new Date().toISOString();

// ─── Test cases ──────────────────────────────────────────────────────────────

const TEST_CASES = [
  {
    label: 'E2E-LOW-TN (0-2, Tennessee)',
    payload: {
      state: 'tennessee' as const,
      name: 'E2E Test Low',
      dob: '1990-01-15',
      email: 'e2e+low@example.com',
      phone: '6155550001',
      symptom_profile_id: `E2E-LOW-TN-${timestamp}`,
      quiz_score: 1,
      score_bracket: '0-2' as const,
      quiz_date: NOW,
      answers: { sneezing: 'rarely', eye_itching: 'never' },
      completion_time: 60,
      consent_version: 'draft-2026-05-09',
    },
    expectedBracket: '0-2',
    expectedState: 'tennessee',
  },
  {
    label: 'E2E-MOD-TX (3-8, Texas)',
    payload: {
      state: 'texas' as const,
      name: 'E2E Test Moderate',
      dob: '1985-03-10',
      email: 'e2e+mod@example.com',
      phone: '5125550002',
      symptom_profile_id: `E2E-MOD-TX-${timestamp}`,
      quiz_score: 5,
      score_bracket: '3-8' as const,
      quiz_date: NOW,
      answers: { sneezing: 'sometimes', eye_itching: 'often' },
      completion_time: 90,
      consent_version: 'draft-2026-05-09',
    },
    expectedBracket: '3-8',
    expectedState: 'texas',
  },
  {
    label: 'E2E-HIGH-TN (9+, Tennessee, with history)',
    payload: {
      state: 'tennessee' as const,
      name: 'E2E Test High',
      dob: '1985-06-20',
      email: 'e2e+high@example.com',
      phone: '6155550003',
      symptom_profile_id: `E2E-HIGH-TN-${timestamp}`,
      quiz_score: 9,
      score_bracket: '9+' as const,
      quiz_date: NOW,
      answers: { sneezing: 'daily', eye_itching: 'often', nasal_congestion: 'daily' },
      completion_time: 180,
      consent_version: 'draft-2026-05-09',
    },
    expectedBracket: '9+',
    expectedState: 'tennessee',
  },
] as const;

const FILE_CASE_INDEX = 2; // the HIGH case carries the uploaded file

const TEST_PROFILE_IDS = TEST_CASES.map((tc) => tc.payload.symptom_profile_id);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg: string): never {
  console.error(`  ✗ FAIL: ${msg}`);
  process.exit(1);
}

async function createCustomerJwt(): Promise<string> {
  const secret = process.env.SHOPIFY_API_SECRET!;
  const key = new TextEncoder().encode(secret);
  let builder = new SignJWT({ sub: FAKE_CUSTOMER_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h');
  if (process.env.SHOPIFY_API_KEY) {
    builder = builder.setAudience(process.env.SHOPIFY_API_KEY);
  }
  return builder.sign(key);
}

// ─── Step 0: upload a synthetic file ─────────────────────────────────────────

interface UploadResult {
  token: string;
  sizeBytes: number;
}

async function step0_upload(): Promise<UploadResult> {
  console.log('\nStep 0: Upload synthetic file');
  const form = new FormData();
  form.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'e2e-synthetic.png');

  const resp = await fetch(`${BASE_URL}/api/quiz/upload`, { method: 'POST', body: form });
  if (resp.status !== 200) {
    fail(`POST /api/quiz/upload returned ${resp.status}`);
  }
  const json = (await resp.json()) as { token?: string; sizeBytes?: number };
  if (!json.token) fail('upload response missing token');
  if (typeof json.sizeBytes !== 'number') fail('upload response missing sizeBytes');
  pass(`staged upload sizeBytes=${json.sizeBytes}`);
  return { token: json.token!, sizeBytes: json.sizeBytes! };
}

// ─── Step 1: POST all 3 submissions ──────────────────────────────────────────

interface SubmitResult {
  id: string;
  symptom_profile_id: string;
}

async function step1_postSubmissions(upload: UploadResult): Promise<SubmitResult[]> {
  console.log('\nStep 1: POST submissions');
  const results: SubmitResult[] = [];

  for (const [i, tc] of TEST_CASES.entries()) {
    const payload =
      i === FILE_CASE_INDEX
        ? { ...tc.payload, answers: { ...tc.payload.answers, testing_files: [upload.token] } }
        : tc.payload;
    const resp = await fetch(`${BASE_URL}/api/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': FORGED_XFF },
      body: JSON.stringify(payload),
    });

    if (resp.status !== 200) {
      // Status only: the error body could echo submitted fields.
      fail(`[${tc.label}] POST returned ${resp.status}`);
    }

    const json = (await resp.json()) as {
      submission_id?: string;
      symptom_profile_id?: string;
    };

    if (!json.submission_id) fail(`[${tc.label}] response missing submission_id`);
    if (!json.symptom_profile_id) fail(`[${tc.label}] response missing symptom_profile_id`);

    pass(`[${tc.label}] → id=${json.submission_id!}`);
    results.push({ id: json.submission_id!, symptom_profile_id: json.symptom_profile_id! });
  }

  return results;
}

// ─── Step 2: DB verify + stamp customer_id ────────────────────────────────────

interface DbRow {
  id: string;
  symptom_profile_id: string;
  score_bracket: string;
  patient_state: string;
  consent_version: string | null;
  answers_json: Record<string, unknown> | null;
  consent_ip: string | null;
}

async function step2_dbVerify(pool: Pool): Promise<void> {
  console.log('\nStep 2: DB row verification');

  const { rows } = await pool.query<DbRow>(
    `SELECT id, symptom_profile_id, score_bracket, patient_state, consent_version,
            answers_json, host(consent_ip_address) AS consent_ip
       FROM submissions
      WHERE symptom_profile_id = ANY($1::text[])`,
    [TEST_PROFILE_IDS],
  );

  if (rows.length !== 3) {
    fail(`Expected 3 rows in DB, found ${rows.length}. Check that test emails are not already used.`);
  }

  for (const tc of TEST_CASES) {
    const row = rows.find((r) => r.symptom_profile_id === tc.payload.symptom_profile_id);
    if (!row) fail(`No DB row for symptom_profile_id=${tc.payload.symptom_profile_id}`);
    const r = row!;

    if (r.score_bracket !== tc.expectedBracket) {
      fail(`[${tc.label}] score_bracket: expected ${tc.expectedBracket}, got ${r.score_bracket}`);
    }
    if (r.patient_state !== tc.expectedState) {
      fail(`[${tc.label}] patient_state: expected ${tc.expectedState}, got ${r.patient_state}`);
    }
    if (r.consent_version !== 'draft-2026-05-09') {
      fail(`[${tc.label}] consent_version: expected draft-2026-05-09, got ${String(r.consent_version)}`);
    }
    if (!r.answers_json || typeof r.answers_json !== 'object') {
      fail(`[${tc.label}] answers_json is null or not an object`);
    }

    if (r.consent_ip === FORGED_XFF) {
      fail(`[${tc.label}] consent_ip_address equals the forged X-Forwarded-For value`);
    }

    pass(
      `[${tc.label}] bracket=${r.score_bracket} state=${r.patient_state} consent=${r.consent_version}`,
    );
  }

  pass(`consent_ip_address is not the forged X-Forwarded-For value (${rows.length} rows checked)`);

  // Stamp fake customer_id so JWT-based ledger + PDF lookups can resolve ownership.
  await pool.query(
    `UPDATE submissions SET customer_id_shopify = $1 WHERE symptom_profile_id = ANY($2::text[])`,
    [FAKE_CUSTOMER_ID, TEST_PROFILE_IDS],
  );
  pass(`Stamped customer_id_shopify=${FAKE_CUSTOMER_ID}`);
}

// ─── Step 3: Ledger verify ───────────────────────────────────────────────────

async function step3_ledgerVerify(ids: SubmitResult[]): Promise<string> {
  console.log('\nStep 3: Customer ledger verification');

  const token = await createCustomerJwt();
  const resp = await fetch(`${BASE_URL}/api/me/assessments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status !== 200) {
    fail(`GET /api/me/assessments returned ${resp.status}`);
  }

  const ledger = (await resp.json()) as { id: string; files?: { id: string }[] }[];
  const ledgerIds = new Set(ledger.map((e) => e.id));

  for (const { id } of ids) {
    if (!ledgerIds.has(id)) {
      fail(`id=${id} not found in customer ledger`);
    }
    pass(`id=${id} appears in ledger`);
  }

  const fileEntry = ledger.find((e) => e.id === ids[FILE_CASE_INDEX].id);
  const fileId = fileEntry?.files?.[0]?.id;
  if (!fileId) fail('file-bearing submission has no files[0].id in ledger');
  pass('ledger lists the promoted file');
  return fileId!;
}

// ─── Step 4: PDF verify ──────────────────────────────────────────────────────

async function step4_pdfVerify(ids: SubmitResult[]): Promise<void> {
  console.log('\nStep 4: PDF verification');

  const token = await createCustomerJwt();

  for (const { id } of ids) {
    const resp = await fetch(`${BASE_URL}/api/me/assessment/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.status !== 200) {
      fail(`GET /api/me/assessment/${id}/pdf returned ${resp.status}`);
    }

    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('application/pdf')) {
      fail(`id=${id}: Content-Type is "${contentType}", expected application/pdf`);
    }

    if (resp.headers.get('content-length') !== null) {
      fail(`id=${id}: PDF response carries Content-Length, expected chunked streaming`);
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 4 || buf.slice(0, 4).toString('ascii') !== '%PDF') {
      fail(`id=${id}: body does not start with %PDF`);
    }

    pass(`id=${id} → ${buf.length} bytes, starts %PDF`);
  }
}

// ─── Step 4b: GCS signed-URL byte round trip ─────────────────────────────────

async function step4b_fileRoundTrip(
  submissionId: string,
  fileId: string,
  upload: UploadResult,
): Promise<void> {
  console.log('\nStep 4b: GCS signed-URL round trip');

  const token = await createCustomerJwt();
  const resp = await fetch(`${BASE_URL}/api/me/assessment/${submissionId}/files/${fileId}?as=json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status !== 200) {
    fail(`file URL route returned ${resp.status}`);
  }
  const json = (await resp.json()) as { url?: string };
  if (!json.url) fail('file URL route response missing url');

  const dl = await fetch(json.url!);
  if (dl.status !== 200) {
    fail(`signed URL download returned ${dl.status}`);
  }
  const bytes = Buffer.from(await dl.arrayBuffer());
  if (bytes.length !== upload.sizeBytes) {
    fail(`downloaded ${bytes.length} bytes, upload reported ${upload.sizeBytes}`);
  }
  if (upload.sizeBytes === PNG_BYTES.length && !bytes.equals(PNG_BYTES)) {
    fail('downloaded bytes differ from uploaded bytes');
  }
  pass(`signed URL returned ${bytes.length} bytes, matches upload`);
}

// ─── Step 5: Cleanup ─────────────────────────────────────────────────────────

const SUBMISSION_SCOPE = `submission_id IN (SELECT id FROM submissions WHERE symptom_profile_id = ANY($1::text[]))`;

/** Child-first delete (FKs have no CASCADE), scoped to this run's synthetic profile ids. */
async function deleteTestRows(pool: Pool): Promise<number> {
  await pool.query(`DELETE FROM submission_files WHERE ${SUBMISSION_SCOPE}`, [TEST_PROFILE_IDS]);
  await pool.query(`DELETE FROM submission_access_log WHERE ${SUBMISSION_SCOPE}`, [TEST_PROFILE_IDS]);
  const result = await pool.query(
    `DELETE FROM submissions WHERE symptom_profile_id = ANY($1::text[])`,
    [TEST_PROFILE_IDS],
  );
  return result.rowCount ?? 0;
}

async function step5_cleanup(pool: Pool): Promise<void> {
  console.log('\nStep 5: Cleanup');

  const deleted = await deleteTestRows(pool);
  pass(`Deleted ${deleted} test row(s)`);

  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM submissions WHERE symptom_profile_id = ANY($1::text[])`,
    [TEST_PROFILE_IDS],
  );
  if (Number(rows[0].count) !== 0) {
    fail(`${rows[0].count} test row(s) remain after cleanup`);
  }
  pass('0 test rows remain');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('=== E2E Bracket Test Suite ===');

if (!BASE_URL) {
  console.error('ERROR: BASE_URL is not set');
  process.exit(1);
}
console.log(`Target: ${BASE_URL}`);
console.log(`Run ID: ${timestamp}`);

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}
if (!process.env.SHOPIFY_API_SECRET) {
  console.error('ERROR: SHOPIFY_API_SECRET is not set');
  process.exit(1);
}

// pg's URL parser mishandles special chars in passwords; use Node's URL class
// (which correctly decodes percent-encoding) and pass explicit params instead.
function parseConnectionString(url: string): import('pg').PoolConfig {
  const u = new URL(url);
  const config: import('pg').PoolConfig = {
    host: u.hostname,
    port: Number(u.port) || 5432,
    database: u.pathname.replace(/^\//, ''),
    user: u.username,
    password: u.password, // URL auto-decodes %7D → } etc.
  };
  const sslmode = u.searchParams.get('sslmode');
  if (sslmode === 'disable') {
    config.ssl = false;
  } else if (sslmode === 'no-verify') {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

const pool = new Pool(parseConnectionString(process.env.DATABASE_URL!));
let submissionIds: SubmitResult[] = [];

try {
  const upload = await step0_upload();
  submissionIds = await step1_postSubmissions(upload);
  await step2_dbVerify(pool);
  const fileId = await step3_ledgerVerify(submissionIds);
  await step4_pdfVerify(submissionIds);
  await step4b_fileRoundTrip(submissionIds[FILE_CASE_INDEX].id, fileId, upload);
  await step5_cleanup(pool);

  console.log('\n=== ALL STEPS PASSED ===\n');
  console.log(
    `Promoted submission IDs (remove GCS objects under submissions/<id>/): ${submissionIds
      .map((r) => r.id)
      .join(', ')}`,
  );
  process.exit(0);
} catch (err) {
  console.error('\n[ERROR] Unexpected exception:', err instanceof Error ? err.message : 'unknown error');
  // Attempt cleanup even on unexpected errors so test rows don't linger.
  if (submissionIds.length > 0) {
    console.log('\nAttempting emergency cleanup...');
    await deleteTestRows(pool)
      .then((n) => console.log(`  Deleted ${n} row(s)`))
      .catch((e) => console.error(`  Cleanup failed: ${e instanceof Error ? e.message : 'unknown error'}`));
    console.log(`  Submission IDs for GCS cleanup: ${submissionIds.map((r) => r.id).join(', ')}`);
  }
  process.exit(1);
} finally {
  await pool.end();
}
