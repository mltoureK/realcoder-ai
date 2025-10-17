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
 * Temporary debug breakdown:
 * - 15 Function Variant (FV) - Force every call to generate variant questions
 * - 0 for all other plugins so they are skipped during scheduling
 *
 * Total: 15 API calls
 *
 * To change (e.g. restore mixed question set), modify the count for each type below.
 * The sum of all counts = total API calls per quiz.
 */
export const QUESTION_DISTRIBUTION: QuestionTypeConfig[] = [
  { type: 'function-variant', count: 15 },
  { type: 'select-all', count: 0 },
  { type: 'order-sequence', count: 0 },
  { type: 'true-false', count: 0 },
  { type: 'multiple-choice', count: 0 },
];

/**
 * Question types that should NEVER appear first
 * 
 * Order Sequence questions are confusing without context,
 * so they must never be the first question shown to users.
 */
export const NEVER_FIRST_TYPES = ['order-sequence'];

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
