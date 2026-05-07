# A2 + A3: Ledger Endpoint + Customer Account Extension Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/me/assessments` (A2) and refactor the Customer Account UI extension to call it instead of reading (now-deleted) PHI metafields (A3).

**Architecture:** The Fly app gains one new route that mirrors the auth pattern of the existing PDF route — verify Shopify JWT, ownership-scope the DB query, return only non-PHI fields. The extension is a full rewrite: it gets a session token from the Shopify `api` parameter, calls the new ledger endpoint, and renders a date list with one "Download PDF" button per row that triggers an authenticated Blob download.

**Tech Stack:** React Router 7 (Fly app), Vitest, Shopify Customer Account UI extension (web components, `api_version = "2026-04"`), `jose`, `pg`.

---

## File map

| File | Action | Why |
|---|---|---|
| `app/routes/api.me.assessments.tsx` | **Create** | New ledger route (A2) |
| `tests/assessments-ledger.test.ts` | **Create** | Route unit tests |
| `extensions/quiz-history/src/QuizHistoryBlock.jsx` | **Rewrite** | Stop reading deleted PHI metafields; call Fly API instead |
| `extensions/quiz-history/shopify.extension.toml` | **Modify** | Remove metafield declarations; add `network_access` capability |
| `TASKS.md` | **Modify** | Mark A2 + A3 done |

---

## Task 1: Write failing tests for the ledger route

**Files:**
- Create: `tests/assessments-ledger.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// tests/assessments-ledger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock both deps so the test never hits real network or DB
vi.mock('../app/lib/customer-auth', () => ({
  verifyCustomerToken: vi.fn(),
}))

vi.mock('../app/lib/submissions', () => ({
  listSubmissionLedger: vi.fn(),
}))

import { loader } from '../app/routes/api.me.assessments'
import * as auth from '../app/lib/customer-auth'
import * as submissions from '../app/lib/submissions'
import type { SubmissionLedgerEntry } from '../app/lib/submissions'

const mockEntry: SubmissionLedgerEntry = {
  id: 'aaaa-1111',
  symptom_profile_id: 'AOD_TEST_001',
  created_at: '2026-05-07T18:00:00.000Z',
  patient_state: 'tennessee',
}

describe('GET /api/me/assessments', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('https://fly.dev/api/me/assessments')
    const res = await loader({ request: req, params: {}, context: {} as any })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token verification fails', async () => {
    vi.mocked(auth.verifyCustomerToken).mockRejectedValue(new Error('Invalid session token'))
    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer bad.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} as any })
    expect(res.status).toBe(401)
  })

  it('returns 200 with non-PHI ledger array on valid token', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} as any })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual([
      {
        id: 'aaaa-1111',
        symptom_profile_id: 'AOD_TEST_001',
        completed_at: '2026-05-07T18:00:00.000Z',
      },
    ])
    // Confirm patient_state is NOT leaked
    expect(body[0]).not.toHaveProperty('patient_state')
  })

  it('returns empty array when customer has no submissions', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([])

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} as any })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 503 when DB throws', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockRejectedValue(new Error('connection refused'))

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} as any })
    expect(res.status).toBe(503)
  })

  it('handles OPTIONS preflight with 204', async () => {
    const req = new Request('https://fly.dev/api/me/assessments', { method: 'OPTIONS' })
    const res = await loader({ request: req, params: {}, context: {} as any })
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run tests to confirm they FAIL (route doesn't exist yet)**

```bash
npx vitest run tests/assessments-ledger.test.ts
```

Expected: FAIL — `Cannot find module '../app/routes/api.me.assessments'`

---

## Task 2: Implement the ledger route (A2)

**Files:**
- Create: `app/routes/api.me.assessments.tsx`

- [ ] **Step 1: Create the route file**

```typescript
// app/routes/api.me.assessments.tsx
import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { listSubmissionLedger } from '../lib/submissions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
} as const

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 0. CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 1. Extract Bearer token
  const authHeader = request.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim() ?? ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 2. Verify token — same pattern as PDF route
  let customerId: string
  try {
    const payload = await verifyCustomerToken(token)
    customerId = payload.customerId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 3. Fetch ledger (ownership-scoped, never returns rows belonging to other customers)
  let entries: import('../lib/submissions').SubmissionLedgerEntry[]
  try {
    entries = await listSubmissionLedger({ customer_id_shopify: customerId })
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 4. Return only non-PHI fields. patient_state is PHI when tied to identity.
  const ledger = entries.map((e) => ({
    id: e.id,
    symptom_profile_id: e.symptom_profile_id,
    completed_at: e.created_at,
  }))

  return new Response(JSON.stringify(ledger), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
```

- [ ] **Step 2: Run tests — they should pass now**

```bash
npx vitest run tests/assessments-ledger.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npm run typecheck && npm test
```

Expected: typecheck clean, all tests pass (9 existing + 6 new = 15 total)

---

## Task 3: Commit A2

- [ ] **Step 1: Commit**

```bash
git add app/routes/api.me.assessments.tsx tests/assessments-ledger.test.ts
git commit -m "feat(api): add GET /api/me/assessments ledger endpoint (A2)"
```

---

## Task 4: Rewrite the Customer Account UI extension (A3)

**Files:**
- Rewrite: `extensions/quiz-history/src/QuizHistoryBlock.jsx`

The extension currently uses `shopify.query()` to read PHI metafields that no longer exist. Replace entirely with:
1. `api.sessionToken.get()` to get a Shopify-signed JWT
2. `fetch` to call `/api/me/assessments` on the Fly app
3. Render a date list; each row has a "Download PDF" button
4. Button handler gets a fresh token and triggers a Blob download

Note: The `api` parameter is the second argument to the extension function. It requires `api_access = true` in the toml (already set) and `network_access = true` (added in Task 5). The `api.sessionToken.get()` JWT is verified by the existing `verifyCustomerToken` on the Fly app — no new auth infrastructure needed.

- [ ] **Step 1: Rewrite `QuizHistoryBlock.jsx`**

```jsx
// extensions/quiz-history/src/QuizHistoryBlock.jsx
const FLY_BASE = 'https://alle-drops-quiz-app.fly.dev';

export default async function extension(root, api) {
  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-text>Loading your assessment history...</s-text>
    </s-section>
  `;

  let token;
  try {
    token = await api.sessionToken.get();
  } catch (err) {
    renderError(root, 'Could not authenticate. Please refresh the page.');
    return;
  }

  let assessments;
  try {
    const resp = await fetch(`${FLY_BASE}/api/me/assessments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    assessments = await resp.json();
  } catch (err) {
    renderError(root, 'Unable to load your assessment history.');
    return;
  }

  renderAssessments(root, assessments, api);
}

function renderAssessments(root, assessments, api) {
  if (!assessments.length) {
    root.innerHTML = `
      <s-section heading="Symptom Assessment History">
        <s-text>You haven't completed any symptom assessments yet.</s-text>
      </s-section>
    `;
    return;
  }

  const rows = assessments
    .map(
      (a) => `
        <s-stack direction="inline" gap="base">
          <s-text>${formatDate(a.completed_at)}</s-text>
          <s-button data-id="${a.id}">Download PDF</s-button>
        </s-stack>
      `
    )
    .join('<s-divider></s-divider>');

  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-stack direction="block" gap="base">
        ${rows}
      </s-stack>
    </s-section>
  `;

  // Attach click handlers after DOM is set
  root.querySelectorAll('s-button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => downloadPdf(btn.dataset.id, api));
  });
}

async function downloadPdf(id, api) {
  let token;
  try {
    token = await api.sessionToken.get();
  } catch {
    alert('Session expired. Please refresh the page.');
    return;
  }

  try {
    const resp = await fetch(`${FLY_BASE}/api/me/assessment/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Could not download PDF. Please try again.');
  }
}

function renderError(root, message) {
  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-banner status="critical">
        <s-text>${message}</s-text>
      </s-banner>
    </s-section>
  `;
}

function formatDate(dateString) {
  if (!dateString) return 'Date unavailable';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
```

---

## Task 5: Update shopify.extension.toml

**Files:**
- Modify: `extensions/quiz-history/shopify.extension.toml`

Remove all PHI metafield declarations (they don't exist anymore). Add `network_access = true` so the extension can `fetch` the Fly API. Keep `api_access = true` for `api.sessionToken.get()`.

- [ ] **Step 1: Replace the toml**

```toml
api_version = "2026-04"

[[extensions]]
name = "Quiz History"
handle = "quiz-history"
type = "ui_extension"
uid = "quiz-history-extension"

[[extensions.targeting]]
module = "./src/QuizHistoryBlock.jsx"
target = "customer-account.profile.block.render"

[extensions.capabilities]
api_access = true
network_access = true
```

No `[[extensions.metafields]]` sections — there are no PHI metafields to read.

---

## Task 6: Commit A3

- [ ] **Step 1: Run typecheck to confirm no breakage**

```bash
npm run typecheck
```

Expected: clean (extension is JSX, not in the TypeScript graph)

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: 15 tests pass

- [ ] **Step 3: Commit**

```bash
git add extensions/quiz-history/src/QuizHistoryBlock.jsx \
        extensions/quiz-history/shopify.extension.toml
git commit -m "feat(ext): refactor quiz-history extension to call Fly API (A3)

- Replace metafield reads with GET /api/me/assessments via session token
- Render date list with Download PDF button per row
- PDF download uses authenticated Blob fetch
- Remove all PHI metafield declarations from toml"
```

---

## Task 7: Update TASKS.md, push, open PR

- [ ] **Step 1: Mark A2 and A3 done in TASKS.md**

In `TASKS.md`, change the A2 and A3 checkboxes:

```markdown
### A2. Ledger list endpoint
- [x] New route: `GET /api/me/assessments`
  - Verifies Shopify Customer Account session token
  - Calls `listSubmissionLedger` (already exists)
  - Returns `[{ id, symptom_profile_id, completed_at }]` (NO scores, NO PHI in the list — that's the ledger pattern)

### A3. Customer Account UI extension refactor
- [x] `extensions/quiz-history/` — currently reads metafields that no longer exist
- [x] Refactor to call `/api/me/assessments` for the list
- [x] Render a date-only list with a "Download PDF" button per row
- [x] Button calls `/api/me/assessment/:id/pdf`, browser downloads
```

- [ ] **Step 2: Commit TASKS.md**

```bash
git add TASKS.md
git commit -m "chore: mark A2 + A3 complete in TASKS.md"
```

- [ ] **Step 3: Push**

```bash
git push -u origin thread-a2-a3-ledger-and-account-ext
```

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --title "feat(thread-a2-a3): ledger endpoint + Customer Account extension refactor" \
  --body "$(cat <<'EOF'
## Summary
- **A2:** New `GET /api/me/assessments` route — auth + ownership-scoped DB query + non-PHI ledger response
- **A3:** Full rewrite of `extensions/quiz-history/` — drops PHI metafield reads, calls Fly API with session token, renders date list + Download PDF buttons

## PHI safety checklist
- [x] No console.log of PHI fields — logs submission IDs only
- [x] Auth check before DB query (token verified, then ownership-scoped listSubmissionLedger)
- [x] `patient_state` stripped from ledger response — only `id`, `symptom_profile_id`, `completed_at` returned
- [x] Error responses do not echo PHI
- [x] No new third-party dependencies in PHI path
- [x] No third-party scripts added to extension

## Deploy notes
⚠️ **Two deploy steps required** (unlike A1 which was Fly-only):
1. `fly deploy -a alle-drops-quiz-app` — ships the new ledger route
2. `shopify app deploy` — ships the updated extension to Shopify

Both must run after merge for A3 to be live.

## Testing after deploy
See A4 in TASKS.md for the full E2E verification flow (logged-in customer → submit quiz → account page → PDF download).
EOF
)"
```

---

## Notes for reviewer

- `patient_state` is included in `SubmissionLedgerEntry` (the DB type) but intentionally omitted from the API response — it's PHI when tied to identity.
- The extension's `api.sessionToken.get()` call produces the same JWT format our existing `verifyCustomerToken` (in `customer-auth.ts`) already verifies. No auth changes needed on the Fly side.
- If `shopify app deploy` fails with an api_version error, bump `api_version` in `shopify.extension.toml` to the next quarterly release (e.g., `2026-07`) and redeploy.
- The extension cannot be unit tested — verify A3 manually via A4 (dev storefront with a logged-in customer).
