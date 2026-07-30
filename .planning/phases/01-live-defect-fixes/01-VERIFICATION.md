---
phase: 01-live-defect-fixes
verified: 2026-07-30T17:55:00Z
status: human_needed
score: 39/40 must-haves verified (1 superseded by platform constraint — override recommended)
overrides_applied: 0
overrides: []
re_verification: null
gaps: []
deferred:
  - truth: "No third-party tracker loads on the PHI-collecting quiz page"
    addressed_in: "Phase 8"
    evidence: "LAUNCH-01 — 'No Klaviyo, Meta Pixel, Google Analytics, or other tracker loads on any PHI-collecting page, verified in the browser on the live store'. Independently re-measured 2026-07-30: klaviyo.js loads on /pages/allergy-quiz (10 raw occurrences, 1 script tag). Phase 1 adds zero scripts so nothing in it could close this."
  - truth: "No placeholder or missing clinical copy on a patient-facing surface"
    addressed_in: "Phase 8"
    evidence: "LAUNCH-03 — counsel-owned. Independently re-measured: 'disclaimer' appears 0 times in the rendered /pages/allergy-quiz HTML. The live clinical intake page carries no medical disclaimer at all."
  - truth: "Test Mode cannot be reached on the production storefront page"
    addressed_in: "Phase 8"
    evidence: "LAUNCH-02. The block ships test=0 (confirmed live), but WR-13 remains open: GET /quiz-embed?test=1 returns testMode: true regardless of the merchant checkbox — re-confirmed against production 2026-07-30."
  - truth: "Duplicate PHI rows cannot be created by a double-submit"
    addressed_in: "Phase 4"
    evidence: "STATE.md Deferred Items: 'Phase 4 (TEST-05) deletes the 3-6 purchase jump entirely and removes it for free.' WR-09 confirmed still open in QuizContainer.tsx — no in-flight submit guard; savedToServer is consulted only for the 0-2 bracket at :255."
superseded:
  - must_have: "A merchant can select the Tennessee and Texas products from a searchable picker instead of typing a handle (Plan 01-03)"
    reason: "Impossible on the Shopify platform. A theme app extension block may declare at most ONE 'type: product' setting; the plan specified two, and shopify app deploy rejected the first version outright ('settings: exceeds limit of 1 for type product'). Both were converted to 'type: text' holding the handle, which restored the D-11 clause 01-03 had recorded as unimplementable. Independently confirmed live: the already-placed block inherits the new schema defaults and the rendered _embed_src carries tnProduct=tennessee-alledrops&txProduct=texas-alledrops with no theme-editor step. DEF-03 is fully satisfied and independently verified."
    recommended_override: true
human_verification:
  - test: "On a mobile viewport (~390px wide), advance one quiz step on https://allergist-on-demand.myshopify.com/pages/allergy-quiz (storefront password: allergy) and observe where the page lands."
    expected: "The first question of the new step is fully visible and not covered by the Sense sticky header."
    why_human: "scroll-margin-top is hardcoded at 100px in the Liquid block's style region. Gate F measured clearance on desktop only (iframe top 100px vs header bottom 88px, 12px clear). No mobile measurement exists anywhere in the phase record, and the Sense sticky header has a different height at mobile breakpoints. Layout outcome — not derivable from source."
  - test: "Confirm the PHI cleanup counts recorded in STATE.md ('PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0', table total 43 -> 42) by re-running a COUNT(*)-only query against production Cloud SQL."
    expected: "submissions row count is 42 and SELECT COUNT(*) FROM submissions WHERE patient_email = 'diag+preflight@example.com' returns 0."
    why_human: "This machine's IP is not on the Cloud SQL authorized-networks list, so the verifier cannot reach the database. The route that works is fly ssh console -a alle-drops-quiz-app running a pg script. Counts only — do not select any PHI field."
---

# Phase 1: Live Defect Fixes — Verification Report

**Phase Goal:** Every navigation and label already shipped to patients behaves the way it was designed to
**Verified:** 2026-07-30T17:55:00Z
**Status:** human_needed — 39/40 must-haves verified; no gaps block Phase 2
**Re-verification:** No — initial verification
**Deployment reality verified:** `main` @ `bbd4814`; PR #16 (`fix-phase1-live-defects` → `main`) merged 2026-07-30T12:21:41Z as `a0d8ce0`; Fly `v46` + `v47` complete; Shopify app version `alledrops-quiz-production-21` **active**.

---

## Verification method note

The briefing warned that `grep` on this machine is a ugrep wrapper where `$` anchors mid-pattern, and
that `grep -c` counts LINES — so against the single-line 184KB bundle every `>=1` gate collapses to 1
and passes vacuously. **Every load-bearing count in this report was produced with
`node -e 'split(needle).length - 1'`, not grep.** Where a number appears in a table below, it is a
true occurrence count.

The briefing also warned that unauthenticated storefront checks are false positives. I reproduced the
mechanism exactly: `GET /products/tennessee-allerdrops.js` (a handle that does not exist) returned
**HTTP 200** unauthenticated, because the storefront 302s every path to `/password`. **All storefront
assertions in this report were made with the storefront password cookie held** (password `allergy`,
recorded at `01-VALIDATION.md:127`), so they measure the real page.

---

## Goal Achievement — ROADMAP Success Criteria

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Advancing or going back a quiz step scrolls the parent storefront page to the top of the quiz | ✓ VERIFIED | Child: `QuizContainer.tsx:161-172` posts `quiz:scrollToTop` on `[step, currentPartIndex]`, first render suppressed by `isFirstRender` ref. Parent: confirmed in the **rendered live page** — `quiz:scrollToTop` ×1, `scrollIntoView` ×1, `block: 'start'` ×1, `behavior: 'instant'` ×1, `scroll-margin-top: 100px` ×1. Both halves are on the live surface. Runtime motion measured at checkpoint (1800 → 822.5, identical at 60ms and 660ms). Mobile clearance → human item 1. |
| 2 | "Test First", "Schedule Consult", "Return Home" navigate the parent storefront page to the correct URL instead of a React Router 404 in the frame | ✓ VERIFIED | Served `/quiz-embed` contains **zero** occurrences of `location.assign`, `window.location.assign`, or `Location.prototype`. All five exits routed through `navigateParent` / the relative-href interceptor. Live rendered `_embed_src` carries `consult=%2Fproducts%2Fallergy-consultation&testOptions=%2Fpages%2Ftest-options`; both targets return **200** authenticated. |
| 3 | The AlleDrops product link lands on a live product page in both Tennessee and Texas | ✓ VERIFIED | Independently measured with the password cookie: `/products/tennessee-alledrops` **200**, `/products/texas-alledrops` **200**, `/products/tennessee-allerdrops` **404**, `/products/texas-allerdrops` **404**. The 404s prove the defect was real and the fix non-vacuous. Live `_embed_src` carries `tnProduct=tennessee-alledrops&txProduct=texas-alledrops`; the code map is an independent second guarantee. |
| 4 | Medication label reads "Please list your current allergy medications and dosages" with no `(required):` suffix, still enforced as required | ✓ VERIFIED | `questions.ts:198` exact. Served bundle: label ×1, `(required)` ×**0**. Enforcement at `QuizPartRenderer.tsx:296-301`; tests cover empty, whitespace-only, AND a filled-in control that must NOT block (non-vacuity). |
| 5 | The batch deploys to production on its own with 51/51 tests still passing, verified against rendered DOM rather than deploy success | ✓ VERIFIED | `npm test` → **173 passed / 17 files**; `npm run typecheck` exit **0**; `npm run build` exit **0**. Deploy proven by content, not exit codes: served `/quiz-bundle-js` is **byte-identical (184512 B)** to `git show HEAD:public/quiz-bundle.js`, and a fresh `npm run build:theme` reproduces that byte-for-byte. Shopify version `alledrops-quiz-production-21` **active**, created 12 s after the last Liquid commit `73b2920`. |

**Roadmap score: 5/5**

---

## Plan-level Must-Haves

### Plan 01-01 — validator + handles (5/5)

| Truth | Status | Evidence |
|---|---|---|
| `//evil.com` rejected | ✓ | Live `tsx` probe against the real module: rejected. `new URL("//evil.com", …).origin === "https://evil.com"` — real bypass, non-vacuous |
| Absolute URL on the Fly origin rejected | ✓ | Probe: `https://alle-drops-quiz-app.fly.dev/pages/x` → false |
| TN/TX handles resolve to live product pages | ✓ | 200/200 authenticated (see SC3) |
| Blank merchant setting falls back to corrected code handle | ✓ | `getProductHandle` returns map value on `""`/absent/undefined; 3 tests |
| Populated setting wins | ✓ | 4 tests incl. cross-wiring guards both directions |

### Plan 01-02 — kill the override, five exits, label (6/6)

| Truth | Status | Evidence |
|---|---|---|
| `window.location.assign` override gone from served HTML | ✓ | 0 occurrences in live `/quiz-embed` |
| All five exits post a relative path | ✓ | `navigateParent` ×4 (`:265`, `:278`, `:298`, `:378`) + relative `<a href>` at `:385` via the interceptor. No other `window.location` write exists in `app/components/quiz/` |
| Anchor posts the raw relative href, not one resolved against the Fly origin | ✓ | Live HTML: `path: href` ×1, `new URL(href` ×**0** |
| Anchor href uses the merchant handle when set, corrected code handle when not | ✓ | Live config injects `tnProductHandle: "tennessee-alledrops"`; blank-config probe falls back to the same value |
| Label exact | ✓ | See SC4 |
| Empty `med_list` still blocks advance when `taking_meds` is yes | ✓ | `QuizPartRenderer.test.ts:39,43,47` |

### Plan 01-03 — Liquid hardening (5/6, 1 superseded)

| Truth | Status | Evidence |
|---|---|---|
| `quiz:scrollToTop` scrolls the parent instantly | ✓ | Live rendered page (see SC1) |
| Scroll lands the first question below the sticky header | ✓ desktop | `scroll-margin-top: 100px` live; Gate F measured 12px clear on desktop. **Mobile unmeasured → human item 1** |
| Absolute / protocol-relative / `javascript:` navigates nowhere | ✓ | Live rendered page carries every positional rule, entity-decoded: `typeof p !== 'string'`, `p.charAt(0) !== '/'`, `p.charAt(1) === '/'`, `p.charAt(1) === '\\'`, plus `u.origin === window.location.origin` |
| Message from any other origin ignored on every branch, including resize | ✓ | `e.origin !== APP_ORIGIN` is the **first statement** in the listener, before any type branch — verified in the rendered page |
| Merchant can select products from a searchable picker | ⚠ **SUPERSEDED** | Shopify caps `type: "product"` at one per block; the plan specified two and the first app version was rejected. Converted to `type: "text"` **with defaults**. See "Superseded must-have" below |
| Both handles reach the app through `_embed_src` | ✓ | Rendered live: `…&tnProduct=tennessee-alledrops&txProduct=texas-alledrops` |

### Plan 01-04 — bundle, CLAUDE.md, findings (5/5)

| Truth | Status | Evidence |
|---|---|---|
| Committed bundle carries corrected handles + label | ✓ | `tennessee-alledrops` 1, `texas-alledrops` 1, label 1 |
| Committed bundle carries neither misspelling nor `(required)` | ✓ | `allerdrops` **0** (any form), `(required)` **0** |
| Suite + typecheck green, ≥51 tests | ✓ | 173/173, typecheck 0 |
| `CLAUDE.md` no longer says "THIS IS NOT a GSD project" | ✓ | Replaced with a "This project is GSD-managed" section pointing at `.planning/`. PHI compliance block preserved intact |
| Out-of-scope defects recorded | ✓ | STATE.md Deferred Items carries `frame-ancestors`, ETag/provenance, double-submit, theme-config offset. **One row is now stale — see Warnings** |

### Plan 01-05 — three-channel deploy (5/5)

| Truth | Status | Evidence |
|---|---|---|
| Served `/quiz-embed` has no assign reassignment and no Fly-origin href resolution | ✓ | 0 / 0 |
| Served bundle has both handles, no misspelling, no `(required)` | ✓ | Live bundle byte-identical to `HEAD` |
| Rendered live storefront has the scrollToTop branch, an `e.origin` check, and `scrollIntoView` | ✓ | **All three independently confirmed by me** on the authenticated page |
| A new Shopify app version exists after the extension deploy | ✓ | `shopify app versions list --json` → `alledrops-quiz-production-21`, `"status": "active"` |
| No success claim rests on a deploy exit code, header, or `/health` 200 | ✓ | Every gate is a content assertion. This report re-derived them independently |

### Plan 01-06 — human gates + PHI cleanup (7/8, 1 uncertain)

| Truth | Status | Evidence |
|---|---|---|
| Test First goes to `/pages/test-options`, not the consult product | ✓ | Live `_embed_src`: `testOptions=%2Fpages%2Ftest-options`. Gate D closed and independently re-confirmed |
| Both handles appear in the rendered `_embed_src` | ✓ | Confirmed live. Note: the stored block settings in `page.quiz.json` contain **neither key** — the handles arrive via the new schema `default`s, which settles the open question in STATE.md's own Deferred Items about whether an already-placed block inherits a newly-added non-`product` setting default. **It does.** |
| Both corrected handles return 200 on the live storefront | ✓ | Independently measured 200/200, with misspellings at 404/404 |
| scrollToTop scrolls the parent instantly, first question clear of the sticky header | ✓ desktop | Checkpoint measurement; mobile → human item 1 |
| Hostile navigate targets navigate nowhere | ✓ | Source live on both parent surfaces; validator behavior re-proven by direct probe |
| A navigate from the shop origin rather than the app origin navigates nowhere | ✓ | Origin equality guard is the first statement, verified in rendered bytes |
| Label renders without `(required)` live and an empty answer still blocks Next | ✓ | Live bundle count 0; blocking by unit test (reaching part 5 live requires completing the questionnaire — stated plainly, not claimed as a DOM check) |
| Every PHI verification row deleted; `diag+preflight` row gone | ? **UNCERTAIN** | `PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0`, table 43→42, arithmetic self-consistent. **I cannot reach Cloud SQL from this machine** → human item 2 |

---

## Superseded must-have (recommended override — not a gap)

**Plan 01-03 truth 5: "A merchant can select the Tennessee and Texas products from a searchable
picker instead of typing a handle."**

This was never implementable. Shopify's extension validator refuses more than one `"type": "product"`
setting per theme app extension block, and the plan specified two — so no deploy of 01-03's output
could ever have succeeded. Both became `"type": "text"` holding the handle, which is what the Liquid
already consumed.

I judged the replacement **correct and better**, not a downgrade:

- `text` settings **can** declare a `default`, which `product` cannot — this restored the D-11 clause
  that 01-03 had to record as unimplementable.
- `liquid-block-contract.test.ts` now asserts `"default": "tennessee-alledrops"` / `"texas-alledrops"`
  are present AND asserts `"type": "product"` is **absent**, so the platform limit fails locally with
  an explanatory message rather than remotely at deploy.
- It also asserts `.tn_product.handle` / `.tx_product.handle` are absent — the exact way a
  `text`-setting migration would silently break (`.handle` on a string yields nil, sending every
  patient to `/products/` with no handle).
- I confirmed on the live rendered page that the defaults reach `_embed_src` with **no theme-editor
  step**, which is a strictly better deploy-day posture than two blank pickers.

DEF-03 — the requirement this truth served — is independently verified at 200/200. **This does not
block Phase 2.** To close it formally, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "A merchant can select the Tennessee and Texas products from a searchable picker instead of typing a handle"
    reason: "Shopify caps type:'product' settings at one per theme app extension block; two were specified and the first app version was rejected. Converted to type:'text' with schema defaults, which additionally restored the D-11 default clause. Live _embed_src confirmed carrying both handles."
    accepted_by: "andrew"
    accepted_at: "2026-07-30T18:00:00Z"
```

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/lib/quiz/navigation.ts` | Canonical path validator | ✓ VERIFIED | 83 lines. Exports `isSafeRelativePath`, `toRelativePath`. `PARSER_STRIPPED_CHARS` checked **before** positional rules. Imported by `QuizContainer.tsx` and `entry.theme.tsx` |
| `app/lib/quiz/navigation.test.ts` | Accept/reject matrix | ✓ VERIFIED | 223 added lines; passes |
| `app/lib/quiz/product-links.ts` | Corrected map + resolver | ✓ VERIFIED | `tennessee-alledrops` / `texas-alledrops`; misspelling deliberately absent and asserted absent |
| `app/lib/quiz/product-links.test.ts` | DEF-03 + precedence | ✓ VERIFIED | 10 tests incl. both cross-wiring directions |
| `app/routes/quiz-embed.tsx` | Corrected interceptor + config | ✓ VERIFIED | Override gone; per-response nonce; CSP `script-src 'self' 'nonce-…'; object-src 'none'; base-uri 'none'` confirmed on the live response headers |
| `app/components/quiz/QuizContainer.tsx` | `navigateParent` on all exits | ✓ VERIFIED | 5 exits; sole `window.location` write is inside `navigateParent` after validation |
| `app/lib/quiz/questions.ts` | Corrected label | ✓ VERIFIED | `:198` exact |
| `app/components/quiz/QuizPartRenderer.test.ts` | DEF-04 + D-13 | ✓ VERIFIED | 9 tests |
| `extensions/quiz-block/blocks/symptom-quiz.liquid` | Hardened parent handler | ✓ VERIFIED | 283 lines; every element confirmed in the **rendered** live page |
| `public/quiz-bundle.js` | Rebuilt committed bundle | ✓ VERIFIED | committed == working == live == fresh rebuild, all 184512 B |
| `CLAUDE.md` | No stale anti-GSD line | ✓ VERIFIED | Replaced |
| `.planning/STATE.md` | Findings recorded | ⚠ PARTIAL | Contents recorded, but the file's own Current Position block and one Deferred row are stale — see Warnings |
| `app/lib/quiz/redirects.ts` + test | Out-of-plan consult 404 fix | ✓ VERIFIED | 11 tests. Fallbacks asserted to satisfy `isSafeRelativePath`. `/pages/consult` independently confirmed **404** — the fix was necessary |
| `app/lib/quiz/html-safe.ts` + test | Out-of-plan CR-01 XSS fix | ✓ VERIFIED | 8 tests incl. an explicit non-vacuity test proving `JSON.stringify` leaves the break-out intact. Wired into all 8 config values |
| `app/entry.theme.tsx` + `tests/entry-theme-contract.test.ts` | Out-of-plan open-redirect fix | ✓ VERIFIED | Imports `toRelativePath` rather than adding a fifth hand-port |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `navigation.ts` | `symptom-quiz.liquid` | hand-port guarded by contract test | ✓ WIRED | All 6 rules present in the **rendered live page**, entity-decoded |
| `product-links.ts` | `QuizContainer.tsx` | `getProductHandle(state, cfg)` | ✓ WIRED | `:385` |
| `redirects.ts` | `QuizContainer.tsx` | `getRedirectTarget` via `getRedirectUrl` | ✓ WIRED | `:57-62`, used at `:265/:278/:298` |
| `html-safe.ts` | `quiz-embed.tsx` | `jsonForScript` on every injected value | ✓ WIRED | 8/8 values |
| `navigation.ts` | `entry.theme.tsx` | `import { toRelativePath }` | ✓ WIRED | `:11`, used `:98` |
| `quiz-embed.tsx` | `window.AlleDropsQuizConfig` | escaped injection of both handles | ✓ WIRED — **pattern changed** | Plan 01-02 declared `tnProductHandle: ${JSON.stringify`. Code now uses `jsonForScript` (the CR-01 fix). Intent satisfied and strictly improved; the plan text is stale |
| `block.settings.tn_product` | `_embed_src` | `.handle` → `url_encode` → `&tnProduct=` | ✓ WIRED — **shape changed** | Now `block.settings.tn_product_handle \| url_encode`. `.handle` no longer used (D-10 conversion). Live `_embed_src` confirms the handle arrives |
| `e.origin` | `APP_ORIGIN` | equality check first in listener | ✓ WIRED | Confirmed in rendered bytes |
| `fix-phase1-live-defects` | `main` | PR reviewed and merged by Andrew | ✓ WIRED | PR #16, head `fix-phase1-live-defects`, base `main`, MERGED `a0d8ce0`. The briefing's concern here is unfounded — the branch name in the plan was correct |
| `main` | `alle-drops-quiz-app.fly.dev` | `fly deploy` | ✓ WIRED | v46 + v47 complete; served bundle byte-identical to HEAD |
| `symptom-quiz.liquid` | rendered `/pages/allergy-quiz` | `shopify app deploy` | ✓ WIRED | Version 21 active; rendered page carries the new handler |
| theme `test_options_redirect_url` | rendered `_embed_src` | `url_encode` | ✓ WIRED | `testOptions=%2Fpages%2Ftest-options` measured live |
| theme `tn_product` / `tx_product` | rendered `_embed_src` | schema defaults | ✓ WIRED | `tnProduct=tennessee-alledrops&txProduct=texas-alledrops` measured live |

---

## Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Real data? | Status |
|---|---|---|---|---|
| `QuizContainer` product anchor | `getProductHandle(patientState, getProductConfig())` | `window.AlleDropsQuizConfig.tnProductHandle` ← `_embed_src` ← theme schema default; fallback `PRODUCT_HANDLE_BY_STATE` | Yes — resolves to a **200** product page on both paths | ✓ FLOWING |
| `QuizContainer` exits | `getRedirectUrl(kind)` | `AlleDropsQuizConfig.*RedirectUrl` ← theme URL settings; fallback `REDIRECT_FALLBACK` | Yes — both configured values and both fallbacks return **200** | ✓ FLOWING |
| Liquid `_embed_src` | `block.settings.*` | Theme block settings + schema defaults | Yes — all six params non-empty in the rendered page | ✓ FLOWING |
| `quiz-embed` inline config | `url.searchParams` | Parent `_embed_src` | Yes — all 8 keys populated with real values live | ✓ FLOWING |

No hollow props, no static empty returns, no disconnected sources found.

---

## Behavioral Spot-Checks (run by this verifier)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite | `npm test` | 173 passed / 17 files | ✓ PASS |
| Typecheck | `npm run typecheck` | exit 0 | ✓ PASS |
| Server build | `npm run build` | exit 0 | ✓ PASS |
| Committed bundle is in sync with source | `npm run build:theme` then byte-compare | **identical**, 184512 B | ✓ PASS |
| Live bundle == committed bundle | fetch `/quiz-bundle-js`, byte-compare to `git show HEAD:` | **identical** | ✓ PASS |
| Validator accept/reject (14 cases) | `tsx` probe against the real module | 14/14 correct, 0 failures | ✓ PASS |
| Control-char bypasses are real | `new URL("/\t/evil.com", …).origin` | `https://evil.com` — genuine bypass | ✓ PASS (non-vacuity proven) |
| Backslash-at-index-1 is real | `new URL("/\\evil.com", …).origin` | `https://evil.com` — **disproves `01-RESEARCH.md:821`** | ✓ PASS |
| CR-01 closed in production | live `/quiz-embed?consult=</script><script>alert(1)</script>` | returned fully `<`-escaped; script element count unchanged at 2; payload provably reached the response | ✓ PASS (non-vacuous) |
| CSP served | response headers | `script-src 'self' 'nonce-…'; object-src 'none'; base-uri 'none'` | ✓ PASS |
| Shopify version active | `shopify app versions list --json` | `alledrops-quiz-production-21` active | ✓ PASS |
| Fly releases | `fly releases -a alle-drops-quiz-app` | v46, v47 complete | ✓ PASS |
| PR merged to main | `gh pr view 16` | MERGED, `a0d8ce0` | ✓ PASS |
| Live product handles | authenticated GET ×4 | 200/200 correct, 404/404 misspelled | ✓ PASS |
| Live redirect targets | authenticated GET ×4 | test-options 200, consult product 200, `/pages/consult` **404**, `/pages/testing-options` **404** | ✓ PASS |
| Rendered storefront handler | authenticated GET, node counts | all 11 guard strings present ×1 each | ✓ PASS |

### Contract-test non-vacuity (proven, not assumed)

I reverted each target file to its pre-phase state and re-ran its contract test:

| Test | Reverted to | Result | Verdict |
|---|---|---|---|
| `tests/entry-theme-contract.test.ts` | `14e13ff^` | **6 failed / 6** | Non-vacuous. Confirms STATE.md's claim |
| `tests/liquid-block-contract.test.ts` + `tests/quiz-embed-contract.test.ts` | `0cae8b3` (2026-07-01) | **25 failed / 3 passed of 28** | Non-vacuous |

Working tree restored clean after each check (`git status` verified).

**Could any gate have passed vacuously?** The three that could have — the bundle string counts, the
storefront page-existence checks, and the contract tests — were each re-run with a method that
defeats the vacuity mode: node occurrence counts instead of `grep -c`; an authenticated cookie
instead of the password-page 200; and a reverted-file control instead of a green-only run. All three
still pass.

---

## Requirements Coverage

| Requirement | Source plan | Description | Status | Evidence |
|---|---|---|---|---|
| DEF-01 | 01-03, 01-04, 01-05, 01-06 | Parent scroll-to-top listener | ✓ SATISFIED | Listener live in rendered page; child post live in bundle; desktop motion measured at checkpoint |
| DEF-02 | 01-01, 01-02, 01-03, 01-04, 01-05, 01-06 | Parent navigation for all in-quiz redirects | ✓ SATISFIED | Override deleted, 5 exits routed, both live targets 200, hostile targets rejected by a validator proven non-vacuous |
| DEF-03 | 01-01, 01-02, 01-03, 01-04, 01-05, 01-06 | Correct product handles | ✓ SATISFIED | 200/200 correct vs 404/404 misspelled, measured authenticated |
| DEF-04 | 01-02, 01-04, 01-05, 01-06 | Medication label copy, required-ness kept | ✓ SATISFIED | Label exact in source and live bundle; `(required)` count 0; enforcement tested three ways |

**Orphaned requirements: none.** `REQUIREMENTS.md` maps exactly DEF-01..DEF-04 to Phase 1, and all
four are claimed by plans. No Phase 1 requirement is unclaimed.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/lib/quiz/html-safe.ts` | 21 | `XXXX` | ℹ️ INFO — **false positive** | The token is the `\uXXXX` escape-form notation inside a doc comment. Not a debt marker. Explicitly cleared against the debt-marker gate |

**No `TBD`, `FIXME`, `TODO`, `HACK`, or `PLACEHOLDER` markers exist in any source file this phase
modified.** The debt-marker gate passes.

**PHI compliance (CLAUDE.md rules 1–6):** the two `console.warn` calls added by this phase
(`QuizContainer.tsx:94`, `symptom-quiz.liquid:150`) log **navigation targets only**. No name, DOB,
email, phone, score, bracket, answers, or history is logged. The PHI compliance block at the top of
`CLAUDE.md` was preserved intact through the 01-04 edit. **Phase 1 adds zero third-party scripts and
zero dependencies** — rule 4 is not regressed by this phase.

---

## Warnings — documentation defects (none block Phase 2)

| # | Finding | Impact |
|---|---|---|
| W1 | **`.planning/STATE.md` Current Position is badly stale.** Frontmatter says `status: executing`, `stopped_at: Phase 1 context gathered`, `completed_phases: 0`, `completed_plans: 0`, `percent: 0`; the body says "Phase: 01 — EXECUTING / Plan: 1 of 6". ROADMAP.md marks Phase 1 `[x]` completed with all 6 plans `[x]`. | Will mislead `/gsd-next` and any pre-flight audit into re-running Phase 1. Highest-value fix in this list |
| W2 | **`.planning/STATE.md` Deferred Items row "Dead code — `app/entry.theme.tsx`'s `injectIframe()`" is now false** and contradicts the same file's own body at lines 152–175. It still says the handler is "correct code on an unreachable path", still describes the unguarded `location.assign(String(e.data.url))`, and still says "deliberately untouched in Phase 1". All three are now wrong — the file was hardened in `14e13ff`. | This is the exact stale-assessment mechanism that let the live open redirect survive two reviews. Leaving it in the live planning doc invites a repeat in Phase 8 |
| W3 | **`REQUIREMENTS.md` still marks DEF-01..04 as `Pending`** in the Traceability table and leaves all four checkboxes unchecked, while ROADMAP marks the phase complete. | Traceability drift |
| W4 | **Stale comment in shipped code:** `symptom-quiz.liquid:55-61` still explains that "`.handle` is used explicitly rather than relying on the backwards-compatibility behaviour" and that `.url` is deliberately avoided. Both settings are now plain `text` handles; `.handle` is not used. | Misleading prose in a file no linter or typechecker reads. The contract test guards the behavior, so this is documentation only |
| W5 | **`01-RESEARCH.md:821` is disproven.** It claims `/` + backslash "stays same-origin". I measured `new URL("/\\evil.com", "https://shop.example.com").origin === "https://evil.com"`. | The shipped code is correct (it rejects the pattern); only the research doc is wrong |
| W6 | **`01-VALIDATION.md` page-existence checks were vacuous.** They were unauthenticated, and I reproduced the exact failure: a nonexistent product handle returns 200 unauthenticated. | Two of its entries were false positives; STATE.md already carries the corrected inventory |
| W7 | **Plan key-link patterns are stale in two places** — `01-02` expects `tnProductHandle: ${JSON.stringify` (now `jsonForScript`, the CR-01 fix) and `01-03` expects `.handle` piped through `url_encode` (now a `text` setting). Both changes are improvements. | Would produce false negatives if key-link patterns were re-run mechanically |

---

## Explicitly NOT closed by Phase 1

**A green Phase 1 must not be read as a clean patient-facing page.** Each of the following was
independently re-measured today, not carried over from the summaries:

1. **Klaviyo still loads on the PHI-collecting page.** The rendered `/pages/allergy-quiz` contains
   `<script async src="https://static.klaviyo.com/onsite/js/SzY6kF/klaviyo.js?company_id=SzY6kF">`.
   `klaviyo` appears **10** times (STATE.md recorded 4 — the count grew, or the earlier count was
   scoped differently). The theme's `config/settings_data.json` shows the Klaviyo app embed
   `disabled: false`, site-wide. Direct violation of `CLAUDE.md` rule 4. **Phase 8 / LAUNCH-01.**
   Phase 1 adds zero scripts, so nothing in it could have closed this.
2. **The live clinical intake page carries no medical disclaimer at all.** `disclaimer` appears
   **0** times in the rendered page. Not a placeholder problem — an absence problem. Phase 1 did not
   touch the disclaimer schema. **Phase 8 / LAUNCH-03**, counsel-owned.
3. **`?test=1` still enables Test Mode regardless of the merchant checkbox** (WR-13). Re-confirmed
   against production: `GET /quiz-embed?test=1` → `testMode: true`. The block itself correctly ships
   `test=0`. Patient-facing.
4. **Duplicate PHI rows on the 3-6 and 7+ brackets** (WR-09). Re-confirmed in code: no in-flight
   submit guard exists, and `savedToServer` is consulted only for the `0-2` bracket
   (`QuizContainer.tsx:255`). Patient-facing. STATE.md records Phase 4 / TEST-05 removing it for free
   — but until then it is live.
5. **The Apntly appointment-booking app embed is `disabled: false`** site-wide in the theme, though
   `apntly` appears 0 times in the rendered quiz page. Needs an explicit keep/disable decision.
6. **14 code-review warnings remain open** in `01-REVIEW.md`. Both blockers (CR-01, CR-02) are
   closed and I verified both against production.

---

## Human Verification Required

### 1. Mobile sticky-header clearance

**Test:** On a ~390px-wide viewport, open
`https://allergist-on-demand.myshopify.com/pages/allergy-quiz` (storefront password `allergy`) and
advance one quiz step.
**Expected:** The first question of the new step is fully visible, not covered by the Sense sticky
header.
**Why human:** `scroll-margin-top` is hardcoded at 100px. Gate F measured clearance on desktop only
(iframe top 100px vs header bottom 88px). No mobile measurement exists anywhere in the phase record,
and the Sense sticky header height differs at mobile breakpoints. This is a layout outcome and is not
derivable from source.

### 2. PHI cleanup counts

**Test:** Via `fly ssh console -a alle-drops-quiz-app`, run a `pg` script issuing `COUNT(*)` only.
**Expected:** `submissions` total is 42, and
`SELECT COUNT(*) FROM submissions WHERE patient_email = 'diag+preflight@example.com'` returns 0.
**Why human:** This machine's IP is not on the Cloud SQL authorized-networks list, so the verifier
cannot reach the database. The recorded counts are internally consistent
(`orphan_pre=1 orphan_post=0`, table 43→42, difference of exactly 1) but were not independently
re-derived. Select no PHI field values.

*Both items are non-blocking. Neither affects any ROADMAP success criterion, and neither should hold
Phase 2.*

---

## Gaps Summary

**No gaps.** Every ROADMAP success criterion is verified against live production surfaces rather than
against SUMMARY.md claims, and every claim I could independently re-derive, I did — including the
three that the briefing warned could have passed vacuously.

The phase's most important outcome is not in any plan: `app/entry.theme.tsx` carried a live,
verified-exploitable open redirect on a PHI-collecting origin, which Plan 01-04 and the code review
had both classified as dead code. That assessment was wrong because a correct measurement of the
storefront entry path was generalised into a claim about all entry paths — `/quiz-embed` loaded
top-level runs `injectIframe`, not `mountReact`. The fix imports the canonical validator rather than
adding a fifth hand-port, and I proved its contract test non-vacuous by reverting the file (6/6
assertions fail against the pre-fix version).

The one must-have not met as written — the searchable product picker — was impossible on the Shopify
platform and its replacement is better: the handles now ship as schema defaults and reach the live
`_embed_src` with no theme-editor step, which I confirmed on the rendered page. That question had
been recorded as unverified in STATE.md's own Deferred Items; this verification settles it. An
override is recommended so the item stops re-surfacing.

Status is `human_needed` rather than `passed` solely because of two non-blocking observations neither
I nor the phase record covered: mobile scroll clearance, and an independent read of the PHI row
counts.

---

_Verified: 2026-07-30T17:55:00Z_
_Verifier: Claude (gsd-verifier) — goal-backward, FORCE stance_
