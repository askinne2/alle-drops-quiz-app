# Phase 2: Quiz Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 2-Quiz Schema Foundation
**Areas discussed:** showIf predicate shape, Required-ness defaults, Static info block shape, Exclusive-none hardcode

---

## showIf predicate shape

### Q1 — How should a `showIf` condition be expressed on a question?

| Option | Description | Selected |
|--------|-------------|----------|
| Declarative data object | Serializable, inspectable, testable without a renderer; one object drives both display and `isPartComplete` from a shared evaluator. Constrained to a fixed operator vocabulary. | ✓ |
| Predicate function | Maximally expressive, no operator design needed. Unserializable, uninspectable by admin/PDF, re-admits arbitrary cross-question logic. | |
| Data object with function escape hatch | Pragmatic middle ground; in practice the hatch becomes the default path and two evaluators get maintained. | |

**User's choice:** Declarative data object
**Notes:** Selected with the preview showing `showIf: { questionId: "taking_meds", equals: "yes" }` on `med_list`.

### Q2 — What operator vocabulary should `showIf` support?

| Option | Description | Selected |
|--------|-------------|----------|
| `equals` + `isAnswered` + `includes` | Three operators, each with a named downstream consumer through Phase 4. Nothing speculative. | ✓ |
| `equals` only | Smallest surface, reproduces today's behavior — but cannot express HIST-02, so Phase 3 would have to widen the schema. | |
| Full set incl. `notEquals` / AND-OR composition | Future-proof; nothing through Phase 4 needs composition, and each unused operator is untested branching. | |

**User's choice:** `equals` + `isAnswered` + `includes`
**Notes:** Driven by reading downstream requirements — HIST-02 needs non-empty ("any box checked including none-of-the-above"), HIST-04 and TEST-02 need equality.

### Q3 — When `showIf` evaluates false, what happens to an answer already given?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in state, strip at the boundary | One `visibleAnswers()` pass before scoring and before POST. Preserves typed text on toggle; keeps unseen answers out of Cloud SQL and the PDF; prevents future stale-answer score inflation. | ✓ |
| Clear immediately on hide | Simplest invariant, no boundary pass. A patient who mis-clicks loses a long medication list with no undo. | |
| Retain everything (today's behavior) | Zero change, existing tests untouched — knowingly ships a clinical-data-integrity defect into Phase 3. | |

**User's choice:** Keep in state, strip at the boundary
**Notes:** Raised because today nothing clears — answering `med_list`, backing up, and flipping `taking_meds` to "no" sends an orphan answer into the clinical PDF.

### Q4 — What happens when a `showIf` references a nonexistent question ID?

| Option | Description | Selected |
|--------|-------------|----------|
| Test-time failure + fail-open at runtime | A test asserts every reference resolves; unresolved refs render the question. Silent omission in a clinical record is worse than over-collecting. | ✓ |
| Fail-closed (hide the question) | Mirrors Phase 1's navigation fix — but the safety direction inverts, and a hidden required question also passes `isPartComplete`. | |
| Throw at runtime | Loudest signal in dev; in production it destroys the patient's whole questionnaire, since nothing persists until the terminal POST. | |

**User's choice:** Test-time failure + fail-open at runtime
**Notes:** Explicitly recorded in CONTEXT.md so a reviewer pattern-matching on "Phase 1 chose fail-closed" does not reverse it.

---

## Required-ness defaults

### Q1 — What should `required` default to?

| Option | Description | Selected |
|--------|-------------|----------|
| Defaults to `true` | Reproduces today's behavior with ZERO `required: false` declarations, because the only two implicitly-optional questions are exactly the `showIf`-gated pair. Safe default direction for a clinical intake. | ✓ |
| Defaults to `false`, opt in | 18 explicit flags; fully readable, but a forgotten flag silently makes a question optional. | |
| Stay type-implied, `required` as override | Smallest diff to `isPartComplete`; keeps the implicit rule hidden in a switch, which is what SCH-01 exists to remove. | |

**User's choice:** Defaults to `true`
**Notes:** Verified before asking — across 20 questions there is exactly one `text_input` (`med_list`) and one `control_0_3` (`med_control`), and both are the conditional pair.

### Q2 — Should an empty selection `[]` count as answered?

| Option | Description | Selected |
|--------|-------------|----------|
| No — require a non-empty selection | Forces an explicit answer on all 7 checklist questions; "None of the above" already exists on every one. Both existing checklist tests stay green (they use `{}` and `["none"]`). | ✓ |
| Yes — preserve today's behavior | Narrowest reading of success criterion 4; ships the gap into Phase 3's comorbidity checklist. | |
| Per-question flag | Most precise, but no question in the set actually wants the lenient behavior. | |

**User's choice:** No — require a non-empty selection
**Notes:** Verified no existing test exercises `[]` before proposing the change. Acknowledged as a deliberate behavior change beyond the `med_list`/`med_control` pair.

### Q3 — One shared answered-predicate, or two implementations?

| Option | Description | Selected |
|--------|-------------|----------|
| One shared `isAnswered(question, value)` | Required check and the `showIf` `isAnswered` operator agree by construction; matters for HIST-02, where divergence would strand a patient on a disabled Next with no visible cause. | ✓ |
| Two separate implementations | Less indirection when reading either site; the two definitions can drift silently, and drift surfaces as a stuck patient rather than a failing test. | |

**User's choice:** One shared predicate

---

## Static info block shape

### Q1 — How should a static info block be represented?

| Option | Description | Selected |
|--------|-------------|----------|
| Discriminated union (`QuizItem = QuizQuestion \| QuizInfoBlock`) | Compiler prevents `required`, an answer key, or entry into `ALL_SCORED_QUESTIONS`. Wider but mechanical diff. | ✓ |
| New `QuestionType` member (`"info"`) | Smallest diff, reuses `showIf`/`order`/`part`; needs runtime skips in `scoreQuestion` and `isPartComplete`, and nothing structurally prevents misuse. | |
| Content field on the part | Simplest; cannot place a recommendation directly beneath the question that triggered it, which HIST-04 and TEST-03 both need. | |

**User's choice:** Discriminated union
**Notes:** Deciding argument was compiler-enforced vs reviewer-enforced, given Phase 1 ended with a live open redirect that two independent reviews had cleared.

### Q2 — What content format should the body accept?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured, escaped (heading + paragraph array) | Rendered as React children, zero injection surface, no new dependency on the PHI page. Array accommodates counsel-gated copy not yet written. | ✓ |
| Single plain-text string | Minimal and equally safe; multi-paragraph copy has to be faked, and the approved text may not fit one paragraph. | |
| Markdown or HTML string | Maximum authoring flexibility; requires renderer + sanitizer and reintroduces an injection sink on the surface Phase 1 hardened. | |

**User's choice:** Structured, escaped

### Q3 — Should the submission record which info blocks were shown?

| Option | Description | Selected |
|--------|-------------|----------|
| No — info blocks leave no trace | No answer key, so PDF and admin modal are untouched; keeps Phase 2 out of the PHI path entirely. | ✓ |
| Yes — record displayed blocks | Evidence of what the patient was told (relevant to TEST-03); changes the payload and makes Phase 2 a HIPAA-relevant change. | |

**User's choice:** No — info blocks leave no trace

---

## Exclusive-none hardcode

### Q1 — How should exclusive-"none" behavior be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Fold in, option-level `exclusive: true` | Removes all 4 question-ID literals AND all 5 hardcoded `"none"` strings; drops the assumption that the exclusive value is spelled `"none"`. | ✓ |
| Fold in, question-level `exclusiveOption: "none"` | Removes the 4 IDs and moves the string into data; still repeats the value and couples the renderer to matching it. | |
| Leave it — out of scope | Strict reading of SCH-02's line references; Phase 3 adds a fifth ID and inherits the value-spelling trap. | |

**User's choice:** Fold in, option-level flag
**Notes:** Scout surfaced two facts that shaped this: the renderer hardcodes `"none"` in five places, and exclusivity cannot be derived from `excludeFromScore` (`timing_season` excludes `only_rarely` from scoring but it is deliberately not exclusive). Also confirmed there is no live exclusivity bug today — `timing_triggers` is correctly the Part 2 question carrying the `"none"` option.

### Q2 — What should clicking an already-selected exclusive option do?

| Option | Description | Selected |
|--------|-------------|----------|
| Deselect to `[]`, Next disables | Keeps today's toggle; the question is genuinely unanswered so Next correctly disables. No special case. | ✓ |
| Make it non-deselectable (radio-like) | Patient cannot trap themselves; a checkbox that will not uncheck is surprising and re-adds the special case. | |

**User's choice:** Deselect to `[]`, Next disables
**Notes:** Surfaced deliberately as the visible patient-facing consequence of combining this with the non-empty required rule, so it is signed off rather than discovered in UAT.

---

## Claude's Discretion

- File placement of the evaluator (suggested `app/lib/quiz/schema.ts` exporting `isAnswered`, `evaluateShowIf`, `visibleAnswers`).
- The `QuizInfoBlock` discriminant name and field names (`body` vs `paragraphs`).
- Test structure and placement, provided the existing 173 tests / 17 files stay green.
- Whether `PART6_MEDICAL_HISTORY` is re-expressed through the new schema now or left to Phase 3, which replaces it wholesale.
- Commit decomposition across the four decision groups.

## Deferred Ideas

- Surface *which* required question is blocking Next, instead of the silent disabled button. New capability, UI phase; relevant to the milestone's headline abandonment risk.
- Server-side enforcement of `required` in `app/lib/quiz-validation.ts`. Client-only today; a direct POST bypasses every required check.
- Record which info blocks a patient was shown — revisit if AOD needs to evidence that a patient was told to email test results (Phase 4 TEST-03).
- Composition operators (`allOf`/`anyOf`) and `notEquals` for `showIf` — add only when a named requirement needs one.
- Re-express `PART6_MEDICAL_HISTORY` through the new schema (may be wasted work, Phase 3 replaces it).
