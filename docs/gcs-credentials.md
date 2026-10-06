# GCS runtime credentials

How the app authenticates to Google Cloud Storage for uploaded test-result files (PHI).

## Production (Cloud Run, aod-production-510006)

No key file. `app/lib/storage/gcs.ts` calls `new Storage({ projectId })` and the client uses
**Application Default Credentials**, which on Cloud Run come from the metadata server as the runtime
service account `quiz-app-runtime`. That account has object access on `gs://aod-quiz-uploads-prod`
only. There is nothing to mint, store or rotate. Setup is in `docs/cloud-run.md`.

## Local development (alledrops-quiz, test data only)

ADC from your own `gcloud` login, impersonating the dev service account:

```bash
gcloud auth application-default login \
  --impersonate-service-account=alledrops-quiz-app@alledrops-quiz.iam.gserviceaccount.com
```

| | |
|---|---|
| Service account | `alledrops-quiz-app@alledrops-quiz.iam.gserviceaccount.com` (kept; impersonated, no key) |
| Role | `roles/storage.objectAdmin` on `gs://alledrops-quiz-uploads-dev` **only** |
| Env | `GCS_BUCKET_NAME`, `GCS_PROJECT_ID` |

`objectAdmin` includes delete, which the promotion step needs (GCS has no atomic rename; promotion
is copy-then-delete out of `pending/`).

## History

The app used to run on Fly.io, which has no Google metadata server, so it carried a long-lived
service-account key in a Fly secret. Fly was destroyed on 2026-10-06 (phase 08.1-13). The
non-expiring dev key was deleted the same day. Do not create service-account keys again; use the
runtime service account in production and impersonation locally.

## Verifying it works

`tests/storage-gcs.test.ts` covers the client wiring against a mocked client. To prove a credential,
run a live round trip, paired with a control run under an isolated `HOME` that must fail with
`Could not load the default credentials`. Without the control, a passing run may only prove that
your laptop's `gcloud` session works.

## Related

- `docs/cloud-run.md`: production infra, runtime service account, bucket setup
- `docs/gcs-lifecycle-and-retention.md`: `pending/` expiry and the 6-year retention rule
- `.planning/phases/04-mandatory-allergy-testing/04-UPLOAD-DECISIONS.md`: upload architecture
