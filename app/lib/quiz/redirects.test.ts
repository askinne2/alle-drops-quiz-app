import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { REDIRECT_FALLBACK, getRedirectTarget } from "./redirects";
import { isSafeRelativePath } from "./navigation";

describe("REDIRECT_FALLBACK", () => {
  it("points consult at the product page, not the 404 page it used to use", () => {
    expect(REDIRECT_FALLBACK.consult).toBe("/products/allergy-consultation");
  });

  it("keeps the test-options fallback on the page verified to exist", () => {
    expect(REDIRECT_FALLBACK.testOptions).toBe("/pages/test-options");
  });

  // The regression this module exists to prevent. /pages/consult returned 404 on the live
  // storefront on 2026-07-30, so it must not come back as a fallback for either exit.
  it("never falls back to the dead consult page", () => {
    for (const value of Object.values(REDIRECT_FALLBACK)) {
      expect(value).not.toBe("/pages/consult");
    }
  });

  // Every exit posts through toRelativePath, so a fallback the parent would reject is a dead end.
  it("every fallback survives the parent's path validator", () => {
    for (const value of Object.values(REDIRECT_FALLBACK)) {
      expect(isSafeRelativePath(value)).toBe(true);
    }
  });
});

describe("getRedirectTarget", () => {
  it("prefers a configured URL over the fallback", () => {
    const cfg = { consultRedirectUrl: "/pages/book", testOptionsRedirectUrl: "/pages/kits" };
    expect(getRedirectTarget("consult", cfg)).toBe("/pages/book");
    expect(getRedirectTarget("testOptions", cfg)).toBe("/pages/kits");
  });

  it("falls back when the config object is absent", () => {
    expect(getRedirectTarget("consult", undefined)).toBe(REDIRECT_FALLBACK.consult);
    expect(getRedirectTarget("testOptions", undefined)).toBe(REDIRECT_FALLBACK.testOptions);
  });

  it("falls back when the setting is present but empty", () => {
    const cfg = { consultRedirectUrl: "", testOptionsRedirectUrl: "" };
    expect(getRedirectTarget("consult", cfg)).toBe(REDIRECT_FALLBACK.consult);
    expect(getRedirectTarget("testOptions", cfg)).toBe(REDIRECT_FALLBACK.testOptions);
  });

  it("treats a whitespace-only setting as blank", () => {
    const cfg = { consultRedirectUrl: "   ", testOptionsRedirectUrl: "\t" };
    expect(getRedirectTarget("consult", cfg)).toBe(REDIRECT_FALLBACK.consult);
    expect(getRedirectTarget("testOptions", cfg)).toBe(REDIRECT_FALLBACK.testOptions);
  });

  it("trims a configured value rather than posting a padded path", () => {
    const cfg = { consultRedirectUrl: "  /pages/book  " };
    expect(getRedirectTarget("consult", cfg)).toBe("/pages/book");
  });

  it("resolves each kind from its own key, with no cross-wiring", () => {
    // The live defect was both settings resolving to the same destination, so assert the
    // two keys stay independent even when only one is populated.
    expect(getRedirectTarget("testOptions", { consultRedirectUrl: "/pages/book" })).toBe(
      REDIRECT_FALLBACK.testOptions,
    );
    expect(getRedirectTarget("consult", { testOptionsRedirectUrl: "/pages/kits" })).toBe(
      REDIRECT_FALLBACK.consult,
    );
  });
});

describe("module purity", () => {
  it("reads no browser globals", () => {
    const src = readFileSync(new URL("./redirects.ts", import.meta.url), "utf8");
    // Assembled from fragments so this assertion cannot be invalidated by its own source text.
    const needle = "win" + "dow";
    expect(src.includes(needle)).toBe(false);
  });
});
