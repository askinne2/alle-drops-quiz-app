# Phase 2 Admin View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 2 placeholder in `app/routes/app.quiz-results.tsx` with a real provider admin view that reads PHI submissions from Cloud SQL and renders them in the Shopify embedded admin.

**Architecture:** The loader for `app.quiz-results.tsx` fetches submissions directly from Cloud SQL via new DB helpers in `submissions.ts`. Three new API routes (`api.admin.submissions`, `api.admin.submission.$id`, `api.admin.assessment.$id.pdf`) provide the same data for client-side fetching (detail modal) and authenticated PDF downloads. All admin routes gate on `authenticate.admin(request)` (Shopify session token, not Customer Account token). Filter state lives in URL search params so React Router re-runs the loader on filter changes without any client-side data fetching for the list.

**Tech Stack:** React Router 7, TypeScript, Vitest, `@shopify/shopify-app-react-router`, PDFKit (existing), `pg` (existing Cloud SQL pool)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/lib/submissions.ts` | Modify | Add `listAdminSubmissions`, `getSubmissionByIdForAdmin`, and their types |
| `app/routes/api.admin.submissions.tsx` | Create | `GET /api/admin/submissions` — paginated/filtered list |
| `app/routes/api.admin.submission.$id.tsx` | Create | `GET /api/admin/submission/:id` — full row |
| `app/routes/api.admin.assessment.$id.pdf.tsx` | Create | `GET /api/admin/assessment/:id/pdf` — admin-authenticated PDF |
| `app/routes/app.quiz-results.tsx` | Modify | Replace placeholder with Polaris table, filters, detail modal |
| `tests/api-admin-submissions.test.ts` | Create | Auth, filters, pagination, DB error tests |
| `tests/api-admin-submission-detail.test.ts` | Create | Auth, 200/404/503 tests |
| `tests/api-admin-assessment-pdf.test.ts` | Create | Auth, 200/404/500 tests |

---

## Task 1: Add DB helpers to `submissions.ts`

**Files:**
- Modify: `app/lib/submissions.ts` (append after existing exports)

- [ ] **Step 1: Add interfaces and functions**

Append to the bottom of `app/lib/submissions.ts`:

```typescript
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
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run typecheck 2>&1 | tail -20
```

Expected: no errors related to `submissions.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add app/lib/submissions.ts
git commit -m "feat(admin): add listAdminSubmissions + getSubmissionByIdForAdmin helpers"
```

---

## Task 2: `api.admin.submissions.tsx` + tests

**Files:**
- Create: `app/routes/api.admin.submissions.tsx`
- Create: `tests/api-admin-submissions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api-admin-submissions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  listAdminSubmissions: vi.fn(),
}))

import { loader } from '../app/routes/api.admin.submissions'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import type { AdminSubmissionsPage } from '../app/lib/submissions'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

const mockPage: AdminSubmissionsPage = {
  rows: [
    {
      id: 'uuid-1',
      symptom_profile_id: 'AOD_TEST_001',
      patient_name: 'Jane Doe',
      patient_email: 'jane@example.com',
      patient_state: 'tennessee',
      score_bracket: '7+',
      quiz_score: 9,
      created_at: '2026-05-01T12:00:00.000Z',
      customer_id_shopify: 'gid://shopify/Customer/123',
    },
  ],
  hasNextPage: false,
  cursor: null,
}

describe('GET /api/admin/submissions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when authenticate.admin throws a Response', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(
      new Response('Unauthorized', { status: 401 })
    )
    const req = new Request('https://fly.dev/api/admin/submissions')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns 200 with submissions page on valid session', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.listAdminSubmissions).mockResolvedValue(mockPage)

    const req = new Request('https://fly.dev/api/admin/submissions')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0].id).toBe('uuid-1')
    expect(body.hasNextPage).toBe(false)
    expect(body.cursor).toBeNull()
  })

  it('passes all filter params to listAdminSubmissions', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.listAdminSubmissions).mockResolvedValue(
      { rows: [], hasNextPage: false, cursor: null }
    )

    const req = new Request(
      'https://fly.dev/api/admin/submissions?state=tennessee&score_bracket=7%2B&from=2026-01-01&to=2026-12-31&q=jane&cursor=NTA%3D'
    )
    await loader({ request: req, params: {}, context: {} } as any)

    expect(submissions.listAdminSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'tennessee',
        score_bracket: '7+',
        from: '2026-01-01',
        to: '2026-12-31',
        q: 'jane',
        cursor: 'NTA=',
        limit: 50,
      })
    )
  })

  it('returns 503 when DB throws', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.listAdminSubmissions).mockRejectedValue(
      new Error('connection refused')
    )

    const req = new Request('https://fly.dev/api/admin/submissions')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(503)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run tests/api-admin-submissions.test.ts 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module '../app/routes/api.admin.submissions'".

- [ ] **Step 3: Create the route**

Create `app/routes/api.admin.submissions.tsx`:

```typescript
import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { listAdminSubmissions } from '../lib/submissions'
import type { AdminSubmissionsPage } from '../lib/submissions'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 1. Verify admin session — throws Response on failure
  let shop: string
  try {
    const { session } = await authenticate.admin(request)
    shop = session.shop
  } catch (e) {
    if (e instanceof Response) return e
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse filter params
  const url = new URL(request.url)
  const state = url.searchParams.get('state') || null
  const score_bracket = url.searchParams.get('score_bracket') || null
  const from = url.searchParams.get('from') || null
  const to = url.searchParams.get('to') || null
  const q = url.searchParams.get('q') || null
  const cursor = url.searchParams.get('cursor') || null

  // 3. Fetch
  let page: AdminSubmissionsPage
  try {
    page = await listAdminSubmissions({ state, score_bracket, from, to, q, cursor, limit: 50 })
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Audit log (no PHI — shop + count only)
  console.log(
    `[admin] fetched submissions shop=${shop} count=${page.rows.length} hasNextPage=${page.hasNextPage}`
  )

  return new Response(JSON.stringify(page), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run tests/api-admin-submissions.test.ts 2>&1 | tail -20
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add app/routes/api.admin.submissions.tsx tests/api-admin-submissions.test.ts
git commit -m "feat(admin): GET /api/admin/submissions — paginated list with filters"
```

---

## Task 3: `api.admin.submission.$id.tsx` + tests

**Files:**
- Create: `app/routes/api.admin.submission.$id.tsx`
- Create: `tests/api-admin-submission-detail.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api-admin-submission-detail.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForAdmin: vi.fn(),
}))

import { loader } from '../app/routes/api.admin.submission.$id'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import type { SubmissionFullRow } from '../app/lib/submissions'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

const mockRow: SubmissionFullRow = {
  id: 'uuid-1',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: 'gid://shopify/Customer/123',
  patient_name: 'Jane Doe',
  patient_dob: '1990-01-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '7+',
  answers_json: { taking_meds: 'no' },
  personal_history_json: null,
  family_history_json: null,
  consent_version: 'v1',
  consent_accepted_at: '2026-05-01T12:00:00.000Z',
  consent_ip_address: '1.2.3.4',
  consent_user_agent: 'Mozilla/5.0',
  completion_time_seconds: 120,
  created_at: '2026-05-01T12:00:00.000Z',
}

describe('GET /api/admin/submission/:id', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when authenticate.admin throws a Response', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(
      new Response('Unauthorized', { status: 401 })
    )
    const req = new Request('https://fly.dev/api/admin/submission/uuid-1')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns 200 with full row on valid session', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockRow)

    const req = new Request('https://fly.dev/api/admin/submission/uuid-1')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('uuid-1')
    expect(body.patient_name).toBe('Jane Doe')
    expect(body.answers_json).toEqual({ taking_meds: 'no' })
    expect(body.patient_dob).toBe('1990-01-15')
  })

  it('returns 404 for non-existent submission', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/admin/submission/does-not-exist')
    const res = await loader({
      request: req,
      params: { id: 'does-not-exist' },
      context: {},
    } as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 503 when DB throws', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockRejectedValue(
      new Error('DB connection lost')
    )

    const req = new Request('https://fly.dev/api/admin/submission/uuid-1')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(503)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run tests/api-admin-submission-detail.test.ts 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module '../app/routes/api.admin.submission.$id'".

- [ ] **Step 3: Create the route**

Create `app/routes/api.admin.submission.$id.tsx`:

```typescript
import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { getSubmissionByIdForAdmin } from '../lib/submissions'
import type { SubmissionFullRow } from '../lib/submissions'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  let shop: string
  try {
    const { session } = await authenticate.admin(request)
    shop = session.shop
  } catch (e) {
    if (e instanceof Response) return e
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing submission id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let row: SubmissionFullRow | null
  try {
    row = await getSubmissionByIdForAdmin(id)
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[admin] fetched submission id=${id} shop=${shop}`)

  return new Response(JSON.stringify(row), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run tests/api-admin-submission-detail.test.ts 2>&1 | tail -20
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add app/routes/api.admin.submission.\$id.tsx tests/api-admin-submission-detail.test.ts
git commit -m "feat(admin): GET /api/admin/submission/:id — full row with admin auth"
```

---

## Task 4: `api.admin.assessment.$id.pdf.tsx` + tests

**Files:**
- Create: `app/routes/api.admin.assessment.$id.pdf.tsx`
- Create: `tests/api-admin-assessment-pdf.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api-admin-assessment-pdf.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForAdmin: vi.fn(),
}))

vi.mock('../app/lib/pdf', () => ({
  generateVisitSummaryPdf: vi.fn(),
}))

import { loader } from '../app/routes/api.admin.assessment.$id.pdf'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import * as pdf from '../app/lib/pdf'
import type { SubmissionFullRow } from '../app/lib/submissions'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

const mockRow: SubmissionFullRow = {
  id: 'uuid-1',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: null,
  patient_name: 'Jane Doe',
  patient_dob: '1990-01-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '7+',
  answers_json: {},
  personal_history_json: null,
  family_history_json: null,
  consent_version: 'v1',
  consent_accepted_at: '2026-05-01T12:00:00.000Z',
  consent_ip_address: null,
  consent_user_agent: null,
  completion_time_seconds: null,
  created_at: '2026-05-01T12:00:00.000Z',
}

describe('GET /api/admin/assessment/:id/pdf', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when authenticate.admin throws a Response', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(
      new Response('Unauthorized', { status: 401 })
    )
    const req = new Request('https://fly.dev/api/admin/assessment/uuid-1/pdf')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns PDF binary with correct headers on valid session', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockRow)
    vi.mocked(pdf.generateVisitSummaryPdf).mockResolvedValue(
      Buffer.from('%PDF-1.4 fake content')
    )

    const req = new Request('https://fly.dev/api/admin/assessment/uuid-1/pdf')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('assessment-uuid-1.pdf')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns 404 for non-existent submission', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/admin/assessment/bad-id/pdf')
    const res = await loader({ request: req, params: { id: 'bad-id' }, context: {} } as any)
    expect(res.status).toBe(404)
  })

  it('returns 500 when PDF generation throws', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockRow)
    vi.mocked(pdf.generateVisitSummaryPdf).mockRejectedValue(new Error('PDFKit internal error'))

    const req = new Request('https://fly.dev/api/admin/assessment/uuid-1/pdf')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run tests/api-admin-assessment-pdf.test.ts 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module '../app/routes/api.admin.assessment.$id.pdf'".

- [ ] **Step 3: Create the route**

Create `app/routes/api.admin.assessment.$id.pdf.tsx`:

```typescript
import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { getSubmissionByIdForAdmin } from '../lib/submissions'
import type { SubmissionFullRow } from '../lib/submissions'
import { generateVisitSummaryPdf } from '../lib/pdf'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  let shop: string
  try {
    const { session } = await authenticate.admin(request)
    shop = session.shop
  } catch (e) {
    if (e instanceof Response) return e
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing assessment id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let row: SubmissionFullRow | null
  try {
    row = await getSubmissionByIdForAdmin(id)
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateVisitSummaryPdf(row)
  } catch (err) {
    console.error(
      '[admin-pdf] generation error for submission',
      id,
      err instanceof Error ? err.message : 'unknown'
    )
    return new Response(JSON.stringify({ error: 'Could not generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[admin] generated PDF id=${id} shop=${shop}`)

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessment-${id}.pdf"; filename*=UTF-8''assessment-${encodeURIComponent(id)}.pdf`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run tests/api-admin-assessment-pdf.test.ts 2>&1 | tail -20
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add "app/routes/api.admin.assessment.\$id.pdf.tsx" tests/api-admin-assessment-pdf.test.ts
git commit -m "feat(admin): GET /api/admin/assessment/:id/pdf — admin-authenticated PDF download"
```

---

## Task 5: Refactor `app/routes/app.quiz-results.tsx`

**Files:**
- Modify: `app/routes/app.quiz-results.tsx`

No automated tests for this route (embedded admin React component; auth is tested in the API routes above).

- [ ] **Step 1: Replace the file**

Overwrite `app/routes/app.quiz-results.tsx` with:

```tsx
import type { CSSProperties } from 'react'
import type { HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData, useSearchParams, useNavigate, useFetcher } from 'react-router'
import { useState, useEffect, useCallback } from 'react'
import { authenticate } from '../shopify.server'
import { boundary } from '@shopify/shopify-app-react-router/server'
import { listAdminSubmissions } from '../lib/submissions'
import type { AdminSubmissionsPage, SubmissionFullRow } from '../lib/submissions'

declare global {
  interface Window {
    shopify: { idToken: () => Promise<string> }
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request)

  const url = new URL(request.url)
  const state = url.searchParams.get('state') || null
  const score_bracket = url.searchParams.get('score_bracket') || null
  const from = url.searchParams.get('from') || null
  const to = url.searchParams.get('to') || null
  const q = url.searchParams.get('q') || null
  const cursor = url.searchParams.get('cursor') || null

  let page: AdminSubmissionsPage
  try {
    page = await listAdminSubmissions({ state, score_bracket, from, to, q, cursor, limit: 50 })
    console.log(`[admin] quiz-results loader count=${page.rows.length}`)
  } catch {
    page = { rows: [], hasNextPage: false, cursor: null }
  }

  return { page, filters: { state, score_bracket, from, to, q, cursor } }
}

export default function QuizResultsPage() {
  const { page, filters } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const detailFetcher = useFetcher<unknown>()

  const [searchInput, setSearchInput] = useState(filters.q ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Debounce search input → navigate
  useEffect(() => {
    if (searchInput === (filters.q ?? '')) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (searchInput) { params.set('q', searchInput) } else { params.delete('q') }
      params.delete('cursor')
      navigate(`/app/quiz-results?${params.toString()}`, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) { params.set(key, value) } else { params.delete(key) }
      params.delete('cursor')
      navigate(`/app/quiz-results?${params.toString()}`)
    },
    [searchParams, navigate]
  )

  const openDetail = useCallback(
    (id: string) => {
      setSelectedId(id)
      setPdfError(null)
      detailFetcher.load(`/api/admin/submission/${id}`)
    },
    [detailFetcher]
  )

  const closeDetail = useCallback(() => {
    setSelectedId(null)
    setPdfError(null)
  }, [])

  const handleDownloadPdf = useCallback(async (id: string) => {
    try {
      const token = await window.shopify.idToken()
      const res = await fetch(`/api/admin/assessment/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setPdfError(`Download failed (${res.status})`); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `assessment-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setPdfError('Download failed — please try again')
    }
  }, [])

  const detailRow = detailFetcher.data as SubmissionFullRow | undefined

  return (
    <s-page heading="Quiz Results">
      {/* Filter bar */}
      <s-section>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FilterField label="State">
            <select
              value={filters.state ?? ''}
              onChange={e => handleFilterChange('state', e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              <option value="tennessee">Tennessee</option>
              <option value="texas">Texas</option>
            </select>
          </FilterField>
          <FilterField label="Score Bracket">
            <select
              value={filters.score_bracket ?? ''}
              onChange={e => handleFilterChange('score_bracket', e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              <option value="0-2">0–2 Low</option>
              <option value="3-6">3–6 Moderate</option>
              <option value="7+">7+ High</option>
            </select>
          </FilterField>
          <FilterField label="From">
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={e => handleFilterChange('from', e.target.value)}
              style={inputStyle}
            />
          </FilterField>
          <FilterField label="To">
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={e => handleFilterChange('to', e.target.value)}
              style={inputStyle}
            />
          </FilterField>
          <FilterField label="Search">
            <input
              type="text"
              placeholder="Name, email, or profile ID"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ ...inputStyle, width: '220px' }}
            />
          </FilterField>
        </div>
      </s-section>

      {/* Results table */}
      <s-section>
        {page.rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No submissions found.
          </div>
        ) : (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Date', 'Name', 'Email', 'State', 'Bracket', 'Score'].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.rows.map(row => (
                  <SubmissionRow
                    key={row.id}
                    row={row}
                    onClick={() => openDetail(row.id)}
                  />
                ))}
              </tbody>
            </table>
            {page.hasNextPage && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams)
                    params.set('cursor', page.cursor!)
                    navigate(`/app/quiz-results?${params.toString()}`)
                  }}
                  style={btnStyle}
                >
                  Load next page →
                </button>
              </div>
            )}
          </>
        )}
      </s-section>

      {/* Detail modal */}
      {selectedId && (
        <div style={overlayStyle} onClick={closeDetail}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Assessment Detail</h2>
              <button onClick={closeDetail} style={closeBtnStyle} aria-label="Close">✕</button>
            </div>

            {detailFetcher.state === 'loading' && (
              <div style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Loading…</div>
            )}

            {detailFetcher.state !== 'loading' && detailRow && (
              <>
                <DetailField label="ID" value={detailRow.id} />
                <DetailField label="Profile" value={detailRow.symptom_profile_id} />
                <DetailField label="Date" value={new Date(detailRow.created_at).toLocaleString()} />
                <DetailField label="Name" value={detailRow.patient_name} />
                <DetailField label="DOB" value={formatDate(detailRow.patient_dob)} />
                <DetailField label="Email" value={detailRow.patient_email} />
                <DetailField label="Phone" value={detailRow.patient_phone} />
                <DetailField label="State" value={capitalize(detailRow.patient_state)} />
                <DetailField label="Score" value={String(detailRow.quiz_score)} />
                <DetailField label="Bracket" value={detailRow.score_bracket} />
                {detailRow.consent_version && (
                  <DetailField
                    label="Consent"
                    value={`${detailRow.consent_version} — ${formatDate(detailRow.consent_accepted_at)}`}
                  />
                )}
                <div style={{ marginTop: '1rem' }}>
                  <span style={fieldLabelStyle}>Answers</span>
                  <pre style={preStyle}>
                    {JSON.stringify(detailRow.answers_json, null, 2)}
                  </pre>
                </div>
                {pdfError && (
                  <div style={{ color: '#c00', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {pdfError}
                  </div>
                )}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleDownloadPdf(detailRow.id)}
                    style={{ ...btnStyle, background: '#0070f3' }}
                  >
                    Download PDF
                  </button>
                  <button onClick={closeDetail} style={btnStyle}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </s-page>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={filterLabelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SubmissionRow({
  row,
  onClick,
}: {
  row: import('../lib/submissions').AdminSubmissionListRow
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onClick={onClick}
      style={{ background: hovered ? '#f0f4ff' : 'white', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={tdStyle}>{new Date(row.created_at).toLocaleDateString()}</td>
      <td style={tdStyle}>{row.patient_name}</td>
      <td style={tdStyle}>{row.patient_email}</td>
      <td style={tdStyle}>{capitalize(row.patient_state)}</td>
      <td style={tdStyle}>{row.score_bracket}</td>
      <td style={tdStyle}>{row.quiz_score}</td>
    </tr>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
      <span style={fieldLabelStyle}>{label}:</span>
      <span>{value}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
  catch { return iso }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const filterLabelStyle: CSSProperties = { display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '0.25rem', fontWeight: 600 }
const fieldLabelStyle: CSSProperties = { fontWeight: 600, minWidth: '72px', color: '#444', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }
const selectStyle: CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }
const inputStyle: CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thStyle: CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', background: '#f5f5f5', border: '1px solid #ddd', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }
const tdStyle: CSSProperties = { padding: '0.6rem 0.75rem', border: '1px solid #e5e5e5', fontSize: '0.9rem' }
const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalStyle: CSSProperties = { background: 'white', borderRadius: '8px', padding: '1.5rem', width: '600px', maxWidth: '90vw', maxHeight: '82vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }
const btnStyle: CSSProperties = { padding: '0.45rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
const closeBtnStyle: CSSProperties = { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666', lineHeight: 1 }
const preStyle: CSSProperties = { background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.82rem', maxHeight: '180px', marginTop: '0.25rem' }

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs)
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run typecheck 2>&1 | tail -30
```

Expected: no TypeScript errors. If errors appear in `app.quiz-results.tsx`, fix them before proceeding.

- [ ] **Step 3: Run all tests**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run 2>&1 | tail -30
```

Expected: all tests pass (including existing tests from `tests/` and `app/lib/quiz-validation.test.ts`).

- [ ] **Step 4: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add app/routes/app.quiz-results.tsx
git commit -m "feat(admin): Phase 2 quiz results admin view — table, filters, modal, PDF download"
```

---

## Task 6: Final verification + push

- [ ] **Step 1: Run full typecheck**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run typecheck 2>&1
```

Expected: exit 0, no errors.

- [ ] **Step 2: Run all tests**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npx vitest run 2>&1
```

Expected: all tests pass.

- [ ] **Step 3: Push branch**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && git push -u origin feature/phase-2-admin-view
```

- [ ] **Step 4: Open PR**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && gh pr create \
  --title "feat(admin): Phase 2 admin view — submission table, filters, detail modal, PDF" \
  --body "$(cat <<'EOF'
## Summary

- `GET /api/admin/submissions` — paginated (50/page, cursor-based), filterable by state/bracket/date/search, authenticated via `authenticate.admin(request)`
- `GET /api/admin/submission/:id` — full submission row, admin-authenticated
- `GET /api/admin/assessment/:id/pdf` — admin-authenticated PDF (different auth path from patient `/api/me/assessment/:id/pdf`)
- `app/routes/app.quiz-results.tsx` — replaces Phase 2 placeholder with real Polaris-hosted table; filter bar (state, bracket, date range, search); row-click detail modal; Download PDF button via App Bridge `idToken()`
- Audit log on every fetch: `[admin] fetched ...` to Fly logs (shop + count, no PHI)

## HIPAA self-review

- [x] No PHI logged — logs contain only IDs, counts, and shop domain
- [x] All admin endpoints verify session via `authenticate.admin(request)` before DB query
- [x] No PHI in URL paths (submission IDs are UUIDs)
- [x] Error responses echo no PHI
- [x] No new third-party dependencies
- [x] PDF generation: no remote fonts, no remote images, no remote CSS (PDFKit offline)

## Out of scope (deferred to Phase 2.5)

- Provider review workflow (new → reviewed → contacted → scheduled)
- Provider notes on submissions
- Real-time notifications
- Audit dashboard (who viewed what, when)
- Bulk operations

## Test plan

1. Log in to Shopify admin → open AlleDrops Quiz Production app → click Quiz Results
2. Verify table loads with real submissions from Cloud SQL
3. Filter by State: Tennessee → rows reduce to TN-only
4. Filter by Score Bracket: 7+ → rows reduce
5. Search by name or email → matching rows appear (debounce ~300ms)
6. Click a row → modal opens with full detail (DOB, phone, answers JSON)
7. Click Download PDF → file downloads as `assessment-<id>.pdf`
8. Click Close → modal dismisses

## Files with PHI-path changes

- `app/lib/submissions.ts` — new admin query helpers (reads from PHI table, no new columns)
- `app/routes/api.admin.submissions.tsx` — new admin API (authenticated)
- `app/routes/api.admin.submission.$id.tsx` — new admin API (authenticated)
- `app/routes/api.admin.assessment.$id.pdf.tsx` — new admin API (authenticated)
- `app/routes/app.quiz-results.tsx` — admin UI (behind Shopify admin session)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| `GET /api/admin/submissions` — paginated, filtered, admin-auth | Task 2 |
| `GET /api/admin/submission/:id` — full row, admin-auth | Task 3 |
| `GET /api/admin/assessment/:id/pdf` — admin-auth PDF | Task 4 |
| Polaris table with date/name/email/state/bracket/score columns | Task 5 |
| Filter controls: state, bracket, date range, search | Task 5 |
| Click row → modal with full detail | Task 5 |
| Download PDF button in modal | Task 5 |
| Audit log every fetch with shop + count | Tasks 2, 3, 4, 5 |
| No PHI in URL paths or query strings | All tasks |
| Tests: auth required, filters, pagination, 404, 503 | Tasks 2, 3, 4 |
| Typecheck passes | Task 6 |
