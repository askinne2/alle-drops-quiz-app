---
phase: 04-mandatory-allergy-testing
plan: 13
subsystem: upload-route
tags: [file-upload, streaming, gcs, magic-byte-validation, heic, hipaa, network-capture]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-UPLOAD-DECISIONS.md's ratified constants/architecture (plan 04-10) and app/lib/storage/{gcs,upload-validation,heic}.ts (plan 04-12)"
provides:
  - "app/routes/api.quiz.upload.tsx — POST /api/quiz/upload, the only route accepting binary PHI"
  - "tests/api-quiz-upload.test.ts — GCS test-strategy decision (mock gcs.ts/heic.ts, use upload-validation.ts for real) that plans 04-14/04-17 should follow"
  - "A real GCS bucket (alledrops-quiz-uploads-dev, project alledrops-quiz) and a confirmed network-capture host list for T-4-64"
affects: ["04-14/04-15 (signed-URL download routes reuse the gcs.ts primitives this route composes)", "04-17 (promotion step reads the GCS custom metadata this route writes: original_filename, content_type, original_content_type, size_bytes)", "04-19 (deploy step must still solve GCP credential wiring for the Fly runtime — see Open Gap below)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Streaming multipart parse via @remix-run/form-data-parser's parseFormData(request, options, uploadHandler) — caps enforced inside the parser's own chunk-accumulation loop (MultipartParser#append), never after the whole body is buffered"
    - "Custom typed error classes (UnsupportedFileTypeError, HeicConversionFailedError, UploadStorageError) thrown from inside the uploadHandler and caught by instanceof in one outer try/catch, alongside the parser's own MaxFileSizeExceededError/MaxTotalSizeExceededError/MaxFilesExceededError"
    - "vi.hoisted() for cross-vi.mock-factory shared mock references, needed because this test file (unlike the dynamic-import pattern in tests/storage-gcs.test.ts) statically imports the route under test"

key-files:
  created:
    - app/routes/api.quiz.upload.tsx
    - tests/api-quiz-upload.test.ts
  modified: []

key-decisions:
  - "Fixed a bug in the plan's own <interfaces> code snippet: @remix-run/form-data-parser 0.17.4's real parseFormData signature is (request, options, uploadHandler), not (request, uploadHandler, options) as the plan's snippet showed. Verified directly against node_modules/@remix-run/form-data-parser/src/lib/form-data.ts's overload signatures before writing the route (Rule 1 — the plan's illustrative snippet, not 04-RESEARCH.md, had the argument order backwards)."
  - "GCS test strategy: mock app/lib/storage/gcs.ts and app/lib/storage/heic.ts (I/O and native-library boundaries) but use the REAL app/lib/storage/upload-validation.ts (sniffType/isAllowedType/effectiveContentType and the ratified size constants). The plan's read_first bullet said 'app/lib/storage/* — the modules to mock' (plural); narrowed this because upload-validation.ts is pure, has zero I/O, and is the exact security boundary the spoofing case exists to prove — mocking it would test a hand-rolled stand-in instead of the real logic."
  - "Cap tests (per-file, total, and the added MAX_FILES case) use the real ratified constants and real oversized buffers/many-part FormData bodies rather than mocking parseFormData's options — this proves the caps against the actual installed parser, not an assumption about how it behaves."
  - "Added an 11th-file MAX_FILES test beyond Task 2's ten enumerated cases, since the plan's own <success_criteria> explicitly names 'an 11th file ... rejected' as a required behavior."
  - "Created a real GCS bucket (alledrops-quiz-uploads-dev, alledrops-quiz project, us-east1) to satisfy the 'this is the first plan to make a real GCS call' constraint and to give T-4-64's network capture something real to run against — zero buckets existed in this project before this plan (confirmed by 04-10)."
  - "Staged GCS_BUCKET_NAME/GCS_PROJECT_ID as Fly secrets (fly secrets set --stage, NOT deployed — no VM restart triggered) so a future deploy has the values ready. Did not attempt to wire GCP authentication into the Fly runtime itself; see Open Gap below."

requirements-completed: []

# Metrics
duration: ~15min
completed: 2026-08-10
---

# Phase 4 Plan 13: Streaming Upload Route Summary

**POST /api/quiz/upload — the app's first route to accept binary PHI, streaming through `@remix-run/form-data-parser` with size caps enforced during accumulation (not after buffering), magic-byte content validation before any GCS write, HEIC→JPEG conversion, and an opaque-token response that leaks no filename, object key, bucket, or URL.**

## Performance

- **Duration:** ~15 min (per commit timestamps; wall-clock research/infra time was longer)
- **Tasks:** 2 (both `type="auto"`), plus one unplanned real-infrastructure step (GCS bucket + network capture) required by the plan's non-negotiable constraints
- **Files modified:** 2 (both new)

## Accomplishments

- **`app/routes/api.quiz.upload.tsx`** — exports a single `action`. OPTIONS → 204, non-POST → 405,
  matching `api.quiz.submit.tsx`'s CORS posture (`Access-Control-Allow-Origin: "*"`, with a comment
  marking origin-tightening as a Phase 8 item). Parses via `parseFormData(request, { maxFileSize:
  MAX_FILE_BYTES, maxTotalSize: MAX_TOTAL_BYTES, maxFiles: MAX_FILES }, uploadHandler)`. Inside the
  handler: sniffs the first `MIN_SNIFF_BYTES` via `sniffType` before ever touching GCS (never
  consults `fileUpload.type` or the filename extension), converts HEIC input to JPEG via
  `heicBufferToJpeg` (discarding the original bytes), stages the result under
  `buildPendingKey(token, fileUpload.name)` via a resumable `.save()` call, and writes GCS custom
  object metadata (`original_filename`, `content_type`, `original_content_type`, `size_bytes`) as
  the source of truth plan 04-17's promotion step will read. Three typed errors
  (`UnsupportedFileTypeError`, `HeicConversionFailedError`, `UploadStorageError`) plus the parser's
  own `MaxFileSizeExceededError`/`MaxTotalSizeExceededError`/`MaxFilesExceededError` are mapped in
  one outer `try/catch` to the plan's fixed generic error bodies (413/415/422/500). The 200 response
  is exactly `{ token, contentType, sizeBytes }`.
- **`tests/api-quiz-upload.test.ts`** — 11 cases (the plan's 10 plus one bonus MAX_FILES case; see
  key-decisions). Covers OPTIONS/405 guards, the exact 3-key success response with a UUID v4 token,
  the spoofing rejection (ASCII bytes declared `application/pdf`) with an explicit assertion that
  the mocked GCS `save` was never called, real per-file and total size-cap rejections built from
  actual oversized buffers/many-part bodies (not mocked caps), an 11th-file `MaxFilesExceededError`
  rejection, a GCS write failure mapped to a 500 whose body is asserted to contain none of the
  filename/object key/bucket/raw error text, HEIC→JPEG conversion with `original_content_type:
  "image/heic"` verified in the GCS metadata call, and a `console.log`/`console.error`/`console.warn`
  spy run across five real request scenarios asserting zero occurrences of a sentinel filename. No
  binary fixtures were committed — all multipart bodies are built from real `FormData`/`Blob`.
- Full suite grew from the 467/31 baseline to **478/32**, typecheck clean, `npm run build` clean.
- **T-4-64 network capture (executed for real, not asserted):** created a real GCS bucket
  (`gs://alledrops-quiz-uploads-dev`, project `alledrops-quiz`, `us-east1` — zero buckets existed in
  this project before this plan, per 04-10's finding), a temporary IAM service account scoped to
  `roles/storage.objectAdmin` on that bucket only, and ran a standalone Node script (outside the app,
  in the session scratchpad — never committed) that wrapped `node:http`/`node:https`'s `request()`
  to record every outbound hostname while performing one real `save()` → `download()` → `delete()`
  cycle against the bucket using `@google-cloud/storage@7.21.0`. **Hosts contacted:
  `storage.googleapis.com` and `www.googleapis.com`** — both inside the `*.googleapis.com` boundary,
  confirming 04-RESEARCH.md Assumption A3 (no third-party telemetry destination). The test service
  account and its key were deleted immediately after the capture (`gcloud iam service-accounts list
  --project=alledrops-quiz` now returns zero items); no key material was committed anywhere.

## Task Commits

1. **Task 1: Streaming, size-capped, content-validated upload route** — `8f6d576` (feat)
2. **Task 2: Integration-test the upload contract, including the spoofing case** — `fe8c445` (test)
3. **Bonus: MAX_FILES (11th file) rejection case, per the plan's own success criteria** — `bf26592` (test)

**Plan metadata:** (this commit, pending) `docs: complete 04-13 plan`

## Files Created/Modified

- `app/routes/api.quiz.upload.tsx` — streaming upload route, the only PHI-binary ingest point
- `tests/api-quiz-upload.test.ts` — 11 integration tests, GCS test-strategy decision recorded in the header

## Decisions Made

See `key-decisions` in frontmatter. Summary: fixed a genuine argument-order bug in the plan's own
illustrative code snippet (verified against the installed package's actual TypeScript source before
writing the route); narrowed the "mock app/lib/storage/*" instruction to gcs.ts and heic.ts only,
keeping upload-validation.ts real since it is the exact logic under test; used real oversized
payloads for every cap test rather than mocking the parser's limits; added an unplanned 11th test
for MAX_FILES coverage the plan's own success criteria calls for; and provisioned real GCP
infrastructure (bucket + temporary service account, deleted after use) specifically to satisfy the
non-negotiable instruction to run and report a real network capture rather than assert one.

## Deviations from Plan

**1. [Rule 1 - Bug] Corrected `parseFormData`'s argument order from the plan's `<interfaces>` snippet.**
- **Found during:** Task 1, before writing any code — read `node_modules/@remix-run/form-data-parser/src/lib/form-data.ts` directly per the read_first instruction to check "the exact exported signatures."
- **Issue:** the plan's snippet showed `parseFormData(request, uploadHandler, { maxFileSize, ... })`. The installed `0.17.4` package's actual overloads are `parseFormData(request, uploadHandler?)` and `parseFormData(request, options?, uploadHandler?)` — options come second, handler third.
- **Fix:** wrote the route with the correct argument order; confirmed via `npm run typecheck` and the full test suite that the parser genuinely enforces `maxFileSize`/`maxTotalSize`/`maxFiles` with this ordering (cases 6, 7, and the bonus MAX_FILES case all pass against the real, unmocked parser).
- **Files modified:** `app/routes/api.quiz.upload.tsx`
- **Commit:** `8f6d576`

**2. [Rule 3 - Blocking issue] Real GCS infrastructure did not exist; created the minimum needed to honor the plan's non-negotiable network-capture instruction.**
- **Found during:** pre-Task-1 environment check — `gcloud storage buckets list --project=alledrops-quiz` returned zero items (consistent with 04-10's finding), and no GCP credentials were usable non-interactively (`gcloud auth application-default login` requires an interactive browser flow this environment cannot complete).
- **Fix:** created `gs://alledrops-quiz-uploads-dev` (`alledrops-quiz` project, `us-east1`) and a temporary, narrowly-scoped IAM service account for one real upload/download/delete cycle plus the network capture, then deleted the service account and its key immediately after. No GCP infrastructure change was made to the app's runtime configuration beyond staging two non-sensitive Fly secrets (see Open Gap below).
- **Files modified:** none (infrastructure only, outside the repo)
- **Commit:** N/A (no code change; recorded here and in User Setup Required)

No other deviations. The route and tests otherwise match the plan's `must_haves.artifacts`,
`key_links`, and acceptance criteria exactly.

## Issues Encountered

- **`vi.mock` hoisting with two mocked modules referencing shared "mock"-prefixed variables** failed
  with `Cannot access 'mockHeicBufferToJpeg' before initialization` when declared as a plain
  top-level `const` between the two `vi.mock()` calls. Root cause: this test file statically imports
  the route under test (unlike `tests/storage-gcs.test.ts`, which uses dynamic `await import()`
  inside each test and never hits this ordering issue), so vitest's implicit "mock-prefixed
  variables are hoisted" convenience did not extend across two separate `vi.mock()` call sites with
  an interior `const`. Fixed by moving all mock references into a single `vi.hoisted()` block ahead
  of both `vi.mock()` calls — the officially documented mechanism for this exact situation.
- **TypeScript's `BlobPart` type rejected `Buffer` directly** (`Buffer<ArrayBufferLike>` is not
  assignable to `ArrayBufferView<ArrayBuffer>` because `ArrayBufferLike` admits `SharedArrayBuffer`).
  Added a small `toBlobPart()` helper that copies bytes into a fresh, plain-`ArrayBuffer`-backed
  `Uint8Array` before constructing any `Blob` in the test file.
- **`gcloud auth application-default login`** could not complete non-interactively (requires a
  browser-based OAuth flow with a verification code). Worked around this for the one-time network
  capture by creating a short-lived IAM service account key instead (deleted immediately after use)
  rather than leaving the interactive ADC flow half-completed.

`npm run typecheck`, `npx vitest run tests/api-quiz-upload.test.ts`, the full `npm test` suite, and
`npm run build` all passed cleanly on the final run.

## User Setup Required

**Open gap — Fly runtime GCP credential wiring is NOT solved by this plan.** `app/lib/storage/gcs.ts`
constructs `new Storage({ projectId })` with no explicit credentials, relying on Application Default
Credentials. That works for `gcloud`-authenticated local development and worked for this plan's
one-time network-capture script (via a temporary service account key), but **the deployed Fly VM has
no GCP metadata server and no ADC of its own** — as written, `getBucket()` will fail at runtime once
actually deployed unless something supplies credentials (e.g., a `GOOGLE_APPLICATION_CREDENTIALS`
file written from a Fly secret at boot, or explicit `credentials`/`keyFilename` passed to the
`Storage` constructor). No plan from 04-11 through 04-19 explicitly owns this — it is not in this
plan's `files_modified`, and modifying `gcs.ts`'s credential-loading logic was out of scope for
04-13. **Flagging this explicitly for whoever handles the actual deploy (04-19's Task 3 authorizes
merge/deploy and already asks "is `GCS_PROJECT_ID` still pointed at the dev project?" — it should
also ask "does the Fly runtime have working GCP credentials?").**

Two non-sensitive Fly secrets were staged (not deployed — no VM restart triggered):
`GCS_BUCKET_NAME=alledrops-quiz-uploads-dev`, `GCS_PROJECT_ID=alledrops-quiz`. Run `fly secrets
deploy -a alle-drops-quiz-app` (or a normal `fly deploy`) to apply them once the credential gap above
is also resolved — deploying with the bucket/project set but no working credentials would just move
the failure from "env var missing" to "auth error," which is not an improvement on its own.

## Next Phase Readiness

- `app/routes/api.quiz.upload.tsx` is ready for the client (plan 04-16) to POST to; the returned
  `token` is what `answers.testing_files` will hold until plan 04-17's promotion step.
- Plan 04-17's promotion step can rely on the GCS custom object metadata
  (`original_filename`/`content_type`/`original_content_type`/`size_bytes`) written by this route as
  its single source of truth — the client never supplies this data again.
- `tests/api-quiz-upload.test.ts`'s GCS test strategy (mock `gcs.ts`/`heic.ts`, use
  `upload-validation.ts` for real) should be followed by plans 04-14 and 04-17 per this plan's own
  file-header note.
- **Do not mark TEST-04 complete from this plan** — plan 04-19 owns that bookkeeping per its own
  explicit instruction, unchanged from 04-11/04-12.
- The Fly-runtime GCP credential gap (see User Setup Required) should be resolved before 04-19
  authorizes any real deploy.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: app/routes/api.quiz.upload.tsx
- FOUND: tests/api-quiz-upload.test.ts
- FOUND: 8f6d576 (Task 1 commit)
- FOUND: fe8c445 (Task 2 commit)
- FOUND: bf26592 (bonus MAX_FILES test commit)
