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

// A leading "/" followed by a backslash. Under the index-0 / index-1 rules this ACCEPTS,
// and new URL("/\\evil.com", origin) stays same-origin in WHATWG-compliant browsers, so
// accepting it is safe. Asserted explicitly so the decision is recorded, not incidental.
const BACKSLASH_AFTER_SLASH = "/\\evil.com";

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

  it("accepts a leading slash followed by a backslash, because new URL keeps it same-origin", () => {
    // Decided, not assumed: index 0 is "/" and index 1 is not "/", and the WHATWG URL
    // parser resolves "/\evil.com" against the parent origin rather than treating the
    // backslash as a second slash. The parent's own origin check is the backstop.
    expect(isSafeRelativePath(BACKSLASH_AFTER_SLASH)).toBe(true);
    expect(new URL(BACKSLASH_AFTER_SLASH, "https://shop.example.com").origin).toBe(
      "https://shop.example.com"
    );
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

  it("returns the leading-slash-backslash path unchanged", () => {
    expect(toRelativePath(BACKSLASH_AFTER_SLASH)).toBe(BACKSLASH_AFTER_SLASH);
  });
});
