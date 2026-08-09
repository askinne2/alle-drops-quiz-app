---
phase: 04-mandatory-allergy-testing
plan: 05
subsystem: theme-repo-reconciliation
tags: [theme, compliance, klaviyo, appointly, storefront-copy, TEST-06, shopify-theme-push]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing (plan 04-04)
    provides: "Reconciled (uncommitted) allergist-on-demand theme working tree — Klaviyo off, Appointly untouched, redirects confirmed, orphaned template removed"
provides:
  - "Live Sense theme pushed with Klaviyo disabled and orphaned template removed — theme repo now matches live, closing the re-enable-Klaviyo-on-next-push trap"
  - "Authenticated, cache-busted, two-fetch served-bytes proof that Klaviyo/tracking are absent on all four TEST-06 surfaces post-push"
  - "Measured, non-inferred evidence that TEST-06's remaining half (the D-13 product-description and page-body clauses) is Shopify Admin content that no theme push can reach"
  - "TEST-06 traceability reassigned from Phase 4 to Phase 8 in REQUIREMENTS.md, not marked complete"
affects: [phase-8-launch-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Occurrence counting via SOURCE.split(needle).length - 1, never grep -c (D-14)"
    - "Two authenticated, cache-busted fetches at least 5 minutes apart per surface, never a single fetch, never a deploy exit code, as live-state evidence"

key-files:
  created: []
  modified:
    - .planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md
    - .planning/REQUIREMENTS.md
    - "/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json (committed 9c36e0f)"
    - "/Users/andrewskinner/Local Sites/allergist-on-demand/templates/page.quiz.json (committed 9c36e0f)"

key-decisions:
  - "Andrew authorized the theme push explicitly this session: \"THEME PUSH IS AUTHORIZED. Commit the reconciled theme working tree and run shopify theme push against the live Sense theme. Andrew reviewed the diff.\""
  - "Andrew reassigned TEST-06 to Phase 8 explicitly this session, on the evidence that both target surfaces render Shopify Admin content (product.description, page.content), not theme-repo source, so no theme push can close it"
  - "Non-vacuity control corrected from the plan's literal data-alledrops-quiz (0 occurrences, does not exist in current markup) to id=\"alledrops-quiz plus the existing appointly control (Rule 1 — corrected an incorrect verification assumption)"

patterns-established:
  - "When a plan's verification needle assumes a markup shape that has since changed, substitute a stronger equivalent control and document why in the same report, rather than reporting a false negative"

requirements-completed: []  # TEST-06 explicitly NOT marked complete — reassigned to Phase 8, see below

duration: 11min
completed: 2026-08-09
---

# Phase 4 Plan 05: Ship Theme Push & Prove/Reassign TEST-06 Summary

Pushed the reconciled `allergist-on-demand` theme repo (Klaviyo disabled, orphaned template removed,
redirect URLs confirmed) to the live Sense theme, proved on two independent authenticated
cache-busted fetches that Klaviyo/tracking scripts stay absent from all four TEST-06 surfaces
post-push, and — on that same measured evidence — reassigned TEST-06 from Phase 4 to Phase 8, because
the remaining "no longer a need for needles or allergy tests" clause lives in Shopify Admin
`product.description` / `page.content` fields that no theme push can touch.

## Performance

- **Duration:** 11 min (includes a deliberate 5+ minute wait between the two post-push fetches, per
  D-14's "a single fetch is not evidence" rule)
- **Started:** 2026-08-09T23:45:52Z
- **Completed:** 2026-08-09T23:57:12Z
- **Tasks:** 2 of 2 completed
- **Files modified:** 4 (2 in this repo's `.planning/`, 2 in the theme repo)

## Accomplishments

- Reconciled theme working tree (Klaviyo `disabled: true`, orphaned `templates/page.testing-options.json`
  deleted, redirect URLs confirmed) committed to the theme repo as `9c36e0f` and pushed to the live
  "Sense" theme (ID `135799767246`), Andrew's explicit authorization quoted and honored.
- TEST-06's Klaviyo/tracking half proven closed on live served bytes: 9 needles × 4 surfaces × 2
  fetches = 72/72 assertions at 0, both fetches 5m10s apart with distinct cache-busters.
- TEST-06's D-13-clause half proven **not closable by any theme push**: `no longer a need` / `needles`
  read 5 on both product pages, unchanged pre-push → Fetch A → Fetch B, because that content is
  `{{ product.description }}` (Shopify Admin), not theme-repo source.
- TEST-06 reassigned to Phase 8 in `REQUIREMENTS.md`, on this measured evidence, per Andrew's explicit
  decision — **not marked complete**.

## Task Commits

Each task was committed atomically:

1. **Task 1: Push the reconciled theme and record push provenance** — theme repo `9c36e0f7437d7470012a2d16c9280b3f4ed6623f` (fix), quiz-app repo `e18a8f68308102158c965be12d2e95bc54f4bdeb` (docs)
2. **Task 2: Prove TEST-06 on authenticated, cache-busted served bytes — twice** — `d7d71321452b3a32e7fc6ead6cd56a6997b3986c` (test)

**Additional commit, required by Andrew's session decision, not a plan task:** `19806c3bb5f065edb2e77fe60895b9391e2b969a`
(docs) — reassigns TEST-06's `REQUIREMENTS.md` traceability row from Phase 4 to Phase 8.

_Note: theme repo and quiz-app repo are two separate git histories; both hashes are recorded per
commit for unambiguous provenance._

## Files Created/Modified

- `/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json` — Klaviyo
  onsite-embed block flipped `disabled: false → true`; already-disabled
  `quiz-kit-smart-product-finder` chat-embed block removed (pre-existing drift carried in the same
  diff); Appointly block explicitly left unchanged (`disabled: false`)
- `/Users/andrewskinner/Local Sites/allergist-on-demand/templates/page.quiz.json` — confirmed (no new
  edit needed) already-correct `consult_redirect_url` / `test_options_redirect_url` and the app block
  already renamed from `quiz-kit-smart-product-finder` to `alledrops-quiz-production/symptom-quiz`
- `.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md` — appended push
  provenance, pre-push baseline, and the full two-fetch post-push verification section (169 new
  lines total across Task 1 + Task 2)
- `.planning/REQUIREMENTS.md` — TEST-06 requirement text and traceability row both updated to record
  the Phase 8 reassignment and cite the measured evidence

## Decisions Made

- **Push authorized and executed.** Andrew's verbatim authorization: "THEME PUSH IS AUTHORIZED. Commit
  the reconciled theme working tree and run `shopify theme push` against the live Sense theme. Andrew
  reviewed the diff." Re-verified independently before pushing (not trusted from 04-04's SUMMARY
  alone): working tree diff re-read, Active theme confirmed via `shopify theme list --json` (Sense, ID
  `135799767246`, role `live`).
- **TEST-06 reassigned to Phase 8, not completed.** Andrew's verbatim decision, quoted in full in this
  session's task context: "TEST-06 MOVES TO PHASE 8... Therefore TEST-06 is no longer Phase 4's
  requirement. It joins LAUNCH-01/LAUNCH-02 as Andrew-owned Phase 8 launch readiness." Implemented in
  `REQUIREMENTS.md`: the requirement bullet gained a reassignment note citing the measured evidence
  (product-description / page-content, not theme-repo source), and the traceability table row now
  reads "Phase 8 (reassigned 2026-08-09 from Phase 4...)". Status left as "Pending" — not "Complete".
- **Non-vacuity control substitution (see Deviations).**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in the plan's own verification needle] `data-alledrops-quiz` does not exist in current markup — substituted a corrected control**
- **Found during:** Task 2, first pre-push fetch of `/pages/allergy-quiz`.
- **Issue:** The plan specified `data-alledrops-quiz` as the non-vacuity presence control for
  `/pages/allergy-quiz` — the control that proves a fetch reached real page bytes rather than the
  `/password` page. Counting it returned **0** on every fetch (pre-push, Fetch A, Fetch B), which
  would read as a failed control were it not investigated further.
- **Root cause:** the quiz embeds as `<iframe id="alledrops-quiz-AY3ZzaUJLUXRrcU51d__alledrops_quiz_production_symptom_quiz_igLDNJ" ...>`
  — an `id` attribute, not a `data-` attribute. The plan's needle assumed a markup shape that isn't
  present in the currently deployed `symptom-quiz.liquid` block output.
- **Fix:** substituted `id="alledrops-quiz` (count 1, all three fetches) plus the plan's own
  already-required `appointly` known-nonzero control (count 15, all three fetches) as the non-vacuity
  proof for this surface. Both are strictly stronger evidence than the original needle would have
  been, since neither string can appear on the `/password` page. No absence-needle count is affected
  by this substitution — `klaviyo` and the other 8 tracking needles were counted identically regardless
  of which presence control was used alongside them.
- **Files affected:** `.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md` (both
  the Task 1 pre-push baseline section and the Task 2 verification section document this explicitly).
- **Verification:** re-ran the plan's own automated Task 2 verify script after the fix — the script
  checks that the report *mentions* the literal string `data-alledrops-quiz` (it does, in the deviation
  explanation) and does not require the needle to score nonzero, so this reading satisfies the
  automated gate while the actual proof rests on the corrected control.
- **Committed in:** `e18a8f6` (Task 1) and `d7d7132` (Task 2).

---

**Total deviations:** 1 auto-fixed (1 Rule-1 verification-needle correction).
**Impact on plan:** No scope creep. The correction strengthens the non-vacuity proof rather than
weakening it, and is fully documented in the artifact the plan required.

## Issues Encountered

None beyond the deviation above. The 5-minute gap between Fetch A and Fetch B was honored in real
wall-clock time (5m10s), not simulated or shortcut.

## User Setup Required

None — no external service configuration required. The theme push itself required Andrew's
in-session authorization (given) rather than any environment setup.

## Next Phase Readiness

**Phase 4 is otherwise on track**, but this plan surfaces a scope note for phase-close reconciliation,
which the executor is explicitly instructed **not** to apply mid-execution:

**ROADMAP.md, Phase 4, Success Criterion 4** currently reads: *"No surface, in the quiz or on the
storefront, offers or implies a path to purchase without testing: both code bypasses are gone,
`ResultsDisplay` is terminal, and the product-page and test-options copy no longer promise that
testing can be skipped."* As of this plan, the **code-bypass half** of that criterion is Phase 4's to
close (TEST-05, not yet executed as of this plan) and the **storefront-copy half** (the clause
deletion referenced by "the product-page and test-options copy no longer promise...") is now Phase
8-owned, per TEST-06's reassignment. **Phase 4 cannot make this criterion fully TRUE on its own
anymore.** Flagged here, not hand-edited into ROADMAP.md, per this plan's explicit instruction — the
phase-close reconciliation step should split or annotate criterion 4 to reflect the two-phase
ownership.

**What's ready:**
- The theme repo no longer carries a drift trap — a future `shopify theme push` from this repo will
  not silently re-enable Klaviyo on the PHI-collecting quiz page.
- `04-STOREFRONT-COPY-DRAFT.md` holds ready-to-send UNCONFIRMED replacement copy for both Admin
  surfaces, to ride along on the William/counsel message whenever Phase 8 picks this up.
- `374/27` tests still passing, typecheck clean, build clean — this plan touched no application
  source, confirmed by `git diff --stat` across all three of this plan's commits.

**What's still open for Phase 4:** TEST-01 through TEST-05 and TEST-07 remain to be planned/executed
(per `STATE.md`, Plan 4 of 19 is where this session left off before this checkpoint-resume plan ran).

## Self-Check

- `[ -f "/Users/andrewskinner/Local Sites/alle-drops-quiz-app/.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md" ]` → FOUND
- `[ -f "/Users/andrewskinner/Local Sites/allergist-on-demand/templates/page.testing-options.json" ]` → confirmed absent (expected)
- Theme repo commit `9c36e0f7437d7470012a2d16c9280b3f4ed6623f` → FOUND in `git -C "allergist-on-demand" log`
- Theme repo HEAD is exactly one commit ahead of 04-04's recorded pre-plan HEAD (`5767aca96d068229d973400e73b2b46a3b20fb3f`) → confirmed via `git -C "allergist-on-demand" log --oneline -3`
- quiz-app commit `e18a8f68308102158c965be12d2e95bc54f4bdeb` → FOUND in `git log --oneline`
- quiz-app commit `19806c3bb5f065edb2e77fe60895b9391e2b969a` → FOUND in `git log --oneline`
- quiz-app commit `d7d71321452b3a32e7fc6ead6cd56a6997b3986c` → FOUND in `git log --oneline`
- `npm run typecheck` → clean
- `npm test` → 374 passed / 27 files
- `npm run build` → clean (client + SSR)
- Both Task 1 and Task 2 automated verify scripts → both `OK`

## Self-Check: PASSED
