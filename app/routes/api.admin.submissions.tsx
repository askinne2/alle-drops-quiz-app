import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { listAdminSubmissions } from '../lib/submissions'
import type { AdminSubmissionsPage } from '../lib/submissions'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 1. Verify admin session — throws Response on failure
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

  // 2. Parse filter params
  const url = new URL(request.url)
  const state = url.searchParams.get('state') || null
  const score_bracket = url.searchParams.get('score_bracket') || null
  const from = url.searchParams.get('from') || null
  const to = url.searchParams.get('to') || null
  const q = url.searchParams.get('q') || null
  const cursor = url.searchParams.get('cursor') || null

  // 3. Fetch
  let page: AdminSubmissionsPage
  try {
    page = await listAdminSubmissions({ state, score_bracket, from, to, q, cursor, limit: 50 })
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Audit log (no PHI — shop + count only)
  console.log(
    `[admin] fetched submissions shop=${shop} count=${page.rows.length} hasNextPage=${page.hasNextPage}`
  )

  return new Response(JSON.stringify(page), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
