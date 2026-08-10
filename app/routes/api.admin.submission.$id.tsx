import type { LoaderFunctionArgs } from 'react-router'
import { authenticate } from '../shopify.server'
import { getSubmissionByIdForAdmin, logSubmissionAccess } from '../lib/submissions'
import type { SubmissionFullRow } from '../lib/submissions'
import { listFilesForSubmission } from '../lib/submission-files'
import type { SubmissionFileRow } from '../lib/submission-files'

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

  // File list for the detail modal's download links (D-05 admin surface, Task 3). Non-fatal on
  // failure — a submission with no readable file list still degrades to an empty array rather
  // than 500ing the whole detail view.
  let files: SubmissionFileRow[] = []
  try {
    files = await listFilesForSubmission(row.id)
  } catch (err) {
    console.error(
      '[admin] file list fetch failed:',
      err instanceof Error ? err.message : 'unknown'
    )
  }

  console.log(`[admin] fetched submission id=${id} shop=${shop}`)
  logSubmissionAccess({ submission_id: id, actor_shop: shop, action: 'detail' }).catch(
    (err) => console.error('[admin] access log write failed:', err)
  )

  return new Response(JSON.stringify({ ...row, files }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
