# HANDOFF: AlleDrops Symptom Quiz

**Written:** 2026-10-06, end of session (phase 08.1 complete; Phase 7 closed; LAUNCH-08 done)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app` (theme: `/Users/andrewskinner/Local Sites/allergist-on-demand`)

---

## Goal

Get the AOD store ready to turn on for real TN/TX patients. The quiz app is built and runs on AOD's own Google Cloud under the Google BAA, and the store is owned by AOD. Launch is now about store setup (Robert), legal (William and counsel), and one infra item, the custom domain.

## Current progress

- **Phase 08.1 complete** (13/13 plans, verified, LAUNCH-04 and LAUNCH-06 done). Cloud Run, Cloud SQL and GCS are live in `aod-production-510006`. Store transfer accepted 2026-10-05 (owner William Miller, Basic plan); the admin-token app ("Alledrops Quiz App") survived. Fly app, volume and Tigris bucket `red-haze-2475` destroyed 2026-10-06. Dev project `alledrops-quiz` cleaned: Fly IP removed, SA key deleted, dev DB passwords rotated into dev secrets.
- **Phase 7 closed:** TELE-01 met by the Appointly booking app at `/products/allergy-consultation`. TELE-02 descoped (quiz-first flow).
- **LAUNCH-08 done:** the Sheets-era docs were rewritten. TEST-04 and the Phase 6 tracking were reconciled.
- **Theme repo:** `templates/page.quiz.json` `app_url` now points at Cloud Run on main (PR #5), so `shopify theme push` is safe again.
- PRs merged today: app #40, #41, #42, #43; theme #5. Tests 920/920, typecheck clean.
- **Email to Robert sent 2026-10-06** ("AOD Info" thread): asked for registrar access to `allergistondemand.com` (and `alledrops.com` if it's at the same registrar) plus Shopify Payments setup. Andrew removed the card ask; client billing is AOD's to manage.
- **Store audit (read-only, 2026-10-06):** contact `info@allergistondemand.com`, address Allergist on Demand LLC, 123 Kingston Dr Ste 206, Chapel Hill NC. **Sender email is still `andrew@21adsmedia.com` (unverified)**; domain auth and DMARC aren't set up. Payments not set up. Password page on. No custom domain. Orders nav shows 1, not opened. Claude Connector and ChatGPT MCP apps installed. The 21 ads collaborator has every permission.

## What worked

- Hand Andrew `!` commands for anything the auto-mode classifier blocks: prod DB reads, secret writes, IAM, gcloud dev-project writes, issue bodies with IAM detail.
- `cloud-sql-proxy --gcloud-auth`, then `PX=$!; ... kill ${PX}`. Without `--gcloud-auth` it uses stale ADC and the connection drops.
- zsh: wrap repeated gcloud flags in a function `G(){ gcloud ... "$@"; }`; zsh doesn't word-split variables. Brace `${P}`.
- Read-only Chrome subagent for Shopify admin audits. Tell it never to open Customers or Orders.

## What didn't work

- `kill %1` inside a `!` command left a proxy holding port 5436.
- The 08.1-13 acceptance grep only covered CLAUDE.md and README, which missed 5 Fly docs, including the breach runbook. Sweep the whole repo next time.
- `gsd-sdk query phase.complete` marked the whole milestone complete. It was hand-corrected: phases 6 and 8 are still open.
- A superhuman `reply_all` to Andrew's own last message put Andrew in To. Use `type: "reply"` with explicit to/cc.

## Next steps

1. **When Robert grants registrar access:** in Shopify, set the sender email to `info@allergistondemand.com`, add the domain-auth CNAMEs and a DMARC record. About 30 min.
2. **LAUNCH-07 custom domain:** once William confirms the domain spelling, put Cloud Run behind an external Application Load Balancer with a cert, then re-run the URL-swap checklist in `docs/cloud-run.md`. About half a day.
3. **Store content (Andrew or Robert):** SHOP-05 checkout, confirmation and refund copy (draft in `.planning/phases/06-purchase-prerequisites/06-SHOP-05-COPY-DRAFT.md`). TEST-06: remove "no longer a need for needles" from the product pages and the no-testing content from `/pages/test-options` (both are admin-managed).
4. **AOD/counsel (blocks the first real patient):** consent approval then a `CONSENT_VERSION` bump (LAUNCH-03); NPP, privacy policy, officers, training (LAUNCH-05); fulfillment check adoption (SHOP-06); counsel ruling on Shopify order emails (no BAA).
5. **Optional, ask first:** check that uploaded images render inside the admin PDF (TEST-04 gap). Uninstall the legacy "AlleDrops Quiz Worker". Keep "Alledrops Quiz App": it owns the token. Robert to rotate the Shopify and Google passwords that were emailed in plain text 9/28. Turn off password page last.

Deferred by Andrew: the access-reduction issue on `aod-production-510006` ("fine for now").

## Resume context

- **Branch:** `main` (all merged). Theme repo `main` = `9296de6`.
- **How to verify:** `npm run typecheck && npm test` (920 tests); `curl -s https://alle-drops-quiz-app-502519175239.us-east1.run.app/health` returns 200.
- **Key files:** `docs/cloud-run.md` (runbook + URL-swap checklist), `.planning/STATE.md`, `.planning/REQUIREMENTS.md` (open: SHOP-05/06, TEST-06, LAUNCH-03/05/07), `docs/breach-response-runbook.md`, `.planning/phases/08.1-*/08.1-VERIFICATION.md`.
- **gcloud:** `aod-andrew` for prod, `default` for dev (`alledrops-quiz`). The dev DB password lives in secret `dev-db-alledrops-dev-password`; Andrew's local `.env` is updated.
- **Blockers:** Robert (registrar access, Payments); William (domain spelling, consent and legal).
