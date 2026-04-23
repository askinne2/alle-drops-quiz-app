# AlleDrops Quiz App - Implementation Status

**Last Updated**: April 23, 2026

## MVP Status

The app is aligned to the clinical Tennessee/Texas quiz flow. Core storefront submission, Shopify metafield writes, and admin reporting are in place. Remaining work is mostly verification and follow-up admin/detail improvements.

## Phase Status Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Backend submission flow | ✅ Complete | Live payload validation, customer lookup/creation, metafield writes, Google Sheets submission |
| Clinical quiz frontend | ✅ Complete | TN/TX gate, patient info, Parts 1-5, bracketed results, conditional Part 6 + consent |
| Customer account history | ⚠️ Partial | Extension exists; legacy/fallback paths are still relevant |
| Admin reporting | ✅ MVP Ready | Search and filtering across score bracket, state, and date |
| Verification and cleanup | 🔜 Pending | Launch validation, Sheets verification, optional admin follow-ups |

---

## Backend Submission Flow

### `POST /api/quiz/submit`

- ✅ Validates `state`, patient info, `quiz_score`, `score_bracket`, and `answers`
- ✅ Accepts optional `quiz_date`, `completion_time`, `personal_history`, and `family_history`
- ✅ Finds or creates a Shopify customer when shop context is available
- ✅ Reads and updates `alledrops.quiz_history`
- ✅ Sends the full submission payload to Google Sheets
- ✅ Preserves DOB as Sheets-only data

### Shopify Metafields Stored

| Key | Type | Description |
|-----|------|-------------|
| `symptom_profile_id` | `single_line_text_field` | Unique profile ID such as `AOD_1764505955675` |
| `quiz_score` | `number_integer` | Numeric total score |
| `state` | `single_line_text_field` | `tennessee` or `texas` |
| `score_bracket` | `single_line_text_field` | `0-2`, `3-6`, or `7+` |
| `quiz_date` | `date_time` | ISO submission timestamp |
| `quiz_history` | `json` | Array of prior attempts using `profile_id`, `date`, `score`, `score_bracket`, and `state` |

Legacy customers may still contain `severity_level` and `quiz_region`, and older `quiz_history` entries may still use `severity` / `region`.

### Google Sheets Integration

- ✅ Submission helper in `app/lib/google-sheets.ts`
- ✅ Full payload written from the app route
- ⚠️ Still depends on a valid deployed Apps Script URL in `GOOGLE_SHEETS_WEB_APP_URL`

---

## Clinical Quiz Frontend

### Implemented Components

- ✅ `QuizContainer.tsx` - Orchestrates the clinical flow and submission path
- ✅ `StateGate.tsx` - Tennessee/Texas eligibility gate
- ✅ `PatientInfoStep.tsx` - Required patient info with age and contact validation
- ✅ `QuizPartRenderer.tsx` - Shared renderer for quiz Parts 1-6
- ✅ `ConsentStep.tsx` - Final informed consent acknowledgement
- ✅ `ResultsDisplay.tsx` - Clinical result messaging for `0-2`, `3-6`, and `7+`
- ✅ `QuizProgress.tsx` - Progress indicator for Parts 1-5
- ✅ `IneligibleMessage.tsx` - Out-of-state messaging

### Flow Summary

- ✅ State gate before any patient data is collected
- ✅ Patient info step before questionnaire access
- ✅ Parts 1-5 scored using `app/lib/quiz/questions.ts` and `app/lib/quiz/scoring.ts`
- ✅ Score bracket outcomes:
  - `0-2` - mild / well-controlled guidance
  - `3-6` - allergist guidance with consultation or purchase continuation
  - `7+` - higher-acuity branch with testing / medical history path
- ✅ Part 6 medical history only when relevant
- ✅ Consent required before final submit where applicable

---

## Customer Account Integration

- ✅ Customer account extension exists in `extensions/quiz-history/`
- ⚠️ Reliability remains mixed, so fallback/legacy display paths still matter
- ✅ Admin loader and metafield utilities already support legacy fallback reads for:
  - `state` or `quiz_region`
  - `score_bracket` or `severity_level`

---

## Admin Reporting

### Current Pages

- ✅ `/app` - App home
- ✅ `/app/quiz` - Internal test page
- ✅ `/app/quiz-results` - Quiz results dashboard

### Current Dashboard Capabilities

- ✅ Shows name, email, score, score bracket, state, quiz date, and profile ID
- ✅ Reads legacy metafield values when current keys are missing
- ✅ Search by name, email, or profile ID
- ✅ Filter by score bracket
- ✅ Filter by state
- ✅ Filter by date window
- ✅ Quiz history modal with bracket/state fallbacks

### Remaining Enhancements

- [ ] Customer detail drill-down page
- [ ] Export workflow
- [ ] Pagination and larger-data improvements

---

## Verification and Launch Work

- [ ] Confirm fresh submissions populate all six `alledrops` metafields
- [ ] Confirm Google Sheets rows receive `state` and `score_bracket`
- [ ] Run storefront tests for Tennessee and Texas paths
- [ ] Validate `0-2`, `3-6`, and `7+` results flows
- [ ] Validate legacy customer records still render sensibly in admin

---

## Key Files

```text
alle-drops-quiz-app/
├── app/
│   ├── components/quiz/
│   │   ├── QuizContainer.tsx
│   │   ├── StateGate.tsx
│   │   ├── PatientInfoStep.tsx
│   │   ├── QuizPartRenderer.tsx
│   │   ├── ConsentStep.tsx
│   │   └── ResultsDisplay.tsx
│   ├── lib/
│   │   ├── quiz/
│   │   │   ├── questions.ts
│   │   │   ├── scoring.ts
│   │   │   └── types.ts
│   │   ├── shopify/
│   │   │   ├── customers.ts
│   │   │   └── metafields.ts
│   │   ├── google-sheets.ts
│   │   └── quiz-validation.ts
│   └── routes/
│       ├── api.quiz.submit.tsx
│       ├── app._index.tsx
│       ├── app.quiz.tsx
│       └── app.quiz-results.tsx
├── extensions/
│   ├── quiz-block/
│   └── quiz-history/
└── docs/
```
