import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  listAdminSubmissions: vi.fn(),
}))

import { loader } from '../app/routes/api.admin.submissions'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import type { AdminSubmissionsPage } from '../app/lib/submissions'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

const mockPage: AdminSubmissionsPage = {
  rows: [
    {
      id: 'uuid-1',
      symptom_profile_id: 'AOD_TEST_001',
      patient_name: 'Jane Doe',
      patient_email: 'jane@example.com',
      patient_state: 'tennessee',
      score_bracket: '7+',
      quiz_score: 9,
      created_at: '2026-05-01T12:00:00.000Z',
      customer_id_shopify: 'gid://shopify/Customer/123',
    },
  ],
  hasNextPage: false,
  cursor: null,
}

describe('GET /api/admin/submissions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when authenticate.admin throws a Response', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(
      new Response('Unauthorized', { status: 401 })
    )
    const req = new Request('https://fly.dev/api/admin/submissions')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns 200 with submissions page on valid session', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.listAdminSubmissions).mockResolvedValue(mockPage)

    const req = new Request('https://fly.dev/api/admin/submissions')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0].id).toBe('uuid-1')
    expect(body.hasNextPage).toBe(false)
    expect(body.cursor).toBeNull()
  })

  it('passes all filter params to listAdminSubmissions', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.listAdminSubmissions).mockResolvedValue(
      { rows: [], hasNextPage: false, cursor: null }
    )

    const req = new Request(
      'https://fly.dev/api/admin/submissions?state=tennessee&score_bracket=7%2B&from=2026-01-01&to=2026-12-31&q=jane&cursor=NTA%3D'
    )
    await loader({ request: req, params: {}, context: {} } as any)

    expect(submissions.listAdminSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'tennessee',
        score_bracket: '7+',
        from: '2026-01-01',
        to: '2026-12-31',
        q: 'jane',
        cursor: 'NTA=',
        limit: 50,
      })
    )
  })

  it('returns 503 when DB throws', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.listAdminSubmissions).mockRejectedValue(
      new Error('connection refused')
    )

    const req = new Request('https://fly.dev/api/admin/submissions')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(503)
  })
})
