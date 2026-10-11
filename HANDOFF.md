# HANDOFF — AlleDrops Symptom Quiz

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
