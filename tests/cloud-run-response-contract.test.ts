import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Pure source-text contract (no network, no imports of app code). Guarded files must not quote
 * the forbidden tokens even in comments, or these assertions trip on their own prose.
 */
const has = (path: string, needle: string) => readFileSync(path, "utf8").includes(needle);

describe("Cloud Run response contract", () => {
  it.each([
    "app/routes/api.me.assessment.$id.pdf.tsx",
    "app/routes/api.admin.assessment.$id.pdf.tsx",
  ])("%s sends no explicit Content-Length (chunked streaming)", (path) => {
    expect(has(path, "Content-Length")).toBe(false);
  });

  it("api.quiz.submit.tsx uses the trusted IP helper and not cf-connecting-ip", () => {
    const p = "app/routes/api.quiz.submit.tsx";
    expect(has(p, "cf-connecting-ip")).toBe(false);
    expect(has(p, "getTrustedClientIp(")).toBe(true);
  });
});
