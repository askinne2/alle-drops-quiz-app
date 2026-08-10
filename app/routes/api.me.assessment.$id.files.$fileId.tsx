/**
 * GET /api/me/assessment/:id/files/:fileId — patient file retrieval.
 *
 * Auth-then-ownership-then-work order, copied line-for-line from
 * api.me.assessment.$id.pdf.tsx (the strongest analog in this phase): Bearer extraction ->
 * verifyCustomerToken -> ownership-scoped SUBMISSION lookup -> ownership-scoped FILE lookup ->
 * ONLY THEN a short-lived signed GCS URL. Never invert this order; never touch GCS or the
 * submission_files table before both ownership checks pass.
 *
 * DELIBERATE DIVERGENCE from the PDF route: this returns `{ url }` (or a redirect — see below),
 * never proxied bytes. 04-RESEARCH.md's anti-pattern list forbids streaming file bytes through
 * the 1GB Fly VM for retrieval; the browser fetches the signed URL directly from GCS instead.
 *
 * RESPONSE-SHAPE RESOLUTION (04-PATTERNS.md's flagged shape mismatch): the `quiz-history`
 * extension's existing PDF link is a plain `<s-link href>` navigation using a `?token=` query
 * param (QuizHistoryBlock.jsx / .jsx :69 / :804), which cannot read a JSON body. This route
 * supports BOTH token sources and BOTH response shapes so plan 04-18's extension change is a
 * one-line `<s-link href>` rather than a fetch-then-navigate rewrite:
 *   - Token: `Authorization: Bearer <token>` header (checked first) OR `?token=` query param.
 *   - Shape: `Accept: application/json` header OR `?as=json` query param -> 200 `{ url }`.
 *             Otherwise -> 302 redirect straight to the signed URL.
 * Both shapes carry `Cache-Control: no-store` — a signed URL is itself a bearer credential
 * (T-4-68). The redirect additionally sets `Referrer-Policy: no-referrer` so the signed URL
 * (which lives in the Location header, briefly in the browser's address bar) does not leak via a
 * referrer header on the next hop.
 *
 * A patient must not be able to tell "not yours" from "does not exist" — both the submission
 * lookup and the file lookup return the SAME 404 body on failure (T-4-67).
 */
import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { getSubmissionByIdForCustomer } from '../lib/submissions'
import { getSubmissionFileForCustomer } from '../lib/submission-files'
import { getSignedReadUrl } from '../lib/storage/gcs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
} as const

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // ── 0. CORS preflight ────────────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const url = new URL(request.url)

  // ── 1. Extract token — Authorization: Bearer header first, ?token= fallback ──
  const authHeader = request.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim() || (url.searchParams.get('token')?.trim() ?? '')
  if (!token) {
    return jsonError(401, 'Unauthorized')
  }

  // ── 2. Verify token ───────────────────────────────────────────────────────
  let customerId: string
  try {
    const payload = await verifyCustomerToken(token)
    customerId = payload.customerId
  } catch {
    return jsonError(401, 'Unauthorized')
  }

  const { id, fileId } = params
  if (!id || !fileId) {
    return jsonError(400, 'Missing assessment or file id')
  }

  // ── 3. Fetch submission (ownership-scoped) — auth+ownership BEFORE any file work ──
  let submissionRow: import('../lib/submissions').SubmissionFullRow | null
  try {
    submissionRow = await getSubmissionByIdForCustomer({ id, customer_id_shopify: customerId })
  } catch {
    return jsonError(503, 'Service unavailable')
  }
  if (!submissionRow) {
    // Same body as the "file not found" case below — a patient must not be able to distinguish
    // "not yours" from "does not exist" (T-4-67).
    return jsonError(404, 'Not found')
  }

  // ── 4. Fetch file (ownership-scoped a second time, via submission_id) ─────
  let file: import('../lib/submission-files').SubmissionFileRow | null
  try {
    file = await getSubmissionFileForCustomer({
      submissionId: submissionRow.id,
      fileId,
      customer_id_shopify: customerId,
    })
  } catch {
    return jsonError(503, 'Service unavailable')
  }
  if (!file) {
    return jsonError(404, 'Not found')
  }

  // ── 5. ONLY THEN the expensive work — sign a short-lived read URL ─────────
  const signedUrl = await getSignedReadUrl(file.storage_object_key, file.original_filename)
  console.log('[me] issued file url', {
    submissionId: submissionRow.id,
    fileId,
    byteCount: file.size_bytes,
  })

  const wantsJson =
    (request.headers.get('Accept') ?? '').includes('application/json') ||
    url.searchParams.get('as') === 'json'

  if (wantsJson) {
    return new Response(JSON.stringify({ url: signedUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    })
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: signedUrl,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      ...corsHeaders,
    },
  })
}
