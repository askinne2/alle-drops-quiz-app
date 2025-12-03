/**
 * Quiz Questions Loader
 * Migrated from quiz-config.js
 * Matches order from allergist-on-demand/docs/quiz-questions-schema.md
 */

import { type QuizQuestion, type QuizCategory } from "./types";

/**
 * US Regions for product matching
 */
export const US_REGIONS = [
  { value: "northwest", label: "Northwest" },
  { value: "southwest", label: "Southwest" },
  { value: "north_central", label: "North Central" },
  { value: "south_central", label: "South Central" },
  { value: "midwest", label: "Midwest" },
  { value: "southeast", label: "Southeast" },
  { value: "northeast", label: "Northeast" },
] as const;

/**
 * Seasonal timing options
 */
export const SEASONAL_TIMING_OPTIONS = [
  { value: "spring", label: "Primarily Spring (March-May)" },
  { value: "summer", label: "Primarily Summer (June-August)" },
  { value: "fall", label: "Primarily Fall (September-November)" },
  { value: "winter", label: "Primarily Winter (December-February)" },
  { value: "year_round", label: "Year-Round" },
  { value: "multiple_seasons", label: "Multiple Seasons" },
] as const;

/**
 * Duration options
 */
export const DURATION_OPTIONS = [
  { value: "less_than_1yr", label: "Less than 1 year" },
  { value: "1_3yrs", label: "1-3 years" },
  { value: "3_5yrs", label: "3-5 years" },
  { value: "5_10yrs", label: "5-10 years" },
  { value: "over_10yrs", label: "More than 10 years" },
] as const;

/**
 * Hardcoded quiz questions (fallback)
 * Order matches quiz-questions-schema.md:
 * - Section 2: Nasal (20-24)
 * - Section 3: Eye (30-33)
 * - Section 4: Respiratory (40-43)
 * - Section 5: Skin (50-53)
 * - Section 6: Throat (60-62)
 */
const HARDCODED_QUESTIONS: QuizQuestion[] = [
  // ============================================
  // Section 2: Nasal Symptoms (Order 20-24)
  // Maximum Category Score: 15 points
  // ============================================
  { id: "nasal_runny", category: "Nasal Symptoms", text: "Runny Nose", order: 20 },
  { id: "nasal_stuffy", category: "Nasal Symptoms", text: "Stuffy/Congested Nose", order: 21 },
  { id: "nasal_sneezing", category: "Nasal Symptoms", text: "Sneezing", order: 22 },
  { id: "nasal_postnasal", category: "Nasal Symptoms", text: "Postnasal Drip", order: 23 },
  { id: "nasal_smell_loss", category: "Nasal Symptoms", text: "Loss of Smell", order: 24 },

  // ============================================
  // Section 3: Eye Symptoms (Order 30-33)
  // Maximum Category Score: 12 points
  // ============================================
  { id: "eye_watery", category: "Eye Symptoms", text: "Watery Eyes", order: 30 },
  { id: "eye_itchy", category: "Eye Symptoms", text: "Itchy Eyes", order: 31 },
  { id: "eye_red", category: "Eye Symptoms", text: "Red/Bloodshot Eyes", order: 32 },
  { id: "eye_swollen", category: "Eye Symptoms", text: "Swollen Eyelids", order: 33 },

  // ============================================
  // Section 4: Respiratory Symptoms (Order 40-43)
  // Maximum Category Score: 12 points
  // ============================================
  { id: "respiratory_cough", category: "Respiratory Symptoms", text: "Cough", order: 40 },
  { id: "respiratory_wheeze", category: "Respiratory Symptoms", text: "Wheezing", order: 41 },
  { id: "respiratory_tight", category: "Respiratory Symptoms", text: "Chest Tightness", order: 42 },
  { id: "respiratory_breath", category: "Respiratory Symptoms", text: "Shortness of Breath", order: 43 },

  // ============================================
  // Section 5: Skin Symptoms (Order 50-53)
  // Maximum Category Score: 12 points
  // ============================================
  { id: "skin_rash", category: "Skin Symptoms", text: "Rash", order: 50 },
  { id: "skin_hives", category: "Skin Symptoms", text: "Hives", order: 51 },
  { id: "skin_itching", category: "Skin Symptoms", text: "Itching", order: 52 },
  { id: "skin_eczema", category: "Skin Symptoms", text: "Eczema/Dry Patches", order: 53 },

  // ============================================
  // Section 6: Throat & Mouth Symptoms (Order 60-62)
  // Maximum Category Score: 9 points
  // ============================================
  { id: "throat_itchy", category: "Throat & Mouth Symptoms", text: "Itchy Throat", order: 60 },
  { id: "throat_sore", category: "Throat & Mouth Symptoms", text: "Sore Throat", order: 61 },
  { id: "throat_mouth_itchy", category: "Throat & Mouth Symptoms", text: "Itchy Mouth or Tongue", order: 62 },
];

/**
 * Load questions from Shopify Metaobjects (via Storefront API)
 * TODO: Implement when Storefront API access is available
 */
export async function loadQuestionsFromMetaobjects(
  shopUrl: string
): Promise<QuizQuestion[]> {
  try {
    // TODO: Implement Storefront API query for metaobjects
    // const query = `query { metaobjects(type: "quiz_question", first: 100) { ... } }`;
    // const response = await fetch(`${shopUrl}/api/2024-01/graphql.json`, {...});
    // Transform and return questions
    
    console.warn("Metaobjects loading not yet implemented, using hardcoded questions");
    return [];
  } catch (error) {
    console.error("Error loading metaobjects:", error);
    return [];
  }
}

/**
 * Load questions (hybrid approach)
 * Try Metaobjects first, fallback to hardcoded
 */
export async function loadQuestions(
  useMetaobjects: boolean = false,
  shopUrl: string = ""
): Promise<QuizQuestion[]> {
  if (useMetaobjects && shopUrl) {
    const metaobjectQuestions = await loadQuestionsFromMetaobjects(shopUrl);
    if (metaobjectQuestions.length > 0) {
      return metaobjectQuestions;
    }
  }

  // Use hardcoded questions
  return [...HARDCODED_QUESTIONS].sort((a, b) => a.order - b.order);
}

/**
 * Group questions by category
 * Returns categories in order: Nasal → Eye → Respiratory → Skin → Throat
 */
export function groupQuestionsByCategory(
  questions: QuizQuestion[]
): QuizCategory[] {
  const categoryMap = new Map<string, QuizQuestion[]>();

  questions.forEach((question) => {
    const category = question.category;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(question);
  });

  // Convert to array and sort by first question's order
  return Array.from(categoryMap.entries())
    .map(([name, questions]) => ({
      name,
      questions: questions.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => {
      const aOrder = a.questions[0]?.order || 0;
      const bOrder = b.questions[0]?.order || 0;
      return aOrder - bOrder;
    });
}

/**
 * Get all questions (for use in Remix loader)
 */
export function getHardcodedQuestions(): QuizQuestion[] {
  return [...HARDCODED_QUESTIONS];
}
