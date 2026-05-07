# AlleDrops Symptom Quiz — Shopify App

> **STOP — read these compliance rules before touching anything.**
>
> 1. This app handles **PHI** (Protected Health Information) for a telehealth allergy clinic. HIPAA applies.
> 2. **Never** write PHI to Shopify metafields, customer record fields, or any Shopify Admin API payload. PHI lives in Cloud SQL only.
> 3. **Never** add Google Sheets, Google Drive, Google Docs, or any Google Workspace product to the PHI path. Workspace BAA does not cover Apps Script-driven Sheets writes.
> 4. **Never** add analytics, session-replay, chat widgets, or third-party tracking scripts to any page that collects PHI. Specifically: no Google Analytics, GTM, Klaviyo, Meta Pixel, Hotjar, FullStory, Segment, Intercom, etc. on the quiz embed page.
> 5. PHI fields are: `name`, `dob`, `phone`, `email`, `state` (when tied to identity), `quiz_score`, `score_bracket`, `answers`, `personal_history`, `family_history`. Treat the entire `submissions` table as PHI.
> 6. Non-PHI flags allowed in Shopify metafields: `alledrops.last_completed_at` (date), `alledrops.quiz_count` (int). Nothing else.

---

## What this app is

A Shopify app that hosts a clinical symptom quiz for **Allergist on Demand (AOD) / AlleDrops** — a telehealth allergy clinic serving patients in **Tennessee and Texas only**. Patients answer the questionnaire, receive a score (bracket: 0–2 / 3–6 / 7+), and depending on bracket are routed to consult / purchase / additional medical history paths.

The app runs on **Fly.io** (`alle-drops-quiz-app`) and consists of:

- **Theme App Block extension** (`extensions/quiz-block/`) — embeds the quiz on the storefront. Currently injects a script tag; the MVP plan converts it to an iframe.
- **Customer Account UI extension** (`extensions/quiz-history/`) — surfaces a ledger of completed assessments to logged-in patients with a Download PDF button.
- **Web app** (React Router 7 / `app/`) — hosts the quiz bundle, the submission API, and (eventually) the PDF generation endpoint and admin views.
- **Embedded admin app** — Shopify-embedded admin pages. The `app/quiz-results` route is currently a Phase 2 placeholder.

## Architecture (current state)

```
Storefront page (Shopify) ─ Theme App Block injects React quiz bundle
        │
        ▼ POST /api/quiz/submit
Fly app
   ├─► Cloud SQL Postgres (PHI) — writes full submission row
   └─► Shopify Admin API — writes only last_completed_at + quiz_count metafields

Logged-in patient on /account
   └─► Customer Account UI extension reads metafields (current) — refactor in progress
       Future: calls Fly API for ledger list + PDF download
```

**Architecture target (MVP plan):**
- Quiz collection moves to a **cross-origin iframe** (`quiz.alledrops.com` or temporary `quiz.allerdrops.com`). Same-origin policy prevents storefront third-party scripts from reading PHI off the form.
- Customer Account extension calls Fly API directly instead of reading metafields.
- PDFs generated on demand from Cloud SQL data; served via session-authenticated direct download (Shopify is not in PDF data path).

Full plan: `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`
Council verdict: `~/Documents/Claude/Projects/AoD/council-report-2026-05-06.html`
Verbatim consent text: `~/Documents/Claude/Projects/AoD/aod-consent-text.md`

## Current dev infra

| Layer | Value |
|---|---|
| GCP project (dev) | `alledrops-quiz` (under `21adsmedia.com` org, Andrew's account) |
| Cloud SQL instance | `alledrops-quiz-data` (Postgres 18, us-east1) |
| Cloud SQL public IPv4 | `34.139.97.17` |
| Database | `alledrops_quiz_dev` |
| App user | `alledrops_app` |
| TLS mode | `ENCRYPTED_ONLY` — connect with `sslmode=no-verify` (dev) |
| Authorized network | `216.246.40.114/32` (Fly egress) |
| Fly app | `alle-drops-quiz-app` |
| Fly region | `iad` |

Production cutover (task #10) moves all of this to AOD's own Google Cloud project under their BAA. Don't bake in 21adsmedia ownership anywhere.

## Key files

```
app/
├── routes/
│   ├── api.quiz.submit.tsx           # POST endpoint — INSERTs to Cloud SQL, writes non-PHI metafields
│   ├── app.quiz-results.tsx          # Phase 2 placeholder — formerly read PHI from metafields
│   └── ...
├── lib/
│   ├── db.ts                         # pg pool (TLS, lazy-init)
│   ├── submissions.ts                # insertSubmission, listSubmissionLedger, getSubmissionByIdForCustomer
│   ├── google-sheets.ts              # DEPRECATED — throws on call (guardrail)
│   ├── quiz-validation.ts            # Payload validation. Comment header explains PHI rules.
│   └── shopify/
│       ├── customers.ts              # findOrCreateCustomer
│       └── metafields.ts             # ONLY non-PHI: getCustomerMetafield + updateNonPhiQuizMetafields
└── components/quiz/                  # React quiz UI (state gate, parts 1-5, consent, etc.)

extensions/
├── quiz-block/                       # Theme App Block — injects the storefront quiz
└── quiz-history/                     # Customer Account UI extension (refactor pending)

migrations/
└── 001_create_submissions.sql        # Run in Cloud SQL Studio against alledrops_quiz_dev
```

## Common commands

```bash
# Type check
npm run typecheck

# Local dev server
npm run dev

# Build the quiz bundle that gets injected by the theme app block
npm run build:theme

# Deploy to Fly
fly deploy -a alle-drops-quiz-app

# Watch live logs
fly logs -a alle-drops-quiz-app

# Set / view secrets
fly secrets list -a alle-drops-quiz-app
fly secrets set DATABASE_URL="..." -a alle-drops-quiz-app

# Deploy Shopify extensions only (does NOT deploy Fly)
shopify app deploy
```

## Development workflow

- **Always work on a feature branch.** Never commit directly to `main`.
- **Branch naming:** `thread-<letter>-<short-description>` for in-flight MVP work (e.g., `thread-a-pdf-and-ledger`, `thread-b-iframe`). Use `phase-2-<description>` for post-MVP work, `fix-<description>` for bug fixes.
- **End of work:** push the branch and propose a PR. Don't merge to main yourself — Andrew reviews and merges. The PR description should call out anything PHI-relevant (auth changes, new routes that read PHI, changes to logging, new dependencies).
- **PR-style review is required for HIPAA-relevant changes.** That includes anything that touches `app/lib/db.ts`, `app/lib/submissions.ts`, `app/routes/api.*`, `app/routes/api.me.*`, customer auth, PDF generation, or `app/lib/shopify/metafields.ts`.
- **Tests must pass before pushing.** Run `npm run typecheck && npm test` (or whatever test target exists). If tests don't exist for the change, write them.
- **Don't deploy from a branch.** `fly deploy` runs against `main` after the PR is merged. Andrew runs the deploy.

### Self-review checklist for PHI-handling changes

Before opening a PR that touches anything in the PHI path, confirm:

- [ ] No `console.log` / `console.error` of name, dob, email, phone, score, bracket, answers, history, or full row objects. Log IDs and counts only.
- [ ] All routes that return PHI verify the requester's identity *before* the database query (auth check, then ownership check via `customer_id_shopify` or `email`).
- [ ] All database lookups for PHI use `getSubmissionByIdForCustomer` or equivalent ownership-bounded helpers — never raw `WHERE id = $1` without a customer/email constraint.
- [ ] Error responses do not echo PHI (e.g., don't return "patient John Doe not found" — return "submission not found").
- [ ] No PHI-shaped values in URL paths, query strings, or referrer headers (use POST bodies or path params with opaque IDs only).
- [ ] If adding a new external dependency, confirm it doesn't make outbound network calls during PHI processing (no telemetry, no auto-update checks). For PDF generation specifically: no remote fonts, no remote images, no remote CSS.
- [ ] If touching the iframe embed page or any quiz-collection surface, confirm no third-party scripts were added — see compliance rules at the top of this file.

## Common pitfalls

- **`shopify app deploy` does not deploy the Fly app.** It only ships extensions and config to Shopify. The Fly web service has its own deploy via `fly deploy`. Three deploy systems for this project: Shopify, Fly, and historically Cloudflare (worker is being retired).
- **The Theme App Block reads `apiEndpoint` from `window.AlleDropsQuizConfig`.** This was previously controllable via a "Cloudflare Worker URL" customizer field; that field should be left blank or removed, otherwise submissions bypass Fly entirely.
- **Customer Account UI extensions only render in Shopify's customer accounts UI** (a different surface than the storefront theme), so they don't pick up theme styles or storefront scripts.
- **The Customer Account UI extension currently still reads PHI metafields that no longer exist.** It needs refactoring to call the Fly API instead. Until that's done, the dashboard will show empty state in dev.
- **Sessions are stored in SQLite via Prisma + Litestream** (see `fly.toml` mounts). PHI submissions are in Postgres (Cloud SQL). Two distinct stores, do not conflate.
- **`pg` and `?sslmode=require`:** if the connection string has `?sslmode=require`, Node's `pg` library tries to verify the server cert against the system CA bundle and fails for Cloud SQL. Use `?sslmode=no-verify` for dev, or pin the Cloud SQL server CA for prod.

## Testing the submission pipeline E2E

```bash
# 1. Confirm secrets
fly secrets list -a alle-drops-quiz-app
# DATABASE_URL must be present

# 2. Tail logs
fly logs -a alle-drops-quiz-app

# 3. Fire a test submission
curl -i -X POST https://alle-drops-quiz-app.fly.dev/api/quiz/submit \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.myshopify.com" \
  -d '{
    "state": "tennessee",
    "name": "E2E Test Patient",
    "dob": "1990-01-15",
    "email": "e2e+test@example.com",
    "phone": "6155551234",
    "symptom_profile_id": "AOD_E2E_001",
    "quiz_score": 9,
    "score_bracket": "7+",
    "quiz_date": "2026-05-06T18:00:00.000Z",
    "answers": {"taking_meds": "no"},
    "completion_time": 120
  }'

# 4. Confirm row in Cloud SQL Studio
#    SELECT id, symptom_profile_id, patient_state, score_bracket, created_at
#    FROM submissions ORDER BY created_at DESC LIMIT 5;

# 5. Cleanup
#    DELETE FROM submissions WHERE patient_email = 'e2e+test@example.com';
```

## Open work (see ~/Documents/Claude/Projects/AoD/aod-mvp-plan.md for full plan)

- [ ] Customer Account UI extension refactor — read submissions from Fly API, not metafields
- [ ] PDF generation endpoint on Fly (`GET /api/me/assessment/{id}/pdf`)
- [ ] Theme App Block → cross-origin iframe (`quiz.allerdrops.com` / eventually `quiz.alledrops.com`)
- [ ] Custom domain on Fly (`fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`)
- [ ] Fly.io BAA — sales conversation
- [ ] Production cutover to AOD's Google Cloud project (Andrew's GCP project is dev only)
- [ ] In-house counsel review (parallel, AOD-side)
- [ ] NPP draft, Privacy/Security Officer designation, workforce HIPAA training (AOD-side, must complete before first real patient)

## When in doubt

If a task could plausibly involve PHI, default to: route through Fly + Cloud SQL, never touch Shopify or any Google Workspace surface, never add scripts to the iframe page, ask before introducing a new third-party dependency.
