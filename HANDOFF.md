# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-10-05, mid-phase (supersedes 2026-08-14)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Sister:** `/Users/andrewskinner/Local Sites/allergist-on-demand` (theme)
**Branch:** `thread-aod-cloud-run-url-swap` (local docs commits not pushed yet; see Git state)

---

## Goal

**Phase 08.1: AOD infrastructure cutover.** Move the app from Fly to Cloud Run, with Cloud SQL and GCS, inside AOD's own GCP project `aod-production-510006` (org `alledrops.com`) so one Google BAA covers everything. Then transfer the `allergist-on-demand` Shopify store to AOD. Plans are in `.planning/phases/08.1-aod-infrastructure-cutover-port-the-app-fly-to-cloud-run-clo/`.

**Progress:** 10 of 13 plans done. Plan 11 (store transfer) is waiting on Andrew and Robert.

---

## Current state (verified 2026-10-05)

| Surface | State |
|---|---|
| Cloud Run | `alle-drops-quiz-app` in us-east1, URL `https://alle-drops-quiz-app-502519175239.us-east1.run.app`. Runs merged main `998b1e0` as `quiz-app-runtime`. `/health` 200. |
| Cloud SQL | `aod-quiz-db`: Postgres 18, **ENTERPRISE** (not Plus), `db-g1-small`, backups + PITR, `ENCRYPTED_ONLY`, no authorized networks (connector only), deletion protection. DBs `alledrops_quiz` (PHI, migrations 001–005) and `shopify_sessions` (Prisma). 0 submissions (all test data deleted). |
| GCS | `gs://aod-quiz-uploads-prod`: public access blocked, uniform access, 7-day soft delete, `pending/` deleted after 2 days. Empty. |
| Secrets | `quiz-database-url` and `quiz-session-database-url` are at **v2** (v1 had a zsh-mangled host). Also `shopify-api-secret`, `shopify-admin-access-token`, `quiz-db-owner-password` (owner only). No SA key files. |
| Logging | `_Default` exclusion `exclude-token-urls` covers `token=` and `sig=`. |
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

1. **Plan 11, Task 2 (Andrew):** Shopify Payments off; add AOD legal name and address (**waiting on Robert**); screenshot Settings → Apps; record the Dev Dashboard distribution type (don't change it); send the store transfer to `hostmaster@alledrops.com`; AOD accepts with its own card. Resume signal: `transfer accepted on DATE; apps: ...; distribution: ...`
   - **Finding:** the admin token belongs to **"Alledrops Quiz App"** (`gid://shopify/App/300360105985`), not the deployed "AlleDrops Quiz Production" (`300363153409`). Plan 12 checks it still works after the transfer; the fallback is a new token from the production app.
2. **Plan 12:** post-transfer app and token check (query in the 08.1-11 checkpoint notes); William cancels the empty `1mzvmx-tf` store.
3. **Plan 13:** destroy Fly + Tigris/Litestream (needs Andrew's explicit OK); dev-project hygiene (keep `alledrops-quiz` as dev; rotate the dev DB password; delete the non-expiring SA key; remove the Fly egress authorized network); open PR3 with all local docs commits.
4. **Later:** Dependabot shows 84 alerts on main (visible now that `package-lock.json` is committed). Triage as a separate issue. Get William's written OK for the BAA acceptance.

---

## Git state

- `main` = `998b1e0` (PR #38). Cloud Run runs this.
- Local branch `thread-aod-cloud-run-url-swap` has **unpushed docs commits** (plan 09/10 summaries, the runbook secret note, STATE/ROADMAP, LAUNCH-04 checkbox, this handoff). Push it and open a docs PR, or fold it into PR3 at plan 13.
- Theme repo branch `thread-aod-cloud-run-app-url` (`4f50f1d`) holds the `page.quiz.json` app_url copy. Not pushed.

## Resume

`/gsd:execute-phase 08.1` resumes at plan 11 (Task 2 checkpoint). Runbook: `docs/cloud-run.md`. Verify: `npm run typecheck && npm test` (920 tests on main at `998b1e0`).
