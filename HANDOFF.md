# Handoff — AlleDrops quiz app (2026-05-09 session 18)

### Status: Thread A COMPLETE — customer ledger email-fallback merged to main

---

### What just shipped (session 18 — `fix-customer-ledger`, PR #10, merged to main)

Fixed the Customer Account UI extension showing empty state:

- **Root cause:** Submissions created before Protected Customer Data scope was approved have `customer_id_shopify = NULL`. The `/api/me/assessments` endpoint only queried by customer GID, so those rows never matched.
- **Fix — `app/routes/api.me.assessments.tsx`:** When GID query returns empty, the route now fetches the customer's email from Shopify Admin API (using `SHOPIFY_ADMIN_ACCESS_TOKEN` env var), queries by email, calls `backfillCustomerIdByEmail` to stamp the GID on matched rows, then returns results. Subsequent loads use the fast GID path. Degrades gracefully if Admin API env vars are absent.
- **Also fixed — `tests/customer-auth.test.ts`:** Pre-existing test failure caused by `SHOPIFY_API_SECRET` not being set before the env guard check. Added `process.env.SHOPIFY_API_SECRET = 'test-secret'` to `beforeEach`.
- **3 new tests** in `assessments-ledger.test.ts`: email fallback + backfill, no Admin API call when GID hits, graceful empty when env vars absent.
- **44/44 tests passing** on main. Clean typecheck.

**Extensions were deployed** by Andrew at the start of this session (`shopify app deploy` run before work began).

---

### Still pending

**Deploy to Shopify extensions:**
- [ ] Turn off Test Mode — Shopify admin → Themes → Customize → AlleDrops Quiz block (may still be pending)

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

**Thread B — Iframe embed:**
- Theme App Block → cross-origin iframe (`quiz.allerdrops.com`)
- Custom domain on Fly (`fly certs create quiz.allerdrops.com -a alle-drops-quiz-app`)

**Phase 2.5 (provider workflow — deferred from WS2):**
- Provider review status: `new → reviewed → contacted → scheduled`
- Provider notes on submissions
- Audit dashboard (who viewed what, when)
- Bulk operations

---

### Resume context

- **Active branch:** `main` (PR #10 merged)
- **Fly app:** `alle-drops-quiz-app` — deployed and healthy
- **How to verify:** `npm test` — 44 tests pass; `npm run typecheck` — clean
- **Key files changed in session 18:**
  - `app/routes/api.me.assessments.tsx` — email fallback + backfill logic
  - `tests/assessments-ledger.test.ts` — 3 new email-fallback tests + fetch mock infrastructure
  - `tests/customer-auth.test.ts` — SHOPIFY_API_SECRET env fix in beforeEach
- **Dev test customer:** `askinne2@gmail.com` = GID `gid://shopify/Customer/6822520881358`
- **PR #10:** https://github.com/askinne2/alle-drops-quiz-app/pull/10 (merged)

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
