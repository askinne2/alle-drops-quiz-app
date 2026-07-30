---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 1 context gathered
last_updated: "2026-07-30T09:55:16.165Z"
last_activity: 2026-07-30 -- Phase 01 execution started
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 6
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-29)

**Core value:** A patient in TN or TX can complete a clinical intake Dr. Sullivan can treat from, on
AOD-owned infrastructure, without PHI leaving the BAA chain.
**Current focus:** Phase 01 — live-defect-fixes

## Current Position

Phase: 01 (live-defect-fixes) — EXECUTING
Plan: 1 of 6
Status: Executing Phase 01
Last activity: 2026-07-30 -- Phase 01 execution started

Progress: [░░░░░░░░░░] 0%

Codebase baseline: `main`, 51/51 tests passing, typecheck clean, deployed to Fly
(`alle-drops-quiz-app`, iad). No application code has changed since session 28 (2026-07-01).

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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

- **Klaviyo still live on `/pages/allergy-quiz`** — 4 occurrences in HTML fetched 2026-07-30. A
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
- Live app→DB round trip never verified after the 2026-07-28 Cloud SQL downsize.
- Leftover `diag+preflight@example.com` row, carried since session 27.

**Gate D (`test_options_redirect_url`) — status 2026-07-30, mid-Phase-1:**

Confirmed live on served bytes, not inferred: `/pages/allergy-quiz` served
`testOptions=%2Fproducts%2Fallergy-consultation`, identical to `consult`. Root cause found in the
theme repo at `templates/page.quiz.json` — the app block's `test_options_redirect_url` was set to
`shopify://products/allergy-consultation`.

- Andrew is applying the fix in the Shopify theme editor (chosen over a `shopify theme push`, because
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
| Dead code | `app/entry.theme.tsx`'s `injectIframe()` message handler is correct code on an unreachable path — measured in Plan 01-04: the installed Liquid block loads the bundle on zero parent pages and renders no `data-alledrops-quiz` container, so only the `mountReact` branch ever runs. Its existence is what made DEF-01 look implemented for two months. It also carries the same open-redirect pattern D-05 closed on the live path (unguarded `window.location.assign(String(e.data.url))`, no origin check, reads the abandoned `url` key), plus `behavior: "smooth"` and a wrapper-scroll that both violate D-06. Deletion candidate; deliberately untouched in Phase 1. Note: it becomes live if anything ever loads `quiz-bundle.js` on a storefront page. | Phase 8 candidate | 2026-07-30 |
| Theme config | The sticky-header scroll offset is hardcoded at `scroll-margin-top: 100px` in the Liquid block's `{%- style -%}` region rather than exposed as a `range` setting, because whether a newly added non-`product` schema setting receives its default on an **already-placed** block is unverified. If tuning it ever requires a deploy, verify that behavior first, then promote it to a setting. | Phase 8 candidate | 2026-07-30 |

## Session Continuity

Last session: 2026-07-30T07:58:35.907Z
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-live-defect-fixes/01-CONTEXT.md
