import { BaseQualityFilter } from './BaseQualityFilter';

export class SelectAllQualityFilter extends BaseQualityFilter {
  constructor(config: any = {}) {
    super({
      ...config,
      model: process.env.OPENAI_MODEL_SELECT_ALL || 'gpt-4o-mini',
    });
  }

  /**
   * Select-all specific quality criteria
   */
  protected getTypeSpecificInstructions(): string {
    return `
SPECIAL INSTRUCTIONS FOR SELECT-ALL QUESTIONS:
- VERIFY EACH OPTION: Actually analyze the code logic to confirm each statement is True or False
- TEST LOGICAL REASONING: Ensure correct/incorrect markings match the actual code context given behavior
- ENSURE BALANCED CORRECTNESS: Avoid having all options correct or all options incorrect (unless genuinely warranted)
- TEST COMPREHENSIVE UNDERSTANDING: Questions should test understanding of multiple aspects of the code
- VERIFY INDEPENDENT OPTIONS: Each option should be independently verifiable

AUTOMATIC LOW RATINGS FOR SELECT-ALL:
- WRONG MARKINGS: If any option is incorrectly marked as correct/incorrect based on the code, rate 1-3/10
- ALL CORRECT/INCORRECT: All options marked as correct or incorrect without proper justification (AUTOMATIC 3/10)
- INSUFFICIENT OPTIONS: Less than 3 options provided (AUTOMATIC 3/10)
- AMBIGUOUS OPTIONS: Options that could reasonably be interpreted as either correct or incorrect (AUTOMATIC 4/10)
- MISSING CONTEXT: Options that can't be verified without additional code context not provided (AUTOMATIC 4/10)`;
  }
}
