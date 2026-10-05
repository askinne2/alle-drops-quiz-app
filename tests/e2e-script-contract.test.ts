/**
 * Source contract over scripts/e2e-test.ts (LAUNCH-04 evidence script for Cloud Run).
 * The script itself hits live services and is never run in CI; this guards its shape.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "../scripts/e2e-test.ts"), "utf8");

describe("scripts/e2e-test.ts contract", () => {
  it("has no Fly default or reference", () => {
    expect(src).not.toContain("fly.dev");
  });

  it("requires BASE_URL explicitly", () => {
    expect(src).toContain("console.error('ERROR: BASE_URL is not set')");
    expect(src).not.toMatch(/process\.env\.BASE_URL\s*\?\?/);
  });

  it("deletes children before submissions", () => {
    const files = src.indexOf("DELETE FROM submission_files");
    const log = src.indexOf("DELETE FROM submission_access_log");
    const subs = src.indexOf("DELETE FROM submissions");
    expect(files).toBeGreaterThan(-1);
    expect(log).toBeGreaterThan(-1);
    expect(subs).toBeGreaterThan(-1);
    expect(files).toBeLessThan(subs);
    expect(log).toBeLessThan(subs);
  });

  it("asserts zero rows remain after cleanup", () => {
    expect(src).toContain("SELECT count(*)");
  });

  it("covers upload, signed-URL round trip and forged XFF", () => {
    expect(src).toContain("as=json");
    expect(src).toContain("/api/quiz/upload");
    expect(src.toLowerCase()).toContain("x-forwarded-for");
  });

  it("checks PDF responses carry no Content-Length", () => {
    expect(src).toContain("content-length");
  });
});
