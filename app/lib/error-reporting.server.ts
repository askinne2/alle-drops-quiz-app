/**
 * Server error reporting for Google Cloud Error Reporting (no third-party SDK).
 *
 * Cloud Run ships every stderr line to Cloud Logging. A line that is a JSON object is parsed as a
 * structured entry, and an ERROR entry carrying the ReportedErrorEvent `@type` plus a stack trace
 * in `message` is picked up and grouped by Error Reporting. This stays inside AOD's Google project
 * (BAA-covered); nothing is sent to another vendor.
 *
 * PHI rules (see CLAUDE.md): the payload carries only a sanitized error header + stack frames, the
 * HTTP method, the URL path (never the query string), a status, route params that are opaque IDs,
 * and Cloud Run's trace ID. It never carries request bodies, headers, cookies, or arbitrary
 * enumerable properties of the error object. Postgres errors in particular put row values in
 * `detail` ("Failing row contains (...)") and sometimes in `message`, so for those only the
 * SQLSTATE code and constraint name are kept.
 */

const REPORTED_ERROR_EVENT_TYPE =
  "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";

const DEFAULT_SERVICE = "alle-drops-quiz-app";
const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_FRAMES = 50;

/** Route params whose values are opaque identifiers and safe to log. */
const SAFE_PARAM_KEYS = new Set(["id", "fileId"]);

/**
 * PHI / secret field names (CLAUDE.md § PHI fields, plus credentials). Matched case-insensitively
 * after stripping `_` and `-`, so `patient_email`, `patientEmail` and `EMAIL` all match.
 */
const PHI_KEY_EXACT = new Set([
  "name",
  "dob",
  "state",
  "ip",
  "body",
  "detail",
  "where",
  "answers",
  "files",
  "headers",
  "cookie",
  "cookies",
  "authorization",
  "query",
  "search",
  "params",
  "values",
]);
const PHI_KEY_SUBSTRINGS = [
  "name", // first_name, last_name, patient_name, filename
  "email",
  "phone",
  "birth",
  "dob",
  "address",
  "answer",
  "history",
  "score",
  "bracket",
  "symptom",
  "submissionfile",
  "useragent",
  "remoteip",
  "clientip",
  "token",
  "password",
  "secret",
  "apikey",
  "cookie",
  "authorization",
];

export const REDACTED = "[REDACTED]";

export function isPhiKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[_-]/g, "");
  if (PHI_KEY_EXACT.has(k)) return true;
  return PHI_KEY_SUBSTRINGS.some((s) => k.includes(s));
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
const US_DATE_RE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/** Redact PHI-shaped substrings (emails, dates such as a DOB, phone numbers) from free text. */
export function scrubText(text: string): string {
  return text
    .replace(EMAIL_RE, "[email]")
    .replace(ISO_DATE_RE, "[date]")
    .replace(US_DATE_RE, "[date]")
    .replace(PHONE_RE, "[phone]");
}

/** Recursively redact PHI keys and PHI-shaped strings. Depth-limited; drops functions. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrubValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isPhiKey(k) ? REDACTED : scrubValue(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

type ErrorLike = { name?: unknown; message?: unknown; stack?: unknown; code?: unknown };

function isPostgresError(err: ErrorLike & Record<string, unknown>): boolean {
  return (
    typeof err.code === "string" &&
    /^[0-9A-Z]{5}$/.test(err.code) &&
    ("severity" in err || "routine" in err || "detail" in err)
  );
}

function safeIdentifier(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_.$-]{1,63}$/.test(value) ? value : undefined;
}

/**
 * Build `Name: message\n    at ...` from an error, keeping the original stack frames but never the
 * original header text (which repeats the unscrubbed message).
 */
function buildStack(err: unknown): { stack: string; errorCode?: string } {
  if (!(err instanceof Error)) {
    // A thrown string/object could itself be PHI: record only its type.
    const synthetic = new Error(`Non-Error value thrown (${err === null ? "null" : typeof err})`);
    return { stack: buildStack(synthetic).stack };
  }

  const e = err as Error & Record<string, unknown>;
  const name = safeIdentifier(e.name) ?? "Error";
  let message: string;
  let errorCode: string | undefined;

  if (isPostgresError(e)) {
    errorCode = e.code as string;
    const constraint = safeIdentifier(e.constraint);
    message = `Postgres error ${errorCode}${constraint ? ` (constraint ${constraint})` : ""}`;
  } else {
    errorCode = typeof e.code === "string" ? safeIdentifier(e.code) : undefined;
    message = scrubText(String(e.message ?? "")).replace(/\s+/g, " ").trim();
    if (message.length > MAX_MESSAGE_LENGTH) message = `${message.slice(0, MAX_MESSAGE_LENGTH)}...`;
  }

  const frames =
    typeof e.stack === "string"
      ? e.stack
          .split("\n")
          .filter((line) => /^\s+at /.test(line))
          .slice(0, MAX_STACK_FRAMES)
          .map((line) => scrubText(line))
      : [];

  const header = message ? `${name}: ${message}` : name;
  return { stack: [header, ...frames].join("\n"), errorCode };
}

export interface ErrorReportContext {
  request?: Request;
  /** React Router route params. Only opaque-ID keys (`id`, `fileId`) are kept. */
  params?: Record<string, string | undefined>;
  /** HTTP status the request ended with, if known. */
  status?: number;
  /** Short non-PHI label for where the error was caught, e.g. "handleError". */
  source?: string;
  /** Extra non-PHI context. PHI keys and PHI-shaped strings are redacted regardless. */
  extra?: Record<string, unknown>;
}

export interface ErrorReportEntry {
  severity: "ERROR" | "WARNING";
  "@type"?: string;
  message: string;
  serviceContext: { service: string; version: string };
  context?: {
    httpRequest?: { method?: string; url?: string; responseStatusCode?: number };
  };
  source?: string;
  errorCode?: string;
  traceId?: string;
  params?: Record<string, string>;
  extra?: unknown;
  "logging.googleapis.com/trace"?: string;
}

function traceFromRequest(request: Request | undefined): string | undefined {
  // Cloud Run sets X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=1
  const header = request?.headers.get("x-cloud-trace-context");
  const traceId = header?.split("/")[0];
  return traceId && /^[0-9a-f]{16,64}$/i.test(traceId) ? traceId : undefined;
}

function pathOnly(url: string): string | undefined {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

/** Pure formatter: turn an error + request context into one Cloud Logging structured entry. */
export function formatErrorReport(
  error: unknown,
  ctx: ErrorReportContext = {},
  env: NodeJS.ProcessEnv = process.env,
): ErrorReportEntry {
  const { stack, errorCode } = buildStack(error);

  const entry: ErrorReportEntry = {
    severity: "ERROR",
    "@type": REPORTED_ERROR_EVENT_TYPE,
    message: stack,
    serviceContext: {
      service: env.K_SERVICE || DEFAULT_SERVICE,
      version: env.K_REVISION || "local",
    },
  };

  if (ctx.request) {
    entry.context = {
      httpRequest: {
        method: ctx.request.method,
        url: pathOnly(ctx.request.url),
        ...(ctx.status ? { responseStatusCode: ctx.status } : {}),
      },
    };
    const traceId = traceFromRequest(ctx.request);
    if (traceId) {
      entry.traceId = traceId;
      const project = env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT;
      if (project) entry["logging.googleapis.com/trace"] = `projects/${project}/traces/${traceId}`;
    }
  } else if (ctx.status) {
    entry.context = { httpRequest: { responseStatusCode: ctx.status } };
  }

  if (ctx.params) {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(ctx.params)) {
      const safe = SAFE_PARAM_KEYS.has(k) ? safeIdentifier(v) : undefined;
      if (safe) params[k] = safe;
    }
    if (Object.keys(params).length) entry.params = params;
  }

  if (ctx.source) entry.source = safeIdentifier(ctx.source) ?? "unknown";
  if (errorCode) entry.errorCode = errorCode;
  if (ctx.extra) entry.extra = scrubValue(ctx.extra);

  return entry;
}

/** Write a structured entry to stderr as a single JSON line (Cloud Run -> Cloud Logging). */
function writeEntry(entry: ErrorReportEntry): void {
  try {
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  } catch {
    // Never let reporting throw into the request path.
  }
}

/** Report an error to Cloud Error Reporting via structured stderr logging. */
export function reportError(error: unknown, ctx: ErrorReportContext = {}): void {
  writeEntry(formatErrorReport(error, ctx));
}

/**
 * Log a non-5xx condition (e.g. a 404 for an unknown URL) as a WARNING. Error Reporting ignores
 * WARNING entries, so bot traffic doesn't create error groups or alert emails.
 */
export function reportWarning(error: unknown, ctx: ErrorReportContext = {}): void {
  const entry = formatErrorReport(error, ctx);
  entry.severity = "WARNING";
  delete entry["@type"];
  // Only the header line: a 404's stack points at router internals and adds nothing.
  entry.message = entry.message.split("\n")[0];
  writeEntry(entry);
}

const INSTALLED = Symbol.for("alledrops.errorReporting.processHandlersInstalled");

/**
 * Report uncaught exceptions and unhandled promise rejections. Uses `uncaughtExceptionMonitor`,
 * which observes without changing Node's default behavior (log + exit), so a crash still
 * restarts the instance exactly as before. Idempotent across HMR / repeated imports.
 */
export function installProcessErrorHandlers(): void {
  const g = globalThis as Record<symbol, unknown>;
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;
  process.on("uncaughtExceptionMonitor", (error, origin) => {
    reportError(error, { source: origin });
  });
}
