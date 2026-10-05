import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function poolSsl(url: string) {
  process.env.DATABASE_URL = url;
  const { getPool } = await import("../app/lib/db");
  const pool = getPool();
  const ssl = (pool as unknown as { options: { ssl: unknown } }).options.ssl;
  await pool.end();
  return ssl;
}

describe("getPool TLS selection", () => {
  it("disables TLS on the Cloud Run /cloudsql/ unix socket", async () => {
    const ssl = await poolSsl(
      "postgresql://u:p@localhost/db?host=/cloudsql/p:us-east1:i"
    );
    expect(ssl).toBe(false);
  });

  it("disables TLS when sslmode=disable is explicit (cloud-sql-proxy)", async () => {
    const ssl = await poolSsl("postgresql://u:p@127.0.0.1:5436/db?sslmode=disable");
    expect(ssl).toBe(false);
  });

  it("allows unverified TLS only when sslmode=no-verify is explicit", async () => {
    const ssl = (await poolSsl(
      "postgresql://u:p@34.1.2.3:5432/db?sslmode=no-verify"
    )) as { rejectUnauthorized: boolean };
    expect(ssl).toBeTruthy();
    expect(ssl.rejectUnauthorized).toBe(false);
  });

  it("verifies TLS on a TCP host with no sslmode", async () => {
    const ssl = (await poolSsl("postgresql://u:p@db.example.com:5432/db")) as {
      rejectUnauthorized: boolean;
    };
    expect(ssl).toBeTruthy();
    expect(ssl.rejectUnauthorized).toBe(true);
  });

  it("throws naming DATABASE_URL when unset", async () => {
    delete process.env.DATABASE_URL;
    const { getPool } = await import("../app/lib/db");
    expect(() => getPool()).toThrow(/DATABASE_URL/);
  });
});
