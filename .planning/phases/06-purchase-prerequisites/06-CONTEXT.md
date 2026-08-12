# Phase 6: Purchase Prerequisites & Returning Patients - Context

**Gathered:** 2026-08-12
**Status:** Ready for planning

<domain>
## Phase Boundary

At the moment of purchase, a SLIT buyer is told what AOD requires before shipping — and a returning
patient gets visible credit for the assessment they already completed.

Phase 6 delivers:

- **SHOP-02** — returning-patient completion state on the product page, read from Liquid
- **SHOP-03** — two prerequisite confirmations gating add-to-cart on the SLIT product page(s), via a
  new theme app extension block
- **SHOP-04** — a checkout UI extension explaining clinical review and the 2–3 business day
  expectation
- **SHOP-05** — drafted admin copy for checkout language and order confirmation; refund policy
  specified for William
- **SHOP-06** — AOD's written fulfillment verification step (process, not code — William/AOD own it)

**SHOP-01 is already done.** The spike ran 2026-08-12 and cleared the gate — both metafield
definitions exist with Storefront API access on. See `06-SPIKE-SHOP-01.md`. Phase 6 opens with
SHOP-02, carrying the spike's one owed measurement as SHOP-02's first step.

**Explicitly NOT in this phase:**

- Any enforcement that isn't UI-level. `DEC-purchase-gating-is-honor-system` is LOCKED: no account
  flags, no Shopify Functions, no real-time checkout blocking, no mandatory accounts, no manual
  clinical unlock, no `orders/create` backstop. These are not gaps to close — they were removed by
  the client, and the Basic/Grow plan plus `read_customers,write_customers` scopes make them
  unavailable anyway.
- The telehealth consult purchase path (Phase 7) and its `/pages/consult` landing page.
- LAUNCH-01's Klaviyo remediation. It touches the same theme, and it is Phase 8 / Andrew-owned.

</domain>

<decisions>
## Implementation Decisions

### Add-to-cart gating mechanism

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

### The testing confirmation and its (absent) data source

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

### Returning-patient completion state

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

### Thank-you / order-status extension

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

### SHOP-05 admin copy

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The locked client decisions this phase must not violate
- `.planning/PROJECT.md` §`<decisions>` `DEC-purchase-gating-is-honor-system` — the full in-scope /
  do-not-build list. **Read this before proposing any enforcement mechanism.**
- `.planning/PROJECT.md` §`<decisions>` `DEC-mandatory-allergy-testing` — testing is mandatory before
  SLIT. Scoped to immunotherapy, which is why D-04 asks about the consult product.
- `.planning/PROJECT.md` §`<decisions>` `DEC-no-approval-promise-copy` — the "purchase if approved"
  paragraph must not ship. Directly constrains every copy string in this phase.
- `.planning/PROJECT.md` §"Out of Scope" — the account-flag / Functions / Locksmith list, and the
  Basic-vs-Plus reasoning behind it.
- `.planning/PROJECT.md` §"Constraints" — Platform rows: Basic/Grow not Plus,
  `read_customers,write_customers` only, `read_orders` needs a merchant reinstall.

### This phase's requirements and the spike that unblocked it
- `.planning/ROADMAP.md` §"Phase 6: Purchase Prerequisites & Returning Patients" — goal, five success
  criteria, the known email-matching weakness.
- `.planning/REQUIREMENTS.md` §"Purchase Prerequisites & Returning Patients" — SHOP-01..06 verbatim,
  including the ownership notes on SHOP-05 and SHOP-06.
- `.planning/phases/06-purchase-prerequisites/06-SPIKE-SHOP-01.md` — **required reading.** The
  metafield definitions and their access settings, why "Filter or group data in Analytics" must stay
  OFF, and the one owed measurement assigned to SHOP-02's first step.

### Compliance rules that bound this phase
- `CLAUDE.md` §rules 2, 4, 5, 6 — PHI never in Shopify; no third-party scripts on PHI-collecting
  pages; the PHI field list; **rule 6's two-metafield allowlist, which D-05 declines to widen.**
- `CLAUDE.md` §"Self-review checklist for PHI-handling changes" — applies if any plan ends up
  touching `api.*` routes.

### Theme surfaces this phase changes
- `/Users/andrewskinner/Local Sites/allergist-on-demand/templates/product.regional-drops.json` — the
  SLIT template. `buy_buttons` settings carry `show_dynamic_checkout: true` (D-01 turns this off).
  Still references a stale `quiz-kit-smart-product-finder` app block.
- `/Users/andrewskinner/Local Sites/allergist-on-demand/sections/main-product.liquid` — declares
  `"type": "@app"` in its block schema (line ~763) and renders `buy_buttons` at line ~495. This is
  what makes a theme app extension block placeable inside the product section.
- `/Users/andrewskinner/Local Sites/allergist-on-demand/snippets/buy-buttons.liquid:75-77,96-97,106-108`
  — the two `.product-form__submit` buttons and the `{{ form | payment_button }}` express button.
  **The selector D-01 depends on and D-02 guards.**
- `/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json` — **do not push
  this file.** Carries `disabled: false` for the Klaviyo embed locally; the live store has it
  disabled. See D-03.

### Code this phase reads from or mirrors
- `app/lib/shopify/metafields.ts` — the two metafields, their exact types (`date_time`,
  `number_integer`) and namespace. The PHI banner at the top is the rule D-05 respects.
- `app/routes/api.quiz.submit.tsx:108,139,159,163,274,286` — where `customerLinkSkipped` is set and
  where the metafields are written. **This is the source of D-08's "no data is the common case."**
- `extensions/quiz-block/blocks/symptom-quiz.liquid` — the existing theme app block. The working
  precedent for schema settings, defaults, and the `{%- style -%}` pattern. Its
  `enable_test_mode` default (`false`) is the LAUNCH-02 evidence.
- `extensions/quiz-history/shopify.extension.toml` — the existing `ui_extension` TOML shape,
  including `[[extensions.targeting]]` and `[extensions.capabilities]`. Closest analog for SHOP-04's
  new extension.

### External docs consulted in this discussion
- `https://shopify.dev/docs/api/checkout-extensions` — the plan-availability statement behind D-09.
- `https://shopify.dev/docs/apps/build/checkout/create-multi-page-extensions` — the two-target
  pattern D-09 adopts.
- `https://shopify.dev/docs/apps/build/checkout/thank-you-order-status` — confirms the order is not
  yet created on the thank-you target but the order id is available. Relevant if planning revisits
  D-10.

**Docs gap worth not re-hunting:** `shopify-dev-mcp` search did NOT return a direct statement that
Liquid customer-metafield reads require a definition with Storefront API access. Results route to the
Customer Account API instead. The SHOP-01 spike settled this empirically. Don't burn time
re-searching it.

</canonical_refs>

<code_context>
## Existing Code Insights

### Measured facts — do not re-derive

| Fact | Value | Where |
|---|---|---|
| Product templates in the theme | 3 — `product.json`, `product.regional-drops.json`, `product.telehealth-appointment.json` | `templates/` |
| SLIT template's `main` section | `main-product`, blocks include `regional_info_block` and `buy_buttons` | `product.regional-drops.json` |
| `show_dynamic_checkout` on the SLIT template | **`true`** — express button renders and skips add-to-cart | same, `buy_buttons` settings |
| Does `main-product` accept app blocks | **Yes** — `"type": "@app"` in its schema, and the template already carries one | `sections/main-product.liquid:763` |
| Add-to-cart submit class | `.product-form__submit`, **two** occurrences | `snippets/buy-buttons.liquid:77,108` |
| App scopes | `read_customers,write_customers` only | `shopify.app.toml` |
| Existing extensions | 2 — `quiz-block` (`type = "theme"`), `quiz-history` (`type = "ui_extension"`) | `extensions/` |
| Thank-you / order-status extensions on Basic/Grow | **Available** (all plans except Starter) | Shopify docs, verified 2026-08-12 |

### Reusable Assets
- **`extensions/quiz-block/blocks/symptom-quiz.liquid`** — the working precedent for a theme app
  block on this store: schema settings with defaults, `{%- style -%}` scoping, and the
  Liquid→iframe query-param channel. The new product block should mirror its schema conventions.
- **`extensions/quiz-history/shopify.extension.toml`** — the `ui_extension` TOML shape SHOP-04's
  extension follows, including `[[extensions.targeting]]` and `[extensions.capabilities]`.
- **`app/lib/shopify/metafields.ts`** — no changes needed. D-05 declines to add a third metafield, so
  this file is read-only context for the exact namespace/key/type the Liquid reads must match.

### Established Patterns
- **Served-bytes verification, never exit codes.** Count occurrences with `split(needle).length - 1`,
  never `grep -c` — the bundle is one line, and this project has been burned by the line-vs-occurrence
  trap twice (STATE.md records both).
- **A green precondition is not proof of behavior.** Six defects have shipped past a fully green
  suite on this project, and the SHOP-01 spike deliberately stopped short of claiming the Liquid
  render works. Phase 6's first verification should close that.
- **Theme changes go through the editor, not a push.** Every prior theme change on this project
  (Gate D redirect fix, Klaviyo disable, Phase 4's theme push exception) went that route. D-03
  continues it.
- **Human browser pass before a phase closes.** 04.1's D-08 made this blocking after six
  human-caught defects. A gating UI on the two pages that take money is exactly the class of change
  that warrants it.

### Integration Points
- **Liquid → app block:** `customer.metafields.alledrops.quiz_count` and `.last_completed_at` read
  directly in the block's Liquid. **Unproven — this is SHOP-02's first measurement** (see the spike).
- **App block → theme DOM:** the block's JS reaches outside itself to `.product-form__submit` in the
  `main-product` section. This is the phase's only cross-boundary coupling and the sole reason D-02
  and its CI guard exist.
- **Theme editor → template:** `show_dynamic_checkout` off, plus block placement, are both editor
  actions on `product.regional-drops.json`. Neither is a code change; both must be recorded so the
  next person doesn't "fix" them back.
- **New checkout UI extension → `shopify app deploy`.** SHOP-04 ships through Shopify's deploy
  system, not `fly deploy`. Nothing in Phase 6 obviously requires a Fly deploy at all — worth
  confirming during planning rather than assuming a three-channel deploy.

</code_context>

<specifics>
## Specific Ideas

**The logged-in returning-patient layout Andrew selected**, verbatim from the chosen preview:

```
[ Your Regional Formula ]

┌─ Before you order ──────────────────┐
│ ☑ Symptom assessment complete       │
│   Completed August 12, 2026         │
│                                     │
│ ☐ I understand AOD will not ship    │
│   until allergy testing results     │
│   are on file.                      │
└─────────────────────────────────────┘

[  Add to cart  ]  <- disabled until the
                      second box is ticked

(no Shop Pay button — show_dynamic_checkout
 turned off on this template)
```

**The logged-out / unmatched variant** (D-08) — same block, both boxes unchecked, plus one line:

```
Already completed your assessment? Log in to see it here.
```

</specifics>

<deferred>
## Deferred Ideas

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

</deferred>

---

*Phase: 6-purchase-prerequisites*
*Context gathered: 2026-08-12*
