# AlleDrops Quiz App

A Shopify app for conducting comprehensive allergy symptom assessments and providing personalized regional product recommendations. Built with React Router, TypeScript, and deployed on Fly.io.

## 🎯 Overview

The AlleDrops Quiz App enables customers to take a detailed symptom assessment quiz that:
- Evaluates allergy symptoms across 5 categories (35 questions total)
- Calculates a severity score (0-60 points)
- Classifies severity level (minimal/mild/moderate/severe)
- Recommends regional allergy drop products based on location and symptoms
- Stores quiz history in customer metafields
- Integrates with Google Sheets for detailed response tracking

## ✨ Features

### Customer-Facing
- **Interactive Quiz Interface**: Modern React-based quiz with progress tracking
- **Regional Product Matching**: 7 US regions with product recommendations
- **Quiz History**: View past assessments in customer account
- **Mobile-Responsive**: Optimized for all device sizes
- **Theme Integration**: Inherits Shopify theme styles and variables

### Admin Features
- **Quiz Results Dashboard**: View all customer quiz submissions
- **Search & Filter**: Filter by severity, region, date, or customer
- **Customer Detail View**: See full quiz history per customer
- **CSV Export**: Export quiz data for analysis
- **Google Sheets Integration**: Automatic detailed response logging

### Technical Features
- **Shopify App Block**: Embed quiz directly in theme pages
- **Customer Account Extension**: Display quiz history (with Liquid fallback)
- **REST API**: Submit quiz results and retrieve history
- **Metafield Storage**: Persistent quiz data in Shopify
- **HIPAA Considerations**: Secure data handling practices

## 🛠️ Tech Stack

- **Framework**: React Router (React Router v7)
- **Language**: TypeScript
- **Styling**: CSS Modules + Global CSS with Shopify theme variables
- **Database**: SQLite (Prisma ORM) - session storage only
- **Hosting**: Fly.io
- **Shopify**: Admin API, App Blocks, Customer Account Extensions
- **Integrations**: Google Apps Script (Google Sheets)

## 📋 Prerequisites

- Node.js >=20.19 <22 || >=22.12
- Shopify Partner Account
- Shopify CLI (`npm install -g @shopify/cli@latest`)
- Fly.io account (for deployment)
- Google Apps Script project (for Sheets integration)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/askinne2/alle-drops-quiz-app.git
cd alle-drops-quiz-app
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
# Shopify App Credentials (from Partner Dashboard)
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# Google Sheets Web App URL
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/...

# App URL (for production)
SHOPIFY_APP_URL=https://your-app.fly.dev
```

### 3. Local Development

```bash
# Start development server
npm run dev

# In another terminal, build theme extensions
npm run dev:theme
```

Press `P` in the terminal to open your app preview URL.

### 4. Deploy Extensions

```bash
# Deploy app blocks and extensions
npm run deploy
```

## 📁 Project Structure

```
alle-drops-quiz-app/
├── app/
│   ├── components/quiz/      # React quiz components
│   ├── lib/                   # Utility functions
│   │   ├── shopify/          # Shopify API helpers
│   │   └── quiz/             # Quiz logic (scoring, questions)
│   ├── routes/                # React Router routes
│   │   ├── api.quiz.submit.tsx  # Quiz submission endpoint
│   │   ├── app.quiz-results.tsx # Admin dashboard
│   │   ├── health.tsx         # Health check endpoint
│   │   └── quiz-bundle-*.tsx # Quiz bundle routes
│   └── styles/                # CSS modules and theme styles
├── extensions/
│   ├── quiz-block/           # Theme app extension (Liquid)
│   └── quiz-history/         # Customer account extension
├── docs/                      # Documentation
├── prisma/                    # Database schema
├── fly.toml                   # Fly.io configuration
└── shopify.app.toml          # Shopify app configuration
```

## 🔌 API Endpoints

### `POST /api/quiz/submit`

Submit quiz results and get product recommendations.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "region": "southeast",
  "responses": { ... },
  "demographics": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "score": 42,
  "severity": "moderate",
  "product": {
    "handle": "southeast-alledrops",
    "title": "Southeast Allergy Drops",
    "url": "/products/southeast-alledrops"
  },
  "profileId": "AOD_1764505955675"
}
```

### `GET /health`

Health check endpoint for monitoring and keeping app warm.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T12:12:37.417Z",
  "service": "alle-drops-quiz-app"
}
```

## 🚢 Deployment

### Fly.io Deployment

The app is configured for Fly.io deployment:

```bash
# Deploy to Fly.io
fly deploy

# Check status
fly status

# View logs
fly logs
```

**Configuration:**
- Health checks: `/health` endpoint (every 30s)
- Auto-start/stop: Enabled (saves costs)
- Min machines: 1 (keeps app warm)
- Region: `iad` (Washington, D.C.)

See `docs/PERFORMANCE_OPTIMIZATION.md` for performance tuning and cold start optimization.

### Shopify App Deployment

```bash
# Deploy app configuration and extensions
shopify app deploy --config shopify.app.alledrops-production.toml
```

**Required Secrets (Fly.io):**
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `GOOGLE_SHEETS_WEB_APP_URL`
- `SHOPIFY_ADMIN_ACCESS_TOKEN` (if needed)
- `SHOPIFY_SHOP_DOMAIN`

Set secrets:
```bash
fly secrets set SHOPIFY_API_KEY=your_key
fly secrets set SHOPIFY_API_SECRET=your_secret
# ... etc
```

## 📚 Documentation

- **[Implementation Status](docs/IMPLEMENTATION_STATUS.md)** - Current feature status
- **[MVP Launch Checklist](docs/MVP_LAUNCH_CHECKLIST.md)** - Pre-launch steps
- **[App Requirements](docs/app-requirements.md)** - Complete requirements spec
- **[Performance Optimization](docs/PERFORMANCE_OPTIMIZATION.md)** - Fly.io optimization guide
- **[Fly.io Migration](docs/FLY_IO_MIGRATION.md)** - Deployment and scaling guide
- **[HIPAA Compliance](docs/HIPAA_COMPLIANCE_ANALYSIS.md)** - Security considerations

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run dev:theme    # Build theme extensions in watch mode
npm run build        # Build for production
npm run build:theme  # Build theme extensions
npm run deploy       # Deploy to Shopify
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Quiz Components

The quiz is built with React components:
- `QuizContainer` - Main quiz wrapper
- `QuestionCard` - Individual question display
- `QuestionCategory` - Category grouping
- `QuizProgress` - Progress indicator
- `RegionSelector` - Region selection
- `ResultsDisplay` - Results and recommendations

### Styling

- **Theme Styles**: `app/styles/quiz-theme.css` - Inherits Shopify theme variables
- **Component Styles**: `app/styles/quiz.module.css` - CSS Modules for React components
- Uses CSS variables: `rgb(var(--color-button))`, `rgb(var(--color-foreground))`, etc.

## 🔐 Security

- Environment variables stored as Fly.io secrets
- CORS validation for API endpoints
- Input validation and sanitization
- Secure session storage (Prisma)
- HIPAA-compliant data handling practices

## 📊 Data Storage

### Shopify Metafields

Quiz data stored in customer metafields (`alledrops` namespace):
- `symptom_profile_id` - Unique identifier
- `quiz_score` - Total score (0-60)
- `severity_level` - Classification
- `quiz_region` - US region
- `quiz_date` - Submission date
- `quiz_history` - JSON array of past quizzes

### Google Sheets

Detailed quiz responses logged to Google Sheets via Apps Script:
- All 35 question responses
- Demographics data
- Timestamps and metadata
- Profile ID linking

## 🐛 Troubleshooting

### Quiz Not Loading

1. Check app URL in theme block settings
2. Verify `/quiz-bundle-js` endpoint is accessible
3. Check browser console for errors
4. Ensure app is deployed and running

### Metafields Not Updating

1. Verify API credentials in Fly.io secrets
2. Check customer exists in Shopify
3. Review API logs: `fly logs`
4. Verify metafield definitions exist

### Cold Start Delays

See `docs/PERFORMANCE_OPTIMIZATION.md` for:
- Setting up UptimeRobot to keep app warm
- VM upgrade options
- Health check configuration

## 🤝 Contributing

This is a private project for AlleDrops. For questions or issues, contact the development team.

## 📄 License

Private - All rights reserved

## 🔗 Links

- **Production App**: https://alle-drops-quiz-app.fly.dev
- **GitHub Repository**: https://github.com/askinne2/alle-drops-quiz-app
- **Shopify Partner Dashboard**: https://partners.shopify.com
- **Fly.io Dashboard**: https://fly.io/apps/alle-drops-quiz-app

---

**Built with ❤️ for AlleDrops**
