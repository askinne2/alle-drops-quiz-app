/**
 * Theme Entry Point
 * Dual-mode bundle:
 *  - In the parent Shopify page (window.self === window.top): injects an iframe pointing at /quiz-embed
 *  - Inside the /quiz-embed iframe (window.self !== window.top): mounts React quiz directly
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuizContainer } from "./components/quiz/QuizContainer";
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

  window.addEventListener("message", (e: MessageEvent) => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "quiz:resize") {
      iframe.style.height = `${Number(e.data.height) + 24}px`;
    }
    if (e.data.type === "quiz:navigate" && e.data.url) {
      window.location.assign(String(e.data.url));
    }
    if (e.data.type === "quiz:scrollToTop") {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
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
