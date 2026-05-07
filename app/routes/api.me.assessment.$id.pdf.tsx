import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { getSubmissionByIdForCustomer } from '../lib/submissions'
import { generateVisitSummaryPdf } from '../lib/pdf'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // ── 1. Extract Bearer token ──────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim() ?? ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Verify token ──────────────────────────────────────────────────────
  let customerId: string
  try {
    const payload = await verifyCustomerToken(token)
    customerId = payload.customerId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Fetch submission (ownership-scoped) ───────────────────────────────
  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing assessment id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let row: import('../lib/submissions').SubmissionFullRow | null
  try {
    row = await getSubmissionByIdForCustomer({
      id,
      customer_id_shopify: customerId,
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 4. Generate PDF ──────────────────────────────────────────────────────
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateVisitSummaryPdf(row)
  } catch (err) {
    console.error('[pdf] generation error for submission', id, err instanceof Error ? err.message : 'unknown')
    return new Response(JSON.stringify({ error: 'Could not generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 5. Return binary ─────────────────────────────────────────────────────
  // Convert Buffer → Uint8Array so TypeScript accepts it as BodyInit
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessment-${id}.pdf"; filename*=UTF-8''assessment-${encodeURIComponent(id)}.pdf`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
