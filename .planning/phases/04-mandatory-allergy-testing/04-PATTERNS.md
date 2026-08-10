# Phase 4: Mandatory Allergy Testing - Pattern Map

**Mapped:** 2026-08-09
**Files analyzed:** 24 (11 new, 13 modified)
**Analogs found:** 22 / 24 (2 have no real analog — flagged, not invented)

**Read first:** `CLAUDE.md` compliance rules 1–6 apply to every file below that touches the PHI
path (everything except the storefront/theme-repo work, which is out of this repo). Filenames are
PHI-shaped (RESEARCH.md Pitfall 5) — no pattern excerpt below logs a filename, and none should be
copied in a way that adds one.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/routes/api.quiz.upload.tsx` (NEW) | route/controller | streaming file-I/O | `app/routes/api.quiz.submit.tsx` (structure) + **no multipart precedent exists** | partial — see ⚠️ below |
| `app/lib/storage/gcs.ts` (NEW) | service | file-I/O | `app/lib/db.ts` | role-match (lazy-init client, not pool, but same posture) |
| `app/lib/storage/upload-validation.ts` (NEW) | utility | transform | `app/lib/quiz-validation.ts` | role-match (pure validation, safe-default returns) |
| `app/lib/storage/heic.ts` (NEW) | utility | transform | `app/lib/quiz-validation.ts` (style only) | weak — no conversion precedent anywhere in repo |
| `app/lib/submission-files.ts` (NEW) | model/data-access | CRUD, ownership-bounded | `app/lib/submissions.ts` | exact (same file, same conventions, extend directly) |
| `migrations/004_create_submission_files.sql` (NEW) | migration | batch/DDL | `migrations/002_create_submission_access_log.sql` | exact (child table pattern, FK to `submissions`) |
| `app/routes/api.me.assessment.$id.files.$fileId.tsx` (NEW) | route/controller | request-response, ownership-bounded | `app/routes/api.me.assessment.$id.pdf.tsx` | exact |
| `app/routes/api.admin.submission.$id.file.$fileId.tsx` (NEW) | route/controller | request-response, admin-auth | `app/routes/api.admin.submission.$id.tsx` | exact |
| `app/routes/api.quiz.submit.tsx` (MODIFIED — promotion step) | route/controller | CRUD + file-I/O | itself (existing file) | exact — extend in place |
| `app/lib/pdf.ts` (MODIFIED — pdf-lib embedding) | service | transform, file-I/O | itself (existing file) | exact — extend in place |
| `app/lib/quiz/types.ts` (MODIFIED — new `QuestionType`s) | model/types | transform | itself (existing file) | exact |
| `app/lib/quiz/schema.ts` (MODIFIED — `isAnswered` cases) | utility (pure) | transform | itself (existing file) | exact |
| `app/lib/quiz/questions.ts` (MODIFIED — `QUIZ_PARTS[6]`) | model/config | transform | itself (existing file, `PART6_MEDICAL_HISTORY` as the immediately-prior precedent) | exact |
| `app/components/quiz/QuizPartRenderer.tsx` (MODIFIED — `file_multi`/`text_input_short`/`radio_single` branches) | component | request-response (form input) | itself (existing file, `text_input`/`control_0_3` cases) | exact |
| `app/components/quiz/QuizContainer.tsx` (MODIFIED — D-09 deletions + rewiring) | component/orchestrator | event-driven | itself (existing file) | exact |
| `app/components/quiz/ResultsDisplay.tsx` (MODIFIED — terminal, prop shrink) | component | request-response (display) | itself (existing file) | exact |
| `app/components/quiz/ConsentStep.tsx` (MODIFIED — copy edit only) | component | — | itself (existing file, line 56) | exact |
| `app/lib/format.ts` (MODIFIED — new `ANSWER_LABELS` entries) | utility | transform | itself (existing file, Phase 3's HIST entries as precedent) | exact |
| `extensions/quiz-history/src/QuizHistoryBlock.jsx`/`.js` (MODIFIED — file download links) | component (Shopify Customer Account UI) | request-response | itself (existing file) | exact |
| `app/styles/quiz.module.css` (MODIFIED — `.fileUpload*` family) | config/style | — | itself (`.questionCard`/`.infoBlockCard`/`.questionCard__optionVertical` families) | exact |
| `tests/api-quiz-upload.test.ts` (NEW) | test | integration | `tests/assessments-ledger.test.ts` (mocking pattern) | role-match — no upload-endpoint test precedent exists |
| `tests/quiz-file-upload-dom.test.ts` (NEW) | test | DOM | `tests/quiz-part-renderer-dom.test.ts` | exact |
| `tests/quiz-testing-bypass-deletion.test.ts` (NEW) | test | source-text guard | `tests/quiz-medical-history-deletion.test.ts` | exact |
| `tests/submission-files.test.ts` (NEW) | test | integration | `tests/assessments-ledger.test.ts` | exact |
| `tests/consent-version.test.ts` (MODIFIED — extend) | test | unit | itself (existing file) | exact |
| `tests/quiz-schema-type-guarantees.test.ts` (MODIFIED — extend) | test | unit/typecheck | itself (existing file) | exact |
| `CLAUDE.md` (MODIFIED — add "uploaded filenames" to PHI field list) | config/docs | — | itself, line 5 (the existing PHI field enumeration) | exact |

---

## Pattern Assignments

### `app/routes/api.quiz.upload.tsx` (NEW route, streaming multipart)

**Analog:** `app/routes/api.quiz.submit.tsx` — for the CORS/method-guard/error-shape scaffolding
only. **⚠️ There is no multipart handler anywhere in this repo.** `api.quiz.submit.tsx` parses
JSON or urlencoded `formData()` (line 59, `request.formData()`), never a streamed multipart body —
do not copy that line as if it were the multipart pattern; it is the wrong tool for this route
(RESEARCH.md's own "Anti-Patterns to Avoid": `request.formData()` buffers fully in memory).

**Reusable scaffolding from `api.quiz.submit.tsx`** (lines 20-31, CORS headers + JSON response helper):
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Shop-Domain",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
```

**Method-guard pattern** (lines 44-50):
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  // ...
```

**Error-shape convention** — every failure returns `{ error: string }` with a matching status code,
and every caught error is logged with an IDs-and-counts-only message (never the raw error object if
it could carry request data):
```typescript
} catch (dbErr) {
  console.error("[submit] Cloud SQL INSERT failed:", dbErr);
  return jsonResponse({ error: "Could not save assessment" }, 500);
}
```

**New capability this route must invent (RESEARCH.md Pattern 1 is the source of truth, not this
repo)**: streaming size-capped multipart parsing via `@remix-run/form-data-parser`'s `parseFormData`
+ `uploadHandler`, magic-byte sniffing before acceptance, staging to `pending/{token}/` in GCS. See
04-RESEARCH.md "Pattern 1" and "Code Examples / Magic-byte sniffing" for the only concrete code this
repo can draw on — there is no in-repo precedent to fall back to.

**PHI logging constraint specific to this route:** the existing `console.log("[submit] OK", {...})`
pattern at `api.quiz.submit.tsx:188-193` logs only IDs/booleans/counts — replicate that shape exactly
(token, byte count, content-type-after-sniff) and never include `fileUpload.name` in any log call.

---

### `app/lib/storage/gcs.ts` (NEW — GCS client module)

**Analog:** `app/lib/db.ts` — the lazy-init, module-singleton client pattern.

**Full pattern to copy** (`app/lib/db.ts:17-51`):
```typescript
import pg from "pg";
const { Pool } = pg;
let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (_pool) return _pool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure as a Fly secret pointing at Cloud SQL " +
        "(format: postgresql://USER:PASS@HOST:5432/DB)."
    );
  }
  _pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 5, /* ... */ });
  _pool.on("error", (err) => { console.error("[db] unexpected pool error:", err); });
  return _pool;
}
```

**Apply the same shape to GCS:** `getBucket()` (or `getStorageClient()`) that throws a clear
configuration error if the bucket-name/project env var is missing, memoizes a module-level
singleton, and never connects at import time. Env-var-driven bucket name (never hardcoded) is
explicit in RESEARCH.md Open Question 4 — mirror `db.ts`'s `DATABASE_URL`-from-env convention
exactly, including the "throw with a config instruction" error message style (not a silent
undefined).

**Header-comment convention** — `db.ts:1-16` documents identifiers (instance name, IP, TLS mode)
directly above the code. `gcs.ts` should carry the equivalent for the bucket (name, project, the
dev-vs-BAA-project caveat from RESEARCH.md Open Question 4) so a future reader isn't guessing.

**Do not copy:** the `pg.Pool` connection-pooling mechanics themselves — GCS's Node client has no
pool concept. Only the *lazy-init singleton + env-driven config + thrown config error* shape
transfers.

---

### `app/lib/storage/upload-validation.ts` (NEW — magic-byte sniff, allowlist, size caps)

**Analog:** `app/lib/quiz-validation.ts` for the "pure function, safe-default return, no throw"
convention (matches `app/lib/quiz/schema.ts`'s stated house style: "nothing in this directory
throws"). No in-repo file does magic-byte sniffing — the concrete implementation must come from
04-RESEARCH.md's "Code Examples / Magic-byte sniffing" section, reproduced here for the planner:

```typescript
// Source: 04-RESEARCH.md "Code Examples / Magic-byte sniffing"
function sniffType(bytes: Uint8Array): "pdf" | "jpeg" | "png" | "heic" | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (ftyp === "ftyp" && ["heic", "heix", "mif1", "msf1", "heim", "heis"].includes(brand)) return "heic";
  return null;
}
```

**House convention to apply:** never trust `Content-Type` or extension (RESEARCH.md Pitfall 1) —
sniff bytes server-side before accepting into the pending prefix. Return a typed null/false on
failure, matching `evaluateShowIf`'s and `isAnswered`'s "safe default, never throw" pattern.

---

### `app/lib/storage/heic.ts` (NEW — `heic-convert` wrapper)

**No analog exists in this repo** — this is genuinely new capability (image format conversion has
never been done here). Treat 04-RESEARCH.md's Standard Stack entry for `heic-convert` (pure-JS,
no native binary) as the sole source of truth for the implementation shape. The only thing this
repo can lend is style: keep it a small, single-purpose function (`heicBufferToJpeg(buf): Promise<Buffer>`)
consistent with `app/lib/pdf.ts`'s single-exported-function shape, and never let it throw uncaught —
wrap conversion failures into the same `{ error: string }` response shape the upload route uses.

---

### `app/lib/submission-files.ts` (NEW — join-table data access)

**Analog:** `app/lib/submissions.ts` — copy this file's conventions directly; it is the load-bearing
analog for the entire phase's HIPAA posture.

**Ownership-bounded query pattern to replicate exactly** (`app/lib/submissions.ts:150-174`,
`getSubmissionByIdForCustomer`) — **this is a HIPAA requirement, not a style preference**:
```typescript
export async function getSubmissionByIdForCustomer(args: {
  id: string;
  customer_id_shopify?: string | null;
  email?: string | null;
}): Promise<SubmissionFullRow | null> {
  const pool = getPool();
  const sql = `
    SELECT *
      FROM submissions
     WHERE id = $1
       AND (
         ($2::text IS NOT NULL AND customer_id_shopify = $2)
         OR
         ($3::text IS NOT NULL AND patient_email = $3)
       )
     LIMIT 1
  `;
  const result = await pool.query<SubmissionFullRow>(sql, [
    args.id, args.customer_id_shopify ?? null, args.email ?? null,
  ]);
  return result.rows[0] ?? null;
}
```
The new `getSubmissionFileForCustomer({ submissionId, fileId, customer_id_shopify, email })`
must join through `submissions` the same way — **never** `SELECT * FROM submission_files WHERE id = $1`
alone. Ownership is proven by joining to a `submissions` row the caller is entitled to see, exactly
like the PDF route already does (see below).

**Admin (no-ownership-constraint) counterpart to replicate** (`app/lib/submissions.ts:251-261`,
`getSubmissionByIdForAdmin`) — same shape, no customer/email filter, because Shopify session auth
(not ownership) is the gate:
```typescript
export async function getSubmissionByIdForAdmin(id: string): Promise<SubmissionFullRow | null> {
  const pool = getPool();
  const result = await pool.query<SubmissionFullRow>(
    'SELECT * FROM submissions WHERE id = $1 LIMIT 1', [id]
  );
  return result.rows[0] ?? null;
}
```

**Insert pattern** (`app/lib/submissions.ts:55-102`, `insertSubmission`) — parameterized `$1..$n`,
explicit column list, `RETURNING` clause:
```typescript
const sql = `
  INSERT INTO submissions ( /* explicit column list */ )
  VALUES ($1, $2, /* ... */)
  RETURNING id, symptom_profile_id, created_at
`;
const result = await pool.query<SubmissionRow>(sql, params);
return result.rows[0];
```
Apply directly to `insertSubmissionFiles(submissionId, files[])` — **RESEARCH.md Pitfall 2 is
explicit that this is a NEW, separate, insert-only table**, populated in a follow-up call after
`insertSubmission` succeeds, not folded into that single INSERT and not written to
`submissions.answers_json` (D-03's stated exception to the "extend `answers_json`, never the
top-level schema" rule — a file cannot live in a JSON blob).

**Access-log pattern to extend, not reinvent** (`app/lib/submissions.ts:264-279`,
`logSubmissionAccess`) — the admin file-download route should call this exactly like
`api.admin.submission.$id.tsx` already does, with `action` extended to include a file-download
variant if the planner wants finer audit granularity than the existing `'pdf'` value covers:
```typescript
export async function logSubmissionAccess({ submission_id, actor_shop, action }: {
  submission_id: string | null; actor_shop: string; action: 'list' | 'detail' | 'pdf';
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO submission_access_log (submission_id, actor_shop, action) VALUES ($1, $2, $3)`,
    [submission_id, actor_shop, action]
  );
}
```

**Transaction note (RESEARCH.md Pitfall 3):** the N-file promotion (GCS copy + `submission_files`
INSERT per file) has no existing transactional precedent in this codebase — `submissions.ts` never
wraps multiple statements in a client-level transaction today (every function above calls
`pool.query` directly, not `pool.connect()` + `client.query('BEGIN')`). The planner must introduce
that pattern fresh for the promotion step; there is nothing to copy for it here.

---

### `migrations/004_create_submission_files.sql` (NEW)

**Analog:** `migrations/002_create_submission_access_log.sql` — closest structural match (a new
child table with a `submission_id` FK, own commit, own grants), not `001` (which is the original
table, not a child-table precedent).

**Full pattern to copy** (`migrations/002_create_submission_access_log.sql`):
```sql
CREATE TABLE IF NOT EXISTS submission_access_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID        REFERENCES submissions(id),   -- NULL for 'list' actions
  actor_shop     TEXT        NOT NULL,
  action         TEXT        NOT NULL CHECK (action IN ('list', 'detail', 'pdf')),
  accessed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_log_submission ON submission_access_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessed   ON submission_access_log(accessed_at DESC);

GRANT SELECT, INSERT ON submission_access_log TO alledrops_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alledrops_app;
```
**Apply directly:** `submission_files` needs `id UUID PK`, `submission_id UUID REFERENCES
submissions(id) NOT NULL` (NOT NULL here, unlike the access log — every file row belongs to exactly
one submission, no "list action" analog), `storage_object_key TEXT NOT NULL`, `original_filename`
(⚠️ PHI — same column-comment-your-PHI convention `001_create_submissions.sql` uses under "Identity
(PHI)"), `content_type TEXT NOT NULL`, `size_bytes INTEGER NOT NULL`, `uploaded_at TIMESTAMPTZ NOT
NULL DEFAULT now()`. Grant `SELECT, INSERT` only — **no `UPDATE`, no `DELETE`**, matching D-08's
insert-only posture (note `001_create_submissions.sql:47` grants `UPDATE` on `submissions` even
though nothing currently uses it — do not copy that unused grant forward onto the new table; be
stricter here since D-08 explicitly locks insert-only).

**Migration-safety commentary convention** (`migrations/003_drop_medical_history_legacy_columns.sql`
header, lines 1-29) — a destructive-adjacent migration documents: required backup taken first (with
ID/timestamp/status "read back, not assumed from exit code"), required deploy-before-migrate
ordering, and a pre-migration row count to diff against. `004` is additive (`CREATE TABLE`), so most
of this doesn't apply — but the **row-count-before-any-migration discipline** is still load-bearing
per CONTEXT.md's `<specifics>`: *"The `submissions` table is test data only... If a real patient has
completed the quiz by the time Phase 4 runs, any migration decision must stop and be re-raised."*
Carry that check forward into `004`'s own header comment.

**Extension needed alongside this migration:** `migrations/002`'s `action` CHECK constraint
(`'list', 'detail', 'pdf'`) may need a file-download value added if the admin file route logs a
distinct action — that would be a small `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` in the
same migration file or a follow-up `005`, planner's call.

---

### `app/routes/api.me.assessment.$id.files.$fileId.tsx` (NEW — patient file retrieval)

**Analog:** `app/routes/api.me.assessment.$id.pdf.tsx` — nearly line-for-line applicable; this is
the strongest analog match in the whole phase.

**Full auth-then-ownership-then-fetch sequence to copy** (`api.me.assessment.$id.pdf.tsx:12-68`):
```typescript
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 1. Extract Bearer token
  const authHeader = request.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim() ?? ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 2. Verify token
  let customerId: string
  try {
    const payload = await verifyCustomerToken(token)
    customerId = payload.customerId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 3. Fetch submission (ownership-scoped) — AUTH AND OWNERSHIP BEFORE ANY QUERY
  const { id } = params
  // ... getSubmissionByIdForCustomer({ id, customer_id_shopify: customerId }) ...
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
  // 4. THEN do the expensive/binary work (PDF gen there; signed-URL gen here)
```

**Directly reusable for the new route:** swap step 4 from `generateVisitSummaryPdf(row)` to
`getSubmissionFileForCustomer({ submissionId: row.id, fileId: params.fileId, customer_id_shopify:
customerId })` (returns 404 the same way if not found) then generate a short-TTL signed GCS URL —
04-RESEARCH.md's "Code Examples / GCS signed read URL" section shows this exact next step, explicitly
built as an extension of this route's pattern:
```typescript
// Source: 04-RESEARCH.md, explicitly modeled on this route's ownership check
const [url] = await bucket.file(file.storage_object_key).getSignedUrl({
  version: 'v4', action: 'read', expires: Date.now() + 5 * 60 * 1000,
})
return new Response(JSON.stringify({ url }), {
  status: 200, headers: { 'Cache-Control': 'no-store' },
})
```

**Response-shape note:** the existing PDF route returns the binary directly
(`Content-Disposition: attachment`); the new file route should return a signed URL as JSON instead
(RESEARCH.md Anti-Patterns: never proxy file bytes through Fly for retrieval — that's the PDF
route's one deliberate divergence, don't copy the binary-streaming part, only the auth/ownership
scaffolding).

---

### `app/routes/api.admin.submission.$id.file.$fileId.tsx` (NEW — admin file retrieval)

**Analog:** `app/routes/api.admin.submission.$id.tsx` — full pattern to copy.

**Auth + access-log sequence** (`api.admin.submission.$id.tsx:6-53`):
```typescript
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  let shop: string
  try {
    const { session } = await authenticate.admin(request)
    shop = session.shop
  } catch (e) {
    if (e instanceof Response) return e
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  // ... getSubmissionByIdForAdmin(id) ...
  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[admin] fetched submission id=${id} shop=${shop}`)   // ID only, never PHI
  logSubmissionAccess({ submission_id: id, actor_shop: shop, action: 'detail' }).catch(
    (err) => console.error('[admin] access log write failed:', err)
  )

  return new Response(JSON.stringify(row), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
```
Apply the same shape: `authenticate.admin` first, then look up the file (via the new
`getSubmissionFileForAdmin` or a two-step `getSubmissionByIdForAdmin` + `getSubmissionFile`), then
`logSubmissionAccess` fire-and-forget with `.catch()` (never `await` it — a slow/failed audit write
must not block the response), then return either a signed URL (per the patient route's pattern) or
a 404. **Never** `console.log` the row itself here — the existing line logs `id` and `shop` only,
already correct; do not widen it to include `row` when adapting.

---

### `app/routes/api.quiz.submit.tsx` (MODIFIED — promotion step)

Extend this file in place. The insert-then-branch structure is already present at
`app/routes/api.quiz.submit.tsx:153-172` (step 3, "INSERT to Cloud SQL"). The promotion step (copy
`pending/{token}/...` → `submissions/{id}/...`, insert `submission_files` rows) is a **new step 3.5**
inserted immediately after `insertSubmission` succeeds and before step 4 (metafields):
```typescript
// existing, unchanged
const inserted = await insertSubmission({ ...quizData, /* ... */ });
submissionId = inserted.id;
submissionCreatedAt = inserted.created_at;
```
```typescript
// NEW — promote each testing_files token, following submissions.ts's insert conventions
// (see submission-files.ts pattern above). Wrap in a transaction per RESEARCH.md Pitfall 3;
// decide and document what the patient sees if this step fails but insertSubmission succeeded.
```
Keep the existing try/catch-per-step granularity (`api.quiz.submit.tsx` already treats each numbered
step as its own try/catch with a distinct log prefix like `[submit]`) — the promotion step should
get its own try/catch and its own `console.error("[submit] file promotion failed:", ...)` (IDs and
counts only) rather than being folded into the surrounding INSERT's catch block.

---

### `app/lib/pdf.ts` (MODIFIED — pdf-lib embedding)

**Analog:** itself, as it exists today — text-only `pdfkit` generation (`app/lib/pdf.ts:20-112`).
This is D-05's third retrieval surface and RESEARCH.md's Pattern 3 is the concrete addition:

```typescript
// existing, unchanged shape — generateVisitSummaryPdf still returns Promise<Buffer> via pdfkit
export function generateVisitSummaryPdf(row: SubmissionFullRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    // ... existing sections: header, patient info, assessment results, symptom responses, consent ...
    doc.end()
  })
}
```
```typescript
// NEW — Source: 04-RESEARCH.md Pattern 3, post-processes the existing pdfkit output
import { PDFDocument } from "pdf-lib";
const baseBytes = await generateVisitSummaryPdfKit(row); // existing function, unchanged
const merged = await PDFDocument.load(baseBytes);
for (const file of submissionFiles) {
  const bytes = await readGcsBytes(file.storage_object_key); // server-side, no HTTP hop
  if (file.content_type === "application/pdf") {
    const donor = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(donor, donor.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  } else {
    const img = file.content_type === "image/png" ? await merged.embedPng(bytes) : await merged.embedJpg(bytes);
    const page = merged.addPage();
    const dims = img.scaleToFit(page.getWidth() - 100, page.getHeight() - 150);
    page.drawImage(img, { x: 50, y: 50, width: dims.width, height: dims.height });
  }
}
const finalBytes = await merged.save();
```
**House convention to preserve:** `getAnswerLabel` from `app/lib/format.ts` is already the single
source of truth this file and `app.quiz-results.tsx` both consume (`app/lib/pdf.ts:3,81`) — do not
introduce a second, file-embedding-specific label map. The `sectionHeader`/`labelValue` helper
functions at `pdf.ts:47-56` are the established micro-pattern for adding a new section; a "Test
Results" section heading before the embedded pages, using `sectionHeader('Test Results')`, is
consistent with the rest of the document rather than appending images with no heading at all.
**Constraint:** no remote fonts/images/CSS, no outbound network calls during PHI processing
(`CLAUDE.md` PHI checklist) — `readGcsBytes` must be a direct authenticated GCS read, never a
public-URL `fetch()`.

---

### `app/lib/quiz/types.ts` (MODIFIED — three new `QuestionType` values)

**Analog:** itself. The union at `app/lib/quiz/types.ts:6-14` is a flat string-literal union with a
trailing comment per member describing scoring behavior:
```typescript
export type QuestionType =
  | "checkbox_multi" // Check all that apply — each checked = 1 point
  | "radio_multi" // Select one or more from list — each selected = 1 point (except exclusions)
  | "severity_0_3" // ...
  | "text_input" // Free text — used for medication list, no score
  | "control_0_3"; // Medication control: Completely(0)/Well(0)/Somewhat(1)/Poorly(2)/Not at all(3)
```
**Add exactly three members, same comment convention**, per UI-SPEC's Component Inventory §1
(locked): `"file_multi"` (answer shape `string[]`, no score — Part 7 is outside
`ALL_SCORED_QUESTIONS`), `"text_input_short"` (single-line variant of `text_input`, no score),
`"radio_single"` (single required choice, no score — UI-SPEC's recommended name over reusing
`control_0_3`, see the zero-diff alternative UI-SPEC documents if the planner prefers not to add a
type). No change to `QuizQuestion`, `ShowIfCondition`, or `QuizItem` — UI-SPEC explicitly resolves
D-06's open sub-question: `file_multi` is a normal `QuizQuestion`, not a new `QuizItem` union member.

---

### `app/lib/quiz/schema.ts` (MODIFIED — `isAnswered` switch)

**Analog:** itself, `isAnswered` (`app/lib/quiz/schema.ts:57-78`) — the exact one-line-per-group
diff UI-SPEC's Component Inventory §1 already specifies verbatim:
```typescript
export function isAnswered(
  question: QuizQuestion,
  value: string | string[] | number | undefined
): boolean {
  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi":
    case "file_multi":                                    // NEW
      return Array.isArray(value) && value.length > 0;
    case "text_input":
    case "text_input_short":                               // NEW
      return typeof value === "string" && value.trim().length > 0;
    case "severity_0_3":
    case "frequency_0_4":
    case "bother_0_4":
      return typeof value === "number";
    case "yesno":
      return value === "yes" || value === "no";
    case "control_0_3":
    case "radio_single":                                   // NEW
      return typeof value === "string" && value.length > 0;
    default:
      return false;
  }
}
```
**Nothing else in `schema.ts` changes** — `evaluateShowIf`, `visibleItems`, `visibleAnswers`,
`itemsForPart`, `toggleOption` are all generic over `question.type` already and need zero new code
(this is the file's own stated design goal, restated in its header comment). Confirms UI-SPEC's
claim that this is the entire blast radius in this file.

---

### `app/lib/quiz/questions.ts` (MODIFIED — Part 7)

**Analog:** itself, `PART6_MEDICAL_HISTORY` (`app/lib/quiz/questions.ts:271` onward) as the
immediately-prior precedent for "a new part attached to `QUIZ_PARTS`, not scored." Read the full
block before writing Part 7 — it is this repo's only working example of a `showIf`-gated,
multi-child part with an info block.

**Attachment point** (`app/lib/quiz/questions.ts:476-488`):
```typescript
export const QUIZ_PARTS: QuizItem[][] = [
  // PART1..PART5 (scored)
  // ...
  PART6_MEDICAL_HISTORY,
  // NEW: PART7_TESTING here
];
export const ALL_ITEMS: QuizItem[] = QUIZ_PARTS.flat();
```
**Hard constraint restated from CONTEXT.md/RESEARCH.md**: `ALL_SCORED_QUESTIONS` (`questions.ts:455`)
must **NOT** gain Part 7's questions — mirror how `PART6_MEDICAL_HISTORY` is deliberately absent from
that array (`questions.ts:266`'s comment: *"scored — ALL_SCORED_QUESTIONS stays Parts 1-5 only
(D-04)"*). `getAllQuestionsForScoring` (`questions.ts:468`, `[...ALL_SCORED_QUESTIONS,
...PART6_MEDICAL_HISTORY]`) similarly must not be widened to include Part 7's testing questions
unless the planner has an explicit reason (none is given in CONTEXT.md — testing questions carry no
score).

**`showIf` children pattern** — model Part 7's four `had_testing`-gated children
(`testing_year`/`testing_location`/`testing_allergens`/`testing_files`) directly on
`PART6_MEDICAL_HISTORY`'s `has_pcp → pcp_clinic_name/pcp_clinic_address` gate/children shape
(same file, same `showIf: { questionId: "...", equals: "..." }` operator D-06/TEST-02/TEST-03 need).

---

### `app/components/quiz/QuizPartRenderer.tsx` (MODIFIED — three new `case` branches)

**Analog:** itself — `text_input` (lines 293-312) is the direct structural donor for
`text_input_short`; `control_0_3` (lines 314-342) is the direct structural donor for `radio_single`.

**`text_input` → `text_input_short` diff:**
```typescript
case "text_input": {
  // ...
  <textarea id={question.id} className={styles.quizContainer__input} rows={4}
    value={val as string} disabled={disabled}
    onChange={(ev) => onAnswerChange(question.id, ev.target.value)} />
```
Per UI-SPEC Component Inventory §1: swap `<textarea rows={4}>` for `<input type="text"
className={styles.quizContainer__input}>` — UI-SPEC notes `.quizContainer__input` is *already* used
this way by `PatientInfoStep.tsx` for name/dob/email/phone, so this is reuse of an existing class
for a second question type, not new CSS.

**`control_0_3` → `radio_single` diff** (lines 314-342 are close to a direct copy — same
`.questionCard__optionsVertical`/`.questionCard__optionVertical`/`.questionCard__optionSelected`
classes, same `role="radiogroup"`, same `question.options`-driven map):
```typescript
case "control_0_3": {
  const question = item;
  const val = typeof answers[question.id] === "string" ? answers[question.id] : "";
  return (
    <div key={question.id} className={cardClassName}>
      <label className={styles.questionCard__label} id={key}>{question.text}</label>
      {question.subtitle && <p className={styles.questionCard__subtitle}>{question.subtitle}</p>}
      <div className={styles.questionCard__optionsVertical} role="radiogroup" aria-labelledby={key}>
        {(question.options || []).map((opt) => (
          <label key={opt.value} className={`${styles.questionCard__optionVertical} ${val === opt.value ? styles.questionCard__optionSelected : ""}`}>
            <input type="radio" name={question.id} checked={val === opt.value} disabled={disabled}
              onChange={() => onAnswerChange(question.id, opt.value)} />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```
`radio_single` is effectively this block verbatim, differing only in the case label.

**`file_multi` — no analog, new capability.** UI-SPEC Component Inventory §2 is the design contract
(the `.fileUpload*` class family, hidden-input-in-label technique, `aria-live="polite"` list). There
is no existing question-card variant that manages async per-item upload state (uploading/success/
error) — every existing case in this file is a synchronous, fully-controlled input. This branch is
new interaction logic, not adaptable from an existing case; follow UI-SPEC's Interaction Contract
table exactly (additive file-picking, only-successful-uploads-count-as-answered, no drag-and-drop
requirement, no thumbnail previews).

**Zero changes needed to:** `isPartComplete` (`QuizPartRenderer.tsx:359-366`) — it already calls
`isAnswered(item, answers[item.id])` generically for every question, so once `schema.ts`'s switch
covers the three new types, gating works with no renderer-level change. `isGateItem`/`isRevealItem`
(lines 89-103) — UI-SPEC Component Inventory §4 explicitly decides Part 7 does NOT use the
gate/reveal fusion (all four `had_testing` children are `required`, which doesn't match the fusion's
`showIf` + `required === false` signature) — do not touch this logic for Part 7.

---

### `app/components/quiz/QuizContainer.tsx` (MODIFIED — D-09 flow rewiring)

**Analog:** itself. This is a deletion-heavy rewrite; the exact deletion targets (with current line
numbers) are:

| Delete | Current location |
|---|---|
| `autoSubmit0to2Attempted` ref | line 144 |
| The 0–2 auto-submit `useEffect` | lines 204-219 |
| `handleScheduleConsult` | lines 241-254 |
| `handleTestFirst` | lines 256-267 |
| `handleProceedToPurchase` | lines 269-272 |
| `savedToServer` state + all references | lines 142, 212, 246, 260, 280 |
| `"outcome"` as a step the consent-Previous button targets | line 500 (`onClick={() => setStep("outcome")}`) |

**Rewire target (D-09/UI-SPEC Flow Contract):** `quiz_parts` (Part 7 last) → `consent` →
`submitting` → `ResultsDisplay` (terminal), replacing today's separate `outcome` step and
`completed` block. `goToOutcome` (lines 221-228) becomes the score-compute-and-hold-in-state step
that transitions straight to `"consent"` instead of `"outcome"` — same computation
(`visibleAnswers`/`calculateTotalScore`/`getScoreBracket`), different `setStep` target.

**Terminal-button copy fix (UI-SPEC, required, not cosmetic):** line 468's `"See results"` on the
Part-7 Next button becomes `"Continue"` (`quizPartsTotal - 1` branch, lines 452-470) — leaving
"See results" would be a live accuracy defect the day this ships since the click now leads to
consent, not results.

**What must NOT change (positive controls in the deletion-guard test, per
`tests/quiz-medical-history-deletion.test.ts`'s pattern):** `itemsForPart` usage, `QUIZ_PARTS` reads,
`quizPartsTotal` computation, `handleAnswerChange`'s no-special-case-deletion behavior
(lines 168-170) — all survive unedited.

**`consent` step's Previous target** changes from `setStep("outcome")` to re-entering `quiz_parts`
at the last part index (`setCurrentPartIndex(quizPartsTotal - 1); setStep("quiz_parts")` or
equivalent) — UI-SPEC Flow Contract states this explicitly as a behavioral requirement, wiring
detail left to the plan.

---

### `app/components/quiz/ResultsDisplay.tsx` (MODIFIED — terminal screen)

**Analog:** itself — the three bracket-conditional `<div className={styles.quizResults__recommendation}>`
blocks (lines 57-132) are the pattern to edit in place, not replace wholesale.

**Props interface, before → after:**
```typescript
// BEFORE (lines 5-13)
export interface ResultsDisplayProps {
  score: number; scoreBracket: ScoreBracket; patientState: "tennessee" | "texas";
  symptomProfileId: string;
  onScheduleConsult: () => void; onProceedToPurchase: () => void; onTestFirst: () => void;
}
```
```typescript
// AFTER (UI-SPEC Component Inventory §5) — zero callback props remain
export interface ResultsDisplayProps {
  score: number; scoreBracket: ScoreBracket; patientState: "tennessee" | "texas";
  symptomProfileId: string;
  testingStatus: "needs_testing" | "had_testing";
}
```

**Header addition** (immediately under the existing `<h2>`, line 36) — pure reuse of an already-
existing, currently-unused class, zero new CSS:
```typescript
<h2 className={styles.quizResults__title}>Your Assessment Results</h2>
<p className={styles.quizResults__subtitle}>Your responses have been submitted.</p>  {/* NEW */}
```

**Action-area replacement** — today's per-bracket `<div className={styles.quizResults__actions}>`
blocks (e.g. lines 68-76) each hold one bracket-specific button set; UI-SPEC replaces all three with
**one shared block conditioned on `testingStatus`**, independent of `scoreBracket`. The
`.quizNavigation__button .quizNavigation__buttonNext`/`buttonPrev` class pairing used by every
button in this file today is unchanged — reuse those classes on the new anchor-based CTA:
```typescript
// needs_testing — primary CTA is a plain <a>, handled by quiz-embed.tsx's anchor interceptor,
// NOT a callback prop (this is what keeps ResultsDisplay terminal per TEST-05)
<a href={getRedirectUrl("testOptions")}
   className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}>
  Schedule Allergy Testing
</a>
```
The plain-anchor "Return Home"/"Go to AlleDrops Product Page" actions currently living in
`QuizContainer.tsx`'s `"completed"` block (lines 350-364, using `navigateParent("/")` and
`href={`/products/${getProductHandle(...)}`}`) fold into this file's action area per UI-SPEC's Flow
Contract — copy those two `<button>`/`<a>` elements here rather than reinventing them.

**Copy deletions (locked, verbatim substrings from CONTEXT.md/UI-SPEC):** 7+ bracket, delete
*"We recommend proceeding with allergy testing, to identify specific allergens that may be causing
your symptoms."* from line 118-119; 3–6 bracket, delete the entire second `<button>`
(`"Continue to Purchase AlleDrops"`, lines 98-104) and its `onProceedToPurchase` wiring — surrounding
paragraph text is NOT edited.

---

### `app/components/quiz/ConsentStep.tsx` (MODIFIED — one copy edit)

**Analog:** itself, line 56 exactly. No layout/class changes (UI-SPEC Component Inventory §6 is
explicit: "No layout, spacing, or class changes").
```typescript
// BEFORE (line 47-48)
Provider may recommend IgE testing via Labcorp or Quest. Billed separately by lab. Insurance may not
cover. [PENDING — Treatment policy page language]
```
Replace with D-11's interim copy (04-CONTEXT.md, verbatim), wrapped in the same `{/* UNCONFIRMED */}`
comment convention Phase 3 used for HIST-03's third label (search `03-*` plan/summary docs for the
exact prior usage if the convention's precise syntax needs confirming) — do not ship this as
confirmed clinical copy.

---

### `app/lib/format.ts` (MODIFIED — new `ANSWER_LABELS` entries)

**Analog:** itself — the `ANSWER_LABELS` map (`app/lib/format.ts:24-49`) and its header comment
already state the convention this phase must follow:
```typescript
// Question-ID -> clinical-label map (D-05). Consumed by app/lib/pdf.ts and
// app/routes/app.quiz-results.tsx, the two PHI-facing answer renderers. An unmapped key
// intentionally falls back to today's exact behavior via getAnswerLabel below, so an existing
// row can never regress.
const ANSWER_LABELS: Record<string, string> = {
  // Phase 3 medical history (HIST-01..HIST-04, DIAG-01) — the reason this map exists.
  history_comorbidities: 'Personal history of medical conditions',
  // ...
};
export function getAnswerLabel(key: string): string {
  return ANSWER_LABELS[key] ?? capitalize(key.replace(/_/g, ' '))
}
```
Add entries for `testing_status`, `testing_year`, `testing_location`, `testing_allergens`, and
(if `testing_files` tokens ever render as a label rather than being embedded/handled specially in
`pdf.ts`) `testing_files` — same "add a comment grouping by phase" convention the existing HIST block
uses. **Both PHI renderers consume this one map** (`app/lib/pdf.ts` and `app/routes/app.quiz-results.tsx`)
— do not create a second label source for the testing questions.

---

### `extensions/quiz-history/src/QuizHistoryBlock.jsx` (MODIFIED — file download links)

**Analog:** itself — this file is **already functional** (D-05 retraction; confirmed by direct
read during this pattern-mapping pass, matching CONTEXT.md's correction). The existing per-assessment
row pattern (lines 63-76) is the template for adding a file-download link:
```jsx
{assessments.map(a => (
  <s-stack key={a.id} direction="inline" gap="base" align-items="center">
    <s-text>{formatDate(a.completed_at)}</s-text>
    <s-link href={`${FLY_BASE}/api/me/assessment/${a.id}/pdf?token=${encodeURIComponent(token)}`}>
      Download PDF
    </s-link>
  </s-stack>
))}
```
If the planner adds per-file download links (D-05's second retrieval surface), follow this exact
shape: a new `<s-link>` per file, hitting `GET /api/me/assessment/:id/files/:fileId` — but note the
new route (per its own pattern entry above) returns a signed-URL JSON payload, not a direct binary
stream like the PDF route. The extension would need either a fetch-then-navigate step or the file
route needs to support a `?token=` query-param + redirect variant matching this file's existing
`?token=${encodeURIComponent(token)}` convention (line 69) — flag this shape mismatch explicitly to
the planner rather than silently picking one.

**This is Preact (`preact/hooks`), not React** — do not import from `react` here; `useState`/
`useEffect` come from `preact/hooks` (line 3), consistent with the rest of this file.

---

### Tests

#### `tests/quiz-testing-bypass-deletion.test.ts` (NEW — source-text guard)

**Analog:** `tests/quiz-medical-history-deletion.test.ts` in full — this is the established,
proven-RED-first convention for asserting deletions. Copy the whole scaffolding shape:
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const QUIZ_CONTAINER_SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "QuizContainer.tsx"), "utf-8",
);
const RESULTS_DISPLAY_SOURCE = readFileSync(
  join(process.cwd(), "app", "components", "quiz", "ResultsDisplay.tsx"), "utf-8",
);

const count = (source: string, needle: string): number => source.split(needle).length - 1;
```
**Critical convention (never violate):** `SOURCE.split(needle).length - 1`, **never `grep -c`** —
the file's own header comment explains why (`grep -c` counts matching *lines*, collapsing every
multi-match line to `1`; this exact trap has hit four separate agents on this project per
`STATE.md`). Needles for identifiers that might appear in this test's own prose should be assembled
from string fragments (`"handleTest" + "First"`) so the test's own text doesn't self-match a future
repo-wide search.

**Needles to assert absent** (D-09's deletion list): `autoSubmit0to2Attempted`, `handleScheduleConsult`,
`handleTestFirst`, `handleProceedToPurchase`, `savedToServer`. **Positive controls to assert present**
(non-vacuity, matching this analog's own convention at lines 133-153): `itemsForPart`, `QUIZ_PARTS`,
`quizPartsTotal`, and something proving the new consent→submit→results wiring exists (e.g.
`"Schedule Allergy Testing"` string present in `ResultsDisplay.tsx`).

#### `tests/quiz-file-upload-dom.test.ts` (NEW — DOM test)

**Analog:** `tests/quiz-part-renderer-dom.test.ts` in full — same `// @vitest-environment jsdom`
header, same `React.createElement` (not JSX) construction, same `.test.ts` extension (never
`.test.tsx` — the file's own header comment explains `vitest.config.ts`'s include glob doesn't match
`.tsx`), same `cleanup()` in `afterEach`.
```typescript
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { QuizPartRenderer } from "../app/components/quiz/QuizPartRenderer";
import { itemsForPart } from "../app/lib/quiz/schema";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers } from "../app/lib/quiz/types";

afterEach(() => { cleanup(); });
```
Render `itemsForPart(QUIZ_PARTS, 6)` (Part 7, once attached) through the real `QuizPartRenderer`,
same as the analog renders Part 6 (index 5) — see analog lines 51-67's `renderPart6` helper as the
template for a `renderPart7` helper. Cover: add/remove file rows, error-state rendering (wrong type,
too large, upload failed, required-but-empty), and the "only successful uploads count as answered"
rule from UI-SPEC's Interaction Contract.

#### `tests/api-quiz-upload.test.ts` (NEW — integration)

**Analog:** `tests/assessments-ledger.test.ts` for the `vi.mock` + loader-import test-double pattern
(no upload-endpoint precedent exists anywhere in this repo — RESEARCH.md's Wave 0 gap entry says
this explicitly):
```typescript
vi.mock('../app/lib/customer-auth', () => ({ verifyCustomerToken: vi.fn() }))
vi.mock('../app/lib/submissions', () => ({ listSubmissionLedger: vi.fn(), backfillCustomerIdByEmail: vi.fn() }))
import { loader } from '../app/routes/api.me.assessments'
```
Apply the same shape: mock `@remix-run/form-data-parser`'s `MaxFileSizeExceededError`/
`MaxTotalSizeExceededError` paths, mock the GCS client module (`app/lib/storage/gcs.ts`) rather than
hitting real GCS, and assert status codes the same declarative way the analog does (`expect(res.status).toBe(401)`
per case). RESEARCH.md flags the GCS-mocking choice (`STORAGE_EMULATOR_HOST` vs. direct `vi.mock`)
as the planner's decision — pick one and be consistent, matching this repo's existing preference for
`vi.mock` over a live local server (every existing route test in `tests/` mocks its lib dependencies
directly, none spins up a fake service).

#### `tests/submission-files.test.ts` (NEW — integration)

**Analog:** `tests/assessments-ledger.test.ts`'s overall shape (mock the lib layer, import the real
route/function under test, assert on status/body), applied to `app/lib/submission-files.ts`'s
functions directly rather than a route — closer in spirit to how `tests/pdf.test.ts` likely tests
`app/lib/pdf.ts` directly (not read in this pass, but implied by the file list; the planner should
confirm its mocking style before writing this file to stay consistent). Cover insert +
ownership-bounded retrieval, mirroring what `getSubmissionByIdForCustomer` already gets tested for
(cross-reference `tests/assessments-ledger.test.ts`'s ownership-scoping assertions as the pattern:
a customer-scoped query must not return another customer's rows).

#### `tests/consent-version.test.ts` (MODIFIED — extend)

**Analog:** itself, in full (only 13 lines):
```typescript
import { describe, it, expect } from 'vitest'
import { CONSENT_VERSION } from '~/lib/consent-version'

describe('CONSENT_VERSION', () => {
  it('is a non-empty string', () => { /* ... */ })
  it('matches the expected draft version', () => {
    expect(CONSENT_VERSION).toBe('draft-2026-05-09')
  })
})
```
If D-11's copy edit bumps `CONSENT_VERSION` (UI-SPEC flags this as a data/backend question raised,
not decided, by the UI contract), update the `toBe(...)` assertion to the new value and add a case
asserting every submission's `answers`/payload includes a non-null `consent_version` post-D-09
(TEST-07's structural guarantee — every path now passes through `ConsentStep`).

#### `tests/quiz-schema-type-guarantees.test.ts` (MODIFIED — extend)

**Analog:** itself. No changes needed to the compile-time invariants (they concern `QuizInfoBlock`
vs. `QuizQuestion`, untouched by this phase), but the "positive control" style at lines 72-85 is the
pattern to extend for asserting `ALL_ITEMS` grows correctly once Part 7 attaches:
```typescript
it("keeps every ALL_SCORED_QUESTIONS member kind: question, and ALL_ITEMS covers parts 1-6", () => {
  for (const question of ALL_SCORED_QUESTIONS) { expect(question.kind).toBe("question"); }
  expect(ALL_ITEMS.length).toBe(ALL_SCORED_QUESTIONS.length + PART6_MEDICAL_HISTORY.length);
});
```
Update this assertion's arithmetic once `PART7_TESTING` exists (`ALL_ITEMS.length ===
ALL_SCORED_QUESTIONS.length + PART6_MEDICAL_HISTORY.length + PART7_TESTING.length`), and add a
parallel non-vacuity positive control proving `ALL_SCORED_QUESTIONS` did NOT grow (the hard
constraint from CONTEXT.md's canonical_refs).

---

## Shared Patterns

### Ownership-bounded queries (mandatory, HIPAA — not a style choice)
**Source:** `app/lib/submissions.ts:150-174` (`getSubmissionByIdForCustomer`)
**Apply to:** `app/lib/submission-files.ts`'s customer-facing functions, and both new file-retrieval
routes. Never `SELECT ... WHERE id = $1` alone when the row (or a row it joins to) carries PHI —
always constrain by `customer_id_shopify` OR `patient_email`, exactly like the existing function.

### JWT Bearer + ownership check, patient surface
**Source:** `app/lib/customer-auth.ts` (`verifyCustomerToken`) + `app/routes/api.me.assessment.$id.pdf.tsx:12-68`
**Apply to:** `app/routes/api.me.assessment.$id.files.$fileId.tsx`. Order is load-bearing: verify
token → resolve ownership-scoped row → THEN do expensive work (signed-URL generation). Never
reverse this order.

### Shopify session auth + audit log, admin surface
**Source:** `app/routes/api.admin.submission.$id.tsx:6-53` (`authenticate.admin` + `logSubmissionAccess`)
**Apply to:** `app/routes/api.admin.submission.$id.file.$fileId.tsx`. Log actor `shop` and
submission `id` only — never the row contents, never a filename.

### CORS + JSON-error-response scaffolding
**Source:** `app/routes/api.quiz.submit.tsx:20-31`, replicated with minor header-list variation in
every `api.*` route read this session
**Apply to:** `app/routes/api.quiz.upload.tsx` and any new route. `{ error: string }` body shape,
matching status code, OPTIONS preflight returns 204 with no body.

### PHI logging discipline (IDs/counts only, never values)
**Source:** `app/routes/api.quiz.submit.tsx:188-193`, `app/routes/api.admin.submission.$id.tsx:44`
**Apply to:** every new route and lib function in this phase. **This phase adds filenames to the
"never log" set** — CLAUDE.md's enumerated PHI field list does not yet name filenames
(RESEARCH.md Pitfall 5); update `CLAUDE.md`'s rule 5 field list to include "uploaded filenames"
alongside the existing fields, as part of this phase's own scope.

### Insert-only table discipline
**Source:** `app/lib/submissions.ts` (no `updateSubmission` exists) + `migrations/002_...access_log.sql`
(`GRANT SELECT, INSERT` only, no `UPDATE`/`DELETE`)
**Apply to:** `submission_files` — D-08 explicitly preserves `submissions` as insert-only, and
`submission_files` (RESEARCH.md Pitfall 2) is licensed to be a *second* insert-only table, not an
exception to the rule. Grant `SELECT, INSERT` only in `migrations/004`.

### Pure, non-throwing evaluator style in `app/lib/quiz/`
**Source:** `app/lib/quiz/schema.ts` header comment ("Nothing in this directory throws... invalid
input degrades to a safe default everywhere below")
**Apply to:** `isAnswered`'s three new `case` labels, and (in spirit, even though it lives outside
`app/lib/quiz/`) `upload-validation.ts`'s magic-byte sniffer — return a typed `null`/`false` on
unrecognized input, never throw.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/routes/api.quiz.upload.tsx` — the streaming multipart parsing itself (not the CORS/error scaffolding, which does have an analog) | route | streaming file-I/O | No multipart handler exists anywhere in this repo; `api.quiz.submit.tsx`'s `request.formData()` is JSON/urlencoded-only and is the pattern to AVOID here (buffers fully in memory). Use 04-RESEARCH.md's "Pattern 1" as the implementation source instead. |
| `app/lib/storage/heic.ts` | utility | transform | No image-format conversion of any kind exists in this codebase today. 04-RESEARCH.md's `heic-convert` Standard Stack entry is the sole source; nothing in-repo to model against beyond generic "small pure function, no throw" style. |

---

## Metadata

**Analog search scope:** `app/routes/`, `app/lib/`, `app/lib/quiz/`, `app/components/quiz/`,
`app/styles/`, `migrations/`, `tests/`, `extensions/quiz-history/src/` — every directory named in
CONTEXT.md's `<canonical_refs>` "Code the planner must read, not infer" list, plus
`tests/consent-version.test.ts`, `tests/assessments-ledger.test.ts`,
`tests/quiz-schema-type-guarantees.test.ts` for test-pattern donors.
**Files read in full:** 24 (all files listed in File Classification above, each ≤ 570 lines — no
file in this phase's blast radius exceeded the single-Read threshold).
**Files scanned but excluded from deep read:** `app/lib/quiz/questions.ts` (488 lines) was read via
targeted `grep` for `QUIZ_PARTS`/`ALL_SCORED_QUESTIONS`/`ALL_ITEMS`/`PART6` line numbers rather than
read in full, since the excerpt needed (the attachment point and the PART6 precedent) was
identifiable without loading all six existing parts' question content.
**Pattern extraction date:** 2026-08-09

**⚠️ Standing reminder for the planner, restated from CONTEXT.md `<code_context>`:** five defects
have shipped past a fully green suite on this project, two of them judgment failures no structural
test catches. This phase's required-file-upload gate is structurally the same shape as the worst of
those five, one step further along in cost (a lost questionnaire, not a re-typed field). Pattern
fidelity to the analogs above closes the *wiring* risk; it does not substitute for the human browser
pass RESEARCH.md's Validation Architecture section budgets explicitly.
