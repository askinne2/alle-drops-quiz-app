# Phase 1: Live Defect Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 1-Live Defect Fixes
**Areas discussed:** URL resolution ownership, Scroll target and motion, postMessage trust boundary, Product handles (hardcoded vs merchant-editable), Product handle field type

---

## Finding surfaced during codebase scout, before questions

Scouting the four fix sites turned up a correction to the prior day's code audit, which changed the shape of the first gray area:

The audit stated the anchor-based product link "does work." It does not. `QuizContainer.tsx:335` renders a relative href (`/products/{handle}`), and the anchor interceptor at `quiz-embed.tsx:70` resolves it with `new URL(href, window.location.href)` — where `window.location.href` is the **Fly origin**, not the shop. The parent then assigns that absolute Fly URL, navigating the storefront off-domain.

Underlying cause: **no code path knows the shop origin.** `symptom-quiz.liquid:46` builds `_embed_src` with `consult`, `testOptions`, and `test` but never passes `?shop=`, so `shopDomain` is `''` at `quiz-embed.tsx:13` and `AlleDropsQuizConfig.shopUrl` is empty in production.

Consequences: five broken navigation exits rather than four, and a previously unlogged side effect — `QuizContainer.tsx:60` only sets the `X-Shopify-Shop-Domain` header when `cfg.shopUrl` is truthy, so submissions have been going without it.

---

## URL resolution ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Parent resolves | Iframe posts the relative path as-is; the Liquid block resolves against `window.location.origin`, which is inherently the shop. Fixes the anchor bug in the same change, needs no shop param, enables same-origin validation. | ✓ |
| Pass `?shop=` and let the app build absolute URLs | Liquid appends `?shop=` to `_embed_src`; the app builds full URLs. More plumbing, app must trust an unverifiable query param — but repairs the missing submission header. | |
| Both — parent resolves nav, `?shop=` fixes the header | Navigation through the parent, plus `?shop=` purely so the submission header works again. Fixes two things but widens the phase beyond DEF-01..04. | |

**User's choice:** Parent resolves
**Notes:** Smallest surface area and the only option that makes the same-origin guard in the postMessage area possible. The submission-header gap was explicitly split out as a deferred item rather than absorbed into this phase.

---

## Scroll target and motion

| Option | Description | Selected |
|--------|-------------|----------|
| Iframe top, instant | `iframe.scrollIntoView({block:'start'})`, no smooth behavior. Lands on the first question of the new step; avoids a visible glide on every Next across seven steps. | ✓ |
| Iframe top, smooth | Matches `entry.theme.tsx:69-71` on the other embed path. Pleasant once, potentially irritating seven times; would warrant a `prefers-reduced-motion` gate. | |
| Wrapper top, smooth | Scrolls to the section wrapper, bringing the H1 and medical disclaimer back into view each step. Reinforces clinical framing but adds re-reading friction. | |

**User's choice:** Iframe top, instant
**Notes:** Deliberate rejection of the smooth behavior that already exists in the unused embed path. If smooth is ever revisited it should be gated behind `prefers-reduced-motion`.

---

## postMessage trust boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Harden it now | Verify `e.origin` against the configured app URL and accept only same-origin relative paths. These seven lines are being rewritten anyway; ~20 extra minutes. | ✓ |
| Leave as-is — out of scope | Phase 1 stays strictly the four DEF requirements and ships fastest. The open redirect stays live until separately scheduled. | |
| Validate the URL, skip the origin check | Reject non-same-origin URLs without verifying the sender. Blocks the off-site redirect in one line, no risk if the Fly origin changes. | |

**User's choice:** Harden it now
**Notes:** `symptom-quiz.liquid:59-67` checks neither sender origin nor payload and will `window.location.assign()` anything it receives — an open redirect on a patient-facing storefront. The origin check was extended to cover the `quiz:resize` handler as well, which currently accepts iframe height from any sender.

---

## Product handles: hardcoded or merchant-editable

| Option | Description | Selected |
|--------|-------------|----------|
| Keep hardcoded, fix the spelling | One-line change once handles are verified. Handles are structural, not content; drift should produce a failing test rather than a merchant guessing. | |
| Move them to block settings | Same pattern as the two redirect URLs already in the schema. William could fix a wrong handle without a deploy. | ✓ |
| Hardcode with an optional settings override | Tested default in code plus a settings escape hatch. More code paths and two places to look when it misbehaves. | |

**User's choice:** Move them to block settings
**Notes:** Chosen against the recommendation. Cost surfaced immediately: two new schema settings, two more `_embed_src` params, `quiz-embed.tsx` reading them into config, and `QuizContainer` preferring config over the imported map — roughly +1 hour over the one-line fix. `product-links.ts` is retained as the fallback default rather than deleted.

---

## Product handle field type (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Shopify product picker | Schema `"type": "product"` gives a searchable product dropdown; Liquid emits the real handle. Typos impossible, self-heals on rename, and eliminates the "verify spelling against the live store" open item since selection comes from real products. | ✓ |
| Plain text field | Same pattern as the existing redirect settings; simpler schema. But a typo silently produces a storefront 404 — the exact bug class DEF-03 exists to fix. | |

**User's choice:** Shopify product picker
**Notes:** Raised as a follow-up because the settings decision would otherwise have preserved the original failure mode. Side benefit: closes an open verification question outright.

---

## Verification attempted during discussion

Tested all four candidate product handles against the live store:

```
tennessee-alledrops  -> 302
texas-alledrops      -> 302
tennessee-allerdrops -> 302
texas-allerdrops     -> 302
```

Inconclusive — the storefront is password-protected, so every request redirects to the password page. Recorded as an open question in CONTEXT.md; needs Shopify admin access or the storefront password. The product picker decision reduces its blast radius but does not fully close it, since the corrected fallback values and schema defaults still depend on it.

---

## Claude's Discretion

- Exact shape and location of the `navigateParent(path)` helper
- Whether same-origin validation is a shared helper or inlined in the Liquid script
- Test structure and placement, provided 51/51 continue to pass
- Whether corrected fallback handles ship as a separate commit from the settings work

---

## Deferred Ideas

- Restore the `X-Shopify-Shop-Domain` submission header (`QuizContainer.tsx:60`) — outside DEF-01..04, and D-01 deliberately removed the need for a shop param in navigation
- Remove the `/pages/consult` 404 — belongs with Phase 7 / TELE-01
- Confirm the Test Mode button is not live in production — Phase 8 / LAUNCH-02
- Delete `product-links.ts` once the picker settings are proven in production
- Retire the vestigial `googleSheetsWebAppUrl` field at `app/lib/quiz/types.ts:67` — Phase 8 / LAUNCH-08
