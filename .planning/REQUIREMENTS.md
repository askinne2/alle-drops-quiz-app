# Requirements: AlleDrops — v1.0 go-live

**Defined:** 2026-07-29
**Core Value:** A patient in Tennessee or Texas can complete a clinical intake that Dr. Sullivan can
actually treat from, on AOD-owned infrastructure, without any PHI leaving the BAA chain.

**Source of truth:** `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (SPEC, precedence 0, **LOCKED** —
the 2026-07-29 William Miller call) wins every conflict. Synthesized intel:
`.planning/intel/requirements.md`. Each requirement below carries its intel slug so it can be
traced back to source line numbers.

**Status values are as-built claims from the 2026-07-29 code audit** (`main`, 51/51 tests passing).
Do NOT read `docs/app-requirements.md` checkboxes as current truth — several mark completion of
behavior the locked call now requires deleted.

---

## Already Satisfied (verify, do not rebuild)

Shipped and confirmed by the 2026-07-29 audit. Not part of v1.0 phase coverage.

| ID | Requirement | Intel slug |
|----|-------------|------------|
| DONE-01 | TN/TX eligibility gate, server-revalidated | `REQ-state-gate-tn-tx` |
| DONE-02 | Patient info capture with 18+ DOB gate; DOB never sent to Shopify | `REQ-patient-info-step` |
| DONE-03 | Scored questionnaire Parts 1–5 with `0-2` / `3-6` / `7+` brackets | `REQ-scored-questionnaire-parts-1-5` |
| DONE-04 | Exclusive, score-excluded "None of the Above" on all three symptom sections | `REQ-none-of-the-above-options` |
| DONE-05 | Terminal POST persists full intake to Cloud SQL `submissions.answers_json` | `REQ-submission-persistence` |
| DONE-06 | Summary-only Shopify customer metafields, namespace `alledrops`, no PHI | `REQ-shopify-summary-metafields` |
| DONE-07 | Patient assessment ledger + PDF, `quiz-history` customer-profile extension | `REQ-patient-ledger-and-pdf` |
| DONE-08 | Admin submissions list, detail modal, PDF, stats, access logging | `REQ-admin-submission-surfaces` (drill-down + export → v2) |

> DONE-05 carries an open verification: the live app→DB round trip has never been confirmed since
> the 2026-07-28 Cloud SQL downsize. Closed by **LAUNCH-04**, not by re-implementation.

---

## v1 Requirements

### Live Defects (already-shipped work)

- [x] **DEF-01**: The parent storefront page scrolls to the top of the quiz on every step change —
  the `quiz:scrollToTop` message is already posted, but the listener is missing from
  `extensions/quiz-block/blocks/symptom-quiz.liquid:56-69` (`REQ-scroll-to-top-on-step-change`)
- [x] **DEF-02**: All four in-quiz redirects navigate the parent storefront page, not the iframe —
  delete the silently-failing `window.location.assign` override at `app/routes/quiz-embed.tsx:57-59`
  and add a `navigateParent(url)` helper that resolves relative URLs against the shop origin
  (`REQ-iframe-parent-navigation`)
- [x] **DEF-03**: The AlleDrops product link resolves to a live product page in both states —
  `app/lib/quiz/product-links.ts:2-5` uses `tennessee-allerdrops` / `texas-allerdrops`; the live
  handles are `tennessee-alledrops` / `texas-alledrops` (`REQ-correct-product-handles`)
- [x] **DEF-04**: The medication question label reads exactly "Please list your current allergy
  medications and dosages" — drop the `(required):` suffix at `app/lib/quiz/questions.ts:198`
  while keeping required-ness enforced (`REQ-medication-question-copy`)

### Quiz Schema Foundation

- [x] **SCH-01**: A quiz question can declare `required: true`, a `showIf` visibility predicate, and
  an info/static content type, all expressible declaratively in `app/lib/quiz/types.ts`
  (`REQ-quiz-schema-foundation`)
- [x] **SCH-02**: No question-ID literals remain in `QuizPartRenderer.tsx` — the display hardcode at
  `:36-38` and the `isPartComplete` hardcodes at `:276-278,295-299` are expressed through SCH-01
  with identical behavior (`REQ-quiz-schema-foundation`)

### Medical History (mandatory, before the testing split)

- [x] **HIST-01**: A multi-select comorbidity checklist offers asthma, eczema, anaphylaxis, heart
  disease, COPD, lung disease, cancer, autoimmune conditions, immune system deficiencies
  (acquired / induced), angioedema, and none of the above (`REQ-medical-history-mandatory`)
- [x] **HIST-02**: Checking any box — including "none of the above" — reveals a free-text field:
  "What medications (including dosage) are you currently taking (please list all)"
  (`REQ-medical-history-mandatory`)
- [x] **HIST-03**: Three required free-text fields are captured: previous surgeries and dates; known
  medication/food/environmental allergies; other medical conditions (`REQ-medical-history-mandatory`)
- [x] **HIST-04**: "Do you have a Primary Care Physician" Y/N — yes collects clinic name and address;
  no displays "We recommend that you establish with a primary care physician before beginning SLIT"
  (`REQ-medical-history-mandatory`)
- [x] **HIST-05**: The section lives in `QUIZ_PARTS` before the allergy-testing split and is reached
  by 100% of patients; the `"medical_history"` `FlowStep`, its seeding effect, and the consent
  back-button special case are deleted; answers land in `answers_json` and surface in the clinical
  PDF and admin modal with no new plumbing (`REQ-medical-history-mandatory`,
  `DEC-medical-history-before-testing-split`)
- [x] **DIAG-01**: A question adjacent to the Part 5 medication questions asks whether the patient
  has been **diagnosed** with an allergic condition — distinct from HIST-01's comorbidity list
  (`REQ-allergy-diagnosis-question`) — ⚠ **confirm scope with William before building**

### Mandatory Allergy Testing

- [x] **TEST-01**: Every patient reaches an allergy-testing step before the score page, offering
  exactly two options and no skip (`REQ-mandatory-allergy-testing-split`)
- [x] **TEST-02**: "I need allergy testing" takes the patient to the storefront testing-options page
  (`REQ-mandatory-allergy-testing-split`)
- [x] **TEST-03**: "I've already had allergy testing" collects Year, Location, and "What Allergens
  Did You React To?", persisted into `answers_json` (`REQ-mandatory-allergy-testing-split`)
- [ ] **TEST-04**: The `had_testing` branch requires the patient to upload at least one copy of
  their allergy test results before they can continue — no optional-with-email-fallback (D-02). The
  upload allowlist is PDF, JPEG, PNG, and HEIC, with multiple files per submission supported (D-03).
  Uploaded files never touch Shopify and never leave the BAA chain (D-04). Files must be retrievable
  from three surfaces: the embedded admin at `/app/quiz-results`, the patient ledger via
  `/api/me/*`, and inline in the clinical PDF (D-05)
  (`REQ-testing-results-upload`)

  ~~The results branch instructs the patient to email results to `testing@alledrops.com` using the
  same email address they used on the quiz — with no file input, multipart parsing, object storage,
  or upload column introduced (`REQ-testing-results-by-email`) — ⚠ email address depends on the
  domain-spelling decision~~ — **reversed by `04-CONTEXT.md` D-01 on 2026-08-09.** Original traced
  to `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` R5.
- [x] **TEST-05**: Both no-testing bypasses are gone — the `7+` "Proceed Without Testing" chain and
  the `3–6` "Continue to Purchase AlleDrops" jump — and `ResultsDisplay` is a terminal display
  component with none of its four callback props (`REQ-remove-no-testing-paths`) — **must land AFTER
  HIST-05**. Phase 3's D-11 already deleted the `7+` proceed-without-testing chain and the
  `"medical_history"` FlowStep. The remaining Phase 4 work under this requirement is the `3–6`
  "Continue to Purchase AlleDrops" jump and making `ResultsDisplay` terminal with zero callback
  props.
- [ ] **TEST-06**: No storefront surface offers or implies a no-testing path — remove the "no longer
  a need for needles or allergy tests" clause from both product pages and the
  proceed-without-testing content from `/pages/test-options`
  (`REQ-testing-claims-content-remediation`) — ⚠ **REASSIGNED to Phase 8, 2026-08-09.** Plan 04-05
  measured both target surfaces on authenticated, cache-busted live served bytes, pre- and post- a
  `shopify theme push`: the clause is present (`no longer a need` = 5, `needles` = 5) on both
  `/products/tennessee-alledrops` and `/products/texas-alledrops`, unchanged by the push. Confirmed via
  repo-wide grep in plan 04-04 and via `sections/main-product.liquid:197` / `sections/main-page.liquid:22`:
  both surfaces render Shopify Admin content (`{{ product.description }}` / `{{ page.content }}`), not
  theme-repo source. **No theme push or theme-repo edit can close this requirement.** Replacement copy
  is drafted and held, UNCONFIRMED, at `04-STOREFRONT-COPY-DRAFT.md`, awaiting William/counsel approval
  before an Admin-side edit ships it. Joins LAUNCH-01/LAUNCH-02 as Andrew-owned Phase 8 launch
  readiness.
- [x] **TEST-07**: The consent step is reachable on every completion path and every submission
  records a `consent_version` (`REQ-consent-step`)

### Resume In-Progress Intake

- [x] **RESUME-01**: A patient who has begun answering quiz questions and returns to the quiz page
  in the same browser is offered a neutral, identity-free choice to resume their prior answers or
  start over. The offer screen carries no name, DOB, email, phone, initials, avatar, or elapsed
  time (`REQ-browser-local-resume-offer`)
- [x] **RESUME-02**: Nothing is written to browser storage before the patient's first real answer
  to a quiz question. The state gate and patient-info steps produce no draft under any
  circumstance, so an untouched page load leaves no trace (`REQ-resume-write-gate`)
- [x] **RESUME-03**: The draft is cleared automatically on successful submission and by an
  explicit, persistent "Start over" control visible during the quiz parts and consent, gated
  behind a confirmation whose safe option is rendered first and receives focus
  (`REQ-resume-clear-controls`)
- [x] **RESUME-04**: (a) A draft older than 24 hours is treated as absent and silently cleared,
  with no countdown and no "expires in" copy. (b) Resuming restores every quiz answer but always
  re-requires the allergy-test file upload — no staging token or file reference is ever persisted
  or restored, and restored state can never satisfy the mandatory-upload predicate. (c) The
  submitted payload and score are identical whether an intake was completed in one sitting or
  resumed, except for `completion_time`, `quiz_date`, and `symptom_profile_id`, which are named and
  excluded because they are wall-clock- or time-derived by construction
  (`REQ-resume-clinically-inert`)

### Preliminary Score Page

- [x] **SCORE-01**: The results page is titled "Preliminary Score", states "Our Clinical Team is
  reviewing your information, and will send you email confirmation of your final results within the
  next 1-2 business days", keeps the three approved band explanations, and contains no
  approval/unlock promise (`REQ-preliminary-score-page`, `DEC-no-approval-promise-copy`)
- [x] **SCORE-02**: The score ceiling is derived from the scored question set in code, so adding a
  scored question changes it automatically (`REQ-derived-max-score`) — ⚠ **blocked on the score-scale
  decision**
- [x] **SCORE-03**: A colour-banded scale bar directly above the score shows where the patient falls
  on the full range (`REQ-preliminary-score-page`) — ⚠ **blocked on the score-scale decision**

> **AMENDED 2026-08-11.** SCORE-02 and SCORE-03 are **no longer code-blocked.** `/gsd:discuss-phase 5`
> resolved the score-scale question structurally: the colour stops and the clinical brackets are two
> independent things. Phase 5 ships a provisional default. **Still owed:** confirmation of the
> provisional colour stops before go-live.
>
> **AMENDED AGAIN 2026-08-12.** The 2026-08-11 version of this note also moved the scale into "a
> versioned admin setting (new Phase 5.1, SCALE-01..04)". **That phase and those four requirements are
> deleted** — see the Removed Requirements section below. The clinical brackets are fixed by the AOD
> medical director and are not tunable; only the colour stops were ever in question, and those are a
> code constant William confirms once. William's answer is a one-line edit to
> `app/lib/quiz/score-scale.ts:28-36` plus a deploy, not a data edit through a form.
>
> **AMENDED A THIRD TIME 2026-08-13 — the fixed-brackets premise did not survive contact with the
> medical director.** William replied and moved the boundaries: `3–6` → `3–8`, `7+` → `9+`. The two
> notes above are correct that *we* cannot tune the brackets and that no admin form should exist;
> they were wrong to read that as "the numbers never change". They change when William changes them,
> through a phase and a migration. The colour half of his answer confirmed the shipped presentation
> and needs no numbers at all. See SCORE-04..06 below and
> `.planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md`.

### Clinical Bracket Revision

Set by William Miller (AOD medical director) on 2026-08-13. Source of truth for all three:
`.planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md`.

- [x] **SCORE-04**: The clinical bracket boundaries are `0–2` / `3–8` / `9+` everywhere a bracket is
  computed, displayed, stored, or asserted — `SCORE_BRACKETS`, the `ScoreBracket` type union, the
  `score_bracket` CHECK constraint, both PHI renderers, and the test suite. A patient scoring 7 or 8
  is Moderate, not High (`DEC-clinical-brackets-set-by-medical-director`)
- [x] **SCORE-05**: Each bracket renders William's confirmed headline and recommendation body
  verbatim, and no retired `3–6` / `7+` wording survives on a patient-facing surface
- [x] **SCORE-06**: The patient sees their score without the `/ 60` denominator, while the bar's
  geometry still reads through the derived-ceiling accessor — SCORE-02's "derived, never a literal"
  guarantee is not weakened by hiding the number (`REQ-derived-max-score`)

> **SCORE-06 went further than written, 2026-08-13.** The requirement says the patient sees their
> score without the denominator. On the deployed page Andrew removed the **number itself**: with no
> denominator, a bare `30` above a scale whose top band means `9+` read as less interpretable, not
> more. No numeric score is shown to the patient anywhere. The derived-ceiling accessor still backs
> the bar's geometry, so the "derived, never a literal" half of this requirement is intact and
> guarded by a DOM test. The raw score is unchanged in scoring, storage, the clinical PDF, and the
> admin table — this was a patient-facing display decision only.
>
> One consequence is load-bearing and recorded above the calculation in `ResultsDisplay.tsx`:
> within-zone interpolation is now the ONLY signal distinguishing a patient at 9 from one at 60,
> since both read "High" everywhere else. Do not replace it with a fixed per-zone marker position.

### Purchase Prerequisites & Returning Patients

- [x] **SHOP-01**: Metafield definitions exist for the `alledrops` customer namespace and Liquid
  readability of `customer.metafields.alledrops.quiz_count` / `last_completed_at` is confirmed — or
  the spike documents that it is not readable and names the fallback
  (`REQ-customer-metafield-definitions`) — **spike, gates SHOP-02 and SHOP-03**

  > **Spike run 2026-08-12 — verdict: no fallback needed, SHOP-02/SHOP-03 unblocked.** Full record:
  > `.planning/phases/06-purchase-prerequisites/06-SPIKE-SHOP-01.md`. Both metafields existed as
  > **unstructured** (no definition) on 4 customers, which is exactly why Liquid could not see them
  > while the Admin API could. Both definitions were created in the Shopify admin — `quiz_count`
  > (Integer) and `last_completed_at` (Date and time), **Storefront API access ON**, Customer Account
  > API **no access**, **"Filter or group data in Analytics" OFF and it must stay off**. One step is
  > still owed before this closes: that Liquid actually *renders* the value for a logged-in customer
  > was never measured — it is assigned to SHOP-02's first implementation step, verified on served
  > bytes.
  >
  > **CLOSED 2026-08-13.** The owed render measurement was taken in `06-02` Task 3 against an
  > unpublished duplicate theme (live theme verified unmodified afterwards): `quiz_count` and
  > `last_completed_at` both rendered non-empty for a logged-in customer on cache-busted served
  > bytes, with a non-vacuity marker present and both empty-variants at 0. Re-confirmed live in
  > `06-06` via the credited branch on both SLIT PDPs.
  >
  > **One clause above is superseded:** *"Filter or group data in Analytics OFF and it must stay
  > off"*. It was measured **ON** on both definitions, and Andrew's decision on 2026-08-13 is that it
  > stays ON. Do not treat OFF as a precondition in any later phase.
- [x] **SHOP-02**: A returning logged-in patient who has completed the quiz sees that completion
  state at the moment of purchase, not only on their customer profile page
  (`REQ-returning-patient-completion-surface`) — **live 2026-08-13**, proven on served bytes on both
  SLIT PDPs (`06-06-SUMMARY.md`)
- [x] **SHOP-03**: Add-to-cart on both SLIT product pages requires two prerequisite confirmations —
  quiz completed and allergy testing submitted — via a new theme app extension block targeting the
  product template (`REQ-purchase-gating-honor-system`) — **live 2026-08-13**; gate engage/release
  exercised on the deployed page and express checkout removed (`06-06-SUMMARY.md`)
- [x] **SHOP-04**: The thank-you page explains the clinical review process and a 2–3 business day
  expectation, via a new checkout UI extension (`REQ-purchase-gating-honor-system`)
- [ ] **SHOP-05**: Checkout page language, order confirmation notifications, and the refund policy
  page all state that products will not ship without a completed quiz and testing on file
  (`REQ-purchase-gating-honor-system`) — Shopify admin content, William owns the refund policy
- [ ] **SHOP-06**: A written fulfillment verification step exists and is owned by AOD before the
  first patient shipment (`REQ-fulfillment-verification-process`) — owner: William / AOD

### Telehealth Intake Path

- [ ] **TELE-01**: `/pages/consult` resolves and a patient can actually book the $99 telehealth
  consultation, with format details present (duration, video vs phone, what the allergist can
  prescribe) (`REQ-consult-landing-page`) — **blocks TELE-02**
- [ ] **TELE-02**: A persisted field distinguishes SLIT from telehealth intake, and telehealth
  patients see the Preliminary Score with the pre-appointment closing copy about Dr. Sullivan
  reviewing their information, not the SLIT copy (`REQ-telehealth-intake-path`)

### Launch Readiness (non-code blockers)

- [ ] **LAUNCH-01**: No Klaviyo, Meta Pixel, Google Analytics, or other tracker loads on any
  PHI-collecting page, verified in the browser on the live store — theme/Shopify-app level, zero
  references in this repo (`CON-no-third-party-trackers-on-phi-pages`) — owner: Andrew
- [x] **LAUNCH-02**: The Test Mode button and container do not render on the production storefront
  page (UX-AUDIT CONTENT-2) — owner: Andrew, one line in the theme customizer

  > **Satisfied — confirmed 2026-08-12.** The iframe URL on the live storefront carries `test=0`,
  > and `enable_test_mode` has `"default": false` in
  > `extensions/quiz-block/blocks/symptom-quiz.liquid` (schema, verified in source), which
  > `symptom-quiz.liquid:54` maps to the `_test_flag = '0'` branch. Nothing needed doing; the
  > requirement was recorded as Pending before anyone looked. Re-confirm on served bytes at go-live
  > alongside the other launch checks rather than trusting this note.

- [ ] **LAUNCH-03**: No placeholder text remains on any patient-facing clinical surface, and
  `CONSENT_VERSION` is bumped to `v1.0-YYYY-MM-DD` after counsel approval
  (`REQ-consent-and-disclaimer-finalization`, UX-AUDIT CONTENT-1) — owner: William / counsel

  > **Text corrected 2026-08-12 — this requirement previously described three things that are no
  > longer true.** Corrections, with what was actually checked:
  >
  > - ~~"the app block's Medical Disclaimer Text field (currently `This text needs changed.`, toggle
  >   off)"~~ — the live page renders the real clinical disclaimer. Observed in the browser on the
  >   live storefront 2026-08-12; **not** re-verified on served bytes here, so treat it as
  >   one-observation evidence, not a closed check.
  > - ~~"the `[PENDING — Treatment policy page language]` marker at `ConsentStep.tsx:56`"~~ — the
  >   marker does not exist. It was removed in Phase 4 plan 04-03 by D-11's section-4 interim
  >   rewrite. Verified in source: zero `PENDING` matches anywhere in `app/components/quiz/`.
  > - ~~"`CONSENT_VERSION` is bumped **from `draft-2026-05-09`**"~~ — it is already at
  >   `draft-2026-08-09` (`app/lib/consent-version.ts`), bumped by the same 04-03 rewrite.
  >
  > **What actually remains open is unchanged:** counsel has not approved the consent copy, so the
  > version string is still a `draft-`, not a `v1.0-`. Status stays **Blocked (William / counsel)**.
- [ ] **LAUNCH-04**: One live quiz submission has been confirmed written to and read back from
  production Cloud SQL, and `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`
  has been executed (`intel/context.md#open-verification-items`) — owner: Andrew; note this writes a
  PHI row
- [ ] **LAUNCH-05**: Every PHI surface sits inside a signed BAA chain (Google BAA; a separate Fly.io
  BAA decision for PHI in transit), the HIPAA Notice of Privacy Practices is published, the privacy
  policy carries PHI language with HIPAA-incompatible marketing provisions removed and an AOD-owned
  contact address replacing `andrew@21adsmedia.com`, Privacy and Security Officers are designated by
  name, and HIPAA workforce training is complete
  (`CON-baa-chain-required-for-every-phi-surface`, `CON-legal-content-prerequisites-before-first-patient`)
  — owner: William / counsel
- [ ] **LAUNCH-06**: Production runs on AOD-owned infrastructure — AOD Google Workspace (BAA opted
  in), AOD Shopify (Basic/Grow, ~$30/mo), Andrew granted admin on both, Cloud SQL migrated off the
  cross-client *Beautiful Rescues* billing account, and the Shopify site transferred
  (`DEC-migrate-phi-to-aod-owned-gcp-under-baa`) — owner: William; currently blocked on Gene (PTO),
  escalate to Robert
- [ ] **LAUNCH-07**: The production domain spelling is confirmed with William directly, ownership of
  the registration is established, and DNS plus `fly certs create quiz.<domain>` are configured
  — ⚠ **blocked on the domain-spelling decision; live `ALLERDROPS®` Class 044 trademark exposure**
- [ ] **LAUNCH-08**: No repo document describes Google Sheets as the live PHI store — correct
  `docs/HIPAA_COMPLIANCE_ANALYSIS.md` and `docs/app-requirements.md`, and keep
  `app/lib/google-sheets.ts` as the throwing tripwire (zero imports, verified 2026-07-29)

---

## v2 Requirements

Acknowledged, not in the v1.0 roadmap.

### Admin
- **ADM2-01**: Customer detail drill-down from the submissions list
- **ADM2-02**: Submission export workflow
- **ADM2-03**: Provider review-status workflow (`new → reviewed → contacted → scheduled`)
- **ADM2-04**: Provider notes on submissions
- **ADM2-05**: Structured audit dashboard (who viewed what, when)
- **ADM2-06**: Bulk operations

### Storefront
- **STORE2-01**: `/pages/our-team` — restore or confirm intentional removal and clean up references
- **STORE2-02**: Remaining May 8 storefront content items — contraindication warnings, 911 emergency
  instruction, treatment duration expectation, footer stray quotation mark, `/collections/all`
  consultation listing, legacy `/products/regional-allergy-drops` redirect review

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Resume / edit an in-progress submission | 1+ week, architecturally hard. Nothing persists until the terminal POST; no draft table, no `updateSubmission`, `symptom_profile_id` is `NOT NULL UNIQUE`. Never committed. Carried as a risk in PROJECT.md, not a phase. |
| Account-flag gating, Shopify Functions, real-time checkout blocking, mandatory accounts, manual clinical unlock, `orders/create` backstop, Locksmith-style apps, `tagsAdd` approval | Removed by `DEC-purchase-gating-is-honor-system`. AOD is on Basic/Grow; only Plus can ship custom apps with Function APIs, and Plus (~$2,300/mo) was dismissed by both parties. |
| PHI file upload for test results | Dropped by `DEC-testing-results-by-email-not-upload`. Results come by email; no new PHI file infrastructure. |
| Google Sheets as a PHI destination | Dead. Cloudflare Worker and Apps Script deleted in session 25; `app/lib/google-sheets.ts` throws and has zero imports. Docs correction only (LAUNCH-08). |
| `quiz_responses_full` JSON metafield in Shopify | `HIPAA_COMPLIANCE_ANALYSIS.md:143-161` flags it as valid only if the data is NOT PHI. It is PHI. |
| Scoring changes for any new quiz section | Impossible by construction — `calculateTotalScore` always receives `ALL_SCORED_QUESTIONS` (Parts 1–5). Zero scoring work needed. Do not create tasks for it. |
| Geographies beyond TN and TX | Client-confirmed 2026-06-24. No copy may imply otherwise. |
| Scheduling integration beyond the booking page | Phase 2.5 deferred list. TELE-01 covers only a working booking mechanism. |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEF-01 | Phase 1 | Complete (2026-07-30, verified live) |
| DEF-02 | Phase 1 | Complete (2026-07-30, verified live) |
| DEF-03 | Phase 1 | Complete (2026-07-30, verified live) |
| DEF-04 | Phase 1 | Complete (2026-07-30, verified live) |
| SCH-01 | Phase 2 | Complete |
| SCH-02 | Phase 2 | Complete |
| HIST-01 | Phase 3 | Complete |
| HIST-02 | Phase 3 | Complete |
| HIST-03 | Phase 3 | Complete |
| HIST-04 | Phase 3 | Complete |
| HIST-05 | Phase 3 | Complete |
| DIAG-01 | Phase 3 | Blocked (William — R6 scope) |
| TEST-01 | Phase 4 | Complete |
| TEST-02 | Phase 4 | Complete |
| TEST-03 | Phase 4 | Complete |
| TEST-04 | Phase 4 | Pending |
| TEST-05 | Phase 4 | Complete |
| TEST-06 | Phase 8 (reassigned 2026-08-09 from Phase 4 — content is Shopify Admin-managed, not in either repo; see requirement note) | Pending |
| TEST-07 | Phase 4 | Complete |
| RESUME-01 | Phase 4.2 | Complete (2026-08-11, verified live) |
| RESUME-02 | Phase 4.2 | Complete (2026-08-11, verified live) |
| RESUME-03 | Phase 4.2 | Complete (2026-08-11, verified live) |
| RESUME-04 | Phase 4.2 | Complete (2026-08-11, verified live) |
| SCORE-01 | Phase 5 | Complete |
| SCORE-02 | Phase 5 | Complete (unblocked 2026-08-11 — provisional default) |
| SCORE-03 | Phase 5 | Complete (unblocked 2026-08-11 — provisional colour stops shipped as a code constant, `score-scale.ts:28-36`. **Confirmation received 2026-08-13:** William approved the shipped arrangement — brackets drive colour 1:1, three equal-width bands, red-for-most accepted. No numbers changed; clearing `isProvisional` moves to Phase 5.2) |
| SCORE-04 | Phase 5.2 | Complete (2026-08-13) — 0–2 / 3–8 / 9+ live in code and in the DB CHECK |
| SCORE-05 | Phase 5.2 | Complete (2026-08-13) — verbatim copy verified on served bytes |
| SCORE-06 | Phase 5.2 | Complete (2026-08-13) — went further: the numeric score is removed entirely from the patient view |
| SHOP-01 | Phase 6 | **Complete 2026-08-13** — Liquid render proven on served bytes (`06-02-SUMMARY.md` Task 3), re-confirmed live in `06-06`. Note: "Analytics filter OFF" in the requirement prose is **superseded** — Andrew's decision is that it stays ON |
| SHOP-02 | Phase 6 | **Complete 2026-08-13** |
| SHOP-03 | Phase 6 | **Complete 2026-08-13** |
| SHOP-04 | Phase 6 | Complete |
| SHOP-05 | Phase 6 | Pending — draft ready (`06-SHOP-05-COPY-DRAFT.md`); closes when William pastes and the refund policy is written |
| SHOP-06 | Phase 6 | Pending — checklist drafted (`06-SHOP-06-FULFILLMENT-PROCESS.md`); closes on AOD adoption |
| TELE-01 | Phase 7 | Pending |
| TELE-02 | Phase 7 | Pending |
| LAUNCH-01 | Phase 8 | Pending |
| LAUNCH-02 | Phase 8 | Satisfied (2026-08-12 — live iframe URL carries `test=0`; `enable_test_mode` defaults false in the block schema). Re-confirm on served bytes at go-live |
| LAUNCH-03 | Phase 8 | Blocked (William / counsel) |
| LAUNCH-04 | Phase 8 | Pending |
| LAUNCH-05 | Phase 8 | Blocked (William / counsel) |
| LAUNCH-06 | Phase 8 | Blocked (client — Gene PTO) |
| LAUNCH-07 | Phase 8 | Blocked (William — domain spelling) |
| LAUNCH-08 | Phase 8 | Pending |

## Removed Requirements

- **SCALE-01, SCALE-02, SCALE-03, SCALE-04 — removed 2026-08-12, never planned, never built.**
  Added on 2026-08-11 alongside an inserted Phase 5.1 ("Admin-Configurable Score Scale"). Deleted
  during `/gsd:discuss-phase 5.1`, at the point where the discussion reached what editable clinical
  brackets would mean for the `score_bracket` column.

  **The premise was wrong.** The clinical brackets (0–2 / 3–6 / 7+, `app/lib/quiz/scoring.ts:4-8`)
  come from the AOD medical director and are fixed. Only the *colour band stops* — how a 0–60 raw
  score maps to green / orange / red on the bar — were ever meant to be configurable. Phase 5's
  `05-CONTEXT.md` D-02 recorded both as editable; that is the line being corrected.

  **Removing the bracket half removes the whole cost.** SCALE-04's `submissions.scale_version` column,
  the migration, and the PHI-path PR review all existed to keep a stored bracket interpretable after
  its boundaries moved. Brackets don't move. The colour bar is display-only — rendered from the raw
  score at `ResultsDisplay.tsx:70`, never persisted, absent from the PDF (`pdf.ts:83` prints the
  bracket label, not the bar) — so retuning colours later cannot make an older row harder to read.

  **Nothing was implemented.** Zero code references to `scale_version`, `app.settings`, or
  `api.quiz.config` across `app/`, `migrations/`, and `tests/`. If AOD later wants to retune colours
  without a deploy, that earns a new phase, scoped to colour stops only and off the PHI path.

**Coverage** (updated 2026-08-12):
- v1 requirements: **42 total** (SCALE-01..04 added 2026-08-11 and removed 2026-08-12 — see above)
- Mapped to phases: 42
- Unmapped: 0 ✓
- Duplicated across phases: 0 ✓
- Blocked on a client decision or client action: **5** — DIAG-01, LAUNCH-03, LAUNCH-05, LAUNCH-06,
  LAUNCH-07. DIAG-01 needs an answer to a question; LAUNCH-03/05/06/07 need client action. None of
  the 5 blocks the other 37.
- **SCORE-02 and SCORE-03 left the blocked list on 2026-08-11** and stay off it. They were blocked on
  William's score-scale decision; `/gsd:discuss-phase 5` resolved it structurally by separating the
  colour stops from the clinical brackets. **The obligation did not vanish** — the provisional colour
  stops (20 / 40 / 60) must be confirmed by William before go-live. That confirmation is a one-line
  edit to `score-scale.ts:28-36` plus a deploy, not a phase.

---
*Requirements defined: 2026-07-29*
*Last updated: 2026-07-29 after `/gsd:new-project` ingest of 9 documents*
