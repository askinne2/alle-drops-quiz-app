/**
 * Theme Entry Point
 * Standalone bundle for embedding quiz directly in Shopify themes
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuizContainer } from "./components/quiz/QuizContainer";
// Import theme CSS that inherits from Shopify theme variables
import "./styles/quiz-theme.css";

// Initialize quiz when DOM is ready
function initQuiz() {
  const containers = document.querySelectorAll("[data-alledrops-quiz]");
  
  containers.forEach((container) => {
    if (container.hasAttribute("data-quiz-initialized")) {
      return; // Already initialized
    }
    
    container.setAttribute("data-quiz-initialized", "true");
    
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <QuizContainer />
      </StrictMode>
    );
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuiz);
} else {
  initQuiz();
}

// Also expose for manual initialization
(window as any).AlleDropsQuiz = {
  init: initQuiz,
};

