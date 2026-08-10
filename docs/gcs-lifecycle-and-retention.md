# GCS Lifecycle and Retention — AlleDrops Upload Bucket

**Plan:** 04-17 · **Applied:** 2026-08-10 · **Bucket/project identity source:** `GCS_BUCKET_NAME` /
`GCS_PROJECT_ID` (Fly secrets), never hardcoded in application source — see
`app/lib/storage/gcs.ts`'s own header comment. This document names the specific dev values in
effect at the time this plan ran (below), but every value here traces back to those two env vars,
not to a literal string in code.

- Bucket: the value of `GCS_BUCKET_NAME` (dev: `alledrops-quiz-uploads-dev`)
- Project: the value of `GCS_PROJECT_ID` (dev: `alledrops-quiz`)
- Staging prefix: `GCS_PENDING_PREFIX` = `"pending/"` (`app/lib/storage/gcs.ts`)
- Permanent prefix: `GCS_PERMANENT_PREFIX` = `"submissions/"` (`app/lib/storage/gcs.ts`)
- Orphan-cleanup age: `PENDING_OLM_AGE_DAYS` = `2` (04-UPLOAD-DECISIONS.md §Ratified)

---

## The applied lifecycle rule

Applied via `gcloud storage buckets update gs://alledrops-quiz-uploads-dev --lifecycle-file=...`
and read back verbatim via `gcloud storage buckets describe gs://alledrops-quiz-uploads-dev
--project=alledrops-quiz --format=json` immediately afterward (not trusted from the update
command's own exit code):

```json
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "age": 2,
        "matchesPrefix": [
          "pending/"
        ]
      }
    }
  ]
}
```

**Exactly one rule.** `matchesPrefix` is `["pending/"]` only. No bucket-wide rule. No rule naming
or otherwise able to reach `submissions/`.

---

## Probe procedure — proving the scoping empirically (Assumption A4)

Documentation is not evidence. Three probe objects were written to the real bucket, evaluated
against the rule's own conditions, and then deleted:

| Probe object | Prefix it lives under | `matchesPrefix: ["pending/"]`? | Reasoning |
|---|---|---|---|
| `pending/probe-ca070f6f-94fd-43fc-878c-b533aa575914/probe.txt` | `pending/` | **Match** | Object name starts with the literal string `pending/`, which is exactly what GCS OLM's `matchesPrefix` condition tests (a plain string-prefix match on the full object name, not a path-segment or regex match). |
| `submissions/probe-ca070f6f-94fd-43fc-878c-b533aa575914/probe.txt` | `submissions/` | **No match** | Object name starts with `submissions/`, not `pending/`. `matchesPrefix` requires the object name to literally begin with one of the listed strings; `submissions/` and `pending/` share no common prefix at position 0, so this condition cannot evaluate true for any object under `submissions/`, present or future. |
| `root-probe-ca070f6f-94fd-43fc-878c-b533aa575914.txt` | bucket root (no prefix) | **No match** | Object name starts with `root-probe-`, not `pending/`. Same reasoning as above — a bucket-root object with no `pending/` prefix cannot match. |

All three probes were confirmed created (`gcloud storage objects describe`, each returning its
object name) and then deleted (`gcloud storage rm`), with deletion confirmed by re-listing the
bucket for the probe UUID and finding zero matches. The probes were never live long enough, nor
did this session wait long enough, to observe OLM's own deletion of the `pending/` probe — see
the timing caveat immediately below. This procedure proves the rule's **condition matching**, not
an end-to-end OLM deletion.

### Why `submissions/` cannot match, restated plainly

GCS's `matchesPrefix` lifecycle condition is a literal string-prefix test against the object's
full name. `"submissions/"` and `"pending/"` are disjoint strings at their very first character
(`s` vs `p`). There is no object name that begins with `submissions/` and also begins with
`pending/` — the two prefixes are mutually exclusive by construction. This is not a probabilistic
or best-effort guarantee; it is a structural property of how the two prefixes are named, verified
against a real applied rule and real objects in this bucket rather than assumed from documentation
alone.

### Timing caveat — OLM evaluation is not real-time

Google's own documentation describes OLM rule evaluation as running roughly once per day, not
continuously. A same-session write-then-check cannot observe deletion happening, because the
nightly evaluation pass had no opportunity to run inside this session's timeframe. This document
does **not** claim end-to-end deletion was observed — only that the rule's conditions were applied,
read back from the API, and evaluated by hand against three real object names. If anyone needs
end-to-end confirmation later, it requires waiting at least 2 days (`PENDING_OLM_AGE_DAYS`) plus
one OLM evaluation cycle past that, then re-listing `pending/` for the aged-out probe.

---

## Retention reconciliation

- **`pending/` objects are transient.** They exist only between an upload POST
  (`api.quiz.upload.tsx`) and either (a) promotion to `submissions/` at terminal submit
  (`api.quiz.submit.tsx` step 3.5, plan 04-17) or (b) automatic deletion by this OLM rule after
  `PENDING_OLM_AGE_DAYS`. Neither outcome requires manual cleanup.

- **`submissions/` objects are permanent clinical records carrying a 6-year HIPAA retention
  obligation.** They MUST NEVER have a delete rule, a TTL, an OLM condition, or any other
  automated cleanup applied — not now, not as a "simplify the bucket" refactor later, not as a
  cost-optimization pass. `deleteObject()` in `app/lib/storage/gcs.ts` has no built-in prefix
  guard of its own; the only sanctioned caller (this plan's promotion step) never holds a
  `submissions/` key at the point it calls delete — it only ever deletes the `pending/` key it
  just read the file out of. Any future caller of `deleteObject` must preserve that invariant by
  construction, not by convention.

- **This directly reconciles with `docs/breach-response-runbook.md`**, whose Step 1 contains the
  standing instruction "**Do not delete data.** HIPAA requires a 6-year retention minimum." A
  bucket-wide (or `submissions/`-scoped) lifecycle rule would violate that runbook's own
  contain-and-preserve posture during exactly the scenario it exists for — an active incident —
  in addition to violating the retention obligation on its own, unconditionally. **Adding a
  bucket-wide lifecycle rule later would violate both** the 6-year retention obligation and the
  breach-response-runbook's never-delete-during-incident-response rule. This document is the place
  that says so plainly, for whoever next edits this bucket's lifecycle configuration.

---

## Orphan sources this rule cleans up

Two distinct patient paths leave a `pending/` object with no corresponding `submissions/`
promotion, both of which the OLM rule (not application code) reclaims:

1. **Abandonment before submit.** A patient uploads one or more test-result files via
   `POST /api/quiz/upload` (staging them under `pending/{token}/`) and then never completes the
   quiz — closes the tab, drops off, or never reaches the terminal `POST /api/quiz/submit`. The
   staged objects have no `answers.testing_files` array that will ever reference them again.

2. **`had_testing` → `needs_testing` flip before submit.** Plan 04-16's file_multi widget retains
   local upload state at the `QuizPartRenderer` level so it survives a `testing_status` flip away
   and back within the same mounted part. If a patient uploads files while `had_testing` is
   selected, then changes their answer to `needs_testing` before the final submit, the
   `testing_files` question is no longer part of the answered/required path and its tokens are
   dropped from the final payload — but the objects were already staged under `pending/` during
   the upload POST. Same orphan outcome as (1), different patient path to get there.

Both sources are expected, known, and handled the same way: the `pending/` OLM rule deletes the
orphaned object after `PENDING_OLM_AGE_DAYS` with no application code needing to track or clean
either case explicitly.

---

## Reconciliation query — detecting a partial promotion (plan 04-17 Task 1's failure policy)

Task 1's promotion step treats the submission as authoritative: if a GCS copy, the
`insertSubmissionFiles` transaction, or a staged-object delete fails partway through, the route
still returns success rather than failing the patient's completed intake. That failure policy
trades an invisible, rare partial-linkage state for never losing a submission. This is the query
that finds that state when it happens:

1. **A promoted GCS object with no `submission_files` row.** List objects under
   `submissions/{id}/` for a given submission id and compare against
   `SELECT storage_object_key FROM submission_files WHERE submission_id = $1`. Any object present
   in the bucket listing but absent from the query result was copied but never linked (the
   `copyObject` succeeded, then `insertSubmissionFiles` never ran or rejected).

2. **A `submission_files` row whose object is missing at the permanent key.** For each
   `storage_object_key` returned by
   `SELECT storage_object_key FROM submission_files WHERE submission_id = $1`, confirm the object
   exists at that key in the bucket. A row with no matching object means the DB insert committed
   but the copy that should have preceded it did not survive to be readable at that path (a rarer
   ordering, since the code only inserts rows for copies that already resolved, but still worth
   including for defense-in-depth — e.g. an out-of-band deletion).

This is a **manual check today** — there is no scheduled job or admin-surface report running
either query. It is a **Phase 8 automation candidate**: a periodic reconciliation script (or an
admin-dashboard panel) that runs both comparisons across all submissions with a non-empty
`answers_json.testing_files` and flags any mismatch for manual review, rather than requiring
someone to run the SQL/`gcloud storage ls` pair by hand.

---

## Cutover note — AOD's own GCP project

This dev lifecycle rule lives on `alledrops-quiz-uploads-dev` in Andrew's `alledrops-quiz` project
per the interim dev-storage decision (04-UPLOAD-DECISIONS.md §Ratified item 2) — it is not
production-ready storage and no real patient PHI may transit it until Blockers 2 (Fly.io BAA) and
3 (AOD GCP project cutover) both clear in Phase 8.

**When the cutover happens, this exact rule — one Delete action, `condition: { age:
PENDING_OLM_AGE_DAYS, matchesPrefix: ["pending/"] }`, and nothing else — must be re-applied to the
new bucket in AOD's own BAA-covered GCP project.** The cutover is **not complete** until the probe
procedure above (three probe objects, read-back JSON, deletion confirmation) is repeated against
that new bucket. Do not assume the rule carries over automatically — GCS lifecycle configuration
is per-bucket, and a freshly created production bucket starts with no lifecycle rules at all,
which would silently reintroduce the orphan-accumulation problem this document exists to close.
