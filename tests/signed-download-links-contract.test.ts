import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Source contract for issue #36: no customer JWT travels in a URL. Download links are signed,
 * short-lived and produced server-side by the ledger route.
 */
const read = (p: string) => readFileSync(p, 'utf8')

const FILES_ROUTE = 'app/routes/api.me.assessment.$id.files.$fileId.tsx'
const PDF_ROUTE = 'app/routes/api.me.assessment.$id.pdf.tsx'
const EXTENSION = 'extensions/quiz-history/src/QuizHistoryBlock.jsx'

describe('signed download links contract', () => {
  it.each([FILES_ROUTE, PDF_ROUTE])('%s does not read a token query param', (p) => {
    const src = read(p)
    expect(src).not.toMatch(/searchParams\.get\(\s*['"]token['"]\s*\)/)
    expect(src).toContain('verifyDownloadRequest(')
  })

  it('extension builds no token= URLs and uses server-signed hrefs', () => {
    const src = read(EXTENSION)
    expect(src).not.toContain('token=')
    expect(src).toContain('a.pdf_url')
    expect(src).toContain('f.url')
  })

  it('extension refreshes the ledger on an interval and cleans it up', () => {
    const src = read(EXTENSION)
    expect(src).toContain('setInterval(')
    expect(src).toContain('clearInterval(')
  })
})
