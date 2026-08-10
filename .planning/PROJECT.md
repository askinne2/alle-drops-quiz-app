# AlleDrops — Clinical Symptom Quiz + Shopify Storefront

## What This Is

AlleDrops is a Shopify storefront plus an embedded, HIPAA-shaped clinical symptom quiz for
sublingual immunotherapy (SLIT), built for Allergist On Demand (AOD) and available in Tennessee
and Texas only. A patient completes a scored symptom questionnaire, supplies a medical history,
confirms allergy testing, and receives a Preliminary Score; Dr. Sullivan reviews the intake before
treatment. The catalog is two ~$300 SLIT SKUs (TN and TX) plus one $99 telehealth consult.

Built by 21 ads media (Andrew Skinner) for AOD. Primary client contact: William Miller.
Clinical lead: Dr. Ryan Sullivan. Legal Director: Jean Caceres (domain registration).
IT: Robert (IT Director), Gene (currently on PTO — blocking Google Workspace setup).

## Core Value

A patient in Tennessee or Texas can complete a clinical intake that Dr. Sullivan can actually
treat from, on AOD-owned infrastructure, without any PHI leaving the BAA chain.

## Milestone

**v1.0 — AlleDrops go-live.** Done means: the storefront and quiz are live on AOD-owned
infrastructure, William's 2026-07-29 locked requirements are met, and no launch blocker remains
open.

Baseline at roadmap time: branch `main`, 51/51 tests passing, typecheck clean, deployed to Fly
(`alle-drops-quiz-app`, iad). The locked audit's own headline: the code is *"roughly one third of
the way to what William now expects, and that third is mostly the pre-call design."*

## Requirements

### Validated

<!-- Shipped and confirmed working against the 2026-07-29 code audit. Verify, do not rebuild. -->

**Validated in Phase 1: Live Defect Fixes (complete 2026-07-30, deployed and verified on served bytes)**

- ✓ **DEF-01** — parent storefront scrolls to the top of the quiz on step change, instantly, clear of
  the sticky header (desktop measured; mobile clearance is the one open human-verification item)
- ✓ **DEF-02** — all in-quiz redirects navigate the parent storefront, not the iframe; the
  `quiz:navigate` payload is keyed on `path` so a version skew fails closed
- ✓ **DEF-03** — product handles corrected (`tennessee-allerdrops` → `tennessee-alledrops`); both
  handles return 200 live, both misspellings 404
- ✓ **DEF-04** — medication label reads without the `(required)` suffix

Also hardened in Phase 1, outside the original plan scope and authorized in-session:

- ✓ Reflected XSS on `/quiz-embed` closed (`jsonForScript` + per-response nonce CSP). Three of six
  sinks predated this phase, so it was **live in production**.
- ✓ Open-redirect class closed across **four** hand-ported copies of the path validator. The WHATWG
  parser strips TAB/LF/CR before parsing, defeating positional checks.
- ✓ A **live, verified-exploitable** open redirect in `entry.theme.tsx` closed. Two independent
  reviews had classified it as dead code; `/quiz-embed` loaded top-level reaches it.
- ✓ Consult fallback moved off `/pages/consult`, which returns 404 — blanking that theme setting
  sent a patient who had just completed a clinical intake to a dead page.

Test suite went 51 → **173** across 17 files.

- ✓ TN/TX eligibility gate (`StateGate.tsx`) — server-revalidated
- ✓ Patient info step with 18+ DOB gate; DOB never written to Shopify
- ✓ Scored questionnaire Parts 1–5 and bracket scoring (`0-2` / `3-6` / `7+`)
- ✓ Exclusive "None of the Above" on all three Part 1 symptom sections, excluded from score
- ✓ Submission persistence — single terminal POST to Cloud SQL `submissions.answers_json`
- ✓ Summary-only Shopify customer metafields (namespace `alledrops`), no PHI
- ✓ Patient assessment ledger + PDF (`/api/me/assessments`, `quiz-history` extension)
- ✓ Admin submission surfaces — list, filters, detail modal, PDF, stats, access logging
- ✓ Consent step mechanically wired with `consent_version` per submission

### Active

Full checkable list with IDs: `.planning/REQUIREMENTS.md`. Grouped summary:

- [x] Four live defects in already-shipped work (scroll, iframe navigation, product handles, copy) — **Phase 1 complete 2026-07-30, deployed and verified**
- [ ] Quiz schema foundation — `required`, `showIf`, static-info question type
- [ ] Mandatory medical history for every patient, positioned before the testing split
- [ ] Allergy-diagnosis question adjacent to the Part 5 medication questions
- [ ] Mandatory allergy-testing split with exactly two options, and deletion of both no-testing bypasses
- [ ] Preliminary Score page — retitle, review copy, derived ceiling, colour-banded scale
- [ ] Purchase prerequisites (honor system) + returning-patient completion surface
- [ ] Telehealth intake path and a booking-capable `/pages/consult`
- [ ] Launch readiness — trackers, placeholders, BAAs, NPP, AOD infrastructure handoff

### Out of Scope

- ~~**Resume / edit an in-progress submission** — 1+ week and architecturally hard. Quiz state is
  React `useState` only; nothing persists until the terminal POST; there is no draft table, no
  `updateSubmission`, and `symptom_profile_id` is `NOT NULL UNIQUE`. It was implied by what the
  client was told on the call but never committed. Source directive: *"Do not let this get promised
  casually."* **Carried as an explicit risk, not a phase** — see Risks below.~~

  ⚠️ **PARTIALLY RETRACTED 2026-08-09.** It is now **Phase 4.2 — Resume In-Progress Intake**,
  scoped to **browser-local (`localStorage`) resume only**. The original is kept struck through so
  anyone who read it sees that it changed and why (same convention as
  `DEC-testing-results-by-email-not-upload` and the `injectIframe` correction).

  **The original's cost analysis was never disproven — it was routed around.** The 1+ week estimate,
  the absent draft table, the missing `updateSubmission`, and the `NOT NULL UNIQUE` constraint on
  `symptom_profile_id` all still hold *for the server-side design*. Two further gaps were measured
  on 2026-08-09: the app has **no email infrastructure of any kind** (zero occurrences of
  `nodemailer`/`resend`/`sendgrid`/`postmark`/`mailgun`/`sendEmail` across `app/` and
  `package.json`), and a server draft would be a **second PHI store** needing its own access
  controls, breach-runbook coverage, and retention policy — plus an open counsel question about
  whether an abandoned partial intake is a medical record under 6-year retention at all.

  **Browser-local sidesteps all of it.** The draft never leaves the patient's device, so it is the
  patient's own copy of their own information — not something the covered entity holds. No draft
  table, no email provider, no token system, no new BAA surface. ~1–2 days instead of ~1 week.

  **STILL OUT OF SCOPE, and the original warning still applies to it:** cross-device resume, and any
  "you left something unfinished" follow-up. Both require the server-side draft and its BAA chain,
  and neither has been priced.
- **Account-flag gating, Shopify Functions, real-time checkout blocking, mandatory accounts,
  manual clinical unlock, `orders/create` auto-cancel backstop, Locksmith-style gating apps,
  `tagsAdd` approval flow** — all removed by `DEC-purchase-gating-is-honor-system`. AOD is on
  Shopify Basic/Grow; only Plus can ship custom apps containing Function APIs, and Plus
  (~$2,300/mo) was dismissed by both parties.
- **PHI file upload for allergy test results** — dropped in favor of emailing
  `testing@alledrops.com`. No file input, multipart parsing, object storage, or upload column.
- **Google Sheets as a PHI store** — dead. `app/lib/google-sheets.ts` is an intentional tripwire
  that throws, with zero imports repo-wide (verified 2026-07-29). Keep the tripwire; fix the docs
  that still describe it as live.
- **`quiz_responses_full` JSON metafield in Shopify** — `HIPAA_COMPLIANCE_ANALYSIS.md:143-161`
  proposes it, and flags it as valid only if the data is NOT PHI. It is PHI. Do not build.
- **Phase 2.5 backlog** — provider review-status workflow, provider notes, structured audit
  dashboard, bulk operations, scheduling integration. Explicitly deferred.
- **Admin customer detail drill-down and CSV export** — deferred to v2; not needed for go-live.
- **Scoring work for any new quiz section** — impossible by construction. `calculateTotalScore`
  takes an explicit list and is always called with `ALL_SCORED_QUESTIONS` (Parts 1–5). New
  sections cannot alter the score. Do not create scoring tasks.
- **Geographies beyond Tennessee and Texas** — client-confirmed 2026-06-24. No storefront copy may
  imply otherwise.

## Context

**Stack.** React Router 7 (Remix lineage) on Node, deployed to Fly.io. Shopify custom app with
theme app extensions. Cloud SQL Postgres for PHI. Prisma for Shopify session storage only.
`extensions/` contains `quiz-block` (theme app block) and `quiz-history` (customer profile).

**Embed path.** The installed storefront path is the Liquid theme app block
(`extensions/quiz-block/blocks/symptom-quiz.liquid`, `target = "section"`), confirmed against the
live theme editor 2026-07-29.

⚠️ **CORRECTED 2026-07-30 — this section previously read "the `quiz-bundle.js` injection path
(`app/entry.theme.tsx` `injectIframe()`) is not in play." That claim was wrong and it cost a live
security hole.** It is true only of the *storefront*. `/quiz-embed` itself renders a
`data-alledrops-quiz` container **and** loads the bundle, and `initQuiz()` selects `injectIframe`
whenever `window.self === window.top` — so opening the public `/quiz-embed` URL top-level runs that
path on a PHI-collecting page. Its handler had no origin check and no path validation, and was
confirmed exploitable against production during Phase 1 Gate F (fixed in `14e13ff`).

The wrong claim propagated from here into Plan 01-04's "dead code" finding and then into the code
review, which inherited it and excluded the file from scope. Two independent reviews cleared code
that was live. **`injectIframe` IS in play whenever the bundle loads on a top-level page; parent-side
fixes there do ship.** Treat any future "path X is not in play" statement as scoped to the entry
point actually measured, not to all of them.

**Build.** `public/quiz-bundle.js` is a committed artifact built by `npm run build:theme`, not by
`npm run build`. A successful `fly deploy` is not proof a front-end fix is live — verify rendered
DOM and exact network response bytes.

**Infrastructure.** GCP project `alledrops-quiz`, instance `alledrops-quiz-data`
(`34.139.97.17`), patched 2026-07-28 from `ENTERPRISE_PLUS`/8 vCPU to
`ENTERPRISE`/`db-custom-1-3840` — ~$1,150/mo → ~$65/mo. Backups + PITR now on; they were off for
~3 months on a PHI database, which belongs in the compliance record. The project still bills to
another client's *Beautiful Rescues* billing account, which caused a June suspension. Migration to
AOD-owned GCP is greenlit and blocked on the client.

**Commercial.** The $1,800 balance (of $3,600) and the Phase 2 SOW were held pending the
2026-07-29 call and are now unblocked. The 6/27 feature requests are paid Phase 2 work, not
warranty. The honest GCP number to give William is ~$65/mo, not the $500 invoice.

**Expectations gap.** Nine items are on record as told to William but not supported by the code
(`intel/context.md#things-william-was-told-that-the-code-does-not-support`). Read that list before
any client conversation about status.

## Constraints

- **Compliance (HIPAA)**: Quiz data is treated as PHI. Every system touching PHI must sit inside a
  BAA chain; PHI in any system outside it is a reportable breach under AOD's own runbook. Final
  legal determination is still deferred to counsel, and "who is the covered entity?" is unanswered.
- **Compliance**: Shopify is not HIPAA-compliant and does not sign BAAs. Shopify holds summary
  metafields only — never PHI, never DOB. Verify with `npx tsx scripts/phi-cleanup-verify.ts`.
- **Compliance**: No analytics, pixel, or marketing trackers on any PHI-collecting page. The repo's
  own `CLAUDE.md` bans Klaviyo by name. **Currently violated** — see Risks.
- **Compliance**: 6-year HIPAA retention. Never delete submission data during incident response.
  Individual notification within 60 days of discovery.
- **Compliance**: Andrew does not want long-term PHI access post-migration. Any design requiring
  ongoing agency-side PHI access is out of bounds.
- **Platform**: Shopify Basic/Grow, not Plus. No Shopify Functions in a custom app. Limited
  checkout text surface. App scopes are `read_customers,write_customers` only — any `read_orders`
  work needs a merchant reinstall, and there is no order webhook plumbing to extend.
- **Platform**: `Location.assign` is `[LegacyUnforgeable]` — non-writable, non-configurable, and
  the monkey-patch attempt fails silently in sloppy mode. Cross-frame navigation must go through
  `postMessage` to the parent.
- **Platform**: The iframe is `scrolling="no"` at full content height, so the parent document is
  the only scroller. A dropped `postMessage` means no scroll at all.
- **Schema**: `state` ∈ {tennessee, texas}; DOB valid ISO and 18+; email valid; phone ≥ 10 digits;
  `score_bracket` ∈ {`0-2`, `3-6`, `7+`}. New quiz sections extend `answers`, not the top-level
  payload schema.
- **Schema**: `submissions` is insert-only. No `updateSubmission` exists.
  `personal_history_json` / `family_history_json` become vestigial after the medical history rebuild.
- **API**: Error responses must never leak `dbErr.message`. Callers get
  `{ error: "Could not save assessment" }` only.
- **Process**: No clinical or medical claim ships without William or counsel approval. Do not
  author clinical copy to unblock a build task.
- **Ops**: Any future Cloud SQL instance must set `--edition=ENTERPRISE` explicitly (PG16+ silently
  defaults to Enterprise Plus) and enable automated backups plus PITR at creation.
- **Ops**: `/health` returns a static payload and does not touch the database. A 200 proves nothing
  about Postgres connectivity.

## Key Decisions

<decisions>

<decision id="DEC-mandatory-allergy-testing" status="LOCKED" date="2026-07-29" source="docs/REQUIREMENTS-AND-GAPS-2026-07-29.md (R5, CALL OVERRIDE)">
Allergy testing is mandatory before sublingual immunotherapy. The allergy-testing step offers
exactly two options — "I need allergy testing" (refer to testing options) and "I've already had
allergy testing" (results branch collecting Year, Location, and reacted-to allergens). There is no
third option and no path to purchase without testing.
Rationale: Dr. Sullivan requires testing before immunotherapy, reinforced by legal counsel.
William: "if we are going to market as treatment from a board certified allergist, we have to check
all the boxes a typical patient would check."
Reverses: the 2026-06-27 email's optional-testing branch and its copy stating testing is "not
required." Invalidates live storefront copy on both product pages and `/pages/test-options`.
</decision>

<decision id="DEC-purchase-gating-is-honor-system" status="LOCKED" date="2026-07-29" source="docs/REQUIREMENTS-AND-GAPS-2026-07-29.md (R10, CALL OVERRIDE)">
Purchase gating is an honor system plus human verification at fulfillment, not enforced
architecture. In scope: product-page prerequisite checkboxes gating add-to-cart (quiz completed,
allergy testing submitted); checkout page language; a thank-you page block explaining clinical
review and a 2–3 business day expectation; order confirmation notification language; refund policy
stating the honor-system terms.
Out of scope, do not build: account-flag architecture, Shopify Functions, real-time checkout
blocking, mandatory accounts, manual clinical unlock. Enforcement is human — AOD fulfillment
verifies quiz + testing before shipping and contacts or refunds anyone who powers through.
Rationale: William took the custom architecture off the table himself — "I don't want to add a
bunch of extra things that would mean we need to pay you more or redo our agreement."
</decision>

<decision id="DEC-medical-history-before-testing-split" status="LOCKED" date="2026-07-29" source="docs/REQUIREMENTS-AND-GAPS-2026-07-29.md (R3, CALL OVERRIDE — position)">
The medical history section moves before the allergy-testing split, into the main `QUIZ_PARTS`
array. Every patient supplies a medical history regardless of path, including telehealth-only
patients. Medical history must not affect the score.
Rationale: even a patient who books a consult directly still needs history on file for Dr. Sullivan.
Hard sequencing consequence: `setStep("medical_history")` (`QuizContainer.tsx:243`) is currently the
only entry point to the section, and it is reached exclusively through the now-forbidden
proceed-without-testing flow. The reorder must land BEFORE the no-testing deletions or medical
history becomes dead code.
</decision>

<decision id="DEC-testing-results-by-email-not-upload" status="RETRACTED" date="2026-07-29" retracted="2026-08-09" retracted_by="04-CONTEXT.md D-01" source="docs/REQUIREMENTS-AND-GAPS-2026-07-29.md (R5)">
~~File upload for allergy test results is dropped. Patients email results to
`testing@alledrops.com` using the same email address they used on the quiz. William: "it's fine if
they just want to email it directly to us."
Consequence: no new PHI file-handling infrastructure — no file input, no multipart parsing, no
object storage, no upload column, no PHI storage decision. Removes the single most expensive item
on the 6/27 list (3–4 days → ~1 day of static copy and three text fields).
Note: the email address itself is baked into locked copy and therefore depends on the unresolved
domain-spelling question.~~

**RETRACTED 2026-08-09.** Andrew reversed this decision in the Phase 4 discussion. Test-result
upload is now IN Phase 4 and required on the `had_testing` branch, per D-01 and D-02. This reversal
re-adds the 3–4 day estimate this decision had removed. It also introduces three client-side
blockers: **William** needs to agree to upload and price it, the **Fly.io BAA** needs to be signed,
and the **AOD GCP** cutover needs to land before object storage can move out of Andrew's dev
project. The `testing@alledrops.com` email address disappears from the copy entirely, so the
unresolved domain-spelling question no longer gates Phase 4 (it still gates LAUNCH-07). Source:
`.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md` §`<decisions>` D-01.
</decision>

<decision id="DEC-no-approval-promise-copy" status="LOCKED" date="2026-07-29" source="docs/REQUIREMENTS-AND-GAPS-2026-07-29.md (R4, CONFLICT — email copy that is now wrong)">
The 2026-06-27 email's Preliminary Score paragraph promising "you will be able to purchase SLIT
through our site if approved" must not ship. It describes the manual-unlock model the call replaced
with the honor system.
No manual-unlock or account-approval copy exists in the code today (searched `approv`, `unlock`,
`clinical team`, `under review`, `pending review`). Nothing to remove — only something not to add.
</decision>

<decision id="DEC-derive-max-score-from-question-set" status="LOCKED" date="2026-07-29" source="docs/REQUIREMENTS-AND-GAPS-2026-07-29.md (R4)">
The Preliminary Score page needs a real score ceiling for its "where you fall on the scale" bar,
and that maximum must be derived from the question set in code, not hardcoded — hardcoding
"silently rots when new sections land." There is no maximum-score constant today;
`SCORE_BRACKETS.HIGH.max === Infinity` (`app/lib/quiz/scoring.ts:7`). Reading `questions.ts` the
theoretical max appears to be 60 (12 + 10 + 15 + 20 + 3).
Unresolved dependency: what the scale actually displays is NOT settled — see Blocked Decisions.
</decision>

</decisions>

Non-locked standing decisions:

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat quiz data as PHI | Scored clinical questionnaire used by a board-certified allergist to make treatment decisions | — Pending final counsel determination; the same doc's "Original Analysis" reaches the opposite provisional conclusion |
| PHI persists in Cloud SQL, not Google Sheets | Precedence-0 code audit; the Cloudflare Worker and Apps Script that proxied PHI to Sheets were deleted in session 25 | ✓ Verified 2026-07-29 — `app/lib/google-sheets.ts` has zero imports repo-wide and throws by design |
| Scoring decoupled from the quiz parts array | As-built: `calculateTotalScore` always receives `ALL_SCORED_QUESTIONS` | ✓ Good — new sections need zero scoring work |
| Geo scope TN + TX only | Client-confirmed 2026-06-24 | ✓ Good |
| Migrate PHI to AOD-owned GCP under AOD's Workspace BAA | Removes agency PHI custody and fixes the cross-client billing account | — Pending; blocked on client (Gene on PTO) |
| Keep `app/lib/google-sheets.ts` as a throwing tripwire | Cheaper than deletion at catching a regression that would be a reportable breach | ✓ Good — fix the docs, keep the file |

## Blocked Decisions (client-owned — do not guess)

**1. Score scale semantics — blocks the Preliminary Score visual.**
Three incompatible models are in play: a deprecated 0–60 four-band model
(`minimal`/`mild`/`moderate`/`severe`), a live three-bracket model with an open-ended `7+` top, and
a results UI that had the legacy four-colour classes re-applied in session 9
(`quiz.module.css:295-299`). If the range is 0–60 and the brackets drive the colour, `7+` occupies
54 of 60 points — 90% of the bar — and almost every patient renders deep in the red. That is
clinically misleading and is not what "green / yellow / red" implies.
**Confirm with William:** (a) the numeric range the bar displays, (b) the colour-band boundaries on
that range, (c) whether the three brackets or the four legacy bands drive the colour.
**Separable and NOT blocked:** the page title rename to "Preliminary Score" and the 1–2 business
day review copy. Ship those independently.

**2. Product domain spelling — blocks DNS, Workspace domain config, and locked copy.**
`alledrops.com` (no R) was chosen in October 2025 *specifically because* "AllerDrops" collides with
the live federal `ALLERDROPS®` mark (Class 044, sublingual immunotherapy, Maryland) — the same
product category. Later 6/24 call notes list `allerdrops.com` (R+S), but those notes come from a
non-authoritative auto-generated transcript and are likely a mishearing of "Alle Drops." The
2026-07-29 locked doc does not list this among its unresolved items, so there is no evidence the
call settled it. Nobody has confirmed whether `alledrops.com` was ever registered, or by whom —
Andrew declined; William said Jean Caceres would; Jean later emailed with the subject
"Alledrops.com."
**Blocks:** DNS, `fly certs create quiz.alledrops.com`, Google Workspace domain configuration, and
the `testing@alledrops.com` address baked into locked copy.
**Confirm the exact spelling with William directly, not from the transcript, before anyone
registers or configures anything.** Andrew's unread 6/27 Google Doc comment reply may already
answer the registration question.

## Open Questions (record, do not resolve)

1. **Is the "allergy diagnosis" question distinct from the medical-history checkbox list?** R3 is
   comorbidity history (asthma, COPD, cancer, autoimmune); R6 reads as allergy diagnosis. The
   transcript fragment is thin. One question to William — building it twice is waste.
2. **The third medical-history free-text label is truncated in William's source email.** It appears
   to be "Please list any other medical conditions that you have." Needs confirming.
3. **Is resume/edit of an in-progress submission expected?** It does not exist and is 1+ week of
   work. It was implied by what the client was told on the call but never committed. See Risks.

## Risks

- **Abandonment loses everything.** Nothing persists until the terminal POST. A patient who
  abandons at the newly-mandatory testing split loses the entire questionnaire, not just their
  place. Making testing mandatory makes that abandonment point *more* likely, not less.
  ~~Resume is out of scope for v1.0 — this risk ships with the milestone unless the client funds
  it.~~ **UPDATED 2026-08-09:** two phases now address this — **Phase 4.1** moves the testing split
  and its required upload to the FRONT so hitting the wall costs seconds rather than ten minutes,
  and **Phase 4.2** adds browser-local (`localStorage`) resume. Both are unblocked; neither needs a
  BAA. **Residual risk after both ship:** browser-local resume does not survive a cache clear,
  private browsing, or a switch to another device — a patient who starts on a laptop and returns on
  a phone still loses everything. Cross-device resume remains out of scope and unpriced.
- **Klaviyo on a PHI-collecting page.** `/pages/allergy-quiz` was observed loading
  `static.klaviyo.com` and `static-tracking.klaviyo.com`. Zero references in this repo, so it is
  theme or Shopify-app level. This is a PHI disclosure to a vendor with no BAA and a reportable
  breach trigger under `docs/breach-response-runbook.md:16`. It also invalidates the
  privacy-policy carve-outs counsel is being asked to review. Audit for Meta Pixel and GA on the
  same page.
- **Test Mode live in production.** The coral-red "Test Mode: jump to outcome" button was visible
  on the live page during the UX audit. It bypasses all validation and submits synthetic data.
  One-line theme-customizer fix, highest leverage item on the audit's list.
- **Placeholder text on live clinical surfaces.** Two of them, on two surfaces: the app block's
  Medical Disclaimer Text field reads "This text needs changed." with the toggle off, and
  `ConsentStep.tsx:56` renders a literal `[PENDING — Treatment policy page language]` in a clinical
  consent document.
- **Customer link is best-effort email matching.** A patient who quizzes with one email and buys
  with another is unlinked; `api.quiz.submit.tsx` sets `customerLinkSkipped` in three places. The
  returning-patient completion surface inherits that weakness.
- **Client-side dependency chain.** Google Workspace setup is blocked on Gene (PTO), which blocks
  the BAA, which blocks the GCP migration, which blocks go-live. Escalate to Robert (IT Director)
  if Gene's PTO extends.
- **Metafield Liquid readability unverified.** No metafield definition exists in the repo.
  Unstructured metafields have restricted storefront exposure, so the product-page prerequisite
  checkboxes may not be able to read completion state at all. Spike before committing to that design.

---
*Last updated: 2026-07-30 — Phase 1 complete (`/gsd:execute-phase 1`), deployed and verified on served bytes. Originally created 2026-07-29 from `/gsd:new-project` ingest of 9 documents (`.planning/intel/`).*
