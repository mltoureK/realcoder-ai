import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, validateQuestionStructure } from './utils';

/**
 * Constants for better maintainability
 */
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const TEMPERATURE = 0.7;
const MAX_TOKENS = 1500;

/**
 * System prompt for consistent AI behavior
 */
const SYSTEM_PROMPT = 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.';

/**
 * Creates the user prompt for true/false question generation
 */
function createUserPrompt(chunk: string): string {
  return `Generate 4 challenging true/false questions based on this code chunk:

${chunk}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

IMPORTANT REQUIREMENTS:
1. Use the SAME programming language as the code chunk provided
2. ONLY generate questions about code that actually exists in the provided chunk
3. Focus on code behavior, performance, security, or best practices
4. Create statements that test understanding of how the code actually works
5. Make the statement specific and verifiable from the code
6. Include the actual code snippet in the "codeContext" field with PROPER FORMATTING
7. The correct answer should be based on the actual code implementation
8. Create realistic scenarios that explain WHY this question matters
9. CODE FORMATTING: Format the codeContext with proper indentation and line breaks for readability
10. Generate a mix of TRUE and FALSE statements for balanced difficulty

FORMAT (strict JSON):
[
  {
    "snippet": "[key function or concept name from the code chunk]",
    "quiz": {
      "type": "true-false",
      "question": "[A specific true/false statement about the code that requires understanding programming concepts in the same language as the code chunk]",
      "codeContext": "[relevant full function or code snippet from the chunk with proper formatting]",
      "options": ["True", "False"],
      "answer": "[True or False based on the actual code behavior]",
      "explanation": "[Clear explanation of why this statement is true or false based on the actual code implementation]"
    }
  }
]

CRITICAL: Use "TRUE" or "FALSE" for the answer field (case insensitive). Do NOT use numbers like "0" or "1".
`;
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
 * Processes AI response and extracts valid questions
 */
async function processAiResponse(response: Response, generated: RawQuestion[]): Promise<void> {
  const data = await response.json();
  const content = data.choices[0].message.content as string;
  
  try {
    let cleanContent = cleanAiResponse(content);
    
    // Additional cleaning for common issues
    cleanContent = cleanContent.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find JSON array boundaries
    const jsonStart = cleanContent.indexOf('[');
    const jsonEnd = cleanContent.lastIndexOf(']');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(cleanContent);
    
    if (Array.isArray(parsed)) {
      parsed.forEach((question: unknown) => {
        if (validateQuestionStructure(question)) {
          // Format the code context for better readability
          const questionData = question as any;
          if (questionData.quiz && questionData.quiz.codeContext) {
            questionData.quiz.codeContext = formatCodeContext(questionData.quiz.codeContext);
          }
          
          console.log('🔍 True/False AI generated:', JSON.stringify(question, null, 2));
          generated.push(question as RawQuestion);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to process AI response:', error);
  }
}

export const trueFalsePlugin: QuestionPlugin = {
  type: 'true-false',
  
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const generated: RawQuestion[] = [];
    
    try {
      const response = await makeApiRequest(chunk, apiKey, timeoutMs, retry, abortSignal);
      
      if (response && response.ok) {
        await processAiResponse(response, generated);
      }
    } catch (error) {
      console.warn('True/False plugin error:', error);
      // Continue execution to allow other plugins to work
    }
    
    return generated;
  }
};
