/**
 * Fallback destinations for the two quiz exits that leave the iframe for a storefront page.
 *
 * Both exits read a merchant-configured URL out of `AlleDropsQuizConfig` first. This module owns
 * only the value used when that setting is missing or blank — which, per the theme block schema,
 * is the documented behaviour rather than an error path.
 *
 * Why these specific values, measured against the live storefront on 2026-07-30 while
 * authenticated past the storefront password:
 *
 *   /pages/test-options            -> 200, titled "Test Options"
 *   /products/allergy-consultation -> 200
 *   /pages/consult                 -> 404
 *
 * `/pages/consult` was the previous consult fallback and it does not exist. Blanking the consult
 * setting in the theme editor therefore sent a patient who had just completed a clinical intake to
 * a 404. The consult fallback is now the product page, which is also the value the live theme block
 * carries, so the configured path and the fallback path agree instead of diverging.
 *
 * The test-options fallback is unchanged: that page is verified to exist.
 *
 * Both values must satisfy `isSafeRelativePath` in `./navigation.ts`, because every exit routes
 * through `toRelativePath` before it is posted to the parent. `redirects.test.ts` asserts that,
 * so a future edit cannot introduce an absolute URL or a protocol-relative target here.
 */
export const REDIRECT_FALLBACK = {
  consult: "/products/allergy-consultation",
  testOptions: "/pages/test-options",
} as const;

/** The two quiz exits that hand off to a storefront page. */
export type RedirectKind = keyof typeof REDIRECT_FALLBACK;

/** The redirect slice of the `AlleDropsQuizConfig` object the quiz embed injects. */
export type QuizRedirectConfig =
  | {
      consultRedirectUrl?: string;
      testOptionsRedirectUrl?: string;
    }
  | undefined;

/**
 * Resolve where a quiz exit should send the patient, preferring merchant configuration.
 *
 * A populated config value wins; a missing, undefined, or empty value falls back to
 * `REDIRECT_FALLBACK`. Whitespace-only settings count as blank — the theme editor stores an
 * untouched URL field as an empty string, but a hand-edited template JSON can carry a stray space,
 * and treating that as configured would navigate the patient to a path of nothing.
 *
 * Pure by construction: takes the config as an argument rather than reaching for a browser global,
 * so it is testable under vitest's `node` environment. The thin browser-global wrapper belongs in
 * the calling component, matching `./product-links.ts`.
 */
export function getRedirectTarget(kind: RedirectKind, cfg: QuizRedirectConfig): string {
  const raw = kind === "consult" ? cfg?.consultRedirectUrl : cfg?.testOptionsRedirectUrl;
  const configured = (raw || "").trim();
  if (configured !== "") return configured;
  return REDIRECT_FALLBACK[kind];
}
