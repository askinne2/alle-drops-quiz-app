# Handoff — AlleDrops quiz app (2026-05-08 session 13)

### Goal

Prototype the iframe architecture for the AOD team. The quiz runs inside a cross-origin iframe injected by the quiz bundle itself. CSS variables matching the AlleDrops/Shopify brand are hardcoded in the embed page. BAAs and custom domain deferred until actual launch.

---

### Current progress

**Shipped in sessions 1–10 (squash-merged to `main`):**
- All UX audit items resolved. Cloud SQL submission, ledger, PDF generation, Customer Account extension all live.

**Built in sessions 11–12 — on disk, NOT committed, deployed to Fly:**
- `app/routes/quiz-embed.tsx` — Fly route returning standalone HTML embed page with brand CSS vars, postMessage wiring, height reporting, x-forwarded-proto fix, CSP: `frame-ancestors *`
- `app/entry.theme.tsx` — Dual-mode bundle: injects iframe from Shopify parent page, mounts React directly inside iframe
- `extensions/quiz-block/blocks/symptom-quiz.liquid` — Updated locally but NOT live on Shopify (old Liquid still active; dual-mode bundle sidesteps the need to update it)
- `public/quiz-bundle.js` + `public/quiz-bundle.css` — Rebuilt with dual-mode entry point

**Fixed in session 13 — deployed to Fly, still uncommitted:**
- **Customer history now works.** Root cause was a two-layer failure:
  1. The iframe origin (`alle-drops-quiz-app.fly.dev`) broke shop detection in the submit route → `customer_id_shopify` was stored as NULL → ledger query returned nothing. Fixed by passing `shop: window.location.hostname` from the parent Shopify page → iframe URL param → `AlleDropsQuizConfig.shopUrl` → `X-Shopify-Shop-Domain` header on every submit.
  2. Even with the shop detected, `unauthenticated.admin(shop)` throws `SessionNotFoundError` because only `aod-dev.myshopify.com` has a stored OAuth session — `allergist-on-demand.myshopify.com` does not. Fixed by adding a direct-token fallback: when `unauthenticated.admin()` fails, the route uses `SHOPIFY_ADMIN_ACCESS_TOKEN` + `SHOPIFY_SHOP_DOMAIN` env vars to call the Admin GraphQL API directly.
  3. Backfilled 3 existing `askinne2@gmail.com` submissions via Cloud SQL UPDATE using the known GID `gid://shopify/Customer/6822520881358`.
- **Scroll-to-top on Next/Back navigation.** `useEffect([step, currentPartIndex])` in `QuizContainer.tsx` fires `quiz:scrollToTop` postMessage; parent in `entry.theme.tsx` calls `container.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- **JS bundle cache fixed.** `quiz-bundle-js.tsx` was serving with `no-store` (183 KB re-download every load). Changed to `public, max-age=300`.

**Deployed state:** All session 13 changes are live on Fly. Changes are uncommitted.

---

### What worked

- **Dual-mode bundle** — `entry.theme.tsx` detects `window.self !== window.top`. Works with the OLD Shopify extension Liquid without needing `shopify app deploy`.
- **`x-forwarded-proto` header** — Fly's proxy strips HTTPS; must use this header to reconstruct the correct `https://` origin.
- **Hardcoded CSS variables in embed page** — The iframe is cross-origin so Shopify theme CSS variables are not inherited. Values extracted from live Shopify theme via DevTools.
- **`html { font-size: 62.5% }`** — Quiz CSS uses rem units sized for a 10px base; without this all text is oversized.
- **Loader-only route returning raw `Response`** — No default export needed.
- **`ResizeObserver` + setTimeout(200ms, 800ms) fallbacks** — Covers initial paint and React hydration.
- **`frame-ancestors *` CSP** — Allows embedding from any Shopify store domain.
- **Direct Admin API token fallback** — `SHOPIFY_ADMIN_ACCESS_TOKEN` + `SHOPIFY_SHOP_DOMAIN` secrets already deployed; using them as a fallback when `unauthenticated.admin()` fails (no stored OAuth session for production shop). This is the correct approach for a single-shop deployment.
- **Shop domain passed through iframe URL** — `window.location.hostname` → `?shop=` param → `AlleDropsQuizConfig.shopUrl` → `X-Shopify-Shop-Domain` header. Submit route already read this header as a fallback; no change needed there.
- **Cloud SQL queries via Fly SSH** — `fly ssh console` + inline Node `pg` query is the fastest way to inspect or patch Cloud SQL data without needing gcloud ADC set up locally. `gcloud sql connect` requires `gcloud auth application-default login` separately from `gcloud auth login`.

### What didn't work (DO NOT RETRY)

- **`shopify app deploy --allow-updates` updating the extension Liquid** — Even after re-adding the block in the theme customizer, the live page still renders the OLD `symptom-quiz.liquid`. Dual-mode bundle sidesteps this entirely.
- **`url.protocol` for origin in `quiz-embed.tsx`** — Returns `http:` behind Fly's TLS proxy. Always use `x-forwarded-proto` header instead.
- **`async` on the quiz bundle `<script>` tag** — Races with the inline config/override script. Use synchronous `<script src="...">` at end of `<body>`.
- **Compound CSS specificity battles with Shopify `div:empty` rule** — Use `<span>` instead.
- **Old Shopify extension APIs:** `shopify.extend`, `reactExtension`, JWKS for session tokens.
- **`unauthenticated.admin(shop)` for production shop** — Only one OAuth session exists in the Fly SQLite: `offline_aod-dev.myshopify.com`. No session for `allergist-on-demand.myshopify.com`. Do NOT try to re-auth via OAuth flow — use the direct-token fallback instead.

---

### Next steps

**Before sending to client:**
- [ ] **Turn off Test Mode** — Shopify admin → Themes → Customize → AlleDrops Quiz block → uncheck "Enable Test Mode" → Save. Currently `test=1` in the iframe src shows the pink "Test Mode: jump to outcome" button. **Must do before sharing with AOD.**
- [ ] **Commit all local changes** — `app/routes/quiz-embed.tsx`, `app/routes/api.quiz.submit.tsx`, `app/entry.theme.tsx`, `app/components/quiz/QuizContainer.tsx`, `app/routes/quiz-bundle-js.tsx`, `extensions/quiz-block/blocks/symptom-quiz.liquid`, `public/quiz-bundle.*`, `HANDOFF.md`. All on disk but untracked/unstaged.

**Verify after Test Mode is off:**
- [ ] Submit one full quiz as `askinne2@gmail.com` and confirm `customerLinked: true` in Fly logs (`fly logs -a alle-drops-quiz-app --no-tail | grep customerLinked`).
- [ ] Check Customer Account history page — should show all 4 assessments (3 backfilled + 1 new).
- [ ] Verify E2E: Tennessee → fill patient info → answer all parts → see results → use a CTA redirect button (confirms postMessage navigation).

**Pre-launch blockers:**
- [ ] **CONTENT-1 (BLOCKER)** — Replace `[PENDING — Treatment policy page language]` in consent form. File: `app/components/quiz/ConsentStep.tsx`. Awaiting copy from William.

**Carry-over:**
- [ ] Remove duplicate quiz-history block from profile page customizer.
- [ ] Test Download PDF E2E as logged-in patient.
- [ ] Theme repo cleanup — delete `cloudflare-worker/` and `google-apps-script/` from `~/Local Sites/allergist-on-demand/`.

**Custom domain (when ready to go live):**
- DNS CNAME → Fly, `fly certs create quiz.alledrops.com -a alle-drops-quiz-app`
- Update `app_url` in Theme App Block customizer — no code changes needed

---

### Resume context

- **Branch:** `main` — all session 11–13 changes are **uncommitted**. Commit before any branch operations.
- **How to verify:** `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` (password: `allergy`) — quiz should load in iframe with correct AlleDrops brand colors, no Test Mode button, scroll-to-top on navigation.
- **Deploy sequence for future changes:**
  - Server-side route changes only → `fly deploy -a alle-drops-quiz-app`
  - Quiz UI/CSS changes → `npm run build:theme` → `fly deploy -a alle-drops-quiz-app`
  - React Router `npm run build` does NOT rebuild the quiz bundle
- **Key files:**
  - `app/routes/quiz-embed.tsx` — embed page HTML; reads `?shop=` param, sets `shopUrl` in config
  - `app/entry.theme.tsx` — dual-mode; passes `shop: window.location.hostname` to iframe URL; handles `quiz:scrollToTop` postMessage
  - `app/components/quiz/QuizContainer.tsx` — sends `X-Shopify-Shop-Domain` header; fires `quiz:scrollToTop` on step/part change
  - `app/routes/api.quiz.submit.tsx` — submit route; direct-token fallback for customer linking
  - `app/components/quiz/ConsentStep.tsx` — CONTENT-1 placeholder awaiting William
  - `public/quiz-bundle.js` / `public/quiz-bundle.css` — rebuilt dual-mode bundle (session 13)
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`)
- **Known Cloud SQL state:** `askinne2@gmail.com` has GID `gid://shopify/Customer/6822520881358`. 3 previously unlinked submissions were backfilled in session 13. Only one OAuth session in Fly SQLite: `offline_aod-dev.myshopify.com`.
- **CSS variables in embed page** (update here if theme colors change):
  - `--color-foreground: 46, 42, 57` | `--color-background: 229, 244, 237` | `--color-button: 44, 62, 63`
  - `--color-button-text: 253, 251, 247` | `--color-link: 44, 62, 63`
  - `--font-body-family / --font-heading-family: Inter, sans-serif`
  - `--gradient-background: linear-gradient(180deg, #e5f4ed, #FDFBF7 100%)`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
