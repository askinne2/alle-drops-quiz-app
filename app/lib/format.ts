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
  // Phase 4 allergy-testing split (TEST-01..TEST-03) — consumed by the same two PHI renderers.
  testing_status: 'Allergy testing status',
  testing_year: 'Year of prior allergy testing',
  testing_location: 'Where prior allergy testing was done',
  testing_allergens: 'Allergens reacted to on prior testing',
}

export function getAnswerLabel(key: string): string {
  return ANSWER_LABELS[key] ?? capitalize(key.replace(/_/g, ' '))
}

// Single source of truth for both PHI answer renderers (app/lib/pdf.ts and
// app/routes/app.quiz-results.tsx) per 04.1-CONTEXT.md D-05/D-05a. ORDER is the canonical
// clinical display order for the "Test Results" section in both renderers — do not reorder
// without checking both call sites.
export const TESTING_ANSWER_KEYS = ['testing_status', 'testing_year', 'testing_location', 'testing_allergens'] as const

/**
 * Pure partition of an answers object into non-testing (symptomEntries) and testing
 * (testingEntries) entries, per 04.1-CONTEXT.md D-05/D-05a. No I/O, no logging, never throws on
 * null/undefined input.
 *
 * `symptomEntries` preserves the input's own key order with testing keys removed.
 * `testingEntries` is built by walking TESTING_ANSWER_KEYS in declared order and including a key
 * only when present in the input — this preserves app/lib/pdf.ts's pre-existing Test Results
 * ordering contract exactly, regardless of the input's own insertion order.
 */
export function partitionAnswers(
  answers: Record<string, unknown> | null | undefined
): { symptomEntries: Array<[string, unknown]>; testingEntries: Array<[string, unknown]> } {
  const source = answers ?? {}
  const testingKeySet: ReadonlySet<string> = new Set(TESTING_ANSWER_KEYS)

  const symptomEntries = Object.entries(source).filter(([key]) => !testingKeySet.has(key))

  const testingEntries: Array<[string, unknown]> = []
  for (const key of TESTING_ANSWER_KEYS) {
    if (key in source) {
      testingEntries.push([key, source[key]])
    }
  }

  return { symptomEntries, testingEntries }
}
