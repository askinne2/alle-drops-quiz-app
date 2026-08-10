/**
 * Quiz Submission API Route
 *
 * Flow:
 *   1. Validate payload.
 *   2. Resolve Shopify shop + (optionally) customer ID via Admin API.
 *   3. INSERT full PHI row to Cloud SQL.
 *   3.5. Promote any staged testing_files uploads and link them (best-effort; see below).
 *   4. Update non-PHI metafields on the customer (last_completed_at, quiz_count) — best effort.
 *
 * HIPAA: PHI is written ONLY to Cloud SQL. NO PHI in Shopify metafields.
 *
 * FAILURE POLICY for step 3.5 (decided in plan 04-17, see 04-17-SUMMARY.md): the submission itself
 * is authoritative. If file promotion fails at any point — GCS copy, insertSubmissionFiles, or a
 * best-effort staged-object delete — this route still returns its normal success response. The
 * patient's questionnaire is saved and they see their results regardless of promotion outcome. We
 * do NOT roll back the submission and we do NOT surface a partial-failure message to the patient:
 * they cannot act on it, and a scary message on a completed clinical intake is worse than a
 * reconciliation task. A promotion failure costs a reconciliation task instead — see
 * docs/gcs-lifecycle-and-retention.md for the reconciliation query (a promoted object with no
 * submission_files row, or a row whose object is missing at the permanent key).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import { validateQuizData, type QuizSubmissionData } from "../lib/quiz-validation";
import { findOrCreateCustomer } from "../lib/shopify/customers";
import { updateNonPhiQuizMetafields } from "../lib/shopify/metafields";
import { insertSubmission } from "../lib/submissions";
import { insertSubmissionFiles, type NewSubmissionFile } from "../lib/submission-files";
import { getBucket, buildPermanentKey, copyObject, deleteObject, GCS_PENDING_PREFIX } from "../lib/storage/gcs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Shop-Domain",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return jsonResponse({
    message: "Quiz submission endpoint. Use POST to submit quiz data.",
    method: "POST",
    endpoint: "/api/quiz/submit",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ---------- 1. Parse + validate ----------
  let requestData: unknown;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      requestData = await request.json();
    } else {
      const formData = await request.formData();
      const entries: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) entries[key] = value;
      if (typeof entries.quiz_score === "string") entries.quiz_score = Number(entries.quiz_score);
      if (typeof entries.completion_time === "string") {
        entries.completion_time = Number(entries.completion_time);
      }
      if (typeof entries.answers === "string") {
        try {
          entries.answers = JSON.parse(entries.answers);
        } catch {
          entries.answers = {};
        }
      }
      requestData = entries;
    }
  } catch (err) {
    console.error("[submit] parse error:", err);
    return jsonResponse({ error: "Could not parse request body" }, 400);
  }

  const validation = validateQuizData(requestData);
  if (!validation.valid) {
    return jsonResponse({ error: validation.error }, 400);
  }
  const quizData = requestData as QuizSubmissionData;

  // ---------- 2. Resolve Shopify shop + customer (best effort) ----------
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  const myshopifyMatch = origin.match(/([^.\/]+\.myshopify\.com)/);
  const shop =
    myshopifyMatch?.[1] ||
    request.headers.get("x-shopify-shop-domain") ||
    "";

  let customerIdShopify: string | null = null;
  let customerLinkSkipped = false;
  let admin: { graphql: (q: string, opts?: { variables?: Record<string, unknown> }) => Promise<{ json: () => Promise<unknown> }> } | null = null;

  if (shop) {
    try {
      const result = await unauthenticated.admin(shop);
      admin = result.admin as unknown as typeof admin;
    } catch (authErr) {
      console.warn("[submit] unauthenticated.admin failed, trying direct token:", (authErr as Error).message);
      // Fall back to direct Admin API access token (works for single-shop deployments).
      const directToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      const directShop = process.env.SHOPIFY_SHOP_DOMAIN || shop;
      if (directToken && directShop) {
        const apiVersion = "2024-10";
        admin = {
          graphql: async (query: string, opts?: { variables?: Record<string, unknown> }) => {
            const resp = await fetch(
              `https://${directShop}/admin/api/${apiVersion}/graphql.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": directToken,
                },
                body: JSON.stringify({ query, variables: opts?.variables ?? {} }),
              }
            );
            return { json: () => resp.json() };
          },
        };
      } else {
        customerLinkSkipped = true;
      }
    }

    if (admin) {
      try {
        const customer = await findOrCreateCustomer(admin, quizData.email);
        if (customer?.id) customerIdShopify = customer.id;
      } catch (custErr: unknown) {
        const msg = custErr instanceof Error ? custErr.message : String(custErr);
        if (
          msg.includes("not approved to access the Customer object") ||
          msg.includes("protected-customer-data")
        ) {
          console.warn(
            "[submit] Protected Customer Data not approved — submission stored without customer link."
          );
        } else {
          console.warn("[submit] customer lookup failed:", custErr);
        }
        customerLinkSkipped = true;
      }
    }
  } else {
    customerLinkSkipped = true;
  }

  // ---------- 3. INSERT to Cloud SQL (PHI) ----------
  let submissionId: string;
  let submissionCreatedAt: string;
  try {
    const inserted = await insertSubmission({
      ...quizData,
      customer_id_shopify: customerIdShopify,
      consent_version: typeof quizData.consent_version === 'string' ? quizData.consent_version : undefined,
      consent_ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("cf-connecting-ip") ||
        null,
      consent_user_agent: request.headers.get("user-agent"),
    });
    submissionId = inserted.id;
    submissionCreatedAt = inserted.created_at;
  } catch (dbErr) {
    console.error("[submit] Cloud SQL INSERT failed:", dbErr);
    return jsonResponse({ error: "Could not save assessment" }, 500);
  }

  // ---------- 3.5. Promote staged testing_files uploads (best-effort — see file header) ----------
  const testingFileTokens = Array.isArray(
    (quizData.answers as Record<string, unknown> | undefined)?.testing_files
  )
    ? ((quizData.answers as Record<string, unknown>).testing_files as string[])
    : [];

  if (testingFileTokens.length > 0) {
    let attempted = 0;
    let succeeded = 0;
    try {
      const bucket = getBucket();
      const rows: NewSubmissionFile[] = [];
      const promotedPendingKeys: string[] = [];

      for (const token of testingFileTokens) {
        attempted++;
        try {
          const prefix = `${GCS_PENDING_PREFIX}${token}/`;
          const [files] = await bucket.getFiles({ prefix });
          if (!files || files.length === 0) {
            // An expired (OLM-collected) or already-promoted token is not a reason to fail a
            // completed clinical intake — skip and count it.
            continue;
          }

          const pendingFile = files[0];
          const [metadata] = await pendingFile.getMetadata();
          const custom = (metadata?.metadata ?? {}) as Record<string, unknown>;

          // Source of truth is the GCS custom object metadata written by api.quiz.upload.tsx at
          // upload time — never the client-supplied request payload.
          const originalFilename =
            typeof custom.original_filename === "string" ? custom.original_filename : "unknown";
          const contentType =
            typeof custom.content_type === "string" ? custom.content_type : "application/octet-stream";
          const originalContentType =
            typeof custom.original_content_type === "string" ? custom.original_content_type : contentType;
          const sizeBytes = Number(custom.size_bytes ?? 0) || 0;

          const fileId = crypto.randomUUID();
          const permanentKey = buildPermanentKey(submissionId, fileId, originalFilename);
          await copyObject(pendingFile.name, permanentKey);

          rows.push({
            storage_object_key: permanentKey,
            original_filename: originalFilename,
            content_type: contentType,
            original_content_type: originalContentType,
            size_bytes: sizeBytes,
          });
          promotedPendingKeys.push(pendingFile.name);
        } catch {
          // One file's copy/metadata-read failure doesn't stop the others; counted via
          // attempted/succeeded in the outer catch's log if the whole step ultimately fails.
        }
      }

      if (rows.length > 0) {
        // All N rows land in ONE transaction — insertSubmissionFiles is called exactly once
        // regardless of file count.
        await insertSubmissionFiles(submissionId, rows);
        succeeded = rows.length;

        // Only after the transaction commits do we delete the staged copies — best-effort, each
        // individually caught. A failed delete leaves an object the pending/ lifecycle rule will
        // collect; it must never fail the request.
        for (const pendingKey of promotedPendingKeys) {
          try {
            await deleteObject(pendingKey);
          } catch {
            // Best-effort cleanup only.
          }
        }
      }
    } catch (promotionErr) {
      // Never log filenames, token values, or the raw error (it could carry request data) —
      // submission id and counts only, matching this route's existing logging discipline.
      console.error("[submit] file promotion failed", { submissionId, attempted, succeeded });
    }
  }

  // ---------- 4. Best-effort non-PHI metafields ----------
  let metafieldsSuccess = false;
  let quizCount: number | undefined;
  if (admin && customerIdShopify) {
    const completedAt = quizData.quiz_date ? new Date(quizData.quiz_date) : new Date();
    const result = await updateNonPhiQuizMetafields(admin, customerIdShopify, completedAt);
    metafieldsSuccess = result.success;
    quizCount = result.quizCount;
    if (!result.success) {
      console.warn("[submit] non-PHI metafield update failed:", result.error);
    }
  }

  // ---------- 5. Response ----------
  console.log("[submit] OK", {
    submissionId,
    customerLinked: !!customerIdShopify,
    customerLinkSkipped,
    metafieldsSuccess,
  });

  return jsonResponse({
    success: true,
    submission_id: submissionId,
    symptom_profile_id: quizData.symptom_profile_id,
    created_at: submissionCreatedAt,
    customer_linked: !!customerIdShopify,
    quiz_count: quizCount ?? null,
    warnings: customerLinkSkipped
      ? ["Customer not linked at submission time — will be linked on first dashboard view."]
      : [],
  });
};
