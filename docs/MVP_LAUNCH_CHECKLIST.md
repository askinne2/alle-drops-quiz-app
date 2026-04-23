# AlleDrops Quiz App - MVP Launch Checklist

**Target**: Launch the clinical quiz on the production store  
**App Type**: Custom Shopify app  
**Updated**: April 23, 2026

---

## Pre-Launch Summary

### What's Ready

- Clinical quiz frontend
- Backend submission route at `POST /api/quiz/submit`
- Shopify customer metafield updates
- Theme block extension
- Score bracket routing (`0-2`, `3-6`, `7+`)
- Tennessee/Texas product path
- Admin dashboard filtering by score bracket and state

### What Still Needs Verification

1. Google Sheets deployment and row mapping
2. End-to-end storefront testing on production
3. Fresh metafield verification in Shopify admin
4. Theme block still pointing to the app instead of any legacy worker/proxy

---

## Launch Checklist

### Step 1: Verify Google Sheets Integration

1. Open the Google Sheet that receives quiz submissions
2. Open **Extensions -> Apps Script**
3. Confirm the deployed script matches the current expected column order:
   - profile ID
   - name
   - email
   - phone
   - DOB
   - state
   - score
   - score bracket
   - quiz date
   - completion time
   - answers JSON
   - personal history JSON
   - family history JSON
4. Redeploy the Apps Script if the live deployment is stale
5. Confirm `GOOGLE_SHEETS_WEB_APP_URL` points to the active deployment

**Test**: Submit a quiz and verify a new row appears with `state` and `score_bracket` populated correctly.

---

### Step 2: Rebuild Theme Bundle

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
npm run build:theme
```

Verify that:

- `public/quiz-bundle.js` exists
- `public/quiz-bundle.css` exists
- both files have current timestamps

---

### Step 3: Deploy the App

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
shopify app deploy
```

When prompted:

- choose the production store
- confirm the deployment

---

### Step 4: Confirm Theme Block Settings

After deployment:

1. Go to **Shopify Admin -> Online Store -> Customize**
2. Open the page where the quiz block is embedded
3. Find the **Symptom Quiz** app block
4. Confirm:
   - **App URL** is correct
   - any legacy worker/proxy URL field is empty
5. Save the theme

---

### Step 5: Verify Environment Variables

Production configuration should include:

```env
SHOPIFY_API_KEY=<your-api-key>
SHOPIFY_API_SECRET=<your-api-secret>
SCOPES=read_customers,write_customers
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/<deployment-id>/exec
DATABASE_URL="file:./dev.sqlite"
```

---

### Step 6: End-to-End Testing

#### Test 1: Tennessee patient

1. Open the quiz in an incognito window
2. Choose Tennessee in `StateGate`
3. Complete the patient info step
4. Complete Parts 1-5
5. Submit through one of the bracket paths
6. Verify:
   - results page shows the numeric score
   - results page shows the correct bracket
   - Tennessee path messaging is correct
   - profile ID is shown

#### Test 2: Texas patient

Repeat the same flow with Texas selected and verify the Texas product path remains correct.

#### Test 3: Check Shopify admin metafields

1. Open **Shopify Admin -> Customers**
2. Find the test customer
3. Open the customer record
4. Verify the `alledrops` metafields:
   - `symptom_profile_id`
   - `quiz_score`
   - `state`
   - `score_bracket`
   - `quiz_date`
   - `quiz_history`

#### Test 4: Check Google Sheets

Verify the new row contains:

- profile ID
- name and email
- state
- score
- score bracket
- answers JSON

#### Test 5: Repeat quiz history

1. Submit another quiz with the same email
2. Confirm `quiz_history` now contains two entries
3. Confirm each entry uses `score_bracket` and `state`
4. Confirm legacy data, if present, is not broken by the new entry

#### Test 6: Bracket coverage

Run at least one submission through each bracket:

- `0-2`
- `3-6`
- `7+`

Confirm the expected storefront flow is triggered for each bracket.

#### Test 7: Mobile testing

Complete the quiz on a real mobile device and confirm the flow remains usable from state gate through submission.

---

### Step 7: Admin Dashboard Verification

1. Open **Shopify Admin -> Apps -> AlleDrops Quiz App**
2. Open **View Quiz Results**
3. Verify:
   - new submissions appear
   - search works
   - score bracket filter works
   - state filter works
   - quiz history displays correctly

---

## Security Checklist

### Already handled

- [x] Shopify OAuth
- [x] Session handling
- [x] Server-side payload validation
- [x] DOB excluded from Shopify metafields
- [x] HTTPS via Shopify/Fly

### Verify before launch

- [ ] No secrets exposed in the frontend bundle
- [ ] Error states do not leak internal implementation details
- [ ] Protected customer data limitations are understood for the target store

---

## Performance Checklist

### Already handled

- [x] Production React bundle
- [x] Single submission endpoint
- [x] Theme bundle build pipeline

### Verify before launch

- [ ] No console errors during quiz flow
- [ ] Results render quickly
- [ ] Submission response is reliable on mobile and desktop

---

## Post-Launch Monitoring

### First week

- [ ] Confirm daily submissions continue arriving in Google Sheets
- [ ] Spot-check Shopify metafields on fresh customers
- [ ] Watch app logs for submission warnings
- [ ] Review dashboard filters with live data

### First month

- [ ] Review bracket distribution
- [ ] Review any stale legacy customer records
- [ ] Identify admin dashboard follow-up needs

---

## Final Launch Gate

```text
[ ] Google Sheets deployment verified
[ ] Theme bundle rebuilt
[ ] App deployed
[ ] Theme block pointed at app endpoint
[ ] Tennessee flow passed
[ ] Texas flow passed
[ ] 0-2 / 3-6 / 7+ flows passed
[ ] Shopify metafields updating
[ ] Google Sheets receiving rows
[ ] Admin dashboard shows new submissions
[ ] No blocking console or app-log errors
```
