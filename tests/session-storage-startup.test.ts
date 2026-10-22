import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

// shopify.server.ts builds the app at import time; stub the Shopify factory and the real DB client.
vi.mock("@shopify/shopify-app-react-router/adapters/node", () => ({}));
vi.mock("@shopify/shopify-app-react-router/server", () => ({
  ApiVersion: { October25: "2025-10" },
  AppDistribution: { AppStore: "app_store" },
  shopifyApp: (config: Record<string, unknown>) => ({
    sessionStorage: config.sessionStorage,
  }),
}));
vi.mock("../app/db.server", () => ({
  default: { session: { count: vi.fn().mockResolvedValue(0) } },
}));

import shopify, {
  ReadyOnRequestSessionStorage,
  SESSION_STORAGE_STARTUP_OPTIONS,
  SESSION_STORAGE_READY_SOURCE,
  sanitizeDbError,
  watchSessionStorageReadiness,
} from "../app/shopify.server";

/** Prisma's pool-timeout error as seen in production on 10/7 and 10/14-10/22. */
function poolTimeout(): Error {
  const err = new Error(
    "Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 10, connection limit: 2)",
  ) as Error & { code: string };
  err.name = "PrismaClientKnownRequestError";
  err.code = "P2024";
  return err;
}

function mockClient(count: () => Promise<number>) {
  return {
    session: {
      count: vi.fn(count),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClient & {
    session: {
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
}

const FAST = { connectionRetries: 3, connectionRetryIntervalMs: 1 };

let stderr: { mock: { calls: unknown[][] } };
let stdout: { mock: { calls: unknown[][] } };
let unhandled: unknown[];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

function jsonLines(spy: {
  mock: { calls: unknown[][] };
}): Array<Record<string, unknown>> {
  return spy.mock.calls
    .map((c) => String(c[0]))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const linesWith = (severity: string) =>
  [...jsonLines(stderr), ...jsonLines(stdout)].filter(
    (e) => e.severity === severity,
  );

async function flushUnhandled() {
  // unhandledRejection fires after the microtask queue drains.
  await new Promise((r) => setTimeout(r, 20));
}

/** Storage + startup watcher whose startup check has already failed against a dead DB. */
async function failedAtStartup(isUp: () => boolean) {
  const client = mockClient(async () => {
    if (!isUp()) throw poolTimeout();
    return 0;
  });
  const storage = new ReadyOnRequestSessionStorage(client, FAST);
  const ok = await watchSessionStorageReadiness(storage, client, {
    options: FAST,
  });
  expect(ok).toBe(false);
  return { client, storage };
}

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
  stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  stdout = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  vi.restoreAllMocks();
});

describe("session storage startup options", () => {
  it("uses a short startup budget and the ready-on-request storage", () => {
    expect(SESSION_STORAGE_STARTUP_OPTIONS).toEqual({
      connectionRetries: 3,
      connectionRetryIntervalMs: 2000,
    });
    const storage = (
      shopify as unknown as { sessionStorage: Record<string, unknown> }
    ).sessionStorage;
    expect(storage).toBeInstanceOf(ReadyOnRequestSessionStorage);
    expect(storage).toBeInstanceOf(PrismaSessionStorage);
    expect(storage.connectionRetries).toBe(3);
    expect(storage.connectionRetryIntervalMs).toBe(2000);
  });
});

describe("watchSessionStorageReadiness (startup)", () => {
  it("DB fails N times then answers: storage becomes ready, nothing reported, no unhandled rejection", async () => {
    let calls = 0;
    const client = mockClient(async () => {
      calls += 1;
      if (calls <= 2) throw poolTimeout();
      return 0;
    });
    const storage = new ReadyOnRequestSessionStorage(client, FAST);
    const ok = await watchSessionStorageReadiness(storage, client, {
      options: FAST,
    });

    expect(ok).toBe(true);
    expect(client.session.count).toHaveBeenCalledTimes(3);
    await expect(storage.isReady()).resolves.toBe(true);
    await flushUnhandled();
    expect(unhandled).toEqual([]);
    expect(linesWith("ERROR")).toEqual([]);
    expect(linesWith("WARNING")).toEqual([]);
  });

  it("DB never answers at startup: one scrubbed WARNING (not ERROR) naming the real cause", async () => {
    await failedAtStartup(() => false);
    await flushUnhandled();
    expect(unhandled).toEqual([]);

    // The alert policy fires on severity>=ERROR. An idle min-instance gets almost no CPU, so a
    // startup failure with no traffic is not an outage and must not page anyone.
    expect(linesWith("ERROR")).toEqual([]);
    const warnings = linesWith("WARNING");
    expect(warnings).toHaveLength(1);
    const [entry] = warnings;
    expect(entry.source).toBe(SESSION_STORAGE_READY_SOURCE);
    expect(entry.errorCode).toBe("P2024");
    expect(String(entry.message)).toMatch(
      /^PrismaClientKnownRequestError: Timed out fetching a new connection/,
    );
    expect(String(entry.message)).not.toMatch(/https?:\/\//);
    expect(entry.extra).toMatchObject({
      phase: "startup",
      connectionRetries: 3,
    });
  });

  it("does not keep polling the DB in the background after a failed startup", async () => {
    const { client } = await failedAtStartup(() => false);
    const callsAfterStartup = client.session.count.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(client.session.count.mock.calls.length).toBe(callsAfterStartup);
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

describe("ReadyOnRequestSessionStorage (first request after a failed startup)", () => {
  it("DB is up by the first request: the session call succeeds and logs INFO, no ERROR", async () => {
    let up = false;
    const { storage } = await failedAtStartup(() => up);
    up = true;

    await expect(
      storage.loadSession("offline_shop.myshopify.com"),
    ).resolves.toBeUndefined();
    expect(linesWith("ERROR")).toEqual([]);
    expect(linesWith("INFO")).toEqual([
      expect.objectContaining({
        message: "Session storage ready after startup failure",
        source: SESSION_STORAGE_READY_SOURCE,
      }),
    ]);
  });

  it("DB still down at request time: the call fails and one scrubbed ERROR is reported", async () => {
    const { storage } = await failedAtStartup(() => false);

    await expect(
      storage.loadSession("offline_shop.myshopify.com"),
    ).rejects.toThrow(/not ready/);
    const errors = linesWith("ERROR");
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe(SESSION_STORAGE_READY_SOURCE);
    expect(errors[0].errorCode).toBe("P2024");
    expect(errors[0]["@type"]).toContain("ReportedErrorEvent");
    expect(errors[0].extra).toMatchObject({ phase: "request" });
    await flushUnhandled();
    expect(unhandled).toEqual([]);
  });

  it("concurrent requests share one recovery poll", async () => {
    let up = false;
    const { client, storage } = await failedAtStartup(() => up);
    up = true;
    const before = client.session.count.mock.calls.length;

    await Promise.all([
      storage.loadSession("a"),
      storage.loadSession("b"),
      storage.findSessionsByShop("shop.myshopify.com").catch(() => []),
    ]);
    expect(client.session.count.mock.calls.length - before).toBe(1);
  });

  it("ready storage adds no extra DB round trip per request", async () => {
    const client = mockClient(async () => 0);
    const storage = new ReadyOnRequestSessionStorage(client, FAST);
    await watchSessionStorageReadiness(storage, client, { options: FAST });
    const before = client.session.count.mock.calls.length;
    await storage.loadSession("a");
    expect(client.session.count.mock.calls.length).toBe(before);
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
    expect(out.stack?.split("\n")[0]).toBe(
      `PrismaClientInitializationError: ${out.message}`,
    );
  });
});
