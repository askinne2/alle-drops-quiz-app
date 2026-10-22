import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import type { PrismaClient } from "@prisma/client";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { reportError, reportWarning } from "./lib/error-reporting.server";

/**
 * Session storage readiness budget, used both for the startup check and for each on-request
 * re-check (`isReady()` polls with the same settings).
 *
 * `PrismaSessionStorage` (v7.0.3) runs a readiness check in its constructor: `session.count()`
 * up to `connectionRetries` times, sleeping `connectionRetryIntervalMs` after each failure.
 *
 * Cloud Run only allocates CPU while a request is in flight. A min-instance that Cloud Run starts
 * with no traffic runs this check starved of CPU, so Prisma's 10 s pool timeout fires before the
 * engine can connect (10/14-10/22: every replacement min-instance failed it, took 9-14 min to
 * spend a 12 x 5 s budget, and a 30 s background re-poll then failed ~2,800 times a day). Retrying
 * longer in the background cannot fix that, so the startup check stays short and the real check
 * happens on the first request that needs a session, when the instance has CPU
 * (`ReadyOnRequestSessionStorage`).
 */
export const SESSION_STORAGE_STARTUP_OPTIONS = {
  connectionRetries: 3,
  connectionRetryIntervalMs: 2000,
} as const;

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

type ReadinessOptions = {
  connectionRetries: number;
  connectionRetryIntervalMs: number;
};

/** `ready` is private in the library's types but is the promise its constructor creates. */
function libraryReady(storage: unknown): Promise<boolean> | undefined {
  const ready = (storage as { ready?: Promise<boolean> }).ready;
  return ready && typeof ready.then === "function" ? ready : undefined;
}

/**
 * The library replaces the real DB error with "Prisma session table does not exist" and its
 * `cause` is also generic, so run one `session.count()` ourselves to capture the real cause.
 * Returns `undefined` if the DB answered.
 */
async function probeDbCause(client: SessionCountClient): Promise<unknown> {
  try {
    await client.session.count();
    return undefined;
  } catch (probeError) {
    return probeError;
  }
}

/**
 * Handle the storage's startup readiness promise so a failure can't become an unhandled
 * rejection that exits the process (and crash-loops the Cloud Run instance).
 *
 * A failed startup check is logged once as a scrubbed WARNING with the real DB cause, not an
 * ERROR: with no request in flight the instance has almost no CPU, so this is expected on idle
 * min-instances and is not an outage. Nothing polls in the background afterwards; the next
 * session call re-checks (`ReadyOnRequestSessionStorage`) and reports an ERROR if the DB is
 * really down while a request is waiting on it.
 *
 * Resolves `true` if storage became ready during startup, `false` if the startup budget was spent.
 */
export function watchSessionStorageReadiness(
  storage: ReadinessStorage,
  client: SessionCountClient,
  { options = SESSION_STORAGE_STARTUP_OPTIONS as ReadinessOptions } = {},
): Promise<boolean> {
  const ready = libraryReady(storage);
  if (!ready) return Promise.resolve(true);

  return ready.then(
    () => true,
    async (libraryError: unknown) => {
      const cause = await probeDbCause(client);
      // DB answered right after the budget ran out: re-poll so `ready` becomes true.
      if (cause === undefined && (await storage.isReady().catch(() => false)))
        return true;
      reportWarning(sanitizeDbError(cause ?? libraryError), {
        source: SESSION_STORAGE_READY_SOURCE,
        extra: {
          phase: "startup",
          connectionRetries: options.connectionRetries,
          connectionRetryIntervalMs: options.connectionRetryIntervalMs,
          libraryError:
            libraryError instanceof Error
              ? libraryError.name
              : typeof libraryError,
        },
      });
      return false;
    },
  );
}

/**
 * `PrismaSessionStorage` that re-checks readiness on the session call that needs it, instead of
 * in a background loop that an idle Cloud Run instance has no CPU to run.
 *
 * When storage is ready this costs nothing extra (one resolved-promise await). When it is not,
 * concurrent calls share one `isReady()` poll; on success an INFO line is logged, on failure the
 * real DB cause is reported as an ERROR (which pages) and the library's own "session storage is
 * not ready" error propagates through the normal request error path.
 */
export class ReadyOnRequestSessionStorage extends PrismaSessionStorage<PrismaClient> {
  private recovery: Promise<void> | null = null;

  constructor(
    // The library keeps its client private; keep our own reference for the cause probe.
    private readonly sessionClient: PrismaClient,
    options?: ConstructorParameters<typeof PrismaSessionStorage>[1],
  ) {
    super(sessionClient, options);
  }

  private async readyForRequest(): Promise<void> {
    const ready = libraryReady(this);
    if (ready && (await ready.catch(() => false))) return;
    this.recovery ??= this.recover().finally(() => {
      this.recovery = null;
    });
    await this.recovery;
  }

  private async recover(): Promise<void> {
    if (await this.isReady().catch(() => false)) {
      console.log(
        JSON.stringify({
          severity: "INFO",
          message: "Session storage ready after startup failure",
          source: SESSION_STORAGE_READY_SOURCE,
        }),
      );
      return;
    }
    const cause = await probeDbCause(this.sessionClient);
    reportError(
      sanitizeDbError(cause ?? new Error("Session storage is not ready")),
      {
        source: SESSION_STORAGE_READY_SOURCE,
        extra: { phase: "request" },
      },
    );
  }

  override async storeSession(
    ...args: Parameters<PrismaSessionStorage<PrismaClient>["storeSession"]>
  ) {
    await this.readyForRequest();
    return super.storeSession(...args);
  }

  override async loadSession(
    ...args: Parameters<PrismaSessionStorage<PrismaClient>["loadSession"]>
  ) {
    await this.readyForRequest();
    return super.loadSession(...args);
  }

  override async deleteSession(
    ...args: Parameters<PrismaSessionStorage<PrismaClient>["deleteSession"]>
  ) {
    await this.readyForRequest();
    return super.deleteSession(...args);
  }

  override async deleteSessions(
    ...args: Parameters<PrismaSessionStorage<PrismaClient>["deleteSessions"]>
  ) {
    await this.readyForRequest();
    return super.deleteSessions(...args);
  }

  override async findSessionsByShop(
    ...args: Parameters<
      PrismaSessionStorage<PrismaClient>["findSessionsByShop"]
    >
  ) {
    await this.readyForRequest();
    return super.findSessionsByShop(...args);
  }
}

const prismaSessionStorage = new ReadyOnRequestSessionStorage(
  prisma,
  SESSION_STORAGE_STARTUP_OPTIONS,
);
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
