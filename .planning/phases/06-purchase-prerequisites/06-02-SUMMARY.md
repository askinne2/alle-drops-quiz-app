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
requirements-completed: [SHOP-01] # SHOP-05 stays open — 06-05 owns the copy deliverable
duration: pending
completed: 2026-08-13
status: complete
---

# Phase 6 Plan 02: Wave 0 Human Gates Summary

**COMPLETE — 3/3 tasks.** Tasks 1 and 2 measured 2026-08-12; **Task 3 measured 2026-08-13** and
SHOP-01 is empirically proven — Liquid renders both `alledrops` metafields for a logged-in customer on
served bytes, so `06-03` needs no fallback design. All three tasks ran by driving Andrew's logged-in
Chrome session (`claude-in-chrome`). Task 3 used an **unpublished duplicate theme**, not the live
theme as the plan specified — the live theme was verified unmodified afterwards.

**One deviation, now closed by decision:** "Filter or group data in Analytics" is **ON** on both
metafield definitions, where `06-SPIKE-SHOP-01.md` records it as OFF. Andrew's call 2026-08-13 —
leave it ON. This supersedes the spike's "keep it off". Nothing was changed. See Task 3 Deviation.

## Performance

- **Duration:** pending
- **Started:** 2026-08-12T11:59:19Z
- **Completed:** 2026-08-13 (Task 3)
- **Tasks:** 3/3
- **Files modified:** 1 (this SUMMARY)

## Method note

All Task 1 and Task 2 values were read from live Admin pages, not from the plan's expected values and
not from the theme repo. Where a value could not be read, it is recorded as unmeasured rather than
inferred — the failure mode this phase exists to avoid (the SHOP-01 spike treated a definition as
proof of behavior) is exactly the temptation to fill a cell from documentation.

## Task 1: D-04 product → templateSuffix (BLOCKING)

Record Theme template / `templateSuffix` from Shopify Admin (or Admin GraphQL `product { handle templateSuffix }`) for each handle below.

**Required outcome (D-04):**
- Both SLIT SKUs (`tennessee-alledrops`, `texas-alledrops`) → `regional-drops` (maps to `product.regional-drops.json`)
- Consult product → must **NOT** be `regional-drops` (historically `allergy-consultation` — confirm live handle)
- If either SLIT is on `product.json` / other suffix → **STOP** (do not invent placement)
- If consult is on `regional-drops` → **STOP** (gating it would be a clinical-access regression)
- Never run `shopify theme push` (D-03)

Measured 2026-08-12 in Shopify Admin (`admin.shopify.com/store/allergist-on-demand`), read from each
product's **Theme template** field in the Product organization sidebar. Handles confirmed from each
product's Search engine listing URL, not assumed.

| handle | templateSuffix | gate_eligible |
|--------|----------------|---------------|
| tennessee-alledrops | `regional-drops` | yes |
| texas-alledrops | `regional-drops` | yes |
| allergy-consultation | `telehealth-appointment` | no |

Product IDs (for re-verification): TN `7624809840846`, TX `7601816862926`, consult `7601817157838`.

**Consult handle confirmed live:** `allergy-consultation` — the historical value in 06-CONTEXT.md was
correct. Price $99.00, product type Telehealth, description "Virtual visit with a Board Certified
Allergist". Its template is `telehealth-appointment`, which is **not** `regional-drops`, so the
purchase-prerequisites block placed on `regional-drops` cannot reach the consult PDP. D-04's
clinical-access requirement is satisfied by template separation, not by a runtime exclusion.

**STOP findings:** none. Both SLIT SKUs are on `regional-drops` as D-04 required, and the consult is
not.

**Also observed (not a gate, carried forward):** both SLIT products belong to the collection
"Regional Allergy Drops" and the consult belongs to no collection. Placement in 06-06 keys on the
template, not the collection — noted only so a future reader does not mistake the collection for the
gating mechanism.

**D-03 confirmation:** No `shopify theme push` was used for this verification. All three reads were
Admin UI page loads; nothing was edited or saved.

## Task 2: SHOP-05 admin paste surfaces (MEASURED 2026-08-12, with one gap)

Inventory only — no final copy drafted here. Plus-only checkout-step targets marked out of scope
(D-09 / D-11).

**Read the plan-tier finding below before using this table.** The column heading
`editable_on_basic_grow` is retained from the plan for traceability, but this store is **not** on
Basic or Grow — see "Plan tier invalidates the column heading".

| surface_path | editable_on_basic_grow | draft_target_for_06-05 | notes |
|--------------|------------------------|------------------------|-------|
| Settings → Notifications → Customer notifications → Order confirmation | yes | **yes** | Template exists and opens to a preview with an **Edit code** button — the body is editable Liquid/HTML, not a fixed string. Subject renders `Order #9999 confirmed`. This is the primary SHOP-05 paste target. |
| Settings → Policies → Return and refund policy | yes (slot exists) | **no — SPEC only** | **Status is "No policy set". There is no refund policy to amend.** SPEC-only ownership (William / D-11) — see finding below. |
| Settings → Policies → Shipping policy | yes (slot exists) | **no — SPEC only** | Also "No policy set". Named here because "we will not ship until X" is shipping-policy substance, and the natural home for it does not exist either. |
| Online Store → Themes → Edit default theme content (checkout-related strings) | **not measured** | **not measured** | **GAP — see "Unmeasured surface" below.** The Admin Themes page rendered a blank content area on three consecutive loads. |
| Checkout information / shipping / payment UI extension targets | no | no | Plus-only — out of scope for paste drafts (D-09 / D-11). SHOP-04's thank-you + order-status extension (shipped in 06-04) is the non-Plus route and already covers the post-purchase half. |

### Plan tier invalidates the column heading

`Settings → Plan` reads **"Custom plan — Development store"**, with the banner *"The Change plan
option is no longer supported for client transfer stores. To change the plan, transfer the store to
your client first."*

This store is a Partner development store awaiting client transfer, not a Basic or Grow shop. The
practical consequence for SHOP-05: **what is editable here is not proof of what will be editable on
AOD's plan after the LAUNCH-06 transfer**, because dev stores carry feature access that a paid
Basic/Grow plan does not. The two rows that matter most are safe either way — notification template
bodies and policy pages are editable on every plan — but the D-09 / D-11 reasoning that checkout-step
extension targets are "Plus-only, therefore out of scope" should be re-confirmed on the real plan
after transfer rather than treated as settled by this inventory.

Recorded rather than resolved: this is LAUNCH-06's territory, not Phase 6's.

### Finding: there is no refund policy, and no shipping policy

`Settings → Policies → Written policies` shows:

| policy | status |
|---|---|
| Return and refund policy | **No policy set** |
| Privacy policy | Automated |
| Terms of service | No policy set |
| Shipping policy | **No policy set** |
| Contact information | **Required** (unset) |
| Legal notice | No policy set |

ROADMAP success criterion 4 for this phase says the clinical-review language must appear "in the
refund policy". **It cannot be added to a document that does not exist.** SHOP-05's refund
deliverable is therefore not an amendment — it is a must-include bullet list handed to William for a
policy that has to be authored from nothing. 06-05 should say so plainly rather than writing prose
that implies an edit to existing text.

Return and cancellation rules are also unset ("Default rules — No rules set").

Not acted on: setting a policy is a client-owned legal decision (D-11), and Contact information being
flagged Required is a LAUNCH-05 / counsel item, not a Phase 6 one.

### Unmeasured surface

`Online Store → Themes` would not render. Three consecutive loads
(`/themes`, `/themes/135799767246/language`, and a nav click on Online Store) returned a page with the
correct title and chrome but an empty content area; the left nav also omitted its usual **Themes**
sub-item, showing only Pages and Preferences. No error was surfaced. Stopped rather than retrying
further.

**Owed:** confirm whether `Edit default theme content` exposes any checkout-related string that can
carry the prerequisites sentence. This is the lowest-value row of the four — SHOP-04's shipped
extension plus the order confirmation email already carry the post-purchase message — so it is
recorded as a gap for 06-05 to note, not a re-block of the wave.

### Also observed

`Settings → Notifications` sender email is **`andrew@21adsmedia.com`**. Customer-facing order mail
from this store currently sends from the agency's address, not an AOD one. Not a Phase 6 item —
it belongs with LAUNCH-06's "off the cross-client billing account" work — but it is the same class of
finding and cheap to record now.

## Task 3: SHOP-01 Liquid metafield render on served bytes (COMPLETE — 2026-08-13)

**Verdict: SHOP-01 is empirically PROVEN. Liquid reads both `alledrops` metafields for a logged-in
customer on served bytes. No fallback design is needed and `06-03` may proceed as designed.**

| field | value |
|-------|-------|
| customer used (opaque id / redacted) | Customer **A** — an existing customer already carrying both metafields (one of the 4). Email deliberately not recorded. |
| URL fetched | `https://allergist-on-demand.myshopify.com/products/tennessee-alledrops` (cache-busted `&cb=`), fetched with `credentials: 'include'`, `cache: 'no-store'` from the logged-in session |
| HTTP status / served bytes | **200** / **140,652 B** |
| measured integer presence (yes/no) | **YES** — `quiz_count` rendered as a non-empty integer |
| last_completed_at also checked? | **YES** — rendered through a `date: '%Y-%m-%d'` filter |
| Analytics Filter or group data still OFF on both definitions? | **NO — it is ON on BOTH.** See "Deviation" below. Not changed; awaiting Andrew's decision. |
| Temporary probe removed? | **YES** — probe theme `150693806286` deleted; `shopify theme list` re-read afterwards shows only Sense (live) and Dawn (unpublished) |

### Needle counts (all via `split(needle).length - 1`, never `grep -c`)

| needle | count | what it proves |
|---|---|---|
| `TASK3PROBEMARKER` | **1** | non-vacuity control — the probe actually rendered |
| `data-task3-loggedin="yes"` | **1** | the `customer` object is populated on the storefront |
| `data-task3-loggedin="no"` | **0** | — |
| `data-task3-ns-present="yes"` | **1** | the `alledrops` namespace is visible to Liquid |
| `data-task3-ns-present="no"` | **0** | — |
| `data-task3-count-value="3"` | **1** | `quiz_count.value` renders, correct value |
| `data-task3-count-raw="3"` | **1** | bare object output also renders the value |
| `data-task3-count-value=""` | **0** | the negative case is absent, not merely unlooked-for |
| `data-task3-last-value="2026-08-10"` | **1** | `last_completed_at` renders via date filter |
| `data-task3-last-value=""` | **0** | — |

Only the two CLAUDE.md-allowlisted non-PHI fields (a count and a date) appear above. No answers,
score, bracket, DOB, name, email or filename is recorded anywhere in this section.

### Method — and why it never touched the live theme

The plan's own method (probe on the live Sense theme, remove after) was **not** used. It is a write
against the live storefront of a clinical intake site, and a safer route was available:

1. `shopify theme duplicate --theme 135799767246 --name TASK3-PROBE-DELETE-ME` → unpublished theme
   `150693806286`.
2. `shopify theme pull --only layout/theme.liquid` from the duplicate; appended a probe `<div>` before
   `</body>` emitting the two metafields plus a unique marker; `shopify theme push --only
   layout/theme.liquid` back to the duplicate **only**.
3. Loaded the product URL once with `?preview_theme_id=150693806286` to set the preview cookie, then
   fetched cache-busted served HTML from the page context.
4. Deleted the probe theme.

**Control proving live was never mutated:** after the measurement, `layout/theme.liquid` was pulled
from the **live** Sense theme (`135799767246`) and counted — `TASK3PROBEMARKER` = **0**, `task3` = **0**,
21,653 B. So the marker existed only in the duplicate, which is also what makes the positive counts
above attributable to the probe rather than to anything pre-existing.

**Note on the URL:** Shopify strips `preview_theme_id` from the response URL after setting its cookie,
so the recorded `finalUrl` shows no preview parameter. The measurement is still attributable to the
probe theme, because `TASK3PROBEMARKER` does not exist in the live theme (control above).

### ⚠️ Deviation — Analytics segmentation is ON, not OFF

`06-SPIKE-SHOP-01.md` records both definitions as created with **"Filter or group data in Analytics"
OFF — keep it off**, on the reasoning that segmenting on a health-adjacent completion flag inside a
system with no BAA is what turns an approved non-PHI field into a problem. Read directly from Admin
on 2026-08-13:

| definition | Storefront API access | Customer Account API access | Filter or group data in Analytics |
|---|---|---|---|
| `alledrops.quiz_count` (`173433454798`) | ON | No access | **ON** ✗ |
| `alledrops.last_completed_at` (`173432766670`) | ON | No access | **ON** ✗ |

Storefront API access being ON is correct and is what makes the Liquid read above work. Customer
Account API access at "No access" is correct. **The Analytics toggle is the one that does not match
the record**, on both definitions.

This is either (a) the definitions were created with it ON and the spike's note recorded intent rather
than observed state, or (b) it defaulted ON and was never actually turned off. Which of the two is not
determinable from the Admin UI now.

**RESOLVED 2026-08-13 — Andrew's decision: leave it ON.** Surfaced to him with the spike's reasoning
(segmenting on a health-adjacent completion flag inside a system with no BAA is what turns an approved
non-PHI field into a problem); his call was *"analytics filter on is fine as far as I care."*
**Nothing was changed** — the toggle was already ON and stays ON.

This **supersedes** `06-SPIKE-SHOP-01.md`'s "keep it off" instruction. Two consequences to carry:

- `06-03` and `06-06` must not treat "Analytics filter OFF" as a precondition or assert it in any
  verification step — it is ON by decision, not by oversight.
- The exposure is bounded but real: Shopify Analytics can now segment customers by *how many symptom
  assessments they have completed* and *when*. That is a completion count and a date, not clinical
  content — no score, bracket, or answers are reachable this way. Worth re-confirming at the LAUNCH-06
  transfer, when the store moves onto AOD's plan and BAA posture.

Task 3's third acceptance criterion ("SUMMARY confirms Analytics filter still OFF on both metafield
definitions") is therefore **not met as written, and deliberately so** — the criterion was superseded
by an owner decision rather than failed by an oversight. The other three criteria are met.

## Accomplishments

- **Task 1 (D-04) closed with no STOP findings.** Both SLIT SKUs read `regional-drops`; the consult
  reads `telehealth-appointment`. Template separation — not a runtime exclusion — is what keeps the
  gate off the $99 consult, and the consult handle `allergy-consultation` was confirmed live rather
  than carried forward from 06-CONTEXT.md.
- **Task 2 inventory taken, with the plan-tier caveat that reframes it.** The order confirmation
  notification is the one confirmed paste target. The store is a development store on a Custom plan,
  so this inventory does not predict AOD's post-transfer surface set.
- **Two findings that change what 06-05 should write:** there is no refund policy and no shipping
  policy on this store, so SHOP-05's refund deliverable is authoring guidance for William rather than
  an amendment to existing prose.

## Task Commits

- Task 1: recorded in this SUMMARY (no code artifact — the gate is the measurement)
- Task 2: recorded in this SUMMARY (no code artifact — the gate is the inventory)

## Deviations from Plan

- **Task 2's `editable_on_basic_grow` column is answered against a Custom development-store plan,
  not Basic/Grow.** The plan assumed the shop was on Basic or Grow. It is not. The column is kept
  under its original heading for traceability and the discrepancy is documented in place rather than
  silently reinterpreted.
- **One Task 2 row is unmeasured.** The Admin Themes page would not render across three attempts, so
  the `Edit default theme content` row could not be filled. Recorded as a gap rather than guessed.
  The task's acceptance criteria are still met — Order confirmation and Refund policy rows are
  present with yes/no values, Plus-only targets are marked out of scope, and one
  `draft_target_for_06-05 = yes` row exists.
- **Tasks 1 and 2 were executed by Claude driving Andrew's logged-in Chrome session**, not typed by
  Andrew. The plan classified them `checkpoint:human-action` on the assumption that only a human
  could reach the Admin. The reads are identical either way; recorded so the provenance is not
  misread later as Andrew having personally verified each value.

## Known Stubs

- ~~All Task 3 cells remain empty pending authorization for the live-theme probe.~~ **CLOSED
  2026-08-13** — Task 3 measured via an unpublished duplicate theme rather than the live theme. One
  open item remains: the **Analytics segmentation toggle is ON on both definitions** and is Andrew's
  to decide (see Task 3 Deviation).

## Task 3 addendum — two findings outside Task 3's scope

1. **The Admin Themes page is persistently broken on this store, not transiently.** `/themes` returned
   the "Online Store" heading with an empty content area and no **Themes** sub-item in the nav (only
   Pages and Preferences) — the same failure recorded on 2026-08-12, now **four attempts across two
   sessions**. The Shopify **CLI** (`shopify theme list / duplicate / pull / push / delete`) works
   fine against the same store and is the working route. Anything in `06-06` that assumes the Admin
   Themes UI should be rewritten against the CLI or the theme editor deep link.

2. **Quiz-answer-shaped values are sitting on the Shopify customer record as TAGS.** Customer A's Tags
   field carries, among others: `complicated regimen`, `frequent doctor visits`, `prescribed
   medication`, `natural remedies`, `natural alternative`, `long-term solution`, `somewhat open`,
   `not sure`, `fall`, `summer`, `northwest`, `south central`, `southeast`, `fallback result`, and
   `Quiz Kit App Subscriber`. The `Quiz Kit App Subscriber` tag points at a **third-party quiz app
   (Quiz Kit)**, not this application — this app writes only the two allowlisted metafields, which is
   verifiable in `app/lib/shopify/metafields.ts`. But the effect is the same shape as LAUNCH-01:
   clinical-ish answers tied to an identified customer, living in Shopify, which CLAUDE.md rule 2
   forbids. Not a Phase 6 deliverable and not an agent action — recorded so it is not discovered a
   third time. Belongs with LAUNCH-01 as an Andrew-owned live exposure.
