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
 * - 5 Function Variant (FV) - Deep code understanding
 * - 5 Select All (SA) - Complex multi-answer questions
 * - 2 Order Sequence (OS) - Code step ordering
 * - 2 True/False (TF) - Quick comprehension checks
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
  { type: 'order-sequence', count: 4 },
  { type: 'true-false', count: 2 },
  { type: 'multiple-choice', count: 1 },
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
