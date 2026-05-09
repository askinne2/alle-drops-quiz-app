import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { getSubmissionByIdForAdmin, logSubmissionAccess } from '../lib/submissions'
import type { SubmissionFullRow } from '../lib/submissions'
import { generateVisitSummaryPdf } from '../lib/pdf'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
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

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing assessment id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let row: SubmissionFullRow | null
  try {
    row = await getSubmissionByIdForAdmin(id)
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

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateVisitSummaryPdf(row)
  } catch (err) {
    console.error(
      '[admin-pdf] generation error for submission',
      id,
      err instanceof Error ? err.message : 'unknown'
    )
    return new Response(JSON.stringify({ error: 'Could not generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[admin] generated PDF id=${id} shop=${shop}`)
  logSubmissionAccess({ submission_id: id, actor_shop: shop, action: 'pdf' }).catch(
    (err) => console.error('[admin] access log write failed:', err)
  )

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
