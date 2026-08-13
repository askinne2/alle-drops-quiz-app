# SHOP-06 Fulfillment Verification Process — Draft

**Status: UNCONFIRMED — awaiting AOD adoption.** This is a draft checklist for AOD to adopt, amend, or
reject. It is not in force, it is not patient-facing, and nothing here is enforced by code.

**Owner once adopted: William Miller / AOD.** Phase 6 drafts the process; AOD owns and runs it.

**Drafted 2026-08-13** (plan `06-05`, requirement SHOP-06).

**This must be in place before the first patient shipment.**

---

## 1. Purpose — why a human step exists at all

`DEC-purchase-gating-is-honor-system` (LOCKED, from the 2026-07-29 William Miller call) decided that
purchase prerequisites are an honor system: no account flags, no Shopify Functions, no real-time
blocking at checkout.

That decision has a direct consequence, and this document is it. **The checkboxes on the product page
are a nudge, not a control.** A patient can check both boxes without having done either thing. A
patient can also reach checkout with the product-page block failing to render at all — `06-03`'s gate
is deliberately fail-open, so if the theme's add-to-cart selector is missing, the confirmations still
display and the buttons are left alone.

So the only thing actually standing between a patient who has not completed intake and a bottle of
allergy drops in the mail is **a person checking before the parcel goes out.** That is this checklist.
If it is not adopted, the prerequisites are decorative.

---

## 2. Pre-ship verification — run for every order, before fulfillment

Run this after payment and before the order is packed or a label is bought.

### Step 1 — Confirm a completed symptom assessment exists

- Open the AlleDrops app in Shopify admin → **Quiz Results**.
- Find the patient by the name and email on the order.
- Confirm at least one **completed** submission exists for that patient.

**Two traps to know about:**

- **The link between a Shopify order and a quiz submission is best-effort email matching.** If the
  patient checked out with a different address than they used on the quiz, the submission will not be
  found by an email search even though it exists. Search by name before concluding a patient has not
  completed the assessment.
- **Do not verify this from the Shopify customer record.** The `Completed assessments` field on the
  customer is a convenience counter written by the app. It is not the clinical record, it can lag, and
  it says nothing about whether testing is on file. The Quiz Results view is the record.

### Step 2 — Confirm allergy testing results are on file

- In the same submission detail view, confirm the **testing status** and that uploaded test-result
  files are attached to that submission.
- A submission with no attached files does **not** satisfy this step, regardless of what the patient
  indicated on the product page.

**This cannot be checked in Shopify.** Testing status and the uploaded files live in the clinical
database behind the app, never in a Shopify metafield or customer field — that separation is a HIPAA
requirement, not a design preference. Anyone told to "check the customer record for testing" has been
given a wrong instruction.

### Step 3 — Confirm clinical review has happened

- Confirm Dr. Sullivan (or the reviewing allergist) has reviewed the intake for this patient.
- Patient-facing copy commits to *typically 2–3 business days* for this review. That is the promise
  the order confirmation email and the thank-you page both make; fulfillment timing should not
  routinely beat it in a way that implies review was skipped, nor drift past it silently.

### Step 4 — Only then, fulfill

If Steps 1–3 all pass, release the order for packing and shipping.

---

## 3. When a prerequisite is missing — hold, do not ship

**Never ship an order that fails Step 1 or Step 2.** The process, at the level AOD should adapt to its
own tooling:

1. **Hold the order.** Do not fulfill, do not buy a label. Leave it unfulfilled in Shopify rather than
   cancelling immediately.
2. **Contact the patient** at the address on the order, naming specifically what is outstanding — the
   assessment itself, the testing results upload, or both. Do not describe the order as being in any
   kind of review-pending or pre-clearance state; describe what is missing and how to supply it.
3. **Set a hold window** — AOD picks the length. Record what it is here once decided, so the patient
   contact in step 2 can state it accurately.
4. **If the window lapses**, cancel and refund per whatever the refund policy ends up saying. See
   `06-SHOP-05-COPY-DRAFT.md` — **that policy does not exist yet**; the store currently has no refund
   policy and no shipping policy set. This step cannot be run consistently until William writes one.
5. **Record the outcome** where AOD keeps operational records. This is the repudiation control
   (T-6-18): without a record, there is no evidence the prerequisites were ever verified.

---

## 4. Minimum necessary — what the person running this should see

The staff member running Steps 1–3 needs four facts: does a completed submission exist, are testing
files attached, has review happened, and does the patient match the order.

They do **not** need the symptom answers, the score, the bracket, the date of birth, or the contents
of the uploaded files. Whoever AOD assigns to fulfillment should be trained to check the status fields
and stop there. Reading clinical detail that the task does not require is exactly what "minimum
necessary" exists to prevent, and fulfillment staff are workforce members under the same HIPAA
training obligation as clinical staff.

---

## 5. Explicit non-goals

This process deliberately does **not** include, and no future revision should quietly add:

- **No Shopify Functions**, cart validation, or checkout-time blocking.
- **No account flags** or customer tags recording clinical state.
- **No `orders/create` webhook backstop** that auto-cancels or auto-holds.
- **No automated release** of purchasing ability based on intake state — a person decides to ship, and
  no system grants the patient permission to buy.
- **No framing anywhere, patient-facing or internal, that describes a patient as having passed a
  review or been granted permission to purchase.** Review decides whether the clinic ships. It is not
  a gate the patient clears. Per `DEC-no-approval-promise-copy`.
- **No PHI in Shopify.** Nothing in this process writes assessment content, testing status, scores, or
  file names into any Shopify field, tag, note, or metafield.

Each of these was considered and rejected upstream — the first three by
`DEC-purchase-gating-is-honor-system`, the last three by `CLAUDE.md` rules 2 and 5 and
`DEC-no-approval-promise-copy`. They are listed so a later reader does not "improve" the process by
reintroducing one.

---

## 6. Adoption checklist for AOD

| Item | Owner | Status |
|---|---|---|
| Decide who runs pre-ship verification | William / AOD | open |
| Decide the hold window length (§3 step 3) | William / AOD | open |
| Write the refund policy this process depends on (§3 step 4) | William + counsel | open — no policy currently exists |
| Confirm the reviewing allergist's sign-off is visible to whoever fulfills | William / AOD | open |
| HIPAA workforce training for whoever fulfills | AOD | open — tracked in `STATE.md` Blockers |
| Adopt or amend this document | William / AOD | open |

---

*Phase: 06-purchase-prerequisites · Plan 06-05 · Requirement SHOP-06*
*Status: UNCONFIRMED — draft for AOD adoption. Not in force.*
