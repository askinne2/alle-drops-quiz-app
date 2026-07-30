/** State-specific AlleDrops product handles (Shopify storefront). Prices/variants live in Shopify Admin. */
export const PRODUCT_HANDLE_BY_STATE = {
  // Verified against the live storefront 2026-07-30: both handles return HTTP 200
  // (product ids 7624809840846 "Tennessee - AlleDrops" and 7601816862926 "Texas - AlleDrops").
  // The previous spellings carried a doubled r in the brand segment and returned 404 for every
  // patient — that was DEF-03. The misspelled form is deliberately not written out anywhere in
  // this file: product-links.test.ts asserts its literal absence here.
  tennessee: "tennessee-alledrops",
  texas: "texas-alledrops",
} as const;

/** The two states AlleDrops serves, derived from the handle map so the two cannot drift. */
export type PatientStateKey = keyof typeof PRODUCT_HANDLE_BY_STATE;

/**
 * The product-handle slice of the `AlleDropsQuizConfig` object the quiz embed injects.
 *
 * These key names are the camelCase keys that embed writes, and they are asserted verbatim
 * against the served HTML, so do not rename them casually.
 */
export type QuizProductConfig =
  | {
      tnProductHandle?: string;
      txProductHandle?: string;
    }
  | undefined;

/**
 * Resolve the product handle for a patient's state, preferring merchant configuration.
 *
 * A populated config value wins; a missing, undefined, or empty value falls back to
 * `PRODUCT_HANDLE_BY_STATE`.
 *
 * The fallback is the LIVE PRODUCTION PATH on deploy day, not a safety net. Shopify
 * `"type": "product"` settings cannot declare a `default`, so both theme pickers render blank
 * until a human opens the theme editor and picks a product. Until then every patient resolves
 * through the map above, which is why the corrected spellings ship here rather than only in
 * the theme schema.
 *
 * Takes the config as an argument rather than reaching for a browser global, so it stays pure
 * and testable under vitest's `node` environment. The thin browser-global wrapper belongs in
 * the calling component; this module reads no globals at all, and its test asserts that.
 * Returns a bare handle, not a URL — the caller builds `/products/${handle}`, and the Liquid
 * side reads `.handle`, not `.url`.
 */
export function getProductHandle(state: PatientStateKey, cfg: QuizProductConfig): string {
  const configured = (state === "tennessee" ? cfg?.tnProductHandle : cfg?.txProductHandle) || "";
  if (configured !== "") return configured;
  return PRODUCT_HANDLE_BY_STATE[state];
}
