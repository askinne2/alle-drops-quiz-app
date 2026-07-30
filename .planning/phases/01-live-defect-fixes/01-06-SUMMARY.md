---
phase: 01-live-defect-fixes
plan: 06
completed: 2026-07-30
status: complete
executed_by: orchestrator-inline
requirements: [DEF-01, DEF-02, DEF-03, DEF-04]
key-files:
  created: []
  modified:
    - .planning/STATE.md
---

## Self-Check: PASSED

## Task 1 — Theme configuration, Gates D and E

**Gate D: PASS.** `test_options_redirect_url` was passing the same value as `consult`. Root cause was
in the theme repo at `templates/page.quiz.json`. Andrew corrected it in the Shopify theme editor;
verified on served bytes — the live page now serves `testOptions=%2Fpages%2Ftest-options`.

**Gate E: PASS, and it closed itself.** Plan 01-03 recorded that both product pickers would ship
blank because Shopify `type: product` settings cannot declare a default. The D-10 conversion in Plan
01-05 changed them to `type: text`, which *can*. Both handles now flow through the embed src
automatically (`tnProduct=tennessee-alledrops&txProduct=texas-alledrops`) with no theme-editor step,
and both products return HTTP 200 on the live storefront.

## Task 2 — Gate F, behaviour proven in the rendered DOM

Executed through Chrome DevTools against the live storefront, using the decomposed console protocol
plus a real navigation. The reject cases are the phase's security deliverable and cannot be reached
by clicking buttons at all.

| Case | Result |
|------|--------|
| 8 hostile targets (absolute, protocol-relative, `javascript:`, 4 control-char variants, backslash) | none navigated |
| Valid path from the WRONG origin | did not navigate — `e.origin` guard holds |
| Legacy `url` key from the correct origin | did not navigate — the rename fails closed |
| Valid path from the correct origin | **navigated** — non-vacuity control |
| `quiz:scrollToTop` | 1800 → 822.5, identical at 60ms and 660ms (instant, not smooth) |
| Sticky-header clearance | iframe top 100px vs header bottom 88px — 12px clear |
| DEF-04 label | `(required)` absent from the served bundle |

**A live open redirect was found here and closed.** `app/entry.theme.tsx`'s `injectIframe` listener
had no origin check and no path validation. Confirmed exploitable by navigating production to
`https://example.com/pwned`, fixed in `14e13ff`, deployed, and re-tested with the original payload
plus five variants — all rejected, valid path still navigating. Full analysis in `STATE.md`; the
short version is that Plan 01-04's correct measurement of the storefront entry path was generalised
into a claim about all entry paths, and the code review inherited that assessment.

DEF-04's "empty answer still blocks Next" is covered by unit test
(`app/components/quiz/QuizPartRenderer.test.ts`) rather than by live DOM, because reaching part 5
requires completing the questionnaire. Stated plainly rather than claimed as a DOM check.

## Task 3 — PHI cleanup

    PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0

Reconciled. Gate F reported writing **0** rows and `verify_pre` was 0, so there are no unexplained
rows. The orphan delete removed exactly 1 row; the table total moved 43 → 42, a difference of
exactly 1. Counts only — no PHI field value was read, printed, or recorded, per `CLAUDE.md:139`.

**Deviation — route.** The plan specified this as human-only because the local IP is not on the
Cloud SQL authorized-networks list. That is true of this machine, but the Fly app holds
`DATABASE_URL` and reaches Cloud SQL, so `fly ssh console` running a `pg` script works. Pre-delete
counts were taken and reconciled before any delete, exactly as the plan required. Note for future
work: Prisma on that machine is the SQLite session store (`litestream.yml`); the PHI `submissions`
table is Postgres via the `pg` pool in `app/lib/db.ts`, and a Prisma raw query against it fails with
a SQLite parser error.

## Not closed by this plan

- **Klaviyo remains live on `/pages/allergy-quiz`, 4 occurrences.** Phase 1 adds zero scripts, so
  nothing in it could close this. Phase 8 / LAUNCH-01.
- The live clinical intake page still carries **no medical disclaimer**. Counsel-owned copy.
- 14 code-review warnings remain open in `01-REVIEW.md`.
