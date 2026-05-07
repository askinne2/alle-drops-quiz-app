/**
 * Cloud SQL Postgres connection pool — PHI store for AlleDrops.
 *
 * SECURITY:
 * - Cloud SQL instance `alledrops-quiz-data` is in ENCRYPTED_ONLY mode (TLS required).
 * - rejectUnauthorized=false is acceptable for dev. Before production, pin the
 *   server CA: download "Server CA certificate" from the Cloud SQL connections
 *   page, set `ssl.ca` to its PEM contents (load via env var or file).
 * - Connection string lives in Fly secrets. NEVER commit DATABASE_URL.
 *
 * Identifiers (dev):
 *   instance:        alledrops-quiz-data
 *   public ipv4:     34.139.97.17
 *   database:        alledrops_quiz_dev
 *   user:            alledrops_app
 */
import pg from "pg";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (_pool) return _pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure as a Fly secret pointing at Cloud SQL " +
        "(format: postgresql://USER:PASS@HOST:5432/DB)."
    );
  }

  _pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      // TODO(prod): pin server CA — see header comment.
      rejectUnauthorized: false,
    },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
  });

  _pool.on("error", (err) => {
    console.error("[db] unexpected pool error:", err);
  });

  return _pool;
}

/** Lightweight liveness check — for /health or migrations script. */
export async function pingDatabase(): Promise<boolean> {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("[db] ping failed:", err);
    return false;
  }
}
