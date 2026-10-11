import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatErrorReport,
  reportError,
  reportWarning,
  scrubText,
  scrubValue,
  isPhiKey,
  REDACTED,
} from "../app/lib/error-reporting.server";

const ENV = { K_SERVICE: "alle-drops-quiz-app", K_REVISION: "alle-drops-quiz-app-00042-abc" };

function req(url: string, init: RequestInit & { trace?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.trace) headers.set("x-cloud-trace-context", init.trace);
  return new Request(url, { ...init, headers });
}

describe("formatErrorReport: Cloud Error Reporting shape", () => {
  it("emits ERROR + ReportedErrorEvent @type + serviceContext from K_* env", () => {
    const entry = formatErrorReport(new TypeError("boom"), {}, ENV);
    expect(entry.severity).toBe("ERROR");
    expect(entry["@type"]).toBe(
      "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent"
    );
    expect(entry.serviceContext).toEqual({
      service: "alle-drops-quiz-app",
      version: "alle-drops-quiz-app-00042-abc",
    });
  });

  it("puts a Node-format stack in message: header line then `    at` frames", () => {
    const entry = formatErrorReport(new TypeError("boom"), {}, ENV);
    const lines = entry.message.split("\n");
    expect(lines[0]).toBe("TypeError: boom");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(1)) expect(line).toMatch(/^\s+at /);
  });

  it("falls back to local version and default service outside Cloud Run", () => {
    const entry = formatErrorReport(new Error("x"), {}, {});
    expect(entry.serviceContext).toEqual({ service: "alle-drops-quiz-app", version: "local" });
  });

  it("serializes to a single JSON line", () => {
    const line = JSON.stringify(formatErrorReport(new Error("multi\nline"), {}, ENV));
    expect(line).not.toContain("\n");
    expect(JSON.parse(line).message.split("\n")[0]).toBe("Error: multi line");
  });

  it("records method, path (no query), status, trace and opaque ID params", () => {
    const entry = formatErrorReport(
      new Error("x"),
      {
        request: req("https://app.example/api/admin/submission/123?email=jane@example.com", {
          method: "POST",
          trace: "105445aa7843bc8bf206b12000100000/1;o=1",
        }),
        params: { id: "123", email: "jane@example.com" },
        status: 500,
      },
      { ...ENV, GOOGLE_CLOUD_PROJECT: "aod-production-510006" }
    );
    expect(entry.context?.httpRequest).toEqual({
      method: "POST",
      url: "/api/admin/submission/123",
      responseStatusCode: 500,
    });
    expect(entry.traceId).toBe("105445aa7843bc8bf206b12000100000");
    expect(entry["logging.googleapis.com/trace"]).toBe(
      "projects/aod-production-510006/traces/105445aa7843bc8bf206b12000100000"
    );
    expect(entry.params).toEqual({ id: "123" });
    expect(JSON.stringify(entry)).not.toContain("jane@example.com");
  });

  it("never includes the request body or headers", async () => {
    const body = JSON.stringify({ name: "Jane Doe", dob: "1990-01-15" });
    const entry = formatErrorReport(
      new Error("x"),
      {
        request: req("https://app.example/api/quiz/submit", {
          method: "POST",
          body,
          headers: { cookie: "session=abc", authorization: "Bearer tok", "user-agent": "UA" },
        }),
      },
      ENV
    );
    const json = JSON.stringify(entry);
    for (const s of ["Jane Doe", "1990-01-15", "session=abc", "Bearer tok", "UA"]) {
      expect(json).not.toContain(s);
    }
  });
});

describe("formatErrorReport: PHI scrubbing", () => {
  it("keeps only SQLSTATE + constraint for Postgres errors (drops detail and message)", () => {
    const pgErr = Object.assign(
      new Error('invalid input syntax for type date: "Jane Doe 1990-13-45"'),
      {
        code: "22007",
        severity: "ERROR",
        detail: "Failing row contains (1, Jane Doe, jane@example.com, 1990-01-15).",
        constraint: "submissions_pkey",
        routine: "DateTimeParseError",
      }
    );
    const entry = formatErrorReport(pgErr, {}, ENV);
    expect(entry.message.split("\n")[0]).toBe(
      "Error: Postgres error 22007 (constraint submissions_pkey)"
    );
    expect(entry.errorCode).toBe("22007");
    const json = JSON.stringify(entry);
    for (const s of ["Jane", "jane@example.com", "1990", "Failing row"]) {
      expect(json).not.toContain(s);
    }
  });

  it("does not copy arbitrary enumerable properties of the error", () => {
    const err = Object.assign(new Error("upstream failed"), {
      response: { body: { email: "jane@example.com" } },
      answers: { q1: "yes" },
    });
    const json = JSON.stringify(formatErrorReport(err, {}, ENV));
    expect(json).not.toContain("jane@example.com");
    expect(json).not.toContain("q1");
  });

  it("redacts PHI-shaped text in the error message", () => {
    const entry = formatErrorReport(
      new Error("lookup failed for jane.doe+test@example.com dob 1990-01-15 / 01/15/1990 phone (615) 555-1234"),
      {},
      ENV
    );
    const header = entry.message.split("\n")[0];
    expect(header).toBe(
      "Error: lookup failed for [email] dob [date] / [date] phone [phone]"
    );
  });

  it("records only the type of a non-Error thrown value", () => {
    const entry = formatErrorReport({ name: "Jane Doe", email: "jane@example.com" }, {}, ENV);
    expect(entry.message.split("\n")[0]).toBe("Error: Non-Error value thrown (object)");
    expect(JSON.stringify(entry)).not.toContain("Jane");
    expect(formatErrorReport("Jane Doe", {}, ENV).message).not.toContain("Jane");
  });

  it("redacts PHI keys in extra context, recursively", () => {
    const entry = formatErrorReport(
      new Error("x"),
      {
        extra: {
          submissionId: 42,
          step: "promote",
          patient_email: "jane@example.com",
          nested: { firstName: "Jane", dob: "1990-01-15", quiz_score: 9, ok: true },
          answers: { q1: "yes" },
          note: "contact jane@example.com",
        },
      },
      ENV
    );
    expect(entry.extra).toEqual({
      submissionId: 42,
      step: "promote",
      patient_email: REDACTED,
      nested: { firstName: REDACTED, dob: REDACTED, quiz_score: REDACTED, ok: true },
      answers: REDACTED,
      note: "contact [email]",
    });
  });
});

describe("isPhiKey / scrubText / scrubValue", () => {
  it("matches the CLAUDE.md PHI field list in any casing", () => {
    for (const k of [
      "name", "dob", "phone", "email", "state", "quiz_score", "score_bracket", "answers",
      "personal_history", "family_history", "uploaded_filename", "submission_files",
      "patientEmail", "PATIENT_NAME", "date_of_birth", "user-agent", "password", "accessToken",
    ]) {
      expect(isPhiKey(k), k).toBe(true);
    }
    for (const k of ["submissionId", "id", "status", "step", "code", "shop", "count"]) {
      expect(isPhiKey(k), k).toBe(false);
    }
  });

  it("leaves ordinary text alone", () => {
    expect(scrubText("connect ECONNREFUSED 10.0.0.1:5432")).toBe("connect ECONNREFUSED 10.0.0.1:5432");
  });

  it("truncates deep structures", () => {
    expect(scrubValue({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({
      a: { b: { c: { d: "[truncated]" } } },
    });
  });
});

describe("reportError / reportWarning write one JSON line to stderr", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reportError writes an ERROR entry", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    reportError(new Error("boom"), { source: "test" });
    expect(spy).toHaveBeenCalledTimes(1);
    const out = String(spy.mock.calls[0][0]);
    expect(out.endsWith("\n")).toBe(true);
    const entry = JSON.parse(out);
    expect(entry.severity).toBe("ERROR");
    expect(entry.source).toBe("test");
  });

  it("reportWarning writes a WARNING without @type so Error Reporting ignores it", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    reportWarning(new Error('No route matches URL "/wp-login.php"'), {
      request: req("https://app.example/wp-login.php"),
      status: 404,
    });
    const entry = JSON.parse(String(spy.mock.calls[0][0]));
    expect(entry.severity).toBe("WARNING");
    expect(entry["@type"]).toBeUndefined();
    expect(entry.message).not.toContain("\n");
    expect(entry.context.httpRequest.responseStatusCode).toBe(404);
  });
});
