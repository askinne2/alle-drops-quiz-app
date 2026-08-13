import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForAdmin: vi.fn(),
  logSubmissionAccess: vi.fn().mockResolvedValue(undefined),
}))

import { loader } from '../app/routes/api.admin.submission.$id'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import type { SubmissionFullRow } from '../app/lib/submissions'
import { logSubmissionAccess } from '../app/lib/submissions'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

const mockRow: SubmissionFullRow = {
  id: 'uuid-1',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: 'gid://shopify/Customer/123',
  patient_name: 'Jane Doe',
  patient_dob: '1990-01-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '9+',
  answers_json: { taking_meds: 'no' },
  consent_version: 'v1',
  consent_accepted_at: '2026-05-01T12:00:00.000Z',
  consent_ip_address: '1.2.3.4',
  consent_user_agent: 'Mozilla/5.0',
  completion_time_seconds: 120,
  created_at: '2026-05-01T12:00:00.000Z',
}

describe('GET /api/admin/submission/:id', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when authenticate.admin throws a Response', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(
      new Response('Unauthorized', { status: 401 })
    )
    const req = new Request('https://fly.dev/api/admin/submission/uuid-1')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns 200 with full row on valid session', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockRow)

    const req = new Request('https://fly.dev/api/admin/submission/uuid-1')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('uuid-1')
    expect(body.patient_name).toBe('Jane Doe')
    expect(body.answers_json).toEqual({ taking_meds: 'no' })
    expect(body.patient_dob).toBe('1990-01-15')
    expect(logSubmissionAccess).toHaveBeenCalledWith({
      submission_id: 'uuid-1',
      actor_shop: 'allergist-on-demand.myshopify.com',
      action: 'detail',
    })
  })

  it('returns 404 for non-existent submission', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/admin/submission/does-not-exist')
    const res = await loader({
      request: req,
      params: { id: 'does-not-exist' },
      context: {},
    } as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 503 when DB throws', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockRejectedValue(
      new Error('DB connection lost')
    )

    const req = new Request('https://fly.dev/api/admin/submission/uuid-1')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(503)
  })
})
