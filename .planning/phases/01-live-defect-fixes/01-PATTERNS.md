# Phase 1: Live Defect Fixes - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 11 (6 modified, 5 created)
**Analogs found:** 9 / 11

## Headline findings

1. **The `consultRedirectUrl` pipeline is a complete four-hop precedent** and every hop is short enough to copy verbatim. D-12 needs zero invention. Excerpted in full below.
2. **`app/lib/quiz/` contains no test files at all.** `navigation.test.ts` and `product-links.test.ts` would be the first colocated tests in that directory. The closest existing colocated pure-module test is one level up: `app/lib/quiz-validation.test.ts`. `app/lib/quiz/scoring.ts` is a good source-side analog for `navigation.ts` but has **no** test to copy.
3. **No test in this repo reads a source file as text.** `grep -rn "readFileSync|node:fs|from 'fs'|process.cwd()"` across all 10 test files returns **zero hits**. `tests/liquid-block-contract.test.ts` and `tests/quiz-embed-contract.test.ts` are a genuinely new pattern here — the planner must treat the RESEARCH.md snippet as the spec, not a codebase convention.
4. **The `entry.theme.tsx:69-71` reference implementation violates two locked decisions** and cannot be copied as-is. See the warning under Pattern Assignment 1.
5. **Two competing test-file style conventions exist** (`app/**` = double quotes + semicolons + relative imports; `tests/**` = single quotes + no semicolons + `~/` alias). Match the directory the new file lands in.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `extensions/quiz-block/blocks/symptom-quiz.liquid` (MOD) | view / theme app block | event-driven (postMessage receiver) + config render | itself (`:61-63` resize branch, `:43-46` `_embed_src`, `:138-149` `url` settings); `app/entry.theme.tsx:61-72` for the scroll branch | self-analog (exact) + partial |
| `app/routes/quiz-embed.tsx` (MOD) | route loader emitting an HTML template | request-response + inline event-driven | itself (`:10-13` param read ↔ `:46-53` config inject) | self-analog (exact) |
| `app/components/quiz/QuizContainer.tsx` (MOD) | component / flow orchestrator | event-driven | itself: `getRedirectUrl` (`:43-52`) for the new config reader; `useEffect` (`:111-122`) for the framed/standalone branch `navigateParent` must mirror | self-analog (exact) |
| `app/lib/quiz/product-links.ts` (MOD) | utility / constant map → pure module | transform | `app/lib/quiz/scoring.ts` | role-match |
| `app/lib/quiz/questions.ts:198` (MOD) | data / content constant | none | n/a — one string literal | n/a |
| `app/lib/quiz/navigation.ts` (NEW) | utility, pure | transform | `app/lib/quiz/scoring.ts` | role-match (exact role, same dir) |
| `app/lib/quiz/navigation.test.ts` (NEW) | test, unit | transform | `app/lib/quiz-validation.test.ts` | role-match (see caveat) |
| `app/lib/quiz/product-links.test.ts` (NEW) | test, unit | transform | `app/lib/quiz-validation.test.ts` | role-match |
| `tests/liquid-block-contract.test.ts` (NEW) | test, contract | **file-I/O** | **none** | **no analog** |
| `tests/quiz-embed-contract.test.ts` (NEW) | test, contract | **file-I/O** | **none** | **no analog** |
| `app/components/quiz/QuizPartRenderer.test.ts` (MOD, +3) | test, unit | transform | itself | self-analog (exact) |

---

## Pattern Assignments

### 1. `extensions/quiz-block/blocks/symptom-quiz.liquid` (view, event-driven)

**Analog A (primary, self):** the existing `quiz:resize` branch — the proven postMessage shape the new branches slot alongside.

`symptom-quiz.liquid:56-69` (the entire current script — this is the whole surface being rewritten):

```liquid
    <script>
      (function() {
        var iframe = document.getElementById('alledrops-quiz-{{ block.id }}');
        window.addEventListener('message', function(e) {
          if (!e.data || typeof e.data !== 'object') return;
          if (e.data.type === 'quiz:resize' && iframe) {
            iframe.style.height = (e.data.height + 24) + 'px';
          }
          if (e.data.type === 'quiz:navigate' && e.data.url) {
            window.location.assign(e.data.url);
          }
        });
      })();
    </script>
```

Patterns to **preserve**: IIFE wrapper, `getElementById('alledrops-quiz-{{ block.id }}')`, single `message` listener with `if (e.data.type === …)` branches, the `+ 24` height pad, `var` only (no `let`/`const` — match the file's existing ES5 register), vanilla JS with zero libraries.

Patterns to **replace**: the bare `!e.data` check becomes the second guard (origin check goes first); `e.data.url` → validated `e.data.path`.

**Analog B (reference only — VIOLATES TWO LOCKED DECISIONS):** `app/entry.theme.tsx:61-72`

```tsx
  window.addEventListener("message", (e: MessageEvent) => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "quiz:resize") {
      iframe.style.height = `${Number(e.data.height) + 24}px`;
    }
    if (e.data.type === "quiz:navigate" && e.data.url) {
      window.location.assign(String(e.data.url));
    }
    if (e.data.type === "quiz:scrollToTop") {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
```

Three flags on this analog — copy the **branch placement only**, not the body:
- `behavior: "smooth"` violates **D-06** and Pitfall 5. The Liquid port must use `behavior: 'instant'` (explicit, not omitted).
- It scrolls `container` — the wrapper div. **D-06 explicitly forbids** scrolling the wrapper (re-shows H1 + medical disclaimer). Target `iframe`.
- Its `quiz:navigate` branch is the same unvalidated `e.data.url` open redirect D-05 exists to close, and it has no `e.origin` check. Do not carry it over.
- `Number(e.data.height)` on line 64 **is** worth carrying over — the Liquid version at `:62` lacks it and the D-05 hardening should add `Number()` + `isFinite()`.

**Analog C — the `_embed_src` construction (the exact D-12 template).** `symptom-quiz.liquid:40-46`:

```liquid
    {%- comment -%} Build embed URL {%- endcomment -%}
    {%- assign fly_url = block.settings.app_url | strip -%}
    {%- if fly_url == blank -%}{%- assign fly_url = 'https://alle-drops-quiz-app.fly.dev' -%}{%- endif -%}
    {%- assign _consult_enc = block.settings.consult_redirect_url | url_encode -%}
    {%- assign _test_enc = block.settings.test_options_redirect_url | url_encode -%}
    {%- assign _test_flag = '0' -%}{%- if block.settings.enable_test_mode -%}{%- assign _test_flag = '1' -%}{%- endif -%}
    {%- assign _embed_src = fly_url | append: '/quiz-embed?consult=' | append: _consult_enc | append: '&testOptions=' | append: _test_enc | append: '&test=' | append: _test_flag -%}
```

Copy the shape exactly: one `{%- assign _<name>_enc = block.settings.<id> | url_encode -%}` per param, then extend the single `_embed_src` chain with `| append: '&tnProduct=' | append: _tn_enc`. Note `fly_url` is already computed here with a blank-fallback — the D-05 origin guard should derive `APP_ORIGIN` from this same `fly_url` variable rather than re-reading `block.settings.app_url`.

**Analog D — schema settings block.** `symptom-quiz.liquid:134-149` — the existing `header` + two `url` settings, which is the exact shape the two `product` pickers replace/join:

```json
    {
      "type": "header",
      "content": "Redirects"
    },
    {
      "type": "url",
      "id": "consult_redirect_url",
      "label": "Consult redirect URL",
      "info": "Where to send users when they choose to schedule a consultation (defaults to /pages/consult if blank)."
    },
```

Conventions: 4-space JSON indent inside `{% schema %}`, `header` blocks group related settings, every setting carries an `info` string that names the fallback behavior in plain language for the merchant. RESEARCH.md's schema snippet (§"Schema snippet") already matches this — use it verbatim. Note the file's `url` settings deliberately carry **no** `default`, so the absence of `default` on the `product` settings will look native.

**Analog E — the `{%- style -%}` block for `scroll-margin-top` (Pitfall 4).** `symptom-quiz.liquid:6-18`:

```liquid
{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ block.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ block.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }}-padding {
      padding-top: {{ block.settings.padding_top }}px;
      padding-bottom: {{ block.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}
```

The `scroll-margin-top` rule lands here, selected by `#alledrops-quiz-{{ block.id }}`. If it becomes a `range` setting, `padding_top` (`:154-163`) is the exact schema template: `"type": "range"` + `min`/`max`/`step`/`unit: "px"`/`default`.

---

### 2. `app/routes/quiz-embed.tsx` (route loader, request-response)

**Analog:** itself. The param-read → config-inject round trip is a two-line-per-value pattern.

**Hop 1 — param read** (`quiz-embed.tsx:10-13`):

```ts
  const consultRedirect = url.searchParams.get('consult') ?? ''
  const testOptionsRedirect = url.searchParams.get('testOptions') ?? ''
  const testMode = url.searchParams.get('test') === '1'
  const shopDomain = url.searchParams.get('shop') ?? ''
```

Add two lines in the same shape: `const tnProductHandle = url.searchParams.get('tnProduct') ?? ''`.

**Hop 2 — config injection** (`quiz-embed.tsx:45-53`):

```ts
  <script>
    window.AlleDropsQuizConfig = {
      appUrl: ${JSON.stringify(origin)},
      shopUrl: ${JSON.stringify(shopDomain)},
      apiEndpoint: ${JSON.stringify(origin + '/api/quiz/submit')},
      testMode: ${JSON.stringify(testMode)},
      consultRedirectUrl: ${JSON.stringify(consultRedirect)},
      testOptionsRedirectUrl: ${JSON.stringify(testOptionsRedirect)},
    };
```

Every value goes through `JSON.stringify` — this is the file's escaping discipline for interpolating into an inline script and must be followed for the new handles. Trailing commas present; keys are camelCase even when the query param is not (`consult` → `consultRedirectUrl`).

**Code to DELETE** (`quiz-embed.tsx:55-59`) — D-02:

```ts
    if (window.self !== window.top) {
      // Navigate parent window instead of the iframe
      window.location.assign = function(url) {
        window.parent.postMessage({ type: 'quiz:navigate', url: String(url) }, '*');
      };
```

Keep the `if (window.self !== window.top) {` guard — the interceptor and the `_reportHeight` block below both live inside it. Delete only the override.

**Code to FIX** (`quiz-embed.tsx:61-72`) — D-03. The mechanism is right; line 70 is the bug:

```ts
      // Intercept anchor clicks so they navigate the parent too
      document.addEventListener('click', function(e) {
        var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!el) return;
        var href = el.getAttribute('href');
        if (!href || href.startsWith('#') || el.target === '_blank') return;
        e.preventDefault();
        window.parent.postMessage({
          type: 'quiz:navigate',
          url: new URL(href, window.location.href).href
        }, '*');
      });
```

Preserve: the `e.target.closest` feature-test, the early-return guard chain, `getAttribute('href')` (not `.href`, which would already be absolutised), `preventDefault()` before posting, `'*'` as targetOrigin. Replace the `url: new URL(...)` value with `path: href` and tighten the guard to the leading-`/` + not-`//` test from RESEARCH.md Pattern 3.

**Error-handling / validation pattern:** this file has none — no try/catch, no schema validation, no thrown errors. It returns a `Response` unconditionally (`:95-101`). Do not introduce error handling that has no precedent here; the guards belong in the inline script's early returns.

---

### 3. `app/components/quiz/QuizContainer.tsx` (component, event-driven)

**Analog A — the config reader (`getRedirectUrl`, `:43-52`).** This is the template for the new `getProductHandle` accessor and it must be followed closely, because the runtime config has **no shared type** — each accessor inline-casts the shape it needs:

```ts
function getRedirectUrl(kind: "consult" | "testOptions"): string {
  if (typeof window === "undefined") return "";
  const cfg = (
    window as unknown as {
      AlleDropsQuizConfig?: { consultRedirectUrl?: string; testOptionsRedirectUrl?: string };
    }
  ).AlleDropsQuizConfig;
  if (!cfg) return "";
  return kind === "consult" ? (cfg.consultRedirectUrl || "") : (cfg.testOptionsRedirectUrl || "");
}
```

Pattern elements: module-scope function above the component; `typeof window === "undefined"` SSR guard first; `window as unknown as { AlleDropsQuizConfig?: {…} }` inline cast (this repo does **not** declare a global); `!cfg` early return; `|| ""` to normalise a blank/missing setting to falsy-empty. Call sites then do `getRedirectUrl("consult") || "/pages/consult"` — the **fallback lives at the call site, not in the accessor**. RESEARCH.md recommends extracting `getProductHandle(state, cfg)` into `product-links.ts` taking config as an argument so it is node-testable; that means splitting this pattern in two — a thin `window`-reading wrapper here, and the pure `(state, cfg) => handle` in `product-links.ts`. Flag: doing it any other way (reading `window` inside `product-links.ts`) makes the unit test in the test map impossible under `environment: "node"`.

Note `isTestModeEnabled` (`:37-41`) is the same pattern in one-line form, and `postQuiz` (`:54-60`) is the third instance. Three existing instances — the convention is settled.

**Analog B — the framed/standalone branch that `navigateParent` must mirror (`:111-122`):**

```ts
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    if (window.self !== window.top) {
      window.parent.postMessage({ type: "quiz:scrollToTop" }, "*");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, currentPartIndex]);
```

This is the exact `window.self !== window.top` ? post : act-locally shape RESEARCH.md's `navigateParent` proposes. Copy it. Per D-08, **do not modify this effect** — it is already correct.

**Analog C — the five exits to rewrite.** All four `window.location.assign` sites share one shape (`:215`, `:228`, `:248`):

```ts
    window.location.assign(getRedirectUrl("consult") || "/pages/consult");
```
```ts
    window.location.assign(getRedirectUrl("testOptions") || "/pages/test-options");
```

and `:328`:

```tsx
                onClick={() => window.location.assign("/")}
```

The mechanical change is `window.location.assign(X)` → `navigateParent(X)`, preserving the `|| "/pages/…"` fallback expression untouched. All three of `:215`/`:228`/`:248` sit at the **end** of an async `useCallback` after a `submitPayload()` try/catch — the error pattern to leave alone is:

```ts
      try {
        await submitPayload();
        setSavedToServer(true);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "Could not save assessment. Please try again.");
        return;
      }
```

The fifth exit (`:332-339`) is the anchor and needs only its `href` source changed:

```tsx
              {patientState && (
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  href={`/products/${PRODUCT_HANDLE_BY_STATE[patientState]}`}
                >
                  Go to AlleDrops Product Page
                </a>
              )}
```

`PRODUCT_HANDLE_BY_STATE[patientState]` → the new config-first accessor. The `/products/${handle}` construction stays (RESEARCH.md §Shopify Block Schema fact 2: pass `.handle`, not `.url`). The import at `:22` (`import { PRODUCT_HANDLE_BY_STATE } from "../../lib/quiz/product-links";`) shows the relative-path import convention used throughout this component — **not** the `~/` alias.

---

### 4. `app/lib/quiz/product-links.ts` (utility → pure module) and `app/lib/quiz/navigation.ts` (NEW)

**Analog:** `app/lib/quiz/scoring.ts` — the only pure, dependency-light module in this directory.

Current `product-links.ts` in full (5 lines):

```ts
/** State-specific AlleDrops product handles (Shopify storefront). Prices/variants live in Shopify Admin. */
export const PRODUCT_HANDLE_BY_STATE = {
  tennessee: "tennessee-allerdrops",
  texas: "texas-allerdrops",
} as const;
```

**Const-map + `as const` pattern** from `scoring.ts:3-10`:

```ts
// Score bracket thresholds (from AOD medical director)
export const SCORE_BRACKETS = {
  LOW: { min: 0, max: 2 }, // "mild and well-controlled"
  MID: { min: 3, max: 6 }, // "may benefit from seeing an allergist"
  HIGH: { min: 7, max: Infinity }, // "would likely benefit from SLIT"
} as const;

export type ScoreBracket = "0-2" | "3-6" | "7+";
```

**Exported pure function pattern** from `scoring.ts:78-92`:

```ts
/**
 * Determine score bracket from total score.
 */
export function getScoreBracket(score: number): ScoreBracket {
  if (score <= SCORE_BRACKETS.LOW.max) return "0-2";
  if (score <= SCORE_BRACKETS.MID.max) return "3-6";
  return "7+";
}

/**
 * Generate unique symptom profile ID.
 */
export function generateSymptomProfileId(): string {
  return `AOD_${Date.now()}`;
}
```

Conventions for both `navigation.ts` and the `getProductHandle` addition: block `/** … */` JSDoc on every export, named `export function` (no default export anywhere in `app/lib/quiz/`), explicit return type annotations, double quotes, semicolons, 2-space indent, `switch` with early `return 0` / guard-clause style rather than nested `if`. `scoreQuestion` (`scoring.ts:32-66`) shows the accepted way to handle unknown-shaped input — `if (answer === undefined || answer === null) return 0;` then `typeof`/`Array.isArray` narrowing — which is the same discipline `isSafeRelativePath(p: unknown)` needs.

`scoring.ts:1` shows the only import style used in this dir: `import { type QuizAnswers, type QuizQuestion } from "./types";` (inline `type` modifier, relative sibling path). `navigation.ts` should need no imports at all.

**Flag:** `app/lib/quiz/types.ts:64-68` defines a `QuizConfig` interface — but it is **dead for this purpose**. `grep` confirms nothing imports it as the runtime window config; `entry.theme.tsx:13-18` declares its own local `QuizConfig` and `QuizContainer` inline-casts. Do not extend `types.ts:QuizConfig` expecting the new handles to flow anywhere.

---

### 5. `app/lib/quiz/navigation.test.ts` + `app/lib/quiz/product-links.test.ts` (NEW, unit)

**Analog:** `app/lib/quiz-validation.test.ts` (complete file — the closest colocated pure-module test):

```ts
import { describe, it, expect } from "vitest";
import { validateQuizData } from "./quiz-validation";

const base = {
  state: "tennessee",
  name: "Test User",
  // …
};

describe("validateQuizData", () => {
  it("rejects invalid score_bracket", () => {
    const r = validateQuizData({ ...base, score_bracket: "moderate" });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("score_bracket");
  });

  it("accepts minimal valid TN payload", () => {
    const r = validateQuizData(base);
    expect(r.valid).toBe(true);
  });
});
```

**Caveat on match quality:** this lives at `app/lib/`, not `app/lib/quiz/`. **`app/lib/quiz/` currently has zero test files** — `ls` shows only `product-links.ts`, `questions.ts`, `scoring.ts`, `types.ts`. The new tests are the first there. `vitest.config.ts` `include: ["app/**/*.test.ts", …]` covers the location, so no config change is needed.

**Conventions for `app/**` tests:** `import { describe, it, expect } from "vitest";` (double quotes, semicolons), sibling relative import `from "./navigation"`, one `describe` per exported function with the function name as the label, `it("<behavior sentence>")`. Shared fixtures as a module-scope `const base` spread per case — useful for the 18-case matrix, though a `it.each` table is unprecedented here (no `it.each` appears anywhere in the suite; a plain loop over an array of `[input, expected]` or 18 explicit `it`s both stay in-convention).

**Second analog, for the multi-describe layout** — `app/components/quiz/QuizPartRenderer.test.ts:1-19`:

```ts
import { describe, it, expect } from "vitest";
import { isPartComplete } from "./QuizPartRenderer";
import { PART1_SYMPTOM_CHECKLIST } from "../../lib/quiz/questions";
import { scoreQuestion } from "../../lib/quiz/scoring";

describe("isPartComplete — Part 1 'None of the above'", () => {
  it("is incomplete when a symptom checklist question is unanswered", () => {
    expect(isPartComplete(PART1_SYMPTOM_CHECKLIST, {})).toBe(false);
  });
```

Note the `describe` label convention: `"<functionName> — <scenario>"` with an em dash. And note this file **imports a pure function out of a `.tsx` file successfully** — the precedent RESEARCH.md relies on for the DEF-04/D-13 additions. Its `PART5_MEDICATIONS`-equivalent import path (`"../../lib/quiz/questions"`) is the one to reuse for asserting the `med_list` label.

**For the DEF-04 label assertion**, the target string is at `questions.ts:194-199`:

```ts
  {
    id: "med_list",
    type: "text_input",
    part: 5,
    text: "Please list your current allergy medications and dosages (required):",
    order: 51,
  },
```

and the enforcement to prove still works is `QuizPartRenderer.tsx:295-298`:

```ts
      case "text_input":
        if (takingMeds === "yes" && question.id === "med_list") {
          if (typeof a !== "string" || !a.trim()) return false;
        }
        break;
```

The D-13 test therefore needs `{ taking_meds: "yes", med_list: "" }` to yield `false` — matching the existing `isPartComplete(PART, answers)` call signature already exercised at `QuizPartRenderer.test.ts:17`.

---

### 6. `tests/liquid-block-contract.test.ts` + `tests/quiz-embed-contract.test.ts` (NEW, contract, file-I/O)

**Analog: NONE.** Verified by grep across all 10 test files for `readFileSync`, `node:fs`, `from "fs"`, `from 'fs'`, and `process.cwd()` — **zero hits**. Every existing test either imports a pure function or `vi.mock`s server modules and calls a route loader. Reading a source artifact as text is a new pattern in this repo.

**Consequence for the planner:** use the RESEARCH.md §"The high-value test the planner should specify" snippet as the authoritative spec (it is the only design available), and expect no in-repo precedent to lean on for path resolution. RESEARCH.md flags the `cwd` assumption — resolve explicitly with `path.join(process.cwd(), "extensions/quiz-block/blocks/symptom-quiz.liquid")` rather than a bare relative string, since no existing test establishes that vitest's cwd behavior here is safe.

**Partial analog for `tests/`-directory conventions only** — `tests/consent-version.test.ts` (complete file, the smallest assert-a-constant test):

```ts
import { describe, it, expect } from 'vitest'
import { CONSENT_VERSION } from '~/lib/consent-version'

describe('CONSENT_VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof CONSENT_VERSION).toBe('string')
    expect(CONSENT_VERSION.length).toBeGreaterThan(0)
  })

  it('matches the expected draft version', () => {
    expect(CONSENT_VERSION).toBe('draft-2026-05-09')
  })
})
```

**Style divergence to respect:** `tests/**` uses **single quotes and no semicolons**; `app/**` tests use **double quotes and semicolons**. `tests/consent-version.test.ts` imports via the `~/` alias (resolved by the `vite-tsconfig-paths` plugin in `vitest.config.ts`, backed by `tsconfig.json` `"~/*": ["./app/*"]`), while `tests/api-admin-submissions.test.ts:12` uses `'../app/routes/api.admin.submissions'`. Both work. The new contract tests import no app modules at all, so only the quote/semicolon convention applies.

`tests/scripts/phi-cleanup.test.ts` confirms nested subdirectories under `tests/` are collected by the `tests/**/*.test.ts` glob, if the planner wants `tests/contracts/`.

---

## Shared Patterns

### Runtime config access (`window.AlleDropsQuizConfig`)
**Source:** `app/components/quiz/QuizContainer.tsx:37-41`, `:43-52`, `:54-60`
**Apply to:** any new reader of a config value in `QuizContainer.tsx`
There is **no** global type declaration and no shared config interface in use. Every accessor is a module-scope function that (a) guards `typeof window === "undefined"`, (b) inline-casts `window as unknown as { AlleDropsQuizConfig?: { …only the keys it needs… } }`, (c) normalises missing to `""`/`false`, and (d) leaves the domain fallback to the call site. Three existing instances. Do not introduce a global `declare` or a shared type — that would be a new pattern with no precedent.

### Escaping values into an inline script
**Source:** `app/routes/quiz-embed.tsx:46-53`
**Apply to:** the two new `_embed_src` params on the read side; and by analogy, `{{ _app_origin | json }}` on the Liquid side
Every interpolated value is wrapped in `JSON.stringify(...)`. The Liquid equivalent is the `| json` filter (RESEARCH.md Pattern 1 uses it for `APP_ORIGIN`) — consistent in intent, though `| json` has no existing use in `symptom-quiz.liquid` today (`url_encode` is the only filter used for embedded values, at `:43-44`).

### Merchant-configurable value → app (the four-hop D-12 pipeline)
**Source:** `symptom-quiz.liquid:138-149` (schema) → `:43,46` (`url_encode` + `_embed_src`) → `quiz-embed.tsx:10-11` (`searchParams.get`) → `:51-52` (config inject) → `QuizContainer.tsx:43-52` (`getRedirectUrl`) → `:215` (call site with `||` fallback)
**Apply to:** both product handles
Six touch points, all excerpted above. This is the single most important pattern in the phase — CONTEXT.md D-12 says "do not invent a new mechanism," and every hop is under 5 lines.

### Vanilla-JS-only in the Liquid block
**Source:** `symptom-quiz.liquid:56-69`
**Apply to:** all parent-side script changes
IIFE, `var`, `function` expressions, no arrow functions, no template literals, no libraries. Reinforced by RESEARCH.md's CLAUDE.md constraint table (`CLAUDE.md:8`, `:145` — no third-party scripts on a PHI-collecting page). The existing script is ES5-clean; keep the port ES5-clean.

### Guard-clause validation over exceptions
**Source:** `app/lib/quiz/scoring.ts:36-43`, `app/routes/quiz-embed.tsx:64-66`, `QuizPartRenderer.tsx:295-298`
**Apply to:** `isSafeRelativePath`, the anchor interceptor guard, both Liquid guards
Unknown input is narrowed with `typeof` / `Array.isArray` checks and rejected via early `return` of a falsy/neutral value. Nothing in the quiz lib layer throws. `isSafeRelativePath` returning `false` and `toRelativePath` returning `null` fits this exactly. The one place RESEARCH.md requires a `try/catch` is around `new URL(...)` in the Liquid `safeUrl` helper — that is the only try/catch in the phase and it has **no** in-repo precedent in a parent-side script (the only `try/catch` blocks in `QuizContainer.tsx` wrap `await submitPayload()`).

### Async action error handling (leave unchanged)
**Source:** `app/components/quiz/QuizContainer.tsx:206-213`, `:220-227`
**Apply to:** none — this is the pattern the five-exit rewrite must **not** disturb
`try { await submitPayload(); setSavedToServer(true); } catch (e) { console.error(e); alert(…); return; }` then navigate. The `navigateParent()` swap happens on the line *after* the catch; the catch block is out of scope.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/liquid-block-contract.test.ts` | test | file-I/O | Zero tests in this repo read a source file as text. Verified: no `readFileSync`, `node:fs`, `fs`, or `process.cwd()` in any of the 10 test files. Use RESEARCH.md's snippet as the spec. |
| `tests/quiz-embed-contract.test.ts` | test | file-I/O | Same. Additionally, no existing test asserts on the *absence* of a string in a source file. |

Partial mitigation for both: `tests/consent-version.test.ts` supplies the `tests/`-directory style conventions (single quotes, no semicolons, `describe`/`it` shape), and the assertion vocabulary (`toContain`, `not.toMatch`) is already used in `app/lib/quiz-validation.test.ts:20` (`expect(r.error).toContain("score_bracket")`).

## Constraint Compliance Check

| Constraint | Status against the analogs above |
|------------|----------------------------------|
| `environment: "node"`, no DOM | ✅ All four new/extended test files are pure string logic or `fs` reads. No analog pulls in DOM. `QuizPartRenderer.test.ts` proves importing a pure fn from `.tsx` works in node. |
| `.test.ts` only (`.test.tsx` not collected) | ✅ All five test analogs are `.test.ts`. No `.test.tsx` exists in the repo. |
| No new dependencies | ✅ Every analog uses only `vitest` + `node:fs`/`node:path` (builtins). |
| Baseline 51 passing must not regress | ⚠️ `QuizPartRenderer.test.ts` is the only **existing** file being modified. It has 4 tests across 2 `describe`s and imports `PART1_SYMPTOM_CHECKLIST` + `scoreQuestion`; adding a `PART5`-scoped `describe` is additive and touches nothing existing. |
| Fixes go in Liquid, never `entry.theme.tsx` | ⚠️ **`app/entry.theme.tsx` is cited as a reference analog and must be READ-ONLY.** Its handler additionally violates D-06 twice (`behavior: "smooth"`, scrolls the wrapper) and carries the D-05 open redirect. Flagged in Pattern Assignment 1. |
| `shopUrl` is empty in production — build nothing on it | ✅ No analog excerpted here depends on `shopUrl`. `QuizContainer.tsx:60` (`if (cfg?.shopUrl)`) is the deferred item and is not part of any pattern above. |

## Metadata

**Analog search scope:** `app/lib/quiz/`, `app/lib/`, `app/routes/`, `app/components/quiz/`, `extensions/quiz-block/`, `tests/`, `tests/scripts/`
**Files read:** 13 (`symptom-quiz.liquid`, `quiz-embed.tsx`, `QuizContainer.tsx` §1-130/200-349, `entry.theme.tsx`, `product-links.ts`, `scoring.ts`, `types.ts`, `questions.ts` §190-210, `QuizPartRenderer.tsx` §285-305, `quiz-validation.test.ts`, `QuizPartRenderer.test.ts`, `consent-version.test.ts`, `api-admin-submissions.test.ts` §1-20, plus `vitest.config.ts` and `tsconfig.json`)
**Greps run:** `AlleDropsQuizConfig` across `app/`; `readFileSync|node:fs|fs|process.cwd()` across all `*.test.ts`
**Pattern extraction date:** 2026-07-30
