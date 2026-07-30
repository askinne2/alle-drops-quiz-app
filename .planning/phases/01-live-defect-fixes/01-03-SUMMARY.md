---
phase: 01-live-defect-fixes
plan: 03
subsystem: storefront-theme-extension
tags: [shopify-liquid, theme-app-block, postmessage, open-redirect, origin-validation, scrollintoview, product-settings]

# Dependency graph
requires:
  - "app/lib/quiz/navigation.ts — the canonical validator this plan hand-ports (Plan 01-01)"
  - "tests/liquid-block-contract.test.ts — the red-by-design gate this plan turns green (Plan 01-01)"
  - "app/lib/quiz/product-links.ts — the code handle map that stays the live path (Plan 01-01)"
provides:
  - "symptom-quiz.liquid parent handler that rejects every sender except the configured app origin, on all branches"
  - "safeUrl — inline ES5 hand-port of isSafeRelativePath, closing the live open redirect (T-1-01)"
  - "quiz:scrollToTop parent listener with an explicit instant scroll (DEF-01)"
  - "scroll-margin-top: 100px on the iframe so the revealed sticky header cannot cover the target"
  - "Numeric coercion plus finite/positive check on the resize height (T-1-05)"
  - "block.settings.tn_product / tx_product product pickers, no default (D-10)"
  - "&tnProduct= / &txProduct= on the embed src, consumed by Plan 01-02's quiz-embed.tsx (D-12)"
  - "One additional contract assertion covering every positional rule of the port"
affects: [01-02-quiz-embed, 01-04-verification, 01-05-deploy, 01-06-console-protocol]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Origin check as the unconditional first statement in a postMessage listener, before any payload shape guard"
    - "Trusted origin derived in Liquid by splitting the app URL and rejoining scheme + host, emitted through the json filter"
    - "Reject-before-use on postMessage payloads; numeric coercion before any style write"
    - "Sticky-header offset via scroll-margin-top instead of runtime bounding-rect math"
    - "Behavioral parity check of a hand-port: extract the function from the untypechecked source and run it against the canonical module's matrix"

key-files:
  created: []
  modified:
    - extensions/quiz-block/blocks/symptom-quiz.liquid
    - tests/liquid-block-contract.test.ts

key-decisions:
  - "The safeUrl port includes the index-1 reverse-solidus reject, which the PLAN.md excerpt omitted; navigation.ts was used as the spec"
  - "Added a contract assertion for each positional rule, because the existing open-redirect assertion is absence-only and cannot detect an incomplete port"
  - "The embed src stayed a single-line append chain, matching the shape already verified in production, rather than the multi-line form in the research doc"
  - "Exactly one console.warn, on the navigate-rejection branch only; origin-rejected messages deliberately produce no log output"
  - "scroll-margin-top hardcoded at 100px with no range setting, per the plan's unverified-schema-default caution"

requirements-completed: [DEF-01, DEF-02]

# Metrics
duration: 8min
completed: 2026-07-30
---

# Phase 01 Plan 03: Liquid Block Hardening Summary

**Closed the live open redirect on the patient-facing quiz page with an ES5 hand-port of the canonical path validator — proven behaviorally identical to it across 25 cases, including the reverse-solidus bypass the plan text would have shipped — and added the missing scroll listener, an unforgeable origin guard on every branch, and two merchant product pickers.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-30T06:14:00-04:00 (approx; baseline test run at 06:16)
- **Completed:** 2026-07-30T06:20:40-04:00
- **Tasks:** 2 (plus one deviation-driven test commit)
- **Files modified:** 2

## Accomplishments

- **The live open redirect is closed.** `window.location.assign` now runs only on a value that
  passed `safeUrl`, and the payload key read is `path`. The previous code path called the navigation
  API on an unvalidated payload field from any sender — on a PHI-collecting storefront page.
- **The port is provably complete, not just present.** 25-case parity run against
  `isSafeRelativePath`: **0 divergences, 0 accepted targets resolving off the shop origin.** See
  Verification Results for the matrix.
- **DEF-01 is fixed on the path that actually ships.** The `quiz:scrollToTop` message the app has
  been posting for months now has a listener, on the installed Liquid embed path rather than on the
  uninstalled bundle-injection path.
- **Every branch is origin-guarded, including resize.** The guard is the first statement in the
  listener, ahead of the payload shape check.
- **The resize branch no longer writes an uncoerced payload value into a style string.**
- **Two searchable product pickers exist**, with the built-in fallback named in each `info` string.
- **Zero dependencies, zero script tags added.** The port is vanilla ES5, as CLAUDE.md's PHI-page
  rules require. `package.json` is untouched.

## Task Commits

1. **Task 1: handler hardening + scroll listener + sticky-header offset** — `40d4bef` (fix)
2. **Deviation: contract assertion for every positional rule** — `7a3f7b9` (test)
3. **Task 2: product pickers + embed src params** — `c54097e` (feat)

## Files Modified

- `extensions/quiz-block/blocks/symptom-quiz.liquid` — All four coordinated edits from Task 1 plus
  both edits from Task 2. 79 lines changed net.
- `tests/liquid-block-contract.test.ts` — One added `it` block, 18 lines. See Deviations.

## The Three Values the Plan Asked Me to Record

### 1. The `_app_origin` derivation used

```liquid
{%- assign _origin_parts = fly_url | split: '/' -%}
{%- assign _app_origin = _origin_parts[0] | append: '//' | append: _origin_parts[2] -%}
```

Emitted into the script as `var APP_ORIGIN = {{ _app_origin | json }};`. Derived from `fly_url`, so
the existing blank-fallback to the Fly hostname is inherited rather than re-read from
`block.settings.app_url`. A trailing slash on the setting is harmless — the split drops the trailing
empty segment and elements 0 and 2 are unchanged.

**Residual behavior worth knowing:** a merchant who pastes a bare host with no scheme produces a
malformed origin that matches nothing, and the quiz then silently stops scrolling, resizing, and
navigating. That is threat **T-1-14**, and it fails closed. The plan's T-1-14 row credits the
`console.warn` with making this discoverable — **that is not accurate, and I did not make it so.**
An origin-rejected message returns before reaching any branch, so it emits nothing. Warning on
origin mismatch would log on every unrelated `postMessage` on the page (themes and apps post
frequently) and would itself be a noise vector. **T-1-14's discoverability rests entirely on the
`app_url` setting's `info` string**, which now records that the value is the trusted message origin
and that a wrong value stops the quiz silently. Flagging this so Plan 06's console protocol does not
expect a warning that will not appear.

### 2. The final `_embed_src` string shape

```
{{ fly_url }}/quiz-embed?consult={consult_enc}&testOptions={test_enc}&test={0|1}&tnProduct={tn_handle_enc}&txProduct={tx_handle_enc}
```

Still a single `{%- assign _embed_src = fly_url | append: ... -%}` chain — no second variable. The
two new params come after `&test=`. On deploy day, with both pickers blank, the rendered tail is
`&tnProduct=&txProduct=`, which `quiz-embed.tsx` reads as empty strings and `getProductHandle`
treats as absent.

Both handles use `.handle` explicitly. `.url` is not used anywhere — it would emit a full product
path and diverge from the shape the app and the code handle map both expect.

### 3. The `scroll-margin-top` value chosen

**100px**, applied to `#alledrops-quiz-{{ block.id }}` inside the block's `{%- style -%}` region.
Hardcoded, with no `range` setting, per the plan's caution that a newly added non-`product` setting
may not receive its schema default on an already-placed block. **Recorded as a follow-up candidate:**
a merchant-tunable offset range, once the already-placed-block default behavior is verified.

## Gate D Remains Outstanding — Both Pickers Ship Blank

**Neither picker has a value on deploy day, and neither can.** Shopify input settings of type
`product` do not accept a `default` — the docs list `product` alongside `page`, `collection`, and
`image_picker`. Adding one risks a schema-validation failure at `shopify app deploy`.

Consequences:

- Every patient resolves through `app/lib/quiz/product-links.ts` until a human opens the Shopify
  theme editor and selects a product in each picker. That map is the **production path**, not a
  safety net — which is why Plan 01-01 closed DEF-03 there and why this task is a durability
  improvement rather than the fix.
- **Gate D stays open.** It requires human theme-editor action; no code in this phase can close it.
- The self-healing property is nonetheless real: a deleted or unpublished product silently becomes
  blank, and the code map covers it.

This amends **D-11**'s clause that "the corrected values also become the schema defaults" — that
clause is not implementable on this setting type.

## Verification Results

Per CLAUDE.md's build-verification rule, using `npm` (the repo carries `package-lock.json`).

| Gate | Command | Result |
|------|---------|--------|
| Contract gate | `npx vitest run tests/liquid-block-contract.test.ts` | **exit 0 — 11/11 passed** (10 original + 1 added) |
| Suite excluding Plan 02's target | `npx vitest run --exclude "tests/quiz-embed-contract.test.ts"` | **exit 0 — 113 passed / 13 files** |
| Typecheck | `npm run typecheck` | **exit 0**, no output |
| Task 1 criteria (21 checks, node) | scripted presence/ordering/ES5 assertions | **all PASS** |
| Task 2 criteria (26 checks, node) | scripted schema + embed-chain assertions | **all PASS** |
| Behavioral parity of the port | 25-case matrix vs `isSafeRelativePath` | **0 divergences, 0 cross-origin accepts** |
| Reference file untouched | `git diff app/entry.theme.tsx` | empty |
| No dependency added | `git diff package.json` vs base | empty |
| Plan 02's files untouched | cumulative `git diff --stat` vs base | only my 2 files |

The baseline was measured before any edit: **8 failed / 2 passed**, matching the figure Plan 01-01
documented. The two originally-green assertions were not vacuous by accident — `does NOT scroll
smoothly` is now load-bearing, since scroll code exists and had to avoid the forbidden value.

**`npm test` unqualified was deliberately never run as a gate.** `tests/quiz-embed-contract.test.ts`
is Plan 02's target in this same wave; it is red until 02 lands. Plan 04 owns the full-green gate.

### Verification method note — shell grep was avoided on purpose

Every acceptance criterion in the plan is written as a `grep -c` invocation. On this machine `grep`
is a ugrep wrapper in which `$` anchors mid-pattern, so a gate whose pattern contains Liquid's
`${...}`/`{{ }}` syntax silently returns 0 and reports a **false pass**. All criteria were instead
executed as node string assertions over the file bytes, which is equivalent for presence and
counting and immune to that trap. Where a criterion needed a region scope (the ES5 check over the
`<script>` block, the style-block containment of `scroll-margin-top`), the region was sliced in node
rather than with `sed`.

### The port's completeness — measured, not asserted by the test suite

`tests/liquid-block-contract.test.ts` assertion 6 is an **absence** check. It proves the old
signature is gone; it cannot prove the replacement is complete. A green suite therefore does not
prove the port is correct, so I verified it directly.

The `safeUrl` function was extracted from the committed Liquid bytes, run in node against a stubbed
shop origin, and its accept/reject decision compared to `isSafeRelativePath` for 25 inputs:

```
agree  liquid=accept  canonical=accept  in="/pages/consult"            resolved="https://shop.example.com/pages/consult"
agree  liquid=accept  canonical=accept  in="/products/tennessee-alledrops"
agree  liquid=accept  canonical=accept  in="/"
agree  liquid=accept  canonical=accept  in="/pages/a\b"                resolved="https://shop.example.com/pages/a/b"
agree  liquid=reject  canonical=reject  in=""
agree  liquid=reject  canonical=reject  in="//evil.com"
agree  liquid=reject  canonical=reject  in="/\evil.com"                <- the bypass the plan text would have accepted
agree  liquid=reject  canonical=reject  in="/\\evil.com"
agree  liquid=reject  canonical=reject  in="/\/evil.com"
agree  liquid=reject  canonical=reject  in="https://evil.com/x"
agree  liquid=reject  canonical=reject  in="http://evil.com"
agree  liquid=reject  canonical=reject  in="//evil.com/pages/consult"
agree  liquid=reject  canonical=reject  in="javascript:alert(1)"
agree  liquid=reject  canonical=reject  in="data:text/html,..."
agree  liquid=reject  canonical=reject  in="mailto:a@b.com"
agree  liquid=reject  canonical=reject  in="pages/consult"
agree  liquid=reject  canonical=reject  in="?a=1"
agree  liquid=reject  canonical=reject  in="#frag"
agree  liquid=reject  canonical=reject  in=" /pages/consult"
agree  liquid=accept  canonical=accept  in="/<tab>evil.com"            resolved="https://shop.example.com/evil.com"
agree  liquid=reject  canonical=reject  in=null / undefined / 42 / {} / ["/pages/consult"]

cases: 25   divergences: 0   accepted targets resolving off the shop origin: 0
```

**Evidence that the reverse-solidus rejection is present in the Liquid source**, as required:

```
function safeUrl(p) {
  if (typeof p !== 'string' || p === '') return null;
  if (p.charAt(0) !== '/') return null;
  if (p.charAt(1) === '/') return null;
  if (p.charAt(1) === '\\') return null;      <- index-1 reverse solidus, the corrected rule
  try {
    var u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.href : null;
  } catch (err) { return null; }
}
```

That is a verbatim extract from the committed file at
`extensions/quiz-block/blocks/symptom-quiz.liquid`. All five rules from `navigation.ts` are present,
in the same order, with the same scoping — the reverse-solidus rule applies at index 1 only, so
`/pages/a\b` stays accepted and resolves same-origin, as measured above.

## Decisions Made

### 1. `navigation.ts` was used as the spec, not the PLAN.md excerpt

The plan's `<interfaces>` block and Task 1 action text both describe a four-rule validator and omit
the reverse-solidus rule. `app/lib/quiz/navigation.ts` has five. Porting the plan as written would
have reintroduced the open redirect on the live patient-facing page, and the contract test would not
have caught it. The module's own doc comment states the standing rule — when its rules change, the
Liquid port changes in the same commit — so the module is the authority. Threat **T-1-06** already
assigned `mitigate` to exactly this case.

### 2. Exactly one `console.warn`, on the navigate-rejection branch

Naming the rejected value's type and JSON-encoded form so a merchant who configures an absolute
redirect gets a signal instead of silence. A navigation path carries no PHI, and the warning is
scoped to the path only. No warning on the origin-mismatch branch — see the T-1-14 note above for
why, and for what that costs.

### 3. The embed chain stayed on one line

The research doc presents a multi-line `assign`. The existing production line is single-line, and
that exact shape is the one verified working against the live storefront. Liquid cannot be rendered
locally in this repo, so on a live patient-facing file I kept the byte pattern that is already
proven rather than introduce an unverifiable formatting change. Functionally identical; the chain is
still single, still starts `_embed_src = fly_url`.

### 4. `scrollIntoView` targets the `iframe` element only

Not `.symptom-quiz-wrapper`, not the Shopify-injected block wrapper, not the theme's scroll-trigger
div. Scrolling any wrapper re-shows the H1 and the medical disclaimer on every step change, which
D-06 forbids. Asserted: the single `scrollIntoView` line contains `iframe.` and neither `container`
nor `wrapper`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical Security] Ported the index-1 reverse-solidus reject that the plan text omitted**

- **Found during:** Task 1, reading `navigation.ts` as directed rather than the plan's excerpt.
- **Issue:** The plan's validation rule lists four checks. The canonical module has five. The missing
  one rejects a reverse solidus at index 1, which the WHATWG parser treats as equivalent to a
  solidus for special schemes — so it resolves to a foreign origin exactly as a protocol-relative
  target does. Shipping the four-rule version would have left an exploitable open redirect on a
  PHI-collecting page, and assertion 6 of the contract test would still have gone green.
- **Fix:** Ported all five rules in `navigation.ts` order, scoped to index 1 as the module scopes it.
- **Verification:** 25-case parity run, 0 divergences, 0 cross-origin accepts, with `/\evil.com`,
  `/\\evil.com`, and `/\/evil.com` all rejected and `/pages/a\b` still accepted.
- **Committed in:** `40d4bef`

**2. [Rule 2 — Missing Critical Functionality] Added a contract assertion for every positional rule**

- **Found during:** Task 1, after confirming the suite would go green on an incomplete port.
- **Issue:** The contract test's only guard on the validator is an absence assertion on the old
  signature. It cannot distinguish a complete port from one missing a rule. Since Liquid here is
  neither typechecked nor linted, that test is the *only* standing automated guard on this file, and
  it had a hole precisely where the phase's highest-severity threat lives.
- **Fix:** One added `it` block asserting each of the five rules individually, with a comment
  recording why the absence assertion is insufficient and why the reverse-solidus rule is measured
  rather than defensive.
- **Verification:** Green against the current file. Proven **non-vacuous** by running all five
  needles against `HEAD~1`'s version of the Liquid file — all five absent, so the assertion would
  have been red before the fix.
- **Files modified:** `tests/liquid-block-contract.test.ts`
- **Committed in:** `7a3f7b9`
- **Note on file ownership:** this file is this plan's own gate, created by Plan 01-01 in wave 1.
  It is not one of Plan 02's files (`quiz-embed.tsx`, `QuizContainer.tsx`, `questions.ts`,
  `quiz-embed-contract.test.ts`), so there is no parallel-wave conflict.

**3. [Rule 3 — Blocking] Symlinked `node_modules` into the worktree**

- **Found during:** Setup, before Task 1.
- **Issue:** `node_modules` is gitignored, so `git worktree add` did not materialise it, and every
  verify step runs vitest.
- **Fix:** `ln -s` to the main checkout's existing tree. **No package manager install was run** —
  this is not a dependency addition. Gitignored, so it cannot leak into the merge.
- **Committed in:** n/a

### Corrected Base Commit (setup, not a code deviation)

The worktree spawned with HEAD at `0cae8b3`, which does **not** contain wave 1. The merge-base check
in the setup protocol detected the drift and `git reset --hard` corrected it to the assigned base
`02cab80`. The HEAD assertion ran first and passed (branch `worktree-agent-a01c07eb4edd6f140`), so
the reset was safe. No protected ref was touched. Had this gone unnoticed, `navigation.ts` would not
have existed and the port would have had no spec.

---

**Total deviations:** 3 auto-fixed (2 missing-critical, 1 blocking), plus one setup base correction.
**Impact on plan:** No scope creep. Deviation 1 is a correction to the plan's security spec, carrying
forward Plan 01-01's measured finding. Deviation 2 closes the gap that made Deviation 1 undetectable
by the suite.

## Issues Encountered

- **The plan's grep-based acceptance criteria are not runnable as written on this machine.** `grep`
  is a ugrep wrapper where `$` anchors mid-pattern, and Liquid source is dense in `{{ }}`/`${...}`.
  A criterion like `grep -c "APP_ORIGIN = {{ _app_origin | json }}"` can silently return 0 and be
  read as a failure, or a `= 0` absence gate can silently pass. Every criterion was executed in node
  instead. **Future plans in this repo should express file-content gates as node or vitest
  assertions, not `grep -c`.**
- **The plan's T-1-14 mitigation text overstates what the `console.warn` covers.** Documented in
  detail above. Plan 06 should not expect a console warning on an origin mismatch.
- **`behavior: 'instant'` is a spec enum value but has no local browser verification here.** No DOM
  is available in this repo's vitest setup (`environment: "node"`, no jsdom). The value is asserted
  present in source only; actual scroll behavior is Gate F in Plan 06.
- **`CLAUDE.md:13` still reads "THIS IS NOT a GSD project."** Stale — the repo carries a populated
  `.planning/` tree. Plan 01-01 flagged the same line. It will keep tripping agents until corrected.

## Known Stubs

None in code. One **configuration** stub by construction: both product pickers ship with no value
and cannot be given one, so the code handle map serves every patient until a human acts. That is
documented above, in the two `info` strings, and in `product-links.ts`'s own JSDoc — it is not an
unwired data path, and the fallback it resolves to is correct.

## Threat Flags

None. No new network endpoint, no auth path, no file-access pattern, and no schema change at a trust
boundary — the two added settings are merchant-facing theme configuration, and the trust boundary
they feed (`app_url` as trusted origin) is a boundary this plan *narrows*, not widens.

Threat register coverage delivered:

| Threat | Status |
|--------|--------|
| **T-1-01** open redirect | **mitigated** — `safeUrl(e.data.path)` gates the only navigation call |
| **T-1-02** spoofed sender | **mitigated** — origin check is the first statement, covers every branch |
| **T-1-03** protocol-relative | **mitigated** — index-1 solidus reject, measured |
| **T-1-04** scheme URIs | **mitigated** — index-0 solidus requirement |
| **T-1-05** style-string injection | **mitigated** — `Number` + `isFinite` + `> 0` before any write |
| **T-1-06** parser confusion | **mitigated** — index-1 reverse-solidus reject plus delegation to the browser's parser; needed a stronger control than the plan specified |
| **T-1-07** bundle skew | **mitigated** — only `path` is read; an old bundle's payload is dropped |
| **T-1-14** misconfigured origin | **mitigated by documentation only** — see the correction above |
| T-1-15 merchant absolute URL | accepted; this plan supplies the parent-side warning half only, Plan 02 owns the child-side half |
| T-1-09 `frame-ancestors *` | accepted, Phase 8 |
| T-1-16 Klaviyo on a PHI page | transferred to Phase 8 / LAUNCH-01. **This plan adds zero scripts and zero libraries. Nothing here clears LAUNCH-01.** |
| T-1-SC supply chain | accepted — zero installs, `package.json` untouched |

## Self-Check: PASSED

Files verified present on disk:

- `extensions/quiz-block/blocks/symptom-quiz.liquid` — FOUND (modified)
- `tests/liquid-block-contract.test.ts` — FOUND (modified)
- `.planning/phases/01-live-defect-fixes/01-03-SUMMARY.md` — FOUND

Commits verified in `git log`: `40d4bef`, `7a3f7b9`, `c54097e`. No commit deleted a tracked file
(`git diff --diff-filter=D` empty for each). Working tree clean apart from this summary.

Shared orchestrator artifacts **not** touched: `.planning/STATE.md` and `.planning/ROADMAP.md` are
unmodified, per worktree-mode rules. Plan 02's files — `app/routes/quiz-embed.tsx`,
`app/components/quiz/QuizContainer.tsx`, `app/lib/quiz/questions.ts`,
`tests/quiz-embed-contract.test.ts` — are unmodified.

## Next Phase Readiness

**Ready.** Both requirements this plan owns are behaviorally complete in source.

- **Plan 02** must post `{ type: 'quiz:navigate', path: <relative path> }`. A `url` key is ignored
  by design. Its `quiz-embed.tsx` must read `tnProduct` and `txProduct` from the query string and
  inject them as `tnProductHandle` / `txProductHandle`.
- **Plan 04** owns the unqualified full-green `npm test` gate.
- **Plan 05** deploy ordering matters: `shopify app deploy` ships this file; `fly deploy` ships the
  app. Two systems. The schema is validated remotely at extension-deploy time, and the two `product`
  settings are the new surface — a validation rejection there would fail loudly rather than ship
  broken.
- **Plan 06** console protocol: post from the parent (`top`) context and confirm no navigation, and
  confirm the warning fires on an absolute path. Do **not** expect a warning on an origin mismatch.

Carry-forward concerns:

- **Gate D cannot be closed by code.** It needs a human in the theme editor.
- **Nothing here is verified against the live storefront.** DEF-01's whole history is a fix that
  looked implemented for two months because it landed on an uninstalled path. Gates A–C must assert
  on served bytes; `shopify app deploy` returning success proves the extension uploaded, not that the
  rendered page contains this handler.
- **The `_app_origin` derivation assumes `app_url` carries a scheme.** A scheme-less value fails
  closed and silently. Worth one line in Plan 06's protocol.

---
*Phase: 01-live-defect-fixes*
*Completed: 2026-07-30*
