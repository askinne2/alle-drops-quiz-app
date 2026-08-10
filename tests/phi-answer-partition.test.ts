import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { partitionAnswers, TESTING_ANSWER_KEYS } from '../app/lib/format'

// Synthetic, obviously-fake fixture values only — no realistic patient names, DOBs, emails, or
// phone numbers, per CLAUDE.md and 04.1-CONTEXT.md D-05/D-05a. This file proves losslessness: the
// D-05a blocking criterion is that each testing key survives the partition EXACTLY ONCE, not
// merely that it is absent from symptomEntries.

const count = (source: string, needle: string): number => source.split(needle).length - 1

describe('partitionAnswers', () => {
  it('returns empty arrays for an empty object', () => {
    expect(partitionAnswers({})).toEqual({ symptomEntries: [], testingEntries: [] })
  })

  it('separates non-testing keys from testing keys', () => {
    const input = {
      symptoms_nasal: 'yes',
      severity_sneezing: 'often',
      testing_status: 'had_testing',
      testing_year: '2024',
      testing_location: 'Allergy Clinic',
      testing_allergens: ['ragweed'],
    }
    const { symptomEntries, testingEntries } = partitionAnswers(input)

    expect(symptomEntries).toEqual([
      ['symptoms_nasal', 'yes'],
      ['severity_sneezing', 'often'],
    ])
    expect(testingEntries.map(([k]) => k)).toEqual([
      'testing_status',
      'testing_year',
      'testing_location',
      'testing_allergens',
    ])
  })

  it('losslessness — each of the four testing keys appears exactly once across the union of both arrays', () => {
    const input = {
      symptoms_nasal: 'yes',
      testing_status: 'had_testing',
      testing_year: '2024',
      testing_location: 'Allergy Clinic',
      testing_allergens: ['ragweed'],
    }
    const { symptomEntries, testingEntries } = partitionAnswers(input)
    const allEntries = [...symptomEntries, ...testingEntries]

    for (const key of TESTING_ANSWER_KEYS) {
      expect(allEntries.filter(([k]) => k === key).length).toBe(1)
    }
  })

  it('no key from the input is dropped — union of both arrays keys equals Object.keys(input)', () => {
    const input = {
      symptoms_nasal: 'yes',
      severity_sneezing: 'often',
      testing_status: 'had_testing',
      testing_year: '2024',
      testing_location: 'Allergy Clinic',
      testing_allergens: ['ragweed'],
    }
    const { symptomEntries, testingEntries } = partitionAnswers(input)
    const unionKeys = [...symptomEntries, ...testingEntries].map(([k]) => k).sort()
    expect(unionKeys).toEqual(Object.keys(input).sort())
  })

  it('testingEntries is ordered by TESTING_ANSWER_KEYS position, not insertion order — reverse-order input still yields canonical order', () => {
    const input = {
      testing_allergens: ['ragweed'],
      testing_location: 'Allergy Clinic',
      testing_year: '2024',
      testing_status: 'had_testing',
    }
    const { testingEntries } = partitionAnswers(input)
    expect(testingEntries.map(([k]) => k)).toEqual([
      'testing_status',
      'testing_year',
      'testing_location',
      'testing_allergens',
    ])
  })

  it('a testing key absent from the input does not appear in testingEntries (no undefined-valued placeholder row)', () => {
    const input = { testing_status: 'needs_testing' }
    const { testingEntries } = partitionAnswers(input)
    expect(testingEntries).toEqual([['testing_status', 'needs_testing']])
    expect(testingEntries.length).toBe(1)
  })

  it('an unmapped/unknown key stays in symptomEntries', () => {
    const input = { some_future_question: 'value' }
    const { symptomEntries, testingEntries } = partitionAnswers(input)
    expect(symptomEntries).toEqual([['some_future_question', 'value']])
    expect(testingEntries).toEqual([])
  })

  it('testing_files is NOT in TESTING_ANSWER_KEYS and stays in symptomEntries', () => {
    expect(TESTING_ANSWER_KEYS as readonly string[]).not.toContain('testing_files')
    const input = { testing_files: ['token-a', 'token-b'] }
    const { symptomEntries, testingEntries } = partitionAnswers(input)
    expect(symptomEntries).toEqual([['testing_files', ['token-a', 'token-b']]])
    expect(testingEntries).toEqual([])
  })

  it('handles null and undefined input without throwing', () => {
    expect(() => partitionAnswers(null)).not.toThrow()
    expect(() => partitionAnswers(undefined)).not.toThrow()
    expect(partitionAnswers(null)).toEqual({ symptomEntries: [], testingEntries: [] })
    expect(partitionAnswers(undefined)).toEqual({ symptomEntries: [], testingEntries: [] })
  })
})

describe('TESTING_ANSWER_KEYS', () => {
  it('is the canonical four-key list in clinical display order', () => {
    expect(TESTING_ANSWER_KEYS).toEqual([
      'testing_status',
      'testing_year',
      'testing_location',
      'testing_allergens',
    ])
  })
})

// D-05a source-text guard — proves the admin detail modal's Symptom Responses loop no longer
// drives off raw Object.entries(detailRow.answers_json), that a Test Results section exists
// exactly once, and that both partitionAnswers outputs are actually used. Non-vacuity controls
// on Symptom Responses and Uploaded Files prove the file was actually read and that the
// neighbouring sections were not disturbed.
describe('app/routes/app.quiz-results.tsx source text — D-05a Test Results section (add-then-filter)', () => {
  const ROUTE_SOURCE = readFileSync(
    join(process.cwd(), 'app', 'routes', 'app.quiz-results.tsx'),
    'utf-8'
  )
  const routeCount = (needle: string): number => count(ROUTE_SOURCE, needle)

  it('Object.entries(detailRow.answers_json no longer appears', () => {
    expect(routeCount('Object.entries(detailRow.answers_json')).toBe(0)
  })

  it('partitionAnswers is used', () => {
    expect(routeCount('partitionAnswers')).toBeGreaterThanOrEqual(1)
  })

  it('"Test Results" appears exactly once', () => {
    expect(routeCount('Test Results')).toBe(1)
  })

  it('symptomEntries appears at least once', () => {
    expect(routeCount('symptomEntries')).toBeGreaterThanOrEqual(1)
  })

  it('testingEntries appears at least twice (the map plus the emptiness guard)', () => {
    expect(routeCount('testingEntries')).toBeGreaterThanOrEqual(2)
  })

  it('non-vacuity control: "Symptom Responses" appears exactly once in the same read', () => {
    expect(routeCount('Symptom Responses')).toBe(1)
  })

  it('non-vacuity control: "Uploaded Files" appears exactly once in the same read, proving neighbouring sections were not disturbed', () => {
    expect(routeCount('Uploaded Files')).toBe(1)
  })
})
