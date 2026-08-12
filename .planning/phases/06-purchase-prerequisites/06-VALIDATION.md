---
phase: 6
slug: purchase-prerequisites
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-12
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `06-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (`environment: "node"`, includes `tests/**/*.test.ts`) |
| **Quick run command** | `npx vitest run tests/sense-atc-selector-contract.test.ts tests/purchase-prerequisites-block-contract.test.ts` |
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
| 06-W0-01 | TBD | 0 | SHOP-03 / D-02 | T-6-selector | Vendored Sense ATC needles stay matched; fail loud on drift | unit | `npx vitest run tests/sense-atc-selector-contract.test.ts` | ❌ W0 | ⬜ pending |
| 06-W0-02 | TBD | 0 | SHOP-02 / SHOP-03 | T-6-phi-surface | Block Liquid uses metafield `.value` path; no PHI fields; selector + fail-open marker present | contract | `npx vitest run tests/purchase-prerequisites-block-contract.test.ts` | ❌ W0 | ⬜ pending |
| 06-W0-03 | TBD | 0 | SHOP-04 | T-6-phi-fetch | Both checkout targets present; no `fetch(` to Fly; no score/bracket/PHI | contract | `npx vitest run tests/order-review-notice-extension-contract.test.ts` | ❌ W0 | ⬜ pending |
| 06-SHOP-01 | TBD | 0–1 | SHOP-01 | — | Liquid renders `quiz_count` for logged-in customer on served bytes | manual + served-bytes | Browser as known customer; occurrence / visible integer on HTML | ❌ W0 | ⬜ pending |
| 06-SHOP-02 | TBD | 1+ | SHOP-02 | T-6-login | Credited state when `quiz_count >= 1`; login line otherwise | contract + manual | Block contract + human PDP | ❌ W0 | ⬜ pending |
| 06-SHOP-03a | TBD | 1+ | SHOP-03 | T-6-honor | Both checkboxes required before ATC enables; fail-open if selector missing | contract + manual | Selector fixture + human PDP | ❌ W0 | ⬜ pending |
| 06-SHOP-03b | TBD | 1+ | SHOP-03 | T-6-express | `show_dynamic_checkout` off on SLIT template (editor only) | manual served-bytes | Authenticated fetch: no Shop Pay / `payment_button` on TN/TX PDPs | ❌ W0 | ⬜ pending |
| 06-SHOP-04 | TBD | 2+ | SHOP-04 | T-6-phi-fetch | Extension visible on thank-you + order-status; static notice only | contract + manual | TOML/src assertions + checkout editor / test order | ❌ W0 | ⬜ pending |
| 06-SHOP-05 | TBD | n | SHOP-05 | T-6-approval-copy | Copy draft + refund SPEC exist; no approval-promise language | artifact | File presence + copy checklist | ❌ W0 | ⬜ pending |
| 06-SHOP-06 | TBD | n | SHOP-06 | — | Fulfillment process draft exists (William/AOD owned) | artifact | File presence | ❌ W0 | ⬜ pending |
| 06-D04 | TBD | 0 | D-04 | T-6-consult | TN/TX on `regional-drops`; consult product not gated | manual admin | Record `templateSuffix` in SUMMARY | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are placeholders until the planner assigns plan numbers. Planner must rewrite this map with concrete `{plan}-T{n}` IDs.*

---

## Wave 0 Requirements

- [ ] `tests/fixtures/sense-buy-buttons-excerpt.liquid` — vendored Sense ATC/express needles for D-02
- [ ] `tests/sense-atc-selector-contract.test.ts` — D-02 compensating control
- [ ] `tests/purchase-prerequisites-block-contract.test.ts` — metafield Liquid needles, selector string, fail-open marker, schema JSON validity
- [ ] `tests/order-review-notice-extension-contract.test.ts` — both targets present; no network PHI fetch
- [ ] D-04 Admin `templateSuffix` verification (human) before placement tasks
- [ ] SHOP-01→SHOP-02 Liquid render measurement protocol (logged-in customer + served bytes)
- [ ] SHOP-05 admin surface inventory (human, ~15 min)

*Existing Vitest infrastructure covers the framework; Wave 0 is new contract tests + fixtures, not framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Liquid metafield render for logged-in customer | SHOP-01 / SHOP-02 | Needs real customer session + storefront HTML | Log in as a customer with `quiz_count >= 1`; fetch PDP HTML; assert visible credit / metafield value on served bytes |
| Express checkout off on SLIT PDPs | SHOP-03 | Theme-editor setting, not repo | Authenticated fetch of TN/TX PDPs; assert no Shop Pay / payment_button output |
| Product → template assignment | D-04 | Admin `templateSuffix`, not in theme JSON alone | Confirm both SLIT SKUs use `product.regional-drops`; consult does not |
| Checkout UI extension placement | SHOP-04 | Checkout editor + real order | Place modules on thank-you + order-status; complete a test order; confirm notice |
| Theme editor block placement | D-03 | Must never `shopify theme push` | Place gate block above buy_buttons via theme editor only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills task map

**Approval:** pending
