# Fly.io Migration Guide

## Current Setup

- **Database**: SQLite (file-based)
- **Volumes**: Required (stores SQLite database file at `/data/dev.sqlite`)
- **Machines**: Currently single machine (min_machines_running = 0)
- **Organization**: Personal account

## ⚠️ Important: SQLite + Multiple Machines

**SQLite does NOT work well with multiple machines** because:
- Each machine would have its own database file
- SQLite doesn't handle concurrent writes from multiple processes
- Data would be inconsistent across machines

**Current solution**: Keep `min_machines_running = 1` (single machine) until migrating to PostgreSQL.

## Step 1: Transfer App to Organization

```bash
fly apps move alle-drops-quiz-app --org 21-ads-media
```

This will:
- Transfer ownership from your personal account to "21 ads media" organization
- Keep all existing volumes, machines, and configuration
- Require confirmation

## Step 2: Update Machine Configuration

The `fly.toml` has been updated to:
- `min_machines_running = 1` (keeps at least 1 machine running)
- Keeps volume mounts (required for SQLite)

**Current configuration is safe for single-machine operation.**

## Step 3: Scale Machines (Optional - After PostgreSQL Migration)

Once you migrate to PostgreSQL, you can scale to multiple machines:

```bash
# Scale to 2 machines
fly scale count 2

# Or update fly.toml:
# min_machines_running = 2
```

## Step 4: Migrate to PostgreSQL (Recommended for Production)

### Why PostgreSQL?

1. **Multi-machine support**: PostgreSQL handles concurrent connections perfectly
2. **Better performance**: Optimized for production workloads
3. **Data integrity**: ACID compliance, transactions
4. **Scalability**: Can handle much more data and traffic

### Migration Steps

1. **Create PostgreSQL Database** (Fly.io Managed Postgres):

```bash
# Create a PostgreSQL database in your org
fly postgres create --name alle-drops-quiz-db --org 21-ads-media --region iad

# Attach it to your app
fly postgres attach alle-drops-quiz-db --app alle-drops-quiz-app
```

2. **Update Prisma Schema**:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Run Migrations**:

```bash
npx prisma migrate dev --name migrate_to_postgres
```

4. **Update fly.toml**:

Remove the volume mount (no longer needed):
```toml
# Remove this section:
# [[mounts]]
#   source = 'data'
#   destination = '/data'
#   ...
```

5. **Scale to Multiple Machines**:

```bash
fly scale count 2
```

## Volume Status

### Current (SQLite):
- ✅ **Volumes ARE needed** - Stores SQLite database file
- ⚠️ **Single machine only** - SQLite doesn't work with multiple machines

### After PostgreSQL Migration:
- ❌ **Volumes NOT needed** - PostgreSQL is external managed database
- ✅ **Multiple machines OK** - PostgreSQL handles concurrent connections

## Quick Reference Commands

```bash
# Transfer app to organization
fly apps move alle-drops-quiz-app --org 21-ads-media

# Check current status
fly status

# View machines
fly machines list

# Scale machines (after PostgreSQL migration)
fly scale count 2

# View volumes
fly volumes list

# Create PostgreSQL database
fly postgres create --name alle-drops-quiz-db --org 21-ads-media --region iad

# Attach PostgreSQL to app
fly postgres attach alle-drops-quiz-db --app alle-drops-quiz-app
```

## Current Configuration Summary

- **Machines**: 1 (min_machines_running = 1)
- **Volumes**: 1 volume mounted at `/data` (for SQLite)
- **Auto-start/stop**: Enabled (saves costs when idle)
- **Region**: iad (Washington, D.C.)

This configuration is **production-ready for single-machine operation** with SQLite.

