# HANDOFF — AlleDrops Symptom Quiz

## 2026-10-22 — alert emails diagnosed: CPU-starved session check (PR #55)

**Prod:** Cloud Run revision `alle-drops-quiz-app-00006-c6j` (main @ `be80a91`), 100% traffic, `/health` 200, service config unchanged, clean startup logs.

- **Cause of the "server errors" emails** (10/14 00:48, 10/16 00:32, 10/21 23:15, 10/22 00:09 UTC, rev 00005): Cloud Run started a replacement min-instance (`MANUAL_OR_CUSTOMER_MIN_INSTANCE`) with no request in flight. CPU is only allocated during requests, so the Prisma session-storage startup check ran starved, hit the 10 s pool timeout (P2024) and reported ERROR 9-14 min after start (nominal budget ~3 min). The #49 30 s background re-poll then failed ~2,800 times/day on that instance and never recovered. Cloud SQL had no restarts or maintenance. 10/11 09:10 (rev 00004) was the old crash-loop that #49 already fixed.
- **Impact:** none. 23 requests since 10/11 (22x 200, 1x 404), zero 5xx.
- **Fix (#55, Andrew picked option B over always-on CPU, ~$45-55/mo, and alert tuning):** startup check 3x2 s, failure logs a scrubbed WARNING (does not page). No background re-poll. `ReadyOnRequestSessionStorage` in `app/shopify.server.ts` re-checks on the session call that needs it (CPU available), one shared poll. Success logs INFO; failure logs ERROR `phase: "request"`, so a real outage with a waiting request still pages.
- **Tests:** `tests/session-storage-startup.test.ts` 10/10, typecheck clean, build OK. Full suite 966/968. `quiz-resume-payload-parity` (2) and `quiz-file-upload-dom` (1) fail under full-suite load on main too and pass alone. That is pre-existing flakiness.

**Watch (around 10/27):** the next replacement min-instance on rev 00006 should log a `session.storage.ready` WARNING with `phase: "startup"` and send no alert email. Query: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="alle-drops-quiz-app" AND jsonPayload.source="session.storage.ready"' --project aod-production-510006 --limit 20`.

**No chase (Andrew, 10/22).** The last email was Andrew's 10/6 ask to Robert, cc William (registrar access, Shopify Payments). No reply since, and nothing sent since. Do not nudge, do not draft a "final look" email. Wait for them to come back on their own; the vault `next_check` is 2026-12-01.

**Leftover launch items (live store + admin checked 10/22).** Storefront copy is done: TEST-06 clause gone from both product pages, `/pages/test-options` says testing is required, purchase checkboxes on both products, no trackers, no placeholders. Left:

| # | Item | State | Owner |
|---|---|---|---|
| 1 | Shopify Payments | Not set up (bank + tax info) | William / Robert |
| 2 | Registrar access (allergistondemand.com, alledrops.com) | Not granted; blocks sender email on info@ + CNAMEs + DMARC | Robert |
| 3 | Return and refund policy (SHOP-05) | Not set; `/policies/refund-policy` 404 | William |
| 4 | Contact information policy | Not set; Shopify marks it Required | AOD |
| 5 | Terms of service, shipping policy | Not set | AOD / counsel |
| 6 | Order confirmation email (SHOP-05) | Stock template, no "won't ship until quiz + testing" line | Andrew, after #3 |
| 7 | Home copy "no appointments required" / "no clinic visits required" | Questionable for untested patients; raise with William | William |
| 8 | SHOP-06 fulfillment step, LAUNCH-05 NPP/officers/training, LAUNCH-03 consent sign-off | AOD side | William / counsel |
| 9 | LAUNCH-07 domain spelling | Waiting | William |

Vault mirror: `~/Vaults/ads-os/20-Projects/AlleDrops-Shopify-Quiz.md` § Leftover launch items.

**Diagnosis method (PHI-safe):** read only log metadata, redact emails and digits in Python before printing, strip query strings from URLs. In zsh, use a function for repeated `gcloud logging read` windows: `set -- $w` does not word-split.

---

## 2026-10-11 — error alerts, PHI log fixes, session-storage hardening

**Prod:** Cloud Run revision `alle-drops-quiz-app-00005-c4r` (main @ `eebc372`), 964/964 tests at deploy.

- **#45** structured server errors to stderr (`app/lib/error-reporting.server.ts`): Cloud Error Reporting picks them up; PHI scrubbed; `handleError` + uncaught-exception monitor in `app/entry.server.tsx`; admin smoke route `/app/error-reporting-test`.
- **#48** every raw `console.error(err)` in Shopify/db/admin paths routed through the scrubber (pg errors reduced to code + constraint).
- **#47** Verify Metafields lookup is a POST; no email in URLs. Andrew verified in the embedded admin 10/11.
- **#49** `PrismaSessionStorage` retries 12x5s at startup, stays up and re-checks every 30 s instead of crash-looping, logs the real DB cause as `session.storage.ready`. (The "session table does not exist" errors on 10/5 and 10/7 were DB connection failures, not a missing table.)
- **Alerting (GCP `aod-production-510006`, not in repo):** email channel `notificationChannels/2847501256251355583`, log-based policy "AlleDrops quiz: server errors" (`alertPolicies/12399884260945739375`), Cloud Run severity>=ERROR, max 1 email / 30 min. Test email received 10/11.
- Issue #46 closed. Left: `app/lib/shopify/products.ts:46,53` still logs raw errors (product data only).
- Not Sentry on purpose: the 21 ads Sentry org has no BAA.

**Watch:** next cold start's logs for `session.storage.ready`.

---

**Written:** 2026-10-06, end of phase 08.1 execution (all 13 plans run)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Sister:** `/Users/andrewskinner/Local Sites/allergist-on-demand` (theme)
**Branch:** `thread-aod-retire-fly` (PR3: Fly artifacts removed, docs, 08.1-11/12/13 summaries)

---

## Current state (verified 2026-10-06)

| Surface | State |
|---|---|
| Cloud Run | `alle-drops-quiz-app`, us-east1, `https://alle-drops-quiz-app-502519175239.us-east1.run.app`, `/health` 200. Runbook: `docs/cloud-run.md`. |
| Cloud SQL | `aod-quiz-db` (PHI `alledrops_quiz`, sessions `shopify_sessions`; Session rows: 1). |
| Shopify store | **Owned by AOD.** Transfer accepted 2026-10-05 by info@allergistondemand.com. Owner William Miller, Basic plan. Andrew is a collaborator. The admin token's app ("Alledrops Quiz App", `gid://shopify/App/300360105985`) survived, no reinstall. Storefront quiz, TN/TX gates and admin app verified on the AOD store. |
| `1mzvmx-tf` | Cancelled by William; Shopify deactivates it 2026-10-31. |
| Fly | **Destroyed 2026-10-06**: app, `data` volume, and Tigris bucket `red-haze-2475`. No rollback to Fly exists now. |
| Dev project `alledrops-quiz` | Kept, test data only. Fly authorized network removed (none left). Non-expiring SA key deleted (0 user keys; SA kept for impersonation). `alledrops_dev` / `alledrops_app` passwords rotated into secrets `dev-db-alledrops-dev-password` / `dev-db-alledrops-app-password`; new dev password verified (`select 1`). |

**Requirements:** LAUNCH-04 done. LAUNCH-06 (store owned by AOD, app installed, Fly retired) is met in substance; close it when the phase is verified. LAUNCH-05 open (NPP, privacy policy, officers, training: AOD/counsel). LAUNCH-07 open (domain; now an external ALB in front of Cloud Run).

## Next steps

1. **Update your local `.env`** dev DB password: `gcloud --configuration=default secrets versions access latest --secret=dev-db-alledrops-dev-password --project=alledrops-quiz`.
2. **File the access-reduction issue yourself** (the classifier blocked Claude): "Reduce Andrew's standing access on aod-production-510006 after cutover (Playbook E.5)". Drop owner, cloudsql.client and DB-secret access; needs Robert.
3. Review and merge PR3, then run `/gsd-verify-work 08.1` (or the phase verifier) to close the phase and LAUNCH-06.
4. Tell William about the ongoing dependency: the "AlleDrops Quiz Production" app is still owned by the 21 ads Dev Dashboard org.
5. Still open from earlier: William's written OK for the Google Cloud BAA acceptance; Robert to rotate the Shopify (info@) and Google (hostmaster@) passwords and turn on 2-step; billing card ending 2478.
6. Optional cleanup, irreversible, ask first: uninstall legacy "AlleDrops Quiz Worker" (unreferenced); review the old Dev Dashboard "AlleDrops Quiz App" (May 7). **Do not** uninstall the store's "Alledrops Quiz App" custom app: it owns the admin token.
7. Before launch: Shopify sender email on an AOD domain, plus a counsel question on Shopify order emails (no BAA). Dependabot alerts on main.

## Gotchas learned this session

- `cloud-sql-proxy` uses Application Default Credentials, not `gcloud auth login`. Pass `--gcloud-auth`. In a `!` command, stop it with `PX=$!; ... kill ${PX}`; `kill %1` left a stale proxy holding the port.
- zsh does not word-split `$G`-style command variables; use a function `G(){ gcloud ... "$@"; }`. Always brace `${P}`.
- The auto-mode classifier blocks production DB reads, secret writes and IAM-detail issue bodies. Hand Andrew the `!` command.
