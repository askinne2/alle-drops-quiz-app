---
phase: 5
slug: preliminary-score-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
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
| 05-*-* | TBD | TBD | SCORE-01 | — | Static copy only; no PHI in new strings | DOM | `npx vitest run tests/quiz-results-scale-bar-dom.test.ts` | ❌ W0 | ⬜ pending |
| 05-*-* | TBD | TBD | SCORE-02 | — | Derived max from question set; no hardcoded ceiling in UI | unit | `npx vitest run app/lib/quiz/scoring.test.ts` | ✅ (extend) | ⬜ pending |
| 05-*-* | TBD | TBD | SCORE-03 | T-5-01 | No XSS sink; ARIA from numbers/static labels | DOM | `npx vitest run tests/quiz-results-scale-bar-dom.test.ts` | ❌ W0 | ⬜ pending |
| 05-*-* | TBD | TBD | (all) | — | Bundle markers present after rebuild | bundle | `npx vitest run tests/quiz-bundle-freshness.test.ts` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Planner fills concrete Task IDs when PLAN.md files are written.*

---

## Wave 0 Requirements

- [ ] `app/lib/quiz/score-scale.ts` — `getScoreScale()` module (new)
- [ ] Unit coverage for `getQuestionMaxScore` / `getMaxScore` / `getScoreScale` (new `describe` in `scoring.test.ts` or dedicated `score-scale.test.ts`)
- [ ] `tests/quiz-results-scale-bar-dom.test.ts` — first dedicated `ResultsDisplay` DOM test
- [ ] Phase 5 markers in `tests/quiz-bundle-freshness.test.ts` — written **after** measured rebuild counts (never predicted)

*Existing Vitest + jsdom + Testing Library infrastructure covers the framework; Wave 0 is new test files/modules, not framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scale-bar marker not clipped at score 0 / max | SCORE-03 | Overflow/`position` visual; jsdom does not fully compute layout | Open results at score 0 and at max; marker straddles rounded ends without half-moon clip |
| Zone seam contrast vs bar colours | SCORE-03 / WCAG 1.4.11 | Contrast is visual | Confirm opaque `--color-foreground` seams visible against each zone tone |
| Band explanations + disclaimer unchanged | SCORE-01 / D-09 | Clinical copy approval | Diff against pre-phase text; three h3/body blocks + disclaimer byte-identical aside from structural wrappers |
| No patient-facing "provisional" banner | D-04 | Product judgment | Confirm results page has no "these numbers aren't final" notice |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
