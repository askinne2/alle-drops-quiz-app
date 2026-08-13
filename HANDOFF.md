# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-13 (merge entry — supersedes both the `main` 2026-08-13 entry and the Phase 6 branch's 2026-08-12 entry)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `thread-phase-6-purchase-prerequisites` — `main` (Phase 5.2) merged in on 2026-08-13
**Fly:** last deploy 2026-08-13 **from `main`**, served `/quiz-bundle-js` **203,686 B**, SHA-256 identical to the committed artifact, `/health` 200. **Nothing from Phase 6 has shipped.**

**Resume with:** Phase 6 Wave 2. **All six plans already exist** (written 2026-08-12) — do NOT run `/gsd:plan-phase 6`, it replans the whole phase and would overwrite the three already-executed plans. Run `/gsd:execute-phase 6`. `06-05` is executable now; `06-03` is blocked on `06-02` Task 3, which needs Andrew.

**Correction, 2026-08-13:** ROADMAP Sequencing Constraint 7 ("Phase 5.2 before Phase 6 Wave 2") rested on a false premise and is now struck through. Phase 6's purchase gate is **not** keyed to the clinical bracket — `06-03` gates on `customer.metafields.alledrops.quiz_count >= 1`, a non-PHI integer, per `DEC-purchase-gating-is-honor-system`. `06-03-PLAN.md` and `06-05-PLAN.md` contain zero occurrences of `bracket`, `threshold`, `score`, `7+`, `9+`, `3-6` or `3-8`; every bracket mention in Phase 6 is a *prohibition* against reading it on a Shopify surface. Wave 2 never depended on 5.2. The merge was still correct — this branch was 29 commits behind `main` — but no replanning was ever needed.

---

## Goal

Ship **Phase 6 — Purchase Prerequisites & Returning Patients**: honor-system purchase confirmations on the two SLIT product pages, returning-patient credit from Shopify metafields, and clinical-review expectations on post-purchase surfaces. Six plans in three waves. Done when a logged-in patient who has completed the quiz sees that credit on the PDP, add-to-cart requires both confirmations, and the 2–3 business day review language reaches the customer after ordering.

Phase 5.2 — which had to land before Wave 2 — is **complete and merged into this branch**.

---

## Current progress

### Phase 5.2 — Clinical Bracket Revision: COMPLETE, shipped 2026-08-13 (now merged here)

The AOD medical director revised the clinical brackets. Inserted, planned, executed and shipped in one day, 5 plans in 3 waves.

| | before | after |
|---|---|---|
| Brackets | `0–2 / 3–6 / 7+` | **`0–2 / 3–8 / 9+`** |
| Recommendation copy | prior wording | William's verbatim text, all three brackets |
| Patient-facing score | `{score} of 60` | **no number at all** |
| DB `score_bracket` CHECK | 3 labels | 5-label union, historical rows never relabelled |

- **Migration 005 is live** on `alledrops_quiz_dev`: `CHECK (score_bracket = ANY (ARRAY['0-2','3-6','3-8','7+','9+']))`. Backup **`1786617655419`** (`ON_DEMAND`/`SUCCESSFUL`) taken and read back first. 48 rows before and after; distribution unchanged.
- **SCORE-04, SCORE-05, SCORE-06 all closed** in `REQUIREMENTS.md`.
- Gates on `main` at ship: typecheck exit 0, **762 tests / 50 files**, zero new dependencies.

### Phase 6 — Wave 1, in flight on this branch

Planned and partly executed **in Cursor**, then picked up in Claude Code. **2 of 6 plans complete**; a third is two-thirds done.

| Plan | Wave | Status |
|---|---|---|
| 06-01 | 1 | ✓ Sense ATC selector contract (D-02) — vendored fixture + contract test |
| 06-04 | 1 | ✓ `order-review-notice` checkout UI extension, dual-target, 9/9 tests |
| **06-02** | 1 | **Tasks 1–2 done, Task 3 open** — see below |
| 06-03 | 2 | not started (needs 06-01, 06-02) — the `purchase-prerequisites` theme app extension |
| 06-05 | 2 | not started (needs 06-02) — SHOP-05 copy draft + SHOP-06 fulfillment checklist |
| 06-06 | 3 | not started (needs 02, 03, 04) — editor placement, deploy, human UAT |

**Plan 06-02 is three human-gate checkpoints.** Tasks 1 and 2 were measured by driving Andrew's logged-in Chrome session (`claude-in-chrome`) against live Shopify Admin, committed in `69721f9`. Full record: `.planning/phases/06-purchase-prerequisites/06-02-SUMMARY.md`.

**Task 1 — D-04 templateSuffix. Cleared, no STOP findings.**

| handle | templateSuffix | gate eligible | product id |
|---|---|---|---|
| `tennessee-alledrops` | `regional-drops` | yes | 7624809840846 |
| `texas-alledrops` | `regional-drops` | yes | 7601816862926 |
| `allergy-consultation` | `telehealth-appointment` | **no** | 7601817157838 |

The consult handle was confirmed from its live Search engine listing, not carried over from CONTEXT. The purchase gate stays off the $99 consult by **template separation** — 06-03 and 06-06 need no runtime exclusion for it.

**Task 2 — SHOP-05 surface inventory. Done, with two findings that change 06-05** (below).

---

## ⚠️ The finding that matters most from Phase 5.2

**The human browser pass rejected a deploy that had 759 passing tests, a clean typecheck, and six independently verified served-bytes markers.**

Removing the `/60` denominator (SCORE-06, as written) made the bare number *less* interpretable, not more — a `30` sitting above a scale whose top band means `9+`. Andrew saw it on the live page; no test could have. The numeric score was then removed entirely.

**Seventh defect on this project found by a human clicking and missed by a fully green suite.** Keep the human browser pass.

**Consequence now load-bearing:** within-zone interpolation is the ONLY signal distinguishing a patient at 9 from one at 60, since both read "High" everywhere else. The number used to carry that. Do not replace interpolation with a fixed per-zone marker position.

---

## ⚠️ Findings that exist ONLY here and in agent memory

### LAUNCH-01 is violated — Klaviyo is live on the PHI quiz page

Verified in the browser on `https://allergist-on-demand.myshopify.com/pages/allergy-quiz` (store password gated). Unchanged since 2026-08-12; Andrew has deferred it three times.

Shopify web pixel `web-pixel-597524686` is a **Klaviyo pixel**: subscribes to `page_viewed` and `product_added_to_cart`, POSTs to `https://a.klaviyo.com/client/events`, builds payloads referencing `email` and `phone`. Klaviyo has no BAA.

**It cannot see clinical content** — answers, score, name and DOB are collected inside the cross-origin iframe on `fly.dev`. The exposure is page-view-plus-identity.

**A DOM scan will NOT find it** — the pixel runs in a sandboxed web worker, so `document.querySelectorAll('script')` returns clean. That false negative is why it stayed open. The check that works:

```js
fetch('/web-pixels/strict/app/web-pixel-<id>@<hash>.js')
  .then(r => r.text()).then(t => t.match(/https?:\/\/[a-z0-9.\-]+/gi))
```

**Fix:** Shopify admin → Settings → Customer events. Andrew's to make; not an agent action.

**Also third-party on that page:** the Appointly booking app (`s1.staq-cdn.com`, `d3emjguzbsq9q3.cloudfront.net`, `booking-api.apntly.com`), plus a `cloudflare.com/cdn-cgi/trace` call returning visitor IP and geo. Probably intentional for Phase 7 booking, never explicitly decided. **Not inspected:** the merchant `shopify-custom-pixel`, and `web-pixel-506659022` (1KB, no external hosts, looks benign).

### Two Phase 6 findings from 2026-08-12 (cross phase boundaries)

**1. This is a development store on a Custom plan — not Basic/Grow.**

`Settings → Plan` reads **"Custom plan · Development store"**, with the banner *"The Change plan option is no longer supported for client transfer stores. To change the plan, transfer the store to your client first."*

Phase 6's CONTEXT, RESEARCH, and ROADMAP all reason from a Basic/Grow plan. They are wrong about the current store. The consequence that matters: **D-09 / D-11 conclude that checkout-step extension targets are "Plus-only, therefore out of scope."** That conclusion may be right for AOD's eventual plan and is definitely not verifiable here — a dev store carries access a paid Basic plan does not. Re-confirm after the LAUNCH-06 transfer rather than treating the inventory as settled. Not a blocker for 06-03 or 06-05.

**2. There is no refund policy, and no shipping policy.**

`Settings → Policies → Written policies`:

| policy | status |
|---|---|
| Return and refund policy | **No policy set** |
| Shipping policy | **No policy set** |
| Terms of service | No policy set |
| Legal notice | No policy set |
| Contact information | **Required**, unset |
| Privacy policy | Automated |

ROADMAP success criterion 4 for Phase 6 says the clinical-review language must appear "in the refund policy". **There is no refund policy to amend.** SHOP-05's refund deliverable is therefore must-include authoring guidance handed to William for a document written from nothing — 06-05 should say that plainly rather than producing prose that reads like an edit. Return and cancellation rules are also unset.

**Also observed, not Phase 6:** `Settings → Notifications` sender email is **`andrew@21adsmedia.com`**. Customer-facing order mail from this store sends from the agency address. Belongs with LAUNCH-06's "off the cross-client billing account" work.

---

## What worked

- **Measuring the before-state before deploying.** Every served-bytes needle was counted on the *previously* deployed bundle first, so 0-before/≥1-after was proven rather than asserted.
- **Independently re-verifying the DDL from the database** rather than accepting the executor's report — `pg_get_constraintdef` via `fly ssh console`, plus `gcloud sql backups describe` for the backup.
- **`fly ssh console -a alle-drops-quiz-app` is the working route to Cloud SQL.** The instance's only authorized network is `216.246.40.114/32` (Fly egress); this laptop is not on it. Write the script into `/app` (not `/tmp`) — Node resolves `pg` from the script's own directory, not cwd.
- **Positive AND negative INSERT probes.** Proving `'9+'` is accepted without also proving junk is rejected would have proven only that something ran.
- **Driving Admin through `claude-in-chrome` + `get_page_text`.** Product `templateSuffix` lives in the right sidebar under **Theme template**; `get_page_text` returns it along with the handle from the Search engine listing, so one page load answers both questions. `find` did *not* locate it — the accessibility tree describes it oddly.
- **Reading the handle off the Search engine listing URL** rather than trusting the documented handle.
- **`git branch <name>` + `git reset --keep`** to move a commit accidentally made on `main` onto a branch without losing uncommitted working-tree edits.

## What didn't work

- **`gcloud` OAuth expired mid-phase** and blocked plan `05.2-04` at its first call. Fix is `gcloud auth login andrew@21adsmedia.com` interactively. **gcloud's active project is `smart-rope-305817`** — pass `--project alledrops-quiz` explicitly on every call; do **not** `gcloud config set project`.
- **Plan-level branch assertions are unsatisfiable under worktree isolation.** Executors legitimately commit on `worktree-agent-<id>`, and `gsd-executor.md:452-476` FATALs on anything else. Branch correctness is an *operator precondition* — be on the right branch before invoking `/gsd:execute-phase`. `.planning/config.json` sets no `git.branching_strategy`, so the orchestrator will not cut the branch for you.
- **Worktrees fork from `main`, not from the current branch.** Every agent in Phase 5.2 found its plan file missing at spawn. The safe fix is `git merge --ff-only <phase-branch>` while staying on the `worktree-agent-*` branch — never check out the phase branch inside a worktree.
- **`gsd-sdk query state.*` handlers corrupt `STATE.md` frontmatter.** Eight occurrences now, across four handlers. The `updated` list they report does **not** bound what they write; one rewrote `completed_plans` for a call that only appends a prose bullet. **Snapshot `sed -n '9,14p' .planning/STATE.md` before every such call and diff after.**
- **`3-6` is a poisoned needle.** `ConsentStep.tsx` ships the clinical phrase `3-6 months` into the bundle, so an absence gate can never pass and a presence gate passes vacuously. Never use it in either direction.
- **Do not "fix" the colour seam.** Scores either side of a zone boundary land ~3px apart (8 at 66.67%, 9 at 67.31%). Measured and accepted by Andrew. Reasoning sits above the calculation in `ResultsDisplay.tsx`.
- **Do not revert the equal-width zones to span-proportional.** With bracket-aligned boundaries that produces a 90%-red bar nobody chose.
- **The Admin Themes page would not render.** `/themes`, `/themes/135799767246/language`, and a nav click all returned correct page chrome with an **empty content area**, and the Online Store nav omitted its usual **Themes** sub-item. No error surfaced. Three attempts, then stopped. This is why one Task 2 row is unmeasured. Retry in a fresh session before assuming it is broken.
- **`chrome-devtools` MCP has no Shopify admin session** — it drives a separate browser. Use `claude-in-chrome`.
- **`mcp__claude-in-chrome__browser_batch` returned "No tab available"** with a valid tabId. Individual `computer` calls work. Don't burn time on it.

---

## Next steps

1. **Execute Wave 2 — the plans already exist, do not replan.** `06-05` (SHOP-05 copy draft + SHOP-06 fulfillment checklist) is unblocked: it depends on `06-02` **Task 2's** surface inventory, which is complete. It **must incorporate the no-refund-policy finding above** — that changes the deliverable from an amendment to authoring guidance. `06-03` (the `purchase-prerequisites` theme app extension) is blocked on Task 3 below.
2. **`06-02` Task 3 is the real Wave 2 blocker** — the SHOP-01 Liquid render measurement. It proves whether Liquid actually renders `customer.metafields.alledrops.quiz_count` for a logged-in customer, which is the single assumption `06-03`'s whole design rests on. It needs two things, the second harder:
   - a temporary Custom Liquid probe that outputs `customer.metafields.alledrops.quiz_count`, and
   - **a logged-in customer session** for one of the 4 customers who have that metafield. Shopify has no customer impersonation and login is an emailed code, so this needs a test customer whose inbox Andrew controls. An agent cannot do this half.

   Options: **A —** duplicate the Sense theme, put the probe on the *duplicate*, fetch with `?preview_theme_id=` while logged in as that customer, delete the duplicate (never touches live). **B —** the plan's method: probe on the live theme, remove after (faster, mutates the live clinical storefront). **C —** Andrew runs it solo and pastes the counts; an agent writes the SUMMARY.

   Count with `split(needle).length - 1`, never `grep -c`. Confirm "Filter or group data in Analytics" is still **OFF** on both definitions. No PHI in the SUMMARY.
3. **Then `06-06`:** theme-editor placement on `regional-drops` only, "Show dynamic checkout buttons" OFF, checkout editor placement, `shopify app deploy`, human UAT. `autonomous: false` — needs Andrew throughout.
4. **Owed to William (Phase 5.2 leftovers, not blocking Phase 6):**
   - Send the one-line correction. Andrew's 2026-08-13 email says *"there is **no** a place to upload allergy testing results at Step 3"* — a typo that reads as the opposite of the truth. He also has the review link (`/quiz-embed?test=1`).
   - Confirm the removed score. His email said patients *"will still receive a number, and then fall on the scale"*. Andrew read it as "no number displayed anywhere, just the scale" and shipped that. Both readings are recorded verbatim in `ResultsDisplay.tsx`. Patient-facing clinical presentation owned by the medical director — one line closes it.
5. **Optional cleanup:** `quizResults__scoreCircle`, `quizResults__scoreNumber` and `scaleBar__value` are now dead CSS in `app/styles/quiz.module.css`. LAUNCH-01 (Klaviyo) also remains Andrew's call, deferred three times.

---

## Resume context

| | |
|--|--|
| **Branch** | `thread-phase-6-purchase-prerequisites`, with `main` merged in 2026-08-13. Not pushed as a PR yet. `main` itself is **38 commits ahead of `origin/main`** — unpushed. |
| **How to verify** | `npm run typecheck && npm test`. Expect Phase 5.2's **762 tests / 50 files** plus the two Phase 6 contract tests (`tests/sense-atc-selector-contract.test.ts`, `tests/order-review-notice-extension-contract.test.ts`). Deployed check: fetch `https://alle-drops-quiz-app.fly.dev/quiz-bundle-js` with a cache-buster and count with `split(needle).length - 1`, never `grep -c`. |
| **Key files — Phase 6** | `.planning/phases/06-purchase-prerequisites/06-02-SUMMARY.md` (the live checkpoint) · `06-02-PLAN.md` (Task 3 method) · `06-CONTEXT.md` (D-01…D-11) · `06-SPIKE-SHOP-01.md` · `extensions/order-review-notice/` · `tests/sense-atc-selector-contract.test.ts` |
| **Key files — brackets** | `app/lib/quiz/scoring.ts` (SCORE_BRACKETS) · `app/components/quiz/ResultsDisplay.tsx` (the reasoning comments are load-bearing) · `migrations/005_widen_score_bracket_check.sql` · `.planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md` (the clinical source of truth) · `.planning/ROADMAP.md` Sequencing Constraint 7 |
| **Store** | `allergist-on-demand.myshopify.com`, admin at `admin.shopify.com/store/allergist-on-demand`. Live theme: Sense, id `135799767246`. |
| **Deploy** | Nothing on this branch deploys until merged. `fly deploy -a alle-drops-quiz-app` from `main` only; `shopify app deploy` is a separate system and 06-06 owns it. Fly prints a "not listening on the expected address" warning every deploy — **false alarm**, health returns 200. |
| **Blockers** | `06-02` Task 3 needs a customer login Andrew controls (Next steps #2). `04-19` remains the one open plan from Phase 4 — human UAT, blocked on the Fly BAA, GCP cutover, and William. LAUNCH-01 live and unremediated by choice. |

## Git hygiene

- **Always branch before starting work.** `.planning/config.json` sets no `git.branching_strategy`, so `/gsd:execute-phase` will not cut it for you, and worktrees fork from whatever is checked out.
- Phase 6 work goes on `thread-phase-6-purchase-prerequisites`. Andrew reviews and merges; agents do not.
- Phase 5.2 was merged and deployed by an agent under Andrew's explicit in-session authorization, overriding CLAUDE.md's default "agents do not merge to main". That override is per-session and does not carry forward.
- Deploy from `main` only, after merge.
