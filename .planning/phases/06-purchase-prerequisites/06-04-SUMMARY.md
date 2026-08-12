---
phase: 06-purchase-prerequisites
plan: 04
subsystem: ui
tags: [checkout-ui-extension, d-09, d-10, thank-you, order-status, shop-04, vitest]

requires:
  - phase: 06-purchase-prerequisites
    provides: "D-09 dual targets + D-10 static review/testing copy (CONTEXT/UI-SPEC)"
provides:
  - "order-review-notice checkout UI extension with thank-you + order-status targets"
  - "Static ReviewNotice UI-SPEC copy with no network/PHI fetch"
  - "Vitest contract guarding D-09 targets and D-10 needles"
affects:
  - 06-purchase-prerequisites
  - SHOP-04 checkout editor placement (06-06)

tech-stack:
  added:
    - "@shopify/ui-extensions (checkout UI, Preact) under extensions/order-review-notice"
  patterns:
    - "Dual [[extensions.targeting]] with separate ThankYou.jsx / OrderStatus.jsx modules sharing ReviewNotice"
    - "Static commerce-surface extension: omit network_access/api_access; contract bans fetch and clinical field names"

key-files:
  created:
    - extensions/order-review-notice/shopify.extension.toml
    - extensions/order-review-notice/package.json
    - extensions/order-review-notice/src/ReviewNotice.jsx
    - extensions/order-review-notice/src/ThankYou.jsx
    - extensions/order-review-notice/src/OrderStatus.jsx
    - tests/order-review-notice-extension-contract.test.ts
  modified:
    - extensions/order-review-notice/shopify.d.ts
    - extensions/order-review-notice/tsconfig.json
    - extensions/order-review-notice/locales/en.default.json
    - extensions/order-review-notice/locales/fr.json

key-decisions:
  - "Scaffolded via shopify app generate extension --template checkout_ui, then retargeted to D-09 modules and api_version 2026-01"
  - "No [extensions.capabilities] block — quiz-history needs network/api; this extension must not copy that"
  - "ReviewNotice uses s-banner tone=info with contiguous UI-SPEC needles so source contracts match"

patterns-established:
  - "Checkout UI dual-page: thin Preact entries + shared static component; CI reads TOML+src"
  - "Non-vacuity for extension contracts: strip TOML/src, observe RED, restore, observe GREEN"

requirements-completed: [SHOP-04]

duration: 3min
completed: 2026-08-12
---

# Phase 6 Plan 04: Order Review Notice Extension Summary

**Dual-target checkout UI extension with static clinical-review notice (2–3 business days + testing follow-up) and a green SHOP-04 source contract — no network_access or PHI fetch.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-12T11:54:50Z
- **Completed:** 2026-08-12T11:58:02Z
- **Tasks:** 3/3
- **Files modified:** 10

## Accomplishments

- Scaffolded `extensions/order-review-notice` via Shopify CLI `checkout_ui` template, then locked D-09 dual targets and `api_version = "2026-01"`
- Implemented shared static `ReviewNotice` (UI-SPEC title + review + testing follow-up) rendered from thin ThankYou / OrderStatus Preact entries
- Added Vitest contract enforcing both targets, D-10 copy needles, and bans on `fetch(` / clinical field names — proven non-vacuous (5 failed stripped / 9 green restored)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold order-review-notice with dual targeting TOML** - `355f808` (feat)
2. **Task 2: Shared ReviewNotice plus thin thank-you and order-status entries** - `a938a0a` (feat)
3. **Task 3: Green order-review-notice extension contract** - `dabe0e8` (test)

**Plan metadata:** _(see final docs commit on this plan)_

## Self-Check: PASSED

- Files: TOML, ReviewNotice/ThankYou/OrderStatus, contract test, SUMMARY — all present
- Commits: `355f808`, `a938a0a`, `dabe0e8` — all on `thread-phase-6-purchase-prerequisites`

## Files Created/Modified

- `extensions/order-review-notice/shopify.extension.toml` — `ui_extension`, dual D-09 targets, no network_access
- `extensions/order-review-notice/package.json` — Preact + `@shopify/ui-extensions` (quiz-history dependency style)
- `extensions/order-review-notice/src/ReviewNotice.jsx` — static info banner + UI-SPEC copy
- `extensions/order-review-notice/src/ThankYou.jsx` — `purchase.thank-you.block.render` entry
- `extensions/order-review-notice/src/OrderStatus.jsx` — `customer-account.order-status.block.render` entry
- `extensions/order-review-notice/shopify.d.ts` — Api types for both targets
- `extensions/order-review-notice/tsconfig.json` / `locales/*` — CLI scaffold retained
- `tests/order-review-notice-extension-contract.test.ts` — SHOP-04 CI guard

## Decisions Made

- Used `shopify app generate extension --template checkout_ui --name order-review-notice` then edited TOML (not hand-rolled from memory) — aligns with RESEARCH Pattern 4 / pitfall guidance
- Omitted `[extensions.capabilities]` entirely rather than leaving `api_access = true` from the starter
- Kept `order confirmation email` on one source line so the D-10 substring contract is contiguous
- No Fly deploy and no checkout editor placement in this plan (06-06)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Contiguous D-10 needle for order confirmation email**
- **Found during:** Task 2 (src verify)
- **Issue:** Line-wrapped JSX broke `includes('order confirmation email')` while the copy was present
- **Fix:** Kept that phrase on a single line in `ReviewNotice.jsx`
- **Files modified:** `extensions/order-review-notice/src/ReviewNotice.jsx`
- **Verification:** Task 2 automated node verify + Task 3 vitest green
- **Committed in:** `a938a0a` (Task 2)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for contract correctness; no scope creep.

## Issues Encountered

- CLI `--flavor preact` rejected by flag enum; `--flavor vanilla-js` rejected by checkout_ui template. Succeeded with `shopify app generate extension --template checkout_ui --name order-review-notice` (no flavor flag).
- Generated starter targeted `purchase.checkout.block.render` with `api_access = true` and a metafields demo — stripped per D-10 / T-6-13 before Task 1 commit.

## User Setup Required

None for code. Checkout editor placement of both modules is plan **06-06** (human/editor), not this plan.

## Next Phase Readiness

- SHOP-04 source is buildable for Basic/Grow and safe for 06-06 placement
- Downstream: 06-05 (SHOP-05/06 copy packages) and 06-06 (deploy + editor + UAT)

---
*Phase: 06-purchase-prerequisites*
*Completed: 2026-08-12*
