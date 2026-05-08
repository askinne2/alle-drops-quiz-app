# Handoff — AlleDrops quiz app (2026-05-08 session 5)

### Goal

Quiz-history Customer Account UI extension is **fully working** on `/account/profile`. Logged-in patient sees "Symptom Assessment History" with date + Download PDF link. Next session: walk the full quiz front-end (storefront quiz flow, E2E testing, and pre-go-live cleanup).

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

- [ ] **Remove duplicate block** — the block appears twice on the profile page (two placements in the customizer). Remove one via Shopify admin → Customer Account → Profile customizer.
- [ ] **Test Download PDF E2E** — click the Download PDF link as a logged-in patient, confirm the PDF downloads (calls `GET /api/me/assessment/{id}/pdf?token=...` on Fly).
- [ ] **Submit quiz as logged-in customer** — confirm new assessment appears in the history list on profile page after submission.
- [ ] **Walk the full quiz front-end** — review the storefront quiz flow (Theme App Block embed), iframe plan, UX/copy, state machine, consent text. See `aod-mvp-plan.md` and CLAUDE.md for full scope.
- [ ] **Remove "Test Mode" button** from `/pages/allergy-quiz` before go-live.
- [ ] **Custom domain on Fly** — `fly certs create quiz.allerdrops.com -a alle-drops-quiz-app` (iframe plan).

---

### Resume context

- **Branch:** `main` (all changes in PR #6 squash-merged)
- **Current deployed version:** `alledrops-quiz-production-12` (Shopify extension), Fly `alle-drops-quiz-app` updated
- **How to verify:** navigate to `https://shopify.com/65752301774/account/profile` (password: `allergy`), check "Symptom Assessment History" renders with data
- **Key files:**
  - `extensions/quiz-history/src/QuizHistoryBlock.jsx` — extension entry point (Preact JSX, new API)
  - `extensions/quiz-history/shopify.extension.toml` — targets `customer-account.profile.block.render`
  - `app/lib/customer-auth.ts` — HS256 token verification (fixed this session)
  - `app/routes/api.me.assessments.tsx` — ledger endpoint (working)
  - `app/routes/api.me.assessment.$id.pdf.tsx` — PDF endpoint (working, untested E2E)
  - `app/components/quiz/` — quiz front-end components (next session focus)
- **Test store:** `allergist-on-demand.myshopify.com` (password: `allergy`). Profile: `https://shopify.com/65752301774/account/profile`
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`)
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff" — or proceed directly to the quiz front-end walk-through.
