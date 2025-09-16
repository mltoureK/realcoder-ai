import OpenAI from 'openai';

interface QualityRatingRequest {
  type: string;
  question: string;
  options?: string[];
  variants?: any[];
  codeContext?: string;
  snippet?: string;
  explanation?: string;
}

interface QualityRatingResponse {
  score: number; // 1-10 scale
  reasoning: string;
  shouldKeep: boolean; // true if score >= 7
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Pre-filters questions to reject obviously low-quality ones before expensive AI evaluation
 */
function preFilterQuestion(question: QualityRatingRequest): boolean {
  const questionText = question.question?.toLowerCase() || '';
  const snippet = question.snippet?.toLowerCase() || '';
  
  // Reject only obviously low-quality patterns (be conservative)
  const rejectPatterns = [
    'lives', 'refill', 'game mechanics', 'chatbot conversation',
    'specific variable name', 'specific function name',
    'square brackets vs round brackets', 'curly braces vs parentheses',
    'cosmetic formatting', 'whitespace formatting'
  ];
  
  const hasRejectPattern = rejectPatterns.some(pattern => 
    questionText.includes(pattern) || snippet.includes(pattern)
  );
  
  if (hasRejectPattern) {
    console.log(`🚫 Pre-filtered: Contains low-quality pattern - ${questionText.substring(0, 50)}...`);
    return false;
  }
  
  // ENHANCED: Check for function-variant specific issues
  if (question.type === 'function-variant' && question.variants) {
    const codeVariants = question.variants.map(v => v.code?.trim() || '');
    
    // Check if all variants are identical or nearly identical
    const uniqueVariants = [...new Set(codeVariants)];
    if (uniqueVariants.length <= 1 || (uniqueVariants.length === 2 && codeVariants.length > 2)) {
      console.log(`🚫 Pre-filtered: Identical/nearly identical code variants - ${questionText.substring(0, 50)}...`);
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
      console.log(`🚫 Pre-filtered: Contains empty function implementations - ${questionText.substring(0, 50)}...`);
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
      console.log(`⚠️  Pre-filter warning: Potentially equivalent patterns detected - ${questionText.substring(0, 50)}...`);
    }
  }
  
  return true;
}

/**
 * Rates a question's quality on a 1-10 scale and determines if it should be kept (7/10+)
 * Uses o1-mini for fast, cost-effective quality assessment
 */
export async function rateQuestionQuality(question: QualityRatingRequest): Promise<QualityRatingResponse> {
  try {
    const prompt = `You are an expert programming education evaluator. Rate this quiz question on a scale of 1-10 based on:

CRITERIA FOR HIGH QUALITY (8-10):
- Tests universal programming concepts (async/await, error handling, state management, API calls, data structures, execution order)
- Has clear, unambiguous correct answer
- Educational value - teaches something useful to developers
- Good explanations that help learning
- Tests practical skills developers use daily

CRITERIA FOR MEDIUM QUALITY (6-7):
- Tests reasonable programming concepts, even if domain-specific (GitHub API, file processing, data fetching)
- Generally clear but might have minor ambiguities
- Moderate educational value
- 



CRITICAL: Be GENEROUS with universal programming patterns, even in specific contexts. API integration, async handling, and execution order questions should score 8+ if they teach transferable skills.

SPECIAL INSTRUCTIONS FOR TRUE/FALSE QUESTIONS - MAKE THEM HARDER:
- VERIFY THE ANSWER: Actually analyze the code logic to confirm the statement is True or False
- FOCUS ON EDGE CASES: Test boundary conditions, null/empty inputs, error scenarios, and exceptional flows
- AVOID OBVIOUS STATEMENTS: Don't ask "this function returns a value" - ask about WHEN, WHY, or UNDER WHAT CONDITIONS
- TEST DEEP UNDERSTANDING: Focus on side effects, state mutations, execution order, and subtle behavioral differences
- REQUIRE CODE ANALYSIS: Questions should need careful reading of the logic, not just surface-level observation
- CHECK CONDITIONAL LOGIC: Test understanding of if/else branches, loop termination, and guard clauses
- EXAMINE ERROR HANDLING: Focus on what happens when things go wrong, not just the happy path
- WRONG ANSWERS in true/false questions are AUTOMATIC 1/10 - there's no excuse for incorrect logic

SPECIAL INSTRUCTIONS FOR FUNCTION-VARIANT QUESTIONS:
- CHECK FOR FUNCTIONAL EQUIVALENCE: If multiple variants achieve the same result with different syntax, they should both be marked correct
- COMMON EQUIVALENT PATTERNS TO WATCH FOR:
  * [...array, item] vs array.concat(item) - BOTH create new arrays
  * array.push(item) vs array.concat(item) - Different! push mutates, concat doesn't
  * == vs === - Different behaviors with type coercion
  * for loop vs forEach vs map - Different purposes but often equivalent
  * Arrow functions vs regular functions - Usually equivalent (except 'this' binding)
  * Template literals vs string concatenation - Usually equivalent
- If explanations claim one equivalent method is "wrong" for incorrect technical reasons, rate 1-3/10

CRITERIA FOR LOW QUALITY (1-4):
- Tests repository-specific trivia, instead of universal programming concepts/knowledge (bracket vs parentheses, specific variable names)
- Tests domain-specific business logic that doesn't transfer
- Tests cosmetic formatting differences
- Tests game-specific mechanics (lives, refills, etc.)
- Unclear or ambiguous questions
- Poor explanations
- IDENTICAL CODE VARIANTS: All variants have the same or nearly identical code (AUTOMATIC 1/10)
- EMPTY/INCOMPLETE CODE: Variants contain only function signatures or empty implementations (AUTOMATIC 2/10)
- MEANINGLESS DIFFERENCES: Variants differ only in comments, whitespace, or variable names (AUTOMATIC 3/10)
- WRONG ANSWERS: The "correct" answer is actually incorrect based on the code logic (AUTOMATIC 1/10)
- ARBITRARY CORRECTNESS: Multiple variants are equally valid but one is marked as "correct" without justification (AUTOMATIC 4/10)
- FUNCTIONALLY EQUIVALENT CODE: Different syntax achieving identical results marked as different correctness (e.g., [...array, item] vs array.concat(item), == vs ===, for vs forEach) (AUTOMATIC 3/10)
- STYLE PREFERENCES: Marking one coding style as "wrong" when both are valid (e.g., arrow functions vs regular functions, template literals vs concatenation) (AUTOMATIC 4/10)
- INSUFFICIENT CONTEXT: Question cannot be answered without additional context about variables, data structures, or function parameters (AUTOMATIC 5/10)

QUESTION TO RATE:
Type: ${question.type}
Question: ${question.question}
${question.options ? `Options: ${question.options.join(', ')}` : ''}
${question.variants && question.variants.length > 0 ? 
  `Code Variants:\n${question.variants.map((v: any, i: number) => 
    `Variant ${i + 1} (${v.isCorrect ? 'CORRECT' : 'INCORRECT'}):\n${v.code}\nExplanation: ${v.explanation}`
  ).join('\n\n')}` : ''}
${question.snippet ? `Code snippet: ${question.snippet}` : ''}
${question.explanation ? `Explanation: ${question.explanation}` : ''}

Respond with a JSON object:
{
  "score": <number 1-10>,
  "reasoning": "<brief explanation of your rating>",
  "shouldKeep": <true if score >= 7, false otherwise>
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the content to extract JSON (remove markdown code blocks if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse JSON response
    const parsed = JSON.parse(jsonContent);
    
    return {
      score: Math.max(1, Math.min(10, parsed.score)),
      reasoning: parsed.reasoning || 'No reasoning provided',
      shouldKeep: parsed.shouldKeep === true
    };

  } catch (error) {
    console.error('❌ Error rating question quality:', error);
    
    // Fallback: if rating fails, be conservative and reject the question
    return {
      score: 5,
      reasoning: 'Quality rating failed, rejecting for safety',
      shouldKeep: false
    };
  }
}

// Global counters and rating tracking for logging
let questionsAccepted = 0;
let questionsRejected = 0;
let allRatings: Array<{score: number, question: string, accepted: boolean}> = [];

/**
 * Checks if a question meets the quality threshold (7/10+ for free, 8/10+ for premium)
 */
export async function shouldKeepQuestion(question: QualityRatingRequest, isPremium: boolean = false): Promise<boolean> {
  // Pre-filter to reject obviously low-quality questions
  if (!preFilterQuestion(question)) {
    questionsRejected++;
    return false;
  }
  
  const rating = await rateQuestionQuality(question);
  
  // Create question preview for logging
  const questionPreview = question.question?.substring(0, 50) + '...' || 'No question text';
  
  // Apply premium threshold (8/10+) or free threshold (7/10+)
  const threshold = isPremium ? 8 : 7;
  const shouldKeep = rating.score >= threshold;
  
  // Track all ratings for summary
  allRatings.push({
    score: rating.score,
    question: questionPreview,
    accepted: shouldKeep
  });
  
  if (shouldKeep) {
    questionsAccepted++;
    const tier = isPremium ? 'PREMIUM' : 'FREE';
    console.log(`✅ ACCEPTED [${rating.score}/10] ${tier}: ${questionPreview}`);
    console.log(`   📝 ${rating.reasoning}`);
  } else {
    questionsRejected++;
    const tier = isPremium ? 'PREMIUM' : 'FREE';
    console.log(`❌ REJECTED [${rating.score}/10] ${tier}: ${questionPreview} (below ${threshold}/10 threshold)`);
    console.log(`   📝 ${rating.reasoning}`);
  }
  
  // Log stats every 10 questions
  const total = questionsAccepted + questionsRejected;
  if (total % 10 === 0) {
    const tierText = isPremium ? 'PREMIUM (8+)' : 'FREE (7+)';
    console.log(`📊 Quality Filter Stats ${tierText}: ${questionsAccepted} accepted, ${questionsRejected} rejected (${Math.round(questionsAccepted/total*100)}% acceptance rate)`);
  }
  
  return shouldKeep;
}

/**
 * Display a summary of all question ratings
 */
export function displayQualityRatingSummary() {
  if (allRatings.length === 0) return;
  
  console.log('\n🎯 QUALITY RATING SUMMARY:');
  console.log('=' .repeat(50));
  
  // Group by score
  const scoreGroups = allRatings.reduce((acc, rating) => {
    if (!acc[rating.score]) acc[rating.score] = [];
    acc[rating.score].push(rating);
    return acc;
  }, {} as Record<number, typeof allRatings>);
  
  // Display by score (highest first)
  for (let score = 10; score >= 1; score--) {
    if (scoreGroups[score]) {
      const accepted = scoreGroups[score].filter(r => r.accepted).length;
      const rejected = scoreGroups[score].filter(r => r.accepted === false).length;
      console.log(`📊 ${score}/10: ${scoreGroups[score].length} questions (${accepted} accepted, ${rejected} rejected)`);
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`📈 Total: ${allRatings.length} rated, ${questionsAccepted} accepted (${Math.round(questionsAccepted/allRatings.length*100)}% acceptance)`);
}
