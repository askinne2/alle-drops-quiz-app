import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * D-02 compensating control for fail-open ATC gating.
 *
 * Fail-open is only safe if CI screams when Sense renames `.product-form__submit`
 * or drops the `payment_button` express path. This contract reads a checked-in
 * excerpt of Sense buy-buttons.liquid — it does not require the sibling theme
 * repo path (CI-safe).
 *
 * Optional local hash check against allergist-on-demand/snippets/buy-buttons.liquid
 * is developer-machine only and must not be asserted here.
 */

const FIXTURE = readFileSync(
  join(process.cwd(), 'tests', 'fixtures', 'sense-buy-buttons-excerpt.liquid'),
  'utf-8'
)

describe('Sense ATC selector contract (D-02 compensating control)', () => {
  it('finds class product-form__submit at least twice in the vendored fixture', () => {
    const count = FIXTURE.split('product-form__submit').length - 1
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('includes the show_dynamic_checkout conditional', () => {
    expect(FIXTURE).toContain('show_dynamic_checkout')
  })

  it('includes payment_button for the express-checkout path', () => {
    expect(FIXTURE).toContain('payment_button')
  })

  it('includes type="submit" (or type=\'submit\') on a product-form__submit button', () => {
    expect(FIXTURE).toMatch(/type=["']submit["']/)
    expect(FIXTURE).toContain('product-form__submit')
  })
})
