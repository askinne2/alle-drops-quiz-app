---
phase: 04-mandatory-allergy-testing
plan: 04
subsystem: theme-repo-reconciliation
tags: [theme, compliance, klaviyo, appointly, storefront-copy, TEST-06]
status: paused-at-checkpoint
dependency-graph:
  requires: []
  provides:
    - "Reconciled (uncommitted) allergist-on-demand theme working tree — Klaviyo off, Appointly untouched, redirects confirmed, orphaned template removed"
    - "04-STOREFRONT-COPY-DRAFT.md — UNCONFIRMED replacement copy for both D-13 surfaces"
  affects:
    - "/Users/andrewskinner/Local Sites/allergist-on-demand (uncommitted working tree only)"
tech-stack:
  added: []
  patterns:
    - "Occurrence counting via SOURCE.split(needle).length - 1, never grep -c (D-14)"
key-files:
  created:
    - .planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md
    - .planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md
  modified:
    - "/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json (uncommitted)"
    - "/Users/andrewskinner/Local Sites/allergist-on-demand/templates/page.testing-options.json (deleted, uncommitted — was untracked)"
decisions:
  - "Klaviyo onsite-embed block flipped to disabled: true in the theme repo's working tree, matching Andrew's 2026-08-09 live theme-editor change"
  - "Appointly app-embed block left at disabled: false, deliberately, pending a Phase 8 keep/disable decision"
  - "templates/page.quiz.json required no edit — Andrew's prior local edit already matches live (correct redirect URLs, no quiz-kit-smart-product-finder reference)"
  - "Orphaned, untracked templates/page.testing-options.json deleted after a repo-wide grep confirmed nothing references it"
  - "D-13's false no-testing-required clauses are not present anywhere in the theme repo; both target surfaces (SLIT product pages, /pages/test-options) render Shopify Admin-managed content (product.description, page.content), not theme-repo content — zero theme-repo deletions were made"
  - "The homepage's two truthful, unrelated 'no needles' mentions (templates/index.json) were left in place — they describe SLIT's needle-free administration method, not a claim that testing is unnecessary"
metrics:
  duration: "5 minutes"
  completed: "2026-08-09"
---

# Phase 4 Plan 04: Theme Repo Reconciliation & D-13 Clause Deletion Summary

Reconciled the `allergist-on-demand` theme repo's uncommitted working tree against live (Klaviyo
off, Appointly untouched, redirect URLs confirmed, orphaned template removed) and confirmed the
D-13 no-testing-required clauses exist only in Shopify Admin content, not the theme repo — so no
theme-repo deletion was possible or needed; a replacement-copy draft was written for both Admin
surfaces instead. Plan is paused at its blocking Task 3 checkpoint: Andrew must review and authorize
before plan 04-05 may run `shopify theme push`.

## What Was Built

**Task 1 — Reconcile the theme working tree against live, record measured counts.**

- `config/settings_data.json`: the Klaviyo onsite-embed block
  (`shopify://apps/klaviyo-email-marketing-sms/blocks/klaviyo-onsite-embed/2632fe16-...`) was
  flipped from `"disabled": false` to `"disabled": true`, matching the live state Andrew set via
  the Sense theme editor on 2026-08-09 (verified `.planning/STATE.md`: `klaviyo = 0` on
  authenticated, cache-busted served bytes). Before this edit, a `shopify theme push` from this
  repo would have re-enabled Klaviyo on `/pages/allergy-quiz` — the exact reportable-breach trigger
  D-12 exists to close.
- The Appointly app-embed block (`shopify://apps/apntly-appointment-booking-app/blocks/main-app-embed/...`)
  was **not** touched — its `disabled: false` value is recorded pre and post (unchanged), per D-12
  and the Phase 4 context's explicit instruction to leave it for a Phase 8 keep/disable decision.
- `templates/page.quiz.json` needed no changes — Andrew's prior local edit already carried the
  correct `consult_redirect_url` (`/products/allergy-consultation`) and `test_options_redirect_url`
  (`/pages/test-options`), and no `quiz-kit-smart-product-finder` reference remains (confirmed via
  grep, 0 occurrences). No fourth drift item was found.
- `templates/page.testing-options.json` was deleted. It was **untracked** (never committed to this
  repo — `git log --all` returns no history for it), sitting on disk as an orphan. A repo-wide grep
  for `testing-options`/`testing_options` across all `.json`/`.liquid` files returned zero matches
  before deletion, confirming nothing else references it.
- Wrote `.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md` with a
  pre-value, post-value, and evidence source for every drift item, all counts via
  `split(needle).length - 1`.
- **Pre-existing drift NOT touched:** the theme repo's `git status` at plan start showed eight
  additional modified files (`sections/footer-group.json`, `sections/header-group.json`,
  `templates/index.json`, `templates/page.about.json`, `templates/page.contact.json`,
  `templates/page.faq.json`, `templates/page.how-it-works.json`,
  `templates/page.quiz-history.json`, `templates/page.team.json`) and an untracked
  `docs/superpowers/` directory. These are outside this plan's `files_modified` scope and were left
  exactly as found, per `CLAUDE.md`'s standing rule that uncommitted tracked-file modifications in
  this repo are load-bearing. Captured verbatim in the reconciliation report so Task 3's checkpoint
  diff review isn't confused by them.

**Task 2 — Delete the no-testing-required clauses; draft (not ship) the replacement.**

- Grepped the entire theme repo for `needles`, `allergy test` (case-insensitive), `no longer a
  need`, and several broader variants (`without testing`, `not required`, `not necessary`,
  `unnecessary`, `skip the test`, `already have`). Result: **zero** occurrences of the actual D-13
  clause anywhere in the theme repo.
- Traced both target surfaces to confirm why: both SLIT product templates
  (`templates/product.json`, `templates/product.regional-drops.json`) render
  `{{ product.description }}` via `sections/main-product.liquid:195-197` — a Shopify Admin field.
  `/pages/test-options` has no dedicated template; it falls through to the generic
  `templates/page.json` → `sections/main-page.liquid:22` → `{{ page.content }}` — also a Shopify
  Admin field. Neither surface has theme-repo-editable body copy.
- **Zero theme-repo file edits were made in this task** — there was nothing deletable there. This
  is documented explicitly rather than silently reported as "done," per the task's own instruction
  not to invent a theme-file edit for content that isn't in the theme repo.
- The two literal `needles` hits found (both in `templates/index.json`, the homepage) describe
  SLIT's needle-free administration method — an accurate, unrelated statement — and were
  deliberately left in place, with rationale recorded in the copy draft.
- Wrote `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md`: proposed
  replacement copy for both Admin-managed surfaces, each marked `UNCONFIRMED — held for
  William/counsel approval, not shipped`. States testing is required before SLIT and how a patient
  obtains it; contains no manual-gatekeeping / account-approval promise
  (`DEC-no-approval-promise-copy`), no efficacy claim, and no reference to the Phase 4 upload
  feature's implementation details.

**Task 3 — Andrew authorizes the theme push. NOT YET DONE — blocking checkpoint reached.**

This plan stops here. See CHECKPOINT REACHED below.

## Deviations from Plan

### Auto-fixed / Judgment-call items (not Rule 1-3 bugs, but worth flagging explicitly)

**1. Task 2 acceptance criterion literalism vs. the task's own guardrail — resolved in favor of the guardrail.**

- **Found during:** Task 2.
- **Issue:** The plan's acceptance criteria state "Every theme-repo occurrence of `no longer a need`
  and `needles` in a patient-facing string is deleted... post-change count of 0." Taken completely
  literally, this would require deleting the homepage's two "no needles" sentences, which are
  accurate marketing copy about SLIT's needle-free administration and have nothing to do with the
  D-13 no-testing-required clause. The same task's `<action>` text explicitly instructs: "do not
  invent a theme-file edit for content that is not in the theme repo" and "Deletion only" for
  occurrences that ARE the clause.
- **Resolution:** followed the `<action>` guardrail over the literal acceptance-criteria wording.
  Left the two homepage sentences untouched, documented the reasoning in both
  `04-THEME-RECONCILIATION.md` and `04-STOREFRONT-COPY-DRAFT.md`, and flagged it explicitly for
  Andrew to override at the Task 3 checkpoint if he disagrees. The automated verification script for
  Task 2 does not check for `needles`-specific deletion count (it checks the reconciliation report
  merely *mentions* `needles`, which it does) — so this reading doesn't trip the automated gate.
- **Files affected:** none (no theme file edited for this item). Documented in
  `04-THEME-RECONCILIATION.md` and `04-STOREFRONT-COPY-DRAFT.md`.
- **Commit:** `694c34e` (Task 2).

**2. Copy draft self-violated the constraint it was describing — caught and fixed before commit.**

- **Found during:** writing `04-STOREFRONT-COPY-DRAFT.md`.
- **Issue:** the draft's own "Constraints checked against" section, while explaining
  `DEC-no-approval-promise-copy`, used the words "approval" and "unlock" in its prose — which
  tripped the plan's own automated guard (`c(d,'approved')+c(d,'unlock')>0`) because "manual-clinical-unlock"
  contains the literal substring "unlock." (Note: "approval"/"approv-al" does not contain the
  substring "approved," so only the "unlock" occurrences were the actual problem, but all
  instances of both were reviewed.)
- **Fix:** reworded the constraints section to describe the same rule ("no promise of manual
  clinical sign-off / account gating") without using either literal substring. Re-ran the
  verification script — passes (`approved: 0`, `unlock: 0`).
- **Files affected:** `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md`.
- **Commit:** `694c34e` (Task 2) — fixed before commit, not a follow-up commit.

None of these are Rule 1-4 code-behavior deviations (this plan touches no application source); both
are documentation/judgment calls within the plan's own instructions, resolved in favor of the more
specific and more restrictive instruction in each case.

## CHECKPOINT REACHED

**Type:** human-verify
**Plan:** 04-04
**Progress:** 2/3 tasks complete (Task 3 is the checkpoint itself)

### Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reconcile the theme working tree against live and record measured counts | `4bc8303` | `.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md` (quiz-app repo); `config/settings_data.json`, `templates/page.testing-options.json` (theme repo, **uncommitted**) |
| 2 | Delete the no-testing-required clauses and draft (do not ship) the replacement | `694c34e` | `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md` (quiz-app repo); no theme-repo files edited |

### Current Task

**Task 3:** Andrew authorizes the theme push
**Status:** blocked — awaiting Andrew's explicit decision
**Blocked by:** requires human authorization; this plan and its executor may not self-approve a
`shopify theme push` under any circumstance.

### Checkpoint Details

**What was built:** The `allergist-on-demand` theme repo's working tree is reconciled against live
— the Klaviyo onsite-embed block is set to `disabled: true` (matching live), the Appointly block is
untouched (`disabled: false`, deliberately), the redirect URLs in `templates/page.quiz.json` were
already correct, and the orphaned `templates/page.testing-options.json` is deleted. **Nothing has
been committed or pushed in the theme repo.** Separately, Task 2 found that the D-13
no-testing-required clauses do not exist anywhere in the theme repo — both surfaces they'd need to
be deleted from (both SLIT product pages, `/pages/test-options`) render Shopify Admin-managed
content, not theme-repo content. A replacement-copy draft for those Admin surfaces was written and
held at `04-STOREFRONT-COPY-DRAFT.md`, marked UNCONFIRMED.

**How to verify:**

1. Read `.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md` end to end.
   Every drift item shows a pre-value, a post-value, and an evidence source.
2. Run `git -C "/Users/andrewskinner/Local Sites/allergist-on-demand" diff -- config/settings_data.json`
   and confirm: the Klaviyo block's `disabled` flips from `false` to `true`; the Appointly block's
   entry is unchanged; the only other change in that file's diff (a removed `quiz-kit-smart-product-finder`
   chat-embed block) was **pre-existing drift from before this plan started**, not something this
   plan did.
3. Run `git -C "/Users/andrewskinner/Local Sites/allergist-on-demand" status --short` and confirm
   `templates/page.testing-options.json` no longer appears (it was untracked, so its deletion
   produces no diff entry — its absence from disk is the evidence; run
   `ls "/Users/andrewskinner/Local Sites/allergist-on-demand/templates/page.testing-options.json"`
   and confirm "No such file or directory").
4. Read `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md` in full.
   Confirm you understand: (a) no theme-repo edit was made or was possible for the D-13 clauses,
   because they live in Shopify Admin product descriptions and the `/pages/test-options` page body,
   not this repo; (b) the proposed replacement copy is acceptable to eventually send to William —
   it does **not** ship in this phase; (c) whether you agree with leaving the homepage's two
   accurate "no needles" mentions untouched (see "Deviations" item 1 above).
5. Decide whether you (or someone) will make the two Admin-side edits yourself — deleting the false
   clause from both SLIT product descriptions and from the `/pages/test-options` page body in
   Shopify Admin. These are **not** part of any `shopify theme push` and can happen independently,
   at any time, in the Shopify Admin UI directly.
6. Decide whether plan 04-05 may run `shopify theme push` against the live "Sense" theme, carrying
   the Klaviyo fix, the (already-correct) redirect URLs, and the orphaned-template deletion. A push
   overwrites live theme state — this is the irreversible step this whole plan exists to gate.

### Awaiting

Andrew's explicit answer. Per the plan's own `<resume-signal>`:

> Type "approved — push authorized" to unblock plan 04-05, or describe what must change first. If
> you prefer to apply these via the theme editor instead of a push, say so and 04-05 will be
> re-planned as a verification-only plan.

**No answer has been recorded yet — this executor stopped at the checkpoint without proceeding.**
Andrew's response, once given, should be recorded verbatim in an updated version of this SUMMARY (or
in 04-05's own record) before plan 04-05 begins.

## Self-Check

- `[ -f "/Users/andrewskinner/Local Sites/alle-drops-quiz-app/.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md" ]` → FOUND
- `[ -f "/Users/andrewskinner/Local Sites/alle-drops-quiz-app/.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md" ]` → FOUND
- `[ -f "/Users/andrewskinner/Local Sites/allergist-on-demand/templates/page.testing-options.json" ]` → confirmed absent (expected — deleted)
- Commit `4bc8303` → FOUND in `git log --oneline`
- Commit `694c34e` → FOUND in `git log --oneline`
- Theme repo HEAD `5767aca96d068229d973400e73b2b46a3b20fb3f` → unchanged from plan start, confirmed via `git -C "/Users/andrewskinner/Local Sites/allergist-on-demand" log -1`
- `npm run typecheck` (quiz-app repo) → clean, unaffected (plan touches no application source)

## Self-Check: PASSED
