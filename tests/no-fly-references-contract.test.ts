import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contract: no shipped source names the retired Fly origin.
 * Pure source text. Red until the Cloud Run URL swap lands, which is why the test and the
 * swap share one plan. Test files and build output are skipped; tests may use fly.dev
 * strings as fixtures.
 */
const ROOT = process.cwd()
const NEEDLE = 'fly' + '.dev'

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (!/\.test\.[tj]sx?$/.test(name)) out.push(p)
  }
  return out
}

describe('no fly origin in shipped sources', () => {
  const files = [
    ...walk(join(ROOT, 'app')),
    ...walk(join(ROOT, 'extensions')),
    ...readdirSync(ROOT).filter((f) => /^shopify\.app.*\.toml$/.test(f)).map((f) => join(ROOT, f)),
    join(ROOT, 'public/quiz-bundle.js'),
    join(ROOT, 'scripts/e2e-test.ts'),
  ].filter((f) => existsSync(f))

  it('scans a non-trivial file set', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('contains zero references', () => {
    const offenders = files.filter((f) => readFileSync(f, 'utf8').includes(NEEDLE))
    expect(offenders).toEqual([])
  })

  it('both shopify toml files carry the Cloud Run origin and callbacks', () => {
    for (const f of ['shopify.app.toml', 'shopify.app.alledrops-production.toml']) {
      const t = readFileSync(join(ROOT, f), 'utf8')
      expect((t.match(/run\.app/g) ?? []).length).toBe(4)
    }
  })

  it('customer-account extension uses APP_BASE', () => {
    const t = readFileSync(join(ROOT, 'extensions/quiz-history/src/QuizHistoryBlock.jsx'), 'utf8')
    expect(t).toContain('APP_BASE')
    expect(t).not.toContain('FLY_BASE')
  })
})
