# Phase 2: Quiz Schema Foundation - Research

**Researched:** 2026-08-09
**Domain:** TypeScript discriminated unions / declarative form schema for a React quiz renderer
**Confidence:** HIGH

## Summary

This phase is a pure type-and-logic refactor of six already-inventoried files. There is no new
library to evaluate and no external service to integrate — the work is entirely: (1) widen
`QuizQuestion`/`QuizOption` with three new declarative fields (`required`, `showIf`, `exclusive`),
(2) introduce a `QuizItem = QuizQuestion | QuizInfoBlock` discriminated union so the compiler bars
info blocks from scoring and from acquiring an `answers` key, and (3) replace five ID-literal /
`"none"`-literal special cases in `QuizPartRenderer.tsx` with three small evaluator functions
(`isAnswered`, `evaluateShowIf`, `visibleAnswers`) that read the new declarative fields.

The mechanics here — TypeScript discriminated unions, `is`-predicate narrowing, exhaustive
`switch` checking — are standard, stable language features (TS 5.9.3 here, strict mode, confirmed
clean `tsc --noEmit` baseline). Prior-art form-schema libraries (JSON Schema `if/then`, SurveyJS
`visibleIf`) converge on the same three ideas this phase already locked in via CONTEXT.md: (a)
conditions are declarative data, evaluated fresh on every render against current answer state, not
compiled once; (b) a *fully unrelated-field* condition ("is this field answered at all," not "does
it equal X") needs its own operator distinct from equality — which is exactly why D-02 has
`isAnswered` as a first-class operator, not just `equals`; (c) conditional visibility and
conditional requiredness should share one evaluation path, or the two silently drift. No library
is recommended for adoption — CLAUDE.md forbids new dependencies on the PHI-adjacent quiz surface
without approval, and the three-operator vocabulary this phase locked is deliberately smaller than
any general-purpose schema library's, which is the right call for a codebase that has twice been
burned by "clever" surface area (`entry.theme.tsx`'s open redirect, cleared by two reviews).

The one implementation detail that is easy to get subtly wrong and is NOT explicit in CONTEXT.md:
`evaluateShowIf` (used for rendering + `isPartComplete`) must read the **raw, current React
`answers` state**, while `visibleAnswers()` (D-03's boundary pass) is a **separate, later** filter
applied only at the scoring and payload boundaries. Conflating them — e.g., stripping hidden
answers before evaluating `showIf` for rendering — would break chained conditionals (A shows based
on B, B's own visibility depends on C) because the filtered set would already be missing values
the renderer still needs to *decide* visibility from.

**Primary recommendation:** Build one small module (`app/lib/quiz/schema.ts`, per CONTEXT.md's
suggested placement) exporting `isAnswered`, `evaluateShowIf`, and `visibleAnswers`, all operating
on `QuizItem[]` and a `QuizAnswers` map passed by the caller — never importing React or reading
component state directly. `QuizPartRenderer.tsx` and `QuizContainer.tsx` become the only two
callers, and the `QuizItem = QuizQuestion | QuizInfoBlock` union plus a kept-narrow
`ALL_SCORED_QUESTIONS: QuizQuestion[]` are what make "an info block can never reach
`scoreQuestion`" a compiler fact rather than a review checklist item.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Quiz schema types (`QuizQuestion`, `QuizOption`, `QuizItem`, `QuizInfoBlock`) | Browser / Client (bundled into `app/lib/quiz/`) | — | Pure type/data definitions, no I/O; shared by renderer, container, and scoring, all client-bundled |
| `showIf` / `required` / `isAnswered` evaluation | Browser / Client | — | Runs entirely in React state during rendering; no server round-trip, no persistence |
| `visibleAnswers()` boundary filter | Browser / Client | — | Applied client-side before scoring and before the POST body is constructed; it never touches a route or the DB directly — it shapes what `QuizContainer` sends |
| Static info block rendering | Browser / Client | — | New React branch in `QuizPartRenderer`; zero data flow, renders `children` only (D-10) |
| Scoring (`calculateTotalScore`) | Browser / Client | — | Existing client-side scoring, unchanged this phase; `ALL_SCORED_QUESTIONS` stays `QuizQuestion[]` so info blocks cannot enter it |
| PHI persistence (`submissions` table, `/api/quiz/submit`) | API / Backend, Database | — | **Explicitly out of scope this phase.** No route file is touched. The only interaction is that `visibleAnswers()`-filtered `answers` is what eventually reaches the POST body Phase-1's route already validates — the shape of `answers` (`Record<string, ...>`) is unchanged |

This map confirms the scope signal CONTEXT.md and the phase notes already assert: every capability
in this phase lives entirely in the Browser/Client tier. If a plan produced by this research touches
`app/routes/api.*`, `app/lib/db.ts`, or `app/lib/submissions.ts`, that is drift — flag it rather than
building it.

## Project Constraints (from CLAUDE.md)

- **PHI boundary (rule 2, 3, 4):** Never write PHI to Shopify. Never add Google Workspace to the PHI
  path. Never add trackers/analytics to any PHI-collecting page. This phase touches none of those
  surfaces — verified: no route, no API call, no new dependency is needed to implement `required`,
  `showIf`, or the info-block type.
- **No new third-party dependency on the quiz page without approval.** D-10 already locks this: info
  block content is structured data (`heading` + `string[]` paragraphs, optional bullet list),
  rendered as React children so escaping is automatic. Adopting a form-schema library (SurveyJS,
  react-jsonschema-form, Formily) or a markdown/sanitizer package is explicitly rejected — see
  "Don't Hand-Roll" below for why the *design ideas* are still worth borrowing without the library.
- **PR-style review required** for anything touching `app/lib/db.ts`, `app/lib/submissions.ts`,
  `app/routes/api.*`, customer auth, PDF generation, or `app/lib/shopify/metafields.ts`. None of
  those files are in this phase's blast radius (confirmed: six files only, per CONTEXT.md and
  re-confirmed by reading `QuizContainer.tsx` in full during this research pass).
- **Tests must pass before pushing** — `npm run typecheck && npm test`. Baseline confirmed clean
  during this research pass: `npm run typecheck` exits 0.
- **Feature branch required**, Andrew merges. Branch naming: `phase-2-<description>` per the
  project's stated convention for post-MVP work (this phase is pre-MVP numbered work, but the
  existing `thread-*` convention was Phase-1-specific; `phase-2-quiz-schema-foundation` or similar
  follows the documented pattern for phase work).
- **Error responses must never leak PHI or `dbErr.message`.** Not triggered by this phase (no route
  changes), but worth restating as a boundary: if any plan task drifts toward touching
  `api.quiz.submit.tsx` to "wire up" `visibleAnswers()`, stop — the wiring happens entirely in
  `QuizContainer.tsx`, which already owns `buildPayload()`.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCH-01 | A quiz question can declare `required: true`, a `showIf` visibility predicate, and an info/static content type, all expressible declaratively in `app/lib/quiz/types.ts` | See "Standard Stack" (type shapes), "Architecture Patterns" (discriminated union pattern, evaluator module), "Code Examples" |
| SCH-02 | No question-ID literals remain in `QuizPartRenderer.tsx` — the display hardcode at `:36-38` and the `isPartComplete` hardcodes at `:276-278,295-299` are expressed through SCH-01 with identical behavior | See "Common Pitfalls" (all four hardcode sites, not just the two SCH-02 cites — D-13 already corrects this), "Validation Architecture" (non-vacuous proof strategy for "identical behavior") |

## Standard Stack

### Core

No new packages. This phase uses only what is already installed:

| Library | Version (confirmed installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 `[VERIFIED: package.json]` | Discriminated unions, `is`-type predicates, exhaustive `switch` narrowing | Already the project's language; strict mode is on (`tsconfig.json`), which is what makes the compiler-enforcement argument in D-09 actually hold |
| React | 18.3.1 `[VERIFIED: package.json]` | Renders `QuizItem[]`, including the new info-block branch | Already the project's UI library |
| Vitest | 3.2.4 `[VERIFIED: package.json]` | Unit tests for the new evaluator module and updated `QuizPartRenderer.test.ts` | Already the project's test runner; config at `vitest.config.ts` includes `app/**/*.test.ts` and `tests/**/*.test.ts` |

**Installation:** None required — zero new dependencies for this phase.

**Version verification:** Ran directly against the installed lockfile rather than the registry,
since no new package is being added:
```
grep -E '"(typescript|vitest|react|react-router)"' package.json
```
Confirmed versions above match what's already locked in `package.json`. `npm run typecheck` (`tsc
--noEmit` via `react-router typegen && tsc --noEmit`) exits 0 against current `main`, establishing
the pre-phase baseline this phase must preserve.

### Supporting

None. No routing, validation, or serialization library changes are needed — `QuizAnswers` stays a
flat `Record<string, string | string[] | number>` (D-11; info blocks never acquire a key).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Object-shape `showIf: { questionId, equals }` (D-01, locked) | A parsed boolean-expression string (SurveyJS `visibleIf: "{taking_meds} = 'yes'"`) | Locked decision already rejects this — a string expression needs its own parser/evaluator (attack surface, testability cost) for zero benefit at 3-operator scale. Not a live option; recorded for completeness only. |
| Object-shape `showIf` (locked) | JSON Schema `if/then/else` composed at the schema level | JSON Schema's conditional keywords operate on the *whole document* shape (required fields, nested schema swaps), not per-field visibility toggling in a React tree — wrong abstraction level for "hide this one form control." Also introduces the `if`-without-`then`-is-ignored footgun noted in Common Pitfalls. Not adopted; the *lesson* (re-evaluate on every value change, described below) is. |
| Hand-written `evaluateShowIf` (recommended) | A form library (react-jsonschema-form, Formily, SurveyJS) | Locked out by CLAUDE.md's "no new dependency on PHI-adjacent surface without approval" and by D-10's explicit rejection of a rendering/sanitizer dependency for the info block. A general form library would also re-admit a far larger operator vocabulary than the 3 this phase needs, which is untested surface area in a load-bearing file — the same argument D-02 already made against composition operators. |

## Package Legitimacy Audit

Not applicable — this phase installs zero external packages. No `slopcheck` run is required; the
Package Legitimacy Gate protocol is skipped per its own preconditions ("whenever this phase installs
external packages").

## Architecture Patterns

### System Architecture Diagram

```
QuizContainer (React state: answers: QuizAnswers)
   │
   │  passes items (QuizItem[]) + answers down
   ▼
QuizPartRenderer
   │
   ├─ for each item in items:
   │     evaluateShowIf(item.showIf, answers) ──► visible? render : skip
   │     (reads RAW answers state — never the filtered visibleAnswers() output)
   │
   ├─ QuizQuestion branch: existing per-type switch, now reads
   │     item.exclusive instead of isExclusiveNoneQuestion() / literal "none"
   │
   └─ QuizInfoBlock branch (new): renders heading + paragraphs + optional
         bullet list as plain React children — no answer collection, no
         onAnswerChange call, cannot reach `answers`

isPartComplete(items, answers)          ◄── same evaluator functions
   │  for each visible (evaluateShowIf-true) item:
   │     if QuizInfoBlock → skip (no required check possible — D-12)
   │     if QuizQuestion  → requiredness = item.required ?? true (D-05)
   │                        isAnswered(item, answers[item.id]) must be true
   ▼
returns boolean → gates the "Next" button in QuizContainer

QuizContainer boundary points (D-03 — TWO applications of visibleAnswers):
   │
   ├─ goToOutcome() / buildPayload() score computation:
   │     const visible = visibleAnswers(ALL_ITEMS, answers)
   │     calculateTotalScore(ALL_SCORED_QUESTIONS, visible)
   │
   └─ buildPayload() POST body construction:
         const visible = visibleAnswers(ALL_ITEMS, answers)
         return { ..., answers: visible, ... }   ──► POST /api/quiz/submit
                                                       (route itself is untouched
                                                        this phase — shape of
                                                        `answers` is unchanged)
```

A reader tracing "patient answers a question" end to end: `onAnswerChange` (existing, unchanged)
writes into `answers` React state → `QuizPartRenderer` re-renders, re-running `evaluateShowIf` for
every item against the new `answers` → `isPartComplete` re-runs the same evaluator to decide
whether "Next" is enabled → on submit, `visibleAnswers()` runs **once more**, over the **same**
`answers` state, to strip anything that is not currently visible before it reaches scoring or the
network. Two different evaluations of "is this item currently visible" (render-time via
`evaluateShowIf` inside `isPartComplete`/`QuizPartRenderer`, and boundary-time via
`visibleAnswers`) are two call sites of **the same function**, not two different functions — this is
what D-07's "one shared predicate" principle extends to.

### Recommended Project Structure

No new directories. One new file:

```
app/lib/quiz/
├── types.ts        # MODIFIED: QuizItem union, QuizInfoBlock, required/showIf/exclusive fields
├── questions.ts     # MODIFIED: no behavior change required, but existing 20 questions may pick
│                     #   up explicit showIf on med_list/med_control (see Code Examples)
├── schema.ts         # NEW — isAnswered, evaluateShowIf, visibleAnswers (Claude's discretion
│                     #   per CONTEXT.md, but this is the natural seam: pure functions, no React
│                     #   import, consumed by both QuizPartRenderer.tsx and QuizContainer.tsx)
├── scoring.ts        # UNCHANGED signature; still takes QuizQuestion[], never QuizItem[]
└── ...

app/components/quiz/
├── QuizPartRenderer.tsx        # MODIFIED: items: QuizItem[] prop, info-block branch,
│                                #   evaluateShowIf/isAnswered replace all 4 hardcodes + 5 "none" literals
├── QuizPartRenderer.test.ts    # MUST stay green unmodified (behavior-identical proof)
└── QuizContainer.tsx           # MODIFIED: QUIZ_PARTS type widens to QuizItem[][], two
                                  #   visibleAnswers() call sites added
```

### Pattern 1: Discriminated union with a compiler-enforced narrow subtype

**What:** `QuizItem = QuizQuestion | QuizInfoBlock`, discriminated on a `kind` (or similar) field.
`ALL_SCORED_QUESTIONS` stays typed `QuizQuestion[]`, so `QuizInfoBlock` values are structurally
excluded at the type level, not by convention.

**When to use:** Exactly D-09's case — when an invariant ("info blocks never score, never carry
`required`, never emit an `answers` key") must survive a reviewer not noticing a violation, because
this codebase has already shipped a live security bug (the `entry.theme.tsx` open redirect) that two
independent reviews cleared.

**Example (verified against TS 5.9.3's stable discriminated-union + type-predicate behavior — this
is a foundational, version-stable TS feature, not a recent addition):**
```typescript
// app/lib/quiz/types.ts

export type QuestionType =
  | "checkbox_multi" | "radio_multi" | "severity_0_3" | "frequency_0_4"
  | "bother_0_4" | "yesno" | "text_input" | "control_0_3";

export interface QuizQuestion {
  kind: "question";           // discriminant
  id: string;
  type: QuestionType;
  text: string;
  subtitle?: string;
  options?: QuizOption[];
  excludeFromScore?: string[];
  order: number;
  part: number;
  scoreWeight?: number;
  required?: boolean;         // SCH-01 — defaults to true (D-05), so omission is the common case
  showIf?: ShowIfCondition;   // SCH-01
}

export interface QuizInfoBlock {
  kind: "info";                // discriminant — same union tag pattern, no QuestionType overlap
  id: string;                  // still needs a stable React key + a home for `order`/`part`, but
                                //   is NEVER used as an answers-map key (D-11)
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
  order: number;
  part: number;
  showIf?: ShowIfCondition;    // D-12 — composes with showIf like a question does
}

export type QuizItem = QuizQuestion | QuizInfoBlock;

export interface QuizOption {
  value: string;
  label: string;
  score?: number;
  exclusive?: boolean;         // D-13/D-14 — declared here, independent of excludeFromScore
}

export type ShowIfOperator = "equals" | "isAnswered" | "includes";  // D-02 — exactly these three

export interface ShowIfCondition {
  questionId: string;
  equals?: string;      // used when operator implied by which field is set, OR add explicit `op`
  includes?: string;
  // isAnswered has no payload — its presence as a discriminant needs a decision (see Open Questions)
}
```

**Compiler enforcement in practice — a type predicate that narrows `QuizItem[]` to
`QuizQuestion[]`:**
```typescript
// app/lib/quiz/schema.ts
import type { QuizItem, QuizQuestion } from "./types";

export function isQuestion(item: QuizItem): item is QuizQuestion {
  return item.kind === "question";
}

// Usage anywhere a QuizItem[] needs to become QuizQuestion[] for scoring:
const questionsOnly: QuizQuestion[] = items.filter(isQuestion);
// `questionsOnly` is now provably QuizQuestion[] to the compiler — calling
// calculateTotalScore(questionsOnly, answers) type-checks; calling it with
// the original QuizItem[] does NOT, because calculateTotalScore's signature
// stays `(questions: QuizQuestion[], answers: QuizAnswers) => number` (unchanged).
```
This `Array.prototype.filter` + `is`-predicate combination is the standard TypeScript idiom for
"narrow an array by a runtime check" — `filter` has a built-in overload that accepts a type-predicate
callback and returns the narrowed array type, no `as` cast needed anywhere in the call chain.
`[VERIFIED: TypeScript language behavior, stable since TS 2.x — Array.prototype.filter type-predicate
overload]`

### Pattern 2: Exhaustive switch with a `never` assertion (extend existing pattern)

**What:** `scoreQuestion`'s existing `switch (question.type) { ...; default: return 0 }` and
`QuizPartRenderer`'s per-type switch already enumerate every `QuestionType`. Adding `QuizInfoBlock`
handling should NOT be a case inside that same switch (info blocks don't have a `QuestionType`) — it
must be a branch *above* the type switch, gated on `item.kind`.

**When to use:** Any time a new discriminant value is added to a union that already has an
exhaustive switch elsewhere (here: `QuestionType` inside `scoreQuestion`) — the `default: return 0`
already makes `scoreQuestion` degrade safely for an unknown `QuestionType`, but that is not a
substitute for keeping `QuizInfoBlock` values from reaching `scoreQuestion` at all (D-09's actual
requirement is compile-time exclusion, not graceful runtime degradation).

**Example — recommended shape for `QuizPartRenderer`'s render loop:**
```typescript
items.map((item) => {
  if (!evaluateShowIf(item.showIf, answers)) return null;

  if (item.kind === "info") {
    return <InfoBlockCard key={item.id} block={item} />;   // new component, D-10 shape only
  }

  // item is now narrowed to QuizQuestion by the `kind === "info"` early return
  switch (item.type) {
    case "checkbox_multi":
    case "radio_multi": {
      const exclusiveNone = item.options?.some((o) => o.exclusive) ?? false;  // D-13, replaces
                                                                                 // isExclusiveNoneQuestion()
      // ...
    }
    // ... existing cases unchanged
  }
});
```

### Anti-Patterns to Avoid

- **Do not put the boundary filter (`visibleAnswers`) inside the render loop.** It is a *display*
  vs. *data-shape* distinction: `evaluateShowIf` decides what the patient currently sees;
  `visibleAnswers` decides what leaves React state toward scoring/network. Calling `visibleAnswers`
  during render would silently blank out fields the patient is actively looking at whenever a
  parent toggle flips, which contradicts D-03's explicit "answer stays in React state" guarantee.
- **Do not give `QuizInfoBlock` a `required` field, even as `required?: false`.** The whole point of
  the discriminated union (D-09) is that `required` is syntactically impossible to write on an info
  block. If a future task adds `required` to `QuizInfoBlock`'s interface "just in case," it defeats
  the pattern — the compiler can no longer catch the mistake for you.
- **Do not derive `exclusive` from `excludeFromScore`.** D-14 already proves these are independent
  with a real example (`timing_season`'s `only_rarely`). Treat this as load-bearing: a plan or task
  that writes `exclusive: question.excludeFromScore?.includes(opt.value)` anywhere is wrong by
  construction, not just by style.
- **Do not add a `notEquals` or `allOf`/`anyOf` operator speculatively.** D-02's vocabulary was sized
  against named Phase 3/4 consumers. Untested branches in `showIf`'s evaluator are exactly the kind
  of latent risk this phase exists to remove from `QuizPartRenderer.tsx`, not reintroduce in a new
  file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this array/string/number actually answered" | A bespoke check per call site (the current pattern — `Array.isArray(a)`, `typeof a === "number"`, `a !== "yes" && a !== "no"`, `typeof a === "string" && a.trim()`, scattered across `isPartComplete`'s switch) | One `isAnswered(item, value)` predicate (D-07), type-aware via `item.type`, consumed by both the required check and the `showIf.isAnswered` operator | Two independent implementations of "answered" is exactly the drift D-07 calls out — HIST-02 needs the required check and the reveal-trigger to agree, and duplication is how they'd silently stop agreeing |
| Exclusive-option toggling (checkbox that clears its siblings) | A new per-option-set special case for each future exclusive option (HIST-01 needs one too, per D-15) | The single `exclusive: true` flag + one generic handler already described in D-13 | Confirmed by D-15: the *next* occurrence of this pattern (HIST-01's "none of the above") would silently do nothing today if it doesn't spell its value exactly `"none"` — a flag makes correctness independent of string spelling |
| A parser/interpreter for `showIf` conditions | Any string-expression mini-language (`"{taking_meds} = 'yes'"` style, cf. SurveyJS) | The plain object shape from D-01, evaluated by direct field access — no parsing, no `eval`, no injection surface | Locked by D-01 specifically because the codebase has already shipped one XSS (Phase 1) and one open redirect (Phase 1) from surfaces that looked simpler than they were; a hand-rolled expression parser is unnecessary attack surface for 3 operators |
| Escaping/sanitizing info-block content | Any markdown renderer or `dangerouslySetInnerHTML` + sanitizer pairing | Plain React children — `paragraphs.map(p => <p>{p}</p>)` — since JSX auto-escapes string children | D-10 locks this explicitly; Phase 1 closed a reflected XSS on this exact page (`jsonForScript` + nonce CSP) — reopening an HTML sink here would need its own security review the phase doesn't have budget for |

**Key insight:** every "don't hand-roll" item above is really the same lesson restated: this
codebase has a documented history (Phase 1) of security-relevant bugs surviving human review because
the code *looked* like a small, obviously-correct special case. The fix pattern that phase already
validated — move the invariant into the type system or into one shared function instead of N
per-call-site copies — is the same fix pattern this phase is applying one layer up (schema instead
of navigation).

## Common Pitfalls

### Pitfall 1: Treating SCH-02's two line-cites as the complete hardcode inventory

**What goes wrong:** A plan scoped only to `:36-38` and `:276-278,295-299` ships and still leaves
`isExclusiveNoneQuestion` (`:26-28`) and the five `"none"` string literals (`:47, 57, 71, 74, 75`) in
the renderer — technically satisfying SCH-02's line references while violating its actual text ("no
question-ID literals remain").

**Why it happens:** SCH-02's line numbers were written before the exclusive-option mechanism was
designed; D-13 already corrects this in CONTEXT.md, but a plan built primarily from REQUIREMENTS.md
without cross-referencing CONTEXT.md's decisions could reintroduce the gap.

**How to avoid:** Treat D-13/D-14/D-15/D-16 as load-bearing requirements text, not optional
elaboration. A task list that doesn't touch `:26-28` and all five `"none"` sites is incomplete.

**Warning signs:** `grep -n '"none"' app/components/quiz/QuizPartRenderer.tsx` or
`grep -n 'isExclusiveNoneQuestion\|timing_triggers\|symptoms_nasal\|symptoms_eye\|symptoms_sinus'
app/components/quiz/QuizPartRenderer.tsx` returning any match after the phase completes.

### Pitfall 2: Evaluating `showIf` against the wrong answers object

**What goes wrong:** If `evaluateShowIf` is accidentally called with the `visibleAnswers()`-filtered
answer set instead of raw React state (or vice versa — calling `visibleAnswers()` with a
render-time-only evaluation), chained conditionals break: a question whose visibility depends on a
currently-hidden question's answer would see that answer as always-absent, permanently hiding the
downstream question even after the parent becomes visible and answered.

**Why it happens:** Both functions take an `answers`-shaped argument and both are about
"visibility," so the type signatures alone don't prevent mixing them up.

**How to avoid:** Keep `evaluateShowIf` and `visibleAnswers` in the same module with names that make
the distinction obvious in code review (e.g., doc comments stating "reads live state" vs. "boundary
filter, call only at the two D-03 sites"). Consider a lint-visible convention: `visibleAnswers` is
imported ONLY in `QuizContainer.tsx`, never in `QuizPartRenderer.tsx`.

**Warning signs:** A test where hiding-then-reshowing a parent question loses the child's typed
answer (this should NOT happen per D-03 — the answer survives in React state) or where a chained
conditional (Pitfall 4 below) never becomes visible even on a valid answer path.

### Pitfall 3: `required` defaulting to `true` silently breaking `QuizInfoBlock`-adjacent code

**What goes wrong:** If `isPartComplete`'s loop iterates `items` and calls `item.required ?? true`
without first checking `item.kind === "info"`, an info block (which has no `required` field at all —
TypeScript would actually catch a direct property read as a type error since `QuizInfoBlock` doesn't
declare `required`, but a loosely-typed intermediate variable or an `as QuizQuestion` cast could
silently reintroduce the bug at runtime) would be treated as an always-required, always-unanswered
question, permanently blocking "Next."

**Why it happens:** `required` defaulting to `true` (D-05) is specifically sized for
`QuizQuestion` — it has no meaning for `QuizInfoBlock`, which is exactly why D-12 requires
`isPartComplete` to "skip it without special-casing." The word "without special-casing" is doing
real work: the fix is the discriminated union's `kind` narrow (`if (!isQuestion(item)) continue;` /
`if (item.kind === "info") continue;`), not a new `if (item.kind === "info") return true` branch
bolted onto the existing switch (which WOULD be a special case, just a different one).

**How to avoid:** Structure `isPartComplete` as: filter to visible items via `evaluateShowIf` → for
each visible item, narrow via `isQuestion()` and `continue`/skip non-questions BEFORE any
`required`/`isAnswered` logic runs, so the info-block skip is one line at the top of the loop body,
not a case in the requiredness switch.

**Warning signs:** A part containing an info block never becomes "complete" even with every real
question answered.

### Pitfall 4: Chained `showIf` where the intermediate question is itself conditionally hidden

**What goes wrong:** Question C's `showIf` references question B's answer. Question B's own
`showIf` references question A. If a patient answers A such that B becomes visible, then answers B,
then changes A such that B becomes hidden again — B's answer remains in React state (D-03), so C's
`showIf` (which only reads `answers.B`, not B's current visibility) would still see B's stale answer
and could incorrectly keep C visible even though B — the question C logically depends on — is no
longer shown to the patient.

**Why it happens:** `evaluateShowIf` as specified only takes a single `{ questionId, operator,
value }` triple; it has no transitive-visibility awareness (does the referenced question need to
ALSO currently be visible for its answer to count?). D-01 and D-02 don't specify this, and it's a
genuine open question this phase's evaluator design should resolve deliberately rather than by
accident.

**How to avoid:** This phase (Phase 2) has exactly zero chained conditionals in its actual scope —
`med_list`/`med_control` both depend directly on `taking_meds`, which has no `showIf` of its own.
So this pitfall cannot manifest with today's question set. It becomes live starting Phase 3
(HIST-04's PCP branch) or Phase 4 (TEST-02/03). **Recommendation for this phase:** decide and
document the rule now (either "a `showIf` condition is satisfied only if BOTH the condition holds
AND the referenced question is itself currently visible" — the safer, composable rule — or
explicitly punt with a comment and a tracked follow-up), and add one test proving the chosen
behavior, even though no production question exercises it yet. Do not leave the behavior
undefined-by-omission; that is exactly the kind of gap D-04 already had to think hard about for
dangling references.

**Warning signs:** None observable with today's 20 questions — this is a forward-looking pitfall to
document, not a currently-reproducible bug. Flagged as `[ASSUMED]`-adjacent design guidance rather
than a verified defect (see Assumptions Log).

### Pitfall 5: `getQuestionById`'s scope not covering all `QuizItem[]`

**What goes wrong:** `getQuestionById` (`questions.ts:261`) currently searches
`[...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY]`. If `QuizItem[]` info blocks are added to
`QUIZ_PARTS` and the D-04 dangling-reference test only validates `showIf.questionId` against
`getQuestionById`'s current search scope, a `showIf` that (incorrectly) targets an info block's
`id` would either falsely pass (if info blocks are added to the search array) or the test wouldn't
catch a real typo pointing at a valid-looking but wrong id.

**Why it happens:** `getQuestionById`'s name and current implementation both assume "every id in
the system is a `QuizQuestion`." Once `QuizItem` exists, that assumption needs re-verifying: info
blocks have `id` too (needed for React `key`), but `showIf.questionId` should only ever be able to
resolve to a `QuizQuestion` (an info block has no answer, so a condition referencing one would be
meaningless).

**How to avoid:** Keep `getQuestionById`'s return type `QuizQuestion | undefined` and keep its
search scope to `QuizQuestion` items only (`items.filter(isQuestion)`), even after `PART6` and
`QUIZ_PARTS` widen to `QuizItem[]`. The D-04 test should assert `getQuestionById(c.questionId) !==
undefined` for every `showIf` in the system — which, with this scoping, naturally also proves "no
`showIf` points at an info block."

**Warning signs:** A `showIf.questionId` that resolves successfully but points at something that
isn't actually a `QuizQuestion` (would require loosening `getQuestionById`'s current behavior, so
this is a "don't introduce this" pitfall, not a currently-live one).

## Code Examples

### `isAnswered` — the shared predicate (D-07, D-06, D-08)

```typescript
// app/lib/quiz/schema.ts
import type { QuizQuestion } from "./types";

/**
 * Whether `value` counts as "this question has been answered," per D-06/D-08:
 * - checkbox_multi / radio_multi: a non-empty array. [] does NOT count (D-06 — deliberate
 *   behavior change; today's isPartComplete only checked Array.isArray).
 * - text_input: a non-empty string after trim (D-08 — whitespace-only stays blocked,
 *   matching today's two existing med_list tests).
 * - severity_0_3 / frequency_0_4 / bother_0_4: any number (0 is a valid, meaningful answer —
 *   "None" severity is still an answer).
 * - yesno: exactly "yes" or "no".
 * - control_0_3: a non-empty string matching one of the question's option values.
 */
export function isAnswered(question: QuizQuestion, value: string | string[] | number | undefined): boolean {
  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi":
      return Array.isArray(value) && value.length > 0;
    case "severity_0_3":
    case "frequency_0_4":
    case "bother_0_4":
      return typeof value === "number";
    case "yesno":
      return value === "yes" || value === "no";
    case "text_input":
      return typeof value === "string" && value.trim().length > 0;
    case "control_0_3":
      return typeof value === "string" && value.length > 0;
    default:
      return false;
  }
}
```

### `evaluateShowIf` — three operators, fail-open on dangling reference (D-01, D-02, D-04)

```typescript
// app/lib/quiz/schema.ts
import type { QuizAnswers, ShowIfCondition } from "./types";
import { getQuestionById } from "./questions";

/**
 * Evaluates a showIf condition against the CURRENT (unfiltered) answers state.
 * Always call this with raw React `answers` state — never with visibleAnswers() output.
 *
 * D-04: if `condition.questionId` does not resolve to a real question, this fails OPEN
 * (returns true — the item renders). A dedicated test (see Validation Architecture) asserts
 * every showIf.questionId in the live question set resolves, so this branch should be
 * unreachable in production; it exists as a safety net, not a designed code path.
 */
export function evaluateShowIf(condition: ShowIfCondition | undefined, answers: QuizAnswers): boolean {
  if (!condition) return true; // no condition = always visible

  const target = getQuestionById(condition.questionId);
  if (!target) return true; // D-04 — dangling reference fails OPEN, not closed

  const value = answers[condition.questionId];

  if (condition.equals !== undefined) {
    return value === condition.equals;
  }
  if (condition.includes !== undefined) {
    return Array.isArray(value) && value.includes(condition.includes);
  }
  if (condition.isAnswered) {
    return isAnswered(target, value);
  }
  return true;
}
```
Note the `equals` / `includes` / `isAnswered` presence-based dispatch above is one workable shape
for D-02's three operators; an alternative is an explicit `op: "equals" | "includes" | "isAnswered"`
discriminant field, which is arguably more literal to D-01's "declarative data object" framing and
easier to exhaustively test (a `switch (condition.op)` can be checked for exhaustiveness the same
way `QuestionType` is). This is flagged in Open Questions — either shape satisfies D-01/D-02; the
choice is a planner/implementer style call, not a locked decision.

### `visibleAnswers` — the boundary pass (D-03)

```typescript
// app/lib/quiz/schema.ts
import type { QuizAnswers, QuizItem } from "./types";

/**
 * Returns a new QuizAnswers containing only entries for items that are CURRENTLY visible
 * per evaluateShowIf, given the same `answers` state. Call this exactly at the two D-03
 * boundaries in QuizContainer.tsx:
 *   1. Immediately before calculateTotalScore(...)
 *   2. Immediately before constructing the POST /api/quiz/submit payload
 * Never call this before evaluateShowIf/isPartComplete during rendering — see Pitfall 2.
 */
export function visibleAnswers(items: QuizItem[], answers: QuizAnswers): QuizAnswers {
  const visibleIds = new Set(
    items.filter(isQuestion).filter((q) => evaluateShowIf(q.showIf, answers)).map((q) => q.id)
  );
  const result: QuizAnswers = {};
  for (const [id, value] of Object.entries(answers)) {
    if (visibleIds.has(id)) result[id] = value;
  }
  return result;
}
```

### Applying `visibleAnswers` at both `QuizContainer.tsx` call sites (D-03)

```typescript
// app/components/quiz/QuizContainer.tsx — buildPayload (existing function, ~line 185)
const buildPayload = useCallback(
  (extra?: { personal_history?: string[]; family_history?: string[] }) => {
    if (!patientState || !symptomProfileId) throw new Error("Missing patient context");
    const visible = visibleAnswers(ALL_ITEMS, answers);          // NEW — D-03 boundary #1 & #2
    const s = score ?? calculateTotalScore(ALL_SCORED_QUESTIONS, visible);
    const b = scoreBracket ?? getScoreBracket(s);
    return {
      // ...unchanged fields...
      answers: visible,                                          // was: answers
      // ...
    };
  },
  [patientState, symptomProfileId, patientInfo, answers, score, scoreBracket, startTime]
);

// goToOutcome (existing function, ~line 234) — also computes a displayed score, needs the
// same treatment so the displayed score matches what buildPayload will later compute:
const goToOutcome = useCallback(() => {
  const visible = visibleAnswers(ALL_ITEMS, answers);             // NEW
  const s = calculateTotalScore(ALL_SCORED_QUESTIONS, visible);
  const b = getScoreBracket(s);
  setScore(s);
  setScoreBracket(b);
  setStep("outcome");
}, [answers]);
```
`ALL_ITEMS` above is a new export (all `QuizItem[]` across every part, analogous to today's
`ALL_SCORED_QUESTIONS` but for the full item set including any info blocks and Part 6) — needed
because `visibleAnswers` must know about every item that *could* be in `answers`, not just the
scored ones, to correctly decide what to strip. This is a **new decision point** not explicit in
CONTEXT.md's Claude's Discretion list; see Open Questions.

**Third call site not mentioned in D-03 but present in the code:** `QuizContainer.tsx`'s Test Mode
button (`~line 629`) also calls `calculateTotalScore(ALL_SCORED_QUESTIONS, sample)` directly with a
synthetic, fully-answered sample object. Test Mode bypasses `isPartComplete`/rendering entirely
(it calls `setStep("outcome")` directly), so applying `visibleAnswers` there is optional for
correctness (the sample data has no hidden/conditional fields left un-filtered — `taking_meds: "no"`
with no `med_list`/`med_control` keys present at all) but applying it anyway is one line and keeps
all three `calculateTotalScore` call sites consistent, which is worth doing for the "identical
behavior" proof this phase needs anyway.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 `[VERIFIED: package.json]` |
| Config file | `vitest.config.ts` — `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]` |
| Quick run command | `npx vitest run app/lib/quiz/schema.test.ts app/components/quiz/QuizPartRenderer.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCH-01 | `required` defaults true; explicit `required: false` opts out | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "required"` | ❌ Wave 0 — new `schema.test.ts` |
| SCH-01 | `showIf` with `equals` shows/hides correctly | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "equals"` | ❌ Wave 0 |
| SCH-01 | `showIf` with `isAnswered` shows/hides correctly (non-empty vs. empty) | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "isAnswered"` | ❌ Wave 0 |
| SCH-01 | `showIf` with `includes` shows/hides correctly | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "includes"` | ❌ Wave 0 |
| SCH-01 | Dangling `showIf.questionId` fails a dedicated reference-integrity test (D-04) | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "reference integrity"` | ❌ Wave 0 |
| SCH-01 | Dangling `showIf.questionId` fails OPEN at runtime if it somehow reaches `evaluateShowIf` (D-04) | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "fails open"` | ❌ Wave 0 |
| SCH-01 | `visibleAnswers` strips hidden-question entries, keeps visible ones, preserves typed text of a currently-hidden question in the SOURCE `answers` object it was given (proves it doesn't mutate) | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "visibleAnswers"` | ❌ Wave 0 |
| SCH-01 | Info block renders heading/paragraphs/bullets, collects no answer, appears in DOM only when its `showIf` (if any) is satisfied | unit (React) | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts -t "info block"` | ❌ Wave 0 — extend existing test file |
| SCH-02 | No `"none"` string literal remains in `QuizPartRenderer.tsx` | static/grep-as-test | `grep -c '"none"' app/components/quiz/QuizPartRenderer.tsx` must print `0` | ❌ Wave 0 — encode as an assertion, not a manual grep (see below) |
| SCH-02 | No question-ID literal (`timing_triggers`, `symptoms_nasal`, `symptoms_eye`, `symptoms_sinus`, `med_list`, `med_control`, `taking_meds` used as an equality-literal in the RENDERER file, not as a data value in `questions.ts`) remains | static/grep-as-test | see "Non-Vacuous Proof Strategy" below | ❌ Wave 0 |
| Success Criterion 4 | `med_list`/`med_control` conditional behavior is IDENTICAL after re-expression | regression | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts` — **must pass unmodified**, per CONTEXT.md's explicit instruction that editing this file is itself evidence of a behavior change | ✅ exists — `QuizPartRenderer.test.ts`, 12 assertions |
| D-06 | Empty array `[]` no longer counts as answered for a required checklist question | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "empty array"` | ❌ Wave 0 — this is a NEW test, since no existing test exercises `[]` (confirmed absent by CONTEXT.md's scout) |
| D-16 | Clicking an already-selected exclusive option deselects to `[]`; Next then correctly disables | unit (React) | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts -t "exclusive deselect"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run app/lib/quiz/schema.test.ts app/components/quiz/QuizPartRenderer.test.ts` (fast — schema module + renderer only, seconds)
- **Per wave merge:** `npm run typecheck && npm test` (full suite, 173+ tests — must stay green throughout; this phase should net-add tests, never remove or skip any)
- **Phase gate:** Full suite green (`npm test`), `npm run typecheck` clean, AND the non-vacuous proof below re-run one final time before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `app/lib/quiz/schema.test.ts` — new file, covers `isAnswered`, `evaluateShowIf` (all 3
      operators + dangling-reference cases), `visibleAnswers`
- [ ] Extend `app/components/quiz/QuizPartRenderer.test.ts` with info-block rendering,
      exclusive-option deselect-to-`[]`, and the D-06 empty-array-blocks-required case — but the
      12 EXISTING assertions must remain byte-identical and passing throughout, per CONTEXT.md
- [ ] A literal-inventory static check (see Non-Vacuous Proof Strategy) — implement as a Vitest
      test that reads `QuizPartRenderer.tsx`'s source text and asserts zero matches for the
      forbidden literal set, rather than a manual `grep` a human has to remember to run
- [ ] No framework install needed — Vitest is already configured and running 173 tests

### Non-Vacuous Proof Strategy

This project has been burned by tests that pass trivially (see STATE.md's `grep -c` counts-lines
trap, hit by three independent executors; see also the `entry-theme-contract.test.ts` pattern of
proving a test fails against the PRE-fix file before trusting that it passes against the POST-fix
file). Apply the same discipline here, on two axes:

**1. "No literals remain" must be proven by a test that FAILS against the current file, not just
passes against the future one.**

Before writing any implementation code, write the literal-inventory test and run it against
`QuizPartRenderer.tsx` as it exists TODAY. It should fail, listing the exact hardcodes CONTEXT.md
already inventoried:
```typescript
// tests/quiz-part-renderer-no-literals.test.ts (or co-located)
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const SOURCE = readFileSync("app/components/quiz/QuizPartRenderer.tsx", "utf-8");

describe("QuizPartRenderer.tsx has no question-ID or 'none'-value literals (SCH-02)", () => {
  it('contains zero occurrences of the string literal "none"', () => {
    // Use split(needle).length - 1 for OCCURRENCE counting, not a line-count regex —
    // this project has already been burned once by grep -c counting matching LINES,
    // not occurrences (STATE.md, session 2026-08-09).
    expect(SOURCE.split('"none"').length - 1).toBe(0);
  });

  it("contains zero occurrences of any of the four hardcoded question IDs as string literals", () => {
    for (const id of ["timing_triggers", "symptoms_nasal", "symptoms_eye", "symptoms_sinus"]) {
      expect(SOURCE.split(`"${id}"`).length - 1).toBe(0);
    }
  });

  it('contains zero occurrences of "med_list" or "med_control" as equality-check literals', () => {
    for (const id of ["med_list", "med_control"]) {
      expect(SOURCE.split(`"${id}"`).length - 1).toBe(0);
    }
  });
});
```
Run this FIRST, confirm it fails with the expected non-zero counts against current `main` (proving
it is measuring something real, not vacuously passing), THEN implement the refactor, THEN confirm
it passes. Record both the pre-fix failure output and the post-fix pass in the plan's verification
notes — this mirrors the pattern `tests/entry-theme-contract.test.ts` already established in Phase 1
("proven non-vacuous (all 6 assertions fail against the pre-fix file)").

**2. "Identical behavior" must be proven by running the EXISTING, UNMODIFIED test file, not a
rewritten one.**

`QuizPartRenderer.test.ts`'s 12 assertions are the behavior-identical harness by construction — they
were written against the OLD hardcoded implementation and pass today. If they still pass, unmodified,
against the NEW schema-driven implementation, that is strong non-vacuous evidence of behavioral
equivalence (a test suite that would pass against either implementation is not vacuous — it is
exactly the kind of implementation-agnostic regression proof this phase needs). If a plan needs to
MODIFY any of the 12 existing assertions to make them pass, treat that as a signal the refactor
changed real behavior — stop and reconcile with CONTEXT.md's decisions before proceeding, per
CONTEXT.md's own instruction ("If a plan needs to edit it, that is evidence the refactor changed
behavior it should not have").

**3. Additionally prove the D-04 dangling-reference test is itself non-vacuous.**

Write the reference-integrity test to fail first against a deliberately-broken fixture (e.g., a
temporary `showIf: { questionId: "does_not_exist", equals: "yes" }` injected into a test-local
question array — NOT into production `questions.ts`), confirm it fails, then confirm it passes
against the real, correct question set. This proves the test can actually detect the typo class
D-04 exists to prevent, not merely that the current (correct) data happens to pass.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `evaluateShowIf`'s three-operator vocabulary is best expressed with presence-based field dispatch (`equals`/`includes`/`isAnswered` as optional fields checked in sequence) rather than an explicit `op` discriminant field | Code Examples, Architecture Patterns | Low — either shape satisfies D-01/D-02 and is a mechanical rewrite either way; flagged as a planner/implementer choice, not a functional risk |
| A2 | A new `ALL_ITEMS` (or equivalently-scoped) export is needed alongside the existing `ALL_SCORED_QUESTIONS` so `visibleAnswers()` can see every item (including any future info blocks and Part 6) that could have a hidden-but-stored answer, not just the 5 scored parts | Code Examples ("Applying visibleAnswers") | Medium — if `visibleAnswers()` is scoped only to `ALL_SCORED_QUESTIONS`, a hidden Part 6 answer (if Part 6 is re-expressed through the new schema this phase, per CONTEXT.md's "Claude's Discretion" item) would never be stripped, silently defeating D-03 for that part. If Part 6 is NOT touched this phase (left for Phase 3, the other discretion option), this gap doesn't manifest yet but the export should still be named/scoped correctly now so Phase 3 doesn't have to redo it |
| A3 | The chained-conditional transitive-visibility rule (Pitfall 4 — should C's showIf require B to be BOTH answered-as-specified AND currently visible?) has no correct answer derivable from this phase's own question set, since no chain exists in Parts 1–5 today | Common Pitfalls (Pitfall 4) | Medium for Phase 3/4, zero for Phase 2 itself — recommend deciding and testing the rule now while it's cheap, even though nothing in this phase's scope exercises it, rather than letting Phase 3 discover the ambiguity under schedule pressure |
| A4 | Branch naming `phase-2-quiz-schema-foundation` (extrapolated from CLAUDE.md's stated `phase-2-<description>` convention for "post-MVP work") is the right pattern for this phase, even though Phase 2 here is itself part of the v1.0 milestone rather than post-MVP | Project Constraints | Very low — cosmetic; any branch name works as long as it's not `main` and is reviewed via PR per CLAUDE.md |

## Open Questions (ALL RESOLVED — see resolutions below, 2026-08-09)

> **Status:** All three questions were resolved during planning and are binding in the PLAN files.
> They are retained here with their original analysis because the reasoning is still the record of
> *why* each choice was made — but none of them is open.
>
> | # | Question | Resolution | Where |
> |---|----------|------------|-------|
> | 1 | `ShowIfCondition` dispatch shape | **Three-member union.** Keeps D-01's terse literal shape while making a two-operator condition unwritable at the type level. | `02-01-PLAN.md` Task 2 |
> | 2 | Does `visibleAnswers()` need Part 6? | **Yes — Recommendation (a) adopted.** `ALL_ITEMS` is exported and spans every part including Part 6, so `history_personal` / `history_family` pass through untouched. `PART6_MEDICAL_HISTORY` keeps its current content for Phase 3 to replace, but IS covered by the filter. | `02-01-PLAN.md` Task 2; guarded by a dedicated non-vacuous test + negative control in `02-02-PLAN.md` Tasks 1–2 |
> | 3 | Is `id` required on `QuizInfoBlock`? | **Yes — `id: string`, not optional.** | `02-01-PLAN.md` Task 2 |
>
> Question 2 was the consequential one: left unresolved it would have silently stripped two medical
> history answers from the submission payload — a clinical record losing data with no error. It is
> tracked as orchestrator directive DIR-02.

1. **Should `ShowIfCondition` use presence-based operator dispatch or an explicit `op` field?**
   - What we know: D-01/D-02 lock the *shape family* (`{ questionId, equals: "yes" }`) and the
     *vocabulary* (exactly `equals`/`isAnswered`/`includes`), not the literal TypeScript interface.
   - What's unclear: whether `isAnswered` needs a payload (e.g., `isAnswered: true`) to fit the
     presence-based dispatch cleanly, or whether an explicit `op: "equals" | "isAnswered" |
     "includes"` discriminant is cleaner and gets its own exhaustiveness check.
   - Recommendation: either is acceptable; the planner should pick one and the phase's own new
     `schema.test.ts` becomes the enforcement mechanism either way. Lean toward explicit `op` if the
     team wants an exhaustive-switch compiler check on the operator itself (mirrors Pattern 2's
     `QuestionType` switch); lean toward presence-based if the team wants the JSON literal in
     `questions.ts` to read as tersely as D-01's example (`{ questionId: "taking_meds", equals:
     "yes" }` has no redundant `op: "equals"`).

2. **Does `visibleAnswers()` need to know about Part 6 (`PART6_MEDICAL_HISTORY`) this phase?**
   - What we know: CONTEXT.md leaves "whether `PART6_MEDICAL_HISTORY` is re-expressed through the
     new schema in this phase or left for Phase 3" as Claude's Discretion.
   - What's unclear: if Part 6 stays on the OLD `QuizQuestion[]` shape (no `required`/`showIf`) this
     phase, does `visibleAnswers()` need to include it in its "which ids are currently visible"
     computation at all, or can it operate purely over Parts 1–5's `QuizItem[]`? Today's `answers`
     payload includes `history_personal`/`history_family` alongside the Part 1–5 fields, and if
     `visibleAnswers()` is scoped only to Parts 1–5's items, those two keys would be silently
     stripped from the payload (since they wouldn't be in the visible-ids set) — a regression, not a
     no-op.
   - Recommendation: whichever way Part 6 is handled, `visibleAnswers()` must either (a) receive the
     FULL item set across every part including Part 6 (so Part 6's un-conditional questions are
     trivially "always visible" and pass through unchanged), or (b) explicitly whitelist
     non-`QuizItem`-schema keys as pass-through. Option (a) is simpler and should be the default —
     flag this explicitly in the plan regardless of which discretion choice is made for Part 6's
     `showIf`/`required` fields themselves.

3. **Is `id` required on `QuizInfoBlock`, and does it need to be globally unique alongside question
   ids?**
   - What we know: D-09/D-10 specify content shape (`heading`, `paragraphs`, `bullets`) and
     placement (`showIf`, `order`, `part` per D-12) but not explicitly whether info blocks need a
     stable `id`.
   - What's unclear: React needs SOME stable key for the list-render (`items.map(...)`); whether
     that doubles as a semantically meaningful `id` (like questions have) or is purely a rendering
     concern is unresolved.
   - Recommendation: give `QuizInfoBlock` an `id` for the React key and for potential future
     debug/logging use, but explicitly exclude it from `getQuestionById`'s search scope (Pitfall 5)
     so `showIf.questionId` can never accidentally resolve to one.

## Environment Availability

Skipped — this phase has no external dependencies beyond what's already installed and running
(TypeScript, React, Vitest, all confirmed present and passing baseline checks above). No new
service, CLI tool, database, or package manager requirement.

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json` (only
`workflow._auto_chain_active: false` is present), so this section is included per the default-enabled rule.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase touches no auth surface — client-only schema refactor |
| V3 Session Management | No | No session code touched |
| V4 Access Control | No | No route, no access-control logic touched |
| V5 Input Validation | Marginal — yes for the info-block content shape | React's default JSX child-escaping (D-10's chosen mechanism: `paragraphs.map(p => <p>{p}</p>)`) is the standard control here, not a validation library — there is no external input at this layer, since info-block content is authored in `questions.ts` by developers, not submitted by patients |
| V6 Cryptography | No | Not applicable — no crypto in scope |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reintroducing an HTML/markdown sink for info-block content (a future task "improving" D-10's plain-paragraph rendering) | Tampering / Information Disclosure (XSS) | Keep info-block content as plain strings rendered via JSX children only — never `dangerouslySetInnerHTML`. Phase 1 already closed a reflected XSS on this exact page (`/quiz-embed`); reopening a sink here is explicitly out of scope and would need its own security review, per D-10 |
| A hidden question's stale/orphan answer contradicting a later answer in the clinical record (the exact bug D-03 fixes) | Tampering (of clinical data integrity, not an external attacker) | `visibleAnswers()` boundary pass at both the scoring and payload construction points — this IS the mitigation this phase implements; verify both call sites are actually wired (Common Pitfall 2) |
| A dangling `showIf` reference silently omitting a required clinical question from the intake (D-04) | Information Disclosure / data integrity (silent omission is worse than over-collection in this specific clinical-intake context, per D-04's own reasoning) | Fail-open at runtime (question renders) + a build/test-time reference-integrity check that should make the fail-open path unreachable in practice. Both halves must exist — the test predicts most failures; the runtime fallback bounds the blast radius if a typo somehow ships anyway |

This phase does not touch authentication, authorization, session handling, or any PHI-in-transit
surface — its entire threat-relevant surface is (a) not reopening the closed XSS sink and (b) not
silently dropping or corrupting clinical answer data through the new conditional-visibility
mechanism. Both are already directly addressed by CONTEXT.md's locked decisions (D-10, D-03, D-04);
this section exists to confirm there is no ADDITIONAL security surface this phase introduces beyond
what CONTEXT.md already reasoned through.

## Sources

### Primary (HIGH confidence)
- `app/lib/quiz/types.ts`, `app/lib/quiz/questions.ts`, `app/lib/quiz/scoring.ts`,
  `app/components/quiz/QuizPartRenderer.tsx`, `app/components/quiz/QuizPartRenderer.test.ts`,
  `app/components/quiz/QuizContainer.tsx` — read in full during this research pass (2026-08-09) to
  confirm CONTEXT.md's line-number claims and to locate the exact `calculateTotalScore` /
  `buildPayload` call sites for the D-03 boundary-pass design
- `package.json`, `tsconfig.json`, `vitest.config.ts` — read to confirm installed versions
  (TypeScript 5.9.3, React 18.3.1, Vitest 3.2.4) and strict-mode/test-config settings
- `npm run typecheck` — run directly, confirmed exit 0 against current `main`, establishing the
  pre-phase baseline
- `.planning/phases/02-quiz-schema-foundation/02-CONTEXT.md` — 16 locked decisions (D-01–D-16),
  treated as authoritative and not re-litigated
- `.planning/REQUIREMENTS.md` (SCH-01/SCH-02, lines 58-63), `.planning/ROADMAP.md` (Phase 2 section
  + Sequencing Constraint 1), `.planning/STATE.md`, `.planning/PROJECT.md`, `CLAUDE.md`

### Secondary (MEDIUM confidence)
- [Discriminated Unions and Exhaustiveness Checking in TypeScript](https://www.fullstory.com/blog/discriminated-unions-and-exhaustiveness-checking-in-typescript/) — confirms the `assertNever`/exhaustive-switch pattern used in Pattern 2, cross-checked against stable, version-independent TS language behavior already exercised elsewhere in this codebase (`scoreQuestion`'s existing switch)
- [SurveyJS Conditional Logic documentation](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) — cited for the design lesson that conditional-visibility expressions must re-evaluate on every dependency change, consistent with this phase's render-time `evaluateShowIf` approach; NOT a recommendation to adopt SurveyJS or its expression-string syntax (explicitly rejected by D-01)
- [JSON Schema if/then/else — A Tour of JSON Schema](https://tour.json-schema.org/content/05-Conditional-Validation/05-if-then-else) and [JSON Schema conditional validation pitfalls](https://json-schema.org/understanding-json-schema/reference/conditionals) — cited for the pitfall that omitting `then`/`else` silently no-ops (analogous lesson applied to this phase's `showIf`: an absent condition must be an explicit "always visible" default, not a silent no-op elsewhere in the evaluator)

### Tertiary (LOW confidence)
- None — all findings in this document are either verified directly against the repository/toolchain or cross-checked against official/well-established documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all versions confirmed directly against installed `package.json` and a passing `tsc --noEmit` run
- Architecture: HIGH for the discriminated-union and evaluator-module patterns (standard, stable TS/React idioms, cross-checked against the codebase's own existing exhaustive-switch precedent in `scoring.ts`); MEDIUM for the exact `ShowIfCondition` field shape and the `ALL_ITEMS`/Part-6-scoping question, both flagged as Open Questions requiring a planner decision rather than a single correct answer
- Pitfalls: HIGH for Pitfalls 1, 2, 3, 5 (derived directly from reading the actual code and CONTEXT.md's own verified-facts list); MEDIUM for Pitfall 4 (chained conditionals) since it is a forward-looking design question with no reproducing case in this phase's actual scope

**Research date:** 2026-08-09
**Valid until:** No external dependency in this phase, so staleness risk is near-zero — but if the
planner defers Part 6 or the chained-conditional design decision (Open Questions 2 and 3, Pitfall 4)
into Phase 3, this document's guidance on those points should be re-read alongside Phase 3's own
CONTEXT.md before Phase 3 planning begins, since the two phases' decisions must compose.
