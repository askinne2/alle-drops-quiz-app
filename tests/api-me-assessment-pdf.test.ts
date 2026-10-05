import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../app/lib/customer-auth', () => ({
  verifyCustomerToken: vi.fn(),
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForCustomer: vi.fn(),
}))

vi.mock('../app/lib/pdf', () => ({
  generateVisitSummaryPdf: vi.fn(),
}))

import { loader } from '../app/routes/api.me.assessment.$id.pdf'
import * as auth from '../app/lib/customer-auth'
import * as submissions from '../app/lib/submissions'
import * as pdf from '../app/lib/pdf'
import { signDownloadPath } from '../app/lib/download-links'
import type { SubmissionFullRow } from '../app/lib/submissions'

const CUSTOMER = 'gid://shopify/Customer/123'

const mockRow: SubmissionFullRow = {
  id: 'sub-1',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: CUSTOMER,
  patient_name: 'Jane Doe',
  patient_dob: '1990-01-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '9+',
  answers_json: {},
  consent_version: 'v1',
  consent_accepted_at: '2026-05-01T12:00:00.000Z',
  consent_ip_address: null,
  consent_user_agent: null,
  completion_time_seconds: 120,
  created_at: '2026-05-01T12:00:00.000Z',
}

function callLoader(request: Request, params: Record<string, string> = { id: 'sub-1' }) {
  return loader({ request, params, context: {} } as any)
}

function signedPdfRequest(opts: { submissionId?: string; customerId?: string; now?: number } = {}) {
  const path = signDownloadPath({
    kind: 'pdf',
    submissionId: opts.submissionId ?? 'sub-1',
    customerId: opts.customerId ?? CUSTOMER,
    now: opts.now,
  })
  return new Request(`https://app.example${path}`)
}

const ORIGINAL_SECRET = process.env.SHOPIFY_API_SECRET

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SHOPIFY_API_SECRET = 'test-secret-value'
  vi.mocked(pdf.generateVisitSummaryPdf).mockResolvedValue(Buffer.from('%PDF-1.4 test'))
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SHOPIFY_API_SECRET
  else process.env.SHOPIFY_API_SECRET = ORIGINAL_SECRET
})

describe('GET /api/me/assessment/:id/pdf', () => {
  it('handles OPTIONS preflight with 204', async () => {
    const res = await callLoader(new Request('https://app.example/api/me/assessment/sub-1/pdf', { method: 'OPTIONS' }))
    expect(res.status).toBe(204)
  })

  it('returns 401 with no Bearer header and no signature', async () => {
    const res = await callLoader(new Request('https://app.example/api/me/assessment/sub-1/pdf'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(submissions.getSubmissionByIdForCustomer).not.toHaveBeenCalled()
  })

  it('still rejects a ?token= query param (no JWT-in-URL fallback)', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({ customerId: CUSTOMER })
    const res = await callLoader(new Request('https://app.example/api/me/assessment/sub-1/pdf?token=abc.def.ghi'))
    expect(res.status).toBe(401)
    expect(auth.verifyCustomerToken).not.toHaveBeenCalled()
  })

  it('accepts a valid Bearer token (existing behavior)', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({ customerId: CUSTOMER })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockRow)
    const res = await callLoader(
      new Request('https://app.example/api/me/assessment/sub-1/pdf', {
        headers: { Authorization: 'Bearer good.token' },
      })
    )
    expect(res.status).toBe(200)
    expect(submissions.getSubmissionByIdForCustomer).toHaveBeenCalledWith({
      id: 'sub-1',
      customer_id_shopify: CUSTOMER,
    })
  })

  it('accepts a valid signed link and streams an attachment', async () => {
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockRow)
    const res = await callLoader(signedPdfRequest())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment;/)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(auth.verifyCustomerToken).not.toHaveBeenCalled()
    expect(submissions.getSubmissionByIdForCustomer).toHaveBeenCalledWith({
      id: 'sub-1',
      customer_id_shopify: CUSTOMER,
    })
  })

  it('returns 404 (generic) when the signed customer does not own the submission', async () => {
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(null)
    const res = await callLoader(signedPdfRequest())
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('returns 401 before any DB query for a signature bound to another submission', async () => {
    const req = signedPdfRequest({ submissionId: 'sub-2' })
    const qs = new URL(req.url).search
    const res = await callLoader(new Request(`https://app.example/api/me/assessment/sub-1/pdf${qs}`))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(submissions.getSubmissionByIdForCustomer).not.toHaveBeenCalled()
  })

  it('returns 401 before any DB query for a tampered sig', async () => {
    const u = new URL(signedPdfRequest().url)
    const sig = u.searchParams.get('sig')!
    u.searchParams.set('sig', (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1))
    const res = await callLoader(new Request(u.toString()))
    expect(res.status).toBe(401)
    expect(submissions.getSubmissionByIdForCustomer).not.toHaveBeenCalled()
  })

  it('returns 401 before any DB query for an expired link', async () => {
    const res = await callLoader(signedPdfRequest({ now: Math.floor(Date.now() / 1000) - 3600 }))
    expect(res.status).toBe(401)
    expect(submissions.getSubmissionByIdForCustomer).not.toHaveBeenCalled()
  })

  it('returns 401 (not 500) when the signing secret is unset', async () => {
    const req = signedPdfRequest()
    delete process.env.SHOPIFY_API_SECRET
    const res = await callLoader(req)
    expect(res.status).toBe(401)
    expect(submissions.getSubmissionByIdForCustomer).not.toHaveBeenCalled()
  })

  it('never logs the signature', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockRow)
    vi.mocked(pdf.generateVisitSummaryPdf).mockRejectedValue(new Error('boom'))
    const req = signedPdfRequest()
    const sig = new URL(req.url).searchParams.get('sig')!
    const res = await callLoader(req)
    expect(res.status).toBe(500)
    const serialized = [...logSpy.mock.calls, ...errSpy.mock.calls].map((c) => JSON.stringify(c)).join(' ')
    expect(serialized).not.toContain(sig)
    logSpy.mockRestore()
    errSpy.mockRestore()
  })
})
