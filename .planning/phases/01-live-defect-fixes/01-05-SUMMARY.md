---
phase: 01-live-defect-fixes
plan: 05
completed: 2026-07-30
status: complete
executed_by: orchestrator-inline
requirements: [DEF-01, DEF-02, DEF-03, DEF-04]
key-files:
  created: []
  modified:
    - extensions/quiz-block/blocks/symptom-quiz.liquid
    - tests/liquid-block-contract.test.ts
---

## Self-Check: PASSED

## What shipped

Three-channel deploy, executed inline by the orchestrator rather than a subagent because both tasks
are `checkpoint` type and required live production writes plus interactive auth.

| Channel | Result |
|---------|--------|
| GitHub | PR #16 merged to `main` (`a0d8ce0`), then `73b2920` pushed for the D-10 fix |
| Fly | `v46` released, app `alle-drops-quiz-app` |
| Shopify extensions | app version `alledrops-quiz-production-21` released to users |

## Gates — all asserted on served bytes, never on exit codes

**Gate A — `/quiz-embed`: PASS.** No `location.assign` reassignment, no href resolved against the
iframe origin, payload keyed on `path`, both handles injected, control-char guard present in the
anchor interceptor, exactly 2 script opens and 2 closes, nonce on both script tags. Served CSP:
`frame-ancestors *; script-src 'self' 'nonce-…'; object-src 'none'; base-uri 'none'`.

**Gate B — `/quiz-bundle-js`: PASS.** 183691 → 184428 bytes. `tennessee-alledrops` 1, misspelled
any-form 0, `and dosages (required)` 0, `/pages/consult` 0, `quiz:scrollToTop` 2. The CR-02
control-char guard is present in the minified served bytes and runs before the positional checks.

**Gate C — rendered `/pages/allergy-quiz`: PASS.** `quiz:scrollToTop` 1, `e.origin` 1,
`scrollIntoView` 1, `safeUrl` port present, TAB/LF/CR each rejected, backslash-at-index-1 rejected,
`scroll-margin-top` offset present, and both handles now flow through the embed src
(`tnProduct=tennessee-alledrops&txProduct=texas-alledrops`). Control-char check verified to sit at
byte offset 88767, ahead of the positional check at 88920 — ordering confirmed, not assumed.

**CR-01 verified by live exploitation attempt.** A break-out payload was sent to production via
`?tnProduct`. It reached the response and came back fully escaped:
`tnProductHandle: "</script><script>alert(1)</script>"`. Zero raw
angle brackets from the payload, script element count unchanged at 2. Checked for vacuity: the
payload provably reached the response, so the pass is real.

## Deviations

**1. D-10 was not implementable as specified — Shopify rejected the first app version.**

```
bundle: [blocks/symptom-quiz.liquid] Invalid tag 'schema':
  settings: exceeds limit of 1 for type 'product'
```

A theme app extension block may declare at most ONE `"type": "product"` setting; D-10 specified two.
No deploy of Plan 01-03's output could ever have succeeded. Converted both to `"type": "text"`
holding the product handle, which is what the Liquid already consumed (it read `.handle` off the
product object). Committed as `73b2920`.

This is a net improvement: text settings have no per-block count limit, and unlike `product` they
CAN declare a `default` — which **restores the D-11 clause** ("corrected values also become the
schema defaults") that Plan 01-03 had to record as not implementable. Nothing was lost, because
`product` settings cannot be defaulted so both pickers shipped blank, and the live block settings in
the theme's `page.quiz.json` contained neither key.

Consequence: `app/lib/quiz/product-links.ts`'s fallback map is now a genuine safety net rather than
the live path every patient hits.

**2. Gate D was closed out-of-band before this plan ran.** `test_options_redirect_url` was corrected
in the Shopify theme editor by Andrew and verified on served bytes.

**3. Two orchestrator test-harness errors, both self-inflicted and both corrected.** An
`expect(html).not.toContain('evil.example')` assertion was wrong — the payload text legitimately
appears as inert escaped data — and a Gate C shell-quoting error produced a false FAIL on the
control-char guard. Both were re-run correctly; no production code was changed to satisfy either.

## Not closed by this plan

- **Klaviyo remains live on `/pages/allergy-quiz`, 4 occurrences.** Phase 1 adds zero scripts, so
  nothing here can close it. Phase 8 / LAUNCH-01.
- The live clinical intake page still carries no medical disclaimer.
- 14 code-review warnings remain open.
