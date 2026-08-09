# Phase 3: Mandatory Medical History - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 3-Mandatory Medical History
**Areas discussed:** The two old history columns, Required free-text vs abandonment, The 7+ flow during the Phase 3/4 gap, DIAG-01 and William's truncated label

---

## The two old history columns

### Q1 — Does the submissions table hold any real patient rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Test data only | No real patient has completed the quiz yet; column story can change freely | ✓ |
| Some real rows exist | Migration must preserve readability of existing rows | |
| Not sure — check first | Count rows via `fly ssh console` before deciding | |

**User's choice:** Test data only
**Notes:** Load-bearing for the next answer. Consistent with Phase 8 still holding NPP, BAA chain, and workforce HIPAA training as pre-first-patient blockers. CONTEXT.md D-01 flags that if this turns out false, the decision does not survive contact.

### Q2 — What happens to `personal_history_json` / `family_history_json`?

| Option | Description | Selected |
|--------|-------------|----------|
| Stop writing, keep the columns (recommended) | Smallest blast radius; no migration, no PHI-path schema change | |
| Stop writing AND drop the columns | Cleanest end state; destructive change to a PHI table, needs backup + own review | ✓ |
| Keep writing them from the new checklist | Preserves anything reading them; duplicates PHI in two places | |

**User's choice:** Stop writing AND drop the columns — chose the more thorough option over the recommendation
**Notes:** Claude attached three non-negotiable conditions in CONTEXT.md D-01: named pre-migration backup with recorded ID, standalone migration file and commit, dev database only.

### Q3 — PDF and admin modal label rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Add a label map (recommended) | One id→label lookup in `format.ts` with `capitalize()` fallback | ✓ |
| Name IDs so `capitalize()` reads acceptably | Literally no new plumbing; constrains naming, cannot punctuate | |
| Reuse `question.text` as the label | No map to maintain; full question wording may be long for a PDF row | |

**User's choice:** Add a label map
**Notes:** Accepted as slightly exceeding HIST-05's "no new plumbing" wording. Unmapped keys keep today's behavior, so no existing row can regress.

---

## Required free-text vs abandonment

### Q1 — How does a patient with no surgeries/allergies/conditions get past HIST-03?

| Option | Description | Selected |
|--------|-------------|----------|
| "None" checkbox per field (recommended) | `showIf` + `required: false`; record distinguishes "stated none" from "typed n/a" | ✓ |
| Accept any non-empty text | Zero new mechanism; fills the clinical record with unqueryable free text | |
| One "none" checkbox covering all three | Fastest; collapses three clinically distinct answers into one | |

**User's choice:** "None" checkbox per field
**Notes:** Abandonment is the milestone's named headline risk — one click beats three typed words.

### Q2 — Is HIST-02's medications field the same as Part 5's `med_list`?

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct — keep both | Different clinical purposes and reveal conditions; risk of overlapping typed answers | ✓ |
| Same field — move it to medical history | One place to look; removes the Part 5 pair Phase 2 built its showIf proof around | |
| Ask William | Bundle with the DIAG-01 question rather than guessing | |

**User's choice:** Distinct — keep both
**Notes:** HIST-02's reveal is the named consumer of Phase 2's `isAnswered` operator — explicitly not `equals`, since "including none of the above" is the case `equals` cannot express.

### Q3 — How is HIST-04's clinic name and address captured?

| Option | Description | Selected |
|--------|-------------|----------|
| Two required text fields (recommended) | Structured; address independently readable if the clinic must be contacted | ✓ |
| One combined text field | Fewer fields, one answer key, unparseable later | |
| Two fields, address optional | Lowest friction; patient may not know the address from memory | |

**User's choice:** Two required text fields

---

## The 7+ flow during the Phase 3/4 gap

### Q1 — Does Phase 3 deploy on its own?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship Phase 3 alone (recommended) | Matches Phases 1 and 2; per-phase UAT has caught three defects a green suite missed | ✓ |
| Hold until Phase 4 | One deploy, no interim state; costs the per-phase UAT signal | |
| Ship behind Test Mode | WR-13 means `?test=1` enables Test Mode regardless of the merchant checkbox — flag not trustworthy | |

**User's choice:** Ship Phase 3 alone

### Q2 — Does the 0–2 bracket now fill medical history?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — all brackets, no exception (recommended) | HIST-05's "100%" means 100%; one flow to test and reason about | ✓ |
| Skip medical history for 0–2 | Faster for a patient being routed away; contradicts HIST-05 and creates a second flow | |
| Ask William | Clinical call, not engineering | |

**User's choice:** Yes — all brackets, no exception
**Notes:** Auto-submit for 0–2 moves from after Part 5 to after the medical-history part; `autoSubmit0to2Attempted` guarding needs re-checking.

### Q3 — What happens to the 7+ "Proceed Without Testing" chain? (asked twice)

**First pass — user's free-text response:** *"I think there was a note on this that we would want them to upload test results or skip to the allergy testing page."*

Claude corrected two points before re-asking:
- TEST-04 explicitly forbids upload ("no file input, multipart parsing, object storage, or upload column introduced") — the specified path is email to `testing@alledrops.com`, and that address is itself blocked on the unresolved domain spelling
- "Skip to allergy testing" already exists and is live — `handleTestFirst` submits then redirects the parent to `testOptions`; unaffected by Phase 3
- The structured two-option testing split is Phase 4 (TEST-01…TEST-04), and TEST-05 says the bypass deletions must land after HIST-05

**Second pass — user's free-text response:** *"We need to make upload a possibility. They need to be able to upload results directly in the quiz. that will be associated with the patient file. or they go direct to allergy testing"*

Claude flagged three constraints rather than proceeding silently: uploaded results are PHI in a file requiring BAA-covered object storage (Fly's BAA is an unstarted sales conversation); the work is phase-sized, not task-sized; and it belongs with the testing split either way, not with medical history.

**Third pass — structured re-ask, two questions:**

| Option (upload scope) | Description | Selected |
|--------|-------------|----------|
| New phase, after Phase 4 (recommended) | Keeps Phase 4 shippable while Fly BAA and GCP cutover are open | |
| Expand Phase 4 to include upload | One coherent testing experience; Phase 4 becomes blocked on the BAA and storage decision | ✓ |
| Email now, upload later — decide after William | Storage lives in AOD's account under their BAA; their compliance exposure | |

| Option (Phase 3 bypass) | Description | Selected |
|--------|-------------|----------|
| Delete the 7+ bypass in Phase 3 (recommended) | Only exit becomes the live "I need testing first" button; splits TEST-05 across two phases | ✓ |
| Delete both bypasses in Phase 3 | No patient can reach purchase without testing after Phase 3; front-loads Phase 4's riskiest deletion | |
| Point it at consent, delete in Phase 4 | Minimum Phase 3; bypass survives one more phase as the roadmap sequenced it | |

**User's choice:** Expand Phase 4 to include upload; delete the 7+ bypass in Phase 3
**Notes:** This is a requirement reversal, recorded in CONTEXT.md `<deferred>` with the ROADMAP/REQUIREMENTS edits it forces. Andrew was given the constraints and reaffirmed — treated as his decision.

---

## DIAG-01 and William's truncated label

### Q1 — DIAG-01 scope

| Option | Description | Selected |
|--------|-------------|----------|
| Build both, they're distinct (recommended) | Comorbidity list vs "has a clinician diagnosed you"; different questions, different answers | ✓ |
| Defer DIAG-01 to its own mini-phase | Phase 3 unblocked and smaller; one question needs its own planning cycle | |
| Block Phase 3 until William answers | Roadmap's literal instruction; William has a history of slow turnaround | |

**User's choice:** Build both, they're distinct
**Notes:** Same judgment as the two medication fields. Confirmation folded into the consolidated William message rather than blocking.

### Q2 — HIST-03's truncated third label

| Option | Description | Selected |
|--------|-------------|----------|
| Build on the probable wording (recommended) | "Please list any other medical conditions that you have."; one-line change if corrected | ✓ |
| Neutral placeholder until confirmed | Nobody mistakes unconfirmed copy for approved copy | |
| Block on William | Highest fidelity; blocks a phase on one sentence | |

**User's choice:** Build on the probable wording
**Notes:** To be marked as unconfirmed clinical copy in a code comment.

### Q3 — Consolidated William message

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — draft it after CONTEXT.md (recommended) | One Missive draft covering all five open items | ✓ |
| Not yet — just capture in CONTEXT.md | Handle outreach separately on Andrew's timing | |

**User's choice:** Yes — draft after CONTEXT.md

---

## Closing check

Offered three further gray areas: DOM test infrastructure, six-part progress-indicator wording, and DIAG-01's physical placement. User selected "I'm ready for context." The first is recorded as a standing risk in CONTEXT.md `<code_context>`; the other two fall to Claude's discretion.

---

## Claude's Discretion

- Question IDs, `order` values, part number for the new section
- Whether the section is a sixth `QUIZ_PARTS` entry or a restructure
- DIAG-01's physical placement — "adjacent to" the Part 5 medication questions, not necessarily inside Part 5
- Gate-question type for the three HIST-03 pairs (`yesno` vs single checkbox)
- Progress-indicator wording and section heading for six parts
- Test structure and placement
- Commit decomposition — except the D-01 migration, which is its own commit

## Deferred Ideas

- **Test-result upload** — requirement reversal of TEST-04, folded into Phase 4. Forces ROADMAP and REQUIREMENTS edits and creates two hard prerequisites: the Fly.io BAA and the AOD GCP cutover.
- **The 3–6 "Continue to Purchase AlleDrops" jump** — Phase 4 (rest of TEST-05)
- **Stripping the four callback props off `ResultsDisplay`** — Phase 4 (TEST-05)
- **DOM test infrastructure** — declined in Phase 2 on two data points; there are now three. Needs an explicit decision in the Phase 3 plan.
- **Progress-indicator and section-heading copy** — if it needs real clinical copy, belongs with Phase 5's score-page work
