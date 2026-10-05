import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { getSubmissionByIdForCustomer } from '../lib/submissions'
import { generateVisitSummaryPdf } from '../lib/pdf'
import { verifyDownloadRequest } from '../lib/download-links'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
} as const

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // ── 0. CORS preflight ────────────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing assessment id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // ── 1. Authenticate: Bearer session token OR a server-signed short-lived link ──
  // Bearer covers the extension's own fetch calls. A signed link covers plain <s-link href>
  // navigations, which cannot send headers; GET /api/me/assessments signs one per PDF it returned
  // for the authenticated customer (app/lib/download-links.ts). A session JWT in the query string
  // is never accepted (issue #36). Either path yields a customer GID BEFORE any database query.
  let customerId: string
  const authHeader = request.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim() ?? ''
  if (token) {
    try {
      const payload = await verifyCustomerToken(token)
      customerId = payload.customerId
    } catch {
      return unauthorized()
    }
  } else {
    const signedCustomer = verifyDownloadRequest(new URL(request.url), {
      kind: 'pdf',
      submissionId: id,
    })
    if (!signedCustomer) return unauthorized()
    customerId = signedCustomer
  }

  // ── 2. Fetch submission (ownership-scoped) ───────────────────────────────
  let row: import('../lib/submissions').SubmissionFullRow | null
  try {
    row = await getSubmissionByIdForCustomer({
      id,
      customer_id_shopify: customerId,
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // ── 3. Generate PDF ──────────────────────────────────────────────────────
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateVisitSummaryPdf(row)
  } catch (err) {
    console.error('[pdf] generation error for submission', id, err instanceof Error ? err.message : 'unknown')
    return new Response(JSON.stringify({ error: 'Could not generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // ── 4. Return binary ─────────────────────────────────────────────────────
  // Convert Buffer → Uint8Array so TypeScript accepts it as BodyInit
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessment-${id}.pdf"; filename*=UTF-8''assessment-${encodeURIComponent(id)}.pdf`,
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  })
}
