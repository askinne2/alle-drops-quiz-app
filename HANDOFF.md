# Handoff — AlleDrops quiz app (2026-05-09 session 17)

### Status: WS2 COMPLETE — live in production

---

### What just shipped (WS2 — `feature/phase-2-admin-view`, PR #9, merged to main)

Phase 2 admin view — fully built, tested, merged, and deployed to Fly.io:

- **`GET /api/admin/submissions`** — paginated (50/page, cursor-based), filterable by state / bracket / date range / search. Admin-authenticated.
- **`GET /api/admin/submission/:id`** — full submission row for detail modal. Admin-authenticated.
- **`GET /api/admin/assessment/:id/pdf`** — admin-authenticated PDF (different from patient endpoint). Same PDFKit library, different auth.
- **`app/routes/app.quiz-results.tsx`** — replaced Phase 2 placeholder with real data table: date / name / email / state / bracket / score columns, filter bar, 300ms debounced search, row-click detail modal (full PHI + answers JSON), Download PDF via App Bridge `idToken()`.
- **Audit log** on every admin fetch: `[admin] fetched ...` to Fly logs (shop + count, no PHI).
- **12 new tests** all passing. 1 pre-existing `customer-auth.test.ts` failure exists on main before this branch.

**Verified working in production** (screenshot confirms table loaded 7 real submissions from Cloud SQL with filters visible).

---

### Still pending (not WS2)

**Deploy to Shopify extensions — not yet done:**
- [ ] `shopify app deploy` from `alle-drops-quiz-app/` — configurable disclaimer in app block
- [ ] Turn off Test Mode — Shopify admin → Themes → Customize → AlleDrops Quiz block

**Content — awaiting William / counsel:**
- HIGH: Product descriptions (TN/TX rewrite), quiz page disclaimer, `/pages/consult` (404), consultation booking, contact 911 notice, privacy policy (replace andrew@21adsmedia.com), `/pages/our-team` (404), ConsentStep.tsx placeholder
- MEDIUM: Product name dashes, footer stray quote, about page copy, How It Works updates, test-options page, collections page, quiz treatment duration

**Infrastructure / HIPAA (pre-first-patient):**
- Fly.io BAA — sales conversation
- Production cutover to AOD's Google Cloud project (current GCP project is dev under 21adsmedia.com)
- In-house counsel review (parallel, AOD-side)
- NPP draft, Privacy/Security Officer designation, workforce HIPAA training (AOD-side)

---

### Next work candidates

**Phase 2.5 (provider workflow — deferred from WS2):**
- Provider review status: `new → reviewed → contacted → scheduled`
- Provider notes on submissions
- Audit dashboard (who viewed what, when)
- Bulk operations

**Thread A — PDF & Ledger (from aod-mvp-plan.md):**
- Customer Account UI extension refactor — read submissions from Fly API, not metafields (metafields no longer exist)
- The extension currently shows empty state

**Thread B — Iframe embed:**
- Theme App Block → cross-origin iframe (`quiz.allerdrops.com`)
- Custom domain on Fly (`fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`)

---

### Resume context

- **Active branch:** `main` (WS2 merged)
- **Fly app:** `alle-drops-quiz-app` — deployed and healthy
- **Key files added in WS2:**
  - `app/routes/api.admin.submissions.tsx`
  - `app/routes/api.admin.submission.$id.tsx`
  - `app/routes/api.admin.assessment.$id.pdf.tsx`
  - `app/routes/app.quiz-results.tsx` (fully replaced)
  - `app/lib/submissions.ts` — new helpers: `listAdminSubmissions`, `getSubmissionByIdForAdmin`
- **Pre-existing test failure:** `tests/customer-auth.test.ts` — 1 test fails on main, unrelated to WS2
- **Dev test customer:** `askinne2@gmail.com` = GID `gid://shopify/Customer/6822520881358`
- **PR #9:** https://github.com/askinne2/alle-drops-quiz-app/pull/9 (WS2 — merged)

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
