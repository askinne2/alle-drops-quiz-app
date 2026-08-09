# Handoff — AlleDrops quiz app (2026-08-09 session 32)

### Status: **GSD Phase 2 COMPLETE — 4/4 plans, verified 11/11 `passed`, marked complete in ROADMAP/STATE/REQUIREMENTS.** The quiz schema is now declarative: `required`, `showIf`, and a static info-block type, with **zero question-ID literals** left in the renderer. Suite 173 → **280 tests / 22 files**, typecheck and build clean, tree clean. **Two real defects were found by browser UAT that every automated test passed straight through** — one of them would have made the entire phase invisible on the storefront. **MERGED ([PR #17](https://github.com/askinne2/alle-drops-quiz-app/pull/17)) and DEPLOYED — Fly `v48`.** Verified on served bytes: production went 184542 → 185951 bytes and now serves an artifact byte-for-byte identical to the committed bundle. D-06 and D-16 re-confirmed live against production DOM. Next: Andrew's own visual pass, then `/gsd:discuss-phase 3`. **Phase 1's live exposures are still open — Klaviyo still loads 10× on the quiz page and the live clinical intake still carries no medical disclaimer.**

### Start here (fresh session)

Phase 2 is **done, merged, and deployed** — nothing is half-finished and nothing is waiting on a build.

1. Andrew's own visual pass on the quiz (his stated gate before Phase 3) — see "To UAT" in Resume context. The one to actually look at is **Part 5**: answer "yes" to medications, type something, toggle to "no" and back — the text must still be there.
2. Then `/gsd:discuss-phase 3` (mandatory medical history).

Do **not** re-run `/gsd:execute-phase 2` — it is complete, verified 11/11, and shipped as Fly v48.

---

## Session 32 (2026-08-09) — what happened today

### Goal
Run Phase 2 (Quiz Schema Foundation) end to end: `/gsd-discuss-phase 2` → `/gsd-plan-phase 2` → `/gsd-execute-phase 2`, then UAT it in a real browser.

### What shipped

Declarative quiz schema, all mechanism, zero content:

- **`showIf`** — declarative data object (`{ questionId, equals | isAnswered | includes }`), a three-member union so a two-operator condition is unwritable. No function form, deliberately.
- **`required`** — defaults to `true`. Verified this reproduces prior behavior with **zero** `required: false` declarations, because the only two implicitly-optional questions (`med_list`, `med_control`) are exactly the `showIf`-gated pair. `[]` no longer counts as answered.
- **`QuizItem = QuizQuestion | QuizInfoBlock`** discriminated union — the compiler, not a reviewer, prevents an info block from carrying `required`, acquiring an `answers` key, or entering `ALL_SCORED_QUESTIONS`.
- **`app/lib/quiz/schema.ts`** — new pure module: `isQuestion`, `selectedValues`, `isAnswered`, `evaluateShowIf`, `visibleItems`, `visibleAnswers`, `toggleOption`, `isOptionDisabledByExclusive`, `itemsForPart`.
- **`QuizPartRenderer.tsx` is now near-dumb** — all 4 question-ID literals, all 5 `"none"` string literals, and `isExclusiveNoneQuestion` are gone. Independently verified at 0 occurrences each.

### The two defects UAT caught — read this before trusting a green suite again

**1. `public/quiz-bundle.js` was never rebuilt. Phase 2 would have been invisible on the storefront.**

It is a **committed build artifact** produced only by `npm run build:theme` (separate vite config). `npm run build` does not touch it. It was last built in Phase 1 (`14e13ff`) and still contained `med_list` ×5, `symptoms_nasal` ×3, and zero `isAnswered`. No plan rebuilt it; the planner, plan-checker, and all four executors missed it; typecheck/test/build all passed.

**This is the session-28 incident repeating exactly.** It also poisoned the first UAT pass — the browser was running Phase-1 code and produced a *false* D-06 failure that I nearly reported as a real bug. Caught only because the live React component took a prop named `questions` while current source passes `items`.

Closed: bundle rebuilt + `tests/quiz-bundle-freshness.test.ts` added as a staleness guard.

**2. Info blocks never reached the renderer — failed Success Criterion 3 outright.**

`QuizContainer.tsx` filtered `item.kind === "question"` before passing items to `QuizPartRenderer`, silently dropping every info block. `QuizPartRenderer` was never at fault — it already had `InfoBlockCard` and `isPartComplete` already skipped non-questions. The container filter was the only broken link.

Closed: `itemsForPart(parts, index)` extracted into `schema.ts` (pure, testable — consistent with the no-DOM-test-infra decision), filter removed, plus a pure unit test and a source-text guard. Both tests observed failing against the pre-fix code first.

### UAT results (Chrome, localhost, all four checks)

| Check | Result |
|---|---|
| D-06 — `[]` blocks step advance | PASS (with a non-vacuity control: Next genuinely enables when all three answered) |
| D-16 — exclusive option still deselects | PASS |
| D-03 — medication list survives a `taking_meds` toggle | PASS — `preserved: true` |
| D-10 — info block renders, collects nothing, respects `showIf` | FAILED → fixed → **re-run and PASSED** |

**No PHI row was written** — stopped before "See results". Synthetic data only.

### What worked

- **Reading the DOM instead of screenshots.** Every UAT conclusion came from `next.disabled`, React fiber `memoizedProps`, and occurrence counts — not from looking at pixels. The stale-bundle defect was invisible in screenshots and obvious in `memoizedProps`.
- **Probing pure functions in isolation before blaming the wiring.** When the browser disagreed with expectation, running `isAnswered` / `toggleOption` / `isPartComplete` through a throwaway vitest file proved the logic was correct and localized the bug to the container in minutes.
- **Non-vacuity discipline, applied throughout.** The literal-inventory test was proven RED against the pre-refactor renderer (9 recorded counts) before being trusted. Every executor ran negative controls and reverted them.
- **`split(needle).length - 1` for every occurrence count.** Never `grep -c`.
- **The blocking human checkpoint earned its keep.** Both defects passed 269 green tests. Without the browser pass, a dead phase ships.

### What didn't work

- **`npm run dev` cannot run non-interactively** — it is `shopify app dev` and blocks on a store-selection prompt. Use `SHOPIFY_APP_URL=http://localhost:3000 npx react-router dev` instead (port 3000). Without that env var, `/quiz-embed` 500s with "Detected an empty appUrl configuration".
- **Coordinate-based browser clicking across tabs** — window sizes differ between sessions, so clicks land wrong. Driving the DOM directly (`el.click()`, native value setters + `input` event) is far more reliable.
- **Trusting `npm run build` as proof the front end is current.** It is not. The theme bundle is a separate build.
- **The decision-coverage gate silently skipped** — it reported "no trackable decisions" because CONTEXT.md writes decisions as `**D-01:**` in prose rather than the format the handler scans. It verified nothing; the plan-checker did that work instead.
- **The post-planning gap analysis is noisy** — it scans all 46 requirements against one phase's plans, so "38 not covered" is meaningless, and 6 of its "covered" hits are false positives from forward-references in plan text.

### Next steps

1. ~~Push, PR, merge, deploy.~~ **ALL DONE, on Andrew's explicit authorization.** [PR #17](https://github.com/askinne2/alle-drops-quiz-app/pull/17) merged to `main` (`0a35d6b`); Fly **v47 → v48**. Zero Shopify extension files changed, so `shopify app deploy` was correctly NOT run.

   **Deploy verified the right way** — served bytes, not exit code:

   | | Before | After |
   |---|---|---|
   | served bundle | 184542 B | 185951 B |
   | `isAnswered` | 0 | 2 |
   | `"info"` | 0 | 1 |
   | `isExclusiveNoneQuestion` | 0 | 0 |

   Served content is byte-identical to `public/quiz-bundle.js`. Production DOM re-checked: nothing answered → Next disabled; all three answered → Next **enabled** (non-vacuity control); nasal emptied to `[]` → Next disabled; exclusive re-clicked → options re-enabled. **No submission completed, so no PHI row was written.**

   Note: `fly deploy` again printed "The app is not listening on the expected address". It is a false alarm in this app — health is 200 and the release is live.
2. **Andrew's visual UAT (his stated next action, before Phase 3).** Recipe:
   ```bash
   SHOPIFY_APP_URL=http://localhost:3000 npx react-router dev
   # then open http://localhost:3000/quiz-embed
   ```
   `npm run dev` will NOT work — it is `shopify app dev` and blocks on an interactive store prompt. Without `SHOPIFY_APP_URL` the route 500s with "Detected an empty appUrl configuration".

   Four things to look at, TN → any patient info → Part 1:
   - **Empty selection blocks Next.** Tick a nasal symptom, untick it → Next greys out. Tick "None of the above" → Next enables.
   - **Exclusive option still unchecks.** Tick "None of the above" → other five grey out but "None" stays clickable. Click it again → everything re-enables, Next greys out.
   - **Medication list survives a toggle.** Part 5, "yes" to medications, type something, switch to "no", switch back to "yes" → the text is still there. On `main` today it is gone.
   - **Info block** needs a throwaway fixture to see (nothing ships one yet) — Phase 3 is the first phase with real ones. Skippable.
3. ~~Deploy.~~ **DONE — see step 1.** Keep the lesson: a successful `fly deploy` is not proof. Always diff the served `/quiz-bundle-js` bytes. It recurred in this phase and would have shipped a dead release.
4. `/gsd:discuss-phase 3` — mandatory medical history. Phase 3 ships the **first real info blocks** (HIST-04's PCP recommendation), so budget a browser check for them.
5. **Still open from Phase 1, unchanged:** Klaviyo loads 10× on `/pages/allergy-quiz` (theme `config/settings_data.json`, one-field flip); the live intake page carries no medical disclaimer at all; the Apntly embed needs a keep/disable decision.

### Resume context

- **Branch:** `main` @ `12cf89d`, in sync with `origin`, clean tree. Merge of PR #17 is `0a35d6b`. `phase-2-quiz-schema-foundation` still exists locally and on origin — merged, safe to delete (as is the older `feature/phase-2-admin-view`). Fly release **v48**.
- **How to verify:** `npm run typecheck && npm test && npm run build` → expect **280 passing / 22 files**, all clean. For the theme bundle: `npm run build:theme` then confirm `public/quiz-bundle.js` is byte-identical to the committed artifact (the build is deterministic — a diff means source drifted).
- **To UAT:** production is live at `https://alle-drops-quiz-app.fly.dev/quiz-embed` (v48, already carries Phase 2). For local: `SHOPIFY_APP_URL=http://localhost:3000 npx react-router dev`, open `http://localhost:3000/quiz-embed`. **`npm run dev` will not work** — it is `shopify app dev` and blocks on an interactive store prompt. Note the page nests an iframe (`initQuiz()` picks `injectIframe` when `window.self === window.top`), so query `document.querySelector('iframe').contentDocument`, not the top document.
- **Key files:**
  - `app/lib/quiz/schema.ts` — the pure evaluator; all quiz decisions live here now
  - `app/lib/quiz/types.ts` — `QuizItem` union, `showIf`, `required`, `exclusive`
  - `app/components/quiz/QuizContainer.tsx` — `visibleAnswers(ALL_ITEMS, …)` at 3 score sites + payload; `itemsForPart` for rendering
  - `public/quiz-bundle.js` — committed artifact; **rebuild with `npm run build:theme` whenever quiz source changes**
  - `tests/quiz-bundle-freshness.test.ts` — guards defect 1 from recurring
  - `.planning/phases/02-quiz-schema-foundation/02-HUMAN-UAT.md` — full UAT record
  - `.planning/phases/02-quiz-schema-foundation/02-VERIFICATION.md` — 11/11 passed
- **Blockers / open questions:**
  - **No test renders `QuizContainer`.** Both defects lived exactly in that blind spot. Two source-text guards now narrow it; they do not close it. Adding DOM test infra was explicitly declined this phase — revisit if a third wiring bug appears.
  - Phase 3 open questions with William are unchanged: R6 diagnosis-question scope, the third medical-history free-text label, and whether resume/edit was ever expected.

---

## Session 31 (2026-07-30) — what happened previously

### Goal
Run `/gsd-execute-phase 1` (Live Defect Fixes) end to end: 6 plans across 5 waves, then deploy and verify.

### The findings that mattered

**1. A live, exploitable open redirect that two independent reviews had already cleared.**

`app/entry.theme.tsx`'s `injectIframe` message listener had no origin check and no path validation, and called `window.location.assign(String(e.data.url))` directly. Confirmed against production by navigating the real page to `https://example.com/pwned`.

Plan 01-04 measured that the installed Liquid block loads the bundle on zero storefront pages and renders no `data-alledrops-quiz` container, and concluded the branch was dead. **That is true of the storefront and false of `/quiz-embed` itself**, which renders that container AND loads the bundle — and `initQuiz()` picks `injectIframe` whenever `window.self === window.top`. The code review then inherited 01-04's assessment and excluded the file from scope, so both hardening passes skipped it. A correct measurement of one entry path was generalised into a claim about all of them.

It also survived the `url` → `path` rename **because** it was excluded — it still read the abandoned `url` key, keeping the retired contract alive underneath the hardened one. The storefront fail-closed test passed while this stayed open. No framing needed: an opener can `postMessage` into a window it opened via `window.open`, so an attacker page could open the genuine clinic intake and silently swap it for a phishing clone. Fixed in `14e13ff`, deployed, re-tested with the original payload plus five variants.

**2. Reflected XSS on `/quiz-embed`, already live before this phase (CR-01).** Six `url.searchParams` values were interpolated into an inline `<script>` via `JSON.stringify`, which does not escape `<`. Three of the six sinks predate Phase 1. Only CSP was `frame-ancestors *` — no `script-src`.

**3. `isSafeRelativePath` accepted cross-origin targets (CR-02).** The WHATWG URL parser strips every TAB/LF/CR *before* parsing, shifting the indexes the positional rules inspect: `new URL("/\t/evil.com", app_origin).origin === "https://evil.com"`. Derived by sweeping every char `0x00`–`0x20` in front of an authority-shaped payload — exactly TAB/LF/CR bypassed the checks.

**There were FOUR hand-ported copies of the navigation rules, not the two the review found:** `navigation.ts` (canonical), the Liquid `safeUrl`, the anchor interceptor in `quiz-embed.tsx`, and `entry.theme.tsx`. All four now agree; the last one imports the validator rather than becoming a fifth copy.

**4. D-10 was never implementable.** Shopify rejected the app version: a theme app extension block may declare **at most one** `"type": "product"` setting, and D-10 specified two. No deploy of Plan 01-03's output could ever have succeeded. Converted both to `"type": "text"` holding the handle — which the Liquid already consumed via `.handle`. Net win: text settings *can* declare a `default`, which **restored the D-11 clause** Plan 01-03 had recorded as not implementable, and both handles now flow through the embed src automatically.

**5. Gate D was closed.** `test_options_redirect_url` was passing the same value as `consult`. Root cause found in the theme repo at `templates/page.quiz.json`. Andrew fixed it in the theme editor; verified on served bytes.

**6. `01-VALIDATION.md`'s page-existence checks were false positives.** The storefront 302s to `/password` and returns **200 for the password page**, so every unauthenticated check passed vacuously. Authenticated: `/pages/test-options` exists, but `/pages/consult` and `/pages/testing-options` are both **404**. `/pages/consult` was the documented blank-fallback for the consult redirect, so blanking that theme setting sent a patient who had just completed a clinical intake to a dead page.

### What was done

- **Waves 1–3 via parallel `gsd-executor` subagents in git worktrees** — plans 01-01…01-04. Each merged and gated individually.
- **Waves 4–5 inline** (both `autonomous: false`) — deploy and verification needed production writes and interactive auth.
- **PR #16 merged to `main`.** Andrew explicitly instructed the merge, overriding `CLAUDE.md:136`.
- **Deployed:** Fly `v46` → `v47`; Shopify app version `alledrops-quiz-production-21`.
- **Out-of-plan work, authorized in session:** `app/lib/quiz/redirects.ts` (consult fallback off the 404 page), `app/lib/quiz/html-safe.ts` (CR-01), the CR-02 fix across four files, the D-10 conversion, and the `entry.theme.tsx` fix.
- **AoD notes folder wired up** — `/Users/andrewskinner/Documents/Claude/Projects/AoD/.claude/CLAUDE.md` now explains that GSD cannot run from there and maps all three repos.

### Verification status

| Gate | Result |
|---|---|
| Gate A — `/quiz-embed` served HTML | ✅ PASS |
| Gate B — `/quiz-bundle-js` served bytes | ✅ PASS (183691 → 184428, all 5 markers) |
| Gate C — rendered storefront page | ✅ PASS (control-char check at byte 88767, ahead of positional at 88920) |
| Gate D — `testOptions` served value | ✅ PASS |
| Gate E — both handles + products 200 | ✅ PASS (self-closed by the D-10 defaults) |
| Gate F — behavioral, real DOM | ✅ PASS (see below) |
| Suite / typecheck / build | ✅ 173 tests, 17 files, exit 0 |
| Plan 01-06 Task 3 — PHI cleanup | ✅ PASS — `PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0` |
| Phase verification (`gsd-verifier`) | ✅ 39/40, status `human_needed` (1 item, see below) |
| `phase.complete` + PROJECT.md | ✅ ROADMAP/STATE/REQUIREMENTS/PROJECT all consistent |

Gate F, driven through Chrome DevTools against the live storefront: 8 hostile targets (incl. 4 control-char variants) all rejected; valid path from the **wrong** origin rejected; legacy `url` key rejected; **valid path from the correct origin navigated** — the non-vacuity control. `quiz:scrollToTop` moved 1800 → 822.5, identical at 60ms and 660ms (instant, not smooth), with 12px clearance above the sticky header.

**Gate F wrote ZERO rows.** Verification used synthetic `postMessage` events and page loads; the questionnaire was never completed, so nothing POSTed to `/api/quiz/submit`. `verify_pre` should therefore come back **0** — if it does not, that is a finding to investigate, not round off.

### What worked

- **Asserting on served bytes, never on exit codes.** Fly's deploy printed `The app is not listening on the expected address` and still worked; the extension deploy printed `success` twice while the first attempt had actually failed validation. Both were only resolvable by fetching and counting.
- **Checking every green result for vacuity.** Several passes were trivially true until probed — the XSS test only meant something once the payload was proven to reach the response, and the Gate F rejects only meant something once a valid path was shown to navigate.
- **Running content gates as node occurrence counts.** `grep` on this machine is a ugrep wrapper where `$` anchors mid-pattern, and `grep -c` counts *lines* — against a single-line 184KB bundle every count collapses to 1, so `≥1` gates pass vacuously. Three separate executors hit this independently.
- **The worktree base assertion.** Three of four subagent worktrees spawned at a stale commit that predated the earlier waves. Only `git merge-base` caught it. On Plan 01-04 it would have been silently destructive: `build:theme` would have succeeded from pre-fix source and produced a plausible bundle with a fresh hash that still satisfied "byte count ≠ 183691".
- **Subagents overriding their own plans when they had measured evidence.** Three plans contained factually wrong specs; each executor disproved its instructions rather than following them.

### What didn't work

- **`shopify app deploy` from inside Claude Code.** The OAuth session lives in the macOS keychain, which a Claude subprocess cannot read, so the CLI falls back to device auth that expires before it can be approved. It works only if Andrew approves the printed code within the TTL, or runs the command in his own terminal. `--force` does not exist in CLI 4.1.0; the correct flag is `--allow-updates`.
- **Piping a long-running background command to `tail`.** `tail` buffers until EOF, so the log file sits at 0 bytes and there is no progress visibility. Don't do it for `fly deploy`.
- **Trusting the code review's "do not re-report" note.** It excluded `entry.theme.tsx` on 01-04's dead-code finding, and that is exactly where the live open redirect was.
- **Two self-inflicted test errors, both caught and corrected:** an assertion that the XSS payload text should be absent (it correctly appears as inert escaped data — the test was wrong, not the code), and a shell-quoting error that produced a false Gate C FAIL on the control-char guard.
- **Counting `klaviyo` with `grep -c`.** Reported "4 occurrences" for most of the session; the real number is **10**. `grep -c` counts matching LINES. This is the exact trap the session had already flagged to three separate executors, hit by the orchestrator. Corrected in `STATE.md`.
- **Assuming the PHI cleanup was human-only.** Plan 01-06 said Claude could not reach Cloud SQL because the local IP is not on the authorized-networks list. True of this machine — but the Fly app holds `DATABASE_URL` and reaches the database, so `fly ssh console` works. The task sat "blocked" longer than it needed to.
- **A Prisma raw query against `submissions`.** Fails with `unrecognized token: ":"` — a SQLite error. Prisma on the Fly machine is the Shopify session store (see `litestream.yml`); the PHI table is Postgres via the `pg` pool in `app/lib/db.ts`.

### The root cause behind the security miss — read this before Phase 8

`PROJECT.md` stated: *"The `quiz-bundle.js` injection path (`app/entry.theme.tsx` `injectIframe()`) is **not in play** — parent-side fixes there do not ship."*

That was scoped to the storefront but written as universal. It propagated into Plan 01-04's "dead code" finding, and the code review then inherited 01-04's assessment and excluded the file from scope. **Two independent reviews cleared code that was live and exploitable.**

All three copies of the wrong claim are now corrected: the `PROJECT.md` source, the `STATE.md` Deferred Items entry (retracted in place so the retraction is visible to anyone who read the original), and `01-RESEARCH.md:821`. The general lesson, worth applying to every future "path X is not in play" statement: **treat it as scoped to the entry point actually measured, not to all of them.**

### Next steps

1. **`/gsd-discuss-phase 2`** — quiz schema foundation (`required`, `showIf`, static-info question type). STATE is already advanced to Phase 2 and `status: ready_to_plan`.
2. **Decide on Klaviyo** — **10 occurrences** on the live quiz page, loader `https://static.klaviyo.com/onsite/js/SzY6kF/klaviyo.js`. It is an app embed in the **theme repo** at `config/settings_data.json` → `current.blocks`, `disabled: false`. A one-field flip plus a theme push, or the App embeds toggle in the theme editor. Tracked as Phase 8 / LAUNCH-01. Deliberately not done in Phase 1: it affects the live marketing stack and sits outside the phase.
3. **Triage the 14 open code-review warnings** in `01-REVIEW.md`. Two are patient-facing and worth doing early: duplicate PHI rows on the 3-6/7+ brackets (no in-flight submit guard, WR-09), and `?test=1` enabling Test Mode regardless of the merchant checkbox (WR-13, re-confirmed live 2026-07-30).
4. **Mobile sticky-header clearance** — the one open item in `01-HUMAN-UAT.md`. `scroll-margin-top` is hardcoded at 100px and Gate F measured desktop only (100 vs 88, 12px clear). No mobile measurement exists anywhere in the phase record.
5. **Medical disclaimer** — the live intake page carries none at all (`disclaimer` appears 0 times in the served HTML). The block's text is the placeholder `This text needs changed.` with its toggle OFF, so turning the toggle on today would publish the placeholder. Counsel-owned copy.
6. **Apntly app embed** — also enabled site-wide in the theme, though `apntly` appears 0 times on the served quiz page. Needs an explicit keep/disable decision before go-live; `CLAUDE.md` rule 4 names Klaviyo but not this one.

### Resume context

- **Branch:** `main` @ `1556a0d`, pushed, clean tree. Phase branch `fix-phase1-live-defects` and `gsd/v1-planning-scaffold` also pushed. PR #16 merged.
- **How to verify:** `npm test` (expect **173 passing / 17 files**), `npm run typecheck`, `npm run build`. For live checks, the storefront is password-protected — authenticate first (password is in `01-VALIDATION.md`), because **unauthenticated requests return 200 for the password page and produce false positives**. That is not hypothetical: the verifier reproduced it, showing the *nonexistent* handle `tennessee-allerdrops` also returns 200 unauthenticated. Recipe is in `AoD/.claude/CLAUDE.md`.
- **Reaching Cloud SQL** (this machine's IP is off the authorized-networks list, but the Fly app is not):
  ```
  fly ssh console -a alle-drops-quiz-app -C "sh -c \"echo <base64-script> | base64 -d > /tmp/q.cjs && cd /app && node /tmp/q.cjs\""
  ```
  Use `require('/app/node_modules/pg')` with `process.env.DATABASE_URL` and `ssl: { rejectUnauthorized: false }`. **Not Prisma** — that is the SQLite session store and fails with `unrecognized token: ":"`. Base64 the script to avoid shell-quoting mangling the SQL. Select `COUNT(*)` only; `CLAUDE.md:139` permits ids and counts and nothing else.
- **Key files:**
  - `.planning/STATE.md` — full findings log; read before anything else
  - `.planning/phases/01-live-defect-fixes/01-VERIFICATION.md` — 39/40, and the `overrides:` block for the one unmet must-have
  - `.planning/phases/01-live-defect-fixes/01-REVIEW.md` — 2 blockers (both fixed), 14 open warnings
  - `.planning/phases/01-live-defect-fixes/01-HUMAN-UAT.md` — the single open human item
  - `app/lib/quiz/navigation.ts` — canonical path validator; **four files port these rules, they change together** (`symptom-quiz.liquid`, `quiz-embed.tsx` interceptor, `entry.theme.tsx`)
  - `app/lib/quiz/html-safe.ts` — `jsonForScript`; use instead of `JSON.stringify` for anything reaching inline script
  - `app/entry.theme.tsx` — the listener that was wrongly believed dead
  - `app/lib/quiz/html-safe.ts` — `jsonForScript`, use instead of `JSON.stringify` for anything reaching inline script
- **Repos:** app `/Users/andrewskinner/Local Sites/alle-drops-quiz-app` · theme `/Users/andrewskinner/Local Sites/allergist-on-demand` (Sense 15.4.1, **git HEAD is stale — working tree has uncommitted live-state drift, do not push blindly**) · notes `/Users/andrewskinner/Documents/Claude/Projects/AoD`.
- **Blockers / open questions:** nothing blocks Phase 2. Open decisions carried forward — the Klaviyo disable (yours, business impact); counsel copy for the medical disclaimer; the Apntly embed keep/disable; and one standing security note: **`block.settings.app_url` is now the trusted postMessage origin**, a merchant-editable theme field that moves a security boundary with no deploy. A mistyped value silently breaks every navigation exit; a hostile one would be trusted.
- **Theme repo caution:** `templates/page.quiz.json` carries a local edit matching what Andrew set in the theme editor, and the repo's git HEAD is stale (it still references a `quiz-kit-smart-product-finder` block). Reconcile that drift before any `shopify theme push`.
- **Do not re-run:** `/gsd-execute-phase 1`. It is complete and deployed; STATE has advanced to Phase 2.

---

## Session 30 (2026-07-28) — what happened today

### Goal
Two things: reconstruct project state after a gap, and run down a surprise **$500 Google Cloud invoice**.

### The finding that mattered
**The Cloud SQL instance had been running at 8 vCPU / 64 GB since the day it was created.**

`alledrops-quiz-data` (created 2026-05-06, PG 18) was provisioned as:

| | Before | After |
|---|---|---|
| Edition | `ENTERPRISE_PLUS` | `ENTERPRISE` |
| Tier | `db-perf-optimized-N-8` (8 vCPU / 64 GB) | `db-custom-1-3840` (1 vCPU / 3.75 GB) |
| Automated backups | **disabled** | enabled, daily 07:00 UTC, 15 retained |
| PITR | disabled | enabled |
| Disk | 100 GB PD_SSD | 100 GB PD_SSD (cannot be shrunk) |
| Est. run rate | ~$1,150/mo | **~$65/mo** |

**Root cause — not a misconfiguration by hand.** Per Google's Cloud SQL for PostgreSQL release notes (2024-10-23): *when creating an instance via CLI/API, if the database version is PostgreSQL 16 or later, the default edition is Enterprise Plus.* The instance was created on PG 18 via `gcloud` and silently inherited Enterprise Plus. There is no warning at creation time. Enterprise edition supports PostgreSQL 9.6–18, so the PG version was never a reason to be on Plus.

**Why the invoice was $500 and not ~$1,150:** the instance was SUSPENDED 2026-06-06 → 2026-06-24 (the billing lapse from session 27), so only ~11 of 30 days in June were billed. **The $500 was never the steady-state run rate — a full month at the old tier would have been roughly double.**

### What was done
- **Confirmed the cost was isolated to this one resource.** Checked all five projects on the `Beautiful Rescues` billing account (`eligible-maps`, `beautifulrescues`, `br-staging-mysites-i-7399`, `gen-lang-client-0877130773`, `alledrops-quiz`) — Compute, Cloud Run, and Cloud SQL APIs are not even enabled on the other four. 100% of spend is `alledrops-quiz-data`.
- **Took an on-demand safety backup first** — backup id `1785246531060`, status SUCCESSFUL. Necessary because automated backups were off, so there was no restore point at all before the change.
- **Downsized** — `gcloud sql instances patch alledrops-quiz-data --edition=ENTERPRISE --tier=db-custom-1-3840`.
- **Enabled automated backups + PITR** — `--backup-start-time=07:00 --enable-point-in-time-recovery --retained-backups-count=15`.
- **Downtime was ~2 minutes**, 09:56–09:58 ET (13:56–13:58 UTC), across the two patch restarts.
- **Public IP unchanged** (`34.139.97.17`) — no Fly `DATABASE_URL` secret change was needed.

### Verification status — read this before assuming it's fine
- ✅ Instance `RUNNABLE`, config confirmed via `gcloud sql instances describe`.
- ✅ Fly health endpoint `https://alle-drops-quiz-app.fly.dev/health` → `200`.
- ✅ WAL-archive `WARNING`s appeared at 13:56 UTC during the PITR enablement and **stopped by 13:58** — transient, zero warnings since.
- ⬜ **The full app → DB round trip was NOT verified.** Andrew's local IP is not on the instance's authorized networks (by design), so no query could be run from here, and no test submission was made deliberately — it would write a PHI row. **Someone needs to click through one live quiz submission to close this out.**

### What worked
- Going straight to `gcloud sql instances list` / `describe` rather than theorizing about the bill. The tier was visible in the first command and the diagnosis took one look.
- Checking every project on the billing account before blaming AoD — cheap to do, and it turned "probably the database" into "provably only the database."
- Reading the operations log (`gcloud sql operations list`) to prove the tier was never resized, which ruled out "something changed recently" and pointed at the creation-time default.

### What didn't work
- `nc -z 34.139.97.17 5432` from local — times out. This is **expected** (authorized networks), not a regression signal. Don't chase it next session.
- The `/health` route does **not** touch the database (`app/routes/health.tsx` returns a static JSON payload). A 200 there proves the Fly app is up and nothing about Postgres connectivity. Do not use it as a DB check.
- Firecrawl search on `cloud.google.com` for raw per-vCPU pricing returned nothing usable. Cost figures in this document are **list-price estimates** — the invoice is the authority.

### Billing / business items still open
- [ ] **The `alledrops-quiz` project bills to the `Beautiful Rescues` billing account** (`01860C-FD5E7A-41B5EC`) — a different client's. This is what caused the June suspension. Move it to `21 ads media` (`01E2C6-27AE09-412270`) or straight to AOD-owned GCP as part of the migration already planned.
- [ ] Andrew was considering **passing the GCP cost to the client**. Reframe before that conversation: the honest number to hand William is **~$65/mo**, not $500. The $500 was a one-time consequence of a bad default plus a partial billing month.
- [ ] Automated backups were off for ~3 months on a database holding PHI (2026-05-06 → 2026-07-28). Nothing was lost and the instance was never deleted, but it's worth noting in the compliance record.

### Next steps
- [ ] **Tomorrow, Wed 2026-07-29, 3:00 PM ET — the William call.** He took the second of the two holds from session 29.
- [x] **Calendar invite sent** — Andrew sent William a real invite for Wed 3:00 manually on the morning of 7/28. (The session-29 holds carried no attendees, so this was the step that actually put it on his calendar.)
- [ ] Delete the now-dead Tue 7/28 3:30 PM hold if it's still sitting on the 21ads calendar.
- [ ] Click through one live quiz submission to confirm the DB round trip survived the downsize (see Verification status above).
- [ ] Everything from session 29's list still stands: purchase-gating options 1+2 on the call, size the 6/27 list, confirm Workspace/BAA/Shopify status, settle **domain spelling** (`AllerDrops®` is a live Class 044 trademark), then invoice the **$1,800** and write the Phase 2 SOW.
- [ ] Read William's 6/27 Google Doc comment reply — may already answer the alledrops.com registration question.
- [ ] Still not confirmed done, carried since session 27: `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`

### Resume context
- **Branch:** `main`. No application code changed this session; `HANDOFF.md` modified.
- **How to verify nothing regressed:** `npm test` (51 pass), `npm run typecheck` (clean).
- **GCP quick check:** `gcloud sql instances describe alledrops-quiz-data --project=alledrops-quiz --format="yaml(state,settings.tier,settings.edition,settings.backupConfiguration)"`
- **Key identifiers:** project `alledrops-quiz` · instance `alledrops-quiz-data` (us-east1-b) · public IP `34.139.97.17` · Fly app `alle-drops-quiz-app` (iad) · safety backup `1785246531060`.
- **Blocker:** none technical. The project is waiting on tomorrow's call, not on code.

---

## Session 29 (2026-07-25) — what happened today

### Goal
Reconstruct where things actually stood with William (email history + this handoff + ads-os vault), confirm the three sources agreed, then get the long-overdue scoping call scheduled.

### The finding that mattered
**Andrew had gone silent on William since 7/1.** Both this handoff and the vault said "scoping call not yet scheduled," which read as if we were waiting on the client. We weren't. Gmail history showed three unanswered chases, all still unread:

| Date | William |
|---|---|
| 7/7 | "How's your week look? Open pretty much anytime, afternoons better." |
| 7/12 | "At the beach but want to keep this moving. Any afternoon this week." |
| 7/24 | "Touching base again. Next week, any day except Monday. Want to get this across the finish line." |

Also unread: a 6/27 Google Doc comment where William replied to Andrew's "Did Jean actually register alledrops.com?" question. **The domain-spelling flag from session 27 may already have an answer sitting in that doc** — nobody has read it.

### What was done
- **Cross-checked three sources** — this `HANDOFF.md`, Gmail thread "AOD Next Steps," and ads-os vault (`AlleDrops-Shopify-Quiz`, `AOD-Phase2-Scope-Position`, `Current-Priorities`). Repo and vault agreed on every material fact (engineering done, $1,800 of $3,600 paid, 6/27 asks = paid Phase 2, gated-purchase research complete). The only drift in all three was the stale "call not yet scheduled" framing described above.
- **Scheduling reply sent to William** (Missive, threaded into "Re: AOD Next Steps"). Offered **Tue 7/28 3:30 PM ET** and **Wed 7/29 3:00 PM ET**. Confirmed the two warranty fixes are live and clickable. Set a call agenda: purchase-gating build options, sizing the rest of the 6/27 list, and Workspace/BAA/Shopify admin status.
- **Two holds placed** on the `andrew@21adsmedia.com` Google Calendar (`HOLD: William Miller (AOD) — option 1 / option 2`), 45 min each, checked against both the 21ads and Hispanic Alliance calendars. **No attendees on either event, so no invite reached William** — they're private blocks until he picks one.
- **Deliberately kept out of writing**, per the vault position note: the $1,800 balance and any "beyond original scope" framing. Both stay verbal for the call.

### Deltas from the draft Andrew actually sent
Andrew trimmed two things before sending: the Notion booking link, and the domain-spelling agenda item. **Domain spelling is still unresolved and still needs raising on the call** — `AllerDrops®` is a live Class 044 trademark, so this has to be settled before anyone points DNS at anything.

### Next steps
- [ ] **When William picks a slot:** delete the other hold and send him a real calendar invite (the holds have no attendees, so he currently has nothing on his calendar).
- [ ] **On the call:** purchase-gating options 1+2 (Liquid gate + `orders/create` webhook backstop — see the session 28 research below), size the 6/27 list, confirm Workspace/BAA/Shopify status, and settle domain spelling.
- [ ] **After the call:** invoice the $1,800 and write the Phase 2 SOW. Both have been held since 6/30 pending this conversation.
- [ ] Read William's 6/27 Google Doc comment reply — it may already answer the alledrops.com registration question.
- [ ] Everything engineering-side from session 28 below is still open and unchanged.

### Resume context
- **Branch:** `main`, clean of this session's work (no code changed). `HANDOFF.md` is modified but uncommitted.
- **How to verify nothing regressed:** `npm test` (51 pass), `npm run typecheck` (clean).
- **Calendar holds:** Tue 7/28 3:30–4:15 PM ET, Wed 7/29 3:00–3:45 PM ET, both on `andrew@21adsmedia.com`.
- **Vault cross-refs:** `[[AOD-Phase2-Scope-Position]]`, `[[2026-07-25-aod-scheduling-reply-and-holds]]`.

---

## Session 28 (2026-07-01) — what happened

### Goal
Assess feasibility of William's 6/27 feature requests against the original quote/contract (business-side task, see ads-os vault: `[[AOD-Phase2-Scope-Position]]`, `[[2026-07-01-aod-warranty-fixes-and-reply-sent]]`), fix the two "warranty" bugs he reported (Part 1 missing "None of the above", Part 5 dev-string leak), and get those fixes actually live on the storefront.

### Current progress — all merged to `main`, all deployed, all verified live
- **PR #13** (`fix-security-findings` → `main`, merged) — bundled the pending security hardening from session 26/27 (`596210e`, JWT `aud` always enforced) with the two new quiz warranty fixes (`03ff72b`): Part 1 "None of the above" on all 3 symptom questions (`symptoms_nasal/eye/sinus`), Part 5 dev-string leak removed from `med_list`/`med_control`. Added `app/components/quiz/QuizPartRenderer.test.ts` (4 new tests) — no prior coverage existed for `isPartComplete`/`scoreQuestion`. Suite went 47/47 → 51/51.
- **First deploy attempt "succeeded" but changed nothing live.** Root cause (found via direct Chrome DevTools DOM inspection of the live storefront, not just HTTP checks): `public/quiz-bundle.js` — what `/quiz-bundle-js` and `/quiz-bundle.js` actually serve, read straight off disk — is a **committed static artifact** built by a completely separate command, `npm run build:theme` (vite lib build from `app/entry.theme.tsx`). The `Dockerfile` only ever ran `npm run build` (react-router build). Every deploy has been shipping whatever was last checked into `public/quiz-bundle.js` (a May 8 build) regardless of source changes — this is not new to today, it's a pre-existing gap.
- **PR #14** (`fix-theme-bundle-deploy-gap` → `main`, merged) — rebuilt `public/quiz-bundle.js` from current source and added `npm run build:theme` to the `Dockerfile`.
- **That deploy failed at build time**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@vitejs/plugin-react'`. It's a devDependency; the Dockerfile runs `npm ci --omit=dev`. Plain `vite` already worked in prod because it's a transitive dependency of `@react-router/dev` (a real dependency) — `@vitejs/plugin-react` has no such path in.
- **PR #15** (`fix-vitejs-plugin-react-prod-dep` → `main`, merged) — moved `@vitejs/plugin-react` to `dependencies`. Regenerated `package-lock.json` locally (see note below — it's gitignored in this repo, so there's nothing to commit for it; it just needs to exist in the working tree at deploy time).
- **Final deploy succeeded and was verified live** via Chrome DevTools MCP: navigated the actual storefront quiz (`allergist-on-demand.myshopify.com/pages/allergy-quiz`), filled patient info, reached Part 1, confirmed "None of the above" renders on all 3 questions, clicked it, confirmed it correctly disables the other checkboxes in each group (matching Part 2's existing exclusive-none pattern) and enables "Next →". No test submissions were completed/submitted during this verification (stopped at Part 1), so no test rows landed in the PHI DB.
- **CLAUDE.md** — Andrew edited it mid-session himself to change "Don't deploy from a branch" to explicitly authorize Claude to deploy with his sign-off. That edit is included in this handoff commit since it's clearly intentional.

### What worked
- **Don't trust HTTP-header cache theories over live DOM evidence.** Early in the session a `cache-control: public, max-age=300` header led to a wrong "it's just a caching quirk, wait 5 minutes" conclusion. It was wrong — the bug was a completely different bundle never being rebuilt. The fix came from actually navigating the live page in Chrome DevTools and inspecting rendered DOM + the exact network response bytes, not from reasoning about headers.
- Fetching the real live page HTML first (via curl with the Shopify storefront password flow) to extract the *actual* iframe URL the theme embeds, rather than assuming it matched what local code implied.
- Diffing occurrence counts of a known string (`"None of the above"`) across bundle versions (1 → 4) as a quick sanity check before/after each redeploy attempt.

### What didn't work
- Trusting a "successful" `fly deploy` + matching HTTP headers as proof the fix was live. It wasn't — the deploy was real, the app was healthy, but it was serving a stale static file that the build process never touched.
- Assuming `npm run build:theme`'s dependencies would "just work" in the production Docker install because the main `npm run build` did — `vite` itself is a transitive dependency of something real, but `@vitejs/plugin-react` isn't pulled in by anything else.

### Next steps
- [ ] Andrew: full click-through of the live storefront quiz beyond Part 1 (this was the first rebuild of `quiz-bundle.js` in a while — worth confirming nothing else regressed).
- [ ] **Flagged, not fixed:** `allergist-on-demand.myshopify.com/pages/allergy-quiz` is loading Klaviyo (`static.klaviyo.com`, `static-tracking.klaviyo.com`) directly on the quiz page. This repo's own `CLAUDE.md` explicitly bans Klaviyo (named) on any PHI-collecting page. Worth a real look — this may be theme-level, not app-level.
- [ ] **Flagged, not fixed:** `package-lock.json` is gitignored in this repo — unusual for reproducible builds. Not touched; just noting it in case it's not intentional.
- [ ] Business/scope side (William's 6/27 feature requests — Part 6/7 additions, score display rework, gated-purchase approval system) — not started. See ads-os vault `[[AOD-Phase2-Scope-Position]]` for the feasibility breakdown and negotiation position; the $1,800 invoice + Phase 2 SOW conversation are both still deliberately held for a scoping call, not yet scheduled as of this session.
- [ ] Carryover from session 27, still not confirmed done: delete the diagnostic test row — `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`

### Gated-purchase system — Shopify Plus constraint found (research, pre-scoping-call)

Researched the actual mechanism for William's "gated commerce" ask (item 6 of his 6/27 email — no SLIT purchase without account + quiz + manual clinical approval) before the scoping call happens.

**Core finding:** the textbook tool for this — Shopify's **Cart and Checkout Validation Function API** (its own docs list "require a customer membership at checkout" as a use case, via `customer.hasTags()`) — is **Shopify Plus-only for custom apps**. Per Shopify's docs: *"Only stores on a Shopify Plus plan can use custom apps that contain Shopify Function APIs."* `alle-drops-quiz-app` is a custom/private app, and AOD is provisioning Basic/Grow (~$20/mo) per the session 27 infra-handoff plan, not Plus. Real-time checkout-blocking via a custom Function isn't available on their plan tier without a large cost jump (Plus runs ~$2,300+/mo) that's disproportionate to this project.

**Three ways to still do it without Plus:**
1. **Liquid-level gate** — hide the SLIT buy button based on `customer.tags`. Free, any plan, but UI-only (bypassable via a direct `/cart/add` call).
2. **Order webhook backstop** — the Fly app already talks to the Shopify Admin API; add an `orders/create` webhook that auto-cancels/holds SLIT orders from unapproved customers. No added cost, closes the enforcement gap, small window of exposure between order placement and cancellation.
3. **Existing App Store gating app** (Locksmith-style membership/wholesale apps) — these are *public* apps, which ARE allowed to use Functions on any plan. Sidesteps the Plus requirement for a monthly app fee instead of custom code.

Tagging itself (Admin API `tagsAdd` mutation on Customer) is plan-agnostic regardless of which option is chosen — that's the mechanism for "clinical team manually approves" either way.

**Recommendation for the call:** lead with options 1+2 (no added cost, reuses existing Fly infra), mention option 3 only if William wants tighter real-time UX, don't raise Plus unless he asks.

Full detail + vault cross-reference: vault `[[AOD-Phase2-Scope-Position]]`.

---

## Prior handoff — session 27 (2026-06-24)

### Status at the time: Engineering still essentially done. That session was an emergency DB recovery before an AOD call, plus domain-ownership research and policy-page drafting. Security branch `fix-security-findings` @ `596210e` was pending PR + merge — **now merged as of session 28, see above.**

---

## ⚠️ Session 27 (2026-06-24) — what happened today

### 1. CRITICAL incident — Cloud SQL was SUSPENDED (RESOLVED)
Right before an AOD client call, quiz **save** ("Could not save assessment") and patient
**history** ("Unable to load your assessment history") were both failing. Live submit
returned `500 {"error":"Could not save assessment","details":"Connection terminated due
to connection timeout"}`.

- **Root cause:** Cloud SQL instance `alledrops-quiz-data` was in state **`SUSPENDED`**
  (suspended by Google, ~June 6). Billing lapse on the **"Beautiful Rescues" billing
  account** (`01860C-FD5E7A-41B5EC`) that the `alledrops-quiz` project is attached to.
  App/code were healthy and untouched since May 10. No data lost (suspended ≠ deleted).
- **Fix:** Andrew updated billing → instance went `SUSPENDED → MAINTENANCE → RUNNABLE`
  (~15:29). Live submit re-tested = **`200`**. Read path uses same pool, also recovered.
  Note: `gcloud sql instances restart/patch` both 409'd while SUSPENDED — only the
  billing fix in the Console lifts it.
- **⬜ LEFTOVER TODO for Andrew:** delete the one diagnostic test row so it doesn't show
  in the admin demo table:
  `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`
- **Lesson → agenda item:** dev DB silently dying for 18 days on an unrelated billing
  account is the concrete argument for the **production GCP migration to AOD's own
  project under their BAA.**

### 2. Account / sign-in pages dark-green theme (RESOLVED by Andrew)
The hunter-green on `/account`, profile, and sign-in is **NOT** in the theme repo. Those
are Shopify **new customer accounts** (URL `shopify.com/<id>/account/...`), styled in the
**Settings → Checkout and customer accounts** branding editor (Color palette), not Liquid.
Separately, the storefront theme's `config/settings_data.json` has the same greens
(`#2c3e3f`, `#2e2a39`) in its color schemes — that affects storefront sections only, a
different surface. Andrew adjusted the branding editor; considered fixed.

### 3. Domain ownership — clarified from email history (IMPORTANT)
- Andrew owns **`allerdrop.com`** (singular) on Cloudflare — a **dead placeholder** he
  reserved Sept 24 2025 for the abandoned "AllerDrop" name, which was **killed by a live
  federal trademark `ALLERDROPS®` (Class 044, sublingual immunotherapy, Maryland)**.
  Project does not use it. Can be left to lapse.
- The real brand domain is **`alledrops.com`** (company = Allergist on Demand, product =
  AlleDrops). Per Oct 2025 emails, Andrew **explicitly declined to register it** ("I prefer
  not to own/purchase on behalf of clients"); William said their **Legal Director (Jean
  Caceres)** would register it "to keep organized." Jean later emailed with subject
  "Alledrops.com." **Never confirmed back whether alledrops.com was actually registered or
  who holds it** — this is an open question for the client.
- **DNS task is on the client**, not Andrew. Once they confirm ownership + give DNS access
  (or add a CNAME), wire production via `fly certs create quiz.alledrops.com -a
  alle-drops-quiz-app`. (Prior handoffs said `quiz.allerdrops.com` — that spelling was
  WRONG; corrected throughout.)

### 4. Andrew has NEVER sent William any emails
The `email-to-william-*.md` files in `~/Documents/Claude/Projects/AoD/` were drafted but
**never sent**. So the entire launch punch-list (DNS, prod GCP+BAA, NPP, privacy policy,
treatment copy, officer designations, clinical content) has **never been communicated to
the client.** The serve is on Andrew, not them. Strong next move: refresh the May 8 punch
list and actually send it, with the policy drafts attached.

### 5. Policy-page drafts created (starting points for counsel)
New folder: **`~/Documents/Claude/Projects/AoD/policy-drafts/`**
- `00-READ-FIRST.md` — orientation; flags the blocking question "who is the covered
  entity?" (AOD platform may be a business associate of the providers' professional
  entity) and lists all `[BRACKET]` decisions.
- `01-notice-of-privacy-practices.md` — HIPAA NPP (didn't exist before).
- `02-privacy-policy.md` — **merged** the live Shopify default template (Aug 23 2025) with
  HIPAA-aware language. Key work: carved health info OUT of marketing / "sale" / "share" /
  targeted-advertising in 5 places. Removed `andrew@21adsmedia.com` contact.
- `03-treatment-policy.md` — fills the `[PENDING]` consent-screen placeholder + refund
  rules for compounded Rx.
- `04-quiz-disclaimer.md` — reworded disclaimer (current one mischaracterizes a scored
  clinical questionnaire as "product recommendation only").
- All are non-binding drafts for AOD counsel. **Not yet wired into app/theme.**
- ⚠️ Privacy-policy carve-outs are only TRUE if the live Shopify store actually has no
  PHI fed to Shopify ads/audiences and no Pixel/GA/Klaviyo on collection pages — **audit
  the live store settings before publishing** (compliance + accuracy).

Also generated: `~/Documents/Claude/Projects/AoD/AOD Call Agenda — June 24.md`.

### 6. POST-CALL — AOD call happened (6/24), production migration GREENLIT
The call took place. Outcome: prod infra migration is now agreed and sequenced. Notes in
`~/Documents/Claude/Projects/AoD/` + transcript in Notion (21ads workspace,
page `389ca3e67e1b8010aaffe7f30ba2f465`).

**Migration sequence (William's side, then Andrew's):**
1. William sets up **AOD Google Workspace** (~$6–12/mo) — manages domains + email + the
   Google Cloud DB. Enables **BAA** under *Account Settings → Legal and Compliance*
   (opt-in checkbox). Loops in IT: **Robert** (replaced Paul) and **Gene**.
2. William sets up **AOD Shopify** (Basic/Grow, ~$20/mo).
3. Team grants **Andrew admin** on both → Andrew **migrates the Cloud SQL DB** to AOD's
   Workspace-owned Google Cloud and **transfers the Shopify site**.
4. Andrew does **NOT** want long-term PHI access post-migration.

**⬜ Andrew's action items from the call:**
- [ ] Write step-by-step setup instructions in the **shared Google Doc (new tab)** —
      covering Google Workspace, Shopify, BAA enablement, and adding Andrew as admin.
- [ ] After accounts exist + admin granted: migrate DB + transfer Shopify site.
- [ ] Configure the **scheduling app as a Shopify plugin** (the optional ~$99 consult)
      once accounts are set up.
- [ ] Confirm with William the **exact domain spelling** (see flag below) before he
      registers it.

**🚩 DOMAIN SPELLING — UNCONFIRMED, resolve before William registers domains.**
Call notes list two domains for the new Workspace: **`aod.services`** (new — corporate/
email) and **`allerdrops.com`** (R+S). But the Oct 2025 decision was **`AlleDrops` /
`alledrops.com`** (no R), *because* `AllerDrops` collides with the live trademark
**`ALLERDROPS®` (Class 044, SLIT)**. Likely an AI-notetaker mishearing "Alle Drops," but
NOT verified. Andrew (6/24) is unsure which was actually agreed. **Confirm directly with
William** (transcript is also auto-generated, not authoritative). If it really is
`allerdrops.com`/"AllerDrops", re-raise the trademark before anyone buys/configures it.
Andrew's own dead `allerdrop.com` (singular) is unrelated to both.

**Policy drafts — received well.** The consent draft, treatment policy, and privacy policy
were shared with William's team to review and place on the AOD site. Disclaimer fix
(draft `04`) explicitly confirmed as a pre-launch must. Policy docs will live in the
shared Google Doc.

**Other:** Geo scope re-confirmed TN + TX only. William will run an internal live
walkthrough with his team (Andrew not required). Shared Google Doc stays the central
collaboration space.

### 7. SENT to William (end of session 27)
- ✅ Email sent to William (via Missive) — confirms domain spelling + trademark caveat,
  flags the setup doc, says ready to migrate once admin access is granted.
- ✅ Setup instructions delivered into the shared Google Doc (Workspace + domains + BAA
  opt-in path + Shopify + grant-Andrew-admin + post-migration steps). Source draft:
  `~/Documents/Claude/Projects/AoD/policy-drafts/setup-instructions-for-google-doc.md`.
- **Ball is now in William/Robert/Gene's court:** confirm domain spelling, create the
  accounts, enable the BAA, grant Andrew admin. Then Andrew executes the migration.
- NOTE: all AoD policy + setup drafts live OUTSIDE this repo at
  `~/Documents/Claude/Projects/AoD/policy-drafts/` (not committed here).

---

## What's actually built

| Feature | Status | Merged |
|---|---|---|
| Cross-origin iframe embed (Theme App Block) | ✅ done | `1739bc4` |
| Cloud SQL submissions table + INSERT | ✅ done | early |
| Patient ledger `/api/me/assessments` + email fallback + GID backfill | ✅ done | PR #10 |
| Patient PDF `/api/me/assessment/$id/pdf` | ✅ done | merged |
| Admin PDF `/api/admin/assessment/$id/pdf` | ✅ done | merged |
| Admin submissions list `/api/admin/submissions` (paginated, filterable) | ✅ done | merged |
| Admin submission detail `/api/admin/submission/:id` | ✅ done | merged |
| Admin view — Polaris table + filters + modal + PDF download | ✅ done | `9256a63` |
| Admin modal answers — human-readable rows (was JSON blob) | ✅ done | `3677f0e` |
| Admin home page — stats dashboard (total, week, TN/TX, brackets) | ✅ done | `3677f0e` |
| PHI metafield value cleanup | ✅ done | PR #8 |
| Audit logging — `submission_access_log` + `logSubmissionAccess()` | ✅ done | PR #11 |
| Consent version — `CONSENT_VERSION` wired into payload + DB | ✅ done | PR #11 |
| Breach response runbook | ✅ done | PR #11 |
| E2E bracket test suite (`scripts/e2e-test.ts`) | ✅ done | PR #12 / `981330d` |
| Admin assessment modal redesign (clinical UX) | ✅ deployed | `b4ef25a` |
| Doc cleanup — stale plans, status docs, investigation artifacts | ✅ done | `d0632b5` |
| Simplify refactor — shared format utils, hoisted lookups, HistoryTagList | ✅ done | `4a81abf` |
| Theme relic cleanup (allergist-on-demand repo) | ✅ done | PRs #1, #2 |
| Sense theme upgrade 15.4.0 → 15.4.1 | ✅ done | PR #2 |
| Security hardening — all 3 findings fixed | ✅ merged + deployed | PR #13 |
| Quiz Part 1 "None of the above" (all 3 symptom questions) | ✅ merged + deployed, live-verified | PR #13 / `03ff72b` |
| Quiz Part 5 dev-string leak removed | ✅ merged + deployed, live-verified | PR #13 / `03ff72b` |
| Storefront theme bundle rebuilt into Docker build (deploy pipeline fix) | ✅ merged + deployed | PR #14 |
| `@vitejs/plugin-react` moved to prod dependency (deploy pipeline fix) | ✅ merged + deployed | PR #15 |
| Custom domain `quiz.alledrops.com` | ⏸ blocked on client | — |

**51/51 tests passing (was 47/47 before session 28's +4). Typecheck clean.**

---

## Security findings — FIXED and merged (session 26 fix, merged session 28)

All three landed via PR #13 (`fix-security-findings` @ `596210e`, merged into `main` 2026-07-01).

### 1. JWT `aud` check ✅ fixed
**File:** `app/lib/customer-auth.ts`
`SHOPIFY_API_KEY` now required at call time — throws `'SHOPIFY_API_KEY not configured'` if absent. `audience` always passed to `jwtVerify`. New test covers the fail-closed path.

### 2. Bearer token via `?token=` URL param ✅ fixed
**File:** `app/routes/api.me.assessment.$id.pdf.tsx`
`url.searchParams.get('token')` fallback removed. `Authorization: Bearer` header is the only accepted path.

### 3. `dbErr.message` in 500 response body ✅ fixed
**File:** `app/routes/api.quiz.submit.tsx`
`details` field stripped from error response. Callers get `{ error: "Could not save assessment" }` only.

---

## E2E test suite — confirmed passing (session 22)

`scripts/e2e-test.ts` ran clean against the deployed Fly app.

### How to run it

1. **Cloud SQL Auth Proxy** on port 5433:
   ```bash
   /opt/homebrew/share/google-cloud-sdk/bin/cloud-sql-proxy \
     alledrops-quiz:us-east1:alledrops-quiz-data \
     --port=5433
   ```
2. `.env` — use `127.0.0.1` not `localhost` (Docker occupies `::1:5433`):
   ```
   DATABASE_URL=postgresql://alledrops_app:<password>@127.0.0.1:5433/alledrops_quiz_dev?sslmode=disable
   SHOPIFY_API_SECRET=<from shopify app env pull>
   SHOPIFY_API_KEY=<from shopify app env pull>
   ```
   Get the current password from Fly: `fly ssh console -a alle-drops-quiz-app -C "printenv DATABASE_URL"`
3. Run: `npx tsx scripts/e2e-test.ts`

### Known gotchas

- **Docker on localhost:5433** — Docker binds `::1:5433` (IPv6); proxy is on `127.0.0.1:5433` (IPv4). Always use `127.0.0.1` in local DATABASE_URL.
- **Fly DATABASE_URL** must use the Cloud SQL public IP `34.139.97.17:5432` with `sslmode=no-verify` — not `localhost`.
- **pg URL parser** mangles special chars in passwords. Script uses `new URL()` to parse explicitly — this is intentional, don't revert.
- **Auth on `/api/me/*`** is JWT Bearer (HS256, `SHOPIFY_API_SECRET`), not HMAC. The script mints a JWT with a fake customer GID and stamps it on test rows via SQL.

---

## Theme relic cleanup — completed (session 25)

All legacy quiz system artifacts removed from `allergist-on-demand` Shopify theme repo.

**What was deleted:**
- `sections/symptom-quiz.liquid` — orphaned (quiz page already used Theme App Block)
- `sections/quiz-results.liquid` — old inline results display, referenced deleted CSS
- `assets/symptom-quiz.js/.css`, `quiz-config.js`, `quiz-results.js`, `google-sheets-integration.js`
- `cloudflare-worker/` — decommissioned worker that proxied PHI to Google Sheets
- `google-apps-script/` — Apps Script receiving PHI into Sheets (HIPAA violation)
- PHI metafield reads + quiz history JS block from `sections/main-account.liquid`

**What was replaced:**
- `sections/quiz-history.liquid` → minimal redirect to `/account` (template still wires it in)

---

## What's NOT built (remaining pre-launch gates)

### 1. Consent text finalization

`consent_version` captured per submission (value: `'draft-2026-05-09'`). When counsel finalizes:
- Update consent text in `app/components/quiz/ConsentStep.tsx`
- Bump `CONSENT_VERSION` in `app/lib/consent-version.ts` to `'v1.0-YYYY-MM-DD'`

---

## Blocked on client / AOD side

| Item | Owner | Notes |
|---|---|---|
| Domains `aod.services` + `alledrops.com`/`allerdrops.com` | William + IT (Robert/Gene) | 🚩 spelling UNCONFIRMED (see session 27 flag). Managed in AOD Google Workspace. Site migrates to this domain — supersedes the old Fly `quiz.*` subdomain plan |
| Fly.io BAA | ~~Andrew~~ **MOOTED** | Migration moves hosting/PHI to AOD-owned **Google Cloud** under Google's BAA. Fly BAA likely no longer needed — confirm where the app itself lands post-migration |
| Production GCP migration | William (setup) → Andrew (execute) | **GREENLIT 6/24.** William stands up AOD Workspace + Google Cloud + BAA, grants Andrew admin; Andrew migrates Cloud SQL DB + transfers Shopify. See session 27 sequence |
| In-house counsel review | William/counsel | Architecture + consent text review (parallel, not blocking engineering) |
| Consent text finalization | William/counsel | Blocks bumping CONSENT_VERSION to v1.0 |
| NPP draft | Counsel | **Starter draft exists** → `~/Documents/Claude/Projects/AoD/policy-drafts/01-notice-of-privacy-practices.md`. Before first real patient |
| Privacy Policy page (replace Shopify default) | Counsel | **Merged starter draft exists** → `policy-drafts/02-privacy-policy.md`. Audit live store ad/tracking settings before publish |
| Treatment policy + quiz disclaimer copy | William/counsel | **Starter drafts exist** → `policy-drafts/03`, `04`. Apply to `ConsentStep.tsx` / `symptom-quiz.liquid` / `ResultsDisplay.tsx` once approved (bump `CONSENT_VERSION`) |
| Privacy/Security Officer designation | William | Before first real patient |
| HIPAA workforce training | William | Before first real patient |
| Continue William feasibility/scope-creep thread | Andrew | **Call being scheduled as of 7/25** — Tue 7/28 3:30 PM or Wed 7/29 3:00 PM ET offered, holds placed, awaiting his pick. $1,800 invoice + Phase 2 SOW still held for that call. See ads-os vault `[[AOD-Phase2-Scope-Position]]` |

---

## Phase 2.5 (explicitly deferred — do not scope into current work)

- Provider review status workflow: `new → reviewed → contacted → scheduled`
- Provider notes on submissions
- Structured audit dashboard (who viewed what, when)
- Bulk operations
- Scheduling integration

---

## Resume context

- **Active branch:** `main` — everything from PRs #13, #14, #15 merged and deployed as of 2026-07-01
- **Fly app:** `alle-drops-quiz-app` — deployed, healthy, live-verified via Chrome DevTools (storefront Part 1 shows "None of the above" correctly)
- **How to verify:** `npm test` (51 pass), `npm run typecheck` (clean). Storefront: `allergist-on-demand.myshopify.com/pages/allergy-quiz` (password `allergy`) → Part 1 should show "None of the above" on all 3 symptom questions. DB live: `curl -s -o /dev/null -w "%{http_code}" -X POST https://alle-drops-quiz-app.fly.dev/api/quiz/submit -H "Content-Type: application/json" -H "Origin: https://allergist-on-demand.myshopify.com" -d '{...}'` → expect `200`.
- **Immediate leftover (carried over from session 27, still not confirmed done):** delete diagnostic test row → `DELETE FROM submissions WHERE patient_email = 'diag+preflight@example.com';`
- **Engineering next action:** full manual click-through of the storefront quiz beyond Part 1 (first rebuild of `quiz-bundle.js` in a while); look into the Klaviyo-on-quiz-page compliance flag; consider whether `package-lock.json` should actually be tracked
- **Client/content next action:** scoping call with William is **in flight as of 7/25** — two slots offered (Tue 7/28 3:30 PM / Wed 7/29 3:00 PM ET), holds placed, waiting on his pick. When he answers: drop the unused hold, send a real invite. Nothing on Phase 2 starts before that call (see ads-os vault `[[AOD-Phase2-Scope-Position]]`). Separately: finalize policy drafts in `~/Documents/Claude/Projects/AoD/policy-drafts/` with counsel
- **Key files:**
  - `app/lib/customer-auth.ts` — Finding 1 fixed (aud always checked)
  - `app/routes/api.me.assessment.$id.pdf.tsx` — Finding 2 fixed (no ?token= fallback)
  - `app/routes/api.quiz.submit.tsx` — Finding 3 fixed (no dbErr.message in response)
  - `tests/customer-auth.test.ts` — updated + new fail-closed test
  - `app/lib/consent-version.ts` — bump when counsel finalizes consent text
  - `app/components/quiz/ConsentStep.tsx` — update consent text when finalized
- **Theme repo:** `/Users/andrewskinner/Local Sites/allergist-on-demand` — main branch, live on Shopify
- **Full MVP plan:** `~/Documents/Claude/Projects/AoD/aod-mvp-plan.md`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
