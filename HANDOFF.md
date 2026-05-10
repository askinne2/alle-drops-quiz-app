# Handoff — AlleDrops quiz app (2026-05-10 session 22)

### Status: E2E bracket test suite complete and passing. All pre-launch engineering gates closed.

---

## What's actually built (post-session 22)

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
| E2E bracket test suite (`scripts/e2e-test.ts`) | ✅ done | PR #12 / `981330d` |
| Custom domain `quiz.allerdrops.com` | ⏸ blocked on client | — |

**46/46 tests passing. Typecheck clean. Deployed to Fly.**

---

## E2E test suite — confirmed passing (session 22)

`scripts/e2e-test.ts` ran clean against the deployed Fly app:

```
Step 1: POST submissions          ✓ 0-2 TN / 3-6 TX / 7+ TN
Step 2: DB row verification       ✓ bracket, state, consent_version, answers, history
Step 3: Customer ledger           ✓ all 3 IDs appear in /api/me/assessments
Step 4: PDF verification          ✓ all 3 PDFs: valid Content-Type + %PDF magic bytes
Step 5: Cleanup                   ✓ 3 test rows deleted
=== ALL STEPS PASSED ===
```

### How to run it

Prerequisites:
1. **Cloud SQL Auth Proxy** running on port 5433:
   ```bash
   /opt/homebrew/share/google-cloud-sdk/bin/cloud-sql-proxy \
     alledrops-quiz:us-east1:alledrops-quiz-data \
     --port=5433
   ```
2. `.env` must have (use `127.0.0.1` not `localhost` — Docker occupies `::1:5433`):
   ```
   DATABASE_URL=postgresql://alledrops_app:merrimack1@127.0.0.1:5433/alledrops_quiz_dev?sslmode=disable
   SHOPIFY_API_SECRET=<from Partners dashboard or shopify app env pull>
   SHOPIFY_API_KEY=<from Partners dashboard or shopify app env pull>
   ```
3. Run: `npx tsx scripts/e2e-test.ts`

### Auth mechanism (corrected from prior HANDOFF)

`/api/me/*` uses **JWT Bearer tokens** (HS256, signed with `SHOPIFY_API_SECRET`), not HMAC. The script mints a JWT with a fake `gid://shopify/Customer/E2ETEST{timestamp}` as `sub`, stamps that GID onto the test rows via direct SQL, then uses it for ledger + PDF lookups.

### Known gotcha: Docker on localhost:5433

Docker binds to `::1:5433` (IPv6). The Cloud SQL proxy binds to `127.0.0.1:5433` (IPv4). When `localhost` resolves to `::1` first, connections hit Docker instead of the proxy. Always use `127.0.0.1` explicitly in DATABASE_URL.

---

## What's NOT built (remaining pre-launch gates)

### 1. Consent text finalization

`consent_version` is captured per submission (value: `'draft-2026-05-09'`). When William/counsel finalizes the consent text, update the text in `ConsentStep.tsx` and bump `CONSENT_VERSION` in `app/lib/consent-version.ts` to `'v1.0-YYYY-MM-DD'`.

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

## Plan B — Theme relic cleanup (separate repo)

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

- **Active branch:** `main` (session 22 changes merged and pushed)
- **Fly app:** `alle-drops-quiz-app` — deployed and healthy
- **How to verify:** `npm test` (46 pass), `npm run typecheck` (clean), `npx tsx scripts/e2e-test.ts` (all steps pass)
- **Cloud SQL password:** `alledrops_app` / `merrimack1` (reset this session — Fly secret updated)
- **Key files:**
  - `scripts/e2e-test.ts` — E2E test suite (complete)
  - `app/lib/consent-version.ts` — bump to `v1.0-YYYY-MM-DD` when counsel finalizes text
  - `app/components/quiz/ConsentStep.tsx` — update consent text when finalized
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
