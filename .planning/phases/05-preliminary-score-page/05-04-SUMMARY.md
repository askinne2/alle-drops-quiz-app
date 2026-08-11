---
phase: 05-preliminary-score-page
plan: 04
subsystem: testing
tags: [dom-tests, jsdom, accessibility, compliance-copy, non-vacuity]
dependency-graph:
  requires:
    - phase: 05-preliminary-score-page (plan 03)
      provides: The rewritten ResultsDisplay (Preliminary Score title, data-driven scale bar, D-06 meaning section) this plan renders and asserts against
  provides:
    - "The repo's first dedicated ResultsDisplay DOM test (tests/quiz-results-scale-bar-dom.test.ts) — 16 assertions across SCORE-01/02/03, D-04, D-05, D-06, D-09, and the accessibility contract"
    - "A non-vacuous D-10 no-approval-promise source guard in tests/quiz-testing-bypass-deletion.test.ts"
    - "05-VALIDATION.md's Per-Task Verification Map re-measured through wave 3 (05-01..05-04), wave_0_complete: true"
  affects: [tests/quiz-results-scale-bar-dom.test.ts, tests/quiz-testing-bypass-deletion.test.ts, .planning/phases/05-preliminary-score-page/05-VALIDATION.md]
tech-stack:
  added: []
  patterns: ["renderToStaticMarkup for style-shorthand assertions jsdom's CSSOM cannot parse", "case-insensitive split-based occurrence counting (countCI) alongside the existing case-sensitive count() helper"]
key-files:
  created:
    - tests/quiz-results-scale-bar-dom.test.ts
  modified:
    - tests/quiz-testing-bypass-deletion.test.ts
    - .planning/phases/05-preliminary-score-page/05-VALIDATION.md
decisions:
  - "Read zone flex-grow values via react-dom/server's renderToStaticMarkup instead of jsdom's live CSSStyleDeclaration, because this repo's jsdom/cssstyle version silently drops the unitless-flex-basis shorthand ResultsDisplay actually renders (flex: <n> 0 0) — neither of the plan's two suggested read strategies (style.flex/style.flexGrow, or the style attribute text) has anything to read once that happens"
  - "Interpreted the 05-VALIDATION.md acceptance bullet 'no remaining pending row except the bundle-freshness row' as applying to rows this plan actually measured (waves 1-3 through 05-04), not as license to mark plan 05-06's unexecuted rows green — flipping 05-06-T3 in particular would falsely imply REQUIREMENTS.md bookkeeping happened, which this plan's own action text forbids touching"
requirements-completed: [SCORE-01, SCORE-02, SCORE-03]
metrics:
  duration: 55min
  completed: 2026-08-11
---

# Phase 5 Plan 04: ResultsDisplay Scale-Bar DOM Test + D-10 Closure Summary

Wrote the repo's first dedicated `ResultsDisplay` DOM test — 16 jsdom assertions proving the scale
bar's tone tracks the raw score independently of `scoreBracket` (D-05, load-bearing), proving the
marker is structurally immune to the zones wrapper's clipping, and proving SCORE-01/02/03 copy,
the accessible name, and the D-04/D-06/D-09 copy invariants — then converted D-10's prior
by-inspection reading into a standing, non-vacuous absence assertion and brought the phase's
validation map current through wave 3.

## What Was Built

- **`tests/quiz-results-scale-bar-dom.test.ts`** (new, 279 lines) — `// @vitest-environment jsdom`
  on line 1, `React.createElement` throughout, imports `ResultsDisplay` and `getScoreScale`
  directly. A `renderResults(overrides)` helper renders against a synthetic baseline
  (`score: 7`, `scoreBracket: "7+"`, `patientState: "tennessee"`, `symptomProfileId:
  "AOD_TEST_0001"`, `testingStatus: "had_testing"`) with no realistic patient identifier anywhere
  in the fixture. A `getScaleBarParts(container)` helper locates the track (`[role="img"]`), the
  zones wrapper (the track child containing `[data-tone]` elements), and the marker (the track
  child that is *not* the zones wrapper) without touching any hashed CSS Modules class name.
  Ten `describe` blocks cover SCORE-01 copy, SCORE-02's derived readout, SCORE-03 zone rendering
  and proportional widths, D-05 bar/bracket independence (the load-bearing pair), the
  marker-clipping structural guard, the accessibility contract, edge scores (0 and max), D-06,
  D-09, and D-04.
- **`tests/quiz-testing-bypass-deletion.test.ts`** — added `countCI`, a case-insensitive sibling
  of the file's existing `count` helper (still `split(needle).length - 1`, never `grep -c`), and
  one new `it("DEC-no-approval-promise-copy: ...")` in the existing `ResultsDisplay.tsx is
  terminal` describe block, asserting zero occurrences of six approval-promise needles ("if
  approved", "once approved", "upon approval", "you will be able to purchase", "you can purchase",
  "unlock").
- **`.planning/phases/05-preliminary-score-page/05-VALIDATION.md`** — `wave_0_complete` flipped to
  `true`; the ten Per-Task Verification Map rows for plans 05-01 through 05-04 flipped from
  `⬜ pending` to `✅ green` after re-running each row's exact automated command against current
  source. The two 05-05 bundle rows and all three 05-06 rows are unchanged (`⬜ pending`) — see
  Deviations below for why 05-06's rows were not flipped despite the plan's acceptance bullet.

## D-10 Per-Bracket Reading (quoted findings)

Re-read `app/components/quiz/ResultsDisplay.tsx`'s three current band paragraphs (post-05-03, not
RESEARCH.md's earlier reading). None promises the patient can purchase if/once approved:

- **0-2:** "...Continue your current management approach with over-the-counter medications as
  needed. However, if your symptoms worsen, occur more frequently, or begin to interfere with your
  daily activities, consider completing this questionnaire again or scheduling an appointment with
  an allergist." — No approval or purchase language at all; the only next step offered is
  retaking the quiz or seeing an allergist.
- **3-6:** "...you may benefit from seeing an allergist. While your symptoms are not severe, they
  are affecting your daily life and could be better controlled. An allergist can help identify
  your triggers and optimize your treatment plan." — Recommends seeing an allergist; no purchase
  path is named or implied.
- **7+:** "...you would likely benefit from beginning sublingual immunotherapy... An allergist can
  perform testing to identify your specific triggers and develop a comprehensive treatment plan,
  **which may include prescription medications or immunotherapy**." — This is the clause carrying
  the conditional, clinician-mediated framing: treatment is something "an allergist can perform"
  and "may include," never something the patient unlocks or becomes entitled to purchase by virtue
  of a score or an approval event. No language ties the score to purchase eligibility.

## Non-Vacuity Proofs (all four required, quoted)

**Task 1 — three highest-value guards, each mutated in `ResultsDisplay.tsx`, tested, then
reverted (confirmed via `git diff --exit-code`):**

1. **Marker moved inside the zones wrapper.** 7 of 16 assertions failed; the structural guard
   itself failed with:
   ```
   Error: marker (track child other than the zones wrapper) not found
    ❯ getScaleBarParts tests/quiz-results-scale-bar-dom.test.ts:75:22
   ```
2. **Current zone derived from `scoreBracket` instead of `score`.** The load-bearing D-05 test
   failed with:
   ```
   AssertionError: expected 'High' to be 'Low' // Object.is equality
   Expected: "Low"
   Received: "High"
    ❯ tests/quiz-results-scale-bar-dom.test.ts:178:44
   ```
   (The accessibility-contract test also failed, for the same underlying reason: the `aria-label`
   named "high zone" instead of "low".)
3. **`h2` reverted to "Your Assessment Results".** Both the positive title check and the absence
   check failed:
   ```
   AssertionError: expected 'Your Assessment ResultsOur Clinical T…' … // title mismatch
   AssertionError: expected 'Your Assessment ResultsOur Clinical T…' not to contain 'Your Assessment Results'
    ❯ tests/quiz-results-scale-bar-dom.test.ts:126:22
   ```

**Task 2 — D-10 guard, mutated by inserting "if approved" into the 3-6 band paragraph, tested,
then reverted:**

```
AssertionError: expected 1 to be +0 // Object.is equality
- Expected: 0
+ Received: 1
 ❯ tests/quiz-testing-bypass-deletion.test.ts:210:55
```

All four mutations were reverted with `git checkout -- app/components/quiz/ResultsDisplay.tsx`;
`git diff --exit-code app/components/quiz/ResultsDisplay.tsx` was confirmed clean after each one
and again at the end of the plan.

## Inline-Style Read Strategy (recorded per the plan's instruction)

**Neither of the plan's two suggested strategies worked.** Measured directly against this repo's
jsdom/cssstyle version: `element.style.flex = "20 0 0"` (the exact shorthand
`ResultsDisplay.tsx` renders, with an intentionally unitless `0` flex-basis) is silently rejected
by jsdom's CSS parser — `element.style.flex` and `element.style.flexGrow` both read back `""`, and
critically, **no `style` attribute is written to the DOM node at all** in that case (confirmed via
`outerHTML`), whether the value is set via React's normal render path, `element.style.setProperty`,
or `element.style.cssText`. This means the plan's documented fallback — "read the style attribute
text and extract the leading number" — has nothing to read either; both suggested strategies are
unreachable for this specific shorthand syntax under this jsdom version. (jsdom does parse `flex:
20 0 0px` — a unit on the flex-basis makes it parseable — but changing the component's own style
string just to satisfy jsdom's parser would be an unnecessary, purely test-motivated production
change, and was rejected.)

**What worked:** `react-dom/server`'s `renderToStaticMarkup`, called against the identical
component tree, serializes styles to a literal HTML string without going through jsdom's CSSOM at
all — `style="flex:20 0 0"` is present verbatim in that string and is parsed with a plain regex.
This reads the exact same value a real browser receives; it just never touches jsdom's parser for
this input. The proportional-widths test (`SCORE-03 zone rendering and proportional widths >
gives each zone a flex-grow value...`) uses this helper (`getZoneFlexGrowValues`); every other
test in the file uses the live `render()`/jsdom path, since `data-tone`, `class`, and other plain
attributes are unaffected by this shorthand-parsing gap.

## Measured Test Counts

| Command | Before this plan | After this plan |
|---|---|---|
| `npm test` (full suite) | 696 tests / 48 files | 713 tests / 49 files |
| `tests/quiz-results-scale-bar-dom.test.ts` | did not exist | 16/16 passing |
| `tests/quiz-testing-bypass-deletion.test.ts` | 24 tests | 25 tests, all passing |

Suite count rose by 17 (16 new DOM assertions + 1 new D-10 assertion), comfortably above the
plan's 15-assertion floor.

## Task Commits

1. **Task 1: ResultsDisplay scale-bar DOM test** — `258c0c9` (test)
2. **Task 2: D-10 non-vacuous guard** — `606f0d1` (test)
3. **Task 2: validation map re-measurement** — `0b7112f` (docs)

## Verification

- `npx vitest run tests/quiz-results-scale-bar-dom.test.ts tests/quiz-testing-bypass-deletion.test.ts` — 41/41 green.
- `npm test` — 713/49 green (up from 696/48).
- `npm run typecheck` — exit 0.
- `git diff --exit-code app/components/quiz/ResultsDisplay.tsx app/styles/quiz.module.css app/lib/quiz` — clean; this plan touched tests and docs only.
- `node -e` acceptance script from the plan (rejects `toBe(60)`, requires ≥3 `getScoreScale` reads) — `ok`.
- `node -e` acceptance script for the D-10 needle list — `ok`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Replaced the planned jsdom style-read strategy with `renderToStaticMarkup`**

- **Found during:** Task 1, writing the proportional-widths assertion.
- **Issue:** The plan specified reading each zone's flex-grow value via `style.flex` /
  `style.flexGrow`, falling back to the raw `style` attribute text if empty. Both are unreachable:
  this repo's jsdom/cssstyle version drops the entire `flex: <n> 0 0` shorthand (unitless
  flex-basis) before it ever reaches the DOM, so there is no attribute text to fall back to either
  — measured directly, not assumed (see "Inline-Style Read Strategy" above).
- **Fix:** Added a `getZoneFlexGrowValues` helper using `react-dom/server`'s `renderToStaticMarkup`
  to read the literal, unparsed style string for the same component tree, then extract each zone's
  flex-grow value with a regex. No production code was touched; the fix is entirely inside the new
  test file.
- **Files modified:** `tests/quiz-results-scale-bar-dom.test.ts`
- **Commit:** `258c0c9`

**2. [Rule 3 - Blocking issue] Interpreted "no remaining pending row except the bundle-freshness row" narrowly**

- **Found during:** Task 2, updating `05-VALIDATION.md`.
- **Issue:** The plan's acceptance criteria literally reads "no remaining `⬜ pending` row except
  the bundle-freshness row," which — read most literally — would require flipping the three 05-06
  rows to green as well as the two 05-05 rows staying pending. But the plan's own `<action>` text
  says "Do not edit the Manual-Only Verifications table; plan 05-06 owns those," and the table's
  own footnote says "plan 05-06 Task 3 closes the remainder" (plural rows, not one). Flipping
  05-06-T3 in particular — whose Secure Behavior column reads "Requirement rows closed only after
  the human pass" — to green would falsely claim the human verification pass and the
  `REQUIREMENTS.md` bookkeeping happened, which this same plan's action text explicitly forbids
  this plan from touching ("its SCORE row bookkeeping is plan 05-06's closing task, after the
  human verification pass, so a requirement is never marked complete on the strength of a green
  suite alone").
- **Fix:** Flipped only the ten rows this plan actually measured (05-01 through 05-04, wave 3),
  re-running every row's exact automated command against current source first. Left the two 05-05
  bundle rows and all three 05-06 rows pending, matching the footnote and the action text's
  explicit ownership split rather than the single acceptance bullet's imprecise wording.
- **Files modified:** `.planning/phases/05-preliminary-score-page/05-VALIDATION.md`
- **Commit:** `0b7112f`

No other deviations. Both tasks otherwise executed exactly as the plan specified: the test file's
name, jsdom pragma, `React.createElement` usage, synthetic-fixture discipline, and describe-block
organization all match; the D-10 guard's needle list, helper reuse, and comment explaining its
limits all match; the five pre-existing absence assertions in
`tests/quiz-testing-bypass-deletion.test.ts` are byte-identical to their pre-change text (confirmed
via `git diff` showing only additive hunks).

## Threat Model Coverage

All six threats this plan's `<threat_model>` assigned `mitigate` are addressed:

- **T-5-19** (a green test proving nothing) — mitigated; all three highest-value guards were
  confirmed to fail via temporary source mutation before being trusted, with failure text quoted
  above.
- **T-5-20** (a vacuous compliance assertion) — mitigated; the temporary "if approved" insertion
  proved the D-10 guard fires, and the guard's comment names the needle list's limits (a proxy
  vocabulary, not an exhaustive semantic check).
- **T-5-21** (PHI in a test fixture) — mitigated; `renderResults`'s baseline props carry only a
  synthetic `symptomProfileId` ("AOD_TEST_0001") and no name, DOB, email, or phone — the component
  takes none of those props, and none were introduced.
- **T-5-22** (a hardcoded expectation defeating SCORE-02) — mitigated; every ceiling/zone-count
  assertion reads `getScoreScale()`, and the plan's `node -e` acceptance script (rejecting a
  literal `toBe(60)`) passes.
- **T-5-23** (working-tree pollution from the non-vacuity mutations) — mitigated; `git diff
  --exit-code app/components/quiz/ResultsDisplay.tsx` was run and confirmed clean after each of
  the four temporary mutations, and again at the end of the plan.
- **T-5-24** (jsdom/Testing Library availability) — accept-dispositioned by the plan; no new
  package added, none required.

## Known Stubs

None. The new test file exercises the real `ResultsDisplay` component against the real
`getScoreScale()` provisional constant; no mock data, empty placeholder, or "coming soon" text was
introduced.

## Threat Flags

None. This plan added test files and updated a planning document only — no new network endpoint,
auth path, file access pattern, or schema change was introduced. `ResultsDisplay.tsx`,
`quiz.module.css`, and everything under `app/lib/quiz/` are unmodified (confirmed by `git diff
--exit-code` in the Verification section above).

## Self-Check: PASSED

- FOUND: `tests/quiz-results-scale-bar-dom.test.ts` (created, 16/16 passing)
- FOUND: `tests/quiz-testing-bypass-deletion.test.ts` (modified, 25/25 passing)
- FOUND: `.planning/phases/05-preliminary-score-page/05-VALIDATION.md` (modified, `wave_0_complete: true`)
- FOUND: commit `258c0c9` (Task 1)
- FOUND: commit `606f0d1` (Task 2, D-10 guard)
- FOUND: commit `0b7112f` (Task 2, validation map)

## Next Phase Readiness

- Plan 05-05 can now rebuild `public/quiz-bundle.js`/`.css` and add the Phase 5 bundle-freshness
  markers, picking up plan 05-03's component change and plan 05-02's CSS change together in one
  rebuild.
- Plan 05-06's human verification pass (greyscale, 375px, the score-7-reads-low-not-red check) can
  proceed knowing the automated layer that would catch a regression in any of those properties
  (bar/bracket independence, marker clipping, accessible name) now exists and has been proven
  non-vacuous.
- No blockers. Full suite green (713/49), typecheck clean, production component/CSS/lib files
  byte-identical to pre-plan state.

---
*Phase: 05-preliminary-score-page*
*Completed: 2026-08-11*
