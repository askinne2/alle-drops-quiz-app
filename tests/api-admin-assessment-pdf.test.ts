import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForAdmin: vi.fn(),
}))

vi.mock('../app/lib/pdf', () => ({
  generateVisitSummaryPdf: vi.fn(),
}))

import { loader } from '../app/routes/api.admin.assessment.$id.pdf'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import * as pdf from '../app/lib/pdf'
import type { SubmissionFullRow } from '../app/lib/submissions'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

const mockRow: SubmissionFullRow = {
  id: 'uuid-1',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: null,
  patient_name: 'Jane Doe',
  patient_dob: '1990-01-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '7+',
  answers_json: {},
  personal_history_json: null,
  family_history_json: null,
  consent_version: 'v1',
  consent_accepted_at: '2026-05-01T12:00:00.000Z',
  consent_ip_address: null,
  consent_user_agent: null,
  completion_time_seconds: null,
  created_at: '2026-05-01T12:00:00.000Z',
}

describe('GET /api/admin/assessment/:id/pdf', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when authenticate.admin throws a Response', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(
      new Response('Unauthorized', { status: 401 })
    )
    const req = new Request('https://fly.dev/api/admin/assessment/uuid-1/pdf')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns PDF binary with correct headers on valid session', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockRow)
    vi.mocked(pdf.generateVisitSummaryPdf).mockResolvedValue(
      Buffer.from('%PDF-1.4 fake content')
    )

    const req = new Request('https://fly.dev/api/admin/assessment/uuid-1/pdf')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('assessment-uuid-1.pdf')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns 404 for non-existent submission', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/admin/assessment/bad-id/pdf')
    const res = await loader({ request: req, params: { id: 'bad-id' }, context: {} } as any)
    expect(res.status).toBe(404)
  })

  it('returns 500 when PDF generation throws', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockRow)
    vi.mocked(pdf.generateVisitSummaryPdf).mockRejectedValue(new Error('PDFKit internal error'))

    const req = new Request('https://fly.dev/api/admin/assessment/uuid-1/pdf')
    const res = await loader({ request: req, params: { id: 'uuid-1' }, context: {} } as any)
    expect(res.status).toBe(500)
  })
})
