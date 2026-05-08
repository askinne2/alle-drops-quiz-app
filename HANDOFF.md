# Handoff — AlleDrops quiz app (2026-05-08 session 6)

### Goal

Session 6 walked the full quiz front-end E2E using Chrome DevTools MCP. Found and documented 18 UX/UI issues across all steps. **Next session: work through the findings in `docs/UX-AUDIT.md` one-by-one, starting with the two pre-launch blockers and the nav button CSS bug.**

---

### Current progress

**Shipped in PR #6 (squash-merged to `main`):**
- Extension rewritten as `extensions/quiz-history/src/QuizHistoryBlock.jsx` using the 2026-04 Preact pattern.
- `extensions/quiz-history/tsconfig.json` added with `jsxImportSource: preact`, `noEmit: true`, `exclude: ["dist"]`.
- `extensions/quiz-history/shopify.extension.toml` module updated to `./src/QuizHistoryBlock.jsx`.
- `app/lib/customer-auth.ts` fixed: JWKS → HS256 with `SHOPIFY_API_SECRET` + `aud` validated against `SHOPIFY_API_KEY`.
- Deployed as `alledrops-quiz-production-12` (Shopify) and Fly updated.

**Verified in browser:**
- "Symptom Assessment History" section renders on profile page.
- `GET /api/me/assessments` returns 200 with real data (date: May 7, 2026).
- Download PDF link is present and correctly formed.

---

### What worked

- **Correct extension pattern (2026-04):** `import '@shopify/ui-extensions/preact'` + `render(<Component />, document.body)` with a synchronous default export. `s-` web components are globally registered — no import needed.
- **`jsxImportSource: preact` in tsconfig** — tells esbuild to use Preact's JSX runtime.
- **`shopify app deploy --allow-updates`** — fast, reliable every time.
- **Chrome DevTools MCP** — captured the Authorization header from the network request, decoded the JWT header in-browser to confirm `alg: HS256`, which led directly to the auth fix.
- **Fly secrets**: `SHOPIFY_API_SECRET` and `SHOPIFY_API_KEY` were already set; no new secrets needed.
- **Shopify MCP (`polaris-customer-account-extensions`)** — confirmed `reactExtension` is the OLD API; pointed to the Preact pattern with the upgrade guide example.

### What didn't work (DO NOT RETRY)

- `shopify.extend(target, factory)` — old API, factory called with no args.
- `reactExtension` from `@shopify/ui-extensions-react/customer-account` — deprecated as of 2026-04 API.
- JWKS / `createRemoteJWKSet` for verifying Customer Account extension session tokens — tokens are HS256 signed with the app shared secret, not asymmetric JWKS.
- Preact without `@shopify/ui-extensions/preact` import — signals not connected to Remote DOM channel.
- Vanilla `document.createElement` + `document.body.appendChild` — not synced to Remote DOM channel.

---

### Next steps

**UX/UI fixes — work from `docs/UX-AUDIT.md` in priority order:**
- [ ] **CONTENT-2 (BLOCKER)** — Confirm/disable Test Mode on production page. Check Theme App Block Liquid for `testMode: true` or `?test=1` in config. File: `QuizContainer.tsx:457` + theme block Liquid.
- [ ] **CONTENT-1 (BLOCKER)** — Replace `[PENDING — Treatment policy page language]` in consent form with final William-approved language. File: `ConsentStep.tsx:56`.
- [ ] **BUG-1** — Add `${styles.quizNavigation__button}` base class to all 8 nav buttons in `QuizContainer.tsx` (lines 315, 318, 349–363, 364–381, 414–425, 436–450). This fixes broken borders, border-radius, and flex on ← Previous / Next → / Submit across every step.
- [ ] **BUG-2** — Remove or narrow the blanket `:global(button)` override in `quiz-theme.css:237`. This fixes the "No — I live in another state" button rendering dark instead of outlined.
- [ ] **UX-1** — Style the "No" StateGate button as a secondary/ghost variant with a visual separator.
- [ ] **UX-2** — Replace `window.confirm()` in `handleProceedWithoutTesting` with an inline confirmation panel.
- [ ] **UX-3** — Add primary/secondary visual hierarchy to results CTA buttons; make them full-width.
- [ ] **UX-5** — Add spinner/loading indicator to the "submitting" step.
- [ ] **UX-6** — Add copy-to-clipboard button for Symptom Profile ID on results page.
- [ ] **BUG-3** — Add `className={styles.button}` to error state Back button (`QuizContainer.tsx:259`).

**Visual polish (third pass):**
- [ ] **VISUAL-1** — White background on checkbox option rows (currently near-invisible on mint).
- [ ] **VISUAL-2** — Score circle needs actual circle shape; apply severity color classes to bracket value.
- [ ] **VISUAL-4** — Cap quiz heading font-weight at 700 in CSS module.
- [ ] **VISUAL-5** — Completed step needs card wrapper + success state.
- [ ] **VISUAL-6** — Consent scroll box: dedicated CSS class + scroll shadow indicator.
- [ ] **VISUAL-7** — Add heading to IneligibleMessage.
- [ ] **VISUAL-3** — Add resting box-shadow to question cards.
- [ ] **UX-4** — Extend progress indicator to StateGate and PatientInfo steps.

**Carry-over from session 5:**
- [ ] **Remove duplicate quiz-history block** from profile page customizer (Shopify admin → Customer Account → Profile customizer).
- [ ] **Test Download PDF E2E** — click link as logged-in patient, confirm PDF downloads.
- [ ] **Submit quiz as logged-in customer** — confirm new assessment appears in history after submission.
- [ ] **Custom domain on Fly** — `fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`.

---

### Resume context

- **Branch:** `main` (all changes in PR #6 squash-merged)
- **Current deployed version:** `alledrops-quiz-production-12` (Shopify extension), Fly `alle-drops-quiz-app` updated
- **How to verify:** navigate to `https://shopify.com/65752301774/account/profile` (password: `allergy`), check "Symptom Assessment History" renders with data
- **UX audit doc:** `docs/UX-AUDIT.md` — 18 findings with exact file/line references, severity, and fix descriptions. Work top-to-bottom.
- **Key files for UX fixes:**
  - `app/components/quiz/QuizContainer.tsx` — main state machine; BUG-1, BUG-3, UX-2, UX-5, CONTENT-2 fixes all land here
  - `app/components/quiz/StateGate.tsx` — UX-1 (No button secondary style)
  - `app/components/quiz/ResultsDisplay.tsx` — UX-3, UX-6, VISUAL-2
  - `app/components/quiz/ConsentStep.tsx` — CONTENT-1, VISUAL-6
  - `app/components/quiz/IneligibleMessage.tsx` — VISUAL-7
  - `app/styles/quiz.module.css` — VISUAL-1, VISUAL-3, VISUAL-4, VISUAL-5; BUG-1 base class definitions live here
  - `app/styles/quiz-theme.css` — BUG-2 (remove `:global(button)` override at line 237)
- **Extension files (session 5, stable):**
  - `extensions/quiz-history/src/QuizHistoryBlock.jsx` — working Preact extension
  - `app/lib/customer-auth.ts` — HS256 token verification (fixed session 5)
- **Test store:** `allergist-on-demand.myshopify.com` (password: `allergy`). Profile: `https://shopify.com/65752301774/account/profile`
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`)
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff" — then open `docs/UX-AUDIT.md` and say "let's fix these one by one starting from the top."
