---
phase: 04-mandatory-allergy-testing
plan: 10
subsystem: infra
tags: [gcs, google-cloud-storage, form-data-parser, heic-convert, pdf-lib, package-audit, hipaa]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-RESEARCH.md's Standard Stack, Assumptions Log (A1-A5), and Open Questions 2-4 which this plan resolves; 04-UI-SPEC.md's Copywriting Contract placeholders ({N} MB / {M} MB) which the size-cap decision fills; 04-09 (unblocked track complete, 426/28 baseline)"
provides:
  - "04-UPLOAD-DECISIONS.md — the single ratified source for size caps, GCS prefixes/TTL, upload architecture, dev-storage posture, and virus-scanning risk acceptance that plans 04-11 through 04-19 all read from"
  - "Four packages installed and human-verified: @remix-run/form-data-parser, @google-cloud/storage, heic-convert, pdf-lib"
  - "Confirmed via CLI that Blocker 3 (AOD GCP cutover) is NOT cleared — zero GCS buckets exist anywhere, active gcloud identity is a different project than alledrops-quiz"
affects: ["04-11 (GCS bucket/lib setup)", "04-12 (network capture verifying @google-cloud/storage telemetry, Assumption A3)", "04-13 (upload endpoint enforcing the ratified size caps)", "04-16 (UI-SPEC copy substitution of MAX_FILE_BYTES/MAX_TOTAL_BYTES)", "04-17 (fly.toml memory bump to 2gb)", "Phase 8 (owns closing Blockers 2/3 before any real patient PHI may use this path)"]

# Tech tracking
tech-stack:
  added: ["@remix-run/form-data-parser@0.17.4", "@google-cloud/storage@7.21.0", "heic-convert@2.1.0", "pdf-lib@1.17.1"]
  patterns:
    - "Blocker/decision ratification lands in a single dedicated decisions doc (04-UPLOAD-DECISIONS.md), not scattered across plan files, so every downstream plan has one file to read rather than re-deriving constants"
    - "Package legitimacy gate: live npm registry pull (not copied from research) + slopcheck scan (not slopcheck install) + human review of each npmjs.com/package page before any install runs"

key-files:
  created:
    - .planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md
  modified:
    - package.json

key-decisions:
  - "Blocker 1 (William's agreement + pricing) treated as CLEARED per Andrew's explicit in-session authorization ('Execute all waves no William blocker')"
  - "Blockers 2 (Fly.io BAA) and 3 (AOD GCP cutover) remain OPEN; Andrew authorized building against dev GCS in alledrops-quiz now, mirroring the existing Cloud SQL dev precedent, with GCS_BUCKET_NAME/GCS_PROJECT_ID env-var driven so cutover is a config change. No real patient PHI may use this path until Phase 8 closes both blockers."
  - "Size caps ratified: MAX_FILE_BYTES=15MB, MAX_TOTAL_BYTES=50MB, MAX_FILES=10 — substitute into 04-UI-SPEC.md's three {N}MB/{M}MB error strings at plan 04-16"
  - "Upload architecture: Fly-proxied (not direct-to-GCS signed PUT) — keeps magic-byte validation and HEIC conversion synchronous and pre-storage in one request"
  - "Virus scanning deferred out of Phase 4 as a documented risk acceptance; compensating controls are magic-byte allowlist + size caps + no execution path for uploaded bytes; revisit owned by Phase 8"
  - "slopcheck's currently-published registry version is 0.2.0 (scan-only, no install subcommand), not the 0.6.1 04-RESEARCH.md recorded — likely a different local build was used during research. Fetched via npx (no working-tree side effects) rather than npm-installed into the project."
  - "npm audit --omit=dev surfaced one new moderate finding transitively via @google-cloud/storage's gaxios/teeny-request chain (uuid <11.1.1); the only fix is a breaking downgrade to @google-cloud/storage@5.18.3, which was not taken since 7.21.0 is the ratified version. Documented, not auto-fixed."

requirements-completed: [TEST-04]

# Metrics
duration: ~20min
completed: 2026-08-10
---

# Phase 4 Plan 10: Upload Track Blocker Clearance + Package Install Summary

**Ratified all four open engineering decisions for Phase 4's upload track (15MB/50MB/10-file caps, Fly-proxied architecture, dev-GCS-now posture, deferred virus scanning) into a single decisions document, confirmed via CLI that Blocker 3 (AOD GCP cutover) is genuinely still open, and installed four human-verified packages (`@remix-run/form-data-parser`, `@google-cloud/storage`, `heic-convert`, `pdf-lib`) with zero postinstall scripts and a clean `slopcheck` pass.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-10T00:52:00Z (approx)
- **Completed:** 2026-08-10T20:55:29-04:00
- **Tasks:** 3 (Task 1 auto, Task 2 checkpoint pre-answered by Andrew, Task 3 auto)
- **Files modified:** 2 (`04-UPLOAD-DECISIONS.md` created, `package.json` modified)

## Accomplishments

- **Gathered CLI evidence for all three blockers.** Blocker 3 (AOD GCP cutover) independently
  confirmed NOT cleared: `gcloud config get-value project` returns `smart-rope-305817` (Andrew's
  active identity, not `alledrops-quiz`); `gcloud storage buckets list --project=alledrops-quiz`
  returns zero buckets. Blockers 1 and 2 have no CLI-checkable evidence and are correctly marked
  "Andrew-reported."
- **Live npm registry audit** of all four candidate packages (version, last-publish date,
  repository URL, empty `scripts.postinstall`, weekly downloads, canonical `npmjs.com/package` URL)
  pulled fresh 2026-08-10, not copied from 04-RESEARCH.md's 2026-08-09 snapshot.
- **`slopcheck scan` run cleanly** against all four package names (via `npx -y slopcheck`, no
  working-tree side effects — confirmed by `git diff --quiet package.json package-lock.json`
  before and after): 4/4 `valid`, zero `notFound`/`unpublished`/`securityHold`/`errors`/`findings`.
- **Recorded Andrew's pre-session answers to all six checkpoint items** in `04-UPLOAD-DECISIONS.md`
  Section 4, per this plan's explicit authorization to transcribe rather than re-ask.
- **Installed all four approved packages** at their ratified versions
  (`@remix-run/form-data-parser@0.17.4`, `@google-cloud/storage@7.21.0`, `heic-convert@2.1.0`,
  `pdf-lib@1.17.1`), re-verified zero postinstall scripts across the entire transitive tree these
  four packages pull in (only pre-existing dev-tooling packages — prisma, esbuild, parcel/watcher,
  fsevents, unrs-resolver — carry install scripts, none from the new dependency trees).
- **`npm audit --omit=dev` run and recorded.** No CVE against `pdf-lib` itself despite its
  ~4-year publish gap. One new moderate finding introduced transitively by `@google-cloud/storage`
  (`uuid <11.1.1` via `gaxios`/`teeny-request`) — documented rather than auto-fixed, since the only
  available fix (`npm audit fix --force`) would downgrade `@google-cloud/storage` to `5.18.3`, an
  older major version that was not what was ratified.
- **Full verification green:** `npm run typecheck`, `npm test` (426/28, unchanged from baseline),
  and `npm run build` all pass after install.

## Task Commits

1. **Task 1: Assemble the blocker-status and package-audit evidence brief** - `156315f` (docs)
2. **Task 2: Andrew clears the blockers, ratifies the decisions, and approves the packages** - no
   separate commit; this was a `checkpoint:human-verify` (`gate="blocking-human"`) task with no
   file output of its own. Andrew answered all six items in-session before this executor run began
   (see the execution prompt's `<andrew_has_already_answered_this_plans_checkpoint>` block), so per
   this plan's explicit instruction the executor recorded the ratified answers directly into
   `04-UPLOAD-DECISIONS.md` Section 4 as part of Task 1's write, rather than re-asking. No code was
   installed before this record existed.
3. **Task 3: Record the ratified decisions and install the approved packages** - `189af09` (feat)

**Plan metadata:** (this commit, pending) `docs: complete 04-10 plan`

## Files Created/Modified

- `.planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md` — new. Four sections:
  blocker status with CLI evidence, live package-legitimacy audit, four decisions with
  recommendation + reasoning, and Section 4 (Ratified) with Andrew's verbatim answers, the eight
  named constants/env vars, and the standing no-real-PHI constraint until Phase 8.
- `package.json` — `dependencies` gained `@remix-run/form-data-parser`, `@google-cloud/storage`,
  `heic-convert`, `pdf-lib`. `package-lock.json` is gitignored in this repo (`.gitignore:3`) so no
  lockfile change accompanies this commit — noted as a supply-chain observation below.

## Decisions Made

See `key-decisions` in frontmatter above for the full list. Summary: Blocker 1 cleared by explicit
Andrew authorization; Blockers 2/3 remain open but dev-GCS engineering is authorized against
`alledrops-quiz` now (env-var-driven, mirroring the Cloud SQL precedent); size caps 15MB/50MB/10
files; Fly-proxied upload architecture; virus scanning deferred to Phase 8 with documented
compensating controls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] slopcheck's registry-published version has no `install` subcommand**
- **Found during:** Task 1 (package legitimacy audit)
- **Issue:** 04-RESEARCH.md documented `slopcheck v0.6.1` with a destructive `install` mode that
  actually runs `npm install` as a side effect. The currently npm-published `slopcheck` is `0.2.0`
  and only supports scanning files/directories for hallucinated package-name references — it has
  no `install` subcommand at all. This is a version-provenance discrepancy in the research
  document, not a security concern (0.2.0's stated purpose — "Scan markdown and config files for
  hallucinated npm package names" — is exactly this gate's need).
- **Fix:** Fetched the tool via `npx -y slopcheck` (a one-time invocation, not an `npm install`
  into this project) and ran it against a scratch markdown file containing the exact `npm install`
  command line for all four candidate packages, producing the same "scan, don't install" gate the
  plan required. Confirmed `git diff --quiet package.json package-lock.json` was clean both
  immediately before and immediately after the scan.
- **Files modified:** none (scan is read-only; ran against a scratch file in the session
  scratchpad, not the repo)
- **Verification:** `slopcheck` JSON output: `{"total":4,"valid":4,"notFound":0,"unpublished":0,
  "securityHold":0,"errors":0,"findings":[]}`
- **Committed in:** `156315f` (documented in `04-UPLOAD-DECISIONS.md` Section 2, part of Task 1's
  commit)

---

**Total deviations:** 1 auto-fixed (1 bug — tooling version mismatch worked around, no scope creep)
**Impact on plan:** No change to the plan's intent or outcome. The gate the plan required (a clean
scan verdict from a real, non-installing tool run) was satisfied; only the specific CLI invocation
differed from what 04-RESEARCH.md anticipated.

## Issues Encountered

- `npm audit --omit=dev` surfaced 30 total vulnerabilities; the large majority are pre-existing,
  unrelated to this plan's four packages (react-router, vite, prisma tooling, express/body-parser
  chain, etc. — all pulled in by pre-existing dependencies, not by this plan's install). One
  **new** finding is directly attributable to this plan's install: `uuid <11.1.1` (moderate,
  missing buffer bounds check), pulled in transitively by `@google-cloud/storage@7.21.0`'s
  `gaxios`/`teeny-request` dependency chain. `npm audit fix --force`'s only remediation path is
  downgrading `@google-cloud/storage` to `5.18.3` — a major-version downgrade that contradicts the
  version this plan (and Andrew's checkpoint approval) explicitly ratified (`^7.21.0`). Not
  auto-fixed; recorded here and in `04-UPLOAD-DECISIONS.md` for a future plan or Phase 8 to
  reassess once `@google-cloud/storage` ships a patched release in the 7.x line.

## Known Stubs

None — this plan created no application source files and no new UI surface. Every file introduced
or modified is either a decisions document or `package.json`.

## Threat Flags

None beyond what the plan's own threat register (T-4-SC, T-4-37, T-4-38, T-4-39, T-4-40, T-4-41,
T-4-42) already covers — this plan introduced no new network endpoint, auth path, file-access
pattern, or schema change. The four packages are installed but not yet wired into any route; that
wiring (and its own threat surface) is plans 04-11 through 04-19.

Worth flagging explicitly for the record, not as a new threat: `npm audit`'s new `uuid <11.1.1`
finding (see Issues Encountered) sits inside `@google-cloud/storage`'s dependency tree, which this
plan's install newly introduces. It is a moderate-severity buffer-bounds-check bug in a UUID
generator, not directly PHI-adjacent, but is a supply-chain surface this plan added that did not
exist before. No action taken beyond documentation, per the reasoning above.

## User Setup Required

None for this plan specifically — no external service was configured (no GCS bucket was created;
that is plan 04-11's scope). `04-UPLOAD-DECISIONS.md` records that `GCS_BUCKET_NAME` and
`GCS_PROJECT_ID` will need to be set as Fly secrets once plan 04-11 provisions the actual bucket.

## Next Phase Readiness

- `04-UPLOAD-DECISIONS.md` is now the single ratified source of truth for plans 04-11 through
  04-19 — size caps, GCS prefixes, signed-URL TTL, OLM age, architecture, and the standing
  no-real-PHI-until-Phase-8 constraint are all recorded with concrete values.
- All four upload-track packages are installed, human-verified, and confirmed to add zero
  postinstall scripts. `npm audit --omit=dev` findings are recorded; the one new finding
  (transitive `uuid` via `@google-cloud/storage`) is a documented, accepted risk, not a blocker.
- Full suite still 426 tests / 28 files, typecheck clean, build clean — the install did not
  disturb the existing tree.
- **Standing constraint for every downstream plan:** Blockers 2 (Fly.io BAA) and 3 (AOD GCP
  cutover) remain open. GCS engineering may proceed against dev/test data in `alledrops-quiz`
  only. No real patient PHI may transit this path until Phase 8 clears both blockers — this is
  recorded prominently in `04-UPLOAD-DECISIONS.md` Section 4 and should be re-stated at the top of
  every plan from 04-11 onward that touches the upload path.
- Package-lock.json remains gitignored in this repo (pre-existing `.gitignore:3` entry, not
  introduced by this plan) — worth flagging as a supply-chain observation: without a committed
  lockfile, exact transitive dependency versions are not reproducible from git history alone; only
  the direct-dependency version ranges in `package.json` are pinned in version control.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: .planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md
- FOUND: package.json
- FOUND: 156315f (Task 1 commit)
- FOUND: 189af09 (Task 3 commit)
