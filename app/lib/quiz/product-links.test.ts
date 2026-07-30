import { describe, it, expect } from "vitest";
import {
  PRODUCT_HANDLE_BY_STATE,
  getProductHandle,
  type QuizProductConfig,
} from "./product-links";

/**
 * DEF-03. The shipped handles were misspelled `*-allerdrops` (double r) and 404'd for every
 * patient. The corrected spellings were verified against the live storefront on 2026-07-30:
 * both `*-alledrops` handles return HTTP 200, both `*-allerdrops` handles return 404.
 *
 * The precedence tests matter more than they look. Shopify `"type": "product"` settings
 * cannot declare a `default`, so both theme pickers are BLANK on deploy day and every patient
 * hits the code map. The map is the production path, not a fallback.
 */

describe("PRODUCT_HANDLE_BY_STATE", () => {
  it("maps tennessee to the live product handle", () => {
    expect(PRODUCT_HANDLE_BY_STATE.tennessee).toBe("tennessee-alledrops");
  });

  it("maps texas to the live product handle", () => {
    expect(PRODUCT_HANDLE_BY_STATE.texas).toBe("texas-alledrops");
  });

  it("never reintroduces the double-r misspelling that caused DEF-03", () => {
    // Guards the regression directly: a future edit that types "allerdrops" fails here
    // instead of 404-ing a patient mid-purchase.
    expect(PRODUCT_HANDLE_BY_STATE.tennessee).not.toContain("allerdrops");
    expect(PRODUCT_HANDLE_BY_STATE.texas).not.toContain("allerdrops");
  });
});

describe("getProductHandle", () => {
  it("falls back to the code map when there is no config at all", () => {
    expect(getProductHandle("tennessee", undefined)).toBe("tennessee-alledrops");
    expect(getProductHandle("texas", undefined)).toBe("texas-alledrops");
  });

  it("falls back to the code map when the config is present but the key is absent", () => {
    expect(getProductHandle("tennessee", {})).toBe("tennessee-alledrops");
    expect(getProductHandle("texas", {})).toBe("texas-alledrops");
  });

  it("treats a blank picker as absent — the deploy-day state", () => {
    // "type": "product" settings cannot carry a default, so this is what production
    // actually sends until a human opens the theme editor.
    expect(getProductHandle("tennessee", { tnProductHandle: "" })).toBe("tennessee-alledrops");
    expect(getProductHandle("texas", { txProductHandle: "" })).toBe("texas-alledrops");
  });

  it("lets a populated picker win over the code map", () => {
    expect(getProductHandle("tennessee", { tnProductHandle: "custom-tn" })).toBe("custom-tn");
    expect(getProductHandle("texas", { txProductHandle: "custom-tx" })).toBe("custom-tx");
  });

  it("does not leak the Tennessee setting into the Texas branch", () => {
    expect(getProductHandle("texas", { tnProductHandle: "custom-tn" })).toBe("texas-alledrops");
  });

  it("does not leak the Texas setting into the Tennessee branch", () => {
    expect(getProductHandle("tennessee", { txProductHandle: "custom-tx" })).toBe(
      "tennessee-alledrops"
    );
  });

  it("resolves each state independently when both pickers are populated", () => {
    const cfg: QuizProductConfig = {
      tnProductHandle: "custom-tn",
      txProductHandle: "custom-tx",
    };
    expect(getProductHandle("tennessee", cfg)).toBe("custom-tn");
    expect(getProductHandle("texas", cfg)).toBe("custom-tx");
  });
});
