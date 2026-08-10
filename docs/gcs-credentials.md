# GCS runtime credentials

How the Fly app authenticates to Google Cloud Storage for uploaded test-result files (PHI).

## The problem this solves

`app/lib/storage/gcs.ts` used to call `new Storage({ projectId })` with no credential. That relies on
**Application Default Credentials (ADC)**, which searches three places in order:

1. A key file named by `GOOGLE_APPLICATION_CREDENTIALS`
2. Local `gcloud` user credentials (`~/.config/gcloud/application_default_credentials.json`)
3. The GCE/Cloud Run **metadata server** at `169.254.169.254`

A Fly.io VM satisfies none of them — Fly is not Google infrastructure, so there is no metadata
server to ask. The result was that every GCS call worked on a developer laptop (via #2) and returned
**500 in production**. Discovered by plan 04-13, confirmed by 04-17, left unowned by any plan.

The fix is to pass the credential explicitly. `GCP_SA_KEY` holds a full service-account key
document; when it is absent the module falls back to ADC so local development and tests still work
without minting a key per machine.

## Current dev setup

| | |
|---|---|
| Service account | `alledrops-quiz-app@alledrops-quiz.iam.gserviceaccount.com` |
| Role | `roles/storage.objectAdmin` on `gs://alledrops-quiz-uploads-dev` **only** — not project-wide |
| Fly secret | `GCP_SA_KEY` (full JSON key document, one line) |
| Companion secrets | `GCS_BUCKET_NAME`, `GCS_PROJECT_ID` |

`objectAdmin` includes delete, which the promotion step needs (GCS has no atomic rename — promotion
is copy-then-delete out of `pending/`). The consequence is that a leaked key could delete
permanently-retained `submissions/` objects. Accepted for dev; revisit at cutover.

## Creating or rotating the key

```bash
PROJECT=alledrops-quiz
SA=alledrops-quiz-app@${PROJECT}.iam.gserviceaccount.com

# 1. mint into a temp dir — never the repo, never $HOME
gcloud iam service-accounts keys create /tmp/gcp-sa-key.json \
  --iam-account="$SA" --project="$PROJECT"

# 2. push to Fly via stdin so the key never lands on a command line or in shell history
python3 -c "
import json
print('GCP_SA_KEY=' + json.dumps(json.load(open('/tmp/gcp-sa-key.json')), separators=(',',':')))
" | fly secrets import -a alle-drops-quiz-app

# 3. shred the local copy
rm -P /tmp/gcp-sa-key.json

# 4. after confirming the new key works, delete the old one
gcloud iam service-accounts keys list --iam-account="$SA" --project="$PROJECT" --managed-by=user
gcloud iam service-accounts keys delete <OLD_KEY_ID> --iam-account="$SA" --project="$PROJECT"
```

Add `--stage` to `fly secrets import` to stage without restarting the machines.

**The key does not expire** (`EXPIRES_AT: 9999-12-31`). Rotation is a manual task with no automatic
reminder. Rotate on any suspected exposure, and at the cutover regardless.

## Verifying it works

`tests/storage-gcs.test.ts` covers both credential branches against a mocked client. That proves the
wiring, not the credential. To prove the credential itself, run a live round trip with `GCP_SA_KEY`
set and ADC suppressed — and pair it with a control run that omits the key under an isolated `HOME`,
which must fail with `Could not load the default credentials`. Without the paired control, a passing
run may only be proving that your laptop's `gcloud` session works.

## At the AOD cutover

This is a **config change, not a code change** — the whole reason bucket, project, and credential all
come from environment variables:

1. Create the bucket and a service account in AOD's own BAA-covered GCP project
2. Repoint `GCS_BUCKET_NAME` / `GCS_PROJECT_ID` / `GCP_SA_KEY` at it
3. Delete the `alledrops-quiz` service account and its key

Consider **Workload Identity Federation** instead of a long-lived key at that point. It removes the
private key entirely in exchange for more setup — worth doing once against AOD's project rather than
twice. It was not done for dev because the key is throwaway and WIF setup would be discarded at
cutover.

**No real patient PHI may transit this path until the Fly.io BAA is signed and the GCP cutover is
complete.** Both are Phase 8 gates. `gs://alledrops-quiz-uploads-dev` lives in Andrew's personal dev
project and is not BAA-covered.

## Related

- `docs/gcs-lifecycle-and-retention.md` — `pending/` expiry and the 6-year retention rule
- `.planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md` — upload architecture
