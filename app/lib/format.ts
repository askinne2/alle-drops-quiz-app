export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

export function formatAnswerValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ')
  if (val !== null && typeof val === 'object') return JSON.stringify(val)
  return String(val ?? '—')
}

// Question-ID -> clinical-label map (D-05). Consumed by app/lib/pdf.ts and
// app/routes/app.quiz-results.tsx, the two PHI-facing answer renderers. An unmapped key
// intentionally falls back to today's exact behavior via getAnswerLabel below, so an existing
// row can never regress.
const ANSWER_LABELS: Record<string, string> = {
  // Phase 3 medical history (HIST-01..HIST-04, DIAG-01) — the reason this map exists.
  history_comorbidities: 'Personal history of medical conditions',
  history_medications_has: 'Currently taking medications (any kind)',
  current_medications: 'Current medications (all)',
  history_surgeries_has: 'Has had previous surgeries',
  history_surgeries: 'Previous surgeries and dates',
  history_allergies_has: 'Has known allergies',
  history_allergies: 'Known allergies (medication, food, environmental)',
  history_conditions_has: 'Has other medical conditions',
  history_conditions: 'Other medical conditions',
  has_pcp: 'Has a primary care physician',
  pcp_clinic_name: 'PCP clinic name',
  pcp_clinic_address: 'PCP clinic address',
  diagnosed_allergic_condition: 'Diagnosed with an allergic condition by a provider',
  // Existing Parts 1-5 IDs that read badly under the fallback — fixed here for free.
  symptoms_nasal: 'Nasal symptoms',
  symptoms_eye: 'Eye symptoms',
  symptoms_sinus: 'Sinus symptoms',
  timing_season: 'When symptoms occur',
  timing_triggers: 'Symptom triggers',
  taking_meds: 'Currently taking allergy medications',
  med_list: 'Current allergy medications and dosages',
  med_control: 'Symptom control on current treatment',
  bother_overall: 'Overall bother',
}

export function getAnswerLabel(key: string): string {
  return ANSWER_LABELS[key] ?? capitalize(key.replace(/_/g, ' '))
}
