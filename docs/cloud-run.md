# Cloud Run cutover runbook

Every gcloud step for moving the quiz app from Fly.io to Cloud Run in AOD's Google Cloud project,
written once so it is repeatable. Plans 08.1-06 through 08.1-13 execute against this file; they do
not re-derive commands. No secret values appear here, and none may be added.

Set once per shell:

> zsh warning: always write `${P}` with braces. Unbraced `$P:us-east1` expands `:u` as an uppercase modifier and breaks the Cloud SQL instance string.

```bash
P=aod-production-510006
REGION=us-east1
RT=quiz-app-runtime@${P}.iam.gserviceaccount.com
BUILD=quiz-app-build@${P}.iam.gserviceaccount.com
```

## 1. Resource names

| Thing | Value |
|---|---|
| Project | `aod-production-510006` (number `502519175239`) |
| Region | `us-east1` |
| Cloud SQL instance | `aod-quiz-db` (connection name `aod-production-510006:us-east1:aod-quiz-db`) |
| Databases | `alledrops_quiz` (PHI), `shopify_sessions` (Prisma sessions) |
| DB roles | `alledrops_app` (PHI runtime), `sessions_app` (sessions runtime), built-in `postgres` (owner, migrations, e2e cleanup) |
| Service accounts | `quiz-app-runtime`, `quiz-app-build` |
| Bucket | `aod-quiz-uploads-prod` |
| Secrets | `quiz-database-url`, `quiz-session-database-url`, `shopify-api-secret`, `shopify-admin-access-token`, `quiz-db-owner-password` (Andrew-only) |
| Cloud Run service | `alle-drops-quiz-app` |
| Expected URL | `https://alle-drops-quiz-app-502519175239.us-east1.run.app` (read the real one from `status.url` after first deploy) |

## 2. Preconditions

- Robert has granted andrew@21adsmedia.com a project-only exception on `aod-production-510006` (D-06).
  Nothing below runs before that.
- Effective org policies have been read and recorded (08.1-05 Task 2). If `sql.restrictPublicIp` is
  enforced, switch to private IP plus Direct VPC egress. If `gcp.resourceLocations` excludes
  `us-east1`, stop and ask.
- Do NOT use the "Set Up Foundation" wizard in the console (D-04). It creates org-level structure
  this project does not want. Everything is built with the commands below.
- No service-account keys, ever (D-03). Cloud Run uses the metadata server; local dev uses
  impersonation.
- Deploy only from a clean checkout of merged `main`. `gcloud run deploy --source` ships the working
  tree, so a feature branch or dirty tree would ship unreviewed code to a PHI service:

```bash
git fetch origin && git worktree add ../alle-drops-deploy origin/main
cd ../alle-drops-deploy && git status --short   # must print nothing
```

## 3. Enable APIs

```bash
gcloud services enable run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com iamcredentials.googleapis.com \
  --project=${P}
```

Verify: `gcloud services list --enabled --project=${P} --filter="name:(run OR sqladmin OR secretmanager OR artifactregistry OR cloudbuild OR iamcredentials)" --format="value(name)"` lists all six.

## 4. Service accounts and IAM

```bash
gcloud iam service-accounts create quiz-app-runtime --project=${P}
gcloud iam service-accounts create quiz-app-build   --project=${P}

# Runtime: Cloud SQL socket
gcloud projects add-iam-policy-binding ${P} --member=serviceAccount:${RT} --role=roles/cloudsql.client

# Runtime: sign GCS URLs with no key. Resource-level binding on itself, NOT project-wide.
gcloud iam service-accounts add-iam-policy-binding ${RT} --project=${P} \
  --member=serviceAccount:${RT} --role=roles/iam.serviceAccountTokenCreator

# Build SA
gcloud projects add-iam-policy-binding ${P} --member=serviceAccount:${BUILD} --role=roles/run.builder
```

Bucket and secret bindings are added in sections 7 and 8. Rules:

- `roles/storage.objectAdmin` goes on the bucket only, never the project.
- `roles/secretmanager.secretAccessor` goes per runtime secret only. The runtime SA never gets access
  to `quiz-db-owner-password`.
- The build SA starts with `roles/run.builder` only. Add `artifactregistry.writer`,
  `logging.logWriter` or staging-bucket roles only if a build error names the missing role, and record
  the final set here.
- Read back: `gcloud projects get-iam-policy ${P} --flatten=bindings --filter="bindings.members:${RT}" --format="value(bindings.role)"`.

## 5. Cloud SQL instance (D-02)

```bash
gcloud sql instances create aod-quiz-db --project=${P} --region=${REGION} \
  --database-version=POSTGRES_18 --edition=enterprise --tier=db-g1-small \
  --availability-type=zonal --storage-type=SSD --storage-size=10 --storage-auto-increase \
  --backup-start-time=07:00 --retained-backups-count=14 \
  --enable-point-in-time-recovery --retained-transaction-log-days=7 \
  --deletion-protection --ssl-mode=ENCRYPTED_ONLY \
  --server-ca-mode=GOOGLE_MANAGED_INTERNAL_CA
```

- If shared-core rejects POSTGRES_18, drop `--tier` and use `--cpu=1 --memory=3840MiB`.
- The instance has a public IPv4 with ZERO authorized networks. Access is the Cloud Run connector
  (IAM) and the local Cloud SQL Auth Proxy (IAM). The old Fly egress allow-list does not carry over.
- Read back, expecting `ENTERPRISE True True` and empty authorized networks:

```bash
gcloud sql instances describe aod-quiz-db --project=${P} \
  --format='value(settings.edition,settings.backupConfiguration.enabled,settings.backupConfiguration.pointInTimeRecoveryEnabled,settings.ipConfiguration.sslMode,settings.ipConfiguration.authorizedNetworks,settings.deletionProtectionEnabled)'
```

## 6. Roles, databases, migrations

Passwords are alphanumeric (URL-safe), generated inside one shell command and piped straight into
Secret Manager. They are never echoed, never in shell history, never in a file:

```bash
gen() { openssl rand -base64 48 | tr -dc A-Za-z0-9 | head -c 40; }

# Owner password: Andrew-only secret, then set on the built-in postgres user
PW=$(gen); printf %s "$PW" | gcloud secrets create quiz-db-owner-password --project=${P} --data-file=-
gcloud sql users set-password postgres --instance=aod-quiz-db --project=${P} --password="$PW"; unset PW

# App roles: create with a generated password and store the full URL secret in the same step
# (section 7 gives the URL shapes). Do this inside one command so the password never prints.
gcloud sql databases create alledrops_quiz   --instance=aod-quiz-db --project=${P}
gcloud sql databases create shopify_sessions --instance=aod-quiz-db --project=${P}
gcloud sql users create alledrops_app --instance=aod-quiz-db --project=${P} --password="$(gen)"
gcloud sql users create sessions_app  --instance=aod-quiz-db --project=${P} --password="$(gen)"
```

Passwords for the two app roles must be known to build the secret URLs; generate them into a variable
within the same shell command that creates the secret, then `unset` it. Rotate with
`gcloud sql users set-password` plus a new secret version if the sequence is interrupted.

Open the proxy, then run SQL as `postgres` (password read from `quiz-db-owner-password` by Andrew):

```bash
cloud-sql-proxy --port 5436 aod-production-510006:us-east1:aod-quiz-db
```

Role hygiene (gcloud-created users join `cloudsqlsuperuser`, which is far too much):

```sql
REVOKE cloudsqlsuperuser FROM alledrops_app;
REVOKE cloudsqlsuperuser FROM sessions_app;

REVOKE CONNECT ON DATABASE alledrops_quiz   FROM PUBLIC;
REVOKE CONNECT ON DATABASE shopify_sessions FROM PUBLIC;
GRANT  CONNECT ON DATABASE alledrops_quiz   TO alledrops_app;
GRANT  CONNECT ON DATABASE shopify_sessions TO sessions_app;
```

Gate: `SELECT rolname FROM pg_roles WHERE pg_has_role(rolname, 'cloudsqlsuperuser', 'member');` must not
list either app role.

`sessions_app` may create objects in the `shopify_sessions` `public` schema only (connect to that
database and `GRANT USAGE, CREATE ON SCHEMA public TO sessions_app;`). It has no access to
`alledrops_quiz`.

Migrations 001..005 run once against `alledrops_quiz`, as `postgres`, so every object has one owner
and `alledrops_app` stays least-privilege (the roles must exist first because 001/002/004 GRANT to
`alledrops_app`):

```bash
for f in migrations/00{1,2,3,4,5}_*.sql; do
  psql -1 -v ON_ERROR_STOP=1 "host=127.0.0.1 port=5436 dbname=alledrops_quiz user=postgres sslmode=disable" -f "$f"
done
```

003 and 005 carry populated-database warnings (pre-backup, confirm constraint name). On this empty
fresh database, record that they ran on an empty DB and verify by query: `\d submissions`, the CHECK
is the five-value bracket set, `submission_files` exists, grants match.

Prisma sessions: run `npx prisma migrate deploy` once through the proxy as `sessions_app` (set
`SESSION_DATABASE_URL` for that shell). Never run it at container start; the container CMD is
`npm run start`.

Connection budget: run `SHOW max_connections;`. The app can open pool max 5 x max-instances 3 = 15
PHI connections plus Prisma `connection_limit` 2 x 3 = 6 session connections, 21 total. Lower
`--max-instances` or the pool size if the tier allows fewer.

## 7. Secrets

URL shapes (socket form, so the connector provides the encryption; never add `sslmode` to a socket
URL because a URL-derived value overrides the code's ssl setting):

```
quiz-database-url:         postgresql://alledrops_app:<PW>@localhost/alledrops_quiz?host=/cloudsql/aod-production-510006:us-east1:aod-quiz-db
quiz-session-database-url: postgresql://sessions_app:<PW>@localhost/shopify_sessions?host=/cloudsql/aod-production-510006:us-east1:aod-quiz-db&connection_limit=2
```

Create every secret from stdin, never from an argument:

```bash
printf %s "$VALUE" | gcloud secrets create quiz-database-url --project=${P} --data-file=-
```

`shopify-api-secret` and `shopify-admin-access-token` values come from the Fly app / Dev Dashboard,
read by Andrew; they are never printed into a transcript. Grant the runtime SA access per secret:

```bash
for S in quiz-database-url quiz-session-database-url shopify-api-secret shopify-admin-access-token; do
  gcloud secrets add-iam-policy-binding $S --project=${P} \
    --member=serviceAccount:${RT} --role=roles/secretmanager.secretAccessor
done
```

`quiz-db-owner-password` gets no runtime binding.

## 8. Bucket

```bash
gcloud storage buckets create gs://aod-quiz-uploads-prod --project=${P} --location=${REGION} \
  --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://aod-quiz-uploads-prod --lifecycle-file=lifecycle.json
gcloud storage buckets add-iam-policy-binding gs://aod-quiz-uploads-prod \
  --member=serviceAccount:${RT} --role=roles/storage.objectAdmin
```

- Keep the default 7-day soft-delete (Claude's discretion, confirmed with Andrew at 08.1-05). It
  preserves accidental-delete recovery for clinical files that carry a 6-year retention rule, and it is
  inside the BAA. Orphaned `pending/` PHI therefore lingers up to 7 days after its lifecycle delete.
- `lifecycle.json` is the rule in `docs/gcs-lifecycle-and-retention.md`: `pending/` prefix, age 2
  days, action Delete. Never touch `submissions/`.
- No retention policy or lock (it would block the lifecycle delete and the promote step's delete).
- No CORS: downloads are server-issued navigations, never browser `fetch()`.
- Read back: `gcloud storage buckets describe gs://aod-quiz-uploads-prod --format="yaml(uniform_bucket_level_access,public_access_prevention,soft_delete_policy,lifecycle_config)"`.

## 9. Deploy

Plain env goes through a file because `SCOPES` contains a comma. `env.yaml` (not committed):

```yaml
SHOPIFY_APP_URL: "https://alle-drops-quiz-app-502519175239.us-east1.run.app"
SCOPES: "read_customers,write_customers"
SHOPIFY_API_KEY: "1af0c030f06eea4b8b46d3c006f431d3"
SHOPIFY_SHOP_DOMAIN: "allergist-on-demand.myshopify.com"
GCS_BUCKET_NAME: "aod-quiz-uploads-prod"
GCS_PROJECT_ID: "aod-production-510006"
```

```bash
gcloud run deploy alle-drops-quiz-app --project=${P} --region=${REGION} --source=. \
  --build-service-account=projects/${P}/serviceAccounts/${BUILD} \
  --service-account=${RT} \
  --add-cloudsql-instances=${P}:${REGION}:aod-quiz-db \
  --port=8080 --cpu=1 --memory=2Gi --cpu-boost --concurrency=8 --timeout=120 \
  --min-instances=1 --max-instances=3 --ingress=all --no-invoker-iam-check \
  --env-vars-file=env.yaml \
  --set-secrets=DATABASE_URL=quiz-database-url:latest,SESSION_DATABASE_URL=quiz-session-database-url:latest,SHOPIFY_API_SECRET=shopify-api-secret:latest,SHOPIFY_ADMIN_ACCESS_TOKEN=shopify-admin-access-token:latest
```

`--no-invoker-iam-check` is the documented public path when the org restricts `allUsers`. Protection
is per-route app auth (customer JWT with ownership check, Shopify admin session, webhook HMAC), the
`max-instances` cap, and the CSP on `/quiz-embed`. There is no rate limiting in this repo; that is a
follow-up, not part of this phase.

Read back, do not trust exit codes:

```bash
gcloud run services describe alle-drops-quiz-app --region=${REGION} --project=${P} \
  --format='yaml(spec.template.spec.serviceAccountName,spec.template.metadata.annotations,status.url)'
gcloud run services describe alle-drops-quiz-app --region=${REGION} --project=${P} --format=json | grep -c "_SA_KEY"   # must be 0 (no key env var)
curl -sI "$URL/health"; curl -sI "$URL/quiz-embed" | grep -i content-security-policy
```

Also confirm the built image contains no `.env`.

Rollback (traffic only, instant):

```bash
gcloud run revisions list --service=alle-drops-quiz-app --region=${REGION} --project=${P}
gcloud run services update-traffic alle-drops-quiz-app --region=${REGION} --project=${P} --to-revisions=PREV=100
```

## 10. Logging exclusion (D-09)

Cloud Run request logs record the full URL, and the customer-account extension links carry
`?token=<customer JWT>`. `react-router-serve` also writes request URLs to stdout via morgan, so both
payload shapes need excluding:

```bash
gcloud logging sinks update _Default --project=${P} \
  --add-exclusion=name=exclude-token-urls,filter='httpRequest.requestUrl:"token=" OR textPayload:"token="'
```

Verify after a request with a dummy token:

```bash
gcloud logging read 'httpRequest.requestUrl:"token=" OR textPayload:"token="' --project=${P} --freshness=1h --limit=1
```

Expected: no output. Follow-up (separate issue): switch the extension to an Authorization header so
tokens never travel in URLs.

## 11. URL-swap checklist (re-runnable at LAUNCH-07)

Run this once for the `run.app` URL and again when the custom domain lands. Change every item, then
run the served-byte and behavioral checks.

1. `shopify.app.alledrops-production.toml` (canonical, the one deployed): `application_url` and the 3
   `redirect_urls`.
2. `shopify.app.toml`: same values, kept in sync (two files share one `client_id`).
3. `extensions/quiz-block/blocks/symptom-quiz.liquid`: the blank-fallback URL (about line 51) and the
   `app_url` setting default plus its info text (about line 207).
4. `extensions/quiz-history/src/QuizHistoryBlock.jsx`: `APP_BASE` (formerly `FLY_BASE`).
5. Theme repo `allergist-on-demand`: `templates/page.quiz.json` saved `app_url`. This is the real
   storefront switch and a third deploy system.
6. `SHOPIFY_APP_URL` in `env.yaml`, then redeploy.
7. `CLAUDE.md` and `README.md` examples.

Deploy with `shopify app deploy --config alledrops-production` and `shopify app deploy`, then confirm
in Dev Dashboard that the live version shows the new URLs.

Checks:

- Served bytes: `curl -s "$URL/quiz-bundle.js" | grep -c "fly.dev"` is 0, and the liquid block output
  contains the new origin.
- Behavioral: the quiz iframe scrolls and navigates (a stale `app_url` silently stops both), both
  product-page checkbox blocks render, and the customer-account extension reaches the new origin in a
  real customer session (`curl` cannot prove this).
- Open the embedded admin once so a fresh offline session is token-exchanged (the session table starts
  empty after cutover).

## 12. Retirement (order matters)

1. Gate: LAUNCH-04 e2e passes (`scripts/e2e-test.ts`), the storefront embed is served from Cloud Run,
   and quiz-history is verified in a real customer account. Remove the promoted test objects the
   script prints (`gcloud storage rm -r gs://aod-quiz-uploads-prod/submissions/<id>/`).
2. `fly scale count 0 -a alle-drops-quiz-app`. Reversible. Leave 3 to 7 days.
3. Only after the Shopify store transfer to hostmaster@alledrops.com is accepted and the
   app-installed check passes: `fly apps destroy alle-drops-quiz-app`, then destroy the Tigris
   (Litestream) bucket. Verify `fly apps list` no longer shows it.
4. Dev-project hygiene (D-08). The 21 ads project `alledrops-quiz` is kept as the dev environment,
   test data only, no PHI:
   - rotate the dev DB passwords (the old Fly image carried `.env`);
   - delete the user-managed service-account key (`gcloud iam service-accounts keys list` then
     `delete`; docs/gcs-credentials.md says it never expires);
   - remove the Fly egress authorized network `216.246.40.114/32` from `alledrops-quiz-data`.
5. Repo cleanup: delete `fly.toml`, `dbsetup.js`, `litestream.yml`; update `CLAUDE.md`.
6. Access hygiene: reduce Andrew's roles on `aod-production-510006` to deploy-only (no DB password,
   no accessor on DB secrets), per Playbook Part E.5.
