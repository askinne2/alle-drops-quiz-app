import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForAdmin: vi.fn(),
  logSubmissionAccess: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../app/lib/submission-files', () => ({
  getSubmissionFileForAdmin: vi.fn(),
}))

vi.mock('../app/lib/storage/gcs', () => ({
  getSignedReadUrl: vi.fn(),
}))

import { loader } from '../app/routes/api.admin.submission.$id.file.$fileId'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import * as submissionFiles from '../app/lib/submission-files'
import * as gcs from '../app/lib/storage/gcs'
import { logSubmissionAccess } from '../app/lib/submissions'
import type { SubmissionFullRow } from '../app/lib/submissions'
import type { SubmissionFileRow } from '../app/lib/submission-files'

const SENTINEL_FILENAME = 'allergy-panel-jane-doe.pdf'
const SENTINEL_URL = 'https://storage.googleapis.com/alledrops-quiz-uploads-dev/signed-should-never-log'

const mockSession = { shop: 'allergist-on-demand.myshopify.com', id: 'session-1' }

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

describe('GET /api/admin/submission/:id/file/:fileId', () => {
  it('returns 401 when authenticate.admin throws a non-Response error — signed-URL mock never called', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(new Error('no session'))
    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(401)
    expect(gcs.getSignedReadUrl).not.toHaveBeenCalled()
  })

  it('returns the thrown Response as-is (Shopify redirect/reauth flow)', async () => {
    const thrown = new Response('redirect', { status: 302, headers: { Location: '/auth' } })
    vi.mocked(shopifyServer.authenticate.admin).mockRejectedValue(thrown)
    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res).toBe(thrown)
  })

  it('returns 404 when the submission does not exist', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
  })

  it('returns the SAME 404 body when the file does not exist', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForAdmin).mockResolvedValue(null)

    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
  })

  it('returns 200 with a signed url and Cache-Control: no-store, logging access exactly once with action "file"', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForAdmin).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)

    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json()
    expect(body).toEqual({ url: SENTINEL_URL })
    expect(Object.keys(body)).toEqual(['url'])

    expect(logSubmissionAccess).toHaveBeenCalledTimes(1)
    expect(logSubmissionAccess).toHaveBeenCalledWith({
      submission_id: 'sub-1',
      actor_shop: 'allergist-on-demand.myshopify.com',
      action: 'file',
    })
  })

  it('still returns 200 when the audit write rejects (fire-and-forget, never awaited)', async () => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForAdmin).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)
    vi.mocked(logSubmissionAccess).mockRejectedValue(new Error('audit db down'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    const res = await callLoader(req, { id: 'sub-1', fileId: 'file-1' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ url: SENTINEL_URL })

    errSpy.mockRestore()
  })

  it('never logs the filename or the signed url', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue(
      { session: mockSession, admin: {} } as any
    )
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue(mockSubmission)
    vi.mocked(submissionFiles.getSubmissionFileForAdmin).mockResolvedValue(mockFile)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue(SENTINEL_URL)

    const req = new Request('https://fly.dev/api/admin/submission/sub-1/file/file-1')
    await callLoader(req, { id: 'sub-1', fileId: 'file-1' })

    const allCallArgs = [...logSpy.mock.calls, ...errSpy.mock.calls, ...warnSpy.mock.calls]
    const serialized = allCallArgs.map((call) => call.map((a) => JSON.stringify(a)).join(' ')).join(' ')

    expect(serialized).not.toContain(SENTINEL_FILENAME)
    expect(serialized).not.toContain(SENTINEL_URL)

    logSpy.mockRestore()
    errSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
