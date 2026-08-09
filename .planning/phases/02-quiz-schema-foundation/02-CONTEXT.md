# Phase 2: Quiz Schema Foundation - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

<domain>
## Phase Boundary

`QuizQuestion` gains declarative `required` and `showIf`, a static info-block type is added
alongside it, and `QuizPartRenderer.tsx` loses every question-ID literal — with the existing
`med_list` / `med_control` conditional behavior identical afterward and the existing suite green.

This phase builds **mechanism only**. It adds no quiz content, no new questions, no new sections,
and no new copy. Medical history content is Phase 3; the testing split is Phase 4; the score page
is Phase 5. Scoring is untouched by construction — `calculateTotalScore` is always called with
`ALL_SCORED_QUESTIONS`, and this phase keeps that array typed so info blocks cannot enter it.

Blast radius measured during scout: exactly six files reference `QuizQuestion`, `QUIZ_PARTS`,
`ALL_SCORED_QUESTIONS`, `QuestionType`, or `isPartComplete`. No route, no API, no PHI path.

</domain>

<decisions>
## Implementation Decisions

### `showIf` — conditional visibility

- **D-01: `showIf` is a declarative data object, not a predicate function.**
  Shape: `showIf: { questionId: "taking_meds", equals: "yes" }`. Serializable, inspectable, and
  testable without mounting a renderer — and one object drives both display and `isPartComplete`
  from a single evaluator. A function form was rejected: it is unserializable and re-admits the
  arbitrary cross-question logic that SCH-02 exists to delete. **No function escape hatch** — in
  practice the hatch becomes the default path and you maintain two evaluators.

- **D-02: The operator vocabulary is exactly three operators — `equals`, `isAnswered`, `includes`.**
  Each has a named downstream consumer, nothing is speculative:
  - `equals` — today's `taking_meds === "yes"`; Phase 3 HIST-04 (PCP yes/no); Phase 4 TEST-02
    (testing choice branch)
  - `isAnswered` — Phase 3 HIST-02, "checking any box *including none of the above* reveals the
    medications field." This is a non-empty test, **not** an equality test; `equals` alone cannot
    express it, which is why an equals-only vocabulary was rejected.
  - `includes` — a specific option was selected within a multi-select
  No composition (`allOf` / `anyOf`) and no `notEquals`: nothing through Phase 4 needs them, and
  each unused operator is untested branching in a load-bearing file.

- **D-03: A hidden question's answer stays in React state but is stripped at the boundary.**
  A single `visibleAnswers(items, answers)` pass is applied in two places — before
  `calculateTotalScore` and before the `POST /api/quiz/submit` payload. Consequences, both
  intended:
  - Nothing the patient could not see reaches Cloud SQL or the clinical PDF. Today nothing clears,
    so answering `med_list`, going back, and flipping `taking_meds` to "no" sends an orphan answer
    that contradicts the answer above it into the record Dr. Sullivan reads.
  - A patient who toggles a parent answer back and forth does not lose typed text. Clear-on-hide
    was rejected for exactly this: losing a long medication list to a mis-click has no undo, and
    abandonment is already this milestone's headline risk.
  - A future conditional *scored* question cannot inflate the score off a stale hidden answer.
    None exists today; the guarantee is structural rather than incidental.

- **D-04: A dangling `showIf` reference fails at test time and fails OPEN at runtime.**
  A test asserts every `showIf.questionId` resolves to a real question, so a typo cannot ship. If
  one somehow reaches runtime, the question **renders**. The safety direction inverts from Phase 1
  here and the planner must not "correct" it: for navigation, fail-closed was right because not
  navigating is safe. For a clinical question, fail-closed means the question is silently never
  asked *and* its required check is silently skipped — the patient completes an intake missing
  data nobody knows is missing. Over-collecting is recoverable; silent omission in a clinical
  record is not. Throwing was rejected: it destroys the patient's entire questionnaire mid-intake,
  since nothing persists until the terminal POST.

### `required` — required-ness

- **D-05: `required` defaults to `true`.** A question is required unless it declares
  `required: false`. Verified during scout: across all 20 questions there is exactly **one**
  `text_input` (`med_list`) and exactly **one** `control_0_3` (`med_control`) — the only two
  implicitly-optional questions today — and both are precisely the pair `showIf` now gates. So
  **today's behavior is reproduced with zero `required: false` declarations anywhere in
  `questions.ts`.** Opt-in (`required: true` on 18 questions) was rejected: a question added in
  Phase 3 or 4 that forgets the flag becomes silently optional, which is the wrong failure
  direction for a clinical intake.

- **D-06: An empty selection `[]` no longer counts as answered for a required checkbox/radio
  question.** This is a deliberate behavior change beyond the `med_list` / `med_control` pair, and
  it is in scope because it defines what `required` means. Today `isPartComplete` only checks
  `Array.isArray(a)`, so a patient can tick a symptom box, untick it, and advance with nothing
  recorded — and the submission cannot distinguish "no symptoms" from "did not engage," even
  though all seven checklist questions carry an explicit "None of the above." **Both existing
  checklist tests stay green unchanged** — verified: they use `{}` and `["none"]`, never `[]`.
  No question in the set wants the lenient behavior, so no per-question `allowEmpty` flag.

- **D-07: One shared `isAnswered(item, value)` predicate, consumed by both the required check and
  the `showIf` `isAnswered` operator.** They agree by construction. This matters concretely for
  HIST-02: the comorbidity checklist's required check and the "any box reveals the medications
  field" trigger then fire under identical conditions, so there is no state where Next is disabled
  with no visible cause. Two separate implementations were rejected — the drift they permit shows
  up as a stuck patient, not as a failing test.

- **D-08: Whitespace handling on text fields is preserved, not redesigned.** `med_list` currently
  blocks on `""` and on `"   "`, and two existing tests pin both. `isAnswered` must trim.

### Static info blocks

- **D-09: Info blocks are a discriminated union member, not a new `QuestionType`.**
  `type QuizItem = QuizQuestion | QuizInfoBlock`; part arrays become `QuizItem[]`. The compiler —
  not a reviewer — enforces that an info block cannot carry `required`, cannot be read for an
  answer, and cannot enter `ALL_SCORED_QUESTIONS`, which stays typed `QuizQuestion[]`. Chosen over
  the smaller `"info"`-as-a-`QuestionType` diff specifically because this codebase has twice been
  burned by invariants that depended on a reviewer noticing (see the `entry.theme.tsx` open
  redirect that two independent reviews cleared). The diff is wider but mechanical.

- **D-10: Info block content is structured and escaped — optional `heading` plus an array of
  paragraph strings, optionally a bullet list.** Rendered as React children, so escaping is
  automatic and the injection surface is zero. **No markdown, no HTML, no sanitizer or renderer
  dependency on the quiz page.** Phase 1 closed a reflected XSS on `/quiz-embed` (`jsonForScript`
  + per-response nonce CSP); re-admitting an HTML sink on that exact surface would need its own
  security review. An array rather than a single string because HIST-04's and TEST-03's copy is
  counsel-gated and not yet written — locking to one paragraph may not survive the approved text.

- **D-11: Info blocks leave no trace in the submission.** No answer, therefore no `answers` key,
  therefore the PDF and admin modal — which both iterate `answers` — are untouched. This keeps
  Phase 2 a contained schema refactor rather than a HIPAA-relevant PHI-path change, and honors the
  standing constraint that new sections extend `answers`, never the top-level payload schema.

- **D-12: Info blocks must compose with `showIf`.** They are not decoration. Phase 3 HIST-04 shows
  the establish-with-a-PCP recommendation only on "no"; Phase 4 TEST-03 shows the email-your-results
  instructions only on the already-tested branch. An info block therefore carries `showIf`, `order`,
  and `part`, and `visibleAnswers` / `isPartComplete` must skip it without special-casing.

### Exclusive-option handling (the third hardcode)

- **D-13: `exclusive: true` on the `QuizOption`, and the exclusive-none hardcode is folded in
  during this phase.** SCH-02's line references name only `:36-38` and `:276-278,295-299`, but its
  actual text — "no question-ID literals remain in `QuizPartRenderer.tsx`" — covers
  `isExclusiveNoneQuestion` at `:26-28` too. Scout found the renderer also hardcodes the literal
  string `"none"` in **five** places (`:47, 57, 71, 74, 75`). An option-level flag removes all four
  IDs and all five string literals at once.

- **D-14: Exclusivity is a NEW declaration and must NOT be derived from `excludeFromScore`.**
  They are independent concepts, proven by the existing data: `timing_season` declares
  `excludeFromScore: ["only_rarely"]`, but that option is deliberately *not* exclusive — a patient
  can be rarely symptomatic *and* symptomatic in spring. Any plan that reuses `excludeFromScore`
  as the exclusivity signal is wrong.

- **D-15: The option-level flag removes a latent Phase 3 trap.** HIST-01's locked list includes
  "none of the above" but its value string is not yet fixed. If Phase 3 writes
  `none_of_the_above`, today's code sets `exclusiveNone` true while `includes("none")` stays false
  — exclusivity silently does nothing, with no error and no failing test. `exclusive: true` makes
  the spelling irrelevant.

- **D-16: Clicking an already-selected exclusive option still deselects to `[]`, and Next
  correctly disables.** Today's toggle behavior at `:71` is preserved. Combined with D-06 this is a
  visible patient-facing change and it is intended: the patient unchecked everything, so the
  question is genuinely unanswered. Non-deselectable (radio-like) was rejected — a checkbox that
  will not uncheck is surprising, and it re-adds the special case that folding the hardcode out was
  meant to remove.

### Verified facts the planner should not re-derive

- Exactly one `text_input` (`med_list`) and one `control_0_3` (`med_control`) exist in the entire
  question set. This is what makes D-05 behavior-preserving.
- `timing_triggers` **is** the Part 2 question carrying the `"none"` option (`questions.ts:78-93`).
  The current four-ID hardcode is internally consistent — there is **no** live exclusivity bug
  today. Do not report one.
- No existing test exercises `[]` for a checklist question. The two Part 1 tests use `{}` and
  `["none"]` (`QuizPartRenderer.test.ts:8,13-15`), which is why D-06 keeps them green.
- Six files total reference the quiz schema:
  `app/lib/quiz/types.ts`, `app/lib/quiz/questions.ts`, `app/lib/quiz/scoring.ts`,
  `app/components/quiz/QuizPartRenderer.tsx`, `app/components/quiz/QuizPartRenderer.test.ts`,
  `app/components/quiz/QuizContainer.tsx`.
- `getQuestionById` (`questions.ts:261`) currently has **zero** callers. The `showIf` reference
  validation test (D-04) is its first real consumer.

### Claude's Discretion

- Exact file placement of the evaluator. Suggested `app/lib/quiz/schema.ts` exporting
  `isAnswered`, `evaluateShowIf`, and `visibleAnswers`, so `QuizPartRenderer.tsx` holds rendering
  only — but the planner may choose otherwise provided the literals leave the renderer.
- Whether `QuizInfoBlock` uses `kind: "info"` or another discriminant, and the exact field names
  (`body` vs `paragraphs`).
- Test structure and placement, provided the existing suite (**173 tests / 17 files**) stays green
  and the new schema behavior is covered.
- Whether `PART6_MEDICAL_HISTORY` is re-expressed through the new schema in this phase or left for
  Phase 3, which replaces it wholesale anyway.
- Commit decomposition across the four decision groups.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and locked decisions
- `.planning/ROADMAP.md` §"Phase 2: Quiz Schema Foundation" — goal, four success criteria, and the
  sequencing constraint that Phase 2 must land before Phases 3 and 4 or five more ID-literal
  special cases accrue across two files
- `.planning/ROADMAP.md` §"Sequencing Constraints" item 1 — the file:line inventory of what has no
  `required` flag, no conditional mechanism, and no static-content type today
- `.planning/REQUIREMENTS.md` §58-63 — SCH-01 and SCH-02 verbatim, with the line references this
  context extends (see D-13 on what SCH-02's enumeration misses)
- `.planning/PROJECT.md` §Constraints — "New quiz sections extend `answers`, not the top-level
  payload schema"; §Out of Scope — "Scoring work for any new quiz section" is impossible by
  construction, do not create scoring tasks
- `.planning/PROJECT.md` §Context — the corrected `injectIframe` note; the general lesson that a
  "path X is not in play" claim is scoped to the entry point actually measured

### Prior phase context (patterns and cautions carried forward)
- `.planning/phases/01-live-defect-fixes/01-CONTEXT.md` — D-14 on verifying against rendered DOM
  rather than deploy success; the established practice of recording *why* an option was rejected
- `.planning/STATE.md` §"Accumulated Context" — the `grep -c` counts-lines trap (three executors
  hit it independently); the retracted "dead code" entry and why the retraction is left visible

### Files this phase touches
- `app/lib/quiz/types.ts` — `QuizQuestion` (`:16-26`), `QuizOption` (`:28-32`), `QuestionType`
  (`:6-14`). Gains `required`, `showIf`, the `QuizItem` union, and `exclusive` on `QuizOption`
- `app/components/quiz/QuizPartRenderer.tsx` — `isExclusiveNoneQuestion` (`:26-28`), the display
  hardcode (`:36-38`), the five `"none"` literals (`:47,57,71,74,75`), `isPartComplete`
  (`:272-310`) with its skip (`:276-278`) and its two required special cases (`:295-304`)
- `app/lib/quiz/questions.ts` — the 20 question definitions; `getQuestionById` (`:261`);
  `ALL_SCORED_QUESTIONS` (`:252`); `QUIZ_PARTS` (`:266`)
- `app/lib/quiz/scoring.ts` — `scoreQuestion` (`:32`), `calculateTotalScore` (`:70`). Must keep
  receiving `QuizQuestion[]`; info blocks must be unable to reach it
- `app/components/quiz/QuizContainer.tsx` — `isPartComplete` call sites (`:481,482,490,491,560,561`),
  `QUIZ_PARTS` consumption (`:317`), and the two places `visibleAnswers` must be applied
- `app/components/quiz/QuizPartRenderer.test.ts` — the existing regression harness; the Part 1
  tests (`:6-19`) and the `med_list` tests (`:21-55`) are the behavior-identical proof

### Verification
- `CLAUDE.md` §"Self-review checklist for PHI-handling changes" — this phase should NOT trip any
  item; if a plan does, that is a signal the scope drifted into the PHI path
- `CLAUDE.md` §"Development workflow" — feature branch required, `npm run typecheck && npm test`
  before pushing, Andrew merges

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`excludeFromScore`** (`types.ts:22`) — the existing precedent for "a per-option behavior
  declared on the question rather than hardcoded in the renderer." `exclusive: true` follows the
  same spirit one level lower, on the option. It is a **model**, not a source of truth for
  exclusivity (D-14).
- **`getQuestionById`** (`questions.ts:261`) — already written, currently zero callers. Becomes the
  lookup for both `evaluateShowIf` and the D-04 reference-validation test.
- **The existing test file** (`QuizPartRenderer.test.ts`, 12 assertions) — this is the
  behavior-identical harness for success criterion 4. It should pass **unmodified**. If a plan
  needs to edit it, that is evidence the refactor changed behavior it should not have.
- **`scoreQuestion`'s `default: return 0`** (`scoring.ts:62-63`) — an unknown type already scores
  zero, so scoring degrades safely regardless. Not a licence to skip the type-level guarantee.

### Established Patterns
- **Scoring is structurally decoupled.** `calculateTotalScore(questions, answers)` takes an
  explicit list and is always called with `ALL_SCORED_QUESTIONS`. Keeping that array
  `QuizQuestion[]` is what makes "new sections cannot alter the score" a compiler guarantee rather
  than a convention.
- **Required-ness is currently implied by type inside a switch** (`isPartComplete:282-307`), with
  ID-literal exceptions bolted on. Making it declarative is the whole point of SCH-01 — the plan
  should delete the implicit per-type rules, not layer `required` on top of them.
- **Answers are a flat `Record<string, string | string[] | number>`** (`types.ts:45`). Info blocks
  never acquiring a key is what keeps the PDF and admin views untouched.
- **Quiz state is `useState` only; nothing persists until the terminal POST.** This is why D-03
  favors retaining typed text and why D-04 rejects throwing at runtime.

### Integration Points
- `QuizPartRenderer` props — `questions: QuizQuestion[]` becomes `items: QuizItem[]`.
- `isPartComplete(questions, answers)` — same signature widening; six call sites in `QuizContainer`.
- `QuizContainer` — two new `visibleAnswers()` applications: before `calculateTotalScore` and
  before the submit payload.
- `QUIZ_PARTS` / `PART6_MEDICAL_HISTORY` — types widen to `QuizItem[]`; contents unchanged in this
  phase.

</code_context>

<specifics>
## Specific Ideas

- **"Compiler-enforced, not reviewer-enforced" was the deciding argument on D-09.** The wider
  discriminated-union diff was chosen over the smaller `QuestionType` addition specifically because
  Phase 1 ended with a live, exploitable open redirect that two independent reviews had cleared.
  Where an invariant can be moved into the type system at reasonable cost, move it.
- **The safety direction genuinely inverts between Phase 1 and Phase 2 (D-04).** Phase 1's
  navigation work made fail-closed correct. Here, fail-closed silently omits a clinical question.
  A reviewer pattern-matching on "Phase 1 chose fail-closed" would introduce the bug.
- **D-06 and D-16 are a deliberate, visible patient-facing behavior change** — unchecking
  everything now disables Next. Signed off explicitly rather than discovered in UAT. Expect it in
  verification; it is not a regression.
- **Three operators, each with a named consumer.** The vocabulary was sized against Phases 3 and 4
  rather than against imagination. If a plan wants a fourth operator, it needs a named requirement.

</specifics>

<deferred>
## Deferred Ideas

- **Surface *which* required question is blocking Next.** Today the button is disabled silently, so
  a patient who misses one question in a five-question part sees a dead control with no reason.
  Making `required` explicit is what would make this cheap. It is a new capability, so it belongs
  in a UI phase — but it is directly relevant to the milestone's headline abandonment risk
  (`PROJECT.md` §Risks) and should not be lost.
- **Server-side enforcement of `required` in `app/lib/quiz-validation.ts`.** Required-ness is
  client-only today; the API validates payload shape only. A patient (or a script) posting directly
  bypasses every required check. New capability, needs its own security-relevant assessment.
- **Record which info blocks a patient was shown.** Rejected for Phase 2 (D-11) because it changes
  the submission payload and touches the PDF/admin PHI path. Worth revisiting if AOD ever needs to
  evidence that a patient was told to email their test results (Phase 4 TEST-03).
- **Composition operators (`allOf` / `anyOf`) and `notEquals` for `showIf`.** Deliberately excluded
  (D-02). Add only when a named requirement needs one.
- **Re-express `PART6_MEDICAL_HISTORY` through the new schema.** Phase 3 replaces it wholesale, so
  doing it here may be wasted work — left to the planner's judgment.

</deferred>

---

*Phase: 2-Quiz Schema Foundation*
*Context gathered: 2026-08-09*
