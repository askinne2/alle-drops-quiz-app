/**
 * GET /api/admin/submission/:id/file/:fileId — admin file retrieval, audit-logged.
 *
 * Auth + audit sequence copied from api.admin.submission.$id.tsx: `authenticate.admin` is the
 * first statement (a caught `Response` is Shopify's own redirect/reauth flow and is returned
 * as-is), then a submission lookup, then a file lookup — admin session auth IS the gate here
 * (no ownership filter), so `submission_access_log` is the compensating control (T-4-69). The
 * audit write is fire-and-forget with `.catch()` and is NEVER awaited — a slow or failing audit
 * write must not block a clinical response (T-4-70).
 *
 * DELIBERATE DIVERGENCE from the PDF-adjacent admin route: returns `{ url }` JSON, never proxies
 * file bytes (04-RESEARCH.md anti-pattern — do not stream binary through the 1GB Fly VM).
 *
 * Submission-not-found and file-not-found return the SAME 404 body (T-4-67). Never log the row,
 * the filename, or the signed URL — IDs and shop only, matching the existing admin routes'
 * logging discipline.
 */
import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { getSubmissionByIdForAdmin, logSubmissionAccess } from '../lib/submissions'
import { getSubmissionFileForAdmin } from '../lib/submission-files'
import { getSignedReadUrl } from '../lib/storage/gcs'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // ── 1. Verify admin session — throws Response on failure ──────────────────
  let shop: string
  try {
    const { session } = await authenticate.admin(request)
    shop = session.shop
  } catch (e) {
    if (e instanceof Response) return e
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id, fileId } = params
  if (!id || !fileId) {
    return new Response(JSON.stringify({ error: 'Missing submission or file id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Submission lookup — no ownership filter, session auth is the gate ──
  let submissionRow: import('../lib/submissions').SubmissionFullRow | null
  try {
    submissionRow = await getSubmissionByIdForAdmin(id)
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!submissionRow) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. File lookup — SAME 404 body as "submission not found" above ────────
  let file: import('../lib/submission-files').SubmissionFileRow | null
  try {
    file = await getSubmissionFileForAdmin(submissionRow.id, fileId)
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!file) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 4. ID-only audit trail, fire-and-forget ────────────────────────────────
  console.log(`[admin] fetched file id=${fileId} submission=${id} shop=${shop}`)
  logSubmissionAccess({ submission_id: id, actor_shop: shop, action: 'file' }).catch((err) =>
    console.error('[admin] access log write failed:', err)
  )

  // ── 5. Short-lived signed read URL ─────────────────────────────────────────
  const signedUrl = await getSignedReadUrl(file.storage_object_key, file.original_filename)

  return new Response(JSON.stringify({ url: signedUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
