# Phase 5: Preliminary Score Page - Research

**Researched:** 2026-08-11
**Domain:** In-repo React/TypeScript display logic + CSS Modules (no new libraries, no external
integration). The "research" here is almost entirely codebase archaeology — verifying exact current
line numbers, confirming the derived-60 math, and designing the one genuinely new piece of logic
(a max-score deriver) that does not exist anywhere in the codebase today.
**Confidence:** HIGH — every claim below is `[VERIFIED: codebase]` by direct file read on
2026-08-11, not training-data recall. There is no external API, no new dependency, and no
ambiguity about current file shape to hedge on.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01/D-02/D-03**: The score scale becomes admin-editable from the embedded Shopify app (Phase
  5.1), not a code constant and not a theme app block setting. Phase 5 ships SCORE-01/02/03 against
  a `getScoreScale()` accessor whose Phase 5 implementation returns a code constant; Phase 5.1 swaps
  the implementation to DB-backed. `ResultsDisplay` is written once and never changes again for this.
  Both the visual band stops AND the clinical brackets are (eventually, in 5.1) editable, which is why
  5.1 requires `scale_version`, `changed_by`, `changed_at`, and a `submissions.scale_version` column —
  none of that is Phase 5's concern, but Phase 5's accessor shape must not foreclose it.
- **D-04**: William's score-scale decision drops from a code blocker to a go-live configuration item.
  The provisional default must be visibly flagged as provisional in source (comment / constant name /
  `isProvisional` field) — explicitly **not** a patient-facing banner or copy change.
- **D-05**: The bar is a true linear 0–60 scale; colour stops are decoupled from clinical brackets.
  Rejected: bracket-driven colour (would render `7+` as 90% red) and bracket-proportional thirds.
- **D-06**: The bar and the clinical message are two different axes — bar labelled "Symptom burden"
  across the full range; recommendation sits under "What this means for you". Do not let the bar's
  `data-tone` and the recommendation's `scoreBracket` conditional share a source value or class name.
- **D-07**: The band table supports an arbitrary number of zones (N), driven by a `data-tone`
  attribute, not a fixed 3/4-way JSX branch. The four hardcoded legacy classes
  (`quizResults__severityValue{Minimal,Mild,Moderate,Severe}`) all retire together, including the
  orphaned `Moderate`. This deliberately does NOT follow the session-9 re-application of legacy
  four-band classes.
- **D-08**: The `Symptom Score: 7+` chip is retired entirely.
- **D-09**: Copy changes are the structural minimum — `h2` → "Preliminary Score"; subtitle → the
  1–2 business day sentence; two new axis labels; chip removed. Left verbatim: the three band
  explanations (h3 + body) and the disclaimer paragraph.
- **D-10**: `DEC-no-approval-promise-copy` appears already satisfied by inspection of
  `ResultsDisplay.tsx:102-142` — confirm by inspection, do not schedule a rewrite.

### Claude's Discretion

- The exact provisional band stop values shipped in Phase 5's constant (must be defensible and
  visibly marked provisional). **Already resolved by the approved `05-UI-SPEC.md`**: equal thirds of
  the derived 0–60 range — `{upTo:20,tone:"low"}, {upTo:40,tone:"mid"}, {upTo:60,tone:"high"}` — chosen
  because it needs no clinical justification of its own (D-05 already decoupled the bar from clinical
  meaning). The planner should treat this as locked-by-UI-SPEC, not re-open it.
- The tone-scale naming (`low`/`mid`/`high`) and CSS tokens. **Already resolved by UI-SPEC**: five
  tokens (`low`, `low-mid`, `mid`, `mid-high`, `high`), Phase 5 uses only three.
- Whether the derived ceiling is computed at module load or memoized. **See "Architecture Patterns"
  below** — recommend computed at module load (cheap, deterministic, no memoization complexity
  needed for ~19 questions).

### Deferred Ideas (OUT OF SCOPE)

- Phase 5.1 — admin-configurable score scale (settings table, `app/routes/app.settings.tsx`,
  `api.quiz.config.tsx`, `submissions.scale_version` migration). PHI-path change requiring PR review.
- Admin-editable patient-facing clinical copy — not selected, out of scope entirely.
- Rewording the three clinical band headings — declined, would need William's sign-off separately.
- Rewriting the disclaimer paragraph — Phase 8 / LAUNCH-03, counsel-owned.
- Retuning provisional band values — William confirms before go-live, ideally via Phase 5.1's form.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCORE-01 | Retitle to "Preliminary Score", state the 1–2 business day clinical-review copy, keep the three approved band explanations, no approval/unlock promise | "Current Code: ResultsDisplay.tsx" section gives exact line numbers for the two copy edits; "D-10 Verification" section confirms the no-promise-copy claim by re-reading the actual current band text |
| SCORE-02 | Score ceiling derived from the scored question set in code, so adding a scored question changes it automatically | "The Missing Piece: Max-Score Derivation" section — this function does not exist yet anywhere in the codebase and must be designed; full worked implementation and per-question-type max table provided |
| SCORE-03 | Colour-banded scale bar directly above the score, arbitrary-N zones, decoupled from clinical brackets | "Score Scale Data Contract" (mirrors UI-SPEC exactly) + "Component Inventory / DOM shape" section gives the exact JSX structure, CSS class list, and accessibility wiring the UI-SPEC already locked |
</phase_requirements>

## Summary

This phase requires almost no external research — it is a self-contained refactor of one component
(`ResultsDisplay.tsx`) and one small module (`scoring.ts`), with a CSS Modules update and a
provisional data constant. The UI-SPEC (`05-UI-SPEC.md`) is unusually prescriptive and already
resolved nearly every design question (exact class names, DOM nesting, ARIA strategy, provisional
band values, spacing/typography tokens) — this research's job is to (1) verify every codebase claim
the UI-SPEC and CONTEXT.md make against the actual current files, (2) fill the one genuine gap both
upstream documents defer to "the planner"/"the executor" — **how the SCORE-02 max-score ceiling is
actually computed in code, since no such function exists today** — and (3) surface test-infrastructure
and freshness-guard implications the planner needs to size tasks correctly.

**Primary recommendation:** Add two new pure functions to `app/lib/quiz/scoring.ts`
(`getQuestionMaxScore` and `getMaxScore`), a new `getScoreScale()` accessor (new file
`app/lib/quiz/score-scale.ts`, following the `redirects.ts` / `product-links.ts` module-per-concern
convention already established), rewrite the chip block in `ResultsDisplay.tsx` into the scale-bar
markup UI-SPEC §Component Inventory 2 already fully specifies, delete the four legacy CSS classes,
add five new tone-token color rules, and close with the standard three-part verification this repo
always requires for a `ResultsDisplay`/CSS change: unit tests for the new scoring functions, one new
DOM test file for the scale bar, and a theme-bundle rebuild with new freshness markers.

## Standard Stack

No new dependencies. Zero npm installs. This phase is 100% internal code using the stack already in
every prior phase:

| Tool | Version (installed) | Purpose | Confidence |
|------|---------------------|---------|------------|
| React | 18.3.1 | `ResultsDisplay` is a function component; no new library needed for a data-driven list render (`zones.map(...)`) | `[VERIFIED: package.json]` |
| CSS Modules | (via Vite, no separate package) | `.scaleBar__*` classes exactly as UI-SPEC names them | `[VERIFIED: quiz.module.css import pattern in ResultsDisplay.tsx:6]` |
| Vitest 3.2.4 + jsdom 29.1.1 + @testing-library/react 16.3.2 | installed as devDependencies since Phase 3 | Unit tests for `scoring.ts`; DOM test for the new scale bar | `[VERIFIED: package.json]` |
| esbuild (via `vite build --config vite.theme.config.ts`) | n/a | Theme bundle rebuild — unminified string literals survive, local identifiers don't (established pattern, see Pitfalls) | `[VERIFIED: tests/quiz-bundle-freshness.test.ts comments]` |

**No icon library, no animation library, no charting library.** UI-SPEC explicitly specifies the
scale bar as hand-built `<div>`s with `flex-grow` proportional widths and a pure-CSS circle marker —
confirmed appropriate: this is a simple 1–5 segment horizontal bar, not a general-purpose chart, and
pulling in a charting dependency for it would be the textbook "hand-rolled vs. off-the-shelf" call in
the wrong direction (over-engineering, not under).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-built flex-grow zones | A charting library (recharts, visx) | Massive overkill for a static 3-5 segment bar; adds a dependency to a PHI-adjacent bundle for zero functional gain; UI-SPEC already rejected this implicitly by specifying raw CSS |
| `getScoreScale()` as a plain function | A React Context provider | Overkill — `getRedirectTarget`/`getProductHandle` establish the precedent of a plain exported function read at render time, no Context needed since there's exactly one consumer (`ResultsDisplay`) and no dynamic runtime config in Phase 5 |

**Installation:** None required.

## Architecture Patterns

### Recommended Module Layout

```
app/lib/quiz/
├── scoring.ts          # MODIFIED — add getQuestionMaxScore, getMaxScore
├── score-scale.ts       # NEW — ScoreScale type, PROVISIONAL_SCORE_SCALE constant, getScoreScale()
├── scoring.test.ts      # MODIFIED — unit tests for the two new functions
└── score-scale.test.ts  # NEW — unit tests for getScoreScale() (max=60, zones ascending, etc.)

app/components/quiz/
└── ResultsDisplay.tsx   # MODIFIED — chip block replaced with scale bar + meaning heading

app/styles/
└── quiz.module.css      # MODIFIED — 4 legacy classes deleted, ~12 new .scaleBar__* classes,
                          #             5 new --quiz-color-tone-* custom properties

tests/
└── quiz-results-scale-bar-dom.test.ts   # NEW — DOM-rendering test, following the
                                          #        quiz-part-renderer-dom.test.ts precedent
                                          #        (@vitest-environment jsdom, React.createElement,
                                          #        .test.ts NOT .test.tsx)

public/
├── quiz-bundle.js       # REBUILT (committed artifact — mandatory, see Pitfalls)
└── quiz-bundle.css      # REBUILT (committed artifact — mandatory, see Pitfalls)
```

**Why a new `score-scale.ts` file rather than adding to `scoring.ts`:** `redirects.ts` and
`product-links.ts` establish the precedent of one small, focused module per swappable-config concern,
each exporting a pure function that takes an optional config object and falls back to a module
constant (`getRedirectTarget(kind, cfg)`, `getProductHandle(state, cfg)`). `getScoreScale()` is the
same shape and the same "Phase 5.1 will swap what feeds this" lifecycle as those two — following the
convention makes the eventual Phase 5.1 diff smaller and keeps `scoring.ts` (already imported by
`payload.ts`, `QuizContainer.tsx`, and three test files) from growing a second, unrelated
responsibility. `[VERIFIED: codebase pattern, redirects.ts + product-links.ts read in full]`

### The Missing Piece: Max-Score Derivation (SCORE-02's actual implementation)

**This function does not exist anywhere in the codebase today** — confirmed by grepping the entire
`app/` tree for `MaxScore`, `maxScore`, `getMax`, `theoretical`, and `ceiling`: zero matches.
`05-CONTEXT.md`'s "measured 2026-08-11 by summing per-question maxima" fact was almost certainly
computed by hand or by an ad hoc script, not by a function that ships. **The planner must design and
build this from scratch; it is the one piece of real engineering in this phase.**

`calculateTotalScore` (existing) cannot be reused for this — it takes an `answers` map and returns the
ACTUAL score for those answers; calling it with an empty or synthetic "maximum" answers object would
require constructing a fake `QuizAnswers` that selects every option, which is fragile (wrong for
`checkbox_multi`/`radio_multi`, meaningless for `severity_0_3`/`frequency_0_4` numeric types) and
would silently produce the wrong number the moment a new question type is added.

**Recommended implementation** — mirrors `scoreQuestion`'s existing switch structure exactly, so the
two functions read as siblings and a future question-type addition updates both switches together
(the natural place a reviewer would look):

```typescript
// app/lib/quiz/scoring.ts — new function, same file as scoreQuestion for symmetry

/**
 * Theoretical maximum a single question can contribute, independent of any answer. Mirrors
 * scoreQuestion's switch exactly — every new QuestionType must be added to BOTH switches, or
 * getMaxScore silently omits it (see 05-RESEARCH.md Pitfalls). scoreWeight is intentionally NOT
 * applied here: it is declared on QuizQuestion but scoreQuestion never reads it (verified —
 * zero references outside its own declaration in types.ts:36), so weighting it into the ceiling
 * would make the derived max disagree with what a real answer can actually score.
 */
export function getQuestionMaxScore(question: QuizQuestion): number {
  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi": {
      const excluded = new Set(question.excludeFromScore || []);
      return (question.options || []).filter((o) => !excluded.has(o.value)).length;
    }

    case "severity_0_3":
      return 3;

    case "frequency_0_4":
    case "bother_0_4":
      return 4;

    case "control_0_3": {
      const scores = (question.options || []).map((o) => o.score ?? 0);
      return scores.length ? Math.max(...scores) : 0;
    }

    case "yesno":
    case "text_input":
    case "radio_single":
    case "text_input_short":
    case "file_multi":
      return 0;

    default:
      return 0;
  }
}

/** Theoretical maximum total across a question list — the SCORE-02 ceiling. */
export function getMaxScore(questions: QuizQuestion[]): number {
  return questions.reduce((total, q) => total + getQuestionMaxScore(q), 0);
}
```

**Verified against the real question set** (`[VERIFIED: codebase]`, computed by hand from
`app/lib/quiz/questions.ts` read in full):

| Question ID | Type | Max | Why |
|---|---|---|---|
| `symptoms_nasal` | checkbox_multi | 5 | 5 non-excluded options (sneezing, runny_nose, nasal_congestion, itchy_nose, postnasal_drip); `none` excluded |
| `symptoms_eye` | checkbox_multi | 4 | 4 non-excluded options; `none` excluded |
| `symptoms_sinus` | checkbox_multi | 3 | 3 non-excluded options; `none` excluded |
| `timing_season` | radio_multi | 5 | 5 non-excluded (spring/summer/fall/year_round/certain_times); `only_rarely` excluded |
| `timing_triggers` | radio_multi | 5 | 5 non-excluded (pets/dust/mold/grass/environments); `none` excluded |
| `severity_nasal_congestion`, `severity_sneezing`, `severity_runny_nose`, `severity_nasal_itching`, `severity_eye_itching` | severity_0_3 (×5) | 3 each = 15 | fixed per-type max |
| `impact_sleep`, `impact_daily`, `impact_concentrate`, `impact_social` | frequency_0_4 (×4) | 4 each = 16 | fixed per-type max |
| `bother_overall` | bother_0_4 | 4 | fixed per-type max |
| `taking_meds` | yesno | 0 | no score |
| `med_list` | text_input | 0 | no score |
| `med_control` | control_0_3 | 3 | `Math.max` of option scores (`not_at_all` = 3) |
| `diagnosed_allergic_condition` | yesno | 0 | no score |
| **Total (`getMaxScore(ALL_SCORED_QUESTIONS)`)** | | **60** | 5+4+3+5+5+15+16+4+0+0+3+0 = 60 |

This independently reproduces `05-CONTEXT.md`'s claimed 60 via a different method (a designed,
testable function rather than manual summation), which is the strongest possible confirmation available
without a second human doing the arithmetic by hand. **`ALL_SCORED_QUESTIONS.length` is 19; 16 of
those 19 have `getQuestionMaxScore > 0`** (excludes `taking_meds`, `med_list`,
`diagnosed_allergic_condition`) — matches `05-CONTEXT.md`'s "19 / of which 16 contribute points"
exactly.

**Non-vacuity note for the planner:** because this function is new, its test coverage is not just
"nice to have" — it is the only thing standing between a future new scored question and a silently
wrong SCORE-02 ceiling. At minimum, test: (1) `getMaxScore(ALL_SCORED_QUESTIONS) === 60` today, (2)
each `QuestionType` branch individually with a synthetic question, (3) that adding a synthetic
`severity_0_3` question to a throwaway array increases `getMaxScore` by exactly 3 (proves the
"changes automatically" half of SCORE-02, not just the static "is 60" half).

### Score Scale Data Contract (from UI-SPEC — reproduce exactly, do not redesign)

```typescript
// app/lib/quiz/score-scale.ts — new file

export type ScaleTone = "low" | "low-mid" | "mid" | "mid-high" | "high";

export interface ScaleZone {
  upTo: number;   // inclusive upper bound, raw score points, on the 0..max axis
  tone: ScaleTone;
  label: string;  // display text, independent of `tone` (Phase 5.1 can rename display text later)
}

export interface ScoreScale {
  max: number;         // SCORE-02's derived ceiling — computed via getMaxScore, never a literal
  zones: ScaleZone[];  // ascending upTo; first zone implicitly starts at 0; last zone's upTo === max
  isProvisional: true; // D-04's code-visibility requirement — read by Phase 5.1's admin UI later,
                        // never rendered to the patient (UI-SPEC: "not a patient-facing banner")
}

/**
 * PROVISIONAL — see D-04 (05-CONTEXT.md). Equal thirds of the derived 0-60 range, chosen because
 * it needs no clinical justification of its own: D-05 already decoupled the bar's color from the
 * clinical brackets, so this default's only job is to show linear position, not encode a claim.
 * William confirms or replaces these three numbers via Phase 5.1's admin form before go-live.
 */
const PROVISIONAL_SCORE_SCALE: ScoreScale = {
  max: getMaxScore(ALL_SCORED_QUESTIONS),
  isProvisional: true,
  zones: [
    { upTo: 20, tone: "low", label: "Low" },
    { upTo: 40, tone: "mid", label: "Moderate" },
    { upTo: 60, tone: "high", label: "High" },
  ],
};

/**
 * Phase 5: returns the compiled-in provisional constant, no config channel exists yet. Phase 5.1
 * swaps this implementation to read a DB-backed setting with this same return shape, falling back
 * to PROVISIONAL_SCORE_SCALE on fetch failure — ResultsDisplay's call site does not change.
 */
export function getScoreScale(): ScoreScale {
  return PROVISIONAL_SCORE_SCALE;
}
```

**Rendering math** (from UI-SPEC, verified consistent with the data shape above):

- Zone width: `flex: (zone.upTo - previousUpTo) 0 0` on each `.scaleBar__zone`, so the flex-basis
  sum across all zones equals `scale.max`, filling 100% of `.scaleBar__zones`' width with no JS
  resize listener needed.
- Marker position: `left: (score / scale.max) * 100%` against `.scaleBar__track`, computed once at
  render (no interaction, no resize handling — UI-SPEC explicitly rules out drag/hover/animation).
- Current zone (for the bold legend item): `zones.find(z => score <= z.upTo)`.

### DOM Shape (Component Inventory §2 — the one place a wrong nesting silently breaks accessibility)

UI-SPEC's revision 1 fixed a real structural bug (marker clipping at score=0/max) by requiring this
exact nesting — **the planner should treat this as a hard structural requirement, not a suggestion**,
because a plausible-looking simpler nesting (marker as a child of the clipped zones wrapper) is the
exact bug that shipped in revision 0:

```
.scaleBar__track          (outer, position: relative, role="img", aria-label=..., NO overflow/radius)
├── .scaleBar__zones       (inner, overflow: hidden, border-radius, aria-hidden="true")
│   ├── .scaleBar__zone[data-tone="low"]   (flex: 20 0 0)
│   ├── .scaleBar__zone[data-tone="mid"]   (flex: 20 0 0, border-right seam)
│   └── .scaleBar__zone[data-tone="high"]  (flex: 20 0 0, no border-right — last zone)
└── .scaleBar__marker      (SIBLING of .scaleBar__zones, not descendant — position: absolute,
                             left computed, aria-hidden="true")
```

**Assertion worth writing in the DOM test** (UI-SPEC's own suggestion): the marker's parent element
is `.scaleBar__track`, never `.scaleBar__zones` — cheap, and exactly the kind of structural fact a
future refactor could silently break back into the revision-0 bug.

### CSS Reuse Map (verified exact current values, `quiz.module.css`)

| New/deleted item | Current state | Line(s) |
|---|---|---|
| `.scaleBar` background/radius/padding | Reuses `.quizResults__severity`'s exact values: `background-color: rgba(var(--color-foreground, 32, 34, 35), 0.03)`, `border-radius: var(--quiz-border-radius)`, `padding: var(--quiz-spacing-md)`/`lg` | `948-960` (class being replaced) |
| 4 legacy classes to DELETE | `.quizResults__severityValueMinimal` (`--quiz-color-success`), `Mild` (`--quiz-color-warning`), `Moderate` (`#FF5722`, orphaned — never referenced in `ResultsDisplay.tsx`), `Severe` (`--quiz-color-error`) | `990-1004` |
| `.quizResults__severity`/`__severityLabel`/`__severityValue` to DELETE | The chip's own wrapper + label + value classes (not just the 4 tone variants) | `948-988` |
| `--quiz-color-tone-mid-high: #FF5722` | **Reuses the exact hex** `.quizResults__severityValueModerate` already used — UI-SPEC calls this out explicitly so D-07's cleanup introduces zero net-new hex values in that slot | `999` |
| `.questionCategory__title`'s divider treatment, to reuse for the new "What this means for you" section boundary | `border-bottom: 2px solid rgba(var(--color-foreground, 32, 34, 35), 0.1)` — UI-SPEC's divider is the same treatment, `border-top` instead of `border-bottom` | `295-303` |
| `.quizNavigation__button`'s `font-weight: 600` | Reused for the new Label typography role (`.scaleBar__axisLabel`, `.scaleBar__value`, `.scaleBar__meaningHeading`) — confirms UI-SPEC's "no new font weight" claim | `613-627` |
| `.quizResults__scoreCircle` / `__scoreContainer` / `__scoreNumber` | **Unchanged, retained** — neither D-08 nor D-09 names them for removal | `1097-1142` |
| `.quizResults__message h3` / `p`, `.quizResults__recommendation` | **Unchanged, retained** — the three conditional blocks stay structurally and textually identical (D-09) | `1145-1185` |
| `.quizResults__disclaimer` | **Unchanged, retained verbatim** — counsel-owned | `1048-1067` |

`data-tone` as a styling hook has no prior precedent in this file (`ResultsDisplay.tsx` already sets
`data-patient-state` on line 78 but nothing in `quiz.module.css` currently selects against it) —
this phase introduces the first CSS attribute-selector in the file. Not a risk, just worth the
planner knowing there is no existing `[data-...]` CSS rule to copy the exact syntax from; UI-SPEC's
own snippet (`.scaleBar__zone[data-tone="low"] { background-color: var(--quiz-color-tone-low); }`)
is correct standard CSS and needs no adaptation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proportional segment widths | Manual `%` width calculation + a resize listener/`ResizeObserver` | CSS `flex-grow` with `flex: <span> 0 0` (UI-SPEC's own spec) | Flexbox already solves "N items proportional to weight, sum to container width" natively; a resize listener would be new, untested, and unnecessary complexity for something CSS does for free |
| Marker positioning | A `<canvas>` or SVG-based gauge | Absolutely-positioned `<div>` with `left: calc(...)%`, sibling of the clipped zones wrapper | The bar is a static, non-interactive, single-value indicator — SVG/canvas buys nothing here and both would need their own accessibility re-implementation from scratch, whereas the plain-DOM approach reuses the page's existing `role="img"` + `aria-label` pattern trivially |
| Score-ceiling computation | A generic "sum all numeric-typed answers" heuristic, or hardcoding `60` | The explicit `getQuestionMaxScore`/`getMaxScore` pair mirroring `scoreQuestion`/`calculateTotalScore` | A heuristic guess would silently miscount `control_0_3`'s per-option max lookup and `checkbox_multi`'s exclusion-aware count; hardcoding 60 is the exact "silently rotting" failure SCORE-02 exists to prevent |

**Key insight:** every piece of new logic in this phase has a structurally identical sibling already
in the codebase (`scoreQuestion`→`getQuestionMaxScore`, `getRedirectTarget`/`getProductHandle`→
`getScoreScale`). The fastest, lowest-risk path is literal pattern-matching against those siblings,
not inventing a new shape.

## Common Pitfalls

### Pitfall 1: Two switches, one drifts

**What goes wrong:** `scoreQuestion` and the new `getQuestionMaxScore` are two independent `switch`
statements over the same `QuestionType` union. A future question-type addition (or an edit to
`scoreQuestion`) that updates one switch and forgets the other produces a silently wrong ceiling —
exactly the "adding a scored question changes it automatically" failure mode SCORE-02 is meant to
close, reintroduced one level down.
**Why it happens:** TypeScript's exhaustiveness checking on a `switch` only fires if there's a
`default: assertNever(x)` pattern; this codebase's existing `scoreQuestion` and `getScoreBracket`
both use a plain `default: return 0`/fallthrough, which silently swallows an unhandled case rather
than failing loudly.
**How to avoid:** Write the non-vacuity test described above (adding a synthetic question of each
type changes `getMaxScore` by the expected amount) — this catches drift even without exhaustiveness
checking, because a missing switch arm returns 0 for the new type and the test's expected delta fails.
**Warning signs:** A new `QuestionType` added to `types.ts` with no corresponding entry added to
`getQuestionMaxScore`'s switch.

### Pitfall 2: `scoreWeight` looks load-bearing but is dead code

**What goes wrong:** `QuizQuestion.scoreWeight?: number` (`types.ts:36`, "Default 1; override if
needed") reads as something `getQuestionMaxScore` should multiply by. It should not — grepped across
the entire `app/` tree, `scoreWeight` has exactly one reference: its own declaration.
`scoreQuestion` never reads it, so no question in the live question set currently gets weighted
scoring, and applying weighting only in the max-score function (but not in the actual scoring
function) would make the derived ceiling actively wrong (patients could never reach it).
**Why it happens:** The field name and its doc comment strongly imply active use.
**How to avoid:** Do not reference `scoreWeight` in the new code. If a future phase wants weighted
scoring, `scoreQuestion` needs to apply it FIRST, and `getQuestionMaxScore` would need to match — that
is out of scope for Phase 5.
**Warning signs:** Any new code multiplying by `question.scoreWeight`.

### Pitfall 3: Committed theme bundle staleness (this repo's #1 recurring defect class)

**What goes wrong:** `public/quiz-bundle.js`/`.css` are committed build artifacts produced by
`npm run build:theme` (a **separate** Vite config from `npm run build`). Nothing runs this
automatically. Six prior UAT defects on this project trace back to this exact failure mode (per
`STATE.md`'s "Accumulated Context" and the freshness test file's own header comment) — most directly
relevant, Phase 3/4/4.1/4.2 all rebuilt the bundle and extended `tests/quiz-bundle-freshness.test.ts`
in the same plan as the source change.
**Why it happens:** The dev server (`shopify app dev`) and `npm test` do not touch this file; only an
explicit `npm run build:theme` invocation does, and it is easy to forget on a component-only change.
**How to avoid:** The plan MUST include a task that runs `npm run build:theme` twice in a row
(determinism check via SHA-256), commits both `public/quiz-bundle.js` and `public/quiz-bundle.css`
together (per the 04-18 precedent — CSS Modules classes only ship correctly if both move together),
and adds new freshness markers to `tests/quiz-bundle-freshness.test.ts` following the exact template
in that file (measure occurrence count against the PRE-rebuild bundle first — must be 0 or a known
baseline — then against the fresh rebuild, using `SOURCE.split(needle).length - 1`, never `grep -c`).
**Good candidate markers for this phase** (verify 0-before / ≥1-after at execution time, do not trust
this list blindly): `"Preliminary Score"` (new h2 text), `"scaleBar"` or `"scaleBar__track"` (new CSS
class family), `"What this means for you"` (new heading), and the 1–2 business day subtitle fragment
`"1-2 business days"`. A candidate for zero-after (absence): `"Symptom Score:"` (the retired chip
label) and `"severityValueMinimal"` (a retired CSS class name) — the `grep -c` vs. occurrence-count
trap has bitten this project four times already; use `split(needle).length - 1` exclusively.
**Warning signs:** A plan that touches `ResultsDisplay.tsx` or `quiz.module.css` with no
`build:theme` task and no freshness-guard update.

### Pitfall 4: `data-tone` accidentally wired from `scoreBracket`

**What goes wrong:** The single most important semantic rule in this entire phase (D-05/D-06) is that
the bar's `data-tone` and the recommendation block's `scoreBracket` conditional must never share a
source value. It would be easy, mid-implementation, to compute "which zone is the patient in" once
and reuse that computation for both the bar color AND accidentally let it leak into deciding which of
the three `scoreBracket === "0-2"|"3-6"|"7+"` blocks renders (or vice versa) — they use genuinely
different inputs today (`score` vs. `scoreBracket`, a prop already passed to `ResultsDisplay`
separately) but a refactor that tries to "simplify" by deriving one from the other would silently
reintroduce the exact bug D-05 was created to prevent.
**Why it happens:** Both values are ultimately functions of the same underlying `score` number, so
they look related enough to conflate.
**How to avoid:** Keep `getScoreScale()`'s zone lookup and `scoreBracket` (already a separate prop)
completely independent code paths with zero shared intermediate variable. `scoreBracket` continues to
come from the existing `ResultsDisplayProps.scoreBracket` prop (computed upstream by
`getScoreBracket`); the bar's current-zone lookup is a brand-new, separate computation against
`getScoreScale().zones`.
**Warning signs:** Any code passing `scoreBracket` into a function that also produces `data-tone`, or
vice versa.

### Pitfall 5: `ResultsDisplay` prop surface must not grow a new prop for the scale

**What goes wrong:** It would be natural to thread `getScoreScale()`'s result in as a new prop
(`scoreScale={getScoreScale()}`) for "testability"/"purity" reasons. UI-SPEC's Interaction Contract
Summary explicitly locks this: `getScoreScale()` is called **internally** (module-level accessor),
not threaded in as a new prop, and `ResultsDisplay`'s prop shape (`score`, `scoreBracket`,
`patientState`, `symptomProfileId`, `testingStatus`) stays exactly as-is.
**Why it happens:** Passing config as props is the more conventional React pattern and looks more
testable at first glance.
**How to avoid:** Call `getScoreScale()` directly inside the component body, exactly like the existing
`getRedirectUrl()`/`getProductConfig()` module functions are called inline in the current JSX
(`ResultsDisplay.tsx:163,186`) — this is the established convention in this exact file already.
**Warning signs:** A new prop appearing on `ResultsDisplayProps`. `04-CONTEXT.md`'s hard rule (no
callback props reintroduced) is about callbacks specifically, but the "unchanged prop shape" rule
here is UI-SPEC's own, stricter constraint for this phase.

### Pitfall 6: Forgetting the D-10 verification is a real deliverable, not a formality

**What goes wrong:** Treating "confirm D-10 by inspection" as a rubber stamp that needs no plan task,
when it is explicitly called out in both `05-CONTEXT.md` and `05-UI-SPEC.md`'s "Notes for the
planner" as something to actually re-verify against current file text, not assume from the prior
read.
**How to avoid:** Include an explicit plan step that re-reads `ResultsDisplay.tsx:102-142` (verified
current line numbers, see below) and confirms none of the three band messages contains a
purchase/approval promise. **Already independently re-verified during this research pass** (see
"D-10 Verification" below) — the planner can cite this research's confirmation, but the plan should
still name it as a checked criterion, not skip it silently.

## Current Code: ResultsDisplay.tsx (line numbers verified 2026-08-11, current `main`)

```8:14:app/components/quiz/ResultsDisplay.tsx
export interface ResultsDisplayProps {
  score: number;
  scoreBracket: ScoreBracket;
  patientState: "tennessee" | "texas";
  symptomProfileId: string;
  testingStatus: "needs_testing" | "had_testing";
}
```

No callback props exist today (confirmed — `TEST-05`'s terminal-component invariant holds). This
phase must not add any.

```80:81:app/components/quiz/ResultsDisplay.tsx
        <h2 className={styles.quizResults__title}>Your Assessment Results</h2>
        <p className={styles.quizResults__subtitle}>Your responses have been submitted.</p>
```

Both strings change (SCORE-01). Classes (`quizResults__title`, `quizResults__subtitle`) do not.

```90:99:app/components/quiz/ResultsDisplay.tsx
            <div className={styles.quizResults__severity}>
              <span className={styles.quizResults__severityLabel}>Symptom Score:</span>
              <span className={`${styles.quizResults__severityValue} ${
                scoreBracket === "0-2"
                  ? styles.quizResults__severityValueMinimal
                  : scoreBracket === "3-6"
                  ? styles.quizResults__severityValueMild
                  : styles.quizResults__severityValueSevere
              }`}>{scoreBracket}</span>
            </div>
```

This entire block is replaced by the scale-bar markup (D-08 retires the chip; UI-SPEC Component
Inventory §2 gives the exact replacement JSX shape). Note `severityValueModerate` is never
referenced here — confirms the "orphaned" claim in `05-CONTEXT.md`.

Band messages (D-09: verbatim, unedited) confirmed at exactly the claimed lines — see "D-10
Verification" below for the full text re-check.

```212:216:app/components/quiz/ResultsDisplay.tsx
          <div className={styles.quizResults__disclaimer}>
            <p>
              <strong>Disclaimer:</strong> This assessment is a clinical symptom screening tool. Results are used to determine whether sublingual immunotherapy may be appropriate for you. This tool does not diagnose conditions and does not replace evaluation by a licensed healthcare provider.
            </p>
          </div>
```

Untouched (counsel-owned, Phase 8).

## D-10 Verification (re-checked against current file text, 2026-08-11)

All three band messages (`ResultsDisplay.tsx:102-142`) read in full during this research pass. None
contains an approval, unlock, or purchase promise:

- **0-2** ("Your Symptoms Appear Mild and Well-Controlled"): recommends continuing OTC management,
  "consider... scheduling an appointment with an allergist." No purchase language at all.
- **3-6** ("You May Benefit From Seeing an Allergist"): "An allergist can help identify your triggers
  and optimize your treatment plan." No purchase language.
- **7+** ("Sublingual Immunotherapy May Significantly Help You"): "An allergist can perform testing...
  and develop a comprehensive treatment plan, which **may include** prescription medications or
  immunotherapy." Conditional, clinician-mediated language — not a promise the patient can purchase
  if approved.

**Confirms D-10 exactly as `05-CONTEXT.md` asserted.** `DEC-no-approval-promise-copy` is satisfied
by the current text; the plan should record this as a verified (not assumed) checkpoint rather than
scheduling any copy change here.

## Test Patterns

### Unit tests (co-located, `scoring.test.ts` precedent)

`app/lib/quiz/scoring.test.ts` currently tests `calculateTotalScore`/`getScoreBracket`/`scoreQuestion`
against hand-built `QuizAnswers` fixtures, organized by `describe` blocks per invariant being proven
(score parity, structural guarantees, zero-score contributions). The new `getQuestionMaxScore` /
`getMaxScore` tests should follow the same file (or a sibling `score-scale.test.ts` for the
`getScoreScale()`-specific tests) and the same "prove the invariant, not just the happy path" style —
e.g. `getMaxScore(ALL_SCORED_QUESTIONS) === 60` is necessary but not sufficient; also test that each
`QuestionType` branch is individually correct (so a future type addition can't silently zero out).

### DOM tests (`tests/*.test.ts`, NOT `.test.tsx`)

`tests/quiz-part-renderer-dom.test.ts` is the load-bearing precedent: `@vitest-environment jsdom`
pragma at file top, `@testing-library/react`'s `render`/`screen`/`within`/`cleanup`, elements built
with `React.createElement` (not JSX) because `vitest.config.ts`'s test-file glob is
`["app/**/*.test.ts", "tests/**/*.test.ts"]` and does **not** match `.tsx` — widening that glob is
explicitly flagged in that file's own header comment as "a config change with a wider blast radius
than this plan warrants." A new `tests/quiz-results-scale-bar-dom.test.ts` should follow this exact
shape: render the real `ResultsDisplay` with a real `score`/`scoreBracket` pair, then assert:

- The `.scaleBar__track`-equivalent element has `role="img"` and an `aria-label` containing the score,
  the max, and the zone name (per UI-SPEC's Accessibility Contract self-sufficiency requirement).
- Each `.scaleBar__zone` carries the correct `data-tone` value at the correct proportional width
  (query via `container.querySelectorAll` since CSS Modules class names are hashed — assert on
  `data-tone` attribute values, not on generated class name strings, which is exactly why UI-SPEC
  chose an attribute over a class-per-tone).
- The current-zone legend item has `font-weight: 700` applied (or, more robustly against a jsdom
  render, that the correct legend item text has the "current" indicator — check how the codebase
  asserts inline/computed styles elsewhere, e.g. via `getComputedStyle` or a dedicated class, before
  committing to a specific query strategy at plan time).
- **Structural regression guard for the DOM-shape fix**: `.scaleBar__marker`'s parent node is the
  same element as `.scaleBar__track` (not `.scaleBar__zones`) — UI-SPEC's own suggested one-line
  assertion, directly guards against the revision-0 clipping bug recurring.
- Score = 0 and score = max (60) render without visual/DOM error — UI-SPEC calls score=0 "a genuine
  minimal-symptom outcome, not an edge case."

`ResultsDisplay` is **not currently covered by any dedicated test file** — confirmed via glob search
(`**/ResultsDisplay*.test.tsx` = 0 results; no `.test.ts` for it either). This phase's DOM test would
be the first for this component specifically, though `QuizContainer`'s three `getScoreBracket` call
sites are exercised indirectly by `scoring.test.ts`'s score-parity tests.

### Source-text guard pattern (optional, precedent exists but likely unnecessary here)

`tests/quiz-medical-history-deletion.test.ts` establishes a "prove RED before GREEN" pattern for code
deletions — read the source file as a string, assert specific substrings are present (positive
control) or absent (the actual deletion proof), using `source.split(needle).length - 1`. This could
be applied to prove the four legacy CSS classes are actually gone from `quiz.module.css` (0
occurrences of `severityValueMinimal`/`Mild`/`Moderate`/`Severe` post-edit) but is likely
**unnecessary overhead for this phase** — a simple CSS Modules import in a DOM test failing to
resolve those class names, or a straightforward code review, is probably sufficient given this is a
CSS deletion (not a dangerous-if-silently-reintroduced dead code path like a `FlowStep` union member).
Flagged as planner's discretion, not a requirement.

## Theme Bundle Rebuild / Freshness Guard Implications

Current committed bundle: `public/quiz-bundle.js` = 201,707 bytes, `public/quiz-bundle.css` =
51,134 bytes (`[VERIFIED: wc -c, 2026-08-11]` — this is the Phase 4.2-era artifact, unchanged since
the last rebuild). Build command: `npm run build:theme` (`vite build --config vite.theme.config.ts`).
Determinism check convention (every prior phase): run twice, compare SHA-256. The plan must include
this as its own task (or an explicit step within a task), matching every one of Phases 3/4/4.1/4.2's
final waves.

**Both files move together** — the 04-18 plan's lesson (recorded in `STATE.md`) is that
`quiz-bundle.css` must be committed alongside `quiz-bundle.js` in the same commit even when the
task's `files_modified` list only names the `.js` file, because CSS Modules class names in the JS
bundle reference the CSS bundle's generated selectors — they are one build output split across two
files and cannot ship independently without breaking styling.

## Runtime State Inventory

Not applicable — this is a greenfield feature addition (new scale-bar UI, new scoring functions), not
a rename, refactor, or migration. No stored data, live service config, OS-registered state, secrets,
or build artifacts reference anything being renamed. The one artifact this phase touches
(`public/quiz-bundle.js`/`.css`) is a standard rebuild-and-commit, covered under "Theme Bundle
Rebuild" above, not a runtime-state migration concern.

## Environment Availability

Skipped — this phase has no external dependencies beyond the toolchain every prior phase already
used successfully (Node 20.19.6 confirmed installed, `[VERIFIED: node --version]`; npm, vitest, and
the Vite theme build config are already working per the committed bundle's existence and the 677/47
green suite recorded in `STATE.md`). No new service, database, or CLI tool is introduced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (`[VERIFIED: package.json]`) |
| Config file | `vitest.config.ts` (test glob: `app/**/*.test.ts`, `tests/**/*.test.ts` — `.tsx` excluded) |
| Quick run command | `npx vitest run app/lib/quiz/scoring.test.ts tests/quiz-results-scale-bar-dom.test.ts` |
| Full suite command | `npm test` (currently 677 tests / 47 files green per `STATE.md`, pre-Phase-5) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCORE-01 | Title/subtitle text change, no promise copy | DOM (string presence) + manual re-read | `npx vitest run tests/quiz-results-scale-bar-dom.test.ts` | ❌ Wave 0 — new file |
| SCORE-02 | `getMaxScore(ALL_SCORED_QUESTIONS) === 60`; changes when a question is added | unit | `npx vitest run app/lib/quiz/scoring.test.ts` | ✅ file exists, needs new `describe` block |
| SCORE-03 | Scale bar renders N zones, correct `data-tone`, marker not clipped, ARIA self-sufficient | DOM | `npx vitest run tests/quiz-results-scale-bar-dom.test.ts` | ❌ Wave 0 — new file |
| (all) | Theme bundle carries the new markers | bundle-freshness | `npx vitest run tests/quiz-bundle-freshness.test.ts` | ✅ file exists, needs new `describe` block appended |

### Sampling Rate

- **Per task commit:** the quick run command scoped to the file(s) touched.
- **Per wave merge:** `npm test` (full suite) + `npm run typecheck`.
- **Phase gate:** full suite green, typecheck clean, both theme-bundle builds byte-identical
  (determinism check), before considering the phase done — matching every prior phase's gate.

### Wave 0 Gaps

- [ ] `app/lib/quiz/score-scale.ts` — does not exist, must be created (the `getScoreScale()` module)
- [ ] `app/lib/quiz/score-scale.test.ts` (or equivalent `describe` block in `scoring.test.ts`) — unit
      tests for `getQuestionMaxScore`/`getMaxScore`/`getScoreScale`
- [ ] `tests/quiz-results-scale-bar-dom.test.ts` — first dedicated `ResultsDisplay` DOM test in the
      repo; also the first test exercising the new scale-bar markup end to end
- [ ] New `describe` block in `tests/quiz-bundle-freshness.test.ts` for Phase 5 markers (cannot be
      written until the actual rebuild happens and real occurrence counts are measured — every prior
      phase's freshness block was written AFTER a real rebuild, using measured counts, never
      predicted counts)

## Security Domain

This phase's ASVS surface is minimal — it renders already-computed, already-validated data
(`score`, `scoreBracket`, both already props on `ResultsDisplay` today) with no new user input, no
new network call, and no new PHI field. The main "security" concern is compliance-adjacent
(clinical honesty), not a traditional injection/auth surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface touched — this is a display-only patient-facing component with an existing prop contract |
| V3 Session Management | No | No session state introduced |
| V4 Access Control | No | No new access-controlled resource |
| V5 Input Validation | No new surface | `score`/`scoreBracket` are already-validated numbers/enums flowing from `QuizContainer`'s existing `calculateTotalScore`/`getScoreBracket` calls; this phase adds no new external input |
| V6 Cryptography | No | Not applicable |
| V12 (XSS/output encoding) | Yes, inherited | All new copy (axis labels, zone legend text, ARIA label) is static string literals or template-interpolated numbers (`${score} of ${max}`) — React's default JSX escaping applies automatically, same as every other string on this screen. No `dangerouslySetInnerHTML`, no markdown renderer (the codebase's `QuizInfoBlock` type comment explicitly forbids HTML sinks on this exact surface, "Phase 1 closed a reflected XSS on this exact page") |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reflected XSS via interpolated ARIA label | Tampering/Info Disclosure | Not applicable here — `score`/`max`/zone label are all numbers or static-array string literals, never user-supplied free text, so there's no untrusted string reaching the `aria-label` template |
| Third-party script on a PHI-collecting page | Info Disclosure | `CLAUDE.md` rule 4 — this phase adds zero new dependencies and zero new scripts; confirmed no icon/charting library needed (see Standard Stack) |
| PHI logged in error paths | Info Disclosure | Not applicable — no new error path introduced; `score`/`scoreBracket` are not PHI per `CLAUDE.md`'s PHI field list (they're derived clinical values already displayed to the patient, not name/dob/email/phone) |

No new HIPAA/PHI-path surface is created by this phase — `score_bracket` is already persisted
(`payload.ts:110`) and already patient-facing; this phase changes only how it's *displayed*, not what
is collected or stored. Phase 5.1 (not this phase) is where the PHI-path review actually applies
(new `submissions.scale_version` column).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended DOM-test assertion strategy for "current zone is bold" (via computed style or a dedicated class) will need to be finalized against however CSS Modules classes actually resolve under jsdom in this repo's vitest setup — not independently verified in this research pass, since no prior DOM test in the repo asserts on font-weight specifically | "Test Patterns / DOM tests" | Low — worst case the planner tries `getComputedStyle` first, finds jsdom doesn't compute it fully (a known jsdom limitation for CSS Modules-generated class rules), and falls back to asserting a dedicated marker class/attribute instead; this is a test-implementation detail, not a phase-blocking risk |
| A2 | `getScoreScale()` living in a **new** file (`score-scale.ts`) rather than being added to `scoring.ts` is a recommendation based on the `redirects.ts`/`product-links.ts` convention, not an explicit instruction in CONTEXT.md or UI-SPEC (both say "wherever `getScoreScale()`'s Phase 5 constant lives" — deliberately non-prescriptive) | "Architecture Patterns" | Low — either location works functionally; the recommendation is about maintainability and matching an established convention, not a hard requirement. Planner may choose `scoring.ts` instead without contradicting any locked decision |

**If this table looks short:** it is, deliberately — nearly everything else in this research is
`[VERIFIED: codebase]` by direct file read, not inference. The two entries above are the only points
where this research made a judgment call beyond what CONTEXT.md/UI-SPEC explicitly locked.

## Open Questions

1. **Does the planner want the max-score functions exposed for reuse elsewhere (e.g., a future admin
   UI showing "X of 60"), or kept as an internal implementation detail of `score-scale.ts`?**
   - What we know: Phase 5.1's admin form will need to know the derived max to validate that band
     stops "cover it without gaps" (SCALE-02's validation rule, per `REQUIREMENTS.md:179`).
   - What's unclear: whether Phase 5.1 imports `getMaxScore` directly or re-derives it via
     `getScoreScale().max`.
   - Recommendation: export `getMaxScore`/`getQuestionMaxScore` from `scoring.ts` as public API (not
     module-private) so Phase 5.1 has a clean import path already proven correct by Phase 5's tests,
     rather than needing to re-derive or duplicate the logic.

## Sources

### Primary (HIGH confidence — direct codebase read, 2026-08-11)

- `app/components/quiz/ResultsDisplay.tsx` (full file) — exact current structure, line numbers,
  band-message text
- `app/lib/quiz/scoring.ts` (full file) — `scoreQuestion`, `calculateTotalScore`, `getScoreBracket`,
  `SCORE_BRACKETS`
- `app/lib/quiz/questions.ts` (Parts 1-5, lines 1-265) — every scored question's type/options, used
  to hand-verify the 60-point ceiling independently
- `app/lib/quiz/types.ts` (full file) — `QuestionType` union, `QuizQuestion` interface,
  `scoreWeight`'s dead-code status
- `app/lib/quiz/payload.ts` (full file) — `score_bracket` persistence call site
- `app/lib/quiz/redirects.ts`, `app/lib/quiz/product-links.ts` (full files) — the
  config-with-fallback module convention `getScoreScale()` should follow
- `app/styles/quiz.module.css` (lines 1-50, 290-313, 613-627, 840-1190) — legacy severity classes,
  spacing/color tokens, reusable divider/weight patterns
- `tests/quiz-bundle-freshness.test.ts` (full file) — bundle rebuild + freshness-marker convention
- `tests/quiz-part-renderer-dom.test.ts` (lines 1-80) — DOM test infrastructure precedent
- `tests/quiz-medical-history-deletion.test.ts` (lines 1-60) — source-text guard precedent
- `app/lib/quiz/scoring.test.ts` (full file) — unit test style precedent
- `package.json` — confirmed dependency versions, test/build scripts, zero new packages needed
- `.planning/phases/05-preliminary-score-page/05-CONTEXT.md`, `05-UI-SPEC.md` — locked decisions and
  approved design contract (see `<user_constraints>` above)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — project-level status,
  traceability, and phase sequencing
- Direct measurement: `wc -c public/quiz-bundle.js public/quiz-bundle.css` (201,707 / 51,134 bytes),
  `node --version` (v20.19.6), grep for `MaxScore|maxScore|getMax|theoretical|ceiling` (zero matches
  — confirms no existing max-score function) and `scoreWeight` (one match, its own declaration)

### Secondary / Tertiary

None — no WebSearch, Context7, or external documentation was needed for this phase. Everything
required to plan it is already in this repository.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, every tool already installed and verified via
  `package.json`
- Architecture: HIGH — every pattern either directly copies an existing, working module
  (`redirects.ts`/`product-links.ts`) or is fully specified by the already-approved UI-SPEC
- Max-score derivation design: HIGH confidence in the approach (mirrors `scoreQuestion` exactly,
  independently reproduces the claimed 60), MEDIUM on exact function naming/file placement (flagged
  as Assumption A2 — a reasonable planner judgment call, not a verified requirement)
- Pitfalls: HIGH — five of six are drawn from this project's own documented incident history
  (`STATE.md`'s "Accumulated Context"); the sixth (`data-tone`/`scoreBracket` conflation) is a direct
  reading of D-05/D-06's own stated rationale

**Research date:** 2026-08-11
**Valid until:** No expiry concern — this is a snapshot of the current repo state, not a
time-sensitive external API. Re-verify line numbers if any other phase touches
`ResultsDisplay.tsx`/`scoring.ts`/`quiz.module.css` before this phase executes.
