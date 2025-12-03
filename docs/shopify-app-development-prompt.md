# Shopify App Development Prompt - AlleDrops Quiz App

## Context

I'm migrating a complete quiz system from a Shopify theme into a Shopify app. I have **zero experience** building Shopify apps, so please provide clear explanations, documentation, and step-by-step guidance throughout the process.

## Project Overview

I need to build a Shopify app that migrates **ALL** quiz functionality from my theme. See `docs/app-requirements.md` for complete requirements.

**Current State**:
- Quiz frontend in theme (vanilla JS, Liquid templates)
- Cloudflare Worker for backend (metafield updates via Admin API)
- Google Apps Script for Google Sheets integration
- Quiz history page in theme

**Target State**:
- Complete Shopify app with:
  - Quiz frontend (React/TypeScript)
  - Backend API routes (replacing Cloudflare Worker)
  - Google Sheets integration (replacing Apps Script or keeping it)
  - Customer account extension (quiz history)
  - Admin interface (medical staff dashboard)

## Current Code Reference

### Cloudflare Worker (`cloudflare-worker/worker.js` - 524 lines)

**Key Functions to Migrate**:

1. **`findOrCreateCustomer(email)`** (lines 144-193)
   - Searches for customer by email using GraphQL
   - Creates customer if not found
   - Returns customer object with `id` and `email`
   - Uses GraphQL query: `customers(first: 1, query: $email)`
   - Uses GraphQL mutation: `customerCreate(input: $input)`

2. **`updateCustomerMetafields(customerId, data, existingHistoryJson)`** (lines 235-346)
   - Updates 6 customer metafields:
     - `alledrops.symptom_profile_id` (single_line_text_field)
     - `alledrops.quiz_score` (number_integer)
     - `alledrops.quiz_region` (single_line_text_field)
     - `alledrops.quiz_date` (date_time)
     - `alledrops.severity_level` (single_line_text_field)
     - `alledrops.quiz_history` (json) - Array of quiz entries (max 50)
   - Uses GraphQL mutation: `metafieldsSet(metafields: $metafields)`
   - Manages quiz history array (adds new entry, limits to 50)

3. **`getCustomerMetafield(customerId, namespace, key)`** (lines 202-225)
   - Fetches existing metafield value
   - Uses GraphQL query: `customer(id: $customerId) { metafield(...) }`
   - Returns JSON string or null

4. **`validateRequestData(data)`** (lines 105-127)
   - Validates: email, symptom_profile_id, quiz_score, quiz_region, severity_level
   - Email validation regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

5. **`shopifyGraphQL(query, variables)`** (lines 354-378)
   - Makes POST requests to: `https://{STORE_DOMAIN}/admin/api/2024-01/graphql.json`
   - Headers: `Content-Type: application/json`, `X-Shopify-Access-Token: {TOKEN}`
   - Handles GraphQL errors

**Environment Variables Used**:
- `SHOPIFY_STORE_DOMAIN` - Store domain (e.g., `allergist-on-demand.myshopify.com`)
- `SHOPIFY_ACCESS_TOKEN` - Admin API access token
- `ALLOWED_ORIGINS` - CORS allowed origins
- `GOOGLE_SHEETS_WEB_APP_URL` - Google Apps Script URL (optional)

**Request/Response Format**:
- **Request**: `POST /` with JSON body:
  ```json
  {
    "email": "customer@example.com",
    "symptom_profile_id": "AOD_1234567890",
    "quiz_score": 18,
    "quiz_region": "Southeast",
    "severity_level": "moderate",
    "quiz_date": "2024-01-15T10:30:00Z"
  }
  ```
- **Response**: JSON with `success`, `customerId`, `message` or `error`

### Google Apps Script (`google-apps-script/Code.gs` - 215 lines)

**Key Functions**:

1. **`doPost(e)`** (lines 60-109)
   - Receives POST request with JSON body
   - Parses: `JSON.parse(e.postData.contents)`
   - Expects: `{ data: [...] }` array with 32+ values
   - Appends row to Google Sheet named "Symptom Responses"
   - Returns: `{ success: true, rowNumber: N }` or error

2. **`ensureHeaders(sheet)`** (lines 157-178)
   - Ensures sheet has headers (32 columns)
   - Headers include: Profile ID, Customer Name, Email, Score, Severity, Region, Date, Time, and all 35 question responses

**Data Format**:
- Row data array with 32+ values matching HEADERS constant
- First 7 values: Profile ID, Name, Email, Score, Severity, Region, Date, Time
- Next 25 values: Question responses (0-3 severity values)
- Last values: Seasonal timing, Duration, etc.

**Current Integration**:
- Frontend calls Google Apps Script web app URL directly
- Cloudflare Worker can proxy requests (optional, for CORS)

### Quiz Frontend (`assets/symptom-quiz.js` - 901 lines)

**Key Features**:
- 35 questions across 8 symptom categories
- Scoring algorithm (0-60 points)
- Severity classification (minimal/mild/moderate/severe)
- Progress tracking
- Mobile-first responsive
- WCAG 2.1 AA accessible
- Bot prevention (honeypot)

**Scoring Logic**:
- Uses `SEVERITY_WEIGHTS`: none=0, mild=1, moderate=2, severe=3
- Sums all question responses (0-3 each)
- Thresholds: minimal (0-4), mild (5-9), moderate (10-19), severe (20-60)

**Submission Flow**:
1. Collects all responses
2. Calculates score
3. Determines severity level
4. Generates `symptom_profile_id` (timestamp-based)
5. Submits to Cloudflare Worker (metafields)
6. Submits to Google Apps Script (detailed responses)
7. Displays results

## Development Environment Setup

**Prerequisites**:
- Node.js installed (v18+)
- npm or yarn
- Git
- Shopify Partner account (free)
- Text editor/IDE (VS Code recommended)

**Initial Setup Steps** (Please guide me through these):

1. **Install Shopify CLI**:
   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```
   - Verify installation: `shopify version`
   - Login: `shopify auth login`

2. **Create Shopify Partner Account** (if needed):
   - Go to https://partners.shopify.com
   - Sign up (free)
   - Create a development store for testing
   - Note: Development stores are free and perfect for testing

3. **Create the App**:
   ```bash
   npm create @shopify/app@latest
   ```
   - Choose: **Remix** template (recommended)
   - Choose: **TypeScript** (yes)
   - App name: `alledrops-quiz-app`
   - Select: **Start with template files**
   - **Important**: When prompted, select your development store

4. **Navigate to app directory**:
   ```bash
   cd alledrops-quiz-app
   ```

5. **Review app structure**:
   - Understand the generated folder structure
   - Check `app/routes/` for example routes
   - Check `app/lib/` for utility functions

6. **Start development server**:
   ```bash
   npm run dev
   ```
   - This will open a tunnel URL
   - Follow prompts to install the app on your development store
   - Note the app URL for later reference

**Required Shopify API Scopes** (to request during app setup):
- `write_customers` - To update customer metafields
- `read_customers` - To read customer data and metafields
- `read_customer_metafields` - To read quiz history metafields
- `write_customer_metafields` - To write quiz data metafields

**Environment Variables Needed** (create `.env` file):
- `GOOGLE_SHEETS_WEB_APP_URL` - Your Google Apps Script web app URL (for Phase 1, Option A)
- (Shopify app handles SHOPIFY_* variables automatically)

## Phase 1: Backend Infrastructure (Start Here)

**Goal**: Replace Cloudflare Worker and Google Apps Script with app backend

### Step 1: Understand the Current Code

Please help me understand:

- **How Shopify apps work**: Architecture overview, request flow, authentication
- **What Remix routes are**: How they work, request/response handling
- **How to access Shopify Admin API**: In Remix routes, using app context
- **How authentication works**: Shopify OAuth flow, session management
- **GraphQL in Shopify apps**: How to structure queries/mutations in TypeScript

### Step 2: Migrate Cloudflare Worker Logic

**Files to reference**:
- `cloudflare-worker/worker.js` - Contains all the logic to migrate

**What needs to be migrated**:

1. **`findOrCreateCustomer()` function** (lines 144-193)
   - Currently uses GraphQL via `fetch()` to Admin API
   - Needs to use Shopify Admin API from app context
   - **Question**: How do I access Admin API in Remix routes? What's the equivalent of `context.shopify.admin`?

2. **`updateCustomerMetafields()` function** (lines 235-346)
   - Updates 6 customer metafields via GraphQL
   - Manages quiz history array (adds new entry, limits to 50)
   - **Question**: How do I structure GraphQL mutations in the app? Can I use the same queries?

3. **`getCustomerMetafield()` function** (lines 202-225)
   - Fetches existing metafield value
   - **Question**: Same as above - GraphQL queries in app?

4. **Validation logic** (lines 105-127)
   - `validateRequestData()` function
   - Email validation
   - **Question**: Where should validation live in the app structure?

5. **GraphQL helper** (lines 354-378)
   - `shopifyGraphQL()` function
   - **Question**: Do I need this, or does the app provide a better way?

**Create these files** (please guide me):

- `app/routes/api.quiz.submit.ts` - Main submission endpoint
- `app/lib/shopify/customers.ts` - Customer operations
- `app/lib/shopify/metafields.ts` - Metafield operations
- `app/lib/quiz-validation.ts` - Validation logic

**Code Migration Examples Needed**:

**Cloudflare Worker → App Route**:
```typescript
// Current (Cloudflare Worker):
async function findOrCreateCustomer(email) {
  const searchQuery = `query findCustomer($email: String!) { ... }`;
  const response = await shopifyGraphQL(searchQuery, { email });
  // ...
}

// Target (Shopify App):
// How do I do this in a Remix route?
export async function action({ request, context }: ActionFunctionArgs) {
  const { admin } = context.shopify;
  // How do I use admin.graphql() or admin.rest()?
  const customer = await findOrCreateCustomer(admin, email);
  // ...
}
```

**Questions I need answered**:
- How do I access Shopify Admin API in Remix routes?
- What's the difference between `admin.graphql()` and `admin.rest()`?
- How do I structure GraphQL queries in TypeScript?
- How do I handle errors properly (userErrors vs errors)?
- How do I test API routes locally?
- Do I need CORS handling in the app? (I assume not since same origin)

### Step 3: Google Sheets Integration Decision

**Current**: Google Apps Script receives POST requests and writes to Sheets

**Options**:
- **Option A**: Keep Apps Script, app calls it (simpler)
- **Option B**: Use Google Sheets API directly (more control)

**Recommendation**: Start with Option A for Phase 1

**If Option A**:
- Create `app/lib/google-sheets.ts`
- Simple `fetch()` call to Apps Script URL
- Handle responses and errors
- **Question**: How do I store the Apps Script URL securely? Environment variables?

**If Option B** (later):
- Set up Google OAuth
- Use `googleapis` npm package
- More complex but full control
- **Question**: How do I set up OAuth in a Shopify app?

**Questions**:
- How do I store API keys/secrets securely in the app?
- How do I handle environment variables in Shopify apps?
- What's the best way to structure external API calls?
- Should I use Remix actions or separate API utilities?

### Step 4: Create Unified Quiz Submission Endpoint

**Endpoint**: `POST /api/quiz/submit`

**Flow**:
1. Receive quiz data from frontend
2. Validate data (migrated from Cloudflare Worker)
3. Calculate score and severity (if not provided)
4. Find/create customer (migrated from Cloudflare Worker)
5. Get existing quiz history (migrated from Cloudflare Worker)
6. Update customer metafields (migrated from Cloudflare Worker)
7. Submit to Google Sheets (migrated from Apps Script or API)
8. Return results

**Request Format** (from frontend):
```typescript
{
  email: string;
  symptom_profile_id: string;
  quiz_score: number;
  quiz_region: string;
  severity_level: 'minimal' | 'mild' | 'moderate' | 'severe';
  quiz_date?: string; // ISO string, optional
  // Optional: full quiz responses for Google Sheets
  quiz_responses?: Array<number>;
  customer_name?: string;
  completion_time?: number;
}
```

**Response Format**:
```typescript
{
  success: boolean;
  customerId?: string;
  message?: string;
  error?: string;
  details?: any;
}
```

**Questions**:
- How do I structure the request/response in Remix?
- How do I handle errors at each step?
- How do I test this endpoint? (Postman, curl, or Remix test utils?)
- Should I use Remix `action` function or separate API route?
- How do I handle async operations (Google Sheets submission)?

## Phase 2: Quiz Frontend (After Backend Works)

**Goal**: Convert vanilla JS quiz to React/TypeScript

**Files to migrate**:
- `assets/symptom-quiz.js` (901 lines) → React components
- `assets/symptom-quiz.css` (1091 lines) → CSS modules or styled-components
- `assets/quiz-config.js` → TypeScript config
- `assets/quiz-results.js` (557 lines) → React components

**Key Components Needed**:
- `QuizContainer` - Main wrapper
- `QuizProgress` - Progress indicator
- `QuestionCategory` - Category wrapper
- `QuestionCard` - Individual question
- `SeverityInput` - 0-3 severity selector
- `RegionSelector` - Region selection
- `QuizNavigation` - Prev/next buttons
- `QuizSubmit` - Submit button
- `ResultsDisplay` - Results after submission
- `ProductRecommendation` - Product cards

**Questions**:
- How do I structure React components in a Shopify app?
- How do I use App Embed vs App Block?
- How do I manage state in React? (Context, useState, useReducer?)
- How do I style components? (CSS modules vs styled-components vs Tailwind?)
- How do I make API calls from React components? (Remix loaders/actions vs fetch?)
- How do I handle form submission in Remix?
- How do I access Shopify store data (products, regions) from React?

## Phase 3: Customer Account Extension

**Goal**: Show quiz history in customer account dashboard

**Questions**:
- What are Customer Account UI Extensions?
- How do I create one?
- How do I access customer metafields from the extension?
- How do I style it to match Shopify's UI?
- What APIs are available in customer account extensions?

## Phase 4: Admin Interface

**Goal**: Build admin dashboard for medical staff

**Questions**:
- How do I create admin pages in Shopify apps?
- What is Polaris and how do I use it?
- How do I query customer data efficiently? (GraphQL pagination?)
- How do I implement filtering and search?
- How do I handle pagination?
- How do I export data (CSV)?

## Documentation Needs

Please provide:

1. **Architecture explanation**: 
   - How Shopify apps work
   - Request flow (frontend → app → Shopify APIs)
   - Authentication flow (OAuth)
   - Session management

2. **Code examples**: 
   - For each major task, show working examples
   - Include TypeScript types
   - Include error handling
   - Include comments explaining WHY

3. **Best practices**: 
   - Shopify app development patterns
   - Remix patterns for Shopify apps
   - GraphQL query best practices
   - Error handling patterns

4. **Common pitfalls**: 
   - What to avoid
   - Common mistakes beginners make
   - Performance considerations

5. **Testing guidance**: 
   - How to test locally
   - How to test in development store
   - How to test API routes
   - How to test React components

6. **Deployment guide**: 
   - How to deploy the app
   - Environment variables setup
   - Production considerations

## Learning Resources

Please point me to:

- Official Shopify app documentation
- Remix documentation (if using Remix)
- TypeScript best practices
- React patterns for Shopify apps
- GraphQL query examples
- Polaris component library

## Development Approach

**Please**:
- Explain concepts before implementing
- Show code examples with comments
- Explain WHY we're doing things a certain way
- Warn me about common mistakes
- Help me understand the "Shopify way" of doing things
- Be patient with beginner questions
- Break down complex tasks into smaller steps

## Success Criteria for Phase 1

- [ ] App created and running locally
- [ ] Can make API calls to `/api/quiz/submit`
- [ ] Successfully finds/creates customers
- [ ] Successfully updates customer metafields (all 6 metafields)
- [ ] Successfully writes to Google Sheets (via Apps Script or API)
- [ ] Proper error handling at each step
- [ ] Can test with Postman/curl
- [ ] Quiz history array properly managed (adds new, limits to 50)

## Questions to Start With

1. **What is a Shopify app?** (High-level overview)
   - How does it differ from a theme?
   - What can it do that themes can't?
   - How does it integrate with Shopify?

2. **How does authentication work?** (OAuth flow explanation)
   - How does Shopify OAuth work?
   - What are sessions?
   - How do I access authenticated APIs?

3. **What's the difference between Admin API and Storefront API?**
   - When do I use each?
   - What permissions/scopes do I need?
   - How do I access each in the app?

4. **How do Remix routes work?** (Request/response flow)
   - What are loaders vs actions?
   - How do I handle GET vs POST?
   - How do I return JSON vs HTML?

5. **How do I structure a Shopify app?** (Folder structure, best practices)
   - Where do API routes go?
   - Where do utilities go?
   - Where do React components go?
   - How do I organize GraphQL queries?

6. **How do I test locally?** (Development workflow)
   - How do I run the app?
   - How do I connect to a development store?
   - How do I test API routes?
   - How do I debug?

## Next Steps

Please start by:

1. **Confirming the development environment setup steps**
   - Verify the commands work
   - Explain what each step does

2. **Explaining Shopify app architecture**
   - High-level overview
   - Request flow diagram
   - Authentication flow

3. **Helping me create the initial app structure**
   - Set up folders
   - Create initial files
   - Explain the structure

4. **Migrating the first function** (`findOrCreateCustomer`)
   - Show me how to access Admin API
   - Convert GraphQL query to app format
   - Test it works

5. **Testing it works**
   - Show me how to test
   - Verify customer creation
   - Handle errors

Then we'll proceed step-by-step through each phase.

---

## Important Notes

- I'm learning as I go, so please be thorough with explanations
- Don't assume prior knowledge of Shopify app development
- Reference the actual code files when explaining migrations
- Show me the "why" behind decisions, not just the "how"
- Break complex tasks into digestible steps

## Reference Files

Attach these files when starting:
- `docs/app-requirements.md` - Complete requirements
- `cloudflare-worker/worker.js` - Current backend logic (524 lines)
- `google-apps-script/Code.gs` - Current Google Sheets integration (215 lines)
- `assets/symptom-quiz.js` - Current quiz frontend (901 lines, optional for Phase 1)
- `assets/symptom-quiz.css` - Current quiz styles (1091 lines, optional for Phase 1)

---

**Ready to start!** Please begin with Step 1: Development Environment Setup and Architecture Explanation.

---

## Quick Reference: Key Concepts

### Shopify App vs Theme
- **Theme**: Frontend only, runs in browser, limited backend access
- **App**: Full-stack application, can access Admin API, runs on your server
- **App Embed**: App UI embedded in theme pages (what we'll use for quiz)

### Remix Routes
- **Loader**: Runs on server, handles GET requests, fetches data
- **Action**: Runs on server, handles POST/PUT/DELETE, processes forms
- **Route files**: `app/routes/api.quiz.submit.ts` → `/api/quiz/submit`

### Shopify Admin API Access
- In Remix routes: `context.shopify.admin.graphql()` or `context.shopify.admin.rest()`
- GraphQL: Better for complex queries, type-safe
- REST: Simpler for basic operations
- Both require app to be installed and authenticated

### Metafields
- Custom data storage on Shopify resources (customers, products, etc.)
- Namespace: `alledrops` (your app identifier)
- Key: `quiz_score`, `quiz_history`, etc.
- Type: `single_line_text_field`, `number_integer`, `json`, `date_time`

---

## Troubleshooting Tips

**If CLI installation fails**:
- Use `npx` instead: `npx @shopify/cli@latest`
- Check Node.js version: `node --version` (need v18+)

**If app won't start**:
- Check if port is already in use
- Try different port: `npm run dev -- --port 3001`
- Clear cache: `rm -rf node_modules .shopify && npm install`

**If API calls fail**:
- Verify app is installed on development store
- Check API scopes in Partner Dashboard
- Verify authentication session is valid
- Check browser console for CORS errors (shouldn't happen with app)

**If metafield updates fail**:
- Verify metafield definitions exist in Shopify
- Check metafield namespace/key spelling
- Verify `write_customer_metafields` scope is granted
- Check GraphQL response for `userErrors` array

