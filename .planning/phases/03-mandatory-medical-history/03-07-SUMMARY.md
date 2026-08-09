---
phase: 03-mandatory-medical-history
plan: 07
subsystem: deploy/db
tags: [fly, cloud-sql, postgres, migration, phi, hipaa, ddl, deploy-verification]

# Dependency graph
requires:
  - phase: 03-mandatory-medical-history
    provides: "Plan 03-02's insertSubmission (15 named columns), plan 03-06's SUCCESSFUL backup (1786306233540) and the reviewable migrations/003_drop_medical_history_legacy_columns.sql"
provides:
  - "The Phase 3 branch merged to main (PR #19, merge commit ac40f09) and deployed to Fly (release v50), proven live on served bytes with marker counts, not on exit codes"
  - "personal_history_json and family_history_json permanently dropped from alledrops_quiz_dev.submissions, verified via information_schema.columns before and after"
  - "A post-DDL synthetic POST proving the write path survived the deploy-first/DDL-second ordering, cleaned up with matching before/after counts"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Base64-encoded pg script via `fly ssh console -C \"sh -c ...\"` — the proven route to run COUNT(*)/information_schema-only queries against Cloud SQL from a machine not on the authorized-networks list, reused unchanged from plans 01-06 and 03-06"
    - "Executed-statement provenance: the migration file itself was base64'd onto the Fly machine and read from disk at execution time (not retyped from memory), and the script printed the exact executed SQL string so the reviewed statement and the executed statement are provably identical"
    - "Served-bytes deploy verification: release-version delta + SOURCE.split(needle).length-1 marker counts + a non-vacuity control (a needle that must be 0) in the same fetch — never a deploy exit code or log text"

key-files:
  created: []
  modified: []

key-decisions:
  - "PR #19 opened and merged to main by Claude under Andrew's explicit in-session authorization ('keep moving forward' after the orchestrator described the exact merge -> deploy -> prove-live -> DDL sequence), the same override pattern used for PR #16, #17, and #18. Recorded here per the plan's authorization block so the audit trail shows a human decision, not a Claude-initiated merge without consent."
  - "DDL executed only after all four preconditions were independently re-verified in this session (not trusted from the 03-06 SUMMARY): backup re-read from gcloud as SUCCESSFUL, merge commit confirmed on main, Fly release v50 proven live on served bytes with 5/5 positive markers and 3/3 absence/control markers correct, and a fresh pre-DDL COUNT(*) (42/18) that exactly matched 03-06's baseline."
  - "The executed ALTER TABLE statement was read live off the migration file on the Fly machine (base64-transferred, not retyped), and the script echoed the exact string executed, closing the 'provably identical to the reviewed statement' requirement."
  - "Every database query in this plan was COUNT(*), information_schema.columns (names only), or a WHERE clause keyed on the synthetic patient_email — zero PHI columns were ever selected, matching CLAUDE.md rules 5-6."

requirements-completed: [HIST-05]

# Metrics
duration: ~20min
completed: 2026-08-09
---

# Phase 3 Plan 7: Merge, Deploy, Prove Live, Drop Legacy Columns Summary

**Merged Phase 3 to `main` (PR #19), deployed to Fly (release v49 -> v50, proven live on served bytes with 5/5 Phase 3 markers present and legacy markers/controls absent), then executed `DROP COLUMN` against `alledrops_quiz_dev` only after re-verifying all four preconditions — row count held at 42 before and after, both legacy columns confirmed gone, and a post-DDL synthetic submission proved the write path survived, cleaned up with matching counts.**

## Authorization

Andrew authorized the merge and deploy in-session on 2026-08-09, after the orchestrator described
the exact sequence to him (merge -> deploy -> prove live on served bytes -> then `DROP COLUMN`). He
replied "keep moving forward." `CLAUDE.md`'s "Andrew reviews and merges" rule was overridden for this
plan by that explicit instruction — the same override pattern already used for PR #16, #17, and #18.
This SUMMARY records that authorization so the audit trail shows a human decision, not a
Claude-initiated merge without consent.

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 planned (1 checkpoint:human-verify, 2 auto), all completed. No code files were
  modified in this plan (`files_modified: []` in frontmatter) — Task 1 is a merge, Task 2 is a
  deploy + verification, Task 3 is a live database DDL + verification. No task-level code commits;
  this SUMMARY plus STATE/ROADMAP/REQUIREMENTS updates are the plan's only commit.

## Accomplishments

### Task 1 — PR review, merge, deploy authorization

- Pushed local `phase-3-mandatory-medical-history` (7 commits ahead of the last-pushed remote state)
  to `origin`, then opened **PR #19** with a description calling out every PHI-relevant change: the
  two legacy columns removed from `insertSubmission`'s write path (17 -> 15 columns), the two Medical
  History render sections deleted from `pdf.ts`/`app.quiz-results.tsx`, the two test-only
  devDependencies (`jsdom`, `@testing-library/react`), and the destructive migration committed alone.
- Confirmed pre-merge: `gh pr view 19` reported `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`,
  and the GitGuardian Security Checks check `SUCCESS`.
- Confirmed baseline before merging: `npm run typecheck` clean, `npm test` **361 tests / 27 files
  passing** — exact match to the plan's stated baseline.
- Merged PR #19 to `main` — merge commit **`ac40f09`**. Checked out `main` locally and fast-forwarded
  (31 commits, matching the 30 ahead-of-main count plus the merge commit itself).

### Task 2 — Deploy to Fly and prove the release live

- Pre-deploy release version recorded: **v49** (`fly status`).
- Ran `fly deploy -a alle-drops-quiz-app`. It printed the documented false "The app is not listening
  on the expected address" warning; per the plan's explicit instruction this was ignored as
  non-evidence.
- **Release version check:** post-deploy `fly status` reported **v50** — strictly greater than v49.
- **Served-bytes check:** fetched `/quiz-bundle-js` (cache-busted) and counted every needle with
  `SOURCE.split(needle).length - 1`, never `grep -c`:

  | Needle | Count | Type |
  |---|---|---|
  | `has_pcp` | 4 | presence, required >=1 |
  | `history_comorbidities` | 1 | presence, required >=1 |
  | `pcp_clinic_address` | 1 | presence, required >=1 |
  | `infoBlockCard` | 15 | presence, required >=1 |
  | `before beginning SLIT` | 1 | presence, required >=1 |
  | `history_personal` | 0 | absence, required 0 |
  | `history_family` | 0 | absence, required 0 |
  | `isOptionDisabledByExclusive` | 0 | non-vacuity control, required 0 |

  All 5 positive markers >=1, both absence markers 0, and the non-vacuity control 0 while at least
  one positive marker was >=1 in the same fetch (bundle length 186738 bytes, HTTP 200) — proving the
  fetch returned real post-deploy bundle bytes, not an error page.
- **Storefront third-party regression check:** authenticated past the storefront password
  (`allergist-on-demand.myshopify.com`), fetched `/pages/allergy-quiz` cache-busted (200, 113261
  bytes), and counted:

  | Needle | Count |
  |---|---|
  | `klaviyo` | 0 |
  | `static.klaviyo.com` | 0 |
  | `_klOnsite` | 0 |
  | `gtag` / `googletagmanager` / `google-analytics` / `connect.facebook` / `fbq(` / `hotjar` | 0 (all) |
  | `appointly` | 15 (recorded, known Phase 8 / LAUNCH-01 exposure — not acted on here) |
  | `apntly` | 0 (confirms the correct needle was used, not the vendor-slug decoy) |

  Klaviyo stayed closed (0, matching the 2026-08-09 closure); `appointly`'s known open exposure count
  recorded per the plan's explicit instruction not to act on it in this plan.
- DDL was **not** run in this task.

### Task 3 — DROP COLUMN, verified by query results (T-3-02)

**Preconditions, all re-verified independently in this session (not trusted from 03-06's SUMMARY):**

1. Backup re-read live from `gcloud sql backups list` / `describe`: ID `1786306233540`, status
   `SUCCESSFUL`, description `pre-phase3-drop-medical-history-legacy-columns`, matching 03-06 exactly.
2. Merge to `main` confirmed: commit `ac40f09` present on `origin/main` and checked out locally.
3. Task 2's proof that the new Fly release (v50) is live on served bytes, with all 5 positive markers
   and both absence markers correct.
4. `gcloud sql instances describe alledrops-quiz-data --project=alledrops-quiz` returned `RUNNABLE`
   before proceeding — gcloud auth still valid, no reauth needed.
5. Confirmed `migrations/003_drop_medical_history_legacy_columns.sql` present on `main` with the
   backup ID filled into its header (not a placeholder).

**Step 1 — before state**, measured via `fly ssh console` + a base64-transferred `pg` script
(`require('/app/node_modules/pg')`, `ssl: { rejectUnauthorized: false }`, never Prisma):

```json
{"total":"42","with_history":"18","columns_present":["family_history_json","personal_history_json"]}
```

Exact match to plan 03-06's baseline (42 total / 18 with legacy data), confirming the table was
unchanged since the backup was taken.

**Step 2 — DDL executed.** The migration file itself was base64-transferred onto the Fly machine and
read from disk at execution time by the script (not retyped from memory). The script printed the
exact statement it was about to execute before running it:

```
EXECUTING: "ALTER TABLE submissions\n  DROP COLUMN IF EXISTS personal_history_json,\n  DROP COLUMN IF EXISTS family_history_json;\n"
DDL EXECUTED OK
```

This string is byte-identical to the tail of `migrations/003_drop_medical_history_legacy_columns.sql`
as committed in plan 03-06 — the executed statement and the reviewed statement are provably the same.

**Step 3 — after state:**

```json
{"total":"42","columns_present":[]}
```

Row count **unchanged (42 = 42)**. `information_schema.columns` returned **zero rows** for
`personal_history_json`/`family_history_json` — both columns confirmed gone.

**Step 4 — write path proof.** POSTed a synthetic submission to
`https://alle-drops-quiz-app.fly.dev/api/quiz/submit` with email `phase3+migration@example.com`,
`symptom_profile_id: AOD_PHASE3_MIGRATION_VERIFY_001`, and a Phase 3 answer key
(`has_pcp: "no"`, `history_comorbidities: ["asthma"]`). Response: `HTTP 200`,
`{"success":true,"submission_id":"3b7af768-0c96-406c-91a0-9f6aada5593a", ...}`.

Verified persistence by ID-only count, then deleted:

```json
{"pre_delete_matching":"1","deleted_count":1,"total_after_delete":"42"}
```

One matching row found, one row deleted, total returned to **42** — exactly the Step 3 value.

**Not one query in this task selected a PHI column.** Every statement was `COUNT(*)`,
`information_schema.columns` (names only), or a `WHERE patient_email = $1` scoped to the synthetic
address. No claim in this plan rests on an exit code — every gate above is a query result, a release
version, an HTTP status/body, or served-bytes marker counts.

## Task Commits

No task produced a code file change (`files_modified: []`). All work in this plan is a merge, a
deploy, and a live-database DDL, each verified by the evidence recorded above rather than by a git
commit. The plan's only commit is this SUMMARY plus the STATE/ROADMAP/REQUIREMENTS updates.

- **PR #19**, merge commit `ac40f09` — "Merge pull request #19 from askinne2/phase-3-mandatory-medical-history"
- **Fly deploy** — release v49 -> v50 (`alle-drops-quiz-app`, iad)
- **DDL execution** — `ALTER TABLE submissions DROP COLUMN IF EXISTS personal_history_json, DROP COLUMN IF EXISTS family_history_json` against `alledrops_quiz_dev`, run via `fly ssh console` + `pg`

**Plan metadata:** (this commit) `docs: complete 03-07 plan`

## Files Created/Modified

None — this plan's scope is merge/deploy/DDL, not application code. The only files this plan writes
are its own SUMMARY plus `.planning/STATE.md`, `.planning/ROADMAP.md`, and
`.planning/REQUIREMENTS.md` in the final metadata commit.

## Decisions Made

See `key-decisions` in frontmatter — summarized: (1) PR #19 merged by Claude under Andrew's explicit
in-session authorization, recorded for the audit trail; (2) DDL preconditions independently
re-verified rather than trusted from the prior plan's SUMMARY; (3) the executed statement was read
live from the migration file on the target machine, not retyped, to prove executed == reviewed;
(4) zero PHI columns selected anywhere in this plan.

## Deviations from Plan

None — plan executed exactly as written. Task 1's checkpoint was cleared via the explicit in-session
authorization documented above rather than a separate human-action round-trip mid-plan, consistent
with the plan's own `<authorization>` framing.

## Issues Encountered

None. `fly deploy` printed its documented false "not listening" warning; per the plan this was
treated as non-evidence and ignored in favor of the release-version and served-bytes checks.

## Verification Evidence

- `npm run typecheck`: clean (pre-merge). `npm test`: **361 tests / 27 files passing** (pre-merge,
  matching the plan's stated baseline).
- `gh pr view 19`: `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`, GitGuardian check `SUCCESS`.
- `gh pr merge 19 --merge`: merge commit `ac40f09`, `mergedAt: 2026-08-09T20:19:25Z`.
- `fly status` pre-deploy: release **v49**. Post-deploy: release **v50**.
- `/quiz-bundle-js` cache-busted fetch: HTTP 200, 186738-byte bundle body; 5/5 positive markers >=1,
  2/2 absence markers = 0, non-vacuity control = 0 alongside a positive marker >=1 — all measured with
  `split(needle).length - 1`.
- `/pages/allergy-quiz` cache-busted, authenticated fetch: HTTP 200, 113261 bytes; `klaviyo` family
  = 0 (stayed closed), `appointly` = 15 (recorded, not acted on — Phase 8 scope), `apntly` = 0
  (confirms the correct needle).
- `gcloud sql backups describe 1786306233540`: `SUCCESSFUL`, description matches, re-read live (not
  trusted from 03-06's SUMMARY).
- `gcloud sql instances describe alledrops-quiz-data`: `RUNNABLE`.
- Pre-DDL: `{"total":"42","with_history":"18","columns_present":["family_history_json","personal_history_json"]}`.
- DDL execution log: `EXECUTING: "ALTER TABLE submissions\n  DROP COLUMN IF EXISTS personal_history_json,\n  DROP COLUMN IF EXISTS family_history_json;\n"` then `DDL EXECUTED OK`.
- Post-DDL: `{"total":"42","columns_present":[]}`.
- Synthetic POST: `HTTP 200 {"success":true,"submission_id":"3b7af768-0c96-406c-91a0-9f6aada5593a",...}`.
- Cleanup: `{"pre_delete_matching":"1","deleted_count":1,"total_after_delete":"42"}`.
- No PHI value (name, dob, email, phone, score, bracket, answers, personal/family history) was ever
  read, printed, or recorded at any point in this plan. Every database query was `COUNT(*)`,
  `information_schema.columns` (names only), or a `WHERE patient_email = $1` scoped to a clearly
  synthetic address (`phase3+migration@example.com`).

## Known Stubs

None. This plan added no UI surface and no new data path.

## Threat Flags

None. This plan closes T-3-02 and T-3-19 as designed (see `03-07-PLAN.md`'s threat register) and
introduces no new network endpoint, auth path, file-access pattern, or schema change beyond the
planned column drop.

## User Setup Required

None beyond the in-session authorization already given and recorded above.

## Next Phase Readiness

- **Phase 3 (mandatory-medical-history) is complete.** All 7 plans executed; HIST-01 through HIST-05
  and DIAG-01 requirements shipped, deployed, and verified live.
- `personal_history_json` and `family_history_json` no longer exist on `alledrops_quiz_dev.submissions`
  anywhere — dev database only, no production database exists yet (AOD GCP cutover pending).
- Standing open items carried forward (unchanged by this plan): mobile sticky-header clearance
  (deferred in 03-05, no sticky element exists on `/quiz-embed` to measure — the sticky header lives
  in the theme repo), the `appointly` third-party script exposure (Phase 8 / LAUNCH-01), and the
  score-scale-semantics and domain-spelling blocked decisions in `PROJECT.md`.
- Next roadmap phase per `.planning/ROADMAP.md` is Phase 4 (allergy-testing split / Preliminary
  Score work) — not started by this plan.

---
*Phase: 03-mandatory-medical-history*
*Completed: 2026-08-09*

## Self-Check: PASSED

- FOUND: PR #19, merge commit `ac40f09` (verified via `git log --oneline origin/main`)
- FOUND: Fly release v50 (verified via `fly status -a alle-drops-quiz-app`)
- FOUND: `.planning/phases/03-mandatory-medical-history/03-07-SUMMARY.md`
