# AlleDrops Quiz App

A Shopify app for the AlleDrops clinical intake quiz. The current flow gates users to Tennessee or Texas, walks them through the clinical questionnaire, stores summary quiz data in Shopify customer metafields, and sends the full submission to Google Sheets for operational review.

## Overview

The live quiz flow is:

1. `StateGate` limits eligibility to Tennessee and Texas.
2. `PatientInfoStep` collects required patient details.
3. `QuizPartRenderer` renders Parts 1-5 of the clinical questionnaire.
4. `ResultsDisplay` shows the computed score and bracket:
   - `0-2`
   - `3-6`
   - `7+`
5. Higher-score paths can continue into Part 6 medical history and `ConsentStep`.
6. `QuizContainer` submits the final payload to `POST /api/quiz/submit`.

This app no longer uses the old US-region selector or the legacy minimal/mild/moderate/severe product path.

## Features

### Customer-facing

- Tennessee/Texas eligibility gate before the quiz starts
- Clinical questionnaire with staged navigation and progress tracking
- Score bracket outcomes based on the current medical-director thresholds: `0-2`, `3-6`, `7+`
- State-specific AlleDrops product path for Tennessee and Texas
- Optional Part 6 medical history and informed consent step for higher-acuity flows
- Mobile-responsive UI embedded through the Shopify theme app block

### Admin and operations

- Quiz results dashboard in the app admin
- Search and filtering by customer, score bracket, state, and date
- Shopify customer metafield storage for summary quiz history
- Google Sheets submission for the full intake payload

### Technical

- React Router v7 app with TypeScript
- Shopify Admin API customer + metafield updates
- Theme app extension for storefront embedding
- Customer account extension with theme/Liquid fallback patterns elsewhere in the stack
- Fly.io deployment

## Tech Stack

- **Framework**: React Router v7
- **Language**: TypeScript
- **Styling**: CSS Modules + theme-aware CSS
- **Database**: Prisma/SQLite for app session storage
- **Hosting**: Fly.io
- **Shopify**: Admin API, theme app extension, customer account extension
- **Integrations**: Google Apps Script web app for Google Sheets writes

## Prerequisites

- Node.js `>=20.19 <22 || >=22.12`
- Shopify Partner account
- Shopify CLI
- Fly.io account for deployment
- Google Apps Script deployment for Sheets integration

## Quick Start

### 1. Install dependencies

```bash
git clone https://github.com/askinne2/alle-drops-quiz-app.git
cd alle-drops-quiz-app
npm install
```

### 2. Configure environment

Create `.env` with the Shopify app credentials plus the Google Sheets endpoint:

```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/...
SHOPIFY_APP_URL=https://your-app.fly.dev
```

### 3. Run locally

```bash
npm run dev
```

If you are iterating on the theme bundle separately:

```bash
npm run dev:theme
```

### 4. Deploy

```bash
npm run deploy
```

## Project Structure

```text
alle-drops-quiz-app/
├── app/
│   ├── components/quiz/        # Clinical quiz UI
│   │   ├── StateGate.tsx
│   │   ├── PatientInfoStep.tsx
│   │   ├── QuizPartRenderer.tsx
│   │   ├── ConsentStep.tsx
│   │   ├── ResultsDisplay.tsx
│   │   └── QuizContainer.tsx
│   ├── lib/
│   │   ├── quiz/               # Questions, scoring, quiz types
│   │   ├── shopify/            # Customer/metafield helpers
│   │   └── google-sheets.ts    # Sheets submission helper
│   ├── routes/
│   │   ├── api.quiz.submit.tsx
│   │   ├── app.quiz-results.tsx
│   │   ├── app.quiz.tsx
│   │   └── health.tsx
│   └── styles/
├── extensions/
│   ├── quiz-block/
│   └── quiz-history/
├── docs/
├── prisma/
├── fly.toml
└── shopify.app.toml
```

## API Endpoints

### `POST /api/quiz/submit`

Submits a completed clinical quiz, updates customer metafields when shop context is available, and sends the detailed response to Google Sheets.

**Request body**

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

`personal_history`, `family_history`, `quiz_date`, and `completion_time` are optional.

**Response**

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

When warnings occur, the route reports them in `message` and the related helper fields such as `customerUpdateSkipped` or `googleSheetsError`.

### `GET /health`

Health check endpoint for Fly.io monitoring.

```json
{
  "status": "ok",
  "timestamp": "2025-12-03T12:12:37.417Z",
  "service": "alle-drops-quiz-app"
}
```

## Deployment

### Fly.io

```bash
fly deploy
fly status
fly logs
```

Current deployment uses the `/health` endpoint for health checks and runs in Fly region `iad`.

### Shopify app deployment

```bash
shopify app deploy --config shopify.app.alledrops-production.toml
```

Required secrets include:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `GOOGLE_SHEETS_WEB_APP_URL`

## Development

### Scripts

```bash
npm run dev
npm run dev:theme
npm run build
npm run build:theme
npm run deploy
npm run lint
npm run typecheck
```

### Core quiz components

- `StateGate`
- `PatientInfoStep`
- `QuizPartRenderer`
- `ConsentStep`
- `ResultsDisplay`
- `QuizContainer`

## Data Storage

### Shopify customer metafields

Summary quiz data is stored in the `alledrops` namespace:

- `symptom_profile_id`
- `quiz_score`
- `state`
- `score_bracket`
- `quiz_date`
- `quiz_history`

`quiz_history` entries now store `profile_id`, `date`, `score`, `score_bracket`, and `state`. Legacy customer records may still contain `severity` and `region` values in older history entries, or top-level metafields such as `severity_level` and `quiz_region`.

### Google Sheets

The full submission payload is written to Google Sheets, including patient info, full answers, optional history arrays, quiz date, and completion time.

## Security Notes

- Date of birth is validated server-side and sent to Google Sheets only.
- Date of birth is not written to Shopify customer metafields.
- Summary-only quiz data is stored in Shopify.
- Input validation runs before any Shopify or Sheets write attempt.

## Documentation

- [Implementation Status](docs/IMPLEMENTATION_STATUS.md)
- [MVP Launch Checklist](docs/MVP_LAUNCH_CHECKLIST.md)
- [App Requirements](docs/app-requirements.md)
- [Performance Optimization](docs/PERFORMANCE_OPTIMIZATION.md)
- [Fly.io Migration](docs/FLY_IO_MIGRATION.md)
- [HIPAA Compliance](docs/HIPAA_COMPLIANCE_ANALYSIS.md)

## Troubleshooting

### Quiz not loading

1. Verify the theme block app URL.
2. Confirm the quiz bundle route is reachable.
3. Check the browser console for runtime errors.
4. Confirm the app is deployed and running.

### Metafields not updating

1. Confirm the request reached the app with a shop context.
2. Check app logs for Admin API or protected-customer-data issues.
3. Verify the `alledrops` metafield definitions exist.
4. Confirm the app has the necessary customer scopes.

### Google Sheets not receiving full responses

1. Verify `GOOGLE_SHEETS_WEB_APP_URL`.
2. Confirm the Apps Script deployment is current.
3. Check the warning fields returned by `POST /api/quiz/submit`.

## Links

- [Production App](https://alle-drops-quiz-app.fly.dev)
- [GitHub Repository](https://github.com/askinne2/alle-drops-quiz-app)
- [Shopify Partner Dashboard](https://partners.shopify.com)
- [Fly.io Dashboard](https://fly.io/apps/alle-drops-quiz-app)
