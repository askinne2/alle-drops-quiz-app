# Decisions — synthesized intel

Milestone: AlleDrops go-live for Allergist On Demand (AOD).
Mode: `new` (net-new bootstrap, no prior `.planning/`).

**No formal ADRs exist in the ingest set.** Every decision below is extracted from
`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (SPEC, precedence 0, **LOCKED**) or from the
explicit "Decision" statement in `docs/HIPAA_COMPLIANCE_ANALYSIS.md` (SPEC, precedence 1).
Decisions marked LOCKED come from the 2026-07-29 William Miller client call and cannot be
auto-overridden by any lower-precedence document.

Precedence in force: `0 REQUIREMENTS-AND-GAPS > 1 HIPAA_COMPLIANCE_ANALYSIS > 2 quiz-questions-schema > 3 app-requirements > 4 HANDOFF > 5 STOREFRONT_CONTENT_AUDIT > 6 UX-AUDIT > 7 breach-response-runbook > 8 PERFORMANCE_OPTIMIZATION`

---

## DEC-mandatory-allergy-testing — LOCKED

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, R5, marked "CALL OVERRIDE")
- status: LOCKED (client call 2026-07-29)
- scope: quiz flow, results routing, storefront copy

**Decision:** Allergy testing is mandatory before sublingual immunotherapy. The allergy
testing step offers exactly two options — "I need allergy testing" (refer to testing
options) and "I've already had allergy testing" (results branch). There is no third option
and **no path to purchase without testing**.

Rationale recorded in source: Dr. Sullivan requires testing before immunotherapy,
reinforced by legal counsel. William: *"if we are going to market as treatment from a
board certified allergist, we have to check all the boxes a typical patient would check."*

**Reverses:** the 2026-06-27 email's "planning to have testing?" branch, its explicit
proceed-without-testing path, and its copy stating testing is *"not required."*

**Supersedes in the ingest set:** `docs/quiz-questions-schema.md:58-59,21,236` and
`docs/app-requirements.md:14-17,33` (both describe testing as an optional branch and permit
lower brackets to continue to purchase). Also invalidates live storefront copy documented in
`docs/STOREFRONT_CONTENT_AUDIT.md:66,170,228`.

---

## DEC-purchase-gating-is-honor-system — LOCKED

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, R10, "What the call decided — this is the target")
- status: LOCKED (client call 2026-07-29)
- scope: product page, checkout, notifications, fulfillment process

**Decision:** Purchase gating is an **honor system plus human verification at fulfillment**,
not enforced architecture. In scope:

- Prerequisite checkboxes on the product page gating add-to-cart (two confirmations: quiz
  completed, allergy testing submitted)
- Checkout page language: products will not ship without a completed quiz and testing on file
- Thank-you page block explaining clinical review and a 2–3 business day expectation
- Order confirmation emails / customer notifications duplicating that language
- Refund policy page stating the honor-system terms explicitly

**Explicitly out of scope — do not build:** account-flag architecture, Shopify Functions,
real-time checkout blocking, mandatory accounts, manual clinical unlock. Enforcement is
human: AOD fulfillment verifies quiz + testing before shipping and contacts or refunds
anyone who powers through.

Rationale recorded in source: William took the custom architecture off the table himself —
*"I don't want to add a bunch of extra things that would mean we need to pay you more or
redo our agreement."* Shopify Plus (~$2,300/mo) dismissed by both parties.

**Reverses:** the 2026-06-27 email's model (mandatory account → quiz → clinical review →
manual account unlock → real enforcement), and supersedes the pre-call research in
`HANDOFF.md:147-162` (Liquid `customer.tags` gate, `orders/create` webhook backstop,
Locksmith-style app, `tagsAdd` mutation). None of that is the target.

---

## DEC-medical-history-before-testing-split — LOCKED

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, R3, marked "CALL OVERRIDE — position")
- status: LOCKED (client call 2026-07-29)
- scope: quiz part ordering, telehealth patients

**Decision:** The medical history section moves **before the allergy-testing split**, into
the main `QUIZ_PARTS` array. Every patient supplies a medical history regardless of testing
path, including telehealth-only patients. Medical history **must not affect the score**.

Rationale recorded in source: even a patient who books a consult directly still needs
history on file for Dr. Sullivan.

**Reverses:** the 2026-06-27 email's placement (after the medication section).

**Supersedes in the ingest set:** `docs/quiz-questions-schema.md:21,236` ("shown only for
the higher-acuity path after results") and `docs/app-requirements.md:33,167`
("Patients in the `7+` branch can continue into Part 6", "Optional Part 6").

**Hard sequencing constraint (from source, R5):** `setStep("medical_history")` is currently
the **only** entry point to the medical history section. The R3 reorder must land **before**
the R5 no-testing-path deletions, or medical history becomes dead code. See
`constraints.md#CON-sequencing-r3-before-r5`.

---

## DEC-testing-results-by-email-not-upload — LOCKED

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, R5)
- status: LOCKED (client call 2026-07-29)
- scope: testing results branch, PHI infrastructure

**Decision:** File upload for allergy test results is dropped. Patients email results to
`testing@alledrops.com` using the same email address they used on the quiz. William:
*"it's fine if they just want to email it directly to us."*

**Consequence recorded in source:** no new PHI file-handling infrastructure is needed — no
file input, no multipart parsing, no object storage, no upload column, no PHI storage
decision. This removes the single most expensive item on the 6/27 list (3–4 days plus a PHI
storage decision → ~1 day of static copy and three text fields).

---

## DEC-no-approval-promise-copy — LOCKED

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, R4, marked "CONFLICT — email copy that is now wrong")
- status: LOCKED (client call 2026-07-29)
- scope: Preliminary Score page copy

**Decision:** The 2026-06-27 email's verbatim Preliminary Score paragraph promising
*"you will be able to purchase SLIT through our site if approved"* **must not ship**. It
describes the manual-unlock model that the call replaced with the honor system.

Source note: no manual-unlock or account-approval copy exists in the code today (searched
`approv`, `unlock`, `clinical team`, `under review`, `pending review`). Nothing to remove —
only something not to add.

---

## DEC-derive-max-score-from-question-set — LOCKED

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, R4)
- status: LOCKED (client call 2026-07-29 requirement; implementation directive from the audit)
- scope: scoring, results visual

**Decision:** The Preliminary Score page needs a real score ceiling for its "where you fall
on the scale" bar. The maximum score must be **derived from the question set in code**, not
hardcoded — hardcoding "silently rots when new sections land."

Source observations: there is no maximum-score constant today;
`SCORE_BRACKETS.HIGH.max === Infinity` (`app/lib/quiz/scoring.ts:7`). Reading
`questions.ts`, the theoretical max *appears* to be 60 (12 + 10 + 15 + 20 + 3).

**Unresolved dependency:** what the scale actually displays is not settled. See
`INGEST-CONFLICTS.md` WARNING "Score range and severity-scale semantics unresolved" —
`docs/quiz-questions-schema.md:71` deprecates the 0-60 total, and the bracket model tops out
at an open-ended `7+`. Do not treat the range as decided.

---

## DEC-scoring-decoupled-from-quiz-parts

- source: `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0, Summary — "One free architectural break")
- status: as-built architectural property, confirmed by audit
- scope: scoring

**Decision (recorded, not changed):** Scoring is decoupled from the quiz parts array.
`calculateTotalScore` takes an explicit question list and is always called with
`ALL_SCORED_QUESTIONS` (Parts 1–5 only). New sections cannot alter the score, so **no
scoring work is needed for any new section.**

Corroborated by `docs/quiz-questions-schema.md:264-278`.

---

## DEC-treat-quiz-data-as-phi

- source: `docs/HIPAA_COMPLIANCE_ANALYSIS.md:3-12` (precedence 1, stated "Decision")
- status: standing decision, **final legal determination still deferred to counsel**
- scope: data classification, storage architecture, BAA chain

**Decision:** Treat quiz data as HIPAA-protected PHI.

Consequences asserted by the source: Shopify is not HIPAA-compliant and does not sign BAAs,
so Shopify must hold summary data only, never PHI; any Google Workspace surface holding PHI
requires a BAA with Google.

**Caveat carried forward:** the same document's "Original Analysis" reaches the opposite
provisional conclusion (*"likely NOT Protected Health Information"*) and explicitly defers
the determination to a healthcare attorney. The PHI reading is the one in force and is
corroborated by higher- and lower-precedence sources (`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:300`
calls a test submission "a PHI row"; `docs/breach-response-runbook.md` is written entirely on
PHI assumptions; `HANDOFF.md:57,193` treats the database as PHI-holding). All downstream
constraints are flagged **pending legal confirmation**.

---

## DEC-phi-persists-in-cloud-sql-not-google-sheets

- source: resolved by precedence — `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` (precedence 0) over `docs/HIPAA_COMPLIANCE_ANALYSIS.md` (precedence 1) and `docs/app-requirements.md` (precedence 3)
- status: auto-resolved (see `INGEST-CONFLICTS.md` INFO)
- scope: persistence

**Decision:** Full intake responses persist to the Cloud SQL `submissions` table
(`answers_json`), consumed generically by the clinical PDF (`app/lib/pdf.ts:75-85`) and the
admin modal (`app/routes/app.quiz-results.tsx:252-257`). Shopify holds summary metafields
only.

**Superseded:** the Shopify-metafields + Google-Sheets split described in
`docs/HIPAA_COMPLIANCE_ANALYSIS.md:7-10,55-59` and required by
`docs/app-requirements.md:19,67,137-148`. `HANDOFF.md:388-394` records that the
Cloudflare Worker and Google Apps Script that proxied PHI into Sheets were deleted as a
HIPAA violation.

**Residual risk:** no document confirms whether `app/lib/google-sheets.ts` is still wired
into `api.quiz.submit.tsx`. See `INGEST-CONFLICTS.md` WARNING "Google Sheets PHI path may
still be live."

---

## DEC-geo-scope-tn-tx-only

- source: `HANDOFF.md:284` ("Geo scope re-confirmed TN + TX only", client call 2026-06-24); corroborated `docs/quiz-questions-schema.md:27-34`, `docs/app-requirements.md:7`
- status: standing, client-confirmed
- scope: eligibility

**Decision:** Eligibility is limited to Tennessee and Texas. Patients outside those states
stop at the state gate.

---

## DEC-migrate-phi-to-aod-owned-gcp-under-baa

- source: `HANDOFF.md:246-267,411-425` (client call 2026-06-24, "production migration GREENLIT")
- status: agreed and sequenced; blocked on client
- scope: hosting, BAA chain, PHI custody

**Decision:** PHI infrastructure migrates to AOD-owned Google Cloud under AOD's Google
Workspace BAA. Sequence: William stands up AOD Google Workspace (BAA opt-in under Account
Settings → Legal and Compliance) → William stands up AOD Shopify (Basic/Grow) → team grants
Andrew admin on both → Andrew migrates the Cloud SQL DB and transfers the Shopify site.
**Andrew does not want long-term PHI access post-migration.**

Consequence recorded: a Fly.io BAA is likely moot once hosting/PHI lands in AOD-owned Google
Cloud — but confirm where the app itself lands post-migration.
