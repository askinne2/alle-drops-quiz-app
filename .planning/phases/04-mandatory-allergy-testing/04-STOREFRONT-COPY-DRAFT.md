# Storefront Copy Draft — D-13 No-Testing-Required Clauses

**Status: UNCONFIRMED — held for William/counsel approval, not shipped.** Nothing in this document
has been published anywhere. It exists so replacement copy is ready the moment William or counsel
signs off; Phase 4 deletes the false clauses (where they are theme-repo-editable) and drafts this
replacement, and no more.

This draft, and the interim consent paragraph from D-11 (plan 04-03), both ride on the same
William/counsel message per `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md` §Specifics
item 6.

---

## Where the clauses actually live — measured, not assumed

Per `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md` D-13, the two deletion targets
are: (1) the *"no longer a need for needles or allergy tests"* clause on both SLIT product pages,
and (2) the proceed-without-testing content on `/pages/test-options`.

The theme repo (`/Users/andrewskinner/Local Sites/allergist-on-demand`) was grepped exhaustively for
`needles`, `allergy test` (case-insensitive), `no longer a need`, `no longer need`, `without
testing`, `not required`, `not necessary`, `unnecessary`, `skip the test`, and `already have`, across
`templates/`, `sections/`, `snippets/`, and `locales/`. Results:

| Needle | Occurrences in theme repo | Where |
|---|---|---|
| `no longer a need` | **0** | — |
| `allergy test` (case-insensitive) | **0** | — |
| `needles` | **2** | `templates/index.json` (homepage), both in an unrelated, accurate sentence: *"Your drops arrive at your door — no needles, no appointments required"* and *"...sublingual allergy drops customized to your region and allergy profile — with no needles and no clinic visits required."* This describes SLIT's needle-free **administration method** (true — sublingual drops are not injected), not a claim that allergy **testing** is unnecessary. It is not the D-13 clause and was **not deleted** — see rationale below. |
| `without testing` / `not required` / `not necessary` / `unnecessary` / `skip the test` / `already have` | **0** | — |

**Both actual deletion targets are Admin-managed, not theme-managed:**

1. **Both SLIT product pages** (`templates/product.regional-drops.json`, and the default
   `templates/product.json` used by `product.telehealth-appointment.json`) render
   `{{ product.description }}` inside `sections/main-product.liquid:195-197`. There is no static,
   theme-repo-editable body copy on either product template — the description is a Shopify Admin
   product field. If the *"no longer a need for needles or allergy tests"* clause is live on either
   SLIT product page, it is in that Admin field, not in this repo.
2. **`/pages/test-options`** has no dedicated theme template (`templates/page.test-options.json`
   does not exist). It falls through to the default `templates/page.json`, whose `main-page` section
   renders `{{ page.content }}` (`sections/main-page.liquid:22`) — a Shopify Admin page-body field.
   If proceed-without-testing content is live on that page, it is in that Admin field, not in this
   repo.

**Consequence:** Task 2 made **zero** theme-repo file edits. There was no theme-repo-editable
occurrence of either clause to delete. This is reported explicitly, per the task's own instruction
not to invent a theme-file edit for content that is not in the theme repo. Both surfaces are named
below as Admin edits Andrew must make himself (or delegate) — Task 3's checkpoint routes this
decision to him; it is not a plan 04-05 push.

**Rationale for leaving the two homepage `needles` occurrences alone:** they are truthful marketing
copy about the treatment's delivery method, unrelated to whether allergy testing is required before
purchase. Deleting them would remove accurate content rather than an inaccurate clinical claim, which
is outside D-13's purpose (delete only what the phase makes false). Flagged here for Andrew to
override at the Task 3 checkpoint if he disagrees.

---

## Proposed replacement copy (per deleted/targeted clause)

### Item 1 — Product page clause: *"no longer a need for needles or allergy tests"*

- **Exact string believed to be live (from `DEC-mandatory-allergy-testing`'s own description of what
  it invalidates):** a variant of *"no longer a need for needles or allergy tests"* — the precise
  wording as it appears in the Shopify Admin product description was not confirmed by this task,
  since the field is not in this repo and Task 2 did not have Shopify Admin write access in scope.
  Andrew or whoever edits the Admin product description should search for and remove the exact
  phrase there.
- **Surface:** Shopify Admin → Products → (both TN and TX SLIT product listings) → Description field.
  **Admin-managed, not theme-managed** — confirmed above.
- **Proposed replacement (UNCONFIRMED):**

  > Allergy testing confirms which allergens are driving your symptoms so your AlleDrops formula can
  > be built to match them. If you've already had allergy testing, you can submit your results as
  > part of our online symptom assessment. If you haven't, our assessment will point you to testing
  > options before you can move forward with AlleDrops.

  This states testing is required before SLIT and how a patient obtains it (via the online
  assessment's testing-status step), without a manual-gatekeeping promise and without an efficacy
  claim about AlleDrops itself.

### Item 2 — `/pages/test-options` proceed-without-testing content

- **Exact string believed to be live:** not confirmed by this task — the page body is a Shopify
  Admin field, out of this repo's reach. Andrew or whoever edits the Admin page body should locate
  and remove any sentence implying a patient may proceed to purchase without completing allergy
  testing.
- **Surface:** Shopify Admin → Online Store → Pages → "Test Options" → page body.
  **Admin-managed, not theme-managed** — confirmed above (no `page.test-options.json` template
  exists; the page falls through to the generic `page.json` → `main-page` → `{{ page.content }}`).
- **Proposed replacement (UNCONFIRMED):**

  > Allergy testing is required before starting AlleDrops. If you don't already have recent results,
  > here's how to get tested:
  >
  > - **Schedule a telehealth consult** with an Allergist on Demand provider, who can order testing
  >   for you.
  > - **Already have results?** Head back to the symptom assessment and submit them there — no need
  >   to start over.
  >
  > Once your results are on file, you'll be able to move forward with AlleDrops.

  States testing is mandatory and gives the patient two concrete next steps, with no
  manual-gatekeeping language, no efficacy claim, and no reference to the Phase 4 upload feature's
  internal mechanics (file types, size caps, etc. — those stay in-product, not in this marketing
  copy).

---

## Constraints this draft was checked against

- **`DEC-no-approval-promise-copy` (LOCKED):** neither replacement promises manual clinical
  sign-off, account gating, or a "you'll be able to purchase if cleared" model — the pattern that
  decision retracted from the 2026-06-27 email. This document itself avoids the two literal
  substrings the automated guard checks for, so its own prose stays clean of the pattern it is
  describing.
- **No efficacy claim:** neither replacement asserts AlleDrops works, cures, or treats anything —
  only that testing is a required step and how to obtain it.
- **No reference to the Phase 4 upload feature's implementation:** no mention of file types (PDF,
  JPEG, PNG, HEIC), size caps, or the multi-file picker mechanism. The copy says "submit your
  results" generically.
- **Marked UNCONFIRMED:** this entire document, and does not ship in Phase 4.
