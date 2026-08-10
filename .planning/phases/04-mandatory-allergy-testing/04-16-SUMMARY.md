---
phase: 04-mandatory-allergy-testing
plan: 16
subsystem: quiz-client-upload-widget
tags: [file-upload, quiz-schema, accessibility, dom-testing, hipaa]

# Dependency graph
requires:
  - phase: 04-mandatory-allergy-testing
    provides: "POST /api/quiz/upload (plan 04-13), the ratified size caps (04-UPLOAD-DECISIONS.md), and the file_multi QuestionType + isAnswered branch (plan 04-02)"
provides:
  - "testing_files (file_multi) + testing_upload_requirements (info block), appended to PART7_ALLERGY_TESTING"
  - "QuizPartRenderer.tsx's file_multi render branch — the client surface of TEST-04"
  - "app/styles/quiz.module.css's .fileUpload* class family"
  - "tests/quiz-file-upload-dom.test.ts — DOM coverage of the required-gate rule (T-4-80)"
affects: ["04-17 (promotion step reads testing_files tokens off the submitted payload)", "04-18 (owns the next public/quiz-bundle.js rebuild, which must fold in this plan's three commits)", "04-19 (owns marking TEST-04 complete and the human browser pass)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "file_multi local component state lives at the QuizPartRenderer level (Record<questionId, FileUploadEntry[]>), not per-item, so it survives a testing_status flip away and back within the same mounted part — same principle as D-03's text-field retention, applied to files for the first time"
    - "A dedicated useEffect diffs derived 'uploaded'-only tokens against the current answers prop and calls onAnswerChange only on real change — the single choke point that makes T-4-80 (only successful uploads satisfy the required gate) hold"
    - "Client-side size pre-checks are courtesy-only (immediate feedback before a round trip); POST /api/quiz/upload's own caps remain authoritative per T-4-81"

key-files:
  created:
    - tests/quiz-file-upload-dom.test.ts
  modified:
    - app/lib/quiz/questions.ts
    - app/components/quiz/QuizPartRenderer.tsx
    - app/styles/quiz.module.css
    - tests/quiz-schema-type-guarantees.test.ts
    - tests/quiz-part-renderer-dom.test.ts

key-decisions:
  - "Widened PART7_ALLERGY_TESTING from QuizQuestion[] to QuizItem[] (same widening PART6_MEDICAL_HISTORY already needed) so testing_upload_requirements' info block can share the array with testing_files."
  - "\"Required-but-empty\" trigger, since QuizContainer.tsx (the real Next button) is explicitly out of this plan's files_modified: implemented as 'the file input lost focus while the field is still required-and-empty,' not a literal Next-click. This is a real, testable, keyboard-reachable trigger a patient reaches naturally by tabbing past the widget, but it is Claude's interpretation of the UI-SPEC's 'attempts Next' language, not a literal wiring of the real Next button — flagging explicitly since QuizContainer.tsx's Next button stays silently disabled while the part is incomplete (unchanged from Phase 3's pattern) and cannot itself be clicked to trigger this message under the current architecture."
  - "Retry is shown only for the generic network/500/unexpected-response failure class (errorMessage carries retryable: true) — not for wrong-type/too-large/total-exceeded, since retrying identical bytes against those cannot succeed. Matches the Copywriting Contract, which names a Retry action only on the 'didn't upload' string."
  - "Imported MAX_FILE_BYTES/MAX_TOTAL_BYTES directly from app/lib/storage/upload-validation.ts (a pure, dependency-free module) into the client-rendered component, rather than redeclaring the ratified caps a second time, per 04-UPLOAD-DECISIONS.md's single-source-of-truth instruction."
  - "CSS status modifiers named .fileUpload__statusUploading/Uploaded/Failed (flat camelCase, no BEM '--' modifier) to match this codebase's existing single-class convention (e.g. questionCard__optionSelected) and to keep them dot-accessible on the CSS-module `styles` object without bracket-notation workarounds."
  - "SVG fill='none' attributes use single quotes (matching the existing InfoBlockCard icon's established workaround) so they do not collide with tests/quiz-part-renderer-no-literals.test.ts's quoted \"none\" option-value needle."

requirements-completed: []

# Metrics
duration: ~55min
completed: 2026-08-10
---

# Phase 4 Plan 16: Multi-File Upload Widget Summary

**The file_multi question type, its `.fileUpload` CSS family, and QuizPartRenderer's async per-file upload branch — the client surface of TEST-04, gated so only successfully-uploaded files can ever satisfy the required-upload clinical field.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 5 (2 new: `tests/quiz-file-upload-dom.test.ts`, plus this summary)

## Accomplishments

- **`app/lib/quiz/questions.ts`** — appended `testing_upload_requirements` (info block, carrying the
  escape-hatch paragraph to `needs_testing`) and `testing_files` (file_multi, required by default,
  gated on `had_testing`) to `PART7_ALLERGY_TESTING`, with the ratified 15 MB / 50 MB caps
  substituted into the requirements-line copy. Widened the array's type from `QuizQuestion[]` to
  `QuizItem[]` to hold the info block.
- **`app/styles/quiz.module.css`** — the full `.fileUpload*` class family (dropzone, requirements
  caption, list, item, chip, filename, status, remove, retry, empty, error), composed entirely from
  existing `--quiz-spacing-*`/`--quiz-color-*` tokens and existing treatments
  (`.questionCard`, `.questionCard__subtitle`, `.questionCard__optionVertical`,
  `.quizContainer__input:focus`'s ring). The one non-token literal reused (`#2563eb` focus outline)
  matches the file's existing radio-input `:has()` rule verbatim. Zero new hex colors, zero
  thumbnail/preview rules.
- **`app/components/quiz/QuizPartRenderer.tsx`** — new `case "file_multi":` branch: additive/deduped
  file picking (union with prior state, dedup by name+size), per-file async upload state
  (`uploading`/`uploaded`/`failed`), client-side size pre-checks before POSTing, verbatim UI-SPEC
  error copy for all five states (wrong type, per-file too large, total exceeded, upload
  failed+Retry, required-but-empty), and the full a11y contract (keyboard-reachable hidden input,
  `aria-live="polite"` list, `role="alert"` errors, `aria-hidden` status icons with visually-hidden
  text siblings). A dedicated `useEffect` is the single place tokens ever reach `answers` — it
  derives each file_multi question's token array from only its `"uploaded"` entries and calls
  `onAnswerChange` only when that array actually changed.
- **`tests/quiz-file-upload-dom.test.ts`** (new, 14 cases) — renders the real `itemsForPart(QUIZ_PARTS, 6)`
  through the real `QuizPartRenderer` with `fetch` mocked. Covers: empty state, a successful upload
  writing exactly one token, an in-flight upload writing none, 415/413(File too large)/413(Total
  exceeded)/500 responses rendering the exact verbatim UI-SPEC strings (with client-interpolated
  filename and `⚠` prefix), a 500 case's working Retry control (re-POSTs and succeeds), removal
  dropping both row and token, picking twice appending with name+size dedup, and the full a11y
  contract (`aria-live`, `role="alert"`, visually-hidden status text).
- **`tests/quiz-schema-type-guarantees.test.ts`** — updated the showIf-count assertion (3 → 5,
  since `testing_files` and `testing_upload_requirements` are now also gated on `testing_status`),
  added assertions for `testing_files`'s shape, the exactly-one-info-item invariant, and a
  no-`{N}`/`{M}`-placeholder guard over `questions.ts`'s shipped copy.
- **`tests/quiz-part-renderer-dom.test.ts`** — updated the one pre-existing Part 7 `isPartComplete`
  case that assumed the three text fields alone completed the part; `testing_files` is now a fifth
  required `had_testing`-gated field, so that case now asserts incomplete until a token is present.
- Full suite grew from the 506/34 baseline to **525/35**, typecheck clean, `npm run build` clean.
  `tests/quiz-part-renderer-no-literals.test.ts` stays green — no question-ID literal added.
  `git diff app/components/quiz/QuizPartRenderer.tsx` shows zero hunks inside `isPartComplete`,
  `isGateItem`, or `isRevealItem`.

## Task Commits

1. **Task 1: Append testing_files and the upload-requirements info block to Part 7** — `5d344e6` (feat)
2. **Task 2: Build the .fileUpload class family from existing tokens** — `e874d6e` (feat)
3. **Task 3: Implement the file_multi render branch and cover the gate rule in the DOM** — `006dd5d` (feat)

**Plan metadata:** (this commit, pending) `docs: complete 04-16 plan`

## Files Created/Modified

- `app/lib/quiz/questions.ts` — testing_files + testing_upload_requirements appended to Part 7
- `app/styles/quiz.module.css` — `.fileUpload*` class family
- `app/components/quiz/QuizPartRenderer.tsx` — file_multi render branch
- `tests/quiz-file-upload-dom.test.ts` — new, 14 DOM cases
- `tests/quiz-schema-type-guarantees.test.ts` — updated Part 7 assertions
- `tests/quiz-part-renderer-dom.test.ts` — updated one downstream `isPartComplete` case

## Decisions Made

See `key-decisions` in frontmatter. Summary: widened `PART7_ALLERGY_TESTING`'s type to hold the new
info block; approximated the UI-SPEC's "attempts Next with zero files" trigger as an on-blur check
on the file input itself (since `QuizContainer.tsx`'s real Next button is out of this plan's
scope — flagged explicitly as an interpretation, not a literal wiring); scoped Retry to only the
generic network/server-error failure class; imported the ratified size caps from
`upload-validation.ts` rather than redeclaring them; and used single-quoted `fill='none'` SVG
attributes (matching the existing `InfoBlockCard` icon's workaround) to avoid colliding with the
no-literals guard's quoted `"none"` needle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `tests/quiz-part-renderer-dom.test.ts`'s existing Part 7 `isPartComplete` case broke as a direct, expected consequence of Task 1's schema change.**
- **Found during:** Task 3's full-suite verification run.
- **Issue:** a pre-existing test (from plan 04-07) asserted `isPartComplete` was `true` once
  `testing_year`/`testing_location`/`testing_allergens` were filled. Task 1 added `testing_files`
  as a fifth required `had_testing`-gated field, so that assertion became false.
- **Fix:** split the case into two — one asserting incomplete with the three text fields alone
  filled but `testing_files` still empty, one asserting complete once `testing_files` also carries
  a token.
- **Files modified:** `tests/quiz-part-renderer-dom.test.ts`
- **Commit:** `006dd5d`

**2. [Rule 1 - Bug] A literal `"none"` needle collision from SVG `fill="none"` attributes.**
- **Found during:** Task 3's verification run against `tests/quiz-part-renderer-no-literals.test.ts`.
- **Issue:** the new status-icon and dropzone-icon SVGs used double-quoted `fill="none"`, which
  matched the no-literals guard's quoted `"none"` option-value needle (a false positive against an
  unrelated SVG attribute, the exact collision the file's own header comment warns about).
- **Fix:** switched to single-quoted `fill='none'`, matching the existing `InfoBlockCard` icon's
  established workaround for the identical collision.
- **Files modified:** `app/components/quiz/QuizPartRenderer.tsx`
- **Commit:** `006dd5d`

**3. [Rule 1 - Bug] My own new test in `quiz-schema-type-guarantees.test.ts` initially failed against my own doc comment.**
- **Found during:** Task 1's verification run.
- **Issue:** a code comment I wrote in `questions.ts` (documenting the caps) contained the literal
  substring `{N}/{M}`, which the new no-placeholder guard correctly flagged (the guard scans the
  whole file, including comments, by design — a placeholder reaching a patient is the DEF-04
  defect class regardless of whether it originates in a comment or shipped copy).
- **Fix:** reworded the comment to avoid the literal substring.
- **Files modified:** `app/lib/quiz/questions.ts`
- **Commit:** `5d344e6`

No other deviations. Rules 2/3/4 were not triggered.

## Known Stubs

None. Every code path renders real, wired behavior — the widget POSTs to the real
`/api/quiz/upload` route (plan 04-13), and no data is hardcoded/mocked in production code (mocking
exists only inside the DOM test file, at the `fetch` boundary).

## Issues Encountered

- React StrictMode / updater-function purity: initially considered calling `onAnswerChange` from
  inside a `setState` functional updater (to safely merge concurrent async upload completions).
  Moved all `onAnswerChange` calls into a dedicated `useEffect` reacting to the local file-entry
  state instead, keeping the `setState` updaters pure and side-effect-free — the standard React
  pattern, and the one that makes the sync logic trivially testable independent of upload timing.
- The DOM test harness initially used a fully static `answers` prop across a multi-step
  (upload-then-remove) test, which cannot detect a second transition back down to zero tokens
  (the sync effect diffs against the current `answers` prop, which never updated in that harness).
  Added a small `ControlledPart7` wrapper that feeds `onAnswerChange` calls back into `answers`,
  mirroring how `QuizContainer.tsx` actually drives the renderer in production, and used it for the
  one test that needed a faithful multi-step lifecycle.

`npm run typecheck`, `npm run build`, and the full `npm test` suite (525/35) all passed cleanly on
the final run.

## User Setup Required

None. This plan is pure client code — no new environment variables, no new infrastructure, no
deploy required to verify locally.

## Next Phase Readiness

- `testing_files` tokens now flow from a successful `POST /api/quiz/upload` into `answers` exactly
  like every other question's answer — plan 04-17's promotion step can rely on
  `answers.testing_files` (a `string[]` of opaque tokens) being present on the submitted payload
  whenever a patient completed the `had_testing` branch.
- **`public/quiz-bundle.js` was deliberately NOT rebuilt** — plan 04-18 owns the next rebuild and
  its freshness-marker extension; this plan's three commits (schema, CSS, renderer) are queued for
  that rebuild.
- **TEST-04 is NOT marked complete** — per this plan's own `<verification>` section, that
  bookkeeping belongs to plan 04-19. `REQUIREMENTS.md`'s TEST-04 checkbox and traceability row are
  left untouched by this plan's final commit.
- The "required-but-empty" trigger (on-blur, not a literal Next-button click) is a design decision
  worth re-examining once `QuizContainer.tsx` is next touched — see `key-decisions` above for the
  full reasoning and the scope boundary that produced it.

---
*Phase: 04-mandatory-allergy-testing*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: app/lib/quiz/questions.ts
- FOUND: app/components/quiz/QuizPartRenderer.tsx
- FOUND: app/styles/quiz.module.css
- FOUND: tests/quiz-file-upload-dom.test.ts
- FOUND: tests/quiz-schema-type-guarantees.test.ts
- FOUND: tests/quiz-part-renderer-dom.test.ts
- FOUND: 5d344e6 (Task 1 commit)
- FOUND: e874d6e (Task 2 commit)
- FOUND: 006dd5d (Task 3 commit)
