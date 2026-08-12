# Phase 6: Purchase Prerequisites & Returning Patients - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-12
**Phase:** 6-purchase-prerequisites
**Areas discussed:** Add-to-cart gating mechanism, Testing confirmation data source,
Returning-patient state, Thank-you extension scope + SHOP-05 copy

---

## Pre-discussion findings

Three measurements taken during codebase scout that shaped the options presented:

1. **Thank-you extensions work on Basic/Grow.** Shopify docs: Thank you and Order status page
   extensions are available to all plans except Starter; only the checkout *step* targets require
   Plus. SHOP-04 is buildable, SHOP-05's "checkout page language" is not and must be admin content.
2. **The product template already accepts app blocks.** `sections/main-product.liquid` declares
   `"type": "@app"`, and `product.regional-drops.json` already carries one. But an app block is a
   *sibling* of `buy_buttons` and cannot natively disable it.
3. **Nothing in Shopify knows whether testing was submitted.** `quiz_count` proves the quiz; testing
   status lives only in Cloud SQL `answers_json`, which is PHI.

---

## Add-to-cart gating mechanism

Additional measurement surfaced before the question: `buy_buttons` on the SLIT template has
`show_dynamic_checkout: true`, so an express button renders and skips add-to-cart entirely.

| Option | Description | Selected |
|--------|-------------|----------|
| Disable button + kill express checkout | JS disables `.product-form__submit` until both boxes checked; `show_dynamic_checkout` turned OFF so there's one path. Couples to theme DOM. | ✓ |
| Warn only, never touch the button | Confirmations render, add-to-cart always works. Zero theme coupling, but doesn't literally "require" the confirmations. | |
| Replace `buy_buttons` entirely | App block renders its own form. Full control, but reimplements variant/qty/inventory/gift-card on the pages that take money. | |

**User's choice:** Disable button + kill express checkout
**Notes:** Both halves are one decision — gating only `.product-form__submit` while the express
button remains would make the block decorative.

---

## Gate failure mode

| Option | Description | Selected |
|--------|-------------|----------|
| Fail open — button works, block still shows | Store never loses the ability to sell on a theme update. Matches the honor-system decision. Needs a CI test that fails loudly. | ✓ |
| Fail closed — button stays disabled | Matches the project's fail-closed posture elsewhere (DEF-02). Risk: a theme update silently takes both SLIT products offline. | |
| Fail open, but surface it in the admin | Same as fail-open plus a real detection surface. More build than a CI test. | |

**User's choice:** Fail open
**Notes:** Recorded in CONTEXT.md D-02 as a deliberate reversal of the usual fail-closed posture,
with the reasoning why the two cases differ. The CI guard is captured as mandatory, not optional.

---

## Block placement

| Option | Description | Selected |
|--------|-------------|----------|
| Andrew adds it in the theme editor | Same route as every prior theme change. Never touches `settings_data.json`, so it cannot re-enable Klaviyo on the PHI page. | ✓ |
| Reconcile the theme repo first, then push | Cleaner long-term, makes template state reviewable. But reconciling drift on a live store is its own task with real risk. | |

**User's choice:** Theme editor
**Notes:** Repo reconciliation moved to Deferred Ideas rather than dropped.

---

## Testing confirmation's data source

| Option | Description | Selected |
|--------|-------------|----------|
| Pure self-attestation, no data source | The locked honor system. No metafield, no reopened PHI boundary. Verified by AOD at fulfillment (SHOP-06). | ✓ |
| Add a third non-PHI metafield | Would need an explicit `CLAUDE.md` rule 6 amendment; "this customer submitted allergy test results" reads as PHI more clearly than `quiz_count` does. | |
| Fetch from the Fly API on the product page | No customer auth token on a storefront product page, so it means building one — and puts clinical status on a commerce page. | |

**User's choice:** Pure self-attestation
**Notes:** The argument against the metafield is preserved in CONTEXT.md D-05 so a future phase
doesn't re-add it quietly.

---

## Testing confirmation wording

| Option | Description | Selected |
|--------|-------------|----------|
| Acknowledgment of the requirement | "I understand AOD will not ship until allergy testing results are on file." Honest about what the checkbox is. | ✓ |
| Attestation of fact | "I've submitted my allergy testing results." Matches SHOP-03's wording most literally; gives AOD something the patient claimed. | |
| You decide during planning | Leave wording to the planner under the copy constraints. | |

**User's choice:** Acknowledgment
**Notes:** Creates a deliberate asymmetry with the quiz box, which *is* verifiable for matched
logged-in customers. CONTEXT.md D-06 records that the copy should not paper over it.

---

## Returning-patient state

| Option | Description | Selected |
|--------|-------------|----------|
| Show the date and pre-check it, locked | Strongest reading of "credit for work already done"; drops the gate to one click for the person who earned it. | ✓ |
| Show the credit, still require the tick | Satisfies SHOP-02 literally — the requirement says the patient "sees" the state, not that it's pre-filled. | |
| Pre-check but leave it editable | Hedges against a stale or wrongly-matched metafield. Weaker signal, invites accidental unticking. | |

**User's choice:** Pre-checked, locked, dated
**Notes:** Makes both metafields load-bearing — `quiz_count` decides whether to credit,
`last_completed_at` supplies the date.

---

## Logged-out / unmatched shopper

| Option | Description | Selected |
|--------|-------------|----------|
| Unchecked boxes + one login line | Explains the absent credit without pressuring accounts. Covers the email-mismatch case with the same sentence. | ✓ |
| Identical to any first-time buyer | Simplest, implies nothing about the shopper. But a logged-out returning patient reads it as broken. | |
| Prominent log-in prompt | More patients get matched, at the cost of friction on a purchase page. | |

**User's choice:** Unchecked boxes + one login line
**Notes:** Framed in the question as the *common* case, not an edge case — accounts aren't required
to buy and `customerLinkSkipped` is set in three places in `api.quiz.submit.tsx`.

---

## Checkout UI extension targets

| Option | Description | Selected |
|--------|-------------|----------|
| Thank you + order status | One module, two targets. Order status is where a waiting patient returns. | ✓ |
| Thank you only | SHOP-04 verbatim. Smaller, but the 2–3 day expectation is what a patient re-reads on day 2. | |

**User's choice:** Both targets

---

## Thank-you content depth

| Option | Description | Selected |
|--------|-------------|----------|
| Review expectation + what's still needed | Closes the loop the acknowledgment checkbox opened. Inside the phase domain. | ✓ |
| Review expectation only | SHOP-04 verbatim; nothing to get wrong. But no follow-up on how to send testing. | |
| Personalized to the order | Needs a network call and a new endpoint; drifts toward clinical status on a Shopify surface. | |

**User's choice:** Review expectation + how to send testing results
**Notes:** Hard constraint recorded — the extension receives an order id, never quiz data.

---

## SHOP-05 admin copy ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Draft checkout + order confirmation, William owns refund policy | Matches the ownership split REQUIREMENTS.md already records. | ✓ |
| Draft all three for William to review | Fastest for him, but a complete refund-policy draft risks being pasted without real review. | |
| Checklist only | Cleanest ownership; most likely to sit unfinished. | |

**User's choice:** Draft two, specify the third

---

## Claude's Discretion

- Selector strategy and DOM-guard implementation for D-01/D-02, and what the CI guard asserts against
- Whether the confirmations are one block with two checkboxes or two configurable blocks
- Visual treatment of the disabled button state
- Naming of the new extension directories
- Whether the D-08 login line carries a `return_to` back to the product page

## Deferred Ideas

- Reconciling the `allergist-on-demand` theme repo (Klaviyo `disabled: false` drift + stale
  `quiz-kit-smart-product-finder` reference)
- A third non-PHI metafield for testing status — declined under D-05, with the argument preserved
- Personalized order status on the thank-you page — declined under D-10
- Cart-level handling for a mixed SLIT + consult cart — raised at the end, not explored; ungated by
  construction and consistent with the honor system
- LAUNCH-01 Klaviyo web pixel — Phase 8, Andrew-owned, deliberately out of scope

## Offered but not taken up

At the closing check, two further gray areas were offered and declined in favour of proceeding:
whether the $99 consult product gets prerequisites at all (recorded instead as CONTEXT.md **D-04**, a
planning verification item rather than a locked decision), and whether Phase 6 drafts SHOP-06's
fulfillment process for AOD or merely names it as their deliverable (left as recorded in
REQUIREMENTS.md — William / AOD own it).
