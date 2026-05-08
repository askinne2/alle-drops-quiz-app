# UX/UI Audit — AlleDrops Symptom Quiz Front-End
**Audited:** 2026-05-08  
**Auditor:** Claude Code (session 6, ui-ux-pro-max skill)  
**Scope:** Full end-to-end quiz flow — StateGate → PatientInfo → QuizParts (5 sections) → Outcome (all 3 brackets) → MedicalHistory → Consent → Completed/Error  
**Method:** Chrome DevTools MCP live walkthrough + CSS source review + computed style inspection

---

## Design System Baseline (ui-ux-pro-max recommendation)

For a healthcare/clinical quiz, the recommended pattern is **Accessible & Ethical** — high contrast, large text (16px+), keyboard navigation, WCAG compliant, clean focus states. The current Shopify theme variables inherited by the quiz are:

| Variable | Resolved value | Notes |
|---|---|---|
| `--color-button` | `44, 62, 63` (dark teal/charcoal) | All buttons |
| `--color-button-text` | `253, 251, 247` (off-white) | |
| `--color-background` | `229, 244, 237` (mint/seafoam) | Page bg |
| `--color-foreground` | `46, 42, 57` (dark navy/purple) | Body text |
| `--font-body-family` | `Inter, sans-serif` | |
| `--font-heading-family` | `Inter, sans-serif` | Same as body |
| `--font-body-size` | *(not set — fallbacks used)* | |
| `--font-heading-scale` | `1.2` | |
| `--font-heading-weight` | **`900`** | Very heavy |
| `--quiz-border-radius` | `8px` | |

---

## BUG FINDINGS

### BUG-1 — Nav Buttons Missing Base Class (Every Step Except StateGate)
**Severity: HIGH | Files: `app/components/quiz/QuizContainer.tsx`**

**What's broken:** `← Previous`, `Next →`, and `Submit` buttons in `renderNavRow()` only receive the *modifier* CSS class (`quizNavigation__buttonPrev`, `quizNavigation__buttonNext`, `quizNavigation__buttonSubmit`). They are never given the *base* class `quizNavigation__button`, which is where the shared structural styles live.

**Missing properties because base class is absent:**
```css
/* These come from .quizNavigation__button — but buttons never get that class */
border: 2px solid rgb(var(--color-button, 0, 123, 255));   /* → falls back to browser default: 2px outset rgb(0,0,0) */
border-radius: var(--quiz-border-radius);                   /* → no rounding */
flex: 1;                                                    /* → buttons shrink to content width */
min-height: 44px;                                           /* → WCAG touch target may fail */
padding: var(--quiz-spacing-sm) var(--quiz-spacing-md);     /* → browser default padding */
```

**Visual result:** `← Previous` renders as a bare browser-default button (grey outset border, mint-matching background, tiny). `Next →` and `Submit` get the dark background from `quiz-theme.css`'s global override but still lack border-radius and correct border.

**How StateGate already does it correctly** (`StateGate.tsx:16–28`):
```jsx
className={`${styles.button} ${styles.quizNavigation__button}`}
```

**Affected line numbers in `QuizContainer.tsx`:**
- Line 315: `← Previous` in patient_info step
- Line 318: `Next →` in patient_info step  
- Lines 349–363: `← Previous` in quiz_parts step
- Lines 364–381: `Next →` / `See results` in quiz_parts step
- Lines 414–417: `← Previous` in medical_history step
- Lines 418–425: `Next →` in medical_history step
- Lines 436–439: `← Previous` in consent step
- Lines 441–450: `Submit` in consent step

**Fix:** Add `${styles.quizNavigation__button}` as a base class alongside all modifier classes in `renderNavRow()` usages. Example:
```jsx
// Before (broken)
<button className={styles.quizNavigation__buttonPrev}>← Previous</button>
<button className={styles.quizNavigation__buttonNext}>Next →</button>

// After (correct)
<button className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}>← Previous</button>
<button className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}>Next →</button>
```

---

### BUG-2 — Global Button Override in `quiz-theme.css` Crushes `buttonPrev` Styling
**Severity: HIGH | File: `app/styles/quiz-theme.css:237–258`**

**What's broken:** `quiz-theme.css` contains a blanket global selector:
```css
.symptom-quiz :global(button) {
  background-color: rgb(var(--color-button));   /* dark teal */
  color: rgb(var(--color-button-text));
  ...
}
```
This selector has **specificity 0,1,1** (class + element). The CSS module's `.quizNavigation__buttonPrev` rule (which sets `background-color: rgb(var(--color-background, 255, 255, 255))` — white) has **specificity 0,1,0** (class only). The global rule wins, forcing ALL buttons inside `.symptom-quiz` to the dark fill.

**Visual result on StateGate:** All three options — "Yes — I live in Tennessee," "Yes — I live in Texas," and "No — I live in another state" — render identically as dark teal filled buttons. The "No" option is supposed to be a secondary/outlined button (white bg, colored text) based on its `buttonPrev` class assignment.

**Computed styles confirmed via DevTools:**
```json
"No — I live in another state":
  computedBg: "rgb(44, 62, 63)"    ← should be white
  computedColor: "rgb(253, 251, 247)"
  className: "_button_5bop7_1224 _quizNavigation__buttonPrev_5bop7_549"
```

**Fix:** Remove the blanket `:global(button)` block from `quiz-theme.css`. The CSS module (`quiz.module.css`) already handles all button styling completely. The global rule is redundant and causes specificity collisions. If any global button fallback is needed, scope it to a narrower selector or use the module's `.button` class.

---

### BUG-3 — Error State `Back` Button Has No CSS Class
**Severity: LOW | File: `app/components/quiz/QuizContainer.tsx:259`**

```jsx
// Line 259 — no className at all
<button type="button" onClick={() => setStep("consent")}>
  Back
</button>
```
This button only inherits styling from `quiz-theme.css`'s global override. It lacks `border-radius`, correct padding, font-weight, and `min-height`. It will look like a plain browser button.

**Fix:** Add `className={styles.button}`.

---

## HIGH-IMPACT UX FINDINGS

### UX-1 — StateGate: "No" Option Has No Visual Differentiation
**Severity: HIGH | File: `app/components/quiz/StateGate.tsx`**

The "No — I live in another state" button is an *exit path* — not a peer option to the two eligible-state choices. All three buttons are visually identical: full-width, same dark fill, same font weight, same padding, same border-radius. There is no visual cue that "No" routes the user out of the quiz.

**Current user experience:** A patient scanning the options has to read all three carefully before realizing "No" is a disqualifying answer, not a third geographic option.

**Expected UX:** The exit path should read as secondary/tertiary — either ghost/outline style, a lighter text weight, or a plain text link with a visual separator (e.g., an "or" divider) between the Yes options and the No option.

**Recommended fix:** Style the "No" button as an outlined/ghost variant with a visual separator:
```
[ Yes — I live in Tennessee ]
[ Yes — I live in Texas     ]
────── or ──────
  Not in TN or TX? Go back
```

---

### UX-2 — `window.confirm()` Used for Medical Warning Dialog
**Severity: HIGH | File: `app/components/quiz/QuizContainer.tsx:218–227`**

When a user clicks "Proceed Without Testing" on the 7+ bracket results screen, the code calls:
```javascript
window.confirm(
  "Although testing is recommended, based on your score severity, you may choose to move forward with sublingual immunotherapy after completing our Medical History Questionnaire. Do you wish to proceed?"
)
```

**Problems:**
- A browser-native `confirm()` dialog renders as a plain OS modal — no brand styling, no AlleDrops visual identity
- The text is clinical/medical and deserves context-appropriate treatment (not a JavaScript alert box)
- On mobile browsers, these dialogs are visually jarring and some browsers suppress them in certain conditions (iframes, embedded contexts — relevant for the iframe-migration plan)
- Cannot be dismissed with custom cancel copy, accessibility is browser-dependent
- Breaks the user's sense of being in a coherent clinical flow

**Fix:** Replace with an inline confirmation panel rendered inside the quiz container. Example pattern: after clicking "Proceed Without Testing," show a new sub-step or expandable warning card with styled confirm/cancel buttons inside the quiz UI.

---

### UX-3 — Results Page CTAs Have No Primary/Secondary Visual Hierarchy
**Severity: HIGH | File: `app/components/quiz/ResultsDisplay.tsx:54–105`**

All action buttons on the results page use `styles.button` — same class, same dark teal fill, same font weight. They also render as `inline-block` elements sized to their text content, not full-width.

**3–6 bracket (two buttons):**
- "Schedule a Telehealth Appointment" → recommended first path
- "Continue to Purchase AlleDrops" → secondary/skip path

**7+ bracket (two buttons):**
- "I'd Like Allergy Testing First" → recommended path
- "Proceed Without Testing" → alternate/lower-confidence path

**Current visual:** Both buttons in each pair look identical. A user cannot determine which is the "recommended" action without reading both labels carefully.

**Additionally:** The buttons have inconsistent widths (content-sized, not full-width) which looks sloppy vs. the StateGate's full-width buttons. The two buttons in each pair use `style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}` as an inline style — inconsistent with the CSS module approach used everywhere else.

**Fix:**
- Designate one button as primary (keep dark fill) and the other as secondary (outline/ghost)
- Apply `display: block; width: 100%` to result buttons for consistency
- Move the `flex/gap` wrapper style into the CSS module

---

### UX-4 — No Progress Context on StateGate and PatientInfo Steps
**Severity: MEDIUM | File: `app/components/quiz/QuizContainer.tsx:297–299`**

`<QuizProgress>` only renders when `step === "quiz_parts"`. StateGate and PatientInfo have no step indicator whatsoever.

From the patient's perspective, the flow is:
1. StateGate (no indicator)
2. PatientInfo (no indicator)
3. Quiz Part 1/5 → 2/5 → 3/5 → 4/5 → 5/5
4. Outcome (no indicator)
5. Medical History (no indicator — 7+ bracket only)
6. Consent (no indicator — 7+ bracket only)

A patient filling in their personal info (step 2 of a multi-step clinical form) has no sense of how far along they are.

**Fix:** Either extend `QuizProgress` to accept an overall step count (e.g., `currentStep: 2, totalSteps: 8`), or add a static breadcrumb/stepper component visible on all non-results steps.

---

### UX-5 — "Submitting…" State Has No Loading Indicator
**Severity: MEDIUM | File: `app/components/quiz/QuizContainer.tsx:287–292`**

```jsx
if (step === "submitting") {
  return (
    <div className={styles.quizContainer}>
      <p>Submitting…</p>
    </div>
  );
}
```

On any network hiccup or slow connection, this renders as plain text with no animation. On the Fly.io cold-start path, this could display for several seconds. Users will assume the page is broken and may close or refresh, losing their submission.

**Fix:** Add a spinner or animated loading state. At minimum: an animated ellipsis or a CSS progress ring. Should also disable the browser back button or warn on unload during this state.

---

### UX-6 — Symptom Profile ID Has No Copy Button
**Severity: MEDIUM | File: `app/components/quiz/ResultsDisplay.tsx:107–114`**

The results page shows:
> "Your Symptom Profile ID: **AOD_1778234166295**"
> "Save this ID for your records. You can copy it for your files or share it with our team if needed."

The note actively instructs users to copy the ID but provides no copy affordance. On mobile, selecting and copying a monospace string requires multiple taps and precision selection. Many users — especially those who are less tech-savvy — will fail to capture it.

**Fix:** Add a clipboard icon button inline with the Profile ID that calls `navigator.clipboard.writeText(symptomProfileId)` with a brief "Copied!" toast confirmation.

---

## CONTENT ISSUES (PRE-LAUNCH BLOCKERS)

### CONTENT-1 — Placeholder Text Visible in Consent Form
**Severity: CRITICAL (pre-launch blocker) | File: `app/components/quiz/ConsentStep.tsx:56–57`**

Section 4 "Laboratory Testing Authorization" contains:
```
Provider may recommend IgE testing via Labcorp or Quest. Billed separately by lab. Insurance may not cover. [PENDING — Treatment policy page language]
```

The `[PENDING — Treatment policy page language]` text is visible to real users in the live production consent form. This is a clinical consent document. Must be replaced with final William-approved language before any real patient uses the flow.

---

### CONTENT-2 — Test Mode Button Visible on Production Page
**Severity: CRITICAL (pre-launch blocker) | File: `app/components/quiz/QuizContainer.tsx:457–501`**

The coral-red "Test Mode: jump to outcome" button and yellow dashed container render whenever `isTestModeEnabled()` returns true — which checks `?test=1` in the URL or `window.AlleDropsQuizConfig.testMode === true`.

During the audit, this button was **visible on the live production page** at `https://allergist-on-demand.myshopify.com/pages/allergy-quiz`. This means either:
- The `testMode` flag is set in the Theme App Block's Liquid template
- Or the URL is being loaded with `?test=1` somewhere in the storefront config

This must be confirmed and disabled before patient-facing launch. The test mode shortcut bypasses all validation and submits synthetic data.

---

## VISUAL / POLISH FINDINGS

### VISUAL-1 — Checkbox Option Rows Nearly Invisible Against Mint Background
**Severity: MEDIUM | File: `app/styles/quiz.module.css:1373–1418`**

```css
.questionCard__optionVertical {
  background-color: rgba(var(--color-foreground, 32, 34, 35), 0.02);  /* 2% opacity — near-transparent */
  border: 2px solid rgba(var(--color-foreground, 32, 34, 35), 0.1);   /* 10% opacity — near-invisible */
}
```

With the page background resolving to `rgb(229, 244, 237)` (mint), these option rows are almost indistinguishable from the background. The checkbox rows look like blank lines. There is no clear visual affordance that they are interactive.

**Fix:** Set `background-color: rgb(var(--color-background, 255, 255, 255))` (full white, no opacity) and increase border opacity to `rgba(var(--color-foreground), 0.2)` at minimum. This makes the rows read as distinct interactive surfaces.

---

### VISUAL-2 — Score Circle on Results Page Is Just a Floating Number
**Severity: MEDIUM | File: `app/components/quiz/ResultsDisplay.tsx:33–41`, `quiz.module.css:874–884`**

```css
.quizResults__scoreCircle {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  /* No width, height, background, border-radius — no actual circle */
}
```

The score (e.g., "30") renders as an oversized number floating in the `quizResults__scoreContainer` box with no ring, no background, no visual containment. It looks like a rendering error rather than a deliberate data display.

**Additionally:** The CSS module defines unused severity color classes:
```css
.quizResults__severityValueMinimal { color: var(--quiz-color-success); }
.quizResults__severityValueMild    { color: var(--quiz-color-warning); }
.quizResults__severityValueModerate { color: #FF5722; }
.quizResults__severityValueSevere  { color: var(--quiz-color-error); }
```
These are never applied in `ResultsDisplay.tsx` — the bracket value just gets `quizResults__severityValue` with `text-transform: capitalize`. "7+" does not capitalize. The severity is never color-coded.

**Fix:**
1. Give `.quizResults__scoreCircle` an actual circular shape: `width: 80px; height: 80px; border-radius: 50%; background: rgba(var(--color-button), 0.1); border: 3px solid rgb(var(--color-button))` (or equivalent)
2. Apply the severity color class based on bracket in `ResultsDisplay.tsx`
3. Consider changing the bracket label from "Your Assessment Score (bracket): 7+" to something like "Severity: Moderate-Severe" with a color indicator

---

### VISUAL-3 — Question Cards Have No Resting Shadow
**Severity: LOW | File: `app/styles/quiz.module.css:345–349`**

```css
.questionCard:hover {
  border-color: rgb(var(--color-button, 0, 123, 255));
  box-shadow: var(--quiz-shadow);   /* only on hover */
}
```

The card has no `box-shadow` in its base (non-hover) state. Against the mint background, the cards read as flat — the card-within-page hierarchy is unclear until hover. Adding a subtle resting shadow (`box-shadow: var(--quiz-shadow)` in the base state, upgrade to `var(--quiz-shadow-hover)` on hover) would make cards read as lifted interactive surfaces immediately.

---

### VISUAL-4 — Heading Font Weight 900 Is Too Heavy for Clinical Context
**Severity: LOW-MEDIUM | File: `app/styles/quiz.module.css:295–312`**

```css
.questionCategory__title {
  font-weight: var(--font-heading-weight, 700);  /* resolves to 900 from Shopify theme */
}
```

`--font-heading-weight: 900` from the Shopify theme makes all quiz step headings render at Black weight. "Medical history," "Informed consent," and "Are you a resident of Tennessee or Texas?" all display in font-weight 900, which reads as aggressive in a healthcare context.

**Fix:** Override to a capped value in the CSS module:
```css
.questionCategory__title {
  font-weight: min(var(--font-heading-weight, 700), 700);
  /* or simply: */
  font-weight: 700;
}
```

---

### VISUAL-5 — Completed Step Has No Card Container or Success State
**Severity: LOW-MEDIUM | File: `app/components/quiz/QuizContainer.tsx:266–285`**

The "Thank you" completed state renders content directly inside `.quizContainer` with no `.questionCard` wrapper:
```jsx
<div className={styles.quizContainer}>
  <h2 className={styles.questionCategory__title}>Thank you</h2>
  <p className={styles.quizContainer__subtitle}>...</p>
  <button ...>Return home</button>
  <p style={{ marginTop: "1rem" }}>        {/* ← inline style */}
    <a className={styles.button} href="...">Go to AlleDrops product page</a>
  </p>
</div>
```

Issues:
- No `.questionCard` container — content floats without the card frame used everywhere else
- Raw `<p style={{ marginTop: "1rem" }}>` is an inline style inconsistent with the CSS module approach
- No success visual — no checkmark, no green banner, no visual confirmation that submission succeeded
- Profile ID is buried in the subtitle paragraph, not highlighted

---

### VISUAL-6 — Consent Scroll Box Uses Input CSS Class with 7 Inline Overrides
**Severity: LOW | File: `app/components/quiz/ConsentStep.tsx:18–29`**

```jsx
<div
  className={styles.quizContainer__input}   /* ← input field class on a content div */
  style={{
    maxHeight: "360px",
    overflowY: "auto",
    padding: "1rem",
    marginBottom: "1rem",
    fontSize: "0.9rem",
    lineHeight: 1.5,
  }}
>
```

The scrollable consent text container uses the `quizContainer__input` class (intended for form fields like `<input>` and `<textarea>`) with 7 inline style overrides. This is both a semantic mismatch and a maintenance hazard.

Additionally: there is no scroll shadow or visual indicator at the bottom to hint that the content is scrollable. Section 6 "Patient Responsibilities & Contraindications" and sections 7–8 are not visible on initial render at 360px height, and nothing signals to the user to scroll.

**Fix:**
1. Create a dedicated CSS class `quizContainer__scrollBox` in the module
2. Add a gradient shadow at the bottom when content is not fully scrolled (can be done with a pseudo-element or a JS scroll listener toggling a class)

---

### VISUAL-7 — IneligibleMessage Has No Heading
**Severity: LOW | File: `app/components/quiz/IneligibleMessage.tsx`**

The ineligible state renders:
```jsx
<div className={styles.questionCard}>
  <p className={styles.quizContainer__subtitle}>Unfortunately, at this time...</p>
  <button ...>Go Back</button>
</div>
```

No `<h2>` heading. Compared to every other step (which starts with a heading), this looks unfinished. A user landing here also sees no context for *why* they're being shown this — no heading like "Not Available in Your State" before the explanation paragraph.

---

## FINDINGS SUMMARY TABLE

| ID | Description | Severity | File | Status |
|---|---|---|---|---|
| BUG-1 | Nav buttons missing base class → broken border, radius, flex | **HIGH** | `QuizContainer.tsx:315–450` | ✅ Fixed (session 7) |
| BUG-2 | Global button override crushes `buttonPrev` secondary style | **HIGH** | `quiz-theme.css:237` | ✅ Fixed (session 7) |
| BUG-3 | Error state Back button has no CSS class | LOW | `QuizContainer.tsx:259` | ✅ Fixed (session 7) |
| UX-1 | StateGate "No" visually identical to Yes options | **HIGH** | `StateGate.tsx` | ✅ Fixed (session 7) |
| UX-2 | `window.confirm()` for clinical medical warning | **HIGH** | `QuizContainer.tsx:218` | ✅ Fixed (session 7) |
| UX-3 | Results CTAs — no primary/secondary hierarchy | **HIGH** | `ResultsDisplay.tsx:54–105` | ✅ Fixed (session 7) |
| UX-4 | No progress indicator on StateGate/PatientInfo steps | MEDIUM | `QuizContainer.tsx:297` | Open |
| UX-5 | "Submitting…" has no loading indicator | MEDIUM | `QuizContainer.tsx:287` | ✅ Fixed (session 7) |
| UX-6 | Profile ID has no copy-to-clipboard button | MEDIUM | `ResultsDisplay.tsx:107` | ✅ Fixed (session 7) |
| CONTENT-1 | `[PENDING…]` placeholder text live in consent form | **BLOCKER** | `ConsentStep.tsx:56` | Open — awaiting William sign-off |
| CONTENT-2 | Test Mode button visible on production page | **BLOCKER** | `QuizContainer.tsx:457` | Open — disable in Shopify theme customizer |
| VISUAL-1 | Checkbox option rows near-invisible on mint bg | MEDIUM | `quiz.module.css:1373` | ✅ Fixed (session 9) — white bg, border opacity 0.2 |
| VISUAL-2 | Score circle is just a floating number, no shape | MEDIUM | `ResultsDisplay.tsx:33`, `quiz.module.css:874` | ✅ Fixed (session 9) — 88px circle + severity colors applied |
| VISUAL-3 | Question cards no resting shadow | LOW | `quiz.module.css:345` | ✅ Modified (session 8) — borders removed instead; hover shadow kept |
| VISUAL-4 | Heading font-weight 900 too heavy for clinical context | LOW-MEDIUM | `quiz.module.css:295` | ✅ Fixed (session 9) — hard-coded 700 |
| VISUAL-5 | Completed step no card/success state, inline styles | LOW-MEDIUM | `QuizContainer.tsx:266` | ✅ Fixed (session 9) — card wrapper, checkmark SVG, profile ID styled, inline style removed |
| VISUAL-6 | Consent scroll box uses input class + 7 inline styles | LOW | `ConsentStep.tsx:18` | ✅ Fixed (session 8) |
| VISUAL-7 | IneligibleMessage has no heading | LOW | `IneligibleMessage.tsx` | ✅ Fixed (session 9) — "Not Available in Your State" h2 added |

### Additional fixes (session 8, not in original audit)

| ID | Description | File | Status |
|---|---|---|---|
| EXTRA-1 | Results page orphaned `1fr 1fr` grid at 990px (relic of deleted product recommendations column) | `quiz.module.css` | ✅ Fixed + deployed (session 8) |
| EXTRA-2 | Progress bar filled in 20% jumps per section — now answer-based across all 18 questions | `QuizProgress.tsx`, `QuizContainer.tsx` | ✅ Fixed (session 8) |

### Additional fixes (session 9, not in original audit)

| ID | Description | File | Status |
|---|---|---|---|
| EXTRA-3 | `.symptom-quiz` background-color removed — quiz container is now transparent, inherits page bg | `quiz-theme.css`, `public/quiz-bundle.css` | ✅ Fixed (session 9) |
| EXTRA-4 | CSS route cache `max-age=3600` caused stale deploys — changed to `max-age=0, must-revalidate` | `quiz-bundle-css.tsx`, `quiz-bundle.css.tsx` | ✅ Fixed (session 9) |
| EXTRA-5 | TS error in `auth.login` route — `e.currentTarget.value` could be `undefined` | `auth.login/route.tsx:39` | ✅ Fixed (session 9) |

---

## RECOMMENDED FIX ORDER

**Do first (highest leverage, touches fewest files):**
1. CONTENT-2 — confirm/gate Test Mode (1 line in theme Liquid or config)
2. BUG-1 — add base class to all nav buttons (8 targeted line changes in QuizContainer.tsx)
3. BUG-2 — remove/narrow global button override in quiz-theme.css (delete ~20 lines)
4. CONTENT-1 — requires William's final consent language (external dependency)

**Second pass (UX polish, one PR each):**
5. UX-1 — "No" button secondary styling in StateGate
6. UX-2 — Replace window.confirm() with inline confirmation panel
7. UX-3 — Primary/secondary hierarchy on results CTAs
8. UX-5 — Add loading spinner to submitting state
9. UX-6 — Copy-to-clipboard for Profile ID
10. BUG-3 — Add class to error Back button

**Third pass (visual polish):**
11. VISUAL-1 — White background on option rows
12. VISUAL-2 — Score circle shape + severity color coding
13. VISUAL-4 — Cap heading weight at 700 in quiz module
14. VISUAL-5 — Completed step card + success state
15. VISUAL-6 — Consent scroll box class + scroll shadow
16. VISUAL-7 — Heading for IneligibleMessage
17. VISUAL-3 — Resting shadow on question cards
18. UX-4 — Progress indicator across all steps
