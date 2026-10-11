/**
 * Issue #46 items 2 + 3: error paths in Shopify helpers, the db pool and the admin access-log
 * writes must emit ONE structured ERROR line with no PHI (no email, DOB, name, row values).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

vi.mock('../app/lib/submissions', () => ({
  getSubmissionByIdForAdmin: vi.fn(),
  listAdminSubmissions: vi.fn(),
  logSubmissionAccess: vi.fn(),
}))

vi.mock('../app/lib/submission-files', () => ({
  listFilesForSubmission: vi.fn(),
  getSubmissionFileForAdmin: vi.fn(),
}))

vi.mock('../app/lib/storage/gcs', () => ({
  getSignedReadUrl: vi.fn(),
}))

vi.mock('../app/lib/pdf', () => ({
  generateVisitSummaryPdf: vi.fn(),
}))

import { findOrCreateCustomer } from '../app/lib/shopify/customers'
import { getCustomerMetafield, updateNonPhiQuizMetafields } from '../app/lib/shopify/metafields'
import { getPool, pingDatabase } from '../app/lib/db'
import { summarizeUserErrors } from '../app/lib/error-reporting.server'
import * as shopifyServer from '../app/shopify.server'
import * as submissions from '../app/lib/submissions'
import * as submissionFiles from '../app/lib/submission-files'
import * as gcs from '../app/lib/storage/gcs'
import * as pdf from '../app/lib/pdf'
import { loader as detailLoader } from '../app/routes/api.admin.submission.$id'
import { loader as listLoader } from '../app/routes/api.admin.submissions'
import { loader as fileLoader } from '../app/routes/api.admin.submission.$id.file.$fileId'
import { loader as pdfLoader } from '../app/routes/api.admin.assessment.$id.pdf'

const PHI = ['jane@example.com', '1990-01-01', 'Jane', 'Doe', '6155551234', 'Failing row']

/** A pg DatabaseError as node-postgres builds it: row values in `detail` (and sometimes message). */
function pgError(): Error {
  const err = new Error(
    'new row for relation "quiz_submissions" violates check constraint "patient_email_chk" for jane@example.com'
  ) as Error & Record<string, unknown>
  err.name = 'error'
  Object.assign(err, {
    code: '23514',
    severity: 'ERROR',
    detail: 'Failing row contains (jane@example.com, 1990-01-01, Jane, Doe, 6155551234)',
    table: 'quiz_submissions',
    constraint: 'patient_email_chk',
    routine: 'ExecConstraints',
  })
  return err
}

const USER_ERRORS = [
  { field: ['input', 'email'], code: 'TAKEN', message: 'Email jane@example.com has already been taken' },
  { field: ['metafields', '0', 'value'], message: 'Value "Jane Doe" on 1990-01-01 is invalid, phone 6155551234' },
]

let stderr: string[]
let consoleOut: string[]

beforeEach(() => {
  vi.clearAllMocks()
  stderr = []
  consoleOut = []
  vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => {
    stderr.push(String(chunk))
    return true
  }) as typeof process.stderr.write)
  for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
      consoleOut.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a) ?? String(a))).join(' '))
    })
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Exactly one structured ERROR line on stderr, nothing on console.error, no PHI anywhere. */
function expectOneScrubbedEntry(source: string) {
  const all = [...stderr, ...consoleOut].join('\n')
  for (const needle of PHI) expect(all).not.toContain(needle)
  expect(consoleOut.filter((l) => /error|fail/i.test(l))).toEqual([])
  expect(stderr).toHaveLength(1)
  const line = stderr[0]
  expect(line.endsWith('\n')).toBe(true)
  expect(line.trimEnd()).not.toContain('\n')
  const entry = JSON.parse(line)
  expect(entry.severity).toBe('ERROR')
  expect(entry['@type']).toMatch(/ReportedErrorEvent$/)
  expect(entry.source).toBe(source)
  return entry
}

const flush = () => new Promise((r) => setTimeout(r, 0))

function adminGraphql(responses: unknown[]) {
  const graphql = vi.fn()
  for (const r of responses) {
    if (r instanceof Error) graphql.mockRejectedValueOnce(r)
    else graphql.mockResolvedValueOnce({ json: async () => r })
  }
  return { graphql }
}

describe('summarizeUserErrors', () => {
  it('keeps field path + code, scrubs echoed PHI from message, drops everything else', () => {
    const out = summarizeUserErrors([
      { ...USER_ERRORS[0], value: 'jane@example.com', input: { email: 'jane@example.com' } },
    ])
    expect(out).toEqual([
      { field: 'input.email', code: 'TAKEN', message: 'Email [email] has already been taken' },
    ])
  })

  it('tolerates non-array / malformed input', () => {
    expect(summarizeUserErrors(undefined)).toEqual([])
    expect(summarizeUserErrors([null, 'x'])).toEqual([{}, {}])
  })
})

describe('Shopify customers', () => {
  it('customerCreate userErrors -> one scrubbed ERROR entry, returns null', async () => {
    const admin = adminGraphql([
      { data: { customers: { edges: [] } } },
      { data: { customerCreate: { customer: null, userErrors: USER_ERRORS } } },
    ])
    await expect(findOrCreateCustomer(admin, 'jane@example.com')).resolves.toBeNull()
    const entry = expectOneScrubbedEntry('shopify.customerCreate')
    expect(entry.extra.userErrors[0]).toEqual({
      field: 'input.email',
      code: 'TAKEN',
      message: 'Email [email] has already been taken',
    })
  })

  it('thrown error is logged scrubbed and still rethrown', async () => {
    const boom = pgError()
    const admin = adminGraphql([boom])
    await expect(findOrCreateCustomer(admin, 'jane@example.com')).rejects.toBe(boom)
    const entry = expectOneScrubbedEntry('shopify.findOrCreateCustomer')
    expect(entry.errorCode).toBe('23514')
  })
})

describe('Shopify metafields', () => {
  it('read failure -> one scrubbed ERROR entry, returns null', async () => {
    const admin = adminGraphql([pgError()])
    await expect(getCustomerMetafield(admin, 'gid://shopify/Customer/1', 'a', 'b')).resolves.toBeNull()
    expectOneScrubbedEntry('metafields.read')
  })

  it('write userErrors -> one scrubbed ERROR entry, same return value as before', async () => {
    const admin = adminGraphql([
      { data: { customer: { metafield: { value: '2' } } } },
      { data: { metafieldsSet: { userErrors: USER_ERRORS } } },
    ])
    const res = await updateNonPhiQuizMetafields(admin, 'gid://shopify/Customer/1')
    expect(res.success).toBe(false)
    expect(res.error).toBe(USER_ERRORS.map((e) => `${e.field}: ${e.message}`).join('; '))
    const entry = expectOneScrubbedEntry('metafields.write')
    expect(entry.extra.userErrors[1].message).toBe('Value [value] on [date] is invalid, phone [phone]')
  })

  it('write failure -> one scrubbed ERROR entry, success false', async () => {
    const admin = adminGraphql([{ data: { customer: { metafield: null } } }, pgError()])
    const res = await updateNonPhiQuizMetafields(admin, 'gid://shopify/Customer/1')
    expect(res.success).toBe(false)
    expectOneScrubbedEntry('metafields.write')
  })
})

describe('db pool', () => {
  const ORIGINAL = process.env.DATABASE_URL
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:5999/db?sslmode=disable'
  })
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = ORIGINAL
  })

  it('ping failure with a pg error -> one ERROR entry with code + constraint only', async () => {
    const pool = getPool()
    vi.spyOn(pool, 'query').mockRejectedValue(pgError() as never)
    await expect(pingDatabase()).resolves.toBe(false)
    const entry = expectOneScrubbedEntry('db.ping')
    expect(entry.errorCode).toBe('23514')
    expect(entry.message.split('\n')[0]).toBe('error: Postgres error 23514 (constraint patient_email_chk)')
  })

  it('pool error event -> one scrubbed ERROR entry', () => {
    getPool().emit('error', pgError())
    expectOneScrubbedEntry('db.pool')
  })
})

describe('admin access-log write failures', () => {
  const session = { shop: 'allergist-on-demand.myshopify.com', id: 's' }
  beforeEach(() => {
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue({ session, admin: {} } as never)
    vi.mocked(submissions.logSubmissionAccess).mockRejectedValue(pgError())
  })

  /** The success-path audit line (`[admin] fetched ...`) is IDs only; drop it before asserting. */
  const dropAuditLine = () => {
    consoleOut = consoleOut.filter((l) => !l.startsWith('[admin] fetched') && !l.startsWith('[admin] generated'))
  }

  it('detail route', async () => {
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue({ id: 'uuid-1' } as never)
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const res = await detailLoader({
      request: new Request('https://x.test/api/admin/submission/uuid-1?email=jane@example.com'),
      params: { id: 'uuid-1' },
      context: {},
    } as never)
    expect(res.status).toBe(200)
    await flush()
    dropAuditLine()
    const entry = expectOneScrubbedEntry('admin.accessLog')
    expect(entry.params).toEqual({ id: 'uuid-1' })
    expect(entry.context.httpRequest.url).toBe('/api/admin/submission/uuid-1')
  })

  it('detail route file-list failure is reported scrubbed (and still 200)', async () => {
    vi.mocked(submissions.logSubmissionAccess).mockResolvedValue(undefined)
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue({ id: 'uuid-1' } as never)
    vi.mocked(submissionFiles.listFilesForSubmission).mockRejectedValue(pgError())
    const res = await detailLoader({
      request: new Request('https://x.test/api/admin/submission/uuid-1'),
      params: { id: 'uuid-1' },
      context: {},
    } as never)
    expect(res.status).toBe(200)
    await flush()
    dropAuditLine()
    expectOneScrubbedEntry('admin.fileList')
  })

  it('list route', async () => {
    vi.mocked(submissions.listAdminSubmissions).mockResolvedValue({
      rows: [],
      hasNextPage: false,
    } as never)
    const res = await listLoader({
      request: new Request('https://x.test/api/admin/submissions'),
      params: {},
      context: {},
    } as never)
    expect(res.status).toBe(200)
    await flush()
    dropAuditLine()
    expectOneScrubbedEntry('admin.accessLog')
  })

  it('file route', async () => {
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue({ id: 'sub-1' } as never)
    vi.mocked(submissionFiles.getSubmissionFileForAdmin).mockResolvedValue({
      storage_object_key: 'k',
      original_filename: 'f.pdf',
    } as never)
    vi.mocked(gcs.getSignedReadUrl).mockResolvedValue('https://signed.example/x')
    const res = await fileLoader({
      request: new Request('https://x.test/api/admin/submission/sub-1/file/file-1'),
      params: { id: 'sub-1', fileId: 'file-1' },
      context: {},
    } as never)
    expect(res.status).toBe(200)
    await flush()
    dropAuditLine()
    const entry = expectOneScrubbedEntry('admin.accessLog')
    expect(entry.params).toEqual({ id: 'sub-1', fileId: 'file-1' })
  })

  it('pdf route (access log + generation failure)', async () => {
    vi.mocked(submissions.getSubmissionByIdForAdmin).mockResolvedValue({ id: 'uuid-1' } as never)
    vi.mocked(pdf.generateVisitSummaryPdf).mockResolvedValue(Buffer.from('%PDF'))
    const ok = await pdfLoader({
      request: new Request('https://x.test/api/admin/assessment/uuid-1/pdf'),
      params: { id: 'uuid-1' },
      context: {},
    } as never)
    expect(ok.status).toBe(200)
    await flush()
    dropAuditLine()
    expectOneScrubbedEntry('admin.accessLog')

    stderr = []
    consoleOut = []
    vi.mocked(pdf.generateVisitSummaryPdf).mockRejectedValue(pgError())
    const bad = await pdfLoader({
      request: new Request('https://x.test/api/admin/assessment/uuid-1/pdf'),
      params: { id: 'uuid-1' },
      context: {},
    } as never)
    expect(bad.status).toBe(500)
    const entry = expectOneScrubbedEntry('admin.pdf.generate')
    expect(entry.context.httpRequest.responseStatusCode).toBe(500)
  })
})
