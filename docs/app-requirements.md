# AlleDrops Quiz App - Complete Migration Requirements

## Overview

Migrate **ALL** quiz functionality from the Shopify theme into a single, unified Shopify app. This includes:
- Quiz frontend (customer-facing)
- Quiz results display
- Data submission and storage
- Customer account integration
- Admin interface for medical staff

## Current Theme Implementation (To Be Migrated)

### Frontend Components
- **Quiz Interface**: `assets/symptom-quiz.js` (901 lines) - Main quiz controller
- **Quiz Styles**: `assets/symptom-quiz.css` (1091 lines) - Complete styling
- **Quiz Config**: `assets/quiz-config.js` - Question loader (metaobjects or hardcoded)
- **Results Display**: `assets/quiz-results.js` (557 lines) - Results rendering
- **Google Sheets Integration**: `assets/google-sheets-integration.js` - API wrapper
- **Liquid Sections**: 
  - `sections/symptom-quiz.liquid` - Quiz form section
  - `sections/quiz-results.liquid` - Results section
  - `sections/quiz-history.liquid` - History page
- **Templates**: `templates/page.symptom-quiz.json` - Quiz page template

### Backend/Infrastructure (TO BE MIGRATED INTO APP)
- **Cloudflare Worker**: `cloudflare-worker/worker.js` (524 lines) 
  - Proxies Shopify Admin API calls (metafield updates)
  - Finds/creates customers
  - Updates customer metafields
  - Handles CORS
  - Optional: Proxies Google Sheets submissions
- **Google Apps Script**: `google-apps-script/Code.gs` (215 lines)
  - Receives quiz submission POST requests
  - Writes detailed quiz data to Google Sheets
  - Handles CORS responses
  - Validates and formats data

### Features to Migrate
- ✅ 35 clinical questions across 8 symptom categories
- ✅ Smart scoring algorithm (0-60 points)
- ✅ Severity level classification (minimal/mild/moderate/severe)
- ✅ Regional product matching (7 US regions)
- ✅ Progress tracking and validation
- ✅ Mobile-first responsive design
- ✅ WCAG 2.1 AA accessibility
- ✅ Bot prevention (honeypot)
- ✅ Dual data storage (Google Sheets + Shopify metafields)
- ✅ Quiz history tracking
- ✅ Product recommendations based on score/region

## App Architecture

### Recommended Stack: Shopify CLI + Remix

```
AlleDrops Quiz App
├── Frontend (Customer-Facing)
│   ├── Quiz Page (App Embed or App Block)
│   │   ├── React + TypeScript
│   │   ├── Quiz interface (migrated from symptom-quiz.js)
│   │   ├── Results display (migrated from quiz-results.js)
│   │   └── Styling (migrated from symptom-quiz.css)
│   │
│   └── Customer Account Extension
│       ├── Quiz history display
│       └── Latest quiz summary
│
├── Backend (Remix Routes)
│   ├── API Routes
│   │   ├── /api/quiz/submit - Handle quiz submission
│   │   ├── /api/quiz/history - Get customer quiz history
│   │   └── /api/quiz/questions - Get quiz questions
│   │
│   └── Background Jobs (if needed)
│       └── Webhook handlers for async processing
│
├── Admin Interface
│   ├── Quiz Results Dashboard
│   │   ├── Customer list with quiz data
│   │   ├── Filtering/search
│   │   └── Export functionality
│   │
│   └── Customer Quiz Detail View
│       ├── Full quiz history
│       ├── Link to Google Sheets
│       └── Customer information
│
└── Data Layer
    ├── Shopify Admin API (customer metafields)
    ├── Google Sheets API (detailed responses)
    └── App Database (optional - for analytics/caching)
```

## Migration Plan

### Phase 1: Backend Infrastructure Migration ✅ COMPLETE

**Goal**: Replace **BOTH** Cloudflare Worker AND Google Apps Script with app backend

**Current Infrastructure to Replace**:

1. **Cloudflare Worker** (`cloudflare-worker/worker.js`):
   - ✅ Find/create customer logic → App API route
   - ✅ Update customer metafields → App Admin API calls
   - ✅ Quiz history management → App backend logic
   - ✅ CORS handling → App middleware
   - ✅ Validation → App validation layer

2. **Google Apps Script** (`google-apps-script/Code.gs`):
   - ✅ POST request handler → App API route
   - ✅ Google Sheets write → App calls Apps Script web app
   - ✅ Data validation → App validation layer
   - ✅ CORS responses → App middleware

**Completed Tasks**:

1. ✅ **Set up Shopify app with Remix**
   - Installed Shopify CLI
   - Created app structure
   - Configured Admin API access
   - Set up environment variables

2. ✅ **Migrated Cloudflare Worker functionality**:
   - Created `/api/quiz/submit` route
   - Ported `findOrCreateCustomer()` function
   - Ported `updateCustomerMetafields()` function
   - Ported `getCustomerMetafield()` function
   - Ported validation logic
   - Replaced CORS handling with Remix middleware
   - Using Shopify Admin API directly (no proxy needed)

3. ✅ **Google Apps Script Integration**:
   - **Using Option A**: Keep Google Apps Script, call from app
     - App calls Google Apps Script web app URL
   - Apps Script handles Google Sheets writes
   - ⚠️ **NOTE**: Need to redeploy Apps Script to fix bug

4. ✅ **Created unified quiz submission endpoint**:
   - Single `/api/quiz/submit` route
   - Validates quiz data
   - Calculates score and severity
   - Updates Shopify metafields
   - Submits to Google Sheets
   - Returns results to frontend

5. ✅ **Set up authentication and security**:
   - Shopify OAuth (built into app)
   - API route protection
   - Input validation and sanitization
   - Error handling

**Files Created**:
- `app/routes/api.quiz.submit.tsx` ← Cloudflare Worker logic
- `app/lib/quiz-validation.ts` ← Validation logic
- `app/lib/google-sheets.ts` ← Google Sheets integration
- `app/lib/shopify/customers.ts` ← Customer operations
- `app/lib/shopify/metafields.ts` ← Metafield operations

---

### Phase 2: Quiz Frontend ✅ COMPLETE

**Goal**: Migrate quiz interface to React/TypeScript

**Completed Tasks**:
1. ✅ Converted `symptom-quiz.js` to React components
2. ✅ Migrated `symptom-quiz.css` to CSS modules
3. ✅ Converted quiz config to TypeScript
4. ✅ Migrated `quiz-results.js` to React components
5. ✅ Created Theme App Block for quiz page
6. ✅ Implemented quiz navigation and validation
7. ✅ Added progress tracking
8. ✅ Implemented scoring algorithm
9. ✅ Created build system for theme bundle

**Files Created**:
- `app/components/quiz/QuizContainer.tsx`
- `app/components/quiz/QuestionCard.tsx`
- `app/components/quiz/QuestionCategory.tsx`
- `app/components/quiz/QuizNavigation.tsx`
- `app/components/quiz/QuizProgress.tsx`
- `app/components/quiz/RegionSelector.tsx`
- `app/components/quiz/ResultsDisplay.tsx`
- `app/lib/quiz/questions.ts`
- `app/lib/quiz/scoring.ts`
- `app/lib/quiz/types.ts`
- `app/styles/quiz.module.css`
- `extensions/quiz-block/` (Theme App Extension)
- `public/quiz-bundle.js` (Built bundle)
- `public/quiz-bundle.css` (Built styles)

**Deliverables**:
- ✅ Fully functional quiz in React
- ✅ Results display working with two-column layout
- ✅ Product recommendations working (via /products/{handle}.js)
- ✅ Mobile responsive
- ✅ Accessible

---

### Phase 3: Customer Account Integration ⚠️ PARTIAL

**Goal**: Add quiz history to customer account dashboard

**Completed Tasks**:
1. ✅ Created Customer Account UI Extension (`extensions/quiz-history/`)
2. ✅ Extension deployed to Shopify
3. ✅ GraphQL query for customer metafields

**Current Issues**:
- ⚠️ Extension not displaying data reliably
- Customer Account Extensions are a newer Shopify feature with limitations

**Workaround**:
- Using theme Liquid section (`sections/quiz-history.liquid`) as fallback
- This works reliably and can be added to any page

**Remaining Tasks** (Lower Priority):
- [ ] Debug Customer Account Extension issues
- [ ] Test with multiple customer accounts
- [ ] Investigate alternative extension targets

---

### Phase 4: Admin Interface 🔜 IN PROGRESS

**Goal**: Build admin dashboard for medical staff

**Completed Tasks**:
1. ✅ Created admin app home page
2. ✅ Built Quiz Results Dashboard (basic customer list)
3. ✅ Display: name, email, score, severity, region, date, profile ID
4. ✅ Severity color coding
5. ✅ Sorted by quiz date

**Remaining Tasks**:
- [ ] Add filtering (by severity, region, date range, score range)
- [ ] Add search functionality (by email, name)
- [ ] Create customer detail view (full history)
- [ ] Add link to Google Sheets row
- [ ] Implement export functionality (CSV)
- [ ] Add pagination for large datasets
- [ ] Add analytics/summary cards (optional)

---

### Phase 5: Testing & Cleanup 🔜 PENDING

**Goal**: Test everything and remove theme code

**Tasks**:
- [ ] End-to-end testing of all quiz flows
- [ ] Performance optimization
- [ ] Remove/deprecate old theme quiz files
- [ ] Deprecate Cloudflare Worker
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Monitor and fix issues

---

## Technical Specifications

### Frontend (React/TypeScript)

**Quiz Component Structure** ✅:
```typescript
// Components (all implemented)
- QuizContainer (main wrapper)
- QuizProgress (progress indicator)
- QuestionCategory (category wrapper)
- QuestionCard (individual question)
- RegionSelector (region selection)
- QuizNavigation (prev/next buttons)
- ResultsDisplay (results after submission)
```

**State Management**:
- React hooks for quiz state
- Local state for form inputs
- API calls via fetch to app routes

**Styling**:
- CSS Modules (`quiz.module.css`)
- Responsive breakpoints
- Theme-aware design

### Backend (Remix)

**API Routes** ✅:
```typescript
// app/routes/api.quiz.submit.tsx (IMPLEMENTED)
POST /api/quiz/submit
- Validates quiz data
- Calculates score
- Finds/creates customer
- Updates customer metafields
- Submits to Google Sheets
- Returns results

// Future routes (not yet needed)
GET /api/quiz/history - Get customer quiz history
GET /api/quiz/questions - Get quiz questions from metaobjects
```

**Data Flow**:
```
Quiz Submission (Frontend)
  ↓
App API Route (/api/quiz/submit)
  ↓
Validate & Calculate Score
  ↓
Find/Create Customer (Shopify Admin API)
  ↓
Update Shopify Metafields (Shopify Admin API)
  ↓
Submit to Google Sheets (via Apps Script)
  ↓
Return Results to Frontend
```

### Admin Interface (Polaris)

**Current Pages**:
- `/app` - Home dashboard with quick actions
- `/app/quiz-results` - Customer list with quiz data
- `/app/quiz` - Test quiz page

**Planned Pages**:
- `/app/quiz-results/[customerId]` - Customer detail view
- `/app/quiz-results/export` - Export page

---

## Data Storage Strategy

### Current Implementation ✅
- **Shopify Metafields**: Summary data (score, severity, region, date, history)
- **Google Sheets**: Full detailed responses (35 questions + metadata)
- **Profile ID**: Links customer to their full data row in Google Sheets

### Metafields Schema
```
namespace: alledrops
keys:
  - symptom_profile_id (string) - Unique ID like "AOD_1764505955675"
  - quiz_score (number) - 0-60
  - severity_level (string) - minimal/mild/moderate/severe
  - quiz_region (string) - southeast, southwest, etc.
  - quiz_date (date) - ISO date
  - quiz_history (json) - Array of past assessments
```

---

## Migration Checklist

### Backend ✅
- [x] Set up Shopify app with Remix
- [x] Create API routes for quiz submission
- [x] **Migrate Cloudflare Worker logic**:
  - [x] Find/create customer function
  - [x] Update metafields function
  - [x] Get metafield function
  - [x] Validation logic
  - [x] CORS handling
- [x] **Google Sheets integration**:
  - [x] Keep Apps Script (Option A)
  - [x] Create wrapper to call it
  - [x] Data formatting and validation
- [x] Set up authentication (Shopify OAuth)
- [x] Test API endpoints
- [x] Verify metafield updates work
- [ ] Verify Google Sheets writes work (⚠️ need to redeploy Apps Script)

### Frontend ✅
- [x] Convert quiz JS to React components
- [x] Migrate CSS to CSS modules
- [x] Convert quiz config to TypeScript
- [x] Migrate results display
- [x] Create Theme App Block
- [x] Test quiz flow end-to-end
- [x] Build and deploy bundle

### Customer Account ⚠️
- [x] Create Customer Account Extension
- [x] Deploy extension
- [ ] Debug data fetching issues
- [x] **Fallback**: Theme Liquid section works

### Admin 🔜
- [x] Create admin home page
- [x] Build customer list
- [ ] Add filtering/search
- [ ] Create detail view
- [ ] Add export functionality
- [ ] Test admin interface

### Cleanup 🔜
- [ ] Test everything end-to-end
- [ ] Remove/deprecate theme quiz files
- [ ] Deprecate Cloudflare Worker
- [ ] Update all documentation
- [ ] Deploy to production
- [ ] Monitor and fix issues

---

## Critical Action Items

### 1. Fix Google Sheets (HIGH PRIORITY)

Redeploy Google Apps Script to fix the `.setHeaders()` bug:

1. Open Google Sheet → Extensions → Apps Script
2. Replace all code with `allergist-on-demand/google-apps-script/Code.gs`
3. Deploy → Manage deployments → Edit → New version → Deploy

### 2. Configure Theme Block

Ensure quiz submissions go to app API:

1. Shopify Admin → Online Store → Customize → Quiz page
2. Find Symptom Quiz block
3. **Clear "Cloudflare Worker URL"** field
4. Save

### 3. Complete Admin Dashboard

Priority enhancements:
1. Add search by email
2. Add filtering by severity
3. Add customer detail view

---

## Resources

- [Shopify App Development](https://shopify.dev/docs/apps)
- [Remix + Shopify](https://shopify.dev/docs/apps/tools/cli/remix)
- [Customer Account UI Extensions](https://shopify.dev/docs/api/customer-account-ui-extensions)
- [App Embed](https://shopify.dev/docs/apps/app-extensions/app-embed)
- [Admin API GraphQL](https://shopify.dev/docs/api/admin-graphql)
- [Polaris Design System](https://polaris.shopify.com/)
