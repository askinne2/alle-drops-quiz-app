import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/lib/customer-auth', () => ({
  verifyCustomerToken: vi.fn(),
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForCustomer: vi.fn(),
}))

vi.mock('../app/lib/submission-files', () => ({
  getSubmissionFileForCustomer: vi.fn(),
}))

vi.mock('../app/lib/storage/gcs', () => ({
  getSignedReadUrl: vi.fn(),
}))

import { loader } from '../app/routes/api.me.assessment.$id.files.$fileId'
import * as auth from '../app/lib/customer-auth'
import * as submissions from '../app/lib/submissions'
import * as submissionFiles from '../app/lib/submission-files'
import * as gcs from '../app/lib/storage/gcs'
import type { SubmissionFullRow } from '../app/lib/submissions'
import type { SubmissionFileRow } from '../app/lib/submission-files'

const SENTINEL_FILENAME = 'allergy-panel-jane-doe.pdf'
const SENTINEL_URL = 'https://storage.googleapis.com/alledrops-quiz-uploads-dev/signed-should-never-log'
const SENTINEL_TOKEN = 'super.secret.jwt-token'

const mockSubmission: SubmissionFullRow = {
  id: 'sub-1',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: 'gid://shopify/Customer/123',
  patient_name: 'Jane Doe',
  patient_dob: '1990-01-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '9+',
  answers_json: { testing_status: 'had_testing' },
  consent_version: 'v1',
  consent_accepted_at: '2026-05-01T12:00:00.000Z',
  consent_ip_address: '1.2.3.4',
  consent_user_agent: 'Mozilla/5.0',
  completion_time_seconds: 120,
  created_at: '2026-05-01T12:00:00.000Z',
}

const mockFile: SubmissionFileRow = {
  id: 'file-1',
  submission_id: 'sub-1',
  storage_object_key: 'submissions/sub-1/file-1-allergy-panel.pdf',
  original_filename: SENTINEL_FILENAME,
  content_type: 'application/pdf',
  original_content_type: 'application/pdf',
  size_bytes: 12345,
  uploaded_at: '2026-05-01T12:00:00.000Z',
}

function callLoader(request: Request, params: Record<string, string>) {
  return loader({ request, params, context: {} } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/me/assessment/:id/files/:fileId', () => {
  it('handles OPTIONS preflight with 204', async () => {
    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      method: 'OPTIONS',
    })
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(204)
  })

  it('returns 401 when there is no Authorization header and no ?token= param', async () => {
    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(401)
    expect(gcs.getSignedReadUrl).not.toHaveBeenCalled()
  })

  it('returns 401 for a malformed Bearer header', async () => {
    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      headers: { Authorization: 'Basic abc123' },
    })
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(401)
  })

  it('returns 401 when verifyCustomerToken rejects', async () => {
    vi.mocked(auth.verifyCustomerToken).mockRejectedValue(new Error('Invalid session token'))
    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      headers: { Authorization: 'Bearer bad.token' },
    })
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the submission is not owned by the caller — signed-URL mock never called', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/999',
    })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      headers: { Authorization: 'Bearer good.token' },
    })
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
    expect(submissionFiles.getSubmissionFileForCustomer).not.toHaveBeenCalled()
    expect(gcs.getSignedReadUrl).not.toHaveBeenCalled()
  })

  it('returns the SAME 404 body when the file does not exist (byte-identical to not-owned)', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/123',
    })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForCustomer).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      headers: { Authorization: 'Bearer good.token' },
    })
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
    expect(gcs.getSignedReadUrl).not.toHaveBeenCalled()
  })

  it('returns 200 with a signed url and Cache-Control: no-store on the happy (JSON) path', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/123',
    })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForCustomer).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)

    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      headers: { Authorization: 'Bearer good.token', Accept: 'application/json' },
    })
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json()
    expect(body).toEqual({ url: SENTINEL_URL })
    expect(Object.keys(body)).toEqual(['url'])
    expect(gcs.getSignedReadUrl).toHaveBeenCalledTimes(1)
    expect(gcs.getSignedReadUrl).toHaveBeenCalledWith(
      mockFile.storage_object_key,
      mockFile.original_filename
    )
  })

  it('redirects to the signed url (302) for a ?token= navigation without Accept: application/json', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/123',
    })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForCustomer).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)

    const req = new Request(
      `https://fly.dev/api/me/assessment/sub-1/files/file-1?token=${encodeURIComponent(SENTINEL_TOKEN)}`
    )
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe(SENTINEL_URL)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('honors ?as=json even when the token came from the query param', async () => {
    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/123',
    })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForCustomer).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)

    const req = new Request(
      `https://fly.dev/api/me/assessment/sub-1/files/file-1?token=${encodeURIComponent(SENTINEL_TOKEN)}&as=json`
    )
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ url: SENTINEL_URL })
  })

  it('never logs the filename, the raw token, or the signed url', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(auth.verifyCustomerToken).mockResolvedValue({
      customerId: 'gid://shopify/Customer/123',
    })
    vi.mocked(submissions.getSubmissionByIdForCustomer).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForCustomer).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)

    const req = new Request('https://fly.dev/api/me/assessment/sub-1/files/file-1', {
      headers: { Authorization: `Bearer ${SENTINEL_TOKEN}`, Accept: 'application/json' },
    })
    await callLoader(req, { id: 'sub-1', fileId: 'file-1' })

    const allCallArgs = [...logSpy.mock.calls, ...errSpy.mock.calls, ...warnSpy.mock.calls]
    const serialized = allCallArgs.map((call) => call.map((a) => JSON.stringify(a)).join(' ')).join(' ')

    expect(serialized).not.toContain(SENTINEL_FILENAME)
    expect(serialized).not.toContain(SENTINEL_URL)
    expect(serialized).not.toContain(SENTINEL_TOKEN)

    logSpy.mockRestore()
    errSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
