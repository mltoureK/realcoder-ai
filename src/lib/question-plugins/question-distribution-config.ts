/**
 * Question Distribution Configuration
 * 
 * This file controls how many of each question type are generated per quiz.
 * See QUESTION_DISTRIBUTION_CONFIG.md for detailed documentation.
 */

export interface QuestionTypeConfig {
  type: string;
  count: number;
}

/**
 * QUESTION DISTRIBUTION (15 API calls per quiz)
 *
 * Default breakdown:
 * - 4 Function Variant (FV) - Deep code understanding
 * - 4 Select All (SA) - Complex multi-answer questions
 * - 6 True/False (TF) - Quick comprehension checks
 * - 1 Multiple Choice (MCQ) - Single correct answer
 *
 * Total: 15 API calls
 *
 * To change: Modify the count for each type below.
 * The sum of all counts = total API calls per quiz.
 */
export const QUESTION_DISTRIBUTION: QuestionTypeConfig[] = [
  { type: 'function-variant', count: 4 },
  { type: 'select-all', count: 4 },
  { type: 'true-false', count: 6 },
  { type: 'multiple-choice', count: 1 },
];

/**
 * Question types that should NEVER appear first
 * 
 * Currently no question types are restricted from appearing first.
 */
export const NEVER_FIRST_TYPES: string[] = [];

/**
 * Get total API calls from distribution
 */
export function getTotalApiCalls(): number {
  return QUESTION_DISTRIBUTION.reduce((sum, config) => sum + config.count, 0);
}

/**
 * Get distribution as allocation object for orchestrator
 */
export function getCallAllocation(): Record<string, number> {
  const allocation: Record<string, number> = {};
  for (const config of QUESTION_DISTRIBUTION) {
    allocation[config.type] = config.count;
  }
  return allocation;
}

/**
 * Validate that total matches expected
 */
export function validateDistribution(expectedTotal: number): boolean {
  const actual = getTotalApiCalls();
  if (actual !== expectedTotal) {
    console.warn(
      `⚠️ Question distribution total (${actual}) doesn't match expected (${expectedTotal})`
    );
    return false;
  }
  return true;
}
