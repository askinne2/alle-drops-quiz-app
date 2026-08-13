# SHOP-05 Copy Draft — Order Confirmation, Checkout Language, Refund Policy SPEC

**Status: UNCONFIRMED — nothing in this document has been pasted anywhere.** It exists so the text is
ready the moment William and AOD sign off. Phase 6 drafts; William pastes. Per `06-CONTEXT.md` D-11,
the refund policy is **SPEC only** — Phase 6 does not write final legal prose for it.

**Drafted 2026-08-13** (plan `06-05`), against the **measured** surface inventory in
`06-02-SUMMARY.md` Task 2. No surface is drafted for that was not confirmed to exist.

---

## Ownership

| Deliverable | Phase 6 produces | Who acts next |
|---|---|---|
| Order confirmation notification body | Paste-ready English (below) | **William / AOD** pastes into Settings → Notifications → Order confirmation |
| Checkout / theme default content string | **Not drafted** — surface unmeasured, see below | Re-measure first, then draft |
| Refund policy | **SPEC bullets only** (D-11) | **William** writes the words |
| Shipping policy | **SPEC bullets only** — flagged, not in the original scope | **William** writes the words |
| Thank-you / order-status notice | Already shipped as code in `06-04` | Nothing — do not paste this text anywhere |

---

## Surface 1 — Order confirmation notification · PASTE-READY

**Path:** Settings → Notifications → Customer notifications → Order confirmation → Edit code.
**Confirmed editable** in `06-02-SUMMARY.md` Task 2 (opens to a preview with an **Edit code** button;
the body is editable Liquid/HTML, not a fixed string). This is the one confirmed paste target in the
whole of SHOP-05.

Insert as its own block after the order summary and before the footer.

> ### Before your order ships
>
> Your order is confirmed and your payment has been received.
>
> Dr. Sullivan reviews your symptom assessment and your allergy testing results before your order
> ships. This review typically takes 2–3 business days.
>
> **We will not ship your allergy drops until both your completed symptom assessment and your allergy
> testing results are on file.** If either one is missing, we will contact you at this email address
> and hold your order until it is complete.
>
> Questions about your order or your assessment? Reply to this email or call us at
> **`[AOD PHONE — William to supply]`**.

### Three things to fix before pasting

1. **`[AOD PHONE — William to supply]` is a deliberate placeholder.** Do not paste it as-is and do not
   invent a number or an inbox. `06-UI-SPEC.md` (SHOP-04 row) and threat **T-6-17** both forbid
   inventing a contact destination; the same rule applies here. If AOD would rather not print a phone
   number, replace the whole sentence with a reply-to instruction alone.

2. **This paragraph is what makes the already-shipped SHOP-04 notice true.** `06-04` shipped
   `ReviewNotice.jsx`, whose second sentence reads *"Need help? Contact the clinic using the support
   details on your order confirmation email."* That notice is live-ready **and currently points at
   support details that do not reliably exist** — `06-02-SUMMARY.md` Task 2 records
   `Settings → Policies → Contact information` as **Required and unset**, and the notification sender
   as `andrew@21adsmedia.com`, the agency address. Pasting the block above is what closes that loop.
   Treat it as a dependency of SHOP-04, not merely a SHOP-05 nicety.

3. **The sender address is the agency's, not AOD's.** Out of scope here (it belongs with LAUNCH-06),
   but a patient replying to this email currently reaches `andrew@21adsmedia.com`. If step 1 resolves
   to "reply to this email", that destination has to be fixed first or the instruction is wrong.

---

## Surface 2 — Checkout / theme default content string · NOT DRAFTED

**Deliberately not drafted, and this is not an omission.**

`06-CONTEXT.md` D-11 anticipated "checkout page language" living in theme default content
(Online Store → Themes → Edit default theme content). `06-02-SUMMARY.md` Task 2 could **not measure
whether a suitable string exists** — the Admin Themes page rendered a blank content area. As of
`06-02` Task 3 (2026-08-13) that failure has now reproduced **four times across two sessions**, so it
is a persistent Admin defect on this store, not a transient one.

Drafting paste-ready text for a field nobody has confirmed exists is exactly the failure mode this
phase was built to avoid — the same shape as the SHOP-01 spike treating a definition as proof of
behavior. So: no draft.

**How to unblock it:** the Shopify **CLI** works against this store where the Admin UI does not
(proven in `06-02` Task 3). `shopify theme pull --only locales/*` will show every editable default
string without the Themes page. If a suitable checkout-adjacent string exists, draft a
character-limited variant of Surface 1's substance then — same two facts, fewer words:

> Dr. Sullivan reviews your intake before your order ships — typically 2–3 business days. Orders do
> not ship until your symptom assessment and allergy testing results are on file.

Held as a candidate, **not** approved for paste, because its destination is unconfirmed.

---

## Surface 3 — Checkout step UI extension · NOT APPLICABLE

D-09 / D-11 place the `information` / `shipping` / `payment` checkout-step targets behind Shopify
Plus, so SHOP-05 does not draft for them.

**Carry this caveat forward:** `06-02-SUMMARY.md` Task 2 established the store is on a **Custom plan,
development store** — not Basic or Grow, which is what D-09 / D-11 reasoned from. A development store
carries access a paid Basic plan does not, so "Plus-only" was never verifiable here in either
direction. Re-confirm after the LAUNCH-06 transfer. It does not change this plan's output: the
post-purchase half is already covered by SHOP-04's shipped extension.

---

## Surface 4 — Thank-you / order-status · ALREADY CODE

Covered by the `order-review-notice` extension shipped in `06-04`. **Do not paste Surface 1's text
here** — it would double the message on the same screen.

---

## Refund policy · SPEC ONLY (D-11)

**Phase 6 does not write this policy. William owns the words.** What follows is a must-include list,
not prose, and not legal review.

**First, the finding that changes the shape of this deliverable.** ROADMAP success criterion 4 for
Phase 6 says the clinical-review language must appear *"in the refund policy"*. `06-02-SUMMARY.md`
Task 2 measured `Settings → Policies → Return and refund policy` as **"No policy set"**. There is no
refund policy to amend. This is therefore authoring guidance for a document that has to be written
from nothing — not an edit to existing text, and it cannot be closed by pasting a paragraph.

**Must-include bullets:**

1. Orders do not ship until a completed symptom assessment and allergy testing results are on file
   for the patient named on the order.
2. Clinical review by the prescribing allergist precedes fulfillment; it typically takes 2–3 business
   days and is not a same-day process.
3. What happens when prerequisites are missing at review time — that the order is held rather than
   shipped, how the patient is contacted, and how long the hold lasts before the order is cancelled.
4. Refund and return handling in that case: whether a held-then-cancelled order is refunded in full,
   what happens to a partially completed intake, and who the patient contacts to ask.
5. Return handling for a shipped prescription product specifically — this is the bullet most likely to
   have state-law constraints in Tennessee and Texas, and the one most in need of counsel rather than
   drafting.

**Must NOT include:** any statement that a patient becomes entitled to purchase, or is granted access
to purchase, once review finishes. Review determines whether the clinic ships; it is not a gate the
patient passes. See Banned Language below.

**Owner:** William, with counsel. This is one of the counsel-owned clinical/legal documents already
tracked in `STATE.md` under Blockers.

---

## Shipping policy · SPEC ONLY — flagged, outside the original scope

Not named in SHOP-05, raised here because it is the same measurement and the natural home for half of
this substance. `Settings → Policies → Shipping policy` is also **"No policy set"**.

"We will not ship until X is on file" is shipping-policy substance at least as much as refund-policy
substance. If William writes only the refund policy, a patient looking for shipping terms finds
nothing. **Must-include:** the same bullets 1–3 above, framed as when an order ships rather than when
it is refunded.

Recorded rather than resolved — expanding Phase 6's scope to a second policy document is William's
call, not this plan's.

---

## Banned language — checked against `DEC-no-approval-promise-copy`

`06-UI-SPEC.md` § Banned language governs every string above. The prohibited families, **paraphrased
deliberately rather than quoted**, because the automated guard on this file counts literal
occurrences and quoting the ban would trip it:

- Approval-conditional framing — the "if / once / after approval" family.
- Access-granting framing — wording implying the patient's ability to buy is released or that they
  have been given clearance to buy.
- Any guarantee of treatment, of efficacy, or of a shipment window tighter than *typically 2–3
  business days*.
- First-person past-tense assertions that the patient has already submitted testing results, which
  D-06 rejected — the patient acknowledges a requirement, never asserts a fact the clinic has not
  verified.

Every draft above states what **the clinic** does (reviews, ships, holds, contacts) rather than what
the patient becomes entitled to. That is the whole distinction `DEC-no-approval-promise-copy` protects.

---

## Constraints this draft was checked against

| Constraint | Source | How this draft satisfies it |
|---|---|---|
| Only draft for measured surfaces | `06-05-PLAN.md` Task 1 `read_first` | Surface 2 is explicitly not drafted; only the confirmed order confirmation is paste-ready |
| Refund policy is SPEC, not prose | D-11, `06-UI-SPEC.md` | Bullets and owner named; no policy text written |
| 2–3 business days, no tighter | `06-UI-SPEC.md`, REQUIREMENTS SHOP-04 | Used verbatim in both drafted strings |
| No invented contact destination | T-6-17, `06-UI-SPEC.md` SHOP-04 row | Phone left as an explicit bracketed placeholder |
| No approval-promise language | `DEC-no-approval-promise-copy` | See Banned language above |
| No PHI | `CLAUDE.md` rule 5 | No patient names, scores, brackets, answers, DOB, or filenames anywhere in this file |

---

*Phase: 06-purchase-prerequisites · Plan 06-05 · Requirement SHOP-05*
*Status: UNCONFIRMED — awaiting William / AOD*
