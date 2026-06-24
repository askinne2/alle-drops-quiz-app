# Handoff — AlleDrops quiz app (2026-06-24 session 27)

### Status: Engineering still essentially done. Today was an emergency DB recovery before an AOD call, plus domain-ownership research and policy-page drafting. Security branch `fix-security-findings` @ `596210e` still pending PR + merge (untouched today).

---

## ⚠️ Session 27 (2026-06-24) — what happened today

### 1. CRITICAL incident — Cloud SQL was SUSPENDED (RESOLVED)
Right before an AOD client call, quiz **save** ("Could not save assessment") and patient
**history** ("Unable to load your assessment history") were both failing. Live submit
returned `500 {"error":"Could not save assessment","details":"Connection terminated due
to connection timeout"}`.

- **Root cause:** Cloud SQL instance `alledrops-quiz-data` was in state **`SUSPENDED`**
  (suspended by Google, ~June 6). Billing lapse on the **"Beautiful Rescues" billing
  account** (`01860C-FD5E7A-41B5EC`) that the `alledrops-quiz` project is attached to.
  App/code were healthy and untouched since May 10. No data lost (suspended ≠ deleted).
- **Fix:** Andrew updated billing → instance went `SUSPENDED → MAINTENANCE → RUNNABLE`
  (~15:29). Live submit re-tested = **`200`**. Read path uses same pool, also recovered.
  Note: `gcloud sql instances restart/patch` both 409'd while SUSPENDED — only the
  billing fix in the Console lifts it.
- **⬜ LEFTOVER TODO for Andrew:** delete the one diagnostic test row so it doesn't show
  in the admin demo table:
  `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`
- **Lesson → agenda item:** dev DB silently dying for 18 days on an unrelated billing
  account is the concrete argument for the **production GCP migration to AOD's own
  project under their BAA.**

### 2. Account / sign-in pages dark-green theme (RESOLVED by Andrew)
The hunter-green on `/account`, profile, and sign-in is **NOT** in the theme repo. Those
are Shopify **new customer accounts** (URL `shopify.com/<id>/account/...`), styled in the
**Settings → Checkout and customer accounts** branding editor (Color palette), not Liquid.
Separately, the storefront theme's `config/settings_data.json` has the same greens
(`#2c3e3f`, `#2e2a39`) in its color schemes — that affects storefront sections only, a
different surface. Andrew adjusted the branding editor; considered fixed.

### 3. Domain ownership — clarified from email history (IMPORTANT)
- Andrew owns **`allerdrop.com`** (singular) on Cloudflare — a **dead placeholder** he
  reserved Sept 24 2025 for the abandoned "AllerDrop" name, which was **killed by a live
  federal trademark `ALLERDROPS®` (Class 044, sublingual immunotherapy, Maryland)**.
  Project does not use it. Can be left to lapse.
- The real brand domain is **`alledrops.com`** (company = Allergist on Demand, product =
  AlleDrops). Per Oct 2025 emails, Andrew **explicitly declined to register it** ("I prefer
  not to own/purchase on behalf of clients"); William said their **Legal Director (Jean
  Caceres)** would register it "to keep organized." Jean later emailed with subject
  "Alledrops.com." **Never confirmed back whether alledrops.com was actually registered or
  who holds it** — this is an open question for the client.
- **DNS task is on the client**, not Andrew. Once they confirm ownership + give DNS access
  (or add a CNAME), wire production via `fly certs create quiz.alledrops.com -a
  alle-drops-quiz-app`. (Prior handoffs said `quiz.allerdrops.com` — that spelling was
  WRONG; corrected throughout.)

### 4. Andrew has NEVER sent William any emails
The `email-to-william-*.md` files in `~/Documents/Claude/Projects/AoD/` were drafted but
**never sent**. So the entire launch punch-list (DNS, prod GCP+BAA, NPP, privacy policy,
treatment copy, officer designations, clinical content) has **never been communicated to
the client.** The serve is on Andrew, not them. Strong next move: refresh the May 8 punch
list and actually send it, with the policy drafts attached.

### 5. Policy-page drafts created (starting points for counsel)
New folder: **`~/Documents/Claude/Projects/AoD/policy-drafts/`**
- `00-READ-FIRST.md` — orientation; flags the blocking question "who is the covered
  entity?" (AOD platform may be a business associate of the providers' professional
  entity) and lists all `[BRACKET]` decisions.
- `01-notice-of-privacy-practices.md` — HIPAA NPP (didn't exist before).
- `02-privacy-policy.md` — **merged** the live Shopify default template (Aug 23 2025) with
  HIPAA-aware language. Key work: carved health info OUT of marketing / "sale" / "share" /
  targeted-advertising in 5 places. Removed `andrew@21adsmedia.com` contact.
- `03-treatment-policy.md` — fills the `[PENDING]` consent-screen placeholder + refund
  rules for compounded Rx.
- `04-quiz-disclaimer.md` — reworded disclaimer (current one mischaracterizes a scored
  clinical questionnaire as "product recommendation only").
- All are non-binding drafts for AOD counsel. **Not yet wired into app/theme.**
- ⚠️ Privacy-policy carve-outs are only TRUE if the live Shopify store actually has no
  PHI fed to Shopify ads/audiences and no Pixel/GA/Klaviyo on collection pages — **audit
  the live store settings before publishing** (compliance + accuracy).

Also generated: `~/Documents/Claude/Projects/AoD/AOD Call Agenda — June 24.md`.

### 6. POST-CALL — AOD call happened (6/24), production migration GREENLIT
The call took place. Outcome: prod infra migration is now agreed and sequenced. Notes in
`~/Documents/Claude/Projects/AoD/` + transcript in Notion (21ads workspace,
page `389ca3e67e1b8010aaffe7f30ba2f465`).

**Migration sequence (William's side, then Andrew's):**
1. William sets up **AOD Google Workspace** (~$6–12/mo) — manages domains + email + the
   Google Cloud DB. Enables **BAA** under *Account Settings → Legal and Compliance*
   (opt-in checkbox). Loops in IT: **Robert** (replaced Paul) and **Gene**.
2. William sets up **AOD Shopify** (Basic/Grow, ~$20/mo).
3. Team grants **Andrew admin** on both → Andrew **migrates the Cloud SQL DB** to AOD's
   Workspace-owned Google Cloud and **transfers the Shopify site**.
4. Andrew does **NOT** want long-term PHI access post-migration.

**⬜ Andrew's action items from the call:**
- [ ] Write step-by-step setup instructions in the **shared Google Doc (new tab)** —
      covering Google Workspace, Shopify, BAA enablement, and adding Andrew as admin.
- [ ] After accounts exist + admin granted: migrate DB + transfer Shopify site.
- [ ] Configure the **scheduling app as a Shopify plugin** (the optional ~$99 consult)
      once accounts are set up.
- [ ] Confirm with William the **exact domain spelling** (see flag below) before he
      registers it.

**🚩 DOMAIN SPELLING — UNCONFIRMED, resolve before William registers domains.**
Call notes list two domains for the new Workspace: **`aod.services`** (new — corporate/
email) and **`allerdrops.com`** (R+S). But the Oct 2025 decision was **`AlleDrops` /
`alledrops.com`** (no R), *because* `AllerDrops` collides with the live trademark
**`ALLERDROPS®` (Class 044, SLIT)**. Likely an AI-notetaker mishearing "Alle Drops," but
NOT verified. Andrew (6/24) is unsure which was actually agreed. **Confirm directly with
William** (transcript is also auto-generated, not authoritative). If it really is
`allerdrops.com`/"AllerDrops", re-raise the trademark before anyone buys/configures it.
Andrew's own dead `allerdrop.com` (singular) is unrelated to both.

**Policy drafts — received well.** The consent draft, treatment policy, and privacy policy
were shared with William's team to review and place on the AOD site. Disclaimer fix
(draft `04`) explicitly confirmed as a pre-launch must. Policy docs will live in the
shared Google Doc.

**Other:** Geo scope re-confirmed TN + TX only. William will run an internal live
walkthrough with his team (Andrew not required). Shared Google Doc stays the central
collaboration space.

### 7. SENT to William (end of session 27)
- ✅ Email sent to William (via Missive) — confirms domain spelling + trademark caveat,
  flags the setup doc, says ready to migrate once admin access is granted.
- ✅ Setup instructions delivered into the shared Google Doc (Workspace + domains + BAA
  opt-in path + Shopify + grant-Andrew-admin + post-migration steps). Source draft:
  `~/Documents/Claude/Projects/AoD/policy-drafts/setup-instructions-for-google-doc.md`.
- **Ball is now in William/Robert/Gene's court:** confirm domain spelling, create the
  accounts, enable the BAA, grant Andrew admin. Then Andrew executes the migration.
- NOTE: all AoD policy + setup drafts live OUTSIDE this repo at
  `~/Documents/Claude/Projects/AoD/policy-drafts/` (not committed here).

---

## What's actually built

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
| Admin assessment modal redesign (clinical UX) | ✅ deployed | `b4ef25a` |
| Doc cleanup — stale plans, status docs, investigation artifacts | ✅ done | `d0632b5` |
| Simplify refactor — shared format utils, hoisted lookups, HistoryTagList | ✅ done | `4a81abf` |
| Theme relic cleanup (allergist-on-demand repo) | ✅ done | PRs #1, #2 |
| Sense theme upgrade 15.4.0 → 15.4.1 | ✅ done | PR #2 |
| Security hardening — all 3 findings fixed | ✅ branch ready | `fix-security-findings` @ `596210e` |
| Custom domain `quiz.alledrops.com` | ⏸ blocked on client | — |

**47/47 tests passing. Typecheck clean.**

---

## Security findings — FIXED (session 26, pending merge)

All three are on branch `fix-security-findings` (commit `596210e`). PR not yet opened.

### 1. JWT `aud` check ✅ fixed
**File:** `app/lib/customer-auth.ts`
`SHOPIFY_API_KEY` now required at call time — throws `'SHOPIFY_API_KEY not configured'` if absent. `audience` always passed to `jwtVerify`. New test covers the fail-closed path.

### 2. Bearer token via `?token=` URL param ✅ fixed
**File:** `app/routes/api.me.assessment.$id.pdf.tsx`
`url.searchParams.get('token')` fallback removed. `Authorization: Bearer` header is the only accepted path.

### 3. `dbErr.message` in 500 response body ✅ fixed
**File:** `app/routes/api.quiz.submit.tsx`
`details` field stripped from error response. Callers get `{ error: "Could not save assessment" }` only.

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

## Theme relic cleanup — completed (session 25)

All legacy quiz system artifacts removed from `allergist-on-demand` Shopify theme repo.

**What was deleted:**
- `sections/symptom-quiz.liquid` — orphaned (quiz page already used Theme App Block)
- `sections/quiz-results.liquid` — old inline results display, referenced deleted CSS
- `assets/symptom-quiz.js/.css`, `quiz-config.js`, `quiz-results.js`, `google-sheets-integration.js`
- `cloudflare-worker/` — decommissioned worker that proxied PHI to Google Sheets
- `google-apps-script/` — Apps Script receiving PHI into Sheets (HIPAA violation)
- PHI metafield reads + quiz history JS block from `sections/main-account.liquid`

**What was replaced:**
- `sections/quiz-history.liquid` → minimal redirect to `/account` (template still wires it in)

---

## What's NOT built (remaining pre-launch gates)

### 1. Open PR for security fixes

Branch `fix-security-findings` is committed and verified. Next step: open a PR against `main` and merge.

### 2. Consent text finalization

`consent_version` captured per submission (value: `'draft-2026-05-09'`). When counsel finalizes:
- Update consent text in `app/components/quiz/ConsentStep.tsx`
- Bump `CONSENT_VERSION` in `app/lib/consent-version.ts` to `'v1.0-YYYY-MM-DD'`

---

## Blocked on client / AOD side

| Item | Owner | Notes |
|---|---|---|
| Domains `aod.services` + `alledrops.com`/`allerdrops.com` | William + IT (Robert/Gene) | 🚩 spelling UNCONFIRMED (see session 27 flag). Managed in AOD Google Workspace. Site migrates to this domain — supersedes the old Fly `quiz.*` subdomain plan |
| Fly.io BAA | ~~Andrew~~ **MOOTED** | Migration moves hosting/PHI to AOD-owned **Google Cloud** under Google's BAA. Fly BAA likely no longer needed — confirm where the app itself lands post-migration |
| Production GCP migration | William (setup) → Andrew (execute) | **GREENLIT 6/24.** William stands up AOD Workspace + Google Cloud + BAA, grants Andrew admin; Andrew migrates Cloud SQL DB + transfers Shopify. See session 27 sequence |
| In-house counsel review | William/counsel | Architecture + consent text review (parallel, not blocking engineering) |
| Consent text finalization | William/counsel | Blocks bumping CONSENT_VERSION to v1.0 |
| NPP draft | Counsel | **Starter draft exists** → `~/Documents/Claude/Projects/AoD/policy-drafts/01-notice-of-privacy-practices.md`. Before first real patient |
| Privacy Policy page (replace Shopify default) | Counsel | **Merged starter draft exists** → `policy-drafts/02-privacy-policy.md`. Audit live store ad/tracking settings before publish |
| Treatment policy + quiz disclaimer copy | William/counsel | **Starter drafts exist** → `policy-drafts/03`, `04`. Apply to `ConsentStep.tsx` / `symptom-quiz.liquid` / `ResultsDisplay.tsx` once approved (bump `CONSENT_VERSION`) |
| Privacy/Security Officer designation | William | Before first real patient |
| HIPAA workforce training | William | Before first real patient |
| Send William the launch punch-list | Andrew | Never sent any emails to William yet — refresh May 8 list + attach policy drafts |

---

## Phase 2.5 (explicitly deferred — do not scope into current work)

- Provider review status workflow: `new → reviewed → contacted → scheduled`
- Provider notes on submissions
- Structured audit dashboard (who viewed what, when)
- Bulk operations
- Scheduling integration

---

## Resume context

- **Active branch:** `fix-security-findings` @ `596210e` — ready to PR
- **Fly app:** `alle-drops-quiz-app` — deployed and healthy (main branch, security fixes not yet deployed)
- **How to verify:** `npm test` (47 pass), `npm run typecheck` (clean). DB live: `curl -s -o /dev/null -w "%{http_code}" -X POST https://alle-drops-quiz-app.fly.dev/api/quiz/submit -H "Content-Type: application/json" -H "Origin: https://allergist-on-demand.myshopify.com" -d '{...}'` → expect `200`.
- **Immediate leftover:** delete diagnostic test row → `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`
- **Engineering next action:** `gh pr create` from `fix-security-findings` → `main`, then merge and `fly deploy`
- **Client/content next action:** finalize policy drafts in `~/Documents/Claude/Projects/AoD/policy-drafts/` with counsel; send William the (never-sent) launch punch-list
- **Key files:**
  - `app/lib/customer-auth.ts` — Finding 1 fixed (aud always checked)
  - `app/routes/api.me.assessment.$id.pdf.tsx` — Finding 2 fixed (no ?token= fallback)
  - `app/routes/api.quiz.submit.tsx` — Finding 3 fixed (no dbErr.message in response)
  - `tests/customer-auth.test.ts` — updated + new fail-closed test
  - `app/lib/consent-version.ts` — bump when counsel finalizes consent text
  - `app/components/quiz/ConsentStep.tsx` — update consent text when finalized
- **Theme repo:** `/Users/andrewskinner/Local Sites/allergist-on-demand` — main branch, live on Shopify
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
