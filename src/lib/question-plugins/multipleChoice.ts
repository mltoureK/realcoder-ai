import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, validateQuestionStructure, detectLanguageFromChunk } from './utils';

/**
 * Constants for better maintainability
 */
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const TEMPERATURE = 0.8;
const MAX_TOKENS = 1500;

/**
 * System prompt for consistent AI behavior
 */
const SYSTEM_PROMPT = 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.';

/**
 * Creates the user prompt for multiple choice question generation
 */
function createUserPrompt(chunk: string): string {
  return `Generate 3 hard difficulty multiple-choice question based on this code chunk:

${chunk}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

IMPORTANT REQUIREMENTS:
1. IGNORE any code that is not in the primary programming language of this repository.
2. ONLY generate questions about functions that actually exist in the provided code chunk
3. The function name in "snippet" must match a real function from the code
4. Include the actual function code in the "codeContext" field with PROPER FORMATTING
5. The correct answer should be based on the actual function implementation
6. Create realistic incorrect options that are plausible but wrong
7. SCENARIO CONTEXT: Create realistic development scenarios that explain WHY this function exists
8. CODE FORMATTING: Format the codeContext with proper indentation and line breaks for readability
9. CHALLENGING DISTRACTORS: Make incorrect options subtle and plausible - they should test understanding of the function's behavior, not just obvious differences
10. RANDOMIZE ANSWERS: CRITICAL - Place the correct answer in a random position (1-4), not always first or last
11. AVOID PATTERNS: Do NOT make the correct answer always the longest, shortest, or most detailed option
12. TEST UNDERSTANDING: Focus on edge cases, side effects, data flow, or implementation details rather than obvious function purposes
13. SUBTLE DIFFERENCES: Incorrect options should differ in subtle ways - wrong data types, missing edge cases, incorrect side effects, wrong return values, or different execution order
14. RANDOM POSITIONING: MANDATORY - Vary the correct answer position across questions (sometimes A, B, C, or D)
15. EQUAL LENGTH OPTIONS: Make all options roughly the same length to avoid length-based guessing

FOCUS ON UNIVERSAL PROGRAMMING CONCEPTS:


AVOID:
- Repository-specific trivia


EXPLANATION REQUIREMENTS:
- Explain WHY the correct answer is right
- Explain WHY incorrect answers are wrong
- Focus on learning value

Format:
[
  {
    "snippet": "function name from code",
    "quiz": {
      "type": "multiple-choice",
      "question": "In a [REALISTIC_APP_CONTEXT], what does the function [FUNCTION_NAME] do?",
      "codeContext": "Display full function from the code chunk",
      "options": [
        "Subtle but incorrect description that sounds plausible",
        "Correct description of what the function actually does", 
        "Another subtle but incorrect description",
        "Third subtle but incorrect description"
      ],
      "answer": "2",
      "explanation": "why this is correct (at least 5 sentences) based on the actual function code"
    }
  }
]`;
}

/**
 * Formats code context for better readability
 */
function formatCodeContext(codeContext: string): string {
  if (!codeContext) return codeContext;
  
  // Replace escaped newlines with actual newlines
  let formatted = codeContext.replace(/\\n/g, '\n');
  
  // Ensure proper indentation (basic formatting)
  const lines = formatted.split('\n');
  const formattedLines = lines.map((line, index) => {
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
 * Randomizes answer position to prevent predictable patterns
 */
function randomizeAnswerPosition(questionData: any): void {
  if (!questionData.quiz || !questionData.quiz.options || !Array.isArray(questionData.quiz.options)) {
    return;
  }
  
  const options = questionData.quiz.options;
  const currentAnswerIndex = parseInt(questionData.quiz.answer) - 1; // Convert 1-based to 0-based
  
  if (isNaN(currentAnswerIndex) || currentAnswerIndex < 0 || currentAnswerIndex >= options.length) {
    return;
  }
  
  // Generate a random new position (different from current if possible)
  const possiblePositions = Array.from({length: options.length}, (_, i) => i);
  let newPosition = Math.floor(Math.random() * options.length);
  
  // If we have multiple options and randomly got the same position, try to get a different one
  if (options.length > 1 && newPosition === currentAnswerIndex && Math.random() < 0.7) {
    const otherPositions = possiblePositions.filter(pos => pos !== currentAnswerIndex);
    newPosition = otherPositions[Math.floor(Math.random() * otherPositions.length)];
  }
  
  // Swap the correct answer to the new position
  if (newPosition !== currentAnswerIndex) {
    const temp = options[currentAnswerIndex];
    options[currentAnswerIndex] = options[newPosition];
    options[newPosition] = temp;
    
    // Update the answer index (convert back to 1-based)
    questionData.quiz.answer = (newPosition + 1).toString();
    
    console.log(`🔀 Randomized answer position from ${currentAnswerIndex + 1} to ${newPosition + 1}`);
  }
}

/**
 * Processes AI response and extracts valid questions
 */
async function processAiResponse(response: Response, generated: RawQuestion[], params: GenerateParams): Promise<void> {
  const data = await response.json();
  const content = data.choices[0].message.content as string;
  
  try {
    const cleanContent = cleanAiResponse(content);
    const parsed = JSON.parse(cleanContent);
    
    if (Array.isArray(parsed)) {
      parsed.forEach((question: unknown) => {
        if (validateQuestionStructure(question)) {
          // Detect and inject language from chunk
          const questionData = question as any;
          const langInfo = detectLanguageFromChunk(params.chunk);
          questionData.quiz.language = langInfo.name;
          questionData.quiz.languageColor = langInfo.color;
          questionData.quiz.languageBgColor = langInfo.bgColor;
          console.log(`📝 Multiple-choice question language: ${langInfo.name}`);
          // Format the code context for better readability
          if (questionData.quiz && questionData.quiz.codeContext) {
            questionData.quiz.codeContext = formatCodeContext(questionData.quiz.codeContext);
          }
          
          // Randomize answer position to prevent predictable patterns
          randomizeAnswerPosition(questionData);
          
          console.log('🔍 Multiple Choice AI generated:', JSON.stringify(question, null, 2));
          generated.push(question as RawQuestion);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to process AI response:', error);
  }
}

export const multipleChoicePlugin: QuestionPlugin = {
  type: 'multiple-choice',
  
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const generated: RawQuestion[] = [];
    
    try {
      const response = await makeApiRequest(chunk, apiKey, timeoutMs, retry, abortSignal);
      
      if (response && response.ok) {
        await processAiResponse(response, generated, params);
      }
    } catch (error) {
      console.warn('Multiple Choice plugin error:', error);
      // Continue execution to allow other plugins to work
    }
    
    return generated;
  }
};


