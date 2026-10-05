import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  signDownloadPath,
  verifyDownloadSignature,
  verifyDownloadRequest,
  DOWNLOAD_LINK_TTL_SECONDS,
} from '../app/lib/download-links'

const ORIGINAL_ENV = { ...process.env }
const CUSTOMER = 'gid://shopify/Customer/123'
const SUB = '3f2b9c1e-1111-4222-8333-944455556666'
const FILE = '9a8b7c6d-aaaa-4bbb-8ccc-dddddddddddd'
const NOW = 1_800_000_000

/** Pull c/exp/sig back out of a signed path. */
function parse(path: string) {
  const u = new URL(path, 'https://app.example')
  return {
    pathname: u.pathname,
    customerId: u.searchParams.get('c') ?? '',
    exp: u.searchParams.get('exp') ?? '',
    sig: u.searchParams.get('sig') ?? '',
    keys: [...u.searchParams.keys()],
  }
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, SHOPIFY_API_SECRET: 'test-secret-value' }
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('signDownloadPath', () => {
  it('builds a pdf path with only c, exp and sig params', () => {
    const p = parse(signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER, now: NOW }))
    expect(p.pathname).toBe(`/api/me/assessment/${SUB}/pdf`)
    expect(p.keys).toEqual(['c', 'exp', 'sig'])
    expect(p.customerId).toBe(CUSTOMER)
    expect(Number(p.exp)).toBe(NOW + DOWNLOAD_LINK_TTL_SECONDS)
    expect(p.sig).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('builds a file path', () => {
    const p = parse(
      signDownloadPath({ kind: 'file', submissionId: SUB, fileId: FILE, customerId: CUSTOMER, now: NOW })
    )
    expect(p.pathname).toBe(`/api/me/assessment/${SUB}/files/${FILE}`)
  })

  it('never emits a token= param', () => {
    const path = signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER })
    expect(path).not.toContain('token=')
  })

  it('throws when SHOPIFY_API_SECRET is unset', () => {
    delete process.env.SHOPIFY_API_SECRET
    expect(() => signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER })).toThrow()
  })

  it('throws for a file link without a fileId', () => {
    expect(() => signDownloadPath({ kind: 'file', submissionId: SUB, customerId: CUSTOMER })).toThrow()
  })
})

describe('verifyDownloadSignature', () => {
  function signedPdf() {
    const p = parse(signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER, now: NOW }))
    return { kind: 'pdf' as const, submissionId: SUB, customerId: p.customerId, exp: p.exp, sig: p.sig }
  }
  function signedFile() {
    const p = parse(
      signDownloadPath({ kind: 'file', submissionId: SUB, fileId: FILE, customerId: CUSTOMER, now: NOW })
    )
    return {
      kind: 'file' as const,
      submissionId: SUB,
      fileId: FILE,
      customerId: p.customerId,
      exp: p.exp,
      sig: p.sig,
    }
  }

  it('accepts a valid pdf round trip', () => {
    expect(verifyDownloadSignature({ ...signedPdf(), now: NOW + 10 })).toBe(true)
  })

  it('accepts a valid file round trip', () => {
    expect(verifyDownloadSignature({ ...signedFile(), now: NOW + 10 })).toBe(true)
  })

  it('rejects a tampered signature', () => {
    const s = signedPdf()
    const flipped = (s.sig[0] === 'A' ? 'B' : 'A') + s.sig.slice(1)
    expect(verifyDownloadSignature({ ...s, sig: flipped, now: NOW })).toBe(false)
  })

  it('rejects a truncated / wrong-length signature without throwing', () => {
    const s = signedPdf()
    expect(verifyDownloadSignature({ ...s, sig: s.sig.slice(0, 10), now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...s, sig: s.sig + 'AA', now: NOW })).toBe(false)
  })

  it('rejects a different submissionId', () => {
    expect(
      verifyDownloadSignature({ ...signedPdf(), submissionId: '00000000-0000-4000-8000-000000000000', now: NOW })
    ).toBe(false)
  })

  it('rejects a different fileId', () => {
    expect(
      verifyDownloadSignature({ ...signedFile(), fileId: '00000000-0000-4000-8000-000000000000', now: NOW })
    ).toBe(false)
  })

  it('rejects a different customerId', () => {
    expect(
      verifyDownloadSignature({ ...signedPdf(), customerId: 'gid://shopify/Customer/999', now: NOW })
    ).toBe(false)
  })

  it('rejects a pdf signature presented as a file (kind is bound)', () => {
    const s = signedPdf()
    expect(verifyDownloadSignature({ ...s, kind: 'file', fileId: FILE, now: NOW })).toBe(false)
  })

  it('rejects a file signature presented as a pdf', () => {
    const s = signedFile()
    expect(
      verifyDownloadSignature({ kind: 'pdf', submissionId: SUB, customerId: s.customerId, exp: s.exp, sig: s.sig, now: NOW })
    ).toBe(false)
  })

  it('rejects an altered exp', () => {
    const s = signedPdf()
    expect(verifyDownloadSignature({ ...s, exp: String(Number(s.exp) + 60), now: NOW })).toBe(false)
  })

  it('rejects an expired link', () => {
    const s = signedPdf()
    expect(verifyDownloadSignature({ ...s, now: Number(s.exp) + 1 })).toBe(false)
  })

  it('rejects exp too far in the future even if correctly signed', () => {
    const p = parse(
      signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER, now: NOW, ttlSeconds: 86_400 })
    )
    expect(
      verifyDownloadSignature({ kind: 'pdf', submissionId: SUB, customerId: p.customerId, exp: p.exp, sig: p.sig, now: NOW })
    ).toBe(false)
  })

  it('rejects missing params', () => {
    const s = signedPdf()
    expect(verifyDownloadSignature({ ...s, sig: '', now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...s, exp: '', now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...s, customerId: '', now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...s, submissionId: '', now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...signedFile(), fileId: undefined, now: NOW })).toBe(false)
  })

  it('rejects malformed values', () => {
    const s = signedPdf()
    expect(verifyDownloadSignature({ ...s, exp: '12abc', now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...s, customerId: 'jane@example.com', now: NOW })).toBe(false)
    expect(verifyDownloadSignature({ ...s, sig: 'not base64url!!', now: NOW })).toBe(false)
  })

  it('rejects a signature made with a different secret', () => {
    const s = signedPdf()
    process.env.SHOPIFY_API_SECRET = 'some-other-secret'
    expect(verifyDownloadSignature({ ...s, now: NOW })).toBe(false)
  })

  it('throws when SHOPIFY_API_SECRET is unset', () => {
    const s = signedPdf()
    delete process.env.SHOPIFY_API_SECRET
    expect(() => verifyDownloadSignature({ ...s, now: NOW })).toThrow()
  })
})

describe('verifyDownloadRequest', () => {
  it('returns the customerId for a valid signed URL', () => {
    const path = signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER })
    const url = new URL(path, 'https://app.example')
    expect(verifyDownloadRequest(url, { kind: 'pdf', submissionId: SUB })).toBe(CUSTOMER)
  })

  it('returns null when no signature params are present', () => {
    const url = new URL(`/api/me/assessment/${SUB}/pdf`, 'https://app.example')
    expect(verifyDownloadRequest(url, { kind: 'pdf', submissionId: SUB })).toBeNull()
  })

  it('returns null (does not throw) when the secret is unset', () => {
    const path = signDownloadPath({ kind: 'pdf', submissionId: SUB, customerId: CUSTOMER })
    delete process.env.SHOPIFY_API_SECRET
    const url = new URL(path, 'https://app.example')
    expect(verifyDownloadRequest(url, { kind: 'pdf', submissionId: SUB })).toBeNull()
  })
})
