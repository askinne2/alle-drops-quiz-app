---
phase: 6
slug: purchase-prerequisites
status: approved
shadcn_initialized: false
preset: none
created: 2026-08-12
reviewed_at: 2026-08-12
---

# Phase 6 — UI Design Contract: Purchase Prerequisites & Returning Patients

> Visual and interaction contract for SHOP-02…SHOP-06 (`06-CONTEXT.md` D-01…D-11). Design-system
> posture matches Phase 5: **no shadcn, no Tailwind, no new component library.** Surfaces are
> Shopify storefront Liquid + theme CSS variables (Sense) and a static checkout UI extension
> (Preact / `@shopify/ui-extensions`). Tokens inherit Sense / Checkout primitives — do not invent
> a parallel brand system for this phase.
>
> **Compliance:** Product page is commerce (not PHI collection). Thank-you / order-status must
> never fetch quiz score, bracket, answers, or any Cloud SQL / Fly PHI (`06-CONTEXT.md` D-05,
> D-10; `CLAUDE.md` rules 2, 4, 6). No third-party trackers added. No `shopify theme push`
> (`D-03`).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — shadcn gate not applicable (no `components.json`; surfaces are Sense Liquid + Checkout UI extension, not the quiz React app) |
| Preset | not applicable |
| Component library | Sense theme primitives (`.button`, form markup) on PDP; Shopify Checkout UI components (`Banner`, `Text`, `BlockStack`, `Link` as needed) on thank-you / order-status |
| Icon library | none — native HTML checkboxes; no new SVG dependency |
| Font | Sense theme stack — `var(--font-body-family)` / `var(--font-heading-family)`. Checkout extension uses Shopify checkout font. No remote fonts. |

**Source:** `06-RESEARCH.md` Standard Stack; Phase 5 UI-SPEC posture; Sense `buy-buttons.liquid`.

**Focal point (PDP):** The “Before you order” prerequisites panel — then the disabled Sense add-to-cart button beneath it. Do not compete with hero media or price for first attention once the panel is in the purchase column.

**Focal point (thank-you / order-status):** The single clinical-review `Banner` / notice block. No secondary cards or upsells from this extension.

---

## Spacing Scale

Multiples of 4 only. Align with Sense 4px rhythm (theme uses rem; contract locks px equivalents).

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Checkbox–label gap; date line indent under credited quiz row |
| sm | 8px | Gap between the two confirmation rows |
| md | 16px | Inner padding of the "Before you order" panel |
| lg | 24px | Vertical gap between the prerequisites panel and Buy buttons |
| xl | 32px | Not required on PDP block (reserve if checkout notice needs outer stack gap) |
| 2xl | 48px | Not used |
| 3xl | 64px | Not used |

**Exceptions:** Checkbox hit target minimum **44×44px** (padding on the label row, not a larger box graphic). Disabled ATC uses Sense's existing button padding — do not restyle the theme button geometry.

**Source:** default 8-point scale + Claude's discretion (touch target); layout preview in `06-CONTEXT.md` `<specifics>`.

---

## Typography

Exactly four sizes, two weights. Map to Sense body scale; do not introduce display fonts.

| Role | Size | Weight | Line Height | Where |
|------|------|--------|-------------|-------|
| Caption | 14px | 400 | 1.4 | Completion date; login offer line; disabled-ATC helper line |
| Body | 16px | 400 | 1.5 | Testing acknowledgment label; SHOP-04 / SHOP-05 body paragraphs |
| Label | 16px | 600 | 1.3 | Credited quiz row primary text ("Symptom assessment complete"); checkbox labels when emphasized |
| Heading | 18px | 600 | 1.2 | Panel title "Before you order"; SHOP-04 notice title |

**Weights allowed:** 400 (regular) and 600 (semibold) only. Do not use 700 on these surfaces.

**Checkout UI extension:** Prefer `Text` with `size="base"` for body and `size="medium"` / emphasis for the title — visual weight must match Heading/Body roles above even if the API uses named sizes.

**Source:** Sense defaults + Claude's discretion (locked here so executor does not invent sizes).

---

## Color

Inherit Sense CSS variables. Hex fallbacks are Sense-typical defaults only — live theme tokens win.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `rgb(var(--color-background))` | Product page surface behind the block |
| Secondary (30%) | `rgba(var(--color-foreground), 0.04)` fill + `rgba(var(--color-foreground), 0.12)` 1px border | "Before you order" panel background and border |
| Accent (10%) | `rgb(var(--color-button))` / `rgb(var(--color-link))` | **Only:** checkbox focus ring; login link underline/color; (theme ATC primary fill is owned by Sense `.button--primary` — do not recolor it from this block) |
| Muted text | `rgba(var(--color-foreground), 0.7)` | Caption date; login line; disabled-ATC helper |
| Destructive | not used | No destructive actions in this phase |

**Accent reserved for (explicit list — never "all interactive elements"):**
1. Checkbox `:focus-visible` ring
2. "Log in" text link in the D-08 offer line
3. Checkout UI extension link (if "how to send testing" includes a URL — static only)

**Explicitly NOT accent:** panel border, disabled ATC button (Sense handles disabled styles), locked/disabled credited checkbox (muted foreground only).

**Checkout UI extension:** Use `Banner` with `status="info"` (or equivalent neutral informational status — **not** `critical` / `warning` that implies clinical urgency or denial). Banner chrome follows Checkout system colors; do not hardcode Sense RGB into the extension.

**Source:** Sense tokens (measured pattern in theme CSS); Claude's discretion for panel treatment.

---

## Copywriting Contract

### Product page block (SHOP-02 / SHOP-03)

| Element | Copy | Source |
|---------|------|--------|
| Panel heading | **Before you order** | Locked preview — `06-CONTEXT.md` `<specifics>` |
| Quiz — credited (D-07) | **Symptom assessment complete** | Locked preview |
| Quiz — credited date | **Completed {Month D, YYYY}** — e.g. `Completed August 12, 2026` via Liquid `\| date: "%B %d, %Y"` (strip leading zero on day if theme filter supports; otherwise `%B %d, %Y` as-is is acceptable) | Locked preview + RESEARCH Liquid example |
| Quiz — uncredited checkbox label | **I completed the AlleDrops symptom assessment** | Claude's discretion — parallel structure to testing acknowledgment; not an assertion the site verifies for logged-out users |
| Testing acknowledgment (D-06) | **I understand AOD will not ship until allergy testing results are on file.** | Locked shape — `06-CONTEXT.md` D-06 |
| Login offer (D-08) | **Already completed your assessment? Log in to see it here.** | Locked shape — D-08; "Log in" is the link text |
| Login href | `/account/login?return_to={{ product.url \| url_encode }}` (relative product path only — no absolute external `return_to`) | Claude's discretion — RESEARCH Open Question #4 recommendation |
| Disabled-ATC helper (when checks incomplete **and** submit button was found) | **Confirm both items above to add to cart.** | Claude's discretion |
| Primary CTA label | Theme default **Add to cart** (`products.product.add_to_cart`) — do not replace the button label | Sense / D-01 |
| Empty / uncredited state | No empty-state card. Unchecked boxes + D-08 login line. Missing metafields = uncredited, never an error. | D-08 |
| Error state (selector miss / fail-open) | No patient-facing error. Confirmations still render. Optional `console.warn` for merchants/devs only — never a red banner that implies purchase is blocked or broken. | D-02 |
| Destructive confirmation | **none** — no destructive actions | — |

### Thank-you + order-status (SHOP-04)

| Element | Copy | Source |
|---------|------|--------|
| Notice title | **What happens next** | Claude's discretion — neutral, no approval framing |
| Review body | **Dr. Sullivan reviews your intake before your order ships. This typically takes 2–3 business days.** | D-10 shape + REQUIREMENTS SHOP-04 (2–3 business days) |
| Testing follow-up | **If allergy testing results are not yet on file, complete your symptom assessment upload (or finish the assessment) before we can ship. Need help? Contact the clinic using the support details on your order confirmation email.** | D-10 second half — **contact channel deliberately generic** until William confirms a post-purchase destination (`06-RESEARCH.md` A5 / Open Question #3). Do **not** invent `testing@…` or a non-AOD domain. |
| Empty / error | N/A — static notice always renders; no data fetch, no empty state | D-10 |

### SHOP-05 paste-ready package (non-interactive — copy constraints)

| Surface | Contract |
|---------|----------|
| Order confirmation notification | Must state that **products will not ship without a completed symptom assessment and allergy testing results on file**, and that clinical review typically takes **2–3 business days**. Same substance as SHOP-04; tone is transactional email, not a Banner. |
| Checkout / theme default content (if a Basic-eligible field exists after Wave 0 inventory) | Same substance; shorter if character-limited. |
| Refund policy | **SPEC only for William** (D-11) — must-include bullets: no ship without quiz + testing on file; clinical review precedes fulfillment; refund/return handling when prerequisites are missing. **Phase 6 does not write final legal prose.** |

### SHOP-06 fulfillment process (process doc — not UI)

No patient-facing UI. Checklist draft language must describe **human verification** of quiz completion + testing on file before ship — never automated unlock, never "approved to purchase" framing.

### Banned language (all Phase 6 surfaces)

Per `DEC-no-approval-promise-copy` and `06-RESEARCH.md` Pitfall 6 — **do not ship** wording that includes or implies:

- "if approved" / "once approved" / "after approval"
- "unlocked" / "cleared to purchase" / "eligible to buy"
- Guarantees of treatment, efficacy, or shipment timing tighter than "typically 2–3 business days"
- False fact-assertions for testing: **"I've submitted my allergy testing results"** (rejected by D-06)

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — no shadcn |
| third-party shadcn registries | none | not applicable |
| Shopify extension scaffolds | `shopify app generate extension` for theme + checkout UI | official Shopify CLI only — 2026-08-12; no third-party UI registries |

---

## Component Inventory

### 1. Theme app block — `extensions/purchase-prerequisites/` (SHOP-02 / SHOP-03)

**Structure (one block, two checkboxes — Claude's discretion, matches locked preview):**

```
[panel.purchasePrerequisites]
  h3 "Before you order"
  [row.quiz]
    checkbox (credited: checked+disabled; else interactive)
    label + optional date caption
  [row.testing]
    checkbox (always interactive; never pre-checked from data)
    acknowledgment label
  [optional login line — D-08 when not credited]
  [optional helper — when ATC disabled by incomplete checks]
```

**Placement:** Inside Sense `main-product`, **above** `buy_buttons`. `enabled_on.templates: ["product"]`. Editor-only placement (`D-03`). **Not** on telehealth/consult template (`D-04`).

**Editor companion (not code):** On `product.regional-drops` Buy buttons → **Show dynamic checkout buttons = OFF** (`D-01`). Without this, Shop Pay bypasses the gate.

**JS gate behavior:**

| Condition | Behavior |
|-----------|----------|
| Both confirmations satisfied (credited quiz counts as satisfied) | Enable `.product-form__submit` inside nearest product form/section |
| One or both unsatisfied | `disabled` on matched `.product-form__submit` + show helper line |
| Zero matches for `.product-form__submit` | **Fail open** — do not disable anything; confirmations still visible; `console.warn` once | D-02 |
| Selector scope | `closest('product-info, .product, form[action*="/cart/add"]')` then `querySelectorAll('.product-form__submit')` — never `document`-global | RESEARCH Pattern 3 |

**States:**

| State | Quiz row | Testing row | ATC |
|-------|----------|-------------|-----|
| Logged-in credited (`quiz_count >= 1`) | Checked, disabled, date shown | Unchecked until click | Disabled until testing checked |
| Logged-out / unmatched | Unchecked, interactive + login line | Unchecked | Disabled until both checked |
| Fail-open (selector miss) | As above | As above | Theme default (not forced disabled) |

**CSS class prefix:** `purchasePrerequisites__*` (BEM-ish). Scope styles via block stylesheet asset — do not leak into Sense global button CSS beyond `disabled` attribute on the theme button.

### 2. Checkout UI extension — `extensions/order-review-notice/` (SHOP-04)

| Item | Contract |
|------|----------|
| Targets | `purchase.thank-you.block.render` **and** `customer-account.order-status.block.render` |
| Modules | **Two entry files** (`ThankYou.jsx`, `OrderStatus.jsx`) + shared `ReviewNotice.jsx` — official multi-page requirement; D-09 intent preserved |
| Capabilities | **No** `network_access`, **no** Fly/API fetch, **no** quiz/PHI fields |
| Visual | Single informational `Banner` (or BlockStack + Text) with title + two short paragraphs (review + testing follow-up) |
| Personalization | Order id may exist in context — **do not** use it to look up clinical status |

### 3. Non-UI packages

| Artifact | Role |
|----------|------|
| `06-SHOP-05-COPY-DRAFT.md` | Paste-ready strings + refund-policy SPEC under Copywriting Contract |
| `06-SHOP-06-FULFILLMENT-PROCESS.md` | AOD checklist draft — no storefront chrome |

---

## Interaction Contract

1. **Honor system:** Checkboxes are a UI nudge. Real control is SHOP-06 fulfillment. Never imply technical enforcement beyond disabled ATC when the selector works.
2. **Asymmetry is intentional:** Quiz credit is data-backed for matched logged-in customers; testing is acknowledgment-only (`D-05`/`D-06`). Copy must not pretend they are the same kind of check.
3. **Fail-open + CI:** Shipping D-02 without the Sense `.product-form__submit` fixture contract test is out of contract.
4. **Accessibility:** Each checkbox has a visible `<label>` (or `aria-labelledby`). Locked credited checkbox remains readable (not `visibility:hidden`). Focus order: quiz → testing → login link → ATC. Helper line uses `aria-live="polite"` only if dynamically shown/hidden; static helper can be a normal `<p>`.
5. **No analytics / session replay** on these surfaces from this phase's code.
6. **Mobile (≤375px):** Panel full width of product form column; checkboxes stack as two full-width rows; ATC remains full-width Sense button; no horizontal scroll.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS (FLAG addressed — explicit PDP + thank-you focal points added)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-08-12

---

## Pre-Population Sources

| Source | Decisions used |
|--------|----------------|
| `06-CONTEXT.md` D-01…D-11 + `<specifics>` preview | Gating mechanism, fail-open, editor placement, testing acknowledgment wording, credited/locked quiz row, login line, dual checkout targets, static SHOP-04 content, SHOP-05 ownership split |
| `06-RESEARCH.md` | Extension directory names, one-block/two-checkbox structure, selector scoping, login `return_to`, Checkout Banner posture, CI fixture note, SHOP-05/06 artifact paths |
| `REQUIREMENTS.md` SHOP-01…06 | Success criteria language (2–3 business days; prerequisites; fulfillment ownership) |
| `05-UI-SPEC.md` | Tone: Tool none, Sense/CSS-variable inheritance, no shadcn, banned approval-promise discipline |
| Sense theme (`buy-buttons.liquid`, CSS vars) | ATC class, express-checkout coupling, color tokens |
| Claude's discretion (locked in this file) | Spacing exceptions, type scale, panel chrome, uncredited quiz label, helper line, SHOP-04 title, generic testing follow-up until William confirms channel |
| User input this session | 0 — unanswered visual questions closed by upstream + Sense defaults |

**Not re-asked (locked upstream):** D-01…D-11; honor system; no theme push; testing has no metafield; express checkout off via editor.
