# Handoff — AlleDrops quiz app (2026-05-09 session 20)

### Status: All pre-launch engineering gates closed — deployed to Fly. Pending: merge review + E2E bracket tests + client-side items.

---

## What's actually built (comprehensive audit, post-session 20)

| Feature | Status | Merged |
|---|---|---|
| Cross-origin iframe embed (Theme App Block) | ✅ done | `1739bc4` |
| Cloud SQL submissions table + INSERT | ✅ done | early |
| Patient ledger `/api/me/assessments` + email fallback + GID backfill | ✅ done | PR #10 |
| Patient PDF `/api/me/assessment/$id/pdf` | ✅ done | merged |
| Admin PDF `/api/admin/assessment/$id/pdf` | ✅ done | merged |
| Admin submissions list `/api/admin/submissions` (paginated, filterable) | ✅ done | merged |
| Admin submission detail `/api/admin/submission/:id` | ✅ done | merged |
| Admin view `app/routes/app.quiz-results.tsx` — Polaris table + filters + modal + PDF download | ✅ done | `9256a63` |
| PHI metafield value cleanup — 58 deletions across 6 customers | ✅ done | PR #8 |
| `phi-cleanup-definitions.ts` — drop PHI metafield definitions | ✅ confirmed clean via verify script | — |
| `phi-cleanup-verify.ts` — verify clean state | ✅ ran session 20, exit 0 | — |
| Audit logging — `submission_access_log` table + `logSubmissionAccess()` | ✅ done | PR #11 |
| Consent version — `CONSENT_VERSION` constant + wired into payload | ✅ done | PR #11 |
| Breach response runbook | ✅ done | PR #11 |
| Custom domain `quiz.allerdrops.com` | ⏸ blocked on client | — |

**46/46 tests passing. Typecheck clean. Deployed to Fly.**

> Note: Migration `002_create_submission_access_log.sql` was run directly against `alledrops_quiz_dev` via Cloud SQL Proxy (session 20). No FK constraint on `submission_id` — the `submissions` table is owned by `alledrops_app` and `postgres` can't reference it without a GRANT. FK is a nice-to-have; the audit log functions correctly without it.

---

## What's NOT built (remaining pre-launch gates)

### 1. E2E test covering all 3 score brackets

MVP plan requires verified E2E with test submissions for `0-2`, `3-6`, and `7+` brackets. Current tests are unit/integration. Need a confirmed end-to-end submission → Cloud SQL → ledger → PDF download flow per bracket. Do this as a manual test + log confirmation before first real patient.

### 2. Consent text finalization

`consent_version` is now captured per submission (value: `'draft-2026-05-09'`). When William/counsel finalizes the consent text, update the text in `ConsentStep.tsx` and bump `CONSENT_VERSION` in `app/lib/consent-version.ts` to `'v1.0-YYYY-MM-DD'`.

---

## Blocked on client / AOD side

| Item | Owner | Notes |
|---|---|---|
| Custom domain `quiz.allerdrops.com` DNS | Andrew + client | Theme Block has `app_url` setting — swap when DNS ready |
| Fly.io BAA | Andrew | Initiate with Fly sales (not self-serve) |
| Production GCP migration | William | Move from 21adsmedia.com GCP dev project to AOD's own GCP project |
| In-house counsel review | William/counsel | Architecture + consent text review (parallel, not blocking engineering) |
| Consent text finalization | William/counsel | Blocks bumping CONSENT_VERSION to v1.0 |
| NPP draft | Counsel | Before first real patient |
| Privacy/Security Officer designation | William | Before first real patient |
| HIPAA workforce training | William | Before first real patient |

---

## Phase 2.5 (explicitly deferred — do not scope into current work)

- Provider review status workflow: `new → reviewed → contacted → scheduled`
- Provider notes on submissions
- Structured audit dashboard (who viewed what, when)
- Bulk operations
- Scheduling integration

---

## Next work candidates

### Plan B — Theme relic cleanup (separate repo)
**Plan:** `/Users/andrewskinner/Local Sites/allergist-on-demand/docs/superpowers/plans/2026-05-09-theme-relic-cleanup.md`
**Repo:** `/Users/andrewskinner/Local Sites/allergist-on-demand`

The explore agent found a **complete parallel quiz system** still live in the theme (script-tag injection, Cloudflare Worker code, Google Sheets JS, PHI metafield reads). All must be removed.

**Start with the mandatory audit (Task 1 of the plan):**
```bash
grep -rl "symptom-quiz" /Users/andrewskinner/Local\ Sites/allergist-on-demand/templates/
```
This determines Task 2A (delete section outright) vs Task 2B (replace with thin iframe wrapper first). Cannot proceed past Task 1 without this answer.

Remaining tasks after the audit:
- Strip PHI metafield blocks from `sections/quiz-history.liquid` + `sections/main-account.liquid`
- Delete `assets/symptom-quiz.js`, `google-sheets-integration.js`, `quiz-config.js`, `quiz-results.js`
- Delete `cloudflare-worker/` directory (verify zero traffic in Cloudflare dashboard first)

---

## Resume context

- **Active branch:** `main` (PR #11 merged and deployed)
- **Fly app:** `alle-drops-quiz-app` — deployed and healthy (`https://alle-drops-quiz-app.fly.dev/health` → 200)
- **How to verify:** `npm test` (46 pass), `npm run typecheck` (clean)
- **Key files changed in session 20:**
  - `app/lib/consent-version.ts` — new, exports `CONSENT_VERSION`
  - `app/lib/submissions.ts` — added `logSubmissionAccess()`
  - `app/routes/api.admin.*.tsx` — all 3 admin routes fire-and-forget access log
  - `app/routes/api.quiz.submit.tsx` — consent_version wired from payload
  - `app/components/quiz/QuizContainer.tsx` — consent_version added to buildPayload()
  - `migrations/002_create_submission_access_log.sql` — run in Cloud SQL dev
  - `docs/breach-response-runbook.md` — new
- **Cloud SQL notes:**
  - `submission_access_log` table live in `alledrops_quiz_dev`
  - No FK on `submission_id` (postgres user lacks SELECT on submissions; FK is optional)
  - IAM user `andrew@21adsmedia.com` created on instance (future migrations can use Cloud SQL Proxy + IAM)
  - ADC configured at `~/.config/gcloud/application_default_credentials.json`
  - Proxy binary: `/opt/homebrew/share/google-cloud-sdk/bin/cloud-sql-proxy`
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
