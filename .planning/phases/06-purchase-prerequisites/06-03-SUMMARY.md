---
phase: 06-purchase-prerequisites
plan: 03
subsystem: theme-app-extension
tags: [theme-extension, honor-system, d-01, d-02, d-05, d-06, d-07, d-08, shop-02, shop-03]
requires:
  - phase: 06-purchase-prerequisites
    provides: 06-01 Sense ATC selector contract; 06-02 Task 3 proof that Liquid can read the metafields
provides:
  - "purchase-prerequisites block (credit + acknowledgment UI)"
  - "fail-open ATC gate JS"
  - "source contract test, proven non-vacuous"
affects: [06-06]
tech-stack:
  added: []
  patterns: ["Second block inside the single permitted theme app extension"]
key-files:
  created:
    - extensions/quiz-block/blocks/purchase-prerequisites.liquid
    - extensions/quiz-block/assets/purchase-prerequisites.js
    - extensions/quiz-block/assets/purchase-prerequisites.css
    - tests/purchase-prerequisites-block-contract.test.ts
  modified: []
key-decisions:
  - "Block lives under extensions/quiz-block/ — Shopify permits one theme app extension per app"
  - "Gate JS re-queries submit buttons per sync rather than caching, for variant re-render"
  - "Gate JS only re-enables buttons it disabled itself (data-prereq-disabled ownership marker)"
patterns-established:
  - "purchasePrerequisites__* BEM prefix, theme CSS variables only, zero hardcoded hex"
requirements-completed: [] # SHOP-02 / SHOP-03 close in 06-06 — see Requirement status
duration: ~35min
completed: 2026-08-13
status: complete
---

# Phase 6 Plan 03: Purchase Prerequisites Theme Block Summary

**COMPLETE — 3/3 tasks**, with one blocking deviation that changed where the code lives. All three
plan verifies pass (against corrected paths), the contract test is proven non-vacuous by mutation,
and the full suite is green.

## Gates

| gate | result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | **812 passed / 53 files** (was 775 / 52 — **+37 tests, +1 file**) |
| Task 1 verify (`liquid-ok`) | pass, on corrected path |
| Task 2 verify (`js-css-ok`) | pass, on corrected path |
| Task 3 verify | `npx vitest run purchase-prerequisites-block-contract sense-atc-selector-contract` → **41 passed** |
| Non-vacuity | proven by two source mutations, below |
| New dependencies | zero |
| `shopify theme push` | never run (D-03 honored) |

## ⚠️ Blocking deviation — Shopify permits ONE theme app extension per app

**The plan's file layout is not buildable.** `06-03-PLAN.md` `files_modified` specifies a new
directory `extensions/purchase-prerequisites/`, and `06-PATTERNS.md` line 49 explicitly instructs
"do not add a second block under `quiz-block/`" on the reasoning that it "couples PHI iframe to
commerce gate". Those two instructions cannot both be satisfied.

Running the plan's own preferred command:

```
$ shopify app generate extension --template theme_app_extension --name purchase-prerequisites
Invalid extension type: theme_app_extension
You have reached the limit of extension(s) of type theme per app
```

Confirmed against the repo: `extensions/quiz-block/` is `type = "theme"` and already occupies the
app's single theme-extension slot. (`quiz-history` and `order-review-notice` are `type =
"ui_extension"`, a separate and higher limit — they are not evidence that more theme extensions are
allowed.)

**Resolution taken:** the block, its two assets, and the contract test live under
`extensions/quiz-block/`. Filenames are exactly as the plan specified; only the parent directory
differs.

| plan path | actual path |
|---|---|
| `extensions/purchase-prerequisites/blocks/purchase-prerequisites.liquid` | `extensions/quiz-block/blocks/purchase-prerequisites.liquid` |
| `extensions/purchase-prerequisites/assets/purchase-prerequisites.js` | `extensions/quiz-block/assets/purchase-prerequisites.js` |
| `extensions/purchase-prerequisites/assets/purchase-prerequisites.css` | `extensions/quiz-block/assets/purchase-prerequisites.css` |
| `extensions/purchase-prerequisites/shopify.extension.toml` | **not created** — `quiz-block`'s existing TOML covers the extension |
| `extensions/purchase-prerequisites/locales/en.default.json` | **not created** — see below |

**The alternative was rejected, not overlooked.** The only way to get a genuinely separate theme
extension is a second Shopify app: its own install, its own `shopify.app.toml`, its own deploy
pipeline and version history, and a second app for the merchant to manage. That is a materially
larger change than this plan authorizes, and it is a decision for Andrew rather than an execution-time
improvisation.

**The cost RESEARCH was trying to avoid is real and now applies — carry it into 06-06.** A theme app
extension deploys as one versioned unit. `shopify app deploy` now ships the purchase gate and the PHI
quiz iframe block together: a change to either forces a redeploy affecting both, and a rollback of one
rolls back the other. Nothing leaks between them — they are independent Liquid files with no shared
state, and the PHI boundary is unaffected — but the release coupling is genuine and should be stated
in `06-06`'s deploy step rather than discovered during a rollback.

## Task 1: Liquid block — credit states and confirmation markup

`extensions/quiz-block/blocks/purchase-prerequisites.liquid`.

- Credited branch (`customer` present **and** `quiz_count >= 1`): checkbox checked + disabled, label
  *Symptom assessment complete*, caption *Completed {{ date }}* via `date: "%B %d, %Y"` (D-07).
- Uncredited branch: interactive checkbox, label *I completed the AlleDrops symptom assessment*, plus
  the D-08 login line linking to `/account/login?return_to={{ product.url | url_encode }}` —
  relative product path only, never an absolute or shop-domain URL (T-6-09).
- Testing row always renders unchecked and interactive, never pre-checked from data, with the D-06
  acknowledgment verbatim.
- A missing metafield resolves to `0` via `default: 0` → uncredited, never an error banner (D-08).
- Schema parses as JSON; `target: section`, `enabled_on.templates: ["product"]`, both asset
  attributes declared. Placement itself is `06-06` (D-03) — this plan places nothing.

**`locales/en.default.json` deliberately not created.** The plan asked for a "minimal stub", but
`extensions/quiz-block/locales/en.default.json` already exists and this block uses no `| t` lookups —
every string is locked verbatim by the UI-SPEC Copywriting Contract, and routing locked clinical copy
through a translation layer would let it be silently changed in a place the contract test does not
read. Adding an unused stub would have been cargo cult.

## Task 2: Gate JS + stylesheet

`assets/purchase-prerequisites.js` — scopes via `closest('product-info, .product, form[action*="/cart/add"]')`
then queries `.product-form__submit` within that scope. Never document-global: a product page can host
quick-add drawers and recommendation forms, and a global query would disable buttons for products this
block says nothing about.

Zero matches → `console.warn` once with a stable prefix and return, touching no buttons (D-02
fail-open). The compensating control is `tests/sense-atc-selector-contract.test.ts` from `06-01`,
which fails CI if Sense stops shipping the class.

**Two hardening decisions beyond the plan text:**

1. **Buttons are re-queried inside `sync()`, not cached at init.** Sense re-renders the buy-buttons
   region on variant change. A cached `NodeList` would point at detached nodes and the replacement
   button would ship **ungated** — a silent hole exactly where the gate matters. Caught while writing
   the code, not by a test.
2. **Ownership marker `data-prereq-disabled`.** The script re-enables only buttons it disabled itself.
   A button the theme disabled for sold-out or an unavailable variant is left alone in both
   directions, so the gate can add a reason to be disabled but can never grant availability the theme
   withheld. The naive version — enable everything when both boxes are ticked — would let a shopper
   add a sold-out variant to cart.

`assets/purchase-prerequisites.css` — `purchasePrerequisites__*` prefix, UI-SPEC tokens (4/8/16/24
spacing, 14/16/18 sizes, weights 400/600 only), 44px minimum hit target from label padding rather than
a larger box graphic, accent restricted to the focus ring and the login link. Theme CSS variables
only, zero hardcoded hex, and no rule touching Sense `.button` geometry.

## Task 3: Source contract — proven non-vacuous

`tests/purchase-prerequisites-block-contract.test.ts`, **37 tests**. Covers metafield `.value` paths,
the D-05 key allowlist (asserted as an exact set, so a third key fails), absence of `fetch(` /
`fly.dev` / `XMLHttpRequest` / `testing_status`, all seven locked copy strings, seven banned
approval-promise phrases, both credit branches, the `return_to` open-redirect guard, selector scoping,
the fail-open warn, the re-query and ownership-marker hardening, schema parse, and CSS scoping.

**Mutation proof — the absence assertions actually bite:**

| mutation applied to source | result |
|---|---|
| Injected a banned approval-promise phrase into the credited label | **1 failed** / 36 passed |
| Replaced `scope.querySelectorAll(...)` with `document.querySelectorAll('.product-form__submit')` | **2 failed** / 35 passed |
| Both reverted | **37 passed** |

Without this step the contract would assert only that the file exists. The second mutation failing
*two* tests rather than one is the re-query assertion catching the same edit independently.

## Deviations from Plan

1. **Extension directory** — the blocking platform limit above.
2. **`shopify.extension.toml` and `locales/en.default.json` not created** — consequences of 1 and of
   the no-`| t` decision.
3. **Two JS hardening behaviors added** (re-query, ownership marker) that the plan's action text did
   not describe. Both close real holes; both are asserted by the contract so they cannot silently
   regress.
4. **An unrelated file was touched and reverted.** The failed `shopify app generate extension` run
   regenerated `extensions/order-review-notice/shopify.d.ts`, adding a `ReviewNotice.jsx` module
   declaration. That is `06-04`'s file and outside this plan's scope, so it was reverted with
   `git checkout --` and the full suite re-run green afterwards. If that declaration is genuinely
   wanted, `06-06` should add it deliberately.

## Requirement status — why neither closes here

| requirement | status | why |
|---|---|---|
| SHOP-02 (returning-patient completion state at purchase) | **Pending** | The block exists in source. It is not placed in the theme editor, not deployed, and no patient has seen it. `06-06` owns placement + `shopify app deploy` + human UAT. |
| SHOP-03 (ATC requires both confirmations) | **Pending** | Same. Additionally, D-01 requires **Show dynamic checkout buttons = OFF** on `product.regional-drops` — without that editor change Shop Pay bypasses the gate entirely, and that flip is `06-06`'s. |

Source contracts prove the guards are *present*. This project has now had **seven defects found by a
human clicking and missed by a fully green suite**; a source contract is the weakest of the evidence
types available here. Keep the `06-06` browser pass.

## Known Stubs / Follow-ups for 06-06

- **Editor placement** inside Sense `main-product`, above `buy_buttons`, on `product.regional-drops`
  only. The consult product is on `telehealth-appointment` so it cannot be reached (D-04, confirmed in
  `06-02` Task 1).
- **Show dynamic checkout buttons = OFF** — without it the gate is bypassable. This is the single
  highest-value item in `06-06`.
- **Release coupling** — deploying this block redeploys the PHI quiz iframe block. State it in the
  deploy step.
- **The Admin Themes page is broken on this store** (4 attempts / 2 sessions). Editor placement may
  need the theme-editor deep link `admin.shopify.com/store/allergist-on-demand/themes/135799767246/editor`
  rather than navigating through Online Store → Themes.
- **Fail-open is unproven in a browser.** CI proves the warn path exists in source; nobody has yet
  loaded a page where the selector is genuinely absent.

## Task Commits

- Tasks 1–3: single commit — the block, its assets and its contract are one reviewable unit, and the
  contract is meaningless without the source it reads.
