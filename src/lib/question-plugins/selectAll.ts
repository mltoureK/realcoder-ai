import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, validateQuestionStructure } from './utils';

/**
 * Constants for better maintainability
 */
const OPENAI_MODEL = process.env.OPENAI_MODEL_SELECT_ALL || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const TEMPERATURE = 0.5;
const MAX_TOKENS = 2000;

/**
 * System prompt for consistent AI behavior
 */
const SYSTEM_PROMPT = 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.';

/**
 * Generates random correct count based on total options
 * Uses coding logic to determine valid ranges and probabilities
 */
function generateRandomCorrectCount(totalOptions: number): number {
  // Define probability weights for different correct counts
  // 0 correct: 10% chance (none are correct)
  // 1 correct: 15% chance (but this becomes MCQ, so we'll avoid it mostly)
  // 2-3 correct: 50% chance (sweet spot)
  // 4+ correct: 25% chance (challenging)
  // All correct: 10% chance (everything is correct)
  
  const weights = [];
  
  // 0 correct answers (10% weight)
  weights.push({ count: 0, weight: 10 });
  
  // 1 correct answer (5% weight - rare since it's essentially MCQ)
  if (totalOptions >= 2) {
    weights.push({ count: 1, weight: 5 });
  }
  
  // 2-3 correct answers (50% total weight - the sweet spot)
  for (let i = 2; i <= Math.min(3, totalOptions - 1); i++) {
    weights.push({ count: i, weight: 25 });
  }
  
  // 4 to (total-1) correct answers (25% total weight)
  const remainingSlots = Math.max(0, totalOptions - 4);
  if (remainingSlots > 0) {
    const weightPerSlot = Math.floor(25 / remainingSlots) || 1;
    for (let i = 4; i < totalOptions; i++) {
      weights.push({ count: i, weight: weightPerSlot });
    }
  }
  
  // All correct (10% weight)
  if (totalOptions >= 2) {
    weights.push({ count: totalOptions, weight: 10 });
  }
  
  // Calculate total weight and pick randomly
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.floor(Math.random() * totalWeight);
  
  for (const { count, weight } of weights) {
    random -= weight;
    if (random < 0) {
      return count;
    }
  }
  
  // Fallback to 2 if something goes wrong
  return Math.min(2, totalOptions);
}

/**
 * Creates the user prompt for select-all question generation
 */
function createUserPrompt(chunk: string): string {
  // Generate random option count (5-6 options)
  const optionCount = Math.random() < 0.6 ? 5 : 6;
  const correctCount = generateRandomCorrectCount(optionCount);
  
  return `Generate 3 pro grade "select all that apply" questions based on this code chunk:

${chunk}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

IMPORTANT REQUIREMENTS:
1. IGNORE any code that is not in the primary programming language of this repository.
2. ONLY generate questions about functions that actually exist in the provided code chunk
3. The function name in "snippet" must match a real function from the code
4. Include the actual function code in the "codeContext" field with PROPER JSON ESCAPING
5. Create exactly ${optionCount} options total
6. Exactly ${correctCount} options should be correct (this is MANDATORY - not more, not less)
7. Create realistic incorrect options that test deep understanding
8. SCENARIO CONTEXT: Create realistic development scenarios that explain WHY this function exists
9. JSON ESCAPING: ALL special characters in codeContext MUST be properly escaped for JSON

CORRECT ANSWER LOGIC:
- You MUST have exactly ${correctCount} correct answers out of ${optionCount} total options
- If correctCount is 0: All options should be false/incorrect statements
- If correctCount is ${optionCount}: All options should be true/correct statements  
- Otherwise: Mix correct and incorrect options to reach exactly ${correctCount} correct answers

OPTION QUALITY:
- All options should be roughly the same length to avoid length-based guessing
- Avoid vague or subjective statements

FOCUS ON UNIVERSAL PROGRAMMING CONCEPTS:

AVOID:
- Repository-specific trivia
- Domain-specific business logic
- Cosmetic formatting differences
- Game-specific mechanics
- Chatbot/AI-specific implementations

JSON ESCAPING RULES FOR CODE CONTEXT:
- Newlines must be escaped as \\n
- Tabs must be escaped as \\t
- Backslashes must be escaped as \\\\
- Quotes must be escaped as \\"
- NEVER use string concatenation with + in codeContext
- Put the ENTIRE function code in ONE string with proper escaping

Format:
[
  {
    "snippet": "functionName",
    "quiz": {
      "type": "select-all",
      "question": "In a [REALISTIC_APP_CONTEXT], which statements about the function functionName are correct? Select all that apply.",
      "codeContext": "show complete function(and code)  that the code uses from the code chunk",
      "options": [
        { "text": "Functionally accurate statement about the function , that can be detected from the code context, that is true or false",  "isCorrect": true | false },
        { "text": "Functionally accurate statement about the function that can be detected from the code context, that is true or false", "isCorrect": false },
        { "text": "Functionally accurate statement about the function that can be detected from the code context, that is true or false",  "isCorrect": false },
        { "text": "Functionally accurate statement about the function, that can be detected from the code context, that is true or false", "isCorrect": true },
        { "text": "Functionally accurate statement about the function that can be detected from the code context, that is true or false",  "isCorrect": false }${optionCount >= 6 ? ',\n        { "text": "Functionally accurate statement about the function that can be detected from the code context, that is true or false", "isCorrect": false }' : ''}
      ],
      "correctAnswers": [],
      "explanation": "Detailed explanation of why each correct answer is right and each incorrect answer is wrong. This field is REQUIRED and cannot be empty."
    }
  }
]

CRITICAL:
- The "options" array MUST be objects with fields { text: string, isCorrect: boolean }.
- Ensure EXACTLY ${correctCount} options have isCorrect=true.
- Set quiz.correctAnswers to an empty array; the application will compute letters from isCorrect.
- The "explanation" field is MANDATORY and must contain a detailed explanation of why each correct answer is right and each incorrect answer is wrong.
- ALL code in codeContext MUST be properly JSON-escaped with \\n for newlines, \\t for tabs, \\\\ for backslashes, and \\" for quotes.
- For Java code: NEVER use string concatenation with + and escape ALL special characters properly.`;
}

/**
 * Formats code context for better readability
 */
function formatCodeContext(codeContext: string): string {
  if (!codeContext) return codeContext;
  
  // Replace escaped newlines with actual newlines
  const formatted = codeContext.replace(/\\n/g, '\n');
  
  // Ensure proper indentation (basic formatting)
  const lines = formatted.split('\n');
  const formattedLines = lines.map((line) => {
    // Skip empty lines
    if (line.trim() === '') return line;
    
    // Basic indentation logic
    if (line.includes('{') && !line.includes('}')) {
      return line + '\n';
    }
    
    return line;
  });
  
  return formattedLines.join('\n').trim();
}

/**
 * Cleans AI response content by removing markdown formatting and extracting JSON
 */
function cleanAiResponse(content: string): string {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '');
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '');
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.replace(/\s*```$/, '');
  }
  
  // Extract JSON array boundaries
  const jsonStart = cleanContent.indexOf('[');
  if (jsonStart > 0) {
    cleanContent = cleanContent.substring(jsonStart);
  }
  
  const jsonEnd = cleanContent.lastIndexOf(']');
  if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) {
    cleanContent = cleanContent.substring(0, jsonEnd + 1);
  }
  
  // Fix common JSON escaping issues for Java code
  // Fix string concatenation issues (remove + operators that break JSON)
  cleanContent = cleanContent.replace(/"\s*\+\s*\n\s*"/g, '');
  cleanContent = cleanContent.replace(/"\s*\+\s*"/g, '');
  
  // Fix unescaped backslashes in code context
  cleanContent = cleanContent.replace(/(?<!")\\(?!["\\\/bfnrtu])/g, '\\\\');
  
  return cleanContent;
}

/**
 * Makes API request to OpenAI with retry logic and timeout handling
 */
async function makeApiRequest(
  chunk: string,
  apiKey: string,
  timeoutMs: number,
  retry: { attempts: number; backoffBaseMs: number },
  abortSignal?: AbortSignal
): Promise<Response | null> {
  for (let attempt = 0; attempt < retry.attempts; attempt++) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    
    if (abortSignal) {
      abortSignal.addEventListener('abort', onAbort);
    }
    
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: createUserPrompt(chunk) }
          ],
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
      
      if (response && (response.ok || response.status !== 429)) {
        return response;
      }
    } catch (error: unknown) {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
      
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        throw error;
      }
    }
    
    // Exponential backoff for retries
    const backoff = retry.backoffBaseMs * Math.pow(2, attempt);
    await delay(backoff);
  }
  
  return null;
}

/**
 * Validates select-all question structure
 */
function validateSelectAllStructure(question: any): boolean {
  if (!validateQuestionStructure(question)) return false;
  
  const quiz = question.quiz;
  if (quiz.type !== 'select-all') return false;
  
  // Validate correctAnswers array
  if (!Array.isArray(quiz.correctAnswers)) {
    console.warn('Select-all question missing correctAnswers array');
    return false;
  }
  
  // Validate that correctAnswers are valid letters (A, B, C, D, E, F)
  const options = quiz.options || [];
  
  // If correctAnswers is empty, that's okay - it will be computed from isCorrect flags
  if (quiz.correctAnswers.length === 0) {
    // Check if options have isCorrect flags instead
    if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && 'isCorrect' in options[0]) {
      return true; // Valid - will be processed later
    }
    console.warn('Select-all question has empty correctAnswers and no isCorrect flags');
    return false;
  }
  
  for (const letter of quiz.correctAnswers) {
    if (typeof letter !== 'string' || letter.length !== 1) {
      console.warn('Select-all question has invalid correctAnswers letter:', letter);
      return false;
    }
    const charCode = letter.charCodeAt(0);
    if (charCode < 65 || charCode >= 65 + options.length) { // A=65, check if within A-F range
      console.warn('Select-all question has out-of-range correctAnswers letter:', letter);
      return false;
    }
  }
  
  return true;
}

/**
 * Processes AI response and extracts valid questions
 */
async function processAiResponse(response: Response, generated: RawQuestion[]): Promise<void> {
  const data = await response.json();
  const content = data.choices[0].message.content as string;
  
  try {
    const cleanContent = cleanAiResponse(content);
    const parsed = JSON.parse(cleanContent);
    
    if (Array.isArray(parsed)) {
      parsed.forEach((question: any) => {
        // Normalize options: support { text, isCorrect } format
        try {
          if (question && question.quiz && Array.isArray(question.quiz.options)) {
            const opts = question.quiz.options;
            if (opts.length > 0 && typeof opts[0] === 'object' && 'text' in opts[0]) {
              const flatOptions: string[] = opts.map((o: any) => String(o.text));
              const letters: string[] = opts
                .map((o: any, i: number) => (o.isCorrect ? String.fromCharCode(65 + i) : null))
                .filter((letter: string | null) => letter !== null);
              question.quiz.options = flatOptions;
              question.quiz.correctAnswers = letters;
            }
          }
        } catch {}

        if (validateSelectAllStructure(question)) {
          // Format the code context for better readability
          const questionData = question as any;
          if (questionData.quiz && questionData.quiz.codeContext) {
            questionData.quiz.codeContext = formatCodeContext(questionData.quiz.codeContext);
          }
          
          console.log('🔍 Select-All AI generated:', JSON.stringify(question, null, 2));
          generated.push(question as RawQuestion);
        }
      });
    }
  } catch (error) {
    console.warn('❌ JSON parse failed:', error);
    console.warn('📝 Raw GPT response:', content);
    console.warn('🧹 Cleaned content:', cleanAiResponse(content));
    
    // Fallback: attempt to repair common escaping issues (e.g., unescaped backslashes in codeContext)
    try {
      let cleanContent = cleanAiResponse(content);
      // Escape stray backslashes not followed by a valid escape char
      // This turns \x into \\\x so JSON.parse won't choke
      cleanContent = cleanContent.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
      console.warn('🔧 Repaired content:', cleanContent);
      const parsed2 = JSON.parse(cleanContent);
      if (Array.isArray(parsed2)) {
        parsed2.forEach((question: any) => {
          try {
            if (question && question.quiz && Array.isArray(question.quiz.options)) {
              const opts = question.quiz.options;
              if (opts.length > 0 && typeof opts[0] === 'object' && 'text' in opts[0]) {
                const flatOptions: string[] = opts.map((o: any) => String(o.text));
                const letters: string[] = opts
                  .map((o: any, i: number) => (o.isCorrect ? String.fromCharCode(65 + i) : null))
                  .filter((letter: string | null) => letter !== null);
                question.quiz.options = flatOptions;
                question.quiz.correctAnswers = letters;
              }
            }
          } catch {}

          if (validateSelectAllStructure(question)) {
            const questionData = question as any;
            if (questionData.quiz && questionData.quiz.codeContext) {
              questionData.quiz.codeContext = formatCodeContext(questionData.quiz.codeContext);
            }
            console.log('🔍 Select-All AI generated (repaired):', JSON.stringify(question, null, 2));
            generated.push(question as RawQuestion);
          }
        });
      }
    } catch (e2) {
      console.warn('❌ Failed to process Select-All AI response:', error);
      console.warn('❌ Secondary parse (repaired) also failed:', e2);
      console.warn('📝 Raw GPT response:', content);
      console.warn('🧹 Cleaned content:', cleanAiResponse(content));
    }
  }
}

export const selectAllPlugin: QuestionPlugin = {
  type: 'select-all',
  
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const generated: RawQuestion[] = [];
    
    try {
      const response = await makeApiRequest(chunk, apiKey, timeoutMs, retry, abortSignal);
      
      if (response && response.ok) {
        await processAiResponse(response, generated);
      }
    } catch (error) {
      console.warn('Select-All plugin error:', error);
      // Continue execution to allow other plugins to work
    }
    
    return generated;
  }
};
