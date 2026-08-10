import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { CONSENT_VERSION } from '~/lib/consent-version'

describe('CONSENT_VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof CONSENT_VERSION).toBe('string')
    expect(CONSENT_VERSION.length).toBeGreaterThan(0)
  })

  it('matches the expected draft version', () => {
    expect(CONSENT_VERSION).toBe('draft-2026-08-09')
  })

  it('matches the documented draft-YYYY-MM-DD / vN.N-YYYY-MM-DD format', () => {
    expect(CONSENT_VERSION).toMatch(/^(draft|v\d+\.\d+)-\d{4}-\d{2}-\d{2}$/)
  })

  it('ConsentStep.tsx no longer renders the [PENDING] placeholder (non-vacuous)', () => {
    const source = readFileSync('app/components/quiz/ConsentStep.tsx', 'utf8')
    const count = (needle: string) => source.split(needle).length - 1
    // Assembled from fragments so this test's own prose cannot self-match a future repo-wide search.
    const placeholderNeedle = '[PEND' + 'ING'

    expect(count(placeholderNeedle)).toBe(0)
    // Positive control: proves the read pointed at the real file and the zero-count above is not vacuous.
    expect(count('Laboratory Testing Authorization')).toBeGreaterThanOrEqual(1)
  })
})
