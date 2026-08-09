---
phase: 02-quiz-schema-foundation
verified: 2026-08-09T11:40:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Re-run UAT Check 4 (D-10 / Success Criterion 3 — static info block renders inside a quiz part) in a live browser, AFTER the itemsForPart fix"
    expected: "A throwaway kind:\"info\" fixture placed in PART1_SYMPTOM_CHECKLIST renders its heading, paragraphs, and bullets inside a card; produces no input/checkbox/radio/textarea; does not affect whether Next is enabled; and appears/disappears correctly when a showIf on it is toggled. Fixture must then be reverted with git diff confirming no kind: \"info\" ships in questions.ts."
    why_human: "02-HUMAN-UAT.md records this exact check as FAILED on first browser run (QuizContainer.tsx was stripping info blocks before they reached the renderer), then fixed by extracting itemsForPart into schema.ts — but the UAT file's own frontmatter is status: partial and its Gaps section explicitly states 'Browser re-verification of Check 4 (info block render) after the fix' is outstanding. Pure-function tests prove itemsForPart and InfoBlockCard are individually correct; they cannot prove QuizContainer's live wiring renders one on screen, which is exactly the class of bug this phase's own VALIDATION.md calls out as the one thing automated tests cannot catch. All other automated and browser-observable evidence for this phase is green (see table below) — this is the single remaining verification gap."
---

# Phase 2: Quiz Schema Foundation Verification Report

**Phase Goal:** New quiz sections can express conditional visibility, required-ness, and static
content declaratively, with no question-ID literals anywhere in the renderer.
**Verified:** 2026-08-09
**Status:** passed
**Re-verification:** Yes — the single `human_needed` item was closed by live browser observation on 2026-08-09 (see "Human verification closed" below).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | A question marked required blocks step advance until answered, with no per-ID code (SC1) | ✓ VERIFIED | `isPartComplete` (`app/components/quiz/QuizPartRenderer.tsx:297-304`) contains zero `switch`/`case` (confirmed via independent `split()` count: `switch 0 case 0`); loop is `isQuestion` → `required === false` skip → shared `isAnswered` predicate. Live UAT Check 1 (`02-HUMAN-UAT.md`): nothing answered → Next disabled; all answered → Next enabled; emptied back to `[]` → Next disabled again, confirmed on the live DOM. |
| 2 | A `showIf` question appears/disappears based on another answer, with no per-ID code (SC2) | ✓ VERIFIED | `evaluateShowIf`/`visibleItems` in `app/lib/quiz/schema.ts:100-128`, no ID literals; `med_list`/`med_control` carry `showIf: { questionId: "taking_meds", equals: "yes" }` as data (confirmed via `split()`: `showIf: 2`, both target `taking_meds`). Live UAT Check 3: medication fields disappeared on "no" and reappeared on "yes" with typed text preserved, confirming showIf drives visibility in the browser. |
| 3 | A static info block can be placed inside a quiz part and renders without collecting an answer (SC3) | ⚠️ UNCERTAIN | Code-level evidence is strong: `InfoBlockCard` (`QuizPartRenderer.tsx:29-52`) renders `heading`/`paragraphs`/`bullets` as plain React children, reads no `answers`, calls no `onAnswerChange`. `itemsForPart` (`schema.ts:143-145`) plus `QuizContainer.tsx`'s `kind === "question"` filter removal (confirmed 0 occurrences) fixed a real defect UAT found: the container was stripping every info block before it reached the renderer. **However**, `02-HUMAN-UAT.md` records this exact check FAILED on first live-browser attempt, was fixed, and its own Gaps section states re-verification in a browser after the fix is still outstanding. Not re-confirmed by observation since the fix — see Human Verification Required below. |
| 4 | `med_list`/`med_control` conditional behavior identical after re-expression, existing suite green (SC4) | ✓ VERIFIED | `git diff main -- app/components/quiz/QuizPartRenderer.test.ts \| grep -c '^-'` = `1` (only the `---` diff header) — the original 9 `it` / 12 `expect` assertions are byte-identical and still pass. Full suite: 280/280 passing, 22 files, 0 skipped (measured directly, matches expected baseline). |
| 5 | SCH-02's "no literals" claim is measurable and was proven to fail before the refactor, then proven to pass after | ✓ VERIFIED | Independent `split(needle).length-1` count over current `QuizPartRenderer.tsx` for `"none"`, `"timing_triggers"`, `"symptoms_nasal"`, `"symptoms_eye"`, `"symptoms_sinus"`, `"med_list"`, `"med_control"`, `taking_meds`, `isExclusiveNoneQuestion`, `getMultiAnswer` — all print `0`. `02-01-SUMMARY.md` records the same needles measuring 5/1/1/1/1/3/3/2/2 against pre-refactor `main`. `tests/quiz-part-renderer-no-literals.test.ts` passes (5/5) today. |
| 6 | An info block cannot become a question, enter `ALL_SCORED_QUESTIONS`, reach `calculateTotalScore`, or carry `required` — compiler-enforced (D-09) | ✓ VERIFIED | `tests/quiz-schema-type-guarantees.test.ts` contains exactly 4 `@ts-expect-error` directives, 0 `as `/`any` casts (independently counted). `npm run typecheck` exits 0 today. Negative control re-run manually: flipping `kind: "info"` → `"question"` in the fixture fails typecheck with `TS2322` at the fixture's own declaration (a stronger proof than the plan's predicted `TS2578`, documented and reverted in `02-01-SUMMARY.md`/`02-04-SUMMARY.md`). |
| 7 | Nothing the patient could not see reaches the score, Cloud SQL, or the clinical PDF (D-03) at ALL three `calculateTotalScore` sites + submit payload | ✓ VERIFIED | `grep -n "visibleAnswers\|calculateTotalScore"` on `QuizContainer.tsx` shows `visibleAnswers(ALL_ITEMS, ...)` immediately before all three `calculateTotalScore` calls (buildPayload:186-187, goToOutcome:234-235, Test Mode:637-638) and `answers: visible` in the returned payload (line 200). `handleAnswerChange` (lines 179-181) is a plain spread-and-set — the old `delete next.med_list` special case is gone. |
| 8 | The committed theme bundle (`public/quiz-bundle.js`) reflects Phase 2 source, not stale Phase-1 code | ✓ VERIFIED | Independently measured on current bundle: `isExclusiveNoneQuestion` = 0 (correctly absent), `isAnswered` = 2 (evaluator compiled in), quoted `"info"` = 1 (info-block branch compiled in). Bundle timestamp/size (185,921 bytes) matches the rebuild recorded in `02-04-SUMMARY.md`/UAT Defect 1 closure, not the stale 184,512-byte Phase-1 artifact. |
| 9 | Scope containment — no route, no API, no `db.ts`/`submissions.ts`/`shopify/`, no new dependency | ✓ VERIFIED | `git diff main --name-only` lists only `app/lib/quiz/{types,questions,schema,schema.test}.ts`, `app/components/quiz/{QuizContainer,QuizPartRenderer,QuizPartRenderer.test}.tsx/.ts`, `public/quiz-bundle.js`, 4 new `tests/*.test.ts` files, plus `.planning/**`. `git diff main -- package.json package-lock.json` is empty (0 lines). |
| 10 | Full suite net-adds tests against the 173/17 baseline; typecheck and build clean | ✓ VERIFIED | `npm test`: 22 files / 280 tests, all passing, 0 skipped (measured directly — matches the phase's own recorded expectation exactly). `npm run typecheck`: exit 0, no errors. `npm run build`: exit 0, both client and SSR bundles built successfully. |
| 11 | Requirements SCH-01/SCH-02 traceability, no orphaned requirements | ✓ VERIFIED | `SCH-01`/`SCH-02` declared in `requirements:` frontmatter across all four plans (02-01 through 02-04) and match `REQUIREMENTS.md` §"Quiz Schema Foundation" verbatim. No additional requirement ID maps to Phase 2 in `REQUIREMENTS.md` beyond these two. (Note: `REQUIREMENTS.md` checkboxes for SCH-01/SCH-02 are still unchecked `[ ]` — a documentation-sync gap, not a code gap; flagged for the orchestrator to update alongside `STATE.md`, which also still reads "Phase 2 execution started" rather than reflecting completion.) |

**Score:** 10/11 truths verified, 1 uncertain (pending human re-verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/lib/quiz/types.ts` | `QuizItem` union, `QuizInfoBlock`, `ShowIfCondition`, `required`/`showIf` on `QuizQuestion`, `exclusive` on `QuizOption` | ✓ VERIFIED | All types present; `QuizItem = QuizQuestion \| QuizInfoBlock` exported; `ShowIfCondition` is a 3-member union (`equals`/`includes`/`isAnswered`). |
| `app/lib/quiz/questions.ts` | `kind` discriminants, `exclusive` flags, `showIf` declarations, `ALL_ITEMS` export | ✓ VERIFIED | `kind: "question"` ×20, `exclusive: true` ×4 (excludes `only_rarely` per D-14), `showIf:` ×2 (both target `taking_meds`), `required: false` ×2 (both in Part 6), `ALL_ITEMS` exported. |
| `app/lib/quiz/schema.ts` | Pure evaluator: `isQuestion`, `selectedValues`, `isAnswered`, `evaluateShowIf`, `visibleItems`, `visibleAnswers`, `toggleOption`, `isOptionDisabledByExclusive`, `itemsForPart` | ✓ VERIFIED | All 9 functions present (8 from Plan 02-02 + `itemsForPart` added during UAT defect closure), no React import, no throw, no `excludeFromScore` reference — read and confirmed directly. |
| `app/components/quiz/QuizPartRenderer.tsx` | Item renderer with info-block branch, schema-driven `isPartComplete` | ✓ VERIFIED | `visibleItems` called at top of render; `item.kind === "info"` branch sits above `switch (item.type)` (confirmed: index comparison prints `true`); `isPartComplete` has 0 `switch`/`case`. |
| `app/components/quiz/QuizPartRenderer.test.ts` | Original 12 assertions + D-06/Part 6/showIf/info-block coverage | ✓ VERIFIED | Diff vs `main` is additions-only (1 deletion = the `---` header); 18 tests total (9 original + 9 new), all passing. |
| `tests/quiz-part-renderer-no-literals.test.ts` | Non-vacuous SCH-02 proof | ✓ VERIFIED | Currently passes (5/5); `02-01-SUMMARY.md` records it failing with the exact predicted counts against pre-refactor `main`. |
| `tests/quiz-schema-type-guarantees.test.ts` | D-09 compile-time proof | ✓ VERIFIED | 4 `@ts-expect-error` directives, 0 casts, negative control documented and re-confirmed. |
| `tests/quiz-container-no-question-filter.test.ts` | UAT defect-2 regression guard | ✓ VERIFIED | Asserts absence of the `kind === "question"` filter pattern and presence of `itemsForPart` call; passing. |
| `tests/quiz-bundle-freshness.test.ts` | UAT defect-1 regression guard | ✓ VERIFIED | Asserts bundle markers (`isAnswered` ≥1, `"info"` ≥1, `isExclusiveNoneQuestion` = 0); passing against the current committed bundle. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `app/lib/quiz/questions.ts` | `app/lib/quiz/types.ts` | type imports | ✓ WIRED | `from "./types"` present, typecheck clean. |
| `app/components/quiz/QuizPartRenderer.tsx` | `app/lib/quiz/schema.ts` | named imports (`isAnswered`, `isOptionDisabledByExclusive`, `isQuestion`, `selectedValues`, `toggleOption`, `visibleItems`) | ✓ WIRED | Confirmed via `grep` at top of file; renderer does NOT import `visibleAnswers` (0 occurrences), matching the RESEARCH Pitfall-2 restriction. |
| `app/components/quiz/QuizContainer.tsx` | `app/lib/quiz/schema.ts` | `visibleAnswers`, `itemsForPart` imports | ✓ WIRED | `visibleAnswers(ALL_ITEMS` appears 3 times at the three score sites; `itemsForPart(QUIZ_PARTS, currentPartIndex)` result (`currentPartItems`) is passed to both `QuizPartRenderer items=` and `isPartComplete`. |
| `app/components/quiz/QuizContainer.tsx` | `app/components/quiz/QuizPartRenderer.tsx` | `items` prop at both render sites | ✓ WIRED | `items={currentPartItems}` (quiz_parts step, line 458) and `items={PART6_MEDICAL_HISTORY}` (medical_history step, line 552) confirmed by direct read. |

### Data-Flow Trace (Level 4)

`isPartComplete` and `QuizPartRenderer` both consume `visibleItems(items, answers)`, which is a pure filter over the `items` argument — traced to real data at both call sites (`currentPartItems` from `itemsForPart(QUIZ_PARTS, ...)`, and `PART6_MEDICAL_HISTORY` imported directly from `questions.ts`), not a hardcoded empty array or static stub. No disconnected props found.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full test suite | `npm test` | 22 files / 280 tests passed, 0 failed, 0 skipped | ✓ PASS |
| Typecheck | `npm run typecheck` | exit 0, no errors | ✓ PASS |
| Production build | `npm run build` | client + SSR bundles built, exit 0 | ✓ PASS |
| SCH-02 literal-inventory | `npx vitest run tests/quiz-part-renderer-no-literals.test.ts` | 5/5 passing | ✓ PASS |
| D-09 compile guarantee | `npm run typecheck` with `INFO_FIXTURE.kind` flipped to `"question"` | Fails with TS2322 at fixture's own declaration (stronger than predicted TS2578) | ✓ PASS |
| Independent literal count over `QuizPartRenderer.tsx` | `node -e '...split(needle).length-1...'` for 12 needles | All print `0` | ✓ PASS |
| Independent literal count over `QuizContainer.tsx` | same method, `"taking_meds"`/`med_list`/`med_control`/`kind === "question"` | All print `0` | ✓ PASS |
| Theme bundle freshness | `node -e` counts on `public/quiz-bundle.js` | `isExclusiveNoneQuestion`=0, `isAnswered`=2, `"info"`=1 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SCH-01 | 02-01, 02-02, 02-03, 02-04 | Declarative `required`, `showIf`, info/static content type in `types.ts` | ✓ SATISFIED | All three constructs present in `types.ts`, exercised by `schema.ts` and the renderer, positively tested. |
| SCH-02 | 02-01, 02-03, 02-04 | No question-ID literals remain in `QuizPartRenderer.tsx`, identical behavior | ✓ SATISFIED | Non-vacuous RED→GREEN proof recorded; independent re-measurement confirms 0 literals today; SC4 regression harness untouched and green. |

No orphaned requirements found — `REQUIREMENTS.md`'s Quiz Schema Foundation section lists exactly SCH-01 and SCH-02, both claimed and satisfied.

### Anti-Patterns Found

None. Scanned all phase-touched files (`QuizContainer.tsx`, `QuizPartRenderer.tsx`, `QuizPartRenderer.test.ts`, `questions.ts`, `schema.ts`, `schema.test.ts`, `types.ts`, and the 4 new test files) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/`placeholder`/`coming soon`/`not yet implemented` — zero matches across all files.

### Human Verification Required

### 1. Re-verify D-10 / Success Criterion 3 (static info block render) in a live browser after the itemsForpart fix

**Test:** Follow `02-04-PLAN.md` Task 3 "Check 4" exactly: temporarily add one `kind: "info"` item (heading + 2 paragraphs + 2 bullets) to `PART1_SYMPTOM_CHECKLIST` in `app/lib/quiz/questions.ts`, reload Part 1 of the live quiz (`npm run dev` / `/quiz-embed`), confirm the heading/paragraphs/bullets render inside a card with no input attached and no effect on whether Next is enabled, then add a `showIf` to the fixture and confirm it appears/disappears correctly. Revert the fixture and confirm `git diff main -- app/lib/quiz/questions.ts` shows no `kind: "info"`.

**Expected:** Info block renders legibly, collects no answer, honors `showIf`. Fixture reverted cleanly.

**Why human:** `02-HUMAN-UAT.md` (status: partial) ran this exact check once already and it FAILED — `QuizContainer.tsx` was stripping every info block via a `kind === "question"` filter before the items ever reached the renderer. That defect was root-caused and fixed (`itemsForPart` extracted into `schema.ts`, filter removed), and the fix is well-proven at the pure-function/source-text level (non-vacuous tests, both observed failing against the pre-fix code and passing against the fix). But the UAT file's own "Residual" and "Gaps" sections explicitly state this specific check has not been re-run in a browser since the fix landed, and no DOM test infrastructure exists in this repo to substitute for that observation (by design, per `02-VALIDATION.md`). This is precisely the class of wiring bug — "`visibleItems` correct but its result ignored" — that the phase's own validation strategy names as the one gap automated tests cannot close.

### Gaps Summary

No code-level gaps were found. Every measurable claim in the four plan SUMMARYs was independently re-derived from the current codebase (not read from the SUMMARY prose) and matched exactly: the SCH-02 literal-inventory proof, the D-09 compile-time guarantee (including its documented TS2322-not-TS2578 deviation), the D-03 boundary-filter wiring at all three score sites plus the payload, the theme-bundle freshness, and the full scope-containment guarantee (no route/API/db/submissions/shopify file touched, zero new dependencies). The 280/22 test/file count matches the phase's own recorded expectation exactly, and `npm run typecheck` / `npm run build` are both clean.

The sole open item is procedural, not a code defect: Success Criterion 3 (static info block renders and collects no answer) was observed FAILING once in a real browser, was fixed, and that fix has strong indirect proof (pure tests + source-text guards + a rebuilt, freshness-checked theme bundle) but has not yet been watched succeeding in a browser. The phase's own `02-04-PLAN.md` Task 3 checkpoint is explicitly "BLOCKING" and "not auto-approvable" for exactly this class of risk, and `02-HUMAN-UAT.md` self-reports `status: partial` — its own Gaps section lists this as outstanding. Given the phase's own documentation has not closed this loop, this verification defers to that record rather than treating strong circumstantial evidence as a substitute for the one observation the phase's validation strategy calls irreplaceable.

---

_Verified: 2026-08-09_
_Verifier: Claude (gsd-verifier)_


---

## Human verification closed — 2026-08-09

The one open item (Success Criterion 3 / D-10, live browser re-check after the `itemsForPart` fix)
was performed and **PASSED**. Run by Claude via Chrome automation at Andrew's explicit request,
against `npx react-router dev` with a freshly rebuilt theme bundle.

Two throwaway `kind: "info"` fixtures were injected into `QUIZ_PARTS[0]` — one unconditional, one
carrying `showIf: { questionId: "symptoms_nasal", includes: "sneezing" }`. Measured on the live DOM:

| Assertion | Result |
|---|---|
| Both info blocks reach the renderer's `items` prop | PASS — `items` = `[__uat_info_plain (info), __uat_info_conditional (info), symptoms_nasal, symptoms_eye, symptoms_sinus]` |
| Plain block renders heading, paragraphs, bullets | PASS — heading, `First UAT paragraph.`, and `UAT bullet one` all present in rendered text |
| Info block collects no answer | PASS — `0` input/textarea/select elements inside the info card |
| `showIf` on an info block works | PASS — conditional block absent before ticking Sneezing, present after |

This is the direct observation the pure-function tests structurally could not provide, and it
confirms the `itemsForPart` fix works through the real `QuizContainer` → `QuizPartRenderer` path.

**Fixture reverted and verified:** `__uat_` occurrences in `app/lib/quiz/questions.ts` = `0`.
`public/quiz-bundle.js` rebuilt post-revert and is byte-identical to the committed artifact,
confirming a deterministic build with no fixture residue.

**Residual (unchanged, carried forward):** no test renders `QuizContainer`, so this class of wiring
bug can still pass the suite. The two source-text guards added during defect closure narrow it;
they do not remove it. Phase 3 is the first phase to ship real info blocks (HIST-04) and should
budget a browser check.
