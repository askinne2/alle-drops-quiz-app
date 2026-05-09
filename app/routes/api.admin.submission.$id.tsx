import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { getSubmissionByIdForAdmin, logSubmissionAccess } from '../lib/submissions'
import type { SubmissionFullRow } from '../lib/submissions'

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
    return new Response(JSON.stringify({ error: 'Missing submission id' }), {
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

  console.log(`[admin] fetched submission id=${id} shop=${shop}`)
  logSubmissionAccess({ submission_id: id, actor_shop: shop, action: 'detail' }).catch(
    (err) => console.error('[admin] access log write failed:', err)
  )

  return new Response(JSON.stringify(row), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
