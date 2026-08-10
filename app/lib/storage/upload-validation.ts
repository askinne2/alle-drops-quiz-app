/**
 * Upload content validation.
 *
 * SECURITY / HIPAA: this module decides whether a patient-supplied file is one of the four
 * allowed clinical-document types (PDF, JPEG, PNG, HEIC) by reading its bytes — NEVER by trusting
 * the multipart part's declared `Content-Type` header or the filename's extension. Both are
 * advisory, attacker-controlled, and inconsistently reported across browsers/OSes (04-RESEARCH.md
 * Pitfall 1). A `.txt` renamed to `.pdf` must be rejected here, before a single byte reaches
 * storage.
 *
 * Filenames are PHI (CLAUDE.md rule 5) and must never be logged by this module or its callers.
 *
 * House style (matches app/lib/quiz-validation.ts / app/lib/quiz/schema.ts): every function here
 * is pure and NEVER throws. Invalid, truncated, or adversarial input degrades to a safe default
 * (`null` / `false`) so callers never need a try/catch around a call into this file.
 */

/** Leading bytes a caller must buffer before calling sniffType — HEIC's brand lives at bytes 8-11. */
export const MIN_SNIFF_BYTES = 12;

// Ratified 2026-08-10 — 04-UPLOAD-DECISIONS.md Section 4 item 4 / "Named constants and env vars".
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB per submission
export const MAX_FILES = 10; // files per submission

export type SniffedType = "pdf" | "jpeg" | "png" | "heic";

const HEIC_BRANDS = ["heic", "heix", "mif1", "msf1", "heim", "heis"] as const;

/**
 * Decides a file's type from its magic bytes, per 04-RESEARCH.md's "Code Examples / Magic-byte
 * sniffing" (spec bytes: ISO/IEC 14496-12 for HEIC's `ftyp` box, RFC-documented JPEG/PNG SOI
 * markers). NOTE: these signatures were taken from spec, not hand-verified against a real
 * device-captured sample during this plan — 04-RESEARCH.md's own caveat is that they should also
 * be checked against a real iPhone-captured HEIC, which happens during plan 04-19's human pass.
 *
 * Never throws. A buffer shorter than the bytes a given signature needs returns `null` rather than
 * indexing out of bounds.
 */
export function sniffType(bytes: Uint8Array | null | undefined): SniffedType | null {
  if (!bytes || bytes.length < 4) return null;

  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";

  if (bytes.length < MIN_SNIFF_BYTES) return null;

  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (ftyp === "ftyp" && (HEIC_BRANDS as readonly string[]).includes(brand)) return "heic";

  return null;
}

/** Whether a sniffed type is on the allowlist. `null` (unrecognized/spoofed) is always false. */
export function isAllowedType(t: SniffedType | null): boolean {
  return t === "pdf" || t === "jpeg" || t === "png" || t === "heic";
}

/** Maps a sniffed type to the content-type this app actually stores/serves for it. */
export function effectiveContentType(t: SniffedType): string {
  switch (t) {
    case "pdf":
      return "application/pdf";
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
  }
}
