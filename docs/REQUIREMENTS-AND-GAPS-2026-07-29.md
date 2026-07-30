# AlleDrops — Client Requirements vs. Code Reality

**Date:** 2026-07-29
**Sources:** William Miller call 2026-07-29 (Notion notes + transcript) · William's email 2026-06-27 · code audit 2026-07-29 (static + Chrome verification)
**Status of code at audit time:** `main`, 51/51 tests passing, deployed to Fly

**Precedence rule:** where the 7/29 call and the 6/27 email conflict, **the call wins**. Conflicts are flagged inline. This matters most for testing (the email allowed patients to skip it, the call forbids it) and for purchase gating (the email wanted real enforcement, the call chose an honor system).

---

## Summary

The code is roughly **one third** of the way to what William now expects, and that third is mostly the pre-call design. Symptom sections, the medication section, and scoring are genuinely correct. Everything the call added or changed is absent or contradicted.

**One free architectural break:** scoring is decoupled from the quiz parts array. `calculateTotalScore` takes an explicit question list and is always called with `ALL_SCORED_QUESTIONS` (parts 1–5 only). New sections cannot alter the score, so no scoring work is needed for any new section.

**One architectural landmine:** nothing persists until the final submit. Resume/edit does not exist and is 1+ week to add. See R8.

---

## R1 — "None of the Above" on all three symptom sections

**Requirement (email §1):** all three Part 1 symptom sections need a "None of the Above" option, and the patient must be able to progress without selecting a symptom.

**Status: DONE.** Options at `app/lib/quiz/questions.ts:20,35,49`; `excludeFromScore` at `:22,37,51`; exclusive-none behavior at `app/components/quiz/QuizPartRenderer.tsx:26-28,70-76`; progression asserted in `QuizPartRenderer.test.ts:11-18`. Fixed 2026-07-01, commit `03ff72b`.

---

## R2 — Part 5 medication list

**Requirement (email §2):** delete the leaked dev string `Only shown if taking_meds = yes`; label reads "Please list your current allergy medications and dosages"; mark required.

**Status: DONE, minor copy drift.** Dev string is gone from source and from the shipped `public/quiz-bundle.js` (0 occurrences). Required enforced at `QuizPartRenderer.tsx:296-298`. Label at `questions.ts:198` reads `"…and dosages (required):"` — the suffix isn't in William's text. 10-minute edit.

---

## R3 — Medical history section

**Requirement (email §3, position changed by call):**

Contents — a multi-select checkbox group: asthma, eczema, anaphylaxis, heart disease, COPD, lung disease, cancer, autoimmune conditions, immune system deficiencies (acquired e.g. HIV / induced e.g. immune suppressants or chemotherapy), angioedema, none of the above. If **any** box is checked including "none of the above," reveal a free-text field: "What medications (including dosage) are you currently taking (please list all)". Then three required free-text fields: previous surgeries and dates; known medication/food/environmental allergies; other medical conditions. Then "Do you have a Primary Care Physician" Y/N — if Y, clinic name and address; if N, display "We recommend that you establish with a primary care physician before beginning SLIT". **Must not affect the score.**

**CALL OVERRIDE — position.** The email placed this after the medication section. The call moved it **before the allergy-testing split**, so every patient supplies a history regardless of testing path, including telehealth-only patients. William's reasoning: even a patient who books a consult directly still needs history on file for Dr. Sullivan.

**Status: PARTIAL — wrong content, wrong position, and barely reachable.**

What exists is the *old* design. `questions.ts:222-249` defines `PART6_MEDICAL_HISTORY` with two checkbox groups — `history_personal` (asthma, eczema, food_allergies, positive_allergy_test, ed_visits) and `history_family` (rhinitis, asthma, eczema). The header comment at `:218-220` states the intent: *"Displayed only if patient chooses to proceed after 7+ result."*

Missing from the option list: heart disease, COPD, lung disease, cancer, autoimmune conditions, immune deficiencies, angioedema, none-of-the-above. Missing entirely: the conditional medication reveal, all three required free-text fields, and the whole PCP branch.

**Position is worse than wrong — it's nearly unreachable.** The section sits *after* the results page and only for `7+` patients who explicitly decline testing. Every patient who takes the testing path, every telehealth patient, and every `3–6` patient who clicks "Continue to Purchase" supplies **no medical history at all**.

**The reorder itself is easy.** Part ordering is a plain array — `QUIZ_PARTS` at `questions.ts:266-272`, indexed by `currentPartIndex` (`QuizContainer.tsx:84,267,427-445`). Append the part to that array, then delete the `"medical_history"` `FlowStep` (`QuizContainer.tsx:33,494-518`), its seeding effect (`:102-109`), and the consent back-button special case (`:528`). The progress label at `:280` derives from `QUIZ_PARTS.length` automatically.

**The real cost is the question schema.** `QuizQuestion` (`app/lib/quiz/types.ts:16-26`) has no `required` flag, no conditional-visibility mechanism, and no static-content type. Conditional display is currently hardcoded by literal question ID in two places:

- `QuizPartRenderer.tsx:36-38` — `if (question.part === 5 && (question.id === "med_list" || question.id === "med_control")) { if (takingMeds !== "yes") return null; }`
- `isPartComplete` at `:276-278` and `:295-299` — required-ness is literally `if (takingMeds === "yes" && question.id === "med_list")`

This section needs three schema additions to be expressible declaratively: a `showIf` predicate, a `required: true` flag, and an info/static question type. Building it by copying the `med_list` hardcode pattern would add five more ID-literal special cases to both files.

**Downstream is safe.** New answers land in `answers_json`, and both consumers iterate generically (`app/lib/pdf.ts:75-85`, `app/routes/app.quiz-results.tsx:252-257`), so fields appear in the clinical PDF and admin modal with no plumbing. Note `personal_history_json` / `family_history_json` (`migrations/001:26-27`) are shaped for the old design and become vestigial.

**Open upstream question:** the third free-text field's label is truncated in William's email. Appears to be "Please list any other medical conditions that you have." Needs confirming.

---

## R4 — "Preliminary Score" page with a spectrum scale

**Requirement (email §4):** page titled "Preliminary Score." A bar directly above the score showing where the patient falls on the full scale, broken down by color per severity — William described green / yellow / red. Keep the existing score-band text. Add: "Our Clinical Team is reviewing your information, and will send you email confirmation of your final results within the next 1-2 business days."

**Status: PARTIAL.** Title is hardcoded `"Your Assessment Results"` (`ResultsDisplay.tsx:38`). Score renders as a circle badge (`:44-46`, styles `app/styles/quiz.module.css:906-934`). No thermometer, gradient bar, or scale visual exists anywhere — the only gradients in the stylesheet are the progress bar (`:243`) and card backgrounds (`:694,896`). The 1–2 business day language is absent. The three band explanations William approved are intact at `:59-80`, `:82-109`, `:111-141`.

**Blocker nobody has hit:** there is no maximum-score constant. `SCORE_BRACKETS.HIGH.max` is `Infinity` (`app/lib/quiz/scoring.ts:7`). A "where you fall on the scale" bar needs a real ceiling. Reading `questions.ts`, the theoretical max appears to be 60 (12 + 10 + 15 + 20 + 3). **Derive it from the question set in code** — hardcoding 60 silently rots when new sections land.

**CONFLICT — email copy that is now wrong.** The email supplies a long verbatim Preliminary Score paragraph promising *"you will be able to purchase SLIT through our site if approved."* That describes the manual-unlock model the call replaced with the honor system. Do not ship that sentence as written.

Separately: no manual-unlock or account-approval copy exists in the code today (searched `approv`, `unlock`, `clinical team`, `under review`, `pending review`). Nothing to remove — only something not to add.

---

## R5 — Allergy testing split, with no way to skip testing

**Requirement — CALL OVERRIDE, largest divergence from the email.**

The email had a Y/N structure with a "planning to have testing?" branch, an explicit **proceed-without-testing** path, and reassuring copy that testing is *"not required."*

**The call removed all of that.** Dr. Sullivan requires testing before immunotherapy, reinforced by legal counsel — William: *"if we are going to market as treatment from a board certified allergist, we have to check all the boxes a typical patient would check."* Two options only:

1. "I need allergy testing" → refer to testing options
2. "I've already had allergy testing" → results branch

**There is no third option and no way to proceed without testing.**

Results branch collects Year, Location, "What Allergens Did You React To?". **File upload was softened on the call** — William: *"it's fine if they just want to email it directly to us."* Fallback copy: "Please email your allergy skin testing results directly to testing@alledrops.com (please ensure that you use the same email address that you used on this quiz)."

**Status: MISSING, plus two conflicts that must be deleted.**

No Part 7 exists — no `PART7_*` constant, no `FlowStep`, no Year/Location/Allergens fields.

**File upload is entirely absent** — no file input, no multipart parsing (`api.quiz.submit.tsx:55-74` handles JSON and urlencoded only), no object storage, no upload column. Because the call accepted email delivery, **no new PHI file-handling infrastructure is needed.** This becomes static copy plus three text fields, which removes the single most expensive item on the 6/27 list.

**Two no-testing paths exist and both must go:**

1. *7+ bracket:* `ResultsDisplay.tsx:132-138` renders "Proceed Without Testing" → `QuizContainer.tsx:236-238` sets `showProceedWarning` → interstitial at `:456-480` offers "Continue without testing" (`:465-471`) → `:240-244` → `setStep("medical_history")`.
2. *3–6 bracket:* `ResultsDisplay.tsx:100-106` renders "Continue to Purchase AlleDrops" → `QuizContainer.tsx:231-234` jumps **straight to consent**, skipping medical history entirely, then offers a product link at `:332-339`.

Path 2 was never mentioned on the call and is the bigger problem: an unguarded purchase route for mid-severity patients that bypasses both history and any testing prompt.

**Hard dependency.** `setStep("medical_history")` at `:243` is the **only** entry point to the medical history section. Deleting the no-testing path per the call makes R3 dead code. **R3 must be reordered into the main flow before R5's deletions land.**

**Structural consequence.** R5 puts the split before the score. Today the split *is* the results page — its CTAs. Moving it earlier means `ResultsDisplay` loses all four callback props (`onScheduleConsult`, `onProceedToPurchase`, `onTestFirst`, `onProceedWithoutTesting`, declared `:10-13`) and becomes a terminal display. That's a change to the component's contract, not an edit.

---

## R6 — Allergy diagnosis question

**Requirement (found live on the call).** William: *"the only thing I didn't see, Andrew, is on the 'are you taking allergy medication' section — the diagnosis thing."*

**Status: MISSING.** Nothing matches; `diagnos*` returns zero hits across `app/` and `extensions/`. Part 5 asks *whether* the patient takes allergy medication (`taking_meds`, `questions.ts:187-193`), *what* they take (`med_list`, `:195-200`), and *how controlled* they are (`med_control`, `:201-214`). No question asks whether the patient has been **diagnosed** with an allergic condition.

**Read:** this is not a duplicate of R3. R3's checkbox list is comorbidity history (asthma, COPD, cancer, autoimmune). R6 is allergy-specific diagnosis, belonging next to Part 5's medication questions. Cheapest resolution is a `yesno` + conditional `text_input` pair added to `PART5_TREATMENT`.

**Open question for William** — the transcript fragment is thin, and building this twice would be waste. Confirm before building.

---

## R7 — Two bugs found live on the call

### R7.1 — "I'd like testing first" doesn't reach the testing page

**Root cause confirmed empirically.** `QuizContainer.tsx:228` calls `window.location.assign(getRedirectUrl("testOptions") || "/pages/test-options")`. The design intent is that inside the iframe this is intercepted — `app/routes/quiz-embed.tsx:55-59`:

```js
if (window.self !== window.top) {
  window.location.assign = function(url) {
    window.parent.postMessage({ type: 'quiz:navigate', url: String(url) }, '*');
  };
```

**That assignment never takes effect.** Verified in Chrome:

```json
{"descriptor":{"writable":false,"configurable":false,"enumerable":true},
 "overrideTook":false, "stillNative":true, "threw":null}
```

`Location.assign` is a `[LegacyUnforgeable]` own property — non-writable and non-configurable. In a sloppy-mode inline script the assignment fails **silently**, so there is no console error to find. `window.location.assign` stays native.

Consequence: the call navigates the **iframe**, and `/pages/test-options` resolves against the Fly origin → `https://alle-drops-quiz-app.fly.dev/pages/test-options`, which is not a route in `app/routes.ts` → a React Router 404 rendered inside the quiz frame.

**This breaks all four call sites, not one:**

| Call site | Destination | State |
|---|---|---|
| `QuizContainer.tsx:228` | `/pages/test-options` | broken |
| `QuizContainer.tsx:215` | `/pages/consult` | broken — and `/pages/consult` is itself a 404 per `docs/STOREFRONT_CONTENT_AUDIT.md:182-184` |
| `QuizContainer.tsx:248` | `/pages/test-options` | broken |
| `QuizContainer.tsx:328` | `/` | broken (loads the Fly app index in-frame) |

The anchor-based product link at `:332-339` **does** work — anchors go through a separate, legitimate click interceptor (`quiz-embed.tsx:62-72`) using `preventDefault` + `postMessage`. That asymmetry is why this survived earlier testing.

**Fix:** delete the override; add an explicit `navigateParent(url)` helper that resolves relative URLs against the *shop* origin and posts `quiz:navigate`; call it from all four sites.

**Note:** the app block's redirect settings are already populated in the live theme (Consult redirect URL = "Allergy Consultation"), so fixing the mechanism activates existing configuration.

### R7.2 — Next doesn't scroll to top

**Root cause confirmed.** `QuizContainer.tsx:111-122` is correct — on every `step` / `currentPartIndex` change it posts `{type:"quiz:scrollToTop"}` to the parent when framed, else calls `window.scrollTo`. The message is present in the shipped bundle.

**The parent listener is missing.** `extensions/quiz-block/blocks/symptom-quiz.liquid:56-69` handles `quiz:resize` (`:61-63`) and `quiz:navigate` (`:64-66`) and nothing else. The iframe is `scrolling="no"` with height set to full content (`:52-54`), so the parent document is the only scroller — a dropped message means no scroll at all.

Why this looked implemented: `app/entry.theme.tsx:69-71` *does* handle it, but that code lives in `injectIframe()` — the **other** embed path, which only runs when a theme page loads `quiz-bundle.js` against a bare `[data-alledrops-quiz]` div.

**Embed path confirmed 2026-07-29** via the live theme editor: the Liquid app block is what's installed (visible under Template → Apps as "AlleDrops Symptom Quiz," with the app block's own settings panel). The bundle-injection path is not in play. **The diagnosis holds.**

**Fix:** three lines in the Liquid block mirroring `entry.theme.tsx:69-71`, then `shopify app deploy`.

---

## R8 — Returning patient sees "quiz complete"

**What William was told on the call:** a patient who stops at the testing split comes back, is logged in, sees the quiz marked complete, and picks up at purchase. Andrew also stated correctly that there is no way to resume or edit a submission.

**Status: PARTIAL — substantially better built than the call implied.**

- **The link exists.** `submissions.customer_id_shopify` (`migrations/001_create_submissions.sql:12`, indexed `:40`), populated at submit via `findOrCreateCustomer(admin, quizData.email)` (`api.quiz.submit.tsx:132-133`), with email-based backfill for rows predating Protected Customer Data approval (`api.me.assessments.tsx:69-79`, `app/lib/submissions.ts:115-128`).
- **Read-back exists.** `GET /api/me/assessments` verifies a Shopify customer-account session token (`app/lib/customer-auth.ts:13-27`) and returns non-PHI `{id, symptom_profile_id, completed_at}` (`api.me.assessments.tsx:88-92`). Covered by 9 tests in `tests/assessments-ledger.test.ts` and 4 in `tests/customer-auth.test.ts`.
- **A logged-in surface exists.** `extensions/quiz-history/` targets `customer-account.profile.block.render` and renders "Symptom Assessment History" with per-assessment PDF links (`src/QuizHistoryBlock.jsx:63-76`), including an empty state at `:58`.
- **A machine-readable completion flag exists.** `app/lib/shopify/metafields.ts:88-103` writes `alledrops.last_completed_at` (date_time) and `alledrops.quiz_count` (number_integer) on the customer. This is exactly what R10's product-page checkboxes could pre-check against.

**What's genuinely missing:**

1. **No storefront surface reads any of it.** Completion state is visible on the customer *profile* page only — nothing on the product page, cart, or purchase flow. A returning patient currently sees nothing at the moment of purchase.
2. **No metafield definition is created anywhere in the repo** (`metafieldDefinition` → zero hits). Unstructured metafields have restricted storefront exposure, so Liquid readability of `customer.metafields.alledrops.quiz_count` is **unverified** and R10 may depend on it. → spike.
3. **The link is best-effort email matching.** `api.quiz.submit.tsx:126,146,150` all set `customerLinkSkipped`, and the response warns *"Customer not linked at submission time"* (`:203`). A patient who quizzes with one email and buys with another is unlinked.

**Resume/edit is architecturally absent.** Quiz state is React `useState` only (`QuizContainer.tsx:74-93`); nothing persists until the single terminal POST. No draft table, no localStorage, no partial save. `symptom_profile_id` is `NOT NULL UNIQUE` (`migrations/001:13`) and there is no `updateSubmission` in `app/lib/submissions.ts`. A patient abandoning at the testing split loses **the entire questionnaire**, not just their place.

**Estimate: 1+ week and architecturally hard.** Not on William's list, but implied by what he was told. Do not let this get promised casually.

---

## R9 — Telehealth flow and dual result language

**Requirement (email, barely touched on the call):** anyone may buy a telehealth appointment without completing the quiz, but the questionnaire is required before meeting Dr. Sullivan. After booking, redirect back to the questionnaire (or email it). Telehealth patients get the same Preliminary Score but different closing copy: *"Thank you for submitting your Intake Questionnaire prior to your scheduled Telehealth appointment with Dr. Sullivan. During your appointment, he will review your information with you to determine the best treatment modality for your allergy symptoms."*

**Status: MISSING.** `ResultsDisplay` branches only on `scoreBracket` (`:59,82,111`) — there is no telehealth-vs-SLIT dimension in the component, the payload (`QuizContainer.tsx:135-157`), the validator (`app/lib/quiz-validation.ts:16-31`), or the table (`migrations/001:10-38`). "Telehealth" appears twice in `app/`: a button label at `ResultsDisplay.tsx:98` and consent boilerplate at `ConsentStep.tsx:20-23`.

Delivering this needs a persisted field (e.g. `intake_path`) — migration (pattern documented at `migrations/001:50`), validator addition, payload field, and a second closing-copy branch. The telehealth product itself (`/products/allergy-consultation`, $99, per `docs/STOREFRONT_CONTENT_AUDIT.md:88-101`) appears **nowhere in code**; `app/lib/quiz/product-links.ts:2-5` knows only the two SLIT handles. **Nothing distinguishes SLIT from telehealth programmatically.**

Blocked on `/pages/consult` being a real page.

---

## R10 — Purchase gating (honor system)

### What the email asked for — SUPERSEDED, do not build

Mandatory Shopify account → quiz → clinical team review → manual account unlock → only then can the patient buy SLIT. Telehealth ungated. Real enforcement.

### What the call decided — this is the target

William took the custom architecture off the table himself: *"I don't want to add a bunch of extra things that would mean we need to pay you more or redo our agreement."* Shopify Plus (~$2,300/mo) was dismissed by both parties.

- **Prerequisite checkboxes on the product page gate add-to-cart** — two confirmations: quiz completed, allergy testing submitted
- **Checkout page language** — products will not ship without a completed quiz and testing on file
- **Thank-you page** — custom block explaining the clinical review process and a 2–3 business day expectation
- **Order confirmation emails / customer notifications** — duplicate that language
- **Refund policy page** — state the honor-system terms explicitly
- **No account-flag architecture, no Shopify Functions, no real-time blocking.** Enforcement is human: AOD fulfillment verifies quiz + testing before shipping, contacts or refunds anyone who powers through.

**Status: MISSING entirely, and mostly not repo work.**

Nothing gates any purchase today in any direction. `extensions/` contains only `quiz-block` (the quiz page, `target = "section"` at `blocks/symptom-quiz.liquid:78`) and `quiz-history` (customer profile). No `customer.tags` logic, no `orders/create` webhook, no gating.

Per item:

| Item | Where it lives | Notes |
|---|---|---|
| Product-page checkboxes + add-to-cart gate | **New theme app extension block** targeting the product template | The only meaningful repo work. May depend on the metafield spike. |
| Checkout page language | Shopify admin settings | Not code. Limited text surface on non-Plus — Andrew's caveat is correct. |
| Thank-you page block | **New checkout UI extension** | Third extension in this repo. None exists. |
| Order confirmation emails | Shopify admin notification templates | Zero repo footprint. Genuinely untouched. |
| Refund policy terms | Content | William owns. |

**Two scope constraints before quoting this.** The app requests only `scopes = "read_customers,write_customers"` (`shopify.app.alledrops-production.toml`). Any future `orders/create` backstop needs `read_orders` **and a merchant reinstall**. Webhook subscriptions are currently only `app/uninstalled` + `app/scopes_update` — no order webhook plumbing to extend.

---

## Separately found — live defect not on anyone's list

`app/lib/quiz/product-links.ts:2-5` uses handles `tennessee-allerdrops` / `texas-allerdrops` (with an R). The live store's handles are `tennessee-alledrops` / `texas-alledrops` per `docs/STOREFRONT_CONTENT_AUDIT.md:58,76`. **The one redirect that does work lands on a 404.** Source is the May 8 storefront audit — confirm against the live store before changing (`/products/tennessee-alledrops.js`).

---

## Effort ranking

| Order | Item | Size | Note |
|---|---|---|---|
| 1 | R7.2 scroll | 15 min | Three lines of Liquid, copied from `entry.theme.tsx:69-71` |
| 2 | R2 label copy | 10 min | Drop `(required):` from `questions.ts:198` |
| 3 | R4 title + business-day copy | 30 min | Two string edits |
| 4 | R7.1 routing | 1–2 h | Diagnosed. `navigateParent()` across 4 sites + handle typo |
| 5 | Quiz schema foundation | 1 day | `required`, `showIf`, static-info type. **Load-bearing for R3/R5/R6** |
| 6 | R5 delete no-testing paths | 2–3 h | Easy, but **must land after R3's reorder** |
| 7 | R4 thermometer | 3–5 h | New component + derived max-score function |
| 8 | R6 diagnosis question | 2–4 h | Blocked on clarifying with William |
| 9 | R5 Part 7 page | 1 day | Cheap only because upload was dropped. With upload: 3–4 days + a PHI storage decision |
| 10 | R3 medical history rebuild | 1.5–2 days | Content trivial, schema is the work |
| 11 | R8 storefront "quiz complete" | 1–2 days | Plumbing exists; needs metafield definition + Liquid + reliable link |
| 12 | R9 telehealth branching | 1.5–2 days | Migration + validator + payload + copy. Blocked on `/pages/consult` |
| 13 | R10 ordering surface | 3–5 days | Two new extensions + admin content |
| — | **Resume/edit a submission** | **1+ week, architecturally hard** | Not committed. Requires a draft-persistence layer that doesn't exist |

Only the last row is genuinely hard. Item 5 is structurally significant but bounded. Everything else is tedious or trivial.

---

## Told to William, not supported by the code

1. **"The testing-first button takes you to the testing page."** It cannot, and hasn't since the iframe embed shipped. Consult and Return Home are broken identically.
2. **"Every patient supplies medical history."** Today only `7+` patients who explicitly decline testing reach it. Testing-path, telehealth, and `3–6`-bracket patients supply none.
3. **"There's no way to proceed without testing."** There are two, and one skips medical history entirely.
4. **"The patient returns logged in and sees the quiz is complete."** Data and API exist; nothing in the purchase flow reads them.
5. **"Submissions are saved but there's no resume."** Accurate and understated — nothing saves until final submit, so abandonment loses the whole questionnaire.
6. **The results page isn't called "Preliminary Score" and has no scale.** It says "Your Assessment Results" with a number in a circle.
7. **Telehealth and SLIT patients get identical closing copy.** No telehealth concept exists anywhere to branch on.
8. **Nothing gates any purchase.** Not weakly enforced — absent.
9. **The one working redirect points at a 404** (product handle spelling).

---

## Unresolved

1. **Metafield Liquid readability.** No definition created in the repo; customer metafield storefront exposure unverified. Gates R10. → check `metafieldDefinitions(ownerType: CUSTOMER)` in admin GraphQL, or Settings → Custom data → Customers.
2. **R6 scope** — distinct question or duplicate of R3's checkbox list. → one question to William.
3. **Live product handles** — mismatch finding rests on a May 8 audit. → hit `/products/tennessee-alledrops.js`.
4. **R3's third free-text label** — truncated in William's email.
5. **Live DB round trip** — never verified after the 2026-07-28 Cloud SQL downsize (`HANDOFF.md:42`). No test submission made; would write a PHI row. Independent of this audit.
6. **Medical disclaimer text** — the live app block's Medical Disclaimer Text field currently reads "This text needs changed." and the toggle is off. Hard launch blocker, owned by William/counsel.

---

*Code audit performed 2026-07-29 against `main` (51/51 tests passing). No code modified. Embed path confirmed against the live theme editor the same day.*
