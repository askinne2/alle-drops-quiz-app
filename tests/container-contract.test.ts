import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract guard for the Cloud Run image definition and build context (phase 08.1).
 *
 * Pure source text: no Docker, no network. Line-wise exact matching so `.env.example`
 * can never satisfy a `.env` requirement.
 */

const read = (name: string): string => readFileSync(join(process.cwd(), name), "utf-8");
const lines = (source: string): string[] => source.split("\n").map((l) => l.trim());
const hasLine = (source: string, exact: string): boolean => lines(source).includes(exact);
const count = (source: string, needle: string): number => source.split(needle).length - 1;
const stripHashComments = (source: string): string =>
  source
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");

const DOCKERFILE = stripHashComments(read("Dockerfile"));
const PKG = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
  [key: string]: unknown;
};

describe("Dockerfile contract", () => {
  it.each(["litestream", "dbsetup", "prisma migrate", "docker-start", "EXPOSE 3000", "PORT=3000", "package-lock.json*"])(
    "does not contain %s",
    (needle) => {
      expect(count(DOCKERFILE, needle)).toBe(0);
    },
  );

  it("generates the prisma client at build time", () => {
    expect(count(DOCKERFILE, "prisma generate")).toBeGreaterThanOrEqual(1);
  });

  it("runs as the non-root node user", () => {
    expect(hasLine(DOCKERFILE, "USER node")).toBe(true);
  });

  it("uses a node 20.19+ alpine base", () => {
    expect(/^FROM node:20\.(19|[2-9]\d)[\w.]*-alpine/m.test(DOCKERFILE)).toBe(true);
  });

  it("exposes 8080 and starts via npm run start", () => {
    expect(hasLine(DOCKERFILE, "EXPOSE 8080")).toBe(true);
    expect(count(DOCKERFILE, '"npm", "run", "start"')).toBe(1);
  });
});

describe.each([".dockerignore", ".gcloudignore"])("%s contract", (file) => {
  const src = read(file);

  it.each([".env*", ".git", ".shopify", ".planning"])("has exact line %s", (entry) => {
    expect(hasLine(src, entry)).toBe(true);
  });

  it("does not exclude package-lock.json", () => {
    expect(hasLine(src, "package-lock.json")).toBe(false);
  });
});

describe(".gitignore contract", () => {
  const src = read(".gitignore");

  it("no longer ignores package-lock.json", () => {
    expect(hasLine(src, "package-lock.json")).toBe(false);
  });

  it("still ignores .env", () => {
    expect(hasLine(src, ".env")).toBe(true);
  });
});

describe("package.json contract", () => {
  it("has no flydotio packages", () => {
    expect(count(read("package.json"), "@flydotio")).toBe(0);
  });

  it("has no top-level dockerfile key", () => {
    expect("dockerfile" in PKG).toBe(false);
  });

  it("has no docker-start script", () => {
    expect("docker-start" in PKG.scripts).toBe(false);
  });

  it("has no script running prisma migrate", () => {
    for (const cmd of Object.values(PKG.scripts)) {
      expect(cmd.includes("prisma migrate")).toBe(false);
    }
  });
});
