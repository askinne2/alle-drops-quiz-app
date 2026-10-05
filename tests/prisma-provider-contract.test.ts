import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract guard for the Shopify session store move from SQLite to Postgres (phase 08.1).
 *
 * Pure source text: reads prisma/schema.prisma and the prisma/migrations directory from disk.
 * Makes NO database connection. Occurrence counting uses split(needle).length - 1.
 */

const stripComments = (source: string): string =>
  source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

const count = (source: string, needle: string): number => source.split(needle).length - 1;

const SCHEMA = stripComments(readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf-8"));
const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");
const MIGRATION_DIRS = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

describe("prisma provider contract", () => {
  it("uses the postgresql provider exactly once", () => {
    expect(count(SCHEMA, 'provider = "postgresql"')).toBe(1);
  });

  it("reads the session DB url from SESSION_DATABASE_URL exactly once", () => {
    expect(count(SCHEMA, 'env("SESSION_DATABASE_URL")')).toBe(1);
  });

  it("has no sqlite remnants", () => {
    expect(count(SCHEMA, "sqlite")).toBe(0);
    expect(count(SCHEMA, "dev.sqlite")).toBe(0);
  });

  it("removed the SQLite migration directory", () => {
    expect(MIGRATION_DIRS).not.toContain("20240530213853_create_session_table");
  });

  it("migration_lock.toml declares postgresql", () => {
    const lock = readFileSync(join(MIGRATIONS_DIR, "migration_lock.toml"), "utf-8");
    expect(count(lock, 'provider = "postgresql"')).toBe(1);
  });

  it("has exactly one baseline migration creating the Session table", () => {
    expect(MIGRATION_DIRS).toHaveLength(1);
    const sql = readFileSync(join(MIGRATIONS_DIR, MIGRATION_DIRS[0], "migration.sql"), "utf-8");
    expect(count(sql, 'CREATE TABLE "Session"')).toBe(1);
  });
});
