# SHOP-01 Spike Result — Customer Metafield Definitions & Liquid Readability

**Run:** 2026-08-12
**Requirement:** SHOP-01 (`REQ-customer-metafield-definitions`)
**Gates:** SHOP-02, SHOP-03
**Roadmap sequencing constraint:** #4 — "SHOP-01 (metafield readability spike) before SHOP-02 and
SHOP-03"

---

## Verdict

**No fallback design is needed. The obstacle is cleared.** Success criterion 1 of Phase 6
("Completion metafields are readable from Liquid on the storefront — or the spike has documented
that they are not and named the fallback design") resolves to the first branch, with one step still
owed as empirical proof (see "Still unproven").

SHOP-02 and SHOP-03 can be designed on the assumption that Liquid can read
`customer.metafields.alledrops.quiz_count` and `customer.metafields.alledrops.last_completed_at`.

---

## What the question actually was

The spike was framed loosely in the roadmap as "whether the metafields are readable." Running it
sharpened the question into two distinct ones that had been conflated:

1. **Are the metafields being written?** — Never in doubt. `app/lib/shopify/metafields.ts`
   (`updateNonPhiQuizMetafields`) writes them, and `app/routes/app.verify-metafields.tsx` reads them
   back fine over the **Admin API**. Admin API reads work on *unstructured* metafields.

2. **Can Liquid read them on the storefront?** — This is the real question, and the answer turns
   entirely on whether a **metafield definition** exists. Storefront Liquid cannot see a metafield
   that has no definition, regardless of whether the value is present on the customer record.

Conflating the two is why the roadmap recorded this as unverified: the Admin-API read looked like
proof and was not.

## What was found

Both metafields existed on **4 customers** as **unstructured** — value present, no definition. That
is precisely the condition under which Liquid returns nil while the Admin API returns the value.

## What was done

Both definitions were created in the Shopify admin on 2026-08-12, with Andrew's in-session
authorization. They adopt the existing 4 customer values rather than requiring a rewrite.

| Definition name | Key | Type | Existing values adopted |
|---|---|---|---|
| Completed assessments | `alledrops.quiz_count` | Integer | 4 customers |
| Last completed assessment | `alledrops.last_completed_at` | Date and time | 4 customers |

**Access settings on both — these are deliberate, do not change them without re-reading this:**

| Setting | Value | Why |
|---|---|---|
| Storefront API access | **ON** | The prerequisite for Liquid readability. This is the whole point of the spike. |
| Customer Account API access | **No access** | Nothing in the Customer Account UI extension reads metafields — `extensions/quiz-history/` calls `GET /api/me/assessments` with a Bearer token (DONE-07). Granting access would create a second, unnecessary read path. |
| "Filter or group data in Analytics" | **OFF** | **Compliance-relevant.** Both fields are approved non-PHI per `CLAUDE.md` rule 6, but pushing a health-adjacent completion flag into Shopify Analytics segmentation is what converts an approved non-PHI flag into a problem — it makes "people who completed an allergy assessment" a targetable audience inside a system with no BAA. **Keep it off.** |

Note the shape of that last row: the *value* stays non-PHI, but the *use* would not be. The setting
is the control, not the field type.

## Still unproven

**That Liquid actually renders `customer.metafields.alledrops.quiz_count` for a logged-in customer
has not been empirically confirmed.** Creating the definition with Storefront API access on is the
documented prerequisite, and it was the missing piece — but "prerequisite satisfied" is not the same
as "measured working," and this project has been burned six times by treating a green precondition
as proof of behavior.

Proving it needs a logged-in customer session plus a Liquid snippet on a product or account
template. That is really the first step of SHOP-02's implementation rather than part of the spike,
so it is recorded here as an owed check and assigned forward rather than left as a blocker.

**Owed check, for whoever plans SHOP-02:** render
`{{ customer.metafields.alledrops.quiz_count }}` on a template, load it as one of the 4 customers
who has a value, and confirm a non-empty integer renders. Verify on **served bytes** of the live
page, not in the theme editor preview.

## Method notes

- `shopify-dev-mcp` docs search did **not** answer whether Liquid customer-metafield reads require
  the Storefront API toggle. Every result routed to the Customer Account API / UI extensions
  surface. The question was settled empirically instead — do not burn time re-searching it.
- `chrome-devtools` MCP drives a separate browser with **no Shopify admin session**. Admin and
  storefront work in this project has to go through `claude-in-chrome`, which attaches to Andrew's
  logged-in Chrome.

## Impact on Phase 6 design

- **SHOP-02** (returning patient sees completion state at the moment of purchase) — proceed with the
  Liquid-read design. No app-proxy fallback, no client-side fetch to the Fly app, no additional
  extension needed just to surface the flag.
- **SHOP-03** (add-to-cart prerequisite confirmations) — unaffected in its gating mechanics, which
  are honor-system UI per `DEC-purchase-gating-is-honor-system`. It can, however, now pre-check or
  contextualize the "quiz completed" confirmation from the metafield rather than asking cold.
- **Known weakness carried forward, unchanged by this spike:** the customer link is best-effort email
  matching. A patient who quizzes with one email and buys with another has no metafield on the
  buying account, so both SHOP-02 and SHOP-03 must degrade gracefully to the uncredited state rather
  than treating a missing metafield as "did not complete."
