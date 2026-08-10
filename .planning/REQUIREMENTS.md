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

### Preliminary Score Page

- [ ] **SCORE-01**: The results page is titled "Preliminary Score", states "Our Clinical Team is
  reviewing your information, and will send you email confirmation of your final results within the
  next 1-2 business days", keeps the three approved band explanations, and contains no
  approval/unlock promise (`REQ-preliminary-score-page`, `DEC-no-approval-promise-copy`)
- [ ] **SCORE-02**: The score ceiling is derived from the scored question set in code, so adding a
  scored question changes it automatically (`REQ-derived-max-score`) — ⚠ **blocked on the score-scale
  decision**
- [ ] **SCORE-03**: A colour-banded scale bar directly above the score shows where the patient falls
  on the full range (`REQ-preliminary-score-page`) — ⚠ **blocked on the score-scale decision**

### Purchase Prerequisites & Returning Patients

- [ ] **SHOP-01**: Metafield definitions exist for the `alledrops` customer namespace and Liquid
  readability of `customer.metafields.alledrops.quiz_count` / `last_completed_at` is confirmed — or
  the spike documents that it is not readable and names the fallback
  (`REQ-customer-metafield-definitions`) — **spike, gates SHOP-02 and SHOP-03**
- [ ] **SHOP-02**: A returning logged-in patient who has completed the quiz sees that completion
  state at the moment of purchase, not only on their customer profile page
  (`REQ-returning-patient-completion-surface`)
- [ ] **SHOP-03**: Add-to-cart on both SLIT product pages requires two prerequisite confirmations —
  quiz completed and allergy testing submitted — via a new theme app extension block targeting the
  product template (`REQ-purchase-gating-honor-system`)
- [ ] **SHOP-04**: The thank-you page explains the clinical review process and a 2–3 business day
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
- [ ] **LAUNCH-02**: The Test Mode button and container do not render on the production storefront
  page (UX-AUDIT CONTENT-2) — owner: Andrew, one line in the theme customizer
- [ ] **LAUNCH-03**: No placeholder text remains on any patient-facing clinical surface — the app
  block's Medical Disclaimer Text field (currently "This text needs changed.", toggle off) and the
  `[PENDING — Treatment policy page language]` marker at `ConsentStep.tsx:56` — and
  `CONSENT_VERSION` is bumped from `draft-2026-05-09` to `v1.0-YYYY-MM-DD`
  (`REQ-consent-and-disclaimer-finalization`, UX-AUDIT CONTENT-1) — owner: William / counsel
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
| SCORE-01 | Phase 5 | Pending |
| SCORE-02 | Phase 5 | Blocked (William — score scale) |
| SCORE-03 | Phase 5 | Blocked (William — score scale) |
| SHOP-01 | Phase 6 | Pending |
| SHOP-02 | Phase 6 | Pending |
| SHOP-03 | Phase 6 | Pending |
| SHOP-04 | Phase 6 | Pending |
| SHOP-05 | Phase 6 | Pending |
| SHOP-06 | Phase 6 | Pending |
| TELE-01 | Phase 7 | Pending |
| TELE-02 | Phase 7 | Pending |
| LAUNCH-01 | Phase 8 | Pending |
| LAUNCH-02 | Phase 8 | Pending |
| LAUNCH-03 | Phase 8 | Blocked (William / counsel) |
| LAUNCH-04 | Phase 8 | Pending |
| LAUNCH-05 | Phase 8 | Blocked (William / counsel) |
| LAUNCH-06 | Phase 8 | Blocked (client — Gene PTO) |
| LAUNCH-07 | Phase 8 | Blocked (William — domain spelling) |
| LAUNCH-08 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓
- Duplicated across phases: 0 ✓
- Blocked on a client decision or client action: 7 — DIAG-01, SCORE-02, SCORE-03, LAUNCH-03,
  LAUNCH-05, LAUNCH-06, LAUNCH-07. DIAG-01 and SCORE-02/03 need answers to questions; LAUNCH-03/05/06/07
  need client action. None of the 7 blocks the other 31.

---
*Requirements defined: 2026-07-29*
*Last updated: 2026-07-29 after `/gsd:new-project` ingest of 9 documents*
