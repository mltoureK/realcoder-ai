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
- Decent explanations

BONUS POINTS (+2):
- Questions about error handling, async operations, data validation
- Questions about execution order and API integration patterns
- Questions that test understanding of common patterns
- Questions with clear, educational explanations
- Questions that focus on "how" and "why" not just "what"

CRITICAL: Be GENEROUS with universal programming patterns, even in specific contexts. API integration, async handling, and execution order questions should score 8+ if they teach transferable skills.

CRITERIA FOR LOW QUALITY (1-4):
- Tests repository-specific trivia (bracket vs parentheses, specific variable names)
- Tests domain-specific business logic that doesn't transfer
- Tests cosmetic formatting differences
- Tests game-specific mechanics (lives, refills, etc.)
- Unclear or ambiguous questions
- Poor explanations
- IDENTICAL CODE VARIANTS: All variants have the same or nearly identical code
- EMPTY/INCOMPLETE CODE: Variants contain only function signatures or empty implementations
- MEANINGLESS DIFFERENCES: Variants differ only in comments, whitespace, or variable names

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
 * Checks if a question meets the quality threshold (7/10+)
 */
export async function shouldKeepQuestion(question: QualityRatingRequest): Promise<boolean> {
  // Pre-filter to reject obviously low-quality questions
  if (!preFilterQuestion(question)) {
    questionsRejected++;
    return false;
  }
  
  const rating = await rateQuestionQuality(question);
  
  // Create question preview for logging
  const questionPreview = question.question?.substring(0, 50) + '...' || 'No question text';
  
  // Track all ratings for summary
  allRatings.push({
    score: rating.score,
    question: questionPreview,
    accepted: rating.shouldKeep
  });
  
  if (rating.shouldKeep) {
    questionsAccepted++;
    console.log(`✅ ACCEPTED [${rating.score}/10]: ${questionPreview}`);
    console.log(`   📝 ${rating.reasoning}`);
  } else {
    questionsRejected++;
    console.log(`❌ REJECTED [${rating.score}/10]: ${questionPreview}`);
    console.log(`   📝 ${rating.reasoning}`);
  }
  
  // Log stats every 10 questions
  const total = questionsAccepted + questionsRejected;
  if (total % 10 === 0) {
    console.log(`📊 Quality Filter Stats: ${questionsAccepted} accepted, ${questionsRejected} rejected (${Math.round(questionsAccepted/total*100)}% acceptance rate)`);
  }
  
  return rating.shouldKeep;
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
