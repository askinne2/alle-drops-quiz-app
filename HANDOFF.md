# Handoff — AlleDrops quiz + storefront (WIP)

### Goal

Ship a reliable end-to-end clinical quiz (TN/TX): submissions persist (Shopify metafields + **Google Sheets**), theme/embed UX is polished, post-quiz routes (**test options**, consult) exist on the store, extensions deploy from Shopify CLI, and clinical copy matches **William’s PDF** (source of truth). Work is **not complete**.

### Current progress

- **Clinical quiz flow** in `alle-drops-quiz-app`: state gate, parts, scoring brackets (`0-2` / `3-6` / `7+`), consent, API `/api/quiz/submit`, metafields `state` + `score_bracket`, admin quiz results + quiz-history extension UI with legacy fallbacks.
- **Theme `allergist-on-demand`**: symptom quiz template uses app block only; `quiz-history` / `main-account` / Cloudflare worker aligned to new metafields; commits pushed to `main`.
- **Fly.io**: `fly deploy` has been run successfully; monitor for “not listening on `0.0.0.0:3000`” warnings during rollout.
- **Ask-mode findings** (not all fixed in code): `/pages/test-options` is a **Shopify page** expected by the app, not Fly; nav buttons missing base `quizNavigation__button` class; results grid still `1fr 1fr` at ≥990px with only one column of content.

### What worked

- `npm run test` / `npm run typecheck` / `npm run build:theme` as quick gates in `alle-drops-quiz-app`.
- `shopify.app.toml` + `aod-dev` for local app dev; theme block loads bundle from app URL.
- Bumping worker + Liquid fallbacks so legacy `quiz_region` / `severity_level` still display during migration.

### What didn’t work / issues

- **Google Sheets**: still **not working correctly** end-to-end (verify `GOOGLE_SHEETS_WEB_APP_URL`, Apps Script handler, row header order vs `rowData` in `app/routes/api.quiz.submit.tsx`, CORS, and Script execution logs).
- **`shopify app deploy`**: fails with **quiz-history** validation — `api_version = "2025-01"` is rejected. Shopify requires Checkout UI–related versions from: `2025-07`, `2025-10`, `2026-01`, `2026-04`, `2026-07`, `unstable`, or `internal`. Fix in `extensions/quiz-history/shopify.extension.toml` line 1 (e.g. set to `2026-04`), then redeploy.
- **`shopify app dev`**: terminal showed **Incorrect store password** — dev store credentials / login, not code.
- **Fly** (same terminal log): deployment warning that app may not be listening on **`0.0.0.0:3000`** — confirm production `HOST`/bind and health checks if traffic flakes.

### Next steps

- [ ] **Sheets**: Trace one failing submission (app logs + Apps Script Executions + sheet row). Confirm header row matches: `profile_id`, `name`, `email`, `phone`, `dob`, `state`, `score`, `score_bracket`, `date`, `completion_time`, `answers_json`, `personal_history_json`, `family_history_json`.
- [ ] **Shopify deploy**: Update `extensions/quiz-history/shopify.extension.toml` `api_version` to an allowed value; run `shopify app deploy` again; resolve `quiz-block` RemoteAsset warning if Shopify blocks later (`asset_url` vs raw `app_url` for CSS).
- [ ] **Test options page**: In Shopify admin (or theme git), create **Online Store → Page** with handle **`test-options`** (and **`consult`** if used). Add real copy/links (telehealth, allergy testing). Alternatively change `window.location.assign` targets in `app/components/quiz/QuizContainer.tsx` to final URLs.
- [ ] **William’s PDF**: Re-read the **actual PDF** William sent; reconcile question text, thresholds, outcomes, and legal/disclaimer language with `app/lib/quiz/questions.ts`, `ResultsDisplay.tsx`, and consent copy.
- [ ] **UX follow-ups** (from prior analysis): Compose `quizNavigation__button` + prev/next classes in `QuizContainer.tsx`; set `.quizResults__mainGrid` to single column at `990px` in `app/styles/quiz.module.css`.
- [ ] **Dev auth**: Fix dev store password / CLI session so `shopify app dev` works without blocking.

### Resume context

- **Branch:** `main` on `alle-drops-quiz-app` and `allergist-on-demand` (recently pushed).
- **How to verify:** `cd "/Users/andrewskinner/Local Sites/alle-drops-quiz-app" && npm run test && npm run typecheck`; `shopify app deploy` after TOML fix; hit `https://alle-drops-quiz-app.fly.dev/health` (or live quiz URL) after Fly deploy.
- **Key files:**
  - `extensions/quiz-history/shopify.extension.toml` — **deploy blocker** (`api_version`).
  - `app/routes/api.quiz.submit.tsx` — Sheets `rowData` + submit flow.
  - `app/lib/google-sheets.ts` — POST body to Apps Script.
  - `app/components/quiz/QuizContainer.tsx` — `/pages/test-options`, `/pages/consult`, test mode.
  - `app/components/quiz/ResultsDisplay.tsx` — outcome copy.
  - `app/lib/quiz/questions.ts` — PDF alignment.
- **Terminal reference (deploy failure):** `/Users/andrewskinner/.cursor/projects/Users-andrewskinner-Local-Sites-allergist-on-demand/terminals/1.txt` — `shopify app deploy` error excerpt: *quiz-history — api_version "2025-01" is not a valid API version…*
- **Blockers / open questions:** William PDF path not in repo—attach or path in next session. Confirm whether Cloudflare worker is still used for any storefront `apiEndpoint` override.

---

**Pickup:** `@HANDOFF.md` in `alle-drops-quiz-app` and say **continue from the handoff.** Commit this file so other machines/agents see the same context.
