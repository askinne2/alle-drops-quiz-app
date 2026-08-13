import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * SHOP-04 / D-09 / D-10 source contract for extensions/order-review-notice.
 *
 * Guards dual thank-you + order-status targeting, static copy (UI-SPEC), and the
 * hard ban on PHI/network fetch from a commerce surface (T-6-13).
 *
 * These prove presence/absence in source text — not live checkout placement
 * (that is plan 06-06).
 */

const root = (...parts: string[]) => join(process.cwd(), ...parts)

const TOML = readFileSync(
  root('extensions', 'order-review-notice', 'shopify.extension.toml'),
  'utf-8'
)
const REVIEW_NOTICE = readFileSync(
  root('extensions', 'order-review-notice', 'src', 'ReviewNotice.jsx'),
  'utf-8'
)
const THANK_YOU = readFileSync(
  root('extensions', 'order-review-notice', 'src', 'ThankYou.jsx'),
  'utf-8'
)
const ORDER_STATUS = readFileSync(
  root('extensions', 'order-review-notice', 'src', 'OrderStatus.jsx'),
  'utf-8'
)
const ALL_SRC = REVIEW_NOTICE + THANK_YOU + ORDER_STATUS

describe('order-review-notice TOML targeting (D-09)', () => {
  it('targets purchase.thank-you.block.render via ThankYou.jsx', () => {
    expect(TOML).toContain('purchase.thank-you.block.render')
    expect(TOML).toContain('ThankYou.jsx')
  })

  it('targets customer-account.order-status.block.render via OrderStatus.jsx', () => {
    expect(TOML).toContain('customer-account.order-status.block.render')
    expect(TOML).toContain('OrderStatus.jsx')
  })

  it('does not enable network_access', () => {
    expect(TOML).not.toMatch(/network_access\s*=\s*true/)
  })
})

describe('order-review-notice static ReviewNotice (D-10 / UI-SPEC)', () => {
  it('includes the notice title What happens next', () => {
    expect(REVIEW_NOTICE).toContain('What happens next')
  })

  it('includes the 2–3 business days review timing', () => {
    expect(
      /2–3 business days|2-3 business days/.test(REVIEW_NOTICE)
    ).toBe(true)
  })

  it('includes D-10 testing follow-up needles from 06-UI-SPEC.md', () => {
    expect(REVIEW_NOTICE).toContain(
      'allergy testing results are not yet on file'
    )
    expect(REVIEW_NOTICE).toContain('order confirmation email')
  })
})

describe('order-review-notice PHI / network bans (T-6-13)', () => {
  it('has no fetch( in ThankYou, OrderStatus, or ReviewNotice', () => {
    expect(ALL_SRC).not.toMatch(/fetch\s*\(/)
  })

  it('does not reference score, bracket, answers_json, or quiz_count', () => {
    expect(ALL_SRC).not.toMatch(/score_bracket|answers_json|quiz_count/)
    // "score" alone is too broad (could appear in comments); ban clinical field names.
    expect(ALL_SRC).not.toContain('score_bracket')
    expect(ALL_SRC).not.toContain('answers_json')
    expect(ALL_SRC).not.toContain('quiz_count')
  })

  it('entry modules render the shared ReviewNotice', () => {
    expect(THANK_YOU).toContain('ReviewNotice')
    expect(ORDER_STATUS).toContain('ReviewNotice')
  })
})
