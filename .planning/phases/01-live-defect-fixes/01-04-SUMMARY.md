---
phase: 01-live-defect-fixes
plan: 04
subsystem: deploy-provenance
tags: [build-artifact, provenance, vite-lib-build, theme-bundle, gate-b, claude-md, deferred-items]

# Dependency graph
requires:
  - "app/lib/quiz/product-links.ts — corrected handle map, bundled by this plan (Plan 01-01)"
  - "app/lib/quiz/navigation.ts — validator reached through QuizContainer (Plan 01-01)"
  - "app/components/quiz/QuizContainer.tsx — navigateParent, bundled by this plan (Plan 01-02)"
  - "app/lib/quiz/questions.ts — corrected med_list label, bundled by this plan (Plan 01-02)"
provides:
  - "public/quiz-bundle.js rebuilt from post-wave-2 source and committed — 184236 bytes, sha256 0c3b652dd1938528988fc7463fd2d3d07042fdf1757e0907f49805359d0fedeb"
  - "Pre-deploy SHA-256 and byte count for Plan 05's stale-artifact signal"
  - "Gate B fully green on the committed artifact (8/8, was 2/8) — asserted against the git blob, not just the working file"
  - "First unqualified full-green npm test gate for the phase: 122/122, 14 files"
  - "CLAUDE.md corrected so agents are no longer instructed to refuse GSD"
  - "Measured proof that entry.theme.tsx injectIframe() is unreachable in production"
affects: [01-05-deploy, 01-06-console-protocol, phase-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Assert build-artifact provenance against the committed git blob (git show HEAD:path), not only the working-tree file"
    - "Express minified-bundle content gates as node split() occurrence counts — grep -c counts lines and collapses to 1 on a single-line bundle"
    - "Assemble forbidden tokens from fragments inside the checker so the checker cannot self-invalidate its own = 0 gates"
    - "Measure the full delivery chain (liquid iframe → route → committed file) before trusting a rebuild"

key-files:
  created:
    - .planning/phases/01-live-defect-fixes/01-04-SUMMARY.md
  modified:
    - public/quiz-bundle.js
    - CLAUDE.md

key-decisions:
  - "Gate B asserted against the committed blob via git show, because a passing working-tree file does not prove the committed bytes are fresh — that gap is the exact session-28 failure mode"
  - "All content gates run as node string counts; the plan's grep -c form is unusable on this machine and vacuous on a single-line bundle"
  - "STATE.md deliberately NOT written (worktree mode) — the five follow-ups and the LAUNCH-01 caveat are recorded below for the orchestrator to apply"
  - "quiz-bundle.css not committed — build:theme regenerated it byte-identically, so there was nothing to commit"

requirements-completed: [DEF-01, DEF-02, DEF-03, DEF-04]

# Metrics
duration: 8min
completed: 2026-07-30
---

# Phase 01 Plan 04: Bundle Rebuild + Provenance Gate Summary

**Rebuilt and committed the theme bundle so the bytes patients download finally match the fixed source — Gate B went 2/8 to 8/8 asserted against the committed git blob — took the phase to its first unqualified 122/122 green, and removed the CLAUDE.md line that had been telling every agent in this phase to refuse GSD.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-30T06:29:00-04:00
- **Completed:** 2026-07-30T06:37:00-04:00
- **Tasks:** 2
- **Files modified:** 2 (1 created — this summary)

## Accomplishments

- **DEF-03 and DEF-04 now actually reach patients.** They were fixed in source in waves 1–2 but absent from the served artifact. `app/routes/quiz-bundle-js.tsx:28-31` reads the committed `public/quiz-bundle.js` off disk at request time; that file had not been rebuilt.
- **Gate B is 8/8 on the committed git blob**, up from 2/8 on the baseline. Asserted via `git show HEAD:public/quiz-bundle.js`, not just the working file — see Decision 1 for why that distinction is the whole point of this plan.
- **The phase's first unqualified full-green gate passes:** `npm test` with no `--exclude`, 122 passed / 122, 14 files. Both red-by-design contract tests are green inside that number.
- **Pre-deploy hash and byte count recorded** for Plan 05's stale-artifact signal.
- **Proved `entry.theme.tsx`'s `injectIframe()` is unreachable in production** by measurement, not inference — this is the mechanism that made DEF-01 look implemented for two months.
- **Corrected `CLAUDE.md` in 8 changed lines** with all six PHI compliance rules and every workflow rule byte-intact (20/20 node assertions).
- **Zero package installs.** `git diff package.json` is empty. T-1-SC holds.

## Task Commits

1. **Task 1: rebuild and commit the theme bundle** — `f1a3ed2` (fix)
2. **Task 2: correct the stale anti-GSD instruction in CLAUDE.md** — `7d23483` (docs)

## The Values the Plan Asked Me to Record

### Pre-deploy artifact identity — for Plan 05

| Property | Pre-change baseline | **Post-rebuild (committed)** |
|---|---|---|
| Byte count | 183691 | **184236** (+545) |
| SHA-256 | `c5520daa26c0741e4e3f57d7f83f69923a368cb0c68045dbf24effa00ecaaa9f` | **`0c3b652dd1938528988fc7463fd2d3d07042fdf1757e0907f49805359d0fedeb`** |

**Plan 05 usage.** `curl -s https://alle-drops-quiz-app.fly.dev/quiz-bundle-js | shasum -a 256`:

- Served hash **equal to `0c3b652d…`** → the deploy shipped this artifact verbatim. Best case.
- Served hash **equal to `c5520daa…`** → **FAILURE.** That is the pre-change artifact and the literal stale-artifact signature. Do not accept any deploy exit code, `/health` 200, or `Cache-Control` value against this.
- Served hash **equal to neither** → inconclusive by itself (the image rebuilds under `node:20-alpine` via `RUN npm run build && npm run build:theme`, which need not be byte-identical to a macOS local build). Fall through to the Gate B content markers, which are build-environment independent.

### Lockfile status — T-1-18

`package-lock.json` **exists**, 491 KB, in the main checkout at `/Users/andrewskinner/Local Sites/alle-drops-quiz-app/package-lock.json`. It is gitignored (`.gitignore:3`), so `git worktree add` did not materialise it here; I symlinked it in alongside `node_modules`. **No package manager install was run** — `npm install --package-lock-only` was not needed and `git diff package.json` is empty.

Two related facts confirmed and unchanged, per the plan's instruction not to "tidy" them:

- `@vitejs/plugin-react` is in **`dependencies`** (`package.json:40`), not `devDependencies`. The Dockerfile runs `npm ci --omit=dev` then `npm run build:theme`, so moving it would break the in-image theme build.
- `Dockerfile:16` runs both `npm run build && npm run build:theme`, and `Dockerfile:10` is `COPY package.json package-lock.json* ./`. The `*` glob means a **missing** lockfile does not fail the COPY — `npm ci` then fails one layer later with a less obvious error. The lockfile being gitignored while `npm ci` requires it remains the standing trap (`HANDOFF.md:127`).

### Exact CLAUDE.md replacement text

Removed (was `CLAUDE.md:13`, one line):

> `## THIS IS NOT a GSD project. never try to start GSD.`

Inserted in its place:

```markdown
## This project is GSD-managed

Planning state is committed under `.planning/` — `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`,
`STATE.md`, and per-phase plans in `.planning/phases/`. **Read `.planning/ROADMAP.md` and
`.planning/STATE.md` before starting work** to establish the current milestone, the last completed
phase, and any open blockers. Use the `/gsd:*` commands to plan and execute; don't hand-edit
`ROADMAP.md` or `STATE.md` while a phase is mid-execution.
```

`git diff --stat CLAUDE.md` → **7 insertions, 1 deletion = 8 changed lines**, inside the plan's <12 surgical limit. The compliance block above the line and everything below it are untouched.

## Verification Results

Per Andrew's global CLAUDE.md build-verification rule, using **`npm`** (the repo carries `package-lock.json`).

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run typecheck` | **exit 0**, no output |
| **Full suite, unqualified — the phase's full-green gate** | `npm test` | **exit 0 — 122 passed / 122, 14 files**, 653 ms |
| Production build | `npm run build` | **exit 0** — client 141.20 kB, SSR 189.57 kB |
| Theme build | `npm run build:theme` | **exit 0** — 39 modules, `quiz-bundle.js` 184.24 kB (gzip 57.04 kB) |
| Gate B on the working file | node occurrence counts | **8/8 PASS** |
| **Gate B on the committed blob** | `git show HEAD:public/quiz-bundle.js` → node | **8/8 PASS** |
| Pre-build source provenance | 19 node assertions on waves 1–2 files | **19/19 PASS** |
| CLAUDE.md gates | 20 node assertions | **20/20 PASS** |
| No dependency change | `git diff package.json` | empty |
| No file deletions | `git diff --diff-filter=D HEAD~1 HEAD` per commit | empty for both |
| Working tree | `git status --short` | clean |

Both previously red-by-design files are green inside the 122: `tests/liquid-block-contract.test.ts` (11) and `tests/quiz-embed-contract.test.ts` (4). Baseline at plan start was already 122/122 — this plan added no tests, and none regressed.

### Gate B — measured counts, before and after

Counts are **true occurrence counts** from `split(needle).length - 1`, not `grep -c` line counts.

| Marker | Want | Baseline (183691) | **Committed (184236)** |
|---|---|---|---|
| byte count | `≠ 183691` | 183691 ❌ | **184236 ✅** |
| `tennessee-alledrops` | `≥ 1` | 0 ❌ | **1 ✅** |
| `texas-alledrops` | `≥ 1` | 0 ❌ | **1 ✅** |
| `tennessee-allerdrops` (misspelled) | `= 0` | 1 ❌ | **0 ✅** |
| `texas-allerdrops` (misspelled) | `= 0` | 1 ❌ | **0 ✅** |
| `and dosages (required)` | `= 0` | 1 ❌ | **0 ✅** |
| `quiz:scrollToTop` | `≥ 1` | 2 ✅ | **2 ✅** |
| `window.location.assign =` (reassignment) | `= 0` | 0 ✅ | **0 ✅** |
| | | **2/8** | **8/8** |

Informational counts that corroborate the rebuild landed the wave-2 logic, not just the strings:

| Marker | Baseline | Committed | Meaning |
|---|---|---|---|
| `allerdrops` any form | 2 | **0** | both misspelled handles gone |
| `quiz:navigate` | 1 | **2** | `navigateParent` added a second sender |
| `path:` | **0** | **2** | the `url` → `path` key rename is in the bundle; the baseline had no `path` sender at all |

That last row is the cleanest single proof of skew: the previously-served bundle could not have participated in the `path` contract Plan 03's Liquid listener reads, because it contained no `path` sender.

### Where the fixes landed inside the artifact

Verbatim extracts from the committed bundle:

```js
// DEF-03 — corrected handle map (app/lib/quiz/product-links.ts)
const xc="draft-2026-05-09",Sc={tennessee:"tennessee-alledrops",texas:"texas-alledrops"};

// DEF-04 — corrected label, no suffix (app/lib/quiz/questions.ts)
text:"Please list your current allergy medications and dosages",order:51

// DEF-02 — navigateParent posting the validated relative path (QuizContainer.tsx)
window.self!==window.top?window.parent.postMessage({type:"quiz:navigate",path:y},"*")
                        :window.location.assign(y)
```

The surviving `window.location.assign(y)` there is the standalone (non-iframe) fallback branch, reached only when `window.self === window.top`, and `y` has already passed `toRelativePath`. Plan 01-02 documented it as the one intentional remaining call site.

### Measured: `injectIframe()` is unreachable in production

The bundle also contains a *second* `quiz:navigate` and `quiz:scrollToTop` handler, from `app/entry.theme.tsx:61-72`:

```js
g.data.type==="quiz:navigate"&&g.data.url&&window.location.assign(String(g.data.url)),
g.data.type==="quiz:scrollToTop"&&v.scrollIntoView({behavior:"smooth",block:"start"})
```

That is an **unguarded** navigation — no origin check, reads the abandoned `url` key, and uses `behavior:"smooth"` in violation of D-06. I confirmed it cannot execute in production rather than assuming so. Measured against `extensions/quiz-block/blocks/symptom-quiz.liquid`:

| Check on the installed Liquid block | Count |
|---|---|
| references `quiz-bundle.js` | **0** |
| references `quiz-bundle-js` | **0** |
| renders a `data-alledrops-quiz` container | **0** |
| emits any `<script src` tag | **0** |
| creates an `<iframe>` directly in Liquid | 1 |

`initQuiz()` only calls `injectIframe()` for elements matching `[data-alledrops-quiz]` when `window.self === window.top`. The installed block renders no such container and never loads the bundle on the parent page — it builds its own iframe in Liquid. The bundle is therefore loaded **only** inside `/quiz-embed`, where `window.self !== window.top` and the `mountReact` branch runs.

**Full confirmed delivery chain:**

```
/pages/allergy-quiz  (Liquid theme app block, builds its own <iframe>, parent-side handler in Liquid)
  └─► /quiz-embed                     Cache-Control: no-store    renders [data-alledrops-quiz]
        ├─► /quiz-bundle-js           max-age=300, no ETag  ──► reads committed public/quiz-bundle.js
        └─► /quiz-bundle-css          ──► reads public/quiz-bundle.css
              └─► bundle runs, window.self !== window.top ──► mountReact ──► QuizContainer
```

So `injectIframe()`'s open redirect is dead code, and this plan carried it to production unchanged **by design** (Task 2 follow-up #4 records it as a Phase 8 deletion candidate). It is worth being explicit: it is dead *because the installed block does not load the bundle on the parent page*. If a future change ever loads `quiz-bundle.js` on a storefront page, that handler becomes live and reintroduces an unguarded open redirect on a PHI-collecting surface.

### `quiz-bundle.css` was regenerated byte-identically

`build:theme` writes both files (`outDir: "public"`, `emptyOutDir: false`). After the build, `git status --short` showed **only** `public/quiz-bundle.js` modified. Waves 1–2 changed no CSS source, so there was nothing to commit for the stylesheet. Recording this so Plan 05 does not read an unchanged `quiz-bundle.css` as evidence of a partial build.

---

## STATE.md content for the orchestrator to apply

**I did not write `.planning/STATE.md`** — worktree mode, per the execution contract. The plan's Task 2 requires these entries; they are reproduced verbatim below for the orchestrator to apply after merge. The plan's `files_modified` lists `.planning/STATE.md`; that write is intentionally suppressed here.

### Append to the `## Deferred Items` table

```markdown
| Security | `Content-Security-Policy: frame-ancestors *` on `/quiz-embed` lets any site frame the PHI-collecting quiz. Clickjacking exposure. Plan 03's `e.origin` guard narrows what a hostile framer can *cause* but does not prevent the framing itself. (T-1-09, accept) | Phase 8 candidate | 2026-07-30 |
| Deploy provenance | Neither bundle route emits `ETag` or `Last-Modified`, which is why deploy verification is a string-counting exercise. Worse, `app/routes/quiz-bundle.js.tsx` and `app/routes/quiz-bundle-js.tsx` serve the same file with disagreeing `max-age` (3600 vs 300). A content-hash ETag is ~3 lines and converts every future verification into one conditional request. All Phase 1 gates deliberately assert against `/quiz-bundle-js`, the 300s variant, because that is the route `quiz-embed.tsx` references. | Phase 8 candidate | 2026-07-30 |
| Latent defect | Double-submit on the `3-6` bracket: a patient can click "Schedule a Telehealth Appointment" (submits), navigate back, then take "Continue to Purchase" through consent and submit again — violating the `NOT NULL UNIQUE` constraint on `submissions.symptom_profile_id`, because `generateSymptomProfileId()` returns `AOD_${Date.now()}` and is called once per session. Real and patient-facing. Phase 4 (TEST-05) deletes the `3-6` purchase jump entirely and removes it for free, so no separate fix is needed — but reproducing it during verification would otherwise look like a Phase 1 regression. | Resolved for free by Phase 4 / TEST-05; record only | 2026-07-30 |
| Dead code | `app/entry.theme.tsx`'s `injectIframe()` message handler is correct code on an unreachable path — measured in Plan 01-04: the installed Liquid block loads the bundle on zero parent pages and renders no `data-alledrops-quiz` container, so only the `mountReact` branch ever runs. Its existence is what made DEF-01 look implemented for two months. It also carries the same open-redirect pattern D-05 closed on the live path (unguarded `window.location.assign(String(e.data.url))`, no origin check, reads the abandoned `url` key), plus `behavior: "smooth"` and a wrapper-scroll that both violate D-06. Deletion candidate; deliberately untouched in Phase 1. Note: it becomes live if anything ever loads `quiz-bundle.js` on a storefront page. | Phase 8 candidate | 2026-07-30 |
| Theme config | The sticky-header scroll offset is hardcoded at `scroll-margin-top: 100px` in the Liquid block's `{%- style -%}` region rather than exposed as a `range` setting, because whether a newly added non-`product` schema setting receives its default on an **already-placed** block is unverified. If tuning it ever requires a deploy, verify that behavior first, then promote it to a setting. | Phase 8 candidate | 2026-07-30 |
```

### Append to `## Blockers/Concerns`, under "Live exposures to close immediately"

```markdown
**Klaviyo is still live on `/pages/allergy-quiz`** — 4 occurrences in the HTML fetched 2026-07-30.
A third-party script on a PHI-collecting page and a reportable-breach trigger per
`docs/breach-response-runbook.md:16`. Theme-level, zero repo references; not fixable from this repo.
Owned by **Phase 8 / LAUNCH-01** (T-1-16, transfer).

**Phase 1's verification pass does NOT clear LAUNCH-01.** Phase 1 adds zero scripts and zero
libraries, so nothing in it can close this. A green Phase 1 must not be read as a clean
patient-facing page — the two are independent and were confirmed so by Plans 01-03 and 01-04.
```

---

## Decisions Made

### 1. Gate B was asserted against the committed git blob, not just the working file

The plan's criteria read against `public/quiz-bundle.js` — the working-tree file. But this plan exists *because* four representations of the same code can silently disagree, and "the file on disk is correct" does not prove "the committed bytes are correct." A build that succeeded but was never staged, or a partial `git add`, passes a working-tree gate and ships the old artifact — a near-miss of the exact session-28 failure. So I extracted `git show HEAD:public/quiz-bundle.js` and re-ran all eight markers against those bytes. Both agree (identical SHA-256), so the distinction cost nothing here, but the weaker gate would not have detected the failure it exists to catch.

### 2. Every content gate ran as node string counts, not `grep -c`

Two independent reasons, and the second is specific to this plan:

1. On this machine `grep` is a **ugrep wrapper in which `$` anchors mid-pattern**. Plans 01-02 and 01-03 both hit this and converted their criteria; 01-03 converted all 47.
2. **`grep -c` counts matching lines, not occurrences.** `public/quiz-bundle.js` is a single-line 184 KB minified IIFE, so *every* `grep -c` against it returns 0 or 1. That makes each `≥ 1` gate pass vacuously on a single hit and makes the true counts unobservable. The corroborating evidence in this summary — `allerdrops` 2 → 0, `quiz:navigate` 1 → 2, `path:` 0 → 2 — is invisible to `grep -c`, which reports 1, 1, and 1 respectively after the fix. `split(needle).length - 1` counts occurrences.

Both checkers assemble their forbidden tokens from fragments at runtime (`"tennessee-" + "aller" + "drops"`) so the checker file cannot self-invalidate its own `= 0` gates — the trap Plan 01-01 hit.

### 3. `STATE.md` was not written

Worktree mode; the orchestrator owns `STATE.md` and `ROADMAP.md`. The full intended content is above under a labelled heading rather than dropped.

### 4. `quiz-bundle.css` was not committed

It regenerated byte-identically. Committing an unchanged file is not possible, and its absence from the commit is expected rather than a partial build. Called out explicitly above so Plan 05 does not misread it.

## Deviations from Plan

### Setup Correction (not a code deviation) — and this one was load-bearing

**The worktree spawned at a stale base and the merge-base assertion caught it.**

HEAD was at `0cae8b3` ("docs: handoff session 28"), which is an **ancestor** of the assigned base `41a3c1e` and contains neither wave 1 nor wave 2. `git reset --hard 41a3c1e` corrected it. The HEAD assertion ran first and passed (branch `worktree-agent-a8bd6a58e8e197eb1`, in the allowed namespace), so the reset was safe; no protected ref was touched.

**This is the third consecutive plan to spawn at `0cae8b3`** — Plan 01-03's summary documents the identical drift. On this plan it would have been silently destructive rather than merely blocking: `build:theme` at `0cae8b3` would have succeeded, emitted a plausible ~183 KB bundle with a fresh mtime and a *different* SHA-256 from the baseline, and satisfied the "byte count ≠ 183691" criterion — while still containing both misspelled handles and the forbidden label. A byte-count-only check would have read as a pass. Only the content markers would have caught it, and only if run.

Accordingly I verified the base by content before building, not just by commit hash: **19/19 node assertions** across `product-links.ts`, `navigation.ts`, `QuizContainer.tsx`, `questions.ts`, `quiz-embed.tsx`, `symptom-quiz.liquid`, and `entry.theme.tsx`. **Future plans that rebuild an artifact from source should assert source content before building, not only the merge-base hash.**

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Symlinked `node_modules` and `package-lock.json` into the worktree**

- **Found during:** Setup, before Task 1.
- **Issue:** Both are gitignored (`.gitignore:2` and `:3`), so `git worktree add` materialised neither. Every verify step runs vitest, `build:theme` needs the toolchain, and the plan's first instruction is to confirm a lockfile exists.
- **Fix:** `ln -s` to the main checkout's existing files. **No package manager install was run** — this is not a dependency addition, and `git diff package.json` is empty. Both paths are gitignored, so neither can leak into the merge.
- **Verification:** Baseline reproduced the orchestrator's documented 122/122 exactly.
- **Committed in:** n/a (gitignored).

### Plan Corrections (no code impact)

**2. `git branch --show-current` cannot return `fix-phase1-live-defects` in worktree mode**

Task 1's criterion expects that branch. This executor runs in an isolated worktree on the per-agent branch `worktree-agent-a8bd6a58e8e197eb1`, which the pre-commit HEAD assertion *requires* — a worktree HEAD on the shared feature branch would be a fatal condition, not a passing one. The criterion's intent (do not merge, do not deploy from here) is satisfied: no merge, no push, no deploy was performed, and the orchestrator merges this branch into `fix-phase1-live-defects`.

**3. Gate B's `quiz:scrollToTop ≥ 1` criterion was already green on the baseline**

It counts 2 in the pre-change artifact and 2 after. The child has been posting `quiz:scrollToTop` for months — that was never the DEF-01 defect. The defect was the missing *parent-side listener*, which lives in `symptom-quiz.liquid` (Plan 03) and is Gate C's business, not Gate B's. The criterion is not wrong, but it is **non-discriminating for Gate B** and must not be cited as evidence the rebuild worked. The discriminating Gate B markers are the two handles, the label suffix, and the byte count; `path:` 0 → 2 is the strongest corroborator. Flagging so Plan 05 does not treat a green `quiz:scrollToTop` on the served bytes as bundle-freshness evidence — it would be green on a stale artifact too.

**4. The misspelling gate must stay file-scoped to the bundle**

`allerdrops` (with R) is a **legitimate** token elsewhere in this repo — `CLAUDE.md` carries `fly certs create quiz.allerdrops.com` in its open-work list, and `STATE.md` records the unresolved `alledrops.com` vs `allerdrops.com` domain/trademark decision as a live blocker. A repo-wide `= 0` gate on that string would fail against correct content. Gate B is correctly scoped to `public/quiz-bundle.js`; keep it that way. (This summary and the wave 1–2 summaries also quote the misspelling when describing the defect, which is a second reason repo-wide scoping is wrong.)

---

**Total deviations:** 1 auto-fixed (blocking), 1 setup base correction, 3 plan-measurement corrections.
**Impact on plan:** No scope creep. The base correction is the significant one — see above for why it was silently dangerous specifically on this plan.

## Issues Encountered

- **The stale worktree base.** Covered above. Third occurrence in this phase.
- **`grep -c` is doubly unusable here** — the ugrep `$` wrapper plus line-vs-occurrence counting on a single-line bundle. Every gate in this plan ran in node instead, as Plans 01-02 and 01-03 also concluded independently. **Three for three: file-content gates in this repo should be authored as node or vitest assertions, never `grep -c`.**
- **Nothing was blocked and no checkpoint was needed.** Both tasks were `type="auto"`.

## Known Stubs

None introduced. The bundle is a generated artifact whose every code path comes from source verified in waves 1–2.

One pre-existing dead path is now explicitly measured rather than assumed: `injectIframe()` in `app/entry.theme.tsx` is compiled into the bundle but unreachable in production. It is not a stub — it is complete, working code on a path nothing takes — and it is recorded as a Phase 8 deletion candidate above.

## Threat Flags

None. This plan added no network endpoint, no auth path, no file-access pattern, and no schema change. It regenerated a build artifact and edited one documentation file.

Threat register coverage delivered:

| Threat | Disposition | Status after this plan |
|---|---|---|
| **T-1-17** stale-artifact false positive | mitigate | **Mitigated as far as pre-deploy work can go.** Rebuilt, committed, all 8 Gate B markers green on the committed blob, byte count and pre-deploy SHA-256 recorded. Plan 05 closes it against served bytes. |
| **T-1-18** gitignored lockfile vs `npm ci` | mitigate | **Confirmed present** (491 KB, main checkout) and recorded, with the `package-lock.json*` glob subtlety noted. `@vitejs/plugin-react` verified still in `dependencies`. |
| **T-1-19** out-of-scope findings lost | mitigate | Five findings plus the LAUNCH-01 caveat written above for the orchestrator, each with enough detail to act on without re-deriving. |
| **T-1-01** open redirect | mitigate | **Carried toward production, not closed.** The Liquid guard ships via `shopify app deploy` in Plan 05. **The open redirect is still live in production right now**, regardless of this branch's state. |
| **T-1-16** Klaviyo on a PHI page | transfer | Recorded, together with the explicit statement that a green Phase 1 does not clear LAUNCH-01. |
| **T-1-09** `frame-ancestors *` | accept | Recorded as a Phase 8 candidate. |
| **T-1-SC** supply chain | accept | **Zero package installs.** `git diff package.json` empty. Two gitignored files were symlinked, not installed. |

## Self-Check: PASSED

Files verified present on disk:

- `public/quiz-bundle.js` — FOUND (modified, 184236 bytes, sha256 `0c3b652d…`)
- `CLAUDE.md` — FOUND (modified, 8 changed lines)
- `.planning/phases/01-live-defect-fixes/01-04-SUMMARY.md` — FOUND

Commits verified in `git log`: `f1a3ed2`, `7d23483`. Neither deleted a tracked file (`git diff --diff-filter=D HEAD~1 HEAD` empty for both). No untracked files left behind. Working tree clean apart from this summary.

Committed-blob identity verified: `git show HEAD:public/quiz-bundle.js | shasum -a 256` matches the on-disk hash exactly, and Gate B is 8/8 against those bytes.

Shared orchestrator artifacts **not** touched: `.planning/STATE.md` and `.planning/ROADMAP.md` are unmodified, per worktree-mode rules. Waves 1–2 source files are unmodified by this plan — the only tracked changes are the generated bundle and `CLAUDE.md`.

## Next Phase Readiness

**Ready for Plan 05. This was the last fully autonomous gate; everything remaining needs Andrew.**

### What Plan 05 must carry forward

- **Two deploy systems, and both are required.** `fly deploy` ships `/quiz-embed`, `/quiz-bundle-js`, and this bundle. `shopify app deploy` ships `symptom-quiz.liquid` — the parent-side origin guard, `safeUrl`, and the DEF-01 scroll listener. **A `fly deploy` alone leaves the open redirect live**, because the guard is in the Liquid file.
- **The pre-deploy hash is `0c3b652dd1938528988fc7463fd2d3d07042fdf1757e0907f49805359d0fedeb`.** A served hash of `c5520daa26c0741e4e3f57d7f83f69923a368cb0c68045dbf24effa00ecaaa9f` is the stale-artifact failure signature. See the table above for how to read all three outcomes.
- **`/quiz-bundle-js` is `max-age=300` with no ETag.** Allow 5 minutes, or bust the cache, before concluding the served bytes are stale. This is a real false-negative source in a fast verify loop.
- **Do not cite `quiz:scrollToTop` on the served bundle as freshness evidence** — it is green on the stale artifact too (correction 3 above).
- **`git diff --stat package.json` must stay empty** through the deploy.

### Requirements status

- **DEF-01 — complete in source and in the shipping artifact.** The listener is in the Liquid block (Plan 03). Behavioral confirmation is Gate C/F in Plans 05–06.
- **DEF-02 — complete on both halves and now in the committed bundle.** The `path` contract is provably in the artifact (`path:` 0 → 2); the previously-served bundle had no `path` sender at all.
- **DEF-03 — now in the committed bundle.** Both corrected handles present, both misspellings gone.
- **DEF-04 — now in the committed bundle.** Label suffix count 1 → 0.

All four are "complete pending deploy." None is verified against live bytes; that is Plan 05's entire job.

### Carry-forward concerns

- **Gate D still cannot be closed by code.** The live `testOptions` is misconfigured to the consult URL, and `QuizContainer` only falls back to `/pages/test-options` when the setting is **blank**. Human theme-editor action. ROADMAP success criterion #2 fails with a perfect code fix until that one field changes.
- **Both product pickers ship blank and cannot be given a schema default** (Shopify `product` settings reject `default`). Every patient resolves through `product-links.ts` until a human selects products — which is fine, because that map is now correct in the bundle.
- **LAUNCH-01 is untouched and uncleared.** Klaviyo is still on the live page. Do not let a green Phase 1 read as a clean patient-facing page.
- **`injectIframe()`'s unguarded redirect is dead but shipped.** Safe today only because nothing loads the bundle on a parent page. Phase 8 should delete it rather than rely on that invariant holding.

---
*Phase: 01-live-defect-fixes*
*Completed: 2026-07-30*
