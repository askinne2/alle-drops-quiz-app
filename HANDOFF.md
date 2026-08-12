# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-12 (supersedes the earlier 2026-08-12 entry written before Phase 6 execution began)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `thread-phase-6-purchase-prerequisites` @ `69721f9` — clean, not merged, not deployed
**Fly:** last deploy 2026-08-12 from `main`, served `/quiz-bundle-js` **203,797 B**. Nothing on this branch has shipped.

**Resume with:** answer the one open question in "Next steps" #1 — how to run the SHOP-01 Liquid render measurement. Everything else in Wave 1 is done.

---

## Goal

Ship **Phase 6 — Purchase Prerequisites & Returning Patients**: honor-system purchase confirmations on the two SLIT product pages, returning-patient credit from Shopify metafields, and clinical-review expectations on the post-purchase surfaces. Six plans in three waves. Done when a logged-in patient who has completed the quiz sees that credit on the PDP, add-to-cart requires both confirmations, and the 2–3 business day review language reaches the customer after ordering.

---

## Current progress

Phase 6 was planned and partly executed **in Cursor**, then picked up in Claude Code. 6 plans, 3 waves. **2 of 6 plans complete**; a third is two-thirds done.

| Plan | Wave | Status |
|---|---|---|
| 06-01 | 1 | ✓ Sense ATC selector contract (D-02) — vendored fixture + contract test |
| 06-04 | 1 | ✓ `order-review-notice` checkout UI extension, dual-target, 9/9 tests |
| **06-02** | 1 | **Tasks 1–2 done, Task 3 open** — see below |
| 06-03 | 2 | not started (needs 06-01, 06-02) — the `purchase-prerequisites` theme app extension |
| 06-05 | 2 | not started (needs 06-02) — SHOP-05 copy draft + SHOP-06 fulfillment checklist |
| 06-06 | 3 | not started (needs 02, 03, 04) — editor placement, deploy, human UAT |

### What landed today in Claude Code

Plan 06-02 is three human-gate checkpoints. **Tasks 1 and 2 were measured by driving Andrew's logged-in Chrome session** (`claude-in-chrome`) against live Shopify Admin, and committed in `69721f9`. Full record: `.planning/phases/06-purchase-prerequisites/06-02-SUMMARY.md`.

**Task 1 — D-04 templateSuffix. Cleared, no STOP findings.**

| handle | templateSuffix | gate eligible | product id |
|---|---|---|---|
| `tennessee-alledrops` | `regional-drops` | yes | 7624809840846 |
| `texas-alledrops` | `regional-drops` | yes | 7601816862926 |
| `allergy-consultation` | `telehealth-appointment` | **no** | 7601817157838 |

The consult handle was confirmed from its live Search engine listing, not carried over from CONTEXT. The purchase gate stays off the $99 consult by **template separation** — 06-03 and 06-06 need no runtime exclusion for it.

**Task 2 — SHOP-05 surface inventory. Done, with two findings that change 06-05.**

---

## ⚠️ Two new findings from today (recorded in 06-02-SUMMARY, flagged here because they cross phase boundaries)

### 1. This is a development store on a Custom plan — not Basic/Grow

`Settings → Plan` reads **"Custom plan · Development store"**, with the banner *"The Change plan option is no longer supported for client transfer stores. To change the plan, transfer the store to your client first."*

Phase 6's CONTEXT, RESEARCH, and ROADMAP all reason from a Basic/Grow plan. They are wrong about the current store. The consequence that matters: **D-09 / D-11 conclude that checkout-step extension targets are "Plus-only, therefore out of scope."** That conclusion may be right for AOD's eventual plan and is definitely not verifiable here — a dev store carries access a paid Basic plan does not. Re-confirm after the LAUNCH-06 transfer rather than treating the inventory as settled.

Not a blocker for 06-03 or 06-05. It is a note to carry into LAUNCH-06.

### 2. There is no refund policy, and no shipping policy

`Settings → Policies → Written policies`:

| policy | status |
|---|---|
| Return and refund policy | **No policy set** |
| Shipping policy | **No policy set** |
| Terms of service | No policy set |
| Legal notice | No policy set |
| Contact information | **Required**, unset |
| Privacy policy | Automated |

ROADMAP success criterion 4 for Phase 6 says the clinical-review language must appear "in the refund policy". **There is no refund policy to amend.** SHOP-05's refund deliverable is therefore must-include authoring guidance handed to William for a document written from nothing — 06-05 should say that plainly rather than producing prose that reads like an edit.

Return and cancellation rules are also unset.

### Also observed, not Phase 6

`Settings → Notifications` sender email is **`andrew@21adsmedia.com`**. Customer-facing order mail from this store sends from the agency address. Belongs with LAUNCH-06's "off the cross-client billing account" work.

---

## ⚠️ Finding that still exists ONLY here and in agent memory

### LAUNCH-01 is violated — Klaviyo is live on the PHI quiz page

Verified in the browser on `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` (store password gated). Unchanged since 2026-08-12; Andrew chose "nothing yet".

Shopify web pixel `web-pixel-597524686` is a **Klaviyo pixel**: subscribes to `page_viewed` and `product_added_to_cart`, POSTs to `https://a.klaviyo.com/client/events`, builds payloads referencing `email` and `phone`. Every visit to the allergy assessment page reports to Klaviyo, which has no BAA.

**It cannot see clinical content.** Answers, score, name and DOB are collected inside the cross-origin iframe on `fly.dev`; same-origin policy plus the worker sandbox block it. The exposure is page-view-plus-identity.

**A DOM scan will NOT find this** — the pixel runs in a sandboxed web worker, so `document.querySelectorAll('script')` returns clean. That false negative is why it stayed open. The check that works:

```js
fetch('/web-pixels/strict/app/web-pixel-<id>@<hash>.js')
  .then(r => r.text()).then(t => t.match(/https?:\/\/[a-z0-9.\-]+/gi))
```

Pixel IDs/hashes change — find current ones in the network log under `/web-pixels/strict/app/`.

**Fix:** Shopify admin → Settings → Customer events. Andrew's to make; not an agent action.

**Also third-party on that page:** the Appointly booking app (`s1.staq-cdn.com`, `d3emjguzbsq9q3.cloudfront.net`, `booking-api.apntly.com`) plus a `cloudflare.com/cdn-cgi/trace` call returning visitor IP and geo. Probably intentional for Phase 7 booking, never explicitly decided. **Not inspected:** the merchant `shopify-custom-pixel`, and `web-pixel-506659022` (1KB, no external hosts, looks benign).

---

## What worked

- **Driving Admin through `claude-in-chrome` + `get_page_text`.** Product `templateSuffix` lives in the right sidebar under **Theme template**; `get_page_text` returns it along with the handle from the Search engine listing, so one page load answers both questions. `find` did *not* locate it — the accessibility tree describes it oddly. Screenshot or `get_page_text`, not `find`.
- **Reading the handle off the Search engine listing URL** rather than trusting the documented handle. Cheap, and it is what confirmed `allergy-consultation` is still live.
- **Served-bytes verification, never exit codes.** Fetch the deployed `/quiz-bundle-js`, compare byte length and `split(needle).length - 1` counts against the committed artifact.
- **`git branch <name>` + `git reset --keep`** to move a commit accidentally made on `main` onto a branch without losing uncommitted working-tree edits.

## What didn't work

- **The Admin Themes page would not render.** `/themes`, `/themes/135799767246/language`, and a nav click all returned correct page chrome with an **empty content area**, and the Online Store nav omitted its usual **Themes** sub-item (only Pages and Preferences). No error surfaced. Three attempts, then stopped. This is why one Task 2 row is unmeasured. Retry in a fresh session before assuming it is broken.
- **`chrome-devtools` MCP has no Shopify admin session** — it drives a separate browser. Use `claude-in-chrome`.
- **`mcp__claude-in-chrome__browser_batch` returned "No tab available"** with a valid tabId. Individual `computer` calls work. Don't burn time on it.
- **Interpolation does not solve the 6→7 boundary.** Scores 6, 7 and 8 land ~3px apart on the orange/red seam. Measured, surfaced, and **accepted** by Andrew. **Do not "fix" this as a bug** — reasoning is above the calculation in `ResultsDisplay.tsx`.
- **Do not revert the equal-width zones to span-proportional.** With bracket-aligned boundaries that produces a 90%-red bar nobody chose.

---

## Next steps

1. **Decide how to run 06-02 Task 3 — the SHOP-01 Liquid render measurement.** This is the only thing blocking Wave 1. It needs two things, and the second is the harder one:
   - a temporary Custom Liquid probe that outputs `customer.metafields.alledrops.quiz_count`, and
   - **a logged-in customer session** for one of the 4 customers who have that metafield. Shopify has no customer impersonation and login is an emailed code, so this needs a test customer whose inbox Andrew controls. An agent cannot do this half.

   Options as of the last session:
   - **A —** duplicate the Sense theme, put the probe on the *duplicate*, fetch with `?preview_theme_id=` while logged in as that customer, delete the duplicate. Never touches live.
   - **B —** the plan's method: probe on the live theme, remove after. Faster, mutates the live clinical storefront.
   - **C —** Andrew runs it solo and pastes the counts; an agent writes the SUMMARY.

   Count with `split(needle).length - 1`, never `grep -c`. Confirm "Filter or group data in Analytics" is still **OFF** on both definitions. No PHI in the SUMMARY.

2. **Then Wave 2 unblocks:** `06-03` (the `purchase-prerequisites` theme app extension) and `06-05` (SHOP-05 copy draft + SHOP-06 fulfillment checklist) can run in parallel. **06-05 must incorporate the no-refund-policy finding above** — it changes the deliverable from an amendment to authoring guidance.
3. **Then `06-06`:** theme-editor placement on `regional-drops` only, "Show dynamic checkout buttons" OFF, checkout editor placement, `shopify app deploy`, human UAT. `autonomous: false` — needs Andrew throughout.
4. **Optional, unrelated to Phase 6:** decide on the LAUNCH-01 Klaviyo finding. Deferred twice now.
5. **Apply William's colour-stop answer when it arrives** — an edit to the `zones` array in `score-scale.ts` plus a deploy. His pending email describes the *previous* design (linear 0–60, independent 20/40/60 stops); the deployed page is a version past it. Clear `isProvisional: true` once confirmed.

---

## Resume context

| | |
|--|--|
| **Branch** | `thread-phase-6-purchase-prerequisites` @ `69721f9`, clean. Branched from `main` @ `1e8af0f`. Not pushed as a PR yet. |
| **How to verify** | `npm run typecheck && npm test`. The two new Phase 6 contract tests (`tests/sense-atc-selector-contract.test.ts`, `tests/order-review-notice-extension-contract.test.ts`) should be green. |
| **Key files** | `.planning/phases/06-purchase-prerequisites/06-02-SUMMARY.md` (the live checkpoint) · `06-02-PLAN.md` (Task 3 method) · `06-CONTEXT.md` (D-01…D-11) · `06-SPIKE-SHOP-01.md` · `extensions/order-review-notice/` · `tests/sense-atc-selector-contract.test.ts` |
| **Store** | `allergist-on-demand.myshopify.com`, admin at `admin.shopify.com/store/allergist-on-demand`. Live theme: Sense, id `135799767246`. |
| **Deploy** | Nothing on this branch deploys until merged. `fly deploy -a alle-drops-quiz-app` from `main` only; `shopify app deploy` is a separate system and 06-06 owns it. Fly prints a "not listening on the expected address" warning on every deploy — **false alarm**, health returns 200. |
| **Blockers** | 06-02 Task 3 needs a customer login Andrew controls (see Next steps #1). `04-19` remains the one open plan from Phase 4 — human UAT, blocked on the Fly BAA, GCP cutover, and William. LAUNCH-01 live and unremediated by choice. |

## Git hygiene

- **Always branch.** Never commit to `main`.
- Phase 6 work goes on `thread-phase-6-purchase-prerequisites`. Andrew reviews and merges; agents do not.
- Deploy from `main` only, after merge.
