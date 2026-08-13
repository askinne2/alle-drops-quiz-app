---
phase: 06-purchase-prerequisites
plan: 05
subsystem: non-code-packages
tags: [d-11, copy-draft, fulfillment-process, william, shop-05, shop-06]
requires:
  - phase: 06-purchase-prerequisites
    provides: 06-02 Task 2 measured SHOP-05 surface inventory
provides:
  - "SHOP-05 paste-ready order confirmation copy + refund-policy SPEC"
  - "SHOP-06 fulfillment verification checklist draft"
affects: [06-06]
tech-stack:
  added: []
  patterns: ["Non-code deliverables drafted only against measured surfaces"]
key-files:
  created:
    - .planning/phases/06-purchase-prerequisites/06-SHOP-05-COPY-DRAFT.md
    - .planning/phases/06-purchase-prerequisites/06-SHOP-06-FULFILLMENT-PROCESS.md
  modified: []
key-decisions:
  - "Surface 2 (theme default content) deliberately NOT drafted — destination unmeasured"
  - "Shipping policy SPEC added beyond plan scope, flagged as William's call"
patterns-established: []
requirements-completed: [] # SHOP-05 and SHOP-06 stay Pending — see Requirement status below
duration: ~25min
completed: 2026-08-13
status: complete
---

# Phase 6 Plan 05: SHOP-05 / SHOP-06 Non-Code Packages Summary

**COMPLETE — 2/2 tasks.** Both deliverables exist, both automated verifies pass, zero code changed.

**Neither requirement is marked complete, deliberately.** See "Requirement status" below — this plan
produces the artifacts; live Shopify content and AOD adoption are what actually close SHOP-05 and
SHOP-06, and neither has happened.

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-13
- **Tasks:** 2/2
- **Files created:** 2 (both markdown, both under the phase directory)
- **Code changed:** none

## Gates

| gate | result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **775 passed / 52 files** — unchanged from pre-plan baseline, as expected for a docs-only plan |
| Task 1 automated verify | `shop05-ok` |
| Task 2 automated verify | `shop06-ok` |
| `must_haves` artifact `contains` | `will not ship` ×2 in SHOP-05; `fulfillment` ×4 in SHOP-06 |
| `must_haves` key_links | `Order confirmation\|Refund` present in SHOP-05; `verify\|on file` present in SHOP-06 |

## Task 1: SHOP-05 copy draft + refund SPEC

`06-SHOP-05-COPY-DRAFT.md`. Four surfaces, only **one** of them drafted for:

| surface | outcome |
|---|---|
| Order confirmation notification | **PASTE-READY** — the one confirmed-editable target in `06-02` Task 2 |
| Checkout / theme default content | **NOT DRAFTED** — destination unmeasured, see below |
| Checkout step UI extension | Not applicable (Plus-only per D-09/D-11, with the dev-store caveat carried) |
| Thank-you / order-status | Already code, shipped in `06-04` — explicit "do not paste here" note |
| Refund policy | **SPEC bullets only** (D-11), 5 must-includes, William + counsel own it |
| Shipping policy | **SPEC bullets only** — added beyond plan scope, flagged |

## Task 2: SHOP-06 fulfillment process

`06-SHOP-06-FULFILLMENT-PROCESS.md`. Four-step pre-ship checklist (assessment exists → testing files
attached → clinical review done → only then fulfil), a hold-don't-ship path when a prerequisite is
missing, a minimum-necessary section bounding what fulfillment staff should read, six explicit
non-goals, and an adoption checklist with six open items owned by William/AOD.

## Deviations from Plan

1. **Surface 2 was not drafted.** The plan's Task 1 says to draft for "every SUMMARY row with
   `draft_target_for_06-05 = yes`". The theme-default-content row is neither yes nor no — `06-02`
   Task 2 recorded it **not measured**, because the Admin Themes page rendered blank. Drafting
   paste-ready text for a field nobody has confirmed exists is the same failure the SHOP-01 spike
   made (treating a definition as proof of behavior), so the file documents the gap, supplies a
   character-limited candidate marked *not approved for paste*, and names the CLI route
   (`shopify theme pull --only locales/*`) to unblock it. **As of `06-02` Task 3 the Admin Themes
   failure has reproduced four times across two sessions** — it is a persistent defect, so this is
   unlikely to resolve by retrying.

2. **A shipping-policy SPEC was added, which the plan did not ask for.** `06-02` Task 2 found the
   shipping policy is also unset, and "we will not ship until X is on file" is shipping-policy
   substance at least as much as refund-policy substance. Written as SPEC bullets and explicitly
   flagged as William's call, not adopted into Phase 6 scope.

3. **Banned-language list is paraphrased, not quoted.** The Task 1 verify counts literal occurrences
   of the prohibited phrases, so a Banned Language section quoting them would fail its own guard.
   Same trap and same resolution as Phase 4's `04-03` UNCONFIRMED comment. The paraphrases are precise
   enough to act on.

## ⚠️ Cross-plan finding — SHOP-04 currently points at support details that may not exist

`06-04` shipped `ReviewNotice.jsx`, whose second paragraph reads *"Need help? Contact the clinic using
the support details on your order confirmation email."*

`06-02-SUMMARY.md` Task 2 measured `Settings → Policies → Contact information` as **Required and
unset**, and the notification sender as **`andrew@21adsmedia.com`** — the agency address, not AOD's.

So the already-shipped SHOP-04 notice directs patients to support details that the order confirmation
email does not reliably carry, and a reply reaches the agency. **SHOP-05's order confirmation paste is
what closes this**, which makes it a dependency of SHOP-04 rather than an independent deliverable.
Recorded in the copy draft itself so whoever pastes it understands why the contact sentence matters.

The phone number in the draft is a deliberate `[AOD PHONE — William to supply]` placeholder. Inventing
a contact destination is forbidden by T-6-17 and the `06-UI-SPEC.md` SHOP-04 row.

## Requirement status — why neither is closed

| requirement | text | status | why |
|---|---|---|---|
| SHOP-05 | "Checkout page language, order confirmation notifications, and the refund policy page **all state** that products will not ship without a completed quiz and testing on file" | **Pending** | The requirement is about live Shopify content. Nothing has been pasted. The refund policy does not exist at all. This plan produced the text; William pasting it is what closes it. |
| SHOP-06 | "A written fulfillment verification step **exists and is owned by AOD** before the first patient shipment" | **Pending** | The written step now exists, but "owned by AOD" requires adoption. Six adoption items are open in the draft's own checklist. |

Marking either complete on the strength of a draft would be the same error as treating a metafield
definition as proof of Liquid render. The artifacts exist; the requirements do not close until a human
acts on them.

## Known Stubs

- `[AOD PHONE — William to supply]` in the order confirmation draft — intentional, must not be
  invented.
- Hold-window length in SHOP-06 §3 step 3 — AOD decides.
- Surface 2 (theme default content) undrafted pending a CLI-based string inventory.
- Both the refund policy and the shipping policy have to be written from nothing before SHOP-06 §3
  step 4 can be run consistently.

## Task Commits

- Tasks 1 and 2: single commit — both files are one deliverable package with no build step between them
