# Local development database

How to reach Cloud SQL from a developer laptop, and the two traps that have cost this project
multiple sessions.

## Quick start

```bash
# 1. proxy — leave running in its own terminal
cloud-sql-proxy --port 5436 alledrops-quiz:us-east1:alledrops-quiz-data

# 2. app
SHOPIFY_APP_URL=http://localhost:3000 npx react-router dev
```

`.env` needs:

```
DATABASE_URL="postgresql://alledrops_dev:<password>@127.0.0.1:5436/alledrops_quiz_dev?sslmode=disable"
```

`sslmode=disable` is correct here — the proxy terminates TLS to Cloud SQL. It is **not** the same as
Fly's connection string, which goes to the public IP with `sslmode=no-verify`.

## Trap 1: port 5433 belongs to something else

Older docs said to run the proxy on 5433. **That port is occupied by `fieldflow-sync-db`, an
unrelated project's `postgres:16` container.** Connecting to it produces:

```
error: password authentication failed for user "alledrops_app"   (code 28P01)
```

which reads as a credential problem and is actually a *wrong database* — `alledrops_app` simply does
not exist over there. Session 33 recorded it as "the local DATABASE_URL password is stale," and
session 34 inherited that. Session 35 found the container.

An older workaround said Docker only binds `::1:5433` so `127.0.0.1` avoids it. **No longer true** —
the current container binds `0.0.0.0:5433` and `[::]:5433`. Use 5436.

Before assuming any port is free:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
lsof -nP -iTCP:5436 -sTCP:LISTEN
```

**Do not stop other projects' containers to reclaim a port.** Move the proxy instead.

## Trap 2: the proxy authenticates with ADC, and ADC may be impersonating

`cloud-sql-proxy` uses Application Default Credentials. If ADC is set to impersonate the GCS service
account (see `docs/gcs-credentials.md` — that is the supported local setup for signed URLs), the
proxy authenticates as that service account, not as you. It needs:

```
roles/cloudsql.client   on project alledrops-quiz
```

Without it the proxy starts fine and then fails per connection with:

```
googleapi: Error 403: ... missing permission cloudsql.instances.get
```

That grant exists today on `alledrops-quiz-app@alledrops-quiz.iam.gserviceaccount.com`. It is a
**local-dev convenience only** — the Fly app reaches Cloud SQL over the public IP with a password
and does not use the proxy or this role. Do not replicate it in AOD's project at cutover.

## Database roles

| Role | Used by | Privileges |
|---|---|---|
| `alledrops_app` | Fly runtime | owner of `submissions`; full DDL |
| `alledrops_dev` | local development | SELECT/INSERT/UPDATE/DELETE on `submissions` and `submission_access_log`; **no DDL, no ownership** |
| `postgres` | admin only | `cloudsqlsuperuser`; owns `submission_access_log` |

`alledrops_dev` exists so local work can never disturb the credential Fly is running on. Resetting
`alledrops_app`'s password would fix a laptop and simultaneously break the deployed machine until it
was redeployed with a matching secret.

The role cannot run migrations — that is deliberate. Run DDL as `alledrops_app` or `postgres`, per
the migration discipline in `CLAUDE.md` (migrations are committed alone and executed only after the
app code that tolerates them is confirmed live).

### Recreating or rotating `alledrops_dev`

Cloud SQL's `postgres` is `cloudsqlsuperuser`, not a true superuser, so it **cannot** grant on tables
owned by `alledrops_app`. Become a member of that role first — this is the step that fails if you
skip it:

```sql
GRANT alledrops_app TO postgres;
SET ROLE alledrops_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO alledrops_dev;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alledrops_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO alledrops_dev;
RESET ROLE;
GRANT USAGE ON SCHEMA public TO alledrops_dev;
```

`submission_access_log` is owned by `postgres`, so it is granted separately, outside the `SET ROLE`.
The `ALTER DEFAULT PRIVILEGES` lines matter for migration 004's `submission_files` table — without
them the new table would be invisible to `alledrops_dev` the moment it is created.

Reset the admin password with
`gcloud sql users set-password postgres --instance=alledrops-quiz-data --project=alledrops-quiz`.

## PHI discipline

`submissions` is the PHI table. `CLAUDE.md:139` permits **ids and counts only** in any output an
agent produces — never a field value, never `SELECT *`. A local UAT run writes a real row; clean up
test rows by `patient_email` when finished.

Baseline as of 2026-08-10: **42 rows**.

## Related

- `docs/gcs-credentials.md` — the GCS credential story, including the ADC impersonation this depends on
- `HANDOFF.md` — session history, including the retracted stale-password diagnosis
- `scripts/e2e-test.ts` — bracket suite; expects the proxy and a working `DATABASE_URL`
