/**
 * Serve the quiz bundle CSS
 * This route serves the compiled quiz CSS for embedding in themes
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
    const cssPath = join(process.cwd(), "public", "quiz-bundle.css");
    
    try {
      const css = await readFile(cssPath, "utf-8");
      return new Response(css, {
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
          ...corsHeaders,
        },
      });
    } catch (fileError) {
      console.error("Failed to read quiz CSS:", fileError);
      return new Response("/* Quiz CSS not found */", {
        status: 200,
        headers: {
          "Content-Type": "text/css",
          ...corsHeaders,
        },
      });
    }
  } catch (error) {
    console.error("Quiz CSS route error:", error);
    return new Response("/* Error loading CSS */", {
      status: 500,
      headers: {
        "Content-Type": "text/css",
        ...corsHeaders,
      },
    });
  }
};
