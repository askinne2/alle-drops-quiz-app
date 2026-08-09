---
phase: 04-mandatory-allergy-testing
plan: 01
subsystem: docs
tags: [decisions, requirements, compliance, phi, retract-in-place]

# Dependency graph
requires:
  - phase: 03-mandatory-medical-history
    provides: retract-in-place convention precedent (injectIframe correction, Apntly entry in STATE.md)
provides:
  - PROJECT.md decision log reconciled with D-01 (upload reversal)
  - REQUIREMENTS.md TEST-04 rewritten to required multi-file upload spec
  - REQUIREMENTS.md TEST-05 records Phase 3 D-11's partial delivery
  - CLAUDE.md PHI field enumeration and self-review checklist cover uploaded filenames
  - CLAUDE.md common-pitfalls quiz-history claim corrected (extension already shipped)
affects: [04-02, 04-03, 04-04, 04-05, "all later Phase 4 upload plans"]

# Tech tracking
tech-stack:
  added: []
  patterns: [retract-in-place documentation convention applied to a third document type (PROJECT.md decision element)]

key-files:
  created: []
  modified:
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - CLAUDE.md

key-decisions:
  - "Retracted DEC-testing-results-by-email-not-upload in place rather than deleting it, preserving the 2026-07-29 audit trail per project convention"
  - "TEST-04 rewritten to required multi-file upload (PDF/JPEG/PNG/HEIC) with three retrieval surfaces, per 04-CONTEXT.md D-01 through D-05"
  - "CLAUDE.md rule 5 now treats uploaded_filename and submission_files as PHI even though filenames are not a submissions table column"

patterns-established:
  - "Retract-in-place applies uniformly across PROJECT.md decisions, REQUIREMENTS.md requirement bullets, and CLAUDE.md pitfalls/rules: strike original with ~~, state correction immediately after, cite source"

requirements-completed: [TEST-04]

# Metrics
duration: 5min
completed: 2026-08-09
---

# Phase 4 Plan 1: Documentation Reconciliation Summary

**Retracted the LOCKED email-not-upload decision in place across PROJECT.md, REQUIREMENTS.md, and CLAUDE.md so no later Phase 4 plan or implementer reads stale, contradictory source-of-truth documents.**

## Performance

- **Duration:** ~5 min (three doc-only edits, no source files touched)
- **Started:** 2026-08-09T23:19:00Z
- **Completed:** 2026-08-09T23:22:05Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `DEC-testing-results-by-email-not-upload` in PROJECT.md flipped from `status="LOCKED"` to `status="RETRACTED"`, original body struck through and preserved, retraction block states the reversal, its cost, and its three blockers (William, Fly.io BAA, AOD GCP cutover), citing `04-CONTEXT.md` D-01.
- REQUIREMENTS.md TEST-04 rewritten from an email-only instruction to a required multi-file upload spec (PDF/JPEG/PNG/HEIC allowlist, no-Shopify/no-BAA-chain-exit, three retrieval surfaces: admin, patient ledger, clinical PDF), with the original email-only wording struck through and traced back to D-01 and `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` R5.
- REQUIREMENTS.md TEST-05 amended to record that Phase 3's D-11 already deleted the `7+` proceed-without-testing chain and the `"medical_history"` FlowStep — the remaining Phase 4 scope is just the `3–6` jump removal and making `ResultsDisplay` terminal.
- CLAUDE.md compliance rule 5's PHI field enumeration now names `uploaded_filename` and `submission_files`, with a parenthetical explaining filenames carry PHI risk even off the `submissions` table.
- CLAUDE.md self-review checklist covers uploaded filenames in the no-`console.log` bullet and adds a new bullet requiring server-side-only GCS access with `Content-Disposition: attachment` (never inline-rendered).
- CLAUDE.md's stale "Customer Account UI extension currently still reads PHI metafields" claim retracted in place — the refactor shipped in `ca3c3f4` and was hardened by `f762aaa`; verified zero `metafield` references remain in `extensions/quiz-history/src/`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Retract DEC-testing-results-by-email-not-upload in place** - `dd37513` (docs)
2. **Task 2: Rewrite REQUIREMENTS.md TEST-04 from email-only to required upload** - `3eb8b1f` (docs)
3. **Task 3: Add uploaded filenames to CLAUDE.md's PHI field list and self-review checklist** - `794bd1f` (docs)

_No TDD tasks; all three are documentation-only edits with automated string-presence verification per task._

## Files Created/Modified
- `.planning/PROJECT.md` - `DEC-testing-results-by-email-not-upload` retracted in place with reversal, cost, and blockers stated
- `.planning/REQUIREMENTS.md` - TEST-04 rewritten to required-upload spec; TEST-05 records Phase 3's partial delivery
- `CLAUDE.md` - PHI field enumeration + self-review checklist extended for uploaded filenames; stale quiz-history claim corrected

## Decisions Made
- Followed the plan's retract-in-place convention exactly as specified (strike original with `~~`, add correction block immediately after, cite source) — no deviation needed since this convention was already established in STATE.md (`injectIframe`, Apntly entries) and this plan just extends it to a third document type.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' automated verify commands passed on first attempt; no auto-fixes, no blockers, no architectural questions arose.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This plan touched only documentation.

## Next Phase Readiness

- All three source-of-truth documents (PROJECT.md, REQUIREMENTS.md, CLAUDE.md) now agree: test-result upload is IN Phase 4, required (not optional-with-fallback), allowlist PDF/JPEG/PNG/HEIC, three retrieval surfaces, GCS-backed, never touching Shopify.
- CLAUDE.md's PHI field list and self-review checklist give the next implementer (04-02 onward) an explicit rule against logging uploaded filenames before the first upload-handling code is written.
- `npx vitest run` confirmed 361/361 tests / 27/27 files still passing; `npm run typecheck` clean — no source files were touched by this plan, as required.
- `git diff --stat` across the three commits shows exactly the three files the plan specified: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `CLAUDE.md`.
- No blockers introduced by this plan. Blockers 2 (Fly.io BAA) and 3 (AOD GCP cutover) remain open and will gate later waves in this phase per STATE.md, but do not block 04-02 through wave-5 plans.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-09*
