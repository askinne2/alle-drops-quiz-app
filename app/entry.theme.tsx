/**
 * Theme Entry Point
 * Dual-mode bundle:
 *  - In the parent Shopify page (window.self === window.top): injects an iframe pointing at /quiz-embed
 *  - Inside the /quiz-embed iframe (window.self !== window.top): mounts React quiz directly
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuizContainer } from "./components/quiz/QuizContainer";
import { toRelativePath } from "./lib/quiz/navigation";
import "./styles/quiz-theme.css";

type QuizConfig = {
  appUrl?: string;
  consultRedirectUrl?: string;
  testOptionsRedirectUrl?: string;
  testMode?: boolean;
};

function getConfig(): QuizConfig {
  return (window as unknown as { AlleDropsQuizConfig?: QuizConfig }).AlleDropsQuizConfig ?? {};
}

function mountReact(container: Element) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <QuizContainer />
    </StrictMode>
  );
}

function injectIframe(container: Element) {
  const cfg = getConfig();
  const appUrl = (cfg.appUrl ?? "").replace(/\/$/, "");

  if (!appUrl) {
    container.innerHTML =
      '<p style="text-align:center;padding:2rem;color:#999;">Quiz app URL not configured.</p>';
    return;
  }

  const params = new URLSearchParams({
    consult: cfg.consultRedirectUrl ?? "",
    testOptions: cfg.testOptionsRedirectUrl ?? "",
    test: cfg.testMode ? "1" : "0",
    shop: window.location.hostname,
  });

  const iframe = document.createElement("iframe");
  iframe.src = `${appUrl}/quiz-embed?${params.toString()}`;
  iframe.style.cssText =
    "width:100%;border:none;display:block;min-height:600px;overflow:hidden;";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("title", "AlleDrops Symptom Assessment");
  iframe.setAttribute("id", `alledrops-quiz-iframe-${Date.now()}`);

  container.innerHTML = "";
  container.appendChild(iframe);

  // The third parent-side message listener in this codebase, and the one that was believed dead.
  //
  // Plan 01-04 measured that the installed Liquid block never loads this bundle and renders no
  // `data-alledrops-quiz` container, and concluded this branch was unreachable. That is true of the
  // STOREFRONT path. It is not true of `/quiz-embed` itself, which renders that container AND loads
  // the bundle — so opening `/quiz-embed` top-level runs `injectIframe`, not `mountReact`, and
  // registers this listener on a PHI-collecting page on the app origin.
  //
  // Verified exploitable against production on 2026-07-30 before this fix: a `quiz:navigate`
  // carrying `url: "https://example.com/pwned"` navigated the real page. An opener can postMessage
  // into a window it opened via `window.open`, so an attacker page could open the genuine clinic
  // intake and then silently replace it with a phishing clone.
  //
  // It survived the earlier hardening because it reads the ABANDONED `url` key. The `url` -> `path`
  // rename made the storefront contract fail closed, and this listener quietly kept the old
  // contract alive underneath it. It now mirrors the Liquid parent exactly: origin first, then
  // validate through the canonical `toRelativePath`, and scroll instantly per D-06.
  const appOrigin = (() => {
    try {
      return new URL(iframe.src).origin;
    } catch {
      return "";
    }
  })();

  window.addEventListener("message", (e: MessageEvent) => {
    if (!appOrigin || e.origin !== appOrigin) return;
    if (!e.data || typeof e.data !== "object") return;

    if (e.data.type === "quiz:resize") {
      const h = Number(e.data.height);
      if (Number.isFinite(h) && h > 0) {
        iframe.style.height = `${h + 24}px`;
      }
    }
    if (e.data.type === "quiz:navigate") {
      const target = toRelativePath(e.data.path);
      if (target) window.location.assign(target);
    }
    if (e.data.type === "quiz:scrollToTop") {
      container.scrollIntoView({ block: "start" });
    }
  });
}

function initQuiz() {
  const containers = document.querySelectorAll("[data-alledrops-quiz]");
  const inIframe = window.self !== window.top;

  containers.forEach((container) => {
    if (container.hasAttribute("data-quiz-initialized")) return;
    container.setAttribute("data-quiz-initialized", "true");

    if (inIframe) {
      mountReact(container);
    } else {
      injectIframe(container);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuiz);
} else {
  initQuiz();
}

(window as any).AlleDropsQuiz = { init: initQuiz };
