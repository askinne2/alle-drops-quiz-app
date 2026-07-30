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
## This project is GSD-managed

Planning state is committed under `.planning/` — `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`,
`STATE.md`, and per-phase plans in `.planning/phases/`. **Read `.planning/ROADMAP.md` and
`.planning/STATE.md` before starting work** to establish the current milestone, the last completed
phase, and any open blockers. Use the `/gsd:*` commands to plan and execute; don't hand-edit
`ROADMAP.md` or `STATE.md` while a phase is mid-execution.

## What this app is

A Shopify app that hosts a clinical symptom quiz for **Allergist on Demand (AOD) / AlleDrops** — a telehealth allergy clinic serving patients in **Tennessee and Texas only**. Patients answer the questionnaire, receive a score (bracket: 0–2 / 3–6 / 7+), and depending on bracket are routed to consult / purchase / additional medical history paths.

The app runs on **Fly.io** (`alle-drops-quiz-app`) and consists of:

- **Theme App Block extension** (`extensions/quiz-block/`) — embeds the quiz on the storefront as a cross-origin iframe pointing at `https://alle-drops-quiz-app.fly.dev`.
- **Customer Account UI extension** (`extensions/quiz-history/`) — surfaces a ledger of completed assessments to logged-in patients with a Download PDF button. Currently shows empty state because it still reads deleted PHI metafields — refactor pending.
- **Web app** (React Router 7 / `app/`) — hosts the quiz bundle, submission API, patient ledger + PDF endpoints, and embedded admin views.
- **Embedded admin app** — Shopify-embedded admin at `app/quiz-results` — full submissions table, filters, detail modal, PDF download, stats dashboard.

## Architecture (current state)

```
Storefront page (Shopify)
  └── Theme App Block → cross-origin iframe → https://alle-drops-quiz-app.fly.dev/quiz-embed
                                                        │
                                                        ▼ POST /api/quiz/submit
                                               Fly app
                                                  ├─► Cloud SQL Postgres (PHI) — full submission row
                                                  └─► Shopify Admin API — last_completed_at + quiz_count only

Logged-in patient on /account
  └── Customer Account UI extension (refactor pending — shows empty state)
      Target: GET /api/me/assessments (JWT Bearer) → Cloud SQL ledger
              GET /api/me/assessment/{id}/pdf       → PDF download

Provider (Shopify admin)
  └── /app/quiz-results → GET /api/admin/submissions + /api/admin/submission/:id → Cloud SQL
```

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

Production cutover moves all of this to AOD's own Google Cloud project under their BAA. Don't bake in 21adsmedia ownership anywhere.

## Key files

```
app/
├── routes/
│   ├── api.quiz.submit.tsx           # POST endpoint — INSERTs to Cloud SQL, writes non-PHI metafields
│   ├── api.me.assessments.tsx        # Patient ledger — JWT Bearer auth, returns submission list
│   ├── api.me.assessment.$id.pdf.tsx # Patient PDF — JWT Bearer auth, ownership check, streams PDF
│   ├── api.admin.submissions.tsx     # Admin list — Shopify session auth, paginated + filterable
│   ├── api.admin.submission.$id.tsx  # Admin detail — Shopify session auth
│   └── app.quiz-results.tsx          # Embedded admin UI — submissions table, modal, PDF download, stats
├── lib/
│   ├── db.ts                         # pg pool (TLS, lazy-init)
│   ├── submissions.ts                # insertSubmission, listSubmissionLedger, getSubmissionByIdForCustomer
│   ├── customer-auth.ts              # JWT Bearer auth for /api/me/* (HS256, SHOPIFY_API_SECRET)
│   ├── format.ts                     # Shared capitalize, formatDate, formatAnswerValue
│   ├── google-sheets.ts              # DEPRECATED — throws on call (guardrail)
│   ├── quiz-validation.ts            # Payload validation. Comment header explains PHI rules.
│   └── shopify/
│       ├── customers.ts              # findOrCreateCustomer
│       └── metafields.ts             # ONLY non-PHI: getCustomerMetafield + updateNonPhiQuizMetafields
└── components/quiz/                  # React quiz UI (state gate, parts 1-5, consent, etc.)

extensions/
├── quiz-block/                       # Theme App Block — cross-origin iframe wrapper
└── quiz-history/                     # Customer Account UI extension (refactor pending)

scripts/
└── e2e-test.ts                       # E2E bracket test suite — runs against deployed Fly app

migrations/
└── 001_create_submissions.sql        # Run in Cloud SQL Studio against alledrops_quiz_dev
```

## Common commands

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Local dev server
npm run dev

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
- **Tests must pass before pushing.** Run `npm run typecheck && npm test`. If tests don't exist for the change, write them.
- **Don't deploy from a branch.** `fly deploy` runs against `main` after the PR is merged. Claude can safely deploy with authorization from Andrew.

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

- **`shopify app deploy` does not deploy the Fly app.** It only ships extensions and config to Shopify. Two separate deploy systems: Shopify (`shopify app deploy`) and Fly (`fly deploy`).
- **Customer Account UI extensions only render in Shopify's customer accounts UI** (a different surface than the storefront theme), so they don't pick up theme styles or storefront scripts.
- **The Customer Account UI extension currently still reads PHI metafields that no longer exist.** It needs refactoring to call the Fly API instead. Until that's done, the dashboard will show empty state in dev.
- **Sessions are stored in SQLite via Prisma + Litestream** (see `fly.toml` mounts). PHI submissions are in Postgres (Cloud SQL). Two distinct stores, do not conflate.
- **`pg` and `?sslmode=require`:** if the connection string has `?sslmode=require`, Node's `pg` library tries to verify the server cert against the system CA bundle and fails for Cloud SQL. Use `?sslmode=no-verify` for dev, or pin the Cloud SQL server CA for prod.
- **Never `git reset --hard` to retroactively branch with uncommitted modifications to tracked files.** The modifications get wiped silently. If commits landed on `main` that should have been on a branch: use `git branch <name>` to mark them, then `git reset --keep` (preserves working tree changes) or `git stash` first. Better: always create the branch *before* starting work.

## Testing the submission pipeline E2E

```bash
# Full E2E suite (requires Cloud SQL proxy on port 5433 + .env with DATABASE_URL + SHOPIFY_API_SECRET)
npx tsx scripts/e2e-test.ts

# Quick manual smoke test
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

# Cleanup after manual test
# DELETE FROM submissions WHERE patient_email = 'e2e+test@example.com';
```

See `HANDOFF.md` for Cloud SQL proxy setup and known gotchas.

## Open work (see ~/Documents/Claude/Projects/AoD/aod-mvp-plan.md for full plan)

- [ ] Customer Account UI extension refactor — read submissions from Fly API, not metafields
- [ ] Custom domain on Fly (`fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`)
- [ ] Fly.io BAA — sales conversation
- [ ] Production cutover to AOD's Google Cloud project (Andrew's GCP project is dev only)
- [ ] In-house counsel review (parallel, AOD-side)
- [ ] Consent text finalization — bump `CONSENT_VERSION` in `app/lib/consent-version.ts` + update `ConsentStep.tsx`
- [ ] NPP draft, Privacy/Security Officer designation, workforce HIPAA training (AOD-side, must complete before first real patient)

## When in doubt

If a task could plausibly involve PHI, default to: route through Fly + Cloud SQL, never touch Shopify or any Google Workspace surface, never add scripts to the iframe page, ask before introducing a new third-party dependency.
