/**
 * Short-lived, self-authorizing download links for the customer-account extension.
 *
 * Why: Customer Account UI extensions render downloads as plain `<s-link href>` navigations, which
 * cannot carry an Authorization header. Putting the Shopify session JWT in the URL leaked a bearer
 * credential into request logs and expired ~60 s after page load (issue #36). Instead the
 * Bearer-authenticated ledger route signs one URL per PDF/file it already returned for that
 * customer, and the download routes verify the signature before any database work.
 *
 * Link shape (no PHI — opaque IDs and the opaque Shopify customer GID only):
 *   /api/me/assessment/<submissionId>/pdf?c=<customerGid>&exp=<unix>&sig=<b64url>
 *   /api/me/assessment/<submissionId>/files/<fileId>?c=<customerGid>&exp=<unix>&sig=<b64url>
 *
 * sig = HMAC-SHA256(K, JSON.stringify([VERSION, kind, submissionId, fileId|'', customerId, exp]))
 * K   = HMAC-SHA256(SHOPIFY_API_SECRET, 'alledrops-download-link-v1')   (domain separation, so a
 *       link signature can never be confused with a Shopify JWT signed by the same secret)
 *
 * A link is a bearer credential for its 15-minute life. The `sig=` param must stay out of logs —
 * see docs/cloud-run.md section 10.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type DownloadKind = 'pdf' | 'file'

const VERSION = 'v1'
const KEY_LABEL = 'alledrops-download-link-v1'

/** Default and maximum link lifetime. */
export const DOWNLOAD_LINK_TTL_SECONDS = 900
/** Allowed clock skew between signer and verifier (they are normally the same process). */
const MAX_SKEW_SECONDS = 60

const ID_RE = /^[A-Za-z0-9-]{1,64}$/
const CUSTOMER_RE = /^gid:\/\/shopify\/Customer\/[A-Za-z0-9]{1,64}$/
const EXP_RE = /^\d{1,12}$/
const SIG_RE = /^[A-Za-z0-9_-]{43}$/ // 32-byte HMAC, base64url without padding

function deriveKey(): Buffer {
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret) throw new Error('SHOPIFY_API_SECRET not configured')
  return createHmac('sha256', secret).update(KEY_LABEL).digest()
}

function mac(
  kind: DownloadKind,
  submissionId: string,
  fileId: string,
  customerId: string,
  exp: number
): Buffer {
  const message = JSON.stringify([VERSION, kind, submissionId, fileId, customerId, exp])
  return createHmac('sha256', deriveKey()).update(message).digest()
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function basePath(kind: DownloadKind, submissionId: string, fileId: string): string {
  const sid = encodeURIComponent(submissionId)
  return kind === 'pdf'
    ? `/api/me/assessment/${sid}/pdf`
    : `/api/me/assessment/${sid}/files/${encodeURIComponent(fileId)}`
}

export function signDownloadPath(args: {
  kind: DownloadKind
  submissionId: string
  fileId?: string
  customerId: string
  ttlSeconds?: number
  now?: number
}): string {
  const { kind, submissionId, customerId } = args
  const fileId = kind === 'file' ? (args.fileId ?? '') : ''
  if (!ID_RE.test(submissionId)) throw new Error('invalid submission id')
  if (kind === 'file' && !ID_RE.test(fileId)) throw new Error('invalid file id')
  if (!CUSTOMER_RE.test(customerId)) throw new Error('invalid customer id')

  const exp = (args.now ?? nowSeconds()) + (args.ttlSeconds ?? DOWNLOAD_LINK_TTL_SECONDS)
  const sig = mac(kind, submissionId, fileId, customerId, exp).toString('base64url')
  const qs = new URLSearchParams({ c: customerId, exp: String(exp), sig })
  return `${basePath(kind, submissionId, fileId)}?${qs.toString()}`
}

/**
 * Returns true only for a well-formed, unexpired, correctly signed link. Throws only when the
 * signing secret is unset (a deployment error, not a client error).
 */
export function verifyDownloadSignature(args: {
  kind: DownloadKind
  submissionId: string
  fileId?: string
  customerId: string
  exp: string | number
  sig: string
  now?: number
}): boolean {
  deriveKey() // throws if unset — checked first so misconfiguration is never silent

  const { kind, submissionId, customerId, sig } = args
  if (kind !== 'pdf' && kind !== 'file') return false
  const fileId = kind === 'file' ? (args.fileId ?? '') : ''
  if (!ID_RE.test(submissionId ?? '')) return false
  if (kind === 'file' && !ID_RE.test(fileId)) return false
  if (!CUSTOMER_RE.test(customerId ?? '')) return false
  const expStr = String(args.exp ?? '')
  if (!EXP_RE.test(expStr)) return false
  if (!SIG_RE.test(sig ?? '')) return false

  const exp = Number(expStr)
  const now = args.now ?? nowSeconds()
  if (exp <= now) return false
  if (exp > now + DOWNLOAD_LINK_TTL_SECONDS + MAX_SKEW_SECONDS) return false

  const expected = mac(kind, submissionId, fileId, customerId, exp)
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length) return false
  return timingSafeEqual(given, expected)
}

/**
 * Route helper: reads c/exp/sig from the request URL and returns the verified customer GID, or
 * null. Never throws — a missing secret yields null so the route answers a generic 401.
 */
export function verifyDownloadRequest(
  url: URL,
  target: { kind: DownloadKind; submissionId: string; fileId?: string }
): string | null {
  const customerId = url.searchParams.get('c') ?? ''
  const exp = url.searchParams.get('exp') ?? ''
  const sig = url.searchParams.get('sig') ?? ''
  if (!customerId || !exp || !sig) return null
  try {
    return verifyDownloadSignature({ ...target, customerId, exp, sig }) ? customerId : null
  } catch {
    return null
  }
}

/** Absolute origin for links handed to the extension. Prefers the configured app URL. */
export function appOrigin(request: Request): string {
  const configured = (process.env.SHOPIFY_APP_URL ?? '').trim().replace(/\/+$/, '')
  return configured || new URL(request.url).origin
}
