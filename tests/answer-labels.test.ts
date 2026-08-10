import { describe, it, expect } from 'vitest'
import { capitalize, getAnswerLabel } from '../app/lib/format'
import { getQuestionById } from '../app/lib/quiz/questions'

describe('getAnswerLabel', () => {
  it('returns the mapped clinical label for a known Phase 3 key', () => {
    expect(getAnswerLabel('history_comorbidities')).toBe('Personal history of medical conditions')
  })

  it('returns the mapped clinical label for a known Phase 1-5 key', () => {
    expect(getAnswerLabel('symptoms_nasal')).toBe('Nasal symptoms')
  })

  it('falls back to today\'s exact capitalize(key.replace(/_/g, " ")) behavior for an unmapped key', () => {
    const unmappedKeys = ['severity_sneezing', 'severity_nasal_congestion', 'impact_sleep']
    for (const key of unmappedKeys) {
      expect(getAnswerLabel(key)).toBe(capitalize(key.replace(/_/g, ' ')))
    }
  })

  it('handles an empty string without throwing', () => {
    expect(() => getAnswerLabel('')).not.toThrow()
    expect(getAnswerLabel('')).toBe(capitalize(''.replace(/_/g, ' ')))
  })

  it('handles a key with no underscore without throwing', () => {
    expect(() => getAnswerLabel('foo')).not.toThrow()
    expect(getAnswerLabel('foo')).toBe(capitalize('foo'))
  })

  it('returns the mapped clinical label for each Phase 4 Part 7 key', () => {
    expect(getAnswerLabel('testing_status')).toBe('Allergy testing status')
    expect(getAnswerLabel('testing_year')).toBe('Year of prior allergy testing')
    expect(getAnswerLabel('testing_location')).toBe('Where prior allergy testing was done')
    expect(getAnswerLabel('testing_allergens')).toBe('Allergens reacted to on prior testing')
  })

  // Non-vacuity control: proves the fallback path is still intact for a key nobody mapped, so a
  // future refactor that breaks getAnswerLabel's default branch fails here rather than silently
  // regressing every unmapped ID in the clinical PDF and admin modal.
  it('an unmapped key still falls back to capitalize-and-underscore-replace', () => {
    expect(getAnswerLabel('made_up_key')).toBe('Made up key')
  })

  // Non-vacuity control: every ID in ANSWER_LABELS must resolve to a real question via
  // getQuestionById. A map entry for a question ID that does not exist is dead weight that
  // will silently rot. This assertion depends on plan 03-01's content having landed.
  it('every mapped key resolves to a real question via getQuestionById', () => {
    const mappedKeys = [
      'history_comorbidities',
      'current_medications',
      'history_surgeries_has',
      'history_surgeries',
      'history_allergies_has',
      'history_allergies',
      'history_conditions_has',
      'history_conditions',
      'has_pcp',
      'pcp_clinic_name',
      'pcp_clinic_address',
      'diagnosed_allergic_condition',
      'symptoms_nasal',
      'symptoms_eye',
      'symptoms_sinus',
      'timing_season',
      'timing_triggers',
      'taking_meds',
      'med_list',
      'med_control',
      'bother_overall',
      'testing_status',
      'testing_year',
      'testing_location',
      'testing_allergens',
    ]
    for (const key of mappedKeys) {
      expect(getQuestionById(key), `expected getQuestionById("${key}") to resolve to a real question`).toBeDefined()
    }
  })
})
