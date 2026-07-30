# Requirements — synthesized intel

Milestone: AlleDrops go-live for Allergist On Demand (AOD) — Shopify storefront plus a
HIPAA-shaped clinical SLIT symptom quiz, Tennessee and Texas only.

**Primary source:** `docs/app-requirements.md` (PRD, precedence 3) supplies the baseline
requirement set. `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (SPEC, precedence 0, **LOCKED**)
reverses or replaces parts of it per the 2026-07-29 client call and wins every conflict.
`docs/quiz-questions-schema.md` (SPEC, precedence 2) supplies question-level detail.

**Status values** are as-built claims from the precedence-0 code audit (2026-07-29, `main`,
51/51 tests passing). Where `docs/app-requirements.md` marks an item `[x]` complete but the
precedence-0 audit disagrees, the audit wins — see `INGEST-CONFLICTS.md` INFO
"as-built checklist claims superseded".

---

## Already satisfied (verify, do not rebuild)

### REQ-state-gate-tn-tx — Tennessee/Texas eligibility gate
- source: `docs/app-requirements.md:7,25` (PRD); `docs/quiz-questions-schema.md:27-34,319` (SPEC)
- scope: `StateGate.tsx`
- description: `StateGate` is the first decision point. Patient selects `tennessee` or `texas`; anyone else is ineligible and stops.
- acceptance: `state` validated server-side as `tennessee` or `texas`; out-of-state users reach `IneligibleMessage` and cannot continue.
- status: DONE (`docs/app-requirements.md:163`)

### REQ-patient-info-step — Identity and contact capture with 18+ gate
- source: `docs/app-requirements.md:26-30,62-63` (PRD); `docs/quiz-questions-schema.md:36-45,320-322` (SPEC)
- scope: `PatientInfoStep.tsx`, `app/lib/quiz-validation.ts`
- description: Collect full name, DOB, email, phone before Parts 1–5. Not part of the scored set.
- acceptance: DOB is a valid ISO date and age ≥ 18; email valid; phone ≥ 10 digits. DOB is **never** written to Shopify metafields (`docs/app-requirements.md:65`).
- status: DONE (`docs/app-requirements.md:164`)

### REQ-scored-questionnaire-parts-1-5 — Clinical questionnaire and bracket scoring
- source: `docs/quiz-questions-schema.md:75-278` (SPEC); `docs/app-requirements.md:31-32` (PRD)
- scope: `app/lib/quiz/questions.ts`, `app/lib/quiz/scoring.ts`, `QuizPartRenderer.tsx`
- description: Part 1 symptom checklist, Part 2 timing/triggers, Part 3 severity `0-3`, Part 4 impact `0-4` + bother `0-4`, Part 5 current treatment. Score computed from Parts 1–5 only (`ALL_SCORED_QUESTIONS`) and mapped to brackets `0-2`, `3-6`, `7+`.
- acceptance: bracket logic `score<=2 → "0-2"; score<=6 → "3-6"; else "7+"`; `score_bracket` validated as one of the three; per-question exclusions honoured (`only_rarely`, `none`, `excludeFromScore` none-options).
- status: DONE — precedence 0 confirms "Symptom sections, the medication section, and scoring are genuinely correct" (`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:13`)

### REQ-none-of-the-above-options — R1, exclusive none on all three symptom sections
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:21-25` (precedence 0, R1); email §1
- scope: `symptoms_nasal`, `symptoms_eye`, `symptoms_sinus`
- description: All three Part 1 symptom sections offer "None of the Above"; the patient can progress without selecting a symptom; the none-option is exclusive and excluded from score.
- acceptance: options at `questions.ts:20,35,49`; `excludeFromScore` at `:22,37,51`; exclusive behavior at `QuizPartRenderer.tsx:26-28,70-76`; progression asserted in `QuizPartRenderer.test.ts:11-18`.
- status: DONE, live-verified (fixed 2026-07-01, commit `03ff72b`; verified on the live storefront per `HANDOFF.md:128`)

### REQ-submission-persistence — POST /api/quiz/submit → Cloud SQL
- source: `docs/app-requirements.md:38-67` (PRD, payload contract); `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:187,198` (precedence 0, as-built)
- scope: `app/routes/api.quiz.submit.tsx`, `app/lib/submissions.ts`, `migrations/001_create_submissions.sql`
- description: Single terminal POST validates and persists the full intake to the `submissions` table (`answers_json`), links `customer_id_shopify` via `findOrCreateCustomer`, and records `consent_version`.
- acceptance: payload shape per `docs/app-requirements.md:40-58`; validation per `docs/quiz-questions-schema.md:317-325`; `symptom_profile_id` NOT NULL UNIQUE; no `dbErr.message` in error responses (`HANDOFF.md:348-350`).
- status: DONE. **Note:** full app→DB round trip unverified since the 2026-07-28 Cloud SQL downsize — see `context.md#open-verification-items`.
- supersedes: the Google Sheets destination in `docs/app-requirements.md:19,67,137-148` and `docs/HIPAA_COMPLIANCE_ANALYSIS.md:7-10` — see `decisions.md#DEC-phi-persists-in-cloud-sql-not-google-sheets`

### REQ-shopify-summary-metafields — Summary-only customer metafields
- source: `docs/app-requirements.md:120-135` (PRD); `docs/quiz-questions-schema.md:299-313` (SPEC)
- scope: `app/lib/shopify/metafields.ts`, namespace `alledrops`
- description: Write `symptom_profile_id`, `quiz_score`, `state`, `score_bracket`, `quiz_date`, `quiz_history` (plus `last_completed_at`, `quiz_count` per `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:190`). Summary only — no PHI, no DOB.
- acceptance: no PHI in Shopify metafields, verifiable via `npx tsx scripts/phi-cleanup-verify.ts` (`docs/breach-response-runbook.md:112`); legacy `quiz_region` / `severity_level` and legacy `quiz_history` entries containing `region`/`severity` still render sensibly in admin.
- status: DONE (`docs/app-requirements.md:154-159`; PHI metafield cleanup landed per `HANDOFF.md:315`)

### REQ-patient-ledger-and-pdf — Logged-in assessment history
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:187-189` (precedence 0, R8); `HANDOFF.md:307-309`
- scope: `app/routes/api.me.assessments.tsx`, `api.me.assessment.$id.pdf.tsx`, `app/lib/customer-auth.ts`, `extensions/quiz-history/`
- description: `GET /api/me/assessments` verifies a Shopify customer-account session token and returns non-PHI `{id, symptom_profile_id, completed_at}`. The `quiz-history` extension renders "Symptom Assessment History" with per-assessment PDF links on the customer profile.
- acceptance: JWT `aud` always enforced; `Authorization: Bearer` header is the only accepted token path (no `?token=`); email-based backfill for rows predating Protected Customer Data approval; covered by 9 tests in `tests/assessments-ledger.test.ts` and 4 in `tests/customer-auth.test.ts`.
- status: DONE

### REQ-admin-submission-surfaces — Clinical review surfaces
- source: `docs/app-requirements.md:81-84,171-178` (PRD); `HANDOFF.md:310-314`
- scope: `/app`, `/app/quiz`, `/app/quiz-results`, `/api/admin/*`
- description: Paginated, filterable submissions list; submission detail modal with human-readable answer rows; admin PDF download; stats dashboard (total, week, TN/TX, brackets); search by name/email/profile ID; filter by bracket, state, date range.
- acceptance: answer rows iterate `answers_json` generically so new questions appear with no plumbing (`app/routes/app.quiz-results.tsx:252-257`); every access written to `submission_access_log` via `logSubmissionAccess()`.
- status: PARTIAL — customer detail drill-down and export workflow open (`docs/app-requirements.md:177-178`)

---

## Reversed by the 2026-07-29 call (LOCKED — build to precedence 0)

### REQ-mandatory-allergy-testing-split — R5, two options, no skip
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:82-95` (precedence 0, R5, CALL OVERRIDE, **LOCKED**)
- scope: new Part 7, positioned **before** the score/results page
- description: An allergy-testing step with exactly two options: (1) "I need allergy testing" → refer to testing options; (2) "I've already had allergy testing" → results branch collecting Year, Location, and "What Allergens Did You React To?".
- acceptance: no third option and no way to proceed without testing anywhere in the flow; the split renders before the Preliminary Score page; results-branch fields persist into `answers_json`.
- status: MISSING — no `PART7_*` constant, no `FlowStep`, no Year/Location/Allergens fields
- effort (source): ~1 day (cheap only because file upload was dropped)
- decision: `decisions.md#DEC-mandatory-allergy-testing`
- overrides: `docs/quiz-questions-schema.md:58-59`, `docs/app-requirements.md:14-17`

### REQ-remove-no-testing-paths — R5, delete both existing bypasses
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:103-110` (precedence 0, R5, **LOCKED**)
- scope: `ResultsDisplay.tsx`, `QuizContainer.tsx`
- description: Delete both existing routes to purchase without testing:
  1. `7+` bracket — "Proceed Without Testing" (`ResultsDisplay.tsx:132-138`) → `showProceedWarning` (`QuizContainer.tsx:236-238`) → interstitial (`:456-480`) → "Continue without testing" (`:465-471`) → `:240-244` → `setStep("medical_history")`.
  2. `3–6` bracket — "Continue to Purchase AlleDrops" (`ResultsDisplay.tsx:100-106`) → `QuizContainer.tsx:231-234` jumps straight to consent, skipping medical history entirely, then offers a product link at `:332-339`.
- acceptance: neither path exists; `ResultsDisplay` loses all four callback props (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`, `onProceedWithoutTesting`, declared `:10-13`) and becomes a terminal display component.
- status: MISSING (both bypasses still live). Path 2 was never mentioned on the call and is the bigger problem — an unguarded purchase route for mid-severity patients bypassing both history and any testing prompt.
- effort (source): 2–3 h
- **hard dependency: must land AFTER REQ-medical-history-mandatory** — see `constraints.md#CON-sequencing-r3-before-r5`

### REQ-testing-results-by-email — R5, email results instead of upload
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:95,101` (precedence 0, R5, **LOCKED**)
- scope: static copy in the testing results branch
- description: Fallback copy — "Please email your allergy skin testing results directly to testing@alledrops.com (please ensure that you use the same email address that you used on this quiz)."
- acceptance: copy present; **no** file input, multipart parsing, object storage, or upload column introduced.
- status: MISSING (file upload is entirely absent, which is now correct — `api.quiz.submit.tsx:55-74` handles JSON and urlencoded only)
- decision: `decisions.md#DEC-testing-results-by-email-not-upload`

### REQ-medical-history-mandatory — R3, rebuilt content, moved into the main flow
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:37-64` (precedence 0, R3, CALL OVERRIDE, **LOCKED**)
- scope: `app/lib/quiz/questions.ts`, `QuizContainer.tsx`, `QuizPartRenderer.tsx`
- description: A medical history section appended to `QUIZ_PARTS` **before** the allergy-testing split, so every patient supplies a history — including telehealth-only patients. Contents:
  - Multi-select checkbox group: asthma, eczema, anaphylaxis, heart disease, COPD, lung disease, cancer, autoimmune conditions, immune system deficiencies (acquired e.g. HIV / induced e.g. immune suppressants or chemotherapy), angioedema, none of the above.
  - If **any** box is checked including "none of the above", reveal a free-text field: "What medications (including dosage) are you currently taking (please list all)".
  - Three required free-text fields: previous surgeries and dates; known medication/food/environmental allergies; other medical conditions.
  - "Do you have a Primary Care Physician" Y/N — if Y, clinic name and address; if N, display "We recommend that you establish with a primary care physician before beginning SLIT".
- acceptance: reachable by 100% of patients; **must not affect the score** (guaranteed by `ALL_SCORED_QUESTIONS` — see `decisions.md#DEC-scoring-decoupled-from-quiz-parts`); the `"medical_history"` `FlowStep` (`QuizContainer.tsx:33,494-518`), its seeding effect (`:102-109`), and the consent back-button special case (`:528`) are deleted; the progress label at `:280` derives from `QUIZ_PARTS.length` automatically; new answers land in `answers_json` and appear in the clinical PDF and admin modal with no plumbing.
- status: PARTIAL — wrong content, wrong position, barely reachable. `questions.ts:222-249` defines the *old* `PART6_MEDICAL_HISTORY` (`history_personal`: asthma, eczema, food_allergies, positive_allergy_test, ed_visits; `history_family`: rhinitis, asthma, eczema). Missing: heart disease, COPD, lung disease, cancer, autoimmune, immune deficiencies, angioedema, none-of-the-above, the conditional medication reveal, all three required free-text fields, and the entire PCP branch. Today only `7+` patients who explicitly decline testing reach it.
- effort (source): 1.5–2 days — "content trivial, schema is the work"
- depends on: REQ-quiz-schema-foundation
- note: `personal_history_json` / `family_history_json` (`migrations/001:26-27`) are shaped for the old design and become vestigial.
- open question: the third free-text field's label is truncated in William's email. Appears to be "Please list any other medical conditions that you have." **Needs confirming.**
- decision: `decisions.md#DEC-medical-history-before-testing-split`
- overrides: `docs/quiz-questions-schema.md:21,234-261`, `docs/app-requirements.md:33,167`

### REQ-purchase-gating-honor-system — R10, prerequisite checkboxes plus human verification
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:216-247` (precedence 0, R10, CALL OVERRIDE, **LOCKED**)
- scope: new theme app extension block (product template), new checkout UI extension, Shopify admin content
- description:
  - Product-page prerequisite checkboxes gating add-to-cart — two confirmations: quiz completed, allergy testing submitted. **New theme app extension block targeting the product template. The only meaningful repo work in R10.**
  - Checkout page language: products will not ship without a completed quiz and testing on file. Shopify admin settings, not code; limited text surface on non-Plus.
  - Thank-you page block explaining the clinical review process and a 2–3 business day expectation. **New checkout UI extension** — third extension in this repo, none exists.
  - Order confirmation emails / customer notifications duplicating that language. Shopify admin notification templates, zero repo footprint.
  - Refund policy page stating the honor-system terms explicitly. Content, William owns.
- acceptance: **no account-flag architecture, no Shopify Functions, no real-time blocking.** Add-to-cart gating is UI-level only and is expected to be bypassable.
- status: MISSING entirely, and mostly not repo work. `extensions/` contains only `quiz-block` (`target = "section"`, `blocks/symptom-quiz.liquid:78`) and `quiz-history` (customer profile). No `customer.tags` logic, no `orders/create` webhook, no gating in any direction.
- effort (source): 3–5 days (two new extensions plus admin content)
- may depend on: REQ-customer-metafield-definitions (metafield readability spike)
- decision: `decisions.md#DEC-purchase-gating-is-honor-system`
- **do not build:** mandatory accounts, manual clinical unlock, Shopify Functions / Cart-and-Checkout Validation, `orders/create` auto-cancel backstop, Locksmith-style gating apps, `tagsAdd` approval flow. All superseded (`HANDOFF.md:147-162`).

### REQ-fulfillment-verification-process — R10, the actual enforcement
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:231` (precedence 0, R10, **LOCKED**)
- scope: AOD operations, non-code
- description: AOD fulfillment verifies quiz + testing on file before shipping, and contacts or refunds anyone who powers through the honor-system gate.
- acceptance: a documented human verification step exists and is owned by AOD before first patient shipment.
- status: MISSING (process not documented anywhere in the ingest set)
- owner: William / AOD

### REQ-testing-claims-content-remediation — Storefront copy contradicting mandatory testing
- source: derived from `decisions.md#DEC-mandatory-allergy-testing` (precedence 0, **LOCKED**); evidence from `docs/STOREFRONT_CONTENT_AUDIT.md:66,170,228` (precedence 5)
- scope: `/products/tennessee-alledrops`, `/products/texas-alledrops`, `/pages/test-options`
- description: Remove live storefront copy that promises patients can skip testing:
  - Both product pages: *"there is no longer a need for needles or allergy tests to receive allergy treatment"* — the allergy-testing clause must be removed.
  - `/pages/test-options`: the page is live and currently covers *"the option to proceed without testing"* — that option no longer exists.
- acceptance: no storefront surface offers or implies a no-testing path.
- status: MISSING — both product pages unchanged as of the May 8 audit; `/pages/test-options` copy predates the 2026-07-29 call.
- note: this requirement is **derived**, not stated by any doc. Precedence 5 is a DOC and cannot create requirements; the locked precedence-0 decision does.

---

## New from the 2026-07-29 call

### REQ-quiz-schema-foundation — `required`, `showIf`, static-info question type
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:55-60,265` (precedence 0)
- scope: `app/lib/quiz/types.ts`, `QuizPartRenderer.tsx`
- description: `QuizQuestion` (`types.ts:16-26`) has no `required` flag, no conditional-visibility mechanism, and no static-content type. Add three schema capabilities: a `showIf` predicate, a `required: true` flag, and an info/static question type.
- acceptance: conditional display and required-ness are expressible declaratively; the two existing ID-literal hardcodes are removed — `QuizPartRenderer.tsx:36-38` (`question.part === 5 && (question.id === "med_list" || question.id === "med_control")`) and `isPartComplete` at `:276-278,295-299` (`takingMeds === "yes" && question.id === "med_list"`).
- status: MISSING
- effort (source): 1 day. **Load-bearing for R3 / R5 / R6** — building those by copying the `med_list` hardcode pattern would add five more ID-literal special cases to both files.
- blocks: REQ-medical-history-mandatory, REQ-mandatory-allergy-testing-split, REQ-allergy-diagnosis-question

### REQ-preliminary-score-page — R4, retitle, spectrum scale, review copy
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:68-78` (precedence 0, R4)
- scope: `ResultsDisplay.tsx`, `app/styles/quiz.module.css`
- description: Page titled **"Preliminary Score"**. A bar directly above the score showing where the patient falls on the full scale, broken down by color per severity (William described green / yellow / red). Keep the existing score-band text. Add: "Our Clinical Team is reviewing your information, and will send you email confirmation of your final results within the next 1-2 business days."
- acceptance: title no longer reads "Your Assessment Results" (hardcoded `ResultsDisplay.tsx:38`); a scale/thermometer visual exists; the 1–2 business day language is present; the three band explanations William approved remain intact (`:59-80`, `:82-109`, `:111-141`).
- status: PARTIAL — title wrong; score renders as a circle badge (`:44-46`, styles `quiz.module.css:906-934`); no thermometer, gradient bar, or scale visual exists anywhere (the only stylesheet gradients are the progress bar `:243` and card backgrounds `:694,896`); business-day language absent.
- effort (source): 30 min for title + copy; 3–5 h for the scale visual
- depends on: REQ-derived-max-score
- **must not ship:** the 6/27 email's "purchase SLIT through our site if approved" paragraph — see `decisions.md#DEC-no-approval-promise-copy`

### REQ-derived-max-score — Real score ceiling computed from the question set
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:74` (precedence 0, R4, "Blocker nobody has hit")
- scope: `app/lib/quiz/scoring.ts`
- description: There is no maximum-score constant — `SCORE_BRACKETS.HIGH.max` is `Infinity` (`scoring.ts:7`). A "where you fall on the scale" bar needs a real ceiling, derived from the question set in code rather than hardcoded.
- acceptance: a derived max-score function exists; adding a new scored question changes the ceiling automatically.
- status: MISSING
- **⚠ blocked on a design decision:** what range and what colour bands the scale displays is unresolved. `docs/quiz-questions-schema.md:71` deprecates the 0-60 total; the bracket model tops out at an open-ended `7+`; `docs/UX-AUDIT.md:426` records that legacy Minimal/Mild/Moderate/Severe colour classes were re-applied in session 9. See `INGEST-CONFLICTS.md` WARNING "Score range and severity-scale semantics unresolved". **Do not implement the visual until resolved.**

### REQ-allergy-diagnosis-question — R6
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:116-124` (precedence 0, R6, found live on the call)
- scope: `PART5_TREATMENT` in `app/lib/quiz/questions.ts`
- description: An allergy-specific diagnosis question next to Part 5's medication questions. William: *"the only thing I didn't see, Andrew, is on the 'are you taking allergy medication' section — the diagnosis thing."* Cheapest resolution is a `yesno` + conditional `text_input` pair.
- acceptance: a question asks whether the patient has been **diagnosed** with an allergic condition. This is **not** a duplicate of the medical history checkbox list — R3 is comorbidity history (asthma, COPD, cancer, autoimmune), R6 is allergy diagnosis.
- status: MISSING — `diagnos*` returns zero hits across `app/` and `extensions/`. Part 5 asks only *whether* the patient takes allergy medication (`taking_meds`, `questions.ts:187-193`), *what* they take (`med_list`, `:195-200`), and *how controlled* they are (`med_control`, `:201-214`).
- effort (source): 2–4 h
- **⚠ blocked:** the transcript fragment is thin and building it twice would be waste. **Confirm scope with William before building.**
- depends on: REQ-quiz-schema-foundation

### REQ-telehealth-intake-path — R9, dual result language
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:204-212` (precedence 0, R9; email, barely touched on the call)
- scope: `ResultsDisplay.tsx`, `QuizContainer.tsx` payload, `app/lib/quiz-validation.ts`, new migration, `app/lib/quiz/product-links.ts`
- description: Anyone may buy a telehealth appointment without completing the quiz, but the questionnaire is required before meeting Dr. Sullivan. After booking, redirect back to the questionnaire (or email it). Telehealth patients get the same Preliminary Score but different closing copy: *"Thank you for submitting your Intake Questionnaire prior to your scheduled Telehealth appointment with Dr. Sullivan. During your appointment, he will review your information with you to determine the best treatment modality for your allergy symptoms."*
- acceptance: a persisted field (e.g. `intake_path`) distinguishes SLIT from telehealth — migration (pattern at `migrations/001:50`), validator addition, payload field, and a second closing-copy branch. Telehealth patients still supply medical history (per `decisions.md#DEC-medical-history-before-testing-split`).
- status: MISSING — `ResultsDisplay` branches only on `scoreBracket` (`:59,82,111`); no telehealth dimension exists in the component, payload (`QuizContainer.tsx:135-157`), validator (`quiz-validation.ts:16-31`), or table (`migrations/001:10-38`). "Telehealth" appears twice in `app/`: a button label at `ResultsDisplay.tsx:98` and consent boilerplate at `ConsentStep.tsx:20-23`. The telehealth product (`/products/allergy-consultation`, $99) appears **nowhere in code** — `product-links.ts:2-5` knows only the two SLIT handles. **Nothing distinguishes SLIT from telehealth programmatically.**
- effort (source): 1.5–2 days
- blocked on: REQ-consult-landing-page

### REQ-returning-patient-completion-surface — R8
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:181-200` (precedence 0, R8)
- scope: storefront product page / purchase flow, `extensions/`
- description: A returning, logged-in patient should see their quiz marked complete at the moment of purchase and pick up at purchase.
- acceptance: a storefront surface (product page, cart, or purchase flow) reads the existing completion state — `alledrops.last_completed_at` (date_time) and `alledrops.quiz_count` (number_integer), written at `app/lib/shopify/metafields.ts:88-103`. These are exactly what R10's product-page checkboxes could pre-check against.
- status: PARTIAL — substantially better built than the call implied. The customer link, the read-back API, the logged-in profile surface, and the machine-readable completion flag all exist. **What is missing: no storefront surface reads any of it.** Completion state is visible on the customer *profile* page only; a returning patient currently sees nothing at the moment of purchase.
- effort (source): 1–2 days
- known weakness: the link is best-effort email matching — `api.quiz.submit.tsx:126,146,150` all set `customerLinkSkipped` and the response warns "Customer not linked at submission time" (`:203`). A patient who quizzes with one email and buys with another is unlinked.
- depends on: REQ-customer-metafield-definitions

### REQ-customer-metafield-definitions — Metafield definitions and Liquid readability spike
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:195,296` (precedence 0, R8 gap 2 / Unresolved 1)
- scope: `app/lib/shopify/metafields.ts`, Shopify admin custom data
- description: No metafield definition is created anywhere in the repo (`metafieldDefinition` → zero hits). Unstructured metafields have restricted storefront exposure, so Liquid readability of `customer.metafields.alledrops.quiz_count` is **unverified**.
- acceptance: definitions created for the `alledrops` customer namespace and Liquid readability confirmed — check `metafieldDefinitions(ownerType: CUSTOMER)` in admin GraphQL, or Settings → Custom data → Customers.
- status: MISSING — **spike required.** Gates REQ-purchase-gating-honor-system and REQ-returning-patient-completion-surface.

### REQ-consult-landing-page — `/pages/consult` must exist and book
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:212` (precedence 0, R9 — "Blocked on `/pages/consult` being a real page"); evidence `docs/STOREFRONT_CONTENT_AUDIT.md:98,180-184,238-242` (precedence 5)
- scope: Shopify storefront page, scheduling app
- description: A booking-capable consultation landing page. `/pages/consult` is a 404; the "Schedule" button on `/products/allergy-consultation` has no functioning booking mechanism; the product page is not an adequate substitute.
- acceptance: `/pages/consult` resolves; a working booking mechanism exists; consultation format details (duration, video vs phone, what the allergist can prescribe) are present.
- status: MISSING — launch blocker in both sources. `HANDOFF.md:264-265` records the action item: configure the scheduling app as a Shopify plugin (the ~$99 consult) once AOD accounts are set up.
- blocks: REQ-telehealth-intake-path, and `QuizContainer.tsx:215` (the consult redirect currently points at a 404)

---

## Defects

### REQ-iframe-parent-navigation — R7.1, all four redirect call sites are broken
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:130-165` (precedence 0, R7.1, root cause confirmed empirically)
- scope: `app/routes/quiz-embed.tsx`, `QuizContainer.tsx`, `extensions/quiz-block/blocks/symptom-quiz.liquid`
- description: The design intent is that inside the iframe `window.location.assign` is overridden to post `quiz:navigate` to the parent (`quiz-embed.tsx:55-59`). **That assignment never takes effect** — `Location.assign` is a `[LegacyUnforgeable]` own property, non-writable and non-configurable. Verified in Chrome: `{"descriptor":{"writable":false,"configurable":false,...},"overrideTook":false,"stillNative":true,"threw":null}`. In a sloppy-mode inline script the assignment fails **silently**, so there is no console error. Consequence: the call navigates the *iframe*, and relative URLs resolve against the Fly origin → a React Router 404 rendered inside the quiz frame.
- broken call sites: `QuizContainer.tsx:228` → `/pages/test-options`; `:215` → `/pages/consult` (itself a 404); `:248` → `/pages/test-options`; `:328` → `/` (loads the Fly app index in-frame).
- acceptance: delete the override; add an explicit `navigateParent(url)` helper that resolves relative URLs against the **shop** origin and posts `quiz:navigate`; call it from all four sites.
- status: MISSING (fix diagnosed, not applied)
- effort (source): 1–2 h
- notes: the anchor-based product link at `:332-339` **does** work — anchors go through a separate, legitimate click interceptor (`quiz-embed.tsx:62-72`) using `preventDefault` + `postMessage`. That asymmetry is why this survived earlier testing. The app block's redirect settings are already populated in the live theme (Consult redirect URL = "Allergy Consultation"), so fixing the mechanism activates existing configuration.

### REQ-scroll-to-top-on-step-change — R7.2, parent listener missing
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:167-177` (precedence 0, R7.2, root cause confirmed)
- scope: `extensions/quiz-block/blocks/symptom-quiz.liquid`
- description: `QuizContainer.tsx:111-122` correctly posts `{type:"quiz:scrollToTop"}` to the parent on every `step` / `currentPartIndex` change, and the message is present in the shipped bundle. **The parent listener is missing** — `symptom-quiz.liquid:56-69` handles `quiz:resize` (`:61-63`) and `quiz:navigate` (`:64-66`) and nothing else. The iframe is `scrolling="no"` with height set to full content (`:52-54`), so the parent document is the only scroller and a dropped message means no scroll at all.
- acceptance: three lines in the Liquid block mirroring `app/entry.theme.tsx:69-71`, then `shopify app deploy`.
- status: MISSING
- effort (source): 15 min — the cheapest item on the list
- note: this looked implemented because `entry.theme.tsx:69-71` *does* handle it — but that code lives in `injectIframe()`, the other embed path. Embed path confirmed 2026-07-29 via the live theme editor: the Liquid app block is what is installed. See `constraints.md#CON-iframe-embed-path`.

### REQ-medication-question-copy — R2, drop the trailing "(required):"
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:29-33` (precedence 0, R2)
- scope: `app/lib/quiz/questions.ts:198`
- description: Label should read "Please list your current allergy medications and dosages". It currently reads "…and dosages (required):" — the suffix is not in William's text.
- acceptance: label matches William's text exactly; required-ness stays enforced at `QuizPartRenderer.tsx:296-298`.
- status: DONE with minor copy drift. The leaked dev string `Only shown if taking_meds = yes` is gone from source and from the shipped `public/quiz-bundle.js` (0 occurrences).
- effort (source): 10 min

### REQ-correct-product-handles — Live defect not on anyone's list
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:251-253` (precedence 0); `docs/STOREFRONT_CONTENT_AUDIT.md:58,76` (precedence 5)
- scope: `app/lib/quiz/product-links.ts:2-5`
- description: The code uses handles `tennessee-allerdrops` / `texas-allerdrops` (with an R). The live store's handles are `tennessee-alledrops` / `texas-alledrops`. **The one redirect that does work lands on a 404.**
- acceptance: handles match the live store.
- status: MISSING — **confirm against the live store before changing** (`/products/tennessee-alledrops.js`); the mismatch finding rests on a May 8 audit.

---

## Content and compliance prerequisites

### REQ-consent-and-disclaimer-finalization — Placeholder text on clinical surfaces
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:301` (precedence 0, Unresolved 6 — "Hard launch blocker"); `HANDOFF.md:403-407,419-422`
- scope: live app block settings, `app/components/quiz/ConsentStep.tsx`, `app/lib/consent-version.ts`, `ResultsDisplay.tsx`, `symptom-quiz.liquid`
- description: The live app block's Medical Disclaimer Text field currently reads "This text needs changed." and the toggle is off. Counsel-approved consent, treatment policy, and quiz disclaimer copy must replace all placeholders.
- acceptance: no placeholder text on any patient-facing clinical surface; `CONSENT_VERSION` bumped from `'draft-2026-05-09'` to `'v1.0-YYYY-MM-DD'` when counsel finalizes; consent text updated in `ConsentStep.tsx`.
- status: MISSING — hard launch blocker, owned by William/counsel. Starter drafts exist outside this repo at `~/Documents/Claude/Projects/AoD/policy-drafts/03-treatment-policy.md` and `04-quiz-disclaimer.md`.
- related, **not promoted to a requirement**: `docs/UX-AUDIT.md:236-244` CONTENT-1 records a second live placeholder — `[PENDING — Treatment policy page language]` at `ConsentStep.tsx:56`. Held in `context.md#open-pre-launch-blockers-ux-audit` per ingest scope. Flagged in `INGEST-CONFLICTS.md` INFO so it is not lost.

### REQ-consent-step — Informed consent capture with versioning
- source: `docs/app-requirements.md:33,168` (PRD); `HANDOFF.md:316-317,403-407`
- scope: `ConsentStep.tsx`, `app/lib/consent-version.ts`
- description: An informed consent step before final submission, with `consent_version` captured per submission.
- acceptance: `consent_version` persisted on every submission; the step is reachable on every path once the flow is reordered (today the `3–6` bracket reaches consent while skipping medical history — see REQ-remove-no-testing-paths).
- status: DONE mechanically (consent version wired into payload + DB per `HANDOFF.md:317`); **blocked on counsel** for final text (REQ-consent-and-disclaimer-finalization) and on the flow reorder for correct positioning.

---

## Explicitly not committed

### REQ-resume-draft-persistence — Resume / edit a submission
- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:17,198-200,274` (precedence 0, R8, "One architectural landmine")
- scope: quiz state persistence layer
- description: Quiz state is React `useState` only (`QuizContainer.tsx:74-93`); nothing persists until the single terminal POST. No draft table, no localStorage, no partial save. `symptom_profile_id` is `NOT NULL UNIQUE` (`migrations/001:13`) and there is no `updateSubmission` in `app/lib/submissions.ts`. A patient abandoning at the testing split loses **the entire questionnaire**, not just their place.
- status: **NOT COMMITTED.** Estimate 1+ week and architecturally hard. Not on William's list, but implied by what he was told on the call.
- source directive: *"Do not let this get promised casually."* Requires a draft-persistence layer that does not exist.
- roadmapper note: do not schedule into the go-live milestone. Record as a known risk — a patient who abandons at the newly-mandatory testing split loses everything, and mandatory testing makes that abandonment point more likely, not less.
