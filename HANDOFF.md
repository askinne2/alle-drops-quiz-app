# Handoff — AlleDrops quiz app (2026-05-09 session 16)

### Status: WS1 COMPLETE — ready to start WS2

---

### What just shipped (WS1 — `fix/phi-metafield-cleanup`, PR #8)

PHI metafield cleanup — fully executed and verified on production:

- **58 PHI values deleted** across 6 customers (`alledrops` + `klaviyo` namespaces)
- **18 definitions dropped** — fields cannot be re-populated
- **`alledrops.last_completed_at` + `alledrops.quiz_count` preserved** on every customer
- **`npx tsx scripts/phi-cleanup-verify.ts` exits 0** — store is clean

Namespaces cleaned:
- `alledrops` — 6 PHI definitions: `quiz_score`, `quiz_region`, `quiz_date`, `severity_level`, `quiz_history`, `symptom_profile_id`
- `klaviyo` — 12 definitions from legacy QuizKit: question/answer JSON, `lastName`, `QuizCompletionDate`, `resultName`, `resultPageUrl`, etc.

Scripts live in `scripts/` and are safe to re-run for future audits (`phi-cleanup-verify.ts`).

---

### Next: WS2 — Phase 2 admin view

**Branch to create:** `feature/phase-2-admin-view` off `main`

**What to build:**

1. **`GET /api/admin/submissions`** — paginated list (50/page), filters: state/bracket/date/search, auth via `authenticate.admin(request)`. Returns: id, symptom_profile_id, patient_name, patient_email, patient_state, score_bracket, quiz_score, created_at, customer_id_shopify.

2. **`GET /api/admin/submission/:id`** — full row including answers_json, history, consent record.

3. **`GET /api/admin/assessment/:id/pdf`** — admin-authenticated PDF (different auth from patient endpoint `/api/me/assessment/:id/pdf`).

4. **Refactor `app/routes/app.quiz-results.tsx`** — replace placeholder with Polaris table: columns for date/name/email/state/bracket/score, filter controls (state dropdown, bracket dropdown, date range, search), click row → modal with full detail + "Download PDF" button.

5. **Audit log every fetch** — `[admin] fetched submission(s)` with actor GID + count. Goes to Fly logs.

**Auth boundary:** admin endpoints use `authenticate.admin(request)` — look at other `app/routes/app.*` routes for the pattern. NOT the Customer Account session auth.

**Full spec:** `~/Documents/Claude/Projects/AoD/claude-code-prompt-phi-cleanup-and-phase-2.md` (WORKSTREAM 2 section)

**Out of scope for WS2:** provider review workflow, notes, real-time notifications, audit dashboards, bulk ops.

---

### Still pending (non-WS2)

**Deploy from session 14 — not yet pushed to Shopify:**
- [ ] `shopify app deploy` from `alle-drops-quiz-app/` — configurable disclaimer in app block
- [ ] Turn off Test Mode — Shopify admin → Themes → Customize → AlleDrops Quiz block

**Content — awaiting William / counsel:**
- HIGH: Product descriptions (TN/TX rewrite), quiz page disclaimer, `/pages/consult` (404), consultation booking, contact 911 notice, privacy policy (replace andrew@21adsmedia.com), `/pages/our-team` (404), ConsentStep.tsx placeholder
- MEDIUM: Product name dashes, footer stray quote, about page copy, How It Works updates, test-options page, collections page, quiz treatment duration

---

### Resume context

- **Active branch after merge:** `main`
- **Start WS2 by:** `git checkout main && git pull && git checkout -b feature/phase-2-admin-view`
- **Key files for WS2:**
  - `app/routes/app.quiz-results.tsx` — Phase 2 placeholder to replace
  - `app/lib/submissions.ts` — existing DB helpers to reuse/extend
  - `app/lib/db.ts` — pg pool
  - `app/shopify.server.ts` — `authenticate.admin` lives here
  - Any `app/routes/app.*` route — auth pattern to copy
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Dev test customer:** `askinne2@gmail.com` = GID `gid://shopify/Customer/6822520881358`
- **PR #8:** https://github.com/askinne2/alle-drops-quiz-app/pull/8 (WS1 — merge this first)

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
