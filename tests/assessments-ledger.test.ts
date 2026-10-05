import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../app/lib/customer-auth', () => ({
  verifyCustomerToken: vi.fn(),
}))

vi.mock('../app/lib/submissions', () => ({
  listSubmissionLedger: vi.fn(),
  backfillCustomerIdByEmail: vi.fn(),
}))

vi.mock('../app/lib/submission-files', () => ({
  listFilesForSubmission: vi.fn(),
}))

import { loader } from '../app/routes/api.me.assessments'
import * as auth from '../app/lib/customer-auth'
import * as submissions from '../app/lib/submissions'
import * as submissionFiles from '../app/lib/submission-files'
import { verifyDownloadRequest } from '../app/lib/download-links'
import type { SubmissionLedgerEntry } from '../app/lib/submissions'
import type { SubmissionFileRow } from '../app/lib/submission-files'

const mockEntry: SubmissionLedgerEntry = {
  id: 'aaaa-1111',
  symptom_profile_id: 'AOD_TEST_001',
  created_at: '2026-05-07T18:00:00.000Z',
  patient_state: 'tennessee',
}

const mockFileRow: SubmissionFileRow = {
  id: 'file-1111',
  submission_id: 'aaaa-1111',
  storage_object_key: 'submissions/aaaa-1111/file-1111-test.jpg',
  original_filename: 'test-result.jpg',
  content_type: 'image/jpeg',
  original_content_type: 'image/jpeg',
  size_bytes: 12345,
  uploaded_at: '2026-05-07T18:01:00.000Z',
}

const mockFetch = vi.fn()
const originalFetch = global.fetch

const ORIGINAL_ENV = { ...process.env }
const APP = 'https://app.example'
const PDF_URL = expect.stringMatching(
  /^https:\/\/app\.example\/api\/me\/assessment\/aaaa-1111\/pdf\?c=[^&]+&exp=\d+&sig=[A-Za-z0-9_-]+$/
)
const FILE_URL = expect.stringMatching(
  /^https:\/\/app\.example\/api\/me\/assessment\/aaaa-1111\/files\/file-1111\?c=[^&]+&exp=\d+&sig=[A-Za-z0-9_-]+$/
)

beforeEach(() => {
  global.fetch = mockFetch
  process.env.SHOPIFY_API_SECRET = 'test-secret-value'
  process.env.SHOPIFY_APP_URL = APP
})

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...ORIGINAL_ENV }
  delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  delete process.env.SHOPIFY_SHOP_DOMAIN
})

describe('GET /api/me/assessments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
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
        pdf_url: PDF_URL,
        files: [],
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

  it('returns a files array per assessment sourced from listFilesForSubmission', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([mockFileRow])

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
        pdf_url: PDF_URL,
        files: [{ id: 'file-1111', filename: 'test-result.jpg', sizeBytes: 12345, url: FILE_URL }],
      },
    ])
    expect(submissionFiles.listFilesForSubmission).toHaveBeenCalledWith('aaaa-1111')
  })

  it('signs pdf_url and file url for the authenticated customer, with no token= in the body', async () => {
    const customerId = 'gid://shopify/Customer/9876543210'
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({ customerId })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([mockFileRow])

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    const text = await res.text()
    expect(text).not.toContain('token=')
    expect(text).not.toContain('valid.token')

    const [entry] = JSON.parse(text)
    expect(
      verifyDownloadRequest(new URL(entry.pdf_url), { kind: 'pdf', submissionId: 'aaaa-1111' })
    ).toBe(customerId)
    expect(
      verifyDownloadRequest(new URL(entry.files[0].url), {
        kind: 'file',
        submissionId: 'aaaa-1111',
        fileId: 'file-1111',
      })
    ).toBe(customerId)
    // A pdf signature must not unlock the file route, and vice versa.
    expect(
      verifyDownloadRequest(new URL(entry.pdf_url), { kind: 'file', submissionId: 'aaaa-1111', fileId: 'file-1111' })
    ).toBeNull()
  })

  it('falls back to the request origin when SHOPIFY_APP_URL is unset', async () => {
    delete process.env.SHOPIFY_APP_URL
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])

    const req = new Request('https://origin.example/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    const [entry] = await res.json()
    expect(entry.pdf_url.startsWith('https://origin.example/api/me/assessment/aaaa-1111/pdf?')).toBe(true)
  })

  it('returns 503 when listFilesForSubmission throws', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/9876543210',
    })
    vi.mocked(submissions.listSubmissionLedger).mockResolvedValue([mockEntry])
    vi.mocked(submissionFiles.listFilesForSubmission).mockRejectedValue(new Error('connection refused'))

    const req = new Request('https://fly.dev/api/me/assessments', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await loader({ request: req, params: {}, context: {} } as any)
    expect(res.status).toBe(503)
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
        pdf_url: PDF_URL,
        files: [],
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
