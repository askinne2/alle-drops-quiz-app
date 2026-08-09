# Phase 3: Mandatory Medical History - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Every patient — including one who intends to book telehealth only — supplies a medical history
Dr. Sullivan can treat from, on the way to their results. `PART6_MEDICAL_HISTORY` is **replaced
wholesale**, not extended, and the new section becomes a sixth entry in `QUIZ_PARTS` reached by
100% of patients before the outcome page.

Requirements: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, DIAG-01.

This phase builds on Phase 2's mechanism and adds **no new mechanism**. `showIf`, `required`, info
blocks, and `exclusive` all already exist and are tested — Phase 3 is content plus wiring plus two
deletions. If the planner finds itself designing a new schema capability, that is a signal the
content is being modeled wrong, not that Phase 2 fell short.

**In scope beyond the literal requirements, decided in this discussion:**
- Dropping `personal_history_json` / `family_history_json` (D-01) — a destructive migration on a
  PHI table
- Deleting the 7+ "Proceed Without Testing" chain and its warning modal (D-11) — part of TEST-05
  pulled forward from Phase 4

**Explicitly NOT in scope:** the allergy-testing split (Phase 4), test-result upload (Phase 4, see
`<deferred>` — the requirement changed in this discussion), the score page rework (Phase 5), and
the 3–6 "Continue to Purchase AlleDrops" jump (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Data shape and the two legacy columns

- **D-01: `personal_history_json` and `family_history_json` are DROPPED, not left vestigial.**
  A standalone migration removes both columns; the top-level `personal_history` / `family_history`
  payload fields are removed from the client, from `quiz-validation.ts` (:28-29, :117-118), and
  from `insertSubmission` (`submissions.ts:46-47, 73-74, 97-101`).

  **Licensed by a fact confirmed in this discussion: the `submissions` table holds TEST DATA
  ONLY.** No real patient has completed the quiz — consistent with Phase 8 still holding the NPP,
  the BAA chain, and workforce HIPAA training as pre-first-patient blockers. If that turns out to
  be false, this decision does not survive contact and the planner must stop and re-raise it.

  **Requirements on the migration, non-negotiable:**
  - Take an on-demand Cloud SQL backup BEFORE running it (automated backups exist since session 30,
    but a named pre-migration backup is the restore point that matters). Record the backup ID.
  - Its own migration file under `migrations/`, its own commit, reviewed on its own. Do not bundle
    a column drop with application changes.
  - Run against `alledrops_quiz_dev` only. Production cutover to AOD's GCP project has not happened;
    there is no second database to migrate yet.

- **D-02: All new medical-history answers live in `answers_json`, keyed by question ID.**
  This is HIST-05's literal requirement and it is what makes "no new plumbing" true: the PDF
  (`pdf.ts:82`) and admin modal (`app.quiz-results.tsx:255`) both iterate `answers` already.
  **Nothing in this phase adds a top-level payload field or a submissions column.** The standing
  project constraint — new sections extend `answers`, never the payload schema — holds, and D-01
  is the one-time cleanup of the last violation of it, not a precedent for new ones.

- **D-03: `ALL_ITEMS` loses its Part 6 carve-out.**
  `questions.ts:318` currently appends `PART6_MEDICAL_HISTORY` specifically so `visibleAnswers`
  treats `history_personal` / `history_family` as known-and-visible rather than unknown keys. Once
  medical history is a real member of `QUIZ_PARTS`, `ALL_ITEMS` derives from `QUIZ_PARTS` and the
  special case disappears. **`ALL_SCORED_QUESTIONS` must NOT gain the new part** — see D-04.

- **D-04: The score is unchanged by anything answered in medical history.**
  Success Criterion 5. Structurally guaranteed, not asserted: `calculateTotalScore` is always
  called with `ALL_SCORED_QUESTIONS`, which stays Parts 1–5. A test must pin this — same answers
  with and without medical history populated produce an identical score and bracket.

- **D-05: A question-ID → label map is added to `app/lib/format.ts`, with today's `capitalize()`
  as the fallback.**
  Both PHI-facing renderers stringify answer keys with `capitalize(displayKey)`, so a new ID lands
  in the clinical record as e.g. "History_comorbidities". One lookup fixes the new Phase 3
  questions and every existing one at once. Unmapped keys keep today's behavior exactly, so this
  cannot regress an existing row. This is slightly more than "no new plumbing" and is accepted
  deliberately: the alternative is a clinical record Dr. Sullivan has to decode.

### Content and required-ness

- **D-06: HIST-03's three free-text fields each pair with a "None / not applicable" checkbox.**
  Pattern per field: a `yesno`-or-checkbox gate question, then the `text_input` carrying
  `showIf: { questionId: <gate>, equals: <has-some> }` and `required: false`. Pure Phase 2
  mechanism — no new capability. Chosen over accepting typed "none"/"n/a" because the record then
  distinguishes *"patient stated none"* from *"patient typed something to get past the gate"*, and
  because abandonment is this milestone's named headline risk: one click beats three typed words.

  The gate question itself is required (D-05 default from Phase 2), so the patient cannot advance
  by ignoring the pair entirely.

- **D-07: HIST-01's comorbidity checklist carries `exclusive: true` on "none of the above".**
  Eleven locked options: asthma, eczema, anaphylaxis, heart disease, COPD, lung disease, cancer,
  autoimmune conditions, immune system deficiencies (acquired / induced), angioedema, none of the
  above. Required by the Phase 2 default; `[]` does not satisfy it (Phase 2 D-06), and the
  none-option is what makes that reachable for a healthy patient.

  **Phase 2 D-15 is the relevant guard:** the value string's spelling is irrelevant because
  exclusivity is an option-level flag. Write whatever value reads best.

  ⚠️ **Phase 2's D-13 was REVERSED on 2026-08-09** (session 33, PR #18, Fly v49). Selecting an
  exclusive option no longer disables its siblings — `isOptionDisabledByExclusive` is deleted.
  Clicking a real comorbidity while "none of the above" is selected now switches in one click.
  A planner reading Phase 2's CONTEXT.md alone will get this wrong; see
  `tests/quiz-part-renderer-exclusive-clickable.test.ts` for the guard.

- **D-08: HIST-02's medications field is DISTINCT from Part 5's `med_list`. Both exist.**
  Part 5's `med_list` is gated on `taking_meds` = yes and is about allergy medications in the
  symptom context; HIST-02's is a full current-medication list for safety, revealed by ANY
  comorbidity selection **including "none of the above"**. Different IDs, different reveal
  conditions.

  HIST-02's reveal is the named consumer of Phase 2's `isAnswered` operator —
  `showIf: { questionId: "history_comorbidities", isAnswered: true }`. It is **not** an `equals`
  test and must not be written as one; "including none of the above" is precisely the case
  `equals` cannot express. Phase 2 D-07 guarantees the required check and this reveal fire under
  identical conditions, so there is no state where Next is disabled with no visible cause.

  Accepted cost: a patient may type overlapping content in both fields. That is a content problem
  for William, not a schema problem.

- **D-09: HIST-04 collects `pcp_clinic_name` and `pcp_clinic_address` as two separate required
  text fields**, both `showIf: { questionId: <has_pcp>, equals: "yes" }`. Structured beats one
  combined box because the address stays independently readable if anyone ever needs to contact
  the clinic.

  The "no" branch renders **the first real info block in this codebase** — Phase 2 built
  `QuizInfoBlock` and `InfoBlockCard` for exactly this and nothing has exercised them in
  production yet. Copy: "We recommend that you establish with a primary care physician before
  beginning SLIT." Info blocks compose with `showIf` (Phase 2 D-12) and leave no `answers` key
  (Phase 2 D-11). **Budget a browser check for it** — an info block silently failing to render is
  precisely the defect session 32 shipped and caught only by hand.

- **D-10: DIAG-01 and HIST-01 are distinct questions. Build both.**
  HIST-01 is a comorbidity list — asthma, COPD, cancer, autoimmune — mostly not allergic
  conditions. DIAG-01 asks whether a clinician has **diagnosed** the patient with an allergic
  condition, and sits adjacent to the Part 5 medication questions. The roadmap flagged these as
  possibly redundant and said to confirm with William first; that confirmation is folded into the
  consolidated message (see `<specifics>`) rather than blocking the phase. Same judgment as D-08.

### Flow, navigation, and deletions

- **D-11: The 7+ "Proceed Without Testing" chain is DELETED in Phase 3, not Phase 4.**
  Removes `handleProceedWithoutTesting`, `handleConfirmProceedWithoutTesting`,
  `handleDeclineProceedWithoutTesting`, the `showProceedWarning` state, and the warning modal.
  The 7+ patient's remaining exit is the existing "I need testing first" button (`handleTestFirst`
  → submit → `navigateParent(getRedirectUrl("testOptions"))`), which is live today and unaffected.

  This pulls **half** of TEST-05 forward. The 3–6 "Continue to Purchase AlleDrops" jump
  (`handleProceedToPurchase`) **stays** for Phase 4, as does stripping the four callback props off
  `ResultsDisplay`. TEST-05's own note says it must land after HIST-05 — it now lands partly
  *with* HIST-05, which satisfies the ordering constraint. Phase 4's requirement text should be
  updated to reflect that half of it is already done.

- **D-12: The `"medical_history"` `FlowStep` and everything that exists to serve it are deleted.**
  Named targets, all in `QuizContainer.tsx`:
  - the `"medical_history"` member of the `FlowStep` union (:38)
  - the seeding effect (:153-161) that writes `history_personal: []` / `history_family: []`
  - the whole `step === "medical_history"` render branch (:548-571)
  - the consent back-button's `scoreBracket === "7+"` special case (:582)
  - the `PART6_MEDICAL_HISTORY` import (:13)

  After D-11 and D-12 there is **no remaining code path that sets `step` to `"medical_history"`.**
  A source-text guard should assert the string is absent from `QuizContainer.tsx`, in the style of
  `tests/quiz-container-no-question-filter.test.ts`. Dead steps are how the `entry.theme.tsx` open
  redirect survived two independent reviews.

- **D-13: Medical history is reached by 100% of patients, including the 0–2 bracket.**
  Today a 0–2 patient auto-submits the moment Part 5 completes and never sees an outcome page.
  After this phase, auto-submit fires after the medical-history part instead. One flow, no
  bracket-conditional path. `autoSubmit0to2Attempted` guarding needs re-checking against the new
  part count — the ref exists to prevent double submission and its trigger condition moves.

- **D-14: Phase 3 ships to production on its own.** Consistent with Phases 1 and 2, both of which
  deployed and were UAT'd individually — and both times that caught defects a green suite missed.
  Medical history is additive; after D-11 the only removal is a bypass that contradicts the
  product's direction anyway.

### Claude's Discretion

- Question IDs, `order` values, and part number for the new section — subject to D-05's label map
  making them read correctly in the PDF.
- Whether the new section is a sixth entry in `QUIZ_PARTS` or `QUIZ_PARTS` is restructured, so
  long as every patient passes through it before the outcome page and `ALL_SCORED_QUESTIONS` stays
  Parts 1–5.
- Where DIAG-01 physically sits — inside Part 5 adjacent to the medication questions, or its own
  item. The requirement says "adjacent," not "inside."
- The exact gate-question type for D-06's three pairs (`yesno` vs a single-option checkbox).
- Progress-indicator wording now that there are six parts, and whether the section carries its own
  heading.
- Test structure and placement, provided the suite (**282 tests / 23 files** at phase start) stays
  green.
- Commit decomposition — except that D-01's migration is its own commit, non-negotiable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and sequencing
- `.planning/ROADMAP.md` §"Phase 3: Mandatory Medical History" — goal, 5 success criteria, and the
  note that Part 6 is replaced wholesale
- `.planning/REQUIREMENTS.md` — HIST-01…HIST-05 and DIAG-01 verbatim; TEST-04 and TEST-05 for what
  Phase 4 owns and what D-11 pulls forward
- `.planning/phases/02-quiz-schema-foundation/02-CONTEXT.md` — the mechanism this phase consumes.
  **D-13 in that file is stale — see D-07 above.**

### Compliance (read before touching the PHI path)
- `CLAUDE.md` §compliance rules 1–6 and §"Self-review checklist for PHI-handling changes" — the
  checklist applies to D-01's migration and to anything touching `submissions.ts`
- `app/lib/quiz-validation.ts` — its comment header states the PHI rules the payload must obey

### Product source
- `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md` — full plan
- `~/Documents/Claude/Projects/AoD/aod-consent-text.md` — verbatim consent text; the consent step
  is downstream of medical history in the new flow
- William's 6/27 email — origin of HIST-01…04. **The HIST-03 third label is truncated in the
  source.** Not in this repo; lives in the AoD notes folder and Gmail.

### Code the planner must read, not infer
- `app/components/quiz/QuizContainer.tsx` — the file this phase rewires; every D-12 line reference
- `app/lib/quiz/questions.ts` — `PART6_MEDICAL_HISTORY` (:248-290), `QUIZ_PARTS` (:307),
  `ALL_SCORED_QUESTIONS` (:293), `ALL_ITEMS` (:318)
- `app/lib/quiz/schema.ts` — the evaluator; every visibility and required decision routes here
- `app/lib/submissions.ts` — `insertSubmission`, the two columns D-01 drops
- `app/lib/format.ts` — where D-05's label map goes
- `migrations/001_create_submissions.sql` — the migration convention to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`app/lib/quiz/schema.ts`** — `evaluateShowIf`, `isAnswered`, `visibleItems`, `visibleAnswers`,
  `itemsForPart`, `toggleOption`. Every Phase 3 visibility and required behavior is expressible
  through these. Pure, node-testable, 80 tests already.
- **`QuizInfoBlock` + `InfoBlockCard`** (`QuizPartRenderer.tsx:37-55`) — built in Phase 2, never
  yet used in production. HIST-04's "no" branch is its first real consumer.
- **`showIf` operators** — all three have a Phase 3 consumer: `equals` (HIST-04 PCP, D-06 gates),
  `isAnswered` (HIST-02 medications reveal), `includes` (available, unused so far).
- **`getQuestionById`** — the `showIf` reference-integrity test is its consumer; new questions get
  validated for free.

### Established Patterns
- **`required` defaults to `true`** (Phase 2 D-05). New questions are required unless they declare
  otherwise — the correct failure direction for a clinical intake, and why D-06 uses gate +
  `required: false` rather than leaving fields optional.
- **`[]` does not satisfy a required checkbox question** (Phase 2 D-06). This is exactly why
  HIST-01 needs its "none of the above" option and why the old `history_personal` /
  `history_family` carry `required: false` — a trap already sprung once, in Phase 2's planning.
- **Nothing in `app/lib/quiz/` throws.** Invalid input degrades to a safe default. Dangling
  `showIf` references fail OPEN (Phase 2 D-04) — an unresolvable reference renders the question
  rather than silently skipping a clinical field.
- **Source-text guards substitute for DOM tests** (`tests/quiz-container-no-question-filter.test.ts`,
  `tests/quiz-part-renderer-no-literals.test.ts`, `tests/quiz-part-renderer-exclusive-clickable.test.ts`).
  Count with `SOURCE.split(needle).length - 1`, **never `grep -c`** — it counts lines and collapses
  every multi-match line to 1.
- **`public/quiz-bundle.js` is a committed artifact built by `npm run build:theme`**, a separate
  vite config that `npm run build` does not touch. Rebuild it in the same commit as any quiz source
  change. `tests/quiz-bundle-freshness.test.ts` guards this; it exists because the omission shipped
  a dead phase in session 32.

### Integration Points
- `QUIZ_PARTS` (`questions.ts:307`) — where the new section attaches
- `ALL_ITEMS` (`questions.ts:318`) — loses its Part 6 carve-out (D-03)
- `QuizContainer.tsx` — five deletion sites (D-12) plus the auto-submit trigger for 0–2 (D-13)
- `app/lib/format.ts` → consumed by both `pdf.ts:82` and `app.quiz-results.tsx:255` — one label map
  serves both PHI-facing renderers (D-05)
- `submissions.ts` + `quiz-validation.ts` + `migrations/` — D-01's three-sided change

### ⚠️ Standing risk the planner must decide on before executing
**Three defects have now shipped past a fully green suite, all in the same blind spot: no test
renders `QuizContainer` or `QuizPartRenderer`.**

| Session | Defect | Suite at the time |
|---|---|---|
| 32 | `public/quiz-bundle.js` never rebuilt — phase invisible on the storefront | 269 green |
| 32 | Container filtered info blocks out before the renderer saw them | 269 green |
| 33 | Exclusive option disabled every sibling; the switch was unreachable | 280 green |

Each was caught by a human clicking. `schema.ts` was correct in all three cases — the bugs live in
the wiring between the pure module and the DOM. **Phase 3 rewires that exact container and ships
the first production info block**, which is the same failure shape as session 32's second defect.
DOM test infra was declined in Phase 2 on two data points; there are now three. Decide explicitly,
and if the answer is still no, say why in the plan.

</code_context>

<specifics>
## Specific Ideas

- **The `submissions` table is test data only.** Stated by Andrew in this discussion and load-bearing
  for D-01. No real patient has completed the quiz.
- **Consolidated William message, to draft after this context lands.** One Missive draft covering:
  1. Domain spelling — still unresolved since session 27; blocks the `testing@` address and DNS
  2. Test-result upload — see `<deferred>`; where the files live, under whose BAA
  3. DIAG-01 scope — is the diagnosis question distinct from the comorbidity checklist (built as
     distinct per D-10; this confirms rather than blocks)
  4. HIST-03's truncated third label — confirm "Please list any other medical conditions that you
     have."
  5. Medical disclaimer copy — the live intake page still carries none, and the theme's placeholder
     reads "This text needs changed."
- **HIST-03 third label is unconfirmed copy.** Built on the probable wording; a one-line change in
  `questions.ts` plus a theme rebuild if William corrects it. Mark it as unconfirmed in a code
  comment so nobody mistakes it for approved clinical copy.

</specifics>

<deferred>
## Deferred Ideas

- **🔴 TEST-RESULT UPLOAD — this is a REQUIREMENT CHANGE, not a nice-to-have.**
  Andrew decided in this discussion that patients must be able to **upload allergy test results
  directly in the quiz**, associated with the patient's file. This **reverses TEST-04**, which
  currently reads "instructs the patient to email results to `testing@alledrops.com` … with no file
  input, multipart parsing, object storage, or upload column introduced."

  **Decision: expand Phase 4 to include upload.** Phase 4 does not ship until upload works.

  **Actions required before Phase 4 is planned — do not let this get lost:**
  - Rewrite TEST-04 in `.planning/REQUIREMENTS.md` from email-only to upload
  - Update the Phase 4 block in `.planning/ROADMAP.md`: new dependencies, revised estimate, and
    note that half of TEST-05 already landed in Phase 3 (D-11)
  - Use `/gsd:phase` to edit rather than hand-editing

  **New hard prerequisites this creates, both currently open:**
  - **Fly.io BAA** — an unstarted sales conversation on `CLAUDE.md`'s open-work list. Patient-
    uploaded test results are PHI in a file; they cannot land on Fly volumes without it.
  - **Production cutover to AOD's Google Cloud project** — object storage belongs in the account
    under AOD's BAA, not in Andrew's `alledrops-quiz` dev project.

  **Scope this actually carries:** multipart handling, size and MIME limits, a storage bucket, a
  link row to the submission, ownership-bounded download endpoints for both the patient
  (`/api/me/*`) and the admin, a retention and deletion policy, and coverage in
  `submission_access_log` and the breach-response runbook.

- **The 3–6 "Continue to Purchase AlleDrops" jump** (`handleProceedToPurchase`) — stays live
  through Phase 3, deleted in Phase 4 with the rest of TEST-05.
- **Stripping the four callback props off `ResultsDisplay`** — Phase 4 (TEST-05).
- **DOM test infrastructure** — see the standing risk in `<code_context>`. Not scoped here; needs
  an explicit decision in the plan.
- **Progress-indicator and section-heading wording for six parts** — Claude's discretion this
  phase; if it needs real copy, it belongs with Phase 5's score-page copy work.

</deferred>

---

*Phase: 3-Mandatory Medical History*
*Context gathered: 2026-08-09*
