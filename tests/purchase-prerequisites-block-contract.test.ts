import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Source contract for the purchase-prerequisites theme app block (SHOP-02 / SHOP-03).
 *
 * PATH DEVIATION FROM 06-03-PLAN.md — READ THIS BEFORE "FIXING" THE PATHS BELOW.
 * The plan specified a new extension directory `extensions/purchase-prerequisites/`. That is not
 * buildable: Shopify permits exactly ONE theme app extension per app, and `quiz-block` already
 * holds it. `shopify app generate extension --template theme_app_extension` refuses with
 * "You have reached the limit of extension(s) of type theme per app". So the block, its assets and
 * this contract live under `extensions/quiz-block/` instead. Full reasoning in 06-03-SUMMARY.md.
 *
 * WHAT THESE TESTS DO NOT PROVE. They prove the guards are present in the SOURCE, not that they
 * behave in a browser. There is no DOM here, no Sense theme, no click. Behavior is proven by the
 * human browser pass in 06-06 — which on this project has caught seven defects a green suite missed.
 *
 * GREP-GATE HYGIENE. Several assertions below are ABSENCE assertions over raw file text. This test
 * file may quote the banned phrases as assertion needles; the production Liquid/JS/CSS may NOT
 * reproduce them in any comment or string, or the assertion silently passes against its own bait.
 */

const root = process.cwd()

const LIQUID = readFileSync(
  join(root, 'extensions', 'quiz-block', 'blocks', 'purchase-prerequisites.liquid'),
  'utf-8'
)
const JS = readFileSync(
  join(root, 'extensions', 'quiz-block', 'assets', 'purchase-prerequisites.js'),
  'utf-8'
)
const CSS = readFileSync(
  join(root, 'extensions', 'quiz-block', 'assets', 'purchase-prerequisites.css'),
  'utf-8'
)

const SOURCES = [LIQUID, JS, CSS]

describe('purchase-prerequisites block — metafield reads (SHOP-02, D-05)', () => {
  it('reads quiz_count through .value', () => {
    expect(LIQUID).toContain('customer.metafields.alledrops.quiz_count.value')
  })

  it('reads last_completed_at through .value', () => {
    expect(LIQUID).toContain('customer.metafields.alledrops.last_completed_at.value')
  })

  it('formats the completion date with the locked filter (D-07)', () => {
    expect(LIQUID).toMatch(/date:\s*"%B %d, %Y"/)
  })

  it('reads NO alledrops metafield key beyond the two allowlisted ones (D-05)', () => {
    const keys = [...LIQUID.matchAll(/metafields\.alledrops\.([a-z_]+)/g)].map((m) => m[1])
    expect(new Set(keys)).toEqual(new Set(['quiz_count', 'last_completed_at']))
  })

  it('never reads testing status from data — testing is acknowledgment only (D-06)', () => {
    for (const src of SOURCES) expect(src).not.toContain('testing_status')
  })

  it('makes no network call from the block (D-05)', () => {
    for (const src of SOURCES) {
      expect(src).not.toContain('fetch(')
      expect(src).not.toContain('fly.dev')
      expect(src).not.toContain('XMLHttpRequest')
    }
  })
})

describe('purchase-prerequisites block — locked copy (06-UI-SPEC Copywriting Contract)', () => {
  it('uses the panel heading verbatim', () => {
    expect(LIQUID).toContain('Before you order')
  })

  it('uses the credited-state label verbatim (D-07)', () => {
    expect(LIQUID).toContain('Symptom assessment complete')
  })

  it('uses the uncredited quiz checkbox label verbatim', () => {
    expect(LIQUID).toContain('I completed the AlleDrops symptom assessment')
  })

  it('uses the D-06 testing acknowledgment verbatim', () => {
    expect(LIQUID).toContain(
      'I understand AOD will not ship until allergy testing results are on file.'
    )
  })

  it('uses the D-08 login offer verbatim', () => {
    expect(LIQUID).toContain('Already completed your assessment?')
    expect(LIQUID).toContain('Log in')
  })

  it('carries the disabled-ATC helper line', () => {
    expect(LIQUID).toContain('Confirm both items above to add to cart.')
  })
})

describe('purchase-prerequisites block — banned approval-promise copy (T-6-11)', () => {
  // DEC-no-approval-promise-copy. These needles are quoted here and must appear nowhere in source.
  const BANNED = [
    'if approved',
    'once approved',
    'after approval',
    'unlocked',
    'cleared to purchase',
    'eligible to buy',
    "I've submitted my allergy testing results",
  ]

  for (const phrase of BANNED) {
    it(`contains no occurrence of "${phrase}"`, () => {
      for (const src of SOURCES) {
        expect(src.toLowerCase()).not.toContain(phrase.toLowerCase())
      }
    })
  }
})

describe('purchase-prerequisites block — both credit branches exist (SHOP-02)', () => {
  it('renders a credited branch that is checked and disabled', () => {
    expect(LIQUID).toMatch(/checked[\s\S]{0,40}disabled/)
  })

  it('gates the credited branch on a logged-in customer with a completed assessment', () => {
    expect(LIQUID).toMatch(/quiz_count\s*>=\s*1/)
    expect(LIQUID).toContain('if customer')
  })

  it('shows the login offer only when uncredited', () => {
    expect(LIQUID).toMatch(/unless is_credited[\s\S]*Already completed your assessment/)
  })

  it('defaults a missing metafield to uncredited rather than erroring (D-08)', () => {
    expect(LIQUID).toMatch(/default:\s*0/)
  })
})

describe('purchase-prerequisites block — login return_to is not an open redirect (T-6-09)', () => {
  it('sends return_to to the relative product url, url-encoded', () => {
    expect(LIQUID).toContain('/account/login?return_to={{ product.url | url_encode }}')
  })

  it('never builds return_to from an absolute or shop-domain url', () => {
    expect(LIQUID).not.toMatch(/return_to=[^"']*https?:/)
    expect(LIQUID).not.toMatch(/return_to=[^"']*shop\.(url|domain)/)
    expect(LIQUID).not.toMatch(/return_to=[^"']*canonical_url/)
  })
})

describe('purchase-prerequisites gate JS — selector scoping and fail-open (D-01, D-02)', () => {
  it('targets the Sense submit class the CI fixture pins', () => {
    expect(JS).toContain('product-form__submit')
  })

  it('scopes the lookup with closest(), not the document', () => {
    expect(JS).toContain('closest')
    expect(JS).not.toMatch(/document\.querySelectorAll\s*\(\s*['"]\.product-form__submit['"]\s*\)/)
    expect(JS).not.toMatch(/document\.querySelector\s*\(\s*['"]\.product-form__submit['"]\s*\)/)
  })

  it('warns once and returns when zero submit buttons are found (D-02 fail open)', () => {
    expect(JS).toContain('console.warn')
    expect(JS).toContain('AlleDrops purchase prerequisites')
  })

  it('re-queries submit buttons rather than caching a NodeList across variant re-renders', () => {
    // A cached list points at detached nodes after Sense re-renders buy-buttons, which would
    // ship the replacement button ungated.
    expect(JS).toMatch(/function sync\(\)[\s\S]{0,200}querySelectorAll\(SUBMIT_SELECTOR\)/)
  })

  it('only re-enables buttons it disabled itself, never ones the theme disabled', () => {
    expect(JS).toContain('prereqDisabled')
    expect(JS).toMatch(/btn\.disabled\s*&&\s*!ours/)
  })

  it('logs no patient data — the only log is the selector miss', () => {
    const warns = JS.split('console.').length - 1
    expect(warns).toBe(1)
    for (const needle of ['quiz_count', 'email', 'dob', 'score', 'bracket', 'answers']) {
      expect(JS).not.toContain(needle)
    }
  })
})

describe('purchase-prerequisites block — schema (placement is 06-06, D-03)', () => {
  const schemaMatch = LIQUID.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/)

  it('has a schema block that parses as JSON', () => {
    expect(schemaMatch).not.toBeNull()
    expect(() => JSON.parse(schemaMatch![1])).not.toThrow()
  })

  it('is named, section-targeted, and limited to the product template', () => {
    const schema = JSON.parse(schemaMatch![1])
    expect(schema.name).toBe('Purchase prerequisites')
    expect(schema.target).toBe('section')
    expect(schema.enabled_on.templates).toContain('product')
  })

  it('declares both asset attributes so the block ships its own JS and CSS', () => {
    const schema = JSON.parse(schemaMatch![1])
    expect(schema.javascript).toBe('purchase-prerequisites.js')
    expect(schema.stylesheet).toBe('purchase-prerequisites.css')
  })
})

describe('purchase-prerequisites CSS — scoped, and does not restyle Sense buttons', () => {
  it('uses the locked class prefix', () => {
    expect(CSS).toContain('purchasePrerequisites')
  })

  it('never sets geometry on Sense .button classes', () => {
    expect(CSS).not.toMatch(/\.button(--[a-z-]+)?\s*{/)
  })

  it('inherits theme color variables rather than hardcoding hex', () => {
    expect(CSS).toContain('var(--color-foreground)')
    expect(CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
