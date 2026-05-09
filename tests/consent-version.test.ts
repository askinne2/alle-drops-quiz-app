import { describe, it, expect } from 'vitest'
import { CONSENT_VERSION } from '~/lib/consent-version'

describe('CONSENT_VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof CONSENT_VERSION).toBe('string')
    expect(CONSENT_VERSION.length).toBeGreaterThan(0)
  })

  it('matches the expected draft version', () => {
    expect(CONSENT_VERSION).toBe('draft-2026-05-09')
  })
})
