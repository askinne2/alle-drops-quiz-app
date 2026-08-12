---
phase: 06-purchase-prerequisites
plan: 02
subsystem: shopify-admin-gates
tags: [d-04, wave-0, liquid-render, admin-inventory, shop-01, shop-05]
requires:
  - phase: 06-purchase-prerequisites
    provides: SHOP-01 metafield definitions (Storefront API ON, Analytics filter OFF)
provides:
  - "D-04 templateSuffix table (TN/TX/consult)"
  - "SHOP-05 Basic/Grow admin surface map"
  - "SHOP-01 Liquid quiz_count served-bytes measurement"
affects: [06-03, 06-05, 06-06]
tech-stack:
  added: []
  patterns: ["Wave 0 human Admin gates recorded before placement/copy"]
key-files:
  created:
    - .planning/phases/06-purchase-prerequisites/06-02-SUMMARY.md
  modified: []
key-decisions: []
patterns-established: []
requirements-completed: [] # SHOP-01, SHOP-05 — mark complete only after all three tasks
duration: pending
completed: pending
status: awaiting-task-1-human-action
---

# Phase 6 Plan 02: Wave 0 Human Gates Summary

**IN PROGRESS — awaiting Andrew's Shopify Admin / logged-in storefront measurements. Do not invent values.**

## Performance

- **Duration:** pending
- **Started:** 2026-08-12T11:59:19Z
- **Completed:** pending
- **Tasks:** 0/3
- **Files modified:** 1 (this SUMMARY skeleton)

## Task 1: D-04 product → templateSuffix (BLOCKING)

Record Theme template / `templateSuffix` from Shopify Admin (or Admin GraphQL `product { handle templateSuffix }`) for each handle below.

**Required outcome (D-04):**
- Both SLIT SKUs (`tennessee-alledrops`, `texas-alledrops`) → `regional-drops` (maps to `product.regional-drops.json`)
- Consult product → must **NOT** be `regional-drops` (historically `allergy-consultation` — confirm live handle)
- If either SLIT is on `product.json` / other suffix → **STOP** (do not invent placement)
- If consult is on `regional-drops` → **STOP** (gating it would be a clinical-access regression)
- Never run `shopify theme push` (D-03)

| handle | templateSuffix | gate_eligible |
|--------|----------------|---------------|
| tennessee-alledrops | _awaiting Admin_ | _yes only if regional-drops_ |
| texas-alledrops | _awaiting Admin_ | _yes only if regional-drops_ |
| _consult handle (confirm live)_ | _awaiting Admin_ | no |

**STOP findings (if any):** _none yet — fill or leave blank_

**D-03 confirmation:** No `shopify theme push` was used for this verification. _Andrew: confirm yes_

## Task 2: SHOP-05 Basic/Grow admin paste surfaces (NOT STARTED)

Inventory only — do not draft final copy. Mark Plus-only checkout-step targets out of scope (D-09 / D-11).

| surface_path | editable_on_basic_grow | draft_target_for_06-05 | notes |
|--------------|------------------------|------------------------|-------|
| Settings → Notifications → Order confirmation | _awaiting_ | _awaiting_ | Body editable? |
| Settings → Policies → Refund policy | _awaiting_ | no | SPEC-only ownership (William / D-11) |
| Online Store → Themes → Edit default theme content (checkout-related strings) | _awaiting_ | _awaiting_ | Any string that can carry prerequisites sentence? |
| Checkout information / shipping / payment UI extension targets | no | no | Plus-only — out of scope for paste drafts |

## Task 3: SHOP-01 Liquid metafield render on served bytes (NOT STARTED)

Measure `customer.metafields.alledrops.quiz_count` on **authenticated, cache-busted served HTML** for a known customer who already has values. Count with `split(needle).length - 1`, never `grep -c`. Prefer `claude-in-chrome` (chrome-devtools MCP has no Shopify session).

| field | value |
|-------|-------|
| customer used (opaque id / redacted) | _awaiting_ |
| URL fetched | _awaiting_ |
| needles counted | _awaiting_ |
| measured integer presence (yes/no) | _awaiting_ |
| last_completed_at also checked? | _awaiting_ |
| Analytics Filter or group data still OFF on both definitions? | _awaiting_ |
| Temporary Custom Liquid probe removed? | _awaiting_ |

**Do not paste PHI** (answers, score, bracket, DOB) into this SUMMARY.

## Accomplishments

- SUMMARY skeleton scaffolded with required table headers for Tasks 1–3.

## Task Commits

_None yet — Task 1 blocked on human Admin read._

## Deviations from Plan

None - stopped at first checkpoint as instructed.

## Known Stubs

- All measurement cells above are intentionally empty pending Andrew's Admin / storefront session.
