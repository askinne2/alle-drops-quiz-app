# Phase 4: Mandatory Allergy Testing - Research

**Researched:** 2026-08-09
**Domain:** Binary PHI upload (multipart parsing, object storage, PDF embedding) on a memory-constrained Node/Fly deployment, plus the flow/consent rewiring already fully specified by 04-UI-SPEC.md
**Confidence:** MEDIUM — the PDF/upload/storage stack is verified against official docs and the npm registry (HIGH), but every storage-target specific (bucket, project, credentials, retention automation) is provisional until Blockers 2–3 clear, and one CONTEXT.md factual claim (quiz-history extension is broken) does not match the code as it exists today.

<user_constraints>
## User Constraints (from CONTEXT.md)

**Status note:** 04-CONTEXT.md is marked ⛔ BLOCKED — do not plan yet. This research proceeds anyway
per the task brief ("Research anyway — the point is to have the plan ready when they clear"), but the
planner must not treat Phase 4 as unblocked. See `<blockers>` below, copied verbatim.

### Blockers (copied verbatim from 04-CONTEXT.md `<blockers>`)

Andrew was shown the cost of keeping upload inside Phase 4 and reaffirmed the choice.

| # | Blocker | Owner | Blocks |
|---|---------|-------|--------|
| 1 | **William agrees to test-result upload, and it is priced.** Reverses his own 2026-07-29 LOCKED decision. $1,800 is already unbilled and the Phase 2 SOW has been unwritten since 6/30. | William / Andrew | All of D-01…D-05 |
| 2 | **Fly.io BAA signed.** Patient-uploaded test results are PHI in a file; they cannot transit or land on Fly without it. Currently an unstarted sales conversation. | Andrew | Upload storage + endpoints |
| 3 | **Production cutover to AOD's Google Cloud project.** Object storage belongs in the account under AOD's BAA, not in Andrew's `alledrops-quiz` dev project. Itself blocked on Google Workspace (Gene, PTO → escalate to Robert). | William / AOD | Upload storage |

**What is NOT blocked and could ship separately if the client conversation stalls:** the Part 7
testing split with three text fields, both bypass deletions (TEST-05), the consent reorder
(TEST-07), the results-copy edit, and TEST-06.

**One dependency was REMOVED by this discussion:** TEST-04 no longer carries a `testing@…` email
address, so the unresolved domain-spelling decision no longer gates Phase 4. It still gates LAUNCH-07.

### Locked Decisions (copied verbatim from 04-CONTEXT.md `<decisions>`)

- **D-01:** Upload is IN Phase 4. Phase 4 does not ship until upload works. Reverses
  `DEC-testing-results-by-email-not-upload` (LOCKED, 2026-07-29). Required before planning: retract
  that decision in place in PROJECT.md, rewrite TEST-04 in REQUIREMENTS.md from email-only to
  required upload, update the Phase 4 ROADMAP.md block. Use `/gsd:phase` to edit, not hand-edits.
- **D-02:** Upload is REQUIRED to continue on the "I've already had allergy testing" branch. No
  optional-with-email-fallback. Accepted cost: a hard abandonment point on a flow that persists
  nothing until the terminal POST.
- **D-03:** PDF + photos, multiple files per submission. Allowlist: PDF, JPEG, PNG, HEIC. Implies a
  file-list UI, per-file AND total size caps, and a one-to-many `submissions → files` relation (not a
  single link column).
- **D-04:** Uploads never touch Shopify, and never leave the BAA chain. Storage target is AOD's GCP
  project under their BAA. No Google Workspace product. No third-party upload widget, no CDN, no
  telemetry-emitting dependency.
- **D-05:** Uploaded files are retrievable three ways — admin, patient ledger, and inline in the
  clinical PDF. The `quiz-history` extension is stated (by CONTEXT.md) to currently be broken — **this
  research found the opposite; see Summary and Open Questions.** The planner must either scope the
  refactor into Phase 4 or raise it as a fourth blocker, UNLESS the live-verification in Open
  Questions #1 shows it already works.
- **D-06:** The testing split is a 7th part in `QUIZ_PARTS`, not a new `FlowStep`. Open sub-question
  for the planner (resolved by 04-UI-SPEC.md): `file_multi` is a normal `QuizQuestion`, not a new
  `QuizItem` union member.
- **D-07:** "I need allergy testing" does NOT exit the quiz — the patient finishes the flow and gets
  the testing link on the results page.
- **D-08:** The branch choice is honor-system, recorded but not enforced. `testing_status` lands in
  `answers_json`; admin gains a read-only, filterable testing-status column. No `reviewed_at` column,
  no PATCH endpoint, no write path — `submissions` stays insert-only.
- **D-09:** Consent sits between the testing step and the results page, on one path for every
  bracket. Fixes a live TEST-07 defect (0–2 patients currently auto-submit without seeing
  `ConsentStep`). Forces deletion of the 0–2 auto-submit `useEffect`, `autoSubmit0to2Attempted`,
  `handleScheduleConsult`, `handleTestFirst`, `handleProceedToPurchase`, `savedToServer` bookkeeping.
- **D-10:** Phase 4 makes a minimal results-copy edit and adds one static CTA. Does NOT do Phase 5's
  job (score retitle stays in Phase 5).
- **D-11:** Phase 4 writes placeholder-free interim consent copy, marked UNCONFIRMED in a code
  comment, added to the William/counsel message.
- **D-12:** The `allergist-on-demand` theme repo is reconciled against live BEFORE TEST-06 is applied
  (Klaviyo drift, orphaned template, quiz.json drift).
- **D-13:** Delete the false no-testing-required clauses now; draft (don't ship) the replacement copy
  for William's approval.
- **D-14:** Verify on authenticated, cache-busted served bytes — never the editor UI or a deploy exit
  code. Count with `SOURCE.split(needle).length - 1`, never `grep -c`.

### Claude's Discretion (copied verbatim from 04-CONTEXT.md)

- Question IDs, `order` values, and part number for the testing section.
- The two option labels' exact wording, and whether Part 7 carries its own heading.
- Progress-indicator wording at seven parts.
- Whether the multi-file picker is a new `QuizItem` union member or fits the existing question-card
  model — **resolved by 04-UI-SPEC.md: `file_multi` is a normal `QuizQuestion`.**
- Storage target specifics (bucket layout, object naming, signed-URL TTL), retention and deletion
  policy, virus scanning, and whether HEIC is converted server-side — all subject to D-04. **This
  research provides concrete recommendations for all of these; the planner should ratify or override
  them explicitly, not treat them as pre-locked.**
- The `submissions → files` relation shape (join table vs. array column). **This research recommends
  a join table — see Don't Hand-Roll / Pitfall 2.**
- Test structure and placement, provided the suite (361 tests / 27 files at phase start) stays green.
- Commit decomposition — except that any migration is its own commit, per Phase 3 D-01's precedent.

### Deferred Ideas (OUT OF SCOPE — copied verbatim from 04-CONTEXT.md)

- Splitting Phase 4 into a cheap unblocked batch + a later upload phase — offered and declined.
- Provider review-status workflow — stays in v2 / Phase 2.5 backlog.
- SCORE-01 (retitle + review copy) — stays in Phase 5, may land early.
- `quiz-history` extension refactor — see Open Questions #1; may not be needed at all.
- Appointly embed keep/disable decision — Phase 8 / needs an explicit decision, third-party JS
  (`staq-cdn.com`/`staqlab.com`) currently live on the PHI-collecting quiz page.
- Mobile sticky-header clearance — worth folding into Phase 4's UAT now that D-12 reconciles the
  theme repo.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Every patient reaches an allergy-testing step before the score page, offering exactly two options and no skip | Fully resolved by 04-UI-SPEC.md (Component Inventory §1, §4); no new research needed — `file_multi`/`radio_single` as normal `QuizQuestion` types, zero new schema mechanism |
| TEST-02 | "I need allergy testing" takes the patient to the storefront testing-options page | Fully resolved by 04-CONTEXT.md D-07 (anchor interceptor, `/pages/test-options` via `redirects.ts`); no new research needed |
| TEST-03 | "I've already had allergy testing" collects Year, Location, and "What Allergens Did You React To?", persisted into `answers_json` | Fully resolved by 04-UI-SPEC.md (`text_input_short` type); no new research needed |
| TEST-04 | Required multi-file PHI upload (reversed from email-only by D-01) — the phase's core new engineering surface | This research's primary contribution: streaming multipart parsing (`@remix-run/form-data-parser`), GCS staging + promotion pattern, magic-byte validation, size caps, HEIC conversion (`heic-convert`), and the `submission_files` join-table design — see Standard Stack, Architecture Patterns, Common Pitfalls |
| TEST-05 | Both no-testing bypasses gone; `ResultsDisplay` terminal with no callback props | Fully resolved by 04-CONTEXT.md D-09/D-10 and 04-UI-SPEC.md Component Inventory §5; this research adds the Validation Architecture test-map entry (source-text guard pattern) |
| TEST-06 | No storefront surface offers/implies a no-testing path | Fully resolved by 04-CONTEXT.md D-12/D-13/D-14 (theme repo reconciliation, served-bytes verification protocol); no new research needed — explicitly out of this research's UI-SPEC-adjacent scope |
| TEST-07 | Consent reachable on every path; every submission records `consent_version` | Fully resolved by 04-CONTEXT.md D-09 (flow reorder, `QuizContainer.tsx` deletions); this research adds the Validation Architecture test-map entry (extend existing `consent-version.test.ts`) |
</phase_requirements>

## Summary

Phase 4's quiz-flow mechanics (Part 7, consent reorder, bypass deletion, results copy) are fully
resolved by `04-CONTEXT.md` and `04-UI-SPEC.md` — this research does not re-derive them. The genuinely
new engineering surface is: (1) a streaming multipart upload endpoint on a 1-shared-CPU/1GB-RAM Fly
machine, (2) Google Cloud Storage as the PHI object store, (3) HEIC→JPEG conversion so a provider can
actually open what a patient uploads, (4) embedding those files into the existing `pdfkit`-generated
clinical PDF, and (5) a `submissions → submission_files` one-to-many relation that must be populated
*after* files already exist in storage, from a single insert-only terminal POST.

The stack that fits this app's existing constraints (pure Node, no native binaries, no telemetry
during PHI processing, reuse before invention) is: **`@remix-run/form-data-parser`** for streaming
multipart parsing with built-in size caps, **`@google-cloud/storage`** for GCS, **`heic-convert`** for
pure-JS HEIC→JPEG conversion, and **`pdf-lib`** to merge converted images and donor PDF pages into the
`pdfkit`-generated base document (pdfkit itself cannot embed another PDF's pages — a long-standing,
still-open limitation). All four packages passed `slopcheck` and registry verification with zero
`[SLOP]` or `[SUS]` findings.

The orphaned-upload problem (flagged in UI-SPEC's Interaction Contract) has a clean answer given how
GCS actually works: stage every upload under a `pending/` prefix with an age-based **Object Lifecycle
Management (OLM)** delete rule scoped to that prefix only, and "promote" (copy to a permanent prefix +
insert `submission_files` rows) at the moment the terminal POST successfully inserts the `submissions`
row. This reuses a GCS-native mechanism instead of a custom cron job, and — critically — the OLM
delete rule must **never** touch the promoted/permanent prefix, which is what reconciles it with the
project's 6-year HIPAA retention constraint.

**One finding that changes phase scope, not just phase content:** `04-CONTEXT.md` D-05 states the
`quiz-history` Customer Account UI extension "still reads PHI metafields that were deleted, and
renders empty state," and flags its refactor as a phase blocker the planner must scope in or raise as
a fourth blocker. Reading the actual source (`extensions/quiz-history/src/QuizHistoryBlock.jsx`) shows
it already calls `GET /api/me/assessments` and links to `GET /api/me/assessment/:id/pdf` — the correct
Fly-API pattern — not Shopify metafields. This refactor landed in commit `ca3c3f4` and was hardened
through `f762aaa` (2026-05-08), months before this discussion. **This needs a live verification, not a
new refactor task** — see Open Questions.

**Primary recommendation:** stream-parse with `@remix-run/form-data-parser`'s built-in `maxFileSize`/
`maxTotalSize` guards (never buffer the full request), pipe each accepted part directly into a GCS
resumable upload under `pending/{uploadToken}/`, return the token to the client as the `file_multi`
answer value, and promote (copy + `submission_files` insert) inside the same handler that runs
`insertSubmission`. Defer virus scanning to a documented risk-acceptance note rather than building
GCP's official ClamAV-on-Cloud-Run pipeline inside this phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Testing-split UI, consent reorder, results copy | Browser / Client (quiz React bundle) | — | Fully specified by 04-UI-SPEC.md; no backend logic needed beyond existing `answers_json` boundary |
| Per-file upload (multipart receive, validate, convert, stage) | API / Backend (new Fly route) | Database/Storage (GCS) | Must never touch the browser directly for PHI bytes beyond the initial POST; must never touch Shopify |
| Object storage (staging + permanent) | Database / Storage (GCS) | — | Target is AOD's GCP project under their BAA (blocked); dev interim is Andrew's `alledrops-quiz` project, same posture as Cloud SQL today |
| Orphan cleanup | Database / Storage (GCS OLM) | API / Backend (promotion logic) | GCS-native age-based deletion scoped to `pending/` avoids a custom cron/worker |
| `submissions → submission_files` linkage | API / Backend (terminal POST handler) | Database / Storage (Cloud SQL Postgres) | Insert-only table; files exist in storage before the row exists, so linkage is a post-insert step in the same request |
| Admin file retrieval | API / Backend (`/app/quiz-results` route + Shopify session auth) | Database/Storage (signed GCS URL) | Reuses `authenticate.admin` + `submission_access_log` pattern already in `api.admin.submission.$id.tsx` |
| Patient file retrieval | API / Backend (`/api/me/*` JWT Bearer) | Database/Storage (signed GCS URL) | Reuses `verifyCustomerToken` + `getSubmissionByIdForCustomer` ownership pattern |
| PDF embedding | API / Backend (`app/lib/pdf.ts`, server-only) | Database/Storage (GCS read) | No remote fonts/images/CSS; reads GCS bytes server-side, never proxies through a browser-facing URL |
| Virus scanning | Out of Phase 4 scope (recommended) | — | GCP's own reference architecture requires standing up Cloud Run + Pub/Sub + a ClamAV DB-mirror pipeline — a project of its own, and blocked on the same GCP cutover as everything else in D-04 |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@remix-run/form-data-parser` | `^0.17.4` [VERIFIED: npm registry, cross-checked against reactrouter.com/how-to/file-uploads] | Streaming multipart parser with `maxFileSize`/`maxTotalSize`/`maxFiles` caps | This is React Router 7's own documented replacement for the removed `unstable_parseMultipartFormData`/`unstable_createFileUploadHandler` APIs — same authorship (remix-run org), designed specifically to avoid buffering uploads in memory before storing them |
| `@google-cloud/storage` | `^7.21.0` [VERIFIED: npm registry] | GCS client (resumable uploads, signed URLs, OLM config) | Official Google-maintained client; no viable non-Google alternative once the storage target is GCS under AOD's BAA |
| `heic-convert` | `^2.1.0` [VERIFIED: npm registry] | Pure-JS HEIC/HEIF → JPEG/PNG decode+encode, no native binary | Confirmed zero native dependencies (`heic-decode`, `jpeg-js`, `pngjs` — all pure JS); the only realistic option that avoids shelling out to ImageMagick, which is not in the Fly image and would violate "no new native binary in the Docker image" without a Dockerfile change |
| `pdf-lib` | `^1.17.1` [VERIFIED: npm registry] | Merge converted images + donor PDF pages into the clinical PDF | Pure JS, zero native dependencies (only `pako`, `tslib`, and its own font/PNG helpers); `pdfkit` (already in use) cannot embed another PDF's pages — see `foliojs/pdfkit#318`, open since 2016, still unresolved |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `uuid` or Node's built-in `crypto.randomUUID()` | n/a (built-in, Node ≥14.17) | Generate the opaque upload token / pending-object key | Node's native `crypto.randomUUID()` is sufficient — no new dependency needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@remix-run/form-data-parser` | Raw `request.formData()` (native Fetch API, available in React Router 7 without any new package) | Buffers every part fully in memory before returning — directly violates "enforce size caps BEFORE the whole body is in memory" on a 1GB Fly machine. Not viable for this phase. |
| `heic-convert` | `sharp` | `sharp` is far more capable (resizing, many formats) but ships prebuilt native binaries per-platform; the Reddit thread found during research explicitly notes "the prebuilt binary doesn't include [HEIC support]" without a separate `libheif` system install — adds Docker image complexity this phase doesn't need for a single conversion path |
| `heic-convert` | Server-side `libheif`/ImageMagick via `child_process` | Works, but shells out to a binary not present in the current Fly image (`@flydotio/dockerfile` auto-builds from `package.json`, not a custom apt-based Dockerfile) — real but avoidable added ops surface |
| `pdf-lib` | `pdf-merger-js`, `hummus`/`muhammara` | `pdf-merger-js` wraps `pdf-lib` (adds nothing); `muhammara` ships native bindings (violates the pure-Node preference and adds build complexity for a one-time merge operation) |
| Fly-proxied upload | Direct browser → GCS via signed PUT URL (Fly only issues the URL) | Legitimate alternative that removes byte-transfer load from the 1GB Fly machine entirely. Tradeoff: server-side magic-byte content-type validation and HEIC conversion can no longer happen inline in the same request — they'd need a second server-side step after the browser reports upload-complete. Documented as Claude's Discretion below, not decided here. |

**Installation:**
```bash
npm install @remix-run/form-data-parser @google-cloud/storage heic-convert pdf-lib
```

**Version verification:** confirmed live against the npm registry 2026-08-09:
```
@remix-run/form-data-parser  0.17.4  (published 2026-07-01, per npm registry `time.modified`)
@google-cloud/storage        7.21.0
heic-convert                 2.1.0
pdf-lib                      1.17.1  (last publish 2022-05-12 — see Assumptions Log A1)
```

## Package Legitimacy Audit

`slopcheck` (v0.6.1) was installed and run successfully against all four candidate packages.

⚠️ **Side-effect note for the planner:** running `slopcheck install <pkgs>` actually executes `npm
install` as part of its check (it is not a dry-run tool). This modified `package.json` and
`node_modules` in this working tree during research; the `package.json` change was reverted via `git
checkout` before this document was written. **Do not run `slopcheck install` again without expecting
it to modify the working tree** — the planner should budget for this or use a scratch directory.

| Package | Registry | Age | Downloads (last week) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|------------------------|--------------|-----------|-------------|
| `@remix-run/form-data-parser` | npm | published 2026-07-01 (new package name, mature codebase — successor to Remix v2's built-in parser) | 48,243 | `github.com/remix-run/remix` | [OK] | Approved |
| `@google-cloud/storage` | npm | first published 2016-08-11 | 15,503,019 | `github.com/googleapis/google-cloud-node` | [OK] | Approved |
| `heic-convert` | npm | established | 1,055,470 | `github.com/catdad-experiments/heic-convert` | [OK] | Approved |
| `pdf-lib` | npm | established, last release 2022-05-12 | 10,926,366 | `github.com/Hopding/pdf-lib` | [OK] (flagged the `-lib` suffix as a naming heuristic, then confirmed established — no action needed) | Approved |

No `postinstall` scripts on any of the four packages (`npm view <pkg> scripts.postinstall` returned
empty for all).

**Packages removed due to slopcheck `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

## Architecture Patterns

### System Architecture Diagram

```
Patient's browser (quiz iframe)
  │
  │ 1. picks a file via .fileUpload dropzone (UI-SPEC §Component Inventory)
  ▼
POST /api/quiz/upload  (NEW route, one file per request, multipart/form-data)
  │
  ├─ 2a. @remix-run/form-data-parser streams the part in, enforcing
  │      maxFileSize / maxTotalSize / maxFiles BEFORE full buffering
  ├─ 2b. magic-byte sniff on the first bytes (never trust the client
  │      Content-Type or file extension) → reject if not PDF/JPEG/PNG/HEIC
  ├─ 2c. if HEIC: heic-convert → JPEG buffer (still stored as the
  │      converted form; original HEIC bytes are NOT kept — see
  │      Common Pitfalls)
  ▼
GCS bucket, prefix pending/{uploadToken}/{originalFilenameSanitized}
  │      (custom object metadata: original_filename, content_type,
  │       size_bytes — single source of truth for the promotion step)
  │      OLM delete rule: age > N days, prefix=pending/  (orphan cleanup)
  ▼
Response: { token: uploadToken, filename, contentType, size }
  │
  │ 3. client stores token in answers.testing_files: string[]
  │    (per UI-SPEC — opaque tokens, not raw blobs)
  ▼
[... rest of quiz flow: consent → terminal submit, unchanged shape ...]
  │
  ▼
POST /api/quiz/submit  (EXISTING route, JSON body, extended answers only)
  │
  ├─ 4. insertSubmission() — existing INSERT, unchanged columns
  ├─ 5. for each token in answers.testing_files:
  │      - read GCS custom metadata for pending/{token}/...
  │      - copy object → submissions/{submission_id}/{file_id}-{filename}
  │      - delete the pending/ copy (GCS has no atomic rename)
  │      - INSERT submission_files row (submission_id FK, storage key,
  │        filename, content_type, size, uploaded_at)
  ▼
Cloud SQL: submissions (unchanged) + submission_files (NEW join table)
GCS: submissions/{id}/... (permanent, NO OLM delete rule — 6-yr retention)

Retrieval (three surfaces, all ownership-bounded, all return SHORT-TTL
signed GCS read URLs rather than proxying bytes through Fly):
  Admin        → /app/quiz-results  (authenticate.admin + submission_access_log)
  Patient      → /api/me/assessment/:id/files/:fileId  (JWT Bearer + getSubmissionByIdForCustomer)
  Clinical PDF → app/lib/pdf.ts reads GCS bytes server-side, embeds via pdf-lib
```

### Recommended Project Structure

```
app/
├── lib/
│   ├── storage/
│   │   ├── gcs.ts              # getBucket(), signed-URL helpers, OLM config (new)
│   │   ├── upload-validation.ts # magic-byte sniff, allowlist, size caps (new)
│   │   └── heic.ts             # heic-convert wrapper (new)
│   ├── submission-files.ts     # insertSubmissionFiles, listFilesForSubmission,
│   │                           # promotion (pending→permanent copy) (new)
│   ├── pdf.ts                  # MODIFIED — embeds images/pages via pdf-lib
│   └── submissions.ts          # UNCHANGED insertSubmission; new caller wires
│                                 # submission_files insert around it, not inside it
├── routes/
│   ├── api.quiz.upload.tsx     # NEW — per-file streaming upload endpoint
│   ├── api.quiz.submit.tsx     # MODIFIED — promotion step added after insertSubmission
│   ├── api.me.assessment.$id.files.$fileId.tsx   # NEW — patient file retrieval
│   └── api.admin.submission.$id.file.$fileId.tsx # NEW — admin file retrieval
migrations/
└── 004_create_submission_files.sql   # NEW — join table, own commit (Phase 3 D-01 precedent)
```

### Pattern 1: Streaming upload with built-in caps
**What:** `parseFormData(request, uploadHandler, { maxFileSize, maxTotalSize, maxFiles })`
**When to use:** the new `/api/quiz/upload` route — the only place this app accepts binary PHI
**Example:**
```typescript
// Source: https://reactrouter.com/how-to/file-uploads (verified against installed
// react-router 7.9.3's documented replacement for unstable_parseMultipartFormData)
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";

const MAX_FILE_BYTES = 15 * 1024 * 1024;   // ~15MB per file — Claude's Discretion, see below
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;  // ~50MB per upload session

export async function action({ request }: ActionFunctionArgs) {
  const uploadHandler = async (fileUpload: FileUpload) => {
    if (fileUpload.fieldName !== "file") return;
    // fileUpload streams from request.body — read only what's needed to
    // sniff magic bytes, then pipe the rest to GCS.
    const token = crypto.randomUUID();
    await streamToGcs(fileUpload, `pending/${token}/${sanitize(fileUpload.name)}`);
    return token; // becomes the FormData value; caller returns it to the client
  };

  const formData = await parseFormData(request, uploadHandler, {
    maxFileSize: MAX_FILE_BYTES,
    maxTotalSize: MAX_TOTAL_BYTES,
    maxFiles: 10,
  });
  // MaxFileSizeExceededError / MaxTotalSizeExceededError are thrown directly —
  // catch by instanceof and map to the UI-SPEC's exact copy strings.
}
```

### Pattern 2: GCS Object Lifecycle Management for orphan cleanup
**What:** age-based delete rule scoped to `pending/` only
**When to use:** the staging prefix, never the permanent `submissions/` prefix
**Example:**
```json
// Source: https://docs.cloud.google.com/storage/docs/lifecycle
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 2, "matchesPrefix": ["pending/"] }
    }
  ]
}
```
⚠️ Google's own docs describe OLM rule evaluation as running roughly once per day, not
real-time — a pending object may live slightly past its nominal age before deletion. Acceptable
for orphan cleanup (not a hard deadline), but do not rely on it for anything time-sensitive.

### Pattern 3: Merge pdfkit output with pdf-lib for image/PDF embedding
**What:** generate the existing text PDF with `pdfkit` unchanged, then post-process with `pdf-lib`
**When to use:** `app/lib/pdf.ts`'s new embedding step
**Example:**
```typescript
// Source: https://pdf-lib.js.org/ (Copy Pages + Embed PNG/JPEG examples, verified)
import { PDFDocument } from "pdf-lib";

const baseBytes = await generateVisitSummaryPdfKit(row); // existing pdfkit output, unchanged
const merged = await PDFDocument.load(baseBytes);

for (const file of submissionFiles) {
  const bytes = await readGcsBytes(file.storage_object_key); // server-side, no HTTP hop
  if (file.content_type === "application/pdf") {
    const donor = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(donor, donor.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  } else {
    // JPEG/PNG only at this point — HEIC was already converted to JPEG at upload time
    const img = file.content_type === "image/png"
      ? await merged.embedPng(bytes)
      : await merged.embedJpg(bytes);
    const page = merged.addPage();
    const dims = img.scaleToFit(page.getWidth() - 100, page.getHeight() - 150);
    page.drawImage(img, { x: 50, y: 50, width: dims.width, height: dims.height });
  }
}
const finalBytes = await merged.save();
```

### Anti-Patterns to Avoid
- **Buffering the full multipart body before validating size:** defeats the entire point of
  streaming on a 1GB Fly machine — always use `maxFileSize`/`maxTotalSize`, never
  `request.formData()` for this route.
- **Trusting the multipart part's `Content-Type` header or the file extension:** both are
  client-supplied and spoofable. Sniff magic bytes (`%PDF`, `FF D8 FF` for JPEG, `89 50 4E 47` for
  PNG, `ftyp` box + `heic`/`heix`/`mif1` brand for HEIC) before accepting a file into the allowlist.
- **Proxying file bytes through the Fly app for admin/patient download:** repeats the same RAM
  pressure as upload. Generate a short-TTL signed GCS URL server-side after the ownership check
  passes, and redirect or return the URL — don't stream the bytes back through Fly.
- **A single GCS lifecycle rule covering the whole bucket:** would eventually delete promoted,
  linked, retained files. The delete rule's `matchesPrefix` must be scoped to `pending/` only.
- **Logging the original filename:** a filename can contain a patient name (e.g.
  `Jane_Doe_allergy_panel.pdf`, which is exactly the kind of filename a patient photographing their
  own paperwork would produce). Log the opaque token/object key and byte counts only — never
  `console.log`/`console.error` the filename, matching CLAUDE.md's existing PHI logging rule which
  today only enumerates `name, dob, phone, email, score, bracket, answers, history` and does not yet
  mention filenames. **Flag this explicitly to the planner as a CLAUDE.md gap this phase should
  close** — see Common Pitfalls.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart streaming with size caps | A custom `busboy`/raw-stream parser with manual byte counting | `@remix-run/form-data-parser`'s `maxFileSize`/`maxTotalSize`/`maxFiles` | These are exactly the DoS-shaped edge cases (many small parts, one huge part, slowloris-style drip) the package's own README says it exists to solve |
| HEIC decoding | A native binding or a `child_process` shell-out to a system tool not in the Fly image | `heic-convert` | Pure-JS decode avoids adding OS-level dependencies to the Fly/Docker image entirely |
| PDF page merging | Manual PDF byte manipulation, or `pdfkit`-only tricks (not supported — see `foliojs/pdfkit#318`) | `pdf-lib`'s `copyPages`/`embedPdf` | This is a solved, well-tested problem; hand-rolling PDF structure parsing is exactly the kind of "deceptively complex" work this section exists to warn about |
| Orphaned-upload cleanup | A custom cron job or worker process polling for stale objects | GCS Object Lifecycle Management, prefix-scoped | GCS runs this natively; no new process, no new scheduling infra, no new failure mode to monitor |
| Signed URL generation | Manually computing GCS's signing algorithm | `@google-cloud/storage`'s `file.getSignedUrl()` | V4 signing has known sharp edges (canonical request formatting); the official client handles it |

**Key insight:** every new problem in this phase already has a first-party or google-maintained
solution. The only place this app should write new logic is the *sequencing* — validate → convert →
stage → promote → link — not the underlying primitives.

## Common Pitfalls

### Pitfall 1: Trusting client-declared MIME type / extension for the allowlist
**What goes wrong:** a patient (or attacker) renames a file, or a browser reports an incorrect
`Content-Type` for HEIC (support is inconsistent across browsers/OSes).
**Why it happens:** the `accept` attribute on `<input type="file">` and the multipart part's
`Content-Type` header are both advisory, not enforced by any browser.
**How to avoid:** sniff the first bytes of the stream server-side against the four known magic-byte
signatures before accepting the file into the pending prefix.
**Warning signs:** a "PDF" that pdf-lib/pdfkit fails to parse at embedding time — by then it's already
in storage; catch it at upload time instead.

### Pitfall 2: `submissions` staying insert-only does not mean `submission_files` must too
**What goes wrong:** conflating D-08's "no `updateSubmission`" rule with "no writes to any table after
the terminal POST" and therefore trying to cram file metadata into the single `insertSubmission` call
before the files are known to exist.
**Why it happens:** the codebase's own established pattern (`app/lib/submissions.ts`) is a single
INSERT with no follow-up writes, and it's tempting to preserve that shape exactly.
**How to avoid:** `submission_files` is a *new*, separate, insert-only table — INSERT into it, N rows,
immediately after `insertSubmission` succeeds and returns the new `id`. This does not touch
`submissions` itself and does not violate D-08.
**Warning signs:** a design that tries to store file tokens as a JSONB array *inside*
`submissions.answers_json` instead of a real join table — loses queryability for the admin/patient
surfaces and re-derives what a real table already gives for free (this is the D-03 "legitimate
exception" the codebase's own established-patterns note flags — see 04-CONTEXT.md `<code_context>`).

### Pitfall 3: GCS has no atomic rename — promotion is copy + delete, and can partially fail
**What goes wrong:** the terminal POST inserts the `submissions` row, then crashes or times out
mid-promotion, leaving some files copied to `submissions/{id}/` and `submission_files` rows only
partially inserted.
**Why it happens:** GCS's "move" is a client-side copy-then-delete, not a single atomic filesystem
rename; a request handler doing N sequential object copies plus N DB inserts has N+1 points of
partial failure.
**How to avoid:** wrap the `submission_files` inserts in one `pg` transaction; treat GCS copy failures
as retryable (the pending copy still exists and its OLM rule hasn't fired yet) rather than fatal to
the whole submission. Explicitly decide and document what the patient sees if file promotion fails
but the submission itself succeeded — this is a real gap the planner must close, not paper over.
**Warning signs:** a `submission_files` row whose GCS object doesn't exist at the permanent key, or a
promoted GCS object with no `submission_files` row (reconciliation query: compare the two).

### Pitfall 4: The Fly VM is 1 shared CPU / 1GB RAM (verified in `fly.toml`)
**What goes wrong:** HEIC decode, JPEG re-encode, and PDF merging are all CPU/memory-real work; doing
them synchronously inside a request handler on a machine this small, concurrently with the existing
Shopify session traffic and Cloud SQL pool (`max: 5` connections), can starve the process.
**Why it happens:** the existing `fly.toml` `[[vm]]` block is unchanged from before this phase and was
sized for a JSON-only API.
**How to avoid:** the planner should explicitly budget for either (a) confirming the 1GB machine
handles the new work under realistic load (a handful of concurrent patients, each uploading up to
~4 photos), or (b) bumping `[[vm]] memory` — `fly.toml` already has a comment noting `memory = '2gb'`
as a documented option. This is infrastructure, not application code, and should be a named task.
**Warning signs:** OOM kills in `fly logs` during upload-heavy testing.

### Pitfall 5: CLAUDE.md's PHI logging rule doesn't yet name filenames
**What goes wrong:** a developer reads CLAUDE.md's enumerated PHI field list (`name, dob, phone,
email, state, quiz_score, score_bracket, answers, personal_history, family_history`), sees
"filename" isn't on it, and logs it for debugging.
**Why it happens:** CLAUDE.md predates this phase; file upload is new PHI surface area the document
hasn't caught up to.
**How to avoid:** the planner should update CLAUDE.md's PHI field list to explicitly include
"uploaded filenames" alongside the existing self-review checklist item about not logging PHI-shaped
values — this is a one-line addition with real consequence given the brief's own observation that a
patient photographing their own paperwork will often produce a personally-identifying filename.

## Code Examples

### Magic-byte sniffing (no new dependency needed)
```typescript
// Source: file signatures per common industry references (ISO/IEC 14496-12 for HEIC's ftyp box,
// RFC-documented JPEG/PNG SOI markers) — hand-verified against a handful of real files during
// research is out of scope for this doc; the planner should validate signatures against real
// device-captured samples, not just spec bytes.
function sniffType(bytes: Uint8Array): "pdf" | "jpeg" | "png" | "heic" | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  // HEIC/HEIF: bytes 4-7 spell "ftyp", brand at bytes 8-11 is one of heic/heix/mif1/msf1/hevc/heim
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (ftyp === "ftyp" && ["heic", "heix", "mif1", "msf1", "heim", "heis"].includes(brand)) return "heic";
  return null;
}
```

### GCS signed read URL, ownership-checked first
```typescript
// Source: https://docs.cloud.google.com/storage/docs/samples/storage-generate-signed-url-v4
// Pattern reused directly from api.me.assessment.$id.pdf.tsx's existing ownership check —
// do this check BEFORE calling getSignedUrl, never after.
const row = await getSubmissionByIdForCustomer({ id, customer_id_shopify: customerId });
if (!row) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
const file = await getSubmissionFile({ submissionId: row.id, fileId: params.fileId });
if (!file) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
const [url] = await bucket.file(file.storage_object_key).getSignedUrl({
  version: "v4",
  action: "read",
  expires: Date.now() + 5 * 60 * 1000, // 5 min — short enough to limit exposure if leaked in a log
});
return new Response(JSON.stringify({ url }), { status: 200, headers: { "Cache-Control": "no-store" } });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Remix v2 `unstable_parseMultipartFormData` / `unstable_createFileUploadHandler` | React Router 7's documented `@remix-run/form-data-parser` package | Documented on the current reactrouter.com how-to page (React Router 7.9.3 is the installed version, per `package.json`) | The old APIs are marked unstable/removed in the current docs — do not reference Remix v2-era tutorials, several of which still show the old imports |

**Deprecated/outdated:**
- `unstable_parseMultipartFormData`: superseded by `parseFormData` from `@remix-run/form-data-parser`
  in the version of React Router this app runs.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pdf-lib` (last published 2022-05-12) is safe to adopt despite no releases in ~4 years, because it is "feature complete" for the copy-pages/embed-image use case and has no open CVEs found during this research pass | Standard Stack | If a security-relevant PDF-parsing bug surfaces later with no maintainer fix available, the app would need to fork or replace it. Low likelihood given the library only *creates/merges* PDFs it also creates — it never parses arbitrary untrusted PDF structure for rendering, which is where most PDF library CVEs live. Still, the planner should re-check for known CVEs at implementation time, not just at research time. |
| A2 | Recommended size caps (15MB/file, 50MB/session) are reasonable for smartphone photos and multi-page scans of a paper allergy panel | Pattern 1 code example | Not derived from any William/AOD input — purely an engineering estimate. If real patient photos run larger (e.g., unusually high-resolution camera settings), patients could hit the cap; if too generous, storage cost risk rises. UI-SPEC left `{N} MB`/`{M} MB` as literal placeholders for exactly this reason — the planner must pick and document real numbers, not treat this research's numbers as locked. |
| A3 | `@google-cloud/storage`'s Node client does not send telemetry to a third party outside the GCP/BAA boundary during normal Storage API calls | Architectural Responsibility Map, hard_constraints | WebSearch found a Go-client-specific `WithDisabledClientMetrics` option referencing gRPC client metrics exported to Cloud Monitoring — that mechanism is documented for the Go/Python gRPC transport, not confirmed either way for the Node client (which historically uses REST/JSON, not gRPC). If the Node client does export similar metrics, they land in Google Cloud Monitoring within the same BAA-covered GCP project — not a third party — so this is a materially lower-risk unknown than e.g. Klaviyo, but should be confirmed with a network capture during implementation before treating it as fully closed. |
| A4 | GCS Object Lifecycle Management rules, scoped by `matchesPrefix`, will not accidentally match objects outside the intended `pending/` prefix | Pattern 2 | Misconfigured prefix matching could delete permanently-retained files, directly violating the project's "never delete submission data" HIPAA constraint. This must be verified with a real bucket + test objects before trusting it in production, not just from documentation. |
| A5 | The `quiz-history` Customer Account UI extension is already functional (calls the Fly API correctly) and does NOT need a refactor, contradicting CONTEXT.md D-05's claim | Summary | If this assumption is wrong — e.g., there's a separate rendering bug in the Shopify Customer Account UI surface unrelated to the data source — treating this as "already done" would leave D-05's third retrieval surface genuinely broken while the plan assumes it works. See Open Questions — this needs a live browser check, not code-reading alone, before the planner decides. |

## Open Questions

> **Status: all four RESOLVED.** Q1 was resolved by independent verification during the plan-phase
> run (2026-08-09) — the claim was stale, confirmed below. Q2, Q3, and Q4 are routed to plan
> **04-10 Task 2**'s `gate="blocking-human"` checkpoint, which ratifies concrete answers before any
> upload code is written. Q3 additionally has a planner-selected default (Fly-proxied, overridable at
> that checkpoint). Retained in full below because the reasoning is what makes the checkpoint
> answerable.

1. **Is `extensions/quiz-history` actually broken in production, or was CONTEXT.md's claim stale?**
   **(RESOLVED 2026-08-09 — the claim was stale. There is no fourth blocker and no refactor task.)**
   Verified independently by the orchestrator: `extensions/quiz-history/src/` contains **zero**
   `metafield` or `alledrops.` references; both `QuizHistoryBlock.jsx` and `QuizHistoryBlock.js`
   `fetch()` `/api/me/assessments` with a Bearer token. `04-CONTEXT.md` D-05 and `04-UI-SPEC.md`
   are corrected in place. Plan **04-18** extends the working component; plan **04-19 check 13** is
   the live render check. Original analysis retained below.
   - What we know: the current source (`QuizHistoryBlock.jsx`) correctly calls
     `GET /api/me/assessments` and links to `GET /api/me/assessment/:id/pdf` — not Shopify metafields.
     This refactor (commit `ca3c3f4`, "refactor quiz-history extension to call Fly API") and its
     subsequent hardening (`f762aaa`, 2026-05-08, "Preact render + HS256 token verification") both
     predate this Phase 4 discussion by three months. `REQUIREMENTS.md` even lists `DONE-07`
     ("Patient assessment ledger + PDF, `quiz-history` customer-profile extension") as **Already
     Satisfied** ("verify, do not rebuild").
   - What's unclear: whether there's a *different*, non-data-source bug (a Shopify Customer Account
     UI rendering/targeting issue, an `api_access`/`network_access` capability gap, or a stale
     deployed extension version vs. the source in this repo) that produces the "empty state" CONTEXT.md
     describes. Code-reading cannot rule this out — it requires a live check in the actual Shopify
     Customer Account UI surface.
   - Recommendation: **before scoping a quiz-history refactor into Phase 4 or raising it as a fourth
     blocker, do a 10-minute live check**: log in as a test customer with a completed submission,
     visit the customer account profile page, and confirm whether the assessment list renders. If it
     already works, D-05's third retrieval surface is free — Phase 4 only needs to add the new
     file-download link inside the existing ledger row, not rebuild the extension. If it's genuinely
     broken, the planner needs the actual failure mode (network error? empty ledger? extension not
     rendering at all?) before scoping a fix, since the fix differs materially by cause.

2. **What are the real per-file and total upload size caps?**
   - What we know: UI-SPEC's copy contract uses literal placeholders (`{N} MB`, `{M} MB`); this
     research's Pattern 1 example uses 15MB/50MB as an engineering estimate, not a sourced number.
   - What's unclear: whether William/AOD has an opinion, and whether the realistic file sizes for
     smartphone photos of a paper allergy panel (the brief's own stated scenario) match this estimate.
   - Recommendation: the planner picks concrete numbers and documents the reasoning (this research's
     estimate is a reasonable default if no better source exists), then the UI-SPEC's copy strings get
     the real values substituted in.

3. **Which upload architecture — Fly-proxied or direct-to-GCS via signed URL?**
   - What we know: both are viable (see Alternatives Considered). Fly-proxied keeps magic-byte
     validation and HEIC conversion inline in one request; direct-to-GCS removes byte-transfer load
     from the constrained Fly machine but requires a second server-side step (triggered how? — a
     follow-up "confirm upload" POST from the client, or a GCS Pub/Sub notification on object
     finalize) to run validation/conversion after the browser's direct PUT completes.
   - What's unclear: whether the added round-trip complexity of direct-to-GCS is worth the RAM
     savings, given Phase 4's realistic concurrency (individual patients, not bulk traffic).
   - Recommendation: start with Fly-proxied (simpler, matches Pattern 1 above, keeps validation
     synchronous and simple to reason about) unless Pitfall 4's load testing shows it's genuinely a
     problem on the current 1GB machine — in which case bump the Fly VM memory first (cheap, one-line
     `fly.toml` change) before reaching for the more complex direct-to-GCS architecture.

4. **Does the storage target for Phase 4 development work against Andrew's `alledrops-quiz` GCP
   project (same as Cloud SQL today), or must it wait for the AOD-owned GCP project (Blocker 3)?**
   - What we know: Cloud SQL already lives in `alledrops-quiz` as an interim dev posture; the roadmap
     treats the AOD cutover as a separate, later migration (LAUNCH-06).
   - What's unclear: whether it's acceptable to build and test the GCS integration against a bucket in
     `alledrops-quiz` now (mirroring the Cloud SQL precedent) and re-parameterize the bucket/project at
     cutover time, or whether Blocker 3 must fully clear before any GCS code is written at all.
   - Recommendation: treat this the same way Cloud SQL was treated — build against a dev bucket in
     `alledrops-quiz` now, with the bucket name driven entirely by an env var (never hardcoded), so the
     re-parameterization at cutover is a config change, not a code change. This does not contradict
     Blocker 3 (which blocks *production* storage, not dev-environment engineering work) but the
     planner should confirm this reading with Andrew before assuming it, since Blocker 1 (William's
     agreement + pricing) arguably also gates writing any upload code at all, not just shipping it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All app code | ✓ | v20.19.6 (within `package.json` engines range `>=20.19 <22 \|\| >=22.12`) | — |
| npm | Package install | ✓ | 10.8.2 | — |
| `gcloud` CLI | Bucket/IAM setup, local testing against GCS | ✓ | Google Cloud SDK 567.0.0 | — |
| `fly` CLI | Deploy, secrets, logs, VM sizing changes | ✓ | v0.4.69 | — |
| GCS bucket in a BAA-covered GCP project | Production PHI object storage | ✗ (blocked) | — | None — this is Blocker 3 itself. Dev-only work can proceed against `alledrops-quiz` per Open Question 4, but production storage genuinely has no fallback and must wait. |
| Fly.io BAA | PHI in transit through the Fly app during upload | ✗ (blocked) | — | None — this is Blocker 2. No fallback; upload cannot ship to production without it. |
| ClamAV / malware scanning service | Optional hardening, not required by any TEST-0X requirement | ✗ (not stood up) | — | Documented risk acceptance (see Common Pitfalls / Summary) — allowlist + magic-byte validation + size caps as the primary mitigation; revisit after GCP cutover gives access to Cloud Run in the AOD-owned project |

**Missing dependencies with no fallback:**
- GCS bucket under AOD's BAA (Blocker 3) and the Fly.io BAA (Blocker 2) — both are Phase 4's own
  named blockers; this research does not attempt to resolve them, per the task brief.

**Missing dependencies with fallback:**
- Malware scanning — deferred with a documented risk acceptance rather than blocking the phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` — `environment: "node"` by default; DOM tests opt in per-file via `// @vitest-environment jsdom` (established in Phase 3's `tests/quiz-part-renderer-dom.test.ts`) |
| Quick run command | `npx vitest run tests/<file>.test.ts` |
| Full suite command | `npm test` (`vitest run`) |
| Baseline at phase start | 361 tests / 27 files, per `.planning/STATE.md` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Exactly two testing-status options, no skip; required gate blocks Next | unit (`isAnswered`/`isPartComplete`) + DOM (`QuizPartRenderer`) | `npx vitest run tests/quiz-schema-type-guarantees.test.ts tests/quiz-part-renderer-dom.test.ts` | ❌ Wave 0 — needs `file_multi`/`radio_single`/`text_input_short` cases added |
| TEST-02 | "I need allergy testing" → storefront testing-options page | DOM (anchor href assertion, same pattern as `redirects.test.ts`) | `npx vitest run tests/quiz-part-renderer-dom.test.ts` | ❌ Wave 0 |
| TEST-03 | Year/Location/Allergens collected and persisted into `answers_json` | unit (schema) + integration (`api.quiz.submit.tsx` payload shape) | `npx vitest run tests/quiz-schema-type-guarantees.test.ts` | ❌ Wave 0 |
| TEST-04 | Upload required to continue on the `had_testing` branch; success/error states per UI-SPEC copy | DOM (file-list add/remove/error rendering) + integration (upload endpoint: size caps, magic-byte rejection, GCS staging) | new `tests/quiz-file-upload-dom.test.ts` + new `tests/api-quiz-upload.test.ts` | ❌ Wave 0 — both files new; no existing upload-endpoint test infra exists anywhere in this repo |
| TEST-05 | `ResultsDisplay` is terminal, zero callback props, both bypasses gone | source-text guard (Phase 3's `tests/quiz-medical-history-deletion.test.ts` pattern — proven RED first) | new `tests/quiz-testing-bypass-deletion.test.ts` | ❌ Wave 0 |
| TEST-06 | Storefront copy no longer offers/implies a no-testing path | manual (theme repo content, authenticated served-bytes check per D-14 — not a `vitest` test at all) | `curl` against authenticated, cache-busted served bytes, occurrence-counted via `split(needle).length - 1`, never `grep -c` | N/A — this requirement is structurally unautomatable inside this repo's test suite |
| TEST-07 | Consent reachable on every path; every submission has a `consent_version` | source-text guard (auto-submit `useEffect` deletion) + integration (`insertSubmission` always receives `consent_version`) | `npx vitest run tests/consent-version.test.ts` (existing — extend, don't replace) | ✅ exists, needs extension |

### Sampling Rate
- **Per task commit:** the specific test file(s) touched by that task (`npx vitest run <file>`)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** full suite green before `/gsd:verify-work`, **plus** the human browser pass below —
  a green suite alone has not been sufficient for this project.

### Wave 0 Gaps
- [ ] `tests/api-quiz-upload.test.ts` — covers TEST-04's server-side contract: size cap rejection
      (`MaxFileSizeExceededError`/`MaxTotalSizeExceededError`), magic-byte rejection of a
      renamed/mistyped file, successful staging to `pending/`, and the returned token shape. Needs a
      fake/mock GCS backend (the `@google-cloud/storage` client can be pointed at the
      `STORAGE_EMULATOR_HOST` env var for a local fake-gcs-server, or mocked directly — the planner
      should pick one approach and be consistent, since no test infra for this exists yet in this repo)
- [ ] `tests/quiz-file-upload-dom.test.ts` — covers the `.fileUpload` widget's add/remove/error-state
      rendering and the required-gate's "only successfully-uploaded files count" rule (UI-SPEC
      Interaction Contract)
- [ ] `tests/quiz-testing-bypass-deletion.test.ts` — source-text guard for D-09's `QuizContainer.tsx`
      deletions (auto-submit `useEffect`, `autoSubmit0to2Attempted`, `handleScheduleConsult`,
      `handleTestFirst`, `handleProceedToPurchase`, `savedToServer`), proven RED against pre-change
      source first, per the established Phase 3 convention
- [ ] `migrations/004_create_submission_files.sql` — no test framework covers raw DDL directly, but a
      new `tests/submission-files.test.ts` (integration, against a real or test Postgres) should cover
      insert + ownership-bounded retrieval, mirroring `tests/assessments-ledger.test.ts`'s existing
      pattern for `submissions`

### ⚠️ Why a green suite is not the finish line on this phase specifically

**Five defects have shipped past a fully green suite in this project.** Three (sessions 32–33) were
wiring bugs closed by Phase 3's DOM test infrastructure. **Two were judgment failures no structural
test caught**: DIAG-01's examples duplicating HIST-01's checklist, and a required medication field
with no escape hatch trapping a healthy patient. Both were caught by a human clicking through the
actual flow, not by CI.

**D-02 makes a required file upload the gate on the single highest-abandonment step in the entire
flow** — structurally the same shape as defect 5 (a required field with a plausible "I'm stuck" case),
one step further along, with a materially higher cost of getting stuck (losing a fully-completed
questionnaire, not just re-answering one field). No DOM test can evaluate whether the UI-SPEC's
"forgiving error copy" actually reads as forgiving to a real patient standing in an exam room, phone in
hand, uncertain whether their photo actually uploaded. **Budget the human browser pass explicitly —
it is not redundant with the DOM tests, and this phase's own risk profile (highest-abandonment point +
newest interaction pattern in the app's history) is a stronger case for it than any prior phase.**
Run it against local, not production — a full run through to submit writes a PHI row (existing
project-wide rule). The script convention is `HANDOFF.md` §"The UAT script Andrew asked for" — extend
it with Phase 4-specific checks: does the file-list clearly show upload success/failure on a real
mobile device; does flipping `testing_status` back and forth after uploading a file behave the way
the Interaction Contract describes; does a deliberately-oversized or wrong-type file produce the exact
UI-SPEC error copy, not a generic browser error.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (retrieval only) | Existing patterns reused unchanged: Shopify session auth for admin (`authenticate.admin`), JWT Bearer HS256 for patient (`verifyCustomerToken`) |
| V3 Session Management | no (new surface area) | No new session mechanism introduced |
| V4 Access Control | yes | Every file retrieval route must re-run the existing ownership check (`getSubmissionByIdForCustomer`/`getSubmissionByIdForAdmin`-equivalent for files) before generating a signed URL — never trust a `fileId` alone |
| V5 Input Validation | yes | Magic-byte content sniffing (not extension/MIME trust), `maxFileSize`/`maxTotalSize`/`maxFiles` enforcement, filename sanitization before use in a storage key |
| V6 Cryptography | yes (indirectly) | GCS-managed encryption at rest (default, no code needed); signed URLs use Google's own V4 signing via `@google-cloud/storage` — never hand-roll HMAC signing |
| V12 File Handling | yes | This is the category ASVS most directly aims at this phase: file type allowlisting, size limits, no execution of uploaded content, storage outside any web-servable document root (GCS objects are never directly public — always behind signed URLs with short TTLs) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated storage-cost DoS (the upload endpoint has no per-patient identity yet — nothing has been submitted) | Denial of Service | `maxFileSize`/`maxTotalSize`/`maxFiles` caps (already planned); CORS-origin restriction matching the existing `api.quiz.submit.tsx` pattern; flagged as an Open Question for stronger mitigation (rate limiting) — not decided here |
| MIME-type spoofing to smuggle an executable disguised as an allowed type | Tampering | Magic-byte sniffing before acceptance (Pitfall 1 / Code Examples) |
| IDOR on file retrieval (guessing/enumerating `fileId` values across submissions) | Elevation of Privilege / Information Disclosure | Ownership check (submission_id match, not just file existence) before every signed-URL generation, on all three retrieval surfaces |
| Signed URL leakage via logs/referrer | Information Disclosure | Short TTL (5 min, per Code Examples); `Cache-Control: no-store` on the response that carries the URL; never put the signed URL itself in a query string that could hit access logs upstream of the app |
| Malicious file content opened by the provider (e.g., an infected PDF/JPEG) | Tampering | No automated scanning in Phase 4 (documented risk acceptance — see Summary/Environment Availability); allowlist + magic-byte validation as the primary control; force `Content-Disposition: attachment` on all downloads (never inline-render an uploaded file in a browser context), matching the existing PDF route's pattern |

## Sources

### Primary (HIGH confidence)
- https://reactrouter.com/how-to/file-uploads — official React Router 7 file-upload guide, confirms
  `@remix-run/form-data-parser` as the current documented approach and the removal of
  `unstable_parseMultipartFormData`/`unstable_createFileUploadHandler`
- npm registry (`npm view`) — version, publish date, dependency tree, and postinstall-script checks
  for all four recommended packages, run directly against the live registry 2026-08-09
- https://pdf-lib.js.org/ — official pdf-lib docs, Copy Pages / Embed PNG and JPEG Images / Embed PDF
  Pages examples
- https://github.com/foliojs/pdfkit/issues/318 — confirms pdfkit cannot embed another PDF's pages,
  open/unresolved
- https://docs.cloud.google.com/storage/docs/lifecycle — official GCS Object Lifecycle Management docs
- https://docs.cloud.google.com/storage/docs/samples/storage-generate-signed-url-v4 — official V4
  signed URL sample (Node.js)
- `slopcheck` v0.6.1 — run directly against all four candidate packages, zero `[SLOP]`/`[SUS]` findings
- Direct codebase reads: `app/lib/pdf.ts`, `app/lib/customer-auth.ts`, `app/lib/submissions.ts`,
  `app/lib/db.ts`, `app/lib/quiz-validation.ts`, `app/routes/api.quiz.submit.tsx`,
  `app/routes/api.me.assessments.tsx`, `app/routes/api.me.assessment.$id.pdf.tsx`,
  `app/routes/api.admin.submission.$id.tsx`, `extensions/quiz-history/src/QuizHistoryBlock.jsx`,
  `extensions/quiz-history/shopify.extension.toml`, `migrations/001_create_submissions.sql`,
  `package.json`, `fly.toml`, `app/lib/quiz/types.ts`, `vitest.config.ts`, `tests/` directory listing,
  `git log` on `extensions/quiz-history/src/QuizHistoryBlock.jsx`

### Secondary (MEDIUM confidence)
- https://docs.cloud.google.com/architecture/automate-malware-scanning-for-documents-uploaded-to-cloud-storage
  — Google's own reference architecture for ClamAV-on-Cloud-Run malware scanning; used to assess
  scope/effort of adding virus scanning, not to recommend building it in Phase 4
- Reddit (r/googlecloud, r/webdev) — community sentiment on GCP's ClamAV scanning quality and on
  `sharp`'s HEIC support gap; corroborated by, not substituted for, the primary sources above

### Tertiary (LOW confidence)
- Go-client `WithDisabledClientMetrics` telemetry finding (Assumption A3) — found via WebSearch,
  confirmed for the Go/Python gRPC transport but not confirmed either way for the Node REST client;
  flagged in the Assumptions Log rather than stated as fact

## Metadata

**Confidence breakdown:**
- Standard stack (upload/storage/PDF packages): HIGH — every package version-verified against the
  live npm registry and cross-checked against official docs, with a clean `slopcheck` pass
- Storage-target specifics (bucket, project, credentials, exact retention automation): LOW — provably
  can't be higher until Blockers 2–3 clear; this research documents the *pattern*, not the
  *configuration*
- The quiz-history extension finding: MEDIUM — HIGH confidence the code calls the correct API (direct
  source read + git history), but LOW confidence on whether it renders correctly in the live Shopify
  Customer Account UI surface, which this research could not check without a live session
- Architecture/patterns for upload+storage+embedding: HIGH — grounded in official docs for every
  library recommended
- Pitfalls: MEDIUM — derived from direct codebase reading (RAM constraint, insert-only pattern,
  logging rule) combined with well-documented general PHI/file-upload security practice, not from a
  Phase-4-specific incident history (there isn't one yet — this is new surface area for this app)

**Research date:** 2026-08-09
**Valid until:** 2026-08-23 (14 days) — shorter than the usual 30-day default because this phase is
explicitly blocked on three client-side items whose resolution (BAA terms, GCP project identity,
William's pricing conversation) could change storage-target specifics; the upload/PDF/HEIC library
research itself is stable for the usual 30 days, but the document as a whole should be re-checked
against whichever blocker clears first
