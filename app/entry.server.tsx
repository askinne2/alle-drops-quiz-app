import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { type EntryContext, type HandleErrorFunction, isRouteErrorResponse } from "react-router";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import {
  installProcessErrorHandlers,
  reportError,
  reportWarning,
} from "./lib/error-reporting.server";

export const streamTimeout = 5000;

installProcessErrorHandlers();

/**
 * Central handler for errors thrown from loaders, actions and rendering. Replaces React Router's
 * default `console.error(error)`, which printed the whole error object (including Postgres
 * `detail`, which can echo PHI row values) as multi-line plain text. See error-reporting.server.ts.
 */
export const handleError: HandleErrorFunction = (error, { request, params }) => {
  if (request.signal.aborted) return;
  if (isRouteErrorResponse(error)) {
    // Router-generated responses (e.g. 404 "No route matches URL") carry the real error inside.
    const inner = (error as { error?: unknown }).error ?? new Error(`${error.status} ${error.statusText}`);
    if (error.status < 500) {
      reportWarning(inner, { request, params, status: error.status, source: "handleError" });
      return;
    }
    reportError(inner, { request, params, status: error.status, source: "handleError" });
    return;
  }
  reportError(error, { request, params, status: 500, source: "handleError" });
};

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          reportError(error, { request, status: 500, source: "renderToPipeableStream" });
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
