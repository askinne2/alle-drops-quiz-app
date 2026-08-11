---
phase: 5
slug: preliminary-score-page
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-11
---

# Phase 5 — UI Design Contract: Preliminary Score Page

> Visual and interaction contract for SCORE-01/02/03 (`05-CONTEXT.md` D-01…D-10). There is no
> RESEARCH.md for this phase; every token, class, and pattern below is derived directly from
> `app/styles/quiz.module.css` and `app/components/quiz/ResultsDisplay.tsx`, not invented.
> Design-system posture is unchanged from Phases 3/4/4.2: no Tailwind, no shadcn, no component
> library — hand-written React + CSS Modules. This is the app's **first data-driven, arbitrary-N
> visualization** (the scale bar) and its **first genuinely two-axis clinical display** (D-06) —
> both get real weight below. `ResultsDisplay` stays terminal: this phase adds display only, zero
> new callback props (`04-CONTEXT.md` D-09, reaffirmed by `05-CONTEXT.md`'s canonical refs).
>
> **Revision 1** — fixes one blocking checker finding (Dimension 2, marker clipping — see
> Component Inventory §2 and the Score Scale Data Contract) and tightens two non-blocking notes
> (zone-boundary seam contrast, Typography summary wording). No other section changed.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — shadcn gate not applicable, unchanged from Phases 3/4/4.2 (no `components.json`, no `tailwind.config.*` in the repo) |
| Preset | not applicable |
| Component library | none — hand-written React + CSS Modules only |
| Icon library | none — the new position marker is a pure-CSS circle (border + background), not an SVG icon. No new dependency, no new asset |
| Font | Unchanged — theme-inherited system font stack via `var(--font-body-family, ...)` / `var(--font-heading-family, ...)`. No remote font, no remote asset. This is a PHI-collecting surface; `CLAUDE.md` rule 4 forbids third-party scripts and this phase adds none |

---

## Spacing Scale

Unchanged from Phase 3/4/4.2 — the same 4px-multiple scale declared in `quiz.module.css:15-47`.
No new spacing token is introduced.

| Token | Mobile (< 750px) | Tablet/desktop (≥ 750px) | Usage in this phase |
|-------|-------------------|---------------------------|----------------------|
| `--quiz-spacing-xs` | 4px | 8px | Gap between axis label and score readout; gap between zone segments and their legend row |
| `--quiz-spacing-sm` | 8px | 12px | Gap between the score circle and the new scale-bar block; internal padding of the score readout row |
| `--quiz-spacing-md` | 12px | 16px | Scale-bar block vertical rhythm (axis row → track → legend); "What this means for you" section top padding |
| `--quiz-spacing-lg` | 16px | 24px | Gap between the scale-bar block and the "What this means for you" section (the D-06 axis divider) |
| `--quiz-spacing-xl` | 20px | 32px | Not newly used |
| `--quiz-spacing-xxl` | 28px | 48px | Not newly used |

**Exceptions for this phase:** none. Every new class uses only the tokens above. The bar track
itself is sized in fixed px (12px mobile / 16px desktop height — see Component Inventory §2),
which is a visual-graphic dimension, not a layout-spacing token, matching how `.quizResults__scoreCircle`
already sizes itself in fixed px (88px/108px) rather than spacing tokens.

---

## Typography

This phase reuses the codebase's two existing heading/body type roles unchanged (Heading, Body)
and introduces two new, smaller roles (Label, Caption) for the scale bar's own text — the axis
labels, score readout, and zone legend have no existing role sized appropriately for them; every
other role on this screen already reuses `.quizResults__title` / `.quizResults__subtitle` /
`.quizResults__message`. **No new font weight is introduced.** All three weights used below (400,
600, 700) are already declared elsewhere in `quiz.module.css` — 600 is `.quizNavigation__button`'s
existing weight (`quiz.module.css:617`), 700 is every heading's existing weight, 400 is body
default. Caption's current-zone highlight (§2) reuses the existing 700, not a fourth value.

| Role | Size (mobile → desktop) | Weight | Line Height | Existing class this phase reuses / new class |
|------|--------------------------|--------|-------------|-----------------------------------------------|
| Heading (`h2` "Preliminary Score") | `calc(var(--font-heading-scale,1) * 2rem)` → `calc(var(--font-heading-scale,1) * 2.8rem)` | 700 (existing) | 1.2 | `.quizResults__title` — **unchanged class, copy only changes** |
| Body (subtitle, band explanation `p`, disclaimer) | 1.4rem → 1.6rem–1.8rem | 400 (existing) | 1.5 → 1.6 | `.quizResults__subtitle`, `.quizResults__message p`, `.quizResults__disclaimer p` — **unchanged classes** |
| Label (axis labels "Symptom burden" / "What this means for you", score readout "7 of 60") | 1.2rem → 1.4rem | 600 (existing, reused from `.quizNavigation__button`) | 1.3 | **New:** `.scaleBar__axisLabel`, `.scaleBar__value`, `.scaleBar__meaningHeading` |
| Caption (zone legend words "Low" / "Moderate" / "High") | 1.0rem → 1.2rem | 400 default; 700 (existing, reused from Heading) for the current zone only — see §2 | 1.3 | **New:** `.scaleBar__legendItem` |

The band-explanation `h3` (e.g. "Sublingual Immunotherapy May Significantly Help You") keeps its
existing `.quizResults__message h3` size/weight (`calc(var(--font-heading-scale,1) * 1.6rem)` →
`2rem`, weight 700) — untouched, per D-09's "left verbatim" instruction. It now sits visually
**under** the new `.scaleBar__meaningHeading` ("What this means for you"), not as the section's
only heading.

---

## Color

Zero new theme-variable dependencies. Two categories of color change:

**1. Structural colors — unchanged tokens, same usage as every other screen:**

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `rgb(var(--color-background, 255, 255, 255))` | Page/card background — unchanged |
| Secondary (30%) | `rgba(var(--color-foreground, 32, 34, 35), 0.03–0.15)` | Score-circle container background, the "What this means for you" section's top divider border |
| Accent (10%) | `rgb(var(--color-button, 0, 123, 255))` | **Unchanged reserved-for list** — the score circle's ring, the Copy button, and the primary/secondary action buttons. **Not used anywhere in the new scale bar** — the bar's own color language is the tone scale below, deliberately kept separate from the app's single accent color so the bar reads as data, not as a call to action |
| Destructive | `var(--quiz-color-error, #F44336)` | Unchanged, not used on this page (no destructive action exists on `ResultsDisplay`) |

**2. New tone scale — the scale bar's zone colors (D-07).** Five tokens, declared once, giving
Phase 5.1 headroom to add a 4th or 5th zone without new CSS. Phase 5's provisional 3-zone default
(see Score Scale & Zone Data Contract) uses only `low`, `mid`, `high`; `low-mid` and `mid-high`
exist in CSS today, unused, ready for William's future bands.

| Tone token | Value | Reused from |
|---|---|---|
| `--quiz-color-tone-low` | `var(--quiz-color-success, #4CAF50)` | Existing `--quiz-color-success` (already declared, `quiz.module.css:31`) |
| `--quiz-color-tone-low-mid` | `#CDDC39` | **New hex** — lime, sits between green and orange on a monotonic severity ramp |
| `--quiz-color-tone-mid` | `var(--quiz-color-warning, #FF9800)` | Existing `--quiz-color-warning` (`quiz.module.css:32`) |
| `--quiz-color-tone-mid-high` | `#FF5722` | **Reused, not new** — this is the exact hex the orphaned `.quizResults__severityValueModerate` class already used (`quiz.module.css:999`, retiring under D-07). Reusing it here means D-07's cleanup introduces zero net-new hex values for this slot |
| `--quiz-color-tone-high` | `var(--quiz-color-error, #F44336)` | Existing `--quiz-color-error` (`quiz.module.css:33`) |

**These five replace the four retiring `quizResults__severityValue{Minimal,Mild,Moderate,Severe}`
classes (`quiz.module.css:990-1005`) outright — all four, including the orphaned `Moderate`, per
D-07.** The tone scale is selected by a `data-tone` attribute driven by the zone's config value
(`.scaleBar__zone[data-tone="low"]`, etc.), never by a hardcoded per-bracket class name. **Critical
distinction, restated from D-05/D-06: `data-tone` is driven by the zone the raw score falls into on
the 0–60 bar, never by `scoreBracket`.** The two are visually and semantically independent axes —
do not wire the bar's tone from `scoreBracket` under any circumstance; that is the exact bug D-05
exists to prevent (a `7+` patient's bar would render 90% red).

**Zone-boundary seam color (revised — see non-blocking checker note):** the visible divider between
adjacent zones (Component Inventory §2, Accessibility Contract §1) uses
`rgb(var(--color-foreground, 32, 34, 35))` — the existing, fully opaque dark foreground token, not
a translucent white. Measured against all five provisional tone hexes, an opaque near-black seam
holds comfortably above the WCAG 1.4.11 graphical-object floor of 3:1 (approximate computed
contrast: `low` #4CAF50 ≈ 5.8:1, `low-mid` #CDDC39 ≈ 10.4:1, `mid` #FF9800 ≈ 7.3:1, `mid-high`
#FF5722 ≈ 5.0:1, `high` #F44336 ≈ 4.3:1 — every value clears 3:1 with margin, unlike the white seam
this revision replaces, which failed against two of the three provisional tones). This is a
**supplementary** non-color signal, not the primary one — see Accessibility Contract for why the
always-visible legend text and the bold current-zone word remain the two channels this contract
actually depends on for WCAG 1.4.1 compliance.

**Accent reserved for, explicit list (unchanged from Phase 4.2, no new item added):**
1. Selected checkbox/radio option border + background tint (other steps)
2. Input/select focus ring (other steps)
3. Next / Continue / Submit / dropzone-focus / Resume / results-CTA — primary forward-navigation controls
4. The progress bar fill (other steps)
5. The info-block left border, its icon, and existing `strong`/monospace accents
6. The file-upload dropzone's "+" icon and its focus/hover border (other steps)
7. The results screen's conditional "Schedule Allergy Testing" CTA and the score-circle ring

**Explicitly NOT accent:** the scale bar and everything inside it. It is data visualization, not
an interactive or call-to-action element, and must never borrow the button-blue accent for a zone,
the marker, or the legend.

---

## Copywriting Contract

| Element | Copy | Status |
|---------|------|--------|
| `h2` | **"Preliminary Score"** | Changed (locked — SCORE-01) |
| Subtitle | **"Our Clinical Team is reviewing your information, and will send you email confirmation of your final results within the next 1-2 business days."** | Changed (locked verbatim text from `REQUIREMENTS.md:156`; trailing period added to complete the sentence — the requirement's quoted text has no terminal punctuation) |
| `Symptom Score: 7+` chip | *(removed entirely)* | **Retired (D-08)** |
| Scale-bar axis label | **"Symptom burden"** | New (locked term, D-06) |
| Scale-bar score readout | **"{score} of {max}"** — e.g. "7 of 60" | New (structural pattern from Andrew's approved preview, `05-CONTEXT.md` `<specifics>`) |
| Scale-bar zone legend | **"Low" / "Moderate" / "High"** (Phase 5's 3-zone provisional default) | New — display text, independent of the `data-tone` code token (see Score Scale & Zone Data Contract). Not individually locked; must stay short (≤10 characters) so it fits under a proportionally-narrow zone at mobile widths |
| Recommendation section heading | **"What this means for you"** | New (locked term, D-06) |
| Band explanation `h3` + `p` (all three brackets) | *(unchanged text)* | **Left verbatim (D-09)** — do not edit `ResultsDisplay.tsx:105-141`'s copy |
| Disclaimer paragraph | *(unchanged text)* | **Left verbatim (D-09)** — counsel-owned, Phase 8 / LAUNCH-03 |
| Primary CTA — testing needed | "Schedule Allergy Testing" | Unchanged |
| Primary CTA — testing done | "Return Home" | Unchanged |
| Symptom Profile ID block | "Your Symptom Profile ID:" / "Copy" / "Copied!" | Unchanged |

### Why the subtitle gets a trailing period and nothing else does

`REQUIREMENTS.md:156` quotes the subtitle inside its own sentence without closing punctuation
because it is embedded mid-requirement-text. Every other subtitle/body string on this screen
(`"Your responses have been submitted."`, the disclaimer, both band-explanation paragraphs) ends in
a period — punctuation consistency with the existing surface, not a copy change. No other locked
string in this table needs the same treatment.

### Why the zone legend words are Claude's discretion, not locked

`05-CONTEXT.md`'s Claude's Discretion section names "the tone-scale naming (`low`/`mid`/`high` vs
other labels)" explicitly but says nothing about the zone legend's *display* text. The `data-tone`
code token (`low`/`mid`/`high`) and the human-readable legend word ("Low"/"Moderate"/"High") are
deliberately kept as two separate values — Phase 5.1's admin form can let William rename the
display label ("Moderate" → "Elevated," say) without touching the CSS selector it drives.

### Locked / verbatim terminology (do not paraphrase)

- **"Preliminary Score"** — exact title, `SCORE-01`. Not "Your Results," not "Assessment Results" (the retiring title).
- **"Symptom burden"** — exact axis label, D-06. Not "Symptom score" (that's the retired chip's
  wording) and not "Severity" (the retiring class-name vocabulary).
- **"What this means for you"** — exact section heading, D-06. Not "Recommendation," not "Your Results."
- The three band-explanation headings and bodies, and the disclaimer paragraph — verbatim, unedited (D-09).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no shadcn in this project |
| third-party | none | not applicable |

---

## Score Scale & Zone Data Contract

This is the load-bearing data shape the bar renders from — **it must be a data-driven list, never
a fixed 3- or 4-way JSX branch (D-07).** Read through `getScoreScale()` (`05-CONTEXT.md` D-01),
whose Phase 5 implementation returns this constant; Phase 5.1 swaps the implementation only.

```ts
type ScaleZone = {
  upTo: number;        // inclusive upper bound, in raw score points, on the 0..max axis
  tone: "low" | "low-mid" | "mid" | "mid-high" | "high";  // drives data-tone (Color §2)
  label: string;        // display text under the zone (Copywriting Contract)
};

interface ScoreScale {
  max: number;           // SCORE-02's derived ceiling — 60, from ALL_SCORED_QUESTIONS, never hardcoded here
  zones: ScaleZone[];    // ascending upTo, first zone starts at 0, last zone's upTo === max
}
```

**Phase 5's provisional default** (visibly marked provisional in code — see Notes):

```ts
{
  max: 60,
  zones: [
    { upTo: 20, tone: "low",  label: "Low" },
    { upTo: 40, tone: "mid",  label: "Moderate" },
    { upTo: 60, tone: "high", label: "High" },
  ],
}
```

**Rationale for these specific stops (defensible, not arbitrary):** equal thirds of the derived
0–60 range. This is a deliberately plain, easily-explained default — "the bar is cut into three
equal bands" — chosen *because* it needs no clinical justification of its own: D-05 already
decoupled the bar from the clinical brackets, so the bar's job is only to show linear position, not
to encode a clinical claim. The illustrative `0-14 / 15-29 / 30-60` split that appeared during
`/gsd:discuss-phase 5` was explicitly marked "not a decision" (`05-CONTEXT.md` Claude's Discretion)
and is not used here — it silently mirrors the old clinical thirds-style thinking D-05 exists to
break away from. **These values, and only these values, are provisional** — the zone *count* (3),
the tone *mechanism* (`data-tone`), and the *rendering logic* (data-driven map, not a JSX branch)
are the Phase 5 deliverable and are not provisional.

**Rendering math the executor needs:**
- Zone width: `((zone.upTo - previousUpTo) / scale.max) * 100%`, rendered via CSS `flex-grow`
  (`flex: (zone.upTo - previousUpTo) 0 0` sums to `max` across all zones = 100% width) rather than
  computed pixel widths, so the layout stays correct at any container width without JS resize
  listeners.
- Marker position: `left: (score / scale.max) * 100%; transform: translate(-50%, -50%)`, computed
  against `.scaleBar__track` (the marker's positioning ancestor), left **unclamped** — see
  Component Inventory §2's corrected DOM shape. The marker is a *sibling* of the clipped, rounded
  zones wrapper, not its descendant, so at score = 0 or score = max it genuinely straddles the
  track's rounded end (a few px of the circle sits outside the colored zones) exactly like a
  slider thumb, with nothing clipping it. **This only holds if the marker and the zones wrapper are
  siblings under `.scaleBar__track`, never if the marker is placed inside the zones wrapper** — see
  §2 for the exact structure.
- Current zone (for the legend bold-weight highlight, §2 below): the first zone where
  `score <= zone.upTo`.

**Code-visibility requirement carried from D-04 (not a UI element):** the constant backing Phase
5's `getScoreScale()` must be unmistakably marked provisional in source — a comment, a constant name
like `PROVISIONAL_SCORE_SCALE`, or an `isProvisional: true` field Phase 5.1's admin UI can read and
surface. **This is not a patient-facing banner or copy change** — nothing about "provisional" may
appear on the page itself; D-09 already fixed this screen's copy surface to the structural minimum,
and a "these numbers aren't final yet" disclosure would contradict "clinically honest" (the phase's
own stated goal) by casting doubt on a number the patient is being told to trust. The obligation is
a developer/admin-facing signal, not a patient-facing one.

---

## Component Inventory — new / modified for Phase 5

### 1. Header — copy only, class unchanged

```
┌───────────────────────────────────────────┐
│  Preliminary Score                          │  ← .quizResults__title (UNCHANGED class)
│  Our Clinical Team is reviewing your        │  ← .quizResults__subtitle (UNCHANGED class)
│  information, and will send you email      │
│  confirmation of your final results        │
│  within the next 1-2 business days.        │
└───────────────────────────────────────────┘
```

No structural change. `ResultsDisplay.tsx:80-81`'s two strings change; nothing else in this block does.

### 2. Scale bar — new, replaces the retired chip block entirely

Replaces `.quizResults__severity` / `.quizResults__severityLabel` /
`.quizResults__severityValue{,Minimal,Mild,Severe}` (D-08 retires the chip; D-07 retires the four
legacy classes). The score circle above it (`.quizResults__scoreContainer` /
`.quizResults__scoreCircle` / `.quizResults__scoreNumber`) is **unchanged and retained** — neither
D-08 nor D-09 names it for removal, and it still serves a distinct purpose (a large, immediate
focal number) that the bar's smaller "7 of 60" readout does not replace.

```
┌─────────────────────────────────────────────────┐
│              ┌───────────┐                       │
│              │     7     │   ← .quizResults__scoreCircle (UNCHANGED)
│              └───────────┘                       │
│                                                   │
│  Symptom burden                    7 of 60       │  ← .scaleBar__axisRow
│  ▓▓▓▓▓▓▓▓@▓▓▓░░░░░░░░░░░░░░░░│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← .scaleBar__track (role="img")
│  Low            Moderate            High         │  ← .scaleBar__legend
└─────────────────────────────────────────────────┘
```

**Corrected DOM shape (revision 1 — fixes the blocking marker-clipping finding).** The rounded,
clipped zone graphic and the marker must NOT share an `overflow: hidden` ancestor, or the marker is
silently clipped into a half-moon at score = 0 and score = 60 — score 0 is a genuine minimal-symptom
outcome, not an edge case, so this would render visibly broken for real patients. Fix applied:
**move `overflow: hidden` off the `role="img"` element and onto a new inner wrapper that contains
only the zone segments; keep the marker as that wrapper's sibling, positioned against the outer
`role="img"` element, which keeps `position: relative` but does NOT clip.**

**New class family:**

- `.scaleBar` — wraps the whole block; replaces `.quizResults__severity`'s position in the DOM
  (same `padding`/`background-color`/`border-radius` treatment as the retiring class, reused
  rather than reinvented — `background-color: rgba(var(--color-foreground, 32, 34, 35), 0.03)`,
  `border-radius: var(--quiz-border-radius)`, `padding: var(--quiz-spacing-md)` mobile /
  `var(--quiz-spacing-lg)` desktop).
- `.scaleBar__axisRow` — flex row, `justify-content: space-between`, `align-items: baseline`,
  `margin-bottom: var(--quiz-spacing-xs)`.
  - `.scaleBar__axisLabel` — "Symptom burden." Label typography role (§ Typography).
  - `.scaleBar__value` — "7 of 60." Label typography role, same size as the axis label but weight
    700 (heavier — this is the number the patient actually came for).
- `.scaleBar__track` — **the outer positioning element.** `position: relative`, `height: 12px`
  mobile / `16px` desktop. **No `overflow` and no `border-radius` on this element** — both moved to
  `.scaleBar__zones` below, which is what makes the marker's overflow safe. **`role="img"`**,
  `aria-label` computed per Accessibility Contract, sits on this outer element.
  - `.scaleBar__zones` — **new wrapper, direct child of `.scaleBar__track`.** `display: flex`,
    `height: 100%`, `width: 100%`, `border-radius: var(--quiz-border-radius)`, `overflow: hidden`
    (clips the flex children's square corners to the rounded ends — this is the only element that
    clips). `aria-hidden="true"` (decorative, described by the parent's `aria-label`).
    - `.scaleBar__zone` — one per config entry, a child of `.scaleBar__zones` (not of
      `.scaleBar__track` directly). `flex: <span> 0 0` (see Data Contract), full wrapper height,
      `background-color` from `data-tone` (below), `border-right: 2px solid rgb(var(--color-foreground, 32, 34, 35))`
      on every zone except the last (the non-color boundary — see Color and Accessibility Contract
      for the corrected, contrast-verified seam color).
  - `.scaleBar__marker` — **sibling of `.scaleBar__zones`, both children of `.scaleBar__track`.**
    `position: absolute`, `top: 50%`, `width`/`height: 14px` mobile / `18px` desktop,
    `border-radius: 50%`, `background: rgb(var(--color-background, 255, 255, 255))`,
    `border: 3px solid rgb(var(--color-foreground, 32, 34, 35))`, `box-shadow: var(--quiz-shadow)`,
    `transform: translate(-50%, -50%)`, `left` per the Data Contract's rendering math.
    `aria-hidden="true"`. Because this element is a sibling of the clipped `.scaleBar__zones`
    wrapper — not its descendant — it is never clipped by that wrapper's `overflow: hidden`,
    regardless of `left` value.
- `.scaleBar__legend` — flex row directly below the track, `margin-top: var(--quiz-spacing-xs)`.
  - `.scaleBar__legendItem` — one per zone, `flex: <span> 0 0` matching its zone's width exactly
    (so each label sits under its own segment), `text-align: center`, `min-width: 0`,
    `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis` (graceful truncation at
    narrow widths — see Responsive Behavior), Caption typography role. The legend item matching
    the current zone (see Data Contract's "current zone" rule) gets `font-weight: 700`; all others
    stay 400. **This is a second, independent non-color signal of the patient's position** — the
    marker shows *where*, the bold legend word shows *which zone*, neither depends on the viewer
    perceiving hue.

**Tone selection — data attribute, never a class per bracket:**

```css
.scaleBar__zone[data-tone="low"]      { background-color: var(--quiz-color-tone-low); }
.scaleBar__zone[data-tone="low-mid"]  { background-color: var(--quiz-color-tone-low-mid); }
.scaleBar__zone[data-tone="mid"]      { background-color: var(--quiz-color-tone-mid); }
.scaleBar__zone[data-tone="mid-high"] { background-color: var(--quiz-color-tone-mid-high); }
.scaleBar__zone[data-tone="high"]     { background-color: var(--quiz-color-tone-high); }
```

Phase 5 ships all five selectors even though the provisional 3-zone default only exercises three —
this is what makes the mechanism actually arbitrary-N rather than arbitrary-N-up-to-3; Phase 5.1
adding a 4th or 5th row needs zero new CSS.

### 3. "What this means for you" — new heading wraps the existing, unedited recommendation block

```
┌─────────────────────────────────────────────────┐
│  ─────────────────────────────────────────────  │  ← divider, see below
│  What this means for you                         │  ← NEW: .scaleBar__meaningHeading
│                                                   │
│  Sublingual Immunotherapy May Significantly      │  ← .quizResults__message h3 (UNCHANGED)
│  Help You                                        │
│  Based on your responses, you would likely...    │  ← .quizResults__message p (UNCHANGED)
└─────────────────────────────────────────────────┘
```

- The three conditional blocks (`scoreBracket === "0-2" | "3-6" | "7+"`,
  `ResultsDisplay.tsx:102-142`) are **structurally and textually unchanged** — same conditions,
  same `.quizResults__recommendation` / `.quizResults__message` classes, same copy (D-09).
- **New:** a `.scaleBar__meaningHeading` element renders once, immediately before whichever of the
  three conditional blocks is active — not once per block, and not duplicated. Typography: Label
  role, weight 600, same visual weight as `.scaleBar__axisLabel` (D-06's whole point is that these
  read as two parallel, deliberately similar-weight axis labels, not one primary and one
  secondary heading).
- **New:** a divider between the scale-bar block and this section —
  `border-top: 2px solid rgba(var(--color-foreground, 32, 34, 35), 0.1)`,
  `padding-top: var(--quiz-spacing-md)` mobile / `var(--quiz-spacing-lg)` desktop,
  `margin-top: var(--quiz-spacing-lg)` mobile / `var(--quiz-spacing-xl)` desktop. This reuses the
  exact border treatment `.questionCategory__title` already establishes elsewhere in the app
  (`quiz.module.css:301`) — not a new visual language, the existing "section boundary" pattern
  applied here for the first time on the results screen. **This border is the visual
  implementation of D-06's "two different axes" requirement** — a patient scanning the page sees a
  hard line between "here is your number on a scale" and "here is what a human recommends," which
  is exactly the legibility problem D-06 exists to solve (a green bar sitting directly above "may
  significantly help you" reads as contradictory without this separation).

### 4. Everything else on the page — unchanged

Actions (`.quizResults__actions`), Symptom Profile ID block (`.quizResults__profile*`), and the
disclaimer (`.quizResults__disclaimer`) are untouched: same classes, same copy, same conditional
logic (`testingStatus`), same terminal `<a href>` / `navigateParent()` exits. Nothing in this phase
adds, removes, or renames a callback prop on `ResultsDisplay`.

### 5. What this phase does NOT add (explicit non-goals)

- No interactivity on the scale bar — it is not a slider, not draggable, not clickable. Purely
  informational, matching `ResultsDisplay`'s terminal, display-only nature.
- No animation/transition on the marker or zones on mount. A static render is sufficient and
  avoids any risk of the marker appearing to "count up" in a way that could read as a loading
  state on a value that is already final.
- No tooltip, popover, or hover state on any zone or the marker (no pointer-hover-only affordance
  on a mobile-first, touch-primary surface).
- No change to the score circle's size, color, or copy.
- No "provisional" banner, badge, or asterisk anywhere in patient-facing copy (see Score Scale
  data contract above).

---

## Accessibility Contract

**Non-negotiable for this surface — a colour-banded bar on a clinical page fails WCAG 1.4.1 (Use
of Color) if hue is the only channel conveying zone identity or position. Two independent
non-color channels carry the actual compliance burden, with a third as a verified supplementary
signal:**

1. **Text zone labels, always visible, never color-coded themselves — primary channel.** The
   `.scaleBar__legend` row's text (`Low` / `Moderate` / `High`) is rendered in the page's normal
   foreground color (`rgba(var(--color-foreground, ...), 0.75)`-equivalent), **never** tinted to
   match its zone's tone. Zone identity is conveyed by the word itself and its position under the
   bar, not by matching the legend text's color to the bar segment above it.
2. **The current zone is bolded — primary channel.** Not just marked by the circular marker's
   position — a sighted user who cannot distinguish the marker's exact pixel offset (low vision,
   high zoom, small viewport) still gets "which zone" from the one bold word in the legend row.
   Together, channels 1 and 2 are sufficient on their own to satisfy WCAG 1.4.1 for this component
   — zone identity never depends on perceiving hue at all.
3. **Visible zone boundaries — supplementary channel, contrast-verified.** Each `.scaleBar__zone`
   (except the last) has a `border-right: 2px solid rgb(var(--color-foreground, 32, 34, 35))` seam
   — an opaque, near-black divider, not the translucent white this contract originally specified.
   Measured against all five provisional tone hexes, this seam clears the WCAG 1.4.11 graphical-
   object floor of 3:1 with margin on every one (approximate: `low` ≈5.8:1, `low-mid` ≈10.4:1,
   `mid` ≈7.3:1, `mid-high` ≈5.0:1, `high` ≈4.3:1 — see Color for the full figures). This channel is
   real and correctly contrasted, but it is explicitly supplementary: channels 1 and 2 above are
   what this contract relies on for compliance, because a zone-boundary seam alone would still let
   a colorblind viewer see "three regions" without necessarily identifying *which* region is which
   without the legend text.
4. **The marker itself is shape + border, not color-coded.** A light-fill/dark-border circle with a
   drop shadow, so it is visible against every tone in the palette (verify at build/QA time: the
   marker's `rgb(var(--color-foreground, 32, 34, 35))` border must hold ≥3:1 contrast, WCAG 1.4.11
   Non-text Contrast, against each of the five zone tone hexes — all five are mid-to-highly
   saturated, so a dark border on a light fill is expected to pass against all of them, but this
   must be measured against the theme's actual `--color-foreground` at execution time, not assumed
   from the fallback value alone).

**Screen reader contract — how the score and its position are announced:**

- The score readout ("7 of 60") is **plain, normal-flow text** (`.scaleBar__value`), not inside any
  `aria-hidden` subtree — it is announced exactly as any other text on the page, in document order,
  immediately after the axis label ("Symptom burden").
- The zone legend words are likewise **plain, normal-flow text**, not hidden — a screen reader
  encountering the page linearly hears "Symptom burden, 7 of 60" followed later by "Low, Moderate,
  High" as it reaches the legend row.
- The purely decorative graphic — `.scaleBar__track` and everything inside it (the `.scaleBar__zones`
  wrapper, its zones, and the marker) — is wrapped in a single element carrying `role="img"` with a
  **self-sufficient** computed `aria-label`, e.g.:

  ```
  aria-label="Symptom burden position: low zone, 7 of 60 on a 0 to 60 scale."
  ```

  Self-sufficient means an AT user who jumps directly to this graphic via a landmarks/images list
  (bypassing the surrounding plain text) still gets the complete picture — score, ceiling, and zone
  name — in one string. `role="img"` and `aria-label` live on `.scaleBar__track`, the outer element
  (see Component Inventory §2's corrected DOM shape) — not on `.scaleBar__zones`, which is one
  layer further in. All descendants of `.scaleBar__track` (`.scaleBar__zones`, `.scaleBar__zone`,
  `.scaleBar__marker`) carry `aria-hidden="true"`, since the parent's `aria-label` already fully
  describes them; this avoids a screen reader announcing each zone `<div>` individually as
  meaningless decoration.
- **Do not conflate this `aria-label`'s "zone" language with `scoreBracket`.** The label must name
  the bar's own zone (`low`/`mid`/`high` from the Data Contract), never the clinical bracket
  (`0-2`/`3-6`/`7+`) — conflating them in the accessible name would reintroduce, for screen-reader
  users only, the exact bracket/bar coupling D-05 removed visually for everyone else.
- The "What this means for you" heading and the band explanation beneath it need no special ARIA —
  they are normal heading + paragraph flow, already reachable and already correctly ordered
  (heading before content) in the existing markup.

**Keyboard/focus:** the scale bar introduces zero new focusable elements (it is non-interactive —
see Component Inventory §5). No tab-order change anywhere on this screen.

---

## Responsive Behavior

Single breakpoint, matching the rest of the file: mobile-first below 750px, scaled up at
`(min-width: 750px)`. No new breakpoint is introduced.

| Element | < 750px | ≥ 750px |
|---|---|---|
| `.scaleBar__track` height | 12px | 16px |
| `.scaleBar__marker` diameter | 14px | 18px |
| `.scaleBar__axisLabel` / `.scaleBar__value` | 1.2rem | 1.4rem |
| `.scaleBar__legendItem` | 1.0rem | 1.2rem |
| `.scaleBar` padding | `var(--quiz-spacing-md)` (12px) | `var(--quiz-spacing-lg)` (24px) |

**Narrow-iframe behavior (below the smallest tested width, no new breakpoint needed):** because
`.scaleBar__legendItem` widths are flex-proportional to their zone's point-span (not fixed px) and
carry `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, a legend word that cannot
fit its zone's proportional width truncates gracefully (e.g., "Moderate" → "Mod…") rather than
wrapping onto a second line or overlapping its neighbor. This keeps the bar+legend a fixed,
single-line-height block at any iframe width down to the narrowest realistic embed, with no layout
shift. The `.scaleBar__value` ("7 of 60") never truncates — it is a short, fixed-format string that
fits at any width this app already supports (the existing `.quizResults__profileId` row handles
comparable inline content at the same widths today).

---

## Interaction Contract Summary

| Behavior | Rule |
|----------|------|
| Bar interactivity | None — the scale bar is a static, non-interactive graphic. No click, drag, hover, or focus behavior |
| Zone source | Data-driven from `getScoreScale().zones` (D-01, D-07) — never a hardcoded 3- or 4-way JSX branch, never per-bracket class names |
| Tone selection | `data-tone` attribute on `.scaleBar__zone`, values from a fixed 5-slot palette (`low`/`low-mid`/`mid`/`mid-high`/`high`) — CSS selectors for all five ship in Phase 5 even though the provisional default only uses three |
| Bar axis vs. clinical bracket | Fully independent (D-05/D-06). The bar's `data-tone` and the recommendation block's `scoreBracket` conditional must never share a source value or a class name |
| DOM shape (revision 1) | `.scaleBar__track` (outer, `position: relative`, `role="img"`, no clipping) contains two children: `.scaleBar__zones` (inner, `overflow: hidden`, rounded, holds the `.scaleBar__zone` segments) and `.scaleBar__marker` (sibling of `.scaleBar__zones`, absolutely positioned against the outer track) — the marker must never be a descendant of the clipped wrapper |
| Marker position | `left: (score / max) * 100%` against `.scaleBar__track`, unclamped — safe because the marker is a sibling of, not clipped by, `.scaleBar__zones` |
| Zone width | Flex-proportional to point-span (`upTo[i] - upTo[i-1]`), not fixed px — correct at any container width with no resize listener |
| Non-color signaling | Legend text (always visible, never tone-tinted) and the bold current-zone word are the two channels this contract relies on for WCAG 1.4.1; the zone-boundary seam is a verified-contrast supplementary channel, not the primary one. Color alone may never be the only way a zone or position is conveyed |
| Screen reader | `role="img"` + self-sufficient `aria-label` on `.scaleBar__track` (the outer element) only; the score readout and legend text stay in normal (non-hidden) document flow so they're announced independently |
| Provisional band values | Visible only in source (comment/constant name/`isProvisional` field) — never as patient-facing copy, banner, or badge (D-04, explicitly not a UI element) |
| `ResultsDisplay` prop surface | Unchanged shape (`score`, `scoreBracket`, `patientState`, `symptomProfileId`, `testingStatus`) — `getScoreScale()` is called internally (module-level accessor), not threaded in as a new prop, and is not a callback |
| Legacy classes | `.quizResults__severity`, `.quizResults__severityLabel`, `.quizResults__severityValue` and all three tone variants plus the orphaned `Moderate` variant (4 classes total) are deleted, not deprecated-in-place |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending — revision 1 submitted for re-review (fixes blocking Dimension 2 marker-
clipping finding; addresses both non-blocking notes from the revision-0 review).

---

## Notes for the planner

- **Ceiling derivation (SCORE-02) is a code task, not a UI task**, but the bar's math depends on
  it: `scale.max` must equal `calculateTotalScore`'s theoretical maximum over
  `ALL_SCORED_QUESTIONS` (measured at 60 in `05-CONTEXT.md`), computed from the question set, never
  hardcoded as a literal `60` in the scale constant. If a future scored question is added, both the
  ceiling and every zone's proportional width must move together automatically.
- **The provisional-marking requirement (D-04) belongs in `app/lib/quiz/scoring.ts` (or wherever
  `getScoreScale()`'s Phase 5 constant lives), not in this component.** Flagging here only so the
  plan doesn't drop it — it is a real, tracked obligation (see ROADMAP's "Blocked on Client
  Decisions" §1, downgraded-not-closed) even though it produces no patient-visible UI change in
  this phase.
- **Verify D-10 by inspection before writing any plan tasks for it** — `05-CONTEXT.md` D-10 already
  read the three band messages and found no approval/purchase promise in them; this phase's job is
  to confirm that reading against the actual current file text one more time, not to rewrite the
  messages defensively.
- The theme app block's config channel (`window.AlleDropsQuizConfig`) is untouched by this phase —
  `getScoreScale()` follows the same "read a global, fall back to a module constant" shape
  `getRedirectTarget`/`getProductHandle` already establish, per `05-CONTEXT.md`'s Reusable Assets
  note, but Phase 5's implementation only needs the fallback constant (no config channel exists to
  read from yet — that's Phase 5.1).
- **DOM-shape regression risk (revision 1):** because the fix for the blocking finding depends on
  the marker being a *sibling*, not a descendant, of the clipped `.scaleBar__zones` wrapper, this is
  worth a one-line assertion in whatever test covers this component (e.g., the marker element's
  closest ancestor with `overflow: hidden` is not an ancestor of the marker itself, or simply:
  `.scaleBar__marker`'s parent is `.scaleBar__track`, not `.scaleBar__zones`) — cheap to write, and
  it is exactly the kind of structural fact a future refactor could silently break.

---

*Phase: 5-preliminary-score-page*
*UI-SPEC generated: 2026-08-11*
*Revision 1: 2026-08-11 — fixed blocking marker-clipping finding (Dimension 2); addressed both non-blocking notes (zone-boundary seam contrast, Typography summary wording)*
