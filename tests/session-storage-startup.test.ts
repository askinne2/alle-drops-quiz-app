import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

// shopify.server.ts builds the app at import time; stub the Shopify factory and the real DB client.
vi.mock("@shopify/shopify-app-react-router/adapters/node", () => ({}));
vi.mock("@shopify/shopify-app-react-router/server", () => ({
  ApiVersion: { October25: "2025-10" },
  AppDistribution: { AppStore: "app_store" },
  shopifyApp: (config: Record<string, unknown>) => ({ sessionStorage: config.sessionStorage }),
}));
vi.mock("../app/db.server", () => ({
  default: { session: { count: vi.fn().mockResolvedValue(0) } },
}));

import shopify, {
  SESSION_STORAGE_STARTUP_OPTIONS,
  SESSION_STORAGE_READY_SOURCE,
  sanitizeDbError,
  watchSessionStorageReadiness,
} from "../app/shopify.server";

/** Prisma's pool-timeout error as seen in production on 10/7. */
function poolTimeout(): Error {
  const err = new Error(
    "Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 10, connection limit: 2)",
  ) as Error & { code: string };
  err.name = "PrismaClientKnownRequestError";
  err.code = "P2024";
  return err;
}

function mockClient(count: () => Promise<number>) {
  return { session: { count: vi.fn(count), findUnique: vi.fn().mockResolvedValue(null) } } as unknown as PrismaClient & {
    session: { count: ReturnType<typeof vi.fn> };
  };
}

const FAST = { connectionRetries: 3, connectionRetryIntervalMs: 1 };

let stderr: { mock: { calls: unknown[][] } };
let unhandled: unknown[];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

function errorLines(): Array<Record<string, unknown>> {
  return stderr.mock.calls
    .map((c) => String(c[0]))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((entry) => entry.severity === "ERROR");
}

async function flushUnhandled() {
  // unhandledRejection fires after the microtask queue drains.
  await new Promise((r) => setTimeout(r, 20));
}

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
  stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  vi.restoreAllMocks();
});

describe("session storage startup options", () => {
  it("passes a ~1 minute retry budget to PrismaSessionStorage (library default is 2 x 5000 ms)", () => {
    expect(SESSION_STORAGE_STARTUP_OPTIONS).toEqual({
      connectionRetries: 12,
      connectionRetryIntervalMs: 5000,
    });
    const storage = (shopify as unknown as { sessionStorage: Record<string, unknown> })
      .sessionStorage;
    expect(storage).toBeInstanceOf(PrismaSessionStorage);
    expect(storage.connectionRetries).toBe(12);
    expect(storage.connectionRetryIntervalMs).toBe(5000);
  });
});

describe("watchSessionStorageReadiness", () => {
  it("DB fails N times then answers: storage becomes ready, no ERROR, no unhandled rejection", async () => {
    let calls = 0;
    const client = mockClient(async () => {
      calls += 1;
      if (calls <= 2) throw poolTimeout();
      return 0;
    });
    const storage = new PrismaSessionStorage(client, FAST);
    const ok = await watchSessionStorageReadiness(storage, client, { options: FAST });

    expect(ok).toBe(true);
    expect(client.session.count).toHaveBeenCalledTimes(3);
    await expect(storage.isReady()).resolves.toBe(true);
    await flushUnhandled();
    expect(unhandled).toEqual([]);
    expect(errorLines()).toEqual([]);
  });

  it("DB never answers: one scrubbed ERROR naming the real cause, process keeps running", async () => {
    const client = mockClient(async () => {
      throw poolTimeout();
    });
    const storage = new PrismaSessionStorage(client, FAST);
    const ok = await watchSessionStorageReadiness(storage, client, {
      options: FAST,
      recoveryIntervalMs: 60_000,
    });

    expect(ok).toBe(false);
    await flushUnhandled();
    expect(unhandled).toEqual([]);

    const errors = errorLines();
    expect(errors).toHaveLength(1);
    const [entry] = errors;
    expect(entry.source).toBe(SESSION_STORAGE_READY_SOURCE);
    expect(entry.errorCode).toBe("P2024");
    expect(entry["@type"]).toContain("ReportedErrorEvent");
    const header = String(entry.message).split("\n")[0];
    expect(header).toMatch(/^PrismaClientKnownRequestError: Timed out fetching a new connection/);
    expect(String(entry.message)).not.toMatch(/does not exist/);
    expect(header).not.toMatch(/https?:\/\//);
    expect(entry.extra).toMatchObject({
      connectionRetries: 3,
      connectionRetryIntervalMs: 1,
      libraryError: "Error",
    });
  });

  it("recovers in the background once the DB answers after the startup budget", async () => {
    let up = false;
    const client = mockClient(async () => {
      if (!up) throw poolTimeout();
      return 0;
    });
    const storage = new PrismaSessionStorage(client, FAST);
    const ok = await watchSessionStorageReadiness(storage, client, {
      options: FAST,
      recoveryIntervalMs: 5,
    });
    expect(ok).toBe(false);

    up = true;
    await vi.waitFor(async () => {
      expect(await storage.loadSession("offline_shop.myshopify.com")).toBeUndefined();
    });
    expect(errorLines()).toHaveLength(1);
    await flushUnhandled();
    expect(unhandled).toEqual([]);
  });

  it("without the handler the library's ready rejection would be unhandled (pins the private field)", async () => {
    const client = mockClient(async () => {
      throw poolTimeout();
    });
    const storage = new PrismaSessionStorage(client, FAST);
    const ready = (storage as unknown as { ready: Promise<boolean> }).ready;
    expect(typeof ready.then).toBe("function");
    await expect(ready).rejects.toThrow(/table does not exist/);
  });
});

describe("sanitizeDbError", () => {
  it("strips connection strings and credentials, keeps name, code and frames", () => {
    const err = new Error(
      "Can't reach database server: postgresql://sessions_app:hunter2@localhost/shopify_sessions?host=/cloudsql/x password=hunter2",
    ) as Error & { errorCode: string };
    err.name = "PrismaClientInitializationError";
    err.errorCode = "P1001";
    const out = sanitizeDbError(err) as Error & { code: string };
    expect(out.name).toBe("PrismaClientInitializationError");
    expect(out.code).toBe("P1001");
    expect(out.message).not.toContain("hunter2");
    expect(out.message).toContain("[connection-url]");
    expect(out.stack?.split("\n")[0]).toBe(`PrismaClientInitializationError: ${out.message}`);
  });
});
