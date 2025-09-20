import { BaseQualityFilter } from './BaseQualityFilter';

export class OrderSequenceQualityFilter extends BaseQualityFilter {
  constructor(config: any = {}) {
    super({
      ...config,
      model: process.env.OPENAI_MODEL_ORDER_SEQUENCE || 'gpt-4o-mini',
    });
  }

  /**
   * Order-sequence specific quality criteria
   */
  protected getTypeSpecificInstructions(): string {
    return `
SPECIAL INSTRUCTIONS FOR ORDER-SEQUENCE QUESTIONS:
- VERIFY LOGICAL ORDER: The correct sequence should reflect actual execution order or logical dependencies
- TEST EXECUTION FLOW: Focus on understanding of how code executes, not arbitrary ordering
- ENSURE CLEAR DEPENDENCIES: Each step should logically depend on or follow from the previous steps
- AVOID AMBIGUOUS ORDERING: If multiple valid orders exist, the question should specify the criteria
- TEST PROGRAMMING CONCEPTS: Focus on execution order, dependency management, and control flow
- VERIFY STEP ACCURACY: Each step in the sequence should be accurate and meaningful

AUTOMATIC LOW RATINGS FOR ORDER-SEQUENCE:
- WRONG ORDER: The marked correct sequence doesn't match actual execution order or logic (AUTOMATIC 1/10)
- AMBIGUOUS ORDERING: Multiple valid orders exist without clear criteria (AUTOMATIC 4/10)
- ARBITRARY STEPS: Steps that don't represent meaningful programming concepts (AUTOMATIC 3/10)
- INSUFFICIENT CONTEXT: Not enough information to determine the correct order (AUTOMATIC 4/10)
- TOO MANY STEPS: More than 6 steps makes the question confusing (AUTOMATIC 3/10)
- TRIVIAL ORDERING: Steps that are obviously in the correct order without testing understanding (AUTOMATIC 2/10)`;
  }
}
