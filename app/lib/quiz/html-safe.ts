/**
 * Safe embedding of server-side values into an inline `<script>` block.
 *
 * `JSON.stringify` is an encoder for JSON, not for HTML. It leaves `<`, `>` and `&` untouched,
 * so interpolating its output into an inline script lets any attacker-controlled value close the
 * script element and open a new one. Measured:
 *
 *   JSON.stringify("</script><script>alert(1)</script>")
 *     === '"</script><script>alert(1)</script>"'
 *
 * `app/routes/quiz-embed.tsx` builds `window.AlleDropsQuizConfig` from six `url.searchParams`
 * values on the page that collects the clinical intake, which made that a reflected XSS on a
 * PHI-bearing origin (code review finding CR-01). The HTML parser looks for the literal byte
 * sequence of a closing tag while scanning script content, so escaping `<` alone is sufficient to
 * stop the break-out; `>` and `&` are escaped as well so the output is inert in any surrounding
 * context rather than only this one.
 *
 * U+2028 and U+2029 are escaped because they are valid JSON but are line terminators in JavaScript
 * source, and would produce a syntax error that silently kills the whole inline script.
 *
 * The escapes are all `\uXXXX` forms, which are legal inside a JavaScript string literal and parse
 * back to the identical value — so this changes the bytes on the wire, never the runtime value.
 */

/*
 * The U+2028 and U+2029 patterns are spelled as `\u2028` / `\u2029` escapes rather than literal
 * characters on purpose. Those two ARE line terminators in JavaScript source, so writing them
 * literally inside a regex literal here yields `TS1161: Unterminated regular expression literal`
 * and fails typecheck — the same hazard this table neutralises for downstream output.
 */
const SCRIPT_UNSAFE: ReadonlyArray<readonly [RegExp, string]> = [
  [/</g, "\\u003c"],
  [/>/g, "\\u003e"],
  [/&/g, "\\u0026"],
  [/\u2028/g, "\\u2028"],
  [/\u2029/g, "\\u2029"],
];

/**
 * JSON-encode `value` for interpolation into an inline `<script>` block.
 *
 * Use this in place of `JSON.stringify` for every value that reaches inline script. The result is
 * already quoted where JSON would quote it, so interpolate it bare: `foo: ${jsonForScript(x)}`.
 */
export function jsonForScript(value: unknown): string {
  let out = JSON.stringify(value ?? null);
  // `JSON.stringify(undefined)` returns undefined rather than a string. `?? null` above covers the
  // direct case, but a value whose `toJSON` returns undefined can still reach here.
  if (typeof out !== "string") out = "null";
  for (const [pattern, replacement] of SCRIPT_UNSAFE) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
