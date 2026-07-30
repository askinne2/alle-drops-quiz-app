# Phase 1: Live Defect Fixes - Research

**Researched:** 2026-07-30
**Domain:** Shopify theme app extension ↔ cross-origin iframe postMessage contract; theme block schema settings; deploy-artifact provenance verification
**Confidence:** HIGH (all four defects re-confirmed live; both Shopify schema questions answered from official docs; the open handle question is now closed)

## Summary

The four diagnosed defects were re-confirmed against the **live storefront** on 2026-07-30 (not
re-derived — verified as still-present). Three things changed materially as a result of this session:

1. **The open question in CONTEXT.md is closed.** The storefront password (`allergy`, recorded at
   `HANDOFF.md:443`) yields a working `_shopify_essential` session cookie via a plain `curl` POST to
   `/password`. With that cookie: `tennessee-alledrops` → **200**, `texas-alledrops` → **200**,
   `tennessee-allerdrops` → **404**, `texas-allerdrops` → **404**. D-11's corrected spelling is
   confirmed against the live store. Canonical product IDs recorded below.

2. **A fifth live defect was found that will make ROADMAP success criterion #2 fail even after a
   perfect code fix.** The installed app block passes
   `testOptions=%2Fproducts%2Fallergy-consultation` — the *same* value as `consult`. The
   `test_options_redirect_url` block setting is misconfigured in the live theme. `/pages/test-options`
   exists and returns 200, so this is a one-field theme-editor correction, not code. Without it,
   "Test First" will navigate correctly (fixing DEF-02) to the *wrong page*.

3. **D-11's "the corrected values also become the schema defaults" is not achievable.** Shopify
   input settings of `type: product` **do not support the `default` attribute** — confirmed in
   official docs. Both new pickers will therefore be **blank on the day of deploy**, which means
   `product-links.ts` is not a belt-and-braces fallback: it is the live production path until William
   opens the theme editor and selects the products.

The phase's real risk is not the code — each fix is a handful of lines with an already-proven
mechanism (`quiz:resize` works end to end). The risk is **verification**, because this phase ships
across **three independent delivery channels** with three different freshness characteristics, and
the repo has a documented false-positive-verification incident (session 28/29) caused by exactly that
divergence.

**Primary recommendation:** Treat this as one code change with a three-channel deploy and a
decomposed verification strategy. Put the canonical path validator in `app/lib/quiz/navigation.ts`
(node-testable), hand-port ~10 lines into the Liquid block, and add a **Liquid-file content
assertion test** in vitest that fails if the scroll listener or origin guard is ever missing from
`symptom-quiz.liquid`. Verify the parent handler contract by dispatching synthetic `postMessage`
calls from the iframe's own DevTools console — this exercises the real `e.origin` accept path, proves
all of DEF-01 and the parent half of DEF-02, and writes **zero PHI rows**. Reserve real button
click-throughs for the child half, and budget for the PHI rows they necessarily write.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resolving a navigation target to a storefront URL | **Shop storefront page (Liquid app block)** | — | Only the parent knows the shop origin with certainty. `shopUrl` is empty in the child (documented trap). D-01. |
| Deciding *that* navigation should happen, and to which path | **Iframe app (React, `QuizContainer`)** | — | Business logic lives with the flow state. Posts a relative path only. |
| Trust boundary enforcement (`e.origin`, same-origin path) | **Shop storefront page (Liquid app block)** | — | The receiver must not trust the sender. Cannot be enforced in the child. D-05. |
| Scrolling the page on step change | **Shop storefront page (Liquid app block)** | — | The iframe is `scrolling="no"`; the parent document is the only scroller. D-06/D-07. |
| Merchant configuration of product targets | **Shopify theme editor (block settings)** | Code fallback in `app/lib/quiz/product-links.ts` | D-09/D-10. Fallback is load-bearing because `product` settings have no defaults. |
| Passing merchant config into the app | **Liquid `_embed_src` query params → `quiz-embed.tsx` loader → `window.AlleDropsQuizConfig`** | — | Existing, working precedent. D-12. |
| Question label copy | **Iframe app (`app/lib/quiz/questions.ts`)** | — | DEF-04. Static content in the bundle. |
| Required-ness enforcement | **Iframe app (`QuizPartRenderer.isPartComplete`)** | — | Deliberately separate from the label. D-13. |

**Anti-pattern to avoid, specific to this codebase:** putting any parent-side fix in
`app/entry.theme.tsx`. That file's `injectIframe()` handler is correct and complete — and never runs
in production. Confirmed again this session: the live page contains the Liquid inline script
byte-for-byte, and `grep -c scrollToTop` on the live storefront HTML returns **0**.

## Project Constraints (from CLAUDE.md)

These carry the same authority as locked decisions. All are directly relevant to this phase.

| Constraint | Source | Bearing on Phase 1 |
|------------|--------|--------------------|
| **Never add third-party scripts to any PHI-collecting page** | `CLAUDE.md:8`, `:145` | The Liquid block script is on a PHI page. Add no libraries — vanilla JS only. |
| **Never write PHI to Shopify metafields or Admin API payloads** | `CLAUDE.md:6` | No metafield work in this phase. |
| **Always work on a feature branch; never commit to `main`** | `CLAUDE.md:128` | Branch name per convention: `fix-<description>`. |
| **Push the branch and propose a PR; Andrew reviews and merges** | `CLAUDE.md:130` | Do not merge. Do not deploy from a branch. |
| **`fly deploy` runs against `main` after merge** | `CLAUDE.md:133` | Deploy is post-merge. Claude may deploy with Andrew's authorization. |
| **Tests must pass before pushing: `npm run typecheck && npm test`** | `CLAUDE.md:132` | 51/51 is the floor. Re-verified this session: 51 passed / 10 files / 519ms. |
| **If tests don't exist for the change, write them** | `CLAUDE.md:132` | Directly drives the Validation Architecture section below. |
| **PR-style review required for HIPAA-relevant changes** | `CLAUDE.md:131` | This phase does not touch `api.*`, `db.ts`, `submissions.ts`, or auth — but the D-14 click-through **writes PHI rows**, which the PR must disclose. |
| **Ask before introducing a new third-party dependency** | `CLAUDE.md:144`, `:198` | Rules out adding `jsdom` / `@testing-library` casually. See Validation Architecture. |
| **`shopify app deploy` does not deploy the Fly app** | `CLAUDE.md:149` | The single most important pitfall for this phase. Two deploys required. |
| **No `console.log` of PHI** | `CLAUDE.md:139` | Any diagnostic logging added during verification must be removed before PR. |

> **⚠ Documented discrepancy, not a blocker.** `CLAUDE.md:13` states *"THIS IS NOT a GSD project.
> never try to start GSD."* — but `.planning/` exists with a full GSD scaffold, and this phase was
> produced by `/gsd:discuss-phase`. The user has evidently superseded that line. **Recommend the
> planner include a task to delete or amend `CLAUDE.md:13`**, because it will keep tripping every
> future agent that reads the file. `[VERIFIED: read CLAUDE.md:13 and .planning/ tree this session]`

## User Constraints (from CONTEXT.md)

### Locked Decisions

**URL resolution ownership**

- **D-01: The parent resolves URLs, not the child.** The iframe posts a **relative path** (e.g. `/pages/test-options`) in the `quiz:navigate` message. The Liquid app block resolves it against its own `window.location.origin`, which is inherently the shop origin. Chosen because the parent already knows the shop origin with certainty, no new query parameter is needed, and it enables same-origin validation (D-05).

- **D-02: Delete the `window.location.assign` override entirely.** `app/routes/quiz-embed.tsx:57-59` reassigns `window.location.assign`, but `Location.assign` is a `[LegacyUnforgeable]` own property — non-writable and non-configurable. In the sloppy-mode inline script the assignment fails **silently** (verified in Chrome: descriptor is `{writable:false, configurable:false}`, no throw). Replace with an explicit `navigateParent(path)` helper. Do not attempt to make the override work.

- **D-03: The anchor click interceptor has the same origin bug and must be fixed in the same change.** `quiz-embed.tsx:70` resolves `new URL(href, window.location.href)` — and `window.location.href` is the **Fly origin**, not the shop. So the product-page anchor currently posts `https://alle-drops-quiz-app.fly.dev/products/...` and the parent navigates the storefront off to the Fly domain. Change the interceptor to post the raw relative href and let the parent resolve it (D-01). **This corrects an earlier audit claim that the anchor path "works" — it does not.**

- **D-04: All five navigation exits must be fixed, not four.** Four `window.location.assign` call sites plus the anchor. Full list:
  - `app/components/quiz/QuizContainer.tsx:215` → consult
  - `app/components/quiz/QuizContainer.tsx:228` → test options
  - `app/components/quiz/QuizContainer.tsx:248` → test options
  - `app/components/quiz/QuizContainer.tsx:328` → `/` (Return Home)
  - `app/components/quiz/QuizContainer.tsx:335` → `/products/{handle}` (anchor)

**postMessage trust boundary**

- **D-05: Harden the parent message handler in this phase.** `extensions/quiz-block/blocks/symptom-quiz.liquid:59-67` currently checks neither the sender origin nor the payload, and will `window.location.assign()` any URL it receives — an open redirect on a patient-facing storefront. Since these exact lines are being rewritten anyway, add both guards:
  1. Verify `e.origin` matches the configured app URL (`block.settings.app_url`, defaulting to the Fly origin).
  2. Accept **only same-origin relative paths** for navigation. Reject absolute URLs, protocol-relative URLs (`//evil.com`), and anything resolving off-origin.
  Apply the origin check to the `quiz:resize` handler too — it currently sets iframe height from any sender.

**Scroll behavior**

- **D-06: Scroll to the top of the iframe, instantly.** `iframe.scrollIntoView({ block: "start" })` with no `behavior: "smooth"`. Rationale: lands the patient on the first question of the new step, and instant avoids a visible glide firing on every Next across seven steps. Do NOT scroll to the section wrapper — that would re-show the H1 and medical disclaimer on every step change.

- **D-07: The fix goes in the Liquid app block, not `app/entry.theme.tsx`.** The app-block embed path is what is installed on the live theme (confirmed 2026-07-29 in the theme editor: the block appears under Template → Apps with its own settings panel). `app/entry.theme.tsx:69-71` already handles `quiz:scrollToTop` correctly, but that code runs only in the bundle-injection embed path, which is not in use. Mirror its behavior into `symptom-quiz.liquid` — minus the smooth behavior, per D-06.

- **D-08: The app side of scroll needs no change.** `QuizContainer.tsx:111-122` already posts `quiz:scrollToTop` on every `step` / `currentPartIndex` change, and the message is present in the shipped `public/quiz-bundle.js`. This is a missing-listener defect only.

**Product handles**

- **D-09: Product handles move from code to merchant-editable block settings.** Currently hardcoded in `app/lib/quiz/product-links.ts:2-5` and imported into `QuizContainer.tsx:335` at build time, so a wrong handle requires a deploy to fix.

- **D-10: Use Shopify's product picker (`"type": "product"`), not a text field.** Gives William a searchable dropdown of products that actually exist. Typos become impossible, it self-heals when a handle is renamed in admin, and — importantly — **it eliminates the open "verify handle spelling against the live store" item**, because he selects from real products rather than typing a string. Two settings needed: Tennessee product, Texas product.

- **D-11: Keep `product-links.ts` as the fallback default.** If a setting is blank, fall back to the hardcoded map. Correct the spelling there too — `tennessee-allerdrops` / `texas-allerdrops` should be `tennessee-alledrops` / `texas-alledrops`. The corrected values also become the schema defaults. Note this spelling is still **unverified** against the live store (see Open Questions).

- **D-12: Handles reach the app the same way redirects already do.** `_embed_src` in `symptom-quiz.liquid:46` already passes `consult`, `testOptions`, and `test` as query params. Add the two resolved product handles the same way; `quiz-embed.tsx` reads them into `window.AlleDropsQuizConfig`; `QuizContainer` prefers config over the imported map. Follow the existing `consultRedirectUrl` / `testOptionsRedirectUrl` pattern exactly — do not invent a new mechanism.

**Copy**

- **D-13: Drop the `(required):` suffix, keep the enforcement.** `app/lib/quiz/questions.ts:198` must read exactly "Please list your current allergy medications and dosages". The required-ness lives separately in `isPartComplete` (`QuizPartRenderer.tsx:296-298`) and must continue to work. Verify with a test that the field still blocks progression when empty.

**Verification**

- **D-14: Verify against rendered DOM, not deploy success.** A prior session (28) was burned by treating a successful `fly deploy` plus matching HTTP headers as proof a fix was live — the app was healthy but serving a stale static file the build never touched. Every success criterion in this phase must be confirmed in a real browser against the live storefront quiz page, including a click-through of each of the five navigation exits.

> **Research correction to D-11.** The clause *"The corrected values also become the schema defaults"*
> cannot be implemented as written: Shopify `type: product` settings do not accept a `default`
> attribute. See "Shopify Block Schema" below. The corrected values live in `product-links.ts` only.
> Everything else in D-11 stands, and the fallback becomes **more** important, not less.

> **Research correction to D-11's Open Question.** *"The live product handle spelling is still
> unverified"* — **now verified.** See "Product Handle Verification" below.

### Claude's Discretion

- The exact shape of the `navigateParent(path)` helper and where it lives.
- Whether the same-origin validation is a shared helper or inline in the Liquid script.
- Test structure and placement, provided the existing 51/51 continue to pass.
- Whether the corrected fallback handles ship as a separate commit from the settings work.

### Deferred Ideas (OUT OF SCOPE)

- **Restore the `X-Shopify-Shop-Domain` submission header.** `QuizContainer.tsx:60` sets it only when `cfg.shopUrl` is truthy, and `shopUrl` is always empty because `?shop=` is never passed. Every submission since the app-block embed shipped has gone without it. Not in DEF-01..04, and D-01 deliberately avoids needing a shop param for navigation. Needs its own assessment: determine whether `api.quiz.submit.tsx` depends on that header before deciding priority.
- **Remove the `/pages/consult` 404.** `docs/STOREFRONT_CONTENT_AUDIT.md:182-184` records the fallback destination as missing. The block's `consult_redirect_url` setting is populated ("Allergy Consultation") so the configured path likely resolves — but the hardcoded fallback does not. Belongs with Phase 7 (TELE-01), which owns making the consult page real.
- **Test Mode button live on the production Shopify page.** Flagged in `docs/UX-AUDIT.md`. The block setting defaults to `false` and the live theme shows it off, so this may already be resolved — but it is a patient-facing exposure and Phase 8 (LAUNCH-02) owns confirming it.
- **Delete `app/lib/quiz/product-links.ts` once settings are proven.** D-11 keeps it as fallback for now. Revisit after the picker has been live long enough to trust.
- **Retire the vestigial `googleSheetsWebAppUrl` field** at `app/lib/quiz/types.ts:67` — dead config left from the removed Sheets path. Docs cleanup lives in Phase 8 (LAUNCH-08).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DEF-01** | Parent storefront page scrolls to top of quiz on every step change | Confirmed live: `grep -c scrollToTop` on the fetched storefront HTML = **0**; served bundle contains `quiz:scrollToTop` ×2. Pure missing-listener. Fix pattern in "Code Examples → Pattern 1". Sense-theme sticky-header interaction documented in Pitfall 4. |
| **DEF-02** | All in-quiz redirects navigate the parent, not the iframe | Confirmed live: `window.location.assign = function` present ×1 in served `/quiz-embed`; `new URL(href, window.location.href).href` present. Five exits enumerated by grep (see "Exit Inventory"). Validator design in "Code Examples → Pattern 2/3". **Blocker found:** live `testOptions` setting points at the wrong page (see "Live Configuration Defect"). |
| **DEF-03** | AlleDrops product link resolves to a live product page in both states | **Closed.** Correct handles verified 200 / wrong handles verified 404 against the live store 2026-07-30. Schema shape for the product picker verified from official docs, including the no-`default` constraint that makes the code fallback load-bearing. |
| **DEF-04** | Medication label reads exactly "…and dosages" with required-ness intact | Confirmed live: `and dosages (required)` present ×1 in the served bundle. `isPartComplete` enforcement at `QuizPartRenderer.tsx:296-298` is independent of the label string — a label-only edit cannot break it, and a test asserting both is trivial in the existing node-only vitest setup. |

## Live State Verified This Session (2026-07-30)

All checks run against the live, password-protected storefront and the live Fly app.

### Storefront access

```bash
# Password session — yields _shopify_essential (NOT the legacy storefront_digest)
curl -s -c cj.txt -X POST "https://allergist-on-demand.myshopify.com/password" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "form_type=storefront_password" \
  --data-urlencode "utf8=✓" \
  --data-urlencode "password=allergy"
# → 302 to https://allergist-on-demand.myshopify.com/   (302 back to /password would mean failure)

# Then reuse with -b cj.txt on every subsequent request.
```

`[VERIFIED: executed this session]` Password `allergy` from `HANDOFF.md:443`. The cookie captured is
`_shopify_essential`, not the `storefront_digest` cookie described in older community write-ups —
those are dated. Do not build tooling on `storefront_digest`.

### Product Handle Verification — DEF-03 open question CLOSED

| Handle | HTTP | Verdict |
|--------|------|---------|
| `tennessee-alledrops` | **200** | ✅ correct — id `7624809840846`, title "Tennessee - AlleDrops" |
| `texas-alledrops` | **200** | ✅ correct — id `7601816862926`, title "Texas - AlleDrops" |
| `tennessee-allerdrops` | **404** | ❌ current code value (`product-links.ts:3`) |
| `texas-allerdrops` | **404** | ❌ current code value (`product-links.ts:4`) |

`[VERIFIED: curl against live storefront with password session; canonical handle + id read from /products/<handle>.js]`

D-11's corrected spellings are correct. The May 8 audit (`STOREFRONT_CONTENT_AUDIT.md:58,76`) was right.

### Storefront page inventory

| Path | HTTP | Note |
|------|------|------|
| `/pages/allergy-quiz` | 200 | The quiz page. Theme: **Sense 15.4.1**, live theme id `135799767246`. |
| `/pages/test-options` | 200 | Exists — and is **not** what the block is configured to send patients to. |
| `/pages/consult` | **404** | Still 404. Deferred to Phase 7 (TELE-01). Only reachable via the hardcoded `|| "/pages/consult"` fallback, which the live setting overrides. |
| `/products/allergy-consultation` | 200 | What both redirect settings currently point at. |

### ⚠ Live Configuration Defect — will fail ROADMAP success criterion #2

The live app block renders this iframe `src`:

```
https://alle-drops-quiz-app.fly.dev/quiz-embed?consult=%2Fproducts%2Fallergy-consultation&testOptions=%2Fproducts%2Fallergy-consultation&test=0
```

Decoded:

| Param | Value | Assessment |
|-------|-------|------------|
| `consult` | `/products/allergy-consultation` | Reasonable — the $99 consult product. Resolves 200. |
| `testOptions` | `/products/allergy-consultation` | **WRONG.** Should be `/pages/test-options`. Almost certainly a theme-editor copy-paste. |
| `test` | `0` | Test Mode is **off** in production. Supports the LAUNCH-02 deferred note. |

`[VERIFIED: curl + grep of live /pages/allergy-quiz HTML this session]`

**Consequence:** ROADMAP success criterion #2 requires *"'Test First' … navigate the parent
storefront page to the **correct** storefront URL."* Fixing DEF-02 makes the navigation *work*; it
will then work its way to the wrong destination. `QuizContainer.tsx:228` and `:248` read
`getRedirectUrl("testOptions")` and only fall back to `/pages/test-options` when the setting is
blank — and it is not blank.

**This must be a task in the plan.** It is a one-field theme-editor change (Online Store → Customize
→ the quiz page → Apps → AlleDrops Symptom Quiz → Redirects → Test options redirect URL →
`/pages/test-options`). It is human-owned and cannot be done from this repo. Recommend a
`checkpoint:human-verify` gate that blocks the DEF-02 success claim until the live `_embed_src`
shows `testOptions=%2Fpages%2Ftest-options`.

### Extension deploy state — in sync

The inline script on the live page is **byte-identical** to `symptom-quiz.liquid:56-69`:

```js
(function() {
        var iframe = document.getElementById('alledrops-quiz-AY3ZzaUJLUXRrcU51d__alledrops_quiz_production_symptom_quiz_igLDNJ');
        window.addEventListener('message', function(e) {
          if (!e.data || typeof e.data !== 'object') return;
          if (e.data.type === 'quiz:resize' && iframe) {
            iframe.style.height = (e.data.height + 24) + 'px';
          }
          if (e.data.type === 'quiz:navigate' && e.data.url) {
            window.location.assign(e.data.url);
          }
        });
      })();
```

`[VERIFIED: extracted from live storefront HTML this session]` No `quiz:scrollToTop` branch (DEF-01),
no origin check, no payload validation (D-05's open redirect). This is a clean pre-fix baseline: a
post-deploy re-fetch of this exact script is the definitive proof that `shopify app deploy` shipped.

Note the rendered `block.id` is a long opaque string
(`AY3ZzaUJLUXRrcU51d__alledrops_quiz_production_symptom_quiz_igLDNJ`) — `getElementById` handles it
fine, but do not assume it is short or stable. Shopify also wraps the block in
`<div id="shopify-block-{{ block.id }}" class="shopify-block shopify-app-block">`; that wrapper (and
Sense's `<div class="scroll-trigger animate--slide-in">` above it) is what D-06 says **not** to
scroll to.

### Bundle state and freshness baseline

```
GET https://alle-drops-quiz-app.fly.dev/quiz-bundle-js
  → 200, cache-control: public, max-age=300
  → NO etag, NO last-modified
  → 183691 bytes  (identical byte-length to local public/quiz-bundle.js)
```

String markers in the **served** bundle:

| Marker | Count | Meaning |
|--------|-------|---------|
| `quiz:scrollToTop` | 2 | D-08 confirmed — app side already posts it |
| `tennessee-allerdrops` | 1 | DEF-03 live |
| `tennessee-alledrops` | 0 | fix not yet shipped |
| `and dosages (required)` | 1 | DEF-04 live |
| `None of the above` | 4 | session 28's fix is live (was 1 pre-fix) |

`[VERIFIED: curl + grep this session]`

**The absence of `etag` and `last-modified` on both bundle routes is the crux of the freshness
problem.** There is no conditional-request or timestamp mechanism to lean on. Content assertion is
the only reliable check — which is precisely the technique that finally worked in session 28
(`"None of the above"` occurrence count 1 → 4).

## Standard Stack

**No new runtime dependencies.** Every fix uses platform APIs already in use in this repo.

### Core (already installed — versions verified in `package.json` this session)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | ^3.2.4 | Test runner | Already the suite runner. Config at `vitest.config.ts`: `environment: "node"`, `include: ["app/**/*.test.ts","tests/**/*.test.ts"]`. |
| `react` / `react-dom` | ^18.3.1 | Quiz UI | Unchanged this phase. |
| `vite` | ^6.3.6 | `build:theme` bundler | Unchanged. |
| Shopify CLI | 3.94.3 | `shopify app deploy`, `shopify app versions list` | `[VERIFIED: npx shopify version this session]` |

### Platform APIs used (no packages)

| API | Purpose | Notes |
|-----|---------|-------|
| `window.postMessage` / `MessageEvent.origin` | The trust boundary | `e.origin` is browser-supplied and **cannot be forged** by the sender. This is what makes D-05's guard meaningful. |
| `new URL(path, origin)` | Same-origin path resolution | Available in every target browser. Throws on malformed input — must be wrapped in try/catch. |
| `Element.scrollIntoView({ block: "start" })` | D-06's scroll | Instant by default (`behavior` defaults to `"auto"`, which is instant unless CSS `scroll-behavior: smooth` is set). See Pitfall 5. |
| CSS `scroll-margin-top` | Sticky-header offset | Honoured by `scrollIntoView`. Preferred over JS offset math. See Pitfall 4. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-ported inline JS in Liquid | A built JS asset in `extensions/quiz-block/assets/` referenced via the `javascript` schema attribute or `asset_url` | Eliminates duplication and makes the parent logic directly unit-testable. **Rejected for this phase:** adds a fourth build artifact to a pipeline with a documented stale-artifact incident, and the extension currently has no `assets/` directory at all. Revisit in Phase 6 when a second block is added. `[CITED: shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration — "All files inside the assets/ folder are automatically served from Shopify's CDN … Reference your assets by using either the javascript and stylesheet schema attributes or using the asset_url … filters"]` |
| Node-only vitest | Add `jsdom` + `@testing-library/react` | Would allow true DOM tests of the inline scripts. **Rejected:** CLAUDE.md:144/198 requires asking before adding dependencies to a HIPAA-audited repo, and it does not fit a 4-hour defect phase. Flag as a Phase 2 candidate. |
| `iframe.scrollIntoView()` | `window.scrollTo({ top: rect.top + scrollY - offset })` | More control over the sticky-header offset, but hand-rolls what `scroll-margin-top` does declaratively. Use only if `scroll-margin-top` proves insufficient. |
| Same-origin-only path validation | Allow an explicit merchant-configured absolute-URL allowlist | See "Open Questions" — Phase 7's booking flow may need an off-site URL, which D-05 as written forbids. |

**Installation:** none required.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.**

Every fix uses (a) code already in the repo, (b) browser platform APIs, or (c) Shopify's own theme
schema. No `npm install` is expected in any task. `slopcheck` was therefore not run.

If the planner concludes a test-environment package is needed after all (`jsdom` being the only
plausible candidate), that decision must go through CLAUDE.md's ask-before-adding-a-dependency rule
**and** a Package Legitimacy Gate pass before install.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────────┐
   Patient's browser    │  https://allergist-on-demand.myshopify.com  │
                        │            /pages/allergy-quiz              │
                        └─────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │  PARENT DOCUMENT  (Sense 15.4.1 theme)        │
                    │  the ONLY scroller — iframe is scrolling="no" │
                    │                                               │
                    │  <sticky-header data-sticky-type=on-scroll-up>│
                    │  <div class="scroll-trigger animate--slide-in">
                    │    <div id="shopify-block-{block.id}">        │
                    │      ← DO NOT scroll here (D-06): re-shows    │
                    │        H1 + medical disclaimer                │
                    │      <iframe id="alledrops-quiz-{block.id}">  │
                    │        ← scroll target                        │
                    │                                               │
                    │  ┌─────────── inline <script> ──────────────┐ │
                    │  │ message handler  ← ALL PARENT FIXES HERE │ │
                    │  │                                          │ │
                    │  │  ① guard: e.origin === APP_ORIGIN ───────┼─┼─► reject & return
                    │  │        (browser-supplied, unforgeable)   │ │
                    │  │  ② quiz:resize   → iframe.style.height   │ │
                    │  │  ③ quiz:scrollToTop → scrollIntoView     │ │   ← DEF-01
                    │  │  ④ quiz:navigate → safePath(e.data.path) │ │   ← DEF-02
                    │  │        └ reject absolute / //host / :    ─┼─┼─► reject & return
                    │  │        └ new URL(p, location.origin)     │ │
                    │  │        └ assert .origin === location.origin
                    │  │        └ window.location.assign(resolved)│ │
                    │  └──────────────────────────────────────────┘ │
                    └───────────────────────┬───────────────────────┘
                                            │
              iframe src (built in Liquid at symptom-quiz.liquid:46)
              ?consult=…&testOptions=…&test=…&tnProduct=…&txProduct=…   ← D-12 adds 2
                                            │
                                            ▼
      ┌────────────────────────────────────────────────────────────────────────┐
      │  CHILD DOCUMENT  https://alle-drops-quiz-app.fly.dev/quiz-embed        │
      │  Cache-Control: no-store   ← HTML always fresh on deploy               │
      │                                                                        │
      │  inline <script>  (quiz-embed.tsx loader template)                     │
      │    window.AlleDropsQuizConfig = { consultRedirectUrl, testOptions…,     │
      │                                   tnProductHandle, txProductHandle }    │
      │    ✗ DELETE: window.location.assign = fn   ← [LegacyUnforgeable] no-op │
      │    anchor click interceptor:                                            │
      │      preventDefault → post RAW relative href   ← D-03 fix (drop new URL)│
      │    ResizeObserver → post quiz:resize                                   │
      │                                                                        │
      │  <script src="/quiz-bundle-js">   Cache-Control: max-age=300           │
      │       no etag, no last-modified  ← content assertion is the only check  │
      │    ┌──────────────────────────────────────────────────────────────┐    │
      │    │ QuizContainer                                                │    │
      │    │   useEffect [step, currentPartIndex] → post quiz:scrollToTop │    │
      │    │       (already correct — D-08, no change)                    │    │
      │    │   5 exits → navigateParent(relativePath)  ← D-04            │    │
      │    │   product anchor href ← config handle ?? PRODUCT_HANDLE_BY_STATE
      │    └──────────────────────────────────────────────────────────────┘    │
      │    app/lib/quiz/navigation.ts  ← NEW, pure, node-testable              │
      └────────────────────────────────────────────────────────────────────────┘

  THREE DELIVERY CHANNELS — each must be independently proven live:
   A. symptom-quiz.liquid  ──► shopify app deploy  ──► Shopify CDN / theme render
   B. quiz-embed.tsx HTML  ──► fly deploy          ──► no-store, instantly fresh
   C. quiz-bundle.js       ──► fly deploy → Docker `npm run build:theme` ──► 300s cache
   D. (human) theme editor: 2 product pickers + testOptions correction
```

### Recommended file layout for the change

```
app/
├── lib/quiz/
│   ├── navigation.ts          # NEW — pure, exported, node-testable:
│   │                          #   toRelativePath(hrefOrPath): string | null
│   │                          #   isSafeRelativePath(path): boolean
│   │                          # This file is the SPEC for the Liquid port.
│   ├── navigation.test.ts     # NEW — the bulk of the new test surface
│   ├── product-links.ts       # EDIT — corrected handles (verified live)
│   └── questions.ts           # EDIT — :198 label
├── components/quiz/
│   └── QuizContainer.tsx      # EDIT — navigateParent() at 5 exits; config-first handle
└── routes/
    └── quiz-embed.tsx         # EDIT — delete override; interceptor posts raw href;
                               #        read + inject 2 new handle params
extensions/quiz-block/blocks/
└── symptom-quiz.liquid        # EDIT — origin guard, scroll listener, path validation,
                               #        2 product settings, 2 new _embed_src params
tests/
└── liquid-block-contract.test.ts   # NEW — reads the .liquid file, asserts guards present
```

### Pattern 1 — The parent message handler (DEF-01 + DEF-02 parent half + D-05)

```liquid
{%- comment -%} Resolve the app origin for the postMessage trust check {%- endcomment -%}
{%- assign _app_origin = fly_url | split: '/' -%}
{%- assign _app_origin = _app_origin[0] | append: '//' | append: _app_origin[2] -%}

<script>
  (function() {
    var iframe = document.getElementById('alledrops-quiz-{{ block.id }}');
    var APP_ORIGIN = {{ _app_origin | json }};

    // Only accept a same-origin relative path. Mirrors app/lib/quiz/navigation.ts —
    // keep the two in sync; tests/liquid-block-contract.test.ts guards this block.
    function safeUrl(p) {
      if (typeof p !== 'string' || p === '') return null;
      if (p.charAt(0) !== '/') return null;        // rejects https://…, javascript:, mailto:
      if (p.charAt(1) === '/') return null;        // rejects //evil.com
      try {
        var u = new URL(p, window.location.origin);
        return u.origin === window.location.origin ? u.href : null;
      } catch (err) { return null; }
    }

    window.addEventListener('message', function(e) {
      if (e.origin !== APP_ORIGIN) return;                    // ← D-05 guard 1
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'quiz:resize' && iframe) {
        var h = Number(e.data.height);
        if (isFinite(h) && h > 0) iframe.style.height = (h + 24) + 'px';
      }

      if (e.data.type === 'quiz:scrollToTop' && iframe) {     // ← DEF-01
        iframe.scrollIntoView({ block: 'start' });            //   instant, per D-06
      }

      if (e.data.type === 'quiz:navigate') {                  // ← DEF-02
        var target = safeUrl(e.data.path);                    // ← D-05 guard 2
        if (target) window.location.assign(target);
      }
    });
  })();
</script>
```

`[ASSUMED]` — shape is mine; each API used is standard and each guard maps to a locked decision.
`e.origin` unforgeability and `new URL` semantics are `[CITED: WHATWG HTML/URL standards]`.

Two things to decide (Claude's discretion, but note them):

- **Message key name.** The current payload key is `url`. D-01 changes the semantics to a relative
  path, so **renaming the key to `path` is strongly recommended** — it makes an old cached bundle
  posting `{type:'quiz:navigate', url: 'https://…fly.dev/pages/…'}` fail *closed* against a new
  parent, instead of being silently rejected under a name that looks right. Given the 300 s bundle
  cache and the 3-channel deploy, this fail-closed asymmetry matters.
- **`_app_origin` derivation.** `block.settings.app_url` defaults to
  `https://alle-drops-quiz-app.fly.dev` (no path), so `fly_url` is already an origin in practice. The
  `split` above is defensive against a merchant pasting a trailing path. Simpler alternative: strip a
  trailing `/` with `| replace` and use as-is, accepting that a pasted path breaks the guard loudly.

### Pattern 2 — The pure validator (the testable core)

```ts
// app/lib/quiz/navigation.ts
// Canonical spec for what the parent will accept. The Liquid inline script in
// extensions/quiz-block/blocks/symptom-quiz.liquid is a hand-port of isSafeRelativePath.
// Keep them in sync — tests/liquid-block-contract.test.ts guards the port's presence.

/** True when `p` is a path the parent may resolve against its own origin. */
export function isSafeRelativePath(p: unknown): p is string {
  if (typeof p !== "string" || p === "") return false;
  if (p[0] !== "/") return false;   // absolute URLs, javascript:, mailto:, bare paths
  if (p[1] === "/") return false;   // protocol-relative //evil.com
  return true;
}

/** Normalise an anchor href or a code-supplied target to a safe relative path, or null. */
export function toRelativePath(hrefOrPath: unknown): string | null {
  return isSafeRelativePath(hrefOrPath) ? hrefOrPath : null;
}
```

Called from `QuizContainer`:

```ts
function navigateParent(path: string): void {
  if (typeof window === "undefined") return;
  const safe = toRelativePath(path);
  if (!safe) return;
  if (window.self !== window.top) {
    window.parent.postMessage({ type: "quiz:navigate", path: safe }, "*");
  } else {
    window.location.assign(safe);   // standalone / non-framed fallback
  }
}
```

`[ASSUMED]` — design proposal. The standalone `else` branch preserves current non-framed behavior
(`entry.theme.tsx` mounts React directly in a bare-div path that is not installed but still exists).

### Pattern 3 — Anchor interceptor, corrected (D-03)

```js
// quiz-embed.tsx inline template — post the RAW relative href.
// Was: url: new URL(href, window.location.href).href   ← resolved against the FLY origin
document.addEventListener('click', function(e) {
  var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  if (!el) return;
  var href = el.getAttribute('href');
  if (!href || href.charAt(0) !== '/' || href.charAt(1) === '/' || el.target === '_blank') return;
  e.preventDefault();
  window.parent.postMessage({ type: 'quiz:navigate', path: href }, '*');
});
```

Note this makes the interceptor **simpler** than today — no `new URL`, no origin knowledge. It also
means anchors with `#fragment`, `mailto:`, and absolute hrefs now fall through to default browser
behavior instead of being intercepted, which is correct.

### Anti-Patterns to Avoid

- **Fixing the parent side in `app/entry.theme.tsx`.** Correct code, wrong file, invisible in
  production. Re-confirmed live this session.
- **Trying to make `window.location.assign = fn` work.** `[LegacyUnforgeable]`, fails silently in
  sloppy mode. Delete it (D-02).
- **Scrolling to the `#shopify-block-…` wrapper or the `.symptom-quiz-wrapper`.** Re-shows the H1 and
  the medical disclaimer on every step (D-06). Target the `<iframe>`.
- **Reusing `window.AlleDropsQuizConfig.shopUrl`.** Always `''` in production — `?shop=` is never
  passed by the Liquid block. Documented trap in CONTEXT.md; re-confirmed by reading
  `symptom-quiz.liquid:46`.
- **Setting a `default` on a `product` setting.** Rejected by Shopify — see below.
- **Treating `fly deploy` success or a 200 on `/health` as proof.** `/health` returns static JSON and
  never touches the DB (`HANDOFF.md:51`); a green deploy shipped a stale bundle in session 28.
- **Asserting on `Cache-Control` headers as a freshness signal.** This exact reasoning produced the
  wrong conclusion in session 28 (`HANDOFF.md:132`).

## Shopify Block Schema — `"type": "product"` (Research Priority 2)

All findings `[CITED: shopify.dev/docs/storefronts/themes/architecture/settings/input-settings]` and
`[CITED: shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration]`, scraped this
session.

### The three facts that shape the implementation

1. **No `default` support.** Exact wording: *"Settings of type `product` are not updated when
   switching presets. `product` settings also don't support the `default` attribute."* The full list
   of types without `default`: `article`, `blog`, `collection`, `color`, `color_background`,
   `color_palette`, `font_picker`, `image_picker`, `liquid`, `page`, `product`, `product_list`,
   `video`.

   → **D-11's "the corrected values also become the schema defaults" is not implementable.** Drop
   that clause. The corrected handles live in `product-links.ts` only.

   → **On deploy day, both pickers are blank and every patient hits the code fallback.** The
   corrected handles are the production path, not a safety net. This should reorder the plan: land
   and verify the handle correction *first* (it alone closes DEF-03 for real patients), then add the
   pickers as the durability improvement.

2. **The setting yields a `product` object, and printing it directly yields the handle.** Exact
   wording: *"When accessing the value of a `product` type setting, data is returned in one of the
   following formats: A `product` object"* and *"To ensure backwards compatibility with legacy
   resource-based settings, outputting the setting directly will return the object's handle."*

   → `{{ block.settings.tn_product }}` → `tennessee-alledrops`
   → `{{ block.settings.tn_product.handle }}` → `tennessee-alledrops` (**use this — explicit**)
   → `{{ block.settings.tn_product.url }}` → `/products/tennessee-alledrops`

   D-12 says pass *handles*, matching `PRODUCT_HANDLE_BY_STATE`'s shape. Use `.handle` and keep the
   app's existing `/products/${handle}` construction. Do not switch to `.url` — it would change the
   shape the app expects and diverge from the fallback map.

3. **Unset behavior is `blank`.** Exact wording: *"`blank` if no selection has been made, the
   selection isn't visible, or the selection no longer exists."*

   → Note the third clause: **a deleted or unpublished product silently becomes blank**, which the
   fallback then covers. This is a genuine self-healing property and an argument in D-10's favour.
   → In Liquid, `{{ nil.handle }}` renders empty, and `'' | url_encode` → `''`, so the existing
   `_embed_src` pattern degrades to `&tnProduct=` — which `quiz-embed.tsx` reads as `''`, which
   `QuizContainer` treats as falsy and falls back. **No `{%- if -%}` guard is strictly needed**, but
   writing one is clearer.

### Availability in the app block context

Theme app extensions restrict only `content_for_header`, `content_for_index`, `content_for_layout`,
and *"Any properties of the parent `section` object, other than `id`."* `block.settings` and the
`product` setting type are **not** restricted. `[CITED: theme-app-extensions/configuration#liquid-objects]`

Empirical corroboration from this session: the live block already renders
`section-template--16864615235790__17615616560892d862-padding`, proving `section.id` resolves, and
the existing `url`-type settings resolve to real values in `_embed_src`.

Residual risk: the block schema is validated at `shopify app deploy` time. If `product` were
rejected, the deploy **fails loudly** rather than shipping something broken. Sequence a
deploy-and-validate step early rather than at the end. `[ASSUMED — inferred from the CLI's schema
validation behavior; not separately verified]`

### The `url` setting type yields relative paths for internal resources

`[VERIFIED: live _embed_src shows consult=%2Fproducts%2Fallergy-consultation]` — the existing `url`
pickers already produce `/products/…`, not absolute URLs. This is important: **D-05's
same-origin-relative-path-only validator will accept the currently-configured redirect values
unchanged.** No migration of existing settings is needed. (A merchant who *pastes* an external URL
into a `url` setting gets an absolute value — see Open Questions.)

### Schema snippet

```json
{ "type": "header", "content": "Product Pages" },
{
  "type": "product",
  "id": "tn_product",
  "label": "Tennessee AlleDrops product",
  "info": "Product the quiz links to for Tennessee patients. Leave blank to use the built-in default (tennessee-alledrops)."
},
{
  "type": "product",
  "id": "tx_product",
  "label": "Texas AlleDrops product",
  "info": "Product the quiz links to for Texas patients. Leave blank to use the built-in default (texas-alledrops)."
}
```

Note: `default` is deliberately absent — it is not permitted. The `info` string is where the
fallback is communicated to William.

### `_embed_src` extension (D-12)

```liquid
{%- assign _tn_enc = block.settings.tn_product.handle | url_encode -%}
{%- assign _tx_enc = block.settings.tx_product.handle | url_encode -%}
{%- assign _embed_src = fly_url
    | append: '/quiz-embed?consult=' | append: _consult_enc
    | append: '&testOptions=' | append: _test_enc
    | append: '&test=' | append: _test_flag
    | append: '&tnProduct=' | append: _tn_enc
    | append: '&txProduct=' | append: _tx_enc -%}
```

Exactly the existing pattern. `[ASSUMED]` on the param names; `[VERIFIED]` that the pattern works
(the three existing params round-trip correctly in production).

## Testability of postMessage & Origin Validation (Research Priority 3)

### The constraint

`vitest.config.ts` (read this session):

```ts
test: { environment: "node", include: ["app/**/*.test.ts", "tests/**/*.test.ts"] }
```

`[VERIFIED: read the file]` Consequences the planner must design around:

- **No DOM.** `jsdom`, `happy-dom`, and `@testing-library/*` are all absent from `node_modules`
  `[VERIFIED: ls node_modules]`. All 51 tests are pure logic or route-loader tests with `vi.mock`.
- **`.test.ts` only** — a `.test.tsx` file will not be collected. Any new test must be `.ts`.
- **Importing a pure function from a `.tsx` file works.** `QuizPartRenderer.test.ts` already imports
  `isPartComplete` from `QuizPartRenderer.tsx` — Vite transforms the JSX and the import is
  side-effect-free at module scope. So exporting a pure helper from a component file is viable.
- **Importing `QuizContainer.tsx` itself will not work** in a node environment — it touches `window`
  in module-scope-adjacent code paths and renders JSX. Do not plan a test that imports it.

### What is genuinely unit-testable

| Surface | Testable? | How |
|---------|-----------|-----|
| `isSafeRelativePath` / `toRelativePath` | ✅ **fully** | `app/lib/quiz/navigation.test.ts`. Pure string logic, zero deps. This is where the bulk of D-05's acceptance criteria live. |
| `PRODUCT_HANDLE_BY_STATE` corrected values | ✅ | Assert the exact strings. Guards DEF-03 against regression. |
| `questions.ts:198` label string | ✅ | Assert exact equality, and assert absence of `(required)`. Guards DEF-04. |
| `isPartComplete` still blocks empty `med_list` | ✅ | Already-proven pattern in `QuizPartRenderer.test.ts`. **D-13 explicitly requires this test.** |
| Config-over-map handle precedence | ✅ *if extracted* | Extract `getProductHandle(state, cfg)` into `app/lib/quiz/product-links.ts` as a pure function taking the config as an argument (not reading `window`). Then it is trivially testable. **Recommended.** |
| **Presence of the guards in the Liquid file** | ✅ **and high-value** | See below. |
| `e.origin` rejection behavior in the browser | ❌ | No `MessageEvent` in node, and `origin` is unforgeable by design. Browser-only. |
| `iframe.scrollIntoView` actually scrolling | ❌ | Browser-only. |
| The inline script in `quiz-embed.tsx`'s template string | ❌ (as JS) / ✅ (as text) | It is a string in a loader. Assert on its text, same technique as the Liquid file. |

### The high-value test the planner should specify: a Liquid contract test

The exact failure mode this repo has suffered is **"a listener is simply absent from a file."** A
node-only vitest test can catch that directly, with no DOM and no new dependency:

```ts
// tests/liquid-block-contract.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const LIQUID = readFileSync(
  "extensions/quiz-block/blocks/symptom-quiz.liquid", "utf-8"
);

describe("symptom-quiz.liquid parent handler contract", () => {
  it("handles quiz:scrollToTop (DEF-01)", () => {
    expect(LIQUID).toContain("quiz:scrollToTop");
    expect(LIQUID).toContain("scrollIntoView");
  });

  it("does NOT scroll smoothly (D-06)", () => {
    expect(LIQUID).not.toMatch(/behavior:\s*['"]smooth['"]/);
  });

  it("verifies the sender origin before acting (D-05)", () => {
    expect(LIQUID).toContain("e.origin");
  });

  it("never assigns an unvalidated payload (D-05 open redirect)", () => {
    expect(LIQUID).not.toMatch(/location\.assign\(\s*e\.data\./);
  });

  it("exposes both product picker settings (D-10)", () => {
    expect(LIQUID).toContain('"type": "product"');
    expect(LIQUID).toContain('"id": "tn_product"');
    expect(LIQUID).toContain('"id": "tx_product"');
  });

  it("passes both handles through _embed_src (D-12)", () => {
    expect(LIQUID).toContain("tnProduct=");
    expect(LIQUID).toContain("txProduct=");
  });

  it("keeps the schema valid JSON", () => {
    const m = LIQUID.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
    expect(m).toBeTruthy();
    expect(() => JSON.parse(m![1])).not.toThrow();
  });
});
```

Note the `cwd` assumption: vitest runs from the repo root, so the relative path resolves. Use
`path.join(process.cwd(), …)` if the planner prefers explicitness.

**Why this is worth writing rather than dismissing as a "grep test":**

- It is a *contract* test against a file that no other tool checks — the Liquid file has zero
  coverage today, is not typechecked, is not linted, and is the site of DEF-01.
- The schema-JSON-validity assertion catches a real, common, deploy-blocking mistake **before**
  `shopify app deploy`, shortening the feedback loop on a channel whose only other feedback is a
  remote CLI call.
- It converts "verify manually" into a concrete acceptance criterion, which is exactly what the
  orchestrator asked for.
- Its limits are honest and should be stated in the plan: it proves the guards are *present in the
  source*, not that they *behave correctly in a browser*. Behavior is proven by the console protocol
  in the next section.

Apply the same technique to `app/routes/quiz-embed.tsx` (assert the `window.location.assign =`
override is gone, and that `new URL(href, window.location.href)` is gone).

### Proposed test additions

| File | Tests | Requirement |
|------|-------|-------------|
| `app/lib/quiz/navigation.test.ts` | NEW ~10 | D-05 accept/reject matrix (below) |
| `tests/liquid-block-contract.test.ts` | NEW ~7 | DEF-01, D-05, D-06, D-10, D-12 |
| `tests/quiz-embed-contract.test.ts` | NEW ~3 | D-02, D-03 |
| `app/lib/quiz/product-links.test.ts` | NEW ~3 | DEF-03 + config precedence |
| `app/components/quiz/QuizPartRenderer.test.ts` | +2 to existing | DEF-04 label + D-13 enforcement |

Baseline 51 → target ~76. `[VERIFIED: 51 passed / 10 files this session]`

### The accept/reject matrix (write these as the test table)

| Input | Expected | Why |
|-------|----------|-----|
| `/pages/test-options` | accept | the normal case |
| `/products/tennessee-alledrops` | accept | the anchor case |
| `/` | accept | Return Home (`:328`) |
| `/pages/a?b=c#d` | accept | query + fragment are fine |
| `/products/allergy-consultation` | accept | **the live configured value** — must not regress |
| `""` | reject | empty |
| `//evil.com` | reject | protocol-relative — the classic bypass |
| `///evil.com` | reject | caught by the same `p[1] === "/"` rule |
| `https://evil.com/x` | reject | absolute |
| `http://evil.com/x` | reject | absolute |
| `https://alle-drops-quiz-app.fly.dev/pages/x` | reject | **today's actual bug output** (D-03) |
| `javascript:alert(1)` | reject | no leading `/` |
| `mailto:a@b.c` | reject | no leading `/` |
| `pages/test-options` | reject | bare relative — ambiguous, reject deliberately |
| `\\/evil.com` | reject | backslash is not `/` at index 0 |
| `null` / `undefined` / `42` / `{}` | reject | non-string |
| `"/\\evil.com"` | **decide + test** | some parsers treat `\` as `/`. `new URL("/\\evil.com", origin)` stays same-origin in WHATWG-compliant browsers, but assert it explicitly rather than assuming. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Same-origin URL validation | A regex or string allowlist over URLs | `new URL(p, location.origin)` + `u.origin === location.origin` | URL parsing has a long tail of bypasses (`\`, unicode, userinfo `@`, tabs/newlines stripped by the parser). The browser's own parser is the authority the browser will use. |
| Verifying the sender of a `postMessage` | A shared secret, a nonce, or a token in the payload | `e.origin` | Browser-supplied and unforgeable. Anything in `e.data` is attacker-controlled. |
| Header-offset scroll math | `getBoundingClientRect()` + manual `scrollTo` arithmetic | CSS `scroll-margin-top` on the iframe + `scrollIntoView({block:'start'})` | Declarative, survives header-height changes, no resize listener. |
| Overriding `window.location.assign` | Any variation of the current patch | Explicit `navigateParent()` at each call site | `[LegacyUnforgeable]`. Already cost this project a live defect. |
| Validating the product handle string | A hardcoded typed union, a regex on the handle | Shopify's `type: product` picker | The picker cannot produce a nonexistent handle, and it goes blank when a product is deleted (docs-confirmed) instead of silently 404-ing. |
| Proving a static asset deployed | HTTP headers, `Cache-Control`, deploy exit code | Content assertion on the served bytes | This exact substitution caused the session-28 false positive. |

**Key insight:** every one of these was already hand-rolled once in this codebase, and three of the
four resulting bugs are the defects this phase exists to fix. The pattern is consistent: the code
reached for a clever indirection (patching `location.assign`, resolving URLs in the wrong document,
hardcoding a handle) where a boring explicit call would have worked and failed loudly.

## Common Pitfalls

### Pitfall 1 — The three-channel deploy, and forgetting one

**What goes wrong:** Code lands, `fly deploy` succeeds, and the Liquid fix is not live. Or the
reverse: `shopify app deploy` ships a parent handler expecting `{path}` while the 300 s-cached bundle
is still posting `{url}`, and every navigation silently no-ops.

**Why:** `shopify app deploy` does **not** deploy Fly, and `fly deploy` does **not** deploy the
extension (`CLAUDE.md:149`). Three artifacts, three commands, three freshness profiles:

| Channel | Command | Freshness after deploy |
|---------|---------|------------------------|
| `symptom-quiz.liquid` | `shopify app deploy` | Theme render; effectively immediate |
| `quiz-embed.tsx` HTML | `fly deploy` | Immediate — `Cache-Control: no-store` `[VERIFIED]` |
| `quiz-bundle.js` | `fly deploy` (Docker runs `build:theme`) | **up to 300 s** browser/CDN cache, no etag `[VERIFIED]` |

**How to avoid:** Deploy Fly first, wait out or bypass the 300 s cache, confirm the bundle by content
assertion, *then* `shopify app deploy` the extension, then confirm the extension by re-fetching the
storefront HTML. Deploying the parent last means the transitional window has an old parent (which
ignores unknown message shapes harmlessly) rather than a new parent starved of messages it
recognises. Renaming `url` → `path` makes the transitional window fail closed either way.

**Warning signs:** navigation silently does nothing; scroll works but navigate doesn't (or vice
versa); the live inline script does not match the repo file.

### Pitfall 2 — The stale-bundle trap (the session-28 incident)

**What goes wrong:** `fly deploy` succeeds, `/health` returns 200, headers look right, and the app
serves a `quiz-bundle.js` the build never touched.

**Why:** `public/quiz-bundle.js` is a **committed static artifact** read off disk at request time
(`app/routes/quiz-bundle-js.tsx` → `readFile(join(process.cwd(), "public", "quiz-bundle.js"))`).
Before PR #14 the Dockerfile only ran `npm run build`. It now runs
`RUN npm run build && npm run build:theme` `[VERIFIED: read Dockerfile]`, so the artifact *is* rebuilt
in the image — but the committed copy still exists, is not gitignored, and can silently diverge from
source in the working tree.

**Residual risks that remain today:**

- `.dockerignore` contains only `.cache`, `build`, `node_modules` `[VERIFIED]`. `public/` is copied
  in, then overwritten by the in-image build. Correct, but the ordering is load-bearing and
  undocumented in the Dockerfile.
- **`package-lock.json` is gitignored** (`.gitignore:7`) but the Dockerfile does
  `COPY package.json package-lock.json* ./` then `npm ci --omit=dev`. `npm ci` **requires** a
  lockfile. So a deploy from a tree without a lockfile fails, and a deploy from a stale one installs
  stale deps. `HANDOFF.md:127` records this and flags it as unusual. Confirm a lockfile exists before
  deploying.
- `@vitejs/plugin-react` must stay in `dependencies` (not `devDependencies`) because
  `npm ci --omit=dev` would otherwise strip it and `build:theme` fails. `[VERIFIED: package.json:40
  lists it under dependencies]` **Do not "tidy" it back into devDependencies.**

**How to avoid:** always assert on served content, never on deploy status. Commit a freshly built
`public/quiz-bundle.js` alongside the source change so the committed artifact and source agree, even
though the image rebuilds it.

**Warning signs:** served byte-length unchanged after a source change; expected string count
unchanged; `Cache-Control` reasoning entering the conversation.

### Pitfall 3 — `product` settings cannot have defaults, so the fallback is the production path

**What goes wrong:** The team ships the pickers, marks DEF-03 done, and every patient still gets a
404 because nobody opened the theme editor.

**Why:** `[CITED: input-settings docs]` `product` settings do not support `default`. A newly added
picker on an already-placed block is **blank**.

**How to avoid:** Land the corrected `product-links.ts` handles and treat them as the fix for
DEF-03's success criterion. Treat the pickers as a separate, additive durability change (D-11's
discretion note already contemplates two commits — take it). Add an explicit human task: select both
products in the theme editor, and verify the resulting `_embed_src`.

**Warning signs:** `_embed_src` shows `&tnProduct=&txProduct=` after the merchant claims to have set
them.

### Pitfall 4 — Sense's `on-scroll-up` sticky header will cover the top of the iframe

**What goes wrong:** `scrollIntoView({block:'start'})` lands the iframe's top edge at viewport top;
the sticky header then covers the first ~60–90 px, hiding the first question's label.

**Why:** The live page renders `<sticky-header data-sticky-type="on-scroll-up" class="header-wrapper …">`
`[VERIFIED: live HTML this session]`. Sense's `on-scroll-up` mode *reveals* the header when the user
scrolls upward — and a step-change scroll from mid-page to the iframe top **is** an upward scroll.
So the header will typically be visible at exactly the moment the scroll completes. The theme
exposes no `--header-height` custom property on this page `[VERIFIED: grep found none]`, so there is
nothing to read at runtime.

**How to avoid:** Add `scroll-margin-top` to the iframe in the block's existing `{%- style -%}`
block. `scrollIntoView` honours it, so no JS math is needed:

```liquid
#alledrops-quiz-{{ block.id }} { scroll-margin-top: 100px; }
```

Consider exposing it as a `range` setting (0–200 px) so the offset can be tuned in the editor without
a deploy — cheap, and consistent with how this block already handles padding.

**Warning signs:** the scroll fires (page moves) but the first question's label is clipped; looks
"almost right" and is easy to sign off on.

### Pitfall 5 — Theme CSS `scroll-behavior: smooth` can override D-06's "instant"

**What goes wrong:** D-06 requires instant. `scrollIntoView({block:'start'})` omits `behavior`, which
defaults to `"auto"` — and `"auto"` resolves to the element's **computed CSS `scroll-behavior`**. If
the theme sets `scroll-behavior: smooth` on `html`, every step change glides, which is exactly what
D-06 rejects.

**How to avoid:** pass `behavior: 'instant'` explicitly rather than relying on the default:
`iframe.scrollIntoView({ block: 'start', behavior: 'instant' })`. `'instant'` is a valid
`ScrollBehavior` value and forces non-animated scrolling regardless of CSS. Verify visually either
way, since this is the one criterion no automated check covers.

`[ASSUMED — the CSSOM-View `behavior: auto` → computed `scroll-behavior` resolution is standard, but
whether Sense 15.4.1 sets `scroll-behavior: smooth` was not checked in the theme's CSS this session.]`

### Pitfall 6 — Each verification exit needs a fresh page load

**What goes wrong:** A verifier reaches the results page, clicks one exit, presses Back, clicks
another — and gets `500 "Could not save assessment"`.

**Why:** `generateSymptomProfileId()` returns `AOD_${Date.now()}` and is called **once** per session
at the patient-info → quiz-parts transition (`QuizContainer.tsx:389`). `submissions.symptom_profile_id`
is `NOT NULL UNIQUE` (`migrations/001_create_submissions.sql:13`). A second submit in the same
session reuses the same ID and violates the constraint. `[VERIFIED: read both files]`

**How to avoid:** full page reload between exits. Document this in the verification script.

**Side note — a latent live defect, not in scope:** on the `3-6` bracket a patient can click
"Schedule a Telehealth Appointment" (submits), navigate back, then "Continue to Purchase" → consent →
Submit, hitting the same unique violation. Real, patient-facing, and outside DEF-01..04. Recommend
recording it in `.planning/` as a candidate rather than fixing it here — Phase 4 deletes the `3-6`
purchase jump entirely (TEST-05), which removes it for free.

### Pitfall 7 — Rejecting absolute URLs is a behavior change for merchants

**What goes wrong:** A future merchant pastes `https://calendly.com/aod/consult` into the consult
redirect setting. It silently stops working, because D-05 rejects absolute URLs.

**Why:** the `url` setting type returns an absolute URL when the merchant enters an external
address, and a relative path only for internal resources `[VERIFIED empirically for the internal
case]`. D-05's validator rejects the former.

**Today's exposure: zero** — both live settings are internal relative paths. **Forward exposure: real**
— Phase 7 (TELE-01) is about making booking work, and third-party scheduling is a plausible
implementation. See Open Questions.

## Code Examples

### Confirming a specific string is (or is not) live in the served bundle

```bash
# DEF-03 / DEF-04 markers — run after fly deploy + cache window
B=$(curl -s "https://alle-drops-quiz-app.fly.dev/quiz-bundle-js")
for s in "tennessee-alledrops" "texas-alledrops" "and dosages (required)" "tennessee-allerdrops"; do
  printf "%-28s %s\n" "$s" "$(printf '%s' "$B" | grep -o "$s" | wc -l | tr -d ' ')"
done
# PASS: tennessee-alledrops>=1, texas-alledrops>=1,
#       "and dosages (required)"==0, tennessee-allerdrops==0
```

`[VERIFIED: this exact technique executed this session; it is the technique that resolved the
session-28 incident per HANDOFF.md:134]`

### Confirming the extension actually shipped

```bash
# 1. authenticate (see "Storefront access")
# 2. fetch the rendered page and read the block's own inline script
curl -s -b cj.txt "https://allergist-on-demand.myshopify.com/pages/allergy-quiz" -o quiz.html

grep -c "quiz:scrollToTop" quiz.html   # PASS: >=1   (baseline today: 0)
grep -c "e.origin"         quiz.html   # PASS: >=1   (baseline today: 0)
grep -c "scrollIntoView"   quiz.html   # PASS: >=1
grep -o 'src="[^"]*quiz-embed[^"]*"' quiz.html   # inspect _embed_src params
```

Plus deploy provenance from the CLI side:

```bash
npx shopify app versions list --json    # CLI 3.94.3 [VERIFIED: --help this session]
```

### Exercising the parent handler with zero PHI written

Open the live quiz page in Chrome, open DevTools, and **switch the console's execution context to
the iframe** (the context dropdown next to the `top` selector → the `alle-drops-quiz-app.fly.dev`
frame). Then:

```js
// From INSIDE the iframe, so e.origin is genuinely the app origin.
// This is the only way to exercise the accept path — e.origin cannot be forged.
const P = (m) => window.parent.postMessage(m, '*');

P({ type: 'quiz:scrollToTop' });                          // DEF-01  → page scrolls to iframe top
P({ type: 'quiz:navigate', path: '/pages/test-options' }); // DEF-02  → storefront navigates
P({ type: 'quiz:navigate', path: '//evil.com' });          // D-05    → nothing happens
P({ type: 'quiz:navigate', path: 'https://evil.com' });    // D-05    → nothing happens
P({ type: 'quiz:navigate', path: 'javascript:alert(1)' }); // D-05    → nothing happens
P({ type: 'quiz:navigate', url:  '/pages/test-options' }); // old key → nothing (fail-closed)
```

And from the **parent** (`top`) context, to prove the origin guard rejects a shop-origin sender:

```js
window.postMessage({ type: 'quiz:navigate', path: '/pages/test-options' }, location.origin);
// D-05 → nothing happens: e.origin is the shop, not the app.
```

**This is the highest-value verification step in the phase.** It proves the entire parent contract —
DEF-01, the parent half of DEF-02, and all of D-05 — against the real rendered DOM on the real live
page, with **no quiz completion, no submission, and no PHI row**. `[ASSUMED — protocol is mine;
`e.origin` unforgeability is `[CITED: WHATWG HTML postMessage]`]`

### Observing what the app actually posts (child half of DEF-02)

Paste in the **parent** console before interacting with the quiz:

```js
window.addEventListener('message', (e) => {
  if (e.origin.includes('fly.dev')) console.log('[quiz]', e.origin, JSON.stringify(e.data));
}, true);
```

Then click Next through Parts 1–5 (**no submission occurs on Next** — verified: only
`handleScheduleConsult`, `handleTestFirst`, the `0-2` auto-save effect, and `handleConsentSubmit`
call `submitPayload`). You get `quiz:scrollToTop` and `quiz:resize` for free with zero PHI.

## Exit Inventory — reachability, and the PHI cost of clicking each one

`[VERIFIED: grep of app/ + read of ResultsDisplay.tsx and QuizContainer.tsx this session]`

| # | Site | Target | Reached by | Submits before navigating? |
|---|------|--------|-----------|---------------------------|
| 1 | `QuizContainer.tsx:215` | `consult` | `0-2` → "Schedule a Consultation"; `3-6` → "Schedule a Telehealth Appointment" | **Yes** (skipped only if `0-2` already auto-saved) |
| 2 | `QuizContainer.tsx:228` | `testOptions` | `7+` → "I'd Like Allergy Testing First" | **Yes** |
| 3 | `QuizContainer.tsx:248` | `testOptions` | `7+` → "Proceed Without Testing" → "I'd like allergy testing first" | **No** |
| 4 | `QuizContainer.tsx:328` | `/` | any completed submit → `completed` screen → "Return Home" | already submitted |
| 5 | `QuizContainer.tsx:335` | `/products/{handle}` | same `completed` screen → "Go to AlleDrops Product Page" (anchor) | already submitted |

Also: the `0-2` bracket **auto-submits on entering `outcome`** (`QuizContainer.tsx:168-182`) — merely
reaching a `0-2` result writes a row, with no button clicked.

**Minimum PHI rows for a complete five-exit, two-state click-through: ~4.**

| Run | Bracket | Exits covered | Rows |
|-----|---------|---------------|------|
| A | `0-2` | #1 | 1 (auto-submit) |
| B | `7+` | #2 | 1 |
| C | `7+` | #3 | 0 |
| D | `3-6` → Continue to Purchase → consent → Submit | #4, #5 (TN) | 1 |
| E | repeat D with Texas | #5 (TX) | 1 |

Test Mode is **off in production** (`test=0`, verified), so each run means answering the questionnaire
by hand. Each run needs a fresh page load (Pitfall 6). Patient info needs name, DOB ≥ 18,
valid-format email, ≥ 10 phone digits (`PatientInfoStep.tsx:130-136`).

**Compliance consequence the plan must own.** These are synthetic rows, but they land in the
production PHI table. The repo already carries an undeleted diagnostic row from session 27
(`diag+preflight@example.com`, still open per `HANDOFF.md:66`) — do not add to that debt silently.
Recommend:

1. A single recognisable identity pattern, e.g. `verify.phase1+<run>@21adsmedia.com`, name
   `Phase1 Verify`.
2. An explicit cleanup task with the statement written out:
   `DELETE FROM submissions WHERE patient_email LIKE 'verify.phase1+%@21adsmedia.com';`
3. A note in the PR description that verification wrote rows to production Cloud SQL and they were
   removed (CLAUDE.md:130 requires calling out PHI-relevant changes).
4. Consider clearing the session-27 row in the same pass — it is one statement and closes a
   three-session-old item.

**Cheaper alternative worth offering the planner.** Decompose rather than click:

- Exits #1–#4's *parent* behavior ← console protocol above (0 rows)
- Exits #1–#4's *child* behavior ← message logger during a Next-only walk plus **one** real click
  (1 row)
- Exit #5's handle correctness ← already verified by curl (200 vs 404), 0 rows
- Exit #5's anchor mechanism ← console protocol with `path: '/products/tennessee-alledrops'` (0 rows)

That reduces the honest cost to **1–2 rows** while still satisfying D-14's "rendered DOM, not deploy
success." Recommend presenting both and letting Andrew choose; the decomposed route is
better-evidenced *and* lower-risk, because it directly tests the guards rather than only the happy path.

## Runtime State Inventory

This phase renames no identifiers and migrates no data, but it does change a **message payload key**
and a **settings surface**, so the same discipline applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | **None.** No stored value contains a navigation URL, a message key, or a product handle. `submissions.answers_json` stores answers only; the product handle is never persisted. Verified: `grep -rn "product-links\|PRODUCT_HANDLE"` hits only `product-links.ts` and `QuizContainer.tsx:22,335`. | None |
| **Live service config** | **Two items, both live-theme-only, neither in git.** (1) `test_options_redirect_url` = `/products/allergy-consultation` — **wrong**, must be corrected to `/pages/test-options`. (2) The two new `product` pickers will be **blank** on deploy and require manual selection (no `default` possible). Both live in the theme's `settings_data.json` / template JSON, editable only in the theme editor. | Human theme-editor edits; gate the DEF-02/DEF-03 success claims on re-reading the live `_embed_src` |
| **OS-registered state** | **None.** No scheduled tasks, pm2 processes, or launchd/systemd units are involved. | None |
| **Secrets / env vars** | **None.** No secret name changes. `block.settings.app_url` is a theme setting, not a secret, and its value (`https://alle-drops-quiz-app.fly.dev`) is unchanged — but it now becomes **security-relevant**, because D-05 derives the trusted origin from it. If it is ever changed without care, all navigation silently stops. Worth an `info` note on the setting. | None; document the new coupling |
| **Build artifacts** | **`public/quiz-bundle.js` (183,691 bytes) is a committed artifact** rebuilt in Docker. After the source change, the committed copy is stale until `npm run build:theme` is run and committed. Also: `package-lock.json` is gitignored yet required by `npm ci` in the Dockerfile. | Run `npm run build:theme` and commit the artifact with the source change; confirm a lockfile exists before `fly deploy` |
| **Cross-channel version skew** | The 300 s `max-age` on `/quiz-bundle-js` means a live window where an old bundle talks to a new parent. | Rename `url` → `path` so skew fails closed; deploy Fly before the extension |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest` 3.2.4 `[VERIFIED: package.json + npx run this session]` |
| Config file | `vitest.config.ts` — `environment: "node"`, `include: ["app/**/*.test.ts","tests/**/*.test.ts"]` |
| DOM available | **No.** No `jsdom` / `happy-dom` / `@testing-library` installed `[VERIFIED: ls node_modules]` |
| File extension | **`.test.ts` only** — `.test.tsx` is not collected |
| Quick run command | `npm test` |
| Full suite command | `npm run typecheck && npm test` |
| Baseline | **51 passed / 10 files / 519 ms** `[VERIFIED: executed this session]` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| DEF-01 | Liquid block handles `quiz:scrollToTop` via `scrollIntoView` | contract (file text) | `npx vitest run tests/liquid-block-contract.test.ts` | ❌ Wave 0 |
| DEF-01 | Scroll is instant, not smooth (D-06) | contract (file text) | same | ❌ Wave 0 |
| DEF-01 | Page actually scrolls to iframe top | **manual (browser)** | console protocol, iframe context | n/a |
| DEF-02 | `location.assign` override removed from `quiz-embed.tsx` | contract (file text) | `npx vitest run tests/quiz-embed-contract.test.ts` | ❌ Wave 0 |
| DEF-02 | Interceptor no longer resolves against `window.location.href` | contract (file text) | same | ❌ Wave 0 |
| DEF-02 | `isSafeRelativePath` accept/reject matrix (18 cases) | unit | `npx vitest run app/lib/quiz/navigation.test.ts` | ❌ Wave 0 |
| DEF-02 | All five exits post a relative path | **manual (browser)** | parent-console message logger | n/a |
| DEF-02 | Parent navigates the storefront, not the iframe | **manual (browser)** | console protocol | n/a |
| DEF-02 | `testOptions` setting points at `/pages/test-options` | **manual (theme editor)** | `grep -o 'src="[^"]*quiz-embed[^"]*"' quiz.html` | n/a |
| DEF-03 | `PRODUCT_HANDLE_BY_STATE` = corrected handles | unit | `npx vitest run app/lib/quiz/product-links.test.ts` | ❌ Wave 0 |
| DEF-03 | Config handle wins over the map; blank falls back | unit | same (requires extracting `getProductHandle`) | ❌ Wave 0 |
| DEF-03 | Both handles resolve 200 on the live store | **automatable** | `curl -b cj.txt -o /dev/null -w '%{http_code}' …/products/<h>` | ✅ recipe above, **already passing** |
| DEF-03 | Both product pickers exist in the schema | contract (file text) | `tests/liquid-block-contract.test.ts` | ❌ Wave 0 |
| DEF-04 | Label === "Please list your current allergy medications and dosages" | unit | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts` | ✅ file exists, +1 test |
| DEF-04 | Label contains no `(required)` | unit | same | ✅ +1 test |
| D-13 | Empty `med_list` still blocks progression when `taking_meds === "yes"` | unit | same | ✅ +1 test |
| D-05 | Origin guard present; no unvalidated `location.assign(e.data.…)` | contract (file text) | `tests/liquid-block-contract.test.ts` | ❌ Wave 0 |
| D-05 | Off-origin / protocol-relative / `javascript:` senders rejected | **manual (browser)** | console protocol reject cases | n/a |
| D-12 | Both handle params present in `_embed_src` | contract (file text) | `tests/liquid-block-contract.test.ts` | ❌ Wave 0 |
| — | Block schema is valid JSON (pre-`shopify app deploy` gate) | contract | `tests/liquid-block-contract.test.ts` | ❌ Wave 0 |

### Deploy-Artifact Provenance Gates

**Non-negotiable. Every one of these is an assertion on served bytes, never on a deploy exit code.**
This section exists because `fly deploy` succeeded, `/health` returned 200, and headers matched while
the app served a stale artifact (`HANDOFF.md:124,137`).

**Gate A — Fly HTML (immediate, `no-store`)**

```bash
E=$(curl -s "https://alle-drops-quiz-app.fly.dev/quiz-embed?consult=%2Fx&testOptions=%2Fy&test=0")
printf '%s' "$E" | grep -c "window.location.assign = function"          # PASS: 0  (today: 1)
printf '%s' "$E" | grep -c "new URL(href, window.location.href)"        # PASS: 0  (today: 1)
printf '%s' "$E" | grep -c "tnProductHandle"                            # PASS: >=1
```

**Gate B — Fly static bundle (up to 300 s stale, no etag → content assertion only)**

```bash
B=$(curl -s "https://alle-drops-quiz-app.fly.dev/quiz-bundle-js")
printf '%s' "$B" | wc -c                                        # expect != 183691
printf '%s' "$B" | grep -c "tennessee-alledrops"                # PASS: >=1  (today: 0)
printf '%s' "$B" | grep -c "tennessee-allerdrops"               # PASS: 0    (today: 1)
printf '%s' "$B" | grep -c "and dosages (required)"            # PASS: 0    (today: 1)
printf '%s' "$B" | grep -c "quiz:scrollToTop"                  # PASS: >=1  (today: 2)
```

Secondary signal, not a gate:
`curl -s …/quiz-bundle-js | shasum -a 256` vs `shasum -a 256 public/quiz-bundle.js`. Treat a
**mismatch as inconclusive** (the Docker image builds under `node:20-alpine`, which may not be
byte-identical to a local build) but treat a **match to the pre-deploy hash as failure** — that is
the stale-artifact signature.

If a marker is still wrong after 300 s: `fly ssh console -a alle-drops-quiz-app -C "ls -l /app/public/quiz-bundle.js"`
and `fly logs -a alle-drops-quiz-app`, and confirm the release actually rolled.

**Gate C — Shopify extension (`shopify app deploy`)**

```bash
curl -s -c cj.txt -X POST "https://allergist-on-demand.myshopify.com/password" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "form_type=storefront_password" --data-urlencode "utf8=✓" \
  --data-urlencode "password=allergy"
curl -s -b cj.txt "https://allergist-on-demand.myshopify.com/pages/allergy-quiz" -o quiz.html

grep -c "quiz:scrollToTop" quiz.html   # PASS: >=1  (today: 0)
grep -c "e.origin"         quiz.html   # PASS: >=1  (today: 0)
grep -c "scrollIntoView"   quiz.html   # PASS: >=1  (today: 0)
```

Plus `npx shopify app versions list --json` to confirm a new app version exists.

**Gate D — Merchant configuration (human, theme editor)**

```bash
grep -o 'src="[^"]*quiz-embed[^"]*"' quiz.html
# PASS requires ALL of:
#   testOptions=%2Fpages%2Ftest-options     ← today: %2Fproducts%2Fallergy-consultation ❌
#   tnProduct=tennessee-alledrops           ← today: absent
#   txProduct=texas-alledrops               ← today: absent
#   test=0                                  ← today: 0 ✅
```

**Gate E — Live product pages**

```bash
for h in tennessee-alledrops texas-alledrops; do
  printf "%-22s %s\n" "$h" "$(curl -s -o /dev/null -w '%{http_code}' -b cj.txt \
    "https://allergist-on-demand.myshopify.com/products/$h")"
done
# PASS: both 200.  Already verified 2026-07-30.
```

**Gate F — Behavior in the rendered DOM (D-14, manual)**

Console protocol from "Code Examples" — accept path from the iframe context, reject paths from both
contexts, scroll observed visually with the sticky-header clipping check (Pitfall 4).

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm run typecheck && npm test`
- **Pre-`shopify app deploy`:** `npx vitest run tests/liquid-block-contract.test.ts` — the
  schema-JSON assertion catches a deploy-blocking error locally
- **Post-`fly deploy`:** Gates A and B
- **Post-`shopify app deploy`:** Gate C
- **Post-merchant-configuration:** Gates D and E
- **Phase gate:** full suite green **plus all six gates A–F** before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `app/lib/quiz/navigation.ts` — the pure validator (source, not test; nothing to test without it)
- [ ] `app/lib/quiz/navigation.test.ts` — covers DEF-02 / D-05
- [ ] `tests/liquid-block-contract.test.ts` — covers DEF-01, D-05, D-06, D-10, D-12, schema validity
- [ ] `tests/quiz-embed-contract.test.ts` — covers DEF-02, D-03
- [ ] `app/lib/quiz/product-links.test.ts` — covers DEF-03 (requires extracting `getProductHandle(state, cfg)` as a pure function)
- [ ] Extend `app/components/quiz/QuizPartRenderer.test.ts` — covers DEF-04, D-13

No framework install needed. No new dependency needed. No `vitest.config.ts` change needed —
all proposed files match the existing `include` globs.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (**no config file exists**), so it is
treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1 touches no auth path. |
| V3 Session Management | no | No session handling changes. |
| V4 Access Control | no | No new authorization decisions. |
| **V5 Input Validation** | **yes** | `e.data.path` is fully attacker-controlled. Validate with `new URL(p, location.origin)` + explicit `origin` equality. Reject before use, never sanitise-and-proceed. |
| **V5 / Unvalidated Redirect** | **yes** | This is the headline security item: **the live block is an open redirect on a PHI-collecting patient-facing page today** (`window.location.assign(e.data.url)` with no checks). D-05 closes it. |
| V6 Cryptography | no | None involved. |
| **V13 / API & Web Service — origin** | **yes** | `e.origin` must be compared to the app origin on **every** branch, including `quiz:resize` (D-05 explicitly requires this). |
| V14 Configuration | **yes** (advisory) | `Content-Security-Policy: frame-ancestors *` on `/quiz-embed` `[VERIFIED live]` lets **any** site frame the quiz. Out of DEF-01..04 scope; recommend recording as a Phase 8 candidate. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via unvalidated `postMessage` payload | Tampering / Spoofing | Same-origin relative-path allowlist. **The vulnerability being fixed.** |
| `postMessage` from an untrusted frame or window opener | Spoofing | `e.origin !== APP_ORIGIN → return`. `e.origin` is browser-supplied and unforgeable. |
| Protocol-relative bypass (`//evil.com`) | Tampering | Explicit `p[1] === '/'` reject. **The single most-missed case** — it looks relative and resolves absolute. Must be in the test matrix. |
| `javascript:` / `data:` URI in a navigation target | Tampering | Leading-`/` requirement rejects all schemes. |
| Backslash / whitespace URL-parser confusion | Tampering | Use `new URL` rather than string comparison; assert `u.origin` rather than inspecting the input. |
| DOM-based XSS via `iframe.style.height` | Tampering | `Number()` + `isFinite()` on `e.data.height`; never interpolate raw payload into a style string. |
| Clickjacking / unrestricted framing of a PHI form | Information Disclosure | `frame-ancestors *` is permissive. Out of scope; flag for Phase 8. |
| Third-party script on a PHI page | Information Disclosure | CLAUDE.md ban. **Currently violated: Klaviyo is still on `/pages/allergy-quiz`** — 4 occurrences in the HTML fetched this session. Phase 8 / LAUNCH-01 owns it; do not let this phase's verification pass be read as clearing it. |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monkey-patching `window.location.assign` to intercept navigation | Explicit `postMessage` + a named helper at each call site | `Location` has been `[LegacyUnforgeable]` since the WHATWG HTML spec adopted the term (~2016) | The current code was never going to work in any modern browser. Do not attempt variants. |
| `storefront_digest` cookie for password-protected storefront automation | `_shopify_essential` (what the live store issues today) | Observed 2026-07-30 | Community write-ups referencing `storefront_digest` are dated. `[VERIFIED: cookie jar this session]` |
| Trusting `Cache-Control` / deploy exit status as proof of deployment | Content assertion on served bytes | Learned the hard way, session 28 | Encoded as Gates A–C above. |
| Product handles hardcoded in the bundle | `type: product` picker + code fallback | This phase | Handle typos become structurally impossible — but only after a human selects them, because `product` settings cannot carry defaults. |

**Deprecated / outdated in this repo:**

- `app/entry.theme.tsx`'s `injectIframe()` message handler — correct code on a dead path. Do not edit;
  do not delete in this phase (out of scope), but note it as a Phase 8 cleanup candidate, since its
  existence is what made DEF-01 look implemented for two months.
- `app/routes/quiz-bundle.js.tsx` vs `quiz-bundle-js.tsx` — two routes serving the same file with
  **different** `Cache-Control` (`max-age=3600` vs `max-age=300`). `quiz-embed.tsx` uses the `-js`
  variant. The 3600 s duplicate is a footgun for anyone verifying against the wrong URL. Flag for
  cleanup; **assert against `/quiz-bundle-js`** in all gates.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `shopify app deploy` validates the block schema and fails loudly on an invalid setting type | Shopify Block Schema | Low — a bad schema would ship silently instead of erroring; Gate C's grep would still catch a missing setting |
| A2 | `iframe.scrollIntoView({block:'start'})` with a `scroll-margin-top` produces the visual result D-06 wants on Sense 15.4.1 | Pitfall 4 | Medium — scroll fires but lands under the sticky header; visual verification is the only check, and it is easy to sign off wrongly |
| A3 | Sense 15.4.1 may set `scroll-behavior: smooth` — not checked in the theme CSS | Pitfall 5 | Low — mitigated unconditionally by passing `behavior: 'instant'` explicitly |
| A4 | The query-param names `tnProduct` / `txProduct` | `_embed_src` extension | None — free choice, internal contract |
| A5 | Renaming the message key `url` → `path` is net-positive | Pattern 1 | Low — must be applied to **all** of parent, child interceptor, and `QuizContainer` in one change, or navigation breaks entirely |
| A6 | Adding `jsdom` is not warranted for this phase | Standard Stack | Low — if the planner disagrees it needs the CLAUDE.md dependency-approval path plus a legitimacy check |
| A7 | Sense's `scroll-trigger animate--slide-in` wrapper does not re-trigger its reveal animation on repeated programmatic scrolls | Architecture diagram | Low — worst case a cosmetic flicker on step change |
| A8 | The `3-6` double-submit unique-constraint violation (Pitfall 6 side note) is real but out of scope | Pitfall 6 | Low — Phase 4 (TEST-05) deletes the path; if reproduced during verification it may be mistaken for a Phase 1 regression |
| A9 | Newly added non-`product` schema settings do not receive defaults on already-placed blocks | Runtime State Inventory | None as scoped — both new settings are `product` type, which cannot have defaults at all, so the question does not arise. Becomes live if the planner adds a `text`/`range`/`checkbox` setting (e.g. the scroll-offset range suggested in Pitfall 4) — verify before relying on its default. |

## Open Questions (RESOLVED)

> **All four resolved during planning, 2026-07-30.** Each recommendation below was adopted:
> Q1 → Plan 01-03 ships the relative-only rule as locked, adds a `console.warn` on rejection, and records the Phase 7 / TELE-01 tension as threat `T-1-15`.
> Q2 → Plan 01-06 Task 1 is `autonomous: false` and gates DEF-02 criterion #2 only, not DEF-03.
> Q3 → Plan 01-05 Task 1 carries the decision checkpoint; the decomposed low-PHI protocol is the recommended option, with a blocking cleanup `DELETE` covering the session-27 orphan.
> Q4 → Plan 01-04 Task 2 records the bundle-route `ETag` recommendation in `STATE.md` as a Phase 8 candidate; it stays out of scope here.

1. **Does D-05's same-origin-only rule need an escape hatch for external URLs?** *(RESOLVED — ship locked, warn on rejection)*
   - **What we know:** both live redirect settings are internal relative paths, so there is **zero**
     current exposure `[VERIFIED]`. The `url` setting type does return absolute URLs for external
     addresses.
   - **What's unclear:** Phase 7 (TELE-01) must make `/pages/consult` bookable. If that lands as a
     third-party scheduler (Calendly, Acuity, a Shopify scheduling app on an external domain), a
     merchant will paste an absolute URL into `consult_redirect_url` and it will silently stop
     working — with no console error, because the guard fails closed by design.
   - **Recommendation:** ship D-05 exactly as locked (relative-only) — it is correct for today and
     closes a live open redirect. But **`console.warn` on rejection** in the Liquid handler so the
     failure is discoverable, and record the tension as an explicit input to Phase 7 rather than
     discovering it there. A future absolute-URL allowlist keyed off `block.settings` is the clean
     extension.

2. **Who performs Gate D, and does the plan block on it?**
   - **What we know:** the `testOptions` misconfiguration and both product pickers are theme-editor
     changes that cannot be made from this repo. Andrew has theme access.
   - **What's unclear:** whether Phase 1 can be declared complete with Gate D outstanding.
   - **Recommendation:** DEF-03's success criterion is satisfiable **without** Gate D (the corrected
     `product-links.ts` fallback is what patients hit), so land that first. DEF-02's criterion #2 is
     **not** satisfiable without the `testOptions` correction. Model it as a
     `checkpoint:human-verify` task that blocks the DEF-02 claim only.

3. **Should the decomposed (low-PHI) or full click-through verification path be used for D-14?**
   - **What we know:** the full path writes ~4 synthetic rows to production Cloud SQL; the decomposed
     path writes 1–2 and tests the security guards more directly.
   - **What's unclear:** whether D-14's "click-through of each of the five navigation exits" is
     literal or intent.
   - **Recommendation:** present both to Andrew at the verification checkpoint. The decomposed path is
     better-evidenced. Either way, include the cleanup `DELETE` as a task, and consider clearing the
     session-27 `diag+preflight@example.com` row in the same pass.

4. **Was `Cache-Control: max-age=300` without an `ETag` on the bundle route intentional?**
   - **What we know:** neither bundle route emits `ETag` or `Last-Modified`
     `[VERIFIED: curl -D this session]`, and the two routes disagree on `max-age` (300 vs 3600).
   - **What's unclear:** whether adding an `ETag` (a ~3-line change using a content hash) belongs in
     this phase.
   - **Recommendation:** **out of scope**, but a strong candidate for Phase 8. It would turn every
     future deploy verification from "count strings and hope" into a one-line conditional request.
     Record it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | build, test | ✓ | engines `>=20.19 <22 \|\| >=22.12` | — |
| `npm` | build, test | ✓ | bundled | — |
| `vitest` | test suite | ✓ | 3.2.4 | — |
| Shopify CLI | `shopify app deploy`, `versions list` | ✓ | 3.94.3 | — |
| `fly` CLI | `fly deploy`, `fly logs`, `fly ssh console` | ⚠ not probed | — | Andrew's machine has it (used sessions 28–30) |
| `curl` | all provenance gates | ✓ | system | — |
| `python3` | HTML extraction in gate scripts | ✓ | system | `grep -o` alone is sufficient |
| Storefront password session | Gates C, D, E | ✓ | password `allergy` | — |
| Live storefront reachable | Gates C, D, E | ✓ | 200 with cookie | — |
| Shopify theme-editor access | Gate D | ⚠ human | — | **No fallback — human-owned** |
| Chrome DevTools (iframe console context) | Gate F | ⚠ human | — | Chrome DevTools MCP (used successfully in session 28) |
| `jsdom` / `happy-dom` / `@testing-library` | true DOM tests | ✗ | — | Contract (file-text) tests + browser console protocol. **Chosen deliberately.** |
| Cloud SQL access (for verification-row cleanup) | PHI cleanup task | ✗ from this machine | — | Cloud SQL Auth Proxy on 5433 (`HANDOFF.md:360-373`), or Cloud SQL Studio. Local IP is not on authorized networks by design. |

**Missing dependencies with no fallback:**

- **Theme-editor access (Gate D).** Human-owned. Blocks DEF-02's success criterion #2 and the
  product-picker half of DEF-03.
- **Direct Cloud SQL access.** Blocks the verification-row cleanup from this machine. Needs the proxy
  or Studio. This is the mechanism by which the session-27 row has stayed undeleted for three
  sessions — do not assume it will happen without an explicit task.

**Missing dependencies with fallback:**

- DOM test environment → contract tests + browser console protocol (documented above).
- `fly` CLI not probed here → present on Andrew's machine per sessions 28–30.

## Sources

### Primary (HIGH confidence)

- **Live storefront**, `https://allergist-on-demand.myshopify.com` with password session,
  2026-07-30 — product handle 200/404 matrix, canonical handles + product IDs, `_embed_src`
  contents, rendered inline script, theme identity (Sense 15.4.1, id `135799767246`),
  `<sticky-header data-sticky-type="on-scroll-up">`, page inventory, Klaviyo presence
- **Live Fly app**, `https://alle-drops-quiz-app.fly.dev`, 2026-07-30 — `/quiz-embed` headers +
  body, `/quiz-bundle-js` headers + 183,691-byte body + string-marker counts
- `shopify.dev/docs/storefronts/themes/architecture/settings/input-settings` — `product` setting
  has no `default`; returns a `product` object; direct output returns the handle; `blank` when
  unset/invisible/deleted; full list of types without `default`
- `shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration` — restricted Liquid
  objects (`content_for_*`, `section` beyond `id`); `assets/` served from Shopify CDN; `javascript` /
  `stylesheet` schema attributes
- **Repo files read this session:** `CLAUDE.md`, `HANDOFF.md`, `package.json`, `Dockerfile`,
  `.dockerignore`, `.gitignore`, `vitest.config.ts`, `vite.theme.config.ts`, `shopify.app.toml`,
  `extensions/quiz-block/shopify.extension.toml`, `symptom-quiz.liquid`, `quiz-embed.tsx`,
  `quiz-bundle-js.tsx`, `quiz-bundle.js.tsx`, `quiz-bundle-css.tsx`, `quiz-bundle.css.tsx`,
  `QuizContainer.tsx`, `QuizPartRenderer.tsx` (+ `.test.ts`), `ResultsDisplay.tsx`,
  `entry.theme.tsx`, `product-links.ts`, `questions.ts`, `PatientInfoStep.tsx`, `scoring.ts`,
  `migrations/001_create_submissions.sql`
- **Commands executed:** `npm test` (51/51, 519 ms), `npx shopify version` (3.94.3),
  `npx shopify app versions list --help`, `ls node_modules | grep -iE 'jsdom|happy-dom|testing-library'`
  (empty), `git log`/`git branch` (on `gsd/v1-planning-scaffold`)

### Secondary (MEDIUM confidence)

- `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` §R2, §R7.1, §R7.2, §"Separately found" — the locked
  root-cause analysis, including the Chrome property descriptor for `Location.assign`
- `docs/STOREFRONT_CONTENT_AUDIT.md` — May 8 handle observations (**now superseded by this session's
  live verification, and confirmed correct**)
- `HANDOFF.md` §"Session 28" — the stale-bundle incident, the `@vitejs/plugin-react` prod-dependency
  fix, the gitignored `package-lock.json` note, the occurrence-count verification technique
- `.planning/intel/context.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
  `.planning/ROADMAP.md`, `.planning/STATE.md`

### Tertiary (LOW confidence — flagged, not relied upon)

- Community reports on `storefront_digest` cookie bypass (`community.shopify.dev`,
  `performance.shopify.com`, HackerOne #961929) — **superseded**: the live store issues
  `_shopify_essential`. Retained only to document that the older mechanism no longer applies.
- `folio3.com` / `hulkapps.com` blog posts on app blocks — not used for any claim; the equivalent
  facts were taken from shopify.dev directly.

## Metadata

**Confidence breakdown:**

- **Live defect state: HIGH** — all four re-confirmed against the live storefront and the live served
  bundle this session, with counts, not impressions.
- **Product handles (DEF-03): HIGH** — 200/404 matrix plus canonical handle and product ID read from
  `/products/<handle>.js`. The CONTEXT.md open question is closed.
- **Shopify `product` schema (Priority 2): HIGH** — official docs, direct quotes, including the
  `default`-unsupported constraint that corrects D-11.
- **Testability strategy (Priority 3): HIGH** on the constraints (vitest config and absent DOM libs
  read directly); **MEDIUM** on the recommendation, which is a design judgement — the contract-test
  approach is unusual but is targeted precisely at this repo's demonstrated failure mode.
- **Storefront password / verification surface (Priority 4): HIGH** — the flow was executed
  end-to-end this session, not described.
- **Deploy provenance gates (Priority 1): HIGH** on mechanics (headers, absent ETags, byte counts all
  measured); **MEDIUM** on the hash-comparison secondary signal, since Docker-vs-local build
  determinism was not tested.
- **Scroll rendering (Pitfall 4/5): MEDIUM** — the sticky header is confirmed present in the live
  markup, but the visual outcome of `scrollIntoView` + `scroll-margin-top` on Sense 15.4.1 has not
  been observed. Deliberately the one item left for browser verification.

**Research date:** 2026-07-30
**Valid until:** 2026-08-29 for the Shopify schema facts (stable, documented API). **7 days** for the
live-state findings — the `testOptions` misconfiguration, the blank product pickers, and every
"today: N" baseline count are mutable by any theme-editor edit or deploy. **Re-run Gates B–E
immediately before claiming any success criterion.**
