# Phase 4: Mandatory Allergy Testing - Context

**Gathered:** 2026-08-09
**Status:** ⛔ **BLOCKED — do not plan yet.** See `<blockers>`.

<domain>
## Phase Boundary

No patient — and no storefront page — can reach purchase without allergy testing. Every patient
passes through a two-option allergy-testing step between the questionnaire and their score, both
no-testing bypasses are gone, and no surface in the quiz or on the storefront offers or implies a
path to purchase without testing.

Requirements: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07.

**Phase 4 grew in this discussion.** It is no longer the ~1-day phase the roadmap describes. Three
decisions expanded it:

1. **Test-result upload is IN** (D-01) — reversing a LOCKED client decision and adding two hard,
   client-side prerequisites that did not previously block this phase.
2. **Consent moves onto the single flow** (D-09) — which deletes the 0–2 auto-submit path entirely
   and rewires how every bracket completes.
3. **Theme-repo reconciliation is IN** (D-14) — TEST-06 is a `shopify theme push`, not a
   theme-editor paste, so the drifted theme repo gets reconciled first.

**In scope beyond the literal requirements, decided in this discussion:**
- Multi-file PHI upload with storage, retrieval, and PDF embedding (D-01…D-05)
- The `quiz-history` Customer Account UI extension refactor, promoted from open-work list to a hard
  prerequisite (D-05)
- Reconciling the `allergist-on-demand` theme repo against live (D-14)
- Placeholder-free interim consent copy (D-11)

**Explicitly NOT in scope:** the score-scale decision and the colour-banded bar (Phase 5, blocked on
William), SCORE-01's retitle (Phase 5 — deliberately NOT pulled forward, see D-10), purchase
prerequisites and returning-patient state (Phase 6), the telehealth branch (Phase 7), and the
provider review-status workflow (v2 / Phase 2.5 backlog — considered and rejected, see D-08).

</domain>

<blockers>
## ⛔ Blockers — Phase 4 cannot be planned or executed until these clear

Andrew was shown the cost of keeping upload inside Phase 4 and reaffirmed the choice. Recording the
consequence plainly so nobody re-litigates it and nobody plans around it prematurely.

| # | Blocker | Owner | Blocks |
|---|---------|-------|--------|
| 1 | **William agrees to test-result upload, and it is priced.** Reverses his own 2026-07-29 LOCKED decision. $1,800 is already unbilled and the Phase 2 SOW has been unwritten since 6/30. | William / Andrew | All of D-01…D-05 |
| 2 | **Fly.io BAA signed.** Patient-uploaded test results are PHI in a file; they cannot transit or land on Fly without it. Currently an unstarted sales conversation. | Andrew | Upload storage + endpoints |
| 3 | **Production cutover to AOD's Google Cloud project.** Object storage belongs in the account under AOD's BAA, not in Andrew's `alledrops-quiz` dev project. Itself blocked on Google Workspace (Gene, PTO → escalate to Robert). | William / AOD | Upload storage |

**What is NOT blocked and could ship separately if the client conversation stalls:** the Part 7
testing split with three text fields, both bypass deletions (TEST-05), the consent reorder
(TEST-07), the results-copy edit, and TEST-06. That is the roadmap's original ~1 day. Splitting was
offered and declined — recorded here only so the option is visible if the blockers persist.

**One dependency was REMOVED by this discussion:** TEST-04 no longer carries a `testing@…` email
address, so the **unresolved domain-spelling decision no longer gates Phase 4.** It still gates
LAUNCH-07.

</blockers>

<decisions>
## Implementation Decisions

### Test-result upload

- **D-01: Upload is IN Phase 4. Phase 4 does not ship until upload works.**
  This reverses `DEC-testing-results-by-email-not-upload` (`PROJECT.md:229`, status **LOCKED**,
  2026-07-29, sourced to William's own words: *"it's fine if they just want to email it directly to
  us"*). That decision is what made Phase 4 cheap — it recorded the consequence as **3–4 days → ~1
  day**. Re-adding upload puts the 3–4 days back.

  Andrew was presented with a split (ship the testing split now, upload as a later phase gated on
  the BAA and GCP cutover) and chose the single-phase option with the blockers stated. **That is the
  decision; do not re-open it.**

  **Required before planning, do not let this get lost:**
  - Retract `DEC-testing-results-by-email-not-upload` **in place** in `PROJECT.md`, so the retraction
    is visible to anyone who read the original — same convention as the `injectIframe` correction
    and the Apntly entry in `STATE.md`.
  - Rewrite TEST-04 in `.planning/REQUIREMENTS.md` from email-only to required upload.
  - Update the Phase 4 block in `.planning/ROADMAP.md`: the three new blockers, revised estimate,
    and a note that **half of TEST-05 already landed in Phase 3** (Phase 3 D-11).
  - Use `/gsd:phase` to edit. Do not hand-edit `ROADMAP.md` or `STATE.md`.

- **D-02: Upload is REQUIRED to continue on the "I've already had allergy testing" branch.**
  No path past the testing step without a file. Chosen over optional-with-email-fallback.

  **Accepted cost, stated explicitly:** this adds a hard abandonment point to a flow that persists
  nothing until the terminal POST. A patient without the PDF on their phone loses the entire
  questionnaire. Abandonment is this milestone's named headline risk (`PROJECT.md` §Risks) and
  resume/edit is out of scope for v1.0. The mitigating fact is D-06 — the other branch is always
  available and requires no file.

  **Consequence:** TEST-04's email instruction disappears from the copy entirely, which is why the
  domain-spelling decision stops gating this phase.

- **D-03: PDF + photos, multiple files per submission.**
  Allowlist: PDF, JPEG, PNG, HEIC. HEIC specifically because it is the iPhone default and the
  realistic case is a patient photographing a paper allergy panel — often 3–4 pages.

  Implies: a file-list UI (add/remove before submit), per-file **and** total size caps, and a
  **one-to-many** `submissions → files` relation, not a single link column. HEIC needs either
  server-side conversion or a viewer that handles it; the planner decides which, subject to D-05's
  no-remote-assets constraint.

- **D-04: Uploads never touch Shopify, and never leave the BAA chain.**
  Standing project rule, restated because this is the first binary PHI the app has ever handled.
  Storage target is AOD's GCP project under their BAA (blocker 3). No Google Workspace product
  (`CLAUDE.md` rule 3). No third-party upload widget, no CDN, no telemetry-emitting dependency.

- **D-05: Uploaded files are retrievable three ways — admin, patient ledger, and inline in the
  clinical PDF.**
  Andrew answered freeform: *"admin + patient + inline in the clinical PDF please."*

  Three surfaces, each with its own cost the planner must budget:
  1. **Admin** — download from `/app/quiz-results`, ownership-bounded, logged to
     `submission_access_log`. Cheapest; the detail modal and PDF route already exist.
  2. **Patient ledger** — via `/api/me/*` with JWT Bearer auth and an ownership check, surfaced in
     the `quiz-history` Customer Account UI extension.
     ⚠️ **That extension is currently broken** — it still reads PHI metafields that were deleted, and
     renders empty state. Its refactor is on `CLAUDE.md`'s open-work list and is in **no phase
     today.** Patient-side file access cannot land on a surface that does not work. **The planner
     must either scope the refactor into Phase 4 or raise it as a fourth blocker.**
  3. **Inline in the clinical PDF** — `app/lib/pdf.ts` renders text from `answers_json` only.
     Embedding an image or merging a PDF is **new capability with a new dependency**. `CLAUDE.md`'s
     PHI checklist requires no remote fonts, no remote images, no remote CSS, and no outbound network
     calls during PHI processing. Vet the dependency against that before adopting it.

### Flow and placement

- **D-06: The testing split is a 7th part in `QUIZ_PARTS`, not a new `FlowStep`.**
  Zero new mechanism, exactly as Phase 3 did it:

  ```
  QUIZ_PARTS[6]
    testing_status     radio, required — exactly two options
    testing_year       showIf: testing_status = had_testing
    testing_location   showIf: testing_status = had_testing
    testing_allergens  showIf: testing_status = had_testing
    testing_files      showIf: testing_status = had_testing, required (D-02)
  ```

  `isPartComplete` gates Next with no new code; the progress bar and back-navigation work unchanged.
  Phase 3 deleted the `"medical_history"` FlowStep for being exactly the shape option 2 proposed, and
  dead FlowSteps are how the `entry.theme.tsx` open redirect survived two independent reviews.

  **Open sub-question for the planner:** whether a multi-file picker fits `QuizPartRenderer`'s
  question-card model, or needs a new `QuizItem` union member. If it needs new mechanism, say so
  explicitly in the plan rather than special-casing by question ID — that is what Phase 2 exists to
  prevent.

  Ordering is already locked upstream: medical history (Part 6) comes **before** the testing split
  (`DEC-medical-history-before-testing-split`).

- **D-07: "I need allergy testing" does NOT exit the quiz. The patient finishes the flow and gets
  the testing link on the results page.**

  ```
  Part 7 testing → consent → submit → Preliminary Score
                                        └─ "Schedule Allergy Testing" → /pages/test-options
  ```

  One path, no branch-specific exit. Satisfies TEST-07 structurally — there is no completion route
  that skips consent, so it cannot regress — and the patient sees the score that motivates getting
  tested.

  **This is compatible with TEST-05's "terminal `ResultsDisplay`."** The CTA is a plain `<a href>`
  handled by the existing anchor interceptor in `quiz-embed.tsx:62-72`, not a callback prop. Today's
  `handleTestFirst` (submit-then-navigate) is deleted along with the other two handlers.

- **D-08: The branch choice is honor-system, recorded but not enforced.**
  Nothing prevents a patient from picking "I need allergy testing" to dodge the required upload.
  Consistent with `DEC-purchase-gating-is-honor-system` (LOCKED): that patient is routed to *buy
  testing* and is not purchasing SLIT today, so the branch is a slower path, not a purchase bypass.
  Enforcement stays human at fulfillment.

  `testing_status` lands in `answers_json` and the admin table gains a **read-only, filterable**
  testing-status column derived from it.

  ⚠️ **Recorded reversal within this discussion.** Andrew first chose "flag it for provider review,"
  then a reviewed-checkbox scope, then reversed both — *"let's go back on that last answer, we don't
  want to stray from the plan."* **Final state: read-only.** No `reviewed_at` column, no PATCH
  endpoint, no write path. **`submissions` stays insert-only** and the Phase 2.5 provider-review
  workflow stays deferred to v2. A planner who reads only the checkpoint's option list will get this
  backwards.

### Consent and the results page

- **D-09: Consent sits between the testing step and the results page, on one path for every
  bracket.**

  ```
  state_gate → patient_info → Parts 1-5 → Part 6 history → Part 7 testing
                                                              ↓
                                                          consent
                                                              ↓
                                                          submit
                                                              ↓
                                                  Preliminary Score (terminal)
  ```

  **This fixes a live defect, not just a future one.** Today a 0–2 patient auto-submits with
  `consent_version: CONSENT_VERSION` stamped in the payload while never seeing `ConsentStep`
  (`QuizContainer.tsx:205-219`). The field records consent the patient did not give. TEST-07 is
  violated in production right now.

  **Deletions this forces in `QuizContainer.tsx`:** the 0–2 auto-submit `useEffect`, the
  `autoSubmit0to2Attempted` ref, `handleScheduleConsult`, `handleTestFirst`,
  `handleProceedToPurchase`, and the `savedToServer` bookkeeping that only existed to keep those
  three from double-submitting.

  **Resolves for free:** the `symptom_profile_id` double-submit defect recorded in `STATE.md`
  §Deferred Items. Reproducing it during verification would otherwise read as a Phase 1 regression.

  A source-text guard should assert the deleted handler names are absent, in the style of
  `tests/quiz-medical-history-deletion.test.ts`.

- **D-10: Phase 4 makes a minimal results-copy edit and adds one static CTA. It does NOT do Phase
  5's job.**
  Keep the three bracket messages; cut only the clauses the phase makes false:
  - **7+** — cut *"We recommend proceeding with allergy testing, to identify specific allergens…"*.
    The patient answered that question one step ago.
  - **3–6** — cut the "Continue to Purchase AlleDrops" button (TEST-05) and the purchase offer.
  - **All brackets** — if `testing_status = needs_testing`, render the "Schedule Allergy Testing"
    link.

  **No clinical claims are added — only removed.** That is what keeps this inside the
  no-unapproved-clinical-copy constraint. SCORE-01's retitle was offered and deliberately left in
  Phase 5.

- **D-11: Phase 4 writes placeholder-free interim consent copy.**
  `ConsentStep.tsx:56` renders a literal `[PENDING — Treatment policy page language]`. Phase 4
  routes **100% of patients** through consent, up from only the 3–6 purchase path — so this phase
  materially increases the exposure rather than inheriting it.

  Rewrite the surrounding paragraph so the consent document is coherent without the treatment-policy
  reference.

  ⚠️ **This brushes a standing constraint** — `PROJECT.md` and `CLAUDE.md` both route clinical copy
  through William or counsel, and a consent document is squarely in that category. Andrew chose this
  over hard-blocking the phase gate. **Reconciliation, which the planner must implement:**
  - Mark the interim text **UNCONFIRMED in a code comment**, the same convention Phase 3 used for
    HIST-03's truncated label, so nobody mistakes it for approved clinical copy.
  - Add it to the William/counsel message for approval before go-live.
  - LAUNCH-03 remains the owner of the final language; this is a stopgap, not a closure.

### Storefront remediation (TEST-06)

- **D-12: The theme repo is reconciled against live BEFORE TEST-06 is applied.**
  Target: `/Users/andrewskinner/Local Sites/allergist-on-demand` (Sense 15.4.1). Known drift:
  - `templates/page.quiz.json` — uncommitted local edit matching Andrew's theme-editor fix; git HEAD
    still references a `quiz-kit-smart-product-finder` block.
  - `config/settings_data.json` — the Klaviyo block still reads `disabled: false` locally, while live
    is off (Andrew disabled it in the theme editor 2026-08-09).
  - `templates/page.testing-options.json` — an orphaned template; `/pages/testing-options` is a 404.

  ⚠️ **This is a live compliance trap, and reconciling it is the point.** A `shopify theme push` from
  that repo **today** would re-enable Klaviyo on `/pages/allergy-quiz` — a third-party script on a
  PHI-collecting page and a reportable-breach trigger per `docs/breach-response-runbook.md:16`.
  Choosing the theme-push route over the theme-editor route makes fixing this mandatory rather than
  optional.

- **D-13: Delete the false clauses; draft the replacement for William rather than shipping it.**
  Removal of an inaccurate clinical claim needs no approval. Authoring a replacement does.

  **Delete now, verify as absence:**
  - Both product pages — the *"no longer a need for needles or allergy tests"* clause.
  - `/pages/test-options` — the proceed-without-testing content.

  **Draft, hold for approval:** accurate replacement copy stating testing is required before SLIT
  and how the patient obtains it. It rides along on the William message rather than shipping in
  Phase 4.

- **D-14: Verify on authenticated, cache-busted served bytes — never on the editor UI or a deploy
  exit code.**
  Count occurrences with `SOURCE.split(needle).length - 1`. **Never `grep -c`** — it counts matching
  *lines*, and against a single-line bundle every count collapses to 1. That trap has now been hit
  by three separate executors and once by the orchestrator.

  The storefront is password-protected: **unauthenticated requests 302 to `/password` and return 200
  for the password page**, so every unauthenticated check passes vacuously. Authenticate first.

  Also: a single fetch is not evidence. The Klaviyo verification on 2026-08-09 showed 10 occurrences
  in a fetch taken ~2 minutes before the theme save and 0 after. Re-fetch with a cache-buster.

### Claude's Discretion

- Question IDs, `order` values, and part number for the testing section — subject to Phase 3 D-05's
  label map in `app/lib/format.ts` making them read correctly in the PDF and admin modal.
- The two option labels' exact wording, and whether Part 7 carries its own heading.
- Progress-indicator wording at seven parts.
- Whether the multi-file picker is a new `QuizItem` union member or fits the existing question-card
  model — but say which, and why, in the plan.
- Storage target specifics (bucket layout, object naming, signed-URL TTL), retention and deletion
  policy, virus scanning, and whether HEIC is converted server-side — all subject to D-04.
- The `submissions → files` relation shape (join table vs. array column).
- Test structure and placement, provided the suite (**361 tests / 27 files** at phase start) stays
  green.
- Commit decomposition — except that any migration is its own commit, per Phase 3 D-01's precedent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and sequencing
- `.planning/ROADMAP.md` §"Phase 4: Mandatory Allergy Testing" — goal, 5 success criteria, and the
  note that both bypasses must go. **Stale as written** — the estimate and dependencies predate D-01.
- `.planning/REQUIREMENTS.md` — TEST-01…TEST-07 verbatim. **TEST-04 is stale** — it still reads
  email-only with "no file input"; D-01 reverses it.
- `.planning/PROJECT.md` §Key Decisions — `DEC-mandatory-allergy-testing`,
  `DEC-purchase-gating-is-honor-system`, `DEC-no-approval-promise-copy`, and
  `DEC-testing-results-by-email-not-upload` (**being retracted by D-01**).
- `.planning/phases/03-mandatory-medical-history/03-CONTEXT.md` — D-11 records that half of TEST-05
  already shipped; `<deferred>` records the upload reversal that produced this phase's blockers.
- `.planning/phases/02-quiz-schema-foundation/02-CONTEXT.md` — the `showIf`/`required`/info-block
  mechanism this phase consumes. ⚠️ **Its D-13 is stale** — reversed 2026-08-09, see Phase 3 D-07.

### Compliance — read before touching the PHI path
- `CLAUDE.md` §compliance rules 1–6 and §"Self-review checklist for PHI-handling changes" — applies
  to every upload endpoint, the storage decision, and the PDF dependency in D-05.
- `docs/breach-response-runbook.md:16` — the reportable-breach trigger behind D-12's Klaviyo trap.
- `app/lib/quiz-validation.ts` — its comment header states the PHI rules the payload must obey.

### Product source
- `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md` — full plan.
- `~/Documents/Claude/Projects/AoD/aod-consent-text.md` — verbatim consent text; D-11 edits its
  rendered form.
- `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` — R5 (the testing split and the email-not-upload call)
  and R10 (honor-system gating). The source being reversed by D-01.

### Code the planner must read, not infer
- `app/components/quiz/QuizContainer.tsx` — the file this phase rewires. Every D-09 deletion target;
  the auto-submit effect at `:205-219`; `handleScheduleConsult` `:241`, `handleTestFirst` `:256`,
  `handleProceedToPurchase` `:269`.
- `app/components/quiz/ResultsDisplay.tsx` — loses all three callback props (TEST-05); D-10's copy
  edits at `:80-107` (3–6) and `:109-132` (7+).
- `app/components/quiz/ConsentStep.tsx:56` — the `[PENDING]` placeholder D-11 removes.
- `app/lib/quiz/questions.ts` — `QUIZ_PARTS` (:476), `ALL_SCORED_QUESTIONS` (:455), `ALL_ITEMS`
  (:488). The new part attaches to `QUIZ_PARTS`; **`ALL_SCORED_QUESTIONS` must NOT gain it.**
- `app/lib/quiz/schema.ts` — the pure evaluator. `evaluateShowIf` is **non-transitive by design**;
  no chained `showIf`. Every visibility and required decision routes here.
- `app/lib/quiz/redirects.ts` — `REDIRECT_FALLBACK.testOptions` = `/pages/test-options`, verified
  live. D-07's CTA target.
- `app/lib/quiz/navigation.ts` — the canonical path validator. **Four files port these rules and
  change together.**
- `app/lib/submissions.ts` — `insertSubmission`; the table D-08 keeps insert-only.
- `app/lib/pdf.ts` — text-only today; D-05 adds embedding.
- `app/routes/api.me.assessments.tsx`, `api.me.assessment.$id.pdf.tsx` — the JWT Bearer + ownership
  pattern D-05's patient endpoints must follow.
- `extensions/quiz-history/` — the broken extension D-05 depends on.
- `migrations/001_create_submissions.sql`, `003_drop_medical_history_legacy_columns.sql` — the
  migration convention.
- `tests/quiz-bundle-freshness.test.ts` — `public/quiz-bundle.js` must be rebuilt with
  `npm run build:theme` in the same commit as any quiz source change.

### Theme repo (D-12)
- `/Users/andrewskinner/Local Sites/allergist-on-demand` — Sense 15.4.1. `config/settings_data.json`
  (Klaviyo + Appointly blocks), `templates/page.quiz.json` (drift),
  `templates/page.testing-options.json` (orphaned).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`app/lib/quiz/schema.ts`** — `evaluateShowIf`, `isAnswered`, `visibleItems`, `visibleAnswers`,
  `itemsForPart`, `toggleOption`. Every D-06 visibility and required behavior is expressible through
  these. Pure, node-testable, ~80 tests.
- **The anchor interceptor** (`quiz-embed.tsx:62-72`) — how a static link navigates the parent
  storefront without a callback. D-07's CTA rides this, which is what keeps `ResultsDisplay`
  terminal.
- **`QuizInfoBlock` + `InfoBlockCard`** — proven in production by Phase 3's HIST-04 branch. Available
  if the testing step needs static guidance copy.
- **JWT Bearer + ownership pattern** — `app/lib/customer-auth.ts` +
  `getSubmissionByIdForCustomer`. D-05's patient file endpoint must reuse this, not roll its own.
- **`app/lib/format.ts` `getAnswerLabel`** — one map consumed by both PHI renderers (`pdf.ts`,
  `app.quiz-results.tsx`). New testing question IDs get readable labels by adding entries here.

### Established Patterns
- **`required` defaults to `true`** (Phase 2 D-05). A question that forgets the flag stays required —
  the correct failure direction for a clinical intake.
- **`[]` does not satisfy a required checkbox question** (Phase 2 D-06).
- **Exclusive options do NOT disable siblings** (Phase 2 D-13, **reversed** 2026-08-09). Guard:
  `tests/quiz-part-renderer-exclusive-clickable.test.ts`.
- **Nothing in `app/lib/quiz/` throws.** Invalid input degrades to a safe default; dangling `showIf`
  references fail OPEN (Phase 2 D-04) — an unresolvable reference renders the question rather than
  silently skipping a clinical field.
- **Source-text guards for deletions**, proven RED against pre-change source before being trusted.
- **`submissions` is insert-only.** No `updateSubmission` exists. D-08 preserves this.
- **New sections extend `answers_json`, never the top-level payload schema** (Phase 3 D-02). ⚠️ D-03's
  file relation is the first legitimate exception since Phase 3 cleaned up the last one — a file
  cannot live in a JSON answers blob. The planner must justify the shape explicitly.

### Integration Points
- `QUIZ_PARTS` (`questions.ts:476`) — where Part 7 attaches
- `QuizContainer.tsx` — six deletion sites (D-09) plus the new consent position
- `ResultsDisplay.tsx` — three props removed, two copy edits, one conditional CTA (D-07, D-10)
- `app/lib/format.ts` → both PHI renderers — new testing question labels
- `submissions.ts` + `migrations/` + a new storage module — D-03's one-to-many relation
- `extensions/quiz-history/` — D-05's patient surface, currently non-functional

### ⚠️ Standing risk the planner must address explicitly
**Five defects have now shipped past a fully green suite. All five were caught by a human clicking.**

| Session | Defect | Suite at the time |
|---|---|---|
| 32 | `public/quiz-bundle.js` never rebuilt — phase invisible on the storefront | 269 green |
| 32 | Container filtered info blocks out before the renderer saw them | 269 green |
| 33 | Exclusive option disabled every sibling; the switch was unreachable | 280 green |
| 33 | DIAG-01's examples duplicated HIST-01's checklist | 358 green |
| 33 | HIST-02's medications field required with no escape | 358 green |

Phase 3 adopted DOM test infra (`jsdom` + `@testing-library/react`) and it closed the *wiring* blind
spot — defects 1–3 are the shape it catches. **It did not catch defects 4 and 5**, which are
judgment failures: a structural test cannot tell you a question reads as redundant or that a required
field traps a healthy patient.

**D-02 makes a required field the gate on the highest-abandonment step in the flow.** That is
precisely defect 5's shape, one step further along. **Budget the 8-check human browser pass; it is
not redundant with the DOM tests.** The script is in `HANDOFF.md` §"The UAT script Andrew asked for".
Run it local, not production — a full run writes a PHI row.

</code_context>

<specifics>
## Specific Ideas

- **Andrew's freeform answer on file access:** *"admin + patient + inline in the clinical PDF
  please."* All three surfaces, not a subset.
- **Andrew's reversal on provider review:** *"let's go back on that last answer. we don't want to
  stray from the plan."* The read-only column stands; the reviewed checkbox does not.
- **The `submissions` table is test data only.** Stated by Andrew in the Phase 3 discussion and still
  load-bearing — it is what licenses destructive migrations. **If a real patient has completed the
  quiz by the time Phase 4 runs, any migration decision must stop and be re-raised.**
- **The William message now carries six items**, five inherited from Phase 3 plus one new:
  1. **Test-result upload** — agreement **and pricing**. Blocks Phase 4 entirely. (D-01)
  2. Domain spelling — no longer blocks Phase 4 (D-02), still blocks LAUNCH-07.
  3. DIAG-01 scope — confirms rather than blocks.
  4. HIST-03's third label — unconfirmed copy in `questions.ts`.
  5. HIST-02's medications gate copy.
  6. **New:** the D-13 storefront replacement copy, plus D-11's interim consent paragraph for
     counsel review.

</specifics>

<deferred>
## Deferred Ideas

- **Splitting Phase 4** — ship the testing split + deletions + consent reorder now (~1 day,
  unblocked), upload as its own later phase gated on the Fly BAA and GCP cutover. **Offered and
  declined** in this discussion. Recorded so the option is visible if the blockers persist for weeks.
- **Provider review-status workflow** — status states, provider notes, audit view. Considered in this
  discussion, scoped as a `reviewed_at` checkbox, then **explicitly reversed**. Stays in the v2 /
  Phase 2.5 backlog. D-08's read-only column is the ceiling for Phase 4.
- **SCORE-01** (retitle to "Preliminary Score" + the 1–2 business day review copy) — ~30 minutes,
  separable, and unblocked. Offered as a pull-forward and declined; **stays in Phase 5.** Phase 5's
  own notes say to ship it early, so it may land before Phase 5 is formally planned.
- **`quiz-history` extension refactor** — promoted from open-work list to a D-05 dependency, but not
  yet scoped into any phase. **The planner must scope it into Phase 4 or raise it as a fourth
  blocker.** Do not let it fall between the two.
- **Appointly embed keep/disable decision** — third-party JS from `staq-cdn.com` / `staqlab.com`
  loading 15× on the PHI-collecting quiz page, outside the BAA. Left on deliberately because Phase 7
  may depend on it for booking. Phase 8 / needs an explicit decision.
- **Mobile sticky-header clearance** — still the one open item from Phase 1's `01-HUMAN-UAT.md`,
  deferred again in Phase 3 because the sticky element lives in the theme repo. **D-12 reconciles
  that repo**, so this becomes measurable for the first time — worth folding into Phase 4's UAT.

</deferred>

---

*Phase: 04-mandatory-allergy-testing*
*Context gathered: 2026-08-09*
