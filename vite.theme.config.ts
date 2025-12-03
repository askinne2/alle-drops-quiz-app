/**
 * Vite config for building standalone theme bundle
 * This creates a single JS file that can be loaded in Shopify themes
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  publicDir: false, // Disable public directory - we're building a library bundle, not serving static assets
  define: {
    // Replace process.env for browser compatibility
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },
  build: {
    lib: {
      entry: "./app/entry.theme.tsx",
      name: "AlleDropsQuiz",
      fileName: () => "quiz-bundle.js", // Output as quiz-bundle.js (no .iife suffix)
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
        // Inline CSS into the bundle
        inlineDynamicImports: true,
        // Control CSS filename - rename any CSS file to quiz-bundle.css
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "quiz-bundle.css";
          }
          return assetInfo.name || "assets/[name].[ext]";
        },
      },
    },
    outDir: "public",
    emptyOutDir: false,
    cssCodeSplit: false, // Bundle all CSS into one file
  },
  resolve: {
    alias: {
      "~": new URL("./app", import.meta.url).pathname,
    },
  },
  css: {
    inject: false, // Don't inject - we want a separate CSS file
  },
});

