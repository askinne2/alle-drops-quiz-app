# Handoff — AlleDrops quiz app (2026-05-08 session 10)

### Goal

All UX audit items from `docs/UX-AUDIT.md` are now resolved. Only 2 pre-launch blockers remain (CONTENT-1/2 — external dependencies on William). Carry-over E2E testing tasks remain.

---

### Current progress

**Shipped in PR #6 (squash-merged to `main`):**
- Extension rewritten as `extensions/quiz-history/src/QuizHistoryBlock.jsx` using the 2026-04 Preact pattern.
- `app/lib/customer-auth.ts` fixed: JWKS → HS256 with `SHOPIFY_API_SECRET` + `aud` validated against `SHOPIFY_API_KEY`.

**Shipped in session 7 (squash-merged to `main`):**
- BUG-1, BUG-2, BUG-3, UX-1, UX-2, UX-3, UX-5, UX-6 — all fixed and deployed.

**Fixed in session 8 — deployed to Fly:**
- Results page orphaned `1fr 1fr` grid (EXTRA-1)
- Progress bar answer-based across 18 questions (EXTRA-2) — later superseded by section-based approach
- Question card borders removed, hover shadow kept (VISUAL-3)
- Consent scroll box: `quizContainer__scrollBox` CSS class, readable font size (VISUAL-6)

**Fixed in session 9 — deployed to Fly:**
- **VISUAL-1** — Checkbox option rows: white background, border opacity 0.2.
- **VISUAL-2** — Score circle: 88px circle with teal border + tinted bg. Severity color classes applied in `ResultsDisplay.tsx`.
- **VISUAL-4** — Heading font-weight hard-coded to 700 (was inheriting 900 from Shopify theme).
- **VISUAL-5** — Completed step: wrapped in `.questionCard`, green SVG checkmark, profile ID styled pill, inline styles removed.
- **VISUAL-7** — IneligibleMessage: added `<h2>Not Available in Your State</h2>`.
- **quiz-theme.css background removed** — `.symptom-quiz` background-color now transparent.
- **Cache-Control fixed** — `quiz-bundle-css.tsx` and `quiz-bundle.css.tsx` changed from `max-age=3600` to `max-age=0, must-revalidate`.
- **TS error fixed** — `auth.login/route.tsx:39` — added `?? ""` fallback on `e.currentTarget.value`.

**Fixed in session 10 — built, needs deploy:**
- **UX-4** — Progress indicator now shows on StateGate ("Step 1 of 7"), PatientInfo ("Step 2 of 7"), and all 5 quiz parts ("Part X of 5"). Fill is section-based: advances 14% per step (0% → 14% → 28% → … → 86%).
- **Progress bar fill never rendered** — Root cause: Shopify `base.css` has `div:empty { display: none }` which hid the empty fill `<div>`. Fix: changed fill element from `<div>` to `<span>` (`span:empty` is not in Shopify's rule). Added `display: block` to `.quizProgress__fill` CSS class (spans are inline by default).
- **QuizProgress refactored** — Simplified to `{ fillPct, label }` props. Old `answeredCount`/`totalQuestions` answer-based approach removed (imperceptible ~5% increments replaced by visible 14% section jumps).

---

### What worked

- **Correct extension pattern (2026-04):** `import '@shopify/ui-extensions/preact'` + `render(<Component />, document.body)`. `s-` web components globally registered.
- **`shopify app deploy --allow-updates`** — fast and reliable.
- **Chrome DevTools MCP** — `evaluate_script` to query computed styles and matching CSS rules. Found `display: none` on fill element + identified the matching Shopify selector.
- **`<span>` instead of `<div>` for empty visual elements** — Shopify's `base.css` lists `div:empty, p:empty, h1:empty…` but NOT `span:empty`. Switching the fill bar to `<span>` sidesteps the rule entirely without specificity battles.
- **Fly secrets**: `SHOPIFY_API_SECRET` and `SHOPIFY_API_KEY` already set.

### What didn't work (DO NOT RETRY)

- **Compound selector to override `div:empty`** — Tried `.quizProgress__bar .quizProgress__fill { display: block }` (specificity 0,2,0 vs Shopify's 0,1,1). Logically should win but the fix was proven ineffective in DevTools while the old cached bundle was still live. Superseded by the `<span>` approach which avoids the conflict entirely.
- **Answer-based progress fill** — Each question = ~5.6% fill on an 8px bar. Imperceptible to users. Section-based fill (14% per step) is much more satisfying.
- `shopify.extend(target, factory)` — old API.
- `reactExtension` from `@shopify/ui-extensions-react/customer-account` — deprecated as of 2026-04 API.
- JWKS / `createRemoteJWKSet` for Customer Account extension session tokens — tokens are HS256.
- Preact without `@shopify/ui-extensions/preact` import.
- Vanilla `document.createElement` + `document.body.appendChild`.

---

### Next steps

**Pre-launch blockers (must fix before first real patient):**
- [ ] **CONTENT-2 (BLOCKER)** — Confirm/disable Test Mode on production page. Check Theme App Block Liquid for `testMode: true` or `?test=1`. File: `QuizContainer.tsx` + theme block Liquid.
- [ ] **CONTENT-1 (BLOCKER)** — Replace `[PENDING — Treatment policy page language]` in Section 4 of consent form with final William-approved language. File: `ConsentStep.tsx`.

**Carry-over from session 5:**
- [ ] **Remove duplicate quiz-history block** from profile page customizer (Shopify admin → Customer Account → Profile customizer).
- [ ] **Test Download PDF E2E** — click link as logged-in patient, confirm PDF downloads.
- [ ] **Submit quiz as logged-in customer** — confirm new assessment appears in history after submission.
- [ ] **Custom domain on Fly** — `fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`.

**Iframe migration (MVP plan — next major sprint):**
- Requires Day 1 prerequisites from Andrew: DNS access for `quiz.alledrops.com`, Google Cloud BAA acceptance, Fly BAA conversation initiated.
- Engineering work: `/quiz/embed` route on Fly, CSP headers, postMessage handlers, Theme App Block Liquid → iframe wrapper, custom domain cert.
- Full plan: `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md` (Day 5–6 items).

---

### Resume context

- **Branch:** `main`
- **Current deployed version:** Session 10 changes committed and pushed. `public/quiz-bundle.css` + `public/quiz-bundle.js` rebuilt. Deploy with `fly deploy -a alle-drops-quiz-app` to go live (Andrew runs deploy).
- **Deploy sequence for future CSS changes:** `npm run build:theme` → `fly deploy -a alle-drops-quiz-app` (React Router `npm run build` does NOT rebuild the quiz bundle).
- **How to verify quiz:** `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` (password: `allergy`)
- **How to verify account extension:** `https://shopify.com/65752301774/account/profile` (password: `allergy`)
- **UX audit doc:** `docs/UX-AUDIT.md` — all items resolved. Only CONTENT-1 and CONTENT-2 remain open.
- **Key files:**
  - `app/components/quiz/QuizProgress.tsx` — simplified to `{ fillPct, label }` props; fill is now `<span>` to avoid Shopify `div:empty` rule
  - `app/components/quiz/QuizContainer.tsx` — `progressInfo` computed for all steps; renders progress on state_gate, patient_info, quiz_parts
  - `app/styles/quiz.module.css` — `display: block` added to `.quizProgress__fill`
  - `app/components/quiz/ConsentStep.tsx` — CONTENT-1 placeholder still present (awaiting William)
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`)
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
