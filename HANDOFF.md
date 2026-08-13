# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-13 (supersedes the 2026-08-12 entry written before Phase 6 execution began)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Branch:** `main` @ `3bcff8d` — clean, Phase 5.2 merged and deployed
**Fly:** deployed 2026-08-13, served `/quiz-bundle-js` **203,686 B**, SHA-256 identical to the committed artifact. `/health` 200.

**Resume with:** Phase 6 Wave 2 — it is unblocked as of today. Its work lives on a **different branch**, `thread-phase-6-purchase-prerequisites`, which carries its own richer HANDOFF at commit `3f501fe`. Read that one too before touching Phase 6.

---

## Goal

Ship **Phase 6 — Purchase Prerequisites & Returning Patients**: honor-system purchase confirmations on the two SLIT product pages, returning-patient credit from Shopify metafields, and clinical-review expectations on post-purchase surfaces. Six plans in three waves. Wave 1 is two-thirds done; Wave 2 is now unblocked.

Phase 5.2 — which had to land first — is **complete**.

---

## Current progress

### Phase 5.2 — Clinical Bracket Revision: COMPLETE, shipped 2026-08-13

The AOD medical director revised the clinical brackets. This was inserted, planned, executed and shipped in one day, 5 plans in 3 waves.

| | before | after |
|---|---|---|
| Brackets | `0–2 / 3–6 / 7+` | **`0–2 / 3–8 / 9+`** |
| Recommendation copy | prior wording | William's verbatim text, all three brackets |
| Patient-facing score | `{score} of 60` | **no number at all** |
| DB `score_bracket` CHECK | 3 labels | 5-label union, historical rows never relabelled |

- **Migration 005 is live** on `alledrops_quiz_dev`: `CHECK (score_bracket = ANY (ARRAY['0-2','3-6','3-8','7+','9+']))`. Backup **`1786617655419`** (`ON_DEMAND`/`SUCCESSFUL`) taken and read back first. 48 rows before and after; distribution unchanged.
- **SCORE-04, SCORE-05, SCORE-06 all closed** in `REQUIREMENTS.md`.
- Gates: typecheck exit 0, **762 tests / 50 files**, zero new dependencies.

### Phase 6 — Wave 1, in flight on another branch

`thread-phase-6-purchase-prerequisites` @ `3f501fe`. **2 of 6 plans complete** (`06-01`, `06-04`); `06-02` has Tasks 1–2 done and Task 3 open. Nothing from Phase 6 is deployed.

---

## What worked

- **Measuring the before-state before deploying.** Every served-bytes needle was counted on the *previously* deployed bundle first, so 0-before/≥1-after was proven rather than asserted. This is what makes the verification non-vacuous, and it caught nothing only because the change was correct.
- **Independently re-verifying the DDL from the database** rather than accepting the executor's report — `pg_get_constraintdef` via `fly ssh console`, plus `gcloud sql backups describe` for the backup.
- **`fly ssh console -a alle-drops-quiz-app` is the working route to Cloud SQL.** The instance's only authorized network is `216.246.40.114/32` (Fly egress); this laptop is not on it. Write the script into `/app` (not `/tmp`) — Node resolves `pg` from the script's own directory, not cwd.
- **Positive AND negative INSERT probes.** Proving `'9+'` is accepted without also proving junk is rejected would have proven only that something ran.
- **Giving executors the environment facts up front** (gcloud's active project, the ownership of `submissions`, the Fly route) rather than letting each rediscover them.

## What didn't work

- **`gcloud` OAuth expired mid-phase** and blocked plan `05.2-04` at its first call. Fix is `gcloud auth login andrew@21adsmedia.com` interactively. **gcloud's active project is `smart-rope-305817`** — pass `--project alledrops-quiz` explicitly on every call; do **not** `gcloud config set project`.
- **Plan-level branch assertions are unsatisfiable under worktree isolation.** Executors legitimately commit on `worktree-agent-<id>`, and `gsd-executor.md:452-476` FATALs on anything else. Branch correctness is an *operator precondition* — be on the right branch before invoking `/gsd:execute-phase`. `.planning/config.json` sets no `git.branching_strategy`, so the orchestrator will not cut the branch for you.
- **Worktrees fork from `main`, not from the current branch.** Every agent this phase found its plan file missing at spawn. The safe fix is `git merge --ff-only <phase-branch>` while staying on the `worktree-agent-*` branch — never check out the phase branch inside a worktree.
- **`gsd-sdk query state.*` handlers corrupt `STATE.md` frontmatter.** Eight occurrences now, across four handlers. The `updated` list they report does **not** bound what they write; one rewrote `completed_plans` for a call that only appends a prose bullet. **Snapshot `sed -n '9,14p' .planning/STATE.md` before every such call and diff after.**
- **`3-6` is a poisoned needle.** `ConsentStep.tsx` ships the clinical phrase `3-6 months` into the bundle, so an absence gate can never pass and a presence gate passes vacuously. Never use it in either direction.
- **Do not "fix" the colour seam.** Scores either side of a zone boundary land ~3px apart (8 at 66.67%, 9 at 67.31%). Measured and accepted. Reasoning sits above the calculation in `ResultsDisplay.tsx`.

---

## ⚠️ The finding that matters most from this phase

**The human browser pass rejected a deploy that had 759 passing tests, a clean typecheck, and six independently verified served-bytes markers.**

Removing the `/60` denominator (SCORE-06, as written) made the bare number *less* interpretable, not more — a `30` sitting above a scale whose top band means `9+`. Andrew saw it on the live page; no test could have. The numeric score was then removed entirely.

**Seventh defect on this project found by a human clicking and missed by a fully green suite.** Keep the human browser pass.

**Consequence now load-bearing:** within-zone interpolation is the ONLY signal distinguishing a patient at 9 from one at 60, since both read "High" everywhere else. The number used to carry that. Do not replace interpolation with a fixed per-zone marker position.

---

## ⚠️ Findings that exist ONLY here and in agent memory

### LAUNCH-01 is violated — Klaviyo is live on the PHI quiz page

Unchanged since 2026-08-12. Andrew has deferred it three times.

Shopify web pixel `web-pixel-597524686` is a **Klaviyo pixel**: subscribes to `page_viewed` and `product_added_to_cart`, POSTs to `https://a.klaviyo.com/client/events`, builds payloads referencing `email` and `phone`. Klaviyo has no BAA.

**It cannot see clinical content** — answers, score, name and DOB are collected inside the cross-origin iframe on `fly.dev`. The exposure is page-view-plus-identity.

**A DOM scan will NOT find it** — the pixel runs in a sandboxed web worker, so `document.querySelectorAll('script')` returns clean. That false negative is why it stayed open. The check that works:

```js
fetch('/web-pixels/strict/app/web-pixel-<id>@<hash>.js')
  .then(r => r.text()).then(t => t.match(/https?:\/\/[a-z0-9.\-]+/gi))
```

**Fix:** Shopify admin → Settings → Customer events. Andrew's to make; not an agent action.

**Also third-party on that page:** the Appointly booking app (`s1.staq-cdn.com`, `d3emjguzbsq9q3.cloudfront.net`, `booking-api.apntly.com`), plus a `cloudflare.com/cdn-cgi/trace` call returning visitor IP and geo. Probably intentional for Phase 7 booking, never explicitly decided.

### Two Phase 6 findings from 2026-08-12

1. **This is a development store on a Custom plan**, not Basic/Grow. Phase 6's CONTEXT/RESEARCH/ROADMAP all reason from Basic/Grow. D-09 / D-11 conclude checkout-step extension targets are "Plus-only, therefore out of scope" — not verifiable on a dev store. Re-confirm after the LAUNCH-06 transfer.
2. **There is no refund policy and no shipping policy.** ROADMAP success criterion 4 for Phase 6 says the clinical-review language must appear "in the refund policy". There is none to amend. `06-05`'s deliverable is authoring guidance for a document written from nothing, not an edit.

---

## Next steps

1. **Send William the one-line correction.** Andrew's 2026-08-13 email says *"there is **no** a place to upload allergy testing results at Step 3"* — a typo that reads as the opposite of the truth. He also has the review link (`/quiz-embed?test=1`).
2. **Confirm the removed score with William.** His email said patients *"will still receive a number, and then fall on the scale"*. Andrew read it as "no number displayed anywhere, just the scale" and shipped that. Both readings are recorded verbatim in `ResultsDisplay.tsx`. This is patient-facing clinical presentation owned by the medical director — one line closes it.
3. **Phase 6 Wave 2 is unblocked.** Switch to `thread-phase-6-purchase-prerequisites`, rebase or merge `main` in to pick up the new brackets, then plan `06-03` and `06-05` **against the `9+` threshold, not `7+`**. Sequencing Constraint 7 in ROADMAP is now satisfied.
4. **`06-02` Task 3 is still open** — the SHOP-01 Liquid render measurement. It needs a logged-in customer session Andrew controls (Shopify login is an emailed code; an agent cannot do this half). Options are in the Phase 6 branch's HANDOFF.
5. **Optional cleanup:** `quizResults__scoreCircle`, `quizResults__scoreNumber` and `scaleBar__value` are now dead CSS in `app/styles/quiz.module.css`.

---

## Resume context

| | |
|--|--|
| **Branch** | `main` @ `3bcff8d`, clean. Phase 6 work is on `thread-phase-6-purchase-prerequisites` @ `3f501fe` — **read that branch's HANDOFF.md too**. |
| **How to verify** | `npm run typecheck && npm test` → expect **762 tests / 50 files**. Deployed check: fetch `https://alle-drops-quiz-app.fly.dev/quiz-bundle-js` with a cache-buster and count with `split(needle).length - 1`, never `grep -c`. |
| **Key files** | `app/lib/quiz/scoring.ts` (SCORE_BRACKETS) · `app/components/quiz/ResultsDisplay.tsx` (the reasoning comments are load-bearing) · `migrations/005_widen_score_bracket_check.sql` · `.planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md` (the clinical source of truth) · `.planning/ROADMAP.md` Sequencing Constraint 7 |
| **Store** | `allergist-on-demand.myshopify.com`. Live theme: Sense, id `135799767246`. |
| **Deploy** | `fly deploy -a alle-drops-quiz-app` from `main`. `shopify app deploy` is a separate system and Phase 6's `06-06` owns it. Fly prints a "not listening on the expected address" warning every deploy — **false alarm**, health returns 200. |
| **Blockers** | LAUNCH-01 live and unremediated by choice. `04-19` remains the one open plan from Phase 4 (human UAT, blocked on the Fly BAA, GCP cutover, and William). `06-02` Task 3 needs a customer login Andrew controls. |

## Git hygiene

- **Always branch before starting work.** `.planning/config.json` sets no `git.branching_strategy`, so `/gsd:execute-phase` will not cut it for you, and worktrees fork from whatever is checked out.
- Phase 5.2 was merged and deployed by an agent under Andrew's explicit in-session authorization, overriding CLAUDE.md's default "agents do not merge to main". That override is per-session and does not carry forward.
- Deploy from `main` only, after merge.
