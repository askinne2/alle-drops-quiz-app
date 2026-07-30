# Context — synthesized intel

Notes keyed by topic from the DOC-typed sources (`HANDOFF.md` precedence 4,
`docs/STOREFRONT_CONTENT_AUDIT.md` precedence 5, `docs/UX-AUDIT.md` precedence 6,
`docs/breach-response-runbook.md` precedence 7, `docs/PERFORMANCE_OPTIMIZATION.md`
precedence 8), plus the non-requirement content of the locked precedence-0 audit.

DOC-sourced content **cannot create requirements or win conflicts**. Everything here is
project state, open action items, and inventory for the roadmapper to reason about — not
scope.

---

## Project state as of 2026-07-29

- source: `HANDOFF.md:3,332,441-443`; `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:5,305`
- Branch `main`. 51/51 tests passing, typecheck clean, deployed to Fly
  (`alle-drops-quiz-app`, iad).
- No application code has changed since session 28 (2026-07-01). Sessions 29 and 30 were
  scheduling and infrastructure work.
- Verify nothing regressed: `npm test` (51 pass), `npm run typecheck` (clean).
- Storefront: `allergist-on-demand.myshopify.com/pages/allergy-quiz` (store password
  `allergy`).
- **Headline assessment from the locked audit:** "The code is roughly **one third** of the
  way to what William now expects, and that third is mostly the pre-call design. Symptom
  sections, the medication section, and scoring are genuinely correct. Everything the call
  added or changed is absent or contradicted."
  (`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:13`)

### What is built
- source: `HANDOFF.md:301-332`
- Cross-origin iframe embed (Theme App Block) · Cloud SQL `submissions` table + INSERT ·
  patient ledger `/api/me/assessments` with email fallback and GID backfill · patient PDF
  `/api/me/assessment/$id/pdf` · admin PDF · admin submissions list (paginated, filterable) ·
  admin submission detail · admin Polaris table + filters + modal + PDF download ·
  human-readable answer rows · admin stats dashboard · PHI metafield cleanup · audit logging
  (`submission_access_log` + `logSubmissionAccess()`) · consent versioning · breach response
  runbook · E2E bracket test suite (`scripts/e2e-test.ts`) · security hardening (3 findings) ·
  theme relic cleanup · deploy pipeline fixes (PRs #14, #15).
- Custom domain `quiz.alledrops.com`: **blocked on client.**

### Security findings — all fixed
- source: `HANDOFF.md:336-351`
- JWT `aud` always enforced, `SHOPIFY_API_KEY` required at call time (`app/lib/customer-auth.ts`).
- `?token=` URL-param bearer fallback removed; `Authorization: Bearer` only
  (`app/routes/api.me.assessment.$id.pdf.tsx`).
- `dbErr.message` stripped from 500 response bodies (`app/routes/api.quiz.submit.tsx`).

---

## Open verification items

- source: `HANDOFF.md:38-42,63,66,141-145,444-445`; `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:300`
- ⬜ **Live app → DB round trip was never verified after the 2026-07-28 Cloud SQL downsize.**
  Andrew's local IP is not on the instance's authorized networks (by design) so no query
  could be run locally, and no test submission was made deliberately — it would write a PHI
  row. **Someone needs to click through one live quiz submission to close this out.**
  Explicitly restated as Unresolved item 5 in the locked audit and marked independent of it.
- ⬜ **Leftover test row, carried since session 27, still not confirmed deleted:**
  `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';` — it shows in
  the admin demo table.
- ⬜ Full manual click-through of the live storefront quiz beyond Part 1. Session 28 verified
  only as far as Part 1 (deliberately, to avoid writing test rows), and that was the first
  rebuild of `quiz-bundle.js` in a while.
- ⬜ `nc -z 34.139.97.17 5432` from local times out. **This is expected** (authorized
  networks), not a regression signal. Do not chase it.

---

## Open pre-launch blockers (UX-AUDIT)

- source: `docs/UX-AUDIT.md:236-257,423-424` (precedence 6)
- **Held as context, not promoted to requirements.** Flagged in `INGEST-CONFLICTS.md` INFO so
  they are not lost. Promote deliberately if they belong in the go-live milestone.

1. **CONTENT-1 — placeholder text live in the consent form.** `ConsentStep.tsx:56-57`,
   Section 4 "Laboratory Testing Authorization", reads:
   *"Provider may recommend IgE testing via Labcorp or Quest. Billed separately by lab.
   Insurance may not cover. `[PENDING — Treatment policy page language]`"*
   The `[PENDING — …]` marker is visible to real users in the live production consent form.
   This is a clinical consent document. Severity: CRITICAL / BLOCKER.
   Status: open — awaiting William sign-off.
   Related: the locked audit separately names a *different* placeholder as a hard launch
   blocker — the live app block's Medical Disclaimer Text field reading "This text needs
   changed." with the toggle off (`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:301`). That one
   **is** promoted, as `requirements.md#REQ-consent-and-disclaimer-finalization`. Two
   placeholders, two surfaces.
2. **CONTENT-2 — Test Mode button visible on the production page.** The coral-red "Test Mode:
   jump to outcome" button and yellow dashed container (`QuizContainer.tsx:457-501`) render
   whenever `isTestModeEnabled()` returns true — which checks `?test=1` in the URL or
   `window.AlleDropsQuizConfig.testMode === true`. **It was visible on the live production
   page** during the audit. Either the `testMode` flag is set in the Theme App Block's Liquid
   template, or the URL is loaded with `?test=1` somewhere in the storefront config. The
   shortcut bypasses all validation and submits synthetic data.
   Severity: CRITICAL / BLOCKER. Status: open — disable in the Shopify theme customizer.
   Named as the single highest-leverage fix in the audit's recommended order (1 line).

### Other open UX item
- **UX-4 — no progress indicator on StateGate / PatientInfo steps** (`QuizContainer.tsx:297-299`).
  `<QuizProgress>` renders only when `step === "quiz_parts"`. Severity MEDIUM, status open.
  Note this interacts with the flow reorder: adding a mandatory medical history part and a
  testing split changes the step count, and the progress label already derives from
  `QUIZ_PARTS.length`.
- Everything else in the UX audit (BUG-1/2/3, UX-1/2/3/5/6, VISUAL-1 through VISUAL-7) is
  marked fixed in sessions 7–9, plus EXTRA-1 through EXTRA-5.
- ⚠ VISUAL-2's session-9 fix "88px circle + severity colors applied" re-introduced the legacy
  `Minimal / Mild / Moderate / Severe` colour classes into the results UI. That collides with
  both the deprecated legacy band model and the three-bracket model. See `INGEST-CONFLICTS.md`
  WARNING on score-scale semantics.

---

## Storefront content inventory (May 8 audit, precedence 5)

Launch blockers still open. Not promoted to requirements except where a higher-precedence
document depends on them (`REQ-consult-landing-page`, `REQ-testing-claims-content-remediation`).

- **Both product pages** (`/products/tennessee-alledrops`, `/products/texas-alledrops`) —
  🔴 Major Rework, unchanged:
  - *"there is no longer a need for needles or allergy tests to receive allergy treatment"* —
    now directly contradicts the locked mandatory-testing decision.
  - No contraindication warnings (severe/uncontrolled asthma, current pregnancy, history of
    anaphylaxis).
  - No emergency instruction ("For allergic reactions or medical emergencies, call 911.").
  - No treatment duration expectation. Broken phrasing *"helps to increase and reduce allergy
    symptoms"*. Titles still "Tennessee - AlleDrops" / "Texas - AlleDrops" (dash, off-brand).
    All-caps insurance disclaimer.
- **`/products/allergy-consultation`** — price corrected to $99, but the "Schedule" button has
  no booking mechanism, no provider independence statement, no format details, and no
  statement that consultation is optional.
- **`/pages/consult`** — 404. Launch blocker. → `requirements.md#REQ-consult-landing-page`.
- **`/pages/our-team`** — now 404 (was live). Needs a decision: restore, or confirm
  intentional removal and clean up references. The About page now names only Dr. Ryan
  Sullivan MD; the other four previously listed providers (Dr. Miller, Dr. Wright, Aida
  Figueroa, Scott Sumrall) are no longer featured — confirm with William.
- **`/policies/privacy-policy`** — 🔴 Major Rework. Contact email still
  `andrew@21adsmedia.com`; no HIPAA / NPP / PHI language; marketing and advertising data-use
  provisions incompatible with HIPAA. See `constraints.md#CON-legal-content-prerequisites-before-first-patient`.
- **`/pages/allergy-quiz`** — medical disclaimer still reads *"for product recommendation
  purposes only and does not constitute medical advice."* A scored assessment that can return
  "no SLIT recommended" cannot be characterized that way. Requires William/counsel.
- **`/pages/test-options`** — now live, covering IgE testing via Labcorp/Quest, **the option
  to proceed without testing** (now invalid), and a "Book a Consultation" CTA. Clinical copy
  needs William's confirmation. No inline FDA notice, no emergency instruction, no lab pricing.
- **`/pages/how-it-works`** — mostly resolved; no link to `/pages-test-options`, and Step 3
  omits the $99 consultation fee.
- **Homepage / About** — "About AlleDrops" still says drops are *"customized to your region
  and allergy profile"* (overstates personalization); About still claims *"AOD has helped
  thousands of patients"* (must be verified before publishing); no 3–5 year treatment
  commitment mentioned.
- **Global footer** — FDA statement ends with a stray closing quotation mark:
  `…FDA-approved allergen extracts."` Appears on every page.
- **`/collections/all`** — Allergy Consultation still appears in the browse collection; legacy
  `/products/regional-allergy-drops` redirect (→ Texas) still unreviewed.
- Pricing verified: Quarterly $297, Semi-Annual $534, Annual $948, Consultation $99.
- Content pending from William: TN/TX allergen lists, IgE testing copy approval, "thousands of
  patients" verification, HIPAA NPP, revised quiz disclaimer, full contraindication list,
  consultation format details, Privacy/Security Officer names, Dr. Sullivan role confirmation,
  Our Team page decision.

---

## Infrastructure and cost

- source: `HANDOFF.md:7-57,174-193,415-417`
- **Cloud SQL cost incident (session 30, 2026-07-28).** `alledrops-quiz-data` (created
  2026-05-06, PG 18, us-east1-b) had run at `ENTERPRISE_PLUS` / `db-perf-optimized-N-8`
  (8 vCPU / 64 GB) since creation. Patched to `ENTERPRISE` / `db-custom-1-3840`
  (1 vCPU / 3.75 GB): ~$1,150/mo → **~$65/mo**. Automated backups (daily 07:00 UTC, 15
  retained) and PITR enabled. Downtime ~2 min. Public IP unchanged (`34.139.97.17`), so no Fly
  `DATABASE_URL` change was needed. Safety backup `1785246531060` taken first.
- Root cause was a Google default, not a manual misconfiguration — see
  `constraints.md#CON-cloud-sql-tier-defaults`.
- The $500 invoice reflected ~11 of 30 billed days (the instance was SUSPENDED 2026-06-06 →
  2026-06-24). **The honest number to give William is ~$65/mo, not $500.**
- **Automated backups were off for ~3 months on a database holding PHI** (2026-05-06 →
  2026-07-28). Nothing was lost, but it belongs in the compliance record.
- **Billing account problem, still open:** the `alledrops-quiz` project bills to the
  *Beautiful Rescues* billing account (`01860C-FD5E7A-41B5EC`) — a different client's. That
  caused the June suspension, which silently killed the dev DB for 18 days. Move it to
  *21 ads media* (`01E2C6-27AE09-412270`) or straight to AOD-owned GCP as part of the planned
  migration. This is the concrete argument for the production GCP migration.
- Key identifiers: project `alledrops-quiz` · instance `alledrops-quiz-data` · public IP
  `34.139.97.17` · Fly app `alle-drops-quiz-app` (iad).
- Local E2E setup: Cloud SQL Auth Proxy on port 5433, `DATABASE_URL` must use `127.0.0.1`
  (Docker occupies `::1:5433`); Fly `DATABASE_URL` uses the public IP with
  `sslmode=no-verify`; `/api/me/*` auth is JWT Bearer HS256 signed with
  `SHOPIFY_API_SECRET` (`HANDOFF.md:354-380`).

---

## Client engagement and commercial state

- source: `HANDOFF.md:60-66,94-107,425,144`
- **The 2026-07-29 3:00 PM ET William Miller call happened** — it is the source of the locked
  precedence-0 document.
- ⬜ **$1,800 invoice** (of $3,600) and the **Phase 2 SOW** have been held since 6/30 pending
  that call. Both are now unblocked. The $1,800 balance and any "beyond original scope"
  framing were deliberately kept verbal, not in writing.
- ⬜ Read William's 6/27 Google Doc comment reply — it may already answer the alledrops.com
  registration question.
- ⬜ Delete the dead Tue 7/28 3:30 PM calendar hold if it is still on the 21ads calendar.
- Andrew had gone silent on William from 7/1 to 7/25; three unanswered chases (7/7, 7/12,
  7/24). Resolved — call scheduled and held.
- The 6/27 feature requests are **paid Phase 2 work**, not warranty. Vault position:
  `[[AOD-Phase2-Scope-Position]]`.
- Andrew was considering passing GCP cost to the client. Reframe first: the number is ~$65/mo.

### Domain and trademark — UNRESOLVED
- source: `HANDOFF.md:100,203-217,269-277,415`
- `AllerDrops®` is a **live federal Class 044 trademark** (sublingual immunotherapy,
  Maryland). The Oct 2025 decision was therefore **`AlleDrops` / `alledrops.com`** (no R).
- The 6/24 call notes list `aod.services` (new corporate/email) and **`allerdrops.com`**
  (R+S) for the new Workspace — likely an AI-notetaker mishearing "Alle Drops," but **not
  verified**. If it really is `allerdrops.com`, re-raise the trademark before anyone buys or
  configures it.
- Whether `alledrops.com` was ever actually registered, and by whom, was **never confirmed**.
  Andrew explicitly declined to register it on the client's behalf; William said Legal
  Director Jean Caceres would. Jean later emailed with subject "Alledrops.com."
- Andrew separately owns `allerdrop.com` (singular) on Cloudflare — a dead placeholder from
  the abandoned "AllerDrop" name, unrelated to both. Can lapse.
- DNS is the client's task. Once ownership is confirmed and access granted:
  `fly certs create quiz.alledrops.com -a alle-drops-quiz-app`. (Earlier handoffs said
  `quiz.allerdrops.com` — that spelling was wrong.)
- **Flagged in `INGEST-CONFLICTS.md` as a WARNING** — a go-live milestone cannot pick a
  production domain while this is open, and there is trademark exposure.

### Production migration sequence (greenlit 2026-06-24)
- source: `HANDOFF.md:246-267,411-425`
1. William stands up **AOD Google Workspace** (~$6–12/mo) — manages domains, email, and the
   Google Cloud DB. Enables the **BAA** under Account Settings → Legal and Compliance. IT
   contacts: Robert (replaced Paul) and Gene.
2. William stands up **AOD Shopify** (Basic/Grow, ~$20/mo).
3. Team grants Andrew admin on both → Andrew migrates the Cloud SQL DB to AOD-owned Google
   Cloud and transfers the Shopify site.
4. Andrew does **not** want long-term PHI access post-migration.
- ⬜ Andrew's action items: write step-by-step setup instructions in the shared Google Doc
  (delivered per `HANDOFF.md:290-293`); migrate DB + transfer Shopify once admin is granted;
  configure the scheduling app as a Shopify plugin for the ~$99 consult; confirm exact domain
  spelling with William before he registers anything.
- Blocked on client: domains, Fly.io BAA question (likely moot), production GCP migration,
  in-house counsel review, consent text finalization, NPP, privacy policy, Privacy/Security
  Officer designation, HIPAA workforce training.

### Policy drafts (outside this repo, not committed here)
- source: `HANDOFF.md:226-244,279-282,296-297`
- `~/Documents/Claude/Projects/AoD/policy-drafts/`:
  `00-READ-FIRST.md` (flags the blocking question "who is the covered entity?" — the AOD
  platform may be a business associate of the providers' professional entity, and lists all
  `[BRACKET]` decisions), `01-notice-of-privacy-practices.md`,
  `02-privacy-policy.md` (Shopify default merged with HIPAA language; health info carved out
  of marketing / "sale" / "share" / targeted advertising in 5 places),
  `03-treatment-policy.md` (fills the `[PENDING]` consent-screen placeholder + refund rules
  for compounded Rx), `04-quiz-disclaimer.md` (rewords the disclaimer that mischaracterizes a
  scored clinical questionnaire as "product recommendation only"),
  `setup-instructions-for-google-doc.md`.
- All non-binding drafts for AOD counsel. Received well on the 6/24 call; the disclaimer fix
  was explicitly confirmed as a pre-launch must. **Not yet wired into app or theme.**

---

## Compliance operations

- source: `docs/breach-response-runbook.md` (precedence 7)
- Owner: William (Privacy Officer) + Andrew (Security Officer, designate). Contacts table is
  mostly TBD, and the HIPAA records storage location is TBD (William to designate).
- Breach triggers include: unauthorized Cloud SQL access; PHI in Fly.io logs, error messages,
  or any system outside the BAA chain; PHI written to Shopify metafields / Admin API / Google
  Sheets / Google Drive; lost device with Cloud SQL or Fly credentials; compromised
  `SHOPIFY_ADMIN_ACCESS_TOKEN` or `DATABASE_URL`; accidental public commit of secrets.
- Post-incident prevention checklist: rotate all Fly secrets; audit Fly log retention to
  confirm request bodies are not logged; run `npx tsx scripts/phi-cleanup-verify.ts`; audit
  `submission_access_log` for anomalies; review Cloud SQL authorized networks for stale IPs.
- Full obligations in `constraints.md#CON-phi-retention-and-breach-obligations`.

---

## Open technical flags (not scoped)

- source: `HANDOFF.md:142-143,445`
- ⚠ **Klaviyo on the quiz page.** `allergist-on-demand.myshopify.com/pages/allergy-quiz` loads
  `static.klaviyo.com` and `static-tracking.klaviyo.com` directly. The repo's own `CLAUDE.md`
  bans Klaviyo by name on PHI-collecting pages. May be theme-level, not app-level. Flagged,
  not fixed. → `constraints.md#CON-no-third-party-trackers-on-phi-pages` and a WARNING in
  `INGEST-CONFLICTS.md`.
- `package-lock.json` is gitignored in this repo — unusual for reproducible builds. Not
  touched; noted in case it is unintentional. It must exist in the working tree at deploy time.

---

## Things William was told that the code does not support

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:280-291` (precedence 0)
- Useful as an expectations-management inventory: each line is a live gap between what the
  client believes and what ships today.
1. "The testing-first button takes you to the testing page." It cannot, and hasn't since the
   iframe embed shipped. Consult and Return Home are broken identically.
2. "Every patient supplies medical history." Today only `7+` patients who explicitly decline
   testing reach it.
3. "There's no way to proceed without testing." There are two, and one skips medical history
   entirely.
4. "The patient returns logged in and sees the quiz is complete." Data and API exist; nothing
   in the purchase flow reads them.
5. "Submissions are saved but there's no resume." Accurate and understated — nothing saves
   until final submit, so abandonment loses the whole questionnaire.
6. The results page isn't called "Preliminary Score" and has no scale.
7. Telehealth and SLIT patients get identical closing copy.
8. Nothing gates any purchase. Not weakly enforced — absent.
9. The one working redirect points at a 404 (product handle spelling).

---

## Effort ranking from the locked audit

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:257-276` (precedence 0)
- Reproduced verbatim in order, for roadmap sequencing. "Only the last row is genuinely hard.
  Item 5 is structurally significant but bounded. Everything else is tedious or trivial."

1. R7.2 scroll — 15 min (three lines of Liquid)
2. R2 label copy — 10 min
3. R4 title + business-day copy — 30 min (two string edits)
4. R7.1 routing — 1–2 h (`navigateParent()` across 4 sites + handle typo)
5. Quiz schema foundation — 1 day (**load-bearing for R3/R5/R6**)
6. R5 delete no-testing paths — 2–3 h (**must land after R3's reorder**)
7. R4 thermometer — 3–5 h (new component + derived max-score function)
8. R6 diagnosis question — 2–4 h (blocked on clarifying with William)
9. R5 Part 7 page — 1 day (cheap only because upload was dropped)
10. R3 medical history rebuild — 1.5–2 days (content trivial, schema is the work)
11. R8 storefront "quiz complete" — 1–2 days (needs metafield definition + Liquid + reliable link)
12. R9 telehealth branching — 1.5–2 days (blocked on `/pages/consult`)
13. R10 ordering surface — 3–5 days (two new extensions + admin content)
— Resume/edit a submission — **1+ week, architecturally hard. Not committed.**

---

## Unresolved items carried by the locked audit

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:294-302` (precedence 0)
1. **Metafield Liquid readability** — no definition created in the repo; customer metafield
   storefront exposure unverified. **Gates R10.** → check
   `metafieldDefinitions(ownerType: CUSTOMER)` in admin GraphQL, or Settings → Custom data →
   Customers.
2. **R6 scope** — distinct question or duplicate of R3's checkbox list. → one question to
   William.
3. **Live product handles** — the mismatch finding rests on a May 8 audit. → hit
   `/products/tennessee-alledrops.js`.
4. **R3's third free-text label** — truncated in William's email. Appears to be "Please list
   any other medical conditions that you have."
5. **Live DB round trip** — never verified after the 2026-07-28 Cloud SQL downsize.
6. **Medical disclaimer text** — live app block field reads "This text needs changed." and the
   toggle is off. Hard launch blocker, owned by William/counsel.

---

## Deferred — Phase 2.5, do not scope into current work

- source: `HANDOFF.md:429-435`
- Provider review status workflow (`new → reviewed → contacted → scheduled`)
- Provider notes on submissions
- Structured audit dashboard (who viewed what, when)
- Bulk operations
- Scheduling integration

---

## Process lessons worth keeping

- source: `HANDOFF.md:44-52,131-138`
- **Do not trust HTTP-header cache theories over live DOM evidence.** A `cache-control` header
  led to a wrong "just a caching quirk" conclusion; the real bug was a completely different
  bundle never being rebuilt. The fix came from navigating the live page in Chrome DevTools
  and inspecting rendered DOM plus exact network response bytes.
- **A successful `fly deploy` is not proof a fix is live.** The deploy was real and the app was
  healthy while it served a stale static file the build never touched.
- Diffing occurrence counts of a known string across bundle versions is a cheap pre/post
  sanity check.
- Check every project on a billing account before blaming one client — turns "probably the
  database" into "provably only the database."
- Cost figures in `HANDOFF.md` are list-price estimates; **the invoice is the authority.**
