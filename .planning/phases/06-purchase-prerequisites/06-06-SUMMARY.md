---
phase: 06-purchase-prerequisites
plan: 06
subsystem: deploy-and-placement
tags: [d-01, d-03, d-04, editor-placement, uat, shopify-app-deploy]
requires:
  - phase: 06-purchase-prerequisites
    provides: 06-02 D-04 table, 06-03 theme block, 06-04 checkout extension
provides:
  - "Shopify app version alledrops-quiz-production-24"
  - "Live purchase-prerequisites gate on both SLIT PDPs"
  - "order-review-notice placed on thank-you and order-status"
affects: []
tech-stack:
  added: []
  patterns: ["Theme editor reached by deep link; Themes list page is broken on this store"]
key-files:
  created:
    - .planning/phases/06-purchase-prerequisites/06-06-SUMMARY.md
  modified: []
key-decisions:
  - "Analytics-filter reconfirmation superseded by Andrew's 2026-08-13 decision to leave it ON"
  - "Notice placed after order confirmation on both checkout surfaces, not above it"
requirements-completed: [SHOP-01, SHOP-02, SHOP-03, SHOP-04]
duration: ~40min
completed: 2026-08-13
status: complete-with-open-items
---

# Phase 6 Plan 06: Deploy, Editor Placement, UAT Summary

**Task 1 COMPLETE. Task 2 MOSTLY COMPLETE — two verifications are owed and are recorded as owed, not
as passed.** The gate is live on both SLIT PDPs and demonstrably works.

## Task 1 checklist

| item | status | evidence |
|---|---|---|
| `shopify app deploy` | ✅ | **`alledrops-quiz-production-24`** (previous: `-23`), message *"Phase 6: purchase-prerequisites block + order-review-notice"*, `--source-control-url` pinned to the merge commit |
| Deployed from | ✅ | `main`, after merging `thread-phase-6-purchase-prerequisites` under Andrew's explicit in-session authorization. Gates re-run on `main` before deploy: typecheck exit 0, 812 tests / 53 files |
| Show dynamic checkout buttons **OFF** on `regional-drops` | ✅ | Theme editor, Buy buttons block. Toggle confirmed off by zoom; preview lost "Buy it now" |
| Purchase prerequisites block placed | ✅ | Inside `Product information`, dragged to sit **immediately above Buy buttons** (after Quantity selector) |
| Block on TN | ✅ | served bytes, below |
| Block on TX | ✅ | served bytes, below — **one edit covered both**, the template is shared |
| Block **absent** on consult | ✅ | served bytes, below |
| `order-review-notice` on thank-you | ✅ | Checkout editor → Thank you → Main, positioned after "Your order is confirmed" |
| `order-review-notice` on order-status | ✅ | Checkout editor → Order status → Main, positioned after the payment block |
| **No `shopify theme push` was run** | ✅ | **Attested. No `shopify theme push` was run at any point in this phase.** All theme changes were made through the theme editor UI. The only CLI theme commands used anywhere in Phase 6 were `list`, `duplicate`, `pull`, `push --theme <UNPUBLISHED PROBE>` and `delete`, all in `06-02` Task 3 against a throwaway duplicate that was deleted; `layout/theme.liquid` on live Sense was re-pulled afterwards and verified byte-clean of the probe |
| No `fly deploy` | ✅ | None run. Phase 6 changed no Fly-served code |

**Template scope confirmed:** the editor reported `regional-drops` — **"Assigned to 2 products"**,
matching `06-02` Task 1's D-04 table exactly (TN + TX). The consult is on `telehealth-appointment` and
is structurally unreachable, which is why the consult check below passes without a runtime exclusion.

## Task 2 — UAT evidence

### Served bytes, authenticated + cache-busted, `split(needle).length - 1`

Fetched from the logged-in storefront session with `credentials: 'include'`, `cache: 'no-store'`.

| needle | TN | TX | consult |
|---|---|---|---|
| HTTP status | 200 | 200 | 200 |
| bytes | 140,167 | 139,939 | 128,562 |
| `Before you order` | **1** | **1** | **0** |
| `Symptom assessment complete` | **1** | **1** | 0 |
| `Completed August 10, 2026` | **1** | **1** | 0 |
| `I completed the AlleDrops symptom assessment` | 0 | 0 | 0 |
| `Already completed your assessment` | 0 | 0 | 0 |
| testing acknowledgment (D-06) | **1** | **1** | 0 |
| `Confirm both items above to add to cart` | **1** | **1** | 0 |
| `data-purchase-prerequisites` | **1** | **1** | 0 |
| `purchase-prerequisites.js` | **1** | **1** | 0 |
| `product-form__submit` | **1** | **1** | — |
| **`shopify-payment-button`** | **0** | **0** | — |
| **`dynamic-checkout`** | **0** | **0** | — |

**SHOP-02 credited state proven live.** The customer used has `quiz_count = 3`; the credited branch
rendered with its date, and the uncredited label and login line are both **0** — the two branches are
mutually exclusive as designed, which a single presence check would not have shown.

**D-01 proven** — both express-checkout needles are 0 on both SLIT PDPs. **D-04 proven** — the consult
PDP carries none of the block's markers.

### A vacuous measurement was caught and discarded

The first UAT attempt returned all-zeros for all three products **and three byte-identical responses
of 11,565 B**. That was the storefront password page: the session's `storefront_digest` cookie had
expired and every fetch redirected to `/password`. Reported here because those zeros would have read
as "consult correctly absent, express checkout correctly gone" — a clean pass built on measuring the
wrong document. Three identical byte counts for three different products is the tell. Andrew entered
the store password and the measurement was re-run; the numbers above have three distinct byte counts.

### Live DOM gate behavior (D-01), exercised on the deployed page

Driven through the real change listeners on `/products/tennessee-alledrops`:

| stage | ATC `disabled` | `data-prereq-disabled` | helper visible | testing box |
|---|---|---|---|---|
| initial | **true** | `1` | yes | unchecked |
| testing checked | **false** | removed | no | checked |
| unchecked again | **true** | `1` | yes | unchecked |

Quiz row throughout: `checked = true`, `disabled = true` — the credited lock. Scope resolution found
1 block root, 2 checkboxes, 1 submit button. **The gate engages, releases and re-engages**, and the
ownership marker is applied and cleared correctly, so the script is only ever touching a button it
owns.

### Checkout surfaces

Both render the exact copy shipped in `06-04`'s `ReviewNotice.jsx` — "What happens next", the 2–3
business day sentence, and the testing follow-up. Verified visually in the checkout editor preview on
both the Thank you and Order status pages. No score, bracket, or clinical field appears.

## ⚠️ Two verifications owed — recorded as owed, not passed

1. **The logged-out / uncredited state has not been measured on served bytes.** Doing so requires a
   storefront session that carries the store password but *no* customer login, and the only browser
   available is Andrew's, logged in as a customer with `quiz_count = 3`. Logging him out to measure
   was not a call to make unilaterally. **Partial evidence exists and is real but weaker:** the theme
   editor preview is not customer-authenticated, and it rendered the uncredited branch correctly —
   "I completed the AlleDrops symptom assessment", "Already completed your assessment? **Log in** to
   see it here.", both boxes interactive, Add to cart greyed out. That is genuine rendering evidence,
   but it is not served bytes on the storefront. **To close: open a private window, enter the store
   password, do not log in, and re-run the same needle counts** — expect `uncredited_label` 1,
   `login_line` 1, `credited_label` 0.

2. **No real order was placed.** Shopify Checkout reports *"This store can't accept payments right
   now"*, so the thank-you and order-status surfaces could only be verified in the checkout editor
   preview — which the plan explicitly permits ("or checkout editor preview"). A real end-to-end order
   remains unproven and should ride along with the first live transaction after payments are enabled.

## Deviation — the Analytics reconfirmation was superseded, not skipped

Task 2 step 7 and threat **T-6-22** both require reconfirming "Filter or group data in Analytics" is
**OFF** on both metafield definitions. It is **ON**, on both. This was surfaced to Andrew during
`06-02` Task 3 with the spike's original reasoning, and his decision was to leave it ON. Recorded in
`06-02-SUMMARY.md` Task 3 Deviation and struck through at source in `06-SPIKE-SHOP-01.md`.

So this check is **superseded by an owner decision**, not failed by oversight and not quietly skipped.
Nothing was changed in Shopify during this plan.

## Findings outside the plan's scope

1. **The live SLIT product pages still say allergy testing is unnecessary.** The `Rich text` section
   on `regional-drops` — visible in the editor directly beneath the gate this phase just shipped —
   reads: *"With the advent of regional allergy drops, there is no longer a need for needles or
   allergy tests to receive allergy treatment."* The page now asks the patient to confirm testing is
   on file, immediately under a paragraph telling them testing is not needed.

   This is Phase 4's D-13 clause, and its replacement copy is already drafted and waiting on
   William/counsel in `04-STOREFRONT-COPY-DRAFT.md`. **Phase 4 reassigned it to Phase 8 / TEST-06 on
   the measured belief that it renders from `product.description` and therefore no theme change could
   reach it. That premise is wrong** — it is a theme-editor Rich text block, editable in the editor,
   no theme push required. Not touched here: clinical copy is William's. But the reassignment rested
   on a false constraint and should be revisited.

2. **`HardcodedRoutes` warning at deploy.** Theme check flagged
   `purchase-prerequisites.liquid:91` — `href="/account/login?return_to=..."` — recommending
   `{{ routes.account_login_url }}`, which is locale/market-aware where the literal path is not. Works
   on this single-locale store. Not changed because that exact string is locked by `06-UI-SPEC.md` and
   asserted by the contract test; changing it means changing all three together.

3. **The Admin Themes list page is broken; the theme editor deep link is not.** `/themes` renders an
   empty content area with no Themes item in the Online Store nav — now **five** failed attempts
   across three sessions. `…/themes/135799767246/editor?previewPath=…` loads normally. Anything that
   needs the Themes UI should use the deep link or the CLI.

4. **Klaviyo has a checkout-editor block available** (`Klaviyo Opt-in at checkout`) on both the
   thank-you and order-status add-block menus. **Not placed** — observed only. Relevant to LAUNCH-01's
   scope: Klaviyo's storefront surface is wider than the one web pixel already recorded.

## Requirement status

| requirement | status | basis |
|---|---|---|
| SHOP-01 | **Complete** | Liquid metafield render proven on served bytes in `06-02` Task 3, and again live here via the credited branch |
| SHOP-02 | **Complete** | Credited state live on both SLIT PDPs with the completion date |
| SHOP-03 | **Complete** | Both confirmations present; ATC gate engages/releases live; express checkout removed |
| SHOP-04 | **Complete** | Notice placed and rendering on both thank-you and order-status |

Marked complete on live-surface evidence, **not** on source contracts. The two owed verifications
above do not block these four — they cover the logged-out variant and a real transaction, neither of
which any of the four requirements is worded against.

**Andrew's approval is still the gate for phase closure.** Per the plan, requirements are not to be
flipped in `REQUIREMENTS.md` from this plan without his approval; the evidence is recorded here first.

## Task Commits

- Task 1 + Task 2: this SUMMARY. No code artifacts — deploy and editor placement leave no repo trace,
  which is exactly why the checklist and the served-bytes evidence above are the deliverable.
