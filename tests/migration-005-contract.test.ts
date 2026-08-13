import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract guard for migrations/005_widen_score_bracket_check.sql.
 *
 * Pure source-text guard: reads the migration file from disk, makes NO database connection,
 * imports nothing from app/lib/db.ts. This test's whole job is to prove the migration is
 * additive, single-table, and carries its execution preconditions in writing — BEFORE plan
 * 05.2-04 ever runs it against alledrops_quiz_dev.
 *
 * Occurrence counting uses SOURCE.split(needle).length - 1 exclusively — NEVER a line-counting
 * `grep -c`, which collapses this multi-line SQL file's repeated header prose into misleading
 * counts. See tests/quiz-bundle-freshness.test.ts for this project's canonical example of the
 * same convention, and this project's own documented "grep -c counts lines, not occurrences"
 * trap (tests/quiz-part-renderer-no-literals.test.ts, STATE.md's "Accumulated Context").
 *
 * The destructive-statement assertions below run against a COMMENT-STRIPPED view of the file
 * (lines whose trimmed form starts with `--` removed). This matters because the header's own
 * prose necessarily NAMES the forbidden statement types (UPDATE, DELETE, TRUNCATE, ...) while
 * explaining why the file contains none of them — if the destructive-statement gate ran against
 * the raw file, that explanatory prose would trip its own gate. Stripping comments first makes
 * the gate test only the executable SQL body.
 */

const RAW_SOURCE = readFileSync(
  join(process.cwd(), "migrations", "005_widen_score_bracket_check.sql"),
  "utf-8",
);

const stripComments = (source: string): string =>
  source
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

const BODY = stripComments(RAW_SOURCE);

const count = (source: string, needle: string): number => source.split(needle).length - 1;

describe("migrations/005_widen_score_bracket_check.sql is additive, single-table, and non-destructive", () => {
  it("contains exactly one DROP CONSTRAINT IF EXISTS against submissions in the executable body", () => {
    expect(count(BODY, "ALTER TABLE submissions DROP CONSTRAINT IF EXISTS")).toBe(1);
  });

  it("contains exactly one ADD CONSTRAINT with a CHECK (score_bracket IN clause in the executable body", () => {
    expect(count(BODY, "ADD CONSTRAINT")).toBe(1);
    expect(count(BODY, "CHECK (score_bracket IN")).toBe(1);
  });

  it("the CHECK list is exactly the five-value union, in order: '0-2', '3-6', '3-8', '7+', '9+'", () => {
    expect(count(BODY, "'0-2', '3-6', '3-8', '7+', '9+'")).toBe(1);
  });

  it("the executable body contains zero destructive statements (UPDATE, DELETE, TRUNCATE, DROP TABLE, DROP COLUMN, ALTER COLUMN)", () => {
    const forbidden = ["UPDATE ", "DELETE ", "TRUNCATE", "DROP TABLE", "DROP COLUMN", "ALTER COLUMN"];
    for (const needle of forbidden) {
      expect(count(BODY, needle)).toBe(0);
    }
  });

  it("the executable body references no table other than submissions — no second, differently-owned table", () => {
    // submission_access_log is owned by `postgres`, submissions by `alledrops_app` (STATE.md
    // 04-19). A file naming both cannot be run by a single role — the exact trap 004 hit.
    expect(count(BODY, "submission_access_log")).toBe(0);
    expect(count(BODY, "submission_files")).toBe(0);
  });

  it("the full file (header comments included) documents all three preconditions plan 05.2-04 depends on", () => {
    expect(count(RAW_SOURCE, "gcloud sql backups")).toBeGreaterThanOrEqual(1);
    expect(count(RAW_SOURCE, "pg_constraint")).toBeGreaterThanOrEqual(1);
    expect(count(RAW_SOURCE, "SET ROLE alledrops_app")).toBeGreaterThanOrEqual(1);
  });
});
