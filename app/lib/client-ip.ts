import { isIP } from "node:net";

/**
 * Trusted client IP for the consent audit field (consent_ip_address, INET column).
 *
 * Cloud Run's Google front end appends the real client address as the LAST x-forwarded-for entry;
 * anything before it is client-supplied and forgeable. If an external Application Load Balancer
 * is put in front (LAUNCH-07 custom domain) the trusted position becomes second-to-last and this
 * function must be revisited; plan 08.1-10 measures this live with a forged header.
 *
 * Returns null when the header is absent or the last entry is not a valid IP, so a bad value can
 * never reach the INET INSERT. Never log the returned value.
 */
export function getTrustedClientIp(headers: Headers): string | null {
  const raw = headers.get("x-forwarded-for");
  if (!raw) return null;
  const entries = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const last = entries[entries.length - 1];
  return last && isIP(last) !== 0 ? last : null;
}
