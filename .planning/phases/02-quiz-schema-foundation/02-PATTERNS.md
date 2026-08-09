# Phase 2: Quiz Schema Foundation - Pattern Map

**Mapped:** 2026-08-09
**Files analyzed:** 7 (2 new, 5 modified)
**Analogs found:** 7 / 7 (one file — `QuizPartRenderer.test.ts` info-block coverage — has only a
partial analog; see the loud flag in "No Analog Found / Infrastructure Gap" below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `app/lib/quiz/schema.ts` | utility (pure evaluator module) | transform | `app/lib/quiz/navigation.ts` + `app/lib/quiz/redirects.ts` | exact (module shape, doc-comment convention, pure-function/no-React rule) |
| `app/lib/quiz/schema.test.ts` | test | transform | `app/lib/quiz/navigation.test.ts` | exact (accept/reject table style, non-vacuous proof discipline) |
| Literal-inventory static test (`QuizPartRenderer.tsx` source-text assertions) | test | transform (static analysis) | `tests/entry-theme-contract.test.ts` | exact (source-text-read contract test, "prove it fails first" discipline) |
| `app/lib/quiz/types.ts` | model (type definitions) | transform | itself (existing file, modified) | n/a — modified in place |
| `app/lib/quiz/questions.ts` | model (data) | transform | itself (existing file, modified) | n/a — modified in place |
| `app/components/quiz/QuizPartRenderer.tsx` | component | request-response (render + onChange) | itself (existing file, modified); secondary analog `app/lib/quiz/scoring.ts` for the exhaustive-switch-on-discriminant idiom | n/a / role-match |
| `app/components/quiz/QuizContainer.tsx` | component (container/orchestrator) | CRUD-ish (state + boundary POST) | itself (existing file, modified) | n/a — modified in place |
| `app/components/quiz/QuizPartRenderer.test.ts` | test | request-response | itself (existing file, EXTENDED ONLY — 12 assertions must stay byte-identical) | n/a — extended, not replaced |

## Pattern Assignments

### `app/lib/quiz/schema.ts` (utility, transform) — NEW

**Analogs:** `app/lib/quiz/navigation.ts` (pure predicate + doc-comment convention) and
`app/lib/quiz/redirects.ts` (pure resolver taking explicit arguments, no browser global reads)

**Answers to specific pattern question 1 (module convention):**

- **Named exports only, never `export default`.** Every existing pure module in `app/lib/quiz/`
  (`navigation.ts`, `redirects.ts`, `html-safe.ts`, `product-links.ts`) exports named functions/types.
  `schema.ts` should export `isAnswered`, `evaluateShowIf`, `visibleAnswers` (and, per RESEARCH.md's
  Pattern 1, the `isQuestion` type-predicate helper) the same way.
- **JSDoc block style:** a substantial `/** ... */` block above each exported function explaining
  *why*, not just *what* — including the specific behavior each edge case handles and a reference
  back to the decision (`D-0x`) that mandates it. This is a strong, consistent convention across
  every file in `app/lib/quiz/`, not just a suggestion.
- **Module-level header comment** (before any code) explaining the module's reason for existing,
  its relationship to a specific historical bug or decision, and any file it must stay in sync with.
  `navigation.ts:1-37` and `redirects.ts:1-25` both do this.
- **`undefined`/unknown input handling:** the established convention is to accept `unknown` (or a
  loosely-typed union) at the boundary and narrow explicitly, returning a safe default rather than
  throwing — see `isSafeRelativePath(p: unknown): p is string` (`navigation.ts:61`), which returns
  `false` for non-string/null/undefined/object rather than throwing. `schema.ts`'s functions should
  follow the same shape: `isAnswered(question, value: string | string[] | number | undefined)`
  returns `false` for a missing answer; `evaluateShowIf(condition: ShowIfCondition | undefined,
  answers)` returns `true` (visible) when `condition` is `undefined` — "no condition = always
  visible" is the direct sibling of `redirects.ts`'s "no configured value = use the fallback."
- **No throwing.** `navigation.ts:78` states explicitly: "Nothing in `app/lib/quiz/` throws; callers
  guard on the null instead." This is a load-bearing project-wide convention for this directory, and
  it aligns exactly with D-04's "fail open at runtime, never throw."

**Imports pattern to copy** (`navigation.ts` has ZERO imports — pure, no dependencies; `schema.ts`
will need one: `getQuestionById` from `./questions`):
```typescript
// app/lib/quiz/redirects.ts has no imports either — both analogs are dependency-free except
// for sibling type imports. schema.ts's actual import line should look like:
import type { QuizAnswers, QuizItem, QuizQuestion, ShowIfCondition } from "./types";
import { getQuestionById } from "./questions";
```

**Core pattern — pure predicate returning a primitive, no side effects** (`navigation.ts:60-72`):
```typescript
/** True when `p` is a path the parent may safely resolve against its own origin. */
export function isSafeRelativePath(p: unknown): p is string {
  if (typeof p !== "string") return false;
  if (p === "") return false;
  for (const ch of PARSER_STRIPPED_CHARS) {
    if (p.includes(ch)) return false;
  }
  if (p.charAt(0) !== "/") return false;
  if (p.charAt(1) === "/") return false;
  if (p.charAt(1) === "\\") return false;
  return true;
}
```

**Core pattern — pure resolver taking explicit config, no global reads** (`redirects.ts:54-59`):
```typescript
export function getRedirectTarget(kind: RedirectKind, cfg: QuizRedirectConfig): string {
  const raw = kind === "consult" ? cfg?.consultRedirectUrl : cfg?.testOptionsRedirectUrl;
  const configured = (raw || "").trim();
  if (configured !== "") return configured;
  return REDIRECT_FALLBACK[kind];
}
```
This is the direct model for `visibleAnswers(items, answers)` — pure function, explicit arguments,
no reach for `window` or React state. The "thin browser-global wrapper belongs in the calling
component" line (`redirects.ts:52`) is also the precedent for keeping `schema.ts` itself
React-free and letting `QuizContainer.tsx` / `QuizPartRenderer.tsx` be the only callers (RESEARCH.md
says this explicitly).

**Error handling pattern:** none of the three analog modules use try/catch. "Handle it, don't throw
it" is the pattern — invalid/missing input degrades to a safe default value (`false`, `null`, or a
fallback constant), never an exception. Apply the same to `schema.ts`.

---

### `app/lib/quiz/schema.test.ts` (test) — NEW

**Analog:** `app/lib/quiz/navigation.test.ts`

**Structure to copy:**
1. **Named ACCEPT/REJECT (or equivalent) fixture arrays at the top of the file, each row commented
   with *why* it's in that bucket**, not just what it is (`navigation.test.ts:10-29`). For
   `schema.test.ts`, this maps directly onto RESEARCH.md's operator matrix: rows for `equals` match/
   no-match, `isAnswered` empty-array/whitespace/populated, `includes` present/absent, and the
   dangling-reference case.
2. **`describe` blocks named after the exported function**, with `for (const input of TABLE) { it(...) }`
   loops rather than one assertion per `it` written out longhand (`navigation.test.ts:93-104`).
3. **Explicit type-narrowing edge cases as individual `it`s** — `rejects null`, `rejects undefined`,
   `rejects a number`, `rejects a plain object` (`navigation.test.ts:106-120`). `schema.test.ts`
   needs the direct equivalents for `isAnswered`/`evaluateShowIf` given `undefined` values and
   missing `showIf`.
4. **Non-vacuous double-assertion rows** — where a security- or correctness-critical claim is being
   tested, assert the *independent* ground truth AND the function's behavior in the same test, so a
   validator that always returns the "safe" answer cannot pass trivially
   (`navigation.test.ts:140-147`, `162-181`, the 0x00–0x20 sweep). The direct translation for D-04's
   dangling-reference test: build a temporary, test-local question array with a broken
   `showIf.questionId`, confirm the reference-integrity check fails against it, THEN confirm it
   passes against the real `questions.ts` data — this is explicitly demanded by RESEARCH.md's
   Validation Architecture section 3.
5. **Comment style:** every REJECT/edge-case row explains what class of bug it guards against and
   cites the decision ID (`// DECIDED: REJECT...`, `// Guards the derivation itself...`). Do the same
   with `D-02`/`D-04`/`D-06`/`D-08` citations in `schema.test.ts`.

**Import line to copy exactly** (`navigation.test.ts:1-2`):
```typescript
import { describe, it, expect } from "vitest";
import { isAnswered, evaluateShowIf, visibleAnswers } from "./schema";
```

---

### Literal-inventory static test (`QuizPartRenderer.tsx` has zero forbidden literals) — NEW

**Analog:** `tests/entry-theme-contract.test.ts` — this is the project's only precedent for a test
that `readFileSync`s a source file and asserts on its raw text, and it is explicitly the exemplar
RESEARCH.md's Validation Architecture cites by name ("mirrors the pattern
`tests/entry-theme-contract.test.ts` already established").

**Exact structure to mirror** (`tests/entry-theme-contract.test.ts:1-66`):
```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * [WHY THIS FILE EXISTS block — cite the specific bug/decision this guards, per the project's
 * established convention. Here: SCH-02 + D-13's correction that the two REQUIREMENTS.md line-cites
 * under-counted the actual hardcode inventory (isExclusiveNoneQuestion + five "none" literals).]
 */

const SOURCE = readFileSync(join(process.cwd(), 'app', 'components', 'quiz', 'QuizPartRenderer.tsx'), 'utf-8')

describe('QuizPartRenderer.tsx has no question-ID or "none"-value literals (SCH-02)', () => {
  it('contains zero occurrences of the string literal "none"', () => {
    expect(SOURCE.split('"none"').length - 1).toBe(0)
  })
  // ...one it() per forbidden literal class, each using split(needle).length - 1
})
```
Both this file and `navigation.test.ts`/`redirects.test.ts` use `readFileSync(join(process.cwd(),
...))` — that exact join-from-cwd idiom (not a relative `../../` path) is the established convention
for any test that reads raw source text; copy it verbatim.

**Non-vacuous proof discipline (the single most load-bearing pattern to copy from this analog):**
`entry-theme-contract.test.ts`'s own header states the test was "proven non-vacuous (all 6 assertions
fail against the pre-fix file)" — i.e., the test was run and confirmed to FAIL against the
pre-refactor source before the refactor happened, not just confirmed to pass afterward. RESEARCH.md's
Non-Vacuous Proof Strategy section requires the exact same two-step process for the literal-inventory
test: run it against `QuizPartRenderer.tsx` as it exists today (it must fail, listing the four hardcode
sites and five `"none"` literals), THEN implement, THEN confirm it passes. Record both outcomes in the
plan's verification notes.

**Occurrence-counting idiom — CRITICAL, has a documented project history of getting this wrong:**
`STATE.md` records that three independent executors and the orchestrator itself were caught by
`grep -c`, which counts matching **lines**, not occurrences (a real production Klaviyo-detection bug:
"An earlier entry said '4': that was `grep -c`... Occurrence counts must use
`split(needle).length - 1`"). The correct, already-used-in-this-codebase idiom is
`SOURCE.split(needle).length - 1`, directly precedented in `tests/quiz-embed-contract.test.ts:124-125,153`:
```typescript
const opens = html.split('<scr' + 'ipt').length - 1
const closes = html.split('</scr' + 'ipt>').length - 1
// ...
expect(html.split(`nonce="${nonce}"`).length - 1).toBe(2)
```
Use `split(needle).length - 1` in the literal-inventory test for every forbidden-string count. Never
use a line-counting regex or `grep -c`-equivalent logic (e.g., never count `SOURCE.split('\n').filter(l
=> l.includes(needle)).length` — that reproduces the exact bug class STATE.md documents).

---

### `app/lib/quiz/types.ts` (model, modified in place)

No external analog needed — this is additive to the file's own existing shape. Reuse its own
conventions:
- Module header doc-comment (`types.ts:1-3`) — keep or extend, don't remove.
- Inline comments explaining each field's meaning, matching the existing style at `types.ts:21-25`
  (`excludeFromScore?: string[]; // Option values that score 0 (e.g. "none_of_above", "only_rarely")`).
- **`excludeFromScore` (`types.ts:22`) is CONTEXT.md's own named precedent** for "a per-option
  behavior declared on the question rather than hardcoded in the renderer" — `exclusive` on
  `QuizOption` should be declared with the same comment style, directly beside `score?: number` on
  the existing `QuizOption` interface (`types.ts:28-32`).

**Discriminated union / type-narrowing precedent — answers to specific pattern question 2:**
There is **no existing discriminated union in this codebase.** The only related precedent is a
single type-predicate function, `isSafeRelativePath(p: unknown): p is string` in
`app/lib/quiz/navigation.ts:61` — an `x is Y` narrow on a primitive, not a `kind`-discriminated
object union. **Flag explicitly for the planner: `QuizItem = QuizQuestion | QuizInfoBlock` on a
`kind` discriminant, plus an `isQuestion(item): item is QuizQuestion` predicate, is a genuinely NEW
pattern for this codebase, not an established one being followed.** RESEARCH.md's Pattern 1/Pattern 2
sections are the closest thing to a spec (verified against stable TS 5.9.3 behavior, not against any
existing in-repo discriminated union), and `scoring.ts`'s `switch (question.type) { ...; default:
return 0 }` (`scoring.ts:38-65`) is the closest *existing* precedent for an exhaustive switch on a
string-literal-union discriminant (`QuestionType`, not `kind`) — copy that switch shape for the new
`kind === "info"` branch guard described in RESEARCH.md's Pattern 2.

---

### `app/lib/quiz/questions.ts` (model/data, modified in place)

No external analog needed. Reuse the file's own conventions: banner comments per part
(`// ─────────────────────────────────────────────`), one object literal per question inside a
`const PARTn_X: QuizQuestion[] = [...]` array, `order`/`part` fields always present. New `showIf`/
`exclusive`/`required` fields should be added as additional object properties following the same
inline-comment-per-field convention already used for `excludeFromScore`.

**`getQuestionById` (`questions.ts:261`)** — currently zero callers, searches
`[...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY]`. Per RESEARCH.md Pitfall 5, keep its return type
`QuizQuestion | undefined` and its search scope `QuizQuestion`-only even after `QUIZ_PARTS` widens to
`QuizItem[]` — do not let it start resolving `QuizInfoBlock` ids.

---

### `app/components/quiz/QuizPartRenderer.tsx` (component, modified in place)

**Core pattern to preserve — exhaustive switch on `question.type`, `default: return null`**
(`QuizPartRenderer.tsx:42-265`): six cases, one per `QuestionType`, each returning a JSX card. This
structure is unchanged by the refactor; only the two literal-driven guards inside it change:
- The `part === 5 && (id === "med_list" || id === "med_control")` guard at `:36-38` — becomes
  `evaluateShowIf(item.showIf, answers)`.
- `isExclusiveNoneQuestion` (`:26-28`) plus the five `"none"` literals (`:47, 57, 71, 74, 75`) —
  become `item.options?.some(o => o.exclusive)` per RESEARCH.md Pattern 2's example, replacing
  `opt.value === "none"` with `opt.exclusive === true` (or equivalent read off the option object).

**New branch to add — gated on `item.kind`, ABOVE the type switch, not a case inside it**
(RESEARCH.md Pattern 2, `Architecture Patterns` example):
```typescript
items.map((item) => {
  if (!evaluateShowIf(item.showIf, answers)) return null;
  if (item.kind === "info") {
    return <InfoBlockCard key={item.id} block={item} />;
  }
  switch (item.type) { /* existing cases, unchanged */ }
});
```

**Doc-comment convention for `isPartComplete`** (`QuizPartRenderer.tsx:271`) — a single-line `/** ... */`
directly above the export, e.g. `/** Whether every question in the part that is shown has a valid
answer */`. Keep this style; extend the comment to mention that non-question items are skipped
without a required check (D-12), matching the terse-but-precise convention already used here (this
file's comments are shorter than `app/lib/quiz/*.ts`'s — match the file you're editing, not a
different file's verbosity level).

---

### `app/components/quiz/QuizContainer.tsx` (component/container, modified in place)

**Analog:** itself — the file already has the exact shape the new code must follow, three times over.

**Existing import block to extend** (`QuizContainer.tsx:5-30`):
```typescript
import { QUIZ_PARTS, PART6_MEDICAL_HISTORY, ALL_SCORED_QUESTIONS } from "../../lib/quiz/questions";
import {
  calculateTotalScore,
  getScoreBracket,
  generateSymptomProfileId,
  type ScoreBracket,
} from "../../lib/quiz/scoring";
import { type QuizAnswers } from "../../lib/quiz/types";
```
Add `import { visibleAnswers } from "../../lib/quiz/schema";` alongside these — same relative-path
depth (`../../lib/quiz/...`), same style (named imports, no default imports anywhere in this file).

**Three confirmed `calculateTotalScore` call sites (verified by direct read, matches RESEARCH.md's
count) — each is where `visibleAnswers()` must be inserted immediately before the call:**

1. `buildPayload` (`QuizContainer.tsx:188`):
```typescript
const s = score ?? calculateTotalScore(ALL_SCORED_QUESTIONS, answers);
// ...
return {
  // ...
  answers,   // <- becomes the visibleAnswers() output
  // ...
};
```
2. `goToOutcome` (`QuizContainer.tsx:234-240`):
```typescript
const goToOutcome = useCallback(() => {
  const s = calculateTotalScore(ALL_SCORED_QUESTIONS, answers);
  const b = getScoreBracket(s);
  setScore(s);
  setScoreBracket(b);
  setStep("outcome");
}, [answers]);
```
3. **Test Mode button** (`QuizContainer.tsx:629`, inside the `onClick` at `:600-634`) — the third
   site RESEARCH.md flags as present in the code but not named in D-03:
```typescript
setAnswers(sample);
const s = calculateTotalScore(ALL_SCORED_QUESTIONS, sample);
const b = getScoreBracket(s);
```
All three follow the identical local shape `const s = calculateTotalScore(ALL_SCORED_QUESTIONS,
<answers-like-value>)` — insert `const visible = visibleAnswers(ALL_ITEMS, <same-value>);` the line
before each, then pass `visible` instead of the raw value, per RESEARCH.md's Code Examples section
("Applying visibleAnswers at both QuizContainer.tsx call sites").

**`useCallback` dependency-array convention** — every callback in this file lists its captured
variables explicitly (`buildPayload`'s deps: `[patientState, symptomProfileId, patientInfo, answers,
score, scoreBracket, startTime]`, `:206`). `visibleAnswers`/`ALL_ITEMS` are pure imports, not React
state, so they do NOT need to be added to any dependency array — consistent with how
`calculateTotalScore`, `getScoreBracket`, and `ALL_SCORED_QUESTIONS` are already omitted from these
same arrays today.

---

### `app/components/quiz/QuizPartRenderer.test.ts` (test, EXTENDED ONLY)

**Analog:** itself, unmodified. This is the "behavior-identical harness" — CONTEXT.md and
RESEARCH.md both say explicitly that if any of the 12 existing assertions need to change, that is
itself evidence the refactor broke behavior it should not have. Treat any generated plan action that
proposes editing lines `1-67` of this file as forbidden; only ADD new `describe`/`it` blocks below
the existing ones.

**Structure for new assertions, copying this file's own existing style** (`QuizPartRenderer.test.ts:1-19`):
```typescript
import { describe, it, expect } from "vitest";
import { isPartComplete } from "./QuizPartRenderer";
import { PART1_SYMPTOM_CHECKLIST, PART5_TREATMENT } from "../../lib/quiz/questions";
import { scoreQuestion } from "../../lib/quiz/scoring";

describe("isPartComplete — Part 1 'None of the above'", () => {
  it("is incomplete when a symptom checklist question is unanswered", () => {
    expect(isPartComplete(PART1_SYMPTOM_CHECKLIST, {})).toBe(false);
  });
  // ...
});
```
Pattern: import the exported pure function (`isPartComplete`) plus real question-set constants from
`questions.ts`, never a mock/fixture question set, and assert directly on the function's return
value. For D-06 (empty array `[]` no longer counts as answered) and D-16 (exclusive deselect-to-`[]`),
follow this exact shape: call `isPartComplete` with a hand-built `answers` object containing `[]` for
a checklist question and assert `false`.

**For the D-16 "clicking an already-selected exclusive option deselects" behavior specifically**:
this is a *component interaction* (an `onChange` handler's toggle logic inside
`QuizPartRenderer.tsx:64-79`), not a pure-function call. See the loud flag below — this cannot be
tested via DOM interaction today without new test infrastructure. The pragmatic fallback, consistent
with this file's existing convention, is to test the exported logic indirectly: extract the toggle
decision into a small pure helper in `schema.ts` (or keep the assertion scoped to what `isPartComplete`
observes: after a simulated already-`[]`-answers state, `isPartComplete` returns `false`) rather than
asserting on simulated click events, since no click-simulation mechanism exists in this suite.

---

## Answers to Specific Pattern Questions (Summary)

**1. Pure module convention:** Named exports, heavy `/** */` JSDoc citing the driving decision ID,
module-header comment explaining the historical "why," never throws (returns a safe default),
accepts loosely-typed/`unknown` input at the boundary. See `navigation.ts` / `redirects.ts` excerpts
above.

**2. Discriminated union precedent:** **None exists in this codebase.** The only related precedent is
a single `x is Y` type-predicate on a primitive (`isSafeRelativePath`, `navigation.ts:61`). The
`QuizItem = QuizQuestion | QuizInfoBlock` union on a `kind` discriminant is a new pattern being
introduced by this phase, not one being followed — flag this to the planner explicitly so it isn't
assumed to be "the established way things are done here."

**3. `tests/entry-theme-contract.test.ts` structure:** `readFileSync(join(process.cwd(), ...))` to
load raw source text into a module-level `const`, a header comment block explaining the specific
historical bug the test exists to prevent, then a `describe` block whose `it`s each assert a
substring/pattern is present or absent in that raw text via `toContain`/`not.toContain`/
`toMatch`/`not.toMatch`. Full text extracted above under "Literal-inventory static test."

**4. Existing occurrence-counting analog:** Yes — `tests/quiz-embed-contract.test.ts:124-125,153`
already uses `SOURCE.split(needle).length - 1`, and `STATE.md` documents three independent
`grep -c` line-counting failures that this idiom exists to prevent. The literal-inventory test MUST
use `split(needle).length - 1`, never a line-count-based check.

**5. React component testing — LOUD FLAG, see next section.**

## No Analog Found / Infrastructure Gap — MUST READ BEFORE PLANNING

**RESEARCH.md's Validation Architecture assumes React-level (DOM-rendering) tests are possible for
`QuizPartRenderer.tsx` — e.g., "Info block renders heading/paragraphs/bullets ... appears in DOM only
when its `showIf` ... is satisfied" and "exclusive deselect" as a simulated click. Verified directly
against this repo's actual test infrastructure: THIS IS NOT CURRENTLY POSSIBLE.**

Evidence:
- `vitest.config.ts` sets `environment: "node"` (no DOM globals — no `document`, no `window` — are
  present in the test environment at all) and `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]`
  (note: `.test.ts` only, `.tsx` test files would not even be picked up by this glob without a config
  change).
- `package.json` `devDependencies` contains **no** `@testing-library/react`, **no** `jsdom`, **no**
  `happy-dom`, and no other DOM-simulation or React-rendering test library.
- A repo-wide search for any existing test that calls `render(` from a testing library, or otherwise
  mounts a React component, returns **zero results**. `QuizPartRenderer.test.ts` — the file RESEARCH.md
  itself names as the phase's regression harness — imports only the exported pure function
  `isPartComplete`, never the `QuizPartRenderer` component itself. Every existing test in
  `app/lib/quiz/*.test.ts` and `tests/*.test.ts` is either a pure-function unit test or a
  source-text/HTTP-response-text contract test (`entry-theme-contract.test.ts`,
  `liquid-block-contract.test.ts`, `quiz-embed-contract.test.ts`) — none render a component into a DOM.

**Consequence for the planner:** "Info block renders... appears in DOM only when its showIf is
satisfied" as a literal DOM-assertion test, and "exclusive deselect" as a simulated-click test, are
**not expressible with the current test setup**. Either:
(a) the plan must add new test infrastructure (a `jsdom`/`happy-dom` environment, `@testing-library/react`
as a new dev dependency, and a `vitest.config.ts` change to run a subset of tests under that
environment) — which is new-dependency territory and, per CLAUDE.md, is not blocked for a **dev**
dependency the same way a runtime/PHI-surface dependency would be, but is still a scope expansion
CONTEXT.md's "Claude's Discretion" list does not mention and should be called out as a plan-level
decision, not silently added; or
(b) the plan re-scopes those specific assertions to what the codebase's existing pure-function-only
convention can express — e.g., prove info blocks are correctly *excluded from* `isPartComplete`'s
required check and *correctly filtered by* `evaluateShowIf` as pure-function assertions (both fully
testable today with zero new infrastructure), and treat "renders in the DOM" and "click deselects" as
manual/visual verification items rather than automated assertions, consistent with how this project's
existing self-review checklist already relies on manual DOM verification for some UI changes (per the
global CLAUDE.md instruction: "For UI changes: ... Typecheck alone is not enough" — implying manual/
screenshot verification is the established fallback here, not a gap unique to this phase).

**Recommendation:** surface this as an open question for the planner rather than silently picking (a)
or (b) — it changes both the file list (new devDependency + config file touched) and the test count/
scope commitments RESEARCH.md's Wave 0 gaps table currently assumes are achievable without new tooling.

## Shared Patterns

### Pure-module, no-throw, explicit-argument convention (applies to `schema.ts`)
**Source:** `app/lib/quiz/navigation.ts`, `app/lib/quiz/redirects.ts`
**Apply to:** `app/lib/quiz/schema.ts` (all three exported functions)
```typescript
// Never throws; returns a safe default. Never reads window/React state; takes explicit args.
export function getRedirectTarget(kind: RedirectKind, cfg: QuizRedirectConfig): string {
  const raw = kind === "consult" ? cfg?.consultRedirectUrl : cfg?.testOptionsRedirectUrl;
  const configured = (raw || "").trim();
  if (configured !== "") return configured;
  return REDIRECT_FALLBACK[kind];
}
```

### Source-text contract test with non-vacuous proof discipline
**Source:** `tests/entry-theme-contract.test.ts`
**Apply to:** the new literal-inventory static test for `QuizPartRenderer.tsx`
```typescript
const SOURCE = readFileSync(join(process.cwd(), 'app', ...), 'utf-8')
describe('...', () => {
  it('...', () => {
    expect(SOURCE.split(needle).length - 1).toBe(0) // occurrence count, never grep -c / line count
  })
})
```
Must be run and confirmed FAILING against the pre-refactor file before the refactor lands, and
confirmed PASSING after — record both in the plan's verification notes, matching the "proven
non-vacuous (all 6 assertions fail against the pre-fix file)" precedent this analog already sets.

### Exhaustive switch on a string-literal-union discriminant
**Source:** `app/lib/quiz/scoring.ts:38-65` (`scoreQuestion`'s `switch (question.type)`), mirrored in
`QuizPartRenderer.tsx:42-265`
**Apply to:** the new `kind === "info"` branch in `QuizPartRenderer.tsx` (guard ABOVE the existing
`switch (item.type)`, not a new case inside it — see RESEARCH.md Pattern 2 and the "Anti-Patterns to
Avoid" section for why this distinction matters for D-09's compile-time guarantee)

### `visibleAnswers()` boundary-pass call-site shape
**Source:** `app/components/quiz/QuizContainer.tsx` — three existing `calculateTotalScore(...)` call
sites (`:188`, `:235`, `:629`)
**Apply to:** each of the three sites, inserting `const visible = visibleAnswers(ALL_ITEMS, answers)`
immediately before the existing `calculateTotalScore` call and substituting `visible` for the raw
`answers`/`sample` value in both the score computation and (at `buildPayload`) the POST payload's
`answers` field.

## Metadata

**Analog search scope:** `app/lib/quiz/` (all 5 existing non-test files + their test files),
`app/components/quiz/` (all files), `tests/` (all 10 contract/integration test files), `package.json`,
`vitest.config.ts`, `.planning/STATE.md` accumulated-context section.
**Files scanned:** 24 (full reads: `types.ts`, `questions.ts`, `scoring.ts`, `navigation.ts`,
`navigation.test.ts`, `redirects.ts`, `html-safe.ts`, `QuizPartRenderer.tsx`, `QuizPartRenderer.test.ts`,
`QuizContainer.tsx`, `entry-theme-contract.test.ts`; grep/partial reads: `quiz-embed-contract.test.ts`,
`STATE.md`, `package.json`, `vitest.config.ts`).
**Pattern extraction date:** 2026-08-09
