# Phase 4: Mandatory Allergy Testing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 04-mandatory-allergy-testing
**Areas discussed:** Upload scope, Where the testing step lives, Consent + terminal results, TEST-06 storefront copy

---

## Upload scope

### Q1 — Phase boundary for test-result upload

| Option | Description | Selected |
|--------|-------------|----------|
| Split it out (Recommended) | Phase 4 ships testing split + deletions email-only (~1 day, unblocked). Upload becomes its own phase gated on Fly BAA + AOD GCP cutover. | |
| Keep upload inside Phase 4 | Phase 4 does not ship until upload works. Blocked on William → pricing → Fly BAA → AOD GCP cutover. | ✓ |
| Drop upload, keep email | Honor `DEC-testing-results-by-email-not-upload` as written. No upload phase ever. | |

**User's choice:** Keep upload inside Phase 4.
**Notes:** The cost was stated before the choice — the unblocked ~1 day of testing-split work now
waits behind three client-side blockers. Andrew reaffirmed. Not to be re-litigated.

### Q2 — Is upload required to continue?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional — upload OR email (Recommended) | Attach now or email later; both paths recorded. Preserves an escape on the milestone's highest-abandonment step. | |
| Required — must upload to continue | No path past the testing step without a file. | ✓ |
| Required, with an explicit "I'll email it" escape | Upload primary, email intent recorded as a secondary option. | |

**User's choice:** Required.
**Notes:** Surfaced a useful side effect — with no `testing@…` address in the copy, TEST-04's
dependency on the unresolved domain spelling disappears. Accepted cost: a hard abandonment point on
a flow that persists nothing until the terminal POST.

### Q3 — Acceptable file types

| Option | Description | Selected |
|--------|-------------|----------|
| PDF + phone photos (Recommended) | PDF, JPEG, PNG, HEIC. Single file. | |
| PDF only | Smallest surface, most patient friction. | |
| PDF + photos, multiple files | Same formats, patient may attach several. File-list UI, per-file and total caps, one-to-many relation. | ✓ |

**User's choice:** PDF + photos, multiple files.
**Notes:** Matches the real case — a multi-page paper allergy panel is genuinely 3–4 phone photos.

### Q4 — Who can retrieve an uploaded file

| Option | Description | Selected |
|--------|-------------|----------|
| Admin only (Recommended) | One ownership-bounded endpoint, one access-log surface, smallest PHI egress. | |
| Admin + patient ledger | Adds `/api/me/*` and the `quiz-history` extension. | |
| Admin download + inline in the clinical PDF | Adds PDF embedding — new dependency, local-assets-only constraint. | |

**User's choice:** *(freeform)* "admin + patient + inline in the clinical PDF please" — all three.
**Notes:** Andrew asked for the question to be re-presented before answering. Two consequences named
at the time: the broken `quiz-history` extension becomes a hard prerequisite, and PDF embedding is
new capability requiring a dependency vetted against `CLAUDE.md`'s no-remote-assets rule.

---

## Where the testing step lives

### Q1 — Structural placement

| Option | Description | Selected |
|--------|-------------|----------|
| A 7th part in QUIZ_PARTS (Recommended) | Zero new mechanism. `showIf` + `required` + `isPartComplete` do everything. | ✓ |
| A dedicated FlowStep before outcome | Own render branch and completeness logic — the shape Phase 3 just deleted. | |
| You decide | Let the planner pick once the upload UI is designed. | |

**User's choice:** A 7th part in `QUIZ_PARTS`.
**Notes:** Left open for the planner — whether a multi-file picker fits `QuizPartRenderer`'s
question-card model or needs a new `QuizItem` union member.

### Q2 — When the "I need allergy testing" navigation happens

| Option | Description | Selected |
|--------|-------------|----------|
| Finish the flow, link on results (Recommended) | Continue through consent to the score; testing link is the results CTA. | ✓ |
| Submit and navigate immediately | Ends the quiz at the testing step. Skips consent and the score page. | |
| Show the score, then navigate | Auto-redirect after acknowledgment. | |

**User's choice:** Finish the flow, link on results.
**Notes:** Noted at the time that this stays compatible with TEST-05's terminal `ResultsDisplay` —
the CTA is a plain `<a href>` on the existing anchor interceptor, not a callback prop.

### Q3 — What stops a patient dodging the required upload via the other branch

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — it's the honor system (Recommended) | Consistent with `DEC-purchase-gating-is-honor-system`. That patient isn't purchasing today. | |
| Record the branch on the submission | Same, plus `testing_status` visible in admin and PDF. | |
| Flag it for provider review | Pulls deferred Phase 2.5 capability forward. | ✓ → **reversed** |

**User's choice:** Initially "Flag it for provider review", then a follow-up bounded it to
"Read-only + a reviewed checkbox", then Andrew reversed both: *"lets go back on that last answer. we
don't want to stray from the plan."*
**Notes:** **Final state is read-only** — a filterable testing-status column derived from
`answers_json`. No `reviewed_at` column, no PATCH endpoint. `submissions` stays insert-only and the
Phase 2.5 provider-review workflow stays deferred to v2. The reversal matters: reading the option
list alone gives the wrong answer.

---

## Consent + terminal results

### Q1 — Where consent lands

| Option | Description | Selected |
|--------|-------------|----------|
| After testing, before results (Recommended) | Part 7 → consent → submit → score. One path, every bracket. | ✓ |
| Consent as Part 8 | Folded into `QUIZ_PARTS`; renders in a question card. | |
| Keep consent as its own FlowStep | Smallest diff; rewire only what precedes it. | |

**User's choice:** After testing, before results.
**Notes:** Fixes a live defect — a 0–2 patient currently auto-submits with `consent_version` stamped
without ever seeing `ConsentStep`, so TEST-07 is violated in production today. Also resolves the
`symptom_profile_id` double-submit defect in `STATE.md` §Deferred Items for free.

### Q2 — What Phase 4 leaves on the results page

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal edit + testing CTA (Recommended) | Cut the now-false clauses, add one conditional static link. No claims added. | ✓ |
| Strip to score + disclaimer only | Phase 5 writes all copy from scratch; interim page says almost nothing. | |
| Pull SCORE-01 forward into Phase 4 | Retitle + review copy here, ~30 min, crosses a phase boundary. | |

**User's choice:** Minimal edit + testing CTA.
**Notes:** SCORE-01 explicitly stays in Phase 5.

### Q3 — The `[PENDING]` placeholder in the consent document

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-block the phase gate (Recommended) | Source-text guard; Phase 4 refuses to pass while `[PENDING]` exists. Counsel owns the copy. | |
| Ship it, track as a Phase 8 exposure | Consistent with how Phase 1 handled the medical disclaimer. | |
| Placeholder-free interim copy | Rewrite the paragraph now; brushes the no-unapproved-clinical-copy constraint. | ✓ |

**User's choice:** Placeholder-free interim copy.
**Notes:** Reconciled rather than overridden — the interim text is marked UNCONFIRMED in a code
comment (Phase 3's HIST-03 convention) and goes to William/counsel for approval before go-live.
LAUNCH-03 remains the owner of the final language. Context: Phase 4 raises exposure from the 3–6
purchase path only to 100% of patients, so this phase creates the problem rather than inheriting it.

---

## TEST-06 storefront copy

### Q1 — Who applies the storefront edits and how

| Option | Description | Selected |
|--------|-------------|----------|
| Theme editor, you do it (Recommended) | Same route as the Gate D fix and Klaviyo disable. Repo untouched. | |
| Reconcile the theme repo first | Fix the drift, then commit + `shopify theme push` normally. | ✓ |
| Out of scope — move TEST-06 to Phase 8 | Phase 4 covers the quiz app only. | |

**User's choice:** Reconcile the theme repo first.
**Notes:** Closes a real compliance trap as a side effect — a push from that repo today would
re-enable Klaviyo on the PHI-collecting quiz page. Also makes Phase 1's open mobile sticky-header
item measurable for the first time.

### Q2 — Delete only, or write replacement copy

| Option | Description | Selected |
|--------|-------------|----------|
| Delete only (Recommended) | Cut the false clauses, write nothing new, verify as absence. | |
| Delete + draft replacement for William | Cut now, draft accurate copy held for his approval. | ✓ |
| Delete + you write the replacement | Andrew supplies the copy directly, no approval loop. | |

**User's choice:** Delete + draft replacement for William.
**Notes:** The draft rides along on the William message rather than shipping in Phase 4.

---

## Claude's Discretion

- Question IDs, `order` values, and part number for the testing section
- The two option labels' wording; whether Part 7 carries its own heading
- Progress-indicator wording at seven parts
- Whether the multi-file picker needs a new `QuizItem` union member — but the plan must say which
- Storage target specifics, retention/deletion policy, virus scanning, HEIC conversion approach
- The `submissions → files` relation shape
- Test structure and placement; commit decomposition (migrations excepted)

## Deferred Ideas

- **Splitting Phase 4** — offered and declined; recorded in case the blockers persist
- **Provider review-status workflow** — considered, scoped, then reversed; stays v2 / Phase 2.5
- **SCORE-01** — offered as a pull-forward and declined; stays Phase 5
- **`quiz-history` extension refactor** — now a D-05 dependency but in no phase; planner must scope
  it into Phase 4 or raise it as a fourth blocker
- **Appointly embed keep/disable decision** — Phase 8
- **Mobile sticky-header clearance** — becomes measurable once D-12 reconciles the theme repo
