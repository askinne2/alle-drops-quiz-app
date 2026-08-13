import PDFDocument from 'pdfkit'
import { PDFDocument as PdfLibDocument, StandardFonts, type PDFFont, type PDFImage } from 'pdf-lib'
import type { SubmissionFullRow } from './submissions'
import { capitalize, formatDate, formatAnswerValue, getAnswerLabel, partitionAnswers } from './format'
import { listFilesForSubmission } from './submission-files'
import type { SubmissionFileRow } from './submission-files'
import { readObjectBytes } from './storage/gcs'

const BRACKET_LABELS: Record<string, string> = {
  '0-2': '0–2 (Low)',
  '3-8': '3–8 (Moderate)',
  '9+':  '9+ (High)',
  // Legacy pre-2026-08-13 boundaries — historical rows are never relabelled, so these stay
  // renderable rather than falling through to the bare score_bracket string. See D-52-04.
  '3-6': '3–6 (Moderate, pre-2026-08-13)',
  '7+':  '7+ (High, pre-2026-08-13)',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toUTCString()
  } catch {
    return iso
  }
}

/**
 * Base clinical document — pdfkit only. Unchanged in shape from the pre-04-15 version except for
 * the new "Test Results" section (Part 7 answers, same getAnswerLabel/labelValue pattern as every
 * other section). This function makes zero network calls and reads no external data beyond `row`.
 *
 * "Test Results" is now the SOLE render site for Part 7 keys (testing_status/testing_year/
 * testing_location/testing_allergens) — both sections are driven by one partitionAnswers(answers)
 * call, closing a pre-existing Phase 4 defect where these keys printed twice (once here, once in
 * Test Results). See 04.1-CONTEXT.md D-05.
 */
function generateBasePdf(row: SubmissionFullRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
    const W = doc.page.width - 100 // usable width (50px margin each side)

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text('AlleDrops — Allergist on Demand', { align: 'center' })
    doc.fontSize(13).font('Helvetica').text('Symptom Assessment — Visit Summary', { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke()
    doc.moveDown(0.5)

    // ── Document meta ────────────────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
    doc.text(`Assessment ID: ${row.id}`)
    doc.text(`Profile: ${row.symptom_profile_id}    |    State: ${capitalize(row.patient_state)}`)
    doc.text(`Date: ${formatDate(row.created_at)}`)
    doc.fillColor('#000000').moveDown(0.8)

    // ── Section helper ───────────────────────────────────────────────────────
    function sectionHeader(title: string) {
      doc.fontSize(11).font('Helvetica-Bold').text(title.toUpperCase())
      doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#cccccc').stroke()
      doc.strokeColor('#000000').moveDown(0.3)
    }

    function labelValue(label: string, value: string) {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true })
      doc.font('Helvetica').text(value || '—')
    }

    // ── Patient information ──────────────────────────────────────────────────
    sectionHeader('Patient Information')
    labelValue('Name',          row.patient_name)
    labelValue('Date of Birth', formatDate(row.patient_dob))
    labelValue('Email',         row.patient_email)
    labelValue('Phone',         row.patient_phone)
    doc.moveDown(0.8)

    // ── Assessment results ───────────────────────────────────────────────────
    sectionHeader('Assessment Results')
    labelValue('Score',     String(row.quiz_score))
    labelValue('Bracket',   BRACKET_LABELS[row.score_bracket] ?? row.score_bracket)
    labelValue('Completed', formatDateTime(row.created_at))
    doc.moveDown(0.8)

    // ── Symptom responses ────────────────────────────────────────────────────
    sectionHeader('Symptom Responses')
    const answers = row.answers_json ?? {}
    const { symptomEntries, testingEntries } = partitionAnswers(answers)
    if (symptomEntries.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No responses recorded.')
    } else {
      for (const [key, val] of symptomEntries) {
        labelValue(getAnswerLabel(key), formatAnswerValue(val))
      }
    }
    doc.moveDown(0.8)

    // ── Test Results (Part 7 — TEST-01..TEST-03) ─────────────────────────────
    // Sole render site for Part 7 keys (D-05). Closes the pre-existing Phase 4 duplication where
    // testing answers printed both here and in Symptom Responses above — see 04.1-CONTEXT.md D-05.
    sectionHeader('Test Results')
    if (testingEntries.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No testing information recorded.')
    } else {
      for (const [key, val] of testingEntries) {
        labelValue(getAnswerLabel(key), formatAnswerValue(val))
      }
    }
    doc.moveDown(0.8)

    // ── Consent record (conditional) ─────────────────────────────────────────
    if (row.consent_version) {
      sectionHeader('Consent Record')
      labelValue('Version',      row.consent_version)
      labelValue('Acknowledged', formatDateTime(row.consent_accepted_at))
      doc.moveDown(0.8)
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke()
    doc.moveDown(0.3)
    doc.fontSize(8).font('Helvetica').fillColor('#555555')
    doc.text(`Generated: ${new Date().toUTCString()}`, { align: 'left' })
    doc.moveDown(0.2)
    doc.text(
      'This document contains protected health information (PHI). ' +
      'Unauthorized disclosure is prohibited under HIPAA (45 CFR §164).',
      { align: 'left' }
    )
    doc.fillColor('#000000')

    doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Copies bytes into a fresh, zero-offset Uint8Array. pdf-lib's JPEG/PNG embedders read
 * `imageData.buffer` directly via `DataView`, ignoring `byteOffset`/`byteLength` — a Buffer
 * sliced from a larger pooled allocation (as Node's Buffer machinery sometimes returns) would be
 * misparsed as corrupt. This makes embedding robust regardless of how the caller's bytes arrived.
 */
function toZeroOffsetBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes)
}

/** Draws one full-page image, scaled to fit within the page margins, and appends it to `pdfDoc`. */
function drawImagePage(pdfDoc: PdfLibDocument, img: PDFImage): void {
  const page = pdfDoc.addPage()
  const dims = img.scaleToFit(page.getWidth() - 100, page.getHeight() - 150)
  page.drawImage(img, { x: 50, y: 50, width: dims.width, height: dims.height })
}

/**
 * Appends a plain-text note page in place of a file that could not be embedded (unsupported
 * content type, unreadable object, or a malformed donor PDF). Identifies the file by id and byte
 * size ONLY — never by filename, which is PHI (CLAUDE.md rule 5).
 */
function appendNotePage(pdfDoc: PdfLibDocument, font: PDFFont, file: SubmissionFileRow, reason: string): void {
  const page = pdfDoc.addPage()
  const { height } = page.getSize()
  page.drawText('Uploaded File — Not Embedded', { x: 50, y: height - 80, size: 14, font })
  page.drawText(`File ID: ${file.id}`, { x: 50, y: height - 108, size: 11, font })
  page.drawText(`Size: ${file.size_bytes} bytes`, { x: 50, y: height - 128, size: 11, font })
  page.drawText(`Reason: ${reason}`, { x: 50, y: height - 148, size: 11, font })
}

/**
 * pdf-lib post-processing.
 *
 * `pdfkit` (used for `generateBasePdf` above) cannot embed another PDF's pages
 * (foliojs/pdfkit#318, open since 2016) — that is why `pdf-lib` post-processes pdfkit's output
 * here: `copyPages` for donor PDFs, `embedJpg` / `embedPng` for images. HEIC never reaches this
 * code because plan 04-13 converts it to JPEG at upload time. Bytes are read server-side through
 * the authenticated GCS client (`readObjectBytes`) and are never fetched via a public URL — no
 * remote fonts, no remote images, no remote CSS anywhere in this file (CLAUDE.md PHI checklist).
 *
 * `pdf-lib` itself has been unmaintained since 2022-05-12 (04-RESEARCH.md Assumption A1),
 * ratified at plan 04-10 Task 2. The residual risk is bounded: this code only ever parses PDFs
 * the app itself produced (the base pdfkit document) plus patient-uploaded files that already
 * passed upload-time magic-byte validation — it never renders arbitrary untrusted PDF structure
 * pulled from the open internet.
 */
export async function generateVisitSummaryPdf(row: SubmissionFullRow): Promise<Buffer> {
  const baseBytes = await generateBasePdf(row)

  let files: SubmissionFileRow[]
  try {
    files = await listFilesForSubmission(row.id)
  } catch (err) {
    // The clinical record itself already rendered successfully above — a metadata-lookup
    // failure for the (optional) attachments must not turn a working PDF into a 500.
    console.error('[pdf] file list fetch failed, returning base document only', {
      submissionId: row.id,
    })
    return baseBytes
  }

  if (files.length === 0) {
    // No uploads — output must be byte-comparable to the pre-04-15 pdfkit-only path.
    return baseBytes
  }

  const merged = await PdfLibDocument.load(baseBytes)
  const font = await merged.embedFont(StandardFonts.Helvetica)

  for (const file of files) {
    try {
      const bytes = await readObjectBytes(file.storage_object_key)

      if (file.content_type === 'application/pdf') {
        const donor = await PdfLibDocument.load(bytes)
        const pages = await merged.copyPages(donor, donor.getPageIndices())
        pages.forEach((page) => merged.addPage(page))
      } else if (file.content_type === 'image/jpeg') {
        // pdf-lib's JPEG parser reads `imageData.buffer` directly via DataView, ignoring
        // byteOffset/byteLength — a Buffer sliced from a larger pool (as Node sometimes
        // returns) would be misread as corrupt. Copy to a zero-offset Uint8Array defensively.
        drawImagePage(merged, await merged.embedJpg(toZeroOffsetBytes(bytes)))
      } else if (file.content_type === 'image/png') {
        drawImagePage(merged, await merged.embedPng(toZeroOffsetBytes(bytes)))
      } else {
        appendNotePage(merged, font, file, 'unsupported content type')
        console.log('[pdf] file embed skipped — unsupported content type', {
          submissionId: row.id,
          fileId: file.id,
          sizeBytes: file.size_bytes,
        })
        continue
      }

      console.log('[pdf] file embedded', {
        submissionId: row.id,
        fileId: file.id,
        sizeBytes: file.size_bytes,
      })
    } catch (err) {
      // Degradation is mandatory: an unreadable object, a malformed donor PDF, or a failed image
      // embed must cost this one file a note page, never the whole download.
      appendNotePage(merged, font, file, 'could not be read or embedded')
      console.error('[pdf] file embed failed, appended note page', {
        submissionId: row.id,
        fileId: file.id,
        sizeBytes: file.size_bytes,
      })
    }
  }

  const finalBytes = await merged.save()
  return Buffer.from(finalBytes)
}
