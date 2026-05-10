import { jwtVerify } from 'jose'

export interface CustomerTokenPayload {
  customerId: string // full GID: gid://shopify/Customer/12345
}

/**
 * Verify a Shopify Customer Account UI extension session token.
 * These tokens are HS256-signed with the app's shared secret (SHOPIFY_API_SECRET).
 * The aud claim equals the app's client ID (SHOPIFY_API_KEY).
 * Throws so callers return 401 without leaking JWT error details.
 */
export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  try {
    const secret = process.env.SHOPIFY_API_SECRET
    if (!secret) throw new Error('SHOPIFY_API_SECRET not configured')
    const apiKey = process.env.SHOPIFY_API_KEY
    if (!apiKey) throw new Error('SHOPIFY_API_KEY not configured')

    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], audience: apiKey })
    if (!payload.sub) throw new Error('no sub claim')
    return { customerId: payload.sub }
  } catch {
    throw new Error('Invalid session token')
  }
}
