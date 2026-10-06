# HIPAA compliance: current architecture

Rewritten 2026-10-06 (LAUNCH-08). The earlier version of this document recorded a decision to keep a Google
Sheets integration for full quiz responses and to store score data in Shopify. **That decision was reversed.**
Google Sheets is not, and must never be, a PHI store. The enforceable rules are the compliance block at the top
of `CLAUDE.md`; this page explains the shape.

## Decision

Quiz data is PHI. All PHI stays inside one Google Cloud BAA, in AOD's own project `aod-production-510006`
(Google Cloud HIPAA BAA accepted 2026-10-05).

## Where PHI lives

| Surface | PHI? | Notes |
|---|---|---|
| Cloud SQL `alledrops_quiz` (`submissions`, `submission_files`, `submission_access_log`) | Yes | The only PHI database. Reached through the Cloud Run connector; no authorized networks. |
| GCS `aod-quiz-uploads-prod` | Yes | Uploaded test results. Public access blocked; served only server-side, as `attachment`. |
| Cloud Run `alle-drops-quiz-app` | In transit | Logs must carry IDs and counts only. `token=` and `sig=` URLs are excluded from Cloud Logging. |
| Shopify | **No** | Only `alledrops.last_completed_at` and `alledrops.quiz_count` metafields. Shopify has no BAA. |
| Google Sheets / Drive / Docs (Workspace) | **No** | Never in the PHI path. `app/lib/google-sheets.ts` throws if called; zero imports. |
| Analytics, pixels, chat, session replay | **No** | Never on the quiz embed page. |

## Still open before the first real patient (LAUNCH-05, AOD and counsel)

- Notice of Privacy Practices published; privacy policy carries PHI language and an AOD contact address.
- Privacy and Security Officers named; workforce HIPAA training complete.
- Counsel decision on Shopify order and notification emails (Shopify has no BAA).
- Consent text approved and `CONSENT_VERSION` bumped (LAUNCH-03).

## Related

- `CLAUDE.md`: compliance rules and the PHI self-review checklist
- `docs/cloud-run.md`: infrastructure and BAA scope
- `docs/breach-response-runbook.md`: incident response
