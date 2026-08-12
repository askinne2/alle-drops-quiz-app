# Phase 5: Preliminary Score Page - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

A patient sees a clinically honest preliminary result and knows a human is reviewing it.

Phase 5 delivers, on the existing terminal `ResultsDisplay`:
- **SCORE-01** — the "Preliminary Score" retitle and the 1–2 business day clinical-review copy
- **SCORE-02** — a score ceiling derived from the scored question set rather than hardcoded
- **SCORE-03** — a colour-banded scale bar showing where the patient falls on the full range

**Read through an accessor, not a constant.** SCORE-02/03 consume a `getScoreScale()` accessor whose
Phase 5 implementation returns a code constant. Phase 5.1 swaps that implementation to a DB-backed,
admin-editable one. `ResultsDisplay` is written once and never changes again for this.

**Explicitly NOT in this phase — moved to a new Phase 5.1** (see `<deferred>`): the admin settings
page, the settings table, the public config endpoint, band versioning, the audit trail, and the
`submissions.scale_version` migration.

**Explicitly NOT in this phase at all:** the telehealth copy branch (Phase 7 depends on this page but
owns its own branch), the medical disclaimer rewrite (Phase 8 / LAUNCH-03, counsel-owned), and
purchase-prerequisite surfaces (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Score-scale storage and the William blocker

- **D-01: The score scale becomes admin-editable from the embedded Shopify app, not a code constant
  and not a theme app block setting.** Andrew chose this over both cheaper options after seeing their
  costs. The theme-block channel already exists (`consult_redirect_url`, `tn_product_handle`,
  `enable_test_mode` all flow Liquid → iframe query params) and was declined because clinical
  boundaries in an unvalidated free-text theme field carry no audit trail.

- **D-02: ~~Both the visual band stops AND the clinical brackets are editable.~~ CORRECTED 2026-08-12
  — the clinical brackets are NOT editable.** Andrew reversed this during `/gsd:discuss-phase 5.1`,
  before any of it was planned or built: "the clinical bracket should be set in stone... I thought I
  was changing the way the 0 to 60 scores map to the Bracket." Only the *colour band stops* are
  configurable. `SCORE_BRACKETS` (`app/lib/quiz/scoring.ts:4-8`) comes from the AOD medical director
  and stays a code constant.

  **Everything below this line is superseded.** `scale_version`, `changed_by` / `changed_at`, the
  `submissions.scale_version` column, and the PHI-path classification all existed solely to keep a
  stored `score_bracket` interpretable after its boundaries moved. Boundaries don't move, so none of
  it is needed. The colour bar is display-only — rendered from the raw score at
  `ResultsDisplay.tsx:70`, never persisted, absent from the PDF (`pdf.ts:83` prints the bracket
  label, not the bar) — so retuning colours cannot make an older row harder to read. Phase 5.1 and
  SCALE-01..04 were deleted the same day; see `.planning/REQUIREMENTS.md` §"Removed Requirements".

  D-01 (settings belong in the embedded app, not a theme-block field) survives as reasoning but has
  nothing left to apply to. D-05, D-06, D-07 and D-08 are unaffected — they describe what Phase 5
  actually shipped. Retained verbatim below for the record:

  - This was the expensive branch and was chosen deliberately. Consequences that are therefore
    **mandatory, not optional**:
    - a `scale_version` integer incremented on every edit
    - `changed_by` (Shopify user id) and `changed_at` on the settings row
    - a new `submissions.scale_version` column, so a 2027 row remains interpretable against the band
      set that actually produced it
    - This makes the settings work a **PHI-path change** under CLAUDE.md's PR-review rule, because it
      adds a column to the `submissions` table and changes how `score_bracket` is derived.

- **D-03: Split across two phases.** Phase 5 ships SCORE-01/02/03 against `getScoreScale()` backed by
  a constant (~1 day, unblocked). New **Phase 5.1** swaps the accessor to DB-backed and adds the
  admin form, versioning, audit trail, config endpoint, and migration (~2–3 days). Rejected:
  absorbing it all into one Phase 5 (holds two cheap unblocked fixes behind a migration and a PHI-path
  review), and building 5.1 first (front-loads the slowest work while the misleading page stays live).

- **D-04 (consequence, record it): William's score-scale decision drops from a code blocker to a
  go-live configuration item.** SCORE-02 and SCORE-03 are currently marked
  `Blocked (William — score scale)` in `REQUIREMENTS.md:294-295`. Under D-01..D-03 they are no longer
  code-blocked: Phase 5 ships a provisional, defensible default and William retunes it himself in
  5.1 without a deploy. **The provisional default must be visibly flagged as provisional and confirmed
  by William before go-live** — this is a real remaining obligation, not a closed one.

### What the bar measures

- **D-05: The bar is a true linear 0–60 scale, and colour stops are decoupled from clinical
  brackets.** Position means what it says. This is the payoff of D-01/D-02: colour stops and clinical
  brackets become two independent tunables rather than one conflated setting.

  Rejected: bracket-driven colour (`7+` spans 54 of 60 points, so 90% of the bar renders red and a
  patient scoring 7/60 sits deep in it — the exact outcome `ROADMAP.md:604-608` calls "clinically
  misleading"), and bracket-proportional thirds (a patient at 7 and one at 58 would occupy the same
  visual third at wildly different severities; it stops being a scale, and SCORE-03 says "where the
  patient falls on the full range").

- **D-06: The bar and the clinical message are labelled as two different axes.** The bar is labelled
  as **symptom burden** across the full range; the recommendation sits under a separate **"What this
  means for you"** heading. A low burden score can still warrant treatment, and this makes that
  legible rather than self-contradictory. Without it, a patient scoring 7 reads a green bar directly
  above "Sublingual Immunotherapy May Significantly Help You."

- **D-07: The band table supports an arbitrary number of zones (N), not a fixed 3 or 4.** Three-vs-four
  stops being a code decision and becomes something William sets. This requires the four hardcoded
  legacy classes to be replaced by a small tone scale driven by a data attribute
  (`.scaleBar__zone[data-tone="..."]`). `quizResults__severityValue{Minimal,Mild,Moderate,Severe}`
  all retire together — including the orphaned `Moderate`. This deliberately does not follow the
  session-9 re-application of the legacy four-band classes, per `ROADMAP.md:498-499`'s instruction
  that it is "part of what needs deciding, not a precedent to follow."

### SCORE-01 copy

- **D-08: The `Symptom Score: 7+` chip is retired.** With the bar reading "7 of 60" and the three band
  headings already stating the bracket in plain clinical language, a bare `7+` alongside `7 of 60`
  reads as two different numbers for the same thing. The Symptom Profile ID already covers the support
  case where a patient needs to quote something to staff.

- **D-09: Copy changes are the structural minimum.** Changed: the `h2` → "Preliminary Score"; the
  subtitle → the mandated 1–2 business day sentence; two new axis labels ("Symptom burden", "What this
  means for you"); the chip removed. **Left verbatim: the three band explanations (h3 + body) and the
  disclaimer paragraph.** Both are clinically approved copy; editing them without William is its own
  risk, and the disclaimer is counsel-owned under Phase 8 / LAUNCH-03.

- **D-10 (verify, do not assume): `DEC-no-approval-promise-copy` appears already satisfied.** Reading
  the three current band messages in `ResultsDisplay.tsx:102-142`, none promises the patient can
  purchase if approved. Planning should **confirm this by inspection rather than schedule a rewrite**.

### Claude's Discretion

- The exact provisional band stop values shipped in Phase 5's constant. They must be defensible and
  visibly marked provisional, but no specific numbers were locked in discussion. The `0-14 / 15-29 /
  30-60` split used in the discussion previews is illustrative, not a decision.
- The tone-scale naming (`low` / `mid` / `high` vs other labels) and the corresponding CSS tokens.
- Whether the derived ceiling is computed at module load or memoized.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The blocked client decision this phase routes around
- `.planning/ROADMAP.md` §"Blocked on Client Decisions" item 1 (lines ~600-612) — the three
  incompatible range models, the exact three sub-questions owed to William, and the warning that
  bracket-driven colour puts nearly every patient deep in the red. **D-05 is the direct answer to
  sub-question (c).**
- `.planning/ROADMAP.md` §"Phase 5: Preliminary Score Page" (lines ~486-499) — goal, the four success
  criteria, the "split this phase when planning" instruction, and the session-9 legacy-class warning.
- `.planning/REQUIREMENTS.md:155-163` — SCORE-01, SCORE-02, SCORE-03 verbatim.
- `.planning/REQUIREMENTS.md:293-295` — the traceability rows currently marked
  `Blocked (William — score scale)`. **D-04 changes what "blocked" means for these two; update the
  rows rather than leaving them stale.**

### Prior-phase locks this phase must not violate
- `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md` §D-09 and the flow diagram (~line 221)
  — consent sits between the testing step and the results page; the Preliminary Score is **terminal**.
- `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md:360, 397-398, 424` — `ResultsDisplay`
  lost all three callback props under TEST-05. Every exit is a plain `<a>` or a `navigateParent()`
  call. **Phase 5 must not reintroduce a callback prop.**
- `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md:482-484` — SCORE-01 was offered as a
  Phase 4 pull-forward and explicitly declined; it stays here.
- `CLAUDE.md` §"Self-review checklist for PHI-handling changes" — governs Phase 5.1's
  `submissions.scale_version` migration and the settings endpoint.

### Code the phase changes
- `app/components/quiz/ResultsDisplay.tsx` — the whole surface. Title/subtitle at :80-81, the chip at
  :90-99, the three band messages at :102-142, the disclaimer at :212-216.
- `app/lib/quiz/scoring.ts:4-8` — `SCORE_BRACKETS`, the clinical boundaries D-02 makes editable.
- `app/lib/quiz/scoring.ts:81-85` — `getScoreBracket`, whose output is persisted.
- `app/lib/quiz/payload.ts:101,110` — where the bracket is written into `score_bracket` on the
  submission. **This is why D-02 requires versioning.**
- `app/styles/quiz.module.css:990-1005` — the four legacy `quizResults__severityValue*` classes that
  D-07 retires.

### No external specs
No ADRs or external design docs exist for this phase. The score-scale semantics live only in
ROADMAP.md's blocked-decisions section and in the code itself.

</canonical_refs>

<code_context>
## Existing Code Insights

### Measured facts — do not re-derive, and do not trust folklore over these

| Fact | Value | Where |
|---|---|---|
| Theoretical max from `ALL_SCORED_QUESTIONS` | **exactly 60** | measured 2026-08-11 by summing per-question maxima |
| Scored questions / of which contribute points | 19 / **16** | same |
| So SCORE-02's derived ceiling renders | **0–60** | the "0–60 folklore" is real and derivable — this is not a deprecated invention |
| `7+` therefore spans | **54 of 60 points = 90% of the bar** | this is the whole reason D-05 exists |
| Legacy colour classes in CSS | **four** (Minimal/Mild/Moderate/Severe) | `quiz.module.css:990-1005` |
| Classes `ResultsDisplay` actually uses | **three** — `Moderate` is orphaned | `ResultsDisplay.tsx:92-98` |
| 1–2 business day copy | **does not exist anywhere yet** | grep of `ResultsDisplay.tsx` |

Per-question maxima that sum to 60: `symptoms_nasal` 5, `symptoms_eye` 4, `symptoms_sinus` 3,
`timing_season` 5, `timing_triggers` 5, five `severity_0_3` questions at 3 each (15), four
`frequency_0_4` questions at 4 each (16), `bother_overall` 4, `med_control` 3.

Note `radio_multi` is **multi-select** (`types.ts:8` — "Select one or more from list"), so
`timing_season`'s max is 5, not 1. Do not read the name as single-select.

### Reusable Assets
- **The theme app block config channel** — `extensions/quiz-block/blocks/*.liquid` already passes
  merchant settings to the iframe as query params via `_embed_src`. Phase 5.1 chose a DB-backed API
  instead, but this channel is the working precedent for how runtime config reaches the quiz.
- **`getRedirectTarget` / `getProductHandle`** — the established "read `window.AlleDropsQuizConfig`,
  fall back to a module constant" pattern (`ResultsDisplay.tsx:23-37`). `getScoreScale()` should
  follow the same fallback shape.
- **`calculateTotalScore(questions, answers)`** takes an explicit question list, so the derived
  ceiling can be computed from the same `ALL_SCORED_QUESTIONS` array with no new plumbing.

### Established Patterns
- **`ResultsDisplay` is terminal.** No callback props (TEST-05). Exits are `<a href>` or
  `navigateParent()`. Phase 5 adds display only.
- **Committed build artifact.** `public/quiz-bundle.js` is committed and must be rebuilt in the same
  commit as any component change, with `tests/quiz-bundle-freshness.test.ts` markers added for the new
  content. Phases 4, 4.1, and 4.2 all did this; skipping it ships an invisible no-op.
- **Served-bytes verification, never exit codes.** Count with `split(needle).length - 1`, never
  `grep -c` — the bundle is one line.

### Integration Points
- `QuizContainer.tsx:203,260,601` compute the bracket via `getScoreBracket(s)` in three places, and
  `payload.ts:101` recomputes it as a fallback. **Phase 5.1's editable brackets must reach all four
  call sites consistently, or a resumed submission could be bracketed under a different band set than
  the one displayed.**
- Phase 5.1's config fetch happens on a **PHI-collecting page**. It is same-origin from the iframe
  (both on `alle-drops-quiz-app.fly.dev`), so no CORS or third-party-script concern arises — but a
  fetch failure must fall back to the compiled-in constant rather than blocking or mis-bracketing.
- Phase 7 (telehealth) depends on this page's copy branch. Phase 5 should leave the recommendation
  block structured so a fourth branch can be added without restructuring.

</code_context>

<specifics>
## Specific Ideas

- **The two-axis layout Andrew selected**, verbatim from the chosen preview:

  ```
  Symptom burden          7 of 60
  |==@=|========|===================|
    low      moderate        high

  --------------------------------------
  What this means for you

  "Sublingual immunotherapy may
   significantly help you."
  ```

- **The band table shape Andrew selected**, illustrative of structure rather than final values:

  ```
  bands: [
    { upTo: 14, tone: "low"  },
    { upTo: 29, tone: "mid"  },
    { upTo: 60, tone: "high" },
  ]
  // William adds a 4th row -> 4 zones render.

  .scaleBar__zone[data-tone="low"]  { ... }
  ```

- **The Phase 5 / 5.1 split Andrew selected**, as the boundary to plan against:

  ```
  PHASE 5  (~1 day, unblocked)
    SCORE-01  retitle + review copy
    SCORE-02  derived ceiling (60)
    SCORE-03  bar reads getScoreScale() -> returns the constant

  PHASE 5.1  (~2-3 days)
    settings table + audit cols
    app/routes/app.settings.tsx      (admin form)
    api.quiz.config.tsx              (public GET)
    getScoreScale() -> reads DB, falls back to the same constant
    submissions.scale_version migration
  ```

</specifics>

<deferred>
## Deferred Ideas

- **~~Phase 5.1 — admin-configurable score scale.~~ CANCELLED 2026-08-12 — do not build this.** It got
  its roadmap entry and requirement IDs (SCALE-01..04) on 2026-08-11, then both were deleted the next
  day during `/gsd:discuss-phase 5.1` when Andrew corrected D-02: the clinical brackets are fixed, not
  tunable. No settings table, no `app.settings.tsx`, no `api.quiz.config.tsx`, no
  `submissions.scale_version` migration, no DB-backed `getScoreScale()`, no PHI-path change. See the
  D-02 correction above and `.planning/REQUIREMENTS.md` §"Removed Requirements". **`getScoreScale()`
  keeps returning the compiled-in constant** — its docstring at `score-scale.ts:38-42` still promises a
  Phase 5.1 swap and is now stale.

- **Admin-editable patient-facing clinical copy** — offered as the third option when scoping what the
  settings page controls, and **not selected**. It would put counsel-owned wording in a form with no
  review gate, which is what `CONSENT_VERSION` discipline exists to prevent. If AOD ever wants it, it
  is its own phase with its own versioning.

- **Rewording the three clinical band headings** — offered under D-09 and declined in favour of the
  structural minimum. If William later wants them reframed as recommendations under the new "What this
  means for you" heading, that is a copy change requiring his sign-off, not a Phase 5 task.

- **Rewriting the disclaimer paragraph** — belongs to Phase 8 / LAUNCH-03, counsel-owned. Explicitly
  out of scope for Phase 5 so it is not front-run.

- **Retuning provisional band values** — Phase 5 ships defaults marked provisional. William confirms
  or changes them, ideally through Phase 5.1's admin form rather than a code change. **This remains an
  open obligation before go-live** (see D-04).

</deferred>

---

*Phase: 5-preliminary-score-page*
*Context gathered: 2026-08-11*
