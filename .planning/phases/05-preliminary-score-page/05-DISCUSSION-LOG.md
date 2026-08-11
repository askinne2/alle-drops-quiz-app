# Phase 5: Preliminary Score Page — Discussion Log

**Date:** 2026-08-11
**Mode:** default (interactive)
**Areas selected:** all four

> Human reference only. Downstream agents read `05-CONTEXT.md`, not this file.

---

## Grounding measured before questions were asked

Rather than accept the roadmap's "three incompatible range models" at face value, the scored question
set was summed directly:

- Theoretical max from `ALL_SCORED_QUESTIONS` = **exactly 60** (16 of 19 questions contribute).
- `7+` therefore spans **54 of 60 points — 90% of the bar**.
- CSS carries **four** legacy colour classes; `ResultsDisplay` uses **three**; `Moderate` is orphaned.
- The 1–2 business day copy exists **nowhere** in the component today.

This turned an abstract "three models are in play" into a concrete, checkable problem, and every
subsequent option was written against it.

---

## Area 1 — Blocked-work strategy

**First question asked:** how to shape Phase 5 around SCORE-02/03 being blocked on William.
**Outcome:** rejected by Andrew before answering, with a clarifying question instead.

**Andrew's clarification, verbatim:**

> "Is the scoring band something that we could change easily in the admin version of the Shopify app?
> that was its not hard-coded?"

**What the clarification surfaced.** Investigating it found that `getScoreBracket()` is not display
logic — its output is persisted as `score_bracket` on every submission (`payload.ts:110` →
`api.quiz.submit` → Cloud SQL) and it selects which clinical message the patient reads. That splits
the question into two things with very different risk profiles: visual band stops (safe to make
editable) and clinical brackets (not safe without versioning). The original question was reformulated
around that distinction.

**Q1 — Where should the band boundaries live?**

| Option | Cost | Selected |
|---|---|---|
| Config constant in code | ~2 min edit + normal deploy gate | |
| Theme app block setting | ~half a day; reuses the existing Liquid → iframe param channel | |
| **Admin settings page + DB** | ~1.5–2 days; nothing exists today (Prisma is SQLite with only `Session`) | ✅ |

Noted at the time: this is a new capability, not a clarification of Phase 5's scope.

**Q2 — What becomes editable?**

| Option | Selected |
|---|---|
| Visual bands only (keeps clinical brackets frozen, stays off the PHI path) | |
| **Visual bands + clinical brackets** (requires versioning, audit columns, `submissions.scale_version`) | ✅ |
| Visual bands + all patient-facing copy | |

Andrew took the expensive branch knowingly. The versioning and audit requirements are therefore
mandatory consequences, not suggestions.

**Consequence surfaced back to Andrew:** this partly dissolves the William blocker. SCORE-02/03 stop
being code-blocked; the blocker drops to a go-live configuration item.

**Q3 — Phase boundary?**

| Option | Selected |
|---|---|
| **Phase 5 + new Phase 5.1**, split at a `getScoreScale()` accessor | ✅ |
| One larger Phase 5 | |
| Phase 5.1 first, then Phase 5 | |

---

## Area 2 — What the bar measures

**Q1 — Bar geometry and what drives colour?**

| Option | Selected |
|---|---|
| **Linear 0–60, colour stops independent of clinical brackets** | ✅ |
| Linear 0–60, brackets drive colour (→ 90% red) | |
| Bracket-proportional thirds | |

This is the direct answer to the roadmap's sub-question (c) for William.

**Q2 — Reconciling the bar with the clinical message.**

Raised because the chosen model creates a visible tension: a patient scoring 7 gets a *green* bar
directly above *"Sublingual Immunotherapy May Significantly Help You."*

| Option | Selected |
|---|---|
| **Label them as two different axes** (symptom burden vs "What this means for you") | ✅ |
| Anchor stops back to brackets | |
| Neutral track, coloured marker (would need SCORE-03 reworded) | |

---

## Area 3 — Three brackets vs four bands

**Q1 — Band count and the legacy CSS classes.**

| Option | Selected |
|---|---|
| **Arbitrary N zones, tone-based data-attribute classes** | ✅ |
| Fixed three | |
| Fixed four (restore legacy) | |

Makes three-vs-four a configuration choice rather than a code choice, and retires all four legacy
`quizResults__severityValue*` classes — including the orphaned `Moderate` — as a category.

---

## Area 4 — SCORE-01 copy scope

**Q1 — The `Symptom Score: 7+` chip.**

| Option | Selected |
|---|---|
| **Retire it** | ✅ |
| Keep, reworded to plain language | |
| Keep verbatim | |

**Q2 — How far the copy edit reaches.**

Flagged before asking: reading the three current band messages, none promises purchase-if-approved, so
`DEC-no-approval-promise-copy` appears already satisfied — planning should verify by inspection rather
than schedule a rewrite.

| Option | Selected |
|---|---|
| **Structural minimum** — title, subtitle, two axis labels, chip removed; band explanations and disclaimer verbatim | ✅ |
| Minimum + reword the three band headings | |
| Full pass including the disclaimer | |

---

## Claude's discretion (recorded, not asked)

- Provisional band stop values shipped in Phase 5's constant. The `0-14 / 15-29 / 30-60` split in the
  previews is illustrative only — no numbers were locked.
- Tone-scale naming and the corresponding CSS tokens.
- Whether the derived ceiling is computed at module load or memoized.

## Deferred

- Phase 5.1 (chosen, needs a roadmap entry and requirement IDs)
- Admin-editable clinical copy (offered, declined)
- Rewording the three band headings (offered, declined — needs William)
- Disclaimer rewrite (Phase 8 / LAUNCH-03, counsel-owned)
- Confirming the provisional band values with William before go-live (open obligation)
