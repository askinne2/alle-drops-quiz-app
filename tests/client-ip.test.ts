import { describe, it, expect } from "vitest";
import { getTrustedClientIp } from "../app/lib/client-ip";

const h = (v: Record<string, string>) => new Headers(v);

describe("getTrustedClientIp", () => {
  it("returns the LAST x-forwarded-for entry", () => {
    expect(getTrustedClientIp(h({ "x-forwarded-for": "203.0.113.9, 198.51.100.4" }))).toBe(
      "198.51.100.4"
    );
  });
  it("handles a single entry and IPv6", () => {
    expect(getTrustedClientIp(h({ "x-forwarded-for": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(getTrustedClientIp(h({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
  it("returns null when absent or not an IP", () => {
    expect(getTrustedClientIp(h({}))).toBeNull();
    expect(getTrustedClientIp(h({ "x-forwarded-for": "not-an-ip" }))).toBeNull();
  });
  it("ignores trailing comma and whitespace", () => {
    expect(getTrustedClientIp(h({ "x-forwarded-for": "203.0.113.9,  198.51.100.4 , " }))).toBe(
      "198.51.100.4"
    );
  });
  it("does not trust cf-connecting-ip", () => {
    expect(getTrustedClientIp(h({ "cf-connecting-ip": "198.51.100.4" }))).toBeNull();
  });
});
