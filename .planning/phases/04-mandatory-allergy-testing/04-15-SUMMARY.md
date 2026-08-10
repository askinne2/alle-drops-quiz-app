---
phase: 04-mandatory-allergy-testing
plan: 15
subsystem: api
tags: [pdf-lib, pdfkit, pdf-merge, image-embedding, gcs, hipaa, phi]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-11's listFilesForSubmission (uploaded_at ASC-ordered data-access layer) and 04-12's readObjectBytes (authenticated GCS byte read)"
provides:
  - "app/lib/pdf.ts's generateVisitSummaryPdf extended with a Test Results (Part 7) section and pdf-lib post-processing that embeds a submission's uploaded files as additional PDF pages"
  - "A generic, reusable per-file degradation pattern (readObjectBytes/PDFDocument.load/image-embed failures each cost one note page identified by file id + byte size, never the whole download) that later plans embedding untrusted bytes can reuse"
affects: ["04-16 (patient upload widget's files are what this plan's embedding step ultimately renders)", "04-19 (still owns marking TEST-04 complete and running migration 004)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pdfkit generates the base clinical document; pdf-lib post-processes its output (copyPages for donor PDFs, embedJpg/embedPng for images) because pdfkit itself cannot merge another PDF's pages (foliojs/pdfkit#318)"
    - "Per-file try/catch degradation: any failure (unreadable object, malformed donor, failed image embed) appends a plain-text note page identified by file id + byte size and continues with the remaining files, so one bad upload never fails the whole clinical PDF"
    - "Zero-file fast path: if listFilesForSubmission returns [] (or itself fails), the function returns the base pdfkit bytes completely unchanged rather than round-tripping through pdf-lib, keeping today's no-uploads output byte-for-byte structurally identical"
    - "Defensive zero-offset Uint8Array copy before embedJpg/embedPng — works around a pdf-lib bug where its JPEG/PNG parsers read `imageData.buffer` directly via DataView, ignoring byteOffset/byteLength, which would misparse a Buffer sliced from a larger pooled allocation as corrupt"

key-files:
  created: []
  modified:
    - app/lib/pdf.ts
    - tests/pdf.test.ts

key-decisions:
  - "generateVisitSummaryPdf's signature changed from a Promise-executor function returning Promise<Buffer> to an async function returning Promise<Buffer> — no caller changes were needed because both existing callers (api.me.assessment.$id.pdf.tsx, api.admin.assessment.$id.pdf.tsx) already `await generateVisitSummaryPdf(row)`."
  - "listFilesForSubmission failures (a DB error, not a bad upload) are caught and degrade to the base document rather than propagating — the clinical record itself already rendered successfully by that point, and a metadata-lookup failure for the optional attachments must not turn a working PDF into a 500."
  - "The Test Results section is placed after Symptom Responses and before the conditional Consent Record, following the same sectionHeader/labelValue pattern and getAnswerLabel source as every other section — no second label map was introduced (testing_status/testing_year/testing_location/testing_allergens were already in format.ts's ANSWER_LABELS map from plan 04-06/04-14, so zero changes to format.ts were needed)."
  - "Test fixtures for JPEG/PNG embedding are inline base64 byte literals (a 67-byte 1x1 PNG, a minimal 1x1 JPEG); PDF donor fixtures are built at test time with pdf-lib's own PDFDocument.create()/addPage()/save() — no binary files were committed to the repo."

requirements-completed: []  # TEST-04 stays owned by plan 04-19 per this plan's explicit instruction — not marked complete here.

# Metrics
duration: ~20min
completed: 2026-08-10
---

# Phase 4 Plan 15: Inline PDF Embedding of Uploaded Test-Result Files Summary

**`generateVisitSummaryPdf` now embeds a submission's uploaded test-result files (PDF pages merged, images placed full-page) via pdf-lib post-processing of pdfkit's output, with per-file degradation to a note page and zero outbound network calls beyond the authenticated GCS read.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-10T01:53:00Z (approx)
- **Completed:** 2026-08-10T02:00:00Z
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 2

## Accomplishments

- **Test Results section.** `app/lib/pdf.ts`'s base pdfkit document gained a "Test Results"
  section (Part 7: `testing_status`, `testing_year`, `testing_location`, `testing_allergens`),
  rendered through the same `sectionHeader`/`labelValue`/`getAnswerLabel` pattern as every other
  section — no new label map, reusing the mappings `format.ts` already carried from plans
  04-06/04-14.
- **pdf-lib post-processing.** The exported `generateVisitSummaryPdf` is now: build the base
  pdfkit document (internal `generateBasePdf`), then — only if `listFilesForSubmission` returns
  at least one row — load the base bytes with `pdf-lib`, `copyPages` every page of each
  `application/pdf` donor, `embedJpg`/`embedPng` each image onto its own full page, and append a
  plain-text note page (file id + byte size only, never filename) for any unsupported content
  type. A submission with zero uploaded files returns the base pdfkit bytes completely
  unchanged — verified structurally: both the pre-04-15 code and the new zero-files path produce
  a 1-page document for the same test row.
- **Mandatory per-file degradation.** Every per-file operation — `readObjectBytes`,
  `PDFDocument.load` on a donor, `embedJpg`/`embedPng` — is wrapped in try/catch. A failure on
  any one file appends a note page and continues with the rest; no per-file error can reject the
  whole promise or turn a clinician's PDF download into a 500.
- **Defensive Buffer-offset fix (Rule 1).** While building the test fixtures, discovered that
  `pdf-lib`'s JPEG/PNG embedders construct `new DataView(imageData.buffer)` directly, ignoring
  `byteOffset`/`byteLength` — a real bug that misparses a Buffer sliced from a larger pooled
  allocation (something Node's Buffer machinery can produce) as corrupt, throwing `SOI not found
  in JPEG` on genuinely valid bytes. Added a `toZeroOffsetBytes` helper that copies to a fresh,
  zero-offset `Uint8Array` before every `embedJpg`/`embedPng` call, applied in production code
  (not just tests) since `readObjectBytes`'s return value shape isn't guaranteed never to hit this
  case.
- **Zero outbound network calls.** `readObjectBytes` is the only external I/O in the embedding
  path — a direct authenticated `@google-cloud/storage` client read, never a public-URL `fetch()`.
  Confirmed via the plan's own verify script (`fetch(` absent, no remote URL outside a comment)
  and `git grep -n "fetch(" app/lib/pdf.ts` (zero matches).
- **Test coverage** (`tests/pdf.test.ts`, extended not replaced): all 4 pre-existing tests updated
  to explicitly mock `listFilesForSubmission` (previously relied on an accidental DB-connection
  failure to reach the same degrade-to-base-doc path — now deterministic and mock-driven, matching
  plan 04-13's mocking strategy) plus 11 new tests covering the Test Results section, the
  no-files-regression golden page count, JPEG/PNG/PDF-donor embeds with exact page-count deltas,
  file-order preservation, three independent degradation paths (unreadable object, malformed
  donor, unsupported content type), and a console-spy PHI guard proving no filename ever reaches
  `console.log`/`console.error`.
- Full suite grew from the 495/34 baseline to **506/34**, typecheck clean, `npm run build` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the Test Results section and pdf-lib post-processing** — `e3bf1c7` (feat)
2. **Task 2: Test the embedding paths, the no-files path, and degradation** — `15a3198` (test)

**Plan metadata:** (this commit, pending) `docs: complete 04-15 plan`

## Files Created/Modified

- `app/lib/pdf.ts` — `generateBasePdf` (internal, pdfkit-only, now includes the Test Results
  section) + exported async `generateVisitSummaryPdf` (pdf-lib post-processing: embed, merge,
  degrade), plus `drawImagePage`, `appendNotePage`, and `toZeroOffsetBytes` helpers
- `tests/pdf.test.ts` — 4 existing tests updated to explicit mocks + 11 new tests (15 total)

## Decisions Made

See `key-decisions` in frontmatter. Summary: kept the exported function's `Promise<Buffer>`
contract while changing its internal implementation strategy to async/await (zero caller
changes required); chose to degrade rather than propagate on `listFilesForSubmission` failure
since the clinical record must still render even if the optional-attachments lookup fails; reused
the existing label infrastructure for the new section instead of adding a parallel map; and fixed
a real (if narrow) pdf-lib parsing bug defensively in production code, not just in tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pdf-lib's JPEG/PNG embedders can misparse a Buffer with a nonzero byteOffset**
- **Found during:** Task 1, while building the JPEG test fixture for Task 2's Case 2
- **Issue:** `pdf-lib`'s `JpegEmbedder.for` (and the equivalent PNG path) build a `DataView`
  directly over `imageData.buffer` — the *underlying* ArrayBuffer, not the view's own
  `byteOffset`/`byteLength` window. A `Buffer` allocated from Node's internal pool (which
  `Buffer.from(base64, 'base64')` can produce for small inputs, and which `bucket.file().download()`
  is not contractually guaranteed never to return) can have `byteOffset > 0` and a `.buffer` far
  larger than the actual image data, causing `dataView.getUint16(0)` to read garbage and throw
  `SOI not found in JPEG` on genuinely valid image bytes.
- **Fix:** Added a `toZeroOffsetBytes(bytes)` helper (`new Uint8Array(bytes)`, which copies into a
  fresh, exactly-sized, zero-offset buffer) and applied it before every `embedJpg`/`embedPng` call
  in `generateVisitSummaryPdf` — not only in the test fixtures, since production `readObjectBytes`
  bytes carry the same theoretical exposure.
- **Files modified:** `app/lib/pdf.ts`
- **Verification:** Confirmed the bug reproduces with a manual pooled-buffer simulation, confirmed
  the fix resolves it, and Task 2's Case 2/Case 3 tests exercise the real `embedJpg`/`embedPng`
  code paths end-to-end (not mocked) against the fixed helper.
- **Commit:** `e3bf1c7`

**2. [Rule 2 - Missing critical functionality] `listFilesForSubmission` failure was not addressed by the plan's explicit degradation list**
- **Found during:** Task 1, deciding what happens if the attachments-metadata lookup itself fails
  (distinct from a per-file `readObjectBytes`/embed failure, which the plan explicitly covers)
- **Issue:** The plan's degradation requirements name `readObjectBytes` rejecting, `PDFDocument.load`
  throwing on a malformed donor, and image-embed failures — all per-file. It does not explicitly
  address a failure of the file-listing call itself (a DB error). Left unguarded, that failure
  would propagate and turn an otherwise-successful clinical PDF render into a 500, contradicting
  the plan's own success criterion ("the clinical record still has to render").
- **Fix:** Wrapped `listFilesForSubmission(row.id)` in try/catch; on failure, logs (submission id
  only) and returns the base pdfkit bytes, matching the existing zero-files degrade path.
- **Files modified:** `app/lib/pdf.ts`
- **Verification:** `tests/pdf.test.ts`'s 4 pre-existing (now explicitly-mocked) tests exercise the
  happy path; the original unmocked behavior (before this plan added mocks) exercised this exact
  fallback live against a real, unreachable-in-test DB connection and passed, confirming the
  fallback works under a genuine connection failure, not just a mock.
- **Commit:** `e3bf1c7`

---

**Total deviations:** 2 auto-fixed (1 bug fix in a third-party library's parsing behavior, 1
missing-critical-functionality addition for a failure mode the plan's per-file list didn't
explicitly name but its own success criteria required covering).
**Impact on plan:** Both were necessary for the plan's own "the clinical record still has to
render" and "one bad file costs one page, never the whole download" success criteria to hold in
all cases, not just the ones the plan's task text enumerated. No scope creep — no new files, no
new dependencies, no architectural change.

## Issues Encountered

None beyond the deviations above. `npm run typecheck`, `npm run build`, and the full `npm test`
suite (506 tests / 34 files, up from the 495/34 baseline) all passed cleanly on the final run.

## User Setup Required

None for this plan. No external service was touched, no DDL was executed, and no new package was
installed (`pdf-lib` was already installed by plan 04-10). The Fly-runtime GCP credential gap
flagged in 04-13's summary remains open and unaffected by this plan — this plan's own tests never
call the real `@google-cloud/storage` client (`readObjectBytes` is fully mocked).

## Next Phase Readiness

- `generateVisitSummaryPdf` is ready to render real uploaded files as soon as plan 04-16 ships the
  upload widget and migration 004 (still plan 04-19's to execute) creates `submission_files` in
  `alledrops_quiz_dev`.
- **Do not mark TEST-04 complete from this plan** — plan 04-19 owns that bookkeeping, unchanged
  from every prior plan in this phase.
- The zero-offset-Buffer defensive fix is a general-purpose hardening that any future code
  embedding images via `pdf-lib` in this codebase should reuse (`toZeroOffsetBytes` is currently
  file-local to `app/lib/pdf.ts`; promote it to a shared helper if a second call site appears).

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: app/lib/pdf.ts
- FOUND: tests/pdf.test.ts
- FOUND: .planning/phases/04-mandatory-allergy-testing/04-15-SUMMARY.md
- FOUND: e3bf1c7 (Task 1 commit)
- FOUND: 15a3198 (Task 2 commit)
