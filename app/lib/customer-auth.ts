import { createRemoteJWKSet, jwtVerify } from 'jose'

// Shopify Customer Account API JWKS endpoint.
// Source: GET https://shopify.com/.well-known/openid-configuration → jwks_uri
const SHOPIFY_CA_JWKS_URL = new URL(
  'https://shopify.com/authentication/public-api/jwks.json'
)

const JWKS = createRemoteJWKSet(SHOPIFY_CA_JWKS_URL)

export interface CustomerTokenPayload {
  customerId: string // full GID: gid://shopify/Customer/12345
}

/**
 * Verify a Shopify Customer Account session token (JWT).
 * Throws with message 'Invalid session token' on any failure so callers
 * can return 401 without leaking jwt error details to clients.
 */
export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWKS)
    if (!payload.sub) throw new Error('no sub claim')
    return { customerId: payload.sub }
  } catch {
    throw new Error('Invalid session token')
  }
}
