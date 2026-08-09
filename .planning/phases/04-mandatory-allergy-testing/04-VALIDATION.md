---
phase: 4
slug: mandatory-allergy-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` §"Validation Architecture". The planner MUST close every Wave 0 gap
> below or the plans fail Dimension 8.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` — `environment: "node"` by default; DOM tests opt in per-file via `// @vitest-environment jsdom` (convention established by Phase 3's `tests/quiz-part-renderer-dom.test.ts`) |
| **Quick run command** | `npx vitest run tests/<file>.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Baseline at phase start** | **361 tests / 27 files**, typecheck clean, both builds clean |
| **Estimated runtime** | full suite ~15s |

⚠️ **`.test.ts`, never `.tsx`** — vitest's `include` glob does not match `.tsx`. DOM tests use
`React.createElement`, not JSX. This cost time in Phase 3; do not rediscover it.

---

## Sampling Rate

- **After every task commit:** the specific test file(s) that task touched — `npx vitest run <file>`
- **After every plan wave:** `npm test` (full suite) + `npm run typecheck`
- **Before `/gsd:verify-work`:** full suite green **AND** the human browser pass below
- **Max feedback latency:** ~15 seconds (full suite)

Additional per-wave gate unique to this repo: **any wave touching `app/components/quiz/` or
`app/lib/quiz/` must rebuild `public/quiz-bundle.js`** with `npm run build:theme` **in the same
commit**. `npm run build` does not touch it. `tests/quiz-bundle-freshness.test.ts` guards this; it
exists because the omission shipped an invisible phase in session 32.

---

## Per-Task Verification Map

Populated by the planner once plans exist. Requirement-level map from research:

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| TEST-01 | Exactly two testing-status options, no skip; required gate blocks Next | unit (`isAnswered`/`isPartComplete`) + DOM | `npx vitest run tests/quiz-schema-type-guarantees.test.ts tests/quiz-part-renderer-dom.test.ts` | ❌ W0 — needs `file_multi` / `radio_single` / `text_input_short` cases | ⬜ pending |
| TEST-02 | "I need allergy testing" → storefront testing-options page | DOM (anchor `href` assertion, `redirects.test.ts` pattern) | `npx vitest run tests/quiz-part-renderer-dom.test.ts` | ❌ W0 | ⬜ pending |
| TEST-03 | Year / Location / Allergens collected, persisted into `answers_json` | unit (schema) + integration (submit payload shape) | `npx vitest run tests/quiz-schema-type-guarantees.test.ts` | ❌ W0 | ⬜ pending |
| TEST-04 | Upload required on the `had_testing` branch; success/error states match UI-SPEC copy verbatim | DOM (file-list add/remove/error) + integration (size caps, magic-byte rejection, `pending/` staging) | `npx vitest run tests/quiz-file-upload-dom.test.ts tests/api-quiz-upload.test.ts` | ❌ W0 — **both new; no upload-endpoint test infra exists anywhere in this repo** | ⬜ pending |
| TEST-05 | `ResultsDisplay` terminal, zero callback props, both bypasses gone | source-text guard, **proven RED first** | `npx vitest run tests/quiz-testing-bypass-deletion.test.ts` | ❌ W0 | ⬜ pending |
| TEST-06 | No storefront surface offers or implies a no-testing path | **manual** — theme-repo content, authenticated served-bytes check | `curl` authenticated + cache-busted, counted with `split(needle).length - 1` | N/A — structurally unautomatable inside this repo's suite | ⬜ pending |
| TEST-07 | Consent reachable on every path; every submission records `consent_version` | source-text guard (auto-submit deletion) + integration | `npx vitest run tests/consent-version.test.ts` | ✅ exists — **extend, do not replace** | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **`tests/api-quiz-upload.test.ts`** — TEST-04's server contract: size-cap rejection
      (`MaxFileSizeExceededError` / `MaxTotalSizeExceededError`), **magic-byte rejection of a renamed
      or mistyped file** (never trust the client-supplied MIME), successful staging under `pending/`,
      and the returned token shape. Needs a GCS test strategy — either `STORAGE_EMULATOR_HOST`
      pointed at `fake-gcs-server`, or a direct mock. **The planner must pick one and be consistent;
      no precedent exists in this repo.**
- [ ] **`tests/quiz-file-upload-dom.test.ts`** — the file-list widget's add / remove / error-state
      rendering, and the Interaction Contract's rule that **only successfully-uploaded files satisfy
      the required gate** (a file mid-upload or in error must not enable Next).
- [ ] **`tests/quiz-testing-bypass-deletion.test.ts`** — source-text guard for D-09's
      `QuizContainer.tsx` deletions: the auto-submit `useEffect`, `autoSubmit0to2Attempted`,
      `handleScheduleConsult`, `handleTestFirst`, `handleProceedToPurchase`, `savedToServer`.
      **Proven RED against pre-change source before being trusted**, per Phase 3 convention.
- [ ] **`tests/submission-files.test.ts`** — insert + ownership-bounded retrieval for the new
      `submission_files` join table, mirroring `tests/assessments-ledger.test.ts`'s existing pattern.
      (No framework covers raw DDL directly; this covers the behavior the DDL enables.)
- [ ] Extend `tests/quiz-schema-type-guarantees.test.ts` with the three new `QuestionType` cases.
- [ ] Extend `tests/consent-version.test.ts` for the single-path consent flow.

**Counting rule, non-negotiable:** occurrence counts use `SOURCE.split(needle).length - 1`.
**Never `grep -c`** — it counts matching *lines*, so against a single-line 186KB bundle every count
collapses to 1 and every `>= 1` gate passes vacuously. Three separate executors and once the
orchestrator have hit this.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Storefront copy carries no no-testing path | TEST-06 | Content lives in the `allergist-on-demand` theme repo, not this one. No vitest test can reach it. | Authenticate past the storefront password **first** — unauthenticated requests 302 to `/password` and return **200 for the password page**, so every unauthenticated check passes vacuously. Then fetch both product pages and `/pages/test-options` with a cache-buster and assert the removed clauses count **0** via `split(needle).length - 1`. Re-fetch after any theme save: a single fetch is not evidence (the Klaviyo check showed 10 occurrences ~2 min before the save and 0 after). |
| Upload success/failure is legible on a real phone | TEST-04 | Whether a patient can tell their photo uploaded is a judgment call. A DOM test asserts the element exists; it cannot assert the state is *understandable*. | On a real mobile device at ≤375px: pick a photo, watch the row through uploading → uploaded. Confirm the status is readable without the color cue alone. |
| Wrong-type and oversized files produce UI-SPEC copy, not a browser error | TEST-04 | The failure mode is a native browser error surfacing instead of the specified string. | Attempt a `.txt` rename to `.pdf`, and a file over the per-file cap. Assert the exact UI-SPEC strings render, prefixed with `⚠`. |
| `testing_status` flip-flop after uploading behaves per the Interaction Contract | TEST-04 / D-03 | Cross-state interaction over time; the orphan consequence is invisible in the DOM. | Upload a file on `had_testing`, flip to `needs_testing`, flip back. Confirm the file list is intact (hidden-answer retention), then flip to `needs_testing` and submit — confirm the staged object is not linked. |
| Consent renders on the 0–2 path | TEST-07 | This path never showed consent before; it is new behavior for that bracket. | Complete the flow with a 0–2 scoring answer set. Confirm `ConsentStep` renders and the submit is gated on the checkbox. |
| `quiz-history` extension paints in a live customer account | — | Code correctness is verified (it calls `/api/me/*`); rendering in Shopify's customer-account surface is not. **10-minute check, not a refactor** — see the D-05 retraction in CONTEXT.md. | Log into a customer account with at least one submission and confirm the ledger lists it. |

⚠️ **Run the browser pass against local, not production.** A full run through to submit writes a PHI
row. `SHOPIFY_APP_URL=http://localhost:3000 npx react-router dev`, then
`http://localhost:3000/quiz-embed`. `npm run dev` will NOT work — it is `shopify app dev` and blocks
on an interactive store prompt. The page nests an iframe: query
`document.querySelector('iframe').contentDocument`, not the top document.

---

## ⚠️ Why a green suite is not the finish line on this phase

**Five defects have shipped past a fully green suite in this project. All five were caught by a human
clicking.**

| Session | Defect | Suite at the time |
|---|---|---|
| 32 | `public/quiz-bundle.js` never rebuilt — phase invisible on the storefront | 269 green |
| 32 | Container filtered info blocks out before the renderer saw them | 269 green |
| 33 | Exclusive option disabled every sibling; the switch was unreachable | 280 green |
| 33 | DIAG-01's examples duplicated HIST-01's checklist | 358 green |
| 33 | HIST-02's medications field required with no escape | 358 green |

The first three were **wiring** bugs — Phase 3's DOM test infra closed that shape. The last two were
**judgment** failures, and no structural test can catch them.

**D-02 puts a required file upload on the single highest-abandonment step in the flow.** That is
structurally defect 5 one step further along, with a materially worse cost: a patient who gets stuck
loses a fully-completed questionnaire, not one field. Nothing persists until the terminal POST and
resume is out of scope for v1.0.

The human browser pass is **not redundant** with the DOM tests. This phase has the strongest case for
it of any phase so far.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all ❌ MISSING references above
- [ ] No watch-mode flags in any command
- [ ] Feedback latency < 20s
- [ ] Theme bundle rebuilt in the same commit as any quiz source change
- [ ] Human browser pass completed and recorded
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
