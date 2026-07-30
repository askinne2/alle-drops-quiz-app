import { describe, it, expect } from "vitest";
import { isSafeRelativePath, toRelativePath } from "./navigation";

/**
 * D-05 accept/reject matrix. These rows are the acceptance criteria for the
 * open-redirect fix, and they are also the spec the hand-ported `safeUrl` function in
 * extensions/quiz-block/blocks/symptom-quiz.liquid must satisfy. Keep the two in sync.
 */

const ACCEPT: readonly string[] = [
  "/pages/test-options", // the normal case
  "/products/tennessee-alledrops", // the anchor case
  "/", // Return Home (QuizContainer.tsx:328)
  "/pages/a?b=c#d", // query string and fragment are both fine
  "/products/allergy-consultation", // the live configured consult value; must not regress
];

const REJECT: readonly string[] = [
  "", // empty string
  "//evil.com", // protocol-relative; the single most-missed bypass
  "///evil.com", // caught by the same index-1 rule
  "https://evil.com/x", // absolute
  "http://evil.com/x", // absolute
  "https://alle-drops-quiz-app.fly.dev/pages/x", // today's actual bug output (D-03)
  "javascript:alert(1)", // no leading slash
  "mailto:a@b.c", // no leading slash
  "pages/test-options", // bare relative; ambiguous, rejected deliberately
  "\\/evil.com", // a backslash is not "/" at index 0
];

// DECIDED: REJECT. A leading "/" followed by a backslash.
//
// The plan predicted this would accept, on the stated reasoning that
// new URL("/\evil.com", origin) "stays same-origin in WHATWG-compliant browsers".
// That prediction is FALSE, and the assertions below are the evidence: the WHATWG URL
// parser treats "\" as equivalent to "/" for special schemes (http/https), so "/\host"
// enters the same authority state as "//host" and resolves to a DIFFERENT ORIGIN.
// Measured on node v20.19.6, and browsers implement the same spec:
//
//   new URL("/\evil.com",  "https://shop.example.com").origin === "https://evil.com"
//   new URL("/\\evil.com", "https://shop.example.com").origin === "https://evil.com"
//   new URL("/\/evil.com", "https://shop.example.com").origin === "https://evil.com"
//
// Accepting these would be a live open redirect — the exact defect class D-05 exists to
// close (threat T-1-06, disposition `mitigate`). So `isSafeRelativePath` rejects a
// backslash at index 1, symmetric with the existing index-1 "/" rule.
const BACKSLASH_AFTER_SLASH = "/\\evil.com";

// A backslash LATER in the path is harmless and stays same-origin — the parser normalises
// it to "/" inside the path. Asserted below so the rule stays narrow (index 1 only) rather
// than banning backslashes outright and breaking legitimate paths.
const BACKSLASH_IN_PATH = "/pages/a\\b";

describe("isSafeRelativePath", () => {
  for (const input of ACCEPT) {
    it(`accepts ${JSON.stringify(input)} as a same-origin relative path`, () => {
      expect(isSafeRelativePath(input)).toBe(true);
    });
  }

  for (const input of REJECT) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(isSafeRelativePath(input)).toBe(false);
    });
  }

  it("rejects null", () => {
    expect(isSafeRelativePath(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeRelativePath(undefined)).toBe(false);
  });

  it("rejects a number", () => {
    expect(isSafeRelativePath(42)).toBe(false);
  });

  it("rejects a plain object", () => {
    expect(isSafeRelativePath({})).toBe(false);
  });

  it("rejects a leading slash followed by a backslash, which the URL parser resolves off-origin", () => {
    // The reject is required, not stylistic. This assertion is the proof: the WHATWG parser
    // treats "/\host" as protocol-relative, so accepting it would hand an attacker the
    // parent's navigation. See the BACKSLASH_AFTER_SLASH comment above.
    expect(new URL(BACKSLASH_AFTER_SLASH, "https://shop.example.com").origin).toBe(
      "https://evil.com"
    );
    expect(isSafeRelativePath(BACKSLASH_AFTER_SLASH)).toBe(false);
  });

  it("rejects a slash followed by two backslashes", () => {
    expect(new URL("/\\\\evil.com", "https://shop.example.com").origin).toBe("https://evil.com");
    expect(isSafeRelativePath("/\\\\evil.com")).toBe(false);
  });

  it("rejects a slash followed by a backslash then a slash", () => {
    expect(new URL("/\\/evil.com", "https://shop.example.com").origin).toBe("https://evil.com");
    expect(isSafeRelativePath("/\\/evil.com")).toBe(false);
  });

  it("still accepts a backslash later in the path, which stays same-origin", () => {
    expect(new URL(BACKSLASH_IN_PATH, "https://shop.example.com").origin).toBe(
      "https://shop.example.com"
    );
    expect(isSafeRelativePath(BACKSLASH_IN_PATH)).toBe(true);
  });
});

describe("toRelativePath", () => {
  for (const input of ACCEPT) {
    it(`returns ${JSON.stringify(input)} unchanged`, () => {
      expect(toRelativePath(input)).toBe(input);
    });
  }

  for (const input of REJECT) {
    it(`returns null for ${JSON.stringify(input)}`, () => {
      expect(toRelativePath(input)).toBeNull();
    });
  }

  it("returns null for every non-string input", () => {
    expect(toRelativePath(null)).toBeNull();
    expect(toRelativePath(undefined)).toBeNull();
    expect(toRelativePath(42)).toBeNull();
    expect(toRelativePath({})).toBeNull();
  });

  it("returns null for the leading-slash-backslash path", () => {
    expect(toRelativePath(BACKSLASH_AFTER_SLASH)).toBeNull();
  });

  it("returns a backslash-in-path value unchanged", () => {
    expect(toRelativePath(BACKSLASH_IN_PATH)).toBe(BACKSLASH_IN_PATH);
  });
});
