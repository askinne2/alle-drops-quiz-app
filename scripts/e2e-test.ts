/**
 * E2E Bracket Test Suite
 *
 * Tests the full submission → DB → ledger → PDF pipeline for all 3 score brackets.
 *
 * Usage:
 *   npx tsx scripts/e2e-test.ts
 *
 * Required env (from .env or process.env):
 *   DATABASE_URL         — Cloud SQL Postgres connection string
 *   SHOPIFY_API_SECRET   — used to sign customer JWT tokens
 *
 * Optional env:
 *   SHOPIFY_API_KEY      — used as JWT audience claim (set if Fly has this secret)
 *   BASE_URL             — default https://alle-drops-quiz-app.fly.dev
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { SignJWT } from 'jose';

const BASE_URL = process.env.BASE_URL ?? 'https://alle-drops-quiz-app.fly.dev';
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
    label: 'E2E-MOD-TX (3-6, Texas)',
    payload: {
      state: 'texas' as const,
      name: 'E2E Test Moderate',
      dob: '1985-03-10',
      email: 'e2e+mod@example.com',
      phone: '5125550002',
      symptom_profile_id: `E2E-MOD-TX-${timestamp}`,
      quiz_score: 5,
      score_bracket: '3-6' as const,
      quiz_date: NOW,
      answers: { sneezing: 'sometimes', eye_itching: 'often' },
      completion_time: 90,
      consent_version: 'draft-2026-05-09',
    },
    expectedBracket: '3-6',
    expectedState: 'texas',
  },
  {
    label: 'E2E-HIGH-TN (7+, Tennessee, with history)',
    payload: {
      state: 'tennessee' as const,
      name: 'E2E Test High',
      dob: '1985-06-20',
      email: 'e2e+high@example.com',
      phone: '6155550003',
      symptom_profile_id: `E2E-HIGH-TN-${timestamp}`,
      quiz_score: 9,
      score_bracket: '7+' as const,
      quiz_date: NOW,
      answers: { sneezing: 'daily', eye_itching: 'often', nasal_congestion: 'daily' },
      completion_time: 180,
      consent_version: 'draft-2026-05-09',
    },
    expectedBracket: '7+',
    expectedState: 'tennessee',
  },
] as const;

const TEST_EMAILS = TEST_CASES.map((tc) => tc.payload.email);
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

// ─── Step 1: POST all 3 submissions ──────────────────────────────────────────

interface SubmitResult {
  id: string;
  symptom_profile_id: string;
}

async function step1_postSubmissions(): Promise<SubmitResult[]> {
  console.log('\nStep 1: POST submissions');
  const results: SubmitResult[] = [];

  for (const tc of TEST_CASES) {
    const resp = await fetch(`${BASE_URL}/api/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tc.payload),
    });

    if (resp.status !== 200) {
      const text = await resp.text();
      fail(`[${tc.label}] POST returned ${resp.status}: ${text}`);
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
}

async function step2_dbVerify(pool: Pool): Promise<void> {
  console.log('\nStep 2: DB row verification');

  const { rows } = await pool.query<DbRow>(
    `SELECT id, symptom_profile_id, score_bracket, patient_state, consent_version,
            answers_json
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

    pass(
      `[${tc.label}] bracket=${r.score_bracket} state=${r.patient_state} consent=${r.consent_version}`,
    );
  }

  // Stamp fake customer_id so JWT-based ledger + PDF lookups can resolve ownership.
  await pool.query(
    `UPDATE submissions SET customer_id_shopify = $1 WHERE symptom_profile_id = ANY($2::text[])`,
    [FAKE_CUSTOMER_ID, TEST_PROFILE_IDS],
  );
  pass(`Stamped customer_id_shopify=${FAKE_CUSTOMER_ID}`);
}

// ─── Step 3: Ledger verify ───────────────────────────────────────────────────

async function step3_ledgerVerify(ids: SubmitResult[]): Promise<void> {
  console.log('\nStep 3: Customer ledger verification');

  const token = await createCustomerJwt();
  const resp = await fetch(`${BASE_URL}/api/me/assessments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status !== 200) {
    const text = await resp.text();
    fail(`GET /api/me/assessments returned ${resp.status}: ${text}`);
  }

  const ledger = (await resp.json()) as { id: string }[];
  const ledgerIds = new Set(ledger.map((e) => e.id));

  for (const { id } of ids) {
    if (!ledgerIds.has(id)) {
      fail(`id=${id} not found in customer ledger`);
    }
    pass(`id=${id} appears in ledger`);
  }
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
      const text = await resp.text();
      fail(`GET /api/me/assessment/${id}/pdf returned ${resp.status}: ${text}`);
    }

    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('application/pdf')) {
      fail(`id=${id}: Content-Type is "${contentType}", expected application/pdf`);
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 4 || buf.slice(0, 4).toString('ascii') !== '%PDF') {
      fail(`id=${id}: body does not start with %PDF`);
    }

    pass(`id=${id} → ${buf.length} bytes, starts %PDF`);
  }
}

// ─── Step 5: Cleanup ─────────────────────────────────────────────────────────

async function step5_cleanup(pool: Pool): Promise<void> {
  console.log('\nStep 5: Cleanup');

  const result = await pool.query(
    `DELETE FROM submissions WHERE symptom_profile_id = ANY($1::text[])`,
    [TEST_PROFILE_IDS],
  );

  pass(`Deleted ${result.rowCount ?? 0} test row(s)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('=== E2E Bracket Test Suite ===');
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
  submissionIds = await step1_postSubmissions();
  await step2_dbVerify(pool);
  await step3_ledgerVerify(submissionIds);
  await step4_pdfVerify(submissionIds);
  await step5_cleanup(pool);

  console.log('\n=== ALL STEPS PASSED ===\n');
  process.exit(0);
} catch (err) {
  console.error('\n[ERROR] Unexpected exception:', err);
  // Attempt cleanup even on unexpected errors so test rows don't linger.
  if (submissionIds.length > 0) {
    console.log('\nAttempting emergency cleanup...');
    await pool
      .query(`DELETE FROM submissions WHERE symptom_profile_id = ANY($1::text[])`, [TEST_PROFILE_IDS])
      .then((r) => console.log(`  Deleted ${r.rowCount ?? 0} row(s)`))
      .catch((e) => console.error(`  Cleanup failed: ${e}`));
  }
  process.exit(1);
} finally {
  await pool.end();
}
