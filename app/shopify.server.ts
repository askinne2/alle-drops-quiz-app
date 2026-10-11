import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { reportError } from "./lib/error-reporting.server";

/**
 * Session storage startup budget.
 *
 * `PrismaSessionStorage` (v7.0.3) runs a readiness check in its constructor: `session.count()`
 * up to `connectionRetries` times, sleeping `connectionRetryIntervalMs` after each failure.
 * Library defaults are 2 x 5000 ms, so a ~10 s DB blip at container start (Cloud SQL pool
 * timeout on 10/7, unreachable socket on 10/5) exhausted it. 12 x 5000 ms covers ~1-2 minutes.
 *
 * The check is async and does not block `listen`: the constructor only starts the promise, and
 * react-router-serve imports the server build and then listens, so the TCP startup probe still
 * passes while the check retries in the background.
 */
export const SESSION_STORAGE_STARTUP_OPTIONS = {
  connectionRetries: 12,
  connectionRetryIntervalMs: 5000,
} as const;

/** After the startup budget is spent, how often to try `isReady()` again in the background. */
export const SESSION_STORAGE_RECOVERY_INTERVAL_MS = 30_000;

export const SESSION_STORAGE_READY_SOURCE = "session.storage.ready";

type SessionCountClient = { session: { count: () => Promise<unknown> } };
type ReadinessStorage = { isReady: () => Promise<boolean> };

const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s'"`]+/gi;
const SECRET_KV_RE = /\b(password|pass|pwd|user|username)=[^\s&;'"`]+/gi;

/**
 * Copy a DB connection error with any connection string / credentials removed from the message,
 * keeping its name, Prisma error code (P1001, P2024, ...) and stack frames. The error-reporting
 * helper then applies its own PHI scrubbing on top.
 */
export function sanitizeDbError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  const e = error as Error & { code?: unknown; errorCode?: unknown };
  const message = String(e.message ?? "")
    .replace(URL_RE, "[connection-url]")
    .replace(SECRET_KV_RE, "$1=[redacted]");
  const copy = new Error(message) as Error & { code?: string };
  copy.name = e.name;
  const code = typeof e.code === "string" ? e.code : e.errorCode;
  if (typeof code === "string") copy.code = code;
  if (typeof e.stack === "string") {
    const frames = e.stack.split("\n").filter((line) => /^\s+at /.test(line));
    copy.stack = [`${copy.name}: ${message}`, ...frames].join("\n");
  }
  return copy;
}

/**
 * Handle the storage's readiness promise so a failure can't become an unhandled rejection that
 * exits the process (and crash-loops the Cloud Run instance).
 *
 * The library replaces the real DB error with "Prisma session table does not exist" and its
 * `cause` is also generic, so on failure we run one `session.count()` ourselves to capture the
 * real cause and report it once as a structured ERROR (Error Reporting + email alert).
 *
 * Exhausted-retries choice: keep the process up. The library does not recover on its own after a
 * failed `ready` (every session call rethrows it), but its public `isReady()` re-polls and resets
 * `ready`, so we call it in the background until the DB answers. Until then, session calls fail
 * with "session storage is not ready" and those failures surface through the normal request error
 * path. Exiting would only restart into the same dead DB.
 *
 * Resolves `true` if storage became ready during startup, `false` if the startup budget was spent
 * (recovery continues in the background).
 */
export function watchSessionStorageReadiness(
  storage: ReadinessStorage,
  client: SessionCountClient,
  {
    recoveryIntervalMs = SESSION_STORAGE_RECOVERY_INTERVAL_MS,
    options = SESSION_STORAGE_STARTUP_OPTIONS as {
      connectionRetries: number;
      connectionRetryIntervalMs: number;
    },
  } = {},
): Promise<boolean> {
  // `ready` is private in the library's types but is the promise its constructor creates.
  const ready = (storage as unknown as { ready?: Promise<boolean> }).ready;
  if (!ready || typeof ready.then !== "function") return Promise.resolve(true);

  const scheduleRecovery = () => {
    const timer = setTimeout(async () => {
      let ok = false;
      try {
        ok = await storage.isReady();
      } catch {
        ok = false;
      }
      if (ok) {
        console.log(
          JSON.stringify({
            severity: "INFO",
            message: "Session storage ready after startup failure",
            source: SESSION_STORAGE_READY_SOURCE,
          }),
        );
      } else {
        scheduleRecovery();
      }
    }, recoveryIntervalMs);
    timer.unref?.();
  };

  return ready.then(
    () => true,
    async (libraryError: unknown) => {
      let cause: unknown = libraryError;
      try {
        await client.session.count();
        // DB answered right after the budget ran out: re-poll so `ready` becomes true.
        if (await storage.isReady()) return true;
      } catch (probeError) {
        cause = probeError;
      }
      reportError(sanitizeDbError(cause), {
        source: SESSION_STORAGE_READY_SOURCE,
        extra: {
          connectionRetries: options.connectionRetries,
          connectionRetryIntervalMs: options.connectionRetryIntervalMs,
          libraryError: libraryError instanceof Error ? libraryError.name : typeof libraryError,
          recoveryIntervalMs,
        },
      });
      scheduleRecovery();
      return false;
    },
  );
}

const prismaSessionStorage = new PrismaSessionStorage(prisma, SESSION_STORAGE_STARTUP_OPTIONS);
void watchSessionStorageReadiness(prismaSessionStorage, prisma);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: prismaSessionStorage,
  distribution: AppDistribution.AppStore,
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
