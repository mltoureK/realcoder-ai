import { BaseQualityFilter } from './BaseQualityFilter';

export class MultipleChoiceQualityFilter extends BaseQualityFilter {
  constructor(config: any = {}) {
    super({
      ...config,
      model: process.env.OPENAI_MODEL_MCQ || 'gpt-4o-mini',
    });
  }

  /**
   * Multiple choice specific quality criteria
   */
  protected getTypeSpecificInstructions(): string {
    return `
SPECIAL INSTRUCTIONS FOR MULTIPLE CHOICE QUESTIONS:
- CHECK ANSWER RANDOMIZATION: If correct answer is always in position A/B or always the longest option, rate 4/10 for predictable patterns
- VERIFY OPTION QUALITY: All options should be plausible and similar in length/detail
- AVOID OBVIOUS PATTERNS: Correct answer shouldn't always be the most detailed or technical-sounding option
- TEST CONCEPTUAL UNDERSTANDING: Questions should test understanding of programming concepts, not just memorization
- ENSURE DISTRACTOR QUALITY: Incorrect options should be plausible but clearly wrong to someone who understands the concept

AUTOMATIC LOW RATINGS FOR MULTIPLE CHOICE:
- PREDICTABLE PATTERNS: Correct answer always in same position or always longest/most detailed (AUTOMATIC 4/10)
- POOR DISTRACTORS: Incorrect options are obviously wrong or nonsensical (AUTOMATIC 3/10)
- TRIVIAL QUESTIONS: Questions that can be answered by reading one line of code without understanding (AUTOMATIC 2/10)
- WRONG ANSWERS: The marked "correct" answer is actually incorrect based on the code logic (AUTOMATIC 1/10)
- INSUFFICIENT OPTIONS: Less than 3 options provided (AUTOMATIC 3/10)`;
  }
}
