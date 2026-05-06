# Configurable Redirects + Sheets Script Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make quiz redirects configurable via the Shopify theme customizer (app block settings) and make `docs/google-script-quiz-integration.js` a correct, copy/paste Google Apps Script Web App that matches the quiz app’s current 13-column `rowData` contract so Google Sheets writes succeed.

**Architecture:** The theme app block (`extensions/quiz-block`) already writes a global `window.AlleDropsQuizConfig`. We will extend that object with two redirect URLs (consult + test options). The React quiz container reads these values at runtime and uses them instead of hard-coded `/pages/...` paths. For Sheets, the quiz app posts `{ data: unknown[] }` to Apps Script; the script must validate, ensure headers, append the row, and return JSON `{ success, rowNumber }`.

**Tech Stack:** Shopify theme app extension (Liquid schema settings), React Router + TypeScript, Google Apps Script (JavaScript).

---

## File structure (what changes)

**Modify**
- `extensions/quiz-block/blocks/symptom-quiz.liquid`
  - Add two new schema settings (`consult_redirect_url`, `test_options_redirect_url`)
  - Emit them into `window.AlleDropsQuizConfig`
- `app/components/quiz/QuizContainer.tsx`
  - Use config redirect URLs for `consult` and `test-options`
- `docs/google-script-quiz-integration.js`
  - Replace legacy headers (region/severity/per-symptom columns) with the 13-column contract used by `app/routes/api.quiz.submit.tsx`

**Reference (do not change in this plan)**
- `app/routes/api.quiz.submit.tsx` — definitive `rowData` order:
  1) `profile_id`
  2) `name`
  3) `email`
  4) `phone`
  5) `dob`
  6) `state`
  7) `score`
  8) `score_bracket`
  9) `date`
  10) `completion_time`
  11) `answers_json`
  12) `personal_history_json`
  13) `family_history_json`

---

### Task 1: Add configurable redirect URLs to the theme app block

**Files:**
- Modify: `extensions/quiz-block/blocks/symptom-quiz.liquid`

- [ ] **Step 1: Add two new settings to the schema**

Insert these settings in the schema (recommended location: after `enable_test_mode` and before `Privacy`):

```json
{
  "type": "header",
  "content": "Redirects"
},
{
  "type": "url",
  "id": "consult_redirect_url",
  "label": "Consult redirect URL",
  "info": "Where to send users when they choose to schedule a consultation (defaults to /pages/consult if blank)."
},
{
  "type": "url",
  "id": "test_options_redirect_url",
  "label": "Test options redirect URL",
  "info": "Where to send users when they choose allergy testing first (defaults to /pages/test-options if blank)."
}
```

- [ ] **Step 2: Emit these settings into `window.AlleDropsQuizConfig`**

In the config script block where we set `window.AlleDropsQuizConfig`, add:

```liquid
      consultRedirectUrl: {{ block.settings.consult_redirect_url | json }},
      testOptionsRedirectUrl: {{ block.settings.test_options_redirect_url | json }},
```

Keep existing keys unchanged.

- [ ] **Step 3: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add extensions/quiz-block/blocks/symptom-quiz.liquid
git commit -m "feat(extension): add configurable redirect URLs to quiz block"
```

---

### Task 2: Use redirect URLs in `QuizContainer` instead of hard-coded `/pages/*`

**Files:**
- Modify: `app/components/quiz/QuizContainer.tsx`

- [ ] **Step 1: Add a small helper to read config**

Add near the top (below `isTestModeEnabled`), matching existing `AlleDropsQuizConfig` usage:

```ts
function getRedirectUrl(kind: "consult" | "testOptions"): string {
  if (typeof window === "undefined") return "";
  const cfg = (window as unknown as { AlleDropsQuizConfig?: { consultRedirectUrl?: string; testOptionsRedirectUrl?: string } })
    .AlleDropsQuizConfig;
  if (!cfg) return "";
  return kind === "consult" ? (cfg.consultRedirectUrl || "") : (cfg.testOptionsRedirectUrl || "");
}
```

- [ ] **Step 2: Replace hard-coded redirects**

Replace:

```ts
window.location.assign("/pages/consult");
```

with:

```ts
window.location.assign(getRedirectUrl("consult") || "/pages/consult");
```

Replace both occurrences of:

```ts
window.location.assign("/pages/test-options");
```

with:

```ts
window.location.assign(getRedirectUrl("testOptions") || "/pages/test-options");
```

- [ ] **Step 3: Run typecheck**

Run: `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run typecheck`

Expected: exit `0`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add app/components/quiz/QuizContainer.tsx
git commit -m "feat(quiz): use block-configured redirect URLs for consult and testing"
```

---

### Task 3: Rewrite `docs/google-script-quiz-integration.js` to match the 13-column clinical contract

**Files:**
- Modify: `docs/google-script-quiz-integration.js`

- [ ] **Step 1: Replace HEADERS with the correct 13 columns**

Set:

```js
const HEADERS = [
  'profile_id',
  'name',
  'email',
  'phone',
  'dob',
  'state',
  'score',
  'score_bracket',
  'date',
  'completion_time',
  'answers_json',
  'personal_history_json',
  'family_history_json'
];
```

- [ ] **Step 2: Update the script header comments**

Update the file’s “Setup Instructions” so it explicitly says:
- Deploy as Web App
- Execute as: **Me**
- Who has access: **Anyone**
- Requests must be JSON: `{ "data": [ ...13 values... ] }`
- Responses are JSON: `{ "success": true, "rowNumber": <number> }`

- [ ] **Step 3: Enforce row length + append**

In `doPost`, after validating `Array.isArray(rowData)`, validate:

```js
if (rowData.length !== HEADERS.length) {
  return createCORSResponse(JSON.stringify({
    success: false,
    error: 'Invalid row length. Expected ' + HEADERS.length + ' values, got ' + rowData.length
  }));
}
```

Then `ensureHeaders(sheet); sheet.appendRow(rowData);` as it already does.

- [ ] **Step 4: Update `testSubmission()` to send a valid clinical row**

Replace `testSubmission()` data with a realistic 13-field payload:

```js
function testSubmission() {
  const testData = {
    data: [
      'AOD_TEST_123',
      'Test User',
      'test@example.com',
      '6155551212',
      '1990-01-02',
      'tennessee',
      9,
      '7+',
      new Date().toISOString(),
      120,
      JSON.stringify({ taking_meds: 'no' }),
      JSON.stringify(['asthma']),
      JSON.stringify(['asthma'])
    ]
  };

  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add docs/google-script-quiz-integration.js
git commit -m "docs: update Apps Script integration for clinical Sheets row format"
```

---

### Task 4: End-to-end verification (storefront + Apps Script)

**Files:** none (runtime verification)

- [ ] **Step 1: Deploy app extensions**

Run: `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && shopify app deploy`

Expected: deployment succeeds and new block settings appear in the theme customizer.

- [ ] **Step 2: Configure redirect URLs in Shopify customizer**

In Shopify Admin → Online Store → Customize → Symptom quiz page → select the quiz block:
- Set **Consult redirect URL** to your existing consult page URL
- Set **Test options redirect URL** to your existing testing page URL

- [ ] **Step 3: Verify redirects**

Run the quiz in storefront:
- Score bracket `0-2` / `3-6` “Schedule…” → lands on configured Consult page
- Score bracket `7+` “Testing first” → lands on configured Test Options page

- [ ] **Step 4: Verify Sheets row**

Submit one quiz and confirm the sheet appended a new row with:
- correct column alignment (no shifted cells)
- `state` and `score_bracket` filled
- JSON columns are valid JSON strings (parseable)

---

## Self-review

**1. Spec coverage:** Addresses both requested items: configurable redirects in customizer and copy/paste Apps Script aligned to the current `rowData` contract.\n+
**2. Placeholder scan:** No TBDs; all inserted code blocks are complete.\n+
**3. Type consistency:** Uses the existing `AlleDropsQuizConfig` global access pattern already present in `QuizContainer.tsx`.\n+

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-06-configurable-redirects-and-sheets-script.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.\n+**REQUIRED SUB-SKILL:** superpowers:subagent-driven-development

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.\n+**REQUIRED SUB-SKILL:** superpowers:executing-plans

Which approach?

