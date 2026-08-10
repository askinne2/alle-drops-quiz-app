# Roadmap: AlleDrops — v1.0 go-live

## Overview

The quiz already works for the design that existed before the 2026-07-29 client call. This
milestone closes the gap to the design the call locked in. It starts with a small, independently
shippable batch of defects in live code (Phase 1), then lays the schema foundation that everything
new depends on (Phase 2), then rebuilds the quiz flow in the only order that does not produce dead
code — medical history first (Phase 3), then the mandatory testing split and the deletion of both
no-testing bypasses (Phase 4). With the flow settled, the results page becomes the Preliminary Score
page (Phase 5), the storefront gains honor-system purchase prerequisites and returning-patient
awareness (Phase 6), and telehealth patients get their own intake path and closing copy (Phase 7).
Phase 8 runs in parallel from day one and holds the non-code launch blockers — trackers, placeholder
clinical copy, BAAs, and the handoff to AOD-owned infrastructure. Go-live requires all eight.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Live Defect Fixes** - Four defects in already-shipped code; ships alone this week (completed 2026-07-30)
- [x] **Phase 2: Quiz Schema Foundation** - `required`, `showIf`, and static-info question types (completed 2026-08-09)
- [x] **Phase 3: Mandatory Medical History** - Rebuilt history section every patient passes through (completed 2026-08-09)
- [ ] **Phase 4: Mandatory Allergy Testing** - Two-option testing split; both bypasses deleted
- [ ] **Phase 4.1: Testing-First Quiz Order** *(INSERTED)* - Move the testing split + required upload to the front so abandonment costs seconds, not ten minutes
- [ ] **Phase 4.2: Resume In-Progress Intake** *(INSERTED)* - Stop/resume at any point on any device; draft PHI store + emailed magic link. Reverses a recorded out-of-scope decision
- [ ] **Phase 5: Preliminary Score Page** - Retitle, review copy, derived ceiling, severity scale
- [ ] **Phase 6: Purchase Prerequisites** - Honor-system checkboxes and returning-patient state
- [ ] **Phase 7: Telehealth Intake Path** - Booking-capable consult page and telehealth branching
- [ ] **Phase 8: Launch Readiness** - Trackers, clinical copy, BAAs, AOD infrastructure handoff

## Sequencing Constraints (hard — from the code audit, not preferences)

These produce dead code or duplicated hardcodes if violated:

1. **Phase 2 before Phases 3 and 4.** `QuizQuestion` (`app/lib/quiz/types.ts:16-26`) has no
   `required` flag, no conditional-visibility mechanism, and no static-content type. Conditional
   display is hardcoded by literal question ID at `QuizPartRenderer.tsx:36-38` and in
   `isPartComplete` at `:276-278,295-299`. Building the new sections first would add five more
   ID-literal special cases across two files.

2. **Phase 3 before Phase 4.** `setStep("medical_history")` (`QuizContainer.tsx:243`) is the ONLY
   entry point to the medical history section, and it is reached exclusively through the
   proceed-without-testing flow that Phase 4 deletes. Deleting that path first makes medical history
   dead code. Recorded verbatim by the locked source as `CON-sequencing-r3-before-r5`.

3. **Phase 1 ships alone.** It touches only already-shipped behavior and must deploy this week
   without waiting on any other phase.

4. **SHOP-01 (metafield readability spike) before SHOP-02 and SHOP-03.** No metafield definition
   exists anywhere in the repo, so whether `customer.metafields.alledrops.quiz_count` is readable
   from Liquid is unverified — and the product-page prerequisite checkboxes may depend on it.

5. **TELE-01 before TELE-02.** `/pages/consult` is a 404 today; the telehealth branch has nothing to
   route to until it exists.

6. **Phase 8 runs in parallel, not last.** Its client-owned items have multi-week lead times
   (Workspace → BAA → GCP migration) and two of its items — LAUNCH-01 (Klaviyo) and LAUNCH-02 (Test
   Mode) — are live patient-facing exposures today. Start them immediately.

**No scoring phase exists, deliberately.** `calculateTotalScore` takes an explicit question list and
is always called with `ALL_SCORED_QUESTIONS` (Parts 1–5). New sections cannot alter the score.
Zero scoring work is needed for medical history, the testing split, or the diagnosis question.

## Phase Details

### Phase 1: Live Defect Fixes

**Goal**: Every navigation and label already shipped to patients behaves the way it was designed to
**Depends on**: Nothing — deliberately independent of every other phase, ships this week
**Requirements**: DEF-01, DEF-02, DEF-03, DEF-04
**Success Criteria** (what must be TRUE):

  1. Advancing or going back a quiz step scrolls the parent storefront page to the top of the quiz
  2. "Test First", "Schedule Consult", and "Return Home" navigate the parent storefront page to the
     correct storefront URL instead of rendering a React Router 404 inside the quiz frame

  3. The AlleDrops product link from the quiz lands on a live product page in both Tennessee and
     Texas

  4. The medication question label reads "Please list your current allergy medications and dosages"
     with no `(required):` suffix, and is still enforced as required

  5. The batch deploys to production on its own with 51/51 tests still passing, verified against
     rendered DOM rather than deploy success
**Plans**: 6 plans in 5 waves

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Canonical path validator, corrected product handles, and the Wave 0 contract-test scaffold

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Delete the location.assign override, route all five exits through navigateParent, correct the medication label
- [x] 01-03-PLAN.md — Harden the Liquid message handler (origin guard + same-origin path allowlist), add the scroll listener, add both product pickers

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Rebuild and commit the theme bundle, amend the stale CLAUDE.md GSD line, record out-of-scope findings

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05-PLAN.md — Three-channel deploy with provenance Gates A/B/C on served bytes (needs merge + deploy authorization)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-06-PLAN.md — Theme-editor Gate D, Gate E, behavioral Gate F, and PHI verification-row cleanup (human-owned)

**Notes**: Roughly 4 hours total. The `window.location.assign` override is the root cause of three
of the four broken redirects — `Location.assign` is `[LegacyUnforgeable]`, so the patch silently
no-ops. The anchor-based product link works through a separate, legitimate click interceptor
(`quiz-embed.tsx:62-72`); preserve that path. Fix the parent side in the Liquid app block, NOT in
`app/entry.theme.tsx` — that embed path is not installed.

### Phase 2: Quiz Schema Foundation

**Goal**: New quiz sections can express conditional visibility, required-ness, and static content
declaratively, with no question-ID literals anywhere in the renderer
**Depends on**: Nothing (sequenced after Phase 1)
**Requirements**: SCH-01, SCH-02
**Success Criteria** (what must be TRUE):

  1. A question marked required blocks step advance until answered, with no per-ID code
  2. A question with a `showIf` condition appears and disappears based on another answer, with no
     per-ID code

  3. A static info block can be placed inside a quiz part and renders without collecting an answer
  4. The existing `med_list` and `med_control` conditional behavior is identical after being
     re-expressed through the new schema, with the existing test suite still green
**Plans**: 4 plans in 4 waves

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Failing literal inventory, the widened schema types, and the D-09 compile-time guarantee

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Pure evaluator module (isAnswered, evaluateShowIf, visibleItems, visibleAnswers, toggleOption) plus the D-04 integrity guards

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Renderer refactor to zero question-ID literals; append-only regression tests

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — D-03 boundary wiring at all three score sites, phase gate, blocking human verification
**Notes**: ~1 day. This is the load-bearing phase — `CON-quiz-schema-foundation-is-load-bearing`.
Ship it before Phases 3 and 4 or accept five more ID-literal special cases across
`QuizPartRenderer.tsx`.

### Phase 3: Mandatory Medical History

**Goal**: Every patient supplies a medical history Dr. Sullivan can treat from, including patients
who will only book a telehealth consult
**Depends on**: Phase 2
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, DIAG-01
**Success Criteria** (what must be TRUE):

  1. Every patient reaches the medical history section on the way to their results — including one
     who intends to book telehealth only

  2. The comorbidity checklist offers all eleven locked options including "none of the above", and
     any selection reveals the current-medications free-text field

  3. Previous surgeries, known allergies, and other medical conditions must all be answered before
     the patient can continue

  4. Answering "no" to Primary Care Physician shows the establish-with-a-PCP recommendation;
     answering "yes" collects clinic name and address

  5. Medical history answers appear in the clinical PDF and admin submission modal with no new
     plumbing, and the patient's score is unchanged by anything they answered here
**Plans**: 7 plans in 5 waves

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — New Part 6 medical-history content plus DIAG-01, wired into QUIZ_PARTS/ALL_ITEMS/getQuestionById, with visibility, required-ness, integrity, and score-parity assertions
- [x] 03-02-PLAN.md — D-05 label map, both PHI renderers repointed, and the two legacy history fields removed from payload, validation, DB layer, types, E2E script, and fixtures

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-03-PLAN.md — Delete the medical_history FlowStep, the proceed-without-testing chain, and the dead `extra` payload parameter; new source-text guard proven RED
- [x] 03-04-PLAN.md — DOM test infrastructure adopted narrowly (devDependencies only), info-block visual identity, and HIST-03 gate/reveal pairing

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-05-PLAN.md — Theme bundle rebuild with new staleness markers, full phase gate, and the eight-check human browser verification

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-06-PLAN.md — Named pre-migration Cloud SQL backup (human-gated) and the DROP COLUMN migration file, committed alone

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 03-07-PLAN.md — Merge, deploy, prove the release live on served bytes, then execute the DROP COLUMN and verify by query results
**UI hint**: yes
**Notes**: ~1.5–2 days — content is trivial, the schema is the work, and Phase 2 does that work.
The old `PART6_MEDICAL_HISTORY` (`questions.ts:222-249`) is fully replaced, not extended;
`personal_history_json` / `family_history_json` become vestigial. DIAG-01 is grouped here because it
is the same conversation with William: **ask once whether the allergy-diagnosis question is distinct
from this checklist before building either.** The third free-text label is truncated in William's
source email and needs confirming (probable: "Please list any other medical conditions that you
have."). Delete the `"medical_history"` `FlowStep`, its seeding effect, and the consent back-button
special case as part of this phase.

### Phase 4: Mandatory Allergy Testing

**Goal**: No patient — and no storefront page — can reach purchase without allergy testing
**Depends on**: Phase 3 (hard: deleting the bypasses first would orphan medical history)
**Blocked on** (client-side, see `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md`):

  1. **William agrees to test-result upload, and it is priced** — reverses his own 2026-07-29 LOCKED
     decision (`DEC-testing-results-by-email-not-upload`, retracted in place by D-01). Blocks all of
     D-01…D-05. Owner: William / Andrew.
  2. **Fly.io BAA signed** — patient-uploaded test results are PHI in a file and cannot transit or
     land on Fly without it. Owner: Andrew.
  3. **Production cutover to AOD's Google Cloud project** — object storage belongs under AOD's BAA,
     not Andrew's `alledrops-quiz` dev project. Owner: William / AOD.

**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07
**Success Criteria** (what must be TRUE):

  1. Every patient reaches an allergy-testing step before seeing their score, with exactly two
     choices and no way past it

  2. "I need allergy testing" takes the patient to the storefront testing-options page; "I've
     already had allergy testing" collects year, location, and reacted-to allergens

  3. A patient with existing results must upload them — PDF, JPEG, PNG, or HEIC, multiple files
     allowed — before they can continue, and those files are retrievable from the embedded admin,
     the patient ledger, and inline in the clinical PDF, never touching Shopify or leaving the BAA
     chain. ~~A patient with existing results is told to email them to the testing address using the
     same email address they used on the quiz — and no file upload exists anywhere~~ **REVERSED
     2026-08-09 by 04-CONTEXT.md D-01.** Retained struck through so the reversal is visible to
     anyone who read the original.

  4. No surface, in the quiz or on the storefront, offers or implies a path to purchase without
     testing: both code bypasses are gone, `ResultsDisplay` is terminal, and the product-page and
     test-options copy no longer promise that testing can be skipped

  5. Every completed submission has passed through consent with a recorded `consent_version`

**Plans**: 19 plans in 11 waves
**UI hint**: yes
**Notes**: **No longer ~1 day.** D-01 put test-result upload back in scope, restoring the 3–4 day
estimate that decision had removed, and adding the app's first binary PHI handling: a streaming
size-capped upload endpoint, GCS staging with prefix-scoped lifecycle cleanup, magic-byte content
validation, HEIC→JPEG conversion, a `submission_files` join table, and PDF embedding. **Half of
TEST-05 already shipped in Phase 3** (D-11 deleted the `7+` proceed-without-testing chain and the
`"medical_history"` FlowStep); what remains is the `3–6` "Continue to Purchase AlleDrops" jump and
making `ResultsDisplay` terminal with zero callback props. D-09 additionally moves consent onto a
single path for every bracket, closing a live TEST-07 defect where 0–2 patients auto-submit with a
`consent_version` they never saw. TEST-04's email address no longer appears in any copy, so the
unresolved domain-spelling decision no longer gates this phase (it still gates LAUNCH-07). Waves 1–5
(plans 04-01…04-09) are the unblocked set and could ship alone; waves 6–11 (plans 04-10…04-19) are
gated on the three blockers above. Splitting was offered and declined — the wave structure keeps the
option open without re-proposing it.

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Retract the email-not-upload decision in place, rewrite TEST-04, add uploaded filenames to CLAUDE.md's PHI list
- [x] 04-02-PLAN.md — Three new QuestionTypes (radio_single, text_input_short, file_multi) and their isAnswered groups
- [x] 04-03-PLAN.md — Placeholder-free interim consent copy (D-11) and the CONSENT_VERSION bump
- [x] 04-04-PLAN.md — Reconcile the theme repo against live, delete the no-testing clauses, draft the replacement (blocking checkpoint)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-05-PLAN.md — Push the reconciled theme and prove TEST-06 on authenticated cache-busted served bytes
- [x] 04-06-PLAN.md — Part 7 question set (testing_status + year/location/allergens) and its clinical labels

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-07-PLAN.md — radio_single and text_input_short render branches plus Part 7 DOM coverage

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-08-PLAN.md — D-09 flow rewiring: deletion guard proven RED, terminal ResultsDisplay, consent-first QuizContainer

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 04-09-PLAN.md — Rebuild the theme bundle and add measured Phase 4 freshness markers

**Wave 6** *(BLOCKED on William, the Fly BAA, and the GCP cutover)*

- [x] 04-10-PLAN.md — Blocker clearance, size caps, upload architecture, dev storage target, and the package legitimacy gate

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 04-11-PLAN.md — Migration 004 (own commit, no DDL executed) and the ownership-bounded submission_files data layer
- [x] 04-12-PLAN.md — Storage primitives: GCS client, magic-byte validation, HEIC conversion

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 04-13-PLAN.md — POST /api/quiz/upload: streaming, size-capped, magic-byte-validated staging
- [x] 04-14-PLAN.md — Patient and admin file retrieval routes plus the read-only testing-status column
- [x] 04-15-PLAN.md — Embed uploaded files inline in the clinical PDF via pdf-lib

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 04-16-PLAN.md — The file_multi upload widget, its CSS family, and the required-gate DOM coverage
- [x] 04-17-PLAN.md — Promotion step, prefix-scoped lifecycle rule, retention doc, and the Fly VM bump

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 04-18-PLAN.md — Patient ledger file links and the second theme-bundle rebuild

**Wave 11** *(blocked on Wave 10 completion)*

- [ ] 04-19-PLAN.md — Human browser pass, migration execution, William message, merge and deploy authorization

### Phase 04.2: Resume In-Progress Intake (INSERTED)

**Goal**: A patient can stop the intake at any point and pick it up later on any device, so
abandonment stops losing clinical work
**Depends on**: Phase 4 (the flow and upload path must be settled first), **the Fly.io BAA**, and
**the AOD GCP cutover** — this phase creates a second PHI store and the app's first outbound email
**Requirements**: RESUME-01 … RESUME-05 (to be written into REQUIREMENTS.md during planning)
**Success Criteria** (what must be TRUE):

  1. A patient who closes the tab mid-intake can return via an emailed link and find every answer
     they had given, including any uploaded test-result files

  2. Resuming works on a different device from the one that started the intake
  3. A resume link expires, is single-purpose, and cannot be replayed to read someone else's draft
  4. A draft that becomes a completed submission leaves no duplicate PHI behind
  5. No draft is reachable without the token — there is no enumerable draft ID and no listing endpoint

**Plans:** TBD
**UI hint**: yes

**Notes**: **~1+ week, and it reverses a decision that was deliberately recorded as out of scope.**
`PROJECT.md` carried this under Out of Scope with the source directive quoted verbatim: *"Do not let
this get promised casually."* Andrew reversed it on 2026-08-09; the original is retracted in place
there rather than deleted. **It goes on the William list** — scope that was explicitly not committed
is now committed, and the 6/27 list is still unpriced with $1,800 unbilled.

**Why it is a week and not a weekend — four things that do not exist today:**

1. **No draft store.** `submissions` is INSERT-ONLY, there is no `updateSubmission`, and
   `symptom_profile_id` is `NOT NULL UNIQUE`. A draft needs its own table and its own identity; it
   cannot be a half-written submission row.

2. **No email infrastructure at all.** Measured 2026-08-09: zero occurrences of `nodemailer`,
   `resend`, `sendgrid`, `postmark`, `mailgun`, or `sendEmail` across `app/` and `package.json`. The
   app has never sent an email. A magic link means a provider, a BAA with that provider, deliverability
   on a clinical domain, and the unresolved domain-spelling decision (LAUNCH-07) actually blocking
   something for the first time.

3. **No token system for this shape.** `customer-auth.ts` does HS256 Bearer verification for
   logged-in customers. A resume token is different: anonymous, single-purpose, time-boxed, and it
   grants read/write to a partial clinical record. It must not be reusable and must not be guessable.

4. **A second PHI store, with everything that implies.** A draft holds name, DOB, email, phone, and
   partial symptom answers. That is PHI at rest under `CLAUDE.md`'s rules: ownership-bounded access
   only, no PHI in logs, its own entry in `docs/breach-response-runbook.md`, and coverage in
   `submission_access_log`.

**Open question for counsel, not for engineering (raise before building):** is an *abandoned* partial
intake a medical record subject to the 6-year HIPAA retention rule, or may it be purged on expiry?
The answer sets the draft table's deletion policy, and guessing it wrong is a compliance finding in
either direction — purging a record that must be kept, or hoarding PHI that should have been deleted.
`CLAUDE.md` already forbids deleting submission data during incident response; whether that extends to
drafts is genuinely unclear.

**Interaction with Phase 4.1 — these two set one number together.** `PENDING_OLM_AGE_DAYS` is `2`
today. Phase 4.1 argues for shortening it, because after the reorder every abandoner leaves an
orphaned staged file that can never be reclaimed. Resume argues for lengthening it, because a patient
resuming on day 3 must still find their upload. **Neither phase may tune that value alone.** If both
ship, the draft's own expiry and the `pending/` lifecycle age must be the same number, derived from
how long a resume link stays valid.

**Sequencing:** 4.1 first — it is half a day, self-contained, and depends on nothing here. 4.2 is
gated on the same BAA chain as the upload deploy, so it cannot start earlier anyway.

### Phase 04.1: Testing-First Quiz Order (INSERTED)

**Goal**: A patient who cannot supply allergy test results finds that out in the first thirty
seconds, not after completing a ten-minute clinical questionnaire
**Depends on**: Phase 4 (the testing part, upload widget, and storage path must exist before they
can be moved)
**Requirements**: TEST-01, TEST-04 (re-verified in the new position — no new requirement IDs)
**Success Criteria** (what must be TRUE):

  1. The allergy-testing split is the FIRST quiz part a patient sees after the state gate and
     patient-info step — before any scored symptom question

  2. A patient who selects "I've already had allergy testing" and cannot produce a file discovers
     the hard requirement having invested seconds, not the full questionnaire

  3. The score is byte-identical to Phase 4's for the same answers — reordering the parts array
     changes presentation only. `ALL_SCORED_QUESTIONS` still excludes the testing part

  4. Consent still sits between the final part and the results screen, on one path for every
     bracket — the D-09 invariant survives the reorder

  5. `public/quiz-bundle.js` is rebuilt in the same commit, with markers measured 0-before/≥1-after

**Plans:** TBD
**UI hint**: yes

**Notes**: ~half a day. This is deliberately cheap because Phase 2 made part order *data*:
`QUIZ_PARTS` is an array and the renderer carries zero question-ID literals. The upload widget,
`/api/quiz/upload`, GCS staging, promotion, and all three retrieval surfaces are position-independent
and are not touched.

**Why this phase exists.** Phase 4 put a REQUIRED file upload at the end of the flow. Nothing
persists until the terminal POST, so a patient who cannot produce their results loses a completed
ten-minute clinical intake. That is the same defect shape as session 33's HIST-02 finding — a
required field with a plausible "I'm stuck" case — one step further along and with a far worse cost.
Moving it to the front does not remove the wall; it moves the wall to where hitting it is cheap.

**Two things the reorder actually changes, both real:**

1. **Orphaned staged uploads increase materially.** Today a patient must reach the last part to leave
   a file in `pending/`. After the reorder, *every* patient who abandons anywhere leaves one. Because
   nothing persists client-side, an abandoned upload is orphaned the moment the tab closes — the
   patient can never return to claim it. **Revisit `PENDING_OLM_AGE_DAYS`** (currently `2`, applied to
   `gs://alledrops-quiz-uploads-dev` and documented in `docs/gcs-lifecycle-and-retention.md`): a
   shorter window buys strictly less PHI at rest and costs nothing, *unless* Phase 4.2's resume
   capability lands, in which case a resuming patient must still find their file. **These two phases
   set that value together — do not tune it in isolation.**

2. **`generateSymptomProfileId()` timing is unaffected** — it is called on leaving `patient_info`,
   which still precedes the first quiz part. Verified, not assumed.

**Interaction with Phase 4.2 (Resume).** If resume ships, abandonment stops being fatal and this
phase's headline rationale weakens — but does not disappear. Hitting a hard upload requirement early
is still better UX than hitting it late, and at half a day this is cheap enough to do regardless.
Sequence 4.1 first: it is small, self-contained, and does not depend on any resume decision.

### Phase 5: Preliminary Score Page

**Goal**: A patient sees a clinically honest preliminary result and knows a human is reviewing it
**Depends on**: Phase 4 (the results page stops being a routing hub first)
**Requirements**: SCORE-01, SCORE-02, SCORE-03
**Success Criteria** (what must be TRUE):

  1. The page is titled "Preliminary Score" and tells the patient the clinical team will email
     final results within 1–2 business days

  2. No copy anywhere promises the patient will be able to purchase if approved
  3. A colour-banded bar directly above the score shows where the patient falls on the full scale,
     using the range and band boundaries William confirms

  4. The displayed ceiling is computed from the scored question set, so adding a scored question
     changes it automatically rather than silently rotting
**Plans**: TBD
**UI hint**: yes
**Notes**: **Split this phase when planning.** SCORE-01 is ~30 minutes of string edits and is NOT
blocked — ship it early, even during Phase 1 if convenient. SCORE-02 and SCORE-03 (~3–5 h) are
blocked on the score-scale decision: three incompatible range models are in play, and picking one
silently would either resurrect a deprecated model or render almost every patient deep in the red.
See "Blocked on Client Decisions" below. Note that the session-9 fix re-applied the legacy
four-band colour classes at `quiz.module.css:295-299` — that is part of what needs deciding, not a
precedent to follow.

### Phase 6: Purchase Prerequisites & Returning Patients

**Goal**: A patient buying SLIT is told, at the moment of purchase, what AOD requires before
shipping — and a returning patient sees the credit for work already done
**Depends on**: Phase 4 (the checkboxes must reference a testing step that exists)
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06
**Success Criteria** (what must be TRUE):

  1. Completion metafields are readable from Liquid on the storefront — or the spike has documented
     that they are not and named the fallback design

  2. A returning logged-in patient who has completed the quiz sees that state on the product page,
     not only on their customer profile

  3. Add-to-cart on both SLIT product pages requires two confirmations: quiz completed and allergy
     testing submitted

  4. After ordering, the thank-you page explains clinical review with a 2–3 business day
     expectation, and the same language appears in the order confirmation email, at checkout, and in
     the refund policy

  5. A written fulfillment verification step exists and is owned by AOD before the first shipment

**Plans**: TBD
**UI hint**: yes
**Notes**: ~3–5 days; the largest phase. Two new extensions — a theme app extension block targeting
the product template, and this repo's first checkout UI extension. **Start with SHOP-01 as a spike**
and let its result shape SHOP-02 and SHOP-03. Gating is UI-level only and expected to be bypassable
— that is the locked decision, not a gap. Do not propose account flags, Shopify Functions,
real-time blocking, or an `orders/create` backstop; all were removed by
`DEC-purchase-gating-is-honor-system`, and the app's `read_customers,write_customers` scopes plus
Basic/Grow plan make them unavailable anyway. Known weakness to design around: the customer link is
best-effort email matching, so a patient who quizzes with one email and buys with another is
unlinked.

### Phase 7: Telehealth Intake Path

**Goal**: A patient who books the $99 consult can actually book it, and their intake reads as
pre-appointment paperwork rather than a SLIT recommendation
**Depends on**: Phase 3 (telehealth patients still supply history), Phase 5 (score page copy branch)
**Requirements**: TELE-01, TELE-02
**Success Criteria** (what must be TRUE):

  1. `/pages/consult` resolves and a patient can actually book a telehealth consultation, with
     format details present

  2. A patient who arrives via the telehealth path is recorded as such on their submission
  3. A telehealth patient sees the Preliminary Score followed by the pre-appointment copy about
     Dr. Sullivan reviewing their information, not the SLIT closing copy

  4. Telehealth patients still complete medical history before finishing

**Plans**: TBD
**UI hint**: yes
**Notes**: ~1.5–2 days. TELE-01 is storefront plus scheduling-app configuration and depends on the
AOD Shopify account existing (LAUNCH-06) if it is to be built on AOD's store rather than the
current one. `/pages/consult` is also the target of one of Phase 1's four fixed redirects — fixing
the mechanism (DEF-02) does not make the destination exist. Requires a migration plus a validator
field; the $99 consult product appears nowhere in code today.

### Phase 8: Launch Readiness

**Goal**: Nothing outside the codebase is blocking a real patient from being safely and legally
served on AOD's own infrastructure
**Depends on**: Nothing — **runs in parallel from day one**; must complete before go-live
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05, LAUNCH-06, LAUNCH-07, LAUNCH-08
**Success Criteria** (what must be TRUE):

  1. Nothing on a patient-facing page leaks data or bypasses validation — no Klaviyo, Pixel, or GA
     on any PHI-collecting page, and Test Mode does not render in production

  2. Every counsel-owned prerequisite is closed: no placeholder text on any clinical surface,
     `CONSENT_VERSION` bumped, NPP published, privacy policy HIPAA-compatible with an AOD-owned
     contact address, Privacy and Security Officers named, workforce training complete, and a signed
     BAA covering every PHI surface

  3. One real submission has been confirmed written to and read back from production Cloud SQL, and
     the `diag+preflight@example.com` row is gone

  4. Production runs on AOD-owned Google Workspace, Google Cloud, and Shopify, off the cross-client
     billing account, with the confirmed domain spelling live on the quiz subdomain

  5. No repo document describes Google Sheets as the live PHI store

**Plans**: TBD
**Ownership**:

| Item | Owner | Note |
|------|-------|------|
| LAUNCH-01 trackers off PHI pages | Andrew | Theme/Shopify-app level; zero references in this repo. Reportable-breach trigger per `docs/breach-response-runbook.md:16`. Audit Pixel and GA on the same page. |
| LAUNCH-02 Test Mode off production | Andrew | One line in the theme customizer; highest-leverage item in the UX audit |
| LAUNCH-03 disclaimer + consent copy | William / counsel | Two placeholders on two surfaces: app block field "This text needs changed." (toggle off) and `[PENDING]` at `ConsentStep.tsx:56`. Starter drafts exist at `~/Documents/Claude/Projects/AoD/policy-drafts/03,04`. |
| LAUNCH-04 live DB round trip + row cleanup | Andrew | Requires one live submission, which writes a PHI row. `/health` proves nothing — it never touches the DB. Carried since session 27. |
| LAUNCH-05 BAA chain, NPP, officers, training | William / counsel | Google BAA and Fly.io BAA are separate; the app touches PHI in transit. "Who is the covered entity?" is still unanswered. |
| LAUNCH-06 AOD infrastructure handoff | William | Workspace → BAA opt-in → Shopify (~$30/mo) → grant Andrew admin → Andrew migrates DB and transfers store. Blocked on Gene (PTO); escalate to Robert. |
| LAUNCH-07 domain + DNS | William / Jean Caceres | Blocked on the spelling decision; live `ALLERDROPS®` Class 044 trademark exposure |
| LAUNCH-08 docs correction | Andrew | Keep `app/lib/google-sheets.ts` as the throwing tripwire — zero imports, verified 2026-07-29 |

## Blocked on Client Decisions

Neither can be guessed. Both gate specific work and neither blocks the rest of the roadmap.

**1. Score scale semantics — gates SCORE-02 and SCORE-03 only.**
Three incompatible models are live at once: a deprecated 0–60 four-band model, a three-bracket model
with an open-ended `7+` top, and a results UI with the legacy four-colour classes re-applied.
If the range is 0–60 and the brackets drive colour, `7+` covers 54 of 60 points and nearly every
patient renders deep in the red — clinically misleading and not what "green / yellow / red" implies.
**Ask William:** (a) the numeric range the bar displays, (b) the colour-band boundaries on that
range, (c) whether the three brackets or the four legacy bands drive the colour.
**Not blocked and separable:** SCORE-01 — the "Preliminary Score" retitle and the 1–2 business day
review copy. Ship independently.

**2. Domain spelling — gates LAUNCH-07 and the TEST-04 copy string.**
`alledrops.com` (no R) was chosen in October 2025 *because* "AllerDrops" collides with the live
federal `ALLERDROPS®` mark (Class 044, sublingual immunotherapy) in the same product category.
Later call notes contradict this but come from a non-authoritative auto-transcript. Nobody has
confirmed whether the domain was ever registered, or by whom.
**Blocks:** DNS, Workspace domain configuration, the Fly cert, and the `testing@alledrops.com`
address baked into locked copy. **Confirm the exact spelling with William directly, not from the
transcript, before anyone registers or configures anything.**

## Open Questions (one message to William closes all three)

1. Is the "allergy diagnosis" question distinct from the medical-history checkbox list, or the same
   ask? Building it twice is waste. — gates DIAG-01

2. What is the full text of the third medical-history free-text field? Truncated in the source
   email; probable: "Please list any other medical conditions that you have." — gates HIST-03

3. ~~Is resume/edit of an in-progress submission expected? It does not exist, is 1+ week of work, and
   was implied on the call but never committed. — **out of scope for v1.0, recorded as a risk**~~
   **ANSWERED 2026-08-09 — Andrew committed it to scope as Phase 4.2.** No longer an open question,
   but it becomes a William item rather than closing one: it was never priced, and the source
   directive was "do not let this get promised casually."

## Known Risk Shipping With This Milestone

**Abandonment loses the entire questionnaire.** Nothing persists until the terminal POST — no draft
table, no localStorage, no `updateSubmission`, and `symptom_profile_id` is `NOT NULL UNIQUE`. Making
testing mandatory (Phase 4) adds a new, likelier abandonment point.

~~Resume/edit persistence is explicitly not committed for v1.0. Do not let it get promised
casually.~~ **RETRACTED 2026-08-09 — Andrew committed it.** Two phases now attack this risk from
different directions:

- **Phase 4.1** moves the testing split and its required upload to the front, so a patient who
  cannot produce results loses seconds instead of a completed intake. Half a day, unblocked.
- **Phase 4.2** adds true resume via a draft PHI store and an emailed magic link. ~1+ week, gated on
  the Fly.io BAA and the AOD GCP cutover.

**Until 4.2 actually ships, this risk stands exactly as originally written.** And the retracted
sentence's warning still applies to the *commercial* side: it was never priced, and it is now
committed scope on a project with $1,800 unbilled and no Phase 2 SOW.

## Progress

**Execution Order:**
Phases 1 → 2 → 3 → 4 → 5 → 6 → 7 in numeric order. **Phase 8 runs in parallel throughout** — its
client-owned items have multi-week lead times and LAUNCH-01 / LAUNCH-02 are live patient-facing
exposures today.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Live Defect Fixes | 6/6 | Complete   | 2026-07-30 |
| 2. Quiz Schema Foundation | 4/4 | Complete    | 2026-08-09 |
| 3. Mandatory Medical History | 7/7 | Complete   | 2026-08-09 |
| 4. Mandatory Allergy Testing | 17/19 | In Progress|  |
| 5. Preliminary Score Page | 0/TBD | Not started | - |
| 6. Purchase Prerequisites | 0/TBD | Not started | - |
| 7. Telehealth Intake Path | 0/TBD | Not started | - |
| 8. Launch Readiness | 0/TBD | Not started | - |
