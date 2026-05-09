import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../app/lib/customer-auth', () => ({
  verifyCustomerToken: vi.fn(),
}))

vi.mock('../app/lib/submissions', () => ({
  listSubmissionLedger: vi.fn(),
  backfillCustomerIdByEmail: vi.fn(),
}))

import { loader } from '../app/routes/api.me.assessments'
import * as auth from '../app/lib/customer-auth'
import * as submissions from '../app/lib/submissions'
import type { SubmissionLedgerEntry } from '../app/lib/submissions'

const mockEntry: SubmissionLedgerEntry = {
  id: 'aaaa-1111',
  symptom_profile_id: 'AOD_TEST_001',
  created_at: '2026-05-07T18:00:00.000Z',
  patient_state: 'tennessee',
}

const mockFetch = vi.fn()
const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = mockFetch
})

afterEach(() => {
  global.fetch = originalFetch
  delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  delete process.env.SHOPIFY_SHOP_DOMAIN
})

describe('GET /api/me/assessments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('https://fly.dev/api/me/assessments')
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token verification fails', async () => {
    vi.mocked(auth.verifyCustomerToken).mockRejectedValue(new Error('Invalid session token'))
    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer bad.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(401)
  })

  it('returns 200 with non-PHI ledger array on valid token', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual([
      {
        id: 'aaaa-1111',
        symptom_profile_id: 'AOD_TEST_001',
        completed_at: '2026-05-07T18:00:00.000Z',
      },
    ])
    expect(body[0]).not.toHaveProperty('patient_state')
  })

  it('returns empty array when customer has no submissions', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([])

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 503 when DB throws', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockRejectedValue(new Error('connection refused'))

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(503)
  })

  it('handles OPTIONS preflight with 204', async () => {
    const req = new Request('https://fly.dev/api/me/assessments', { method: 'OPTIONS' })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(204)
  })

  it('falls back to email lookup and backfills when GID returns no rows', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger)
      .mockResolvedValueOnce([])           // first call: by GID → empty
      .mockResolvedValueOnce([mockEntry])  // second call: by email → found

    vi.mocked(submissions.backfillCustomerIdByEmail).mockResolvedValue(1)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { customer: { email: 'patient@example.com' } },
      }),
    } as unknown as Response)

    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'test-admin-token'
    process.env.SHOPIFY_SHOP_DOMAIN = 'test.myshopify.com'

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual([
      {
        id: 'aaaa-1111',
        symptom_profile_id: 'AOD_TEST_001',
        completed_at: '2026-05-07T18:00:00.000Z',
      },
    ])

    expect(submissions.backfillCustomerIdByEmail).toHaveBeenCalledWith(
      'patient@example.com',
      'gid://shopify/Customer/9876543210'
    )
  })

  it('does NOT call Shopify Admin API when GID lookup returns rows', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(submissions.backfillCustomerIdByEmail).not.toHaveBeenCalled()
  })

  it('returns empty array gracefully when Admin API env vars are absent', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([])

    // env vars already deleted by afterEach from any prior test; confirm absent
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
    delete process.env.SHOPIFY_SHOP_DOMAIN

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
