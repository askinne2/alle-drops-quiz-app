# Handoff — AlleDrops quiz app (2026-05-09 session 16)

### Goal

WS1 (PHI metafield cleanup) branch built and committed. Scripts ready to run against production. WS2 (Phase 2 admin view) deferred until WS1 is merged and verified.

---

### Current branch state

- **`main`** — clean; all sessions 1–15 committed (commit `440dcb4`)
- **`fix/phi-metafield-cleanup`** — WS1 scripts committed (commit `4516d5f`), ready for PR + execution

---

### What's built in WS1 (`fix/phi-metafield-cleanup`)

Five-phase PHI metafield cleanup runbook. All scripts in `scripts/`, shared lib in `scripts/lib/shopify-admin.ts`. 14/14 tests pass, typecheck clean.

| Phase | Script | What it does |
|---|---|---|
| 1.A | `phi-cleanup-inventory.ts` | Read-only scan → JSON + MD report |
| 1.B | `phi-cleanup-backup.ts` | Gzipped backup + SHA256 before delete |
| 1.C | `phi-cleanup-delete.ts` | Delete values; `--customer` flag for dev-first run |
| 1.D | `phi-cleanup-definitions.ts` | Drop definitions to prevent re-population |
| 1.E | `phi-cleanup-verify.ts` | Confirm clean; exit 1 if anything remains |

Keep set (never deleted): `alledrops.last_completed_at`, `alledrops.quiz_count`

**To run Phase 1.A (safe, read-only):**
```bash
export SHOPIFY_ADMIN_ACCESS_TOKEN=<token>
npx tsx scripts/phi-cleanup-inventory.ts
```
Then review `scripts/output/phi-inventory-summary-*.md` before proceeding to 1.B.

Full runbook: `scripts/README.md`

---

### WS1 execution checklist (Andrew runs these)

- [ ] Get `SHOPIFY_ADMIN_ACCESS_TOKEN` from Fly secrets / password manager
- [ ] **Phase 1.A** — run inventory, review MD summary
- [ ] **Phase 1.B** — run backup, store `.gz` securely (password manager attachment)
- [ ] **Phase 1.C (dev first)** — run with `--customer gid://shopify/Customer/6822520881358`, verify `askinne2@gmail.com` in Shopify admin shows only `last_completed_at` + `quiz_count`
- [ ] **Phase 1.C (all)** — confirm with Claude, then run without `--customer`
- [ ] **Phase 1.D** — drop definitions
- [ ] **Phase 1.E** — verify exits 0
- [ ] Open PR for `fix/phi-metafield-cleanup`, include output file paths in description (not contents)
- [ ] Merge to main after Andrew reviews

**Do not start WS2 until WS1 is merged and Phase 1.E exits 0.**

---

### WS2 — Phase 2 admin view (NOT STARTED — waiting on WS1 merge)

Branch to create: `feature/phase-2-admin-view`

Scope:
- New endpoints: `GET /api/admin/submissions` + `GET /api/admin/submission/:id` + `GET /api/admin/assessment/:id/pdf`
- Refactor `app/routes/app.quiz-results.tsx` from placeholder → Polaris table with filters, row modal, PDF download
- Auth via `authenticate.admin(request)` (Shopify Admin session, not Customer Account session)
- Audit log every fetch with actor GID + count

Full spec in `~/Documents/Claude/Projects/AoD/claude-code-prompt-phi-cleanup-and-phase-2.md` (WORKSTREAM 2 section)

---

### Still pending from session 14 (not yet deployed to Shopify)

- [ ] **`shopify app deploy`** from `alle-drops-quiz-app/` — pushes updated app block extension (configurable disclaimer)
- [ ] **Turn off Test Mode** — Shopify admin → Themes → Customize → AlleDrops Quiz block → uncheck "Enable Test Mode" → Save

---

### Carry-over content items (awaiting William / counsel)

HIGH blockers before launch:
- [ ] Product descriptions (TN + TX) — full rewrite, awaiting William
- [ ] Quiz page medical disclaimer — awaiting William + counsel
- [ ] `/pages/consult` — still 404, awaiting William for consultation format
- [ ] Consultation booking mechanism — "Schedule" button has no action
- [ ] Contact page — add 911 notice above the form
- [ ] Privacy policy — replace `andrew@21adsmedia.com`, awaiting HIPAA NPP
- [ ] `/pages/our-team` — 404, decide: restore or clean nav references
- [ ] `app/components/quiz/ConsentStep.tsx` — CONTENT-1 placeholder awaiting William

MEDIUM:
- [ ] Product name dashes — remove in Shopify admin
- [ ] Footer FDA notice — stray closing `"` quote, fix in theme footer
- [ ] About page copy issues (thousands of patients, personalized regional formula)
- [ ] How It Works — add `/pages/test-options` link + $99 fee in Step 3
- [ ] Collections page — hide Allergy Consultation from `/collections/all`
- [ ] Quiz "What are AlleDrops" — add treatment duration (3–6 months / 2–3 years)

Carry-over:
- [ ] Remove duplicate quiz-history block from profile page customizer
- [ ] Test Download PDF E2E as logged-in patient
- [ ] Theme repo cleanup — delete `cloudflare-worker/` and `google-apps-script/` from `~/Local Sites/allergist-on-demand/`

---

### Resume context

- **Active branch:** `fix/phi-metafield-cleanup`
- **Next code action:** open PR for WS1, then run the scripts phase by phase
- **WS2 start trigger:** WS1 merged + Phase 1.E exits 0
- **How to verify quiz:** `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` — loads in iframe, correct brand colors, scroll-to-top on navigation
- **Deploy sequence:**
  - Server-side route changes only → `fly deploy -a alle-drops-quiz-app`
  - Quiz UI/CSS changes → `npm run build:theme` → `fly deploy -a alle-drops-quiz-app`
  - App block extension changes → `shopify app deploy` (from `alle-drops-quiz-app/`)
  - Theme section/template changes → `shopify theme push` (from `allergist-on-demand/`)
- **Key files:**
  - `scripts/README.md` — WS1 runbook
  - `scripts/lib/shopify-admin.ts` — shared GraphQL client + categorize()
  - `app/routes/app.quiz-results.tsx` — Phase 2 placeholder (WS2 target)
  - `app/routes/quiz-embed.tsx` — embed page HTML
  - `app/entry.theme.tsx` — dual-mode bundle entry
  - `extensions/quiz-block/blocks/symptom-quiz.liquid` — app block; needs `shopify app deploy`
  - `docs/STOREFRONT_CONTENT_AUDIT.md` — full storefront audit
- **Fly app:** `alle-drops-quiz-app`. Logs: `fly logs -a alle-drops-quiz-app`
- **Shopify app:** "AlleDrops Quiz Production" (`client_id = "1af0c030f06eea4b8b46d3c006f431d3"`)
- **Dev test customer:** `askinne2@gmail.com` = GID `gid://shopify/Customer/6822520881358`
- **CSS variables in embed page:**
  - `--color-foreground: 46, 42, 57` | `--color-background: 229, 244, 237` | `--color-button: 44, 62, 63`
  - `--color-button-text: 253, 251, 247` | `--color-link: 44, 62, 63`
  - `--font-body-family / --font-heading-family: Inter, sans-serif`
  - `--gradient-background: linear-gradient(180deg, #e5f4ed, #FDFBF7 100%)`

---

**Pickup:** `@HANDOFF.md` and say "continue from the handoff."
