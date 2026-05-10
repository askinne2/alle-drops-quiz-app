# Handoff — AlleDrops quiz app (2026-05-10 session 21)

### Status: All pre-launch engineering gates closed + admin UI improved. Next: E2E bracket test suite.

---

## What's actually built (post-session 21)

| Feature | Status | Merged |
|---|---|---|
| Cross-origin iframe embed (Theme App Block) | ✅ done | `1739bc4` |
| Cloud SQL submissions table + INSERT | ✅ done | early |
| Patient ledger `/api/me/assessments` + email fallback + GID backfill | ✅ done | PR #10 |
| Patient PDF `/api/me/assessment/$id/pdf` | ✅ done | merged |
| Admin PDF `/api/admin/assessment/$id/pdf` | ✅ done | merged |
| Admin submissions list `/api/admin/submissions` (paginated, filterable) | ✅ done | merged |
| Admin submission detail `/api/admin/submission/:id` | ✅ done | merged |
| Admin view — Polaris table + filters + modal + PDF download | ✅ done | `9256a63` |
| Admin modal answers — human-readable rows (was JSON blob) | ✅ done | `3677f0e` |
| Admin home page — stats dashboard (total, week, TN/TX, brackets) | ✅ done | `3677f0e` |
| PHI metafield value cleanup | ✅ done | PR #8 |
| Audit logging — `submission_access_log` + `logSubmissionAccess()` | ✅ done | PR #11 |
| Consent version — `CONSENT_VERSION` wired into payload + DB | ✅ done | PR #11 |
| Breach response runbook | ✅ done | PR #11 |
| Custom domain `quiz.allerdrops.com` | ⏸ blocked on client | — |

**46/46 tests passing. Typecheck clean. Deployed to Fly.**

---

## Next task — E2E bracket test suite

**Goal:** Prove the full submission → DB → ledger → PDF pipeline works for all 3 score brackets before the first real patient.

**Implement as:** `scripts/e2e-test.ts` (tsx script, same pattern as `phi-cleanup-verify.ts`)

**Run with:** `npx tsx scripts/e2e-test.ts` (requires `DATABASE_URL` in env or `.env` file)

---

### What to test

Three submissions, one per bracket, both states covered:

| Test case | Score | Bracket | State | Extra fields |
|---|---|---|---|---|
| `E2E-LOW-TN` | 1 | `0-2` | tennessee | No history |
| `E2E-MOD-TX` | 5 | `3-6` | texas | No history |
| `E2E-HIGH-TN` | 9 | `7+` | tennessee | personal_history + family_history |

For each submission, verify:
1. **POST /api/quiz/submit** → 200, body has `id` + `symptom_profile_id` + `created_at`
2. **DB row** (direct SQL) → `score_bracket`, `patient_state`, `consent_version = 'draft-2026-05-09'`, `answers_json` not empty
3. For `7+` only: `personal_history_json` and `family_history_json` populated
4. **GET /api/me/assessments** (HMAC-signed) → submission appears in ledger
5. **GET /api/me/assessment/{id}/pdf** (HMAC-signed) → 200, `Content-Type: application/pdf`, body starts with `%PDF`
6. **Cleanup** — DELETE all 3 test rows from `submissions` at end

---

### Auth for customer-facing endpoints

`/api/me/*` requires a Shopify HMAC signature. The script must compute it:

```typescript
import crypto from 'crypto'

function signRequest(payload: object, secret: string): string {
  const body = JSON.stringify(payload)
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}
```

The `X-Shopify-Hmac-Sha256` header carries the hex HMAC of the JSON body, signed with `SHOPIFY_API_SECRET`. That secret is available as `process.env.SHOPIFY_API_SECRET` (set it in `.env` for local runs; it's already a Fly secret).

For the ledger + PDF endpoints, the customer identity is resolved by email (fallback path — no Shopify customer_id needed for test submissions). Pass email in the request body or as the query param the endpoint expects.

---

### Script structure

```
scripts/e2e-test.ts
├── setup: load env, define 3 test payloads with unique emails (e2e+low@example.com, etc.)
├── step 1: POST all 3 submissions, collect IDs
├── step 2: DB verify — SELECT from submissions WHERE patient_email IN (test emails)
│   └── assert bracket, state, consent_version, answers_json non-empty
│   └── assert 7+ row has personal/family history
├── step 3: ledger verify — GET /api/me/assessments for each email
│   └── assert submission ID appears in response
├── step 4: PDF verify — GET /api/me/assessment/{id}/pdf for each ID
│   └── assert 200, content-type application/pdf, body starts %PDF
├── step 5: cleanup — DELETE FROM submissions WHERE patient_email IN (test emails)
└── exit 0 (success) or exit 1 (any assertion failed, with details)
```

---

### Key implementation notes

- **BASE_URL** — default `https://alle-drops-quiz-app.fly.dev`, overridable via env for local dev testing
- **SHOPIFY_API_SECRET** — needed to sign customer endpoint requests. Load from `.env` (already in `.gitignore`).
- **DATABASE_URL** — needed for DB verify + cleanup. Same connection string as the app.
- The `0-2` bracket auto-submits silently (no manual consent step in the UI). The API POST path is identical — this tests that the server-side INSERT works for that bracket.
- Use distinct `symptom_profile_id` values per test case (e.g. `E2E-LOW-TN-{timestamp}`) so rows are easy to identify and clean up.
- Print a clean pass/fail summary per step. Exit 1 immediately on first failure so the error is obvious.

---

### Test payload examples

**0–2 bracket (Tennessee):**
```json
{
  "state": "tennessee",
  "name": "E2E Test Low",
  "dob": "1990-01-15",
  "email": "e2e+low@example.com",
  "phone": "6155550001",
  "symptom_profile_id": "E2E-LOW-TN",
  "quiz_score": 1,
  "score_bracket": "0-2",
  "quiz_date": "<ISO timestamp>",
  "answers": { "sneezing": "rarely", "eye_itching": "never" },
  "completion_time": 60,
  "consent_version": "draft-2026-05-09"
}
```

**7+ bracket (Tennessee, with history):**
```json
{
  "state": "tennessee",
  "name": "E2E Test High",
  "dob": "1985-06-20",
  "email": "e2e+high@example.com",
  "phone": "6155550003",
  "symptom_profile_id": "E2E-HIGH-TN",
  "quiz_score": 9,
  "score_bracket": "7+",
  "quiz_date": "<ISO timestamp>",
  "answers": { "sneezing": "daily", "eye_itching": "often", "nasal_congestion": "daily" },
  "completion_time": 180,
  "consent_version": "draft-2026-05-09",
  "personal_history": ["asthma", "eczema"],
  "family_history": ["hay fever"]
}
```

---

## What's NOT built (remaining pre-launch gates)

### 1. E2E bracket test suite (next task — plan above)

### 2. Consent text finalization

`consent_version` is now captured per submission (value: `'draft-2026-05-09'`). When William/counsel finalizes the consent text, update the text in `ConsentStep.tsx` and bump `CONSENT_VERSION` in `app/lib/consent-version.ts` to `'v1.0-YYYY-MM-DD'`.

---

## Blocked on client / AOD side

| Item | Owner | Notes |
|---|---|---|
| Custom domain `quiz.allerdrops.com` DNS | Andrew + client | Theme Block has `app_url` setting — swap when DNS ready |
| Fly.io BAA | Andrew | Initiate with Fly sales (not self-serve) |
| Production GCP migration | William | Move from 21adsmedia.com GCP dev project to AOD's own GCP project |
| In-house counsel review | William/counsel | Architecture + consent text review (parallel, not blocking engineering) |
| Consent text finalization | William/counsel | Blocks bumping CONSENT_VERSION to v1.0 |
| NPP draft | Counsel | Before first real patient |
| Privacy/Security Officer designation | William | Before first real patient |
| HIPAA workforce training | William | Before first real patient |

---

## Phase 2.5 (explicitly deferred — do not scope into current work)

- Provider review status workflow: `new → reviewed → contacted → scheduled`
- Provider notes on submissions
- Structured audit dashboard (who viewed what, when)
- Bulk operations
- Scheduling integration

---

## Plan B (after E2E suite) — Theme relic cleanup (separate repo)

**Plan:** `/Users/andrewskinner/Local Sites/allergist-on-demand/docs/superpowers/plans/2026-05-09-theme-relic-cleanup.md`
**Repo:** `/Users/andrewskinner/Local Sites/allergist-on-demand`

A complete parallel quiz system is still live in the theme (script-tag injection, Cloudflare Worker, Google Sheets JS, PHI metafield reads). All must be removed before launch.

**Mandatory first step:**
```bash
grep -rl "symptom-quiz" "/Users/andrewskinner/Local Sites/allergist-on-demand/templates/"
```
This determines Task 2A (delete section outright) vs Task 2B (replace with thin iframe wrapper). Cannot proceed without the audit result.

---

## Resume context

- **Active branch:** `main` (session 21 changes deployed)
- **Fly app:** `alle-drops-quiz-app` — deployed and healthy
- **How to verify:** `npm test` (46 pass), `npm run typecheck` (clean)
- **Key files for next task:**
  - `scripts/e2e-test.ts` — CREATE THIS (does not exist yet)
  - `scripts/phi-cleanup-verify.ts` — reference for script structure/pattern
  - `app/routes/api.me.assessments.tsx` — customer ledger endpoint (check auth mechanism)
  - `app/routes/api.me.assessment.$id.pdf.tsx` — customer PDF endpoint (check auth mechanism)
  - `app/lib/quiz-validation.ts` — schema for what the submit endpoint accepts
- **Cloud SQL access (for verify + cleanup):**
  - Proxy: `/opt/homebrew/share/google-cloud-sdk/bin/cloud-sql-proxy`
  - IAM user `andrew@21adsmedia.com` created — but NOT granted on `submissions` table yet (only `alledrops_app` has access). Script should use `DATABASE_URL` (alledrops_app credentials) not IAM auth.
  - ADC configured at `~/.config/gcloud/application_default_credentials.json`
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff — implement the E2E test suite."
