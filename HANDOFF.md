# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-13 (supersedes the Phase 6 merge entry from earlier the same day)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `main` @ pushed, clean. `origin/main` is current — the 38-commit stale gap is closed.
**Shopify:** **`alledrops-quiz-production-24`** deployed 2026-08-13. **Fly:** unchanged — Phase 6 touched no Fly-served code.

**Resume with:** Phase 7 or Phase 8. The theme-repo pull is **done** — see below.

---

## DONE 2026-08-13 — theme repo pulled and pushed (kept for the reasoning)

**The hazard, now closed.** Until 2026-08-13, `/Users/andrewskinner/Local Sites/allergist-on-demand`
held `templates/product.regional-drops.json` **dated 28 Nov 2025**, containing:

```
purchase_prerequisites refs: 0        ← the Phase 6 block is absent
show_dynamic_checkout: true           ← express checkout ON
```

The live theme had the opposite of both. **A `shopify theme push` from that repo would have deleted
the purchase gate and restored the Shop Pay bypass, with no visible symptom** — the block fails open
by design, so its absence produces no error, no broken layout, nothing. Add to cart simply starts
working again. That is the worst failure mode available here, and it is why this was done first.

**Completed 2026-08-13.** Theme repo commits `80ad904` (pre-pull snapshot of 9 uncommitted files) and
`2dea432` (live pull), pushed to `origin/main`. Only **two** files had drifted, because those 9
uncommitted files turned out to be live content from a prior partial pull. The pull added the
`purchase_prerequisites` block to `block_order` between `quantity_selector` and `buy_buttons`, flipped
`show_dynamic_checkout` to `false`, **removed a stale Quiz Kit "Your match" badge block** the local
repo carried on the SLIT PDP but live does not, and dropped `privacy_policy_url` from
`page.quiz.json` (the key no longer exists in the block schema; it was an empty string, so nothing was
ever linked — but the PHI quiz page has no privacy policy link and no setting to add one).

Original sequence, for the record:

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

1. **William owes three things:** paste the SHOP-05 order confirmation copy (which also supplies the
   support details `06-04`'s shipped notice already points patients to), write the refund policy —
   **there is none, and no shipping policy either** — and approve the D-13 replacement copy above.
   Also still open from Phase 5.2: the one-line typo correction, and confirming the removed numeric
   score.
2. **LAUNCH-01 — Klaviyo is GONE, Apntly is now the last tracker standing.** Andrew removed Klaviyo
   on 2026-08-13. Verified three ways: served HTML (`klaviyo` = 0 with live controls non-zero),
   **runtime resource requests (0 Klaviyo hosts across 254 on the PHI quiz page)**, and Admin →
   Customer events (pixel `web-pixel-597524686` gone, along with the previously-uninspected
   `shopify-custom-pixel` and `web-pixel-506659022`).

   **Use the runtime check, not an HTML scan.** The Klaviyo pixel ran in a sandboxed web worker, so
   `document.querySelectorAll('script')` and raw-HTML greps returned clean the entire time it was
   live. That false negative is why this stayed open for months. What works:
   `performance.getEntriesByType('resource')` → group by `new URL(u).host`.

   **Open:** Customer events now lists exactly one pixel — **`Apntly:Appointment Booking App`** — and
   it is registered on the PHI-collecting quiz page, with `s1.staq-cdn.com`,
   `booking-api.apntly.com`, `d3emjguzbsq9q3.cloudfront.net` and a `www.cloudflare.com` IP/geo call
   all live in the runtime trace. `CLAUDE.md` rule 4 names Klaviyo but not Apntly. Flagged since
   2026-08-12 as "probably intentional for Phase 7 booking, never explicitly decided" — it now needs
   an explicit keep/remove decision and a BAA answer if it stays.

   Also still unrecorded anywhere but here: quiz-answer-shaped **tags** on customer records
   (`complicated regimen`, `prescribed medication`, `frequent doctor visits`, …) written by a
   third-party **Quiz Kit** app, not this one. The theme pull also removed a stale Quiz Kit "Your
   match" badge block from the local SLIT product template.
3. **`04-19`** — still the one open plan from Phase 4. Human UAT, blocked on the Fly BAA, the GCP
   cutover, and William. Not startable.
4. **`HardcodedRoutes` warning** on `purchase-prerequisites.liquid:91` — theme check wants
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
