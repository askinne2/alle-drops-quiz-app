# Phase 6: Purchase Prerequisites & Returning Patients - Research

**Researched:** 2026-08-12
**Domain:** Shopify theme app extensions + checkout UI extensions + Liquid customer metafields + Sense product form gating + admin copy / fulfillment process docs
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Add-to-cart gating mechanism

- **D-01: The block disables the theme's add-to-cart button, and express checkout is turned off on
  the SLIT template.** The app block renders above `buy_buttons` and its JS disables
  `.product-form__submit` within the product section until both confirmations are satisfied.

  **The second half is not optional.** `product.regional-drops.json` currently sets
  `show_dynamic_checkout: true`, so `{{ form | payment_button }}` renders a Shop Pay / express button
  that **skips add-to-cart entirely** (`snippets/buy-buttons.liquid:96-97`). Gating only
  `.product-form__submit` would leave the faster path ungated and make the whole block decorative.
  Turning `show_dynamic_checkout` off on that template gives exactly one purchase path to gate. It is
  a theme-editor toggle on the `buy_buttons` block, not code.

  Rejected: **warn-only** (renders the confirmations but never disables anything — zero theme
  coupling, but SHOP-03 says add-to-cart *requires* two confirmations and this doesn't require them),
  and **replacing `buy_buttons` outright** (full control, no DOM coupling, but reimplements variant
  handling, quantity, inventory/sold-out states and gift-card recipient on the two pages that take
  money — the largest surface in the phase).

- **D-02: The gate fails OPEN.** If the block's JS cannot find the theme's submit button — a Sense
  theme update renames the class, the block is placed in a section that doesn't contain the form —
  the confirmations still render and explain the requirement, but the button is never disabled and
  the store keeps selling.

  **This deliberately reverses the project's usual fail-closed posture** (DEF-02's `quiz:navigate`
  version skew fails closed). The reasoning is that the two cases are not alike: `quiz:navigate`
  failing open is an open redirect on a PHI page, whereas this gate failing open is a *nudge* that
  stops nudging. `DEC-purchase-gating-is-honor-system` says enforcement is human at fulfillment, so a
  degraded gate degrades something that was never the real control. Fail-closed here could silently
  take both SLIT products offline after a theme update, with no error anyone sees until sales stop.

  **The compensating control is mandatory, not optional:** a test that fails loudly in CI when the
  selector no longer matches. Planning must specify what that test asserts against — a checked-in
  copy of the theme markup, a live fetch, or a served-bytes assertion in the style this project
  already uses. Do not ship D-02 without it; fail-open plus no detection is just "broken and quiet."

- **D-03: The block is placed via the Shopify theme editor, never `shopify theme push`.**
  `STATE.md` records that `/Users/andrewskinner/Local Sites/allergist-on-demand` carries drift:
  `config/settings_data.json` still has the Klaviyo app embed at `disabled: false` locally, because
  Klaviyo was disabled admin-side on 2026-08-09. **A push from that repo would re-enable a tracker on
  the PHI-collecting quiz page.** `templates/product.regional-drops.json` additionally still
  references a `quiz-kit-smart-product-finder` app block. The editor route touches neither file.

  Reconciling the theme repo is a real task worth doing — it is recorded in `<deferred>`, not here.

- **D-04 (verify during planning, do not assume): which products and templates the block goes on.**
  The theme has three product templates: `product.json` (default),
  `product.regional-drops.json` (carries the `regional_info_block` — this is the SLIT template), and
  `product.telehealth-appointment.json` (the $99 consult). Template assignment is per-product in the
  Shopify admin and was NOT verified in this discussion.

  **Confirm before building:** that both SLIT SKUs (TN and TX) use `product.regional-drops.json`, and
  that the consult product does not. `DEC-mandatory-allergy-testing` gates *sublingual immunotherapy*
  — a patient booking a $99 telehealth consult has not bought SLIT and must not be blocked from the
  consult by a testing prerequisite. Blocking the consult would be a clinical-access regression, not
  a stricter gate.

#### The testing confirmation and its (absent) data source

- **D-05: The testing confirmation is pure self-attestation. No third metafield, no API call.**
  `quiz_count` proves quiz completion. Nothing in Shopify records whether allergy testing was
  submitted — that lives in `answers_json.testing_status` in Cloud SQL, which is PHI.

  Rejected: **a third non-PHI metafield** (e.g. `alledrops.testing_on_file`). `CLAUDE.md` rule 6
  allows exactly two metafields, so this needs an explicit amendment — and the honest argument
  against is uncomfortable enough to record: *"this identified customer submitted allergy test
  results"* reads as health information about an identified individual more clearly than `quiz_count`
  does. It would widen a line the project drew deliberately, in order to power a checkbox that the
  locked honor-system decision says is unenforceable anyway. Also rejected: **fetching from the Fly
  API on the product page** — the storefront product page carries no customer auth token, so this
  means building one, and it puts a call about a patient's clinical status onto a commerce page.

  **Where testing is actually verified is SHOP-06**, AOD's human fulfillment step. That is the
  control; the checkbox is the notice.

- **D-06: The testing confirmation is worded as an acknowledgment of AOD's rule, not an assertion of
  fact.** Shape: *"I understand AOD will not ship until allergy testing results are on file."* Not:
  *"I've submitted my allergy testing results."*

  Two reasons. It is honest about what the checkbox is — the patient agreeing to a condition, not
  asserting something the site can check. And it doesn't invite a well-meaning patient mid-process to
  make a false statement about their own medical record.

  Note this makes the two boxes asymmetric by design: the quiz box is verifiable for matched
  logged-in customers (D-07) and the testing box never is. That asymmetry is real and the copy should
  not paper over it. Exact wording is subject to PROJECT.md's Process constraint — no clinical claim
  ships without William or counsel — and to `DEC-no-approval-promise-copy`.

#### Returning-patient completion state

- **D-07: A logged-in customer with `quiz_count >= 1` gets the quiz box pre-checked, locked, and
  dated.** It renders already checked and disabled, with the completion date beside it, read from
  `customer.metafields.alledrops.last_completed_at`. The gate drops from two clicks to one for
  exactly the person who earned it.

  This is the strongest reading of the phase goal ("a returning patient sees the credit for work
  already done"). SHOP-02 literally only requires that the patient *sees* the state, so
  display-without-pre-check would also satisfy it — that was offered and not selected. Locking a
  satisfied box strands nobody; the pre-checked-but-editable variant was rejected as a weaker signal
  that invites accidental unticking.

  **Both metafields are now load-bearing:** `quiz_count` decides whether to credit,
  `last_completed_at` supplies the date shown.

- **D-08: A logged-out or unmatched shopper sees unchecked boxes plus one line offering log-in.**
  Shape: *"Already completed your assessment? Log in to see it here."* One sentence, no new surface,
  no account pressure.

  **This is the common case, not the edge case.** Accounts are not required to buy, and
  `api.quiz.submit.tsx` sets `customerLinkSkipped` in three places (`:139`, `:159`, `:163`) because
  customer linking is best-effort email matching. A patient who quizzed with one email and buys with
  another is unlinked and gets no credit. The same line covers both cases — it explains the absence
  of credit without claiming to know anything about the shopper.

  Rejected: **identical to a first-time buyer** (simplest, but a returning patient who happens to be
  logged out reads the missing credit as the feature being broken), and a **prominent log-in prompt**
  (friction on a purchase page, pushing accounts on a flow that deliberately doesn't require them).

#### Thank-you / order-status extension

- **D-09: The extension registers BOTH `purchase.thank-you.block.render` and
  `customer-account.order-status.block.render`** — one module, two `[[extensions.targeting]]` entries,
  per the multi-page pattern in Shopify's docs.

  **Plan availability was verified, not assumed:** Shopify's docs state that Thank you and Order
  status page extensions "will be available to all plans except Shopify Starter" — only extensions on
  the *information / shipping / payment* checkout steps require Plus. AOD is on Basic/Grow, so SHOP-04
  is buildable. (`https://shopify.dev/docs/api/checkout-extensions`.)

  The thank-you page is one-shot — a patient who closes the tab never sees it again — while order
  status is where they return to check on an order they are waiting on, which is exactly this
  message's job.

- **D-10: Content is the review expectation PLUS how to send testing results.** Shape: Dr. Sullivan
  reviews the intake before the order ships, typically 2–3 business days; and if testing results
  haven't been sent yet, here is how.

  The second half closes the loop D-06's acknowledgment opens — a patient who just ticked "I
  understand you won't ship until testing is on file" is precisely the person who needs to know how
  to do that. It is inside the phase domain (purchase prerequisites), not scope creep.

  **Hard constraint: no clinical content on this surface.** The extension receives an order id, never
  quiz data. Do not fetch score, bracket, or answers. The personalized-to-the-order variant was
  rejected for that reason as much as for its cost.

#### SHOP-05 admin copy

- **D-11: Phase 6 drafts paste-ready copy for the checkout language and the order confirmation
  notification. William owns the refund policy.** Phase 6 gives him a spec of what the refund policy
  must say rather than the words themselves.

  This matches the ownership split `REQUIREMENTS.md` already records for SHOP-05 ("Shopify admin
  content, William owns the refund policy") and respects PROJECT.md's Process constraint. The refund
  policy is the one of the three with legal weight, and a complete draft is the one most likely to be
  pasted without real review.

  **Note the plan limitation:** "checkout page language" cannot be a checkout UI extension on
  Basic/Grow — those targets need Plus (D-09). It has to be Shopify admin content (Settings →
  Checkout, and the checkout/system language editor). Planning should confirm which admin surfaces
  actually accept this text before drafting for them.

### Claude's Discretion

- Exact selector strategy and DOM-guard implementation for D-01/D-02, and what the CI guard test
  asserts against.
- Whether the two confirmations are one block with two checkboxes or two configurable blocks.
- Visual treatment of the disabled button state, and whether the block shows an explanatory line
  next to the disabled button.
- Naming of the new extension directories.
- Whether the login line in D-08 links to `/account/login` with a `return_to` back to the product.

### Deferred Ideas (OUT OF SCOPE)

- **Reconciling the `allergist-on-demand` theme repo.** `config/settings_data.json` carries
  `disabled: false` for Klaviyo while the live store has it disabled, and
  `templates/product.regional-drops.json` still references a `quiz-kit-smart-product-finder` app
  block. Worth doing so template state becomes reviewable in git — but it is its own task with real
  risk (getting it wrong re-enables a tracker on a PHI page), and D-03 routes around it rather than
  taking it on mid-phase.

- **A third non-PHI metafield for testing status** (`alledrops.testing_on_file` or similar). Offered
  under D-05 and declined. If AOD ever wants verified testing state at the point of purchase, it
  needs an explicit amendment to `CLAUDE.md` rule 6 and a real argument that the flag is not PHI —
  not a quiet addition. See D-05 for the argument against.

- **Personalized order status on the thank-you page** — offered under D-10 and declined. Needs a
  network call plus a new endpoint, and drifts toward clinical status on a Shopify surface.

- **Cart-level handling when a patient buys SLIT and a consult together.** Raised at the end of the
  discussion and not explored. The gate is per-product-page, so a mixed cart is ungated by
  construction. Consistent with the honor system; noted so it isn't mistaken for an oversight.

- **LAUNCH-01 Klaviyo web pixel.** Live and unremediated by Andrew's choice as of 2026-08-12,
  recorded in `HANDOFF.md` only. It touches the same store and the same theme, so anyone doing theme
  work in this phase will be adjacent to it — but it is Phase 8, Andrew-owned, and deliberately out
  of scope here.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHOP-01 | Metafield definitions + Liquid readability (spike) | Spike DONE 2026-08-12 — definitions exist, Storefront API ON, Analytics filter OFF. Liquid *render* still unproven; first SHOP-02 step. See `06-SPIKE-SHOP-01.md`. |
| SHOP-02 | Returning patient sees completion state on product page | Liquid reads `customer.metafields.alledrops.quiz_count.value` / `last_completed_at.value`; D-07 pre-check+lock+date; D-08 login line for unmatched. |
| SHOP-03 | Two prerequisite confirmations gate ATC on SLIT pages | New theme app block + D-01 disable `.product-form__submit` + editor turns off `show_dynamic_checkout` + D-02 fail-open + mandatory CI selector guard. |
| SHOP-04 | Thank-you explains clinical review + 2–3 business days | New checkout UI extension targeting thank-you **and** order-status (Basic/Grow eligible). Static copy only — no PHI fetch (D-10). |
| SHOP-05 | Checkout language, order confirmation, refund policy | Paste-ready drafts for checkout + order confirmation; refund policy **spec** for William (D-11). No Plus checkout-step extension. |
| SHOP-06 | Written fulfillment verification step | Process doc (not code). AOD/William owns execution; phase produces a draft checklist William can adopt. |
</phase_requirements>

## Summary

Phase 6 is a **Shopify surface phase**, not a Fly/PHI-path phase. It ships two new extensions (a product-template theme app block for honor-system ATC gating + returning-patient credit, and this app's first thank-you/order-status checkout UI extension), plus two non-code deliverables (SHOP-05 copy package, SHOP-06 fulfillment process draft). SHOP-01's definition gate is cleared; the only remaining SHOP-01 proof is an empirical Liquid render on served bytes, which belongs to SHOP-02 Wave 0.

The load-bearing coupling is thin and deliberate: block JS reaches into Sense's `.product-form__submit` inside `main-product`, and express checkout must be editor-disabled on `product.regional-drops.json` or the gate is decorative. Fail-open (D-02) is correct for an honor-system nudge, but only with a CI contract that screams when Sense renames the class. Nothing in this phase should touch Cloud SQL, metafield writes, `api.*` PHI routes, or `shopify theme push`.

**Primary recommendation:** Scaffold a **new** theme extension (`extensions/purchase-prerequisites/`) with one Liquid block + assets JS/CSS, and a **new** checkout UI extension (`extensions/order-review-notice/` or similar) with **two modules** sharing one content component; place the block and flip `show_dynamic_checkout` only via the theme editor; prove Liquid metafields first; ship SHOP-05/06 as markdown packages in `.planning/phases/06-purchase-prerequisites/`.

## Project Constraints (from CLAUDE.md / project rules)

No `.cursor/rules/` content in this repo beyond MCP config. Actionable constraints from `CLAUDE.md`:

- **Never** write PHI to Shopify metafields / Admin API payloads — only `alledrops.last_completed_at` and `alledrops.quiz_count` (rule 6 allowlist; D-05 declines widening it).
- **Never** add analytics / session-replay / third-party trackers to PHI-collecting pages (rule 4). Product pages are commerce surfaces, but do not add trackers in this phase; stay clear of LAUNCH-01 / theme push (D-03).
- Feature-branch workflow; `shopify app deploy` ≠ `fly deploy`; do not deploy Fly from a branch.
- PHI-path PR review checklist applies only if a plan touches `api.*` / `db.ts` / metafields writers — Phase 6 should not.
- Served-bytes verification culture: count with `split(needle).length - 1`, never `grep -c`.

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Theme app extension (`type = "theme"`) | Shopify CLI scaffold | Product-page block | Existing pattern: `extensions/quiz-block/` `[VERIFIED: repo]` |
| Checkout / Customer Account UI extension (`type = "ui_extension"`) | API `2026-01` (match `quiz-history`) | Thank-you + order-status | Existing TOML shape in `extensions/quiz-history/shopify.extension.toml` `[VERIFIED: repo]` |
| `@shopify/ui-extensions` + Preact | Installed via extension `*` / registry **2026.7.0** latest; root lock also has **2026.4.0** | SHOP-04 UI | Same stack as `quiz-history` `[VERIFIED: npm registry + repo]` |
| Liquid (Online Store 2.0) | Sense theme | Metafields + markup | Storefront render path `[CITED: shopify.dev/docs/api/liquid/objects/metafield]` |
| Vitest | **3.2.4** | Contract / unit tests | Project test runner `[VERIFIED: package.json]` |
| Shopify CLI | **4.6.1** | `shopify app generate` / `shopify app deploy` | Available on machine `[VERIFIED: shell]` |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| Theme app extension `javascript` / `stylesheet` schema attrs | — | Load gate JS/CSS from `assets/` | Prefer schema attrs over inline `<script>` for the gate (keeps Liquid thinner; CDN once) `[CITED: shopify.dev theme app extension configuration]` |
| `enabled_on.templates: ["product"]` | — | Limit block picker to product templates | Prevents merchant placing gate on quiz/page templates `[CITED: same docs]` |
| Checked-in Sense fixture | N/A | CI selector guard for D-02 | Do not depend on sibling theme path in CI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New theme extension directory | Second block inside `extensions/quiz-block/` | Fewer deploy units, but couples PHI iframe block to commerce gate; harder naming/reviews. **Prefer new directory.** |
| Schema `javascript` asset | Inline `<script>` like quiz-block | Inline works (quiz-block precedent) but harder to unit-test; asset file is cleaner for gate logic. |
| One module for two checkout targets (CONTEXT wording) | Two modules sharing a component | **Official docs require a separate module file per target.** Intent of D-09 stands; implement as two thin entry files. `[CITED: shopify.dev create-multi-page-extensions]` |
| Live theme-path CI read | Vendored fixture only | Sibling path `/Users/andrewskinner/Local Sites/allergist-on-demand` is not in this repo's CI. Fixture is the durable guard. |

**Installation (SHOP-04 scaffolding):**

```bash
# From alle-drops-quiz-app — use Shopify CLI generators, do not hand-roll TOML from memory
shopify app generate extension
# Choose: Checkout UI → Thank you / Order status style targets
# Then align api_version with quiz-history ("2026-01") and add the second targeting entry
```

**Version verification (2026-08-12):**

| Package | Verified version | Source |
|---------|------------------|--------|
| `vitest` | 3.2.4 | `npm ls` / lockfile |
| `@shopify/ui-extensions` (npm latest) | 2026.7.0 | `npm view` |
| Shopify CLI | 4.6.1 | `shopify version` |
| Node | v20.19.6 | `node --version` |

## Architecture Patterns

### Recommended Project Structure

```
extensions/
├── quiz-block/                    # EXISTING — do not overload with ATC gate
├── quiz-history/                  # EXISTING — TOML precedent for ui_extension
├── purchase-prerequisites/        # NEW theme extension (SHOP-02/03)
│   ├── shopify.extension.toml     # type = "theme"
│   ├── blocks/
│   │   └── purchase-prerequisites.liquid
│   ├── assets/
│   │   ├── purchase-prerequisites.js
│   │   └── purchase-prerequisites.css
│   └── locales/en.default.json
└── order-review-notice/           # NEW checkout UI extension (SHOP-04)
    ├── shopify.extension.toml     # type = "ui_extension", api_version = "2026-01"
    ├── package.json               # preact + @shopify/ui-extensions (mirror quiz-history)
    └── src/
        ├── ThankYou.jsx           # purchase.thank-you.block.render
        ├── OrderStatus.jsx        # customer-account.order-status.block.render
        └── ReviewNotice.jsx       # shared static copy component

.planning/phases/06-purchase-prerequisites/
├── 06-SHOP-05-COPY-DRAFT.md       # paste-ready admin copy + refund-policy SPEC
└── 06-SHOP-06-FULFILLMENT-PROCESS.md  # AOD checklist draft

tests/
├── fixtures/
│   └── sense-buy-buttons-excerpt.liquid   # vendored Sense selector contract
├── sense-atc-selector-contract.test.ts    # D-02 compensating control
└── purchase-prerequisites-block-contract.test.ts
```

### Pattern 1: Theme app block with section target + product `enabled_on`

**What:** `"target": "section"` block placeable inside Sense `main-product` (schema already has `"type": "@app"` at line ~763). Restrict with `enabled_on.templates: ["product"]`.

**When to use:** SHOP-02/03 product-page UI.

**Example schema skeleton:**

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

Source: `[CITED: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration]`

### Pattern 2: Liquid metafield credit gate (SHOP-02)

**What:** Server-rendered credit from customer metafields; no client fetch.

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

Source: `[CITED: https://shopify.dev/docs/api/liquid/objects/metafield]` — typed metafields expose `.value`; `date_time` formats via `| date`.

**SHOP-02 Wave 0 owed measurement:** render a temporary visible integer on a product template for one of the 4 customers who already have values; confirm non-empty on **authenticated served bytes**. Prefer proving via the real block once deployed rather than a throwaway Custom Liquid — but a Custom Liquid probe is acceptable if the extension is not yet deployed.

### Pattern 3: Fail-open ATC disable (SHOP-03 / D-01 / D-02)

**What:** Block JS finds `.product-form__submit` **inside the nearest product section / form**, sets `disabled` until both confirmations are true; if zero matches, log a `console.warn` and leave buttons alone.

**Selector facts (Sense, measured in theme repo):**

| Fact | Value | Source |
|------|-------|--------|
| Available ATC class | `.product-form__submit` | `snippets/buy-buttons.liquid:77` and `:108` `[VERIFIED: theme]` |
| Express path | `{% if show_dynamic_checkout %}{{ form | payment_button }}{% endif %}` | same file `:96-97` |
| SLIT template flag | `show_dynamic_checkout: true` today | `templates/product.regional-drops.json` `[VERIFIED: theme]` |
| Consult template | also `true`, but **must not receive this block** (D-04) | `product.telehealth-appointment.json` |

**Recommendation (Claude's discretion):** One block, two checkboxes (matches Andrew's selected layout). Scope queries to `closest('product-info, .product, form[action*="/cart/add"]')` rather than `document.querySelectorAll` globally, so related-products sections cannot steal the gate.

### Pattern 4: Multi-page checkout UI extension (SHOP-04 / D-09)

**What:** One extension, two targets, **two modules** (official requirement), shared copy component. No `network_access` needed if copy is static (prefer capabilities off — quiz-history needs network; this one should not).

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

Source: `[CITED: https://shopify.dev/docs/apps/build/checkout/create-multi-page-extensions]` + plan availability `[CITED: https://shopify.dev/docs/api/checkout-extensions]` ("available to all plans except Shopify Starter").

**Correction to CONTEXT wording:** D-09's *intent* (both targets, one extension) is locked. Official docs require **separate module files per target**, not literally one module path twice. Planner should specify two entry modules importing shared `ReviewNotice`.

### Pattern 5: Editor-only theme configuration (D-03)

**What:** After `shopify app deploy`, Andrew (or executor with human) uses theme editor on Sense:

1. Open template **Regional drops** (`product.regional-drops.json`).
2. In `main` / Buy buttons: set **Show dynamic checkout buttons** = OFF.
3. Add app block **Purchase prerequisites** above Buy buttons.
4. Do **not** push `settings_data.json` or the product JSON from the local theme repo.

Record both actions in the plan SUMMARY so the next person does not "fix" them back.

### Pattern 6: SHOP-05 / SHOP-06 non-code packages

Mirror Phase 4's `04-STOREFRONT-COPY-DRAFT.md` pattern:

| Deliverable | File | Contents | Owner after draft |
|-------------|------|----------|-------------------|
| SHOP-05 | `06-SHOP-05-COPY-DRAFT.md` | Paste-ready paragraphs for (a) order confirmation notification, (b) whatever Basic-eligible checkout/admin language field is confirmed in Wave 0; plus a **refund-policy SPEC** (must-include bullets, not final legal prose) | William pastes / writes refund policy |
| SHOP-06 | `06-SHOP-06-FULFILLMENT-PROCESS.md` | Step checklist: verify quiz completion + testing on file before ship; contact/refund path if missing; who owns it | William / AOD adopts |

**SHOP-05 admin surface map (confirm live in Wave 0):**

| Surface | Path | Basic/Grow? | Phase 6 action |
|---------|------|-------------|----------------|
| Order confirmation email | Settings → Notifications → Order confirmation | Yes | Paste-ready body paragraph |
| Store policies (refund) | Settings → Policies → Refund / return policy | Yes | SPEC only (D-11) `[CITED: help.shopify.com policies]` |
| Checkout step UI extension | information/shipping/payment targets | **No — Plus only** | Do not draft as extension; D-09/D-11 already say so `[CITED: checkout-extensions]` |
| Thank you / Order status | Checkout editor app blocks | Yes | Covered by SHOP-04 code, not SHOP-05 paste |
| Theme default content / checkout strings | Online Store → Themes → Edit default theme content | Yes | Candidate for "checkout language" if a suitable string exists — **confirm before drafting** |

### Anti-Patterns to Avoid

- **Pushing the theme repo** to place the block or flip dynamic checkout — re-enables Klaviyo locally (`disabled: false`) onto the PHI quiz page (D-03).
- **Gating without disabling `show_dynamic_checkout`** — express path bypasses ATC entirely.
- **Placing the block on the consult product / telehealth template** — clinical-access regression (D-04).
- **Fetching Fly/Cloud SQL from the product page or thank-you extension** — PHI on Shopify surfaces (D-05, D-10).
- **Third metafield for testing** — CLAUDE.md rule 6 + D-05.
- **Fail-closed ATC** if selector missing — can zero SLIT sales silently (D-02).
- **`grep -c` for verification** — line-vs-occurrence trap; use `split(needle).length - 1`.
- **Assuming Liquid works because Admin API works** — SHOP-01 spike lesson; measure served bytes.
- **`fly deploy` for this phase** — no app-route changes expected; only `shopify app deploy` + editor.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkout UI extension scaffold | Hand-authored TOML/Preact from memory | `shopify app generate extension` then edit targets | CLI wires package.json, uid, build; quiz-history is the shape reference |
| Product form / variant / ATC UI | Custom buy buttons | Sense `buy_buttons` + disable submit | D-01 rejected replacement |
| Testing-status check at purchase | Fly API or third metafield | Honor checkbox + SHOP-06 human verify | D-05 |
| Real-time checkout blocking | Functions / Cart validation | Honor system | `DEC-purchase-gating-is-honor-system`, Basic/Grow |
| Checkout-step disclaimer on Basic | Plus-only checkout UI targets | Admin notification + policies + SHOP-04 | D-11 |
| Selector drift detection | Hope + production monitoring | Checked-in Sense fixture contract test | D-02 mandatory compensating control |

**Key insight:** The real control is **AOD fulfillment (SHOP-06)**. Code exists to *communicate* prerequisites and credit returning patients — not to enforce clinical readiness.

## Common Pitfalls

### Pitfall 1: Express checkout left on
**What goes wrong:** Gate looks correct; Shop Pay still buys without checkboxes.
**Why:** `payment_button` skips ATC (`buy-buttons.liquid:96-97`).
**How to avoid:** Editor checklist item + served-bytes absence of Shop Pay button markup / presence of primary-only submit.
**Warning signs:** Dynamic checkout buttons still visible on SLIT PDP.

### Pitfall 2: Liquid metafield prints blank for credited customers
**What goes wrong:** Returning patients never get D-07 credit.
**Why:** Missing `.value`, wrong namespace, Storefront access flipped off, or customer link never wrote metafields (`customerLinkSkipped`).
**How to avoid:** SHOP-02 first step proves render on a known customer; treat missing metafield as D-08, not error.
**Warning signs:** Admin shows metafield; storefront Liquid empty.

### Pitfall 3: Block placed outside `main-product`
**What goes wrong:** Confirmations show; fail-open never finds `.product-form__submit`.
**Why:** App blocks can also sit in Apps wrapper sections.
**How to avoid:** Placement instructions: inside Product information section, above Buy buttons; CI cannot fully catch misplacement — human UAT required.
**Warning signs:** `console.warn` from gate JS on every load.

### Pitfall 4: Consult product gated
**What goes wrong:** $99 telehealth purchase blocked by testing acknowledgment.
**Why:** D-04 unverified template assignment; block also placeable on other product templates.
**How to avoid:** Wave 0 Admin check of `templateSuffix` for TN/TX/consult handles; `enabled_on` product-only is necessary but not sufficient — do not place on consult template.
**Warning signs:** Consult PDP shows "Before you order" box.

### Pitfall 5: One checkout module path for two targets
**What goes wrong:** `shopify app deploy` validation fails or only one surface works.
**Why:** Docs require separate modules per `[[extensions.targeting]]`.
**How to avoid:** Two entry files + shared component.
**Warning signs:** CLI error about module/target pairing.

### Pitfall 6: Shipping approval-promise copy
**What goes wrong:** Violates `DEC-no-approval-promise-copy`.
**Why:** Easy to draft "you'll be able to purchase if approved" muscle-memory from old email.
**How to avoid:** All SHOP-04/05 strings reviewed against that decision; no unlock/approval language.
**Warning signs:** Words like "approved", "unlocked", "cleared to purchase".

### Pitfall 7: Theme push "to sync" after editor changes
**What goes wrong:** Local Klaviyo `disabled: false` re-enabled on PHI page.
**Why:** Theme repo drift (D-03 / HANDOFF / STATE).
**How to avoid:** Never `shopify theme push` in this phase; document editor-only path.
**Warning signs:** Desire to commit `product.regional-drops.json` mid-phase.

## Code Examples

### Sense ATC selector (what CI must protect)

```liquid
{{# Source: allergist-on-demand/snippets/buy-buttons.liquid:73-98 #}}
<button
  id="ProductSubmitButton-{{ section_id }}"
  type="submit"
  name="add"
  class="product-form__submit button button--full-width ..."
>
...
{%- if show_dynamic_checkout -%}
  {{ form | payment_button }}
{%- endif -%}
```

### Liquid contract needles for the new block

Assert presence of (examples — final needles chosen at plan time):

- `customer.metafields.alledrops.quiz_count`
- `customer.metafields.alledrops.last_completed_at`
- `.value`
- `product-form__submit`
- fail-open branch / `console.warn` marker
- D-06 acknowledgment substring (once copy locked)

### Checkout extension Preact shape (mirror quiz-history style)

```jsx
// Source pattern: extensions/quiz-history/src/QuizHistoryBlock.jsx
// SHOP-04 must NOT fetch Fly or read quiz data — static only
import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { ReviewNotice } from './ReviewNotice.jsx';

export default async () => {
  render(<ReviewNotice />, document.body);
};
```

(Exact `shopify.extend` / Preact bootstrap may differ for checkout targets — **generate with CLI and align to generated starter**, using quiz-history only as capability/TOML precedent.)

### D-02 CI fixture strategy (recommended)

1. Vendor `tests/fixtures/sense-buy-buttons-excerpt.liquid` containing the two `.product-form__submit` buttons and the `payment_button` conditional from Sense.
2. `tests/sense-atc-selector-contract.test.ts` fails if those needles disappear.
3. Optional non-blocking local check: if sibling theme path exists, assert excerpt matches live snippet hash — document as developer-machine only, not CI-required.
4. Block contract test asserts gate JS still references `.product-form__submit`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unstructured customer metafields (Admin-readable only) | Defined metafields + Storefront API access ON | 2026-08-12 SHOP-01 spike | Enables Liquid SHOP-02/03 design |
| Plus-only mental model for all checkout UI | Thank-you / Order status available except Starter | Shopify checkout extensibility rollout | SHOP-04 buildable on Basic/Grow |
| Account-flag / Functions gating | Honor system + fulfillment verify | 2026-07-29 locked call | Defines Phase 6 ceiling |
| Email-only testing results | Upload required in quiz (Phase 4) | 2026-08-09 | SHOP-06 verifies upload/on-file; D-06 checkbox is acknowledgment not proof |

**Deprecated/outdated:**

- Treating Admin API metafield reads as proof of Liquid readability (SHOP-01 spike).
- Drafting checkout-step UI extensions for Basic (Plus-only for information/shipping/payment).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Both SLIT products use `product.regional-drops.json` and consult does not | D-04 / Pitfall 4 | Gate on wrong SKU or miss a SLIT page — **must verify in Wave 0, not ship on this assumption** |
| A2 | "Checkout language" for SHOP-05 maps to Notifications + Policies + optional theme default content strings (no mid-checkout banner on Basic) | SHOP-05 | Drafts aimed at a non-existent field — confirm admin surfaces in Wave 0 |
| A3 | Static SHOP-04 copy needs no `network_access` / `api_access` capabilities | Pattern 4 | If Shopify later requires a capability flag for block render, enable minimally without network |
| A4 | Theme extension asset `javascript` schema attribute is preferable to inline script for the gate | Standard Stack | If CLI/validator quirks appear, fall back to quiz-block inline `<script>` pattern |
| A5 | How patients send outstanding testing results (email address / portal) for D-10 copy is known or draftable from existing Phase 4 upload messaging | D-10 | Copy blocked on William for the "how to send" half — flag in plan if unresolved |

**A1 and A2 are planning gates, not soft assumptions** — treat as Wave 0 verification tasks.

## Open Questions (RESOLVED)

Planning resolved each item below; execution still performs the named Wave 0 / plan tasks.

1. **D-04 product → template assignment (Wave 0 blocker for placement)** — **RESOLVED**
   - What we know: three templates exist; `regional-drops` is the SLIT-shaped one.
   - What's unclear: live Admin `templateSuffix` for `tennessee-alledrops`, `texas-alledrops`, `allergy-consultation` (or current consult handle).
   - Resolution: Planned as Wave 0 **plan 02 Task 1** (`06-02-PLAN.md`) — human Admin / GraphQL `templateSuffix` table in `06-02-SUMMARY.md` with STOP gates before placement (plan 06). Do not assume in build plans.

2. **Exact SHOP-05 paste targets** — **RESOLVED**
   - What we know: order confirmation notification and refund policy exist; checkout-step extensions need Plus.
   - What's unclear: which free-text "checkout language" field William expects on Basic.
   - Resolution: Planned as Wave 0 **plan 02 Task 2** (`06-02-PLAN.md`) — 15-minute admin surface inventory (`surface_path`, `editable_on_basic_grow`, `draft_target_for_06-05`) before plan 05 drafts. Plus-only checkout-step targets explicitly out of scope; if no mid-checkout field, SUMMARY documents that SHOP-04 + notifications + policies cover SHOP-05 intent.

3. **D-10 "how to send testing results" destination** — **RESOLVED**
   - What we know: Phase 4 requires upload during quiz; some patients may buy before finishing that path.
   - What's unclear: post-purchase intake instructions (email? re-enter quiz? support contact?).
   - Resolution: Locked in **`06-UI-SPEC.md`** SHOP-04 Testing follow-up — generic clinic contact via support details on the order confirmation email; do not invent `testing@…` or a non-AOD domain. William may later confirm a specific post-purchase destination; plans draft against the UI-SPEC generic wording (A5).

4. **Login `return_to` (Claude's discretion)** — **RESOLVED**
   - Resolution: Locked in **`06-UI-SPEC.md`** + **plan 03** Liquid task — `/account/login?return_to={{ product.url | url_encode }}` (relative `product.url` only; no absolute external `return_to`). Matches D-08 spirit; open-redirect mitigation in plan 03 threat model.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Tests / builds | ✓ | v20.19.6 | — |
| npm | Install | ✓ | 10.8.2 | — |
| Shopify CLI | Generate + deploy extensions | ✓ | 4.6.1 | — |
| Vitest | Contract tests | ✓ | 3.2.4 | — |
| Sibling Sense theme (local path) | Selector research / optional hash check | ✓ on Andrew's machine | Sense (theme repo) | Vendored fixture for CI |
| Fly CLI | Not required for Phase 6 code | ✓ | present | Skip — no Fly deploy expected |
| Logged-in Chrome (`claude-in-chrome`) | Liquid render proof, editor placement, UAT | ✓ (process) | — | Required for SHOP-02 measurement; chrome-devtools MCP lacks Shopify session `[VERIFIED: HANDOFF.md]` |
| Cloud SQL / GCS | Not required | ✓ | — | Do not touch |

**Missing dependencies with no fallback:**
- None for scaffolding/tests. Human Shopify admin session is required for Wave 0 Liquid proof and editor placement — cannot be replaced by headless chrome-devtools.

**Missing dependencies with fallback:**
- Sibling theme in CI → use vendored Sense excerpt fixture.

**Step 2.6 note:** Phase 6 has external Shopify surfaces (admin, theme editor, checkout editor) but no new runtimes beyond existing Node/Shopify CLI.

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` → treat as **enabled**.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (`environment: "node"`, includes `tests/**/*.test.ts`) |
| Quick run command | `npx vitest run tests/sense-atc-selector-contract.test.ts tests/purchase-prerequisites-block-contract.test.ts` |
| Full suite command | `npm test` (expect ~734+ after new files) |
| Typecheck | `npm run typecheck` (only if TS added under app/; extensions may be JS/JSX) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHOP-01 | Definitions exist; Liquid renders for logged-in customer | manual + served-bytes | Browser as known customer; `split('…quiz_count…').length-1` or visible integer on HTML | ❌ Wave 0 (measurement) |
| SHOP-02 | Credited state when `quiz_count >= 1`; login line otherwise | unit/contract + manual | `npx vitest run tests/purchase-prerequisites-block-contract.test.ts` + browser | ❌ Wave 0 |
| SHOP-03 | Both checkboxes required before ATC enables; fail-open if selector missing | contract + DOM optional + manual | Selector fixture + block contract; human PDP pass | ❌ Wave 0 |
| SHOP-03 | `show_dynamic_checkout` off on SLIT template | manual served-bytes | Authenticated fetch: no Shop Pay / `payment_button` output on TN/TX PDPs | ❌ Wave 0 (editor) |
| SHOP-03 | CI detects Sense selector drift | unit | `npx vitest run tests/sense-atc-selector-contract.test.ts` | ❌ Wave 0 |
| SHOP-04 | TOML has both targets; modules export static notice; no PHI fetch | contract | Source assertions on `shopify.extension.toml` + src (no `fetch(` to Fly, no score/bracket) | ❌ Wave 0 |
| SHOP-04 | Extension visible on thank-you / order-status | manual | Checkout editor + test order | ❌ Wave 0 |
| SHOP-05 | Copy draft + refund SPEC exist | artifact | File presence + checklist in plan | ❌ Wave 0 |
| SHOP-06 | Fulfillment process draft exists | artifact | File presence | ❌ Wave 0 |
| D-04 | TN/TX on regional-drops; consult not | manual admin | Record `templateSuffix` in SUMMARY | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** targeted contract test(s) for files touched + `npm test` if shared helpers change
- **Per wave merge:** `npm test` + `npm run typecheck` if applicable
- **Phase gate:** Full suite green; Liquid metafield served-bytes proof; human browser pass on both SLIT PDPs (logged-in credited + logged-out); thank-you/order-status placement confirmed; SHOP-05/06 markdown files present; **no** `shopify theme push` in the phase log

### Wave 0 Gaps

- [ ] `tests/fixtures/sense-buy-buttons-excerpt.liquid` — vendored Sense ATC/express needles for D-02
- [ ] `tests/sense-atc-selector-contract.test.ts` — covers D-02 compensating control
- [ ] `tests/purchase-prerequisites-block-contract.test.ts` — metafield Liquid needles, selector string, fail-open marker, schema JSON validity (mirror `liquid-block-contract.test.ts`)
- [ ] `tests/order-review-notice-extension-contract.test.ts` — both targets present; no network PHI fetch
- [ ] D-04 Admin templateSuffix verification (human) before placement tasks
- [ ] SHOP-01→SHOP-02 Liquid render measurement protocol (logged-in customer + served bytes)
- [ ] SHOP-05 admin surface inventory (human, 15 min)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | Customer login optional; login link for credit only (D-08). No new auth system. |
| V3 Session Management | no | No new sessions |
| V4 Access Control | yes (negative) | Thank-you/order-status must not load PHI by order id; no ownership-bounded PHI API calls from SHOP-04 |
| V5 Input Validation | yes | Gate JS: treat checkbox state as UI only; do not trust client for fulfillment. Liquid outputs metafields with `| escape` / safe filters where text is interpolated. |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PHI leakage onto Shopify surfaces | Information disclosure | D-05/D-10: no third metafield, no Fly fetch from PDP/thank-you; CLAUDE.md rule 6 |
| Tracker re-enable via theme push | Information disclosure | D-03: editor only; never push drifted `settings_data.json` |
| Open redirect via login `return_to` | Spoofing | Use product.url / relative path only; reject absolute external URLs if constructing manually |
| Silent ATC outage (fail-closed) | Denial of service | D-02 fail-open |
| Silent gate breakage (fail-open unnoticed) | Tampering / elevation of privilege vs policy | Mandatory CI selector contract + human UAT |
| Approval-promise copy | Elevation (policy) | `DEC-no-approval-promise-copy` review on all drafts |
| Analytics segmentation on health-adjacent metafields | Information disclosure | Keep "Filter or group data in Analytics" **OFF** (SHOP-01 spike) |

## Sources

### Primary (HIGH confidence)

- Repo: `extensions/quiz-block/`, `extensions/quiz-history/`, `app/lib/shopify/metafields.ts`, `tests/liquid-block-contract.test.ts`
- Theme: `allergist-on-demand/templates/product*.json`, `snippets/buy-buttons.liquid`, `sections/main-product.liquid` (@app)
- `06-CONTEXT.md`, `06-SPIKE-SHOP-01.md`, `REQUIREMENTS.md`, `STATE.md`, `ROADMAP.md`, `HANDOFF.md`, `CLAUDE.md`, `PROJECT.md` DEC-* 
- https://shopify.dev/docs/api/checkout-extensions — plan availability for thank-you/order-status
- https://shopify.dev/docs/apps/build/checkout/create-multi-page-extensions — multi-target + separate modules
- https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration — schema, `enabled_on`, assets
- https://shopify.dev/docs/api/liquid/objects/metafield — `.value` + date formatting
- https://help.shopify.com/en/manual/checkout-settings/refund-privacy-tos — policies admin path
- https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations — Basic vs Plus checkout editor matrix
- npm registry: `@shopify/ui-extensions@2026.7.0`, `vitest@3.2.4`

### Secondary (MEDIUM confidence)

- Shopify Canada / Help Center articles on checkout customization feature matrix (Basic vs Plus) — consistent with official checkout-extensions page
- Phase 4 storefront copy-draft pattern as template for SHOP-05/06 artifacts

### Tertiary (LOW confidence)

- Exact mid-checkout free-text field availability on this shop's Basic/Grow admin — needs live inventory (A2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mirrors existing extensions + verified CLI/docs
- Architecture: HIGH — locked decisions map cleanly to Shopify primitives; D-09 module clarification is doc-driven
- Pitfalls: HIGH — several are already measured in this project's STATE/HANDOFF
- SHOP-05 exact admin fields: MEDIUM — needs Wave 0 confirmation
- D-04 template assignment: LOW until verified (explicitly unproven)

**Research date:** 2026-08-12
**Valid until:** 2026-09-11 (30 days; Shopify extension APIs move faster — re-check `api_version` / CLI if scaffolding fails)
