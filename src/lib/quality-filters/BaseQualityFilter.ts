import OpenAI from 'openai';

export interface QualityRatingRequest {
  type: string;
  question: string;
  options?: string[];
  variants?: any[];
  codeContext?: string;
  snippet?: string;
  explanation?: string;
}

export interface QualityRatingResponse {
  score: number; // 1-10 scale
  reasoning: string;
  shouldKeep: boolean; // true if score >= 7
}

export interface QualityFilterConfig {
  threshold: number; // minimum score to keep (default: 7)
  model: string; // OpenAI model to use (default: gpt-4o-mini)
  temperature: number; // temperature for AI calls (default: 0.5)
  maxTokens: number; // max tokens for AI response (default: 400)
}

export abstract class BaseQualityFilter {
  protected openai: OpenAI;
  protected config: QualityFilterConfig;

  constructor(config: Partial<QualityFilterConfig> = {}) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.config = {
      threshold: 7,
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 400,
      ...config
    };
  }

  /**
   * Pre-filters questions to reject obviously low-quality ones before expensive AI evaluation
   * Override in subclasses for type-specific pre-filtering
   */
  protected preFilterQuestion(question: QualityRatingRequest): boolean {
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
   * Get type-specific prompt instructions
   * Override in subclasses to provide type-specific criteria
   */
  protected abstract getTypeSpecificInstructions(): string;

  /**
   * Get common quality criteria that apply to all question types
   */
  protected getCommonCriteria(): string {
    return `
CRITERIA FOR HIGH QUALITY (8-10):
- Tests universal programming concepts
- Has clear, unambiguous correct answer
- Educational value - teaches something useful to developers
- Good explanations that help learning
- Tests practical skills developers use daily

CRITERIA FOR MEDIUM QUALITY (6-7):
- Tests reasonable programming concepts, even if domain-specific 
- Generally clear but might have minor ambiguities
- Moderate educational value

CRITERIA FOR LOW QUALITY (1-4):
- Tests repository-specific trivia, instead of universal programming concepts/knowledge (bracket vs parentheses, specific variable names)
- Tests domain-specific business logic that doesn't transfer
- Tests cosmetic formatting differences
- Tests game-specific mechanics (lives, refills, etc.)
- Unclear or ambiguous options
- INSUFFICIENT CONTEXT: Question cannot be answered without additional context about variables, data structures, or function parameters (AUTOMATIC 5/10)

CRITICAL: Be GENEROUS with universal programming patterns, even in specific contexts. API integration, async handling, and execution order questions should score 8+ if they teach transferable skills.`;
  }

  /**
   * Build the complete prompt for quality rating
   */
  protected buildPrompt(question: QualityRatingRequest): string {
    const commonCriteria = this.getCommonCriteria();
    const typeSpecificInstructions = this.getTypeSpecificInstructions();
    
    return `You are an expert programming education evaluator. Rate this quiz question on a scale of 1-10 based on:

${commonCriteria}

${typeSpecificInstructions}

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
  "shouldKeep": <true if score >= ${this.config.threshold}, false otherwise>
}`;
  }

  /**
   * Rate a question's quality on a 1-10 scale and determine if it should be kept
   */
  async rateQuestionQuality(question: QualityRatingRequest): Promise<QualityRatingResponse> {
    try {
      const prompt = this.buildPrompt(question);

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
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

  /**
   * Main entry point - checks if a question meets the quality threshold
   */
  async shouldKeepQuestion(question: QualityRatingRequest, isPremium: boolean = false): Promise<boolean> {
    // Pre-filter to reject obviously low-quality questions
    if (!this.preFilterQuestion(question)) {
      return false;
    }
    
    const rating = await this.rateQuestionQuality(question);
    
    // Create question preview for logging
    const questionPreview = question.question?.substring(0, 50) + '...' || 'No question text';
    
    // Apply premium threshold (8/10+) or free threshold (7/10+)
    const threshold = isPremium ? 8 : this.config.threshold;
    const shouldKeep = rating.score >= threshold;
    
    if (shouldKeep) {
      const tier = isPremium ? 'PREMIUM' : 'FREE';
      console.log(`✅ ACCEPTED [${rating.score}/10] ${tier}: ${questionPreview}`);
      console.log(`   📝 ${rating.reasoning}`);
    } else {
      const tier = isPremium ? 'PREMIUM' : 'FREE';
      console.log(`❌ REJECTED [${rating.score}/10] ${tier}: ${questionPreview} (below ${threshold}/10 threshold)`);
      console.log(`   📝 ${rating.reasoning}`);
    }
    
    return shouldKeep;
  }
}
