# Shopify App Development Prompt - AlleDrops Clinical Quiz

## Context

This Shopify app powers the current AlleDrops clinical intake flow. Any implementation guidance, code examples, or maintenance work should assume the live quiz behavior below rather than the retired US-region severity quiz.

## Current Product Behavior

- The quiz is only available to patients in Tennessee or Texas
- The storefront flow begins with `StateGate`
- `PatientInfoStep` collects required patient information
- `QuizPartRenderer` renders Parts 1-5 of the questionnaire
- `ResultsDisplay` branches by score bracket:
  - `0-2`
  - `3-6`
  - `7+`
- Higher-score paths can continue into Part 6 medical history plus `ConsentStep`
- `QuizContainer` posts the submission to `POST /api/quiz/submit`

## Core Metafields

The app writes these customer metafields in the `alledrops` namespace:

| Key | Type | Notes |
|-----|------|-------|
| `symptom_profile_id` | `single_line_text_field` | Opaque quiz profile ID |
| `quiz_score` | `number_integer` | Numeric total score |
| `state` | `single_line_text_field` | `tennessee` or `texas` |
| `score_bracket` | `single_line_text_field` | `0-2`, `3-6`, or `7+` |
| `quiz_date` | `date_time` | Submission timestamp |
| `quiz_history` | `json` | Array of `{ profile_id, date, score, score_bracket, state }` |

Legacy customers may still contain:

- `quiz_region`
- `severity_level`

Older `quiz_history` entries may still use `region` and `severity`; current code must continue to read them safely as fallbacks.

## Live Submission Contract

### Request payload

`POST /api/quiz/submit`

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
    "symptoms_nasal": ["sneezing", "runny_nose"],
    "taking_meds": "no"
  },
  "personal_history": ["asthma"],
  "family_history": ["rhinitis"]
}
```

Notes:

- `quiz_date` is optional and defaults server-side
- `completion_time` is optional
- `personal_history` and `family_history` are optional
- DOB is allowed in the request and may be sent to Google Sheets only
- DOB must never be written to Shopify customer metafields

### Response shape

```json
{
  "success": true,
  "customerId": "gid://shopify/Customer/1234567890",
  "message": "Quiz submitted successfully",
  "historyCount": 2,
  "customerUpdateSkipped": false,
  "googleSheetsSuccess": true,
  "googleSheetsError": null,
  "debug": {
    "envGoogleSheetsConfigured": true,
    "timestamp": "2026-04-23T14:30:01.000Z"
  }
}
```

Warning conditions are surfaced through `message` and the helper fields returned by the route.

## Files That Matter Most

### Frontend

- `app/components/quiz/QuizContainer.tsx`
- `app/components/quiz/StateGate.tsx`
- `app/components/quiz/PatientInfoStep.tsx`
- `app/components/quiz/QuizPartRenderer.tsx`
- `app/components/quiz/ConsentStep.tsx`
- `app/components/quiz/ResultsDisplay.tsx`
- `app/lib/quiz/questions.ts`
- `app/lib/quiz/scoring.ts`
- `app/lib/quiz/types.ts`

### Backend

- `app/routes/api.quiz.submit.tsx`
- `app/lib/quiz-validation.ts`
- `app/lib/google-sheets.ts`
- `app/lib/shopify/customers.ts`
- `app/lib/shopify/metafields.ts`

### Admin

- `app/routes/app._index.tsx`
- `app/routes/app.quiz-results.tsx`

## Backend Expectations

When working on the submit route or related helpers:

1. Validate the live payload fields, especially `state` and `score_bracket`
2. Keep DOB out of Shopify
3. Write `state` and `score_bracket` instead of any legacy region/severity keys
4. Preserve `quiz_history` as JSON with the current keys
5. Continue to read legacy `quiz_region` / `severity_level` when displaying old customer data

## Admin Expectations

The admin dashboard should treat current keys as canonical:

- `state`
- `score_bracket`

It should still gracefully fall back to:

- `quiz_region`
- `severity_level`

## Google Sheets Expectations

The current row order expected by the app route is:

1. profile ID
2. name
3. email
4. phone
5. DOB
6. state
7. score
8. score bracket
9. quiz date
10. completion time
11. answers JSON
12. personal history JSON
13. family history JSON

## Guidance for Future Work

If you are helping with this app, do not suggest or reintroduce:

- US-region selectors
- `quiz_region` as the primary field
- `severity_level` as the primary field
- minimal/mild/moderate/severe product branching
- payload examples that omit `state` or `score_bracket`

All new examples, docs, and code should use the clinical TN/TX flow and the current metafield schema.
