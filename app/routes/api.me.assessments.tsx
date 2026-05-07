import type { LoaderFunctionArgs } from 'react-router'
import { verifyCustomerToken } from '../lib/customer-auth'
import { listSubmissionLedger } from '../lib/submissions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
} as const

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

  // 2. Verify token — same pattern as PDF route
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

  // 3. Fetch ledger (ownership-scoped, never returns rows belonging to other customers)
  let entries: import('../lib/submissions').SubmissionLedgerEntry[]
  try {
    entries = await listSubmissionLedger({ customer_id_shopify: customerId })
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 4. Return only non-PHI fields. patient_state is PHI when tied to identity.
  const ledger = entries.map((e) => ({
    id: e.id,
    symptom_profile_id: e.symptom_profile_id,
    completed_at: e.created_at,
  }))

  return new Response(JSON.stringify(ledger), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
