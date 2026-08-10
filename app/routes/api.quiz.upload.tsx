/**
 * Quiz File Upload API Route
 *
 * This is the ONLY route in this app that accepts binary PHI. A patient's uploaded allergy-test
 * result (PDF/JPEG/PNG/HEIC) streams through this endpoint, one file per request, and is staged
 * under GCS's `pending/` prefix. Plan 04-17's promotion step (invoked from `api.quiz.submit.tsx`)
 * is what makes a staged file permanent and links it to a `submissions` row; this route never
 * touches Postgres.
 *
 * Filenames are PHI (CLAUDE.md rule 5, amended by plan 04-01) — a filename can carry a patient
 * name (e.g. "john-smith-allergy-panel.pdf"). Nothing in this file logs a filename. The 200
 * response is exactly `{ token, contentType, sizeBytes }` — no filename, no object key, no bucket,
 * no signed URL. The client already holds the filename it sent and interpolates it into the
 * UI-SPEC's error copy itself; this server never echoes it back.
 *
 * Size caps (`MAX_FILE_BYTES` / `MAX_TOTAL_BYTES` / `MAX_FILES`, from
 * app/lib/storage/upload-validation.ts) trace to
 * .planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md §Ratified, and are enforced
 * by `@remix-run/form-data-parser` DURING streaming (inside its internal chunk-accumulation loop),
 * never after the whole multipart body has been buffered — the entire reason this package exists
 * on a 1 shared CPU / 1 GB Fly VM. This route never buffers the whole body via the native
 * `request` object's own form-parsing method — that anti-pattern is exactly what this package
 * exists to avoid.
 *
 * Staged objects live under the `pending/` prefix, whose lifecycle rule plan 04-17 configures
 * (orphaned staged files are deleted after `PENDING_OLM_AGE_DAYS`, never the permanent
 * `submissions/` prefix).
 */
import type { ActionFunctionArgs } from "react-router";
import {
  parseFormData,
  MaxFileSizeExceededError,
  MaxTotalSizeExceededError,
  MaxFilesExceededError,
  type FileUpload,
  type FileUploadHandler,
} from "@remix-run/form-data-parser";
import {
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_FILES,
  MIN_SNIFF_BYTES,
  sniffType,
  isAllowedType,
  effectiveContentType,
} from "../lib/storage/upload-validation";
import { heicBufferToJpeg } from "../lib/storage/heic";
import { getBucket, buildPendingKey, sanitizeObjectName } from "../lib/storage/gcs";

// Matches api.quiz.submit.tsx's CORS posture today. Tightening this to a specific origin is a
// Phase 8 hardening item (see CLAUDE.md/04-RESEARCH.md Security Domain), not a silent divergence
// introduced by this route.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Shop-Domain",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** Sniffed-but-disallowed file content (a spoofed extension/Content-Type). Maps to 415. */
class UnsupportedFileTypeError extends Error {}
/** heic-convert failed on the uploaded bytes. Maps to 422. `reason` is server-log-only. */
class HeicConversionFailedError extends Error {
  constructor(readonly reason: string) {
    super("heic conversion failed");
  }
}
/** The GCS write itself failed. Maps to 500. Never surfaces `cause`'s message to the client. */
class UploadStorageError extends Error {
  constructor(readonly cause: unknown) {
    super("upload storage failed");
  }
}

interface StagedUpload {
  token: string;
  contentType: string;
  sizeBytes: number;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let staged: StagedUpload | null = null;

  const uploadHandler: FileUploadHandler = async (fileUpload: FileUpload) => {
    if (fileUpload.fieldName !== "file") return;

    // ---------- Sniff before accepting. Bytes only — never fileUpload.type, never the extension. ----------
    const bytes = new Uint8Array(await fileUpload.arrayBuffer());
    const sniffed = sniffType(bytes.subarray(0, MIN_SNIFF_BYTES));
    if (!isAllowedType(sniffed)) {
      console.warn("[upload:sniff] rejected — content did not match an allowed type");
      throw new UnsupportedFileTypeError();
    }

    const originalContentType = effectiveContentType(sniffed!);
    let storedBytes = bytes;
    let storedContentType = originalContentType;

    // ---------- Convert HEIC. Only the converted JPEG is retained; original bytes are discarded. ----------
    if (sniffed === "heic") {
      const converted = await heicBufferToJpeg(Buffer.from(bytes));
      if (!converted.ok) {
        console.warn("[upload:heic] conversion failed:", converted.reason);
        throw new HeicConversionFailedError(converted.reason);
      }
      storedBytes = new Uint8Array(converted.jpeg);
      storedContentType = "image/jpeg";
    }

    // ---------- Stage under pending/ with an opaque token. ----------
    const token = crypto.randomUUID();
    const objectKey = buildPendingKey(token, fileUpload.name);

    try {
      await getBucket()
        .file(objectKey)
        .save(Buffer.from(storedBytes), {
          resumable: true,
          metadata: {
            contentType: storedContentType,
            metadata: {
              // Source of truth for plan 04-17's promotion step — the client never supplies
              // this again. `original_filename` is PHI; stored only as GCS object metadata,
              // never logged and never echoed in this route's response.
              original_filename: sanitizeObjectName(fileUpload.name),
              content_type: storedContentType,
              original_content_type: originalContentType,
              size_bytes: storedBytes.length,
            },
          },
        });
    } catch (err) {
      console.error("[upload:store] GCS write failed", { tokenLength: token.length });
      throw new UploadStorageError(err);
    }

    console.log("[upload:ok] staged", { byteCount: storedBytes.length });
    staged = { token, contentType: storedContentType, sizeBytes: storedBytes.length };
    return null;
  };

  try {
    await parseFormData(
      request,
      { maxFileSize: MAX_FILE_BYTES, maxTotalSize: MAX_TOTAL_BYTES, maxFiles: MAX_FILES },
      uploadHandler
    );
  } catch (err) {
    if (err instanceof MaxFileSizeExceededError) {
      console.warn("[upload:parse] rejected — file too large");
      return jsonResponse({ error: "File too large" }, 413);
    }
    if (err instanceof MaxTotalSizeExceededError) {
      console.warn("[upload:parse] rejected — total size exceeded");
      return jsonResponse({ error: "Total upload size exceeded" }, 413);
    }
    if (err instanceof MaxFilesExceededError) {
      console.warn("[upload:parse] rejected — too many files");
      return jsonResponse({ error: "Too many files" }, 413);
    }
    if (err instanceof UnsupportedFileTypeError) {
      return jsonResponse({ error: "Unsupported file type" }, 415);
    }
    if (err instanceof HeicConversionFailedError) {
      return jsonResponse({ error: "Could not process file" }, 422);
    }
    if (err instanceof UploadStorageError) {
      return jsonResponse({ error: "Could not upload file" }, 500);
    }
    console.error("[upload:parse] unexpected failure");
    return jsonResponse({ error: "Could not upload file" }, 500);
  }

  if (!staged) {
    return jsonResponse({ error: "No file provided" }, 400);
  }

  return jsonResponse(staged, 200);
};
