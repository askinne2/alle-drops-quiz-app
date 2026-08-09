# Theme Repo Reconciliation — `allergist-on-demand`

**Repo:** `/Users/andrewskinner/Local Sites/allergist-on-demand` (Sense 15.4.1)
**HEAD before and after this plan:** `5767aca96d068229d973400e73b2b46a3b20fb3f` (unchanged — nothing
committed or pushed in this plan)
**Method:** All occurrence counts use `SOURCE.split(needle).length - 1`, never `grep -c`
(`grep -c` counts matching lines, which collapses multi-match single-line minified/JSON content to
1 — the exact trap named in D-14 and hit by three prior executors).

---

## Pre-existing uncommitted drift, captured verbatim BEFORE this plan changed anything

`git status --short` at plan start:

```
 M config/settings_data.json
 M sections/footer-group.json
 M sections/header-group.json
 M templates/index.json
 M templates/page.about.json
 M templates/page.contact.json
 M templates/page.faq.json
 M templates/page.how-it-works.json
 M templates/page.quiz-history.json
 M templates/page.quiz.json
 M templates/page.team.json
?? docs/superpowers/
?? templates/page.testing-options.json
```

**Scope note:** this plan's `files_modified` frontmatter names only `config/settings_data.json`,
`templates/page.quiz.json`, and `templates/page.testing-options.json`. The other eight modified
files (`sections/footer-group.json`, `sections/header-group.json`, `templates/index.json`,
`templates/page.about.json`, `templates/page.contact.json`, `templates/page.faq.json`,
`templates/page.how-it-works.json`, `templates/page.quiz-history.json`, `templates/page.team.json`)
and the untracked `docs/superpowers/` directory are **pre-existing local drift not touched by this
plan** — per `CLAUDE.md`'s pitfall note, uncommitted tracked-file modifications in this repo are
load-bearing (they carry Andrew's theme-editor fixes) and `git reset --hard` is forbidden. They are
recorded here only so nobody mistakes them for something this plan introduced. Task 3's checkpoint
diff review should be read against this baseline.

---

## Drift item 1 — Klaviyo onsite-embed block (`config/settings_data.json`)

- **File:** `config/settings_data.json`, `current.blocks."855628211100114053"`
- **Pre-change value:** `"type": "shopify://apps/klaviyo-email-marketing-sms/blocks/klaviyo-onsite-embed/2632fe16-c075-4321-a88b-50b567f42507"`, `"disabled": false`
- **Post-change value:** same block, `"disabled": true`
- **Evidence the target value is correct:** `.planning/STATE.md` §"Live exposures to close
  immediately" — Klaviyo entry, **CLOSED 2026-08-09**, verified on authenticated, cache-busted
  served bytes of `/pages/allergy-quiz`: `klaviyo = 0`, `static.klaviyo.com = 0`, `_klOnsite = 0`.
  Andrew disabled the block in the Sense theme editor's App embeds panel on 2026-08-09. The local
  working tree still read `disabled: false` (an admin-side change does not touch the theme repo),
  which is the exact push-would-re-enable-it trap D-12 names.
- **Occurrence count:** `klaviyo-onsite-embed` appears **1** time in `settings_data.json`
  (`split('klaviyo-onsite-embed').length - 1 = 1`) — a single block entry, no per-template override
  to reconcile separately.

## Drift item 2 — Appointly app-embed block (`config/settings_data.json`) — recorded, NOT changed

- **File:** `config/settings_data.json`, `current.blocks."1850493961649900144"`
- **Pre-change value:** `"type": "shopify://apps/apntly-appointment-booking-app/blocks/main-app-embed/17a520a2-4844-483a-826a-11cb5dd0370d"`, `"disabled": false`
- **Post-change value:** unchanged — `"disabled": false`
- **Evidence this is deliberate, not an oversight:** `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md`
  §Deferred "Appointly embed keep/disable decision" and `.planning/STATE.md`'s Appointly retraction
  entry (`apntly = 0`, `appointly = 15` on served bytes, live third-party JS from
  `staq-cdn.com`/`staqlab.com`). Left on deliberately — Phase 7 (Telehealth Intake) may depend on it
  for booking; the keep/disable decision is explicitly a Phase 8 item. This plan's task 1 only
  records the pre/post value so a push cannot silently alter it either way.
- **Occurrence count:** `apntly-appointment-booking-app` appears **1** time in
  `settings_data.json`.

## Drift item 3 — `templates/page.quiz.json` redirect URLs and app block — already reconciled, confirmed only

- **File:** `templates/page.quiz.json`
- **Pre-change value (working tree, already present before this plan started):**
  `"consult_redirect_url": "shopify://products/allergy-consultation"`,
  `"test_options_redirect_url": "shopify://pages/test-options"`, app block type
  `shopify://apps/alledrops-quiz-production/blocks/symptom-quiz/019ad9de-6be6-7a75-a853-b0125a7a4f97`.
  No action was needed — Andrew's prior local edit (recorded in `STATE.md` "Gate D" section) already
  matches live.
- **Post-change value:** unchanged — this task made no edits to this file.
- **Evidence:** `.planning/STATE.md` §"Gate D (`test_options_redirect_url`)" — **CLOSED 2026-07-30,
  verified on served bytes**, live `/pages/allergy-quiz` serves
  `consult=%2Fproducts%2Fallergy-consultation` and `testOptions=%2Fpages%2Ftest-options`.
- **`quiz-kit-smart-product-finder` check:** grepped `templates/page.quiz.json` for
  `quiz-kit-smart-product-finder` — **0** occurrences
  (`split('quiz-kit-smart-product-finder').length - 1 = 0`). The block was already renamed from
  `quiz_kit_smart_product_finder_quiz_VWGAKC` (type
  `shopify://apps/quiz-kit-smart-product-finder/blocks/quiz/...`) to
  `alledrops_quiz_production_symptom_quiz_igLDNJ` in Andrew's prior local edit. No fourth drift item
  — this task's acceptance criterion ("if one does [remain], remove it and record that as a fourth
  drift item") does not apply.
- **Related, but out of this plan's `files_modified` scope:** `config/settings_data.json`'s working
  tree also has the now-removed `quiz-kit-smart-product-finder/blocks/chat-embed` app-embed entry
  removed relative to HEAD (Andrew's prior edit, pre-existing before this plan started — visible in
  the `git diff` alongside the Klaviyo `disabled` flip made by this task). Recorded here because it
  sits in the same file this task edited, not because this task caused it.

## Drift item 4 — orphaned `templates/page.testing-options.json`

- **File:** `templates/page.testing-options.json`
- **Pre-change value:** file existed on disk, **untracked** (`git log --all -- templates/page.testing-options.json` returns no history — it was never committed to this repo; confirmed via `git status --short` showing it as `??`).
- **Post-change value:** file deleted (`rm`). No `git rm` was needed since it was untracked; it
  produces no entry in `git status` after deletion and no diff to review — its absence from disk is
  the evidence.
- **Evidence the target value is correct:** `.planning/STATE.md` page inventory —
  `/pages/testing-options` returns **404** live, while `/pages/test-options` (no "ing") is the live
  **200** page. `.planning/phases/04-mandatory-allergy-testing/04-CONTEXT.md` D-12 names this file
  as an orphaned template.
- **Repo-wide grep before deletion, proving nothing else referenced it:**
  `grep -rln "testing-options|testing_options" --include="*.json" --include="*.liquid" .` inside the
  theme repo returned **zero** matches (not even the file's own name, since `grep -rl` searches file
  *content*, and the file's content does not contain the string `testing-options`/`testing_options`
  anywhere — its JSON body has no such key). No template, section, or snippet references
  `testing-options`, so deletion was safe per the task's own stop condition.

---

## Deletions section (Task 2 — no-testing-required clauses)

See `.planning/phases/04-mandatory-allergy-testing/04-STOREFRONT-COPY-DRAFT.md` for the full
per-surface table. Summary of pre/post counts recorded there, all via
`split(needle).length - 1`:

- Theme repo (all tracked `.json`, `.liquid` files under `templates/`, `sections/`, `snippets/`,
  `locales/`): `needles` — pre **0**, post **0**. `no longer a need` — pre **0**, post **0**. See
  the draft doc's "Where the clauses actually live" section for why: neither string exists anywhere
  in the theme repo's tracked source. The clause text is Shopify Admin product-description /
  metafield content, not theme-repo content — named explicitly below rather than silently skipped.

---

## Verification command run

```
node -e "const fs=require('fs');const T='/Users/andrewskinner/Local Sites/allergist-on-demand';const s=fs.readFileSync(T+'/config/settings_data.json','utf8');const c=(x,n)=>x.split(n).length-1;const kIdx=s.indexOf('klaviyo-onsite-embed');if(kIdx<0)throw new Error('klaviyo block not found');const win=s.slice(Math.max(0,kIdx-400),kIdx+400);if(c(win,'\"disabled\": true')<1)throw new Error('klaviyo block not disabled');if(fs.existsSync(T+'/templates/page.testing-options.json'))throw new Error('orphaned template still present');const r=fs.readFileSync('.planning/phases/04-mandatory-allergy-testing/04-THEME-RECONCILIATION.md','utf8');if(c(r,'settings_data.json')<1||c(r,'appointly')+c(r,'Appointly')<1)throw new Error('reconciliation report incomplete');console.log('OK')"
```

Result: `OK`
