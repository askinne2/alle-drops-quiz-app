---
phase: 06-purchase-prerequisites
plan: 01
subsystem: testing
tags: [d-02, selector-contract, sense-fixture, wave-0, vitest]

requires:
  - phase: 06-purchase-prerequisites
    provides: "D-01/D-02 decisions — fail-open ATC gate needs CI compensating control"
provides:
  - "Vendored Sense buy-buttons ATC + express-checkout excerpt for CI"
  - "Vitest contract that fails when product-form__submit or payment_button drifts"
affects:
  - 06-purchase-prerequisites
  - SHOP-03 fail-open gate JS (later plans)

tech-stack:
  added: []
  patterns:
    - "CI-safe Sense theme fixture under tests/fixtures/ (no sibling theme path in CI)"
    - "D-02 compensating control: split-count needles, not soft regex"

key-files:
  created:
    - tests/fixtures/sense-buy-buttons-excerpt.liquid
    - tests/sense-atc-selector-contract.test.ts
  modified: []

key-decisions:
  - "Fixture is an ATC-region excerpt only (both product-form__submit buttons + show_dynamic_checkout/payment_button), not the full buy-buttons.liquid snippet"
  - "Contract reads only tests/fixtures/ — sibling theme hash check left as optional developer-machine note, not asserted"

patterns-established:
  - "Sense selector contracts: vendor excerpt + Vitest readFileSync + occurrence counts via split(needle).length-1"
  - "Non-vacuity: temporarily empty the fixture, observe RED, restore, observe GREEN before commit"

requirements-completed: []  # Plan frontmatter lists SHOP-03; only D-02 CI control shipped here — leave SHOP-03 Pending until gate block (06-03+)

duration: 1min
completed: 2026-08-12
---

# Phase 6 Plan 01: Sense ATC Selector Contract Summary

**D-02 compensating control is green in CI: vendored Sense `.product-form__submit` + `payment_button` needles with a Vitest contract that fails loudly on drift.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-08-12T11:52:42Z
- **Completed:** 2026-08-12T11:53:23Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Vendored Sense ATC/express excerpt into the quiz-app repo so CI does not need the sibling theme path
- Added mandatory D-02 selector contract (fail-open gate is only safe with this scream)
- Proven non-vacuous: 4/4 failed against a stripped fixture, 4/4 passed against the real excerpt

## Task Commits

Each task was committed atomically:

1. **Task 1: Vendor Sense buy-buttons excerpt for D-02** - `05062fa` (feat)
2. **Task 2: Green Vitest contract for Sense ATC selector needles** - `fd86a25` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `tests/fixtures/sense-buy-buttons-excerpt.liquid` — ATC-region excerpt from Sense `snippets/buy-buttons.liquid` (two `product-form__submit` buttons + `show_dynamic_checkout` / `payment_button`)
- `tests/sense-atc-selector-contract.test.ts` — D-02 compensating control; reads only the vendored fixture

## Decisions Made

- Excerpted only the product-form buttons region (available + sold-out submit buttons and the express conditional), not the full snippet — enough needles for T-6-01 without shipping pickup-availability / gift-card noise
- No assertion against `/Users/andrewskinner/Local Sites/allergist-on-demand` — CI-safe by construction; optional local hash check documented in a comment only
- **No `shopify theme push` was run** (D-03 / T-6-03). Theme files were read for sourcing the fixture only; nothing was pushed or modified in the theme repo

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration.

## Known Stubs

None - fixture and contract are fully wired; no placeholders.

## Threat Flags

None - no new network endpoints, auth paths, file-access patterns, or schema changes. Surface matches plan threat model (T-6-01 mitigate via this contract; T-6-03 honored by not theme-pushing).

## Next Phase Readiness

- Wave 0 D-02 control is in place for later SHOP-03 gate JS plans
- Next: `06-02-PLAN.md` (continue Phase 6 wave sequence)

## Self-Check: PASSED

- FOUND: `tests/fixtures/sense-buy-buttons-excerpt.liquid`
- FOUND: `tests/sense-atc-selector-contract.test.ts`
- FOUND: commit `05062fa`
- FOUND: commit `fd86a25`
- FOUND: `npx vitest run tests/sense-atc-selector-contract.test.ts` exit 0 (4 passed)

---
*Phase: 06-purchase-prerequisites*  
*Plan: 01*  
*Completed: 2026-08-12*
