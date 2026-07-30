# Phase 1: Live Defect Fixes - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Every navigation and label already shipped to patients behaves the way it was designed to. Four defects in live code (DEF-01 through DEF-04), fixed and deployed as a self-contained batch that depends on no other phase.

This phase does NOT change quiz content, add or reorder questions, alter scoring, touch the results page beyond one label, or build any purchase gating. Those are Phases 2 through 8.

</domain>

<decisions>
## Implementation Decisions

### URL resolution ownership

- **D-01: The parent resolves URLs, not the child.** The iframe posts a **relative path** (e.g. `/pages/test-options`) in the `quiz:navigate` message. The Liquid app block resolves it against its own `window.location.origin`, which is inherently the shop origin. Chosen because the parent already knows the shop origin with certainty, no new query parameter is needed, and it enables same-origin validation (D-05).

- **D-02: Delete the `window.location.assign` override entirely.** `app/routes/quiz-embed.tsx:57-59` reassigns `window.location.assign`, but `Location.assign` is a `[LegacyUnforgeable]` own property — non-writable and non-configurable. In the sloppy-mode inline script the assignment fails **silently** (verified in Chrome: descriptor is `{writable:false, configurable:false}`, no throw). Replace with an explicit `navigateParent(path)` helper. Do not attempt to make the override work.

- **D-03: The anchor click interceptor has the same origin bug and must be fixed in the same change.** `quiz-embed.tsx:70` resolves `new URL(href, window.location.href)` — and `window.location.href` is the **Fly origin**, not the shop. So the product-page anchor currently posts `https://alle-drops-quiz-app.fly.dev/products/...` and the parent navigates the storefront off to the Fly domain. Change the interceptor to post the raw relative href and let the parent resolve it (D-01). **This corrects an earlier audit claim that the anchor path "works" — it does not.**

- **D-04: All five navigation exits must be fixed, not four.** Four `window.location.assign` call sites plus the anchor. Full list:
  - `app/components/quiz/QuizContainer.tsx:215` → consult
  - `app/components/quiz/QuizContainer.tsx:228` → test options
  - `app/components/quiz/QuizContainer.tsx:248` → test options
  - `app/components/quiz/QuizContainer.tsx:328` → `/` (Return Home)
  - `app/components/quiz/QuizContainer.tsx:335` → `/products/{handle}` (anchor)

### postMessage trust boundary

- **D-05: Harden the parent message handler in this phase.** `extensions/quiz-block/blocks/symptom-quiz.liquid:59-67` currently checks neither the sender origin nor the payload, and will `window.location.assign()` any URL it receives — an open redirect on a patient-facing storefront. Since these exact lines are being rewritten anyway, add both guards:
  1. Verify `e.origin` matches the configured app URL (`block.settings.app_url`, defaulting to the Fly origin).
  2. Accept **only same-origin relative paths** for navigation. Reject absolute URLs, protocol-relative URLs (`//evil.com`), and anything resolving off-origin.
  Apply the origin check to the `quiz:resize` handler too — it currently sets iframe height from any sender.

### Scroll behavior

- **D-06: Scroll to the top of the iframe, instantly.** `iframe.scrollIntoView({ block: "start" })` with no `behavior: "smooth"`. Rationale: lands the patient on the first question of the new step, and instant avoids a visible glide firing on every Next across seven steps. Do NOT scroll to the section wrapper — that would re-show the H1 and medical disclaimer on every step change.

- **D-07: The fix goes in the Liquid app block, not `app/entry.theme.tsx`.** The app-block embed path is what is installed on the live theme (confirmed 2026-07-29 in the theme editor: the block appears under Template → Apps with its own settings panel). `app/entry.theme.tsx:69-71` already handles `quiz:scrollToTop` correctly, but that code runs only in the bundle-injection embed path, which is not in use. Mirror its behavior into `symptom-quiz.liquid` — minus the smooth behavior, per D-06.

- **D-08: The app side of scroll needs no change.** `QuizContainer.tsx:111-122` already posts `quiz:scrollToTop` on every `step` / `currentPartIndex` change, and the message is present in the shipped `public/quiz-bundle.js`. This is a missing-listener defect only.

### Product handles

- **D-09: Product handles move from code to merchant-editable block settings.** Currently hardcoded in `app/lib/quiz/product-links.ts:2-5` and imported into `QuizContainer.tsx:335` at build time, so a wrong handle requires a deploy to fix.

- **D-10: Use Shopify's product picker (`"type": "product"`), not a text field.** Gives William a searchable dropdown of products that actually exist. Typos become impossible, it self-heals when a handle is renamed in admin, and — importantly — **it eliminates the open "verify handle spelling against the live store" item**, because he selects from real products rather than typing a string. Two settings needed: Tennessee product, Texas product.

- **D-11: Keep `product-links.ts` as the fallback default.** If a setting is blank, fall back to the hardcoded map. Correct the spelling there too — `tennessee-allerdrops` / `texas-allerdrops` should be `tennessee-alledrops` / `texas-alledrops`. The corrected values also become the schema defaults. Note this spelling is still **unverified** against the live store (see Open Questions).

- **D-12: Handles reach the app the same way redirects already do.** `_embed_src` in `symptom-quiz.liquid:46` already passes `consult`, `testOptions`, and `test` as query params. Add the two resolved product handles the same way; `quiz-embed.tsx` reads them into `window.AlleDropsQuizConfig`; `QuizContainer` prefers config over the imported map. Follow the existing `consultRedirectUrl` / `testOptionsRedirectUrl` pattern exactly — do not invent a new mechanism.

### Copy

- **D-13: Drop the `(required):` suffix, keep the enforcement.** `app/lib/quiz/questions.ts:198` must read exactly "Please list your current allergy medications and dosages". The required-ness lives separately in `isPartComplete` (`QuizPartRenderer.tsx:296-298`) and must continue to work. Verify with a test that the field still blocks progression when empty.

### Verification

- **D-14: Verify against rendered DOM, not deploy success.** A prior session (28) was burned by treating a successful `fly deploy` plus matching HTTP headers as proof a fix was live — the app was healthy but serving a stale static file the build never touched. Every success criterion in this phase must be confirmed in a real browser against the live storefront quiz page, including a click-through of each of the five navigation exits.

### Claude's Discretion

- The exact shape of the `navigateParent(path)` helper and where it lives.
- Whether the same-origin validation is a shared helper or inline in the Liquid script.
- Test structure and placement, provided the existing 51/51 continue to pass.
- Whether the corrected fallback handles ship as a separate commit from the settings work.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and locked decisions
- `.planning/ROADMAP.md` §"Phase 1: Live Defect Fixes" — goal, five success criteria, the note that the app-block path (not `entry.theme.tsx`) is the one installed
- `.planning/REQUIREMENTS.md` §"Live Defect Fixes" — DEF-01 through DEF-04 with file:line targets
- `.planning/PROJECT.md` — locked decisions from the 2026-07-29 client call, and the two decisions blocked on the client

### Root-cause analysis for these specific defects
- `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` §R7.1 — the `[LegacyUnforgeable]` diagnosis with the verified Chrome property descriptor, and the four-call-site table
- `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` §R7.2 — the missing-listener diagnosis and why the two embed paths diverge
- `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` §R2 — the medication label copy requirement
- `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` §"Separately found" — the product handle mismatch

### Storefront facts
- `docs/STOREFRONT_CONTENT_AUDIT.md` §58,76 — the live product handles as observed 2026-05-08 (the source of the mismatch claim; treat as dated)
- `docs/STOREFRONT_CONTENT_AUDIT.md` §182-184 — `/pages/consult` returning 404 on the live store

### Deploy-pipeline history — read before claiming a fix is live
- `HANDOFF.md` §"Session 29" / "What didn't work" — the stale-bundle incident: `npm run build:theme` dependencies were absent from the production Docker install, so a real deploy served an untouched static file
- `.planning/intel/context.md` — accumulated project state, open items, and prior-session landmines

### Files this phase touches
- `extensions/quiz-block/blocks/symptom-quiz.liquid` — message handler (`:56-69`), `_embed_src` construction (`:46`), schema settings (`:75-176`)
- `app/routes/quiz-embed.tsx` — the failing override (`:57-59`), anchor interceptor (`:62-72`), config injection (`:46-53`)
- `app/components/quiz/QuizContainer.tsx` — `getRedirectUrl` (`:43`), five navigation exits (`:215,228,248,328,335`), scroll dispatch (`:111-122`)
- `app/lib/quiz/product-links.ts` — the handle map
- `app/lib/quiz/questions.ts:198` — the medication label

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The `consultRedirectUrl` / `testOptionsRedirectUrl` pattern** — a complete, working precedent for getting a merchant-configured value from a Liquid block setting, through `_embed_src` query params, into `window.AlleDropsQuizConfig`, and out via `getRedirectUrl()`. D-12 follows it for product handles rather than inventing anything.
- **The anchor click interceptor** (`quiz-embed.tsx:62-72`) — the right *mechanism* (`preventDefault` + `postMessage`), wrong URL resolution. Keep the structure, fix line 70.
- **`app/entry.theme.tsx:69-71`** — a correct `quiz:scrollToTop` handler to mirror into Liquid. Reference implementation, not a file to modify.
- **`quiz:resize`** (`symptom-quiz.liquid:61-63` ↔ `quiz-embed.tsx:74-88`) — proof the postMessage channel works end to end. The scroll fix is the same shape.

### Established Patterns
- **The iframe is `scrolling="no"` with height driven by `quiz:resize`** (`symptom-quiz.liquid:52-54`). The parent document is therefore the only scroller, which is exactly why a dropped `quiz:scrollToTop` produces no scroll at all rather than a partial one.
- **Two embed paths exist and only one is installed.** Any parent-side fix must go in the Liquid block. Changing `entry.theme.tsx` would be invisible in production.
- **Block settings are already the configuration surface** for redirects, app URL, disclaimer text, and test mode — so D-09's move is consistent with how this block already works.
- **`quiz-embed.tsx` reconstructs its public origin from `x-forwarded-proto`** (`:7-8`) because Fly terminates TLS at the proxy. Relevant if the origin check in D-05 needs the app's own origin.

### Integration Points
- `symptom-quiz.liquid` `<script>` block — where the scroll listener, origin validation, and relative-path resolution all land.
- `_embed_src` (`symptom-quiz.liquid:46`) — gains two product-handle params.
- `quiz-embed.tsx` loader — reads the new params, injects into config, and hosts the rewritten interceptor.
- `QuizContainer.tsx` — five navigation exits switch to `navigateParent()`; the product anchor reads its handle from config with the map as fallback.

### Known trap
- **`window.AlleDropsQuizConfig.shopUrl` is empty in production.** The Liquid block never passes `?shop=` in `_embed_src`, so `shopDomain` is `''` at `quiz-embed.tsx:13`. Do not build any fix on top of `shopUrl` — it is not populated. This is also why `QuizContainer.tsx:60` never sets the `X-Shopify-Shop-Domain` header on submissions (see Deferred).

</code_context>

<specifics>
## Specific Ideas

- **"Instant, not smooth"** was a deliberate call on the scroll: a smooth glide is pleasant once and tiring seven times. If smooth is ever revisited, gate it behind `prefers-reduced-motion`.
- **The product picker choice was about eliminating a class of bug, not convenience.** DEF-03 exists because a handle string was wrong; a text-field setting would preserve exactly that failure mode. The picker makes it structurally impossible.
- **Accepted trade-off on D-05 + D-09:** if a wrong product is ever selected in settings, the patient lands on a storefront 404. That is acceptable — a 404 on the correct domain is strictly better than navigating off to the Fly app, which is today's behavior.

</specifics>

<deferred>
## Deferred Ideas

- **Restore the `X-Shopify-Shop-Domain` submission header.** `QuizContainer.tsx:60` sets it only when `cfg.shopUrl` is truthy, and `shopUrl` is always empty because `?shop=` is never passed. Every submission since the app-block embed shipped has gone without it. Not in DEF-01..04, and D-01 deliberately avoids needing a shop param for navigation. Needs its own assessment: determine whether `api.quiz.submit.tsx` depends on that header before deciding priority.
- **Remove the `/pages/consult` 404.** `docs/STOREFRONT_CONTENT_AUDIT.md:182-184` records the fallback destination as missing. The block's `consult_redirect_url` setting is populated ("Allergy Consultation") so the configured path likely resolves — but the hardcoded fallback does not. Belongs with Phase 7 (TELE-01), which owns making the consult page real.
- **Test Mode button live on the production Shopify page.** Flagged in `docs/UX-AUDIT.md`. The block setting defaults to `false` and the live theme shows it off, so this may already be resolved — but it is a patient-facing exposure and Phase 8 (LAUNCH-02) owns confirming it.
- **Delete `app/lib/quiz/product-links.ts` once settings are proven.** D-11 keeps it as fallback for now. Revisit after the picker has been live long enough to trust.
- **Retire the vestigial `googleSheetsWebAppUrl` field** at `app/lib/quiz/types.ts:67` — dead config left from the removed Sheets path. Docs cleanup lives in Phase 8 (LAUNCH-08).

</deferred>

<open_questions>
## Open Questions

- **The live product handle spelling is still unverified.** All four candidate URLs returned HTTP 302 because the storefront is password-protected, so `curl` could not distinguish them. D-10's product picker makes this moot for the *setting*, but the corrected fallback values in `product-links.ts` and the schema defaults still need confirming via Shopify admin or the storefront password.

</open_questions>

---

*Phase: 1-Live Defect Fixes*
*Context gathered: 2026-07-30*
