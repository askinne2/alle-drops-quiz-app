---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 04.1 context gathered
last_updated: "2026-08-10T14:51:04.103Z"
last_activity: 2026-08-10 -- Phase 04.1 execution started
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 42
  completed_plans: 39
  percent: 30
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-29)

**Core value:** A patient in TN or TX can complete a clinical intake Dr. Sullivan can treat from, on
AOD-owned infrastructure, without PHI leaving the BAA chain.
**Current focus:** Phase 04.1 — testing-first-quiz-order

## Current Position

Phase: 04.1 (testing-first-quiz-order) — CODE-COMPLETE, HELD (not shipped)
Plan: 6 of 6 executed, but 04.1-06 is PARTIAL (Task 1 only; Tasks 2–3 deferred)
Status: Awaiting Phase 04.2 — Andrew chose to merge and deploy 04.1 together with 04.2
Last activity: 2026-08-10 -- PR #22 opened, all gates green, merge + deploy deliberately held

**The reorder is NOT live.** Fly is still on **v51** and Shopify on
**alledrops-quiz-production-22**, both carrying the OLD part order with allergy testing last.
PR #22 (https://github.com/askinne2/alle-drops-quiz-app/pull/22) is open and unmerged by choice,
overriding D-10. See `.planning/phases/04.1-testing-first-quiz-order/04.1-06-SUMMARY.md`.

**⚠ Highest-risk consequence of holding — read before starting Phase 04.2.**
`public/quiz-bundle.js` is a committed build artifact. If Phase 04.2 branches off `main` and rebuilds
the theme bundle, the rebuild comes from a source tree that does NOT contain the `QUIZ_PARTS`
reorder, and the shipped bundle silently reverts to allergy-testing-last while every 04.2 test still
passes. **Branch 04.2 from `phase-4.1-testing-first-quiz-order`, or merge it in first.** The guard
`tests/quiz-bundle-freshness.test.ts` (Phase 4.1 block) will catch this if it runs — it asserts the
built artifact's part order — but only if 04.2's branch carries that test too.

Progress: [██████████] 100% of Phase 4

Codebase baseline: `main` @ `ea3dd26` (merge of `phase-4-mandatory-allergy-testing`, PR #20),
**558 tests / 37 files passing**, typecheck clean, build clean, theme bundle byte-identical to the
committed artifact. Deployed to Fly (`alle-drops-quiz-app`, iad) release **v51**; Shopify app version
**alledrops-quiz-production-22**. Phase 1 shipped DEF-01..04 plus three security fixes. Phase 2 made
the quiz schema declarative (`required`, `showIf`, info blocks). Phase 3 replaced the vestigial Part 6
medical-history checklist with a mandatory HIST-01..04/DIAG-01 section, removed both no-testing
bypasses, and closed the asymmetric app-code/DDL migration for the two legacy PHI columns. Phase 4
added the Part 7 testing split with a required multi-file upload, the app's first binary PHI path
(GCS staging → promotion → `submission_files` → retrieval on three surfaces), and closed a live
TEST-07 defect where 0–2 bracket patients auto-submitted with a `consent_version` they never saw.

**Phase 4 deploy verification (2026-08-10), all on served bytes rather than exit codes:**

| | v50 | v51 |
|---|---|---|
| served `/quiz-bundle-js` | 186,738 B | **195,102 B**, byte-identical to the committed artifact |
| `fileUpload__dropzone` | 0 | **9** |
| `testing_status` | 0 | **7** |
| `testing_files` | 0 | **1** |
| `Step ` / `Part ` | 2 / 1 | **1 / 0** (UAT defect #6 fix) |

`/health` 200. A live `POST /api/quiz/upload` against production returned 200 with a staging token
and the object was confirmed in `gs://alledrops-quiz-uploads-dev/pending/` — the first proof that the
Fly VM can authenticate to GCS at all. Admin PDF download for submission `faac0486…` returned
**316,771 bytes** against 3,457 pre-deploy, confirming the uploaded JPEG embeds. Probe objects
deleted; bucket holds only the one real UAT object.

**Standing risk, now mitigated (not fully closed):** three prior defects (session 32/33, plus this
phase's own two UAT findings) all shipped past a fully green suite from the same blind spot — no test
rendered `QuizPartRenderer` or `QuizContainer`. Phase 3 plan 03-04 adopted DOM test infrastructure
(`jsdom`, `@testing-library/react`, Andrew-approved) and plan 03-05 added a first DOM-rendering test,
closing part of the gap. The two Phase 3 UAT defects (`bfa0431`, `1da8c3d`) were still caught by a
human, not CI, so the blind spot is narrowed but not eliminated. **Phase 4 produced defect #6 in the same
way** — the split step counter ("Step 2 of 9" then "Part 1 of 7") passed 550 green tests and was caught by
Andrew clicking. The tally is now six. Keep the human browser pass.

## Performance Metrics

**Velocity:**

- Total plans completed: 11
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6 | - | - |
| 2 | 4 | - | - |

**Recent Trend:** No data yet.
| Phase 03 P01 | 45min | 3 tasks | 5 files |
| Phase 03-mandatory-medical-history P02 | 6min | 3 tasks | 10 files |
| Phase 03 P03 | 25min | 3 tasks | 4 files |
| Phase 03 P04 | 55min | 3 tasks | 5 files |
| Phase 03 P05 (Tasks 1-2 only; Task 3 checkpoint outstanding) | 35min | 2 tasks | 3 files |
| Phase 03 P06 | 15min | 2 tasks | 1 files |
| Phase 03 P07 | 20min | 3 tasks | 0 files |
| Phase 04 P01 | 5min | 3 tasks | 3 files |
| Phase 04 P02 | 12min | 3 tasks | 3 files |
| Phase 04 P03 | 6min | 2 tasks | 3 files |
| Phase 04-mandatory-allergy-testing P05 | 11min | 2 tasks | 4 files |
| Phase 04-mandatory-allergy-testing P06 | 20min | 3 tasks | 4 files |
| Phase 04 P07 | 10min | 2 tasks | 2 files |
| Phase 04 P08 | 35min | 3 tasks | 4 files |
| Phase 04-mandatory-allergy-testing P09 | 20min | 2 tasks | 2 files |
| Phase 04 P10 | 20min | 3 tasks | 2 files |
| Phase 04 P11 | 10min | 3 tasks | 3 files |
| Phase 04-mandatory-allergy-testing P12 | 25min | 3 tasks | 6 files |
| Phase 04-mandatory-allergy-testing P13 | 15min | 3 tasks | 2 files |
| Phase 04 P14 | 20min | 3 tasks | 8 files |
| Phase 04 P15 | 20min | 2 tasks | 2 files |
| Phase 04-mandatory-allergy-testing P16 | 55min | 3 tasks | 5 files |
| Phase 04-mandatory-allergy-testing P17 | 35min | 3 tasks | 6 files |
| Phase 04-mandatory-allergy-testing P18 | 20min | 2 tasks | 7 files |

## Accumulated Context

### Roadmap Evolution

- Phase 04.1 inserted after Phase 4: Testing-First Quiz Order — move the allergy-testing split and required upload to the front of the quiz so abandonment costs 30 seconds, not 10 minutes (URGENT)
- Phase 04.2 inserted after Phase 4: Resume In-Progress Intake — **browser-local `localStorage` only.** The server draft store + emailed magic link version was scoped and deliberately DROPPED (~1+ week, two new BAA surfaces); this line originally described it and is corrected here. No draft PHI table, no email provider, no BAA implication. Partially reverses the recorded out-of-scope decision on resume — browser-local is in, cross-device stays out (URGENT)

### Decisions

Six LOCKED decisions from the 2026-07-29 William Miller call are in PROJECT.md `<decisions>`.
Affecting current work:

- Testing is mandatory; no path to purchase without it (`DEC-mandatory-allergy-testing`)
- Medical history moves before the testing split and must land BEFORE the bypasses are deleted
  (`DEC-medical-history-before-testing-split`)

- Purchase gating is an honor system — no account flags, Functions, or real-time blocking
  (`DEC-purchase-gating-is-honor-system`)

- ~~Test results come by email, not upload — no PHI file infrastructure~~
  (`DEC-testing-results-by-email-not-upload`) — **RETRACTED 2026-08-09 by 04-CONTEXT.md D-01.** Upload is
  required. Shipped in Phase 4 and live on Fly v51. Retained struck through so the reversal is visible.

- The "purchase if approved" paragraph must not ship (`DEC-no-approval-promise-copy`)
- Max score is derived from the question set, never hardcoded (`DEC-derive-max-score-from-question-set`)
- [Phase 03]: 03-01: Tasks 1+2 combined into one commit — Task 2's getQuestionById fix is a compile-time requirement for Task 1's PART6_MEDICAL_HISTORY type widening (QuizQuestion[] -> QuizItem[]) to typecheck
- [Phase 03]: 03-01: current_medications kept required (not required:false) — comorbidity checklist is itself required so isAnswered is always true by completion; a required safety field over-collects rather than silently omits
- [Phase 03-mandatory-medical-history]: 03-02: QuizContainer.tsx left untouched — client-side personal_history/family_history closure is plan 03-03's scope per the plan's own threat model (T-3-01), not this plan's files_modified list
- [Phase 03]: 03-03: D-11 proceed-without-testing chain and D-12 medical_history FlowStep both deleted from QuizContainer.tsx/ResultsDisplay.tsx; extra payload parameter removed, closing T-3-01's client half
- [Phase 03]: 03-03: source-text guard tests/quiz-medical-history-deletion.test.ts proven RED (11 QuizContainer.tsx + 1 ResultsDisplay.tsx assertions failed) against pre-change source before going green — guard's own prose contains medical_history 9x, intentionally, per its own acceptance criteria
- [Phase 03-mandatory-medical-history]: 03-04: Task 1's package-legitimacy checkpoint (jsdom, @testing-library/react) explicitly approved by Andrew in-session; DOM test infra adopted as devDependencies only, closing the QUIZ_PARTS -> itemsForPart -> renderer blind spot behind three prior UAT defects
- [Phase 03]: 03-04: gate/reveal fusion CSS (.questionCard__gateParent/.revealChild) derived purely from showIf+required, zero question-ID literals; InfoBlockCard given its own .infoBlockCard class family and role=note, no longer sharing classes with a question card
- [Phase 03]: 03-05 (Tasks 1-2): public/quiz-bundle.js rebuilt (185796 -> 186699 bytes), folding in three commits of deferred quiz-source changes from 03-01/03-03/03-04; freshness guard extended with 5 presence + 2 absence Phase-3 markers, each independently proven 0-before/>=1-after (or 6-before/0-after for the absence pair); phase-wide absence/presence audit all clean in live code (358/27 tests green, typecheck clean, both builds green, theme build proven deterministic). Task 3 (8-check human browser verification) is outstanding — plans 03-06/03-07 remain blocked until Andrew completes it.
- [Phase 03]: 03-06: Named on-demand Cloud SQL backup taken and verified before any DDL: ID 1786306233540, SUCCESSFUL, read back via `gcloud sql backups list`/`describe` rather than trusted from exit code
- [Phase 03]: 03-06: migrations/003_drop_medical_history_legacy_columns.sql authored and committed alone (D-01 non-negotiable) — no DDL executed, plan 03-07 runs it after app code is confirmed live on Fly
- [Phase 03-mandatory-medical-history]: 03-07: PR #19 merged to main (ac40f09) by Claude under Andrew's explicit in-session authorization ('keep moving forward'), overriding CLAUDE.md's default merge rule the same way as PR #16-18
- [Phase 03-mandatory-medical-history]: 03-07: DROP COLUMN executed against alledrops_quiz_dev only after re-verifying all four preconditions independently (backup SUCCESSFUL, merge on main, Fly v50 live on served bytes, fresh 42/18 pre-DDL count); row count held at 42 before/after, both columns confirmed gone, post-DDL synthetic POST proved the write path survived
- [Phase 04]: Retracted DEC-testing-results-by-email-not-upload in place in PROJECT.md, REQUIREMENTS.md TEST-04, and CLAUDE.md per 04-CONTEXT.md D-01 — upload is now required, not email-only
- [Phase 04]: 04-02: file_multi stays a normal QuizQuestion (string[] answer shape), not a new QuizItem union member, per 04-UI-SPEC.md Component Inventory §1
- [Phase 04]: 04-02: all three new question types (radio_single, text_input_short, file_multi) merged into isAnswered's existing five behavioral groups rather than new return expressions — zero new code outside isAnswered, single hunk diff on schema.ts
- [Phase 04]: 04-03: Replacement consent text copied verbatim from 04-UI-SPEC.md D-11 interim copy; CONSENT_VERSION bumped to draft-2026-08-09 in the same plan so the stored version identifies the text a patient actually agreed to
- [Phase 04]: 04-03: UNCONFIRMED JSX comment paraphrases the removed [PENDING] placeholder rather than quoting it literally, so the comment itself doesn't reintroduce the occurrence the automated guard checks for
- [Phase 04]: 04-05: Theme push authorized and executed — commit 9c36e0f pushed to live Sense theme (135799767246); Klaviyo disabled: true, orphaned page.testing-options.json removed, redirect URLs confirmed already correct
- [Phase 04]: 04-05: TEST-06 reassigned to Phase 8 (from Phase 4) — measured on live served bytes that both target surfaces (product pages, /pages/test-options) render Shopify Admin content (product.description, page.content), not theme-repo source; no theme push can close it. Not marked complete.
- [Phase 04]: 04-05: Non-vacuity control corrected from plan's literal data-alledrops-quiz needle (0 occurrences, does not exist in current markup) to id="alledrops-quiz plus the appointly control, both nonzero on all fetches
- [Phase 04]: 04-06: PART7_ALLERGY_TESTING added to QUIZ_PARTS as 7th part (radio_single testing_status gate + 3 required showIf-gated text fields), zero score contribution; getQuestionById widened to resolve Part 7 IDs
- [Phase 04]: 04-06: Part 7 banner comment in questions.ts describes the deferred file_multi upload question without the literal substring testing_files, since the plan's own acceptance check requires zero occurrences of that string in questions.ts until plan 04-16 adds it
- [Phase 04]: 04-07: radio_single shares its block with control_0_3 via case-label fallthrough (not duplication); text_input_short is a duplicated block from text_input since the two differ in control element
- [Phase 04]: 04-07: Part 7 DOM coverage added (TEST-01/02/03) through the real QUIZ_PARTS -> itemsForPart -> QuizPartRenderer seam and the real isPartComplete export; suite now 392/27
- [Phase 04]: Closed the live TEST-07 defect: deleted the 0-2 auto-submit chain; every bracket now routes through ConsentStep before submit (D-09)
- [Phase 04]: Resolved the symptom_profile_id double-submit defect for free by deleting the multi-exit pre-consent outcome screen; verified there is exactly one submitPayload() call site
- [Phase 04]: 04-09: public/quiz-bundle.js rebuilt (186764 -> 185946 bytes), folding in plans 04-02/04-03/04-06/04-07/04-08; theme build proven deterministic across two consecutive builds (identical SHA-256); freshness guard extended with 10 Phase-4 markers (7 presence, 3 absence), each independently measured 0-before/>=1-after (or reverse). Full suite 426/28, typecheck clean, both builds clean.
- [Phase 04]: 04-09: file_multi measured (0 before, 1 after) but deliberately withheld from the freshness guard since its upload widget ships in plan 04-16; text_input_short used instead for the 04-02 schema marker slot.
- [Phase 04]: 04-10: Blocker 1 (William agreement + pricing) treated as CLEARED per Andrew's explicit in-session authorization ('Execute all waves no William blocker')
- [Phase 04]: 04-10: Blockers 2 (Fly.io BAA) and 3 (AOD GCP cutover) remain OPEN; Andrew authorized building against dev GCS in alledrops-quiz now (env-var-driven GCS_BUCKET_NAME/GCS_PROJECT_ID), mirroring the Cloud SQL dev precedent. No real patient PHI may use this path until Phase 8 closes both blockers.
- [Phase 04]: 04-10: Upload track ratified: MAX_FILE_BYTES=15MB / MAX_TOTAL_BYTES=50MB / MAX_FILES=10, Fly-proxied architecture (not direct-to-GCS signed PUT), virus scanning deferred to Phase 8 with magic-byte allowlist + size caps as compensating controls. Recorded in 04-UPLOAD-DECISIONS.md, the single source of truth for plans 04-11 through 04-19.
- [Phase 04]: 04-10: Four upload-track packages installed (@remix-run/form-data-parser@0.17.4, @google-cloud/storage@7.21.0, heic-convert@2.1.0, pdf-lib@1.17.1) after slopcheck scan + live registry audit + Andrew's per-package review; zero postinstall scripts confirmed pre- and post-install. npm audit surfaced one new moderate transitive finding (uuid <11.1.1 via @google-cloud/storage's gaxios/teeny-request chain) — documented, not auto-fixed, since the only remediation is a breaking downgrade to @google-cloud/storage@5.18.3.
- [Phase 04]: 04-11: submission_files migration authored and committed alone (D-01); zero DDL executed. Data-access layer's insertSubmissionFiles introduces the codebase's first client-level pool.connect()/BEGIN/COMMIT/ROLLBACK transaction. Ownership boundary proven non-vacuous by direct source mutation (predicates removed, test failed RED, file restored).
- [Phase 04-mandatory-allergy-testing]: 04-12: app/lib/storage/gcs.ts, upload-validation.ts, heic.ts added — env-driven GCS client (GCS_BUCKET_NAME/GCS_PROJECT_ID, never hardcoded), magic-byte sniffType allowlist (PDF/JPEG/PNG/HEIC), and a non-throwing heic-convert wrapper; all three tested entirely against mocks, zero real GCS/heic-convert calls made. Suite 434/29 -> 467/31.
- [Phase 04-mandatory-allergy-testing]: 04-12: heic-convert ships no TypeScript types; added a minimal ambient app/lib/storage/heic-convert.d.ts covering only the single-image conversion signature this app uses.
- [Phase 04-mandatory-allergy-testing]: 04-12: No live network capture against @google-cloud/storage was run in this plan (04-RESEARCH.md Assumption A3 still open) — threat T-4-57 explicitly assigns that capture to plan 04-13, the first plan making a real (non-mocked) GCS call. Do not mark TEST-04 complete; that remains plan 04-19's bookkeeping.
- [Phase 04-mandatory-allergy-testing]: 04-13: Fixed parseFormData's argument order from the plan's own interfaces snippet (real 0.17.4 signature is request, options, uploadHandler) — verified against installed source before writing the route
- [Phase 04-mandatory-allergy-testing]: 04-13: Created gs://alledrops-quiz-uploads-dev (alledrops-quiz project) and ran a real network capture for T-4-64 — only storage.googleapis.com and www.googleapis.com contacted, confirming no third-party telemetry; temporary service account deleted after use
- [Phase 04-mandatory-allergy-testing]: 04-13: Fly runtime GCP credential wiring is unsolved — gcs.ts relies on ADC which the Fly VM has no way to satisfy; staged (not deployed) GCS_BUCKET_NAME/GCS_PROJECT_ID Fly secrets only. Flagged for 04-19's deploy authorization step. **[SUPERSEDED 2026-08-10 — closed by the 04-19 entry below. Accurate when written; do not act on it.]**
- [Phase 04]: Patient file route (04-14) supports both Authorization: Bearer and ?token= query-param token sources, and both JSON {url} and 302-redirect response shapes — Resolves the quiz-history extension's flagged <s-link href> shape mismatch in one route rather than a client-side rewrite
- [Phase 04]: Admin testing-status column (D-08) is read-only, derived from answers_json via a parameterized JSONB accessor — No new column, no PATCH endpoint, no UPDATE against submissions — the provider-review-checkbox scope was explicitly reversed earlier in the phase discussion
- [Phase 04-mandatory-allergy-testing]: 04-15: generateVisitSummaryPdf now embeds uploaded test-result files via pdf-lib post-processing of pdfkit's output (copyPages for donor PDFs, embedJpg/embedPng for images); zero files still returns the base pdfkit bytes unchanged, and any per-file failure degrades to a note page (file id + byte size, never filename) rather than failing the download
- [Phase 04-mandatory-allergy-testing]: 04-15: Fixed a pdf-lib bug where embedJpg/embedPng read imageData.buffer directly via DataView, ignoring byteOffset — added a zero-offset Uint8Array copy defensively in production code before every image embed call
- [Phase 04-mandatory-allergy-testing]: 04-16: Widened PART7_ALLERGY_TESTING from QuizQuestion[] to QuizItem[] to hold testing_upload_requirements' info block alongside testing_files
- [Phase 04-mandatory-allergy-testing]: 04-16: 'Required-but-empty' file_multi error is triggered on the file input losing focus while still required-and-empty, not a literal Next-button click — QuizContainer.tsx's real Next button was out of this plan's scope and stays silently disabled while the part is incomplete
- [Phase 04-mandatory-allergy-testing]: 04-16: Retry action shown only for the generic network/500 failure class, never for wrong-type/too-large/total-exceeded, matching the Copywriting Contract which names Retry only on the 'didn't upload' string
- [Phase 04-mandatory-allergy-testing]: 04-17: Promotion reads staged pending/ objects by GCS prefix listing (getBucket().getFiles({prefix: pending/token/})), not via buildPendingKey(token, filename) — the upload route never returns the filename to the client, so there is nothing to reconstruct a pending key from
- [Phase 04-mandatory-allergy-testing]: 04-17: Promotion failure policy — the submission is authoritative; a copyObject, insertSubmissionFiles, or deleteObject rejection at any point still returns the route's normal success response and never rolls back insertSubmission, costing a reconciliation task instead
- [Phase 04-mandatory-allergy-testing]: 04-17: Applied a single Delete lifecycle rule (age:2, matchesPrefix:[pending/]) to the real dev bucket gs://alledrops-quiz-uploads-dev and empirically proved the scoping against three real probe objects (read back via gcloud, not asserted from docs); fly.toml [[vm]] memory raised 1gb->2gb as the sole attributable VM change
- [Phase 04-mandatory-allergy-testing]: 04-17: CRITICAL — the Fly-runtime GCP ADC credential gap from 04-13 remains UNSOLVED; gcs.ts is not in this plan's files_modified and credential wiring is an architectural decision left explicitly flagged for plan 04-19, not improvised mid-execution **[SUPERSEDED 2026-08-10 — closed by the 04-19 entry below. Accurate when written; do not act on it.]**
- [Phase 04-mandatory-allergy-testing]: 04-18: QuizHistoryBlock.js confirmed orphaned (not referenced by shopify.extension.toml, not a dist build input) but updated in parallel with QuizHistoryBlock.jsx's file-link change to stay in sync
- [Phase 04-mandatory-allergy-testing]: 04-18: file_multi rejected as a bundle freshness marker (measured 1-before, not 0, since schema.ts's showIf/scoring switch arm predates the widget); replaced with fileUpload__dropzone, unique to QuizPartRenderer.tsx's actual render branch
- [Phase 04-mandatory-allergy-testing]: 04-18: public/quiz-bundle.css committed alongside public/quiz-bundle.js in the same commit even though only the .js file was named in files_modified — both come from the same build:theme invocation and the widget's fileUpload__* CSS Modules classes only ship if both move together
- [Phase 04]: 04-19: **The Fly-runtime GCP ADC gap is CLOSED, not deferred.** gcs.ts now reads a full service-account key document from the `GCP_SA_KEY` Fly secret and passes it to `new Storage({ projectId, credentials })`, falling back to ADC when absent so local dev and tests need no key. A Fly VM cannot satisfy ADC — no key file, no gcloud, and no GCE metadata server, because Fly is not Google infrastructure. Service account `alledrops-quiz-app@alledrops-quiz` holds `roles/storage.objectAdmin` on the uploads bucket ONLY. Proven by a paired local test (key present → full round trip; key absent under an isolated HOME → "Could not load the default credentials"), then by a live POST from the deployed VM. Andrew's earlier decision to defer credential wiring to the AOD cutover is superseded for dev; the cutover still swaps the secret for one in AOD's BAA-covered project, or Workload Identity Federation.
- [Phase 04]: 04-19: Migration 004 executed against alledrops_quiz_dev ahead of the deploy, deviating from its own "app code live on Fly first" precondition. That precondition guards Phase 3's DROP-before-code failure mode; 004 is additive in the opposite direction (CREATE TABLE IF NOT EXISTS, two indexes, a CHECK widened 3→4 values), so v50 was unaffected and the database was left ahead of the code rather than behind. Backup 1786361850289 ON_DEMAND SUCCESSFUL read back first. Execution deviation: `submissions` is owned by alledrops_app and `submission_access_log` by postgres, so no single role can run the file — ran as postgres in one transaction with SET ROLE alledrops_app for the table, RESET ROLE for the ALTER.
- [Phase 04]: 04-19: **UAT defect #6** — the progress counter read "Step 2 of 9" on the intro screens then switched noun AND denominator to "Part 1 of 7" for the quiz parts, and omitted consent entirely despite D-09 making it mandatory. Replaced with one continuous counter (`quizFlowProgress` in schema.ts, pure and unit-tested), Step 1..N+3 where N = QUIZ_PARTS.length. Sixth defect on this project found by a human clicking and missed by a fully green suite.
- [Phase 04]: 04-19: A local `alledrops_dev` Postgres role was created for development so local work never touches the credential Fly runs on. Root cause of the long-standing local `28P01`: **port 5433 is another project's Docker container**, not the Cloud SQL Auth Proxy, which was never running. Session 33's "stale local DATABASE_URL password" is retracted in HANDOFF.md. Setup documented in `docs/local-dev-database.md` and `.env.example` (both new).

### Pending Todos

None captured yet.

### Blockers/Concerns

**Blocked on a client decision:**

- Score scale semantics — three incompatible range models. Gates SCORE-02 and SCORE-03 only;
  SCORE-01 (retitle + 1–2 business day copy) is separable and unblocked.

- Domain spelling — `alledrops.com` (no R) vs `allerdrops.com`, with live `ALLERDROPS®` Class 044
  trademark exposure. Gates LAUNCH-07 (DNS, Workspace domain, Fly cert) and the TEST-04 copy string.

**Blocked on client action:**

- Google Workspace setup blocked on Gene (PTO) → blocks BAA → blocks GCP migration → blocks go-live.
  Escalate to Robert (IT Director).

- Counsel-owned clinical copy: medical disclaimer, treatment policy, NPP, privacy policy, officer
  designations, workforce training.

**Live exposures to close immediately (Phase 8, do not wait for Phase 7):**

- **[CLOSED 2026-08-09 — see reconciliation below]** ~~Klaviyo still live on
  `/pages/allergy-quiz`~~ — **10 occurrences** in HTML fetched 2026-07-30,
  loader `https://static.klaviyo.com/onsite/js/SzY6kF/klaviyo.js`. (An earlier entry said "4": that
  was `grep -c`, which counts matching LINES, not occurrences — the exact trap this phase warned
  three executors about, hit by the orchestrator. Occurrence counts must use
  `split(needle).length - 1`.) A
  third-party script on a PHI-collecting page and a reportable-breach trigger per
  `docs/breach-response-runbook.md:16`. Owned by **Phase 8 / LAUNCH-01** (T-1-16, transfer).
  **Located 2026-07-30 — it IS fixable in code, contrary to the earlier "zero repo refs" note.**
  It is an app embed registered in the *theme* repo at
  `/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json`:
  `current.blocks` holds `shopify://apps/klaviyo-email-marketing-sms/blocks/klaviyo-onsite-embed/…`
  with `disabled: false`. App embeds load site-wide, including the quiz page. Fix is a theme change
  (flip `disabled` to `true` and push) or the App embeds toggle in the theme editor — not a
  quiz-app-repo change, which is what "zero repo refs" originally meant.

- **Second undocumented third-party script on PHI pages:** the same `settings_data.json` also enables
  `shopify://apps/apntly-appointment-booking-app/blocks/main-app-embed/…` (`disabled: false`).
  `CLAUDE.md` rule 4 forbids third-party scripts on any page collecting PHI and names Klaviyo but not
  this one. Needs an explicit keep/disable decision before go-live.

- **Phase 1's verification pass does NOT clear LAUNCH-01.** Phase 1 adds zero scripts and zero
  libraries, so nothing in it can close this. A green Phase 1 must not be read as a clean
  patient-facing page — confirmed independently by Plans 01-03 and 01-04.

- Test Mode button rendering on the production page — bypasses all validation.
  **Appears already resolved:** the live quiz page served `test=0` on 2026-07-30 and the installed
  block carries `enable_test_mode: false`. Re-confirm during Phase 8 rather than assuming.

- Placeholder text on two live clinical surfaces.
  **Measured 2026-07-30 on the served quiz page:** the block's Medical Disclaimer Text is the
  placeholder `This text needs changed.`, but "Show Medical Disclaimer" is toggled OFF, so it renders
  0 times — the placeholder is not patient-visible. The consequence is worse than a placeholder
  though: `disclaimer` appears 0 times in the served HTML, so the live clinical intake page carries
  **no medical disclaimer at all**. Gated on the counsel-owned clinical copy already tracked above;
  turning the toggle on before counsel delivers would publish the placeholder instead.

- ~~**Apntly appointment-booking app embed** … does not appear to load on the PHI page.~~
  **RETRACTED 2026-08-09 — this entry was wrong and the script IS live on the PHI page.** The
  original check counted the needle `apntly`, which is the vendor slug inside the app-block URI
  (`shopify://apps/apntly-appointment-booking-app/…`). The actual loader spells it **`appointly`**.
  Measured on authenticated, cache-busted served bytes of `/pages/allergy-quiz` 2026-08-09:
  `apntly` = 0, **`appointly` = 15**. Same class of error as the `grep -c` line-vs-occurrence trap —
  a count against the wrong needle was read as absence.

  What actually loads: `cdn.shopify.com/extensions/…/https-appointly-com-69/assets/appointly-embed.js`
  (defer), plus an inline block that sets
  `window.appointlyMainJsUrl = "https://s1.staq-cdn.com/appointly/api/js/65752301774/main.js?…"`,
  injects that script into `<head>`, calls `fetch("https://s1.staq-cdn.com/api/status")`, and on
  failure rewrites the host to `https://js-server.staqlab.com` and retries. Third-party JS from
  **staq-cdn.com / staqlab.com** executing on a PHI-collecting page, outside the BAA chain — the same
  exposure class as Klaviyo, per `CLAUDE.md` rule 4 and `docs/breach-response-runbook.md:16`.

  **Not disabled, deliberately.** Appointly is appointment booking and Phase 7 (Telehealth Intake
  Path) may depend on it; turning the embed off site-wide could break booking. Needs an explicit
  keep/disable decision — if kept, it must be scoped off PHI pages or covered by a BAA.

- ~~**Klaviyo still live on `/pages/allergy-quiz`**~~ **CLOSED 2026-08-09.** Andrew disabled the
  Klaviyo onsite embed in the Sense theme editor's App embeds panel. Verified on authenticated,
  cache-busted served bytes with occurrence counting (`split(needle).length - 1`), not `grep -c`:
  `klaviyo` = 0, `static.klaviyo.com` = 0, `_klOnsite` = 0. Also confirmed absent in the same fetch:
  `gtag`, `googletagmanager`, `google-analytics`, `connect.facebook`, `fbq(`, `hotjar` — all 0.
  **Caution for future checks:** an earlier fetch the same morning still showed 10 occurrences
  because it ran ~2 minutes before the theme save. Re-fetch with a cache-buster after any theme
  change; a single stale fetch is not evidence.

  **Theme repo drift:** this was an admin-side change, so
  `/Users/andrewskinner/Local Sites/allergist-on-demand/config/settings_data.json` still carries
  `disabled: false` for the Klaviyo block locally. Do not `shopify theme push` from that repo without
  reconciling — a push would re-enable Klaviyo on the PHI page.

- Live app→DB round trip never verified after the 2026-07-28 Cloud SQL downsize.
- ~~Leftover `diag+preflight@example.com` row, carried since session 27.~~ **CLOSED 2026-07-30.**
  Deleted during Plan 01-06 Task 3. Reconciliation below.

**PHI cleanup — Plan 01-06 Task 3, completed 2026-07-30:**

PHI-CLEANUP phase1 verify_pre=0 verify_post=0 orphan_pre=1 orphan_post=0

Reconciled: Gate F reported writing **0** rows (it verified behaviour with synthetic `postMessage`
events and page loads; the questionnaire was never completed, so nothing POSTed to
`/api/quiz/submit`). `verify_pre=0` matches that exactly, so there are no unexplained rows. The
orphan delete removed exactly 1 row and the table total moved 43 → 42 — a difference of exactly 1,
matching `deleted_orphan=1`. No PHI field value was read, printed, or recorded; every statement
selected `COUNT(*)` only, per `CLAUDE.md:139`.

Route correction worth carrying forward: Plan 01-06 assumed this task was human-only because the
local IP is not on the Cloud SQL authorized-networks list. That is true of this machine, but the Fly
app itself holds `DATABASE_URL` and reaches Cloud SQL, so `fly ssh console -a alle-drops-quiz-app`
running a `pg` script is a working route. Note that Prisma on that machine is the SQLite session
store (see `litestream.yml`) — the PHI `submissions` table is Postgres via the `pg` pool in
`app/lib/db.ts`, and a Prisma raw query against it fails with a SQLite parser error.

**LIVE OPEN REDIRECT FOUND AND CLOSED 2026-07-30 — `entry.theme.tsx` `injectIframe` listener.**

Found during Gate F, after the phase's two hardening passes had both skipped the file. Confirmed
exploitable against production: a `quiz:navigate` carrying `url: "https://example.com/pwned"`
navigated the live `/quiz-embed` page off-origin. Fixed in `14e13ff`, deployed, and re-tested with
the same payload plus five variants — all rejected, with a valid path still navigating (non-vacuous).

**Why two independent reviews both missed it, worth remembering:** Plan 01-04 measured that the
installed Liquid block loads the bundle on zero storefront pages and renders no
`data-alledrops-quiz` container, and concluded the branch was unreachable. That is true of the
storefront. It is not true of `/quiz-embed` itself, which renders that container AND loads the
bundle — and `initQuiz()` selects `injectIframe` whenever `window.self === window.top`. The code
review inherited 01-04's "dead code" assessment and excluded the file from scope. A correct
measurement of one entry path was generalised into a claim about all of them.

It also survived the `url` → `path` rename **because** it was excluded: it still read the abandoned
`url` key, keeping the retired contract alive beneath the hardened one. The storefront fail-closed
test passed while this stayed open. No framing was needed to reach it — an opener can `postMessage`
into a window it opened with `window.open`, so an attacker page could open the genuine clinic intake
and silently replace it with a phishing clone.

There were **four** hand-ported copies of the navigation rules, not three. This one now imports
`toRelativePath` rather than adding a fifth. `tests/entry-theme-contract.test.ts` guards all six
properties and is proven non-vacuous (all 6 assertions fail against the pre-fix file).

**Gate D (`test_options_redirect_url`) — status 2026-07-30, mid-Phase-1:**

Confirmed live on served bytes, not inferred: `/pages/allergy-quiz` served
`testOptions=%2Fproducts%2Fallergy-consultation`, identical to `consult`. Root cause found in the
theme repo at `templates/page.quiz.json` — the app block's `test_options_redirect_url` was set to
`shopify://products/allergy-consultation`.

**CLOSED 2026-07-30, verified on served bytes.** After Andrew's theme-editor change, the live
`/pages/allergy-quiz` serves `consult=%2Fproducts%2Fallergy-consultation` and
`testOptions=%2Fpages%2Ftest-options`. ROADMAP success criterion #2 is no longer config-blocked.
Confirmed against the served HTML, not the editor UI, per the session-28 lesson that a green
write-path proves nothing. Theme "Sense" is the Active theme, so this is the live surface.

Historical record of how it was fixed:

- Andrew applied the fix in the Shopify theme editor (chosen over a `shopify theme push`, because
  `templates/page.quiz.json` carries uncommitted drift — its git HEAD still references a
  `quiz-kit-smart-product-finder` block, so a push could apply unrelated changes). Target value:
  `/pages/test-options`.

- A matching local edit exists in the theme working tree, uncommitted and unpushed, so local tracks
  intended live state. **Do not commit or push the theme repo** without first reconciling that drift.

- Verification owed: re-fetch the live page and assert `testOptions=%2Fpages%2Ftest-options`.

Corrected page inventory, measured while authenticated past the storefront password. Two of these
contradict `01-VALIDATION.md`, which relied on unauthenticated 200s — every unauthenticated request
302s to `/password` and returns 200 for the password page, so those checks were false positives:

| Path | Live |
|------|------|
| `/pages/test-options` | 200, titled "Test Options" — exists |
| `/products/allergy-consultation` | 200 — exists |
| `/pages/consult` | **404** — the previously documented consult fallback |
| `/pages/testing-options` | **404** — `templates/page.testing-options.json` is an orphaned template |

**Out-of-plan code change landed in Phase 1 (verifier must account for it):** commits `bb51ce0` and
`3c0e469` add `app/lib/quiz/redirects.ts` + `redirects.test.ts`, rewire `QuizContainer`'s three
inline fallbacks through it, correct the extension schema help text, and rebuild the theme bundle
(184236 → 184349 bytes). Reason: the consult fallback pointed at `/pages/consult`, a 404, so blanking
that theme setting sent a patient who had just completed a clinical intake to a dead page. Not in any
01-0x plan; authorized directly by Andrew during the Wave 3/4 checkpoint. Suite 122 → 133 passing.

**Open questions — one message to William closes all three:** R6 diagnosis-question scope, the third
medical-history free-text label, and whether resume/edit was ever expected.

**Risk shipping with v1.0:** abandonment loses the entire questionnaire; mandatory testing adds a
likelier abandonment point. Resume persistence is explicitly out of scope.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Persistence | Resume / edit an in-progress submission (1+ week, architecturally hard) | Out of scope for v1.0, risk recorded | 2026-07-29 |
| Admin | Customer detail drill-down, submission export | v2 | 2026-07-29 |
| Admin | Provider review-status workflow, notes, audit dashboard, bulk ops (Phase 2.5) | v2 | 2026-07-29 |
| Storefront | `/pages/our-team` decision, remaining May 8 content items | v2 | 2026-07-29 |
| Security | `Content-Security-Policy: frame-ancestors *` on `/quiz-embed` lets any site frame the PHI-collecting quiz. Clickjacking exposure. Plan 03's `e.origin` guard narrows what a hostile framer can *cause* but does not prevent the framing itself. (T-1-09, accept) | Phase 8 candidate | 2026-07-30 |
| Deploy provenance | Neither bundle route emits `ETag` or `Last-Modified`, which is why deploy verification is a string-counting exercise. Worse, `app/routes/quiz-bundle.js.tsx` and `app/routes/quiz-bundle-js.tsx` serve the same file with disagreeing `max-age` (3600 vs 300). A content-hash ETag is ~3 lines and converts every future verification into one conditional request. All Phase 1 gates deliberately assert against `/quiz-bundle-js`, the 300s variant, because that is the route `quiz-embed.tsx` references. | Phase 8 candidate | 2026-07-30 |
| Latent defect | Double-submit on the `3-6` bracket: a patient can click "Schedule a Telehealth Appointment" (submits), navigate back, then take "Continue to Purchase" through consent and submit again — violating the `NOT NULL UNIQUE` constraint on `submissions.symptom_profile_id`, because `generateSymptomProfileId()` returns `AOD_${Date.now()}` and is called once per session. Real and patient-facing. Phase 4 Plan 08 (TEST-05, D-09) deleted the `3-6` purchase jump, `handleScheduleConsult`/`handleTestFirst`, and the entire multi-exit pre-consent `"outcome"` screen, leaving exactly one `submitPayload()` call site (`handleConsentSubmit`) reachable through exactly one entry into consent — verified by enumerating every `setStep(...)` call site in `QuizContainer.tsx` (04-08-SUMMARY.md "Reachability Verification"). | **CLOSED — resolved by 04-08, verified unreachable** | 2026-07-30 |
| ~~Dead code~~ **RETRACTED — this entry was wrong and the code was live** | `app/entry.theme.tsx`'s `injectIframe()` handler was recorded here as unreachable dead code, on Plan 01-04's measurement that the installed Liquid block loads the bundle on zero parent pages. That measurement was correct **about the storefront only**. `/quiz-embed` itself renders a `data-alledrops-quiz` container AND loads the bundle, and `initQuiz()` selects `injectIframe` whenever `window.self === window.top` — so opening the public `/quiz-embed` URL top-level ran this handler on a PHI page. It was confirmed exploitable against production (navigated the live page to a foreign origin) and fixed in `14e13ff`. **Do not restore the "dead code" reading.** Full analysis above; `tests/entry-theme-contract.test.ts` now guards it. Retained here only so the retraction is visible to anyone who read the original entry. | **CLOSED — fixed and deployed** | 2026-07-30 |
| Theme config | The sticky-header scroll offset is hardcoded at `scroll-margin-top: 100px` in the Liquid block's `{%- style -%}` region rather than exposed as a `range` setting, because whether a newly added non-`product` schema setting receives its default on an **already-placed** block is unverified. If tuning it ever requires a deploy, verify that behavior first, then promote it to a setting. | Phase 8 candidate | 2026-07-30 |

## Session Continuity

Last session: 2026-08-10T15:20:00Z
Stopped at: Phase 04.1 wave 2 complete — blocked on the plan 04.1-05 human browser pass
Resume file: .planning/phases/04.1-testing-first-quiz-order/04.1-05-PLAN.md

**Interrupted-execution recovery, 2026-08-10:** the session executing plan 04.1-04 was killed
mid-plan. Task 1 (`e246391`, bundle rebuild) was committed inside worktree
`agent-aef816fddf7804720` but never merged, and Task 2's guard test was written, green, and
**uncommitted** — with its mandatory RED proof never run. The safe-resume gate caught this
(production commits present, SUMMARY.md absent) before a second executor was dispatched, which
would have duplicated the rebuild. Recovery was to resume an executor in the *same* worktree
rather than re-execute: it ran the missing RED proof, committed Task 2, and wrote the SUMMARY.
Lesson worth keeping: a green test is not a trusted test until it has been observed failing —
the interrupted session left behind exactly the "passes, therefore correct" artifact this
project has been burned by six times.
