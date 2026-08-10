---
phase: 04-mandatory-allergy-testing
plan: 10
doc: upload-decisions
generated: 2026-08-10
---

# Phase 4 — Upload Track Decisions

This document is the single source of truth for plans 04-11 through 04-19. It records the
blocker-status evidence and package-legitimacy audit gathered by Task 1, the four open decisions
framed for Andrew at Task 2's checkpoint, and (Section 4) Andrew's ratified answers.

---

## Section 1 — Blocker Status

| # | Blocker | Owner | What it blocks | Current status | Evidence source |
|---|---------|-------|-----------------|-----------------|------------------|
| 1 | William agrees to test-result upload, and it is priced | William / Andrew | All of D-01…D-05 — the entire upload track | Andrew-reported — pending checkpoint | No CLI evidence exists for a commercial/pricing conversation; this is not machine-checkable |
| 2 | Fly.io BAA signed | Andrew | Upload storage + endpoints (PHI transiting/landing on Fly) | Andrew-reported — pending checkpoint | No CLI evidence exists for a signed BAA; `fly` CLI has no BAA-status query. `fly apps list` confirms `alle-drops-quiz-app` is deployed and active (owner `21-ads-media`), which is necessary infrastructure but not evidence of BAA status either way |
| 3 | Production cutover to AOD's Google Cloud project | William / AOD | Upload storage (production) | NOT cleared — confirmed by CLI | `gcloud config get-value project` returns `smart-rope-305817` (Andrew's active gcloud project, NOT `alledrops-quiz`). `gcloud projects list` shows `alledrops-quiz` ("Alledrops Quiz") exists as a distinct project still under Andrew's account — no AOD-owned project appears in the list. `gcloud storage buckets list --project=alledrops-quiz` returns "Listed 0 items" — zero buckets exist anywhere yet, so no cutover has happened and no interim dev bucket exists either |

**Fly secrets present on `alle-drops-quiz-app` (names only, no values printed):**
`AWS_ACCESS_KEY_ID`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`,
`SHOPIFY_API_SECRET`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_SHOP_DOMAIN`,
`GOOGLE_SHEETS_WEB_APP_URL`, `SHOPIFY_API_KEY`, `DATABASE_URL`.

⚠️ The five `AWS_*`/`BUCKET_NAME` secrets are **Tigris**, provisioned for a different, earlier
storage decision. Per this plan's `critical_environment_facts`, Andrew explicitly chose **GCS**
instead so storage lands in the cloud AOD is migrating to. These secrets are not used by this
plan and must not be treated as the upload storage target. `GOOGLE_SHEETS_WEB_APP_URL` is a
leftover from the deprecated Google Sheets path (`app/lib/google-sheets.ts` already throws on
call as a guardrail) — not relevant to this plan either, and not a Google Workspace product in
the PHI path per `CLAUDE.md` rule 3 (it's a legacy secret, not active code).

**Additional environment facts confirmed by CLI (project 04-RESEARCH.md "Environment Availability"):**
- `storage.googleapis.com`, `storage-api.googleapis.com`, `storage-component.googleapis.com` are
  all already enabled on `alledrops-quiz` (`gcloud services list --enabled --project=alledrops-quiz`).
- Zero GCS buckets exist in `alledrops-quiz` today. If this plan track creates one, its name must
  be recorded here and driven entirely by env vars (see Section 3(c) and Section 4).

**Reading:** Blocker 1 and Blocker 2 cannot be verified from a CLI in this environment — they
are commercial/legal facts, not infrastructure facts, and are correctly marked "Andrew-reported —
pending checkpoint." Blocker 3 (production GCP cutover) is independently confirmed NOT cleared:
Andrew's active gcloud identity is a different project entirely, `alledrops-quiz` remains
Andrew's own dev project (not an AOD-owned project), and it holds zero buckets.

---

## Section 2 — Package Legitimacy Audit

Live registry data pulled 2026-08-10 (not copied from 04-RESEARCH.md, which was dated 2026-08-09):

| Package | Live version | Last publish (`time.modified`) | Repository | `scripts.postinstall` | Weekly downloads | Registry URL |
|---------|--------------|--------------------------------|-------------|------------------------|-------------------|---------------|
| `@remix-run/form-data-parser` | `0.17.4` | 2026-07-01 | `github.com/remix-run/remix` | *(empty)* | 48,243 | https://npmjs.com/package/@remix-run/form-data-parser |
| `@google-cloud/storage` | `7.21.0` | 2026-06-08 | `github.com/googleapis/google-cloud-node` | *(empty)* | 15,503,019 | https://npmjs.com/package/@google-cloud/storage |
| `heic-convert` | `2.1.0` | 2023-11-30 | `github.com/catdad-experiments/heic-convert` | *(empty)* | 1,055,470 | https://npmjs.com/package/heic-convert |
| `pdf-lib` | `1.17.1` | **2022-05-12** | `github.com/Hopding/pdf-lib` | *(empty)* | 10,926,366 | https://npmjs.com/package/pdf-lib |

All four `npm view <pkg> scripts.postinstall` calls returned empty — confirmed independently from
04-RESEARCH.md's research-time check.

### `slopcheck scan` verdict

`slopcheck` was fetched via `npx -y slopcheck` (a one-time CLI invocation, not an `npm install`
into this project — `package.json`/`package-lock.json` remain untouched, confirmed by
`git diff --quiet package.json package-lock.json` exiting clean both before and after). The
registry's current published version is `0.2.0` (not the `0.6.1` 04-RESEARCH.md recorded — likely
a different local/dev build was used during research; this is a version discrepancy worth noting,
not a security concern, since `0.2.0`'s own purpose statement — "Scan markdown and config files
for hallucinated npm package names. Defends against slopsquatting supply chain attacks." — matches
exactly what this gate needs).

`slopcheck` has no `install` subcommand in the currently published `0.2.0` — it only scans
files/directories for package-name references. It was run (in scan mode, no side effects) against
a scratch markdown file containing the exact `npm install` command line for all four packages:

```json
{
  "version": "0.2.0",
  "scanned": 1,
  "packages": { "total": 4, "valid": 4, "notFound": 0, "unpublished": 0, "securityHold": 0, "errors": 0 },
  "findings": []
}
```

**Verdict: all four packages `valid`. Zero `notFound`, zero `unpublished`, zero `securityHold`,
zero `errors`, zero `findings`.** No `[SLOP]` verdict on any package. No `[SUS]` verdict on any
package. `slopcheck install` was NOT executed — confirmed via `git diff --quiet package.json
package-lock.json` exiting 0 both immediately before and immediately after the scan.

### ⚠️ Assumption A1 flagged for the human (Task 2 item 2)

`pdf-lib`'s last publish is **2022-05-12** — roughly four years stale as of this plan's execution
date (2026-08-10). `slopcheck` still reports it `valid` (existence/typosquat check, not a
staleness/CVE check). No open CVE was found against `pdf-lib` during this audit pass (a `npm
audit --omit=dev` re-check happens post-install in Task 3, per the plan). The residual risk is
bounded because `pdf-lib` in this app's design only *merges* PDFs the app itself produces plus
patient-uploaded pages — it never renders untrusted PDF structure to a screen. This requires
Andrew's explicit acceptance at the checkpoint, not a default assumption.

---

## Section 3 — Decisions Pending

### (a) Size caps

**Recommendation:** `MAX_FILE_BYTES = 15 * 1024 * 1024` (15 MB), `MAX_TOTAL_BYTES = 50 * 1024 *
1024` (50 MB), `MAX_FILES = 10`.

**Reasoning:** an iPhone HEIC photo of a paper page runs roughly 2–4 MB, so a four-page panel is
around 16 MB; 15 MB per file leaves headroom for a high-resolution scan while capping single-request
memory pressure on the current 1 GB Fly VM. These numbers substitute directly into three
patient-facing error strings in `04-UI-SPEC.md`'s Copywriting Contract (`{N} MB` per-file limit,
`{M} MB` total limit, and the format/size caption "PDF, JPEG, PNG, or HEIC · up to {N} MB per file,
{M} MB total."), so changing them later is a copy change, not just a config change.

### (b) Upload architecture

**Recommendation:** **Fly-proxied**, one file per request, streamed via
`@remix-run/form-data-parser` directly into a GCS resumable upload.

**Reasoning:** this keeps magic-byte validation and HEIC conversion synchronous and inline in one
request — the only place server-side content validation can happen before bytes land in storage.
Direct-to-GCS requires a second server-side validation pass triggered by either a client "confirm
upload" POST (spoofable) or a Pub/Sub finalize notification (new infrastructure), plus CORS
configuration on a PHI bucket. Realistic concurrency here is individual patients, not bulk
traffic. Named mitigation for the 1 GB VM: bump `[[vm]] memory` to `2gb` in plan 04-17 — a
one-line change already documented as a commented option in `fly.toml`.

### (c) Dev storage target

**Recommendation:** build against a bucket in Andrew's `alledrops-quiz` project now, mirroring the
Cloud SQL dev precedent, with bucket and project driven entirely by `GCS_BUCKET_NAME` and
`GCS_PROJECT_ID` env vars — never hardcoded — so the AOD cutover is a config change, not a code
change.

**Reasoning for:** Blocker 3 blocks *production* storage, not dev-environment engineering.

**Opposing reading, presented without picking:** 04-RESEARCH.md Open Question 4 is explicit that
Blocker 1 (William's agreement AND pricing) arguably gates writing any upload code at all, not
just shipping it. That is a commercial call, not a technical one, and this document does not
resolve it — Andrew resolves it at the checkpoint.

### (d) Virus scanning

**Recommendation:** leave virus/malware scanning out of Phase 4 as a documented risk acceptance.

**Reasoning:** GCP's own reference architecture for this needs Cloud Run + Pub/Sub + a ClamAV
DB-mirror pipeline, and is itself blocked on the same GCP cutover (Blocker 3) as everything else
in D-04. Compensating controls that DO ship in this phase: an extension-independent magic-byte
allowlist (PDF/JPEG/PNG/HEIC signatures, never trusting client-declared `Content-Type` or file
extension), the size caps from (a), and no execution path for uploaded bytes anywhere in the app
(uploaded files are never `eval`'d, `require`'d, shelled out to, or served with an
execute-permitting `Content-Disposition` — always `attachment`, never inline-rendered in a
browser context). Revisit virus scanning after the GCP cutover (Phase 8) gives access to Cloud Run
in the AOD-owned project.

---

## Section 4 — Ratified

**Date:** 2026-08-10. Andrew answered all six checkpoint items in-session (see execution prompt
`<andrew_has_already_answered_this_plans_checkpoint>`). Verbatim/paraphrased answers below,
transcribed by the executor per that authorization — this checkpoint was **not** re-asked live.

1. **Blocker 1 (William's agreement + pricing for upload): CLEARED.** Andrew's words: "Execute all
   waves no William blocker." The commercial/pricing conversation with William is treated as
   resolved for the purpose of proceeding with engineering.

2. **Blocker 2 (Fly.io BAA signed): STILL OPEN.** **Blocker 3 (AOD GCP cutover): STILL OPEN.**
   Andrew chose to **build against dev GCS now** in `alledrops-quiz`, mirroring how Cloud SQL
   already runs as dev in that project. Justification he accepted: only synthetic test data flows
   through this environment — `04-CONTEXT.md` D-01 records that `submissions` holds **TEST DATA
   ONLY**, and Phase 8 still gates NPP, the BAA chain, and workforce HIPAA training before any real
   patient. **Bucket and project MUST be env-var driven (`GCS_BUCKET_NAME`, `GCS_PROJECT_ID`) so
   the AOD cutover is a config change, not a rewrite.**

   ⚠️ **RECORDED PROMINENTLY: no real patient PHI may flow through this path until Blockers 2 and
   3 clear.** That is a **Phase 8 gate**, not a Phase 4 one. Every downstream plan (04-11..04-19)
   must treat the GCS integration as dev/test-data-only infrastructure, not production-ready
   storage, until Phase 8 closes this gate.

3. **Package legitimacy: ALL FOUR APPROVED** — `@remix-run/form-data-parser`,
   `@google-cloud/storage`, `heic-convert`, `pdf-lib`. Andrew explicitly accepted `pdf-lib`'s
   ~4-year staleness (last publish 2022-05-12), understanding it is required because the incumbent
   `pdfkit` cannot merge another PDF's pages (`foliojs/pdfkit#318`).

4. **Size caps: 15 MB per file / 50 MB total / 10 files max.** APPROVED as recommended in Section
   3(a). These values substitute into the three patient-facing error strings identified in
   `04-UI-SPEC.md`'s Copywriting Contract (wrong file type is unaffected by caps; per-file size
   exceeded uses `{N} MB` = 15; total size exceeded uses `{M} MB` = 50) — plan 04-16 performs that
   substitution per this plan's frontmatter `key_links`.

5. **Upload architecture: Fly-proxied.** APPROVED as recommended in Section 3(b) — not
   direct-to-GCS signed PUT. Content validation stays synchronous and pre-storage, inline in the
   same request that receives the bytes.

6. **Virus scanning: DEFERRED, with documented risk acceptance.** APPROVED as recommended in
   Section 3(d). Not built in Phase 4. Compensating controls that DO ship: magic-byte validation,
   MIME/extension-independent allowlist, the size caps above, and no execution path for uploaded
   bytes anywhere in the app. **Owning phase for revisiting virus scanning: Phase 8**, alongside
   the GCP production cutover that unlocks a Cloud Run-based ClamAV pipeline.

### Named constants and env vars (single source of truth for plans 04-11 through 04-19)

```
MAX_FILE_BYTES         = 15 * 1024 * 1024   (15 MB)
MAX_TOTAL_BYTES         = 50 * 1024 * 1024   (50 MB)
MAX_FILES               = 10

GCS_BUCKET_NAME          — env var, never hardcode a bucket name
GCS_PROJECT_ID           — env var, never hardcode a project id
GCS_PENDING_PREFIX       = "pending/"
GCS_PERMANENT_PREFIX     = "submissions/"
SIGNED_URL_TTL_SECONDS   = 300
PENDING_OLM_AGE_DAYS     = 2
```

This file is the single source of truth for plans 04-11 through 04-19. Every downstream upload
plan reads its constants, env var names, and architecture decision from this section rather than
re-deriving or re-guessing them. Plan 04-16 substitutes the `MAX_FILE_BYTES`/`MAX_TOTAL_BYTES`
values (as `{N} MB`/`{M} MB`) into `04-UI-SPEC.md`'s Copywriting Contract error strings.

**Standing constraint carried forward from item 2 above: no real patient PHI may flow through this
GCS path until Blockers 2 (Fly.io BAA) and 3 (AOD GCP cutover) clear. That gate belongs to Phase
8, not Phase 4 — every downstream plan builds and tests against dev/test-data only.**
