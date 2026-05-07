# AlleDrops MVP — Task State

Last updated: 2026-05-07

## Done
- [x] Cloud SQL provisioned (`alledrops-quiz-data`, Postgres 18, us-east1)
- [x] BAA NOT signed yet — dev environment, synthetic data only
- [x] Migration `001_create_submissions.sql` applied to `alledrops_quiz_dev`
- [x] `pg` and `@types/pg` added to package.json
- [x] `app/lib/db.ts` — TLS pool with `sslmode=no-verify` for dev
- [x] `app/lib/submissions.ts` — insert + ledger + by-id-for-customer reads
- [x] `app/lib/shopify/metafields.ts` — gutted to non-PHI only (last_completed_at, quiz_count)
- [x] `app/routes/api.quiz.submit.tsx` — Sheets removed, INSERT to Cloud SQL
- [x] `app/lib/google-sheets.ts` — neutered to throw on call (regression guardrail)
- [x] `app/routes/app.quiz-results.tsx` — replaced with Phase 2 placeholder
- [x] DATABASE_URL set as Fly secret with `sslmode=no-verify`
- [x] **E2E verified** — submission `c99cdafc-fa44-4565-8f17-1e6528502f57` landed in Cloud SQL via curl

## In progress
*(nothing — pick from below)*

## Next up — Thread A (display layer, engineering, unblocked)

### A1. PDF generation endpoint
- [x] Pick a PDF library: `pdfkit` (lightweight, programmatic) or `puppeteer-core + @sparticuz/chromium` (HTML→PDF, prettier output, heavier on Fly)
- [x] Add to package.json
- [x] New route: `GET /api/me/assessment/:id/pdf`
  - Verifies Shopify Customer Account session token
  - Resolves customer_id_shopify or email from token
  - Calls `getSubmissionByIdForCustomer` (already exists in `app/lib/submissions.ts`)
  - Generates visit-summary PDF (full PHI: name, dob, email, phone, score, bracket, answers, history if present, consent ack)
  - Returns PDF binary with `Content-Disposition: attachment`
- [x] Don't load any third-party fonts/scripts in the PDF rendering path. Keep all assets local.
- [x] Don't log the PDF body or PHI fields anywhere.
- [ ] Test path: hit endpoint with a fake session token, confirm 401; with a valid token, confirm correct PDF returns

### A2. Ledger list endpoint
- [ ] New route: `GET /api/me/assessments`
  - Verifies Shopify Customer Account session token
  - Calls `listSubmissionLedger` (already exists)
  - Returns `[{ id, symptom_profile_id, completed_at }]` (NO scores, NO PHI in the list — that's the ledger pattern)

### A3. Customer Account UI extension refactor
- [ ] `extensions/quiz-history/` — currently reads metafields that no longer exist
- [ ] Refactor to call `/api/me/assessments` for the list
- [ ] Render a date-only list with a "Download PDF" button per row
- [ ] Button calls `/api/me/assessment/:id/pdf`, browser downloads

### A4. Verify in dev
- [ ] Submit a quiz from a logged-in customer on the dev storefront
- [ ] Open the customer's account page → confirm the assessment shows up
- [ ] Click Download PDF → confirm the PDF contains the right data and only that customer's data

## Next up — Thread B (iframe + custom domain, engineering)

### B1. Custom domain on Fly
- [ ] Decide subdomain — temp `quiz.allerdrops.com` (Andrew's domain) is fine for dev; production cuts over to `quiz.alledrops.com`
- [ ] `fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`
- [ ] Add the DNS records Fly tells you to (A/AAAA/CNAME) on `allerdrops.com`
- [ ] Wait for cert provision, confirm `https://quiz.allerdrops.com/health` returns 200

### B2. `/quiz/embed` route on Fly
- [ ] New route serving full HTML (not just the bundle)
- [ ] Strict Content-Security-Policy header — no third-party scripts allowed
- [ ] No analytics, no chat, no review tools, no session replay — see CLAUDE.md compliance rules
- [ ] AlleDrops branding via local CSS only (no Google Fonts CDN, no font loading from outside)
- [ ] postMessage handlers for resize and post-completion redirect
- [ ] Test the page renders on quiz.allerdrops.com

### B3. Theme App Block as iframe wrapper
- [ ] Update `extensions/quiz-block/blocks/symptom-quiz.liquid`
- [ ] Replace script-tag injection with iframe pointing at `https://quiz.allerdrops.com/quiz/embed`
- [ ] Add iframe-resize JS in the parent (listens for postMessage from embed)
- [ ] Remove the "Cloudflare Worker URL" customizer field from the schema
- [ ] `shopify app deploy` — push updated block to Shopify

### B4. Worker deletion
- [ ] `wrangler delete` (in theme repo's `cloudflare-worker/`)
- [ ] Remove `cloudflare-worker/` directory from theme repo

## Andrew / William (coordination, parallel)

- [ ] **Email William** — combined ask: DNS access on `alledrops.com`, AOD GCP project + BAA plan, consent text review, in-house counsel hand-off, Fly BAA conversation kickoff
- [ ] Fly.io BAA sales conversation initiated
- [ ] Counsel review of architecture (non-blocking, parallel)
- [ ] Counsel-drafted Notice of Privacy Practices
- [ ] Privacy/Security Officer designation in writing (William)
- [ ] Workforce HIPAA training plan
- [ ] Confirm TN and TX state telehealth requirements

## Pre-launch gates (blocking real patients, NOT engineering)

- [ ] Production cutover to AOD's GCP project + AOD-signed Cloud BAA
- [ ] Fly BAA executed
- [ ] Counsel sign-off on architecture
- [ ] NPP integrated into consent flow
- [ ] Privacy/Security Officers designated
- [ ] Workforce training complete
- [ ] Audit logging enabled in Fly app
- [ ] Breach response runbook written

## Done-for-now / deferred to Phase 2

- Shopify Admin extension UI (provider/admin view) — `app/routes/app.quiz-results.tsx` is a placeholder
- Provider review queue with status changes (new → reviewed → contacted → scheduled)
- Real-time provider notifications
- Multi-tenant support
- Audit dashboards

## Hosting evaluation (decide before signing Fly BAA)

Vercel announced HIPAA BAAs included with Pro Team plan in 2026. Potential cost savings vs. Fly's $99/mo Compliance Package. Decision point: before Fly BAA is signed at production cutover.

Migration effort estimate (3–5 days):
- React Router 7 → Vercel deploy: officially supported, ~1 day
- Move Shopify session storage from SQLite/Litestream to Postgres (Cloud SQL) or Upstash Redis: ~1 day
- Add pgbouncer or switch to serverless-friendly Postgres client (Vercel cold starts exhaust connections otherwise): ~0.5–1 day
- Theme App Block + Customer Account extension URL updates: trivial
- DNS, custom domain, certs on Vercel: ~1 hour
- Full E2E retest: ~1 day

Don't migrate while engineering is mid-flight. Spike on a branch when there's a natural pause (e.g., between Thread A and Thread B), measure real numbers, decide at cutover time.
