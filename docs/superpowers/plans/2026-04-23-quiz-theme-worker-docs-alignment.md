# Post–clinical quiz: theme, worker, docs, and UX alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align every non-React surface (Shopify theme, optional Cloudflare proxy, documentation, and small quiz UI polish) with the TN/TX clinical flow, `state` + `score_bracket` metafields, and the new submit payload so merchants never see stale `/60`, region-based product copy, or worker validation failures.

**Architecture:** Treat `alle-drops-quiz-app` as the source of truth for validation and metafields (`app/lib/quiz-validation.ts`, `app/lib/shopify/metafields.ts`). Mirror that contract in `allergist-on-demand/cloudflare-worker/worker.js` only if the theme block’s `AlleDropsQuizConfig.apiEndpoint` still points at Cloudflare; otherwise document clearing that URL so POSTs go to Fly `/api/quiz/submit`. Theme Liquid/JS that duplicates results (`quiz-results`, legacy `symptom-quiz`) either updates to the new semantics or is removed from the symptom quiz template so the embedded app is the single results UI.

**Tech Stack:** React Router 7 app (`alle-drops-quiz-app`), Shopify Liquid + theme JS (`allergist-on-demand`), Cloudflare Worker (plain JS), Shopify theme app extension (`extensions/quiz-block`), optional Vitest for app-side regression tests.

**Repos (absolute paths for clarity):**

- Quiz app: `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
- Theme: `/Users/andrewskinner/Local Sites/allergist-on-demand`

**Recommended:** Before executing, create a dedicated git worktree per repo (see superpowers:using-git-worktrees) so theme and app changes stay isolated from unrelated work.

---

## File map (what changes, at a glance)

| Area | Responsibility |
|------|----------------|
| `allergist-on-demand/templates/page.symptom-quiz.json` | Remove or simplify `quiz_results` section so the page does not load legacy `/60` + region UI under the app block. |
| `allergist-on-demand/sections/quiz-results.liquid` | Copy, score display, product grid tied to old severity + `{region}-alledrops`. |
| `allergist-on-demand/assets/quiz-results.js` | Reads `data-symptom-quiz`, severity classes `minimal`…`severe`, region-based product fetch. |
| `allergist-on-demand/sections/quiz-history.liquid` | Customer metafields `severity_level`, `quiz_region`, `/60` in markup and injected JS. |
| `allergist-on-demand/sections/main-account.liquid` | Same legacy metafields + `/60` in account summary. |
| `allergist-on-demand/sections/symptom-quiz.liquid` + `assets/symptom-quiz.js` | Legacy non-app quiz path; align or document deprecation if still linked anywhere. |
| `allergist-on-demand/cloudflare-worker/worker.js` | Validates `quiz_region` + `severity_level`; writes those keys. Must accept `state` + `score_bracket` (+ optional `name`, `dob`, `phone` passthrough for Sheets only if worker proxies sheets). |
| `alle-drops-quiz-app/extensions/quiz-block/blocks/symptom-quiz.liquid` | Schema default subheading still says “regional allergy drops”. |
| `alle-drops-quiz-app/README.md`, `docs/*.md` | Still describe `QuestionCard`, `RegionSelector`, `severity_level`, `quiz_region`, old scoring. |
| `alle-drops-quiz-app/app/styles/quiz.module.css` (+ optional `QuizPartRenderer.tsx`) | Horizontal option radios may still show native circles (vertical path hides them). |

---

### Task 1: Vitest + regression test for `validateQuizData` (unlocks TDD for API contract)

**Files:**

- Create: `alle-drops-quiz-app/vitest.config.ts`
- Create: `alle-drops-quiz-app/app/lib/quiz-validation.test.ts`
- Modify: `alle-drops-quiz-app/package.json` (scripts + devDependencies)

- [ ] **Step 1: Add Vitest devDependencies and script**

In `alle-drops-quiz-app/package.json`, merge into `devDependencies`:

```json
"vitest": "^3.2.4"
```

Add script:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Run: `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm install`

Expected: `package-lock.json` updates; install exits `0`.

- [ ] **Step 2: Create Vitest config**

Create `alle-drops-quiz-app/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Write failing test first (wrong bracket should fail)**

Create `alle-drops-quiz-app/app/lib/quiz-validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateQuizData } from "./quiz-validation";

const base = {
  state: "tennessee",
  name: "Test User",
  dob: "1990-01-15",
  email: "test@example.com",
  phone: "6155551212",
  symptom_profile_id: "sp_test_1",
  quiz_score: 5,
  score_bracket: "3-6",
  answers: {},
};

describe("validateQuizData", () => {
  it("rejects invalid score_bracket", () => {
    const r = validateQuizData({ ...base, score_bracket: "moderate" });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("score_bracket");
  });

  it("accepts minimal valid TN payload", () => {
    const r = validateQuizData(base);
    expect(r.valid).toBe(true);
  });
});
```

Run: `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run test`

Expected: FAIL only if `vitest` not installed yet (after step 1, PASS).

- [ ] **Step 4: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add package.json package-lock.json vitest.config.ts app/lib/quiz-validation.test.ts
git commit -m "test: add Vitest and quiz submission validation coverage"
```

---

### Task 2: Theme symptom quiz template — drop legacy results section under app block

**Files:**

- Modify: `allergist-on-demand/templates/page.symptom-quiz.json`

- [ ] **Step 1: Replace template JSON**

Replace entire file `allergist-on-demand/templates/page.symptom-quiz.json` with:

```json
{
  "sections": {
    "quiz_app": {
      "type": "apps",
      "settings": {
        "include_margins": true
      }
    }
  },
  "order": ["quiz_app"]
}
```

Rationale: `quiz-results` expects legacy `symptom-quiz` DOM and `/60` UX; the embedded app already owns results in React.

- [ ] **Step 2: Manual verify in Shopify theme editor**

Run: `shopify theme dev` from `allergist-on-demand` (or your usual preview).

Open `/pages/symptom-quiz`, confirm: only app block visible; no empty “Your Assessment Results” section below.

- [ ] **Step 3: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/allergist-on-demand"
git add templates/page.symptom-quiz.json
git commit -m "fix(theme): symptom quiz page uses app block only (remove legacy quiz-results)"
```

---

### Task 3: Customer account — `quiz-history.liquid` metafields and score display

**Files:**

- Modify: `allergist-on-demand/sections/quiz-history.liquid`

- [ ] **Step 1: Read metafields with fallbacks (Liquid)**

Near the top where `latest_severity` / `latest_region` are assigned, use pattern:

```liquid
assign latest_bracket = customer.metafields.alledrops.score_bracket.value | default: customer.metafields.alledrops.severity_level.value
assign latest_state = customer.metafields.alledrops.state.value | default: customer.metafields.alledrops.quiz_region.value
```

Replace every UI string that showed `{{ latest_score }}/60` with something like:

```liquid
<span class="score-value">Score: {{ latest_score }} ({{ latest_bracket }})</span>
```

If `latest_bracket` is blank, show `Score: {{ latest_score }}` only.

- [ ] **Step 2: Update inline `historyContainer.innerHTML` JS in same file**

Where the string contains ``${quiz.score}/60``, change to:

```javascript
`<span class="score-value">Score: ${quiz.score} (${quiz.score_bracket || quiz.severity || "—"})</span>`
```

Ensure the JSON built from `quiz_history` metafield passes through `score_bracket` and `state` when present (legacy entries may only have `severity` / `region`; display those as fallback).

- [ ] **Step 3: Logged-in customer preview**

Theme preview as a customer with both old and new metafield shapes; confirm no `/60` and no Liquid errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/allergist-on-demand"
git add sections/quiz-history.liquid
git commit -m "fix(theme): quiz history uses score_bracket and state with legacy fallbacks"
```

---

### Task 4: Customer account — `main-account.liquid` summary strip

**Files:**

- Modify: `allergist-on-demand/sections/main-account.liquid`

- [ ] **Step 1: Mirror Task 3 Liquid pattern**

Same `latest_bracket` / `latest_state` assigns and replace `/60` score line with `Score: {{ latest_score }} ({{ latest_bracket }})` (omit bracket span if empty).

- [ ] **Step 2: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/allergist-on-demand"
git add sections/main-account.liquid
git commit -m "fix(theme): account dashboard shows clinical bracket and state"
```

---

### Task 5: Cloudflare Worker — accept new POST body and write new metafields

**Files:**

- Modify: `allergist-on-demand/cloudflare-worker/worker.js`

- [ ] **Step 1: Replace `validateRequestData` body**

Replace the function `validateRequestData` (lines ~105–126) with:

```javascript
function validateRequestData(data) {
  if (!data.email || !isValidEmail(data.email)) {
    return { valid: false, error: 'Valid email is required' };
  }
  if (!data.symptom_profile_id) {
    return { valid: false, error: 'symptom_profile_id is required' };
  }
  if (typeof data.quiz_score !== 'number') {
    return { valid: false, error: 'quiz_score must be a number' };
  }
  const state = data.state || data.quiz_region;
  if (!state || typeof state !== 'string') {
    return { valid: false, error: 'state is required (legacy quiz_region accepted)' };
  }
  const bracket = data.score_bracket || data.severity_level;
  if (!bracket || typeof bracket !== 'string') {
    return { valid: false, error: 'score_bracket is required (legacy severity_level accepted)' };
  }
  return { valid: true };
}
```

- [ ] **Step 2: Update `quizEntry` and metafields in `updateCustomerMetafields`**

Replace the `quizEntry` object (~267–274) with:

```javascript
  const stateVal = data.state || data.quiz_region;
  const bracketVal = data.score_bracket || data.severity_level;
  const quizEntry = {
    profile_id: data.symptom_profile_id,
    date: data.quiz_date || new Date().toISOString(),
    score: data.quiz_score,
    score_bracket: bracketVal,
    state: stateVal
  };
```

In the `metafields` array, replace the `quiz_region` and `severity_level` entries with:

```javascript
    {
      ownerId: customerId,
      namespace: 'alledrops',
      key: 'state',
      type: 'single_line_text_field',
      value: stateVal
    },
    {
      ownerId: customerId,
      namespace: 'alledrops',
      key: 'score_bracket',
      type: 'single_line_text_field',
      value: bracketVal
    },
```

Do **not** delete old keys in this task if you want backward compatibility for other theme code; optional follow-up is to clear legacy keys on next update (YAGNI: leave old keys untouched unless product asks).

- [ ] **Step 3: Local worker test with `curl`**

Run (replace `WORKER_URL` with your dev or staging worker):

```bash
curl -sS -X POST "WORKER_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: https://allergistonline.com" \
  -d '{"email":"e2e-worker-test@example.com","symptom_profile_id":"sp_cf_1","quiz_score":4,"state":"tennessee","score_bracket":"3-6","quiz_date":"2026-04-23T12:00:00.000Z"}'
```

Expected: HTTP `200` and JSON containing `"success":true` (assuming worker env vars valid).

Request with missing `score_bracket` but `severity_level: "moderate"` should also return `200` (legacy path).

- [ ] **Step 4: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/allergist-on-demand"
git add cloudflare-worker/worker.js
git commit -m "fix(worker): align quiz proxy with state and score_bracket payload"
```

---

### Task 6: Theme extension schema copy (`quiz-block`)

**Files:**

- Modify: `alle-drops-quiz-app/extensions/quiz-block/blocks/symptom-quiz.liquid` (schema `default` for `subheading`)

- [ ] **Step 1: Update default subheading string**

In the `{% schema %}` JSON, change `subheading` default from:

`Take our comprehensive assessment to find the right regional allergy drops for your symptoms.`

to:

`Take our clinical assessment to see whether AlleDrops may be appropriate for your allergy symptoms (Tennessee or Texas).`

- [ ] **Step 2: Commit and deploy reminder**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add extensions/quiz-block/blocks/symptom-quiz.liquid
git commit -m "chore(extension): update quiz block default subheading for clinical flow"
```

Run: `shopify app deploy` from app root when ready to publish extension defaults to stores.

---

### Task 7: Documentation sweep in `alle-drops-quiz-app`

**Files:**

- Modify: `alle-drops-quiz-app/README.md`
- Modify: `alle-drops-quiz-app/docs/CHECK_METAFIELDS.md`
- Modify: `alle-drops-quiz-app/docs/app-requirements.md`
- Modify: `alle-drops-quiz-app/docs/IMPLEMENTATION_STATUS.md`
- Modify: `alle-drops-quiz-app/docs/MVP_LAUNCH_CHECKLIST.md`
- Modify: `alle-drops-quiz-app/docs/shopify-app-development-prompt.md`
- Modify: `alle-drops-quiz-app/docs/quiz-questions-schema.md` (scoring / severity sections only—keep question taxonomy if still accurate)

- [ ] **Step 1: README — replace obsolete component list**

Remove references to `QuestionCard` and `RegionSelector`. Document current tree: `StateGate`, `PatientInfoStep`, `QuizPartRenderer`, `ConsentStep`, `ResultsDisplay`, `QuizContainer`.

Replace metafield bullets with:

- `alledrops.state` — `tennessee` | `texas`
- `alledrops.score_bracket` — `0-2` | `3-6` | `7+`
- Note: `quiz_region` / `severity_level` may exist on legacy customers only.

- [ ] **Step 2: CHECK_METAFIELDS.md — concrete GraphQL or Admin UI checks**

Example snippet to include verbatim:

```markdown
## Customer metafields (namespace `alledrops`)

| Key | Type | Values |
|-----|------|--------|
| state | single_line_text_field | tennessee, texas |
| score_bracket | single_line_text_field | 0-2, 3-6, 7+ |
| quiz_score | number_integer | total score |
| symptom_profile_id | single_line_text_field | opaque id |
| quiz_date | date_time | ISO |
| quiz_history | json | array of { profile_id, date, score, score_bracket, state } |
```

- [ ] **Step 3: Run typecheck after doc-only edits**

Run: `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run typecheck`

Expected: exit `0` (docs should not affect; catches accidental `.md` in wrong place).

- [ ] **Step 4: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add README.md docs/
git commit -m "docs: align README and internal docs with clinical quiz and metafields"
```

---

### Task 8: Optional — hide native radios on horizontal scale rows (quiz app CSS)

**Files:**

- Modify: `alle-drops-quiz-app/app/styles/quiz.module.css`
- Optionally modify: `alle-drops-quiz-app/app/components/quiz/QuizPartRenderer.tsx` (only if you need a wrapper class for horizontal options)

- [ ] **Step 1: Add CSS rule (complete block)**

Append to `alle-drops-quiz-app/app/styles/quiz.module.css`:

```css
/* Horizontal likert: hide native radio; label supplies the control */
.questionCard__option input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  pointer-events: none;
}

.questionCard__option:has(input[type="radio"]:focus-visible) {
  outline: 2px solid var(--quiz-accent, #2563eb);
  outline-offset: 2px;
}
```

Adjust `--quiz-accent` if your theme tokens use a different variable already defined in the same file (search file for existing focus/outline patterns and match).

- [ ] **Step 2: Build theme bundle**

Run: `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run build:theme`

Expected: exit `0`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app"
git add app/styles/quiz.module.css
git commit -m "style(quiz): visually hide horizontal radio inputs while keeping focus ring"
```

---

### Task 9: Operations — Google Sheets column headers (not in repo)

**Files:** None in git (Apps Script project)

- [ ] **Step 1: Open your Google Apps Script bound to the quiz spreadsheet**

- [ ] **Step 2: Align Apps Script / sheet row 1 with `api.quiz.submit.tsx`**

In `app/routes/api.quiz.submit.tsx`, the `rowData` array order is fixed as:

`profile_id`, `name`, `email`, `phone`, `dob`, `state`, `score`, `score_bracket`, `date`, `completion_time`, `answers_json`, `personal_history_json`, `family_history_json`

Set row 1 of the spreadsheet to exactly those thirteen headers (or update the Apps Script to map named fields—either way, the script must consume the same JSON `{ "data": [ ... ] }` order that `submitToGoogleSheets` in `app/lib/google-sheets.ts` posts).

- [ ] **Step 3: Submit one real quiz from staging**

Confirm a new row appears with `state` and `score_bracket` columns populated and **no** column shift.

---

## Self-review

**1. Spec coverage:** Template duality (`quiz-results` vs React), customer account metafields, Cloudflare payload mismatch, extension merchant-facing copy, in-repo documentation drift, optional horizontal radio polish, Sheets ops — each has a task.

**2. Placeholder scan:** No `TBD` / `TODO` / vague “add validation” steps; `WORKER_URL` is explicitly labeled as replaceable test input.

**3. Type consistency:** Liquid uses `score_bracket` / `state` with fallbacks to `severity_level` / `quiz_region`. Worker uses same fallback names as `app/routes/app.quiz-results.tsx` loader logic.

**Gap (intentional):** `sections/quiz-results.liquid` + `assets/quiz-results.js` are not fully rewritten for clinical brackets because Task 2 removes them from the symptom quiz page. If another template still references `quiz-results`, grep the theme for `"type": "quiz-results"` and either remove or schedule a dedicated redesign task.

---

## Execution handoff

Plan complete and saved to `alle-drops-quiz-app/docs/superpowers/plans/2026-04-23-quiz-theme-worker-docs-alignment.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

**2. Inline Execution** — Run tasks in this session with checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

Which approach?
