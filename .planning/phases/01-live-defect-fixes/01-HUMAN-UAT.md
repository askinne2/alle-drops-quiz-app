---
status: partial
phase: 01-live-defect-fixes
source: [01-VERIFICATION.md]
started: 2026-07-30
updated: 2026-07-30
---

## Current Test

[awaiting human testing]

## Tests

### 1. Mobile sticky-header clearance on scroll-to-top (DEF-01)
expected: On a real mobile viewport, triggering a step change scrolls the parent page so the first
question is fully clear of the sticky header. `scroll-margin-top` is hardcoded at `100px` in the
Liquid block's `{%- style -%}` region. Gate F measured DESKTOP only: iframe top 100px vs header
bottom 88px, 12px clearance. Mobile headers are frequently taller or shorter, and no mobile
measurement exists anywhere in the phase record. If clearance is negative on mobile, the fix is to
promote the offset to a `range` setting — but first verify whether an already-placed block picks up
a newly added non-`product` schema default (the verifier confirmed it does for `text`; `range` is
untested).
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

None. The other item VERIFICATION.md routed to human review — the PHI row counts — was resolved
during Plan 01-06 Task 3 via `fly ssh console`, reconciled as
`PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0`.
