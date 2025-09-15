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
  shouldKeep: boolean; // true if score >= 5
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Rates a question's quality on a 1-10 scale and determines if it should be kept (5/10+)
 * Uses o1-mini for fast, cost-effective quality assessment
 */
export async function rateQuestionQuality(question: QualityRatingRequest): Promise<QualityRatingResponse> {
  try {
    const prompt = `You are an expert programming education evaluator. Rate this quiz question on a scale of 1-10 based on:

CRITERIA FOR HIGH QUALITY (8-10):
- Tests universal programming concepts (async/await, error handling, state management, API calls, data structures)
- Has clear, unambiguous correct answer
- Educational value - teaches something useful to developers
- Good explanations that help learning
- Tests practical skills developers use daily

CRITERIA FOR MEDIUM QUALITY (5-7):
- Tests reasonable programming concepts but may be domain-specific
- Generally clear but might have minor ambiguities
- Moderate educational value
- Decent explanations

EMPHASIS: Prioritize FAIRNESS and avoid questions heavily relying on repository-specific knowledge.

CRITERIA FOR LOW QUALITY (1-4):
- Tests repository-specific trivia (bracket vs parentheses, specific variable names)
- Tests domain-specific business logic that doesn't transfer
- Tests cosmetic formatting differences
- Tests game-specific mechanics (lives, refills, etc.)
- Unclear or ambiguous questions
- Poor explanations

QUESTION TO RATE:
Type: ${question.type}
Question: ${question.question}
${question.options ? `Options: ${question.options.join(', ')}` : ''}
${question.variants ? `Variants: ${question.variants.length} code variants` : ''}
${question.snippet ? `Code snippet: ${question.snippet}` : ''}
${question.explanation ? `Explanation: ${question.explanation}` : ''}

Respond with a JSON object:
{
  "score": <number 1-10>,
  "reasoning": "<brief explanation of your rating>",
  "shouldKeep": <true if score >= 6, false otherwise>
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
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

// Global counters for logging
let questionsAccepted = 0;
let questionsRejected = 0;

/**
 * Checks if a question meets the quality threshold (5/10+)
 */
export async function shouldKeepQuestion(question: QualityRatingRequest): Promise<boolean> {
  const rating = await rateQuestionQuality(question);
  
  if (rating.shouldKeep) {
    questionsAccepted++;
    console.log(`✅ Question accepted: ${rating.score}/10 - ${rating.reasoning}`);
  } else {
    questionsRejected++;
    console.log(`🚫 Question rejected: ${rating.score}/10 - ${rating.reasoning}`);
  }
  
  // Log stats every 10 questions
  const total = questionsAccepted + questionsRejected;
  if (total % 10 === 0) {
    console.log(`📊 Quality Filter Stats: ${questionsAccepted} accepted, ${questionsRejected} rejected (${Math.round(questionsAccepted/total*100)}% acceptance rate)`);
  }
  
  return rating.shouldKeep;
}
