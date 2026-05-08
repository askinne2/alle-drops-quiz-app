# Handoff — AlleDrops quiz app (2026-05-08 session 4)

### Goal

Get the quiz-history Customer Account UI extension rendering on `/account/profile` — logged-in patient sees "Symptom Assessment History" with a Download PDF link.

---

### Current progress

**Shipped to `main` (all PRs merged including PR #5):**
- PRs #1–5 merged. `main` is fully up-to-date.
- `shopify.app.toml` points at the correct Production app (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`).
- Extension block IS added to the Customer Accounts Profile page customizer (`placementReference: "PROFILE1"`, `position: 0`).

**Deployed versions this session (all to `alledrops-quiz-production-N`):**
- v9: render to `root` param (broken — `root` is `undefined`, factory called with no args)
- v10: render to `document.body` via preact (broken — preact DOM reconciler doesn't sync to Remote DOM channel)
- v11: vanilla JS DOM manipulation to `document.body` (still not rendering — current deployed version)

**Current `main` state:** vanilla JS extension at `extensions/quiz-history/src/QuizHistoryBlock.js`

---

### Sandbox architecture (deep investigation — DO NOT RE-INVESTIGATE)

We read and analyzed Shopify's `sandbox-DZwF8yjP.js` (741KB) in full. Key findings:

1. **`shopify.extend(target, factory)` stores the factory.** The sandbox then calls `factory()` with **NO ARGS** (`this.output = l.get(e)?.()`) — so any `(root) => ...` parameter is always `undefined`.

2. **`jN` factory connects `document.body` to the Remote DOM channel.** It runs `Sw(e.global.document.body, connection)` which starts syncing `document.body` mutations to the parent page. This happens BEFORE the extension factory is called.

3. **`MN` factory creates a virtual Window (`new aw`)** as `this.global`. All code inside the extension IIFE runs in a `with (this.global)` scope chain, so `document` in any bundled code (including preact) resolves to the virtual document.

4. **The virtual `document.body` IS the correct render target** — it is connected to the parent page via the Remote DOM channel.

5. **Preact's DOM reconciler fails silently** — even though `document` resolves to the virtual document, the rendered elements aren't synced to the parent. Root cause unknown (possibly MutationObserver not wired, or Remote DOM elements don't support full DOM interface).

6. **Vanilla `document.createElement`/`appendChild` also failed** — no `s-section` appeared in the parent DOM and no Fly API call was made. Most likely `shopify.sessionToken.get()` or the fetch is blocked, OR the Remote DOM sync isn't triggered by standard DOM operations.

**The correct architecture is `@shopify/ui-extensions-react/customer-account` with `reactExtension`.** This is Shopify's ONLY officially supported JSX/component approach for this extension surface. It includes a custom React reconciler designed for the Remote DOM protocol.

---

### What worked

- Chrome DevTools MCP: versionTag check via inline script, CDN bundle fetch to verify content.
- `shopify app deploy --allow-updates` — deploys correctly every time.
- `git push` + PR + `gh pr merge` — all clean.
- The extension block IS added and configured in the customizer (confirmed via inline script `placementReference: "PROFILE1"`).
- Reading `sandbox-DZwF8yjP.js` from CDN to understand exact execution model.

### What didn't work (DO NOT RETRY THESE)

- `render(<Component />, root)` — `root` is always `undefined` (factory called with no args).
- `render(<Component />, document.body)` with Preact — preact DOM reconciler doesn't sync to Remote DOM.
- Vanilla `document.createElement('s-section')` + `document.body.appendChild()` — no visible output.
- Trying to figure out why `document.createElement` doesn't work — not productive without sandbox console access.

---

### Next steps

- [ ] **Install `@shopify/ui-extensions-react`** in the extension:
  ```bash
  cd extensions/quiz-history
  npm install @shopify/ui-extensions-react react react-dom
  ```
  Or use preact/compat alias if bundle size is a concern (alias `react` → `preact/compat` in esbuild config).

- [ ] **Rewrite `QuizHistoryBlock` using `reactExtension`:**
  ```jsx
  // extensions/quiz-history/src/QuizHistoryBlock.jsx
  import { reactExtension, Section, Text, Spinner, Banner, InlineStack, Link } from '@shopify/ui-extensions-react/customer-account';
  import { useSessionToken } from '@shopify/ui-extensions/customer-account/preact'; // or React hook equiv
  import { useState, useEffect } from 'react';

  export default reactExtension('customer-account.profile.block.render', () => <QuizHistory />);

  function QuizHistory() {
    const [status, setStatus] = useState('loading');
    const [assessments, setAssessments] = useState([]);
    const [token, setToken] = useState('');
    // ...same logic as before...
  }
  ```
  Check `@shopify/ui-extensions-react/customer-account` for exact component names (`Section`, `Text`, `Spinner`, `Banner`, `InlineStack`, `Link`).

- [ ] **Update `shopify.extension.toml`** module back to `./src/QuizHistoryBlock.jsx`

- [ ] **Deploy and verify:** `shopify app deploy --allow-updates` → hard reload profile page → check for `s-section` in DOM and Fly API call in Network tab.

- [ ] **After block renders:** verify E2E — submit quiz as logged-in customer → see assessment list → Download PDF works.

- [ ] **Remove "Test Mode" button** from `/pages/allergy-quiz` before go-live.

---

### Resume context

- **Branch:** `main` (all changes committed and pushed)
- **Current deployed version:** `alledrops-quiz-production-11` (vanilla JS, not working)
- **How to check served version:**
  ```js
  [...document.querySelectorAll('script')].map(s=>s.textContent).find(t=>t?.includes('versionTag'))?.match(/"versionTag":"([^"]+)"/)?.[1]
  ```
- **Key files:**
  - `extensions/quiz-history/src/QuizHistoryBlock.js` — current vanilla JS (replace with reactExtension version)
  - `extensions/quiz-history/shopify.extension.toml` — module points to `./src/QuizHistoryBlock.js`, change to `.jsx` after rewrite
  - `extensions/quiz-history/package.json` — needs `@shopify/ui-extensions-react` + `react` added
  - `app/routes/api.me.assessments.tsx` — ledger endpoint (working, deployed on Fly)
  - `app/routes/api.me.assessment.$id.pdf.tsx` — PDF endpoint (working, deployed on Fly)
- **Test store:** `allergist-on-demand.myshopify.com` (password: `allergy`). Profile: `https://shopify.com/65752301774/account/profile`
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`). Currently on v11; next deploy will be v12.

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff" — rewrite the extension using `reactExtension` from `@shopify/ui-extensions-react/customer-account`, deploy, and verify the block renders.
