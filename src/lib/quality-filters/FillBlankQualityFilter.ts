import { BaseQualityFilter } from './BaseQualityFilter';

export class FillBlankQualityFilter extends BaseQualityFilter {
  constructor(config: any = {}) {
    super({
      ...config,
      model: process.env.OPENAI_MODEL_FILL_BLANK || 'gpt-4o-mini',
    });
  }

  /**
   * Fill-blank specific quality criteria
   */
  protected getTypeSpecificInstructions(): string {
    return `
SPECIAL INSTRUCTIONS FOR FILL-BLANK QUESTIONS:
- TARGET MEANINGFUL TOKENS: Blanks should target important programming concepts, not arbitrary words
- ENSURE SINGLE CORRECT ANSWER: There should be one clear, unambiguous correct answer for each blank
- TEST PROGRAMMING KNOWLEDGE: Focus on keywords, operators, method names, and programming constructs
- AVOID TRIVIAL BLANKS: Don't ask for obvious words that don't test understanding
- PROVIDE CONTEXT: The surrounding code should provide enough context to determine the correct answer
- VERIFY ANSWER ACCURACY: The marked correct answer should actually be the best/most appropriate choice

AUTOMATIC LOW RATINGS FOR FILL-BLANK:
- MULTIPLE VALID ANSWERS: If multiple answers could reasonably fill the blank, rate 3-5/10
- TRIVIAL BLANKS: Asking for obvious words that don't test programming knowledge (AUTOMATIC 3/10)
- WRONG ANSWERS: The marked correct answer is not the best choice for the blank (AUTOMATIC 2/10)
- INSUFFICIENT CONTEXT: Not enough context provided to determine the correct answer (AUTOMATIC 4/10)
- TOO MANY BLANKS: More than 3 blanks in a single question makes it confusing (AUTOMATIC 3/10)
- ARBITRARY CHOICES: Correct answer seems arbitrary or based on style preference (AUTOMATIC 4/10)`;
  }
}
