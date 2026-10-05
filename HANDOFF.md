# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-10-05 ~13:00 ET, mid-phase (store transfer sent)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Sister:** `/Users/andrewskinner/Local Sites/allergist-on-demand` (theme)
**Branch:** `docs-08.1-transfer-sent` (this handoff + STATE update; main = `00524ca`)

---

## Goal

**Phase 08.1: AOD infrastructure cutover.** Move the app from Fly to Cloud Run, with Cloud SQL and GCS, inside AOD's own GCP project `aod-production-510006` (org `alledrops.com`) so one Google BAA covers everything. Then transfer the `allergist-on-demand` Shopify store to AOD. Plans are in `.planning/phases/08.1-aod-infrastructure-cutover-port-the-app-fly-to-cloud-run-clo/`.

**Progress:** 10 of 13 plans done. Plan 11: transfer **sent** 2026-10-05; waiting on AOD to accept.

---

## Current state (verified 2026-10-05)

| Surface | State |
|---|---|
| Cloud Run | `alle-drops-quiz-app` in us-east1, URL `https://alle-drops-quiz-app-502519175239.us-east1.run.app`. Runs merged main `998b1e0` as `quiz-app-runtime`. `/health` 200. |
| Cloud SQL | `aod-quiz-db`: Postgres 18, **ENTERPRISE** (not Plus), `db-g1-small`, backups + PITR, `ENCRYPTED_ONLY`, no authorized networks (connector only), deletion protection. DBs `alledrops_quiz` (PHI, migrations 001–005) and `shopify_sessions` (Prisma). 0 submissions (all test data deleted). |
| GCS | `gs://aod-quiz-uploads-prod`: public access blocked, uniform access, 7-day soft delete, `pending/` deleted after 2 days. Empty. |
| Secrets | `quiz-database-url` and `quiz-session-database-url` are at **v2** (v1 had a zsh-mangled host). Also `shopify-api-secret`, `shopify-admin-access-token`, `quiz-db-owner-password` (owner only). No SA key files. |
| Logging | `_Default` exclusion `exclude-token-urls` covers `token=` and `sig=`. |
| Shopify transfer | **Sent 2026-10-05 to `info@allergistondemand.com`** (not hostmaster@alledrops.com: accepting needs plan + card, and info@ is Robert's Shopify login). Banner: "Store transfer ... in progress"; Andrew loses store access on acceptance. Payments: never activated ("Complete setup"). Business entity "Allergist on Demand - entity", store contact still `andrew@21adsmedia.com`, no street address. |
| Shopify apps | Installed: AlleDrops Quiz Production, Shopify Claude Connector, Shopify ChatGPT MCP, Aptly, Flow. Legacy custom apps: **Alledrops Quiz App** (owns the admin token, keep) and **AlleDrops Quiz Worker** (unreferenced anywhere; uninstall in plan 13 after plan 12, irreversible). Dev Dashboard (21 ads org): AlleDrops Quiz Production + AlleDrops Quiz App (May 7, old dev app). Distribution of Production (`300363153409`): **Custom distribution**, locked to allergist-on-demand.myshopify.com, multi-store Plus org checked. |
| Shopify | App version **`alledrops-quiz-production-27`** active. Theme quiz page `app_url` set to the Cloud Run URL by Andrew. Admin, storefront quiz and customer account all run on Cloud Run. |
| Fly | `alle-drops-quiz-app` **scaled to 0**, not destroyed. Rollback: `fly scale count 1 -a alle-drops-quiz-app`, then set the theme `app_url` back to the Fly URL. |
| BAAs | Workspace HIPAA amendment accepted Sep 27, 2026. **Google Cloud HIPAA BAA + Cloud DPA accepted Oct 5, 2026** by hostmaster@alledrops.com (Andrew clicked; get William's written OK for AOD's records). |
| Billing | $50/month budget alert on billing account `01D226-059166-DCF07F` (emails hostmaster). The card on file ends 2478; Robert believes it isn't AOD's and will switch it. |
| Access | Project-level org-policy exception adds 21 ads customer `C03w0y0tb`; `andrew@21adsmedia.com` is Owner. gcloud config **`aod-andrew`**. The `aod` config is hostmaster (billing/org admin). |

**Requirements:** LAUNCH-04 **done**. LAUNCH-06 open until the store transfer is verified and Fly is retired. LAUNCH-05 open (NPP, privacy policy, officers, training — AOD/counsel).

**PRs merged today:** #32 (code port), #37 (URL swap), #38 (signed 15-minute download links, closes #36).

---

## What worked

- **Andrew runs the risky commands with `!`.** Claude Code's auto-mode classifier blocks `gcloud run deploy`, IAM grants, secret writes and some pushes, even with Andrew's OK. Hand him the exact command; don't work around the block.
- **Deploy from a clean worktree of `origin/main`**, using `env.yaml` (non-secret values) plus `--set-secrets`. The full command is in `docs/cloud-run.md`.
- **The org-policy exception** needs `roles/orgpolicy.policyAdmin` at org level for a moment (hostmaster grants it, uses it, then removes it). External-domain Owner can only be added through the console invite, not gcloud.
- **Google Cloud BAA** is only reachable at `https://console.cloud.google.com/tos?id=baa`. It doesn't show on the Privacy & Security page until accepted.

## What didn't work

- **zsh `$P:us-east1`** expands `:u` (uppercase). It broke the first deploy and, silently, the v1 DB secrets: every DB route returned 500 while `/health` stayed 200. **Always brace `${P}`.** `/health` never touches the DB, so it's not evidence the DB works.
- **Customer "Download PDF" had returned 401 since 2026-05-10** (`596210e` removed `?token=` from the PDF route; the extension kept using it). The file link only worked for about 60 s. PR #38 fixed both.

---

## Next steps

1. **Plan 11 finish (waiting on AOD):** email sent 2026-10-05 12:52 ET in the "AOD Info" thread. It asked Robert to (1) accept from info@allergistondemand.com, Basic plan, AOD card, by Mon 10/12 (7-day expiry is from plan notes, not confirmed on Shopify), password page stays on; (2) add AOD legal name + address in Settings → General himself; (3) approve a collaborator request from Andrew. **Andrew must send the collaborator request right after acceptance** (Partner/Dev Dashboard), or plan 12 can't run. Resume signal: `transfer accepted on DATE; apps: AlleDrops Quiz Production, Claude Connector, ChatGPT MCP, Aptly, Flow (+ legacy Alledrops Quiz App, Quiz Worker); distribution: Custom (allergist-on-demand, Plus org)`
2. **Plan 12:** post-transfer app and token check (query in the 08.1-11 checkpoint notes); then tell William it's safe to cancel the empty `1mzvmx-tf` store.
3. **Plan 13:** destroy Fly + Tigris/Litestream (needs Andrew's explicit OK); uninstall legacy "AlleDrops Quiz Worker"; review old Dev Dashboard "AlleDrops Quiz App"; dev-project hygiene (rotate dev DB password, delete non-expiring SA key, remove Fly egress authorized network).
4. **Still open, NOT in the 10/5 email (Andrew cut them):**
   - William's written OK for the Google Cloud BAA acceptance (for AOD's records).
   - Robert should rotate the Shopify (info@) and Google (hostmaster@) passwords and enable 2-step: both were emailed in plain text on 2026-09-28.
5. **Before launch (LAUNCH-05 / follow-up issue):** Shopify email setup: sender email on an AOD domain (Settings → Notifications), CNAME + DMARC authentication; and a counsel question: Shopify has no BAA, and order/notification emails for allergy drops may imply patient status. Also optional: uninstall Claude Connector / ChatGPT MCP apps if AOD doesn't need them. Dependabot: 84 alerts on main.

---

## Git state

- `main` = `00524ca` (PR #39). Cloud Run runs `998b1e0` (PR #38); #39 was docs only.
- Branch `docs-08.1-transfer-sent`: this HANDOFF + STATE update. Push and PR, or fold into PR3 at plan 13.
- `thread-aod-cloud-run-url-swap` is stale (its docs merged via #39); safe to delete.
- Theme repo branch `thread-aod-cloud-run-app-url` (`4f50f1d`) holds the `page.quiz.json` app_url copy. Not pushed.

## Resume

`/gsd:execute-phase 08.1` resumes at plan 11 (Task 2 checkpoint). Runbook: `docs/cloud-run.md`. Verify: `npm run typecheck && npm test` (920 tests on main at `998b1e0`).
