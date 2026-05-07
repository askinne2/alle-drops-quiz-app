import { describe, it, expect } from 'vitest'
import { generateVisitSummaryPdf } from '../app/lib/pdf'
import type { SubmissionFullRow } from '../app/lib/submissions'

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
  personal_history_json: ['seasonal allergies', 'asthma'],
  family_history_json: ['eczema'],
  consent_version: 'v1.0',
  consent_accepted_at: '2026-05-07T18:00:00Z',
  consent_ip_address: '1.2.3.4',
  consent_user_agent: 'Mozilla/5.0',
  completion_time_seconds: 120,
  created_at: '2026-05-07T18:00:00Z',
}

describe('generateVisitSummaryPdf', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await generateVisitSummaryPdf(baseRow)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('PDF starts with the %PDF magic bytes', async () => {
    const buf = await generateVisitSummaryPdf(baseRow)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('renders without history sections when history is null', async () => {
    const row = { ...baseRow, personal_history_json: null, family_history_json: null }
    const buf = await generateVisitSummaryPdf(row)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('renders without consent section when consent_version is null', async () => {
    const row = { ...baseRow, consent_version: null, consent_accepted_at: null }
    const buf = await generateVisitSummaryPdf(row)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
  })
})
