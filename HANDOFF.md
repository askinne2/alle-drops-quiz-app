# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-13 (end of session; supersedes all earlier entries the same day)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `main`, clean and pushed. `origin/main` current — the 38-commit stale gap is closed.
**Shopify:** `alledrops-quiz-production-24` deployed 2026-08-13. **Fly:** unchanged — Phase 6 touched no Fly-served code.

---

## Goal

Ship **Phase 6 — Purchase Prerequisites & Returning Patients**: honor-system purchase confirmations on
the two SLIT product pages, returning-patient credit read from Shopify metafields, and clinical-review
expectations on post-purchase surfaces. **Done.** Success criteria were: the gate is live on both SLIT
PDPs and absent from the consult, express checkout cannot bypass it, and the review notice reaches the
patient after ordering. All met and verified on served bytes.

Next milestone is Phase 7 (Telehealth Intake Path) or Phase 8 (Launch Readiness). Phase 8 holds the
remaining live exposures and is older.

---

## Current progress

**Phase 6 is COMPLETE — 6/6 plans, deployed, approved by Andrew 2026-08-13.**

| requirement | status |
|---|---|
| SHOP-01 metafield definitions + Liquid readability | **Complete** |
| SHOP-02 returning-patient credit at purchase | **Complete** |
| SHOP-03 ATC requires both confirmations | **Complete** |
| SHOP-04 thank-you clinical-review notice | **Complete** |
| SHOP-05 admin copy + refund policy | Pending — **William** |
| SHOP-06 fulfillment verification step | Pending — **AOD adoption** |

- Gates at ship: typecheck exit 0, **812 tests / 53 files**, zero new dependencies, **no
  `shopify theme push`**, no `fly deploy`.
- Live evidence, gate behavior and the editor checklist: `06-06-SUMMARY.md`.
- Drafts waiting on William/AOD, neither agent-actionable: `06-SHOP-05-COPY-DRAFT.md` (paste-ready
  order confirmation body + refund-policy SPEC) and `06-SHOP-06-FULFILLMENT-PROCESS.md`.

**LAUNCH-01 — Klaviyo removed and verified gone** (Andrew, 2026-08-13). Marked `[~]` not `[x]`
because `Apntly:Appointment Booking App` is now the *only* registered pixel and it sits on the
PHI-collecting quiz page. See Next steps #3.

**Theme repo pulled and version-controlled** (`allergist-on-demand` @ `80ad904`, `2dea432`, pushed).
Local now equals live.

**Also this session:** Phase 5.2 merged forward into Phase 6; `origin/main` unstuck after 38 unpushed
commits; four false planning premises corrected (see What didn't work).

---

## What worked

- **Three independent checks before believing Klaviyo was gone** — served HTML, *runtime resource
  requests*, and the Admin pixel registry. Only the runtime check would have caught it while it was
  live; the other two return clean either way.
- **Non-vacuity controls on every measurement.** Counting a needle that *should* be present
  (`fly.dev iframe = 2`, `appointly = 15`) alongside the one that should be absent is what separates
  "verified absent" from "fetch failed."
- **Probing on an unpublished duplicate theme** rather than the live theme (`06-02` Task 3), then
  re-pulling live's `layout/theme.liquid` afterwards to prove it was never touched.
- **Mutation-testing the contract test** before trusting 37 green assertions — injecting a banned
  phrase and swapping the selector scoping each produced the expected failures.
- **Theme editor deep link** works even though the Themes list page does not.
- **Shopify CLI** for everything the broken Admin UI blocks: `theme list / duplicate / pull / push /
  delete`.
- **Editing `STATE.md` by hand** rather than through `gsd-sdk`, given the known frontmatter corruption.

## What didn't work

- **`shopify app generate extension --template theme_app_extension` fails**: *"You have reached the
  limit of extension(s) of type theme per app."* Only **one theme app extension per app** is allowed
  and `quiz-block` holds it. `06-03`'s planned `extensions/purchase-prerequisites/` directory is not
  buildable; the block lives in `extensions/quiz-block/` instead. **Consequence:** `shopify app deploy`
  ships the purchase gate and the PHI quiz iframe as one version — a rollback of one rolls back the other.
- **The Admin Themes list page is broken on this store** — empty content area, no Themes item in the
  Online Store nav. **Five failed attempts across three sessions.** Stop retrying it.
- **The first Phase 6 UAT was vacuous and nearly passed.** All-zeros across three products, three
  **byte-identical 11,565 B** responses — the storefront password page, not the products. Those zeros
  read as "consult absent, express checkout gone." *Three identical byte counts for three different
  products is the tell.* The `storefront_digest` cookie expires; re-enter the store password.
- **An HTML scan cannot detect a Shopify web pixel.** Klaviyo's ran in a sandboxed worker, so
  `document.querySelectorAll('script')` and raw-HTML greps returned clean the whole time it was live.
  That false negative is why LAUNCH-01 stayed open for months. Use
  `performance.getEntriesByType('resource')` grouped by `new URL(u).host`.
- **Four planning premises were found false.** Each had been shaping decisions:
  1. **ROADMAP Sequencing Constraint 7** — claimed Phase 6 Wave 2 depended on Phase 5.2's bracket
     change. It never did; the gate keys on `quiz_count`, not a bracket. Struck through in `ROADMAP.md`.
  2. **D-03 / T-6-19** — justified the theme-push ban with "local `settings_data.json` has Klaviyo
     `disabled: false`." It reads `true`; fixed in theme commit `9c36e0f` during Phase 4. The ban still
     stands, for the different and larger reason in Next steps.
  3. **Phase 4 / TEST-06** — reassigned the D-13 clause to Phase 8 believing it renders from
     `product.description` and is unreachable without a theme push. It is an editable theme-editor
     Rich text block.
  4. **`06-SPIKE-SHOP-01.md`** — recorded the metafield Analytics toggle as OFF. It was ON on both
     definitions. Andrew's decision: it stays ON. Struck through at source.

---

## Next steps

1. **Email William for review** — the largest blocker is now entirely on his side. He owes:
   - Paste the SHOP-05 order confirmation copy. **This is also what makes the already-shipped SHOP-04
     notice true** — it tells patients to use "the support details on your order confirmation email",
     but `Settings → Policies → Contact information` is **Required and unset** and the sender is
     `andrew@21adsmedia.com`.
   - **Write a refund policy — there is none, and no shipping policy either.** SPEC bullets are in
     `06-SHOP-05-COPY-DRAFT.md`. Needs counsel.
   - Approve the D-13 replacement copy (see #2).
   - From Phase 5.2, still open: the one-line typo correction ("there is **no** a place to upload…"),
     and confirming the removed numeric score.
2. **⚠️ The live product page contradicts the gate it now carries.** The `Rich text` section on
   `regional-drops`, directly beneath the new prerequisites panel, reads: *"With the advent of regional
   allergy drops, there is no longer a need for needles or allergy tests to receive allergy
   treatment."* The page asks the patient to confirm testing is on file, one paragraph under text
   saying testing isn't needed. Replacement copy is drafted in
   `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md`. Editable in the theme
   editor — **no theme push required**, contrary to the Phase 4 note. Clinical copy is William's.
3. **Decide on Apntly.** With Klaviyo gone it is the **only** registered pixel and it sits on the
   PHI-collecting quiz page. Live in the runtime trace: `s1.staq-cdn.com`, `booking-api.apntly.com`,
   `d3emjguzbsq9q3.cloudfront.net`, plus a `www.cloudflare.com` call returning visitor IP and geo.
   `CLAUDE.md` rule 4 names Klaviyo but not Apntly. Flagged since 2026-08-12 as "probably intentional
   for Phase 7 booking, never explicitly decided." Needs a keep/remove call and a BAA answer if it stays.
4. **Never `shopify theme push` from `allergist-on-demand`.** The repo now matches live, so a push is
   roughly a no-op *today* — but it drifts again the moment anyone edits in the theme editor, and the
   failure mode is silent: the gate fails open by design, so deleting it produces no error, no broken
   layout. Add to cart simply starts working.
5. **Start Phase 7 or Phase 8.** Phase 8 (Launch Readiness) holds the remaining live exposures and is
   older; Phase 7 (Telehealth Intake Path, TELE-01/02) is clean greenfield with no external blockers.
6. **Unrecorded elsewhere:** quiz-answer-shaped **tags** on customer records (`complicated regimen`,
   `prescribed medication`, `frequent doctor visits`, …) written by a third-party **Quiz Kit** app, not
   this one. Same class as LAUNCH-01, different vendor.
7. **Minor:** `04-19` remains the one open Phase 4 plan (human UAT; blocked on Fly BAA, GCP cutover,
   William). `HardcodedRoutes` warning on `purchase-prerequisites.liquid:91` wants
   `{{ routes.account_login_url }}`; changing it means changing `06-UI-SPEC.md` and the contract test
   together. Also: the PHI quiz page has **no privacy policy link** and the block no longer offers a
   setting for one.

---

## Resume context

| | |
|--|--|
| **Branch** | `main`, pushed and current. `thread-phase-6-purchase-prerequisites` is merged and can be deleted. |
| **How to verify** | `npm run typecheck && npm test` → expect **812 tests / 53 files**. |
| **Live check** | Fetch `/products/tennessee-alledrops` from a password-authenticated session, cache-busted. Count with `split(needle).length - 1`, never `grep -c`. Expect `Before you order` = 1, `shopify-payment-button` = 0. Confirm byte counts differ across pages before trusting any zero. |
| **Key files** | `extensions/quiz-block/blocks/purchase-prerequisites.liquid` · `extensions/quiz-block/assets/purchase-prerequisites.js` · `tests/purchase-prerequisites-block-contract.test.ts` · `.planning/phases/06-purchase-prerequisites/06-06-SUMMARY.md` · `06-SHOP-05-COPY-DRAFT.md` · `06-SHOP-06-FULFILLMENT-PROCESS.md` |
| **Store** | `allergist-on-demand.myshopify.com`. Live theme Sense `135799767246`. Template `regional-drops` → TN + TX. Consult is `telehealth-appointment`, structurally ungated. Storefront is password-protected. |
| **Deploy** | `shopify app deploy` from `main` (currently `-24`). `fly deploy -a alle-drops-quiz-app` is a separate system, untouched by Phase 6. |
| **Blockers / open questions** | William owes copy + a refund policy that does not exist. Apntly keep/remove undecided. Payments are off on the store, so no real order has ever exercised thank-you/order-status. |
| **Decisions that do NOT carry forward** | Analytics segmentation stays ON (supersedes the spike). Phase 5.2 and Phase 6 were merged to `main` by an agent under explicit per-session authorization — **neither override carries forward**. |

## Git hygiene

- **Always branch before starting work.** `.planning/config.json` sets no `git.branching_strategy`, so
  `/gsd:execute-phase` will not cut it for you, and worktrees fork from whatever is checked out.
- Agents do not merge to `main` by default.
- Deploy from `main` only, after merge.
