import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { listSubmissionLedger, backfillCustomerIdByEmail } from '../lib/submissions'
import { listFilesForSubmission } from '../lib/submission-files'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
} as const

async function fetchCustomerEmail(customerId: string): Promise<string | null> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  if (!token || !shop) return null
  try {
    const resp = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        query: `query($id: ID!) { customer(id: $id) { email } }`,
        variables: { id: customerId },
      }),
    })
    if (!resp.ok) return null
    const json = await resp.json() as { data?: { customer?: { email?: string } } }
    return json.data?.customer?.email ?? null
  } catch {
    return null
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 0. CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 1. Extract Bearer token
  const authHeader = request.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim() ?? ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 2. Verify token
  let customerId: string
  try {
    const payload = await verifyCustomerToken(token)
    customerId = payload.customerId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 3. Fetch ledger — GID-first, email fallback + backfill if GID returns nothing
  let entries: import('../lib/submissions').SubmissionLedgerEntry[]
  try {
    entries = await listSubmissionLedger({ customer_id_shopify: customerId })

    if (entries.length === 0) {
      // Submissions made before Protected Customer Data was approved have
      // customer_id_shopify = NULL. Look them up by email and stamp the GID.
      const email = await fetchCustomerEmail(customerId)
      if (email) {
        entries = await listSubmissionLedger({ email })
        if (entries.length > 0) {
          await backfillCustomerIdByEmail(email, customerId).catch(() => {})
        }
      }
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 4. Attach each submission's files — entries are already ownership-scoped above (by GID or
  //    email), so listFilesForSubmission needs no additional ownership filter here.
  let filesBySubmission: import('../lib/submission-files').SubmissionFileRow[][]
  try {
    filesBySubmission = await Promise.all(
      entries.map((e) => listFilesForSubmission(e.id))
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 5. Return only non-PHI fields — filenames are PHI-shaped and never appear in this route's
  //    own logs; they are returned here only inside the authenticated JSON body, matching the
  //    same posture the PDF/file routes already use for link text.
  const ledger = entries.map((e, idx) => ({
    id: e.id,
    symptom_profile_id: e.symptom_profile_id,
    completed_at: e.created_at,
    files: filesBySubmission[idx].map((f) => ({
      id: f.id,
      filename: f.original_filename,
      sizeBytes: f.size_bytes,
    })),
  }))

  return new Response(JSON.stringify(ledger), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
