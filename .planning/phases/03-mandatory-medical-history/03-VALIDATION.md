---
phase: 3
slug: mandatory-medical-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `03-RESEARCH.md` § "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (repo root) — `environment: "node"`, `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~1 second (282 tests / 23 files at phase start) |

**No quick/full split.** At ~1s for the whole suite there is no reason to run a subset — every task
runs the full suite. `scripts/e2e-test.ts` is a standalone script run manually against a live
deploy and is **not** part of `npm test`.

**Build commands are separate and both matter:**
- `npm run build` — react-router build. Does **not** touch the theme bundle.
- `npm run build:theme` — the separate vite config that produces `public/quiz-bundle.js`, a
  committed artifact. **Any quiz-source change requires this in the same commit.**
  `tests/quiz-bundle-freshness.test.ts` guards it. Omitting it shipped a dead phase in session 32.

---

## Sampling Rate

- **After every task commit:** `npm test`
- **After every plan wave:** `npm run typecheck && npm test && npm run build`, plus
  `npm run build:theme` if any quiz-source file changed in the wave
- **Before `/gsd:verify-work`:** full suite green, typecheck clean, both builds current
- **Max feedback latency:** ~5 seconds (typecheck dominates; the suite itself is ~1s)

**Phase gate additionally requires**, and neither is substitutable by a green suite:
1. The **manual browser check** for the HIST-04 info block — first production `InfoBlockCard` render.
2. The migration's **before/after `COUNT(*)`** recorded in the evidence trail. "Migration ran, exit
   code 0" is not evidence. This is the same lesson as Phases 1–2: assert on served bytes and query
   results, never on exit codes.

---

## Per-Task Verification Map

| Req ID | Behavior | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| HIST-01 | 11 comorbidity options present; "none of the above" is `exclusive: true`; `[]` blocks Next | — | N/A | unit | `npm test` (new assertions on the new question array) | ❌ W0 | ⬜ pending |
| HIST-01 | Clicking a real comorbidity while "none" is selected switches in one click — no disabled siblings | — | N/A | unit + source guard | `npm test` (`tests/quiz-part-renderer-exclusive-clickable.test.ts` + `toggleOption` cases) | ✅ existing mechanism, extend fixture data | ⬜ pending |
| HIST-02 | Any comorbidity selection **including "none of the above"** reveals the medications field | — | N/A | unit | `npm test` (`evaluateShowIf` / `isAnswered` against `history_comorbidities`) | ❌ W0 (new case, existing file) | ⬜ pending |
| HIST-03 | All three free-text fields block Next until answered or their "none" gate is answered | — | N/A | unit | `npm test` (`isPartComplete` extended with the six new items) | ❌ W0 | ⬜ pending |
| HIST-04 | "no" PCP → info block renders; "yes" → two required text fields | — | N/A | unit | `npm test` (`evaluateShowIf` both branches) | ❌ W0 | ⬜ pending |
| HIST-04 | Info block actually **paints** in a real browser | — | N/A | **manual/browser** | none — see Manual-Only Verifications | N/A | ⬜ pending |
| HIST-05 | 100% of patients including 0–2 reach medical history before the outcome | — | N/A | unit + source guard | `npm test` (no early-exit path to `"outcome"` skips index 5) | ❌ W0 | ⬜ pending |
| HIST-05 | `"medical_history"` FlowStep and all D-11/D-12 dead sites are gone | — | N/A | source-text guard | `npm test` (new file, `SOURCE.split(needle).length - 1 === 0` per needle) | ❌ W0 (new file) | ⬜ pending |
| HIST-05 | Answers land in `answers_json`; **no** top-level `personal_history` / `family_history` in the payload | T-3-01 | Payload carries no legacy PHI field; new answers ride the existing generic `answers` object | unit | `npm test` (`buildPayload` / `visibleAnswers` assertions) | ❌ W0 | ⬜ pending |
| HIST-05 | PDF and admin modal render medical-history answers via the D-05 label map | — | N/A | unit | `npm test` (fixtures in `tests/pdf.test.ts` + admin detail test) | ❌ W0 (existing files, new fixtures) | ⬜ pending |
| DIAG-01 | Diagnosis question present, adjacent to Part 5, required by default | — | N/A | unit | `npm test` | ❌ W0 | ⬜ pending |
| SC-5 | Score parity — same answers with and without medical history produce identical score **and** bracket | — | N/A | unit | `npm test` (pinned `calculateTotalScore(ALL_SCORED_QUESTIONS, …)` test) | ❌ W0 | ⬜ pending |
| D-01 | Columns dropped; row count matches before/after; backup ID recorded | T-3-02 | `COUNT(*)`-only queries; no PHI column selected | **manual/ops** | not automatable via vitest — see Manual-Only Verifications | N/A | ⬜ pending |
| standing | `public/quiz-bundle.js` rebuilt after any quiz-source change | — | N/A | existing regression test | `npm test` (`tests/quiz-bundle-freshness.test.ts`) | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New assertions in `app/lib/quiz/schema.test.ts` (or a new `questions.test.ts`) covering the
      three HIST-03 gate+reveal pairs, HIST-02's `isAnswered` reveal, and HIST-04's two branches —
      REQ-HIST-01/02/03/04
- [ ] New source-text guard file, following `tests/quiz-container-no-question-filter.test.ts`,
      proving `"medical_history"` and every D-11/D-12 handler name is absent from
      `QuizContainer.tsx` and `ResultsDisplay.tsx` — REQ-HIST-05
- [ ] New pinned score-parity test wherever `calculateTotalScore` is currently tested — SC-5
- [ ] Extended fixtures in `tests/pdf.test.ts` and the admin submission-detail test for the D-05
      label map — the "no new plumbing" half of REQ-HIST-05
- [ ] **No test-framework install required.** vitest is already configured and sufficient for every
      item above except the HIST-04 browser check, which is manual regardless. A DOM-test-infra
      decision is still owed (see below) but is not a Wave 0 blocker.

**Every guard must be proven RED before it is trusted.** Run each new assertion against the
pre-change source and record the failing count. A guard that has never failed has verified nothing —
this project has shipped three defects past a green suite.

**Count occurrences with `SOURCE.split(needle).length - 1`. Never `grep -c`** — it counts LINES, so
against a long or minified line every count collapses to 1 and the gate passes vacuously. Four
separate agents on this project have hit this exact trap.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HIST-04 info block paints correctly | HIST-04 | First production render of `InfoBlockCard`. No DOM test infra exists — session 32 shipped a defect where info blocks were filtered out before reaching the renderer and every test passed. A source-text guard cannot prove pixels. | `SHOPIFY_APP_URL=http://localhost:3000 npx react-router dev`, open `http://localhost:3000/quiz-embed`, TN → patient info → advance to medical history → answer "no" to PCP. Confirm the recommendation renders, is visually distinct from a question card, and collects no answer. The page nests an iframe — query `document.querySelector('iframe').contentDocument`, not the top document. |
| Full six-part click-through | HIST-05 | Flow change spanning six parts and two deleted code paths. Only a human pass proves the 0–2 auto-submit still fires at the right moment. | Run all 8 checks from the session-33 UAT script in `HANDOFF.md`, extended to the new part. Local only — a completed run writes a PHI row. |
| Column drop verified | D-01 | Ops step against Cloud SQL. Not reachable from vitest, and this machine's IP is not on the authorized-networks list. | Record backup ID from `gcloud sql backups create` (**requires `gcloud auth login` — not autonomous**). Then via `fly ssh console` + a `pg` script: `SELECT COUNT(*) FROM submissions` before and after, plus a column-existence check. **`COUNT(*)` and column names only — never select a PHI column** (`CLAUDE.md` rule 5/6). |

---

## Security Domain

> `workflow.security_enforcement` is absent from `.planning/config.json` — treated as **enabled**.
> ASVS Level 1, block on `high`.

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V2 Authentication | No — no new authenticated routes | — |
| V3 Session Management | No | — |
| V4 Access Control | No new routes. Existing ownership-bounded helpers (`getSubmissionByIdForCustomer`, admin session auth) are unchanged. | Verify no new PDF or admin path bypasses the existing pattern |
| V5 Input Validation | Yes — `quiz-validation.ts` **loses** two fields and gains no new server-side surface. All new answers ride the existing generic `answers` object, already validated as an object. | Existing `validateQuizData`. No new validation code per D-02. |
| V6 Cryptography | No | — |
| V7 Error Handling / Logging | **Yes — directly relevant.** Migration verification output and any new console output must be `COUNT(*)`-only. | Never log `answers`, the dropped columns, or any HIST-01…04 value. IDs and counts only, matching the existing `console.log("[submit] OK", { submissionId })` pattern. |
| V13 API / Data | **Yes — the migration.** Column removal on a table holding PHI. | Backup before drop (D-01), own reviewed commit, `alledrops_quiz_dev` only |

### Threat refs

- **T-3-01 — Orphan PHI in the payload.** Removing the top-level fields must not leave a path that
  still sends them. Mitigation: assertion that the constructed payload has no
  `personal_history` / `family_history` key.
- **T-3-02 — Irreversible PHI loss from the column drop.** Mitigation: named on-demand backup with
  its ID recorded before the DDL runs; migration isolated in its own commit; dev database only.

---

## Validation Sign-Off

- [ ] All tasks have an automated verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all ❌ MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] Every new guard proven RED against pre-change source, with the failing count recorded
- [ ] Both manual verifications completed and recorded
- [ ] Backup ID recorded before any DDL
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
