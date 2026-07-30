import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contract test for extensions/quiz-block/blocks/symptom-quiz.liquid.
 *
 * RED BY DESIGN. These assertions describe what Plan 01-03 must produce and they fail until
 * it lands. That is the point: the Liquid file is the site of DEF-01 and of a live open
 * redirect, and nothing else in this repo checks it — it is not typechecked, not linted, and
 * has zero coverage. The repo's actual failure mode has been "a listener is simply absent
 * from a file", which is exactly what a text contract catches.
 *
 * WHAT THESE TESTS DO NOT PROVE. They prove the guards are PRESENT IN THE SOURCE, not that
 * they behave correctly in a browser. No DOM, no MessageEvent, no layout. Behavior is proven
 * by Gate F's console protocol in Plan 01-06.
 *
 * GREP-GATE HYGIENE — MANDATORY, AND IT CONSTRAINS PLANS 01-02 AND 01-03.
 * Several assertions below are ABSENCE assertions over raw file text. A comment, doc block,
 * or string literal that happens to contain a forbidden token silently invalidates the
 * assertion it is meant to satisfy — the test goes green while the defect is still shipping,
 * or stays red on correct work. So: in symptom-quiz.liquid and app/routes/quiz-embed.tsx, no
 * comment, doc block, or string literal may reproduce any of the five forbidden token
 * sequences asserted against in this file and in quiz-embed-contract.test.ts. When removing
 * one of them, describe what was removed in prose — do not quote it verbatim, not even to
 * explain the fix. The forbidden sequences are defined by the assertions themselves, which
 * are the single source of truth; each is named in the `it` description below.
 */

const LIQUID = readFileSync(
  join(process.cwd(), 'extensions', 'quiz-block', 'blocks', 'symptom-quiz.liquid'),
  'utf-8'
)

describe('symptom-quiz.liquid parent handler contract', () => {
  it('handles the scroll-to-top message and scrolls the iframe into view (DEF-01)', () => {
    expect(LIQUID).toContain('quiz:scrollToTop')
    expect(LIQUID).toContain('scrollIntoView')
  })

  it('does NOT scroll smoothly (D-06)', () => {
    expect(LIQUID).not.toMatch(/behavior:\s*['"]smooth['"]/)
  })

  it('sets the scroll behavior explicitly rather than leaving it to theme CSS (D-06)', () => {
    // The default `auto` resolves to the element's computed CSS `scroll-behavior`, so a theme
    // rule would otherwise silently override the locked decision. Must be explicit.
    expect(LIQUID).toMatch(/behavior:\s*['"]instant['"]/)
  })

  it('offsets the scroll target so the sticky header cannot cover it (Pitfall 4)', () => {
    // Sense 15.4.1 renders a sticky header with no --header-height variable, so
    // block: 'start' lands the iframe underneath the revealed header without this.
    expect(LIQUID).toContain('scroll-margin-top')
  })

  it('verifies the sender origin before acting on a message (D-05)', () => {
    expect(LIQUID).toContain('e.origin')
  })

  it('never navigates to an unvalidated payload value (D-05 open redirect)', () => {
    // This is the live-defect signature. Everything in e.data is attacker-controlled.
    expect(LIQUID).not.toMatch(/location\.assign\(\s*e\.data\./)
  })

  it('ports every positional rule from navigation.ts, including the reverse solidus (T-1-03/T-1-06)', () => {
    // The assertion above is an ABSENCE check: it proves the old signature is gone, not that
    // the replacement validator is complete. A port missing any one rule below reintroduces
    // the open redirect on the patient-facing page while the suite stays green. So each rule
    // in isSafeRelativePath is asserted individually here.
    //
    // The reverse-solidus rule is the one the phase's own research got wrong. It is not
    // defensive: the WHATWG parser treats that character as equivalent to a solidus for
    // special schemes, so at index 1 it enters the authority state and resolves to a foreign
    // origin. Measured, and recorded in navigation.ts and navigation.test.ts.
    expect(LIQUID).toContain("typeof p !== 'string' || p === ''")
    expect(LIQUID).toContain("p.charAt(0) !== '/'")
    expect(LIQUID).toContain("p.charAt(1) === '/'")
    expect(LIQUID).toContain("p.charAt(1) === '\\\\'")
    // The decision is delegated to the browser's own URL parser, not to a regex allowlist.
    expect(LIQUID).toContain('u.origin === window.location.origin')
  })

  it('hardens the resize handler against a non-finite height (D-05)', () => {
    expect(LIQUID).toContain('isFinite')
  })

  it('exposes both product picker settings in the schema (D-10)', () => {
    expect(LIQUID).toContain('"type": "product"')
    expect(LIQUID).toContain('"id": "tn_product"')
    expect(LIQUID).toContain('"id": "tx_product"')
  })

  it('passes both product handles through the embed src (D-12)', () => {
    expect(LIQUID).toContain('tnProduct=')
    expect(LIQUID).toContain('txProduct=')
  })

  it('keeps the schema block valid JSON', () => {
    // Catches a `shopify app deploy`-blocking error locally, on a channel whose only other
    // feedback is a remote CLI call.
    const m = LIQUID.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)
    expect(m).toBeTruthy()
    expect(() => JSON.parse(m![1])).not.toThrow()
  })
})
