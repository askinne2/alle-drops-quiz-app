import PDFDocument from 'pdfkit'
import type { SubmissionFullRow } from './submissions'
import { capitalize, formatDate, formatAnswerValue, getAnswerLabel } from './format'

const BRACKET_LABELS: Record<string, string> = {
  '0-2': '0–2 (Low)',
  '3-6': '3–6 (Moderate)',
  '7+':  '7+ (High)',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toUTCString()
  } catch {
    return iso
  }
}

export function generateVisitSummaryPdf(row: SubmissionFullRow): Promise<Buffer> {
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
    const answerEntries = Object.entries(answers)
    if (answerEntries.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No responses recorded.')
    } else {
      for (const [key, val] of answerEntries) {
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
