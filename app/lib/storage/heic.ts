/**
 * HEIC to JPEG conversion.
 *
 * WHY THIS EXISTS: most desktop browsers cannot open a HEIC/HEIF file directly, and `pdf-lib`
 * (used elsewhere in the visit-summary PDF path) can only embed JPEG or PNG images — not HEIC. A
 * patient's iPhone photo of a paper allergy panel therefore has to be converted before a provider
 * can view it or before it can be merged into a PDF.
 *
 * WHAT IS STORED: only the converted JPEG. The original HEIC bytes are NOT retained anywhere.
 * `migrations/004_create_submission_files.sql`'s `content_type` column records `image/jpeg` for a
 * converted file, while `original_content_type` records `image/heic` — so a future reader can tell
 * the file was converted without the source bytes needing to exist.
 *
 * WHY `heic-convert`: pure JavaScript (`heic-decode` + `jpeg-js` + `pngjs`, all pure JS, zero
 * native bindings — see 04-RESEARCH.md Standard Stack). `sharp` and a `libheif`/ImageMagick
 * shell-out were both rejected because they require a native binary or system library not present
 * in the Fly image's auto-built Dockerfile (`@flydotio/dockerfile`), and adding one is real,
 * avoidable ops surface this phase doesn't need.
 *
 * COST: HEIC decode + JPEG re-encode is real CPU/memory work on the current 1 shared CPU / 1 GB
 * Fly VM (04-RESEARCH.md Pitfall 4). The named mitigation is plan 04-17's `[[vm]] memory` bump to
 * `2gb` — this file does not attempt its own throttling or queueing.
 *
 * This module never throws uncaught. Conversion failures degrade to a typed `{ ok: false }` result
 * so the upload route can map straight to the UI-SPEC's upload-failed copy without wrapping every
 * call in its own try/catch — matching this directory's house style (see upload-validation.ts).
 */
import convert from "heic-convert";

export type HeicConversionResult = { ok: true; jpeg: Buffer } | { ok: false; reason: string };

/**
 * Converts the main image in a HEIC/HEIF buffer to a JPEG buffer.
 *
 * `reason` (on failure) is for server logs only and must never contain a filename or input bytes —
 * it is the underlying decode/encode library's error message, which describes the failure mode
 * (malformed box structure, unsupported brand, etc.), never patient-identifying data.
 */
export async function heicBufferToJpeg(input: Buffer): Promise<HeicConversionResult> {
  try {
    const jpeg = await convert({ buffer: input, format: "JPEG", quality: 0.85 });
    return { ok: true, jpeg: Buffer.from(jpeg) };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "heic-convert failed";
    return { ok: false, reason };
  }
}
