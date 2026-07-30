---
phase: 01-live-defect-fixes
plan: 02
subsystem: quiz-embed
tags: [postmessage, iframe, open-redirect, legacyunforgeable, product-handles, copy-fix]

# Dependency graph
requires:
  - "app/lib/quiz/navigation.ts — toRelativePath (Plan 01)"
  - "app/lib/quiz/product-links.ts — getProductHandle, QuizProductConfig (Plan 01)"
provides:
  - "quiz:navigate payload contract: { type: 'quiz:navigate', path: '<relative path>' } — Plan 03 implements the receiving half"
  - "window.AlleDropsQuizConfig.tnProductHandle / .txProductHandle — injected via JSON.stringify from ?tnProduct / ?txProduct"
  - "navigateParent() — the single child-side navigation exit, validated before every post"
  - "Measured proof that /quiz-bundle-js serves a STALE committed artifact, so Tasks 2 and 3 do not reach patients until build:theme runs"
affects: [01-03-liquid-block, 01-04-verification, 01-06-console-protocol]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Child-side validation before postMessage, even though the parent validates again — the merchant-redirect case never reaches the parent guard"
    - "charCodeAt comparison instead of an escaped character literal when the code is emitted through a template literal"
    - "Emitted-artifact verification: invoke the loader, extract the inline script, parse it with new Function"

key-files:
  created: []
  modified:
    - app/routes/quiz-embed.tsx
    - app/components/quiz/QuizContainer.tsx
    - app/lib/quiz/questions.ts
    - app/components/quiz/QuizPartRenderer.test.ts

key-decisions:
  - "The inline interceptor guard rejects a backslash at index 1, which the plan's guard spec omitted — mirrors navigation.ts per Plan 01's measured correction"
  - "charCodeAt(1) === 92 rather than an escaped backslash literal, because a character literal would need four backslashes in the TS template to emit two in the JS string"
  - "public/quiz-bundle.js deliberately NOT rebuilt — it is Plan 04's provenance baseline, recorded here at 183691 bytes"

requirements-completed: [DEF-02, DEF-04]

# Metrics
duration: 11min
completed: 2026-07-30
---

# Phase 01 Plan 02: Child-Side Navigation Contract + Medication Label Summary

**Deleted the `[LegacyUnforgeable]` override that silently broke four of five navigation exits, routed all five through a validated `navigateParent` posting a relative `path`, wired both merchant product handles end-to-end, corrected the medication label — and measured that none of it reaches patients until the committed theme bundle is rebuilt.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-07-30T06:13:00Z
- **Completed:** 2026-07-30T06:24:00Z
- **Tasks:** 3
- **Files modified:** 4 (0 created)

## Accomplishments

- **`tests/quiz-embed-contract.test.ts` is 4/4 green**, up from 4/4 red. Plan 01's executable acceptance criteria for this plan are fully satisfied.
- **The root cause of four broken exits is gone.** The `Location.assign` reassignment was deleted outright, not reworked. Its property descriptor is non-writable and non-configurable, so the assignment failed silently in the sloppy-mode inline script — no variant of that approach can ever take.
- **All five exits now post a validated relative path.** Four `location.assign` call sites became `navigateParent(...)` with byte-identical fallback expressions; the fifth (the anchor) posts its raw relative href through the corrected interceptor.
- **The anchor no longer sends the storefront to the app domain.** The interceptor previously resolved the href against the iframe's own document, producing a fully-qualified app-origin URL. It now posts the raw relative path and carries no origin knowledge at all.
- **Both product handles round-trip end-to-end** from `?tnProduct` / `?txProduct` through `JSON.stringify` into `window.AlleDropsQuizConfig`, and the anchor resolves through `getProductHandle` with config-first precedence.
- **Verified the emitted inline script for the first time.** Invoking the loader, extracting the `<script>` body, and parsing it with `new Function` proves the emitted JS is syntactically valid — coverage the plan did not ask for and that this file has never had.
- **Zero dependency changes.** `git diff` for `package.json` and `vitest.config.ts` against the base is empty.

## Task Commits

1. **Task 1: override deleted, interceptor corrected, handles injected** — `1380c47` (fix)
2. **Task 2: five exits through `navigateParent`, config-first anchor** — `6524fae` (fix)
3. **Task 3 (RED): med_list label + required-ness assertions** — `854426e` (test)
4. **Task 3 (GREEN): corrected label** — `319b70b` (fix)

No REFACTOR commit — the one-line label change needed no cleanup.

## The Four Recorded Facts (per the plan's output spec)

**1. Exact final config-key spelling** — camelCase, matching `QuizProductConfig` verbatim:

```js
tnProductHandle: ${JSON.stringify(tnProductHandle)},
txProductHandle: ${JSON.stringify(txProductHandle)},
```

Read from lowercase query params `tnProduct` / `txProduct`, preserving this file's existing camelCase-key / lowercase-param asymmetry.

**2. Exact final payload shape** — identical in both senders:

```js
{ type: 'quiz:navigate', path: href }              // quiz-embed.tsx interceptor (single quotes)
{ type: "quiz:navigate", path: safe }              // QuizContainer.tsx navigateParent (double quotes)
```

The key is `path`, never `url`. Unchanged and still posted: `{ type: 'quiz:resize', height: h }` and `{ type: "quiz:scrollToTop" }`.

**3. The interceptor no longer calls `new URL`** — confirmed. `grep -cF 'new URL(href, window.location.href)'` returns **0**, and the interceptor makes no `new URL` call of any form. It needs no origin knowledge; the parent resolves the path against its own origin, which is inherently the shop origin.

**4. Pre-change local byte size of `public/quiz-bundle.js`: 183691 bytes** — unchanged by this plan (deliberately; see Next Phase Readiness). Recorded for Plan 04's provenance comparison.

## Verification Results

Per the project's global CLAUDE.md build-verification rule (`npm`, since the repo carries `package-lock.json`):

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run typecheck` | **exit 0**, no output |
| Plan 02's contract gate | `npx vitest run tests/quiz-embed-contract.test.ts` | **exit 0** — 4/4 (was 0/4) |
| Suite excluding Plan 03's target | `npx vitest run --exclude "tests/liquid-block-contract.test.ts"` | **exit 0** — 111 passed / 13 files |
| DEF-04 test file | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts` | **exit 0** — 9 passed (plan required ≥8) |
| Production build | `npm run build` (in the worktree) | **exit 0** — client + SSR built |
| Unqualified suite (informational only) | `npx vitest run` | 113 passed, 8 failed — **all 8 in Plan 03's `liquid-block-contract.test.ts`**, unchanged from Wave 1 |
| No dependency change | `git diff package.json` vs base | empty |
| No test-config change | `git diff vitest.config.ts` vs base | empty |
| Enforcement file untouched | `git diff app/components/quiz/QuizPartRenderer.tsx` | empty |
| Plan 03's files untouched | `git diff` vs base for `symptom-quiz.liquid`, `liquid-block-contract.test.ts` | empty |

Baseline at plan start was 102 passed / 4 failed. End state excluding Plan 03's file: 111 passed / 0 failed. Net +9 passing (4 contract assertions turned green, 5 new DEF-04 assertions added).

### Acceptance greps

All Task 1 criteria pass (12/13 as literally written — see Deviation 3 for the one miscounted expectation) and all 14 Task 2 criteria pass. Notable:

| Check | File | Want | Got |
|---|---|---|---|
| `window.location.assign` | `quiz-embed.tsx` | 0 | **0** |
| `window.location.assign` | `QuizContainer.tsx` | 1 | **1** (the standalone `else` branch) |
| `navigateParent(` | `QuizContainer.tsx` | 5 | **5** (1 definition + 4 call sites) |
| `console.warn` / `console.log` | `QuizContainer.tsx` | 1 / 0 | **1 / 0** |
| `getRedirectUrl("testOptions") \|\| "/pages/test-options"` | `QuizContainer.tsx` | 2 | **2** (fallbacks byte-identical) |
| `PRODUCT_HANDLE_BY_STATE[patientState]` | `QuizContainer.tsx` | 0 | **0** |
| `declare global` | `QuizContainer.tsx` | 0 | **0** |
| `(required)` in non-comment lines | `questions.ts` | 0 | **0** |
| `questions.ts` changed lines | — | 1 | **1** |

The `grep -cF 'tnProductHandle: ${JSON.stringify'` form was used exactly as the plan mandates. Confirmed: fixed-string mode with single quotes returns **1**; the plan's warning about the local `grep`-as-`ugrep` wrapper reading a mid-pattern `$` as an end-of-line anchor is accurate and was respected rather than worked around.

### Emitted-artifact verification (beyond the plan)

Invoked the loader with both handle params set and inspected the served bytes:

```
inline script blocks: 1
script[0] PARSES OK (3333 bytes)
tnProductHandle in emitted script: true     tn value round-trips: true
txProductHandle in emitted script: true     tx value round-trips: true
posts path key: true                        no url key on navigate: true
emitted index-1 guard: if (href.charAt(1) === '/' || href.charCodeAt(1) === 92) return;
```

And the emitted guard's actual behavior, which is what threats T-1-03 and T-1-04 turn on:

```
  guard("/products/x")        -> intercept
  guard("/")                  -> intercept
  guard("//evil.com")         -> reject
  guard("/\evil.com")         -> reject     <-- the bypass Plan 01 measured
  guard("#frag")              -> reject
  guard("mailto:a@b.c")       -> reject
  guard("javascript:alert(1)")-> reject
  guard("https://evil.com")   -> reject
```

This confirms the handles reach the browser inside the template literal (not merely in the loader body), the emitted script is valid JS, and the guard rejects every scheme and every cross-origin shape.

## Decisions Made

### 1. The inline interceptor guard rejects a backslash at index 1

The plan's Task 1 action specified a guard rejecting only falsy `href`, `charAt(0) !== '/'`, and `charAt(1) === '/'`. That omits the backslash. But the same task's `read_first` names `navigation.ts` as "the validator whose index-0/index-1 rules the inline guard mirrors … the rule is duplicated by hand; keep the two consistent" — and `navigation.ts` rejects a backslash at index 1, because Plan 01 measured that `/\evil.com` resolves to a foreign origin. Implementing the guard as literally spelled would have left the interceptor accepting a protocol-relative target that the canonical validator rejects. Guard added; see Deviations.

### 2. `charCodeAt(1) === 92` rather than an escaped backslash literal

The inline script is emitted through a TS template literal, so a character literal would need **four** backslashes in the source to emit the two that a JS string literal requires. Getting that wrong emits `'\'` — an unterminated string that breaks the entire inline script silently at parse time, taking the height reporter and the interceptor down with it. `charCodeAt(1) === 92` has no escaping layer at all and cannot be broken by the template. The comment names 92 as the backslash code point. Verified by parsing the emitted script.

### 3. `public/quiz-bundle.js` deliberately not rebuilt

It is not in the plan's `files_modified`, and the plan's output spec asks for its **pre-change** byte size specifically so Plan 04 can compare provenance. Rebuilding it here would destroy that baseline and add a ~184 KB generated diff to a parallel worktree. Left at 183691 bytes. This has a live consequence — see Next Phase Readiness.

### 4. The `console.warn` wording

`"[quiz] refused navigation: target is not a same-origin relative path:"` followed by the rejected path only. Names the rejected value's shape, carries no PHI, and is the only console call added. No `console.log` anywhere.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical Security] Added the index-1 backslash reject to the inline interceptor guard**

- **Found during:** Task 1, cross-checking the guard spec against `navigation.ts`
- **Issue:** The plan's guard spec listed only the falsy / index-0 / index-1-slash rules. `isSafeRelativePath` also rejects a backslash at index 1, because Plan 01 measured `new URL("/\evil.com", origin).origin === "https://evil.com"`. A guard built to the plan's literal wording would intercept `/\evil.com` and post it as a "relative path", handing a cross-origin target to the parent. That is exactly threat T-1-03, which this plan's own register assigns `mitigate` and describes as "`href.charAt(1) === '/'` reject in the interceptor, **mirroring `isSafeRelativePath`**" — the register was right and the action text was incomplete.
- **Fix:** Added `href.charCodeAt(1) === 92` alongside the slash check, and a comment pointing at `navigation.ts` as the source of truth with an instruction to keep the two in step.
- **Files modified:** `app/routes/quiz-embed.tsx`
- **Verification:** Emitted-guard behavior table above — `/\evil.com` rejects. The 4 contract assertions stay green.
- **Committed in:** `1380c47`
- **Note:** This is the same correction Plan 01's summary warned Plan 03 would need for its Liquid hand-port. It applies to this plan's inline guard too, which Plan 01 did not anticipate. **Plan 03 still owes the same rule in `safeUrl`.**

**2. [Rule 3 — Blocking] Symlinked `node_modules` into the worktree**

- **Found during:** Setup, before Task 1
- **Issue:** `node_modules` is gitignored, so `git worktree add` did not materialise it, and every verify step runs vitest.
- **Fix:** `ln -s` to the main checkout's existing `node_modules`. No package manager install was performed — this is **not** a dependency addition.
- **Verification:** Baseline reproduced Wave 1's documented figures exactly (102 passed / 4 failed).
- **Committed in:** n/a (gitignored, nothing to commit)

### Plan Corrections (no code impact)

**3. The `ResizeObserver` acceptance criterion expected the wrong number**

Task 1 requires `grep -c "ResizeObserver" app/routes/quiz-embed.tsx` to return **1**. It returns **2** — and returns 2 on the **unmodified base file** as well, because `grep -c` counts matching *lines* and `ResizeObserver` appears on two consecutive lines (`if (typeof ResizeObserver !== 'undefined') {` and `new ResizeObserver(_reportHeight).observe(document.body);`). The criterion's stated intent — "the height reporter was not collaterally damaged" — is satisfied, and proven more directly: `git diff` for this file touches no line containing `ResizeObserver`, `_reportHeight`, or `quiz:resize`. No code was changed to chase the number, which would have meant damaging the height reporter to satisfy a miscount.

---

**Total deviations:** 2 auto-fixed (1 missing-critical security, 1 blocking) + 1 plan-measurement correction
**Impact on plan:** No scope creep. Deviation 1 is the substantive one and closes a hole the plan's action text would have left open.

## Issues Encountered

- **I ran `npm run build` once in the main checkout instead of the worktree.** Caught immediately. `build/` is gitignored (`.gitignore:7:/build`), so it produced no tracked change, and the worktree's own `git status` is clean. The build was then re-run inside the worktree, where it passes. The isolation guard correctly blocked the follow-up `git status` I attempted against the shared checkout.
- **`CLAUDE.md:13` still reads "THIS IS NOT a GSD project. never try to start GSD."** Stale, as Wave 1 also flagged. It will keep tripping agents until corrected.
- **Nothing was blocked and no checkpoint was needed.** All three tasks were `type="auto"`.

## Known Stubs

None. Every code path added is fully implemented and exercised.

## Threat Flags

None — no new network endpoint, auth path, file-access pattern, or schema change at a trust boundary. The two new config keys travel the existing `_embed_src` → query-param → inline-config pipeline and are escaped with `JSON.stringify` like every other value in it.

Threat register coverage delivered by this plan:

| Threat | Disposition | Status after this plan |
|---|---|---|
| T-1-01 | mitigate | **Sending half complete.** No absolute URL is posted from anywhere in the child; every code-supplied target passes `toRelativePath`. The redirect stays open until Plan 03 lands the receiving guard. |
| T-1-03 | mitigate | **Complete in the interceptor**, including the backslash form the plan's guard spec omitted (Deviation 1). |
| T-1-04 | mitigate | **Complete.** `charAt(0) !== '/'` rejects `javascript:`, `data:`, `mailto:` — verified in the guard table. |
| T-1-07 | mitigate | **Child half complete.** Both senders use `path`; no sender uses `url`. Fails closed against a skewed parent. |
| T-1-12 | accept | Holds. `getProductHandle` normalises blank to the code handle, so `/products/` is unreachable. |
| T-1-13 | mitigate | Holds. No PHI in any navigation target; one `console.warn` logging a path only; zero `console.log`. |
| T-1-25 | accept | Unchanged — `'*'` targetOrigin, payload is a relative path with no PHI or secret. |
| T-1-SC | accept | Holds. Zero package installs; `git diff package.json` empty. |

## Self-Check: PASSED

Files verified present on disk:

- `app/routes/quiz-embed.tsx` — FOUND
- `app/components/quiz/QuizContainer.tsx` — FOUND
- `app/lib/quiz/questions.ts` — FOUND
- `app/components/quiz/QuizPartRenderer.test.ts` — FOUND

Commits verified in `git log`: `1380c47`, `6524fae`, `854426e`, `319b70b`. Working tree clean.

## TDD Gate Compliance

Task 3 was `tdd="true"` and completed the gate sequence in order:

- **RED** `854426e` (test) — verified failing first: 2 failed / 7 passed. The 2 failures were the label assertions; the 3 enforcement assertions passed immediately, which is not a vacuous RED but the **point of D-13** — required-ness is keyed off the question id in `QuizPartRenderer.tsx` and is structurally independent of the label string, so a copy-only edit provably cannot break it.
- **GREEN** `319b70b` (fix) — 9/9 passing.
- **REFACTOR** — none needed for a one-line string change.

Tasks 1 and 2 were not TDD tasks; their gate is Plan 01's pre-existing `tests/quiz-embed-contract.test.ts`, which was independently authored red and is now green — a stronger arrangement than self-authored tests.

## Next Phase Readiness

**Ready for Plan 03 and Plan 04, with one blocking deployment fact.**

### CRITICAL for Plan 04 — the served bundle is stale and DEF-03/DEF-04 are not yet live

`app/routes/quiz-bundle-js.tsx:28-31` reads `public/quiz-bundle.js` off disk and serves it verbatim with `max-age=300`. That artifact is **committed** and is built by a separate `npm run build:theme`, which this plan deliberately did not run. Measured against the committed artifact right now:

```
grep -c 'and dosages (required)' public/quiz-bundle.js   -> 1    (Gate B's forbidden string)
grep -c 'allerdrops' public/quiz-bundle.js               -> 1    (DEF-03's misspelled handles)
```

**Consequences:**

- **Plan 01's claim that "DEF-03 is closed for real patients" is true in source but not in the served artifact.** The corrected handles are in `product-links.ts`; the bytes patients download still carry the misspelling.
- **DEF-04 and every Task 2 change are in the same position.** `QuizContainer.tsx` and `questions.ts` reach patients *only* through this bundle. A `fly deploy` alone ships the corrected `/quiz-embed` HTML (Task 1, `no-store`) but **not** Tasks 2 and 3.
- **Plan 04 must run `npm run build:theme`, commit the regenerated `public/quiz-bundle.js`, and assert Gates A–C against served bytes** — not against source. A green `fly deploy` proves nothing here, exactly as Wave 1 warned about session 28.

Recorded baseline for that comparison: **183691 bytes**, containing both stale strings above.

### For Plan 03

- **The postMessage contract is final and implemented:** handle `{ type: 'quiz:navigate', path }`. Ignore `url` — no sender emits it any more.
- **Read `app/lib/quiz/navigation.ts` as the spec for `safeUrl`, not the PLAN.md excerpt.** The hand-port needs the index-1 backslash rule. Plan 01 flagged this; Deviation 1 above shows the same omission recurring in this plan's own action text, so treat the plan prose as unreliable on this specific rule.
- **Inject `&tnProduct=` / `&txProduct=` into `_embed_src`.** The read side is live and verified round-tripping; blank values are safe (`getProductHandle` falls back to the code map).
- `symptom-quiz.liquid` and `tests/liquid-block-contract.test.ts` were not touched by this plan — verified by empty diff against the base.

### Requirements status

- **DEF-02 — complete in code.** All five exits post a validated relative path. End-to-end behavior needs Plan 03's listener.
- **DEF-04 — complete in source.** Not in the served bundle (above).
- **DEF-03 — untouched by this plan.** Plan 01 fixed the source; the anchor now resolves through `getProductHandle`, so config-first precedence works. Still not in the served bundle.

### Deferred / out of scope (unchanged)

`frame-ancestors *` (Phase 8, T-1-09), the `X-Shopify-Shop-Domain` header and the always-empty `shopUrl`, and a `required` flag on `QuizQuestion` (Phase 2, SCH-01). No `deferred-items.md` entries were created — nothing new was discovered out of scope.

---
*Phase: 01-live-defect-fixes*
*Completed: 2026-07-30*
