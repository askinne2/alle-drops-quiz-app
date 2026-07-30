import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contract test for the inline script inside app/routes/quiz-embed.tsx.
 *
 * RED BY DESIGN. These assertions describe what Plan 01-02 must produce and they fail until
 * it lands.
 *
 * WHY TEXT ASSERTIONS. The script is a template string inside a loader, so TypeScript never
 * sees it as code — it is not typechecked and not linted, and it currently contains two live
 * defects. Asserting on its text is the only automated coverage it can have short of a browser
 * harness.
 *
 * WHAT THESE TESTS DO NOT PROVE. They prove the guards are PRESENT IN THE SOURCE, not that
 * they behave correctly in a browser. Behavior is proven by Gate F's console protocol in
 * Plan 01-06.
 *
 * GREP-GATE HYGIENE — MANDATORY, AND IT CONSTRAINS PLANS 01-02 AND 01-03.
 * Assertions 1, 2, and 3b below are ABSENCE assertions over raw file text. A comment or string
 * literal that reproduces a forbidden token silently invalidates the assertion meant to
 * satisfy it — the test goes green while the defect still ships, or stays red on correct work.
 * So: in this file's target and in symptom-quiz.liquid, no comment, doc block, or string
 * literal may reproduce any of the five forbidden token sequences asserted against here and in
 * liquid-block-contract.test.ts. When removing one, describe it in prose — do not quote it
 * verbatim, not even to explain the fix. The assertions are the single source of truth.
 */

const EMBED = readFileSync(join(process.cwd(), 'app', 'routes', 'quiz-embed.tsx'), 'utf-8')

describe('quiz-embed.tsx inline script contract', () => {
  it('no longer tries to override the location assign method (D-02)', () => {
    // Location.assign is [LegacyUnforgeable] — non-writable and non-configurable — so the
    // patch fails silently in sloppy mode. It already cost this project a live defect.
    expect(EMBED).not.toContain('window.location.assign = function')
  })

  it('no longer resolves anchor hrefs against the iframe document (D-03)', () => {
    // Resolving in the iframe produces an absolute URL on the Fly origin, which is how the
    // storefront ended up being sent to the app domain. Post the raw relative path instead.
    expect(EMBED).not.toContain('new URL(href, window.location.href)')
  })

  it('posts a navigate payload keyed on a relative path, not a URL (D-01/D-02)', () => {
    // Renaming the key makes a stale cached bundle fail CLOSED against a new parent rather
    // than being silently rejected under a name that looks correct.
    expect(EMBED).toMatch(/'quiz:navigate'[\s\S]{0,160}?\bpath\s*:/)
    expect(EMBED).not.toMatch(/'quiz:navigate'[\s\S]{0,160}?\burl\s*:/)
  })

  it('injects both product handles into the runtime config (D-12)', () => {
    expect(EMBED).toContain('tnProductHandle')
    expect(EMBED).toContain('txProductHandle')
  })
})
