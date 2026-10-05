/**
 * Cloud SQL Postgres connection pool - PHI store for AlleDrops.
 *
 * Production runs on Cloud Run in aod-production-510006 and reaches Cloud SQL
 * through the managed /cloudsql/ unix socket (already mTLS-wrapped by the
 * connector, so no TLS is negotiated on the socket). The connection string
 * comes from Secret Manager secret `quiz-database-url`. Local dev goes
 * through cloud-sql-proxy with sslmode=disable. NEVER commit DATABASE_URL.
 *
 * TLS selection (by connection shape):
 * - `?host=/cloudsql/...` (unix socket) or `sslmode=disable`: no TLS.
 * - `sslmode=no-verify`: TLS without cert verification (legacy dev only).
 * - anything else (TCP host): TLS with certificate verification.
 *
 * pg merges options parsed from the connection string over explicit ones, so
 * `sslmode` is stripped from the string handed to Pool; the explicit `ssl`
 * value computed here is the single source of truth.
 */
import pg from "pg";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

function resolveSsl(url: URL): false | { rejectUnauthorized: boolean } {
  const viaSocket = (url.searchParams.get("host") ?? "").startsWith("/");
  const mode = url.searchParams.get("sslmode");
  if (viaSocket || mode === "disable") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

export function getPool(): pg.Pool {
  if (_pool) return _pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. It comes from Secret Manager (quiz-database-url) " +
        "on Cloud Run, or from .env locally " +
        "(format: postgresql://USER:PASS@HOST:5432/DB)."
    );
  }

  const parsed = new URL(databaseUrl);
  const ssl = resolveSsl(parsed);
  parsed.searchParams.delete("sslmode");

  _pool = new Pool({
    connectionString: parsed.toString(),
    ssl,
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
