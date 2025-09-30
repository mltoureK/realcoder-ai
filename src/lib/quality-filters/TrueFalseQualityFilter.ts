import { BaseQualityFilter } from './BaseQualityFilter';

export class TrueFalseQualityFilter extends BaseQualityFilter {
  constructor(config: any = {}) {
    super({
      ...config,
      model: process.env.OPENAI_MODEL_TRUE_FALSE || 'gpt-4o-mini',
    });
  }

  /**
   * True/False specific quality criteria - designed to make them harder and more meaningful
   */
  protected getTypeSpecificInstructions(): string {
    return `
SPECIAL INSTRUCTIONS FOR TRUE/FALSE QUESTIONS - MAKE THEM HARDER:
- VERIFY THE ANSWER: Actually analyze the code logic to confirm the statement is True or False
- FOCUS ON EDGE CASES: Test boundary conditions, null/empty inputs, error scenarios, and exceptional flows
- AVOID OBVIOUS STATEMENTS: Don't ask "this function returns a value" - ask about WHEN, WHY, or UNDER WHAT CONDITIONS
- TEST DEEP UNDERSTANDING: Focus on side effects, state mutations, execution order, and subtle behavioral differences
- REQUIRE CODE ANALYSIS: Questions should need careful reading of the logic, not just surface-level observation
- CHECK CONDITIONAL LOGIC: Test understanding of if/else branches, loop termination, and guard clauses
- EXAMINE ERROR HANDLING: Focus on what happens when things go wrong, not just the happy path
- REJECT OBVIOUS QUESTIONS: If answerable by reading one line of code, rate 2/10 for "too easy"
- WRONG ANSWERS in true/false questions are AUTOMATIC 1/10 - there's no excuse for incorrect logic

AUTOMATIC LOW RATINGS FOR TRUE/FALSE:
- OBVIOUS QUESTIONS: Answerable by reading one line of code without understanding (AUTOMATIC 2/10)
- WRONG LOGIC: The marked answer is incorrect based on actual code analysis (AUTOMATIC 1/10)
- SURFACE-LEVEL: Questions that don't require understanding of code logic or behavior (AUTOMATIC 3/10)
- MISSING CONTEXT: Questions that can't be answered without additional context not provided (AUTOMATIC 4/10)
- TRIVIAL STATEMENTS: Questions about obvious facts rather than programming concepts (AUTOMATIC 2/10)`;
  }
}
