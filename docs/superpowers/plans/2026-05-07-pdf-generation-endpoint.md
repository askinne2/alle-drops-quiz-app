# PDF Generation Endpoint (A1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `GET /api/me/assessment/:id/pdf` — a Fly-hosted route that verifies a Shopify Customer Account session token, fetches the matching submission from Cloud SQL, and returns a pdfkit-generated visit-summary PDF.

**Architecture:** The route lives in React Router 7 file-based routing (`api.me.assessment.$id.pdf.tsx`). Auth is handled by a dedicated `customer-auth.ts` helper that verifies the Shopify Customer Account JWT via jose JWKS and extracts the customer GID. PDF generation is isolated in `pdf.ts`, which accepts a typed `SubmissionFullRow` and returns a `Buffer` via a pdfkit stream. No PHI is logged; no remote resources are fetched at render time.

**Tech Stack:** pdfkit + @types/pdfkit, jose (JWT/JWKS), React Router 7 loader, vitest for unit tests.

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app/lib/submissions.ts` | Add `SubmissionFullRow` interface (typed full DB row) |
| Create | `app/lib/customer-auth.ts` | `verifyCustomerToken(token)` → `{ customerId: string }` |
| Create | `app/lib/pdf.ts` | `generateVisitSummaryPdf(row)` → `Promise<Buffer>` |
| Create | `app/routes/api.me.assessment.$id.pdf.tsx` | GET route — auth → fetch → stream PDF |
| Create | `tests/customer-auth.test.ts` | Unit: token verification edge cases |
| Create | `tests/pdf.test.ts` | Unit: PDF buffer generation |

---

## Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install pdfkit jose
npm install --save-dev @types/pdfkit
```

- [ ] **Step 2: Verify no type errors introduced**

```bash
npm run typecheck
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdfkit and jose for PDF generation and JWT verification"
```

---

## Task 2: Add `SubmissionFullRow` type to `submissions.ts`

`getSubmissionByIdForCustomer` currently returns `Record<string, unknown>`. The PDF generator needs a typed row. We add the interface alongside the existing code without touching any logic.

**Files:**
- Modify: `app/lib/submissions.ts`

- [ ] **Step 1: Add the interface after the existing interfaces (around line 32)**

```typescript
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
  personal_history_json: string[] | null;
  family_history_json: string[] | null;
  consent_version: string | null;
  consent_accepted_at: string | null;
  consent_ip_address: string | null;
  consent_user_agent: string | null;
  completion_time_seconds: number | null;
  created_at: string;
}
```

- [ ] **Step 2: Update return type of `getSubmissionByIdForCustomer`**

Change the return type from `Promise<Record<string, unknown> | null>` to `Promise<SubmissionFullRow | null>`.

Current signature (line 138):
```typescript
export async function getSubmissionByIdForCustomer(args: {
  id: string;
  customer_id_shopify?: string | null;
  email?: string | null;
}): Promise<Record<string, unknown> | null> {
```

Replace with:
```typescript
export async function getSubmissionByIdForCustomer(args: {
  id: string;
  customer_id_shopify?: string | null;
  email?: string | null;
}): Promise<SubmissionFullRow | null> {
```

Also update the internal `pool.query` call to use the typed generic:
```typescript
  const result = await pool.query<SubmissionFullRow>(sql, [
    args.id,
    args.customer_id_shopify ?? null,
    args.email ?? null,
  ]);
```

- [ ] **Step 3: Verify types**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/submissions.ts
git commit -m "feat(submissions): add SubmissionFullRow type; tighten getSubmissionByIdForCustomer return type"
```

---

## Task 3: Implement `customer-auth.ts`

Verifies a Shopify Customer Account JWT using Shopify's public JWKS. Returns the customer GID (`gid://shopify/Customer/12345`) which can be compared against `customer_id_shopify` in the submissions table.

**Note on JWKS URL:** Shopify's Customer Account API issues JWTs. The JWKS is discoverable from `https://shopify.com/.well-known/openid-configuration`. The constant below is derived from that discovery document — if verification fails in prod, fetch that URL and use the returned `jwks_uri` value.

**Files:**
- Create: `app/lib/customer-auth.ts`
- Create: `tests/customer-auth.test.ts`

- [ ] **Step 1: Create failing test file**

```typescript
// tests/customer-auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mock jose entirely — we're testing our extraction logic, not jose itself.
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn(),
}))

import { verifyCustomerToken } from '../app/lib/customer-auth'
import * as jose from 'jose'

describe('verifyCustomerToken', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns customerId GID when token is valid', async () => {
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue({} as ReturnType<typeof jose.createRemoteJWKSet>)
    vi.mocked(jose.jwtVerify).mockResolvedValue({
      payload: { sub: 'gid://shopify/Customer/9876543210' },
      protectedHeader: { alg: 'RS256' },
    } as Awaited<ReturnType<typeof jose.jwtVerify>>)

    const result = await verifyCustomerToken('fake.jwt.token')

    expect(result).toEqual({ customerId: 'gid://shopify/Customer/9876543210' })
  })

  it('throws when jwtVerify rejects', async () => {
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue({} as ReturnType<typeof jose.createRemoteJWKSet>)
    vi.mocked(jose.jwtVerify).mockRejectedValue(new Error('JWTExpired'))

    await expect(verifyCustomerToken('expired.jwt.token')).rejects.toThrow('Invalid session token')
  })

  it('throws when payload has no sub claim', async () => {
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue({} as ReturnType<typeof jose.createRemoteJWKSet>)
    vi.mocked(jose.jwtVerify).mockResolvedValue({
      payload: {},
      protectedHeader: { alg: 'RS256' },
    } as Awaited<ReturnType<typeof jose.jwtVerify>>)

    await expect(verifyCustomerToken('nosub.jwt.token')).rejects.toThrow('Invalid session token')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails (module not found)**

```bash
npm test -- tests/customer-auth.test.ts
```

Expected: FAIL — `Cannot find module '../app/lib/customer-auth'`

- [ ] **Step 3: Create `app/lib/customer-auth.ts`**

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose'

// Shopify Customer Account API JWKS endpoint.
// Source: GET https://shopify.com/.well-known/openid-configuration → jwks_uri
const SHOPIFY_CA_JWKS_URL = new URL(
  'https://shopify.com/authentication/public-api/jwks.json'
)

const JWKS = createRemoteJWKSet(SHOPIFY_CA_JWKS_URL)

export interface CustomerTokenPayload {
  customerId: string // full GID: gid://shopify/Customer/12345
}

/**
 * Verify a Shopify Customer Account session token (JWT).
 * Throws with message 'Invalid session token' on any failure so callers
 * can return 401 without leaking jwt error details to clients.
 */
export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWKS)
    if (!payload.sub) throw new Error('no sub claim')
    return { customerId: payload.sub }
  } catch {
    throw new Error('Invalid session token')
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/customer-auth.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/lib/customer-auth.ts tests/customer-auth.test.ts
git commit -m "feat(auth): add verifyCustomerToken for Shopify Customer Account JWT verification"
```

---

## Task 4: Implement `pdf.ts`

Accepts a `SubmissionFullRow`, generates a visit-summary PDF, and returns a `Buffer`. Uses pdfkit with only built-in Helvetica fonts — no remote font loading.

**Files:**
- Create: `app/lib/pdf.ts`
- Create: `tests/pdf.test.ts`

- [ ] **Step 1: Create failing test file**

```typescript
// tests/pdf.test.ts
import { describe, it, expect } from 'vitest'
import { generateVisitSummaryPdf } from '../app/lib/pdf'
import type { SubmissionFullRow } from '../app/lib/submissions'

const baseRow: SubmissionFullRow = {
  id: 'aaaa-bbbb-cccc-dddd',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: 'gid://shopify/Customer/1',
  patient_name: 'Jane Test',
  patient_dob: '1985-06-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '7+',
  answers_json: { q1: 'yes', q2: 'no', q3: 'sometimes' },
  personal_history_json: ['seasonal allergies', 'asthma'],
  family_history_json: ['eczema'],
  consent_version: 'v1.0',
  consent_accepted_at: '2026-05-07T18:00:00Z',
  consent_ip_address: '1.2.3.4',
  consent_user_agent: 'Mozilla/5.0',
  completion_time_seconds: 120,
  created_at: '2026-05-07T18:00:00Z',
}

describe('generateVisitSummaryPdf', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await generateVisitSummaryPdf(baseRow)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('PDF starts with the %PDF magic bytes', async () => {
    const buf = await generateVisitSummaryPdf(baseRow)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('renders without history sections when history is null', async () => {
    const row = { ...baseRow, personal_history_json: null, family_history_json: null }
    const buf = await generateVisitSummaryPdf(row)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('renders without consent section when consent_version is null', async () => {
    const row = { ...baseRow, consent_version: null, consent_accepted_at: null }
    const buf = await generateVisitSummaryPdf(row)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/pdf.test.ts
```

Expected: FAIL — `Cannot find module '../app/lib/pdf'`

- [ ] **Step 3: Create `app/lib/pdf.ts`**

```typescript
import PDFDocument from 'pdfkit'
import type { SubmissionFullRow } from './submissions'

const BRACKET_LABELS: Record<string, string> = {
  '0-2': '0–2 (Low)',
  '3-6': '3–6 (Moderate)',
  '7+':  '7+ (High)',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toUTCString()
  } catch {
    return iso
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function generateVisitSummaryPdf(row: SubmissionFullRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 100 // usable width (50px margin each side)

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text('AlleDrops — Allergist on Demand', { align: 'center' })
    doc.fontSize(13).font('Helvetica').text('Symptom Assessment — Visit Summary', { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke()
    doc.moveDown(0.5)

    // ── Document meta ────────────────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
    doc.text(`Assessment ID: ${row.id}`)
    doc.text(`Profile: ${row.symptom_profile_id}    |    State: ${capitalize(row.patient_state)}`)
    doc.text(`Date: ${formatDate(row.created_at)}`)
    doc.fillColor('#000000').moveDown(0.8)

    // ── Section helper ───────────────────────────────────────────────────────
    function sectionHeader(title: string) {
      doc.fontSize(11).font('Helvetica-Bold').text(title.toUpperCase())
      doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#cccccc').stroke()
      doc.strokeColor('#000000').moveDown(0.3)
    }

    function labelValue(label: string, value: string) {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true })
      doc.font('Helvetica').text(value || '—')
    }

    // ── Patient information ──────────────────────────────────────────────────
    sectionHeader('Patient Information')
    labelValue('Name',          row.patient_name)
    labelValue('Date of Birth', formatDate(row.patient_dob))
    labelValue('Email',         row.patient_email)
    labelValue('Phone',         row.patient_phone)
    doc.moveDown(0.8)

    // ── Assessment results ───────────────────────────────────────────────────
    sectionHeader('Assessment Results')
    labelValue('Score',     String(row.quiz_score))
    labelValue('Bracket',   BRACKET_LABELS[row.score_bracket] ?? row.score_bracket)
    labelValue('Completed', formatDateTime(row.created_at))
    doc.moveDown(0.8)

    // ── Symptom responses ────────────────────────────────────────────────────
    sectionHeader('Symptom Responses')
    const answers = row.answers_json ?? {}
    const answerEntries = Object.entries(answers)
    if (answerEntries.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No responses recorded.')
    } else {
      for (const [key, val] of answerEntries) {
        const displayKey = key.replace(/_/g, ' ')
        const displayVal = Array.isArray(val) ? val.join(', ') : String(val ?? '—')
        labelValue(capitalize(displayKey), displayVal)
      }
    }
    doc.moveDown(0.8)

    // ── Medical history (conditional) ────────────────────────────────────────
    const hasPersonal = row.personal_history_json && row.personal_history_json.length > 0
    const hasFamily   = row.family_history_json   && row.family_history_json.length > 0
    if (hasPersonal || hasFamily) {
      sectionHeader('Medical History')
      if (hasPersonal) {
        doc.fontSize(10).font('Helvetica-Bold').text('Personal History:')
        doc.font('Helvetica')
        for (const item of row.personal_history_json!) {
          doc.text(`  • ${item}`)
        }
        doc.moveDown(0.3)
      }
      if (hasFamily) {
        doc.fontSize(10).font('Helvetica-Bold').text('Family History:')
        doc.font('Helvetica')
        for (const item of row.family_history_json!) {
          doc.text(`  • ${item}`)
        }
      }
      doc.moveDown(0.8)
    }

    // ── Consent record (conditional) ─────────────────────────────────────────
    if (row.consent_version) {
      sectionHeader('Consent Record')
      labelValue('Version',      row.consent_version)
      labelValue('Acknowledged', formatDateTime(row.consent_accepted_at))
      doc.moveDown(0.8)
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke()
    doc.moveDown(0.3)
    doc.fontSize(8).font('Helvetica').fillColor('#555555')
    doc.text(`Generated: ${new Date().toUTCString()}`, { align: 'left' })
    doc.moveDown(0.2)
    doc.text(
      'This document contains protected health information (PHI). ' +
      'Unauthorized disclosure is prohibited under HIPAA (45 CFR §164).',
      { align: 'left' }
    )
    doc.fillColor('#000000')

    doc.end()
  })
}
```

- [ ] **Step 4: Run test to confirm passing**

```bash
npm test -- tests/pdf.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors. (If pdfkit types complain about `doc.page.width`, ensure `@types/pdfkit` is installed from Task 1.)

- [ ] **Step 6: Commit**

```bash
git add app/lib/pdf.ts tests/pdf.test.ts
git commit -m "feat(pdf): add generateVisitSummaryPdf — pdfkit visit summary template"
```

---

## Task 5: Implement the PDF route

**Files:**
- Create: `app/routes/api.me.assessment.$id.pdf.tsx`

**Route URL:** `GET /api/me/assessment/:id/pdf`

**Auth flow:**
1. Extract Bearer token from `Authorization` header.
2. Call `verifyCustomerToken` — throws `'Invalid session token'` on failure → 401.
3. Use `customerId` (full GID) as the primary ownership check against Cloud SQL.
4. Call `getSubmissionByIdForCustomer({ id, customer_id_shopify: customerId })`.
5. 404 if null (not found or wrong customer).
6. Generate PDF buffer → return with `Content-Type: application/pdf`.

- [ ] **Step 1: Create the route file**

```typescript
// app/routes/api.me.assessment.$id.pdf.tsx
import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { getSubmissionByIdForCustomer } from '../lib/submissions'
import { generateVisitSummaryPdf } from '../lib/pdf'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // ── 1. Extract Bearer token ──────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Verify token ──────────────────────────────────────────────────────
  let customerId: string
  try {
    const payload = await verifyCustomerToken(token)
    customerId = payload.customerId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Fetch submission (ownership-scoped) ───────────────────────────────
  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing assessment id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const row = await getSubmissionByIdForCustomer({
    id,
    customer_id_shopify: customerId,
  })

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 4. Generate PDF ──────────────────────────────────────────────────────
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateVisitSummaryPdf(row)
  } catch (err) {
    console.error('[pdf] generation error for submission', id, err instanceof Error ? err.message : 'unknown')
    return new Response(JSON.stringify({ error: 'Could not generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 5. Return binary ─────────────────────────────────────────────────────
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessment-${id}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Manual test — 401 on missing token**

```bash
curl -i https://alle-drops-quiz-app.fly.dev/api/me/assessment/some-id/pdf
```

Expected: `HTTP/2 401`, body `{"error":"Missing Authorization header"}`.

*Note: Before this test works, the app must be deployed (Task 6 handles that gate).*

- [ ] **Step 5: Manual test — 401 on bad token**

```bash
curl -i https://alle-drops-quiz-app.fly.dev/api/me/assessment/some-id/pdf \
  -H "Authorization: Bearer not.a.real.token"
```

Expected: `HTTP/2 401`, body `{"error":"Unauthorized"}`.

- [ ] **Step 6: Manual test — 404 for unknown ID with valid token**

*(Requires a valid Shopify CA token from a logged-in customer session. Obtain via the Customer Account extension once A3 is implemented, or via a Shopify debug token if available.)*

```bash
curl -i https://alle-drops-quiz-app.fly.dev/api/me/assessment/00000000-0000-0000-0000-000000000000/pdf \
  -H "Authorization: Bearer <valid_ca_token>"
```

Expected: `HTTP/2 404`, body `{"error":"Not found"}`.

- [ ] **Step 7: Manual test — 200 with PDF for known submission**

```bash
curl -o /tmp/test-assessment.pdf \
  https://alle-drops-quiz-app.fly.dev/api/me/assessment/<real_submission_id>/pdf \
  -H "Authorization: Bearer <valid_ca_token>"

# Confirm it's a valid PDF
file /tmp/test-assessment.pdf
```

Expected: `PDF document, version 1.3` (or similar). Open in Preview to verify fields render.

- [ ] **Step 8: Commit**

```bash
git add app/routes/api.me.assessment.\$id.pdf.tsx
git commit -m "feat(pdf-route): add GET /api/me/assessment/:id/pdf — auth + DB fetch + pdfkit response"
```

---

## Task 6: Final verification before deploy review

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all tests pass including the 7 new tests from Tasks 3 and 4.

- [ ] **Step 3: Full build**

```bash
npm run build
```

Expected: build completes, no warnings about missing modules.

- [ ] **Step 4: Update TASKS.md**

Mark A1 subtasks done. Leave deploy step open — user reviews diff before `fly deploy`.

---

## Auth note — JWKS URL verification

`app/lib/customer-auth.ts` uses `https://shopify.com/authentication/public-api/jwks.json`.

Before shipping to a patient-facing environment, confirm this URL is correct:

```bash
curl https://shopify.com/.well-known/openid-configuration | jq '.jwks_uri'
```

If the returned `jwks_uri` differs, update the constant in `customer-auth.ts`. The JWKS URL changes rarely but is non-obvious to find.

---

## What is NOT in this plan (scope boundary)

- A2 (ledger list endpoint) — separate route, separate task
- A3 (extension refactor to call these endpoints) — separate task; the extension will need `shopify.customerAccount.getAccessToken()` to produce the Bearer token consumed here
- Fly deploy — user reviews diff first per their explicit instruction
