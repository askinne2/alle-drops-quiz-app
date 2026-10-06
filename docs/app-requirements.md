# AlleDrops Quiz App: Requirements (current)

Rewritten 2026-10-06 (LAUNCH-08). Earlier versions of this file described Google Sheets as the store for full
intake data and Shopify metafields holding quiz scores. **Both are wrong and must never come back.** The
authoritative rules are the compliance block at the top of `CLAUDE.md`. Detailed requirements live in
`.planning/REQUIREMENTS.md`.

## What the app does

- Gates the quiz to patients whose primary address is in Tennessee or Texas.
- Collects patient identity, the allergy-testing split with required uploads, the clinical questionnaire,
  and mandatory medical history, then consent.
- Scores the questionnaire into the clinical brackets `0-2`, `3-8`, `9+` (Phase 5.2) and shows the
  Preliminary Score page. Results link to the $99 telehealth consult (`/products/allergy-consultation`,
  booked through the Appointly app in the store) or to the TN/TX product pages.
- Lets logged-in patients see their completed assessments and download PDFs (Customer Account extension).
- Gives providers an embedded admin (`/app/quiz-results`) with the submissions table, detail, files and PDFs.

## Where data goes

| Data | Store |
|---|---|
| Full submission (identity, answers, score, bracket, history, consent) | Cloud SQL Postgres `alledrops_quiz` in `aod-production-510006` (Google Cloud BAA) |
| Uploaded test-result files | GCS `aod-quiz-uploads-prod`, server-side only; downloads are `attachment` |
| Shopify customer metafields | Non-PHI only: `alledrops.last_completed_at`, `alledrops.quiz_count` |
| Shopify app sessions | Cloud SQL Postgres `shopify_sessions` (Prisma) |
| Google Sheets / Drive / Docs | **Never.** `app/lib/google-sheets.ts` is a tripwire that throws if called; nothing imports it |

## Routes

- `POST /api/quiz/submit`, `POST /api/quiz/upload`: storefront quiz (embedded as a cross-origin iframe from `/quiz-embed`).
- `GET /api/me/assessments`, `/api/me/assessment/:id/pdf`, `/api/me/assessment/:id/files/:fileId`: patient, JWT Bearer, ownership-checked.
- `GET /api/admin/submissions`, `/api/admin/submission/:id` (+ file, PDF): provider, Shopify session auth.

## Key files

- `app/routes/`: the routes above, plus `quiz-embed.tsx` and `app.quiz-results.tsx`.
- `app/lib/submissions.ts`, `app/lib/db.ts`: PHI reads and writes (ownership-bounded helpers).
- `app/lib/storage/gcs.ts`: uploads (ADC only, no key).
- `app/lib/shopify/metafields.ts`: the two non-PHI metafields, nothing else.
- `app/components/quiz/`: the quiz UI. `migrations/001`-`005`: schema.

## Infrastructure

Cloud Run `alle-drops-quiz-app` in `aod-production-510006`, `us-east1`. Runbook: `docs/cloud-run.md`.
