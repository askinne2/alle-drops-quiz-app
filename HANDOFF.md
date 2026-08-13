# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-13 (supersedes the Phase 6 merge entry from earlier the same day)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `main` @ pushed, clean. `origin/main` is current — the 38-commit stale gap is closed.
**Shopify:** **`alledrops-quiz-production-24`** deployed 2026-08-13. **Fly:** unchanged — Phase 6 touched no Fly-served code.

**Resume with:** the theme-repo pull in "Do this first" below, then Phase 7 or Phase 8.

---

## Do this first — the local theme repo can silently delete the live purchase gate

`/Users/andrewskinner/Local Sites/allergist-on-demand` holds `templates/product.regional-drops.json`
**dated 28 Nov 2025**, containing:

```
purchase_prerequisites refs: 0        ← the Phase 6 block is absent
show_dynamic_checkout: true           ← express checkout ON
```

The live theme has the opposite of both. **A `shopify theme push` from that repo would delete the
purchase gate and restore the Shop Pay bypass, with no visible symptom** — the block fails open by
design, so its absence produces no error, no broken layout, nothing. Add to cart simply starts
working again. That is the worst failure mode available here.

**Recommended sequence (not yet done):**

1. `cd` to the theme repo and **commit the 9 modified files first** — `sections/footer-group.json`,
   `sections/header-group.json`, `templates/index.json`, `page.about`, `page.contact`, `page.faq`,
   `page.how-it-works`, `page.quiz-history`, `page.team` (142 insertions). A pull would clobber them.
2. `shopify theme pull --theme 135799767246 --store allergist-on-demand` into that repo.
3. Read the diff — it is the first real measurement of how far live has drifted from the repo.
4. Commit as a live snapshot. Local then equals live, the Phase 6 placement is version-controlled and
   recoverable, and an accidental push degrades from catastrophic to roughly a no-op.

**Related correction:** `CLAUDE.md`, this file's history, and `06-CONTEXT.md` D-03 / threat T-6-19 all
justify the theme-push ban with *"local `settings_data.json` has Klaviyo `disabled: false`, so a push
would re-enable Klaviyo on the PHI quiz page."* **That is no longer true.** The local repo now reads
`klaviyo-email-marketing-sms → disabled: true`; it was fixed in theme commit `9c36e0f` during Phase 4.
The ban is still correct — for the reason above, which is a different and currently larger reason —
but the stated mechanism is stale and should stop being repeated.

---

## Phase 6 — COMPLETE, deployed, approved 2026-08-13

6/6 plans. The honor-system purchase gate is live on both SLIT PDPs; the clinical-review notice is
live on thank-you and order-status.

| requirement | status |
|---|---|
| SHOP-01 metafield definitions + Liquid readability | **Complete** |
| SHOP-02 returning-patient credit at purchase | **Complete** |
| SHOP-03 ATC requires both confirmations | **Complete** |
| SHOP-04 thank-you clinical-review notice | **Complete** |
| SHOP-05 admin copy + refund policy | **Pending — William** |
| SHOP-06 fulfillment verification step | **Pending — AOD adoption** |

Served-bytes evidence, gate behavior, and the full editor checklist are in `06-06-SUMMARY.md`. Gates
at ship: typecheck exit 0, **812 tests / 53 files**, zero new dependencies, no `shopify theme push`,
no `fly deploy`.

**Deliverables waiting on William/AOD** — both drafted, neither actionable by an agent:
`06-SHOP-05-COPY-DRAFT.md` (paste-ready order confirmation body + refund-policy SPEC) and
`06-SHOP-06-FULFILLMENT-PROCESS.md` (pre-ship checklist).

---

## ⚠️ The live product page contradicts the gate it now carries

The `Rich text` section on `regional-drops` — directly beneath the new prerequisites panel — reads:

> "With the advent of regional allergy drops, there is no longer a need for needles or allergy tests
> to receive allergy treatment."

The page now asks the patient to confirm allergy testing is on file, one paragraph under text telling
them testing is unnecessary.

This is Phase 4's D-13 clause. **Phase 4 reassigned it to Phase 8 / TEST-06 on the measured belief
that it renders from `product.description` and therefore no theme change could reach it. That premise
is wrong** — it is a theme-editor Rich text block, editable in the editor, no push required. The
replacement copy is already drafted and waiting on William/counsel in
`.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md`.

Not touched: clinical copy is William's. But the reassignment rested on a false constraint.

---

## Open items, ranked

1. **Theme repo pull** — see "Do this first".
2. **William owes three things:** paste the SHOP-05 order confirmation copy (which also supplies the
   support details `06-04`'s shipped notice already points patients to), write the refund policy —
   **there is none, and no shipping policy either** — and approve the D-13 replacement copy above.
   Also still open from Phase 5.2: the one-line typo correction, and confirming the removed numeric
   score.
3. **LAUNCH-01 — Klaviyo on the PHI quiz page.** Unremediated by choice, deferred four times. New
   this session: Klaviyo also has a **checkout-editor block** (`Klaviyo Opt-in at checkout`) available
   on thank-you and order-status. Not placed — but LAUNCH-01's surface is wider than the single web
   pixel on record. Also unrecorded until now: quiz-answer-shaped **tags** on customer records
   (`complicated regimen`, `prescribed medication`, `frequent doctor visits`, …) written by a
   third-party **Quiz Kit** app, not this one.
4. **`04-19`** — still the one open plan from Phase 4. Human UAT, blocked on the Fly BAA, the GCP
   cutover, and William. Not startable.
5. **`HardcodedRoutes` warning** on `purchase-prerequisites.liquid:91` — theme check wants
   `{{ routes.account_login_url }}` instead of the literal `/account/login`. Works on this
   single-locale store. Changing it means changing `06-UI-SPEC.md` and the contract test together.

---

## Method notes worth keeping

- **The Admin Themes list page is broken on this store** — empty content area, no Themes item in the
  Online Store nav. **Five failed attempts across three sessions.** The theme editor **deep link**
  works fine: `admin.shopify.com/store/allergist-on-demand/themes/135799767246/editor?previewPath=…`.
  The Shopify **CLI** also works (`theme list / duplicate / pull / push / delete`). Do not treat the
  Themes UI as available.
- **Three byte-identical responses for three different products means you measured the password
  page.** The storefront is password-protected and the `storefront_digest` cookie expires. All-zeros
  can read as a clean pass — check byte counts differ before believing a needle count.
- **Only one theme app extension is allowed per app.** `quiz-block` holds it, so the
  `purchase-prerequisites` block lives inside `extensions/quiz-block/`. Consequence:
  `shopify app deploy` ships the purchase gate and the PHI quiz iframe as one version — a rollback of
  one rolls back the other.
- **`gsd-sdk query state.*` handlers corrupt `STATE.md` frontmatter** — eight occurrences, four
  handlers. Snapshot `sed -n '9,15p' .planning/STATE.md` before any such call and diff after. This
  session's STATE edits were made by hand for that reason.
- **Two planning premises were found false this session** (in addition to the D-13 and D-03 ones
  above): ROADMAP **Sequencing Constraint 7** claimed Phase 6 Wave 2 depended on Phase 5.2's bracket
  change — it never did, the gate keys on `quiz_count`, not a bracket. Struck through in `ROADMAP.md`.

---

## Resume context

| | |
|--|--|
| **Branch** | `main`, pushed and current. `thread-phase-6-purchase-prerequisites` is merged and can be deleted. |
| **How to verify** | `npm run typecheck && npm test` → expect **812 tests / 53 files**. |
| **Live check** | Fetch `/products/tennessee-alledrops` from a password-authenticated session, cache-busted; count with `split(needle).length - 1`, never `grep -c`. Expect `Before you order` = 1, `shopify-payment-button` = 0. |
| **Store** | `allergist-on-demand.myshopify.com`. Live theme: Sense `135799767246`. Template `regional-drops`, assigned to TN + TX. Consult is `telehealth-appointment` and structurally ungated. |
| **Deploy** | `shopify app deploy` from `main` (currently `-24`). `fly deploy -a alle-drops-quiz-app` is a separate system, untouched by Phase 6. |
| **Decisions this session** | Analytics segmentation on both metafields **stays ON** (Andrew, superseding the spike's "keep it off"). Phase 6 merged to `main` by an agent under explicit in-session authorization — **that override does not carry forward**. |
| **Next phase** | Phase 7 (Telehealth Intake Path, TELE-01/02) or Phase 8 (Launch Readiness, LAUNCH-01…). Phase 8 contains the live exposures and is older. |

## Git hygiene

- **Always branch before starting work.** `.planning/config.json` sets no `git.branching_strategy`,
  so `/gsd:execute-phase` will not cut it for you, and worktrees fork from whatever is checked out.
- Agents do not merge to `main` by default. Two per-session overrides have now been granted (Phase 5.2
  and Phase 6); neither carries forward.
- Deploy from `main` only, after merge.
