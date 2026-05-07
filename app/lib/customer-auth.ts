import { createRemoteJWKSet, jwtVerify } from 'jose'

// Shopify Customer Account API JWKS endpoint.
// Source: GET https://shopify.com/.well-known/openid-configuration → jwks_uri
// Override via SHOPIFY_CA_JWKS_URL env var for testing or staging.
const SHOPIFY_CA_JWKS_URL = new URL(
  process.env.SHOPIFY_CA_JWKS_URL ??
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
 *
 * Issuer and audience validation are enabled only when the corresponding
 * env vars are set (SHOPIFY_CA_ISSUER, SHOPIFY_CA_AUDIENCE). This lets us
 * wire up validation once the exact claim values are confirmed against real tokens.
 */
export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  try {
    const options: Parameters<typeof jwtVerify>[2] = {}
    if (process.env.SHOPIFY_CA_ISSUER) options.issuer = process.env.SHOPIFY_CA_ISSUER
    if (process.env.SHOPIFY_CA_AUDIENCE) options.audience = process.env.SHOPIFY_CA_AUDIENCE

    const { payload } = await jwtVerify(token, JWKS, options)
    if (!payload.sub) throw new Error('no sub claim')
    return { customerId: payload.sub }
  } catch {
    throw new Error('Invalid session token')
  }
}
