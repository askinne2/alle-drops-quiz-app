# Phase 6: Purchase Prerequisites & Returning Patients - Pattern Map

**Mapped:** 2026-08-12
**Files analyzed:** 16
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `extensions/purchase-prerequisites/shopify.extension.toml` | config | request-response | `extensions/quiz-block/shopify.extension.toml` | exact |
| `extensions/purchase-prerequisites/blocks/purchase-prerequisites.liquid` | component | request-response | `extensions/quiz-block/blocks/symptom-quiz.liquid` | role-match |
| `extensions/purchase-prerequisites/assets/purchase-prerequisites.js` | utility | event-driven | Inline `<script>` in `symptom-quiz.liquid` (fail-open `console.warn`) | partial |
| `extensions/purchase-prerequisites/assets/purchase-prerequisites.css` | config | transform | `{%- style -%}` + BEM classes in `symptom-quiz.liquid` | partial |
| `extensions/purchase-prerequisites/locales/en.default.json` | config | transform | `extensions/quiz-block/locales/en.default.json` | exact |
| `extensions/order-review-notice/shopify.extension.toml` | config | request-response | `extensions/quiz-history/shopify.extension.toml` | exact |
| `extensions/order-review-notice/package.json` | config | request-response | `extensions/quiz-history/package.json` | exact |
| `extensions/order-review-notice/src/ThankYou.jsx` | component | request-response | `extensions/quiz-history/src/QuizHistoryBlock.jsx` | role-match |
| `extensions/order-review-notice/src/OrderStatus.jsx` | component | request-response | `extensions/quiz-history/src/QuizHistoryBlock.jsx` | role-match |
| `extensions/order-review-notice/src/ReviewNotice.jsx` | component | request-response | `QuizHistoryBlock.jsx` static empty-state branch | partial |
| `tests/fixtures/sense-buy-buttons-excerpt.liquid` | test | file-I/O | Theme `snippets/buy-buttons.liquid:73-114` (vendor excerpt) | exact (source) |
| `tests/sense-atc-selector-contract.test.ts` | test | file-I/O | `tests/liquid-block-contract.test.ts` + `quiz-bundle-freshness` count helper | role-match |
| `tests/purchase-prerequisites-block-contract.test.ts` | test | file-I/O | `tests/liquid-block-contract.test.ts` | exact |
| `tests/order-review-notice-extension-contract.test.ts` | test | file-I/O | `tests/liquid-block-contract.test.ts` + `entry-theme-contract.test.ts` | role-match |
| `06-SHOP-05-COPY-DRAFT.md` | config | transform | `04-STOREFRONT-COPY-DRAFT.md` | exact |
| `06-SHOP-06-FULFILLMENT-PROCESS.md` | config | transform | `04-STOREFRONT-COPY-DRAFT.md` (ownership/status framing) | role-match |

**Read-only context (do not modify in this phase):**

| File | Why |
|------|-----|
| `app/lib/shopify/metafields.ts` | Namespace/keys/types Liquid must match; D-05 forbids a third metafield |
| Theme `snippets/buy-buttons.liquid` | Selector + express-checkout coupling (CI fixture source only) |
| Theme `templates/product.regional-drops.json` | Editor flips `show_dynamic_checkout`; never `theme push` (D-03) |

## Pattern Assignments

### `extensions/purchase-prerequisites/shopify.extension.toml` (config, request-response)

**Analog:** `extensions/quiz-block/shopify.extension.toml`

**Core pattern** (lines 1-3):
```toml
name = "quiz-block"
uid = "62f81ede-ac8c-fbc2-38be-82b941a68f0a41687618"
type = "theme"
```

**Copy guidance:** Use `shopify app generate extension` (theme type) so CLI assigns `uid`. Mirror minimal TOML: `name`, `uid`, `type = "theme"`. Prefer **new directory** `purchase-prerequisites/` — do not add a second block under `quiz-block/` (RESEARCH: couples PHI iframe to commerce gate).

---

### `extensions/purchase-prerequisites/blocks/purchase-prerequisites.liquid` (component, request-response)

**Analog:** `extensions/quiz-block/blocks/symptom-quiz.liquid`

**Imports / structure pattern** — comment header + scoped styles + markup + schema (lines 1-27, 164-168):
```liquid
{%- comment -%}
  AlleDrops Symptom Quiz App Block
  Renders the quiz inside a cross-origin iframe hosted on Fly.
{%- endcomment -%}

{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ block.settings.padding_top | times: 0.75 | round: 0 }}px;
    ...
  }
{%- endstyle -%}
...
{% schema %}
{
  "name": "AlleDrops Symptom Quiz",
  "target": "section",
  "settings": [
```

**Schema differences for Phase 6 (RESEARCH Pattern 1 / UI-SPEC):** Prefer schema attrs over quiz-block's inline `<script>`:
```json
{
  "name": "Purchase prerequisites",
  "target": "section",
  "stylesheet": "purchase-prerequisites.css",
  "javascript": "purchase-prerequisites.js",
  "enabled_on": { "templates": ["product"] },
  "settings": []
}
```

**Liquid metafield credit pattern** (RESEARCH Pattern 2 — no in-repo Liquid metafield read yet; types must match metafields.ts):
```liquid
{% assign quiz_count = customer.metafields.alledrops.quiz_count.value | default: 0 %}
{% if customer and quiz_count >= 1 %}
  {%- comment -%} D-07: pre-checked, locked, dated {%- endcomment -%}
  <input type="checkbox" checked disabled>
  Completed {{ customer.metafields.alledrops.last_completed_at.value | date: "%B %d, %Y" }}
{% else %}
  {%- comment -%} D-08: unchecked + login line {%- endcomment -%}
{% endif %}
```

**Login link (UI-SPEC / RESEARCH OQ#4):**
```liquid
<a href="/account/login?return_to={{ product.url | url_encode }}">Log in</a>
```
Relative `product.url` only — mirror quiz-block's relative-path safety posture (`safeUrl` rejects absolute/external targets).

**Schema JSON validity** — contract test must parse schema like quiz-block (liquid-block-contract lines 135-141):
```typescript
const m = LIQUID.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)
expect(m).toBeTruthy()
expect(() => JSON.parse(m![1])).not.toThrow()
```

**Copy locked strings (UI-SPEC):** panel heading `Before you order`; credited label `Symptom assessment complete`; testing acknowledgment per D-06; login offer per D-08. Class prefix: `purchasePrerequisites__*`.

---

### `extensions/purchase-prerequisites/assets/purchase-prerequisites.js` (utility, event-driven)

**Analog:** Fail-open `console.warn` branch in `symptom-quiz.liquid` (lines 144-154) — same project posture for non-blocking degradation:

```javascript
if (e.data.type === 'quiz:navigate') {
  var raw = e.data.path;
  var target = safeUrl(raw);
  if (target) {
    window.location.assign(target);
  } else {
    console.warn(
      'AlleDrops quiz: ignored a navigation request because the target is not a same-origin relative path. ...'
    );
  }
}
```

**Core gate pattern (RESEARCH Pattern 3 / UI-SPEC Interaction Contract) — no exact in-repo ATC gate; implement as:**
```javascript
// Scope to nearest product form/section — never document-global
var root = blockEl.closest('product-info, .product, form[action*="/cart/add"]');
var buttons = root ? root.querySelectorAll('.product-form__submit') : [];
if (!buttons.length) {
  console.warn('AlleDrops purchase prerequisites: .product-form__submit not found; gate fail-open');
  return; // D-02: leave theme buttons alone
}
// disable until both confirmations satisfied; credited quiz counts as satisfied
```

**Selector source of truth (theme, lines 73-98):**
```liquid
<button
  id="ProductSubmitButton-{{ section_id }}"
  type="submit"
  name="add"
  class="product-form__submit button button--full-width {% if show_dynamic_checkout %}button--secondary{% else %}button--primary{% endif %}"
>
...
{%- if show_dynamic_checkout -%}
  {{ form | payment_button }}
{%- endif -%}
```

Note: second `.product-form__submit` at sold-out branch (~108). Gate JS must handle **zero or more** matches without assuming one.

---

### `extensions/purchase-prerequisites/assets/purchase-prerequisites.css` (config, transform)

**Analog:** BEM-ish classes + section-scoped padding in `symptom-quiz.liquid` (`.symptom-quiz__title`, `.symptom-quiz__disclaimer`).

**Copy guidance:** Scope under `.purchasePrerequisites` / `purchasePrerequisites__*`. Inherit Sense tokens per UI-SPEC (`--color-background`, `--color-foreground`, `--color-button`, `--color-link`). Panel: `rgba(var(--color-foreground), 0.04)` fill + `0.12` border; spacing md=16px inner, lg=24px gap to buy buttons. Do **not** restyle Sense `.button` geometry — only set `disabled` via JS.

---

### `extensions/purchase-prerequisites/locales/en.default.json` (config, transform)

**Analog:** `extensions/quiz-block/locales/en.default.json`

```json
{
  "quiz": {
    "loading": "Loading quiz...",
    "error": "Unable to load quiz. Please try again later."
  }
}
```

**Copy guidance:** Minimal locale stub for the theme extension (Shopify CLI often requires it). Prefer UI-SPEC locked English in Liquid for Phase 6 unless merchant i18n is required.

---

### `extensions/order-review-notice/shopify.extension.toml` (config, request-response)

**Analog:** `extensions/quiz-history/shopify.extension.toml`

**TOML shape** (lines 1-15):
```toml
api_version = "2026-01"

[[extensions]]
name = "Quiz History"
handle = "quiz-history"
type = "ui_extension"
uid = "quiz-history-extension"

[[extensions.targeting]]
module = "./src/QuizHistoryBlock.jsx"
target = "customer-account.profile.block.render"

[extensions.capabilities]
api_access = true
network_access = true
```

**Phase 6 adaptation (D-09 + RESEARCH Pattern 4):** Same `api_version = "2026-01"` and `type = "ui_extension"`, but **two** targeting entries with **separate modules**, and **omit** network/api capabilities (static copy only):

```toml
api_version = "2026-01"

[[extensions]]
name = "Order review notice"
handle = "order-review-notice"
type = "ui_extension"

[[extensions.targeting]]
module = "./src/ThankYou.jsx"
target = "purchase.thank-you.block.render"

[[extensions.targeting]]
module = "./src/OrderStatus.jsx"
target = "customer-account.order-status.block.render"
```

Generate via `shopify app generate extension`, then edit targets — do not hand-roll uid/package wiring.

---

### `extensions/order-review-notice/package.json` (config, request-response)

**Analog:** `extensions/quiz-history/package.json`

```json
{
  "name": "quiz-history",
  "private": true,
  "version": "1.0.0",
  "dependencies": {
    "@preact/signals": "^2.9.0",
    "@shopify/ui-extensions": "*",
    "preact": "*"
  }
}
```

**Copy guidance:** Mirror deps (`preact`, `@shopify/ui-extensions`, optionally `@preact/signals`). Rename `name` to `order-review-notice`. Let CLI scaffold then align.

---

### `extensions/order-review-notice/src/ThankYou.jsx` + `OrderStatus.jsx` (component, request-response)

**Analog:** `extensions/quiz-history/src/QuizHistoryBlock.jsx` bootstrap only

**Imports + render entry** (lines 1-3, 87-89):
```jsx
import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
...
export default () => {
  render(<QuizHistory />, document.body);
};
```

**Phase 6 adaptation:** Thin entry files — **no** `useEffect`/`fetch`/`shopify.sessionToken`. Import shared `ReviewNotice` and render it. Official multi-page rule: one module path per target (two files), not one module listed twice.

```jsx
import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { ReviewNotice } from './ReviewNotice.jsx';

export default async () => {
  render(<ReviewNotice />, document.body);
};
```

(Exact CLI starter may use `shopify.extend` — prefer generated bootstrap; quiz-history is TOML/capability precedent, not a literal checkout API twin.)

---

### `extensions/order-review-notice/src/ReviewNotice.jsx` (component, request-response)

**Analog:** Static branches in `QuizHistoryBlock.jsx` (empty / error Banner) — **invert** network pattern

**What to copy (markup primitives, lines 47-60):**
```jsx
if (status === 'error') {
  return (
    <s-section heading="Symptom Assessment History">
      <s-banner tone="critical">Unable to load your assessment history.</s-banner>
    </s-section>
  );
}

if (!assessments.length) {
  return (
    <s-section heading="Symptom Assessment History">
      <s-text>You haven't completed any symptom assessments yet.</s-text>
    </s-section>
  );
}
```

**What NOT to copy (lines 21-36):**
```jsx
const t = await shopify.sessionToken.get();
const resp = await fetch(`${FLY_BASE}/api/me/assessments`, {
  headers: { Authorization: `Bearer ${t}` },
});
```

**UI-SPEC contract:** Single informational Banner (`status="info"` / non-critical), title **What happens next**, two paragraphs (review + testing follow-up). No order-id PHI lookup. No `FLY_BASE`, no score/bracket strings.

---

### `tests/fixtures/sense-buy-buttons-excerpt.liquid` (test, file-I/O)

**Analog / source:** `/Users/andrewskinner/Local Sites/allergist-on-demand/snippets/buy-buttons.liquid` lines 73-114

**Core pattern:** Vendor the two `.product-form__submit` buttons + `{% if show_dynamic_checkout %}{{ form | payment_button }}{% endif %}` conditional. No existing `tests/fixtures/` directory — create it. CI must not depend on the sibling theme path.

---

### `tests/sense-atc-selector-contract.test.ts` (test, file-I/O)

**Analog:** `tests/liquid-block-contract.test.ts` (readFileSync + presence/absence) + occurrence counting from `tests/quiz-bundle-freshness.test.ts`

**File read pattern** (liquid-block-contract lines 1-33):
```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const LIQUID = readFileSync(
  join(process.cwd(), 'extensions', 'quiz-block', 'blocks', 'symptom-quiz.liquid'),
  'utf-8'
)
```

**Count helper (quiz-bundle-freshness style — mandatory):**
```typescript
const count = (needle: string): number => SOURCE.split(needle).length - 1
// NEVER grep -c — line-vs-occurrence trap
```

**Assert against fixture:**
- `product-form__submit` occurrence count ≥ 2
- `show_dynamic_checkout` + `payment_button` conditional present
- Optional local-only hash check vs sibling theme path (non-CI)

---

### `tests/purchase-prerequisites-block-contract.test.ts` (test, file-I/O)

**Analog:** `tests/liquid-block-contract.test.ts` — **exact pattern match**

**Core assertions to mirror:**
```typescript
describe('purchase-prerequisites.liquid contract', () => {
  it('reads both alledrops metafields via .value', () => {
    expect(LIQUID).toContain('customer.metafields.alledrops.quiz_count')
    expect(LIQUID).toContain('customer.metafields.alledrops.last_completed_at')
    expect(LIQUID).toContain('.value')
  })
  it('gates ATC via .product-form__submit and fail-open warn', () => {
    // JS asset or liquid-referenced asset contents
    expect(JS).toContain('product-form__submit')
    expect(JS).toContain('console.warn')
  })
  it('keeps the schema block valid JSON', () => { /* same regex parse as quiz-block */ })
  it('includes D-06 acknowledgment substring', () => {
    expect(LIQUID).toContain('will not ship until allergy testing results are on file')
  })
})
```

**Grep-gate hygiene:** Follow liquid-block-contract header — absence assertions must not be poisoned by comments quoting forbidden tokens.

---

### `tests/order-review-notice-extension-contract.test.ts` (test, file-I/O)

**Analog:** `tests/liquid-block-contract.test.ts` + `tests/entry-theme-contract.test.ts` (source-text guards)

**Assert:**
- TOML contains both `purchase.thank-you.block.render` and `customer-account.order-status.block.render`
- Two distinct `module =` paths
- Source tree has **no** `fetch(` to Fly / no `sessionToken` / no score|bracket|answers
- Copy avoids banned approval-promise substrings (`if approved`, `unlocked`, etc.)

---

### `06-SHOP-05-COPY-DRAFT.md` (config, transform)

**Analog:** `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md`

**Status / ownership framing** (lines 1-10):
```markdown
# Storefront Copy Draft — D-13 No-Testing-Required Clauses

**Status: UNCONFIRMED — held for William/counsel approval, not shipped.** Nothing in this document
has been published anywhere. It exists so replacement copy is ready the moment William or counsel
signs off; ...
```

**Surface inventory table pattern** (lines 20-50): measure which admin fields actually accept paste text before drafting; label Admin-managed vs theme-managed; William owns refund **SPEC** bullets only (D-11), not final legal prose.

---

### `06-SHOP-06-FULFILLMENT-PROCESS.md` (config, transform)

**Analog:** Same Phase 4 draft ownership/status discipline — process checklist, not code.

**Copy guidance:** Checklist: verify quiz completion + testing on file before ship; contact/refund path if missing; owner = William/AOD. Never describe automated unlock or "approved to purchase" (`DEC-no-approval-promise-copy`).

---

## Shared Patterns

### Theme app extension (type = theme)
**Source:** `extensions/quiz-block/`
**Apply to:** `extensions/purchase-prerequisites/`
- Minimal `shopify.extension.toml` with `type = "theme"`
- Liquid block with `{% schema %}`, `"target": "section"`
- Prefer `stylesheet` / `javascript` schema attrs (new) over quiz-block inline script
- `enabled_on.templates: ["product"]` to keep gate off quiz/page templates
- Locale stub `locales/en.default.json`

### UI extension TOML + Preact
**Source:** `extensions/quiz-history/shopify.extension.toml` + `package.json` + JSX bootstrap
**Apply to:** `extensions/order-review-notice/`
- `api_version = "2026-01"`, `type = "ui_extension"`
- Generate with CLI; two `[[extensions.targeting]]` with separate modules
- **Subtract** `network_access` / `api_access` and all Fly `fetch` paths

### Non-PHI metafield contract
**Source:** `app/lib/shopify/metafields.ts` lines 10-25, 88-102
```typescript
const NAMESPACE = "alledrops";
const KEY_LAST_COMPLETED = "last_completed_at";
const KEY_QUIZ_COUNT = "quiz_count";
// types: date_time, number_integer
```
**Apply to:** Liquid reads in purchase-prerequisites block only. Do not call `updateNonPhiQuizMetafields` from Phase 6. Do not add a third key (D-05 / CLAUDE.md rule 6).

### Source-text contract tests (Vitest)
**Source:** `tests/liquid-block-contract.test.ts`
**Apply to:** All three new test files
- `readFileSync` + `toContain` / `not.toContain` / schema JSON.parse
- Occurrence counts via `split(needle).length - 1` only
- Prove presence in SOURCE, not browser behavior (human UAT still required)

### Fail-open + loud CI
**Source:** quiz-block `console.warn` on ignored navigate; Phase 6 D-02
**Apply to:** Gate JS + `sense-atc-selector-contract.test.ts`
- Missing selector → warn, never disable
- Missing selector class in vendored Sense fixture → CI red

### Editor-only theme changes (D-03)
**Source:** CONTEXT / STATE / Phase 4 theme-editor precedent
**Apply to:** Placement of purchase-prerequisites block; `show_dynamic_checkout: false` on `product.regional-drops`
- Never `shopify theme push` from `allergist-on-demand` (Klaviyo `disabled: false` drift)
- Record editor actions in plan SUMMARY

### Admin copy draft artifacts
**Source:** `04-STOREFRONT-COPY-DRAFT.md`
**Apply to:** SHOP-05 / SHOP-06 markdown packages in phase directory
- Explicit UNCONFIRMED / ownership headers
- Surface map before paste-ready prose
- Banned language list from UI-SPEC / `DEC-no-approval-promise-copy`

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `extensions/purchase-prerequisites/assets/purchase-prerequisites.js` (ATC disable logic) | utility | event-driven | No existing product-form gate in app repo — only fail-open warn + Sense DOM facts |
| Checkout thank-you / order-status targets specifically | component | request-response | `quiz-history` is Customer Account profile + network; reuse TOML/deps/bootstrap, not fetch/ledger UI |

Planner should use RESEARCH Patterns 3–4 and UI-SPEC Interaction Contract for those gaps.

## Metadata

**Analog search scope:** `extensions/`, `tests/`, `app/lib/shopify/`, `.planning/phases/04-*`, sibling theme `snippets/buy-buttons.liquid` + `sections/main-product.liquid` + `templates/product.regional-drops.json`
**Files scanned:** ~25 primary + theme selector excerpts
**Pattern extraction date:** 2026-08-12
