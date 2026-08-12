---
phase: 6
slug: purchase-prerequisites
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-12
updated: 2026-08-12
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `06-RESEARCH.md` § Validation Architecture.
> Task map filled by planner 2026-08-12 (`06-01`…`06-06` PLAN.md).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (`environment: "node"`, includes `tests/**/*.test.ts`) |
| **Quick run command** | `npx vitest run tests/sense-atc-selector-contract.test.ts tests/purchase-prerequisites-block-contract.test.ts tests/order-review-notice-extension-contract.test.ts` |
| **Full suite command** | `npm test` (expect ~734+ after new files) |
| **Estimated runtime** | ~30–60 seconds (full suite); ~5s quick |

---

## Sampling Rate

- **After every task commit:** Run targeted contract test(s) for files touched; `npm test` if shared helpers change
- **After every plan wave:** Run `npm test` + `npm run typecheck` if TS under `app/` changed
- **Before `/gsd:verify-work`:** Full suite green; Liquid metafield served-bytes proof; human PDP + thank-you/order-status pass; SHOP-05/06 artifacts present; **no** `shopify theme push` in the phase log
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-T1 | 06-01 | 1 | SHOP-03 / D-02 | T-6-01 | Vendored Sense ATC + express needles | unit prep | node split-count on fixture | ❌ until exec | ⬜ pending |
| 06-01-T2 | 06-01 | 1 | SHOP-03 / D-02 | T-6-01 | CI fails on selector drift | unit | `npx vitest run tests/sense-atc-selector-contract.test.ts` | ❌ until exec | ⬜ pending |
| 06-02-T1 | 06-02 | 1 | D-04 | T-6-04 | TN/TX regional-drops; consult not | manual admin | SUMMARY templateSuffix table | ❌ until exec | ⬜ pending |
| 06-02-T2 | 06-02 | 1 | SHOP-05 | T-6-16 | Admin paste surfaces inventoried | manual admin | SUMMARY surface map | ❌ until exec | ⬜ pending |
| 06-02-T3 | 06-02 | 1 | SHOP-01 | T-6-07 | Liquid renders quiz_count on served bytes | manual + served-bytes | SUMMARY split counts | ❌ until exec | ⬜ pending |
| 06-03-T1 | 06-03 | 2 | SHOP-02 / SHOP-03 | T-6-08 | Liquid metafield credit + D-06/D-08 copy; no PHI fetch | contract prep | node needle check on liquid | ❌ until exec | ⬜ pending |
| 06-03-T2 | 06-03 | 2 | SHOP-03 / D-01 / D-02 | T-6-10 / T-6-12 | Scoped disable + fail-open warn | contract prep | node needle check on js/css | ❌ until exec | ⬜ pending |
| 06-03-T3 | 06-03 | 2 | SHOP-02 / SHOP-03 | T-6-08 / T-6-11 | Block source contract green | contract | `npx vitest run tests/purchase-prerequisites-block-contract.test.ts tests/sense-atc-selector-contract.test.ts` | ❌ until exec | ⬜ pending |
| 06-04-T1 | 06-04 | 1 | SHOP-04 / D-09 | T-6-13 | Dual targets; no network_access | contract prep | node TOML needle check | ❌ until exec | ⬜ pending |
| 06-04-T2 | 06-04 | 1 | SHOP-04 / D-10 | T-6-13 / T-6-14 | Static ReviewNotice; no fetch/PHI fields | contract prep | node src needle check | ❌ until exec | ⬜ pending |
| 06-04-T3 | 06-04 | 1 | SHOP-04 | T-6-13 | Extension contract green | contract | `npx vitest run tests/order-review-notice-extension-contract.test.ts` | ❌ until exec | ⬜ pending |
| 06-05-T1 | 06-05 | 2 | SHOP-05 / D-11 | T-6-16 / T-6-17 | Copy draft + refund SPEC; no approval-promise | artifact | node string check on `06-SHOP-05-COPY-DRAFT.md` | ❌ until exec | ⬜ pending |
| 06-05-T2 | 06-05 | 2 | SHOP-06 | T-6-18 | Fulfillment checklist draft for William/AOD | artifact | node string check on `06-SHOP-06-FULFILLMENT-PROCESS.md` | ❌ until exec | ⬜ pending |
| 06-06-T1 | 06-06 | 3 | SHOP-02 / SHOP-03 / SHOP-04 / D-01 / D-03 | T-6-19 / T-6-20 | Deploy + editor placement; never theme push | manual | SUMMARY deploy/editor checklist | ❌ until exec | ⬜ pending |
| 06-06-T2 | 06-06 | 3 | SHOP-01 / SHOP-02 / SHOP-03 / SHOP-04 | T-6-21 / T-6-22 | Live PDP + thank-you/order-status UAT | manual + served-bytes | SUMMARY UAT evidence table | ❌ until exec | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fixtures/sense-buy-buttons-excerpt.liquid` — **06-01-T1**
- [ ] `tests/sense-atc-selector-contract.test.ts` — **06-01-T2**
- [ ] `tests/purchase-prerequisites-block-contract.test.ts` — **06-03-T3** (implemented with block, not empty Wave 0 stub)
- [ ] `tests/order-review-notice-extension-contract.test.ts` — **06-04-T3**
- [ ] D-04 Admin `templateSuffix` verification — **06-02-T1**
- [ ] SHOP-01→SHOP-02 Liquid render measurement — **06-02-T3** (reconfirmed on real block in **06-06-T2**)
- [ ] SHOP-05 admin surface inventory — **06-02-T2**

*Existing Vitest infrastructure covers the framework; Wave 0 is new contract tests + fixtures + human gates, not framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Plan task |
|----------|-------------|------------|-------------------|-----------|
| Liquid metafield render for logged-in customer | SHOP-01 / SHOP-02 | Needs real customer session + storefront HTML | Log in as a customer with `quiz_count >= 1`; fetch PDP HTML; assert visible credit / metafield value on served bytes | 06-02-T3, 06-06-T2 |
| Express checkout off on SLIT PDPs | SHOP-03 | Theme-editor setting, not repo | Authenticated fetch of TN/TX PDPs; assert no Shop Pay / payment_button output | 06-06-T2 |
| Product → template assignment | D-04 | Admin `templateSuffix`, not in theme JSON alone | Confirm both SLIT SKUs use `product.regional-drops`; consult does not | 06-02-T1 |
| Checkout UI extension placement | SHOP-04 | Checkout editor + real order | Place modules on thank-you + order-status; complete a test order; confirm notice | 06-06-T1/T2 |
| Theme editor block placement | D-03 | Must never `shopify theme push` | Place gate block above buy_buttons via theme editor only | 06-06-T1 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 / human dependencies documented
- [x] Sampling continuity: no 3 consecutive tasks without automated verify in autonomous plans
- [x] Wave 0 covers all MISSING references via concrete plan task IDs
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set after planner filled task map

**Approval:** pending execution
