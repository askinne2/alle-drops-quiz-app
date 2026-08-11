---
phase: 5
slug: preliminary-score-page
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-11
updated: 2026-08-11
plans: 6
waves: 4
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (glob: `app/**/*.test.ts`, `tests/**/*.test.ts` — `.tsx` excluded) |
| **Quick run command** | `npx vitest run app/lib/quiz/scoring.test.ts tests/quiz-results-scale-bar-dom.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–60 seconds (full suite); ~5s quick |

---

## Sampling Rate

- **After every task commit:** Run the quick run command scoped to files touched
- **After every plan wave:** Run `npm test` + `npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite green, typecheck clean, theme-bundle builds byte-identical
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 05-01 | 1 | SCORE-02 | T-5-01 | RED proof before implementation; no hardcoded ceiling in the expectation | unit | `npx vitest run app/lib/quiz/scoring.test.ts` | ✅ (extend) | ✅ green |
| 05-01-T2 | 05-01 | 1 | SCORE-02 | T-5-01, T-5-04 | `getQuestionMaxScore` handles every `QuestionType`; unscored types contribute 0, not `NaN`; no `console.*` | unit | `npx vitest run app/lib/quiz/scoring.test.ts` | ✅ (extend) | ✅ green |
| 05-01-T3 | 05-01 | 1 | SCORE-03 | T-5-02, T-5-03 | `max` assigned from `getMaxScore(`, never a literal; provisional status identifiable in source (D-04) | unit | `npx vitest run app/lib/quiz/score-scale.test.ts` | ✅ | ✅ green |
| 05-02-T1 | 05-02 | 1 | SCORE-01 | T-5-07 | Seven legacy severity classes deleted; the two out-of-scope orphans deliberately retained | static | `node -e` occurrence assertion on `app/styles/quiz.module.css` (in-plan) + `npm test` | ✅ | ✅ green |
| 05-02-T2 | 05-02 | 1 | SCORE-03 | T-5-08, T-5-09 | Tone selected by `data-tone`, not by an interpolated class name; track must not clip | static | `node -e` selector assertion on `app/styles/quiz.module.css` (in-plan) + `npm test` | ✅ | ✅ green |
| 05-03-T1 | 05-03 | 2 | SCORE-01, SCORE-02, SCORE-03 | T-5-12, T-5-13, T-5-14, T-5-16 | No new prop or callback (TEST-05); `scoreBracket` absent from the bar subtree; no XSS sink; bracket absent from the accessible name | static + DOM | `node -e` source assertion (in-plan) + `npm run typecheck` | ✅ | ✅ green |
| 05-03-T2 | 05-03 | 2 | SCORE-01 | T-5-15 | Three band explanations + disclaimer copy-frozen (D-09); no `console.*` added | static | `node -e` copy assertion (in-plan) + `npm run typecheck` | ✅ | ✅ green |
| 05-03-T3 | 05-03 | 2 | SCORE-01 | T-5-17 | Coupled assertions repointed, not deleted — positive controls preserved | unit | `npx vitest run tests/quiz-testing-bypass-deletion.test.ts tests/quiz-resume-write-gate.test.ts tests/quiz-resume-payload-parity.test.ts` | ✅ (extend) | ✅ green |
| 05-04-T1 | 05-04 | 3 | SCORE-01, SCORE-02, SCORE-03 | T-5-19, T-5-21, T-5-22 | Three mutation-proven guards; synthetic fixtures only; ceiling read from config | DOM | `npx vitest run tests/quiz-results-scale-bar-dom.test.ts` | ✅ | ✅ green |
| 05-04-T2 | 05-04 | 3 | SCORE-01 | T-5-20 | D-10 no-approval-promise guard, proven non-vacuous | static | `npx vitest run tests/quiz-testing-bypass-deletion.test.ts` | ✅ (extend) | ✅ green |
| 05-05-T1 | 05-05 | 3 | (all) | T-5-25, T-5-27, T-5-28 | Deterministic rebuild verified across two runs; no secret or PHI in the public artifact | bundle | `npm run build:theme` (twice, SHA-256 compared) | ✅ | ⬜ pending |
| 05-05-T2 | 05-05 | 3 | (all) | T-5-26, T-5-29 | Every marker measured 0-before / ≥1-after; `provisional` zero-marker (D-04) | bundle | `npx vitest run tests/quiz-bundle-freshness.test.ts` | ✅ (extend) | ⬜ pending |
| 05-06-T1 | 05-06 | 4 | (all) | T-5-31 | No bypass reintroduced to reach an arbitrary score; clean working tree | manual + static | `npx vitest run tests/quiz-testing-bypass-deletion.test.ts` | ✅ | ⬜ pending |
| 05-06-T2 | 05-06 | 4 | SCORE-01, SCORE-03 | T-5-33, T-5-34 | Greyscale + 375px human pass; no PHI in captures; no deploy | manual | none — blocking checkpoint | n/a | ⬜ pending |
| 05-06-T3 | 05-06 | 4 | (all) | T-5-32, T-5-35 | Requirement rows closed only after the human pass; D-04 audit trail preserved | docs | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are `{plan}-T{n}`, matching task order within each PLAN.md. `❌ W0` means the test file does
not exist yet and is created by the Wave 0 work listed below. Plan 05-04 Task 2 flips the rows it has
measured; plan 05-06 Task 3 closes the remainder.*

---

## Wave 0 Requirements

- [ ] `app/lib/quiz/score-scale.ts` — `getScoreScale()` module (new) — **plan 05-01, Task 3**
- [ ] Unit coverage for `getQuestionMaxScore` / `getMaxScore` (new `describe` blocks in `scoring.test.ts`) and for `getScoreScale` (dedicated `app/lib/quiz/score-scale.test.ts`) — **plan 05-01, Tasks 1 and 3**
- [ ] `tests/quiz-results-scale-bar-dom.test.ts` — first dedicated `ResultsDisplay` DOM test — **plan 05-04, Task 1**
- [ ] Phase 5 markers in `tests/quiz-bundle-freshness.test.ts` — written **after** measured rebuild counts (never predicted) — **plan 05-05, Task 2**

Set `wave_0_complete: true` in this file's frontmatter once all four exist (plan 05-04, Task 2).

*Existing Vitest + jsdom + Testing Library infrastructure covers the framework; Wave 0 is new test files/modules, not framework install.*

---

## Manual-Only Verifications

All manual rows are owned by plan **05-06** (wave 4, blocking checkpoint). Record the *observation*, not
the word "verified" — this table is read during HIPAA readiness review.

| Behavior | Requirement | Owner | Why Manual | Test Instructions | Observed |
|----------|-------------|-------|------------|-------------------|----------|
| Scale-bar marker not clipped at score 0 / max | SCORE-03 | 05-06-T2 | Overflow/`position` visual; jsdom computes no layout | Open results at score 0 and at 60; marker straddles the rounded ends without a half-moon clip | ⬜ pending |
| Bands distinguishable in greyscale | SCORE-03 / WCAG 1.4.1 | 05-06-T2 | Colour-independence cannot be asserted in jsdom | Greyscale capture at both widths; three regions distinguishable and the current one locatable via the bolded label | ⬜ pending |
| Zone seam contrast vs bar colours | SCORE-03 / WCAG 1.4.11 | 05-06-T2 | Contrast is visual | Confirm opaque `--color-foreground` seams visible against each zone tone | ⬜ pending |
| Legend labels do not collide at 375px | SCORE-03 | 05-06-T2 | Text metrics and wrapping are layout-dependent | 375px capture; Low / Moderate / High sit under their own segments without wrapping or overlap | ⬜ pending |
| Score 7 with bracket `7+` reads low-tone, not severe | SCORE-03 / D-05 | 05-06-T2 | Clinical-honesty judgement, not a boolean | Confirm the bar is in the low band while the SLIT recommendation shows; blocker if it reads red | ⬜ pending |
| Band explanations + disclaimer unchanged | SCORE-01 / D-09 | 05-06-T2 | Clinical copy approval | Diff against pre-phase text; three h3/body blocks + disclaimer byte-identical aside from structural wrappers | ⬜ pending |
| No copy promises purchase on approval | SCORE-01 / D-10 | 05-06-T2 | Compliance judgement (backed by 05-04-T2's needle guard) | Read the subtitle and all three band messages aloud | ⬜ pending |
| No patient-facing "provisional" banner | D-04 | 05-06-T2 | Product judgment (backed by 05-05-T2's bundle zero-marker) | Confirm the results page has no "these numbers aren't final" notice | ⬜ pending |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 14 of 15 tasks carry an `<automated>` command; the sole exception is 05-06-T2, a blocking human checkpoint whose whole purpose is the judgement no command can make
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — every task in waves 1–3 ends in a runnable command
- [x] Wave 0 covers all MISSING references — the four items above are owned by named tasks in plans 05-01, 05-04, and 05-05
- [x] No watch-mode flags — every command is `vitest run`, `npm test`, `npm run typecheck`, or `node -e`
- [x] Feedback latency < 60s — quick runs ~5s, full suite ~30–60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-08-11 — 6 plans, 15 tasks, 4 waves. Reverify after execution and set
`wave_0_complete: true`.
