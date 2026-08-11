# Phase 5: Preliminary Score Page - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 8 (2 modified + 2 new lib files, 1 modified component, 1 modified CSS, 1 new DOM test, 1 modified freshness test) + 1 build-artifact pair
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/lib/quiz/scoring.ts` (add `getQuestionMaxScore`, `getMaxScore`) | utility (pure function) | transform | `scoreQuestion` / `calculateTotalScore` in the same file | exact — sibling functions, same file |
| `app/lib/quiz/score-scale.ts` (new) | config module (accessor + fallback constant) | transform | `app/lib/quiz/redirects.ts` (and `product-links.ts`) | exact — identical "config-with-fallback, pure function" shape |
| `app/lib/quiz/scoring.test.ts` (add `describe` blocks) | test (unit) | transform | itself, existing `describe`/`it` structure | exact — same file, established style |
| `app/lib/quiz/score-scale.test.ts` (new, optional sibling) | test (unit) | transform | `app/lib/quiz/scoring.test.ts` | exact — same directory, same unit-test conventions |
| `app/components/quiz/ResultsDisplay.tsx` (modify) | component | request-response (props → render) | itself (in-place edit) | exact — no better analog than the file being edited |
| `app/styles/quiz.module.css` (modify: delete 4 legacy classes, add `.scaleBar__*` + tone tokens) | style/config | transform | `.quizResults__severity*` block (being replaced) + `.questionCategory__title` (divider) + `.quizNavigation__button` (weight 600) | role-match — CSS Modules file, no new pattern needed |
| `tests/quiz-results-scale-bar-dom.test.ts` (new) | test (DOM) | request-response | `tests/quiz-part-renderer-dom.test.ts` | exact — first dedicated `ResultsDisplay` test, but same jsdom/`.test.ts`/`React.createElement` infra |
| `tests/quiz-bundle-freshness.test.ts` (add `describe` block) | test (bundle-artifact guard) | batch (string-occurrence assertions on a build artifact) | itself — the file's own Phase 4/4.1/4.2 `describe` blocks | exact — same file, repeated per-phase pattern |
| `public/quiz-bundle.js` / `public/quiz-bundle.css` (rebuilt artifact) | build artifact | batch | prior phases' rebuild step (no source file — a command, not code) | n/a — process pattern, not a code analog |

## Pattern Assignments

### `app/lib/quiz/scoring.ts` (utility, transform) — add `getQuestionMaxScore` / `getMaxScore`

**Analog:** `scoreQuestion` and `calculateTotalScore`, same file, lines 32-76.

**Imports pattern** (line 1 — no change needed, `QuizQuestion` already imported):

```1:1:app/lib/quiz/scoring.ts
import { type QuizAnswers, type QuizQuestion } from "./types";
```

**Core pattern to mirror — `scoreQuestion`'s switch** (lines 32-66):

```32:66:app/lib/quiz/scoring.ts
export function scoreQuestion(
  question: QuizQuestion,
  answer: string | string[] | number | undefined
): number {
  if (answer === undefined || answer === null) return 0;

  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi": {
      if (!Array.isArray(answer)) return 0;
      const excluded = new Set(question.excludeFromScore || []);
      return answer.filter((v) => !excluded.has(v)).length;
    }

    case "severity_0_3":
    case "frequency_0_4":
    case "bother_0_4": {
      if (typeof answer !== "number") return 0;
      return answer;
    }

    case "control_0_3": {
      if (typeof answer !== "string") return 0;
      const opt = question.options?.find((o) => o.value === answer);
      return opt?.score ?? 0;
    }

    case "yesno":
    case "text_input":
      return 0;

    default:
      return 0;
  }
}
```

`getQuestionMaxScore` must branch over the **same 9-member `QuestionType` union** (`app/lib/quiz/types.ts:6-20` — note two members not yet in `scoreQuestion`'s switch: `radio_single`, `text_input_short`, `file_multi`, all no-score/0). RESEARCH.md's designed implementation (reproduced verbatim below) is the concrete target — this is not a "design from analogy" task, it's a "implement this already-fully-specified pair" task:

```typescript
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

export function getMaxScore(questions: QuizQuestion[]): number {
  return questions.reduce((total, q) => total + getQuestionMaxScore(q), 0);
}
```

**Sibling-pair reduce pattern to mirror** (`calculateTotalScore`, lines 71-76 — `getMaxScore` above is structurally identical, `reduce` + per-item scorer):

```71:76:app/lib/quiz/scoring.ts
export function calculateTotalScore(questions: QuizQuestion[], answers: QuizAnswers): number {
  return questions.reduce((total, question) => {
    const answer = answers[question.id];
    return total + scoreQuestion(question, answer);
  }, 0);
}
```

**Doc-comment convention** — every exported function in this file has a `/** ... */` block above it explaining the "why" (see lines 12-31, 68-70, 78-80, 87-89). Follow the same style; RESEARCH.md's draft comment for `getQuestionMaxScore` (explaining the "two switches, one drifts" pitfall and the `scoreWeight` dead-code warning) should be preserved close to verbatim since it documents a real, project-specific pitfall, not generic narration.

**Export surface note:** per RESEARCH.md's Open Question #1 (resolved with a recommendation), export both `getQuestionMaxScore` and `getMaxScore` as public API (not module-private) — Phase 5.1's admin form will need `getMaxScore` for band-coverage validation.

---

### `app/lib/quiz/score-scale.ts` (new file — config module, transform)

**Analog:** `app/lib/quiz/redirects.ts` (full file, 59 lines) and `app/lib/quiz/product-links.ts` (full file, 50 lines) — both establish the exact "pure function takes an optional config object, falls back to a module constant" shape this new file must follow.

**Full analog for structural reference** (`redirects.ts`):

```26:59:app/lib/quiz/redirects.ts
export const REDIRECT_FALLBACK = {
  consult: "/products/allergy-consultation",
  testOptions: "/pages/test-options",
} as const;

/** The two quiz exits that hand off to a storefront page. */
export type RedirectKind = keyof typeof REDIRECT_FALLBACK;

/** The redirect slice of the `AlleDropsQuizConfig` object the quiz embed injects. */
export type QuizRedirectConfig =
  | {
      consultRedirectUrl?: string;
      testOptionsRedirectUrl?: string;
    }
  | undefined;

/**
 * Resolve where a quiz exit should send the patient, preferring merchant configuration.
 *
 * A populated config value wins; a missing, undefined, or empty value falls back to
 * `REDIRECT_FALLBACK`. Whitespace-only settings count as blank — the theme editor stores an
 * untouched URL field as an empty string, but a hand-edited template JSON can carry a stray space,
 * and treating that as configured would navigate the patient to a path of nothing.
 *
 * Pure by construction: takes the config as an argument rather than reaching for a browser global,
 * so it is testable under vitest's `node` environment. The thin browser-global wrapper belongs in
 * the calling component, matching `./product-links.ts`.
 */
export function getRedirectTarget(kind: RedirectKind, cfg: QuizRedirectConfig): string {
  const raw = kind === "consult" ? cfg?.consultRedirectUrl : cfg?.testOptionsRedirectUrl;
  const configured = (raw || "").trim();
  if (configured !== "") return configured;
  return REDIRECT_FALLBACK[kind];
}
```

**What `score-scale.ts` reuses from this shape, concretely:**
- A module-level constant holding the fallback (`REDIRECT_FALLBACK` → `PROVISIONAL_SCORE_SCALE`).
- A doc-comment above the constant explaining *why* the specific values were chosen — `redirects.ts:8-20`'s "verified against the live storefront on 2026-07-30..." is the precedent for `score-scale.ts`'s D-04 provisional-marking comment (RESEARCH.md already drafted this comment — reuse verbatim).
- One exported accessor function, `get*()`, with no arguments needed in Phase 5 (unlike `getRedirectTarget(kind, cfg)`, `getScoreScale()` takes no config argument yet because no config channel exists — RESEARCH.md's Data Contract section confirms this explicitly: "Phase 5's implementation only needs the fallback constant").
- **Deviation from the analog, intentionally:** `getScoreScale()` has no `cfg` parameter in Phase 5 (the analogs' `cfg` parameter models a channel — `AlleDropsQuizConfig` — that does not yet carry score-scale data; Phase 5.1 adds that parameter when the DB-backed read lands). Do not add a placeholder `cfg` parameter now — YAGNI, and UI-SPEC's Interaction Contract Summary explicitly scopes Phase 5 to "no config channel exists to read from yet."

**Type shape to reproduce exactly (from UI-SPEC/RESEARCH, locked, do not redesign):**

```typescript
export type ScaleTone = "low" | "low-mid" | "mid" | "mid-high" | "high";

export interface ScaleZone {
  upTo: number;
  tone: ScaleTone;
  label: string;
}

export interface ScoreScale {
  max: number;
  zones: ScaleZone[];
  isProvisional: true;
}

const PROVISIONAL_SCORE_SCALE: ScoreScale = {
  max: getMaxScore(ALL_SCORED_QUESTIONS),
  isProvisional: true,
  zones: [
    { upTo: 20, tone: "low", label: "Low" },
    { upTo: 40, tone: "mid", label: "Moderate" },
    { upTo: 60, tone: "high", label: "High" },
  ],
};

export function getScoreScale(): ScoreScale {
  return PROVISIONAL_SCORE_SCALE;
}
```

This file will need `import { getMaxScore } from "./scoring"` and `import { ALL_SCORED_QUESTIONS } from "./questions"` — both are established cross-module import paths already used by `scoring.test.ts` (see below) and `QuizContainer.tsx`.

---

### `app/lib/quiz/scoring.test.ts` (modify — add unit tests) / `app/lib/quiz/score-scale.test.ts` (new, optional)

**Analog:** `scoring.test.ts` itself (full file, 123 lines) — establishes the `describe`-per-invariant style, direct imports from `./scoring` and `./questions`, and hand-built fixtures.

**Imports pattern** (lines 1-4):

```1:4:app/lib/quiz/scoring.test.ts
import { describe, it, expect } from "vitest";
import { calculateTotalScore, getScoreBracket, scoreQuestion } from "./scoring";
import { ALL_SCORED_QUESTIONS, getQuestionById } from "./questions";
import type { QuizAnswers } from "./types";
```

**`describe`-per-invariant structure to mirror** (lines 73-122 — one `describe` per proven property, `it` blocks with docstring-style setup above):

```99:114:app/lib/quiz/scoring.test.ts
describe("structural guarantee: ALL_SCORED_QUESTIONS never gains a Part 6 member", () => {
  it("every member has part <= 5", () => {
    for (const question of ALL_SCORED_QUESTIONS) {
      expect(question.part).toBeLessThanOrEqual(5);
    }
  });

  const forbiddenIds = ["has_pcp", "current_medications", "pcp_clinic_name", "pcp_clinic_address"];

  it("contains zero items whose id starts with 'history_' or matches a Part 6 non-history id", () => {
    const offenders = ALL_SCORED_QUESTIONS.filter(
      (q) => q.id.startsWith("history_") || forbiddenIds.includes(q.id)
    );
    expect(offenders).toEqual([]);
  });
});
```

**New tests to add, following this exact style** (per RESEARCH.md's "Non-vacuity note" and Pitfall 1):
1. `getMaxScore(ALL_SCORED_QUESTIONS) === 60` (static ceiling check).
2. Each `QuestionType` branch individually, via a synthetic minimal `QuizQuestion` per type (proves no branch silently returns 0 for a real type).
3. A synthetic `severity_0_3` question appended to a throwaway array increases `getMaxScore` by exactly 3 — the "changes automatically" half of SCORE-02, matching this file's existing style of proving behavioral invariants, not just static values (see `describe("score parity across all three brackets...")`, lines 73-97, for the with/without-comparison idiom to reuse for the delta check).

**`getScoreScale()`-specific tests** (max, ascending zones, `isProvisional: true`) — RESEARCH.md flags this as either a new `score-scale.test.ts` sibling file or an additional `describe` block in `scoring.test.ts`; the sibling-file choice matches this repo's precedent of one test file per lib module (`redirects.test.ts` for `redirects.ts` per the doc-comment reference at `redirects.ts:23`).

---

### `app/components/quiz/ResultsDisplay.tsx` (component, request-response) — in-place edit

**Analog:** the file itself. Three edits, in order of appearance:

**Edit 1 — imports** (add `getScoreScale`, keep existing structure):

```1:6:app/components/quiz/ResultsDisplay.tsx
import { useState } from "react";
import { type ScoreBracket } from "../../lib/quiz/scoring";
import { getRedirectTarget, REDIRECT_FALLBACK, type QuizRedirectConfig } from "../../lib/quiz/redirects";
import { getProductHandle, type QuizProductConfig } from "../../lib/quiz/product-links";
import { toRelativePath } from "../../lib/quiz/navigation";
import styles from "../../styles/quiz.module.css";
```

Add a fifth lib import: `import { getScoreScale } from "../../lib/quiz/score-scale";` — same relative-path depth and same "named import of a `get*` accessor" shape as the two existing lines above it.

**Edit 2 — title/subtitle copy** (SCORE-01, lines 80-81, copy-only change, classes untouched):

```80:81:app/components/quiz/ResultsDisplay.tsx
        <h2 className={styles.quizResults__title}>Your Assessment Results</h2>
        <p className={styles.quizResults__subtitle}>Your responses have been submitted.</p>
```

**Edit 3 — the chip block, replaced by the scale bar** (D-08/SCORE-03, lines 90-99 deleted, UI-SPEC Component Inventory §2 gives the exact replacement DOM shape — `.scaleBar__track` [role="img", no overflow] → `.scaleBar__zones` [overflow:hidden, aria-hidden] → `.scaleBar__zone[data-tone=...]` per zone, plus a sibling `.scaleBar__marker`):

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

**Call-site convention to reuse for `getScoreScale()`** — this file already calls two module-level accessors inline in JSX, exactly the pattern D-06/Pitfall 5 requires (no new prop, called internally):

```163:163:app/components/quiz/ResultsDisplay.tsx
                  href={getRedirectUrl()}
```

```186:186:app/components/quiz/ResultsDisplay.tsx
                  href={`/products/${getProductHandle(patientState, getProductConfig())}`}
```

`getScoreScale()` should be called once near the top of the component body (e.g. `const scale = getScoreScale();`) since its result feeds both the axis-row readout ("7 of 60") and the zones/marker — not re-called per zone.

**Edit 4 — new "What this means for you" heading before the existing conditional blocks** (D-06). The three `scoreBracket === "0-2" | "3-6" | "7+"` blocks (lines 102-142) stay **structurally and textually identical** — do not touch their JSX or copy. Only insert one new `.scaleBar__meaningHeading` element immediately before the first of the three conditionals (it renders once regardless of which bracket is active, not once per branch).

**Untouched, verify only (D-10 — re-read, do not edit):**

```212:216:app/components/quiz/ResultsDisplay.tsx
          <div className={styles.quizResults__disclaimer}>
            <p>
              <strong>Disclaimer:</strong> This assessment is a clinical symptom screening tool. Results are used to determine whether sublingual immunotherapy may be appropriate for you. This tool does not diagnose conditions and does not replace evaluation by a licensed healthcare provider.
            </p>
          </div>
```

**Prop interface — must stay byte-identical** (Pitfall 5, UI-SPEC's hard lock):

```8:14:app/components/quiz/ResultsDisplay.tsx
export interface ResultsDisplayProps {
  score: number;
  scoreBracket: ScoreBracket;
  patientState: "tennessee" | "texas";
  symptomProfileId: string;
  testingStatus: "needs_testing" | "had_testing";
}
```

---

### `app/styles/quiz.module.css` (style, transform) — delete 4 classes, add `.scaleBar__*` family + 5 tone tokens

**Analog 1 — the block being replaced** (delete these three classes and their 4 tone variants, 21 lines total):

```948:1005:app/styles/quiz.module.css
.quizResults__severity {
  text-align: center;
  padding: var(--quiz-spacing-md);
  /* Use theme background with slight opacity */
  background-color: rgba(var(--color-foreground, 32, 34, 35), 0.03);
  border-radius: var(--quiz-border-radius);
}

@media (min-width: 750px) {
  .quizResults__severity {
    padding: var(--quiz-spacing-lg);
  }
}

.quizResults__severityLabel {
  font-size: var(--font-body-size, 1.2rem);
  color: rgba(var(--color-foreground, 32, 34, 35), 0.6);
  margin-bottom: var(--quiz-spacing-xs);
}

@media (min-width: 750px) {
  .quizResults__severityLabel {
    font-size: var(--font-body-size, 1.4rem);
  margin-bottom: var(--quiz-spacing-sm);
  }
}

.quizResults__severityValue {
  font-size: calc(var(--font-heading-scale, 1) * 1.8rem);
  font-weight: 700;
  margin-bottom: var(--quiz-spacing-sm);
  text-transform: capitalize;
}

@media (min-width: 750px) {
  .quizResults__severityValue {
    font-size: calc(var(--font-heading-scale, 1) * 2.4rem);
    margin-bottom: var(--quiz-spacing-md);
  }
}

/* Severity color classes - these are specific accent colors */
.quizResults__severityValueMinimal {
  color: var(--quiz-color-success);
}

.quizResults__severityValueMild {
  color: var(--quiz-color-warning);
}

.quizResults__severityValueModerate {
  color: #FF5722;
}

.quizResults__severityValueSevere {
  color: var(--quiz-color-error);
}
```

`.scaleBar`'s own background/radius/padding should reuse `.quizResults__severity`'s exact values (`background-color: rgba(var(--color-foreground, 32, 34, 35), 0.03)`, `border-radius: var(--quiz-border-radius)`, the same mobile/desktop padding split) — same visual container, new content inside it.

**Analog 2 — root token block, where the 5 new `--quiz-color-tone-*` custom properties get added** (append inside the existing `:root` block, following the existing `--quiz-color-success/warning/error` declarations):

```15:34:app/styles/quiz.module.css
:root {
  /* Mobile-first spacing (compact) */
  --quiz-spacing-xs: 4px;
  --quiz-spacing-sm: 8px;
  --quiz-spacing-md: 12px;
  --quiz-spacing-lg: 16px;
  --quiz-spacing-xl: 20px;
  --quiz-spacing-xxl: 28px;
  
  /* Quiz-specific styling */
  --quiz-border-radius: 6px;
  --quiz-transition: 300ms ease-in-out;
  --quiz-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --quiz-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  /* Quiz accent colors (used for severity indicators) */
  --quiz-color-success: #4CAF50;
  --quiz-color-warning: #FF9800;
  --quiz-color-error: #F44336;
}
```

New tokens per UI-SPEC's Color §2: `--quiz-color-tone-low: var(--quiz-color-success, #4CAF50)`, `--quiz-color-tone-low-mid: #CDDC39`, `--quiz-color-tone-mid: var(--quiz-color-warning, #FF9800)`, `--quiz-color-tone-mid-high: #FF5722` (reused from the deleted `.quizResults__severityValueModerate`, line 999 above), `--quiz-color-tone-high: var(--quiz-color-error, #F44336)`.

**Analog 3 — section-divider treatment to reuse for the new "What this means for you" boundary** (`border-top` instead of `border-bottom`, per UI-SPEC §3):

```295:303:app/styles/quiz.module.css
.questionCategory__title {
  font-family: var(--font-heading-family, var(--font-body-family, inherit));
  font-size: calc(var(--font-heading-scale, 1) * 1.6rem);
  font-weight: 700;
  margin: 0 0 var(--quiz-spacing-md);
  padding-bottom: var(--quiz-spacing-sm);
  border-bottom: 2px solid rgba(var(--color-foreground, 32, 34, 35), 0.1);
  color: rgb(var(--color-foreground, 32, 34, 35));
}
```

**Analog 4 — `font-weight: 600` for the new Label typography role** (`.scaleBar__axisLabel`, `.scaleBar__value`, `.scaleBar__meaningHeading`):

```613:625:app/styles/quiz.module.css
.quizNavigation__button {
  flex: 1;
  padding: var(--quiz-spacing-sm) var(--quiz-spacing-md);
  font-size: var(--font-body-size, 1.4rem);
  font-weight: 600;
  font-family: var(--font-body-family, inherit);
  /* Use theme button color for border */
  border: 2px solid rgb(var(--color-button, 0, 123, 255));
  border-radius: var(--quiz-border-radius);
  cursor: pointer;
  transition: all var(--quiz-transition);
  min-height: 44px;
}
```

**New syntax with no prior precedent in this file — `[data-tone="..."]` attribute selectors** (UI-SPEC's own snippet, standard CSS, needs no adaptation):

```css
.scaleBar__zone[data-tone="low"]      { background-color: var(--quiz-color-tone-low); }
.scaleBar__zone[data-tone="low-mid"]  { background-color: var(--quiz-color-tone-low-mid); }
.scaleBar__zone[data-tone="mid"]      { background-color: var(--quiz-color-tone-mid); }
.scaleBar__zone[data-tone="mid-high"] { background-color: var(--quiz-color-tone-mid-high); }
.scaleBar__zone[data-tone="high"]     { background-color: var(--quiz-color-tone-high); }
```

Ship all five selectors even though the Phase 5 provisional default only exercises three (per UI-SPEC's "arbitrary-N, not arbitrary-N-up-to-3" requirement).

**Retained, unchanged — do not touch:** `.quizResults__scoreCircle` / `__scoreContainer` / `__scoreNumber` (lines ~1097-1142 per RESEARCH.md's CSS Reuse Map), `.quizResults__message h3/p`, `.quizResults__recommendation`, `.quizResults__disclaimer`.

---

### `tests/quiz-results-scale-bar-dom.test.ts` (new — first dedicated `ResultsDisplay` DOM test)

**Analog:** `tests/quiz-part-renderer-dom.test.ts` (full file header + structure, 272 lines) — the repo's first-ever DOM test and the load-bearing precedent for this new file's infra (jsdom pragma, `.test.ts` extension discipline, `React.createElement`, `@testing-library/react` render/screen/within/cleanup).

**File-top pragma and imports to reproduce exactly:**

```1:1:tests/quiz-part-renderer-dom.test.ts
// @vitest-environment jsdom
```

```40:46:tests/quiz-part-renderer-dom.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { QuizPartRenderer, isPartComplete } from "../app/components/quiz/QuizPartRenderer";
import { itemsForPart } from "../app/lib/quiz/schema";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers } from "../app/lib/quiz/types";
```

The new file's import block swaps `QuizPartRenderer`/`schema`/`QUIZ_PARTS` for `ResultsDisplay` (`../app/components/quiz/ResultsDisplay`) and needs no `QuizAnswers` import (the new test's props are `score`/`scoreBracket`/`patientState`/`symptomProfileId`/`testingStatus`, not an answers map).

**`afterEach(cleanup)` + render-helper pattern to reproduce:**

```48:68:tests/quiz-part-renderer-dom.test.ts
afterEach(() => {
  cleanup();
});

// The REAL Part 6 items — reproduces the QUIZ_PARTS -> itemsForPart -> renderer seam that
// failed in session 32, where the container dropped info blocks before the renderer saw them.
const PART_6_ITEMS = itemsForPart(QUIZ_PARTS, 6);

const NO_PCP_SENTENCE =
  "We recommend that you establish with a primary care physician before beginning SLIT.";
const CLINIC_NAME_LABEL = "What is the name of your PCP's clinic?";
const CLINIC_ADDRESS_LABEL = "What is the address of your PCP's clinic?";
const MEDICATIONS_LABEL =
  "What medications (including dosage) are you currently taking (please list all)";

function renderPart6(answers: QuizAnswers, onAnswerChange: (...args: unknown[]) => void = vi.fn()) {
  const utils = render(
    React.createElement(QuizPartRenderer, { items: PART_6_ITEMS, answers, onAnswerChange })
  );
  return { onAnswerChange, ...utils };
}
```

New file's helper becomes `function renderResults(props: ResultsDisplayProps) { return render(React.createElement(ResultsDisplay, props)); }` — same shape, no `onAnswerChange` needed since `ResultsDisplay` has no callback props.

**Assertions this new test must include** (per RESEARCH.md's Test Patterns section, UI-SPEC's Accessibility Contract, and Notes for the planner — not present in the analog file but specified precisely enough to write directly):
- `role="img"` + `aria-label` on the `.scaleBar__track`-equivalent element, containing score/max/zone name (query via CSS Modules-hashed class — use `container.querySelector('[role="img"]')`, not a literal class-name string, matching this file's own caution about hashed classnames).
- Each rendered `.scaleBar__zone` carries the correct `data-tone` attribute (query via `container.querySelectorAll('[data-tone]')`, asserting on the attribute value, never on the generated class name).
- **Structural regression guard (UI-SPEC's explicit ask):** the marker element's parent node is the same element as the track's `role="img"` element, never the inner `overflow:hidden` zones wrapper.
- Score = 0 and score = max (60) both render without error.

**Test-file extension discipline — do not violate:**

```34:37:tests/quiz-part-renderer-dom.test.ts
 * WHY .ts, NOT .tsx. `vitest.config.ts`'s `include` glob is
 * `["app/**\/*.test.ts", "tests/**\/*.test.ts"]` and does not match `.test.tsx` — widening it is
 * a config change with a wider blast radius than this plan warrants (03-04-PLAN.md's
 * `<interfaces>` section). Elements are constructed with `React.createElement`, not JSX.
```

---

### `tests/quiz-bundle-freshness.test.ts` (modify — append one new `describe` block)

**Analog:** the file's own repeated per-phase pattern — four existing `describe` blocks (Phase 2/3, Phase 4, Phase 4.1, Phase 4.2), each with a header doc-comment stating the rebuild date, byte-size delta, and SHA-256 hashes (verified via two-in-a-row `build:theme` runs), followed by `it()` blocks each measuring a real occurrence count (pre-rebuild vs. post-rebuild) with a one-line comment citing both numbers.

**Most recent block to copy the shape from** (header comment + `describe`, lines 382-403 + 403-439):

```382:403:tests/quiz-bundle-freshness.test.ts
/**
 * Phase 4.2 (resume-in-progress-intake) rebuild — plan 04.2-06.
 *
 * Rebuilt 2026-08-11 via `npm run build:theme`, folding in plans 04.2-01 through 04.2-05: the
 * `draft-store.ts` browser-local persistence module, the `resume_offer` FlowStep and its
 * `ResumeOffer`/`RestorationNotice`/`StartOverControl` components, the debounced D-07-gated write
 * effect, the D-09/D-11 resumed-dropzone copy, and the persistent in-flow "Start over" control.
 * Committed bundle byte size moved 195142 -> 201707 bytes (js, +6565) and 48834 -> 50431 bytes
 * (css, +1597). Determinism was verified by running `npm run build:theme` twice in a row and
 * confirming byte-identical SHA-256 hashes for both files
 * (js: `218bfa509630534ab83404a4f3df8777891659d5b3653ff5a4e413bc00741d54`, css:
 * `56da1f09197ab98874f38a67356c2e0ff311c9c15fafef72a2f6ab5a903eb8a9`) before any marker below was
 * trusted. Every count uses `SOURCE.split(needle).length - 1`, never `grep -c` — the file's own
 * documented trap, re-verified this session before any candidate was chosen (all five below
 * measured 0 against the PRE-rebuild committed bundle, ruling out a vacuous match).
 *
 * The Phase 4/4.1 markers above CANNOT detect this staleness — none of Phase 4.2's resume UI or
 * storage code existed when those markers were chosen, and Phase 4.1's `QUIZ_PARTS` order guard
 * (immediately above this block) re-passed unchanged after this rebuild, confirming the reorder
 * survived.
 */
```

**Per-marker `it()` shape to copy verbatim (only the needle/counts/comment change):**

```404:409:tests/quiz-bundle-freshness.test.ts
  it('contains the "resume_offer" FlowStep literal at least once — proves the resume offer step and its QuizContainer wiring are compiled in', () => {
    // Measured against the pre-rebuild committed bundle (195142 bytes): 0 occurrences. Measured
    // against the fresh rebuild (201707 bytes): 2 occurrences.
    const needle = "resume_offer";
    expect(count(needle)).toBeGreaterThanOrEqual(1);
  });
```

**Occurrence-counting helper this whole file depends on — already defined once, reused by every block, no change needed:**

```30:32:tests/quiz-bundle-freshness.test.ts
const SOURCE = readFileSync(join(process.cwd(), "public", "quiz-bundle.js"), "utf-8");

const count = (needle: string): number => SOURCE.split(needle).length - 1;
```

**Candidate markers for the new Phase 5 block** (per RESEARCH.md Pitfall 3 — measure real 0-before/≥1-after counts at execution time, do not trust this list blindly): `"Preliminary Score"` (new h2), `"scaleBar"` or `"scaleBar__track"` (new CSS class family), `"What this means for you"` (new heading), `"1-2 business days"` (new subtitle fragment). Absence markers (must be 0 after): `"Symptom Score:"` (retired chip label), `"severityValueMinimal"` (retired CSS class).

**Determinism-check convention (not code to copy, but a required step referenced by every block above):** run `npm run build:theme` twice in a row, compare SHA-256 of both `public/quiz-bundle.js` and `public/quiz-bundle.css`, record both hashes and the byte-size delta in the new `describe` block's header comment before trusting any occurrence count.

## Shared Patterns

### Config-with-fallback module (redirects.ts / product-links.ts convention)
**Source:** `app/lib/quiz/redirects.ts` (full file), `app/lib/quiz/product-links.ts` (full file)
**Apply to:** `app/lib/quiz/score-scale.ts`
```typescript
export const SOME_FALLBACK = { /* ... */ } as const;

/**
 * Resolve X, preferring merchant configuration.
 * A populated config value wins; missing/undefined/empty falls back to SOME_FALLBACK.
 * Pure by construction — takes config as an argument, testable under vitest's node environment.
 */
export function getX(/* args */): ReturnType {
  const configured = /* read from cfg, default "" */;
  if (configured !== "") return configured;
  return SOME_FALLBACK[key];
}
```
Phase 5's `getScoreScale()` is a degenerate case of this shape (no `cfg` parameter yet, since no config channel exists) — the shared element is the *module structure* (constant + doc-commented accessor), not the parameter list.

### Sibling-switch pattern for scoring functions
**Source:** `app/lib/quiz/scoring.ts` — `scoreQuestion` (lines 32-66)
**Apply to:** `getQuestionMaxScore` (same file)
Both switches must branch over the identical `QuestionType` union member-for-member. A `default: return 0` fallthrough exists in the analog and should be preserved (not upgraded to an exhaustiveness-checked `assertNever`, which would be a scope-creeping change to an existing, working function's error-handling posture) — drift risk is instead covered by the non-vacuity unit test (see scoring.test.ts pattern assignment above), not by a type-level guard.

### Inline module-accessor call in JSX (no new props)
**Source:** `app/components/quiz/ResultsDisplay.tsx` lines 163, 186 (`getRedirectUrl()`, `getProductHandle(...)`)
**Apply to:** the new `getScoreScale()` call inside `ResultsDisplay`
Config/derived-data accessors are called directly in the component body or JSX — never threaded in as a prop. This is both an established convention in this exact file and a hard UI-SPEC lock for this phase (Pitfall 5).

### Per-phase `describe` block in the bundle-freshness guard
**Source:** `tests/quiz-bundle-freshness.test.ts` — four existing blocks (Phase 2/3, 4, 4.1, 4.2)
**Apply to:** the new Phase 5 block in the same file
Header doc-comment states rebuild date, byte-size delta (both `.js` and `.css`), and both SHA-256 hashes from a two-in-a-row determinism check; each `it()` states pre-rebuild and post-rebuild occurrence counts in a comment before the assertion. Every count uses `SOURCE.split(needle).length - 1`.

### CSS Modules doc-comment + retained-token discipline
**Source:** `app/styles/quiz.module.css` (file header, lines 1-8)
**Apply to:** new `.scaleBar__*` rules
No Tailwind, no new library — hand-written class + `@media (min-width: 750px)` mobile-first override block per responsive property, matching every existing rule in this file (see `.quizResults__severity`, lines 948-960, for the exact two-block shape: base rule, then a `@media` override immediately after).

## No Analog Found

None. Every file in this phase either edits an existing file in place, or is a new file with a directly-named structural analog already in the codebase (RESEARCH.md's own "Key insight": every new logic piece in this phase has a structurally identical sibling already present).

## Metadata

**Analog search scope:** `app/lib/quiz/`, `app/components/quiz/`, `app/styles/`, `tests/`
**Files scanned (read in full or targeted range):** `redirects.ts`, `product-links.ts`, `scoring.ts`, `scoring.test.ts`, `ResultsDisplay.tsx`, `types.ts` (lines 1-40), `questions.ts` (grep only), `quiz.module.css` (lines 1-50, 290-313, 610-630, 940-1010), `tests/quiz-part-renderer-dom.test.ts` (lines 1-100), `tests/quiz-bundle-freshness.test.ts` (full file)
**Pattern extraction date:** 2026-08-11

## PATTERN MAPPING COMPLETE

**Phase:** 5 - Preliminary Score Page
**Files classified:** 8 (+1 build-artifact pair)
**Analogs found:** 8 / 8

### Coverage
- Files with exact analog: 7 (`scoring.ts` additions, `score-scale.ts`, `scoring.test.ts` additions, `score-scale.test.ts`, `ResultsDisplay.tsx` in-place edit, `quiz-results-scale-bar-dom.test.ts`, `quiz-bundle-freshness.test.ts` addition)
- Files with role-match analog: 1 (`quiz.module.css` — CSS Modules file, multiple partial analogs combined: block being replaced, root token block, divider treatment, font-weight source)
- Files with no analog: 0

### Key Patterns Identified
- Every new pure function in `scoring.ts`/`score-scale.ts` mirrors an existing sibling function's exact switch/reduce structure (`scoreQuestion`→`getQuestionMaxScore`, `calculateTotalScore`→`getMaxScore`, `getRedirectTarget`/`getProductHandle`→`getScoreScale`) — RESEARCH.md already fully specified these implementations; this is a "match the sibling" task, not a "design from scratch" task.
- `ResultsDisplay.tsx` calls all config/derived-data accessors inline in JSX (no new props ever) — established at lines 163/186 and hard-locked by UI-SPEC for this phase.
- The bundle-freshness test file's four existing per-phase `describe` blocks are a copy-paste-and-fill-in template: header doc-comment (rebuild date, byte deltas, SHA-256 pair) + one `it()` per marker with a measured before/after comment.

### File Created
`.planning/phases/05-preliminary-score-page/05-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files.
