import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contract test for the THIRD parent-side message listener: `injectIframe` in app/entry.theme.tsx.
 *
 * WHY THIS FILE EXISTS. This listener was assessed as unreachable dead code by Plan 01-04 and by
 * the phase code review, and was therefore excluded from both hardening passes. That assessment
 * was wrong, and the hole was live in production until 2026-07-30.
 *
 * The reasoning that failed: 01-04 measured that the installed Liquid block loads this bundle on
 * zero storefront pages and renders no `data-alledrops-quiz` container, so only the `mountReact`
 * branch can run. True of the storefront. But `/quiz-embed` ITSELF renders that container and loads
 * this bundle, and `initQuiz()` selects `injectIframe` whenever `window.self === window.top`. So
 * opening `/quiz-embed` directly — a public URL — runs this listener on a PHI-collecting page.
 *
 * Verified exploitable against production before the fix: a `quiz:navigate` carrying
 * `url: "https://example.com/pwned"` navigated the live page. An opener can `postMessage` into a
 * window it opened with `window.open`, so no framing is required.
 *
 * It also survived the `url` -> `path` rename precisely BECAUSE it was skipped: it still read the
 * abandoned `url` key, quietly keeping the old contract alive beneath the hardened one.
 *
 * These are source-text assertions for the same reason the sibling contract tests are: the file is
 * a bundle entry point that never runs under vitest's node environment.
 */

const ENTRY = readFileSync(join(process.cwd(), 'app', 'entry.theme.tsx'), 'utf-8')

describe('entry.theme.tsx injectIframe message listener', () => {
  it('verifies the sender origin before acting on any message', () => {
    expect(ENTRY).toContain('e.origin !== appOrigin')
    // The origin check must be the FIRST guard, before any message-type branch.
    const originCheck = ENTRY.indexOf('e.origin !== appOrigin')
    const firstBranch = ENTRY.indexOf('e.data.type ===')
    expect(originCheck).toBeGreaterThan(-1)
    expect(originCheck).toBeLessThan(firstBranch)
  })

  it('never reads the abandoned url key', () => {
    // The `url` -> `path` rename exists so a version mismatch fails closed. A listener still
    // honouring `url` re-opens the contract this file was supposed to have retired.
    expect(ENTRY).not.toContain('e.data.url')
  })

  it('validates the navigation target through the canonical validator', () => {
    expect(ENTRY).toContain('toRelativePath(e.data.path)')
    // No unvalidated assign anywhere in the file.
    expect(ENTRY).not.toMatch(/location\.assign\(String\(/)
    expect(ENTRY).toContain('if (target) window.location.assign(target)')
  })

  it('imports the validator rather than hand-porting a fourth copy of the rules', () => {
    expect(ENTRY).toMatch(/import\s*\{\s*toRelativePath\s*\}\s*from\s*["']\.\/lib\/quiz\/navigation["']/)
  })

  it('scrolls instantly, not smoothly (D-06)', () => {
    expect(ENTRY).not.toContain('behavior: "smooth"')
    expect(ENTRY).toContain('container.scrollIntoView({ block: "start" })')
  })

  it('hardens the resize handler against a non-finite height', () => {
    expect(ENTRY).toContain('Number.isFinite(h)')
  })
})
