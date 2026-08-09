# Phase 3: Mandatory Medical History - Research

**Researched:** 2026-08-09
**Domain:** Clinical quiz flow rewiring (React state machine) + a destructive Postgres migration on a PHI table
**Confidence:** HIGH — every claim below was checked against the actual file/line, a live `npm test` run, or a live (read-only, `COUNT(*)`-only) query against the real Cloud SQL instance. Nothing here is restated from CONTEXT.md without independent verification.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Data shape and the two legacy columns**

- **D-01: `personal_history_json` and `family_history_json` are DROPPED, not left vestigial.**
  A standalone migration removes both columns; the top-level `personal_history` / `family_history`
  payload fields are removed from the client, from `quiz-validation.ts` (:28-29, :117-118), and
  from `insertSubmission` (`submissions.ts:46-47, 73-74, 97-101`).

  Licensed by a fact confirmed in this discussion: the `submissions` table holds TEST DATA ONLY.
  No real patient has completed the quiz. If that turns out to be false, this decision does not
  survive contact and the planner must stop and re-raise it.

  Requirements on the migration, non-negotiable:
  - Take an on-demand Cloud SQL backup BEFORE running it. Record the backup ID.
  - Its own migration file under `migrations/`, its own commit, reviewed on its own. Do not bundle
    a column drop with application changes.
  - Run against `alledrops_quiz_dev` only.

- **D-02: All new medical-history answers live in `answers_json`, keyed by question ID.** Nothing in
  this phase adds a top-level payload field or a submissions column.

- **D-03: `ALL_ITEMS` loses its Part 6 carve-out.** Once medical history is a real member of
  `QUIZ_PARTS`, `ALL_ITEMS` derives from `QUIZ_PARTS` and the special case disappears.
  `ALL_SCORED_QUESTIONS` must NOT gain the new part.

- **D-04: The score is unchanged by anything answered in medical history.** Success Criterion 5.
  `calculateTotalScore` is always called with `ALL_SCORED_QUESTIONS`, which stays Parts 1–5. A test
  must pin this — same answers with and without medical history populated produce an identical
  score and bracket.

- **D-05: A question-ID → label map is added to `app/lib/format.ts`, with today's `capitalize()` as
  the fallback.** Both PHI-facing renderers stringify answer keys with `capitalize(displayKey)`, so
  a new ID lands in the clinical record as e.g. "History_comorbidities." One lookup fixes the new
  Phase 3 questions and every existing one at once. Unmapped keys keep today's behavior exactly.

**Content and required-ness**

- **D-06: HIST-03's three free-text fields each pair with a "None / not applicable" checkbox.**
  Pattern per field: a `yesno`-or-checkbox gate question, then the `text_input` carrying
  `showIf: { questionId: <gate>, equals: <has-some> }` and `required: false`. Pure Phase 2
  mechanism — no new capability. The gate question itself is required (Phase 2 default), so the
  patient cannot advance by ignoring the pair entirely.

- **D-07: HIST-01's comorbidity checklist carries `exclusive: true` on "none of the above."** Eleven
  locked options: asthma, eczema, anaphylaxis, heart disease, COPD, lung disease, cancer, autoimmune
  conditions, immune system deficiencies (acquired / induced), angioedema, none of the above.
  Required by the Phase 2 default; `[]` does not satisfy it, and the none-option is what makes that
  reachable for a healthy patient.

  Phase 2's D-13 was REVERSED on 2026-08-09 (session 33, PR #18, Fly v49). Selecting an exclusive
  option no longer disables its siblings — `isOptionDisabledByExclusive` is deleted. Clicking a real
  comorbidity while "none of the above" is selected now switches in one click.

- **D-08: HIST-02's medications field is DISTINCT from Part 5's `med_list`. Both exist.** Part 5's
  `med_list` is gated on `taking_meds` = yes; HIST-02's is a full current-medication list revealed
  by ANY comorbidity selection **including "none of the above."** HIST-02's reveal is the named
  consumer of Phase 2's `isAnswered` operator — `showIf: { questionId: "history_comorbidities",
  isAnswered: true }`. It is NOT an `equals` test.

- **D-09: HIST-04 collects `pcp_clinic_name` and `pcp_clinic_address` as two separate required text
  fields**, both `showIf: { questionId: <has_pcp>, equals: "yes" }`. The "no" branch renders **the
  first real info block in this codebase.** Copy: "We recommend that you establish with a primary
  care physician before beginning SLIT." Budget a browser check for it.

- **D-10: DIAG-01 and HIST-01 are distinct questions. Build both.** HIST-01 is a comorbidity list;
  DIAG-01 asks whether a clinician has diagnosed the patient with an allergic condition, and sits
  adjacent to the Part 5 medication questions.

**Flow, navigation, and deletions**

- **D-11: The 7+ "Proceed Without Testing" chain is DELETED in Phase 3, not Phase 4.** Removes
  `handleProceedWithoutTesting`, `handleConfirmProceedWithoutTesting`,
  `handleDeclineProceedWithoutTesting`, the `showProceedWarning` state, and the warning modal. The
  7+ patient's remaining exit is the existing "I need testing first" button (`handleTestFirst`),
  live today and unaffected. The 3–6 "Continue to Purchase AlleDrops" jump
  (`handleProceedToPurchase`) STAYS for Phase 4, as does stripping the four callback props off
  `ResultsDisplay`.

- **D-12: The `"medical_history"` `FlowStep` and everything that exists to serve it are deleted.**
  Named targets, all in `QuizContainer.tsx`:
  - the `"medical_history"` member of the `FlowStep` union (:38)
  - the seeding effect (:153-161) that writes `history_personal: []` / `history_family: []`
  - the whole `step === "medical_history"` render branch (:548-571)
  - the consent back-button's `scoreBracket === "7+"` special case (:582)
  - the `PART6_MEDICAL_HISTORY` import (:13)

  After D-11 and D-12 there is no remaining code path that sets `step` to `"medical_history"`. A
  source-text guard should assert the string is absent from `QuizContainer.tsx`.

- **D-13: Medical history is reached by 100% of patients, including the 0–2 bracket.** Today a 0–2
  patient auto-submits the moment Part 5 completes and never sees an outcome page. After this
  phase, auto-submit fires after the medical-history part instead. `autoSubmit0to2Attempted`
  guarding needs re-checking against the new part count.

- **D-14: Phase 3 ships to production on its own.**

### Claude's Discretion

- Question IDs, `order` values, and part number for the new section — subject to D-05's label map
  making them read correctly in the PDF.
- Whether the new section is a sixth entry in `QUIZ_PARTS` or `QUIZ_PARTS` is restructured, so long
  as every patient passes through it before the outcome page and `ALL_SCORED_QUESTIONS` stays Parts
  1–5.
- Where DIAG-01 physically sits — inside Part 5 adjacent to the medication questions, or its own
  item.
- The exact gate-question type for D-06's three pairs (`yesno` vs a single-option checkbox).
- Progress-indicator wording now that there are six parts, and whether the section carries its own
  heading.
- Test structure and placement, provided the suite (282 tests / 23 files at phase start) stays
  green.
- Commit decomposition — except that D-01's migration is its own commit, non-negotiable.

### Deferred Ideas (OUT OF SCOPE)

- Test-result upload (reverses a locked decision, folded into Phase 4 scope discussion — not this
  phase).
- The 3–6 "Continue to Purchase AlleDrops" jump — stays live through Phase 3, deleted in Phase 4.
- Stripping the four callback props off `ResultsDisplay` — Phase 4 (TEST-05).
- DOM test infrastructure — not scoped by CONTEXT.md; this document makes the explicit
  recommendation (Research Question 3 below).
- Progress-indicator and section-heading wording for six parts — Claude's discretion this phase.

**UI-SPEC.md is the second locked artifact for this phase** (visual/interaction contract for
HIST-01…HIST-05 and DIAG-01) and is not reproduced here — the planner and executor must read it
directly. Its most consequential findings, verified in this research pass against the same source:
no heading on Part 6 (confirmed — no part in `QUIZ_PARTS[0..4]` renders a category title today,
only the deleted `medical_history` step's ad hoc `<h2>` did), and zero code changes needed for the
progress label (confirmed at `QuizContainer.tsx:322-337` below).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | 11-option comorbidity checklist incl. "none of the above" | Architecture Patterns §2 (schema shape), Common Pitfalls #4 (`getQuestionById` must see the new part) |
| HIST-02 | Any comorbidity selection reveals a medications free-text field | `isAnswered`/`showIf` mechanism already verified live in `schema.ts`; Common Pitfalls #4 covers the failure mode if wiring is incomplete |
| HIST-03 | Three required free-text fields (surgeries, allergies, other conditions) | Architecture Patterns §2 (gate+reveal pattern), reuses Phase 2 `required`/`showIf` mechanism verbatim |
| HIST-04 | PCP yes/no with clinic fields or info-block recommendation | Architecture Patterns §3 (`InfoBlockCard`, first production consumer — verified never yet rendered), Validation Architecture (browser-check requirement) |
| HIST-05 | Section reached by 100%, `medical_history` FlowStep deleted, answers land in `answers_json` with no new plumbing | Research Question 1 (migration), Research Question 2 (container wiring — verified blast radius wider than CONTEXT.md's D-12 list), Research Question 4 (PDF/admin plumbing — verified) |
| DIAG-01 | Diagnosis question adjacent to Part 5 medication questions | Architecture Patterns §2 |

</phase_requirements>

## Summary

Phase 3 is a content-and-wiring phase on top of a schema Phase 2 already proved out — `required`,
`showIf`, `exclusive`, and info blocks all exist, are tested, and need no new mechanism. The two
genuinely hard parts are (1) a destructive migration on a live PHI table, and (2) rewiring
`QuizContainer.tsx`'s flow-control state machine so medical history moves from a bolt-on step
reachable only via one dead-end path to a first-class member of `QUIZ_PARTS` reached by 100% of
patients. This research verified both against the actual files, not against CONTEXT.md's summary of
them, and found CONTEXT.md's blast-radius estimate for the D-12 deletions to be **incomplete** in
three concrete ways (documented in Research Question 2 below) — the planner should treat this
document's file/line list as authoritative over CONTEXT.md's for the deletion sites.

The migration mechanism was live-tested during this research session: `fly ssh console` reaching
Cloud SQL via the `pg` pool works today (confirmed: `submissions` table is 42 rows / 136 kB, 18 of
which carry data in the two doomed columns). However, the on-demand backup step (`gcloud sql backups
create`) requires an authenticated `gcloud` CLI session, and this machine's `gcloud` session is
**currently expired and cannot reauthenticate non-interactively** — that step is not autonomous
under today's credentials and must be gated behind a human checkpoint or a fresh interactive
`gcloud auth login`.

**Primary recommendation:** Sequence the migration as (1) human-gated on-demand Cloud SQL backup,
(2) deploy application code that stops writing/reading the two doomed columns, confirm the release
is live, (3) run the `DROP COLUMN` migration via the already-proven `fly ssh console` + `pg` script
route. Never reverse steps 2 and 3 — `insertSubmission`'s explicit column list will hard-fail every
submission if the columns are dropped while the old INSERT statement is still live.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Medical-history question content, visibility, required-ness | Browser / Client (`app/lib/quiz/questions.ts`, `schema.ts`) | — | Pure, declarative, evaluated client-side before any network call; Phase 2 already put 100% of this decision-making in `app/lib/quiz/` |
| Flow sequencing (which step/part is active) | Browser / Client (`QuizContainer.tsx`) | — | React state machine, no server round-trip until terminal POST |
| Submission persistence (PHI) | API / Backend (`app/routes/api.quiz.submit.tsx`) | Database / Storage (Cloud SQL `submissions`) | `insertSubmission` is the sole PHI write path; validated server-side by `quiz-validation.ts` before the INSERT |
| Clinical PDF rendering | API / Backend (`app/lib/pdf.ts`) | — | Server-rendered PDF stream, no client involvement |
| Admin submission review | API / Backend (`app/routes/app.quiz-results.tsx`, `api.admin.*`) | Database / Storage | Shopify-embedded admin, session-authenticated, reads Cloud SQL directly |
| Column-drop migration | Database / Storage (Cloud SQL DDL) | — | One-time DDL change, executed out-of-band from any request path |

## Project Constraints (from CLAUDE.md)

- PHI never in Shopify metafields/customer fields/Admin API payloads. PHI fields explicitly include
  `answers`, `personal_history`, `family_history` — directly relevant since D-01 removes two of
  these PHI fields from the schema entirely.
- No Google Workspace product in the PHI path.
- No analytics/session-replay/chat/tracking scripts on any page that collects PHI (the quiz embed
  page, which is where Phase 3's new content renders).
- No `console.log`/`console.error` of PHI — IDs and counts only. Directly binds the migration's
  verification queries (must be `COUNT(*)` only, never `SELECT *` or a PHI column) and any debug
  logging added to `QuizContainer.tsx` or `api.quiz.submit.tsx` during this phase.
- All routes returning PHI must verify identity before querying; use ownership-bounded helpers.
  Not touched by this phase's new routes (there are none — Phase 3 adds zero new API routes), but
  binds any test fixtures added to `api-admin-submission-detail.test.ts` / `api-admin-assessment-pdf.test.ts`.
- Self-review checklist applies explicitly to `submissions.ts` and the migration (per
  CONTEXT.md's canonical refs) — verified in this research: it also applies to `pdf.ts` and
  `app.quiz-results.tsx`, which CONTEXT.md's canonical refs list omits (see Research Question 4).
- Work on a feature branch; PR review required for anything touching `db.ts`, `submissions.ts`,
  `api.*` routes, PDF generation, or metafields.

## Standard Stack

### Core (already in the project — no phase changes)

| Library | Version (from `package.json`) | Purpose | Provenance |
|---------|-------------------------------|---------|--------------|
| react / react-dom | ^18.3.1 | Quiz UI | [VERIFIED: package.json] |
| react-router | ^7.9.3 | Routing, loaders/actions | [VERIFIED: package.json] |
| vitest | ^3.2.4 | Test runner, `environment: "node"` globally | [VERIFIED: package.json + vitest.config.ts] |
| pdfkit | ^0.18.0 | Clinical PDF generation (`app/lib/pdf.ts`) | [VERIFIED: package.json] |
| pg | ^8.13.1 | Cloud SQL Postgres client (`app/lib/db.ts`, `submissions.ts`) | [VERIFIED: package.json] |

**Phase 3 adds zero new runtime dependencies.** This is a hard constraint (PHI page, no new
third-party code) and is also simply unnecessary — every mechanism Phase 3 needs (`required`,
`showIf`, `exclusive`, info blocks) already ships in Phase 2's `app/lib/quiz/schema.ts`.

### Supporting — optional devDependencies (Research Question 3 only, not required)

| Library | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `jsdom` [ASSUMED] | 30.0.1 | DOM environment for vitest, per-file via `// @vitest-environment jsdom` | Only if the planner adopts DOM rendering tests (see Research Question 3) |
| `@testing-library/react` [ASSUMED] | 16.3.2 | Render + query React components in tests | Same |
| `happy-dom` [ASSUMED] | 20.11.2 | Lighter/faster alternative DOM environment to `jsdom` | Same, if speed matters more than jsdom's fuller API surface |

Package identity for these three is tagged `[ASSUMED]` per the provenance rule (package names are
training-data knowledge, not sourced from official docs/Context7) even though registry existence,
version currency, and `slopcheck` disposition were all independently verified in this session — see
Package Legitimacy Audit below. None of the three is a runtime dependency; all would be
`devDependencies` only, activated per-test-file, and cannot ship to the quiz page.

**Installation (only if RQ3's recommendation is accepted):**
```bash
npm install --save-dev jsdom @testing-library/react
# or, if speed is prioritized over jsdom's fuller API:
npm install --save-dev happy-dom @testing-library/react
```

## Package Legitimacy Audit

> Required only if the planner accepts the optional DOM-test-infra recommendation in Research
> Question 3. If declined, this section is moot — no packages are installed.

`slopcheck` 0.6.1 was installed and run against all three candidates during this research session.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|--------------|-----------|-------------|
| `jsdom` | npm | created 2011-11-21 (14+ yrs) | `github.com/jsdom/jsdom` | `[OK]` | Approved if RQ3 adopted |
| `happy-dom` | npm | created 2019-09-15 (6+ yrs) | `github.com/capricorn86/happy-dom` | `[OK]` | Approved if RQ3 adopted |
| `@testing-library/react` | npm | created 2019-05-30 (6+ yrs) | `github.com/testing-library/react-testing-library` | `[OK]` | Approved if RQ3 adopted |

No `postinstall` scripts on any of the three (`npm view <pkg> scripts.postinstall` returned empty
for all three). `@testing-library/react@16.3.2`'s `peerDependencies` require `react`/`react-dom`
`^18.0.0 || ^19.0.0` — compatible with this project's React 18.3.1.

**Packages removed due to slopcheck `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

**Caution for whoever executes this phase:** running `slopcheck install <pkgs>` (not `slopcheck
scan`) actually invokes `npm install` as a side effect — it is not a dry-run despite reading like
one. This research session triggered a real install of all three packages into this project's
`package.json` and `node_modules`, caught via `git status`, and reverted (`git checkout --
package.json`; `package-lock.json` is untracked/gitignored, unaffected by git). If the planner
wants a legitimacy check without installing, use `slopcheck scan` or verify via `npm view <pkg>
version` + manual repo/age inspection instead. **`node_modules/jsdom`, `node_modules/happy-dom`, and
`node_modules/@testing-library` may still be physically present on disk** in this checkout from this
research session's revert (harmless — untracked, unreferenced by the reverted `package.json`,
confirmed `npm run typecheck` and `npm test` both pass clean at 282/23 with them present) — a `npm
ci` or `npm prune` before Phase 3 executes will clear them, but is not required for correctness.

## Architecture Patterns

### System Architecture Diagram — flow before and after Phase 3

```
BEFORE (5 QUIZ_PARTS, current main @ a8c13d7):

patient_info → quiz_parts[Part1..5] → goToOutcome() → step="outcome"
                                                            │
                              ┌─────────────────────────────┼─────────────────────────────┐
                         bracket 0-2                   bracket 3-6                    bracket 7+
                              │                              │                              │
                     auto-submit (effect)          ResultsDisplay:                 ResultsDisplay:
                              │                    "Schedule Telehealth"      "I'd Like Testing First"──►submit──►testOptions
                     ResultsDisplay:                "Continue to Purchase"──►consent──►submit   "Proceed Without Testing"
                     "Schedule a Consultation"                                                          │
                                                                                              showProceedWarning modal
                                                                                                          │
                                                                                          step="medical_history" (ONLY entry point)
                                                                                                          │
                                                                                              PART6_MEDICAL_HISTORY (optional,
                                                                                              required:false on both questions)
                                                                                                          │
                                                                                                      step="consent"──►submit
                                                                                              (personal_history/family_history
                                                                                               extracted and sent as EXTRA
                                                                                               top-level payload fields)

AFTER (6 QUIZ_PARTS, Phase 3):

patient_info → quiz_parts[Part1..5, Part6=medical history] → goToOutcome() → step="outcome"
                                                                                    │
                              ┌──────────────────────────────────────────────────────┼─────────────────────────────┐
                         bracket 0-2                                            bracket 3-6                    bracket 7+
                              │                                                       │                              │
                  auto-submit (effect, UNCHANGED code,                    ResultsDisplay:                 ResultsDisplay:
                  now fires after part 6 not part 5 —                    "Schedule Telehealth"      "I'd Like Testing First"──►submit──►testOptions
                  answers already include medical history               "Continue to Purchase"──►consent──►submit    (Proceed Without Testing
                  via visibleAnswers(ALL_ITEMS,...))                    [Phase 4 territory, unchanged]                REMOVED — D-11)
                              │
                  ResultsDisplay:
                  "Schedule a Consultation"

Medical history is now REQUIRED content inside quiz_parts (mixed required/not-required per D-06/D-07/D-09),
reached identically regardless of eventual bracket. `answers_json` carries every medical-history key —
no `personal_history`/`family_history` top-level payload fields exist anywhere after this phase.
```

### Recommended Project Structure

No new files are structurally required. Content additions:
```
app/lib/quiz/
├── questions.ts        # PART6_MEDICAL_HISTORY replaced wholesale (new content, same export
                         # name is fine — or rename; Claude's discretion) + QUIZ_PARTS gains a
                         # 6th entry + getQuestionById must be updated in lockstep (Pitfall #4)
├── schema.ts            # UNCHANGED — every mechanism Phase 3 needs already exists here
└── types.ts              # UNCHANGED — QuizItem/ShowIfCondition already support everything needed

app/components/quiz/
├── QuizContainer.tsx    # FlowStep union shrinks by one member; 3 handlers + 1 state var deleted;
                         # medical_history render branch deleted; auto-submit effect UNCHANGED
├── QuizPartRenderer.tsx  # UNCHANGED — already renders info blocks and all six question types
└── ResultsDisplay.tsx   # loses exactly 1 of 4 callback props (onProceedWithoutTesting) + its button

app/lib/
├── format.ts             # D-05's label map added here (new export, e.g. getAnswerLabel(key))
├── pdf.ts                 # consumes the new label map instead of raw capitalize(displayKey);
                          # ALSO loses its "Medical history" section (reads dropped columns) — see RQ4
└── submissions.ts         # insertSubmission loses 2 params / 2 SQL columns; SubmissionFullRow
                          # type loses 2 fields

app/routes/
└── app.quiz-results.tsx  # consumes the new label map; ALSO loses its Medical History section
                          # (HistoryTagList + the conditional block reading the 2 dropped fields)

migrations/
└── 003_drop_medical_history_legacy_columns.sql   # new file, own commit, per D-01

tests/  (existing files that reference the dropped columns and MUST be updated, not just app/**)
├── pdf.test.ts                          # fixture at :17-18 sets personal_history_json/
                                          # family_history_json — breaks once SubmissionFullRow drops them
├── api-admin-submission-detail.test.ts  # fixture at :32-33, same
└── api-admin-assessment-pdf.test.ts     # fixture at :37-38, same

app/components/quiz/QuizPartRenderer.test.ts   # imports PART6_MEDICAL_HISTORY at :5, asserts on it at :110
tests/quiz-schema-type-guarantees.test.ts       # imports PART6_MEDICAL_HISTORY at :9, asserts ALL_ITEMS
                                                 # length arithmetic against it at :75
```

### Pattern 1: Gate + reveal pair (D-06's three HIST-03 fields)

**What:** A required `yesno` (or single-checkbox) gate question, followed by a `text_input` with
`showIf: { questionId: <gate>, equals: <has-some-value> }` and `required: false`.
**When to use:** Any free-text field that should only be required conditionally, distinguishing "the
patient affirmatively said none" from "the patient typed a placeholder to get past a required
field."
**Example — reproducing Part 5's already-shipped, already-tested version of this exact pattern**
(no new mechanism needed for HIST-03; this is the literal precedent):
```typescript
// Source: app/lib/quiz/questions.ts:205-224 (PART5_TREATMENT, live today)
{
  kind: "question",
  id: "taking_meds",
  type: "yesno",
  part: 5,
  text: "Are you currently taking any allergy medications?",
  order: 50,
},
{
  kind: "question",
  id: "med_list",
  type: "text_input",
  part: 5,
  text: "Please list your current allergy medications and dosages",
  order: 51,
  showIf: { questionId: "taking_meds", equals: "yes" },
  // required is omitted — defaults to true (Phase 2 D-05) — but this reveal is only ever visible
  // when a gate is "yes", so combine with `required: false` for D-06's "may legitimately answer with
  // nothing typed, if the gate itself was answered 'no'" semantics if applicable to your gate design.
},
```

### Pattern 2: `isAnswered` reveal across a multi-select (D-08 / HIST-02)

**What:** A reveal driven by "was this multi-select touched at all," not by a specific value.
**When to use:** Exactly HIST-02 — any comorbidity selection, including the exclusive "none of the
above," must reveal the medications field. `equals` cannot express this because there is no single
value that covers "any option including the exclusive one."
**Example:**
```typescript
// Source: app/lib/quiz/schema.ts:57-78 (isAnswered, live today) — for checkbox_multi:
// `Array.isArray(value) && value.length > 0`. Selecting "None of the above" produces
// `history_comorbidities: ["none"]`, which is a non-empty array, so isAnswered returns true —
// this is why isAnswered, not equals, satisfies "including none of the above" (D-08).
{
  kind: "question",
  id: "current_medications", // Claude's discretion on exact ID
  type: "text_input",
  part: 6,
  text: "What medications (including dosage) are you currently taking (please list all)",
  order: /* after history_comorbidities */,
  showIf: { questionId: "history_comorbidities", isAnswered: true },
},
```

### Pattern 3: Info block (D-09's "no PCP" branch — first production consumer)

**What:** A `QuizInfoBlock` composed with `showIf`, rendering static, escaped-by-default React
children with no `answers` key produced.
**Verified:** `InfoBlockCard` (`QuizPartRenderer.tsx:36-54`) has existed since Phase 2 and has **never
been rendered in production** — confirmed by grep: zero `QuizInfoBlock`-typed entries exist anywhere
in `questions.ts` today. HIST-04's "no PCP" branch is genuinely the first one, which is exactly why
UI-SPEC.md calls for a manual browser check rather than trusting a unit test alone — the exact
failure shape session 32 shipped (info blocks filtered out before the renderer ever saw them) is
still a live risk category for any *first* real usage of a code path, even one now guarded by tests.
```typescript
// Source: app/lib/quiz/types.ts:65-74 (QuizInfoBlock, live today, unused until this phase)
{
  kind: "info",
  id: "no_pcp_recommendation", // Claude's discretion
  paragraphs: [
    "We recommend that you establish with a primary care physician before beginning SLIT.",
  ],
  order: /* after has_pcp */,
  part: 6,
  showIf: { questionId: "has_pcp", equals: "no" },
},
```

### Anti-Patterns to Avoid

- **Deriving `exclusive` from `excludeFromScore` or from the value string `"none"`.** Phase 2 D-14
  and D-15 are explicit: these are independent, unrelated flags. HIST-01's "none of the above" needs
  `exclusive: true` set directly on the option; do not infer it.
- **Reintroducing a disabled state on sibling options when an exclusive option is selected.**
  `isOptionDisabledByExclusive` was deleted in session 33 specifically because it made the escape
  hatch unreachable. UI-SPEC.md repeats this constraint explicitly for HIST-01's 11-option list —
  never `disabled`, never `pointer-events: none`, never reduced opacity implying "cannot click."
- **Writing `answers.history_personal` / `answers.history_family` anywhere.** Those keys, and the
  seeding effect that wrote `[]` into them, are D-12 deletions. A stray reference (e.g., an
  unmigrated test fixture) will silently pass TypeScript (both are just string keys in a
  `Record<string, ...>`) but represents dead-key pollution the phase is explicitly meant to remove.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conditional visibility for HIST-02/03/04 | A new `showIf`-like mechanism, or per-ID rendering logic in `QuizPartRenderer.tsx` | `showIf` (three operators: `equals`, `includes`, `isAnswered`) already in `schema.ts` | Phase 2 built and tested this; every Phase 3 need maps directly onto an existing operator (verified above) |
| Required-field gating | A new completion checker | `isPartComplete` (`QuizPartRenderer.tsx:296-303`) | Already skips info blocks, already respects `required: false`, already uses the shared `isAnswered` predicate |
| Exclusive-option toggling | New click-handling logic for "none of the above" | `toggleOption` (`schema.ts:206-221`) | Already handles the one-click switch (D-13 reversal) and the deselect-to-`[]` case (D-16) |
| Label mapping for the clinical PDF/admin modal | Two separate label maps, one per renderer | A single map in `app/lib/format.ts`, consumed by both `pdf.ts` and `app.quiz-results.tsx` (D-05) | Both renderers already call the exact same `capitalize(key.replace(/_/g, ' '))` pattern (verified identical in both files) — one shared function fixes both |
| Database access from a local dev machine (for the migration) | A new tunnel/proxy setup | `fly ssh console -a alle-drops-quiz-app -C "sh -c ..."` running a base64-encoded `pg` script | Already proven working in this exact session (see Research Question 1) — this machine's IP is not on Cloud SQL's authorized-networks list, but the Fly app's is |

**Key insight:** Phase 3's entire mechanism budget was spent in Phase 2. Any task in this phase that
proposes a new schema field, a new operator, or a new renderer branch should be treated as a signal
the content is being modeled wrong — CONTEXT.md says this explicitly and this research confirms it:
every one of HIST-01 through DIAG-01 maps cleanly onto an existing Phase 2 primitive.

## Runtime State Inventory

> Included because D-01 is a destructive migration on a live (if test-only) PHI table.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `submissions` table, `alledrops_quiz_dev`, Cloud SQL Postgres 18. **Measured live in this session: 42 total rows, 136 kB total relation size, 18 rows have a non-null value in `personal_history_json` and/or `family_history_json`.** Query used: `SELECT COUNT(*) FROM submissions` and `SELECT COUNT(*) FROM submissions WHERE personal_history_json IS NOT NULL OR family_history_json IS NOT NULL` — no PHI column selected, per `CLAUDE.md`'s ID/COUNT-only rule. | Data migration: none required — the columns are being intentionally discarded, not moved. The pre-migration backup (D-01's non-negotiable requirement) is the only preservation step, and it exists precisely so this data is not unrecoverable if D-01's "test data only" premise turns out to be wrong. |
| Live service config | None found. No n8n/Datadog/Tailscale/Cloudflare-Tunnel-style external config references these two columns. | None |
| OS-registered state | None found. No scheduled task, pm2 process, or launchd/systemd unit references these columns. | None |
| Secrets / env vars | None found. `DATABASE_URL` and `SHOPIFY_API_SECRET` are unaffected — no secret name encodes `personal_history` or `family_history`. | None |
| Build artifacts | `public/quiz-bundle.js` (theme bundle) currently contains the OLD `PART6_MEDICAL_HISTORY` content (`history_personal`/`history_family` option strings) — this is a code artifact, not stored state, but it is a live serving artifact that will still serve the OLD medical-history content to real storefront traffic until rebuilt. **Must rebuild via `npm run build:theme` in the same commit as any quiz source change (standing project rule, `tests/quiz-bundle-freshness.test.ts` guards it).** | Rebuild required, same commit as the content/wiring change — not the migration commit. |

**The canonical question, answered:** after every file in this repo is updated for D-01, the only
runtime system still holding the old columns' data is the live database rows themselves (pre-drop)
and the on-demand backup (post-drop, by design). Nothing else references these two columns anywhere
in the infrastructure this research could reach.

## Common Pitfalls

### Pitfall 1: Reversing the migration/deploy order

**What goes wrong:** The `DROP COLUMN` migration runs against Cloud SQL before the application code
that stops referencing `personal_history_json`/`family_history_json` is deployed and live.
**Why it happens:** `insertSubmission` (`submissions.ts:61-84`) has an explicit, named column list in
its `INSERT INTO submissions (...)` statement, including `personal_history_json` and
`family_history_json` at positions 11–12. Postgres will reject every subsequent INSERT with
`column "personal_history_json" of relation "submissions" does not exist` the instant the columns
are gone, for as long as the old code is still running.
**How to avoid:** Deploy order is: (1) application code changes land and the Fly release is
confirmed live (`fly status -a alle-drops-quiz-app`, check the release version), THEN (2) the
migration runs. The migration's own commit/PR (per D-01) does not have to be merged after the app
code's PR — but it must not be *executed* against the database until the app-code release is
confirmed live. Read paths (`pdf.ts`, `app.quiz-results.tsx`) are naturally more forgiving —
`SELECT *` after the columns are dropped simply omits those keys, and both files' existing
null-coalescing guards (`row.personal_history_json && row.personal_history_json.length > 0`)
degrade to falsy/empty rather than throwing — but do not rely on this asymmetry as a reason to skip
updating the read paths; D-01 requires deleting the vestigial "Medical History" sections outright
(see Research Question 4), not just leaving them silently empty.
**Warning signs:** A spike in 500s from `/api/quiz/submit` immediately after a migration run, with
`console.error("[submit] Cloud SQL INSERT failed:", dbErr)` (`api.quiz.submit.tsx:170`) showing a
Postgres "column does not exist" error. (This log line is safe under the PHI logging rule — `dbErr`
is a database driver error object, not a PHI value, though it is worth a second look before trusting
that in general.)

### Pitfall 2: `gcloud` CLI cannot take the on-demand backup autonomously today

**What goes wrong:** A plan assumes `gcloud sql backups create --instance=alledrops-quiz-data` can
run as an unattended step in the same session as the rest of the migration.
**Why it happens:** Verified live in this research session: `gcloud sql instances describe
alledrops-quiz-data --project=alledrops-quiz` failed with `Reauthentication failed. cannot prompt
during non-interactive execution.` The active `gcloud` configuration (`andrew@21adsmedia.com`,
project `smart-rope-305817` — not even `alledrops-quiz`) needs an interactive `gcloud auth login`
before any `gcloud sql` command against the `alledrops-quiz` project will succeed from an automated
session.
**How to avoid:** Treat the backup step as `checkpoint:human-verify` (or require Andrew to run
`gcloud auth login` interactively in his own terminal immediately before the phase executes, in
which case a Claude Code session started after that point could run `gcloud sql backups create`
itself). Do not plan the backup step as something a fully autonomous phase execution can complete
unattended under today's environment. This is a genuinely different mechanism from the `DROP COLUMN`
step itself — see Research Question 1 below for why the DDL step does not have this limitation.
**Warning signs:** Any `gcloud` command in a plan's task list with no accompanying checkpoint or
reauth step.

### Pitfall 3: `getQuestionById` silently stops resolving the new medical-history questions

**What goes wrong:** `showIf` conditions referencing a new HIST-02/03/04 question ID resolve as
"question not found," and D-04's fail-OPEN rule (`schema.ts:100-119`, "a dangling reference fails
open — the item renders") means the affected field or info block **renders unconditionally**,
silently defeating its intended gating. For HIST-02 specifically, this means the medications field
would show for every patient regardless of comorbidity answers — not a crash, not a test failure if
the test doesn't specifically check the false-condition case, just quietly wrong behavior in a
clinical record.
**Why it happens:** `getQuestionById` (`questions.ts:301-303`) is currently hardcoded to search
`[...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY]`. If the new medical-history content lands in a
differently-named export (or `PART6_MEDICAL_HISTORY` is reused but the function isn't touched
because "it already includes Part 6"), it will actually still work IF the new content keeps the same
export name and shape. The real risk is D-03's restructuring: once `ALL_ITEMS` is redefined to
derive from `QUIZ_PARTS` (which will include the new part), a natural refactor is to also simplify
`getQuestionById` to search `QUIZ_PARTS.flat()` instead of the old two-array concatenation — and
`QUIZ_PARTS` is typed `QuizItem[][]`, not `QuizQuestion[][]`, so a naive `.flat().find(q => q.id ===
id)` returns `QuizItem | undefined`, not `QuizQuestion | undefined`, which either fails to compile
(good — caught at typecheck) or gets force-cast (bad — a `QuizInfoBlock` masquerading as a
`QuizQuestion` reaching `isAnswered()`, which switches on `question.type` and falls through to its
`default: return false` — probably harmless in practice since info blocks are never `showIf`
targets, but worth a defensive `isQuestion()` filter from `schema.ts` rather than a cast).
**How to avoid:** Whatever `getQuestionById` looks like after this phase, add or extend a reference-
integrity test — the existing `schema.test.ts` already has one for showIf-target resolution
(mentioned in Phase 2's context as "a dedicated reference-integrity test... asserts every real
showIf.questionId resolves") — and specifically add HIST-02/03/04's new `showIf.questionId` values
to whatever question set that test iterates.
**Warning signs:** A `showIf`-gated field visible when it shouldn't be, in manual UAT or a positive-
and-negative-controlled test (assert both "shows when gate is X" AND "hidden when gate is not-X" —
the fail-open default makes the "shows" half trivially true even when broken).

### Pitfall 4: CONTEXT.md's D-12 deletion list undercounts the actual blast radius

**What goes wrong:** A plan follows CONTEXT.md's D-12 "named targets, all in QuizContainer.tsx" list
literally and considers the deletion complete once those 5 sites are gone, leaving broken
imports/dead code elsewhere.
**Why it happens (verified via `grep -rn` across `app/`, `tests/`, `extensions/` in this session):**
CONTEXT.md's D-12 list is scoped to `QuizContainer.tsx` only, but `PART6_MEDICAL_HISTORY` and the
D-11 handler names are referenced in three additional places CONTEXT.md's canonical refs never
mention:
- `app/lib/quiz/questions.ts:302` — `getQuestionById` still concatenates `PART6_MEDICAL_HISTORY`
  (see Pitfall 3, same file, different function, at line 318 for `ALL_ITEMS` too — this one *is*
  named by D-03, but the `getQuestionById` co-reference at :302 is not called out anywhere)
- `app/components/quiz/QuizPartRenderer.test.ts:5,110` — imports `PART6_MEDICAL_HISTORY` and asserts
  `isPartComplete(PART6_MEDICAL_HISTORY, answers)` directly
- `tests/quiz-schema-type-guarantees.test.ts:9,75` — imports `PART6_MEDICAL_HISTORY` and asserts
  `ALL_ITEMS.length === ALL_SCORED_QUESTIONS.length + PART6_MEDICAL_HISTORY.length`

Additionally, within `QuizContainer.tsx` itself, D-12's list omits two sites that become dead once
D-11's handlers are deleted:
- `handleConsentSubmit` (`:301-315`) still extracts `answers.history_personal` /
  `answers.history_family` and passes them as `{ personal_history, family_history }` to
  `submitPayload` (`:306-308`) — this is the LAST call site that populates the `extra` parameter on
  `buildPayload`/`submitPayload` (`:183-214`). Once it's removed, `extra` is never populated by any
  caller, and the entire `extra` parameter mechanism on both functions becomes dead code that should
  be deleted, not just left unused — D-01's mandate is "dropped, not left vestigial," and this is
  exactly the shape of vestigial code it's warning about.
- `ResultsDisplay.tsx` — `onProceedWithoutTesting` appears at exactly 3 sites (`:13` interface,
  `:24` destructure, `:135` the button's `onClick`), plus the button JSX itself
  (`:132-138`, the whole `<button>...Proceed Without Testing</button>` block). `QuizContainer.tsx`
  passes it in at `:544`. This is 1 of `ResultsDisplay`'s 4 callback props — the other 3
  (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`) all stay for Phase 4.
**How to avoid:** Treat this document's file list (above) as the authoritative deletion checklist for
D-11/D-12, not CONTEXT.md's. Run `grep -rn "medical_history\|PART6_MEDICAL_HISTORY\|
handleProceedWithoutTesting\|handleConfirmProceedWithoutTesting\|handleDeclineProceedWithoutTesting\|
showProceedWarning\|onProceedWithoutTesting" app/ tests/ extensions/` after the deletion work as a
completion check — it should return zero results (the `PART6_MEDICAL_HISTORY` name itself may
legitimately survive if Claude's discretion keeps that export name for the *new* content; check for
the old option values like `"food_allergies"` / `"ed_visits"` instead if so).
**Warning signs:** `npm run typecheck` failing on a stale import after `QuizContainer.tsx` is edited
but before `QuizPartRenderer.test.ts` / `quiz-schema-type-guarantees.test.ts` are updated — this
will actually be caught immediately by typecheck (both are compile-time reference errors, not
runtime-only), so this pitfall is more about wasted iteration than a silent defect. The
`handleConsentSubmit` / `extra`-parameter dead code is the one that will NOT be caught by
typecheck (both stay type-valid, just semantically pointless) — that one needs a human/reviewer
catch, not a compiler catch.

### Pitfall 5: Bundle-freshness and info-block-visibility defects are the two most recently-repeated failure modes in this exact codebase

**What goes wrong:** Two of the three "shipped past a fully green suite" defects (sessions 32 and
33, documented in STATE.md and HANDOFF.md) were (a) `public/quiz-bundle.js` never rebuilt after a
quiz-source change, and (b) info blocks silently filtered out before the renderer ever saw them.
Phase 3 is uniquely exposed to both: it changes quiz source (needs a bundle rebuild) AND ships the
first production `QuizInfoBlock` (HIST-04's PCP recommendation).
**Why it happens:** `npm run build` does not touch `public/quiz-bundle.js` — only `npm run
build:theme` does (separate vite config, `vite.theme.config.ts`), and nothing in the standard dev
loop reminds an executor of this. Info-block filtering was already fixed once at the `schema.ts`
layer (`itemsForPart`, verified in `visibleItems`/`itemsForPart` today, both already used correctly
by `QuizContainer.tsx:321`) — the fix from session 32 is still in place and Phase 3 does not need to
redo it, but a *new* container-level filter reintroduced anywhere (e.g., an ad hoc `.filter(item =>
item.kind === "question")` added carelessly while wiring the new part in) would reopen exactly the
same hole, and it has already happened once.
**How to avoid:** `tests/quiz-bundle-freshness.test.ts` already guards (a) as an existing regression
test — keep it green, and always run `npm run build:theme` in the same commit as any `questions.ts`
or `QuizContainer.tsx` change. For (b), `tests/quiz-container-no-question-filter.test.ts` already
source-text-guards the specific `item.kind === "question"` pattern in `QuizContainer.tsx` — it will
catch a literal reintroduction of that exact pattern, but will NOT catch a differently-shaped filter
bug (e.g., a filter that accidentally drops the new info block by ID or by `part` number). Budget the
manual browser check UI-SPEC.md explicitly calls for, on top of the automated guards.
**Warning signs:** A green suite with a phase that "looks done," no visible medical-history section
on a real deployed page, or an info block that never renders even though its `showIf` condition is
met in the DOM inspector.

## Code Examples

### Auto-submit effect — verified it needs ZERO code changes for D-13

```typescript
// Source: app/components/quiz/QuizContainer.tsx:216-231 (live today, unchanged by this phase)
useEffect(() => {
  if (step !== "outcome" || scoreBracket !== "0-2" || autoSubmit0to2Attempted.current) return;
  if (!symptomProfileId || !patientState) return;
  autoSubmit0to2Attempted.current = true;
  void (async () => {
    try {
      await submitPayload();
      setSavedToServer(true);
    } catch (e) {
      console.error(e);
      autoSubmit0to2Attempted.current = false;
      setSubmissionError(e instanceof Error ? e.message : "Could not save assessment");
    }
  })();
}, [step, scoreBracket, symptomProfileId, patientState, submitPayload]);
```
This effect's trigger CONDITION (`step === "outcome" && scoreBracket === "0-2"`) does not need to
change. What changes is the WALL-CLOCK MOMENT it fires: today, `step` becomes `"outcome"` the
instant Part 5 (`currentPartIndex === quizPartsTotal - 1` when `quizPartsTotal` is 5) completes.
After this phase, `quizPartsTotal` is 6 (medical history is `QUIZ_PARTS[5]`), so `step` only becomes
`"outcome"` after medical history is answered too — the effect fires later, not differently.
`submitPayload()` (no `extra` arg needed even today for the 0–2 path) builds its payload via
`buildPayload` → `visibleAnswers(ALL_ITEMS, answers)` (`:186`), and once `ALL_ITEMS` derives from
`QUIZ_PARTS` (D-03) — which now includes medical history — the medical-history answers are
automatically included. **Verify this with a test, don't just trust the reasoning**: assert the
effect fires exactly once and that the submitted payload's `answers` object contains a
medical-history key, for a 0–2-scoring answer set.

### Progress indicator — verified it needs ZERO code changes

```typescript
// Source: app/components/quiz/QuizContainer.tsx:321-337 (live today, unchanged by this phase)
const currentPartItems = itemsForPart(QUIZ_PARTS, currentPartIndex);
const quizPartsTotal = QUIZ_PARTS.length;                    // 5 today → 6 after this phase
const TOTAL_FLOW_STEPS = 2 + quizPartsTotal;                  // 7 today → 8 after this phase
const progressInfo = (() => {
  // ...
  if (step === "quiz_parts")
    return {
      fillPct: Math.round(((2 + currentPartIndex) / TOTAL_FLOW_STEPS) * 100),
      label: `Part ${currentPartIndex + 1} of ${quizPartsTotal}`,   // "Part 6 of 6" automatically
    };
  // ...
})();
```
Confirms UI-SPEC.md's claim precisely: adding a 6th entry to `QUIZ_PARTS` requires zero edits to
this block. This is a task the plan should explicitly mark as "no code change, verify only," not
omit or silently assume.

## State of the Art

Not applicable in the conventional sense (no external library/API evolved since Phase 2 shipped 5
days prior, per git log). The one relevant "old approach → current approach" is internal to this
codebase:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Exclusive checkbox options disable their siblings (`isOptionDisabledByExclusive`) | Exclusive options never disable siblings; clicking a sibling switches in one click (`toggleOption` alone) | Session 33, 2026-08-09, PR #18, Fly v49 | Directly binds HIST-01's 11-option list (D-07) — a planner reading only Phase 2's CONTEXT.md (not this one) would get this wrong, per CONTEXT.md's own warning |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Package identity/existence of `jsdom`, `happy-dom`, `@testing-library/react` on npm | Standard Stack (Supporting), Package Legitimacy Audit | Low — all three independently confirmed via live `npm view` (versions, creation dates, repository URLs) and `slopcheck [OK]` in this session; only the *name-discovery provenance* is training-data-sourced per the strict tagging rule, not the existence claim itself |
| A2 | The "test data only, no real patient has completed the quiz" premise licensing D-01 | User Constraints (D-01) | High if wrong — this is a locked CONTEXT.md decision, not something this research re-verified independently (this research verified the *row count and shape* of the data, 42 rows / 18 with history data, but has no way to determine from the database alone whether any of those 42 rows represents a real patient rather than test data — that determination rests on CONTEXT.md's stated premise from the discussion, not on anything queryable) |

## Open Questions

1. **Does the new medical-history content keep the `PART6_MEDICAL_HISTORY` export name, or is it
   renamed?**
   - What we know: CONTEXT.md leaves the exact export name to Claude's discretion; the wholesale
     replacement changes every field inside it.
   - What's unclear: whether keeping the same name (with entirely new content) versus renaming
     (e.g., `PART6_MEDICAL_HISTORY_V2` or a content-accurate name) is preferred, and how that
     interacts with the three files this research found still importing the old name
     (`questions.ts:302`, `QuizPartRenderer.test.ts:5,110`, `quiz-schema-type-guarantees.test.ts:9,75`).
   - Recommendation: keep the same export name (minimizes the diff surface across those three files
     to "same import, new content, new test assertions") unless there's a specific reason to rename;
     either way, all three files need edits regardless of the name chosen.

2. **Is the pending `npm audit` finding (39 vulnerabilities, 2 critical) in scope for this phase?**
   - What we know: `npm install` reported this count during this research session's package
     revert/reinstall cycle, unrelated to any Phase 3 change — it reflects the pre-existing
     dependency tree.
   - What's unclear: whether this predates Phase 3 entirely (near-certain, since Phase 3 adds zero
     runtime dependencies) or whether it's worth a `npm audit` review as due diligence before the
     migration touches a PHI table.
   - Recommendation: out of scope for Phase 3 specifically (no dependency changes here cause it),
     but worth flagging to Andrew as a general finding — not a phase blocker.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `fly` CLI | `fly ssh console` migration route, deploy | ✓ (confirmed: `fly status -a alle-drops-quiz-app` succeeded) | — | — |
| `gcloud` CLI, authenticated to `alledrops-quiz` project | D-01's on-demand backup | ✗ — installed but **session expired, cannot reauth non-interactively** | — | Human-run `gcloud auth login` first, or Andrew runs the backup command himself / via Cloud SQL Console UI |
| Cloud SQL reachability from this machine | Direct `psql`/`pg` access for migration | ✗ (by design — this IP is not on the authorized-networks list, confirmed consistent with STATE.md/HANDOFF.md's prior findings) | — | `fly ssh console -a alle-drops-quiz-app` + base64-encoded `pg` script — **confirmed working live in this session** (returned `{"total":"42","size":"136 kB","with_history":"18"}`) |
| `npm test` / `npm run typecheck` / `npm run build` | Standard verification loop | ✓ (all three run clean, 282/23 passing, at the start of this research session) | vitest 3.2.4, TS via `react-router typegen && tsc --noEmit` | — |
| `npm run build:theme` | Theme bundle rebuild (required if quiz source changes) | ✓ (present as a script; not re-run in this research session since no source changed) | separate `vite.theme.config.ts` | — |

**Missing dependencies with no fallback:** none — every missing/blocked dependency above has a
documented, working fallback.

**Missing dependencies with fallback:**
- `gcloud` reauth (blocks the backup step only) — fallback is a human-run interactive
  `gcloud auth login` immediately before the phase executes, or Andrew running the backup command
  himself.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 |
| Config file | `vitest.config.ts` (repo root) — `environment: "node"` globally, `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]` |
| Quick run command | `npm test` (currently ~1s for all 282 tests — no meaningful "quick subset" distinction needed at this suite size) |
| Full suite command | `npm test` (same command — this repo has no separate slow/e2e vitest suite; `scripts/e2e-test.ts` is a standalone script run manually against a live deploy, not part of `npm test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | 11 comorbidity options present, "none of the above" is `exclusive: true`, `[]` blocks Next | unit | `npx vitest run app/lib/quiz/questions.test.ts` or extend `schema.test.ts` | ❌ Wave 0 (new fixture/assertions on the new question array) |
| HIST-01 | Clicking a real comorbidity while "none" selected switches in one click (no disabled siblings) | unit | Already covered generically by `tests/quiz-part-renderer-exclusive-clickable.test.ts` (source-text guard, not question-specific) + `toggleOption` unit tests in `schema.test.ts` | ✅ existing mechanism, extend fixture data only |
| HIST-02 | Any comorbidity selection (incl. none) reveals medications field | unit | `evaluateShowIf`/`isAnswered` test against the new `history_comorbidities` question in `schema.test.ts` | ❌ Wave 0 (new test case, existing test file) |
| HIST-03 | All three free-text fields block Next until answered (or their "none" gate is answered) | unit | `isPartComplete` test extended with the six new items | ❌ Wave 0 |
| HIST-04 | "no" PCP → info block; "yes" → two required text fields | unit | `evaluateShowIf` test for the two branches | ❌ Wave 0 |
| HIST-04 | Info block actually paints in a real browser (first production `InfoBlockCard` render) | manual/browser | No automated command — explicit UI-SPEC.md requirement for a manual check, not a unit-test substitute | N/A — manual step in the plan |
| HIST-05 | 100% of patients (incl. 0-2) reach medical history before outcome | unit | New test: with `QUIZ_PARTS.length === 6`, assert `currentPartIndex` reaches 5 before `step` can become `"outcome"` — or a source-text guard confirming no early-exit path to `"outcome"` skips index 5 | ❌ Wave 0 |
| HIST-05 | `"medical_history"` FlowStep and its 5+ dead sites are gone | source-text guard | `SOURCE.split(needle).length - 1 === 0` for each needle listed in Pitfall 4, new file following `tests/quiz-container-no-question-filter.test.ts`'s convention | ❌ Wave 0 (new file) |
| HIST-05 | Medical-history answers land in `answers_json`, no top-level payload field | unit | `buildPayload`/`visibleAnswers` test asserting the constructed payload has no `personal_history`/`family_history` keys and does have the new question IDs under `answers` | ❌ Wave 0 |
| HIST-05 | PDF and admin modal render medical-history answers via the D-05 label map | unit | Extend `tests/pdf.test.ts` and `tests/api-admin-submission-detail.test.ts` with a medical-history-shaped `answers_json` fixture, asserting a mapped label appears (not a raw `capitalize(displayKey)` string) | ❌ Wave 0 (existing files, new fixtures/assertions) |
| DIAG-01 | Diagnosis question present, adjacent to Part 5, required by default | unit | Extend `questions.test.ts` or the relevant part's assertions | ❌ Wave 0 |
| D-04 / Success Criterion 5 (score parity) | Same answers, with and without medical-history populated, produce identical score/bracket | unit | `calculateTotalScore(ALL_SCORED_QUESTIONS, answers)` pinned test — same base answers, one variant with medical-history keys added, assert identical output | ❌ Wave 0 |
| Migration (D-01) | Columns actually dropped, table still has 42 rows post-drop (or the count matches whatever it is at execution time), backup ID recorded | manual/ops verification | `fly ssh console` + `pg` script running `SELECT COUNT(*) FROM submissions` before and after, plus `\d submissions`-equivalent column check — **not** a vitest test; this is an ops runbook step | N/A — not automatable through vitest; document as a manual checkpoint with recorded before/after counts |
| Bundle freshness (standing risk, not phase-specific) | `public/quiz-bundle.js` rebuilt after any quiz-source change | existing regression test | `npm test` (includes `tests/quiz-bundle-freshness.test.ts`) | ✅ existing |

### Sampling Rate
- **Per task commit:** `npm test` (full suite — cheap enough at 282 tests/~1s that there is no
  reason to run a subset)
- **Per wave merge:** `npm run typecheck && npm test && npm run build` (and `npm run build:theme` if
  any quiz-source file changed in the wave)
- **Phase gate:** Full suite green, `npm run typecheck` clean, both builds current, PLUS the manual
  browser check for the HIST-04 info block, PLUS the migration's before/after `COUNT(*)` verification
  recorded in the plan's evidence trail (not just "migration ran, exit code 0" — see Pitfall 1 and
  the project's repeated "assert on served bytes/query results, not exit codes" lesson from Phases
  1–2).

### Wave 0 Gaps
- [ ] New assertions in `app/lib/quiz/schema.test.ts` (or a new `questions.test.ts`) for the six new
  HIST-03 gate+reveal pairs, HIST-02's `isAnswered` reveal, and HIST-04's branching — covers
  REQ-HIST-01/02/03/04
- [ ] New source-text guard file (pattern: `tests/quiz-container-no-question-filter.test.ts`) proving
  the `"medical_history"` FlowStep and all D-11/D-12 handler names are absent from
  `QuizContainer.tsx` and `ResultsDisplay.tsx` — covers REQ-HIST-05
- [ ] New pinned score-parity test in `app/lib/quiz/scoring.test.ts` (or wherever
  `calculateTotalScore` is currently tested) — covers D-04 / Success Criterion 5
- [ ] Extended fixtures in `tests/pdf.test.ts` and `tests/api-admin-submission-detail.test.ts` for
  the D-05 label map — covers the "no new plumbing" half of REQ-HIST-05
- [ ] No test framework install needed unless Research Question 3's DOM-test recommendation is
  adopted — vitest is already fully configured and sufficient for every item above except the
  HIST-04 browser check, which is manual regardless

## Security Domain

> `security_enforcement` is absent from `.planning/config.json` — treated as enabled per the
> standing rule.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No — Phase 3 adds no new authenticated routes | — |
| V3 Session Management | No | — |
| V4 Access Control | No new routes; existing ownership-bounded helpers (`getSubmissionByIdForCustomer`, admin session auth) are unchanged by this phase | Unchanged — verify no new PDF/admin route bypasses the existing pattern |
| V5 Input Validation | Yes — `quiz-validation.ts` loses two fields (`personal_history`/`family_history`) and gains no new server-side validation surface (all new answers flow through the existing generic `answers: Record<string, unknown>` field, already validated as "must be an object") | `quiz-validation.ts`'s existing `validateQuizData` — no new validation code needed per D-02's "no new plumbing" |
| V6 Cryptography | No | — |
| V7 Error Handling / Logging | Yes — directly relevant. The migration's verification queries and any new console output must stay `COUNT(*)`-only, never a PHI column, per `CLAUDE.md` rule 5/6 and the self-review checklist | Never log `answers`, `personal_history`, `family_history`, or any new HIST-01…04 answer value; log IDs and counts only, consistent with existing `console.log("[submit] OK", { submissionId, ... })` pattern in `api.quiz.submit.tsx:188-193` |
| V13 API / Data | Yes — the migration itself. Column removal on a table holding PHI. | Backup-before-drop (D-01), migration in its own reviewed commit, executed only against `alledrops_quiz_dev` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Data loss from an irreversible schema change on a PHI table | (not a STRIDE category — availability/integrity risk, not an attack) | On-demand backup before DROP COLUMN (D-01, non-negotiable); this research confirms the backup mechanism requires human/interactive `gcloud` auth today (Pitfall 2) — do not let the plan silently skip this step because it "should just work" |
| Reflected content in the new `text_input` free-text fields (HIST-02/03) reaching the admin modal or PDF | Tampering / Information Disclosure | Not a new risk this phase — `pdf.ts` and `app.quiz-results.tsx` already render arbitrary `answers_json` string values as plain text (PDFKit `.text()` calls, React text children), with no HTML-sink anywhere in either renderer (verified: no `dangerouslySetInnerHTML`, no markdown parser, in either file). HIST-02/03's new free-text fields are val identically to `med_list`, which already ships this exact pattern safely. |
| Log leakage of PHI during migration verification | Information Disclosure | `CLAUDE.md` rule 5/6 — any verification query must be `COUNT(*)` or an ID selector only; this research's own live verification query (`SELECT COUNT(*) FROM submissions`, `SELECT COUNT(*) FROM submissions WHERE personal_history_json IS NOT NULL OR family_history_json IS NOT NULL`) is the pattern to replicate, never `SELECT *` |

## Sources

### Primary (HIGH confidence — direct file reads and live command execution in this session)
- `app/components/quiz/QuizContainer.tsx` (full read) — flow control, auto-submit effect, D-11/D-12 sites
- `app/lib/quiz/questions.ts` (full read) — `PART6_MEDICAL_HISTORY`, `QUIZ_PARTS`, `ALL_ITEMS`, `getQuestionById`
- `app/lib/quiz/schema.ts` (full read) — `evaluateShowIf`, `isAnswered`, `toggleOption`, `visibleAnswers`, `itemsForPart`
- `app/lib/quiz/types.ts` (full read) — `QuizItem`, `ShowIfCondition`, `QuizInfoBlock`
- `app/components/quiz/QuizPartRenderer.tsx` (full read) — `InfoBlockCard`, `isPartComplete`
- `app/components/quiz/ResultsDisplay.tsx` (full read) — the 4 callback props, D-11's deletion scope
- `app/lib/submissions.ts`, `app/lib/format.ts`, `app/lib/pdf.ts`, `app/lib/quiz-validation.ts`, `app/routes/app.quiz-results.tsx`, `app/routes/api.quiz.submit.tsx` (full reads) — D-01/D-02/D-05 plumbing verification
- `migrations/001_create_submissions.sql`, `migrations/002_create_submission_access_log.sql` (full reads) — migration file convention
- `package.json`, `vitest.config.ts` (full reads) — stack/test-config confirmation
- `tests/quiz-container-no-question-filter.test.ts`, `tests/quiz-part-renderer-exclusive-clickable.test.ts` (full reads) — source-text guard convention
- Live `fly ssh console` query against Cloud SQL, this session: `{"total":"42","size":"136 kB","with_history":"18"}` — confirms both the working access mechanism and the migration's real blast radius
- Live `npm test` run, this session: 282 passing / 23 files — baseline confirmed unchanged from HANDOFF.md's claim
- Live `gcloud sql instances describe` attempt, this session: failed with a non-interactive reauth error — confirms Pitfall 2
- `grep -rn` sweeps across `app/`, `tests/`, `extensions/` for `medical_history`, `PART6_MEDICAL_HISTORY`, and all four D-11 handler names — confirms Pitfall 4's expanded blast radius
- `npm view jsdom / happy-dom / @testing-library/react version repository.url time.created scripts.postinstall`, this session — Package Legitimacy Audit data
- `slopcheck install jsdom happy-dom @testing-library/react`, this session — all three `[OK]` (see caution note in Package Legitimacy Audit about this command's real-install side effect)

### Secondary (MEDIUM confidence)
- [PostgreSQL 18 documentation via web search](https://www.postgresql.org/docs/current/sql-altertable.html) — `ALTER TABLE ... DROP COLUMN` is a metadata-only operation requiring `ACCESS EXCLUSIVE` but no table rewrite; cross-checked against [Bytebase's table-rewrite reference](https://www.bytebase.com/blog/postgres-table-rewrite/) and [dev.to's ALTER TABLE lock reference](https://dev.to/mickelsamuel/which-alter-table-operations-lock-your-postgresql-table-1082) — consistent across sources; at this table's measured size (136 kB, 42 rows) the lock duration is immaterial regardless
- [`gcloud sql backups create` reference](https://docs.cloud.google.com/sdk/gcloud/reference/sql/backups/create) — confirmed GA (not alpha/beta-only), `--instance`, `--description`, `--async`, `--location` flags; read-back via `gcloud sql backups list`/`gcloud sql backups describe`
- [Vitest environment config docs](https://vitest.dev/config/environment) and [Vitest per-file environment guide](https://vitest.dev/guide/environment) — confirms `// @vitest-environment jsdom` per-file override works without changing the global `environment: "node"` setting, directly informing Research Question 3's recommendation

### Tertiary (LOW confidence)
- None — every claim in this document traces to a primary or secondary source above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new runtime dependencies; existing stack read directly from `package.json`
- Architecture: HIGH — every wiring claim verified against the actual file and line, including two independent corrections to CONTEXT.md's stated blast radius (Pitfall 4)
- Migration mechanics: HIGH for the DDL/access-mechanism half (live-tested this session); MEDIUM for the backup step specifically, since the `gcloud` reauth blocker is an environment-state fact that could change between this research session and phase execution (a fresh `gcloud auth login` resolves it entirely)
- Pitfalls: HIGH — four of five are drawn from direct code/grep evidence in this session; the fifth (Pitfall 5) restates a documented, twice-repeated project history

**Research date:** 2026-08-09
**Valid until:** ~14 days for the code/architecture findings (stable unless main branch moves significantly before Phase 3 executes); the `gcloud` auth-state finding (Pitfall 2) is valid only until someone runs `gcloud auth login` — re-verify immediately before executing the migration task rather than trusting this document's snapshot.
