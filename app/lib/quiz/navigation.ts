/**
 * Canonical spec for what the parent storefront page will accept as a navigation target.
 *
 * The quiz runs in a cross-origin iframe on the Fly origin, so it cannot navigate the
 * storefront directly — it posts a message and the parent page performs the navigation.
 * Everything in a `postMessage` payload is attacker-controlled, so the parent must validate
 * the path before resolving it. This module is that validation, expressed as pure string
 * logic with no imports and no side effects so it is fully testable under vitest's `node`
 * environment.
 *
 * The inline `safeUrl` function in `extensions/quiz-block/blocks/symptom-quiz.liquid` is a
 * hand-port of `isSafeRelativePath`. Liquid files are neither typechecked nor linted, so
 * `tests/liquid-block-contract.test.ts` guards the port's presence in that file. When the
 * rules below change, change the Liquid port in the same commit.
 *
 * The rules are deliberately positional rather than pattern-based: index 0 must be `/`,
 * which eliminates absolute URLs and every scheme (`javascript:`, `data:`, `mailto:`) as
 * well as ambiguous bare-relative paths, and index 1 must be neither `/` nor `\`, which
 * eliminates protocol-relative targets. No regex is used — regex allowlists over URLs have a
 * long tail of parser-confusion bypasses, and the browser's own URL parser is the authority
 * the browser will ultimately use.
 *
 * Positional rules carry one structural weakness, handled explicitly below: they assume the string
 * we inspect is the string the parser sees. `PARSER_STRIPPED_CHARS` is what makes that assumption
 * hold, which is why it is checked FIRST. Any rule added here must ask the same question — does the
 * parser normalise its input before this rule applies?
 *
 * The backslash rule is measured, not defensive. The WHATWG URL parser treats `\` as
 * equivalent to `/` for special schemes, so `/\evil.com` enters the same authority state as
 * `//evil.com`:
 *
 *   new URL("/\evil.com", "https://shop.example.com").origin === "https://evil.com"
 *
 * A backslash later in the path is harmless — it normalises to `/` and stays same-origin —
 * so the rule is scoped to index 1 only rather than banning the character outright. The
 * evidence for both halves lives in `navigation.test.ts`, and threat T-1-06 tracks it.
 */

/**
 * ASCII TAB, LF, and CR. The WHATWG URL parser REMOVES every occurrence of these three
 * characters from its input before it parses anything, so their presence means the string we
 * validated is not the string the browser resolves. That turns any positional rule below into a
 * bypass primitive: `"/\tevil.com"` is stripped to `"//evil.com"` and reaches a different origin
 * even though index 1 held a tab, not a slash.
 *
 * Measured on node v20.19.6 by sweeping every character from 0x00 to 0x20 in front of an
 * authority-shaped payload. Exactly these three bypassed the positional checks and resolved
 * cross-origin; no other control character did:
 *
 *   new URL("/\t/evil.com",  "https://alle-drops-quiz-app.fly.dev").origin === "https://evil.com"
 *   new URL("/\n\\evil.com", "https://alle-drops-quiz-app.fly.dev").origin === "https://evil.com"
 *   new URL("/\t\t/evil.com","https://alle-drops-quiz-app.fly.dev").origin === "https://evil.com"
 *
 * The rule is "anywhere in the string", not "at index 1", because stripping is global and several
 * deeper placements are directly exploitable. No legitimate quiz path contains a raw tab or
 * newline, so rejecting outright costs nothing.
 */
const PARSER_STRIPPED_CHARS = ["\t", "\n", "\r"] as const;

/** True when `p` is a path the parent may safely resolve against its own origin. */
export function isSafeRelativePath(p: unknown): p is string {
  if (typeof p !== "string") return false;
  if (p === "") return false;
  // MUST precede the positional checks: these characters shift every index below.
  for (const ch of PARSER_STRIPPED_CHARS) {
    if (p.includes(ch)) return false;
  }
  if (p.charAt(0) !== "/") return false;
  if (p.charAt(1) === "/") return false;
  if (p.charAt(1) === "\\") return false;
  return true;
}

/**
 * Normalise an anchor href or a code-supplied target to a safe relative path.
 *
 * Returns the value unchanged when it passes `isSafeRelativePath`, otherwise `null`.
 * Nothing in `app/lib/quiz/` throws; callers guard on the null instead.
 */
export function toRelativePath(hrefOrPath: unknown): string | null {
  return isSafeRelativePath(hrefOrPath) ? hrefOrPath : null;
}
