# AlleDrops Quiz App - MVP Launch Checklist

**Target**: Launch custom app on production store (not dev store)  
**App Type**: Custom app (single store, not public Shopify App Store)  
**Created**: December 1, 2024

---

## 🎯 Pre-Launch Summary

### What's Ready ✅
- Quiz frontend (React components)
- Backend API (`/api/quiz/submit`)
- Customer metafield updates
- Theme block extension (`quiz-block`)
- Scoring and severity calculations
- Product recommendations by region
- Mobile responsive CSS (just updated!)

### What Needs Attention ⚠️
1. Google Sheets script needs redeployment
2. Theme bundle needs rebuild with new CSS
3. End-to-end testing on production store
4. Clear Cloudflare Worker URL from theme block

---

## 📋 Launch Checklist

### Step 1: Fix Google Sheets Integration 🔴 CRITICAL

The Google Apps Script needs to be redeployed with the fixed version:

1. Open your Google Sheet (the one storing quiz data)
2. Go to **Extensions → Apps Script**
3. **Replace ALL code** with the contents from:
   ```
   allergist-on-demand/google-apps-script/Code.gs
   ```
4. Click **Deploy → Manage deployments**
5. Click ✏️ (edit) on current deployment
6. Set version to **"New version"**
7. Click **Deploy**
8. Copy the new Web App URL if it changed
9. Update `.env` file with `GOOGLE_SHEETS_WEB_APP_URL=<new-url>` if needed

**Test**: Submit a quiz and verify data appears in Google Sheets

---

### Step 2: Rebuild Theme Bundle 🔴 CRITICAL

The CSS was just updated for better mobile responsiveness. Rebuild:

```bash
cd /Users/andrewskinner/Local\ Sites/alle-drops-quiz-app
npm run build:theme
```

This creates:
- `public/quiz-bundle.js`
- `public/quiz-bundle.css`

**Verify**: Check that both files exist and have recent timestamps

---

### Step 3: Deploy App to Production Store 🔴 CRITICAL

#### Option A: Deploy via Shopify CLI (Recommended)

```bash
# From app directory
cd /Users/andrewskinner/Local\ Sites/alle-drops-quiz-app

# Deploy the app
shopify app deploy

# This will:
# 1. Build the app
# 2. Deploy extensions (quiz-block, quiz-history)
# 3. Update app configuration
```

When prompted:
- Select your **production store** (not dev store)
- Confirm deployment

#### Option B: Manual Production Setup

If this is your first production deploy:

1. **Install on Production Store**:
   ```bash
   shopify app install --store=your-production-store.myshopify.com
   ```

2. **Deploy Extensions**:
   ```bash
   shopify app deploy
   ```

---

### Step 4: Configure Theme Block 🔴 CRITICAL

After deployment, configure the quiz block in your theme:

1. Go to **Shopify Admin → Online Store → Customize**
2. Navigate to your **Quiz page** (or wherever quiz is embedded)
3. Find the **"Symptom Quiz" block** (from AlleDrops Quiz App)
4. In block settings:
   - **App URL**: Should auto-populate (e.g., `https://your-app-url.shopify.com`)
   - **Cloudflare Worker URL**: **LEAVE EMPTY** ← This is important!
5. **Save** the theme

**Why clear Cloudflare URL?**: The app now handles everything. Leaving the Cloudflare URL would send submissions to the old worker instead of the app.

---

### Step 5: Verify Environment Variables 🟡 IMPORTANT

Ensure your production `.env` has:

```env
# Required
SHOPIFY_API_KEY=<your-api-key>
SHOPIFY_API_SECRET=<your-api-secret>
SCOPES=read_customers,write_customers

# Google Sheets (from Step 1)
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/<your-deployment-id>/exec

# Database (if using Prisma/SQLite)
DATABASE_URL="file:./dev.sqlite"
```

---

### Step 6: End-to-End Testing 🟡 IMPORTANT

Test the complete flow on your production store:

#### Test 1: New Customer Quiz
1. Open an incognito/private browser window
2. Go to your quiz page
3. Fill out all questions (select different severities)
4. Enter a **test email** (e.g., `test-launch@example.com`)
5. Submit the quiz
6. **Verify**:
   - ✅ Results page shows score and severity
   - ✅ Product recommendation appears (if score ≥ 10)
   - ✅ Profile ID is displayed

#### Test 2: Check Shopify Admin
1. Go to **Shopify Admin → Customers**
2. Search for the test email
3. Click the customer
4. Scroll to **Metafields** section
5. **Verify alledrops metafields exist**:
   - `symptom_profile_id`
   - `quiz_score`
   - `severity_level`
   - `quiz_region`
   - `quiz_date`
   - `quiz_history`

#### Test 3: Check Google Sheets
1. Open your quiz data Google Sheet
2. Look for the new row with test submission
3. **Verify all columns populated**:
   - Timestamp, email, name, profile ID
   - Region, score, severity
   - All 35 question responses

#### Test 4: Test Existing Customer (Repeat Quiz)
1. Submit another quiz with **same email**
2. Check `quiz_history` metafield has 2 entries
3. Check Google Sheets has a new row

#### Test 5: Mobile Testing
1. Open quiz on a real mobile device
2. Complete quiz and submit
3. Verify layout looks good throughout

---

### Step 7: Admin Dashboard Access 🟢 OPTIONAL FOR MVP

Verify you can access the admin interface:

1. Go to **Shopify Admin → Apps → AlleDrops Quiz App**
2. Click to open the app
3. Should see the dashboard with:
   - Quick action cards
   - "View Quiz Results" button
4. Click "View Quiz Results"
5. Verify customer data appears

---

## 🔒 Security Checklist

### Already Handled ✅
- [x] **Shopify OAuth**: Built into app framework
- [x] **Session Management**: Handled by Shopify/Remix
- [x] **CORS**: Configured in API routes
- [x] **Input Validation**: Quiz data validation in place
- [x] **API Scopes**: Minimal scopes (`read_customers,write_customers`)
- [x] **SSL/HTTPS**: Shopify enforces this
- [x] **Bot Prevention**: Honeypot field in quiz form

### Verify These
- [ ] No sensitive data in client-side code
- [ ] API keys not exposed in frontend bundle
- [ ] Error messages don't leak internal details

---

## ⚡ Performance Checklist

### Already Handled ✅
- [x] CSS optimized (just did mobile improvements)
- [x] React bundle is production build
- [x] Lazy loading for quiz questions
- [x] Efficient API calls (single submission endpoint)

### Verify These
- [ ] Quiz bundle loads quickly (check Network tab)
- [ ] No console errors during quiz flow
- [ ] Results page renders without delay

### Optional Optimizations (Post-MVP)
- [ ] Add loading spinners for slow connections
- [ ] Implement retry logic for failed submissions
- [ ] Add offline handling / queue submissions

---

## 🚀 Go-Live Procedure

### Day of Launch

1. **Morning**:
   - Complete all checklist items above
   - Do final end-to-end test

2. **Before Going Live**:
   - Back up any existing quiz data
   - Note the Cloudflare Worker logs (for comparison)
   - Clear browser cache

3. **Go Live**:
   - Save theme with app block configured
   - Monitor first few submissions

4. **After Launch (First Hour)**:
   - Watch for errors in:
     - Browser console (on quiz page)
     - App logs (via `shopify app logs`)
     - Google Sheets (data arriving?)
   - Test on different devices

5. **After Launch (First Day)**:
   - Check Shopify admin for new quiz customers
   - Verify Google Sheets has all submissions
   - Review any error notifications

---

## 🔧 Troubleshooting Common Issues

### Quiz Doesn't Load
- Check browser console for errors
- Verify theme block is added to page
- Check that `quiz-bundle.js` is being served
- Try hard refresh (Ctrl+Shift+R)

### Submission Fails
- Check browser Network tab for API errors
- Verify app is deployed and running
- Check API endpoint URL is correct
- Look at app logs: `shopify app logs`

### No Product Recommendations
- Verify score is ≥ 10
- Check product handles match your products
- Look for errors in browser console

### Google Sheets Not Receiving Data
- Verify Apps Script is deployed (Step 1)
- Check `.env` has correct URL
- Test Apps Script URL directly in browser
- Check Apps Script execution logs

### Metafields Not Updating
- Verify customer was created/found
- Check API scopes include `write_customers`
- Look at app logs for GraphQL errors

---

## 📊 Post-Launch Monitoring

### Daily Checks (First Week)
- [ ] Verify quiz submissions are working
- [ ] Check Google Sheets for new data
- [ ] Review admin dashboard
- [ ] Monitor for customer complaints

### Weekly Checks (First Month)
- [ ] Review any error patterns
- [ ] Check app performance metrics
- [ ] Verify data integrity
- [ ] Gather user feedback

---

## 🔮 Post-MVP Enhancements (Future)

After successful MVP launch, consider:

1. **Admin Dashboard Improvements**:
   - Search by email/name
   - Filter by severity/region/date
   - Customer detail view
   - CSV export

2. **Customer Account Extension**:
   - Debug why extension isn't showing data
   - Alternative: Keep using Liquid section

3. **Analytics**:
   - Quiz completion rates
   - Average scores by region
   - Conversion tracking

4. **Deprecate Old Infrastructure**:
   - Remove Cloudflare Worker (app handles everything)
   - Clean up unused theme files

---

## ✅ Final Checklist Before Launch

```
[ ] Google Apps Script redeployed and tested
[ ] Theme bundle rebuilt (npm run build:theme)
[ ] App deployed (shopify app deploy)
[ ] Theme block configured (Cloudflare URL cleared)
[ ] End-to-end test passed
[ ] Mobile test passed
[ ] Google Sheets receiving data
[ ] Customer metafields updating
[ ] Admin dashboard accessible
[ ] No console errors
```

Once all boxes are checked, you're ready to launch! 🚀

---

## 📞 Support

If you run into issues:

1. **Check app logs**: `shopify app logs --store=your-store.myshopify.com`
2. **Check browser console**: F12 → Console tab
3. **Check Network tab**: F12 → Network tab (look for failed requests)
4. **Review this checklist**: Most issues are configuration-related

