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

- Klaviyo loading on `/pages/allergy-quiz` — reportable-breach trigger. Theme-level; zero repo refs.
- Test Mode button rendering on the production page — bypasses all validation.
- Placeholder text on two live clinical surfaces.
- Live app→DB round trip never verified after the 2026-07-28 Cloud SQL downsize.
- Leftover `diag+preflight@example.com` row, carried since session 27.

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

## Session Continuity

Last session: 2026-07-30T07:58:35.907Z
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-live-defect-fixes/01-CONTEXT.md
