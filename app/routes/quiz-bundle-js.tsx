/**
 * Serve the quiz bundle JavaScript
 * This route serves the compiled quiz bundle for embedding in themes
 */

import type { LoaderFunctionArgs } from "react-router";
import { readFile } from "fs/promises";
import { join } from "path";

// CORS headers for cross-origin requests from Shopify stores
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Serve the built bundle from public directory
    const bundlePath = join(process.cwd(), "public", "quiz-bundle.js");
    
    try {
      const bundle = await readFile(bundlePath, "utf-8");
      return new Response(bundle, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          ...corsHeaders,
        },
      });
    } catch (fileError) {
      console.error("Failed to read quiz bundle:", fileError);
      // Return error script
      const errorScript = `
        console.error('Quiz bundle not found. Run: npm run build:theme');
        document.querySelectorAll('[data-alledrops-quiz]').forEach(function(el) {
          el.innerHTML = '<p style="text-align: center; padding: 2rem; color: #f44336;">Quiz bundle not found. Please rebuild the app.</p>';
        });
      `;
      return new Response(errorScript, {
        status: 200, // Return 200 so script executes
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          ...corsHeaders,
        },
      });
    }
  } catch (error) {
    console.error("Quiz bundle route error:", error);
    return new Response(
      `console.error('Quiz bundle error');`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/javascript",
          ...corsHeaders,
        },
      }
    );
  }
};
