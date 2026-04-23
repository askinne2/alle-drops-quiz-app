/**
 * Quiz Submission API Route
 * Handles quiz submission from theme blocks
 * Includes CORS headers for cross-origin requests
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import { validateQuizData, type QuizSubmissionData } from "../lib/quiz-validation";
import { findOrCreateCustomer } from "../lib/shopify/customers";
import {
  getCustomerMetafield,
  updateCustomerMetafields,
  type QuizMetafieldData,
} from "../lib/shopify/metafields";
import { submitToGoogleSheets } from "../lib/google-sheets";

// CORS headers for cross-origin requests from Shopify stores
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Shop-Domain",
};

// Handle OPTIONS preflight requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      message: "Quiz submission endpoint. Use POST to submit quiz data.",
      method: "POST",
      endpoint: "/api/quiz/submit",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  try {
    // Parse request body first (before any authentication attempts)
    let requestData;
    const contentType = request.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      requestData = await request.json();
    } else {
      // Handle form data
      const formData = await request.formData();
      const entries: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        entries[key] = value;
      }
      requestData = entries;
      
      if (requestData.quiz_score) {
        requestData.quiz_score = Number(requestData.quiz_score);
      }
      if (requestData.completion_time) {
        requestData.completion_time = Number(requestData.completion_time);
      }
      if (requestData.answers && typeof requestData.answers === "string") {
        try {
          requestData.answers = JSON.parse(requestData.answers as string);
        } catch {
          requestData.answers = {};
        }
      }
    }

    // Validate data first
    const validation = validateQuizData(requestData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const quizData = requestData as QuizSubmissionData;

    // Get shop domain from request
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";
    const shopMatch = origin.match(/https?:\/\/([^/]+)/);
    let shop = shopMatch?.[1] || request.headers.get("x-shopify-shop-domain") || "";
    
    // Clean up shop domain
    if (shop && !shop.includes(".myshopify.com")) {
      // Try to extract myshopify domain
      const myshopifyMatch = origin.match(/([^.]+\.myshopify\.com)/);
      if (myshopifyMatch) {
        shop = myshopifyMatch[1];
      }
    }

    if (!shop) {
      // Return success without customer update if no shop context
      // This allows the quiz to work without full Shopify integration
      console.log("No shop domain found, skipping customer metafield update");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Quiz submitted (no shop context - customer update skipped)",
          customerId: null,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Try to get admin API access
    let admin;
    try {
      const result = await unauthenticated.admin(shop);
      admin = result.admin;
    } catch (authError) {
      console.error("Admin auth failed:", authError);
      // Return success without customer update
      return new Response(
        JSON.stringify({
          success: true,
          message: "Quiz submitted (auth unavailable - customer update skipped)",
          customerId: null,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Try to find or create customer and update metafields
    // This may fail if app doesn't have protected customer data access
    let customerId: string | null = null;
    let historyCount = 0;
    let customerUpdateSkipped = false;

    try {
      const customer = await findOrCreateCustomer(admin, quizData.email);
      
      if (customer) {
        customerId = customer.id;
        
        // Get existing quiz history
        const existingHistory = await getCustomerMetafield(
          admin,
          customer.id,
          "alledrops",
          "quiz_history"
        );

        // Prepare metafield data
        const metafieldData: QuizMetafieldData = {
          symptom_profile_id: quizData.symptom_profile_id,
          quiz_score: quizData.quiz_score,
          state: quizData.state,
          score_bracket: quizData.score_bracket,
          quiz_date: quizData.quiz_date || new Date().toISOString(),
        };

        // Update customer metafields
        const metafieldResult = await updateCustomerMetafields(
          admin,
          customer.id,
          metafieldData,
          existingHistory
        );

        if (metafieldResult.success) {
          historyCount = metafieldResult.historyCount || 0;
        } else {
          console.warn("Metafield update failed (non-critical):", metafieldResult.error);
        }
      }
    } catch (customerError: unknown) {
      // Check if this is a protected customer data error
      const errorMessage = customerError instanceof Error ? customerError.message : String(customerError);
      
      if (errorMessage.includes("not approved to access the Customer object") ||
          errorMessage.includes("protected-customer-data")) {
        console.warn("⚠️ Protected Customer Data access not configured. Quiz saved without customer link.");
        console.warn("   To enable customer metafields, request access at: https://shopify.dev/docs/apps/launch/protected-customer-data");
        customerUpdateSkipped = true;
      } else {
        console.error("Customer operation failed (non-critical):", customerError);
        customerUpdateSkipped = true;
      }
    }

    // Submit to Google Sheets (REQUIRED for HIPAA-compliant full data storage)
    // Full quiz responses are stored in Google Sheets, only summary is stored in Shopify
    const quizDate = quizData.quiz_date || new Date().toISOString();
    let googleSheetsSuccess = false;
    let googleSheetsError: string | null = null;

    if (process.env.GOOGLE_SHEETS_WEB_APP_URL) {
      try {
        // Google Sheets row (update Apps Script column headers to match):
        // profile_id, name, email, phone, dob, state, score, score_bracket, date, completion_time,
        // answers_json, personal_history_json, family_history_json
        const rowData = [
          quizData.symptom_profile_id,
          quizData.name,
          quizData.email,
          quizData.phone,
          quizData.dob,
          quizData.state,
          quizData.quiz_score,
          quizData.score_bracket,
          quizDate,
          quizData.completion_time || 0,
          JSON.stringify(quizData.answers ?? {}),
          JSON.stringify(quizData.personal_history ?? []),
          JSON.stringify(quizData.family_history ?? []),
        ];

        const sheetsResult = await submitToGoogleSheets(
          rowData,
          process.env.GOOGLE_SHEETS_WEB_APP_URL
        );
        
        googleSheetsSuccess = sheetsResult.success;
        if (!sheetsResult.success) {
          googleSheetsError = sheetsResult.error || "Unknown error";
          console.warn("⚠️ Google Sheets submission failed:", sheetsResult.error);
        } else {
          console.log("✅ Google Sheets submission successful, row:", sheetsResult.rowNumber);
        }
      } catch (sheetsError) {
        googleSheetsError = sheetsError instanceof Error ? sheetsError.message : "Unknown error";
        console.error("❌ Google Sheets submission error:", sheetsError);
      }
    } else {
      console.warn("⚠️ GOOGLE_SHEETS_WEB_APP_URL not configured. Full quiz responses not being stored!");
      googleSheetsError = "Google Sheets URL not configured";
    }

    // Success response - quiz is saved even if some updates were skipped
    let message = "Quiz submitted successfully";
    const warnings: string[] = [];
    
    if (customerUpdateSkipped) {
      warnings.push("Customer metafields skipped - protected data access needed");
    }
    if (!googleSheetsSuccess) {
      warnings.push(`Google Sheets: ${googleSheetsError || "submission failed"}`);
    }
    
    if (warnings.length > 0) {
      message = `Quiz submitted with warnings: ${warnings.join("; ")}`;
    }

    // Log detailed results
    console.log("📊 Quiz Submission Results:", {
      customerId,
      customerUpdateSkipped,
      metafieldHistoryCount: historyCount,
      googleSheetsSuccess,
      googleSheetsError,
      message,
    });

    return new Response(
      JSON.stringify({
        success: true,
        customerId,
        message,
        historyCount,
        customerUpdateSkipped,
        googleSheetsSuccess,
        googleSheetsError,
        // Debug info
        debug: {
          envGoogleSheetsConfigured: !!process.env.GOOGLE_SHEETS_WEB_APP_URL,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Quiz submission error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};
