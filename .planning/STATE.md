---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 3 context gathered
last_updated: "2026-08-09T16:47:20.800Z"
last_activity: 2026-08-09
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 10
  completed_plans: 10
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-29)

**Core value:** A patient in TN or TX can complete a clinical intake Dr. Sullivan can treat from, on
AOD-owned infrastructure, without PHI leaving the BAA chain.
**Current focus:** Phase 3 — mandatory medical history

## Current Position

Phase: 3
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-09

Progress: [░░░░░░░░░░] 0%

Codebase baseline: `main` @ `a8c13d7`, Phase 2 complete and UAT'd, **282 tests / 23 files passing**,
typecheck clean, build clean. Deployed to Fly (`alle-drops-quiz-app`, iad) release **v49**, and
Shopify app version `alledrops-quiz-production-21`. Phase 1 changed application code for the first
time since session 28 and shipped it — DEF-01..04 plus three security fixes, one of which (an open
redirect in `entry.theme.tsx`) was live and exploitable in production. Phase 2 then made the quiz
schema declarative (`required`, `showIf`, info blocks) with zero question-ID literals left in the
renderer.

**Standing risk carried into Phase 3 — three defects have now shipped past a fully green suite, all
in the same blind spot: no test renders `QuizPartRenderer` or `QuizContainer`.** Session 32's stale
theme bundle and dropped info blocks, and session 33's exclusive-option disable (D-13, reversed)
were each found by a human clicking, never by CI. `schema.ts` was correct in all three cases; the
bugs live in the wiring between the pure module and the DOM. DOM test infra was declined in Phase 2
on two data points. There are now three — decide before Phase 3 executes.

## Performance Metrics

**Velocity:**

- Total plans completed: 10
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6 | - | - |
| 2 | 4 | - | - |

**Recent Trend:** No data yet.

## Accumulated Context

### Decisions

Six LOCKED decisions from the 2026-07-29 William Miller call are in PROJECT.md `<decisions>`.
Affecting current work:

- Testing is mandatory; no path to purchase without it (`DEC-mandatory-allergy-testing`)
- Medical history moves before the testing split and must land BEFORE the bypasses are deleted
  (`DEC-medical-history-before-testing-split`)

- Purchase gating is an honor system — no account flags, Functions, or real-time blocking
  (`DEC-purchase-gating-is-honor-system`)

- Test results come by email, not upload — no PHI file infrastructure
  (`DEC-testing-results-by-email-not-upload`)

- The "purchase if approved" paragraph must not ship (`DEC-no-approval-promise-copy`)
- Max score is derived from the question set, never hardcoded (`DEC-derive-max-score-from-question-set`)

### Pending Todos

None captured yet.

### Blockers/Concerns

**Blocked on a client decision:**

- Score scale semantics — three incompatible range models. Gates SCORE-02 and SCORE-03 only;
  SCORE-01 (retitle + 1–2 business day copy) is separable and unblocked.

- Domain spelling — `alledrops.com` (no R) vs `allerdrops.com`, with live `ALLERDROPS®` Class 044
  trademark exposure. Gates LAUNCH-07 (DNS, Workspace domain, Fly cert) and the TEST-04 copy string.

**Blocked on client action:**

- Google Workspace setup blocked on Gene (PTO) → blocks BAA → blocks GCP migration → blocks go-live.
  Escalate to Robert (IT Director).

- Counsel-owned clinical copy: medical disclaimer, treatment policy, NPP, privacy policy, officer
  designations, workforce training.

**Live exposures to close immediately (Phase 8, do not wait for Phase 7):**

- **[CLOSED 2026-08-09 — see reconciliation below]** ~~Klaviyo still live on
  `/pages/allergy-quiz`~~ — **10 occurrences** in HTML fetched 2026-07-30,
  loader `https://static.klaviyo.com/onsite/js/SzY6kF/klaviyo.js`. (An earlier entry said "4": that
  was `grep -c`, which counts matching LINES, not occurrences — the exact trap this phase warned
  three executors about, hit by the orchestrator. Occurrence counts must use
  `split(needle).length - 1`.) A
  third-party script on a PHI-collecting page and a reportable-breach trigger per
  `docs/breach-response-runbook.md:16`. Owned by **Phase 8 / LAUNCH-01** (T-1-16, transfer).
  **Located 2026-07-30 — it IS fixable in code, contrary to the earlier "zero repo refs" note.**
  It is an app embed registered in the *theme* repo at
  `/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json`:
  `current.blocks` holds `shopify://apps/klaviyo-email-marketing-sms/blocks/klaviyo-onsite-embed/…`
  with `disabled: false`. App embeds load site-wide, including the quiz page. Fix is a theme change
  (flip `disabled` to `true` and push) or the App embeds toggle in the theme editor — not a
  quiz-app-repo change, which is what "zero repo refs" originally meant.

- **Second undocumented third-party script on PHI pages:** the same `settings_data.json` also enables
  `shopify://apps/apntly-appointment-booking-app/blocks/main-app-embed/…` (`disabled: false`).
  `CLAUDE.md` rule 4 forbids third-party scripts on any page collecting PHI and names Klaviyo but not
  this one. Needs an explicit keep/disable decision before go-live.

- **Phase 1's verification pass does NOT clear LAUNCH-01.** Phase 1 adds zero scripts and zero
  libraries, so nothing in it can close this. A green Phase 1 must not be read as a clean
  patient-facing page — confirmed independently by Plans 01-03 and 01-04.

- Test Mode button rendering on the production page — bypasses all validation.
  **Appears already resolved:** the live quiz page served `test=0` on 2026-07-30 and the installed
  block carries `enable_test_mode: false`. Re-confirm during Phase 8 rather than assuming.

- Placeholder text on two live clinical surfaces.
  **Measured 2026-07-30 on the served quiz page:** the block's Medical Disclaimer Text is the
  placeholder `This text needs changed.`, but "Show Medical Disclaimer" is toggled OFF, so it renders
  0 times — the placeholder is not patient-visible. The consequence is worse than a placeholder
  though: `disclaimer` appears 0 times in the served HTML, so the live clinical intake page carries
  **no medical disclaimer at all**. Gated on the counsel-owned clinical copy already tracked above;
  turning the toggle on before counsel delivers would publish the placeholder instead.

- ~~**Apntly appointment-booking app embed** … does not appear to load on the PHI page.~~
  **RETRACTED 2026-08-09 — this entry was wrong and the script IS live on the PHI page.** The
  original check counted the needle `apntly`, which is the vendor slug inside the app-block URI
  (`shopify://apps/apntly-appointment-booking-app/…`). The actual loader spells it **`appointly`**.
  Measured on authenticated, cache-busted served bytes of `/pages/allergy-quiz` 2026-08-09:
  `apntly` = 0, **`appointly` = 15**. Same class of error as the `grep -c` line-vs-occurrence trap —
  a count against the wrong needle was read as absence.

  What actually loads: `cdn.shopify.com/extensions/…/https-appointly-com-69/assets/appointly-embed.js`
  (defer), plus an inline block that sets
  `window.appointlyMainJsUrl = "https://s1.staq-cdn.com/appointly/api/js/65752301774/main.js?…"`,
  injects that script into `<head>`, calls `fetch("https://s1.staq-cdn.com/api/status")`, and on
  failure rewrites the host to `https://js-server.staqlab.com` and retries. Third-party JS from
  **staq-cdn.com / staqlab.com** executing on a PHI-collecting page, outside the BAA chain — the same
  exposure class as Klaviyo, per `CLAUDE.md` rule 4 and `docs/breach-response-runbook.md:16`.

  **Not disabled, deliberately.** Appointly is appointment booking and Phase 7 (Telehealth Intake
  Path) may depend on it; turning the embed off site-wide could break booking. Needs an explicit
  keep/disable decision — if kept, it must be scoped off PHI pages or covered by a BAA.

- ~~**Klaviyo still live on `/pages/allergy-quiz`**~~ **CLOSED 2026-08-09.** Andrew disabled the
  Klaviyo onsite embed in the Sense theme editor's App embeds panel. Verified on authenticated,
  cache-busted served bytes with occurrence counting (`split(needle).length - 1`), not `grep -c`:
  `klaviyo` = 0, `static.klaviyo.com` = 0, `_klOnsite` = 0. Also confirmed absent in the same fetch:
  `gtag`, `googletagmanager`, `google-analytics`, `connect.facebook`, `fbq(`, `hotjar` — all 0.
  **Caution for future checks:** an earlier fetch the same morning still showed 10 occurrences
  because it ran ~2 minutes before the theme save. Re-fetch with a cache-buster after any theme
  change; a single stale fetch is not evidence.

  **Theme repo drift:** this was an admin-side change, so
  `/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json` still carries
  `disabled: false` for the Klaviyo block locally. Do not `shopify theme push` from that repo without
  reconciling — a push would re-enable Klaviyo on the PHI page.

- Live app→DB round trip never verified after the 2026-07-28 Cloud SQL downsize.
- ~~Leftover `diag+preflight@example.com` row, carried since session 27.~~ **CLOSED 2026-07-30.**
  Deleted during Plan 01-06 Task 3. Reconciliation below.

**PHI cleanup — Plan 01-06 Task 3, completed 2026-07-30:**

PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0

Reconciled: Gate F reported writing **0** rows (it verified behaviour with synthetic `postMessage`
events and page loads; the questionnaire was never completed, so nothing POSTed to
`/api/quiz/submit`). `verify_pre=0` matches that exactly, so there are no unexplained rows. The
orphan delete removed exactly 1 row and the table total moved 43 → 42 — a difference of exactly 1,
matching `deleted_orphan=1`. No PHI field value was read, printed, or recorded; every statement
selected `COUNT(*)` only, per `CLAUDE.md:139`.

Route correction worth carrying forward: Plan 01-06 assumed this task was human-only because the
local IP is not on the Cloud SQL authorized-networks list. That is true of this machine, but the Fly
app itself holds `DATABASE_URL` and reaches Cloud SQL, so `fly ssh console -a alle-drops-quiz-app`
running a `pg` script is a working route. Note that Prisma on that machine is the SQLite session
store (see `litestream.yml`) — the PHI `submissions` table is Postgres via the `pg` pool in
`app/lib/db.ts`, and a Prisma raw query against it fails with a SQLite parser error.

**LIVE OPEN REDIRECT FOUND AND CLOSED 2026-07-30 — `entry.theme.tsx` `injectIframe` listener.**

Found during Gate F, after the phase's two hardening passes had both skipped the file. Confirmed
exploitable against production: a `quiz:navigate` carrying `url: "https://example.com/pwned"`
navigated the live `/quiz-embed` page off-origin. Fixed in `14e13ff`, deployed, and re-tested with
the same payload plus five variants — all rejected, with a valid path still navigating (non-vacuous).

**Why two independent reviews both missed it, worth remembering:** Plan 01-04 measured that the
installed Liquid block loads the bundle on zero storefront pages and renders no
`data-alledrops-quiz` container, and concluded the branch was unreachable. That is true of the
storefront. It is not true of `/quiz-embed` itself, which renders that container AND loads the
bundle — and `initQuiz()` selects `injectIframe` whenever `window.self === window.top`. The code
review inherited 01-04's "dead code" assessment and excluded the file from scope. A correct
measurement of one entry path was generalised into a claim about all of them.

It also survived the `url` → `path` rename **because** it was excluded: it still read the abandoned
`url` key, keeping the retired contract alive beneath the hardened one. The storefront fail-closed
test passed while this stayed open. No framing was needed to reach it — an opener can `postMessage`
into a window it opened with `window.open`, so an attacker page could open the genuine clinic intake
and silently replace it with a phishing clone.

There were **four** hand-ported copies of the navigation rules, not three. This one now imports
`toRelativePath` rather than adding a fifth. `tests/entry-theme-contract.test.ts` guards all six
properties and is proven non-vacuous (all 6 assertions fail against the pre-fix file).

**Gate D (`test_options_redirect_url`) — status 2026-07-30, mid-Phase-1:**

Confirmed live on served bytes, not inferred: `/pages/allergy-quiz` served
`testOptions=%2Fproducts%2Fallergy-consultation`, identical to `consult`. Root cause found in the
theme repo at `templates/page.quiz.json` — the app block's `test_options_redirect_url` was set to
`shopify://products/allergy-consultation`.

**CLOSED 2026-07-30, verified on served bytes.** After Andrew's theme-editor change, the live
`/pages/allergy-quiz` serves `consult=%2Fproducts%2Fallergy-consultation` and
`testOptions=%2Fpages%2Ftest-options`. ROADMAP success criterion #2 is no longer config-blocked.
Confirmed against the served HTML, not the editor UI, per the session-28 lesson that a green
write-path proves nothing. Theme "Sense" is the Active theme, so this is the live surface.

Historical record of how it was fixed:

- Andrew applied the fix in the Shopify theme editor (chosen over a `shopify theme push`, because
  `templates/page.quiz.json` carries uncommitted drift — its git HEAD still references a
  `quiz-kit-smart-product-finder` block, so a push could apply unrelated changes). Target value:
  `/pages/test-options`.

- A matching local edit exists in the theme working tree, uncommitted and unpushed, so local tracks
  intended live state. **Do not commit or push the theme repo** without first reconciling that drift.

- Verification owed: re-fetch the live page and assert `testOptions=%2Fpages%2Ftest-options`.

Corrected page inventory, measured while authenticated past the storefront password. Two of these
contradict `01-VALIDATION.md`, which relied on unauthenticated 200s — every unauthenticated request
302s to `/password` and returns 200 for the password page, so those checks were false positives:

| Path | Live |
|------|------|
| `/pages/test-options` | 200, titled "Test Options" — exists |
| `/products/allergy-consultation` | 200 — exists |
| `/pages/consult` | **404** — the previously documented consult fallback |
| `/pages/testing-options` | **404** — `templates/page.testing-options.json` is an orphaned template |

**Out-of-plan code change landed in Phase 1 (verifier must account for it):** commits `bb51ce0` and
`3c0e469` add `app/lib/quiz/redirects.ts` + `redirects.test.ts`, rewire `QuizContainer`'s three
inline fallbacks through it, correct the extension schema help text, and rebuild the theme bundle
(184236 → 184349 bytes). Reason: the consult fallback pointed at `/pages/consult`, a 404, so blanking
that theme setting sent a patient who had just completed a clinical intake to a dead page. Not in any
01-0x plan; authorized directly by Andrew during the Wave 3/4 checkpoint. Suite 122 → 133 passing.

**Open questions — one message to William closes all three:** R6 diagnosis-question scope, the third
medical-history free-text label, and whether resume/edit was ever expected.

**Risk shipping with v1.0:** abandonment loses the entire questionnaire; mandatory testing adds a
likelier abandonment point. Resume persistence is explicitly out of scope.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Persistence | Resume / edit an in-progress submission (1+ week, architecturally hard) | Out of scope for v1.0, risk recorded | 2026-07-29 |
| Admin | Customer detail drill-down, submission export | v2 | 2026-07-29 |
| Admin | Provider review-status workflow, notes, audit dashboard, bulk ops (Phase 2.5) | v2 | 2026-07-29 |
| Storefront | `/pages/our-team` decision, remaining May 8 content items | v2 | 2026-07-29 |
| Security | `Content-Security-Policy: frame-ancestors *` on `/quiz-embed` lets any site frame the PHI-collecting quiz. Clickjacking exposure. Plan 03's `e.origin` guard narrows what a hostile framer can *cause* but does not prevent the framing itself. (T-1-09, accept) | Phase 8 candidate | 2026-07-30 |
| Deploy provenance | Neither bundle route emits `ETag` or `Last-Modified`, which is why deploy verification is a string-counting exercise. Worse, `app/routes/quiz-bundle.js.tsx` and `app/routes/quiz-bundle-js.tsx` serve the same file with disagreeing `max-age` (3600 vs 300). A content-hash ETag is ~3 lines and converts every future verification into one conditional request. All Phase 1 gates deliberately assert against `/quiz-bundle-js`, the 300s variant, because that is the route `quiz-embed.tsx` references. | Phase 8 candidate | 2026-07-30 |
| Latent defect | Double-submit on the `3-6` bracket: a patient can click "Schedule a Telehealth Appointment" (submits), navigate back, then take "Continue to Purchase" through consent and submit again — violating the `NOT NULL UNIQUE` constraint on `submissions.symptom_profile_id`, because `generateSymptomProfileId()` returns `AOD_${Date.now()}` and is called once per session. Real and patient-facing. Phase 4 (TEST-05) deletes the `3-6` purchase jump entirely and removes it for free, so no separate fix is needed — but reproducing it during verification would otherwise look like a Phase 1 regression. | Resolved for free by Phase 4 / TEST-05; record only | 2026-07-30 |
| ~~Dead code~~ **RETRACTED — this entry was wrong and the code was live** | `app/entry.theme.tsx`'s `injectIframe()` handler was recorded here as unreachable dead code, on Plan 01-04's measurement that the installed Liquid block loads the bundle on zero parent pages. That measurement was correct **about the storefront only**. `/quiz-embed` itself renders a `data-alledrops-quiz` container AND loads the bundle, and `initQuiz()` selects `injectIframe` whenever `window.self === window.top` — so opening the public `/quiz-embed` URL top-level ran this handler on a PHI page. It was confirmed exploitable against production (navigated the live page to a foreign origin) and fixed in `14e13ff`. **Do not restore the "dead code" reading.** Full analysis above; `tests/entry-theme-contract.test.ts` now guards it. Retained here only so the retraction is visible to anyone who read the original entry. | **CLOSED — fixed and deployed** | 2026-07-30 |
| Theme config | The sticky-header scroll offset is hardcoded at `scroll-margin-top: 100px` in the Liquid block's `{%- style -%}` region rather than exposed as a `range` setting, because whether a newly added non-`product` schema setting receives its default on an **already-placed** block is unverified. If tuning it ever requires a deploy, verify that behavior first, then promote it to a setting. | Phase 8 candidate | 2026-07-30 |

## Session Continuity

Last session: 2026-08-09T16:47:20.787Z
Stopped at: Phase 3 context gathered
Resume file: .planning/phases/03-mandatory-medical-history/03-CONTEXT.md
