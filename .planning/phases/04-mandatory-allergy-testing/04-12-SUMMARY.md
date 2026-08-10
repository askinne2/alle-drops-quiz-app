---
phase: 04-mandatory-allergy-testing
plan: 12
subsystem: storage
tags: [gcs, google-cloud-storage, heic-convert, magic-byte-sniffing, hipaa, file-upload]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "04-UPLOAD-DECISIONS.md's ratified env var names/constants/architecture (plan 04-10) and app/lib/db.ts's lazy-init singleton pattern (Phase 1)"
provides:
  - "app/lib/storage/gcs.ts — lazy-init, env-driven GCS bucket client with sanitizing key builders, signed-URL issuance, and promotion primitives"
  - "app/lib/storage/upload-validation.ts — magic-byte sniffType/isAllowedType/effectiveContentType and the ratified MAX_FILE_BYTES/MAX_TOTAL_BYTES/MAX_FILES constants"
  - "app/lib/storage/heic.ts — heicBufferToJpeg, a non-throwing HEIC→JPEG conversion wrapper"
affects: ["04-13 (upload endpoint composes all three modules)", "04-14/04-15 (signed-URL download routes)", "04-16 (UI-SPEC copy substitution uses MAX_FILE_BYTES/MAX_TOTAL_BYTES)", "04-17 (promotion step uses copyObject/deleteObject and the pdf.ts embedding path uses readObjectBytes)", "04-19 (human pass re-validates HEIC signatures against a real device-captured file)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy-init, env-driven singleton client (getBucket) extended from app/lib/db.ts's getPool() shape to a second external service"
    - "Discriminated non-throwing result type ({ ok: true, ... } | { ok: false, reason }) for a conversion step that can legitimately fail on untrusted input"
    - "Ambient .d.ts module declaration for a dependency that ships no TypeScript types (heic-convert)"

key-files:
  created:
    - app/lib/storage/gcs.ts
    - app/lib/storage/upload-validation.ts
    - app/lib/storage/heic.ts
    - app/lib/storage/heic-convert.d.ts
    - tests/storage-gcs.test.ts
    - tests/upload-validation.test.ts
  modified: []

key-decisions:
  - "sanitizeObjectName accepts `unknown` (not `string`) so a malformed/non-string multipart field degrades to a generated placeholder instead of a type-unsafe call site needing its own guard"
  - "GCS_PENDING_PREFIX/GCS_PERMANENT_PREFIX/SIGNED_URL_TTL_SECONDS are literal module constants (not env vars) — 04-UPLOAD-DECISIONS.md only flags GCS_BUCKET_NAME/GCS_PROJECT_ID as 'env var, never hardcode'; the prefixes and TTL are ratified fixed values"
  - "heic-convert has no published types and no @types/heic-convert package exists — added a minimal ambient declaration (app/lib/storage/heic-convert.d.ts) covering only the single-image conversion signature this app uses, rather than pulling in an unofficial types package"
  - "tests/upload-validation.test.ts holds both Task 2's magic-byte/cap tests and Task 3's heic.ts tests in one file, per the plan's own instruction ('Extend tests/upload-validation.test.ts (or add a sibling block in the same file)'); committed incrementally by temporarily trimming the file to its Task-2-only content for the Task 2 commit, then restoring the full file for the Task 3 commit, so each commit's diff matches its task's actual scope"
  - "No live network capture was run against @google-cloud/storage in this plan (04-RESEARCH.md Assumption A3 remains open) — the threat register (T-4-57) explicitly assigns that capture to plan 04-13, which is the first plan to make a real (non-mocked) GCS call; this plan's tests mock @google-cloud/storage entirely"

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-08-10
---

# Phase 4 Plan 12: Storage Primitives — GCS Client, Magic-Byte Validation, HEIC Conversion Summary

**Three independently-testable, env-driven storage primitives (GCS client, magic-byte content sniffer, pure-JS HEIC→JPEG converter) that the upload route (plan 04-13) will compose — zero routes, zero database writes, zero real GCS calls in this plan.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-10T21:05:00Z (approx)
- **Completed:** 2026-08-10T21:20:00Z (approx)
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 6 (all new)

## Accomplishments

- **`app/lib/storage/gcs.ts`** — `getBucket()` memoizes a module-level singleton, reading
  `GCS_BUCKET_NAME`/`GCS_PROJECT_ID` from `process.env` only; throws a config-instruction error
  naming the missing variable (mirrors `app/lib/db.ts`'s `DATABASE_URL` error style) rather than
  connecting with an undefined value. Zero string literals in the file resemble a bucket or project
  name (`git grep -nE "alledrops-quiz|gs://" app/lib/storage/` returns nothing). `sanitizeObjectName`
  strips `..` sequences, control characters (including null bytes), and path separators, then falls
  back to a generated `unnamed-{uuid}` placeholder if nothing survives — `buildPendingKey` and
  `buildPermanentKey` are proven to always land inside their configured prefix for six adversarial
  filename inputs (`../../etc/passwd`, `..\..\windows\system32`, `/abs/path.pdf`, a null-byte name,
  an all-separator name, and an empty string). `getSignedReadUrl` issues v4, `action: "read"`,
  300-second (`SIGNED_URL_TTL_SECONDS`) signed URLs with `responseDisposition: attachment; filename="..."`
  so an uploaded file is never inline-rendered. `readObjectBytes`/`copyObject`/`deleteObject` are
  added for plan 04-17's promotion step; none of them are called by this plan.
- **`app/lib/storage/upload-validation.ts`** — `sniffType` implements the four magic-byte
  signatures (PDF `%PDF`, JPEG `FFD8FF`, PNG `89504E47`, HEIC `ftyp` box + one of six brands) and
  never trusts declared `Content-Type` or file extension. Handles buffers shorter than the bytes a
  given signature needs by returning `null` before indexing into the HEIC brand bytes. `MAX_FILE_BYTES`
  (15 MB), `MAX_TOTAL_BYTES` (50 MB), and `MAX_FILES` (10) are written as explicit `N * 1024 * 1024`
  arithmetic with a comment citing 04-UPLOAD-DECISIONS.md Section 4 item 4, the exact ratification
  source. No `throw` statement anywhere in the file.
- **`app/lib/storage/heic.ts`** — `heicBufferToJpeg` wraps `heic-convert` (`format: "JPEG",
  quality: 0.85`) and returns `{ ok: true, jpeg: Buffer } | { ok: false, reason: string }` instead
  of throwing; the failure `reason` is the underlying library's error message, never a filename.
  Header documents why conversion happens at all (pdf-lib embeds only JPEG/PNG; most desktop
  browsers can't open HEIC), that only the converted JPEG is retained (original HEIC bytes are
  discarded), the `content_type` (`image/jpeg`) vs `original_content_type` (`image/heic`) split
  migration `004` records, and why `heic-convert` specifically (pure JS, adds no native binary to
  the Fly image). `app/lib/storage/heic-convert.d.ts` is a minimal ambient module declaration since
  the package ships no types and no `@types/heic-convert` exists on the registry.
- **Tests** — `tests/storage-gcs.test.ts` (13 cases, mocks `@google-cloud/storage`) and
  `tests/upload-validation.test.ts` (20 cases: 18 for magic-byte sniffing/caps, 2 for
  `heicBufferToJpeg` with `heic-convert` mocked). The spoofing case (ASCII text bytes with a
  notional `.pdf` filename returning `null`) and both `heic`/`mif1` HEIC brands are explicitly
  covered. No binary HEIC fixture was committed — conversion success/failure are both exercised
  against a mocked `heic-convert`.
- Full suite grew from the 434/29 baseline to **467/31**, typecheck clean, `npm run build` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: GCS client module with env-driven config and key builders** - `fa17261` (feat)
2. **Task 2: Magic-byte content validation and the size-cap constants** - `7c8086f` (feat)
3. **Task 3: HEIC to JPEG conversion wrapper** - `92b204c` (feat)

**Plan metadata:** (this commit, pending) `docs: complete 04-12 plan`

## Files Created/Modified

- `app/lib/storage/gcs.ts` — env-driven GCS client, key sanitization, signed URLs, promotion primitives
- `app/lib/storage/upload-validation.ts` — magic-byte sniffer, allowlist, ratified size caps
- `app/lib/storage/heic.ts` — non-throwing HEIC→JPEG conversion wrapper
- `app/lib/storage/heic-convert.d.ts` — ambient module declaration for the untyped `heic-convert` package
- `tests/storage-gcs.test.ts` — 13 tests, `@google-cloud/storage` fully mocked
- `tests/upload-validation.test.ts` — 20 tests covering magic-byte sniffing, size caps, and HEIC conversion

## Decisions Made

See `key-decisions` in frontmatter. Summary: `sanitizeObjectName` widened to accept `unknown` rather
than `string` for a stronger non-throwing guarantee at adversarial call sites; the two GCS prefixes
and the signed-URL TTL are literal ratified constants (not env vars, unlike the bucket/project);
`heic-convert` needed a hand-written ambient `.d.ts` since neither it nor `@types/heic-convert`
ships types; the combined test file was committed incrementally (trimmed to Task 2's scope, then
restored to the full Task 2 + Task 3 content) so each task's commit diff matches its actual scope;
and no live network capture against `@google-cloud/storage` was performed here since the threat
register assigns that check to plan 04-13, the first plan to make a real (non-mocked) call.

## Deviations from Plan

None — plan executed exactly as written. All three modules, their exports, and their test coverage
match the plan's `must_haves.artifacts` and acceptance criteria exactly.

## Issues Encountered

One in-session correction, not a deviation from the plan's intent: the first draft of
`sanitizeObjectName`'s control-character regex was written with a typo that the file-write tooling
round-tripped as literal raw control bytes in the source file (visually indistinguishable from the
intended `\x00-\x1f\x7f` character class in a terminal, but not the same source text). Caught by
inspecting the file byte-for-byte with `od -c` before running tests, then corrected with `perl -i -pe`
to the literal escape-sequence form. Verified afterward that the corrected regex behaves identically
(all sanitization tests pass) and that the file no longer contains raw control bytes.

`npm run typecheck`, both `npx vitest run` invocations, the full `npm test` suite, and `npm run build`
all passed cleanly after that correction.

## User Setup Required

None for this plan. No route, no database call, and no real (non-mocked) GCS/heic-convert call was
made — this is pure library code exercised entirely against mocks. `GCS_BUCKET_NAME`/`GCS_PROJECT_ID`
do not need to be set as Fly secrets until plan 04-13's upload endpoint actually calls `getBucket()`.

## Next Phase Readiness

- `app/lib/storage/gcs.ts`, `app/lib/storage/upload-validation.ts`, and `app/lib/storage/heic.ts` are
  ready for plan 04-13's upload endpoint to compose: stream → `sniffType`/`isAllowedType` → (if HEIC)
  `heicBufferToJpeg` → `buildPendingKey` → GCS write.
- Plan 04-13 must set `GCS_BUCKET_NAME` and `GCS_PROJECT_ID` as Fly secrets before its route can call
  `getBucket()` for real, and per this plan's threat register (T-4-57) must run a real network
  capture during an upload to confirm `@google-cloud/storage`'s Node client makes no calls outside
  `*.googleapis.com` (04-RESEARCH.md Assumption A3 is still open).
- `readObjectBytes`, `copyObject`, and `deleteObject` are unused by any caller yet — plan 04-17 is
  the first consumer (promotion step and PDF-embedding read path).
- **Do not mark TEST-04 complete from this plan** — no route, no persistence wiring, and no live
  storage call exists yet. This SUMMARY's `requirements-completed` is intentionally empty; plan
  04-19 owns that bookkeeping per this plan's explicit instruction.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: app/lib/storage/gcs.ts
- FOUND: app/lib/storage/upload-validation.ts
- FOUND: app/lib/storage/heic.ts
- FOUND: app/lib/storage/heic-convert.d.ts
- FOUND: tests/storage-gcs.test.ts
- FOUND: tests/upload-validation.test.ts
- FOUND: fa17261 (Task 1 commit)
- FOUND: 7c8086f (Task 2 commit)
- FOUND: 92b204c (Task 3 commit)
