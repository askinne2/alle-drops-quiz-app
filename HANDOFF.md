# Handoff — AlleDrops quiz app (2026-05-08 session 15)

### Goal

Prototype the iframe architecture for the AOD team. The quiz runs inside a cross-origin iframe injected by the quiz bundle itself. CSS variables matching the AlleDrops/Shopify brand are hardcoded in the embed page. BAAs and custom domain deferred until actual launch. Parallel work: Shopify storefront content audit, disclaimer updates, and iterative content-fix verification.

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
- Customer history now works (shop detection + direct-token fallback).
- Scroll-to-top on Next/Back navigation via postMessage.
- JS bundle cache fixed (300s public cache).

**Done in session 14 — uncommitted, NOT yet deployed:**
- Storefront content audit written → `docs/STOREFRONT_CONTENT_AUDIT.md`
- `ResultsDisplay.tsx` disclaimer updated with new clinical language.
- `extensions/quiz-block/blocks/symptom-quiz.liquid` disclaimer made configurable (needs `shopify app deploy`).

**Done in session 15 (this session) — storefront re-crawl via Chrome DevTools:**
- Re-crawled all pages on `allergist-on-demand.myshopify.com` to verify fixes.
- Updated `docs/STOREFRONT_CONTENT_AUDIT.md` with resolved/remaining status for every item.
- **11 items confirmed resolved** by the client between session 14 and 15 (see What Was Fixed table in audit doc).
- **2 new issues found** during re-crawl (see below).

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
- **Shop domain passed through iframe URL** — `window.location.hostname` → `?shop=` param → `AlleDropsQuizConfig.shopUrl` → `X-Shopify-Shop-Domain` header.
- **Chrome DevTools MCP for storefront audit** — Navigate, evaluate JS, extract DOM content. `document.body.innerText` gets most page content; expand `details` elements with `el.open = true` before grabbing FAQ text.

### What didn't work (DO NOT RETRY)

- **`shopify app deploy --allow-updates` updating the extension Liquid** — Even after re-adding the block in the theme customizer, the live page still renders the OLD `symptom-quiz.liquid`. Dual-mode bundle sidesteps this entirely.
- **`url.protocol` for origin in `quiz-embed.tsx`** — Returns `http:` behind Fly's TLS proxy. Always use `x-forwarded-proto` header instead.
- **`async` on the quiz bundle `<script>` tag** — Races with the inline config/override script. Use synchronous `<script src="...">` at end of `<body>`.
- **Compound CSS specificity battles with Shopify `div:empty` rule** — Use `<span>` instead.
- **Old Shopify extension APIs:** `shopify.extend`, `reactExtension`, JWKS for session tokens.
- **`unauthenticated.admin(shop)` for production shop** — Only one OAuth session exists in the Fly SQLite: `offline_aod-dev.myshopify.com`. Do NOT try to re-auth via OAuth flow — use the direct-token fallback instead.
- **`shopify theme push` (full push) to fix a single-file change** — Use `--only <file>` instead.
- **Editing `allergist-on-demand/sections/symptom-quiz.liquid` to fix the quiz page disclaimer** — That section is NOT rendered on `/pages/allergy-quiz`. The correct file is `extensions/quiz-block/blocks/symptom-quiz.liquid` in the quiz app repo.

---

### Next steps

**Immediate — deploy the session 14 changes (still pending):**
- [ ] **`shopify app deploy`** from `alle-drops-quiz-app/` — pushes the updated app block extension (configurable disclaimer, privacy block removed).
- [ ] **`shopify theme push --only sections/symptom-quiz.liquid`** from `allergist-on-demand/` — hygiene only.
- [ ] **Commit all local changes** — all session 11–14 files on disk but untracked/unstaged.

**Before sending to client:**
- [ ] **Turn off Test Mode** — Shopify admin → Themes → Customize → AlleDrops Quiz block → uncheck "Enable Test Mode" → Save.

**Verify after Test Mode is off:**
- [ ] Submit one full quiz as `askinne2@gmail.com` and confirm `customerLinked: true` in Fly logs.
- [ ] Check Customer Account history page — should show all 4 assessments.

**Content work — remaining open items from `docs/STOREFRONT_CONTENT_AUDIT.md`:**

HIGH blockers — must fix before launch:
- [ ] **Product descriptions (TN + TX)** — Full rewrite. Still has "no allergy tests needed" claim, no contraindications, no emergency 911 instruction, broken grammar, all-caps insurance note. Awaiting William for allergen list and contraindications.
- [ ] **Quiz page medical disclaimer** — Still reads "for product recommendation purposes only." Requires William and/or counsel to rewrite.
- [ ] **Create `/pages/consult`** — Still 404. Needs Shopify native calendar widget + $99 fee + provider independence statement. Awaiting William for consultation format details.
- [ ] **Fix consultation booking** — "Schedule" button on `/products/allergy-consultation` still has no mechanism.
- [ ] **Contact page — add 911 notice** — Must appear above the form before launch.
- [ ] **Privacy policy** — Replace `andrew@21adsmedia.com` contact email. Requires HIPAA NPP from AOD counsel before launch.
- [ ] **`/pages/our-team` is now 404** — NEW: page disappeared. Decide: restore, or confirm intentional removal and remove any nav references. About page now has a trimmed "Meet Your Provider" section (Dr. Ryan Sullivan only) — verify with William.

MEDIUM items:
- [ ] **Product name dashes** — "Tennessee - AlleDrops" / "Texas - AlleDrops" → remove dashes in Shopify admin.
- [ ] **Footer FDA notice — stray closing quote** — NEW: `…FDA-approved allergen extracts."` ends with an errant `"`. Fix in Shopify theme footer content. Appears globally on every page.
- [ ] **About page** — "thousands of patients" claim needs William verification; "personalized regional formula" overstates; no treatment duration mentioned.
- [ ] **How It Works** — Add link to `/pages/test-options`; mention $99 fee in Step 3.
- [ ] **`/pages/test-options`** — William must confirm/approve clinical copy before promoting this page.
- [ ] **Collections page** — Hide Allergy Consultation from `/collections/all` browse view.
- [ ] **Quiz "What are AlleDrops" section** — Add treatment duration (3–6 months / 2–3 years).

CONTENT-1 placeholder (quiz app):
- [ ] **`app/components/quiz/ConsentStep.tsx`** — `[PENDING — Treatment policy page language]` still needs William's consent/liability copy.

**Carry-over:**
- [ ] Remove duplicate quiz-history block from profile page customizer.
- [ ] Test Download PDF E2E as logged-in patient.
- [ ] Theme repo cleanup — delete `cloudflare-worker/` and `google-apps-script/` from `~/Local Sites/allergist-on-demand/`.

**Custom domain (when ready to go live):**
- DNS CNAME → Fly, `fly certs create quiz.alledrops.com -a alle-drops-quiz-app`
- Update `app_url` in Theme App Block customizer — no code changes needed

---

### Resume context

- **Branch:** `main` — all session 11–14 changes are **uncommitted**. Commit before any branch operations.
- **How to verify:** `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` — quiz loads in iframe, correct brand colors, no Test Mode button, scroll-to-top on navigation.
- **Deploy sequence for future changes:**
  - Server-side route changes only → `fly deploy -a alle-drops-quiz-app`
  - Quiz UI/CSS changes → `npm run build:theme` → `fly deploy -a alle-drops-quiz-app`
  - App block extension changes → `shopify app deploy` (from `alle-drops-quiz-app/`)
  - Theme section/template changes → `shopify theme push` (from `allergist-on-demand/`)
  - React Router `npm run build` does NOT rebuild the quiz bundle
- **Key files:**
  - `app/routes/quiz-embed.tsx` — embed page HTML
  - `app/entry.theme.tsx` — dual-mode; passes `shop: window.location.hostname` to iframe URL
  - `app/components/quiz/QuizContainer.tsx` — sends `X-Shopify-Shop-Domain` header; scroll-to-top
  - `app/routes/api.quiz.submit.tsx` — submit route; direct-token fallback for customer linking
  - `app/components/quiz/ResultsDisplay.tsx` — disclaimer shown on quiz results screen
  - `app/components/quiz/ConsentStep.tsx` — CONTENT-1 placeholder awaiting William
  - `extensions/quiz-block/blocks/symptom-quiz.liquid` — app block template; needs `shopify app deploy`
  - `docs/STOREFRONT_CONTENT_AUDIT.md` — full storefront audit, updated this session
  - `public/quiz-bundle.js` / `public/quiz-bundle.css` — rebuilt dual-mode bundle
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`)
- **Known Cloud SQL state:** `askinne2@gmail.com` has GID `gid://shopify/Customer/6822520881358`. Only one OAuth session in Fly SQLite: `offline_aod-dev.myshopify.com`.
- **Confirmed fee structure:** Optional consultation = $99 (Shopify product now correct).
- **CSS variables in embed page** (update here if theme colors change):
  - `--color-foreground: 46, 42, 57` | `--color-background: 229, 244, 237` | `--color-button: 44, 62, 63`
  - `--color-button-text: 253, 251, 247` | `--color-link: 44, 62, 63`
  - `--font-body-family / --font-heading-family: Inter, sans-serif`
  - `--gradient-background: linear-gradient(180deg, #e5f4ed, #FDFBF7 100%)`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
