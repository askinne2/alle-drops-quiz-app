/**
 * GCS object storage client — PHI file store for AlleDrops uploaded test results.
 *
 * SECURITY / HIPAA:
 * - Bucket name and project id come from `GCS_BUCKET_NAME` / `GCS_PROJECT_ID` env vars ONLY.
 *   Never hardcode either. This is what makes the AOD production cutover a config change
 *   (new Fly secrets pointing at a bucket in AOD's own, BAA-covered GCP project) instead of a
 *   code change. See `.planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md`
 *   Section 4 item 2.
 * - DEV vs BAA-PROJECT CAVEAT (carry this forward, don't make a future reader guess): as of this
 *   file's authoring, `GCS_BUCKET_NAME`/`GCS_PROJECT_ID` point at a bucket in `alledrops-quiz` —
 *   Andrew's own personal dev GCP project, NOT an AOD-owned or BAA-covered project. Blockers 2
 *   (Fly.io BAA) and 3 (AOD GCP cutover) are both still OPEN. No real patient PHI may transit this
 *   path until Phase 8 closes both blockers — every plan through 04-19 builds and tests against
 *   dev/test-data only (`submissions` holds TEST DATA ONLY per 04-CONTEXT.md D-01).
 * - Object keys are namespaced under two prefixes: `pending/` (short-lived staging, deleted by an
 *   OLM rule after `PENDING_OLM_AGE_DAYS`) and `submissions/` (permanent, 6-year HIPAA retention —
 *   NEVER deleted by any code path in this file). `deleteObject` below has no prefix restriction of
 *   its own; callers own that discipline (plan 04-17's promotion step only ever deletes objects it
 *   itself just read out of the `pending/` prefix).
 * - Signed read URLs are short-lived (`SIGNED_URL_TTL_SECONDS`) and always carry an `attachment`
 *   response-disposition, so an uploaded file is never inline-rendered in a browser context
 *   (CLAUDE.md checklist, added by plan 04-01).
 * - Filenames are PHI (CLAUDE.md rule 5, extended by 04-RESEARCH.md Pitfall 5). Nothing in this
 *   file logs a filename, sanitized or not — only object keys and byte counts.
 *
 * Identifiers (dev, 2026-08):
 *   project:        alledrops-quiz  (read from GCS_PROJECT_ID — do not assume this value)
 *   bucket:         read from GCS_BUCKET_NAME — do not assume a value
 *   pending prefix:    "pending/"     (GCS_PENDING_PREFIX)
 *   permanent prefix:  "submissions/" (GCS_PERMANENT_PREFIX)
 *   signed URL TTL:    300s           (SIGNED_URL_TTL_SECONDS)
 */
import { randomUUID } from "node:crypto";
import { Storage, type Bucket } from "@google-cloud/storage";

/** Staging prefix — short-lived, OLM-deleted. Never used for permanently retained files. */
export const GCS_PENDING_PREFIX = "pending/";
/** Permanent prefix — 6-year HIPAA retention. Never deleted by this module. */
export const GCS_PERMANENT_PREFIX = "submissions/";
/** Signed read URL lifetime, in seconds. Short enough to limit exposure if a URL leaks into a log. */
export const SIGNED_URL_TTL_SECONDS = 300;

let _bucket: Bucket | null = null;

/**
 * Lazy-init, module-level singleton bucket handle. Never connects at import time — mirrors
 * app/lib/db.ts's getPool() shape (env-driven config, thrown config error naming the missing
 * variable, memoized singleton). Do NOT copy pg.Pool's connection-pooling mechanics; GCS's Node
 * client has no pool concept.
 */
export function getBucket(): Bucket {
  if (_bucket) return _bucket;

  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error(
      "GCS_BUCKET_NAME is not set. Configure as a Fly secret naming the GCS bucket to use " +
        "(dev: a bucket in the `alledrops-quiz` project; see 04-UPLOAD-DECISIONS.md Section 4)."
    );
  }

  const projectId = process.env.GCS_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "GCS_PROJECT_ID is not set. Configure as a Fly secret naming the GCP project the bucket " +
        "lives in (dev: `alledrops-quiz`; see 04-UPLOAD-DECISIONS.md Section 4)."
    );
  }

  const storage = new Storage({ projectId });
  _bucket = storage.bucket(bucketName);
  return _bucket;
}

/**
 * Strips path separators, `..` sequences, null bytes, and control characters from a
 * patient-supplied filename; collapses to a bounded-length, storage-safe name. Pure, never throws.
 * A name that sanitizes to nothing falls back to a generated placeholder so a caller never has to
 * handle an empty string.
 */
export function sanitizeObjectName(filename: unknown): string {
  if (typeof filename !== "string" || filename.length === 0) {
    return `unnamed-${randomUUID()}`;
  }

  const withoutTraversal = filename.replace(/\.\./g, "");
  // eslint-disable-next-line no-control-regex
  const withoutControlChars = withoutTraversal.replace(/[\x00-\x1f\x7f]/g, "");
  const withoutSeparators = withoutControlChars.replace(/[/\\]/g, "_");
  const bounded = withoutSeparators.trim().slice(0, 200);

  return bounded.length > 0 ? bounded : `unnamed-${randomUUID()}`;
}

/** Object key for a staged, not-yet-promoted upload. */
export function buildPendingKey(token: string, filename: string): string {
  return `${GCS_PENDING_PREFIX}${token}/${sanitizeObjectName(filename)}`;
}

/** Object key for a permanently retained, promoted upload. */
export function buildPermanentKey(submissionId: string, fileId: string, filename: string): string {
  return `${GCS_PERMANENT_PREFIX}${submissionId}/${fileId}-${sanitizeObjectName(filename)}`;
}

/**
 * Short-lived v4 signed read URL. Always `attachment`-disposed with the sanitized download name so
 * a browser never renders the file inline.
 */
export async function getSignedReadUrl(objectKey: string, downloadFilename: string): Promise<string> {
  const bucket = getBucket();
  const safeDownloadName = sanitizeObjectName(downloadFilename);

  const [url] = await bucket.file(objectKey).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    responseDisposition: `attachment; filename="${safeDownloadName}"`,
  });

  console.log("[storage:gcs] signed read url issued", { keyLength: objectKey.length });
  return url;
}

/**
 * Authenticated server-side download for PDF embedding (plan 04-17). Always goes through the GCS
 * client, never a public-URL fetch().
 */
export async function readObjectBytes(objectKey: string): Promise<Buffer> {
  const bucket = getBucket();
  const [bytes] = await bucket.file(objectKey).download();
  console.log("[storage:gcs] object read", { byteCount: bytes.length });
  return bytes;
}

/**
 * Copies an object to a new key. Used only by plan 04-17's promotion step (GCS has no atomic
 * rename — promotion is copy-then-delete, and the caller owns partial-failure handling per
 * 04-RESEARCH.md Pitfall 3).
 */
export async function copyObject(fromKey: string, toKey: string): Promise<void> {
  const bucket = getBucket();
  await bucket.file(fromKey).copy(bucket.file(toKey));
  console.log("[storage:gcs] object copied");
}

/**
 * Deletes an object by key. Used only by plan 04-17's promotion step to remove the `pending/`
 * staging copy after a successful promote — callers MUST NOT pass a `submissions/` (permanent)
 * key here. HIPAA requires 6-year retention of submission data; this function has no built-in
 * prefix guard because the only sanctioned caller (04-17) never holds a permanent key at this
 * point in the flow, but a future caller must preserve that invariant.
 */
export async function deleteObject(key: string): Promise<void> {
  const bucket = getBucket();
  await bucket.file(key).delete();
  console.log("[storage:gcs] object deleted");
}
