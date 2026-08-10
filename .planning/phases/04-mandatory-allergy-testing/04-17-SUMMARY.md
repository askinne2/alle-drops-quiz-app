---
phase: 04-mandatory-allergy-testing
plan: 17
subsystem: upload-promotion-and-retention
tags: [gcs, file-upload, lifecycle-management, hipaa, fly-infra]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "insertSubmissionFiles (04-11), buildPermanentKey/copyObject/deleteObject/getBucket (04-12), POST /api/quiz/upload + GCS custom object metadata contract (04-13), testing_files tokens on the submitted payload (04-16)"
provides:
  - "api.quiz.submit.tsx step 3.5 — the promotion step that turns staged pending/ tokens into permanent, linked submission_files rows"
  - "A real, applied, empirically-proven GCS lifecycle rule scoped to pending/ on the dev bucket"
  - "docs/gcs-lifecycle-and-retention.md — the retention posture, reconciliation query, and cutover obligation"
  - "fly.toml sized to 2gb for the new binary workload"
affects: ["04-19 (owns the deploy, TEST-04 completion, and — CRITICAL, see below — must resolve the still-unsolved Fly-runtime GCP credential gap before any real deploy)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promotion locates a staged object by prefix (getBucket().getFiles({ prefix: GCS_PENDING_PREFIX + token + '/' })), not by reconstructing buildPendingKey(token, filename) — the client never receives the sanitized filename back from the upload route, so the token-to-object mapping must go through GCS's own listing, not a client-supplied filename."
    - "insertSubmissionFiles is called exactly once per submission, after the full copy loop, so all N rows land in one transaction regardless of file count."
    - "Staged-object deletes only run after insertSubmissionFiles resolves, and each delete is individually caught — a delete failure cannot fail the request, and the pending/ OLM rule is the backstop."

key-files:
  created:
    - tests/api-quiz-submit-promotion.test.ts
    - docs/gcs-lifecycle-and-retention.md
  modified:
    - app/routes/api.quiz.submit.tsx
    - app/lib/quiz-validation.ts
    - fly.toml

key-decisions:
  - "Promotion reads the staged object by GCS prefix listing (getBucket().getFiles({ prefix: 'pending/{token}/' })) rather than via gcs.ts's buildPendingKey(token, filename) — the upload route's 200 response deliberately omits the filename (api.quiz.upload.tsx's own header: 'no filename, no object key, no bucket, no signed URL'), so the promotion step has no filename to reconstruct the pending key from. This matches the plan's own <interfaces> section, which lists buildPermanentKey/copyObject/deleteObject/getBucket as promotion's toolkit but conspicuously not buildPendingKey."
  - "testing_files token validation (array of at most MAX_FILES UUID-shaped strings) was added to quiz-validation.ts's existing validateQuizData, not inline in the route, per the plan's explicit instruction to validate in the same place every other payload shape is checked."
  - "Failure policy (Pitfall 3, decided here): the submission is authoritative. A copyObject, insertSubmissionFiles, or deleteObject rejection at any point still returns the route's normal 200 success response and never rolls back insertSubmission. This is recorded both as a code comment at the top of api.quiz.submit.tsx and here."
  - "UUID validation regex accepts any RFC 4122-shaped UUID (8-4-4-4-12 hex), not specifically v4 — the validator's job is shape-checking a client-supplied token before it reaches a storage lookup, not asserting the token generator's version bits."
  - "CRITICAL — the Fly-runtime GCP credential gap flagged by 04-13-SUMMARY.md is NOT solved by this plan. See 'Known Open Gap' below. Flagged loudly rather than solved because credential wiring (which approach, a new Fly secret, a code change to gcs.ts's Storage() construction) is an architectural decision outside this plan's files_modified and outside its three planned tasks — not something to improvise mid-execution."

requirements-completed: []

# Metrics
duration: ~35min
completed: 2026-08-10
---

# Phase 4 Plan 17: File Promotion, Retention, and VM Sizing Summary

**The promotion step that links staged uploads to submissions in one transaction, a real
prefix-scoped GCS lifecycle rule proven against live probe objects (not just documentation), the
retention document that reconciles it against the 6-year HIPAA obligation and the breach-response
runbook, and a Fly VM sized for the new binary workload — with the Fly-runtime GCP credential gap
left explicitly and loudly unsolved for plan 04-19.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 6 (2 new: `tests/api-quiz-submit-promotion.test.ts`,
  `docs/gcs-lifecycle-and-retention.md`, plus this summary)

## Accomplishments

- **`app/routes/api.quiz.submit.tsx`** — new step 3.5, immediately after `insertSubmission`
  succeeds and before the metafield step, in its own try/catch with a `[submit] file promotion`
  log prefix. For each token in `answers.testing_files`: lists the staged object by GCS prefix
  (`pending/{token}/`), reads its custom object metadata (never the client payload) as the sole
  source of truth for `original_filename`/`content_type`/`original_content_type`/`size_bytes`,
  copies it to `buildPermanentKey(submissionId, fileId, originalFilename)`, and collects a row
  descriptor. After the full loop, `insertSubmissionFiles` is called exactly once with all
  collected rows in a single transaction; only after that resolves are the staged copies deleted,
  best-effort, each individually caught. A missing staged object (expired or already promoted) is
  skipped, not fatal. **Failure policy:** any rejection — `copyObject`, `insertSubmissionFiles`, or
  `deleteObject` — is caught by the outer try/catch and logged as `[submit] file promotion failed`
  with submission id + attempted/succeeded counts only; the route still returns its normal 200
  success response and never rolls back the already-inserted submission. Recorded both as a code
  comment at the top of the file and here.
- **`app/lib/quiz-validation.ts`** — `answers.testing_files`, when present, is validated as an
  array of at most `MAX_FILES` UUID-shaped strings before any storage lookup is attempted. Anything
  else returns the route's existing validation-error shape with zero GCS calls.
- **`tests/api-quiz-submit-promotion.test.ts`** (new, 11 cases) — mocks `app/lib/submissions`,
  `app/lib/submission-files`, `app/lib/storage/gcs`, and (module-load side effect only)
  `app/shopify.server`. Covers: zero tokens (no GCS call, no `insertSubmissionFiles` call); three
  tokens (three `copyObject` calls, exactly one `insertSubmissionFiles` call with three rows, three
  `deleteObject` calls); a missing staged object (skipped, remaining files still promoted);
  independent `copyObject`/`insertSubmissionFiles`/`deleteObject` rejections (success response
  unchanged in all three, `insertSubmission` never rolled back); malformed `testing_files` (non-UUID
  string, non-array) rejected by the shared validator with zero GCS calls; GCS-metadata-not-payload
  sourcing (asserted on the actual row values); `insertSubmission`'s call shape unchanged; and a
  console spy proving no log call across a success path and a failure path contains a sentinel
  filename or either test UUID.
- **`docs/gcs-lifecycle-and-retention.md`** (new) — a single Delete lifecycle rule
  (`age: 2, matchesPrefix: ["pending/"]`) was applied to the real dev bucket
  (`gs://alledrops-quiz-uploads-dev`, `alledrops-quiz` project) via
  `gcloud storage buckets update --lifecycle-file`, then read back verbatim via
  `gcloud storage buckets describe --format=json` — the JSON is recorded in the doc exactly as
  returned. Three real probe objects were written (one under `pending/`, one under `submissions/`,
  one at the bucket root), evaluated by hand against the rule's `matchesPrefix` condition (a
  literal string-prefix test — `submissions/` and `pending/` are disjoint at the first character,
  so no object under `submissions/` can ever match), and then deleted, with deletion confirmed by
  re-listing the bucket. The doc states plainly that OLM evaluates roughly daily, so end-to-end
  deletion was not observed in-session — only the rule's applied conditions were proven. The
  6-year retention obligation on `submissions/` is stated explicitly, cross-referenced against
  `docs/breach-response-runbook.md`'s "Do not delete data" instruction, and both orphan sources
  (pre-submit abandonment; the `had_testing` → `needs_testing` flip from plan 04-16) and the
  reconciliation query from Task 1 (flagged as a manual check today, Phase 8 automation candidate)
  are documented, along with the AOD-cutover re-apply-and-re-probe obligation.
- **`fly.toml`** — `[[vm]] memory` raised `1gb` → `2gb`, the single attributable change (`cpus = 1`
  and `cpu_kind = 'shared'` left untouched). The block's comment now records why (binary PHI
  streaming, HEIC decode, JPEG re-encode, PDF merging, alongside existing Shopify session traffic
  and the `max: 5` Cloud SQL pool), cites the ratified `MAX_FILE_BYTES`/`MAX_TOTAL_BYTES` caps as
  the worst-case-memory bound, and names plan 04-19's human pass as where OOM behavior is actually
  observed under realistic load, with `cpus = 2` as the pre-decided next lever if 2gb proves
  insufficient. **No `fly deploy` was run in this plan.**
- Full suite grew from the 525/35 baseline to **536/36**, typecheck clean, `npm run build` clean.
  `git diff app/lib/submissions.ts` is empty — `insertSubmission` untouched.

## Task Commits

1. **Task 1: Add the promotion step to the terminal submit route** — `0052765` (feat)
2. **Task 2: Apply the prefix-scoped lifecycle rule and prove it cannot reach retained files** — `f69418e` (docs)
3. **Task 3: Size the Fly VM for streaming upload, HEIC conversion, and PDF merging** — `ec4316f` (chore)

**Plan metadata:** (this commit, pending) `docs: complete 04-17 plan`

## Files Created/Modified

- `app/routes/api.quiz.submit.tsx` — step 3.5 promotion + failure-policy code comment
- `app/lib/quiz-validation.ts` — `answers.testing_files` UUID-array validation
- `tests/api-quiz-submit-promotion.test.ts` — new, 11 cases
- `docs/gcs-lifecycle-and-retention.md` — new, lifecycle proof + retention posture
- `fly.toml` — `memory = '2gb'`, rationale comment

## Decisions Made

See `key-decisions` in frontmatter. Summary: promotion locates staged objects by GCS prefix
listing rather than reconstructing a filename-bearing key (the upload route never returns the
filename to the client, so there's nothing to reconstruct from); token validation lives in the
shared `quiz-validation.ts` validator; the failure policy makes the submission authoritative over
promotion outcome; and the UUID regex is version-agnostic since it's shape-checking a
client-supplied token, not asserting the server's own generator behavior.

## Deviations from Plan

None — the plan's three tasks, `must_haves`, and threat-model mitigations were implemented as
specified. No Rule 1/2/3 auto-fixes were needed; no Rule 4 architectural questions arose within
the plan's own scope (the one architectural question in this space — GCP credential wiring for
the Fly runtime — is explicitly out of this plan's `files_modified` and is addressed as a flagged
open gap below, not solved here).

## Known Stubs

None. Every code path in this plan is real, wired behavior: the promotion step calls the real
GCS/Postgres primitives (mocked only at the test boundary), the lifecycle rule is applied to a
real bucket, and the VM sizing change is a real `fly.toml` edit awaiting only the deploy plan 04-19
owns.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-4-86 through T-4-93, all
`mitigate`, all implemented as specified — see Task 1/2's acceptance criteria above for how each
is proven).

## Issues Encountered

- **`app/shopify.server.ts` eagerly initializes `@shopify/shopify-app-react-router` at module load**
  and throws without real env vars ("Detected an empty appUrl configuration"). Every test in this
  file posts with no `Origin`/`x-shopify-shop-domain` header, so the route's own shop-resolution
  logic never actually calls `unauthenticated.admin` — but the module still has to load without
  throwing. Added a `vi.mock("../app/shopify.server", ...)` purely to satisfy that module-load side
  effect, matching the existing pattern in `tests/api-admin-submissions.test.ts`.

`npm run typecheck`, `npm run build`, and the full `npm test` suite (536/36) all passed cleanly on
the final run.

## CRITICAL — Known Open Gap NOT Solved By This Plan (flagged loudly for 04-19)

**The Fly-runtime GCP credential gap surfaced by 04-13-SUMMARY.md is still unsolved.**
`app/lib/storage/gcs.ts` constructs `new Storage({ projectId })` with no explicit credentials,
relying on Application Default Credentials. That works for `gcloud`-authenticated local
development and for this plan's own `gcloud storage` probe commands (this session's ambient
`gcloud` auth), but **the deployed Fly VM has no GCP metadata server and no ADC of its own.** As
written, `getBucket()` — and therefore `api.quiz.upload.tsx`'s save, and this plan's own
`bucket.getFiles()`/`copyObject`/`deleteObject` calls in `api.quiz.submit.tsx` step 3.5 — will fail
at runtime on the deployed Fly VM once a real request arrives, unless something supplies
credentials there (e.g. a `GOOGLE_APPLICATION_CREDENTIALS` file written from a Fly secret at boot,
or an explicit `credentials`/`keyFilename` option passed to the `Storage` constructor).

**This plan deliberately did not solve it.** `app/lib/storage/gcs.ts` is not in this plan's
`files_modified`, and the task list (promotion route + tests, lifecycle rule + retention doc, VM
sizing) does not include credential wiring. Solving it would mean choosing an architecture
(boot-time credential file vs. explicit `Storage` constructor option), provisioning a real GCP
service-account key, and staging it as a Fly secret — a real architectural decision with real
credential material involved, not something to improvise mid-execution of an unrelated task list.
Per this plan's own instructions: a service-account key is a credential and must never be
committed, echoed, or placed in a planning document — none was created in this plan.

**Plan 04-19 must resolve this before any real deploy is attempted**, and its own deploy-readiness
checklist (which already asks "is `GCS_PROJECT_ID` still pointed at the dev project?") should also
explicitly ask "does the Fly runtime have working GCP credentials?" — deploying with `memory =
'2gb'` and the promotion code live, but no working credentials, would move the failure from "code
untested" to "500 on every upload/promote," which is not an improvement on its own. The two
non-sensitive Fly secrets (`GCS_BUCKET_NAME`, `GCS_PROJECT_ID`) remain staged-but-not-deployed from
plan 04-13; this plan added no new Fly secrets and ran no `fly deploy`/`fly secrets deploy`.

## User Setup Required

None beyond the CRITICAL open gap above, which requires a human decision (which credential-wiring
approach) before any code change — no environment variable or local setup is needed to verify this
plan's own work, which is fully covered by the test suite and the real (non-mocked) `gcloud`
lifecycle application/probe procedure already executed and documented above.

## Next Phase Readiness

- `api.quiz.submit.tsx` step 3.5 is ready to promote real `testing_files` tokens the moment a real
  submission carries them — no further application code is needed for TEST-04's persistence
  linkage.
- The `pending/` lifecycle rule is live on the dev bucket right now; orphaned staged uploads from
  today's testing will self-clean after `PENDING_OLM_AGE_DAYS` (2 days) plus one OLM evaluation
  cycle.
- `fly.toml` is ready for plan 04-19's deploy with the VM already sized — **but see the CRITICAL
  credential gap above, which must be resolved first.**
- **Do not mark TEST-04 complete** — per this plan's own non-negotiable constraints and its
  frontmatter, that bookkeeping belongs to plan 04-19. `REQUIREMENTS.md`'s TEST-04 checkbox and
  traceability row are left untouched by this plan's final commit, despite `TEST-04` appearing in
  this plan's own frontmatter `requirements:` field — that field names which requirement this plan
  contributes to, not which plan closes it.
- 04-19's deploy-readiness checklist should independently re-verify: the GCP credential gap
  (above), that `fly secrets deploy` (or a full `fly deploy`) actually applies the staged
  `GCS_BUCKET_NAME`/`GCS_PROJECT_ID` secrets from plan 04-13, and that `fly logs` is watched for
  OOM kills during the human upload-heavy pass per this plan's `fly.toml` comment.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: app/routes/api.quiz.submit.tsx
- FOUND: app/lib/quiz-validation.ts
- FOUND: tests/api-quiz-submit-promotion.test.ts
- FOUND: docs/gcs-lifecycle-and-retention.md
- FOUND: fly.toml
- FOUND: 0052765 (Task 1 commit)
- FOUND: f69418e (Task 2 commit)
- FOUND: ec4316f (Task 3 commit)
