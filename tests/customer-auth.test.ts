import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mock jose entirely — we're testing our extraction logic, not jose itself.
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn(),
}))

import { verifyCustomerToken } from '../app/lib/customer-auth'
import * as jose from 'jose'

describe('verifyCustomerToken', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns customerId GID when token is valid', async () => {
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue({} as ReturnType<typeof jose.createRemoteJWKSet>)
    vi.mocked(jose.jwtVerify).mockResolvedValue({
      payload: { sub: 'gid://shopify/Customer/9876543210' },
      protectedHeader: { alg: 'RS256' },
    } as Awaited<ReturnType<typeof jose.jwtVerify>>)

    const result = await verifyCustomerToken('fake.jwt.token')

    expect(result).toEqual({ customerId: 'gid://shopify/Customer/9876543210' })
  })

  it('throws when jwtVerify rejects', async () => {
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue({} as ReturnType<typeof jose.createRemoteJWKSet>)
    vi.mocked(jose.jwtVerify).mockRejectedValue(new Error('JWTExpired'))

    await expect(verifyCustomerToken('expired.jwt.token')).rejects.toThrow('Invalid session token')
  })

  it('throws when payload has no sub claim', async () => {
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue({} as ReturnType<typeof jose.createRemoteJWKSet>)
    vi.mocked(jose.jwtVerify).mockResolvedValue({
      payload: {},
      protectedHeader: { alg: 'RS256' },
    } as Awaited<ReturnType<typeof jose.jwtVerify>>)

    await expect(verifyCustomerToken('nosub.jwt.token')).rejects.toThrow('Invalid session token')
  })
})
