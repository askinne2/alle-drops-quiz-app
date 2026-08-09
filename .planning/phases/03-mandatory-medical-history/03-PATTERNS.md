# Phase 3: Mandatory Medical History - Pattern Map

**Mapped:** 2026-08-09
**Files analyzed:** 15 (7 modified source, 6 modified test, 1 new migration, 1 CSS addition)
**Analogs found:** 15 / 15 (every file to touch already has a live in-repo precedent — RESEARCH.md's
"Phase 3's entire mechanism budget was spent in Phase 2" holds for patterns too, not just schema)

All line numbers below were verified against the files on disk in this session (2026-08-09), not
copied from CONTEXT.md/RESEARCH.md without re-checking. Where RESEARCH.md's number was already
correct it is confirmed as such; two off-by-one style discrepancies are called out explicitly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/lib/quiz/questions.ts` (`PART6_MEDICAL_HISTORY` replaced, `QUIZ_PARTS`/`ALL_ITEMS`/`getQuestionById` edited) | model (declarative data) | CRUD (in-memory, no persistence) | itself — `PART5_TREATMENT` (lines 205-241) and `PART1_SYMPTOM_CHECKLIST` (lines 8-59) in the same file | exact |
| `app/components/quiz/QuizContainer.tsx` (FlowStep union, 5+2 deletion sites, auto-submit trigger recheck) | controller (React state machine) | request-response (client-side flow + terminal POST) | itself — existing `quiz_parts` step branch (lines 455-503) is the pattern the deleted `medical_history` branch (548-572) should have followed | exact |
| `app/components/quiz/ResultsDisplay.tsx` (drop 1 of 4 callback props + its button) | component | request-response (props in, callback out) | itself — the 3-6 and 0-2 branches' surviving buttons are the pattern for what remains | exact |
| `app/lib/format.ts` (new label-map export) | utility | transform | itself — `capitalize`/`formatAnswerValue` (lines 1-3, 14-18), same file | exact |
| `app/lib/pdf.ts` (consume label map; delete Medical History section) | service (PDF stream) | transform / file-I/O | itself — `sectionHeader`/`labelValue` helpers (lines 47-56) and the Symptom Responses loop (74-85) | exact |
| `app/routes/app.quiz-results.tsx` (consume label map; delete Medical History section + `HistoryTagList`) | route (embedded admin UI) | request-response | itself — the Symptom Responses render block (250-258) | exact |
| `app/lib/submissions.ts` (`insertSubmission` loses 2 params/columns; `SubmissionFullRow` loses 2 fields) | service (Postgres access) | CRUD | itself — the existing `INSERT INTO submissions` column list (61-84) and `SubmissionFullRow` interface (34-54) | exact |
| `app/lib/quiz-validation.ts` (drop `personal_history`/`family_history` from type + validation) | utility (validation) | transform | itself — the existing array-type checks at lines 117-121 | exact |
| `migrations/003_drop_medical_history_legacy_columns.sql` (new file) | migration | batch (DDL) | `migrations/001_create_submissions.sql`, `migrations/002_create_submission_access_log.sql` | exact |
| `app/styles/quiz.module.css` (new `.infoBlockCard*` classes, `.questionCard__gateParent`/`.questionCard__revealChild`) | config (CSS Module) | transform (declarative styling) | itself — `.questionCard`/`.questionCard__label`/`.questionCard__subtitle` (329-360, 1455-1466) and the `:has()` rule at line 1763 | exact |
| `tests/quiz-medical-history-deletion.test.ts` (new source-text guard, name is Claude's discretion) | test | transform (string assertions) | `tests/quiz-container-no-question-filter.test.ts`, `tests/quiz-part-renderer-exclusive-clickable.test.ts` | exact |
| `app/lib/quiz/schema.test.ts` (extend reference-integrity + new fixtures) | test | transform | itself — `describe("reference integrity (D-04)"` block, lines 665-727 | exact |
| `tests/pdf.test.ts` (fixture drops 2 fields, label-map assertions) | test | transform | itself — `baseRow` fixture, lines 5-24 | exact |
| `tests/api-admin-submission-detail.test.ts` / `tests/api-admin-assessment-pdf.test.ts` (fixture drops 2 fields) | test | transform | itself — `mockRow` fixture, api-admin-submission-detail.test.ts lines 19-38 | exact |
| `app/components/quiz/QuizPartRenderer.test.ts` + `tests/quiz-schema-type-guarantees.test.ts` (drop `PART6_MEDICAL_HISTORY` import/assertions or repoint at new content) | test | transform | itself — lines cited in Integration Points below | exact |

## Pattern Assignments

### `app/lib/quiz/questions.ts` — the six new gate+reveal / reveal / info-block items

**Analog:** `PART5_TREATMENT`'s `taking_meds` → `med_list` pair, same file.

**Verified exact lines (re-checked against the file read in full this session — RESEARCH.md cited
"205-224" for the pair; the object literals actually span 206-224, with 205 being the `export const`
statement, not part of either question):**

```typescript
// Source: app/lib/quiz/questions.ts:206-224 (PART5_TREATMENT, live today)
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
  // Replaces the renderer's hardcoded `part === 5 && id === "med_list"` visibility guard.
  // Question IDs are unique across the set, so no additional part check is needed.
  showIf: { questionId: "taking_meds", equals: "yes" },
},
```

This is the literal template for all three of D-06's HIST-03 gate+reveal pairs
(`history_surgeries_has`→`history_surgeries`, `history_allergies_has`→`history_allergies`,
`history_conditions_has`→`history_conditions`) and for D-09's `has_pcp`→`pcp_clinic_name`/
`pcp_clinic_address`. The one addition D-06 needs on top of this exact shape: the reveal
(`text_input`) also needs `required: false` explicitly set, since these reveals are optional even
when visible (the gate answering "no" makes the reveal's `[]`/empty non-blocking) — `med_list` does
not need this because it has no "none" branch, but HIST-03 does per D-06.

**`exclusive: true` option pattern (HIST-01's "None of the above"), verified at `questions.ts:23`:**
```typescript
// value: "none", label: "None of the above", exclusive: true — inside a checkbox_multi options array
{ value: "none", label: "None of the above", exclusive: true },
```
Copy this exact shape for HIST-01's 11th option, plus `excludeFromScore: ["none"]` on the question
(matching `symptoms_nasal` at line 25) even though Part 6 questions are never in
`ALL_SCORED_QUESTIONS` — `excludeFromScore` and `exclusive` are independent per D-14/D-15, and adding
`excludeFromScore` costs nothing but keeps the shape consistent with every other `checkbox_multi` in
the file.

**`isAnswered` reveal pattern (HIST-02), no existing literal precedent but the operator itself is
proven in `schema.ts:57-78` and `schema.test.ts`'s `describe("isAnswered"...)` block (line 265):**
```typescript
{
  kind: "question",
  id: "current_medications", // Claude's discretion on exact ID (RESEARCH.md's suggestion)
  type: "text_input",
  part: 6,
  text: "What medications (including dosage) are you currently taking (please list all)",
  order: /* after history_comorbidities */,
  showIf: { questionId: "history_comorbidities", isAnswered: true },
},
```

**Info block pattern (HIST-04 "no PCP" branch) — `QuizInfoBlock` shape, `types.ts:65-74`, zero
existing usage anywhere in `questions.ts` today (verified: no `kind: "info"` literal exists in the
file as currently read in full):**
```typescript
{
  kind: "info",
  id: "no_pcp_recommendation",
  paragraphs: [
    "We recommend that you establish with a primary care physician before beginning SLIT.",
  ],
  order: /* after has_pcp */,
  part: 6,
  showIf: { questionId: "has_pcp", equals: "no" },
},
```

**`getQuestionById` (questions.ts:301-303) and `ALL_ITEMS` (questions.ts:318) both need edits in
lockstep with `QUIZ_PARTS` (questions.ts:307-313), per RESEARCH.md Pitfall 3.** Current code:
```typescript
// Source: app/lib/quiz/questions.ts:300-303
export function getQuestionById(id: string): QuizQuestion | undefined {
  return [...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY].find((q) => q.id === id);
}
```
D-03 requires `ALL_ITEMS` to derive from `QUIZ_PARTS` once medical history is a real `QUIZ_PARTS`
member — but `getQuestionById` must keep returning `QuizQuestion | undefined`, not `QuizItem |
undefined`. Do not naively `.flat()` over `QUIZ_PARTS` (typed `QuizItem[][]`) here without an
`isQuestion` filter from `schema.ts:29-31` — RESEARCH.md's Pitfall 3 spells out the exact TypeScript
trap. Safest minimal-diff option consistent with "no new mechanism": keep `getQuestionById`
concatenating explicit named arrays (`ALL_SCORED_QUESTIONS` + the new Part 6 question array,
filtered with `isQuestion` if the new Part 6 array is typed `QuizItem[]` to hold the info block too).

---

### `app/components/quiz/QuizContainer.tsx` — deletion + rewiring

**Analog:** the file's own surviving `quiz_parts` step branch, which is the wiring shape the deleted
`medical_history` branch should already have matched.

**D-12's five named `QuizContainer.tsx` sites, verified at these exact lines this session (all match
CONTEXT.md/RESEARCH.md exactly):**
- `FlowStep` union member `"medical_history"` — line 38
- seeding effect writing `history_personal`/`history_family` to `[]` — lines 153-160
- `step === "medical_history"` render branch — lines 548-572 (RESEARCH.md said 548-571; the branch's
  closing `)}` is actually at 572, one line later — verified by reading the full block)
- consent back-button's `scoreBracket === "7+"` special case — line 582
- `PART6_MEDICAL_HISTORY` import — line 13

**RESEARCH.md Pitfall 4's two additional in-file sites, both verified present this session:**
- `handleConsentSubmit` (lines 301-315) — the only remaining caller that populates `buildPayload`'s
  `extra` parameter:
  ```typescript
  // Source: app/components/quiz/QuizContainer.tsx:301-315
  const handleConsentSubmit = useCallback(async () => {
    if (!consentChecked) return;
    setStep("submitting");
    setSubmissionError(null);
    try {
      const personal = Array.isArray(answers.history_personal) ? (answers.history_personal as string[]) : undefined;
      const family = Array.isArray(answers.history_family) ? (answers.history_family as string[]) : undefined;
      await submitPayload({ personal_history: personal, family_history: family });
      setSavedToServer(true);
      setStep("completed");
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : "Submit failed");
      setStep("error");
    }
  }, [consentChecked, submitPayload, answers]);
  ```
  Once the `personal`/`family` extraction and the `{ personal_history, family_history }` argument are
  deleted, `buildPayload`/`submitPayload`'s `extra` parameter (lines 183-214) has no remaining caller
  anywhere in the file — delete the parameter itself, not just its one use site, per D-01's "dropped,
  not left vestigial."
- D-11's three handlers + 1 state var, all confirmed present:
  - `handleProceedWithoutTesting` — lines 286-288
  - `handleConfirmProceedWithoutTesting` — lines 290-294 (this is the only remaining
    `setStep("medical_history")` call site in the file — deleting this handler is what makes D-12's
    "no remaining code path sets step to medical_history" true)
  - `handleDeclineProceedWithoutTesting` — lines 296-299
  - `showProceedWarning` state — declared line 144, read at lines 510, 545
  - the `showProceedWarning` conditional render block — lines 510-534
  - `<ResultsDisplay onProceedWithoutTesting={handleProceedWithoutTesting} .../>` prop — line 544

**Auto-submit effect (D-13) — verified this session, needs ZERO code changes, only its wall-clock
firing moment changes:**
```typescript
// Source: app/components/quiz/QuizContainer.tsx:217-231 (live today, unchanged by this phase)
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
Write a positive test asserting this fires exactly once and that the resulting payload's `answers`
includes a medical-history key — do not just trust that `QUIZ_PARTS.length` bumping from 5 to 6 is
sufficient without a test (RESEARCH.md's explicit recommendation).

**Progress indicator (needs zero code changes, verify only) — lines 321-337, confirmed unchanged:**
```typescript
// Source: app/components/quiz/QuizContainer.tsx:321-337
const currentPartItems = itemsForPart(QUIZ_PARTS, currentPartIndex);
const quizPartsTotal = QUIZ_PARTS.length;                    // 5 today → 6 after this phase
```

---

### `app/components/quiz/ResultsDisplay.tsx` — drop `onProceedWithoutTesting`

**Analog:** the file's own surviving 3 callback props / buttons — this is a subtraction, not a new
pattern.

**Exact sites, verified this session (all 4 match RESEARCH.md exactly):**
- interface member `onProceedWithoutTesting: () => void;` — line 13
- destructured prop — line 24
- the "Proceed Without Testing" `<button>` — lines 132-138 (part of the 7+ bracket's
  `quizResults__actions` block, lines 124-140)
- the "I'd Like Allergy Testing First" button (lines 125-131) and its `onTestFirst` prop **stay** —
  do not delete the sibling button in the same block.

```typescript
// Source: app/components/quiz/ResultsDisplay.tsx:124-140 (the 7+ branch — keep onTestFirst's
// button, delete onProceedWithoutTesting's button and its prop)
{scoreBracket === "7+" && (
  <div className={styles.quizResults__recommendation}>
    ...
    <div className={styles.quizResults__actions}>
      <button type="button" className={...} onClick={onTestFirst}>
        I&apos;d Like Allergy Testing First
      </button>
      <button type="button" className={...} onClick={onProceedWithoutTesting}>
        Proceed Without Testing
      </button>
    </div>
  </div>
)}
```

---

### `app/lib/format.ts` — D-05's label map

**Analog:** the file's own two existing exports, verified in full (18 lines total):
```typescript
// Source: app/lib/format.ts:1-18 (entire file, current state)
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

export function formatAnswerValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ')
  if (val !== null && typeof val === 'object') return JSON.stringify(val)
  return String(val ?? '—')
}
```

**Both consumers stringify answer keys with the exact same pattern today — confirmed identical in
both files, one shared fix serves both (D-05's whole premise):**
```typescript
// app/lib/pdf.ts:81-82
const displayKey = key.replace(/_/g, ' ')
labelValue(capitalize(displayKey), formatAnswerValue(val))
```
```jsx
// app/routes/app.quiz-results.tsx:254
<span style={{...}}>{capitalize(key.replace(/_/g, ' '))}</span>
```

New export shape (fallback-to-`capitalize` per D-05, matching this file's existing plain-function,
no-class style):
```typescript
const ANSWER_LABELS: Record<string, string> = {
  history_comorbidities: "Personal history of medical conditions",
  current_medications: "Current medications",
  history_surgeries: "Previous surgeries",
  history_allergies: "Known allergies",
  history_conditions: "Other medical conditions",
  has_pcp: "Has a primary care physician",
  pcp_clinic_name: "PCP clinic name",
  pcp_clinic_address: "PCP clinic address",
  diagnosed_allergic_condition: "Diagnosed with an allergic condition",
  // existing question IDs may be added here too — D-05 fixes them "at once"
};

export function getAnswerLabel(key: string): string {
  return ANSWER_LABELS[key] ?? capitalize(key.replace(/_/g, ' '));
}
```
Both call sites (`pdf.ts:81-82`, `app.quiz-results.tsx:254`) swap their two-line
`capitalize(key.replace(...))` idiom for one call to `getAnswerLabel(key)`.

---

### `app/lib/pdf.ts` — consume label map, delete Medical History section

**Analog:** the file's own `Symptom Responses` loop (keep, modify) and `Medical History` conditional
block (delete outright).

**Keep and modify — verified lines 73-85:**
```typescript
// Source: app/lib/pdf.ts:73-85
sectionHeader('Symptom Responses')
const answers = row.answers_json ?? {}
const answerEntries = Object.entries(answers)
if (answerEntries.length === 0) {
  doc.fontSize(10).font('Helvetica').text('No responses recorded.')
} else {
  for (const [key, val] of answerEntries) {
    const displayKey = key.replace(/_/g, ' ')
    labelValue(capitalize(displayKey), formatAnswerValue(val))
  }
}
doc.moveDown(0.8)
```

**Delete outright — verified lines 87-108, reads the two dropped columns:**
```typescript
// Source: app/lib/pdf.ts:87-108 — DELETE THIS ENTIRE BLOCK per D-01/RQ4
const hasPersonal = row.personal_history_json && row.personal_history_json.length > 0
const hasFamily   = row.family_history_json   && row.family_history_json.length > 0
if (hasPersonal || hasFamily) {
  sectionHeader('Medical History')
  ...
}
```
Per RESEARCH.md Pitfall 1: this read path degrades gracefully (falsy checks) even if the columns
are dropped before this code is updated, but the block must be deleted anyway — D-01 requires
deleting vestigial sections outright, not leaving them silently dead.

---

### `app/routes/app.quiz-results.tsx` — consume label map, delete Medical History section

**Analog:** the file's own Symptom Responses render block (keep, modify) and Medical History block +
`HistoryTagList` helper (delete outright).

**Keep and modify — verified lines 250-258:**
```jsx
// Source: app/routes/app.quiz-results.tsx:250-258
<SectionHeader>Symptom Responses</SectionHeader>
<div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
  {Object.entries(detailRow.answers_json ?? {}).map(([key, val]) => (
    <div key={key} style={answerRowStyle}>
      <span style={{...}}>{capitalize(key.replace(/_/g, ' '))}</span>
      <SeverityPill value={formatAnswerValue(val)} />
    </div>
  ))}
</div>
```

**Delete outright — verified lines 260-266 (the conditional block) and lines 353-359+ (the
`HistoryTagList` helper function itself):**
```jsx
// Source: app/routes/app.quiz-results.tsx:260-266 — DELETE per D-01
{((detailRow.personal_history_json?.length ?? 0) > 0 || (detailRow.family_history_json?.length ?? 0) > 0) && (
  <>
    <SectionHeader>Medical History</SectionHeader>
    <HistoryTagList label="Personal" items={detailRow.personal_history_json} />
    <HistoryTagList label="Family" items={detailRow.family_history_json} />
  </>
)}
```
```typescript
// Source: app/routes/app.quiz-results.tsx:353-359 — the HistoryTagList function itself, DELETE
// (its only two callers are in the block above)
function HistoryTagList({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!items?.length) return null
  return ( ... )
}
```
Import line to update: `import { capitalize, formatDate, formatAnswerValue } from '../lib/format'`
at line 9 gains `getAnswerLabel` (or replaces the `capitalize(key.replace(...))` idiom with it).

---

### `app/lib/submissions.ts` — drop 2 columns from `insertSubmission` + `SubmissionFullRow`

**Analog:** the file's own existing `INSERT` statement and interface — this is subtraction against
an established, well-commented convention.

**`SubmissionFullRow` interface, verified lines 34-54 — remove `personal_history_json` (line 46) and
`family_history_json` (line 47):**
```typescript
// Source: app/lib/submissions.ts:34-54
export interface SubmissionFullRow {
  id: string;
  symptom_profile_id: string;
  customer_id_shopify: string | null;
  patient_name: string;
  patient_dob: string;
  patient_email: string;
  patient_phone: string;
  patient_state: string;
  quiz_score: number;
  score_bracket: string;
  answers_json: Record<string, unknown>;
  personal_history_json: string[] | null;   // ← DELETE
  family_history_json: string[] | null;     // ← DELETE
  consent_version: string | null;
  ...
}
```

**`insertSubmission`, verified lines 57-112 — remove params 11-12 from both the named column list
and the values array, and renumber every `$N` placeholder after position 10:**
```typescript
// Source: app/lib/submissions.ts:61-84 (SQL) and 86-108 (params) — current state
const sql = `
  INSERT INTO submissions (
    customer_id_shopify, symptom_profile_id, patient_name, patient_dob, patient_email,
    patient_phone, patient_state, quiz_score, score_bracket, answers_json,
    personal_history_json, family_history_json,          -- ← DELETE these two columns
    consent_version, consent_accepted_at, consent_ip_address, consent_user_agent,
    completion_time_seconds
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
  RETURNING id, symptom_profile_id, created_at
`;
const params = [
  input.customer_id_shopify ?? null, input.symptom_profile_id, input.name, input.dob,
  input.email, input.phone, input.state, input.quiz_score, input.score_bracket,
  JSON.stringify(input.answers ?? {}),
  input.personal_history && input.personal_history.length > 0                 // ← DELETE
    ? JSON.stringify(input.personal_history) : null,                          // ← DELETE
  input.family_history && input.family_history.length > 0                    // ← DELETE
    ? JSON.stringify(input.family_history) : null,                            // ← DELETE
  input.consent_version ?? null, input.consent_version ? new Date() : null,
  input.consent_ip_address ?? null, input.consent_user_agent ?? null, input.completion_time ?? null,
];
```
`InsertSubmissionInput extends QuizSubmissionData` (line 14) — `QuizSubmissionData` is defined in
`quiz-validation.ts` (see below); once that type drops the two fields, `insertSubmission`'s
TypeScript surface is already correct and the compiler will flag any stray reference. This is a
Pitfall-1-relevant file: per RESEARCH.md, deploy this change and confirm the release is live
**before** running the `DROP COLUMN` migration.

**Two `SELECT *` read paths (`getSubmissionByIdForCustomer` line 168, `getSubmissionByIdForAdmin`
line 267) need no SQL change** — `SELECT *` simply stops returning the two columns once they're
dropped, and `SubmissionFullRow`'s type change makes that consistent at compile time.

---

### `app/lib/quiz-validation.ts` — drop `personal_history`/`family_history`

**Analog:** the file's own existing type + two validation checks.

**`QuizSubmissionData` interface, verified lines 16-31 — remove lines 28-29:**
```typescript
// Source: app/lib/quiz-validation.ts:16-31
export interface QuizSubmissionData {
  state: QuizState;
  name: string;
  dob: string;
  email: string;
  phone: string;
  symptom_profile_id: string;
  quiz_score: number;
  score_bracket: ScoreBracket;
  quiz_date?: string;
  answers: Record<string, unknown>;
  completion_time?: number;
  personal_history?: string[];   // ← DELETE (line 28)
  family_history?: string[];     // ← DELETE (line 29)
  consent_version?: string;
}
```

**`validateQuizData`, verified lines 117-122 — delete both checks (RESEARCH.md's ":117-118" is
close; the pair of blocks actually spans 117-122, one `if` each):**
```typescript
// Source: app/lib/quiz-validation.ts:117-122 — DELETE both blocks
if (quizData.personal_history !== undefined && !Array.isArray(quizData.personal_history)) {
  return { valid: false, error: "personal_history must be an array of strings when provided" };
}
if (quizData.family_history !== undefined && !Array.isArray(quizData.family_history)) {
  return { valid: false, error: "family_history must be an array of strings when provided" };
}
```
No new validation is added — D-02's "no new plumbing" means the new HIST-01…04 answers flow entirely
through the existing generic `answers: Record<string, unknown>` field, already validated at lines
113-115 ("answers must be an object").

---

### `migrations/003_drop_medical_history_legacy_columns.sql` — new file

**Analog:** `migrations/001_create_submissions.sql` and `migrations/002_create_submission_access_log.sql`.

**Header comment convention, verified from both files:**
```sql
-- migrations/002_create_submission_access_log.sql
-- Records every admin fetch of PHI for HIPAA audit trail.
-- Run in Cloud SQL Studio against alledrops_quiz_dev (and prod when ready).
```
```sql
-- migrations/001_create_submissions.sql
-- AlleDrops symptom quiz: submissions table
-- Cloud SQL Postgres (alledrops_quiz_dev). Holds PHI.
-- Run once against alledrops_quiz_dev — Cloud SQL Studio is the easiest path.
--
-- Pre-req: alledrops_app user exists. If GRANTs at the bottom fail, run them
-- as the postgres superuser separately.
```

**How they are run:** manually via Cloud SQL Studio (no migration runner/ORM in this stack — `pg` is
a raw client) or via the `fly ssh console` + base64-encoded `pg` script route RESEARCH.md proved
live this session. Neither file wraps its DDL in an explicit `BEGIN`/`COMMIT` — both rely on a
single top-level statement (`CREATE TABLE IF NOT EXISTS`) being implicitly atomic. A `DROP COLUMN`
migration should follow the same convention (no explicit transaction wrapper needed for a single
`ALTER TABLE` statement) but MUST be preceded by the on-demand backup step per D-01 — that backup is
external to the SQL file itself (a `gcloud sql backups create` command, not DDL), so record the
backup ID in the migration file's own header comment or in the plan's evidence trail, following
`002`'s pattern of stating its own purpose and run target inline.

**No GRANT statements needed** — `DROP COLUMN` doesn't change table privileges; `001`'s GRANT block
(lines 44-48) is specific to table creation, not modification, and `002` repeats the same GRANT
pattern only because it's a new table. This migration needs neither.

**Suggested shape, following the two-file convention exactly:**
```sql
-- migrations/003_drop_medical_history_legacy_columns.sql
-- Drops the vestigial Part 6 medical-history columns after Phase 3 replaces PART6_MEDICAL_HISTORY
-- wholesale (D-01). Run in Cloud SQL Studio against alledrops_quiz_dev ONLY — production cutover
-- has not happened; there is no second database to migrate yet.
--
-- REQUIRED before running: an on-demand Cloud SQL backup. Record the backup ID here:
--   Backup ID: <fill in before executing>
--
-- REQUIRED order: the application code that stops writing/reading these two columns must be
-- deployed and confirmed live (fly status -a alle-drops-quiz-app) BEFORE this file runs — see
-- RESEARCH.md Pitfall 1. Running this first will make every /api/quiz/submit INSERT fail with
-- "column ... does not exist" for as long as the old code is still live.

ALTER TABLE submissions
  DROP COLUMN IF EXISTS personal_history_json,
  DROP COLUMN IF EXISTS family_history_json;
```

---

### `app/styles/quiz.module.css` — new classes for HIST-04's info block and D-06's gate+reveal pairs

**Analog:** `.questionCard`/`.questionCard__label`/`.questionCard__subtitle` (the component to
differentiate FROM) and the existing `:has()` rule (the technique to reuse).

**Base classes being differentiated from, verified lines 329-360 and 1455-1466:**
```css
/* Source: app/styles/quiz.module.css:329-345 */
.questionCard {
  padding: var(--quiz-spacing-md);
  background-color: rgb(var(--color-background, 255, 255, 255));
  border: none;
  border-radius: var(--quiz-border-radius);
  transition: box-shadow var(--quiz-transition);
}
.questionCard:hover {
  box-shadow: var(--quiz-shadow);
}
```
```css
/* Source: app/styles/quiz.module.css:1455-1459 */
.questionCard__subtitle {
  font-size: var(--font-body-size, 1.2rem);
  color: rgba(var(--color-foreground, 32, 34, 35), 0.6);
  margin: 0 0 var(--quiz-spacing-sm);
}
```

**The `:has()` technique UI-SPEC.md's gate+reveal fusion depends on — the only existing precedent in
this file, verified at line 1763:**
```css
/* Source: app/styles/quiz.module.css:1763-1766 */
.questionCard__options .questionCard__option:has(input[type="radio"]:focus-visible) {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```
UI-SPEC.md's suggested `.questionCard:has(+ .questionCard__revealChild) { ... }` alternative-to-a-
conditional-class is directly modeled on this rule's shape (a `:has()` selector scoping a style
change based on a sibling/child match) — it is not introducing a new CSS capability for this
codebase, just a new selector using an already-proven pseudo-class.

**The disclaimer border-width breakpoint pattern UI-SPEC.md cites for `.infoBlockCard`'s left
border (3px mobile → 4px desktop), verified lines 187-205:**
```css
/* Source: app/styles/quiz.module.css:187-205 */
.quizContainer__disclaimer {
  margin-top: var(--quiz-spacing-lg);
  padding: var(--quiz-spacing-sm) var(--quiz-spacing-md);
  background-color: rgba(var(--color-foreground, 32, 34, 35), 0.03);
  border-left: 3px solid var(--quiz-color-warning);
  border-radius: var(--quiz-border-radius);
  font-size: var(--font-body-size, 1.2rem);
  color: rgba(var(--color-foreground, 32, 34, 35), 0.75);
}
@media (min-width: 750px) {
  .quizContainer__disclaimer {
    margin-top: var(--quiz-spacing-xl);
    padding: var(--quiz-spacing-md);
    border-left-width: 4px;
    font-size: var(--font-body-size, 1.4rem);
  }
}
```
`.infoBlockCard` reuses this exact `border-left-width: 3px → 4px` breakpoint shape, swapping
`var(--quiz-color-warning)` for `rgb(var(--color-button, 0, 123, 255))` per UI-SPEC.md's color
decision (accent, not warning — a PCP recommendation is not a caution).

**`.questionCard__optionsVertical`/`.questionCard__optionVertical` (HIST-01's 11-option list reuses
this unmodified, per UI-SPEC.md), verified lines 1469-1524:**
```css
/* Source: app/styles/quiz.module.css:1469-1491 */
.questionCard__optionsVertical {
  display: flex;
  flex-direction: column;
  gap: var(--quiz-spacing-xs);
}
.questionCard__optionVertical {
  display: flex;
  align-items: center;
  padding: var(--quiz-spacing-sm) var(--quiz-spacing-md);
  border: 2px solid rgba(var(--color-foreground, 32, 34, 35), 0.2);
  border-radius: var(--quiz-border-radius);
  cursor: pointer;
  transition: all var(--quiz-transition);
  background-color: rgb(var(--color-background, 255, 255, 255));
  min-height: 44px;
}
```
No new class needed for HIST-01 itself — this is a "verify, don't build" item, same as the progress
indicator in `QuizContainer.tsx`.

**Inline SVG icon precedent for `.infoBlockCard__icon`, verified in `QuizContainer.tsx:362-367`
(not in the CSS file, but this is the technique UI-SPEC.md cites for "no icon library"):**
```jsx
// Source: app/components/quiz/QuizContainer.tsx:362-367
<div className={styles.quizCompleted__icon} aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="rgba(76,175,80,0.12)" stroke="#4CAF50" strokeWidth="2"/>
    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#4CAF50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</div>
```
Same technique (inline SVG, `aria-hidden="true"`, no external asset) for `.infoBlockCard__icon`'s
circle-with-"i" glyph.

---

### New source-text guard test — `tests/quiz-medical-history-deletion.test.ts` (name at planner's discretion)

**Analog:** `tests/quiz-container-no-question-filter.test.ts` (full file read, 65 lines) and
`tests/quiz-part-renderer-exclusive-clickable.test.ts` (full file read, 59 lines).

**The needle-assembly-from-fragments technique — copy this exactly, do not write a needle as one
contiguous string literal in the new test file itself:**
```typescript
// Source: tests/quiz-container-no-question-filter.test.ts:32-43
const Q = '"';
const quoted = (fragmentA: string, fragmentB: string) => `${Q}${fragmentA}${fragmentB}${Q}`;

const KIND_EQUALS_QUESTION_NEEDLE = "kind" + " === " + quoted("que", "stion");
const REVERSED_NEEDLE = quoted("que", "stion") + " === " + "kind";
```
```typescript
// Source: tests/quiz-part-renderer-exclusive-clickable.test.ts:36-37
const HELPER_NEEDLE = "isOptionDisabled" + "ByExclusive";
```
Apply this pattern to each D-11/D-12 needle: `"medical_history"` (as the `FlowStep` literal, not as
a substring of e.g. a code comment — consider matching the quoted form `quoted("medical_", "history")`
if the bare string could otherwise appear in a surviving comment), `handleProceedWithoutTesting`,
`handleConfirmProceedWithoutTesting`, `handleDeclineProceedWithoutTesting`, `showProceedWarning`,
`onProceedWithoutTesting`.

**The counting convention — copy verbatim, never `grep -c`:**
```typescript
// Source: tests/quiz-container-no-question-filter.test.ts:49-50
const count = SOURCE.split(KIND_EQUALS_QUESTION_NEEDLE).length - 1;
expect(count).toBe(0);
```

**Reading the source file under test — copy verbatim (both analogs use this identical pattern):**
```typescript
// Source: tests/quiz-container-no-question-filter.test.ts:27-30
const SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizContainer.tsx"),
  "utf-8",
);
```
The new guard test needs a second `readFileSync` call for `ResultsDisplay.tsx` (for
`onProceedWithoutTesting`'s 3 sites), since D-11's blast radius spans both files.

**Positive-proof convention (don't just prove absence — prove the replacement wiring exists), copied
from the same analog:**
```typescript
// Source: tests/quiz-container-no-question-filter.test.ts:58-63
it("calls itemsForPart to select the current part's items, ...", () => {
  const count = SOURCE.split("itemsForPart").length - 1;
  expect(count).toBeGreaterThan(0);
});
```
Apply this shape to prove `handleTestFirst` (the 7+ patient's surviving exit) is still present and
wired, not just that the deleted handlers are gone.

---

### `app/lib/quiz/schema.test.ts` — reference-integrity extension

**Analog:** the file's own existing `describe("reference integrity (D-04)"` block.

```typescript
// Source: app/lib/quiz/schema.test.ts:653-665 (helper + describe block opening, verified present)
/** Returns the showIf.questionId of every item whose reference does NOT resolve via
 * getQuestionById. An empty result means every showIf in `items` points at a real question. */
function findDanglingShowIfReferences(items) {
  const dangling = [];
  for (const item of items) {
    if (item.showIf && getQuestionById(item.showIf.questionId) === undefined) {
      dangling.push(item.showIf.questionId);
    }
  }
  return dangling;
}
describe("reference integrity (D-04)", () => {
  // existing assertions iterate ALL_ITEMS — HIST-02/03/04's new showIf.questionId values
  // (history_comorbidities, history_surgeries_has, history_allergies_has, history_conditions_has,
  // has_pcp) are automatically covered once they're added to whatever set this describe block
  // iterates over (ALL_ITEMS, confirmed at line ~657's usage), with NO new test code required —
  // only new fixture data in questions.ts.
});
```

## Shared Patterns

### Required-defaults-to-true / `[]` does not satisfy required
**Source:** `app/lib/quiz/schema.ts:57-78` (`isAnswered`) and `types.ts:28-29` (`required?: boolean`
doc comment)
**Apply to:** every new HIST-01…04 / DIAG-01 question in `questions.ts` — omit `required` entirely
unless D-06 specifically calls for `required: false` on a reveal field.

### `showIf` fail-open
**Source:** `app/lib/quiz/schema.ts:100-119` (`evaluateShowIf`, see the D-04 doc comment)
**Apply to:** every new `showIf.questionId` reference — a typo here renders the field unconditionally
rather than hiding it, which is why the reference-integrity test extension above is load-bearing.

### Source-text guards in lieu of DOM tests
**Source:** `tests/quiz-container-no-question-filter.test.ts`, `tests/quiz-part-renderer-exclusive-clickable.test.ts`, `tests/quiz-part-renderer-no-literals.test.ts`
**Apply to:** the new D-11/D-12 deletion guard, and to any Wave that touches `QuizContainer.tsx` or
`QuizPartRenderer.tsx` without adopting DOM test infra (RESEARCH.md's Research Question 3 — the
planner must decide explicitly, not by default).

### `console.error`/`console.log` PHI discipline
**Source:** `app/components/quiz/QuizContainer.tsx:226` (`console.error(e)` in the auto-submit
catch — logs the Error object, not answer values) and `api.quiz.submit.tsx:188-193` pattern cited in
RESEARCH.md (IDs/counts only)
**Apply to:** any new logging touched while rewiring `QuizContainer.tsx`, and to the migration's own
verification queries (`COUNT(*)` only, never `SELECT *` — RESEARCH.md's own live verification query
is the pattern: `SELECT COUNT(*) FROM submissions WHERE personal_history_json IS NOT NULL OR
family_history_json IS NOT NULL`).

### Bundle freshness
**Source:** `tests/quiz-bundle-freshness.test.ts` (existing regression test, not modified this
phase) and the standing rule that `npm run build:theme` is a separate command from `npm run build`
**Apply to:** any commit in this phase that touches `app/lib/quiz/questions.ts` or
`app/components/quiz/QuizContainer.tsx` — rebuild `public/quiz-bundle.js` in the same commit.

## No Analog Found

None. Every file this phase touches has a same-file or same-directory precedent — RESEARCH.md's
"Phase 3's entire mechanism budget was spent in Phase 2" claim held under this pattern-mapping pass
as well: there is no file in this phase's scope that requires inventing a new structural pattern.

## Metadata

**Analog search scope:** `app/lib/quiz/`, `app/components/quiz/`, `app/lib/`, `app/routes/`,
`app/styles/`, `migrations/`, `tests/` (repo root) — every directory named in CONTEXT.md's
`<canonical_refs>` "Code the planner must read, not infer" list, plus the two test-guard files named
in the orchestrator's specific guidance.
**Files scanned (fully read, not grepped):** `questions.ts`, `schema.ts`, `types.ts`,
`QuizContainer.tsx`, `QuizPartRenderer.tsx`, `ResultsDisplay.tsx`, `format.ts`, `pdf.ts`,
`submissions.ts`, `quiz-validation.ts`, `migrations/001_create_submissions.sql`,
`migrations/002_create_submission_access_log.sql`, `tests/quiz-container-no-question-filter.test.ts`,
`tests/quiz-part-renderer-exclusive-clickable.test.ts`, plus targeted grep+read passes on
`app.quiz-results.tsx` (lines 230-360, and the import line), `quiz.module.css` (spacing tokens,
`.questionCard*` family, the `:has()` rule, the disclaimer border pattern), `schema.test.ts`
(reference-integrity block), and the four fixture files (`pdf.test.ts`,
`api-admin-submission-detail.test.ts`, `api-admin-assessment-pdf.test.ts`,
`QuizPartRenderer.test.ts`, `quiz-schema-type-guarantees.test.ts`) for exact line numbers.
**Line-number corrections found and reported:** two. (1) RESEARCH.md's "lines 205-224" for the
`taking_meds`/`med_list` pair is off by one — the object literals span 206-224, line 205 is the
`export const` statement. (2) RESEARCH.md's "the whole `step === "medical_history"` render branch
(:548-571)" undercounts by one line — the branch's closing `)}` is at line 572. All other line
citations from CONTEXT.md and RESEARCH.md were independently re-verified and are correct as stated.
**Pattern extraction date:** 2026-08-09
