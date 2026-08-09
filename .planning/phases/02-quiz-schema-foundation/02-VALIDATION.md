---
phase: 2
slug: quiz-schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (verified against `package.json`) |
| **Config file** | `vitest.config.ts` — `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]` |
| **Quick run command** | `npx vitest run app/lib/quiz/schema.test.ts app/components/quiz/QuizPartRenderer.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | Quick: ~2s · Full: ~10s (173 tests / 17 files baseline) |

---

## Sampling Rate

- **After every task commit:** Run the quick command (schema module + renderer only)
- **After every plan wave:** Run `npm run typecheck && npm test` — full suite must stay green
- **Before `/gsd:verify-work`:** Full suite green, typecheck clean, AND the non-vacuous literal
  proof re-run one final time
- **Max feedback latency:** ~2 seconds (quick), ~15 seconds (full + typecheck)

**Standing rule for this phase:** the suite must NET-ADD tests. Never remove, skip, or weaken an
existing assertion. The 12 assertions in `QuizPartRenderer.test.ts` must remain byte-identical and
passing throughout — per CONTEXT.md, needing to edit that file is itself evidence the refactor
changed behavior it should not have.

---

## Per-Task Verification Map

Task IDs are assigned during planning. Requirement-level rows below are fixed; the planner MUST
map each to a concrete task ID and the executor MUST fill Status.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | SCH-02 | — | N/A | static-as-test | `npx vitest run -t "no question-ID or 'none'-value literals"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 | — | N/A | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "required"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 | — | N/A | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "equals"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 | — | N/A | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "isAnswered"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 | — | N/A | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "includes"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 (D-04) | — | Unresolved ref renders the question — never silently omits a clinical question | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "reference integrity"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 (D-04) | — | Fail-OPEN at runtime | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "fails open"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 (D-03) | — | Unseen answers never reach the payload or the score | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "visibleAnswers"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 (D-09/D-10/D-12) | — | Info block collects no answer, holds no `answers` key | unit (pure) | `npx vitest run app/lib/quiz/schema.test.ts -t "info block"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-01 (D-06) | — | `[]` no longer satisfies a required checklist question | unit | `npx vitest run app/lib/quiz/schema.test.ts -t "empty array"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCH-02 (D-13/D-16) | — | Exclusive deselect leaves `[]`, Next disables | unit (pure) | `npx vitest run app/lib/quiz/schema.test.ts -t "toggleOption"` | ❌ W0 | ⬜ pending |
| TBD | TBD | final | Success Criterion 4 | — | `med_list`/`med_control` behavior identical | regression | `npx vitest run app/components/quiz/QuizPartRenderer.test.ts` — **must pass unmodified** | ✅ exists | ⬜ pending |
| TBD | TBD | final | Phase gate | — | No regression anywhere | full suite | `npm run typecheck && npm test` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/lib/quiz/schema.test.ts` — new file. Covers `isAnswered`, `evaluateShowIf` (all three
      operators plus both dangling-reference cases), `visibleAnswers`, `visibleItems`, and
      `toggleOption`.
- [ ] Literal-inventory static check — implemented as a **Vitest test that reads
      `QuizPartRenderer.tsx`'s source text**, not a manual `grep` a human must remember to run.
- [ ] Extend `app/components/quiz/QuizPartRenderer.test.ts` with the D-06 empty-array case.
      **The 12 existing assertions stay byte-identical.**
- [ ] No framework install needed — Vitest is already configured and running 173 tests.

### Test-infrastructure constraint (resolved 2026-08-09 — do not re-litigate)

`vitest.config.ts` runs `environment: "node"`, includes only `*.test.ts` (never `.tsx`), and this
repo has **no** `jsdom`, `happy-dom`, or `@testing-library/react`. Zero tests render a React
component; `QuizPartRenderer.test.ts` imports only the exported pure function `isPartComplete`.

`RESEARCH.md`'s validation map assumed DOM-level tests were achievable. They are not.

**Resolution (Andrew, 2026-08-09): extract the logic into pure functions rather than add DOM test
infrastructure.** No new dependencies. Concretely, the option-toggle behavior (D-16) and the
item-visibility filter must move OUT of `QuizPartRenderer.tsx` and INTO `schema.ts` as pure,
directly-testable functions — e.g. `toggleOption(question, current, clickedValue) → string[]` and
`visibleItems(items, answers) → QuizItem[]`.

This is not a workaround. It pushes harder on SCH-02's actual goal: every piece of logic that
leaves the renderer is a piece that can no longer hold a hardcoded literal. The renderer should end
up near-dumb — mapping items to markup and delegating every decision to `schema.ts`.

**Do not add `jsdom`, `happy-dom`, `@testing-library/react`, or any other test dependency in this
phase.**

---

## Non-Vacuous Proof Strategy

This project has repeatedly been burned by assertions that pass trivially. Two documented
precedents drive the rules below:

1. `grep -c` counts matching **lines**, not occurrences. Against a single-line 184KB bundle every
   count collapses to `1`, so a `>= 1` gate passes vacuously. Three separate executors hit this
   independently, and then the orchestrator hit it too (reported Klaviyo as "4" when it was **10**).
   **Occurrence counting MUST use `split(needle).length - 1`.**
2. `tests/entry-theme-contract.test.ts` was only trusted once it was proven to FAIL against the
   pre-fix file.

### Rule 1 — "No literals remain" must fail against today's file first

Write the literal-inventory test **before** any implementation code and run it against current
`main`. It must FAIL, reporting the exact hardcodes CONTEXT.md inventoried: four question IDs
(`timing_triggers`, `symptoms_nasal`, `symptoms_eye`, `symptoms_sinus`), the `med_list` /
`med_control` equality literals, and five occurrences of `"none"`. Only after it is proven to
measure something real may a passing run be treated as evidence.

### Rule 2 — "Behavior is identical" must be proven by an untouched harness

`QuizPartRenderer.test.ts`'s existing 12 assertions are the regression harness. They pass
**unmodified** or the claim of identical behavior is false. A plan that edits them to make them
pass has disproven its own success criterion.

### Rule 3 — Two intended behavior changes must be asserted explicitly, not assumed

D-06 (`[]` no longer satisfies required) and D-16 (exclusive deselect disables Next) are
deliberate, patient-visible changes. They need their own new, positively-asserting tests. Their
absence from the existing suite is confirmed, not assumed — no current test exercises `[]`.

### Rule 4 — Type-level guarantees need a compile-time proof, not a runtime one

D-09's claim is that an info block **cannot** reach `scoreQuestion` or acquire an `answers` key.
That is a typecheck claim. Prove it with `npm run typecheck` plus a deliberate negative fixture
(a `@ts-expect-error` line that fails compilation if the union ever widens). A runtime test that
merely observes info blocks scoring zero does NOT prove the guarantee — `scoreQuestion` already
returns 0 from its `default` branch, so such a test passes vacuously.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Patient-visible effect of D-06 + D-16 in a real browser | SCH-01, SCH-02 | No DOM test infrastructure exists and none is being added (see constraint above). Pure tests prove `toggleOption` and `isAnswered`; they cannot prove the rendered control reflects them. | On the live quiz: tick a Part 1 symptom, untick it, confirm Next is disabled; tick "None of the above", confirm Next enables; click it again, confirm Next disables |
| Info block renders legibly inside a part | SCH-01 (D-10) | Same constraint, plus no UI-SPEC exists for this phase — visual legibility is a judgment call | Render a part containing an info block; confirm heading and paragraphs display, and that it collects no input |

**Known coverage limit, accepted:** pure-function extraction proves the *decisions* are correct but
not that the *renderer honors them*. A wiring bug — `toggleOption` correct but called with the
wrong argument, or `visibleItems` correct but its result ignored — would pass every automated test
in this phase. The two manual checks above are the only thing standing between that class of bug
and production. **They are not optional.** Everything else has automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, never bare `vitest`)
- [ ] Feedback latency < 15s
- [ ] Literal-inventory test proven to FAIL against pre-refactor `QuizPartRenderer.tsx`
- [ ] `QuizPartRenderer.test.ts`'s 12 existing assertions unmodified and passing
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
