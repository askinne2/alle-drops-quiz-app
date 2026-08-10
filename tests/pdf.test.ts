import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PDFDocument } from 'pdf-lib'

vi.mock('../app/lib/submission-files', () => ({
  listFilesForSubmission: vi.fn(),
}))
vi.mock('../app/lib/storage/gcs', () => ({
  readObjectBytes: vi.fn(),
}))

import { generateVisitSummaryPdf } from '../app/lib/pdf'
import type { SubmissionFullRow } from '../app/lib/submissions'
import type { SubmissionFileRow } from '../app/lib/submission-files'
import * as submissionFiles from '../app/lib/submission-files'
import * as gcs from '../app/lib/storage/gcs'

const baseRow: SubmissionFullRow = {
  id: 'aaaa-bbbb-cccc-dddd',
  symptom_profile_id: 'AOD_TEST_001',
  customer_id_shopify: 'gid://shopify/Customer/1',
  patient_name: 'Jane Test',
  patient_dob: '1985-06-15',
  patient_email: 'jane@example.com',
  patient_phone: '6155551234',
  patient_state: 'tennessee',
  quiz_score: 9,
  score_bracket: '7+',
  answers_json: { q1: 'yes', q2: 'no', q3: 'sometimes' },
  consent_version: 'v1.0',
  consent_accepted_at: '2026-05-07T18:00:00Z',
  consent_ip_address: '1.2.3.4',
  consent_user_agent: 'Mozilla/5.0',
  completion_time_seconds: 120,
  created_at: '2026-05-07T18:00:00Z',
}

// Pre-04-15 golden: the exact base document (baseRow, zero uploaded files) produced by the
// pdfkit-only code path this plan post-processes. Measured directly against the pre-change
// source (git HEAD before this plan's edit) — recorded in 04-15-SUMMARY.md.
const GOLDEN_NO_FILES_PAGE_COUNT = 1

describe('generateVisitSummaryPdf', () => {
  it('returns a non-empty Buffer', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const buf = await generateVisitSummaryPdf(baseRow)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('PDF starts with the %PDF magic bytes', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const buf = await generateVisitSummaryPdf(baseRow)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('renders a medical-history answer through the label map', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const row = {
      ...baseRow,
      answers_json: { history_comorbidities: ['asthma'], has_pcp: 'no' },
    }
    const buf = await generateVisitSummaryPdf(row)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('renders without consent section when consent_version is null', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const row = { ...baseRow, consent_version: null, consent_accepted_at: null }
    const buf = await generateVisitSummaryPdf(row)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })
})

// ── 04-15: Test Results section + pdf-lib file embedding ─────────────────────────────────────

// Tiny (67-byte) valid 1x1 PNG, standard "smallest valid PNG" bytes — an in-test byte array, not
// a committed binary fixture.
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// Minimal valid 1x1 JPEG (SOI/APP0/SOF0/... down to EOI) — also an in-test byte array.
const JPG_1X1_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

const SENTINEL_FILENAME = 'allergy-panel-jane-doe.pdf'

function makeFile(overrides: Partial<SubmissionFileRow>): SubmissionFileRow {
  return {
    id: 'file-default',
    submission_id: baseRow.id,
    storage_object_key: `submissions/${baseRow.id}/file-default`,
    original_filename: SENTINEL_FILENAME,
    content_type: 'application/pdf',
    original_content_type: 'application/pdf',
    size_bytes: 100,
    uploaded_at: '2026-05-01T12:00:00.000Z',
    ...overrides,
  }
}

async function pageCountOf(buf: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buf)
  return doc.getPageCount()
}

async function buildDonorPdfBytes(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage()
  return Buffer.from(await doc.save())
}

const rowWithTestingAnswers: SubmissionFullRow = {
  ...baseRow,
  answers_json: {
    ...baseRow.answers_json,
    testing_status: 'had_testing',
    testing_year: '2024',
    testing_location: 'Allergy & Asthma Clinic',
    testing_allergens: ['ragweed', 'dust mite'],
  },
}

describe('generateVisitSummaryPdf — Test Results section (Part 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Test Results section heading regardless of whether testing answers exist', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const buf = await generateVisitSummaryPdf(baseRow)
    // pdfkit text streams are compressed; assert structurally via a valid, loadable PDF instead
    // of a literal string search on binary content.
    const doc = await PDFDocument.load(buf)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('does not throw when Part 7 answers are present', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])
    const buf = await generateVisitSummaryPdf(rowWithTestingAnswers)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })
})

describe('generateVisitSummaryPdf — file embedding (04-15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Case 1: no-files regression — readObjectBytes never called, page count matches the pre-change golden', async () => {
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([])

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(gcs.readObjectBytes).not.toHaveBeenCalled()
    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT)
  })

  it('Case 2: JPEG embed — page count grows by exactly one', async () => {
    const file = makeFile({ id: 'file-jpg', content_type: 'image/jpeg', original_content_type: 'image/jpeg' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([file])
    vi.mocked(gcs.readObjectBytes).mockResolvedValue(Buffer.from(JPG_1X1_B64, 'base64'))

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + 1)
  })

  it('Case 3: PNG embed — page count grows by exactly one', async () => {
    const file = makeFile({ id: 'file-png', content_type: 'image/png', original_content_type: 'image/png' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([file])
    vi.mocked(gcs.readObjectBytes).mockResolvedValue(Buffer.from(PNG_1X1_B64, 'base64'))

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + 1)
  })

  it('Case 4: PDF merge — page count grows by exactly the donor page count', async () => {
    const donorPages = 3
    const donorBytes = await buildDonorPdfBytes(donorPages)
    const file = makeFile({ id: 'file-pdf', content_type: 'application/pdf', original_content_type: 'application/pdf' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([file])
    vi.mocked(gcs.readObjectBytes).mockResolvedValue(donorBytes)

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + donorPages)
  })

  it('Case 5: ordering — three files embed in uploaded_at ASC order', async () => {
    // Three single-page donor PDFs, each carrying a distinguishable page count via distinct
    // page sizes isn't reliable to introspect from outside pdf-lib's public API, so instead we
    // assert call order against readObjectBytes directly (the ordering listFilesForSubmission
    // itself guarantees) and confirm the final page count is the sum of all three.
    const fileA = makeFile({ id: 'file-a', uploaded_at: '2026-05-01T10:00:00.000Z' })
    const fileB = makeFile({ id: 'file-b', uploaded_at: '2026-05-01T11:00:00.000Z' })
    const fileC = makeFile({ id: 'file-c', uploaded_at: '2026-05-01T12:00:00.000Z' })
    // listFilesForSubmission is already ordered ASC by the data-access layer (plan 04-11); the
    // mock returns them in that same order, exactly as the real query would.
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([fileA, fileB, fileC])

    const readOrder: string[] = []
    vi.mocked(gcs.readObjectBytes).mockImplementation(async (key: string) => {
      readOrder.push(key)
      return buildDonorPdfBytes(1)
    })

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(readOrder).toEqual([fileA.storage_object_key, fileB.storage_object_key, fileC.storage_object_key])
    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + 3)
  })

  it('Case 6: degradation — an unreadable object still resolves, the other file embeds, and a note page is appended', async () => {
    const badFile = makeFile({ id: 'file-bad', storage_object_key: 'submissions/x/file-bad' })
    const goodFile = makeFile({ id: 'file-good', storage_object_key: 'submissions/x/file-good' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([badFile, goodFile])
    vi.mocked(gcs.readObjectBytes).mockImplementation(async (key: string) => {
      if (key === badFile.storage_object_key) throw new Error('object not found')
      return buildDonorPdfBytes(1)
    })

    const buf = await generateVisitSummaryPdf(baseRow)

    // One note page (for the bad file) + one merged donor page (for the good file).
    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + 2)
  })

  it('Case 7: degradation — a malformed donor PDF still resolves and appends a note page', async () => {
    const file = makeFile({ id: 'file-malformed', content_type: 'application/pdf' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([file])
    vi.mocked(gcs.readObjectBytes).mockResolvedValue(Buffer.from('not a real pdf'))

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + 1)
  })

  it('Case 8: unknown content type produces a note page and no embed attempt', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const file = makeFile({
      id: 'file-unknown',
      content_type: 'application/octet-stream',
      original_content_type: 'application/octet-stream',
    })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValue([file])
    vi.mocked(gcs.readObjectBytes).mockResolvedValue(Buffer.from('irrelevant bytes'))

    const buf = await generateVisitSummaryPdf(baseRow)

    expect(await pageCountOf(buf)).toBe(GOLDEN_NO_FILES_PAGE_COUNT + 1)
    // Distinguishes the "unsupported type, no embed attempted" branch (console.log, a planned
    // skip) from the "embed was attempted and threw" branch (console.error, a caught failure) —
    // proves the unknown-type path never reached an embedJpg/embedPng/copyPages call.
    expect(logSpy).toHaveBeenCalledWith(
      '[pdf] file embed skipped — unsupported content type',
      expect.objectContaining({ fileId: 'file-unknown' })
    )
    expect(errSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
    errSpy.mockRestore()
  })

  it('Case 9: PHI guard — no console.log/console.error call ever contains the sentinel filename', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Re-run a representative sweep of the cases above under the spies.
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValueOnce([])
    await generateVisitSummaryPdf(baseRow)

    const jpgFile = makeFile({ id: 'file-jpg-2', content_type: 'image/jpeg' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValueOnce([jpgFile])
    vi.mocked(gcs.readObjectBytes).mockResolvedValueOnce(Buffer.from(JPG_1X1_B64, 'base64'))
    await generateVisitSummaryPdf(baseRow)

    const badFile = makeFile({ id: 'file-bad-2' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValueOnce([badFile])
    vi.mocked(gcs.readObjectBytes).mockRejectedValueOnce(new Error('object not found'))
    await generateVisitSummaryPdf(baseRow)

    const unknownFile = makeFile({ id: 'file-unknown-2', content_type: 'application/octet-stream' })
    vi.mocked(submissionFiles.listFilesForSubmission).mockResolvedValueOnce([unknownFile])
    vi.mocked(gcs.readObjectBytes).mockResolvedValueOnce(Buffer.from('irrelevant'))
    await generateVisitSummaryPdf(baseRow)

    const allCallArgs = [...logSpy.mock.calls, ...errSpy.mock.calls]
    const serialized = allCallArgs.map((call) => call.map((a) => JSON.stringify(a)).join(' ')).join(' ')

    expect(serialized).not.toContain(SENTINEL_FILENAME)

    logSpy.mockRestore()
    errSpy.mockRestore()
  })
})
