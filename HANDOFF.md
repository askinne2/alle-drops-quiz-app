# Handoff — AlleDrops quiz app (2026-05-10 session 23)

### Status: All pre-launch engineering gates closed. Modal redesigned. Pending: `fly deploy` + theme relic cleanup.

---

## What's actually built (post-session 23)

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
| Admin assessment modal redesign (clinical UX) | ✅ committed | `b4ef25a` — **needs `fly deploy`** |
| Custom domain `quiz.allerdrops.com` | ⏸ blocked on client | — |

**46/46 tests passing. Typecheck clean.**

---

## Immediate action needed

```bash
fly deploy -a alle-drops-quiz-app
```

The modal redesign (`b4ef25a`) is committed to `main` but the Fly machine is running the previous image. One deploy gets it live.

---

## E2E test suite — confirmed passing (session 22)

`scripts/e2e-test.ts` ran clean against the deployed Fly app.

### How to run it

1. **Cloud SQL Auth Proxy** on port 5433:
   ```bash
   /opt/homebrew/share/google-cloud-sdk/bin/cloud-sql-proxy \
     alledrops-quiz:us-east1:alledrops-quiz-data \
     --port=5433
   ```
2. `.env` — use `127.0.0.1` not `localhost` (Docker occupies `::1:5433`):
   ```
   DATABASE_URL=postgresql://alledrops_app:<password>@127.0.0.1:5433/alledrops_quiz_dev?sslmode=disable
   SHOPIFY_API_SECRET=<from shopify app env pull>
   SHOPIFY_API_KEY=<from shopify app env pull>
   ```
   Get the current password from Fly: `fly ssh console -a alle-drops-quiz-app -C "printenv DATABASE_URL"`
3. Run: `npx tsx scripts/e2e-test.ts`

### Known gotchas

- **Docker on localhost:5433** — Docker binds `::1:5433` (IPv6); proxy is on `127.0.0.1:5433` (IPv4). Always use `127.0.0.1` in local DATABASE_URL.
- **Fly DATABASE_URL** must use the Cloud SQL public IP `34.139.97.17:5432` with `sslmode=no-verify` — not `localhost`.
- **pg URL parser** mangles special chars in passwords. Script uses `new URL()` to parse explicitly — this is intentional, don't revert.
- **Auth on `/api/me/*`** is JWT Bearer (HS256, `SHOPIFY_API_SECRET`), not HMAC. The script mints a JWT with a fake customer GID and stamps it on test rows via SQL.

---

## Admin modal redesign (session 23)

`app/routes/app.quiz-results.tsx` — committed `b4ef25a`, needs deploy.

What changed:
- Score + color-coded bracket badge (green 0-2 / amber 3-6 / red 7+) as visual anchor
- 2-column patient info grid
- Section headers: Patient Information / Symptom Responses / Medical History
- Severity pills on answers (never → green, daily → red)
- Medical history as tag chips
- UUID/Profile ID demoted to small monospace utility row
- Download PDF button with icon; Close as ghost button

---

## What's NOT built (remaining pre-launch gates)

### 1. Consent text finalization

`consent_version` captured per submission (value: `'draft-2026-05-09'`). When counsel finalizes:
- Update consent text in `app/components/quiz/ConsentStep.tsx`
- Bump `CONSENT_VERSION` in `app/lib/consent-version.ts` to `'v1.0-YYYY-MM-DD'`

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

- **Active branch:** `main`
- **Fly app:** `alle-drops-quiz-app` — healthy, but needs `fly deploy` for modal redesign
- **How to verify:** `npm test` (46 pass), `npm run typecheck` (clean)
- **Cloud SQL password:** changed this session — retrieve from `fly ssh console -a alle-drops-quiz-app -C "printenv DATABASE_URL"`
- **Key files:**
  - `scripts/e2e-test.ts` — E2E test suite
  - `app/routes/app.quiz-results.tsx` — admin submissions page + modal (redesigned)
  - `app/lib/consent-version.ts` — bump when counsel finalizes consent text
  - `app/components/quiz/ConsentStep.tsx` — update consent text when finalized
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
