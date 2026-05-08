# Handoff — AlleDrops quiz app (2026-05-07 session 3)

### Goal

Get the quiz-history Customer Account UI extension rendering on `/account/profile` — logged-in patient sees "Symptom Assessment History" with a Download PDF link. Thread B (cross-origin iframe) follows after Thread A is verified end-to-end.

---

### Current progress

**Shipped to `main` (PRs merged):**
- PRs #1–4 all merged (see previous HANDOFFs).

**Branch in flight: `fix-preact-signals-dep`** (pushed, not yet merged to main)
This session added 3 more uncommitted changes on top of the original 2 commits:
- Original commit 1: added `@preact/signals` to `extensions/quiz-history/package.json`
- Original commit 2: downgraded `api_version` to `"2026-01"` in `shopify.extension.toml`
- **This session — Change 3:** swapped `client_id` in `shopify.app.toml` from `50649e96ebe691d70569e0b75ea051b4` → `1af0c030f06eea4b8b46d3c006f431d3` and renamed app to `"AlleDrops Quiz Production"`
- **This session — Change 4:** fixed render target in `QuizHistoryBlock.jsx` — changed `render(<QuizHistory />, document.body)` → `render(<QuizHistory />, root)` (see Root Cause below)

**Shopify app situation (THE SMOKING GUN):**
Two apps existed in the Partners dashboard:
1. **AlleDrops Quiz App** (`alledrops-quiz-app-N` slug, client `50649e96...`) — where all previous deploys landed. The install link for this app was broken/invalid.
2. **AlleDrops Quiz Production** (`alle-drops-quiz-app-N` slug, client `1af0c030...`) — the original working app already installed on the store.

We were deploying to the wrong app the entire time. Fixed by swapping `client_id` in `shopify.app.toml` to point at the Production app.

**Deploys this session:**
- `shopify app deploy` after client_id swap → `alledrops-quiz-production-7` (30KB bundle confirmed non-empty ✅)
- Andrew added the Quiz History block to the Customer Accounts Profile page customizer ✅
- Extension version confirmed via DevTools: `versionTag: "alledrops-quiz-production-7"` ✅

**Root cause of non-rendering (FIXED, needs deploy):**
The Shopify Customer Account UI extension runtime runs the bundle in a hidden sandbox iframe (`display:none`). It provides a `root` DOM element via the `shopify.extend` callback and projects whatever is rendered into `root` up to the parent page. The extension was rendering to `document.body` (wrong target — not monitored by the runtime), so nothing appeared in the parent page DOM. No `s-*` web components, no visible block.

Fix applied to `QuizHistoryBlock.jsx`:
```js
// Before (broken):
export default async () => { render(<QuizHistory />, document.body) }
// After (fixed):
export default (root) => { render(<QuizHistory />, root) }
```

**Still needs:** `shopify app deploy` to push this fix as v8 of `alledrops-quiz-production`, then reload and verify.

---

### What worked

- Chrome DevTools MCP: checking `versionTag` + `scriptUrl` inline script data to confirm which extension version serves.
- Fetching the CDN bundle URL directly in DevTools to confirm 30KB non-empty bundle vs 1-byte `(()=>{})();` empty bundle.
- Checking `document.querySelectorAll('iframe')` + `getBoundingClientRect()` to confirm extension sandbox iframe is `display:none, 0×0` — confirmed non-visible sandbox model.
- `shopify app deploy` after client_id swap → extension now loads as `alledrops-quiz-production-7`.
- `npm run typecheck && npm test` — clean, 15/15 tests pass.
- Fly deploy working; `/api/quiz/submit` returns 200.

### What didn't work

- Deploying to `"AlleDrops Quiz App"` (client `50649e96...`) — wrong app; store was always on the Production app.
- The install link from Shopify Partners for "AlleDrops Quiz App" was invalid (expired OAuth UUID). Use the auth URL directly if ever needed: `https://alle-drops-quiz-app.fly.dev/auth?shop=allergist-on-demand.myshopify.com`
- `import '@shopify/ui-extensions/preact'` is a side-effect-only import that registers Preact signals with the runtime — it does NOT set up rendering. The `@shopify/ui-extensions/customer-account` ESM/esnext build is 1 byte (empty). Only `@shopify/ui-extensions/customer-account/preact` (hooks) is populated.
- Rendering to `document.body` in the extension sandbox — the runtime ignores document.body; it only projects content from the `root` element it provides.

---

### Next steps

- [ ] **`shopify app deploy`** — push the `root` fix as `alledrops-quiz-production-8`
- [ ] **Hard-refresh `/account/profile`** and confirm `versionTag` is `alledrops-quiz-production-8` (or higher)
- [ ] **Verify block renders:** check that `document.querySelectorAll('s-section')` returns elements, and the "Symptom Assessment History" heading appears visually
- [ ] **Verify API call:** confirm `alle-drops-quiz-app.fly.dev/api/me/assessments` appears in the Network tab (fetch/XHR)
- [ ] **A4 E2E verification:** Submit quiz as logged-in customer → see assessment list on profile → click Download PDF → PDF downloads
- [ ] **Merge `fix-preact-signals-dep` branch** as a PR to main (5 changes: @preact/signals dep, api_version, client_id swap, app name, root render fix)
- [ ] **"Test Mode" button** on `/pages/allergy-quiz` — hide or remove before go-live

---

### Resume context

- **Branch:** `fix-preact-signals-dep` (uncommitted local changes for Change 3 + Change 4 above — commit these before deploying)
- **How to verify locally:** `npm run typecheck && npm test`
- **How to check served version (fastest):** DevTools console on profile page:
  ```js
  [...document.querySelectorAll('script')].map(s=>s.textContent).find(t=>t?.includes('versionTag'))?.match(/"versionTag":"([^"]+)"/)?.[1]
  ```
  Should return `alledrops-quiz-production-8` (or higher) after next deploy.
- **Key files:**
  - `extensions/quiz-history/src/QuizHistoryBlock.jsx` — **FIXED this session** — now uses `(root) => render(<QuizHistory />, root)`
  - `shopify.app.toml` — **UPDATED this session** — `client_id = "1af0c030f06eea4b8b46d3c006f431d3"`, `name = "AlleDrops Quiz Production"`
  - `extensions/quiz-history/package.json` — has `@preact/signals ^2.9.0`
  - `extensions/quiz-history/shopify.extension.toml` — `api_version = "2026-01"`, `network_access = true`
  - `app/routes/api.me.assessments.tsx` — ledger endpoint (working)
  - `app/routes/api.me.assessment.$id.pdf.tsx` — PDF endpoint with `?token=` fallback (Fly deployed)
- **Test store:** `allergist-on-demand.myshopify.com` (password: `allergy`). Profile: `https://shopify.com/65752301774/account/profile`
- **Fly app:** `alle-drops-quiz-app` on Fly.io. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (client `1af0c030f06eea4b8b46d3c006f431d3`). Versions use slug `alle-drops-quiz-app-N`. Currently on v7; next deploy will be v8.

---

**Pickup:** `@HANDOFF.md` and say **"continue from the handoff"** — commit the two local changes (client_id + root render fix), run `shopify app deploy`, reload the profile page, and verify the Quiz History block renders with the Symptom Assessment History heading.
