# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-12
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `main` @ `128678a` — clean, everything merged
**Fly:** deployed 2026-08-12, served `/quiz-bundle-js` **203,797 B**, byte-identical to the committed artifact

**Resume with:** record the SHOP-01 spike result, then `/gsd:discuss-phase 6`. Two live findings below exist **only in this file and in agent memory** — they are not in `.planning/` yet.

---

## Goal

Phase 5 is shipped, amended twice, and deployed. Phase 5.1 was deleted before it was built. Next is **Phase 6 — Purchase Prerequisites & Returning Patients**, whose gating spike (SHOP-01) was run today and came back green.

---

## Current progress

**Phase 5.1 removed entirely (PR #25).** It rested on a wrong premise: that the clinical brackets were tunable. They are not — 0–2 / 3–6 / 7+ in `app/lib/quiz/scoring.ts:4-8` come from the AOD medical director. Only the *colour band stops* were ever meant to be configurable. Dropping the bracket half removed `scale_version`, the `submissions` migration, and the PHI-path review. Nothing had been built; grep confirmed zero code references. SCALE-01..04 deleted, coverage corrected 46 → 42.

**Scale bar now tracks the clinical brackets 1:1 (PR #25).** Zones read from `SCORE_BRACKETS` (2 / 6 / 60) rather than independent stops, rendered as **three equal-width bands** with the marker **interpolated inside its own band**. Those two halves are one decision — these boundaries at the old span-proportional widths would paint 90% of the bar red. This deliberately reverses D-05; the protection D-05 gave moved into the rendering rather than disappearing.

**Two redundant lines removed (PR #26).** "What this means for you" and "{zone} on the symptom scale" are gone. D-06's two-axis labelling now rests entirely on the bridge sentence.

**STATE.md reconciled (PR #27).** It had said Phase 5 was *executing at plan 1 of 6* on a commit four ahead of reality.

**SHOP-01 spike run and answered — see "SHOP-01 result" below.**

---

## ⚠️ Findings that exist ONLY here (not in `.planning/`)

### 1. LAUNCH-01 is violated — Klaviyo is live on the PHI quiz page

Verified in the browser on the live storefront, `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` (store password gated).

Shopify web pixel `web-pixel-597524686` is a **Klaviyo pixel**: subscribes to `page_viewed` and `product_added_to_cart`, POSTs to `https://a.klaviyo.com/client/events`, builds payloads referencing `email` and `phone`. Every visit to the allergy assessment page reports to Klaviyo, which has no BAA.

**It cannot see clinical content.** Answers, score, name and DOB are collected inside the cross-origin iframe on `fly.dev`; same-origin policy plus the worker sandbox block it. The exposure is page-view-plus-identity.

**A DOM scan will NOT find this** — the pixel runs in a sandboxed web worker, so `document.querySelectorAll('script')` returns clean and reports no Klaviyo. That false negative is why it stayed open. The check that works:

```js
fetch('/web-pixels/strict/app/web-pixel-<id>@<hash>.js')
  .then(r => r.text()).then(t => t.match(/https?:\/\/[a-z0-9.\-]+/gi))
```

Pixel IDs/hashes change — find current ones in the network log under `/web-pixels/strict/app/`.

**Fix:** Shopify admin → Settings → Customer events. Andrew's to make; not an agent action.

**Also third-party on that page:** the Appointly booking app (`s1.staq-cdn.com`, `d3emjguzbsq9q3.cloudfront.net`, `booking-api.apntly.com`) plus a `cloudflare.com/cdn-cgi/trace` call returning visitor IP and geo. Probably intentional for Phase 7 booking, never explicitly decided.

**Not inspected:** the merchant `shopify-custom-pixel`, and `web-pixel-506659022` (1KB, no external hosts, looks benign).

**Andrew chose "nothing yet" on 2026-08-12** rather than write it up or amend the docs.

### 2. LAUNCH-02 is already satisfied

The iframe URL on the live storefront carries `test=0`. `enable_test_mode` defaults to `false` in `extensions/quiz-block/blocks/symptom-quiz.liquid`. Just needs recording as done — `REQUIREMENTS.md` still lists it as plain "Pending".

### 3. `REQUIREMENTS.md:214` is stale

It says the app block's Medical Disclaimer field reads "This text needs changed." It does not — the live page renders the real clinical disclaimer. The `ConsentStep.tsx:56` `[PENDING]` marker and the `CONSENT_VERSION` bump are separate and unverified.

---

## SHOP-01 result (the Phase 6 gating spike)

**Verdict: no fallback design needed. The obstacle is cleared.**

The question was never whether the metafields are written — they are, and `app/routes/app.verify-metafields.tsx` reads them fine via the **Admin API**. The question is **Liquid readability on the storefront**, which needs a metafield *definition*.

Found: both metafields existed as **unstructured** (no definition) on 4 customers — which is exactly why Liquid could not see them.

**Created both definitions in the Shopify admin on 2026-08-12** (Andrew authorized):

| Definition name | Key | Type | Used in |
|---|---|---|---|
| Completed assessments | `alledrops.quiz_count` | Integer | 4 customers |
| Last completed assessment | `alledrops.last_completed_at` | Date and time | 4 customers |

Settings on both: **Storefront API access ON**, Customer Account API access **No access**, **"Filter or group data in Analytics" OFF** — left off deliberately; pushing a health-adjacent field into Analytics segmentation is what turns an approved non-PHI flag into a problem. Keep it off.

**Still unproven:** that `customer.metafields.alledrops.quiz_count` actually *renders* in Liquid for a logged-in customer. Creating the definition is the documented prerequisite but was not empirically confirmed — that test needs a logged-in customer session plus Liquid on a template, which is really the first step of SHOP-02 rather than the spike.

---

## What worked

- **Served-bytes verification, never exit codes.** Fetch the deployed `/quiz-bundle-js`, compare byte length and `split(needle).length - 1` counts against the committed artifact. Caught nothing broken today but is the reason "deployed" is trustworthy.
- **Rendering every score and screenshotting it.** Built a local HTML with the real CSS at scores 0/1/2/3/5/6/7/8/20/45/60. This is the only reason the 6→7 marker collapse was found — tests all passed.
- **Fetching web-pixel bundles rather than scanning the DOM.** See LAUNCH-01 above. The DOM scan actively lied.
- **`git branch <name>` + `git reset --keep`** to move a commit accidentally made on `main` onto a branch without losing uncommitted working-tree edits. Used successfully today.
- **`claude-in-chrome` for anything needing Andrew's real sessions.** It attaches to his logged-in Chrome.

## What didn't work

- **`chrome-devtools` MCP has no Shopify admin session** — it drives a separate browser. Use `claude-in-chrome` for admin/storefront work.
- **`mcp__claude-in-chrome__browser_batch` returned "No tab available"** with a valid tabId. Fell back to individual `computer` calls, which work fine. Don't burn time debugging it.
- **`shopify-dev-mcp` docs search did not answer** whether Liquid customer-metafield reads require the Storefront API toggle. Results were all Customer Account API / UI extensions. Settled empirically instead.
- **Interpolation does not solve the 6→7 boundary.** Scores 6, 7 and 8 land ~3px apart on the orange/red seam, so the most consequential clinical threshold shows no marker movement. Measured, surfaced, and **accepted** by Andrew. Two alternatives were costed and declined — both written up above the calculation in `ResultsDisplay.tsx`. **Do not "fix" this as a bug.**
- **Do not revert the equal-width zones to span-proportional.** With bracket-aligned boundaries that produces the 90%-red bar nobody chose.

---

## Next steps

1. **Record the SHOP-01 spike result** in `.planning/` — verdict, the two definitions and their settings, and the one unproven Liquid step. Currently only in this file.
2. **Decide on the LAUNCH-01 Klaviyo finding.** Options were: shareable write-up for AOD, planning-doc update, or dig further (the uninspected custom pixel, and whether Klaviyo fires on the product/consult pages too). Andrew deferred on 2026-08-12.
3. **`/gsd:discuss-phase 6`** — with the metafield question settled, this can be about SHOP-02/03's real design. Note SHOP-05 and SHOP-06 are not code (Shopify admin content / AOD process, William owns).
4. **Apply William's colour-stop answer when it arrives.** He was emailed 2026-08-12, but that email describes the **previous** design (linear 0–60, independent 20/40/60 stops) — the deployed page is already a version past it. Applying his answer is an edit to the `zones` array in `score-scale.ts` plus a deploy.
5. **Clear `isProvisional: true`** in `score-scale.ts` once he confirms.

---

## Resume context

| | |
|--|--|
| **Branch** | `main` @ `128678a`, clean |
| **How to verify** | `npm run typecheck && npm test` → expect **734 passing / 49 files**. Bundle: `npm run build:theme`, then compare to served bytes. |
| **Key files** | `app/lib/quiz/score-scale.ts` · `app/components/quiz/ResultsDisplay.tsx` · `app/lib/quiz/scoring.ts` · `tests/quiz-results-scale-bar-dom.test.ts` · `tests/quiz-bundle-freshness.test.ts` · `.planning/STATE.md` |
| **Deploy** | `fly deploy -a alle-drops-quiz-app` from `main` only. Fly prints a "not listening on the expected address" warning on every deploy — **false alarm**, health returns 200. |
| **Blockers** | None blocking Phase 6. William owes the colour-stop confirmation (go-live, not code). LAUNCH-01 is live and unremediated by choice. `04-19` remains the one open plan (55/56) — Phase 4 human UAT, blocked on the Fly BAA, GCP cutover, and William. |

## Git hygiene

- **Always branch.** Never commit to `main` — I slipped once today and had to recover with `git branch` + `git reset --keep`.
- Deploy from `main` only, after merge.
- `shopify app deploy` is a separate system from `fly deploy` and was **not** needed for any of today's work (bundle is Fly-served, no extension changes).
