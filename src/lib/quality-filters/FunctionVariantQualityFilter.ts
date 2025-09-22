import { BaseQualityFilter, QualityRatingRequest } from './BaseQualityFilter';

export class FunctionVariantQualityFilter extends BaseQualityFilter {
  constructor(config: any = {}) {
    super({
      ...config,
      model: process.env.OPENAI_MODEL_FUNCTION_VARIANT || 'gpt-4o-mini',
    });
  }

  /**
   * Enhanced pre-filtering for function-variant specific issues
   */
  protected preFilterQuestion(question: QualityRatingRequest): boolean {
    // Run base pre-filtering first
    if (!super.preFilterQuestion(question)) {
      return false;
    }

    // Additional function-variant specific checks
    if (question.type === 'function-variant' && question.variants) {
      const codeVariants = question.variants.map(v => v.code?.trim() || '');
      
      // Check if all variants are identical or nearly identical
      const uniqueVariants = [...new Set(codeVariants)];
      if (uniqueVariants.length <= 1 || (uniqueVariants.length === 2 && codeVariants.length > 2)) {
        console.log(`🚫 Pre-filtered: Identical/nearly identical code variants - ${question.question?.substring(0, 50)}...`);
        return false;
      }
      
      // Check for empty implementations (function signatures only)
      const hasEmptyVariants = codeVariants.some(code => {
        const cleanCode = code.replace(/\s+/g, ' ').trim();
        // Match empty function patterns: "() => {}", "function() {}", "async () => {}"
        return /^(async\s+)?\w*\s*\([^)]*\)\s*=>\s*\{\s*\}$/.test(cleanCode) ||
               /^(async\s+)?function\s*\w*\s*\([^)]*\)\s*\{\s*\}$/.test(cleanCode) ||
               cleanCode.endsWith('{}') && cleanCode.length < 50;
      });
      
      if (hasEmptyVariants) {
        console.log(`🚫 Pre-filtered: Contains empty function implementations - ${question.question?.substring(0, 50)}...`);
        return false;
      }
      
      // Check for common equivalent patterns that might be marked as different
      const hasEquivalentPatterns = codeVariants.some(code1 => 
        codeVariants.some(code2 => {
          if (code1 === code2) return false;
          // Check for spread vs concat equivalence
          const spreadPattern = /\[\.\.\.\w+,\s*\w+\]/;
          const concatPattern = /\w+\.concat\(\w+\)/;
          return (spreadPattern.test(code1) && concatPattern.test(code2)) ||
                 (spreadPattern.test(code2) && concatPattern.test(code1));
        })
      );
      
      if (hasEquivalentPatterns) {
        // Don't auto-reject, but flag for closer AI scrutiny
        console.log(`⚠️  Pre-filter warning: Potentially equivalent patterns detected - ${question.question?.substring(0, 50)}...`);
      }
    }
    
    return true;
  }

  /**
   * Function-variant specific quality criteria
   */
  protected getTypeSpecificInstructions(): string {
    return ` 
SPECIAL INSTRUCTIONS FOR FUNCTION-VARIANT QUESTIONS:
- CHECK FOR FUNCTIONAL EQUIVALENCE: If multiple variants achieve the same result with different syntax, they should both be marked correct
- CHECK LENGTH BALANCE: If correct answer is obviously longer/more detailed than incorrect options, rate 4/10 for predictable patterns
- VERIFY EQUAL COMPLEXITY: All variants should appear equally sophisticated - avoid making correct answer obviously more complete
- COMMON EQUIVALENT PATTERNS TO WATCH FOR:
  * [...array, item] vs array.concat(item) - BOTH create new arrays
  * array.push(item) vs array.concat(item) - Different! push mutates, concat doesn't
  * == vs === - Different behaviors with type coercion
  * for loop vs forEach vs map - Different purposes but often equivalent
  * Arrow functions vs regular functions - Usually equivalent (except 'this' binding)
  * Template literals vs string concatenation - Usually equivalent
- If explanations claim one equivalent method is "wrong" for incorrect technical reasons, rate 1-3/10

AUTOMATIC LOW RATINGS FOR FUNCTION-VARIANT:
- IDENTICAL CODE VARIANTS: All variants have the same or nearly identical code (AUTOMATIC 1/10)
- EMPTY/INCOMPLETE CODE: Variants contain only function signatures or empty implementations (AUTOMATIC 2/10)
- MEANINGLESS DIFFERENCES: Variants differ only in comments, whitespace, or variable names (AUTOMATIC 3/10)
- WRONG ANSWERS: The "correct" answer is actually incorrect based on the code logic (AUTOMATIC 1/10)
- ARBITRARY CORRECTNESS: Multiple variants are equally valid but one is marked as "correct" without justification (AUTOMATIC 4/10)
- FUNCTIONALLY EQUIVALENT CODE: Different syntax achieving identical results marked as different correctness (e.g., [...array, item] vs array.concat(item), == vs ===, for vs forEach) (AUTOMATIC 3/10)
- STYLE PREFERENCES: Marking one coding style as "wrong" when both are valid (e.g., arrow functions vs regular functions, template literals vs concatenation) (AUTOMATIC 4/10)`;
  }
}
