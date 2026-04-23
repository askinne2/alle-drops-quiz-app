# AlleDrops Quiz App Requirements

## Overview

The AlleDrops app now serves a clinical intake flow, not the legacy regional quiz. The current requirements are:

- Gate the quiz to patients whose primary address is in Tennessee or Texas
- Collect required patient information before the questionnaire begins
- Render the clinical questionnaire in ordered parts
- Calculate the quiz score and map it into the current clinical brackets:
  - `0-2`
  - `3-6`
  - `7+`
- Route patients through the correct next step:
  - consultation guidance
  - product continuation
  - allergy testing / medical history / consent flow
- Store summary data in Shopify customer metafields
- Send the full intake payload to Google Sheets

## Current Clinical Flow

### Frontend requirements

- `StateGate` must be the first decision point
- `PatientInfoStep` must collect:
  - name
  - DOB
  - email
  - phone
- `QuizPartRenderer` must render Parts 1-5 of the clinical questionnaire from `app/lib/quiz/questions.ts`
- `ResultsDisplay` must branch by score bracket, not by legacy severity labels
- Patients in the `7+` branch can continue into Part 6 medical history and `ConsentStep`
- `QuizContainer` owns the end-to-end state machine and submits the final payload

### Backend requirements

`POST /api/quiz/submit` must accept the live `QuizSubmissionData` shape:

```json
{
  "state": "tennessee",
  "name": "Jane Patient",
  "dob": "1990-05-14",
  "email": "jane@example.com",
  "phone": "6155551212",
  "symptom_profile_id": "AOD_1764505955675",
  "quiz_score": 8,
  "score_bracket": "7+",
  "quiz_date": "2026-04-23T14:30:00.000Z",
  "completion_time": 412,
  "answers": {
    "symptoms_nasal": ["sneezing", "runny_nose"]
  },
  "personal_history": ["asthma"],
  "family_history": ["rhinitis"]
}
```

Required behavior:

- Validate `state` as `tennessee` or `texas`
- Validate patient identity/contact fields
- Validate `score_bracket` as `0-2`, `3-6`, or `7+`
- Never write DOB into Shopify customer metafields
- Write summary quiz data to Shopify
- Write the full intake record to Google Sheets

## App Architecture

```text
AlleDrops Quiz App
├── Frontend
│   ├── Theme app block for quiz embedding
│   ├── React clinical questionnaire
│   └── Results + consent flows
├── Backend
│   ├── /api/quiz/submit
│   ├── Shopify customer + metafield helpers
│   └── Google Sheets submission helper
├── Admin
│   ├── /app
│   ├── /app/quiz
│   └── /app/quiz-results
└── Data
    ├── Shopify customer metafields (summary)
    └── Google Sheets (full submission payload)
```

## Key Files

### Frontend

- `app/components/quiz/QuizContainer.tsx`
- `app/components/quiz/StateGate.tsx`
- `app/components/quiz/PatientInfoStep.tsx`
- `app/components/quiz/QuizPartRenderer.tsx`
- `app/components/quiz/ConsentStep.tsx`
- `app/components/quiz/ResultsDisplay.tsx`
- `app/components/quiz/QuizProgress.tsx`
- `app/lib/quiz/questions.ts`
- `app/lib/quiz/scoring.ts`
- `app/lib/quiz/types.ts`
- `app/styles/quiz.module.css`

### Backend

- `app/routes/api.quiz.submit.tsx`
- `app/lib/quiz-validation.ts`
- `app/lib/google-sheets.ts`
- `app/lib/shopify/customers.ts`
- `app/lib/shopify/metafields.ts`

### Admin

- `app/routes/app._index.tsx`
- `app/routes/app.quiz.tsx`
- `app/routes/app.quiz-results.tsx`

## Data Storage Strategy

### Shopify metafields

Namespace: `alledrops`

| Key | Type | Purpose |
|-----|------|---------|
| `symptom_profile_id` | `single_line_text_field` | Opaque profile identifier |
| `quiz_score` | `number_integer` | Numeric total score |
| `state` | `single_line_text_field` | `tennessee` or `texas` |
| `score_bracket` | `single_line_text_field` | `0-2`, `3-6`, or `7+` |
| `quiz_date` | `date_time` | Submission timestamp |
| `quiz_history` | `json` | Array of prior attempts |

`quiz_history` entries use `profile_id`, `date`, `score`, `score_bracket`, and `state`. Legacy records may still contain `severity` and `region`, and some older customers may still have top-level `severity_level` / `quiz_region` metafields.

### Google Sheets

Google Sheets stores the full intake data:

- profile ID
- patient info
- state
- score
- score bracket
- completion time
- full answers JSON
- optional personal and family history arrays

## Current Status Checklist

### Backend

- [x] Validate the live clinical payload
- [x] Find or create Shopify customers
- [x] Read and update `alledrops` customer metafields
- [x] Store `state` and `score_bracket`
- [x] Preserve quiz history with legacy fallback support
- [x] Submit the full response to Google Sheets

### Frontend

- [x] Tennessee/Texas state gate
- [x] Patient info step with 18+ validation
- [x] Clinical questionnaire parts 1-5
- [x] Score bracket results for `0-2`, `3-6`, `7+`
- [x] Optional Part 6 medical history for higher-score flow
- [x] Consent step before final submission where required
- [x] Theme app block integration

### Admin

- [x] Admin home page
- [x] Quiz results list
- [x] Search by name, email, or profile ID
- [x] Filtering by score bracket, state, and date range
- [ ] Customer detail drill-down
- [ ] Export workflow

### Verification and launch

- [ ] Confirm Google Sheets deployment is current
- [ ] Run end-to-end storefront tests for TN and TX
- [ ] Verify Shopify customer metafields on fresh submissions
- [ ] Verify legacy fallback display remains readable in admin
- [ ] Keep app block pointed at the app endpoint instead of any legacy proxy

## Data Flow

```text
StateGate
  ↓
PatientInfoStep
  ↓
Quiz Parts 1-5
  ↓
Score calculation + score bracket
  ↓
ResultsDisplay
  ↓
Optional Part 6 medical history + ConsentStep
  ↓
POST /api/quiz/submit
  ↓
Shopify metafields + Google Sheets
```

## Resources

- [Shopify App Development](https://shopify.dev/docs/apps)
- [React Router + Shopify](https://shopify.dev/docs/apps/tools/cli/react-router)
- [Customer Account UI Extensions](https://shopify.dev/docs/api/customer-account-ui-extensions)
- [Admin API GraphQL](https://shopify.dev/docs/api/admin-graphql)
- [Polaris Design System](https://polaris.shopify.com/)
