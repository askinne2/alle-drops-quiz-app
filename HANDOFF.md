# HANDOFF — AlleDrops Symptom Quiz

**Written:** 2026-08-11
**Branch:** `phase-4.2-resume-in-progress-intake` @ `c4ddbe0`
**Resume with:** `/gsd:execute-phase 4.2` — it skips every plan that already has a SUMMARY, so it
will pick up at plan **04.2-08** and nothing else.

---

## One-paragraph state

Phase 04.2 (browser-local resume of an in-progress intake) is **code-complete and signed off**.
Seven of eight plans are done; the only remaining plan is **04.2-08**, which is the ship plan and is
deliberately `autonomous: false`. Nothing ships without Andrew. Phase 4.1 is also still unshipped by
Andrew's earlier decision to release 4.1 and 4.2 together, so **one ship event closes both phases**.

---

## Gates at handoff

| Gate | Result |
|---|---|
| `npm test` | **677 passed / 47 files**, exit 0 |
| `npm run typecheck` | clean, exit 0 |
| `npm run build:theme` | deterministic — identical SHA-256 across two consecutive builds |
| 04.1 part-order guard | `testing_status` at index **0** in the rebuilt bundle ✅ |
| Working tree | clean |
| Branch pushed | see "Immediate next steps" — push before doing anything else |

Baseline at phase start was 602 tests / 39 files, so this phase added **+75 tests**.

---

## What shipped into the branch

| Plan | Wave | Delivers |
|---|---|---|
| 04.2-01 | 1 | RESUME-01…04 in REQUIREMENTS.md; `app/lib/quiz/draft-store.ts` — feature-detect w/ round-trip canary, 24h expiry, schema fingerprint, type-driven token strip |
| 04.2-02 | 1 | `app/lib/quiz/payload.ts` — `buildSubmitPayload` extracted pure; `RESUME_PARITY_EXCLUDED_FIELDS` locked `as const` at exactly 3 |
| 04.2-03 | 1 | `app/components/quiz/ResumeOffer.tsx` — `ResumeOffer`, `StartOverControl`, `RestorationNotice`, confirm panel |
| 04.2-04 | 2 | Read path — `resume_offer` FlowStep, draft read on mount, restore, **lowest-incomplete-part landing rule** |
| 04.2-05 | 3 | Write path — D-07-gated debounced write, clear-on-submit, Start over reset, resumed dropzone copy |
| 04.2-06 | 4 | **Criterion 5 parity proof** (+ divergent-token companion) and the theme bundle rebuild |
| 04.2-07 | 5 | Human browser pass + D-03 measurement + three rounds of UI fixes |
| **04.2-08** | **6** | **NOT DONE — the ship plan** |

All five ROADMAP success criteria have automated proof. Criterion 5 (payload/score parity between a
one-sitting and a resumed intake) is proven end-to-end through the real `handleResume` path, with
both mandatory RED mutation proofs run and recorded.

---

## Immediate next steps

1. **Push the branch.** At the time of writing it existed only locally — 86 commits ahead of `main`,
   unpushed. This project already lost an IDE session once. Do this first.
   ```bash
   git push -u origin phase-4.2-resume-in-progress-intake
   ```
2. **Decide on shipping** (this is the whole of plan 04.2-08). It bundles:
   - merge PR #22 — https://github.com/askinne2/alle-drops-quiz-app/pull/22 (Phase 4.1, `MERGEABLE`, open)
   - merge this branch
   - three-channel deploy: `fly deploy -a alle-drops-quiz-app`, `shopify app deploy`, then
     served-bytes verification on the deployed app
   - blocking human check of both PHI renderers
   Per `CLAUDE.md`: Claude does not merge to `main` and does not deploy from a branch. Claude may run
   `fly deploy` **with Andrew's authorization**, after merge.
3. Read `.planning/phases/04.2-resume-in-progress-intake/04.2-08-PLAN.md` before starting — it has
   the full task breakdown and the verification steps.

---

## Blockers / decisions waiting on Andrew

| Item | Detail |
|---|---|
| **Ship 4.1 + 4.2** | The only thing blocking phase completion. Andrew's recorded decision was to ship them together. |
| **Systemic typography bug** | Not a blocker; needs scoping. See below. |
| **iOS Safari D-03** | Not a blocker; measurement gap. See below. |

---

## Known issues, deliberately not fixed

### 1. Systemic typography bug (pre-existing, months old)

Every font-size in `app/styles/quiz.module.css` is written `var(--font-body-size, X)`, but
`app/routes/quiz-embed.tsx:40` **defines** `--font-body-size: 1.6rem` on `:root`. A CSS fallback only
applies when the variable is undefined, so **every fallback in the file is dead code** and all ~99
remaining declarations collapse to 1.6rem:

| Intended | Count | Renders |
|---|---|---|
| 1.4rem | 50 | 1.6rem |
| 1.6rem | 28 | 1.6rem |
| 1.2rem (Caption) | 17 | 1.6rem |
| 1.1 / 1.3 / 1.5 / 1.8rem | 7 | 1.6rem |

The quiz renders **one** font size, not the three the UI-SPEC declares, and every responsive
font-size media query in the file is inert. Phase 4.2's own three declarations were fixed to explicit
rem (`507b241`). The rest were left alone on purpose: re-sizing the whole questionnaire would need its
own browser pass, and bundling an unrelated whole-quiz visual change into a HIPAA-relevant release
makes the PR harder to review for the thing that matters. **Recommended: its own phase.**

### 2. iOS Safari D-03 unmeasured

Chrome desktop and Safari macOS 26.5.2 are both measured and both pass — including partition-boundary
and survival across a full ⌘Q relaunch. **iOS is not measured**, and it is the highest-value gap:
every iOS browser is WebKit, iOS users quit apps far more aggressively, and `WKWebView`'s ITP
day-counter is documented to reset on app relaunch. macOS passing does not imply iOS passes.

Note the macOS result **contradicts** webkit.org's published "ephemeral, cleared between application
launches" policy. Measurement beat documentation for this version, but a future WebKit release could
reinstate it — and because D-01 degrades silently, that would never surface as an error, it would
just quietly stop working.

Harness to run: `04.2-RESEARCH.md` §"D-03 Measurement Harness". Not a blocker — the worst case is
D-01's silent-degrade path, which is correct behaviour.

### 3. Two synthetic rows in the dev database

`AOD_QA_PROBE_2` and `AOD_1786376124954` remain in `alledrops_quiz_dev`. Harmless; every row in that
database is test data.

---

## Things that will bite you if you don't know them

- **`public/quiz-bundle.js` / `.css` are committed build artifacts** built by `npm run build:theme`.
  `npm run build` does **not** touch them. Any change to `app/components/quiz/` or
  `app/styles/quiz.module.css` must rebuild **in the same commit**.
  `tests/quiz-bundle-freshness.test.ts` guards this.
- **A CSS-only source edit still changes `quiz-bundle.js`.** CSS Modules encode the source line
  number in generated class names (`_quizStartOver__confirm_495ej_744`), so adding a comment shifts
  hashes and the JS that references them. Both artifacts must be committed together.
- **This branch forks from unmerged `phase-4.1-testing-first-quiz-order`.** Rebuilding the bundle from
  a tree without 04.1's `QUIZ_PARTS` reorder would silently revert allergy-testing-first while every
  test still passed. Plan 04.2-06 asserts
  `git merge-base --is-ancestor phase-4.1-testing-first-quiz-order HEAD` before it rebuilds. Keep that.
- **`.test.ts`, never `.test.tsx`** — vitest's include glob does not match `.tsx`. DOM tests use
  `React.createElement`, not JSX.
- **Never `grep -c` to count occurrences in the bundle** — it counts *lines* and the minified bundle
  is one line. Use `SOURCE.split(needle).length - 1`.
- **`position: fixed` is unusable inside the embed.** The theme block auto-resizes the iframe to
  content height (`symptom-quiz.liquid:133-136`), so the iframe never scrolls and its viewport equals
  its full box. Measured: a fixed overlay centres 514px down a 1027px iframe, worsening as content
  grows. A modal would look right in dev and land off-screen for real patients on long pages.
- **No test in this suite can observe layout.** Three separate UI defects were caught this session by
  Andrew looking at the screen while 677 tests stayed green. Keep the human browser pass.
- **The local dev server serves the real committed bundle** at `/quiz-bundle-js` and
  `/quiz-bundle-css` — verified SHA-256 identical. So a local pass does exercise shipping bytes.
- **`localStorage` on `localhost:3000` is shared with other local projects.** Clearing it during
  testing wipes Clerk/Camino/Cerebro dev keys. Prefer
  `localStorage.removeItem('alledrops_quiz_draft_v1')`.

---

## Key file paths

**Phase docs** — `.planning/phases/04.2-resume-in-progress-intake/`
`04.2-CONTEXT.md` (locked decisions D-01…D-11) · `04.2-RESEARCH.md` (D-03 measurements) ·
`04.2-UI-SPEC.md` (approved 6/6) · `04.2-VALIDATION.md` · `04.2-PATTERNS.md` ·
`04.2-01…07-SUMMARY.md` · **`04.2-08-PLAN.md` ← the remaining work**

**Source added/changed this phase**
```
app/lib/quiz/draft-store.ts          + .test.ts
app/lib/quiz/payload.ts              + .test.ts
app/components/quiz/ResumeOffer.tsx
app/components/quiz/QuizContainer.tsx      (read + write paths)
app/components/quiz/QuizPartRenderer.tsx   (resumedSession dropzone copy)
app/styles/quiz.module.css                 (quizStartOver* rules)
public/quiz-bundle.js, public/quiz-bundle.css
tests/quiz-resume-{offer-dom,restore-dom,write-gate,no-file-token,start-over-dom,payload-parity}.test.ts
tests/quiz-bundle-freshness.test.ts        (Phase 4.2 markers)
```

---

## Deployment reality check

Both Fly (**v51**) and Shopify (**alledrops-quiz-production-22**) still carry the **old** part order
with allergy testing last, and have **no** resume feature. Nothing from Phase 4.1 or 4.2 is live.
That is by choice, not oversight.
