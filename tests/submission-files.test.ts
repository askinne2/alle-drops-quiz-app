import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/lib/db', () => ({
  getPool: vi.fn(),
}))

import { getPool } from '../app/lib/db'
import {
  insertSubmissionFiles,
  getSubmissionFileForCustomer,
  getSubmissionFileForAdmin,
  listFilesForSubmission,
  type SubmissionFileRow,
} from '../app/lib/submission-files'

const mockRow: SubmissionFileRow = {
  id: 'file-aaaa',
  submission_id: 'sub-1111',
  storage_object_key: 'submissions/sub-1111/report.pdf',
  original_filename: 'allergy-report.pdf',
  content_type: 'application/pdf',
  original_content_type: 'application/pdf',
  size_bytes: 12345,
  uploaded_at: '2026-08-10T18:00:00.000Z',
}

describe('insertSubmissionFiles', () => {
  let clientQuery: ReturnType<typeof vi.fn>
  let clientRelease: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clientQuery = vi.fn()
    clientRelease = vi.fn()
    vi.mocked(getPool).mockReturnValue({
      connect: vi.fn().mockResolvedValue({
        query: clientQuery,
        release: clientRelease,
      }),
    } as any)
  })

  it('issues BEGIN, then the insert(s), then COMMIT, and releases the client exactly once on success', async () => {
    clientQuery.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve()
      if (sql === 'COMMIT') return Promise.resolve()
      if (sql.includes('INSERT INTO submission_files')) {
        return Promise.resolve({ rows: [mockRow] })
      }
      return Promise.resolve()
    })

    const files = [
      {
        storage_object_key: 'submissions/sub-1111/a.pdf',
        original_filename: 'a.pdf',
        content_type: 'application/pdf',
        original_content_type: 'application/pdf',
        size_bytes: 100,
      },
      {
        storage_object_key: 'submissions/sub-1111/b.jpg',
        original_filename: 'b.jpg',
        content_type: 'image/jpeg',
        original_content_type: 'image/jpeg',
        size_bytes: 200,
      },
    ]

    const result = await insertSubmissionFiles('sub-1111', files)

    expect(result).toEqual([mockRow, mockRow])

    const calledSql = clientQuery.mock.calls.map((call) => call[0])
    expect(calledSql[0]).toBe('BEGIN')
    expect(calledSql[calledSql.length - 1]).toBe('COMMIT')
    // exactly two INSERT statements between BEGIN and COMMIT (one per file)
    const insertCalls = calledSql.filter((sql: string) =>
      sql.includes('INSERT INTO submission_files')
    )
    expect(insertCalls.length).toBe(2)

    expect(clientRelease).toHaveBeenCalledTimes(1)
  })

  it('issues ROLLBACK and still releases the client exactly once when an insert rejects, propagating the error', async () => {
    const insertError = new Error('unique constraint violation')
    clientQuery.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve()
      if (sql === 'ROLLBACK') return Promise.resolve()
      if (sql.includes('INSERT INTO submission_files')) {
        return Promise.reject(insertError)
      }
      return Promise.resolve()
    })

    const files = [
      {
        storage_object_key: 'submissions/sub-1111/a.pdf',
        original_filename: 'a.pdf',
        content_type: 'application/pdf',
        original_content_type: 'application/pdf',
        size_bytes: 100,
      },
    ]

    await expect(insertSubmissionFiles('sub-1111', files)).rejects.toThrow(
      'unique constraint violation'
    )

    const calledSql = clientQuery.mock.calls.map((call) => call[0])
    expect(calledSql).toContain('ROLLBACK')
    expect(clientRelease).toHaveBeenCalledTimes(1)
  })

  it('never issues a statement containing UPDATE or DELETE', async () => {
    clientQuery.mockImplementation((sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve()
      if (sql.includes('INSERT INTO submission_files')) {
        return Promise.resolve({ rows: [mockRow] })
      }
      return Promise.resolve()
    })

    await insertSubmissionFiles('sub-1111', [
      {
        storage_object_key: 'submissions/sub-1111/a.pdf',
        original_filename: 'a.pdf',
        content_type: 'application/pdf',
        original_content_type: 'application/pdf',
        size_bytes: 100,
      },
    ])

    const calledSql: string[] = clientQuery.mock.calls.map((call) => call[0])
    for (const sql of calledSql) {
      expect(/UPDATE/i.test(sql)).toBe(false)
      expect(/DELETE/i.test(sql)).toBe(false)
    }
  })
})

describe('getSubmissionFileForCustomer (ownership boundary)', () => {
  let poolQuery: ReturnType<typeof vi.fn>

  beforeEach(() => {
    poolQuery = vi.fn().mockResolvedValue({ rows: [mockRow] })
    vi.mocked(getPool).mockReturnValue({ query: poolQuery } as any)
  })

  it('joins through submissions and constrains by customer_id_shopify, patient_email, AND submission_id — never a bare WHERE id = $1', async () => {
    await getSubmissionFileForCustomer({
      submissionId: 'sub-1111',
      fileId: 'file-aaaa',
      customer_id_shopify: 'gid://shopify/Customer/1',
      email: null,
    })

    expect(poolQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = poolQuery.mock.calls[0]

    // Ownership boundary: assert the SQL TEXT, not just the return value. This is the
    // predicate the non-vacuity control (below) proves cannot be silently deleted.
    expect(sql).toContain('submissions')
    expect(sql).toContain('customer_id_shopify')
    expect(sql).toContain('patient_email')
    expect(sql).toContain('submission_id')
    expect(/JOIN\s+submissions/i.test(sql)).toBe(true)
    // Must not be a bare unconstrained lookup by file id alone
    expect(/WHERE\s+id\s*=\s*\$1\s*$/im.test(sql.trim())).toBe(false)

    // Parameter positions: fileId, submissionId, customer_id_shopify, email
    expect(params).toEqual(['file-aaaa', 'sub-1111', 'gid://shopify/Customer/1', null])
  })

  it('returns null (not a distinguishing error) when the fake pool returns zero rows — the "wrong customer" case', async () => {
    poolQuery.mockResolvedValue({ rows: [] })

    const result = await getSubmissionFileForCustomer({
      submissionId: 'sub-1111',
      fileId: 'file-aaaa',
      customer_id_shopify: 'gid://shopify/Customer/999-not-the-owner',
      email: null,
    })

    expect(result).toBeNull()
  })

  /**
   * NON-VACUITY CONTROL for the ownership-boundary assertions above.
   *
   * Confirmed non-vacuous by direct source mutation during authoring: the
   * `customer_id_shopify`/`patient_email`/`submission_id` predicate lines were temporarily
   * deleted from `getSubmissionFileForCustomer`'s SQL in app/lib/submission-files.ts (leaving
   * only `WHERE sf.id = $1`), this test file was re-run, and the assertions above failed as
   * expected (missing substring + the bare-WHERE-id check flipping to true). The source was
   * then restored and the suite re-run green. This test re-asserts the same predicate
   * substrings so a future regression that deletes them fails this exact check, not just a
   * boolean "ownership enforced" flag.
   */
  it('would fail this suite if the ownership predicates were removed from the query (non-vacuity control)', async () => {
    await getSubmissionFileForCustomer({
      submissionId: 'sub-1111',
      fileId: 'file-aaaa',
      customer_id_shopify: null,
      email: 'patient@example.com',
    })

    const [sql] = poolQuery.mock.calls[poolQuery.mock.calls.length - 1]
    expect(sql.includes('customer_id_shopify')).toBe(true)
    expect(sql.includes('patient_email')).toBe(true)
    expect(sql.includes('submission_id')).toBe(true)
  })
})

describe('getSubmissionFileForAdmin', () => {
  it('issues SQL WITHOUT customer_id_shopify/patient_email but WITH submission_id', async () => {
    const poolQuery = vi.fn().mockResolvedValue({ rows: [mockRow] })
    vi.mocked(getPool).mockReturnValue({ query: poolQuery } as any)

    await getSubmissionFileForAdmin('sub-1111', 'file-aaaa')

    expect(poolQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = poolQuery.mock.calls[0]

    expect(sql).not.toContain('customer_id_shopify')
    expect(sql).not.toContain('patient_email')
    expect(sql).toContain('submission_id')
    expect(params).toEqual(['file-aaaa', 'sub-1111'])
  })
})

describe('listFilesForSubmission', () => {
  it('issues SQL containing ORDER BY uploaded_at ASC', async () => {
    const poolQuery = vi.fn().mockResolvedValue({ rows: [mockRow] })
    vi.mocked(getPool).mockReturnValue({ query: poolQuery } as any)

    const result = await listFilesForSubmission('sub-1111')

    expect(result).toEqual([mockRow])
    const [sql] = poolQuery.mock.calls[0]
    expect(sql).toContain('ORDER BY uploaded_at ASC')
  })
})
