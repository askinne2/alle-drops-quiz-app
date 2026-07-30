# Constraints — synthesized intel

Binding constraints extracted from the SPEC-typed documents, plus platform and sequencing
constraints recorded by the locked precedence-0 audit. Advisory guidance from DOC-typed
sources is included only where it bounds implementation choices, and is marked `advisory`.

Type key: `nfr` (non-functional / compliance) · `schema` · `api-contract` · `protocol`
(sequencing, process, or platform mechanics)

---

## Compliance — HIPAA

All HIPAA constraints below are **pending final legal confirmation**.
`docs/HIPAA_COMPLIANCE_ANALYSIS.md:18,175,179-182` explicitly defers the PHI determination to
a healthcare attorney. The working assumption in force is that quiz data **is** PHI — see
`decisions.md#DEC-treat-quiz-data-as-phi`.

### CON-phi-classification
- source: `docs/HIPAA_COMPLIANCE_ANALYSIS.md:3-12,20-53` (precedence 1)
- type: nfr
- Quiz responses are treated as individually identifiable health information. The quiz is a
  scored clinical questionnaire used by a board-certified allergist to make treatment
  decisions, which is the fact pattern the source names as triggering PHI status
  (`:47-53` — "used by healthcare providers to make treatment decisions", "part of a medical
  consultation or telehealth visit", "results in prescriptions or medical orders").
- Corollary recorded in `HANDOFF.md:237-238`: the current live quiz disclaimer
  "mischaracterizes a scored clinical questionnaire as 'product recommendation only'" and
  must be reworded. Same finding independently in `docs/STOREFRONT_CONTENT_AUDIT.md:53,250-251`.

### CON-no-phi-in-shopify
- source: `docs/HIPAA_COMPLIANCE_ANALYSIS.md:63-66,91-95,130,163` (precedence 1); enforced by `docs/breach-response-runbook.md:16,112`
- type: nfr
- **Shopify is not HIPAA-compliant and does not sign BAAs.** Storing PHI in Shopify violates
  HIPAA. Shopify may hold summary data only (`symptom_profile_id`, `quiz_score`, `state`,
  `score_bracket`, `quiz_date`, `quiz_history`, `last_completed_at`, `quiz_count`).
- DOB must never be written to Shopify customer metafields (`docs/app-requirements.md:65`).
- PHI appearing in Shopify metafields or via the Shopify Admin API is a reportable breach
  (`docs/breach-response-runbook.md:16`). Verify with
  `npx tsx scripts/phi-cleanup-verify.ts` (`:112`).
- Do not implement `docs/HIPAA_COMPLIANCE_ANALYSIS.md:143-161` ("If Migrating to Shopify-Only
  Storage", a `quiz_responses_full` JSON metafield). The source itself flags it as valid only
  if the data is NOT PHI (`:163`), which contradicts the decision in force.

### CON-baa-chain-required-for-every-phi-surface
- source: `docs/HIPAA_COMPLIANCE_ANALYSIS.md:12,68-74,97-108` (precedence 1); `docs/breach-response-runbook.md:16,73-75`; `HANDOFF.md:251-258,416-417`
- type: nfr
- Every system that touches PHI must sit inside a BAA chain. Free Google Sheets is not
  HIPAA-compliant; Google Workspace can be, **only** with a BAA in place and proper
  configuration. Google Cloud PHI custody depends on the AOD Workspace BAA opt-in
  (Account Settings → Legal and Compliance).
- **PHI appearing in any system not in the BAA chain is a reportable breach**
  (`docs/breach-response-runbook.md:16`) — including Fly.io logs and error messages.
- Fly.io BAA status: mooted by the planned migration to AOD-owned Google Cloud, but confirm
  where the app itself lands post-migration (`HANDOFF.md:416`).

### CON-no-third-party-trackers-on-phi-pages
- source: `HANDOFF.md:142` (precedence 4, quoting this repo's own `CLAUDE.md`); `HANDOFF.md:240-242`; `docs/STOREFRONT_CONTENT_AUDIT.md:162`
- type: nfr
- No analytics, pixel, or marketing trackers on any PHI-collecting page. The repo's
  `CLAUDE.md` explicitly bans Klaviyo by name on PHI-collecting pages.
- The privacy-policy draft's health-data carve-outs (marketing / "sale" / "share" / targeted
  advertising) are **only true** if the live Shopify store has no PHI fed to Shopify
  ads/audiences and no Pixel/GA/Klaviyo on collection pages. Audit live store settings before
  publishing the policy.
- ⚠ **Currently violated per `HANDOFF.md:142`:** `allergist-on-demand.myshopify.com/pages/allergy-quiz`
  was observed loading `static.klaviyo.com` and `static-tracking.klaviyo.com` directly on the
  quiz page. Flagged, not fixed; may be theme-level rather than app-level. See
  `INGEST-CONFLICTS.md` WARNING.

### CON-phi-retention-and-breach-obligations
- source: `docs/breach-response-runbook.md:11-114` (precedence 7)
- type: protocol
- HIPAA retention minimum is **6 years** — do not delete submission data during incident
  response (`:37`), and retain breach documentation for 6 years (`:80`).
- Individual notification within 60 days of discovery. HHS: fewer than 500 affected → within
  60 days of end of calendar year; 500 or more → within 60 days of discovery **plus** notice
  to prominent media outlets in affected states (`:63-71`).
- Containment within 1 hour, written assessment within 4 hours, HIPAA four-factor test
  applied before deciding on notification (`:24-57`).
- Officer designations are unfilled: Privacy Officer contact TBD, Security Officer TBD,
  in-house counsel TBD, and the HIPAA records location is TBD (`:96-102,90`).

### CON-audit-logging-and-consent-versioning
- source: `HANDOFF.md:316-317` (precedence 4); `docs/breach-response-runbook.md:114`
- type: nfr
- Every submission access is written to `submission_access_log` via `logSubmissionAccess()`.
  The log must be auditable for anomalous patterns during incident response.
- Every submission records `consent_version`. Current value `'draft-2026-05-09'`; bump to
  `'v1.0-YYYY-MM-DD'` when counsel finalizes consent text.

### CON-legal-content-prerequisites-before-first-patient
- source: `HANDOFF.md:411-425` (precedence 4); `docs/STOREFRONT_CONTENT_AUDIT.md:155-162,287,291` (precedence 5)
- type: nfr
- Before the first real patient: HIPAA Notice of Privacy Practices published; Privacy Policy
  replacing the Shopify default with PHI language and HIPAA-incompatible marketing provisions
  removed; Privacy Officer and Security Officer designated by name; HIPAA workforce training
  completed.
- The live privacy policy still lists `andrew@21adsmedia.com` as the contact email — a
  developer address on a HIPAA-covered entity's policy page. Must be replaced with an
  AOD-owned address before launch (`docs/STOREFRONT_CONTENT_AUDIT.md:160,244-245`).
- Starter drafts exist outside this repo at `~/Documents/Claude/Projects/AoD/policy-drafts/`
  (`01`–`04`). All are non-binding drafts for AOD counsel and are **not yet wired into
  app/theme**.

### CON-no-long-term-phi-access-for-agency
- source: `HANDOFF.md:258` (precedence 4, client call 2026-06-24)
- type: nfr
- Andrew does not want long-term PHI access post-migration. Any design that requires ongoing
  agency-side PHI access is out of bounds.

---

## Data contracts

### CON-quiz-submission-payload
- source: `docs/app-requirements.md:38-58` (precedence 3); `docs/quiz-questions-schema.md:282-313` (precedence 2)
- type: api-contract
- `POST /api/quiz/submit` accepts `QuizSubmissionData`:
  `state`, `name`, `dob`, `email`, `phone`, `symptom_profile_id`, `quiz_score`,
  `score_bracket`, `quiz_date`, `completion_time`, `answers`, optional `personal_history`,
  optional `family_history`.
- Handles JSON and urlencoded bodies only — **no multipart parsing**
  (`api.quiz.submit.tsx:55-74`). Per `decisions.md#DEC-testing-results-by-email-not-upload`
  this stays true; do not add file handling.
- New answers land in `answers_json` and are consumed generically by
  `app/lib/pdf.ts:75-85` and `app/routes/app.quiz-results.tsx:252-257` — additional questions
  need no downstream plumbing.
- Error responses must not leak `dbErr.message`; callers get `{ error: "Could not save assessment" }`
  only (`HANDOFF.md:348-350`).

### CON-validation-rules
- source: `docs/quiz-questions-schema.md:317-325` (precedence 2)
- type: schema
- `state` must be `tennessee` or `texas`
- DOB must be a valid ISO date and age must be 18+
- email must be valid; phone must contain at least 10 digits
- `score_bracket` must be one of `0-2`, `3-6`, `7+`
- `answers` must be an object; `personal_history` / `family_history` must be arrays when provided
- Note: no allergy-test-result or testing-completion field exists in this contract. Adding
  the testing branch (REQ-mandatory-allergy-testing-split) extends `answers`, not the
  top-level schema.

### CON-score-brackets
- source: `docs/quiz-questions-schema.md:49-71` (precedence 2)
- type: schema
- Live decision model is three brackets: `0-2`, `3-6`, `7+`.
  `if (score <= 2) return "0-2"; if (score <= 6) return "3-6"; return "7+";`
- The legacy `0-60` total and the bands `minimal` / `mild` / `moderate` / `severe` are
  **deprecated as the live decision model** and are historical context only, for interpreting
  legacy customer data. Per-question severity labels (`severity_0_3`) are unaffected and
  remain in use.
- ⚠ **Contested:** `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:74` reinstates 60 as a display
  ceiling for the R4 scale, and `docs/UX-AUDIT.md:426` records the legacy four-band colour
  classes being re-applied in the UI. See `INGEST-CONFLICTS.md` WARNING "Score range and
  severity-scale semantics unresolved".

### CON-scored-question-set-is-parts-1-5
- source: `docs/quiz-questions-schema.md:264-278` (precedence 2); `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:15` (precedence 0)
- type: schema
- `ALL_SCORED_QUESTIONS = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5]`.
  `calculateTotalScore` takes an explicit question list and is always called with this set.
  **New sections cannot alter the score** — medical history, the testing branch, and the
  diagnosis question all add zero scoring work.

### CON-shopify-metafield-schema
- source: `docs/app-requirements.md:120-135` (precedence 3); `docs/quiz-questions-schema.md:299-313` (precedence 2); `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:190` (precedence 0)
- type: schema
- Namespace `alledrops`: `symptom_profile_id` (single_line_text_field), `quiz_score`
  (number_integer), `state` (single_line_text_field), `score_bracket`
  (single_line_text_field), `quiz_date` (date_time), `quiz_history` (json),
  `last_completed_at` (date_time), `quiz_count` (number_integer).
- `quiz_history` entries use `profile_id`, `date`, `score`, `score_bracket`, `state`.
- Legacy compatibility is required, not optional: older records may carry `severity` /
  `region` inside `quiz_history`, and older customers may still have top-level
  `severity_level` / `quiz_region` metafields. Admin must keep rendering both readably.
- **No metafield definitions exist in the repo** (`metafieldDefinition` → zero hits), so
  storefront/Liquid exposure of these values is unverified. See
  `requirements.md#REQ-customer-metafield-definitions`.

### CON-submissions-table
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:187,198` (precedence 0); `docs/breach-response-runbook.md:26-32` (precedence 7)
- type: schema
- `submissions` table in Cloud SQL (`alledrops_quiz_dev` / prod) with
  `customer_id_shopify` (`migrations/001:12`, indexed `:40`), `symptom_profile_id` NOT NULL
  UNIQUE (`:13`), `answers_json`, `patient_email`, `created_at`, `consent_version`.
  `personal_history_json` / `family_history_json` (`:26-27`) are shaped for the old medical
  history design and become vestigial after the R3 rebuild.
- There is no `updateSubmission` in `app/lib/submissions.ts` — submissions are insert-only.
- Migration pattern documented at `migrations/001:50`.

---

## Sequencing and platform mechanics

### CON-sequencing-r3-before-r5
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:110,266` (precedence 0, **LOCKED** doc)
- type: protocol
- **`setStep("medical_history")` (`QuizContainer.tsx:243`) is the only entry point to the
  medical history section.** Deleting the no-testing paths (REQ-remove-no-testing-paths) makes
  medical history dead code. **The R3 reorder must land before R5's deletions.** Non-negotiable
  ordering constraint recorded by the locked source.

### CON-quiz-schema-foundation-is-load-bearing
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:55-60,265` (precedence 0)
- type: protocol
- `required`, `showIf`, and a static-info question type must land before R3, R5, and R6.
  Building any of those three by copying the existing `med_list` ID-literal hardcode pattern
  would add five more special cases across `QuizPartRenderer.tsx` (display at `:36-38`,
  required-ness at `:276-278,295-299`). Schedule the schema work first.

### CON-iframe-embed-path
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:132-177` (precedence 0, confirmed against the live theme editor 2026-07-29)
- type: protocol
- The installed embed path is the **Liquid theme app block**
  (`extensions/quiz-block/blocks/symptom-quiz.liquid`, `target = "section"` at `:78`), visible
  in the theme editor under Template → Apps as "AlleDrops Symptom Quiz". The
  `quiz-bundle.js` injection path (`app/entry.theme.tsx` `injectIframe()`) is **not in play** —
  do not fix parent-side behaviour there and assume it ships.
- `Location.assign` is `[LegacyUnforgeable]` — non-writable, non-configurable. It cannot be
  monkey-patched, and the attempt fails silently in sloppy mode. Cross-frame navigation must
  go through `postMessage` to the parent.
- The iframe is `scrolling="no"` with height set to full content (`:52-54`), so the parent
  document is the only scroller. Any dropped `postMessage` means no scroll at all.
- Anchor clicks work through a separate interceptor (`quiz-embed.tsx:62-72`,
  `preventDefault` + `postMessage`) — that path is legitimate and should be preserved.

### CON-shopify-plan-and-scope-limits
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:224,231,242,247` (precedence 0); `HANDOFF.md:147-160` (precedence 4)
- type: nfr
- AOD is on Shopify Basic/Grow (~$20/mo), not Plus. **Only Plus stores can use custom apps
  containing Shopify Function APIs**, so real-time checkout blocking via a custom Function is
  unavailable. Plus (~$2,300/mo) was dismissed by both parties.
- Checkout page text surface is limited on non-Plus.
- The app requests only `scopes = "read_customers,write_customers"`
  (`shopify.app.alledrops-production.toml`). Any `orders/create` backstop would need
  `read_orders` **and a merchant reinstall**. Webhook subscriptions today are only
  `app/uninstalled` + `app/scopes_update` — there is no order webhook plumbing to extend.
- Per `decisions.md#DEC-purchase-gating-is-honor-system` none of that enforcement is in scope
  anyway; this constraint exists so it is not re-proposed.

### CON-theme-bundle-build-step
- source: `HANDOFF.md:124-127` (precedence 4)
- type: protocol
- `public/quiz-bundle.js` is a committed static artifact built by a separate command,
  `npm run build:theme` (vite lib build from `app/entry.theme.tsx`). `npm run build`
  (react-router) does not touch it. The `Dockerfile` now runs `build:theme`, and
  `@vitejs/plugin-react` was moved to `dependencies` because the Docker install uses
  `npm ci --omit=dev`.
- A "successful" `fly deploy` plus matching HTTP headers is **not** proof a front-end fix is
  live. Verify against the rendered DOM and the exact network response bytes.
- CSS route cache is `max-age=0, must-revalidate` (was `max-age=3600`, which caused stale
  deploys) — `docs/UX-AUDIT.md:445`.

### CON-geo-scope-tn-tx
- source: `HANDOFF.md:284` (client-confirmed 2026-06-24); `docs/quiz-questions-schema.md:27-34`; `docs/app-requirements.md:7`
- type: nfr
- Tennessee and Texas only, enforced at the state gate and re-validated server-side. No
  other geography may be implied in storefront copy — `docs/STOREFRONT_CONTENT_AUDIT.md:110-112`
  records that "Nationwide" and "everyone, everywhere" claims were removed for this reason.

### CON-clinical-content-requires-client-signoff
- source: `docs/STOREFRONT_CONTENT_AUDIT.md:279-293` (precedence 5); `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:301` (precedence 0)
- type: nfr
- No clinical or medical claim ships without William (AOD medical director) or counsel
  approval. Blocked on the client, not engineering: TN/TX allergen lists (proprietary blend),
  IgE testing clinical copy, "thousands of patients" claim, contraindication list, revised
  quiz disclaimer, consultation format details, Privacy/Security Officer names, Dr. Sullivan's
  active-role confirmation.
- Do not author clinical copy to unblock a build task.

---

## Advisory (DOC-sourced, non-binding)

### CON-cold-start-and-health-endpoint — advisory
- source: `docs/PERFORMANCE_OPTIMIZATION.md` (precedence 8)
- type: nfr
- Cold starts of 2–10 s on shared-CPU Fly machines. Mitigations in place: `/health` endpoint
  (`app/routes/health.tsx`), Fly health checks every 30 s, `min_machines_running = 1`.
  Recommended: UptimeRobot ping every 5 minutes; dedicated CPU (~$15–20/mo) for production.
- ⚠ **`/health` does not touch the database** — it returns a static JSON payload
  (`HANDOFF.md:51`). A 200 proves the Fly app is up and nothing about Postgres connectivity.
  Do not use it as a DB check.
- ⚠ Stale content: `:208` refers to migrating from SQLite to PostgreSQL. The app already runs
  on Cloud SQL Postgres. Ignore.
- Relevance to UX: `docs/UX-AUDIT.md:215` notes the "Submitting…" state can display for
  several seconds on the cold-start path, which is why a loading indicator was added.

### CON-cloud-sql-tier-defaults — advisory
- source: `HANDOFF.md:13-28` (precedence 4)
- type: nfr
- When creating a Cloud SQL instance via CLI/API with PostgreSQL 16 or later, the default
  edition is **Enterprise Plus**, with no warning at creation time. The AlleDrops instance
  silently ran at 8 vCPU / 64 GB from creation (~$1,150/mo list) until 2026-07-28, when it was
  patched to `ENTERPRISE` / `db-custom-1-3840` (~$65/mo). Enterprise supports PG 9.6–18, so
  the PG version was never a reason to be on Plus.
- Any future instance creation (including the AOD-owned GCP migration) must set `--edition=ENTERPRISE`
  explicitly and enable automated backups plus PITR at creation.
