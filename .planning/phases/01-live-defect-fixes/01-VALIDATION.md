---
phase: 1
slug: live-defect-fixes
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-30
updated: 2026-07-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `01-RESEARCH.md` §"Validation Architecture" (line 1135). Task IDs are assigned by the planner — rows below are requirement-level until plans exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` 3.2.4 |
| **Config file** | `vitest.config.ts` — `environment: "node"`, `include: ["app/**/*.test.ts","tests/**/*.test.ts"]` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run typecheck && npm test` |
| **Estimated runtime** | ~1 second (baseline 519 ms) |

**Two hard constraints on test design:**
- **No DOM.** `jsdom`, `happy-dom`, and `@testing-library` are all absent. Anything requiring a document must be a file-contract test or a manual browser check.
- **`.test.ts` only.** `.test.tsx` files are not collected by the `include` globs.

**Baseline:** 51 passed / 10 files. Target after this phase: ~76, with no new dependency.

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green AND Gates A–F below must pass
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

Task IDs follow `{padded_phase}-{plan}-{task}`; tasks are positional within each plan's `<tasks>` block. 16 tasks across 6 plans.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01-01 | 1 | DEF-02 (`isSafeRelativePath` matrix) | T-1-01 | Rejects off-origin, protocol-relative, `javascript:` | unit | `npx vitest run app/lib/quiz/navigation.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01-01 | 1 | DEF-03 (corrected handles) | — | N/A | unit | `npx vitest run app/lib/quiz/product-links.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01-01 | 1 | DEF-03 (config wins, blank falls back) | — | N/A | unit | same | ❌ W0 | ⬜ pending |
| 01-01-03 | 01-01 | 1 | DEF-01 / DEF-02 / D-05 / D-12 contract scaffold | T-1-01 | Assertions must be non-vacuous | contract | **expects non-zero exit** — see Red-by-Design | ❌ W0 | ⬜ pending |
| 01-02-01 | 01-02 | 2 | DEF-02 (override removed) | T-1-01 | No unforgeable-property monkey-patch | contract | `npx vitest run tests/quiz-embed-contract.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 01-02 | 2 | DEF-02 (no resolve vs `location.href`) | T-1-02 | Child never asserts an origin | contract | same | ❌ W0 | ⬜ pending |
| 01-02-02 | 01-02 | 2 | DEF-02 (five exits → `navigateParent`) | T-1-01 | Relative path only, key renamed `url`→`path` | unit + manual | `npm run typecheck && npx vitest run --exclude "tests/liquid-block-contract.test.ts"` | ❌ W0 | ⬜ pending |
| 01-02-03 | 01-02 | 2 | DEF-04 (exact label) | — | N/A | unit | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts` | ✅ +1 test | ⬜ pending |
| 01-02-03 | 01-02 | 2 | DEF-04 / D-13 (still required) | — | N/A | unit | same | ✅ +1 test | ⬜ pending |
| 01-03-01 | 01-03 | 2 | DEF-01 (scroll listener) | — | N/A | contract | `npx vitest run tests/liquid-block-contract.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 01-03 | 2 | DEF-01 (D-06 instant + `scroll-margin-top`) | — | N/A | contract | same | ❌ W0 | ⬜ pending |
| 01-03-01 | 01-03 | 2 | D-05 (origin guard present) | T-1-01 | Only same-origin relative paths navigate | contract | same | ❌ W0 | ⬜ pending |
| 01-03-02 | 01-03 | 2 | DEF-03 / D-12 (pickers + `_embed_src` params) | — | N/A | contract | same, incl. `{% schema %}` JSON validity | ❌ W0 | ⬜ pending |
| 01-04-01 | 01-04 | 3 | all four (bundle rebuild) | — | N/A | integration | `npm run typecheck && npm test` — first unqualified full-green gate | ✅ | ⬜ pending |
| 01-04-02 | 01-04 | 3 | — (CLAUDE.md amend + findings record) | — | PHI compliance block preserved | contract | grep guards on `CLAUDE.md` | ✅ | ⬜ pending |
| 01-05-01..03 | 01-05 | 4 | all four (deploy + Gates A/B/C) | T-1-01 | Redirect closed in production | integration | Gates A, B, C on served bytes | n/a | ⬜ pending |
| 01-06-01 | 01-06 | 5 | DEF-02 criterion #2 (fifth defect) | — | N/A | **manual, theme editor** | Gate D | n/a | ⬜ pending |
| 01-06-02 | 01-06 | 5 | all four (behavioral) | T-1-01 | Origin guard proven load-bearing | **manual, browser** | Gates E + F | n/a | ⬜ pending |
| 01-06-03 | 01-06 | 5 | — (PHI cleanup) | — | Zero residual verification rows | integration | `STATE.md` `PHI-CLEANUP` counts line | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Red-by-Design Contract Tests

`tests/liquid-block-contract.test.ts` and `tests/quiz-embed-contract.test.ts` assert the **fixed** state, so they must fail while the code is still broken.

- **Task 01-01-03 requires a non-zero exit.** A pass there means the assertions are vacuous.
- **Through Waves 1–2, the green gate is the `--exclude` form**, never plain `npm test`. Plan 01-02 excludes `tests/liquid-block-contract.test.ts` (Plan 01-03's target); Plan 01-03 excludes `tests/quiz-embed-contract.test.ts` (Plan 01-02's target). This preserves wave-2 parallelism — the two plans have zero `files_modified` overlap.
- **Plan 01-04 (wave 3) owns the first unqualified full-green gate.** Do not add one earlier: an executor told to make `npm test` green during wave 2 would weaken the DEF-01 scroll, `e.origin`, and `scroll-margin-top` assertions to comply.
- Every plan carries a grep-gate hygiene rule forbidding comments that quote removed tokens — otherwise the absence assertions silently self-invalidate.

---

## Wave 0 Requirements

- [ ] `app/lib/quiz/navigation.ts` — extract `isSafeRelativePath` as a pure, testable function (the canonical validator for D-05)
- [ ] `app/lib/quiz/navigation.test.ts` — 18-case accept/reject matrix
- [ ] `tests/liquid-block-contract.test.ts` — reads `extensions/quiz-block/blocks/symptom-quiz.liquid` as text and asserts: `quiz:scrollToTop` handled, `scrollIntoView` present, scroll is NOT smooth, `e.origin` guard present, no unvalidated `location.assign(e.data.…)`, both product pickers in schema, both handle params in `_embed_str`, and `{% schema %}` parses as valid JSON
- [ ] `tests/quiz-embed-contract.test.ts` — reads `app/routes/quiz-embed.tsx` as text and asserts the `window.location.assign` override is gone and the interceptor no longer resolves against `window.location.href`
- [ ] `app/lib/quiz/product-links.test.ts` — corrected handles, plus config-over-map precedence once `getProductHandle` is extracted

No framework install needed — existing `vitest` covers everything.

---

## Manual-Only Verifications

Use the **decomposed console protocol**, not a literal five-exit click-through. Rationale: `handleScheduleConsult` / `handleTestFirst` submit before navigating, and the `0-2` bracket auto-submits on reaching `outcome` — a literal click-through writes **~4 PHI rows** to production Cloud SQL. The decomposed route costs 1–2 rows and tests the guards more directly.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Page scrolls to iframe top on step change | DEF-01 | No DOM in vitest; real layout required | DevTools → switch console execution context to the quiz iframe → synthetic `postMessage({type:'quiz:scrollToTop'})` → observe parent scroll |
| Parent navigates storefront, not iframe | DEF-02 | Cross-origin frame behavior | Same context switch → post a `quiz:navigate` with a relative path → confirm top-window URL changes to the shop origin |
| All five exits post a relative path | DEF-02 | Requires real user flow | Parent-console message logger, then exercise each exit. **Fresh page load per exit** — `generateSymptomProfileId()` is `AOD_${Date.now()}`, set once per session against a `NOT NULL UNIQUE` column |
| Off-origin / protocol-relative / `javascript:` senders rejected | D-05 | `e.origin` cannot be forged from outside | Console protocol reject cases from a non-iframe context |
| `testOptions` setting points at `/pages/test-options` | DEF-02 | Merchant config, not code | Gate D below. **Currently misconfigured** — see Known Blocker |
| Scroll clears the sticky header | DEF-01 / D-06 | Visual outcome | Sense 15.4.1 renders `<sticky-header data-sticky-type="on-scroll-up">` with no `--header-height` var, so `block:'start'` lands the iframe under the revealed header. Needs `scroll-margin-top` in the block's `{%- style -%}`, and `behavior:'instant'` set explicitly (CSS `scroll-behavior: smooth` would otherwise override D-06) |

**PHI hygiene:** include a cleanup `DELETE` for any rows written during verification, and clear the three-session-old `diag+preflight@example.com` row in the same pass.

---

## Deploy-Artifact Provenance Gates

**Non-negotiable. Every gate asserts on served bytes, never on a deploy exit code.** This section exists because `fly deploy` succeeded, `/health` returned 200, and headers matched while the app served a stale artifact (`HANDOFF.md:124,137`).

Three delivery channels, three freshness profiles:

| Channel | Route | Cache | Verification |
|---------|-------|-------|--------------|
| Fly HTML | `/quiz-embed` | `no-store` | Immediate — Gate A |
| Fly bundle | `/quiz-bundle-js` | `max-age=300`, **no ETag, no Last-Modified** | Content assertion only — Gate B |
| Shopify extension | theme app block | separate `shopify app deploy` | Gate C |

- **Gate A** — `/quiz-embed` HTML: `window.location.assign = function` → 0 (today 1); `new URL(href, window.location.href)` → 0 (today 1); `tnProductHandle` → ≥1
- **Gate B** — `/quiz-bundle-js`: byte count ≠ 183691; `tennessee-alledrops` → ≥1 (today 0); `tennessee-allerdrops` → 0 (today 1); `and dosages (required)` → 0 (today 1); `quiz:scrollToTop` → ≥1
- **Gate C** — rendered quiz page (behind storefront password `allergy`): `quiz:scrollToTop` → ≥1 (today 0); `e.origin` → ≥1 (today 0); `scrollIntoView` → ≥1 (today 0). Plus `npx shopify app versions list --json` shows a new version
- **Gate D** — merchant config in `_embed_src`: `testOptions=%2Fpages%2Ftest-options`, `tnProduct=tennessee-alledrops`, `txProduct=texas-alledrops`, `test=0`. **Human-owned (theme editor).** Gates DEF-02 criterion #2 only — not DEF-03
- **Gate E** — live product pages: both corrected handles return 200 with the password cookie. Already passing
- **Gate F** — full suite green: `npm run typecheck && npm test`

**Hash signal, not a gate:** `curl -s .../quiz-bundle-js | shasum -a 256` vs local `public/quiz-bundle.js`. A mismatch is **inconclusive** (Docker builds under `node:20-alpine`, possibly not byte-identical to a local build). A **match to the pre-deploy hash is failure** — that is the stale-artifact signature.

Exact commands live in `01-RESEARCH.md` §"Deploy-Artifact Provenance Gates".

**Re-run Gates B–E immediately before any success claim.** Every live-state baseline above is mutable by a single theme-editor edit.

---

## Known Blocker — human-owned

**The live `test_options_redirect_url` is misconfigured.** The installed app block passes `testOptions=%2Fproducts%2Fallergy-consultation` — the same value as `consult`. `/pages/test-options` exists and returns 200, but `QuizContainer.tsx:228/:248` only fall back to it when the setting is **blank**, and it is not. ROADMAP success criterion #2 will fail with a perfect code fix until this one field is corrected in the theme editor.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 16/16
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — all five files created by Plan 01-01
- [x] No watch-mode flags
- [x] Feedback latency < 5s — baseline 519 ms
- [ ] Gates A–F all pass against served bytes — *execution-time, waves 4–5*
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-30 (plan-checker verified; Dimension 8 satisfied)

Gates A–F remain unchecked deliberately: they assert on deployed bytes and cannot pass until Plan 01-05 (wave 4) and Plan 01-06 (wave 5) run. `wave_0_complete` stays `false` until Plan 01-01 lands.
