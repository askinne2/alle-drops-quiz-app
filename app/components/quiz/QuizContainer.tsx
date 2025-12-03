/**
 * Quiz Container Component
 * Main wrapper that manages quiz state and coordinates all components
 * 
 * Flow matches allergist-on-demand/docs/quiz-questions-schema.md:
 * 1. Demographics (Region + Timing) - first step
 * 2. Nasal Symptoms
 * 3. Eye Symptoms
 * 4. Respiratory Symptoms
 * 5. Skin Symptoms
 * 6. Throat & Mouth Symptoms
 * 7. Contact Information (last)
 */

import { useState, useCallback, useEffect } from "react";
import { QuizProgress } from "./QuizProgress";
import { QuestionCategory } from "./QuestionCategory";
import { RegionSelector, type USRegion } from "./RegionSelector";
import { QuizNavigation } from "./QuizNavigation";
import { ResultsDisplay } from "./ResultsDisplay";
import { type QuizCategory } from "../../lib/quiz/types";
import {
  SEASONAL_TIMING_OPTIONS,
  DURATION_OPTIONS,
} from "../../lib/quiz/questions";
import {
  calculateScore,
  determineSeverityLevel,
  generateSymptomProfileId,
} from "../../lib/quiz/scoring";
import styles from "../../styles/quiz.module.css";

interface QuizContainerProps {
  categories: QuizCategory[];
  initialEmail?: string;
}

type QuizState = "active" | "submitting" | "completed" | "error";

// Enable test mode via URL param or config
const isTestModeEnabled = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("test") === "1" || (window as any).AlleDropsQuizConfig?.testMode === true;
};

export function QuizContainer({ categories, initialEmail = "" }: QuizContainerProps) {
  // Total steps = 1 (demographics: region + timing) + symptom categories + 1 (contact)
  const totalSteps = 1 + categories.length + 1;
  const contactStep = 1 + categories.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [region, setRegion] = useState<USRegion | "">("");
  const [seasonalTiming, setSeasonalTiming] = useState("");
  const [duration, setDuration] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [customerName, setCustomerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>("active");
  const [startTime] = useState(Date.now());
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    severityLevel: string;
    region: string;
    customerId?: string;
    symptomProfileId?: string;
  } | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showTestMode, setShowTestMode] = useState(false);

  // Check for test mode on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowTestMode(isTestModeEnabled());
    }
  }, []);

  // Test Mode: Auto-complete quiz with sample data
  const runTestMode = useCallback(async () => {
    if (!confirm("🧪 Test Mode: This will auto-fill and submit the quiz with sample data. Continue?")) {
      return;
    }

    console.log("🧪 Test Mode: Starting auto-fill...");

    // Test data - simulates a severe symptom case
    const testResponses: Record<string, number> = {
      // Nasal symptoms (all severe = 3)
      nasal_runny: 3,
      nasal_stuffy: 3,
      nasal_sneezing: 3,
      nasal_postnasal: 3,
      nasal_smell_loss: 3,
      // Eye symptoms (all severe = 3)
      eye_watery: 3,
      eye_itchy: 3,
      eye_red: 3,
      eye_swollen: 3,
      // Respiratory symptoms (all severe = 3)
      respiratory_cough: 3,
      respiratory_wheeze: 3,
      respiratory_tight: 3,
      respiratory_breath: 3,
      // Skin symptoms (all severe = 3)
      skin_rash: 3,
      skin_hives: 3,
      skin_itching: 3,
      skin_eczema: 3,
      // Throat symptoms (all severe = 3)
      throat_itchy: 3,
      throat_sore: 3,
      throat_mouth_itchy: 3,
    };

    // Set all responses
    setResponses(testResponses);
    setRegion("northwest");
    setSeasonalTiming("spring");
    setDuration("1_3yrs");
    setCustomerName("Test User");
    setEmail("test@example.com");
    setConsent(true);

    // Navigate through all steps quickly for visual feedback
    for (let i = 0; i <= contactStep; i++) {
      setCurrentStep(i);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log("🧪 Test Mode: Ready to submit!");
    alert("🧪 Test data filled! Click 'Submit Assessment' to complete the test.");
  }, [contactStep]);

  // Get current symptom category index (0-based, offset by 1 for demographics step)
  const currentCategoryIndex = currentStep - 1;

  // Check if current step is complete
  const isCurrentStepComplete = useCallback(() => {
    // Step 0: Demographics (Region + Timing)
    if (currentStep === 0) {
      return region !== "" && seasonalTiming !== "" && duration !== "";
    }
    
    // Symptom categories (steps 1 to categories.length)
    if (currentStep >= 1 && currentStep <= categories.length) {
      const categoryIndex = currentStep - 1;
      const category = categories[categoryIndex];
      return category?.questions.every((q) => responses[q.id] !== undefined) ?? false;
    }
    
    // Contact step
    if (currentStep === contactStep) {
      const isEmailValid = email.includes("@") && email.includes(".");
      return customerName.trim() !== "" && isEmailValid && consent;
    }
    
    return false;
  }, [currentStep, region, seasonalTiming, duration, categories, responses, contactStep, email, customerName, consent]);

  // Handle response change
  const handleResponseChange = useCallback((questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Scroll to top of quiz container
      setTimeout(() => {
        const quizContainer = document.querySelector('[data-alledrops-quiz]');
        if (quizContainer) {
          quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  }, [currentStep]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (isCurrentStepComplete() && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll to top of quiz container
      setTimeout(() => {
        const quizContainer = document.querySelector('[data-alledrops-quiz]');
        if (quizContainer) {
          quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  }, [currentStep, totalSteps, isCurrentStepComplete]);

  // Handle quiz submission
  const handleSubmit = useCallback(async () => {
    if (!isCurrentStepComplete()) {
      alert("Please complete all required fields.");
      return;
    }

    // Calculate score
    const score = calculateScore(responses);
    const severityLevel = determineSeverityLevel(score);
    const completionTime = Math.round((Date.now() - startTime) / 1000);
    const symptomProfileId = generateSymptomProfileId();

    // Prepare submission data
    const submissionData = {
      email,
      customer_name: customerName,
      symptom_profile_id: symptomProfileId,
      quiz_score: score,
      quiz_region: region,
      severity_level: severityLevel,
      quiz_date: new Date().toISOString(),
      quiz_responses: Object.values(responses),
      completion_time: completionTime,
      timing_seasonal: seasonalTiming,
      timing_duration: duration,
    };

    // Submit via fetch API
    setQuizState("submitting");
    setSubmissionError(null);

    try {
      // Get API endpoint from config (set by theme block)
      const apiEndpoint = (window as any).AlleDropsQuizConfig?.apiEndpoint || "/api/quiz/submit";
      
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      
      // Log response for debugging
      console.log("Quiz submission response:", result);
      console.log("Response status:", response.status);

      if (result.success) {
        console.log("✅ Quiz submitted successfully:", {
          customerId: result.customerId,
          message: result.message,
        });
        setSubmissionResult({
          score,
          severityLevel,
          region,
          customerId: result.customerId,
          symptomProfileId: symptomProfileId,
        });
        setQuizState("completed");
      } else {
        console.error("❌ Quiz submission failed:", result);
        setSubmissionError(result.error || "Failed to submit quiz");
        setQuizState("error");
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Network error");
      setQuizState("error");
    }
  }, [email, customerName, region, responses, startTime, seasonalTiming, duration, isCurrentStepComplete]);

  // Show results if completed
  if (quizState === "completed" && submissionResult) {
    return (
      <ResultsDisplay
        score={submissionResult.score}
        severityLevel={submissionResult.severityLevel as any}
        region={submissionResult.region}
        customerId={submissionResult.customerId}
        symptomProfileId={submissionResult.symptomProfileId}
      />
    );
  }

  // Show error state
  if (quizState === "error") {
    return (
      <div className={styles.quizError}>
        <h2>Error</h2>
        <p>{submissionError || "There was an error submitting your quiz. Please try again."}</p>
        <button onClick={() => { setQuizState("active"); setSubmissionError(null); }}>
          Retry
        </button>
      </div>
    );
  }

  // Render step content
  const renderStepContent = () => {
    // Step 0: Demographics (Region + Timing)
    if (currentStep === 0) {
      return (
        <div className={styles.quizContainer__demographics}>
          {/* Region Selection */}
          <div className={styles.questionCard}>
            <label className={styles.questionCard__label}>
              Where do you live most of the year? <span className={styles.required}>*</span>
            </label>
            <p className={styles.questionCard__subtitle}>
              Our Regional Allergy Drops are formulated for specific areas of the United States.
            </p>
            <RegionSelector
              value={region}
              onChange={setRegion}
              disabled={quizState === "submitting"}
              required
            />
          </div>
          
          {/* Seasonal Timing */}
          <div className={styles.questionCard}>
            <label className={styles.questionCard__label}>
              When do your allergy symptoms usually flare up? <span className={styles.required}>*</span>
            </label>
            <p className={styles.questionCard__subtitle}>
              This helps us understand your allergy pattern.
            </p>
            <div className={styles.questionCard__optionsVertical}>
              {SEASONAL_TIMING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`${styles.questionCard__optionVertical} ${
                    seasonalTiming === option.value ? styles.questionCard__optionSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="seasonal_timing"
                    value={option.value}
                    checked={seasonalTiming === option.value}
                    onChange={(e) => setSeasonalTiming(e.target.value)}
                    disabled={quizState === "submitting"}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Duration */}
          <div className={styles.questionCard}>
            <label className={styles.questionCard__label}>
              How long have you been experiencing allergy symptoms? <span className={styles.required}>*</span>
            </label>
            <div className={styles.questionCard__optionsVertical}>
              {DURATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`${styles.questionCard__optionVertical} ${
                    duration === option.value ? styles.questionCard__optionSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={option.value}
                    checked={duration === option.value}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={quizState === "submitting"}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Symptom categories (steps 1 to categories.length)
    if (currentStep >= 1 && currentStep <= categories.length) {
      const categoryIndex = currentStep - 1;
      const category = categories[categoryIndex];
      if (!category) return null;
      
      return (
        <QuestionCategory
          category={category}
          responses={responses}
          onResponseChange={handleResponseChange}
          isActive={true}
          disabled={quizState === "submitting"}
        />
      );
    }
    
    // Contact step (last)
    if (currentStep === contactStep) {
      return (
        <div className={styles.quizContainer__contact}>
          <h2 className={styles.questionCategory__title}>Contact Information</h2>
          <p className={styles.quizContainer__subtitle}>
            We need your information to provide personalized recommendations.
          </p>
          
          {/* Full Name */}
          <div className={styles.quizContainer__field}>
            <label htmlFor="customer-name">
              Your Full Name <span className={styles.required}>*</span>
            </label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Smith"
              required
              disabled={quizState === "submitting"}
              className={styles.quizContainer__input}
            />
          </div>
          
          {/* Email */}
          <div className={styles.quizContainer__field}>
            <label htmlFor="customer-email">
              Your Email Address <span className={styles.required}>*</span>
            </label>
            <input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.smith@example.com"
              required
              disabled={quizState === "submitting"}
              className={styles.quizContainer__input}
            />
          </div>
          
          {/* Consent */}
          <div className={styles.quizContainer__consent}>
            <label className={styles.quizContainer__consentLabel}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={quizState === "submitting"}
                required
              />
              <span>
                I consent to AlleDrops storing my symptom information for product recommendation 
                purposes. I understand this assessment does not constitute medical advice and 
                does not replace consultation with a healthcare provider.
              </span>
            </label>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={styles.quizContainer}>
      {/* Progress */}
      <QuizProgress currentCategory={currentStep} totalCategories={totalSteps} />

      {/* Step Content */}
      <div className={styles.quizContainer__questions}>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <QuizNavigation
        currentCategory={currentStep}
        totalCategories={totalSteps}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
        canGoPrevious={currentStep > 0}
        canGoNext={isCurrentStepComplete() && currentStep < totalSteps - 1}
        canSubmit={isCurrentStepComplete() && currentStep === totalSteps - 1}
        isSubmitting={quizState === "submitting"}
      />

      {/* Disclaimer (show on first step only) */}
      {currentStep === 0 && (
        <div className={styles.quizContainer__disclaimer}>
          <p>
            <strong>Medical Disclaimer:</strong> This assessment is for product recommendation purposes
            only and does not constitute medical advice. It does not replace consultation with a
            healthcare provider.
          </p>
        </div>
      )}

      {/* Test Mode Button (only visible when enabled) */}
      {showTestMode && (
        <div className={styles.quizContainer__testMode}>
          <button
            type="button"
            onClick={runTestMode}
            className={styles.quizContainer__testButton}
          >
            🧪 Test Mode: Auto-Complete Quiz
          </button>
          <p className={styles.quizContainer__testNote}>
            This will automatically fill and submit the quiz with test data
          </p>
        </div>
      )}
    </div>
  );
}
