# SYNTHESIS — AlleDrops go-live doc ingest

Entry point for `gsd-roadmapper`. Produced by `gsd-doc-synthesizer` on 2026-07-29.

**Milestone goal:** AlleDrops go-live for client Allergist On Demand (AOD) — a Shopify
storefront plus a HIPAA-shaped clinical symptom quiz for sublingual immunotherapy (SLIT),
Tennessee and Texas only.

**Mode:** `new` — net-new bootstrap, no prior `.planning/` to merge against.

---

## Status

**READY TO ROUTE — with 4 warnings requiring user resolution first.**

0 blockers · 4 warnings · 14 auto-resolved.
Full detail: `.planning/INGEST-CONFLICTS.md`

The four warnings do not block roadmapping in general, but each one gates specific work:

1. **Score range / severity-scale semantics unresolved** → blocks the R4 scale visual and the
   derived max-score function. The R4 title and business-day copy edits are unblocked.
2. **Google Sheets PHI path may still be live in code** → verify before anything is routed.
   Potential live HIPAA violation, not a planning question.
3. **Product domain spelling unresolved, live `ALLERDROPS®` trademark exposure** → blocks DNS,
   domain purchase, and Workspace domain configuration.
4. **Klaviyo loading on the PHI-collecting quiz page** → potential reportable breach under the
   project's own runbook; also invalidates the privacy-policy carve-outs awaiting counsel.

---

## Documents synthesized — 9

| Precedence | Path | Type | Locked |
|---|---|---|---|
| 0 | `docs/REQUIREMENTS-AND-GAPS-2026-07-29.md` | SPEC | **LOCKED** |
| 1 | `docs/HIPAA_COMPLIANCE_ANALYSIS.md` | SPEC | no |
| 2 | `docs/quiz-questions-schema.md` | SPEC | no |
| 3 | `docs/app-requirements.md` | PRD | no |
| 4 | `HANDOFF.md` | DOC | no |
| 5 | `docs/STOREFRONT_CONTENT_AUDIT.md` | DOC | no |
| 6 | `docs/UX-AUDIT.md` | DOC | no |
| 7 | `docs/breach-response-runbook.md` | DOC | no |
| 8 | `docs/PERFORMANCE_OPTIMIZATION.md` | DOC | no |

Counts by type: 3 SPEC · 1 PRD · 5 DOC · 0 ADR · 0 UNKNOWN.
All 9 classifications were `high` confidence with `manifest_override: true`. None required
re-tagging.

**Cycle detection:** cross-ref graph built from all 9 classifications, 4 doc-to-doc edges (all
from precedence 0), max traversal depth 2, **no cycles**. Well inside the depth-50 cap.

---

## Decisions — 11 (6 LOCKED, from one locked source)

`intel/decisions.md`

**No ADRs exist in the ingest set.** Decisions are derived from the locked precedence-0 SPEC
(whose "CALL OVERRIDE" markers carry decision authority per the manifest) and from the explicit
"Decision" statement in `docs/HIPAA_COMPLIANCE_ANALYSIS.md:5`.

LOCKED — from the 2026-07-29 William Miller client call, source
`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md`:

- `DEC-mandatory-allergy-testing` — testing is mandatory; two options only; no path to purchase
  without it
- `DEC-purchase-gating-is-honor-system` — prerequisite checkboxes plus human verification at
  fulfillment; no account flags, no Shopify Functions, no real-time blocking
- `DEC-medical-history-before-testing-split` — every patient supplies a history, including
  telehealth-only
- `DEC-testing-results-by-email-not-upload` — results to `testing@alledrops.com`; no PHI file
  infrastructure
- `DEC-no-approval-promise-copy` — the 6/27 "purchase if approved" paragraph must not ship
- `DEC-derive-max-score-from-question-set` — ceiling derived in code, not hardcoded

Not locked:

- `DEC-scoring-decoupled-from-quiz-parts` — new sections cannot alter the score (as-built)
- `DEC-treat-quiz-data-as-phi` — pending final legal confirmation
- `DEC-phi-persists-in-cloud-sql-not-google-sheets` — auto-resolved by precedence
- `DEC-geo-scope-tn-tx-only` — client-confirmed 2026-06-24
- `DEC-migrate-phi-to-aod-owned-gcp-under-baa` — greenlit 2026-06-24, blocked on client

---

## Requirements — 30

`intel/requirements.md`

**Already satisfied (8):** `REQ-state-gate-tn-tx` · `REQ-patient-info-step` ·
`REQ-scored-questionnaire-parts-1-5` · `REQ-none-of-the-above-options` ·
`REQ-submission-persistence` · `REQ-shopify-summary-metafields` ·
`REQ-patient-ledger-and-pdf` · `REQ-admin-submission-surfaces` (partial — drill-down and export
open)

**Reversed by the locked call — build to precedence 0 (7):**
`REQ-mandatory-allergy-testing-split` · `REQ-remove-no-testing-paths` ·
`REQ-testing-results-by-email` · `REQ-medical-history-mandatory` ·
`REQ-purchase-gating-honor-system` · `REQ-fulfillment-verification-process` ·
`REQ-testing-claims-content-remediation`

**New from the call (8):** `REQ-quiz-schema-foundation` · `REQ-preliminary-score-page` ·
`REQ-derived-max-score` · `REQ-allergy-diagnosis-question` · `REQ-telehealth-intake-path` ·
`REQ-returning-patient-completion-surface` · `REQ-customer-metafield-definitions` ·
`REQ-consult-landing-page`

**Defects (4):** `REQ-iframe-parent-navigation` · `REQ-scroll-to-top-on-step-change` ·
`REQ-medication-question-copy` · `REQ-correct-product-handles`

**Content / compliance (2):** `REQ-consent-and-disclaimer-finalization` · `REQ-consent-step`

**Explicitly NOT committed (1):** `REQ-resume-draft-persistence` — 1+ week, architecturally
hard, source directive is "Do not let this get promised casually." Do not schedule into
go-live; record as a known risk. Mandatory testing makes the abandonment point more likely,
and abandonment loses the entire questionnaire.

### Hard sequencing the roadmapper must honour

1. `REQ-quiz-schema-foundation` (`required`, `showIf`, static-info type) is **load-bearing for**
   `REQ-medical-history-mandatory`, `REQ-mandatory-allergy-testing-split`, and
   `REQ-allergy-diagnosis-question`. Schedule it first or accept five more ID-literal hardcodes
   across two files.
2. `REQ-medical-history-mandatory` **must land before** `REQ-remove-no-testing-paths`.
   `setStep("medical_history")` is the only entry point to the section; deleting the no-testing
   path first turns medical history into dead code. Recorded as
   `constraints.md#CON-sequencing-r3-before-r5`.
3. `REQ-customer-metafield-definitions` is a **spike** that gates
   `REQ-purchase-gating-honor-system` and `REQ-returning-patient-completion-surface`.
4. `REQ-consult-landing-page` blocks `REQ-telehealth-intake-path`.
5. `REQ-derived-max-score` is blocked on WARNING 1 (score-range decision).
6. `REQ-allergy-diagnosis-question` is blocked on confirming scope with William.

### Cheap wins available immediately
Per the locked audit's own effort ranking: R7.2 scroll fix (15 min), R2 label copy (10 min),
R4 title + business-day copy (30 min), R7.1 routing + handle typo (1–2 h). Full ranking
reproduced in `context.md#effort-ranking-from-the-locked-audit`.

---

## Constraints — 23

`intel/constraints.md`

Type breakdown: 12 `nfr` · 5 `schema` · 5 `protocol` · 1 `api-contract`

**Compliance (HIPAA) — all pending final legal confirmation:**
`CON-phi-classification` · `CON-no-phi-in-shopify` · `CON-baa-chain-required-for-every-phi-surface` ·
`CON-no-third-party-trackers-on-phi-pages` · `CON-phi-retention-and-breach-obligations` ·
`CON-audit-logging-and-consent-versioning` ·
`CON-legal-content-prerequisites-before-first-patient` · `CON-no-long-term-phi-access-for-agency`

The three named by the orchestrator as binding are all present and routed here: PHI isolation,
Google Workspace BAA required, Shopify must not hold PHI.

**Data contracts:** `CON-quiz-submission-payload` · `CON-validation-rules` ·
`CON-score-brackets` · `CON-scored-question-set-is-parts-1-5` · `CON-shopify-metafield-schema` ·
`CON-submissions-table`

**Sequencing and platform:** `CON-sequencing-r3-before-r5` ·
`CON-quiz-schema-foundation-is-load-bearing` · `CON-iframe-embed-path` ·
`CON-shopify-plan-and-scope-limits` · `CON-theme-bundle-build-step` · `CON-geo-scope-tn-tx` ·
`CON-clinical-content-requires-client-signoff`

**Advisory:** `CON-cold-start-and-health-endpoint` · `CON-cloud-sql-tier-defaults`

---

## Context topics — 14

`intel/context.md`

Project state as of 2026-07-29 · what is built · security findings (all fixed) ·
open verification items · open pre-launch blockers (UX-AUDIT) · storefront content inventory ·
infrastructure and cost · client engagement and commercial state · domain and trademark
(unresolved) · production migration sequence · policy drafts · compliance operations ·
open technical flags · things William was told that the code does not support ·
effort ranking · unresolved items from the locked audit · Phase 2.5 deferred ·
process lessons.

Notable state the roadmapper should not lose:
- Code is "roughly one third of the way to what William now expects"
  (`docs/REQUIREMENTS-AND-GAPS-2026-07-29.md:13`). `main`, 51/51 tests, deployed.
- Live app→DB round trip unverified since the 2026-07-28 Cloud SQL downsize. One live
  submission needed; it writes a PHI row.
- Test row `diag+preflight@example.com` still not confirmed deleted (carried since session 27).
- $1,800 invoice and Phase 2 SOW unblocked by the 2026-07-29 call and not yet sent.
- Nine items on record as "told to William, not supported by the code" — an
  expectations-management inventory.
- Phase 2.5 list is explicitly deferred; do not scope it in.

---

## Files

- `.planning/intel/decisions.md`
- `.planning/intel/requirements.md`
- `.planning/intel/constraints.md`
- `.planning/intel/context.md`
- `.planning/INGEST-CONFLICTS.md` ← read before routing
- `.planning/intel/classifications/*.json` (9 files, inputs)

## Provenance note

Classification filenames carry stable path-derived placeholder tokens, **not** SHA-256
suffixes — the classifiers had no shell access. The authoritative identifier for each
classification is its internal `source_path` field, which is what this synthesis indexed on.
