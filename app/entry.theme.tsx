/**
 * Theme Entry Point
 * Standalone bundle for embedding quiz directly in Shopify themes
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuizContainer } from "./components/quiz/QuizContainer";
import {
  getHardcodedQuestions,
  groupQuestionsByCategory,
} from "./lib/quiz/questions";
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
    
    // Load questions
    const questions = getHardcodedQuestions();
    const categories = groupQuestionsByCategory(questions);
    
    // Render React app
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <QuizContainer categories={categories} />
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

