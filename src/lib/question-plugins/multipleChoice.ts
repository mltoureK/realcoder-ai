import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, validateQuestionStructure, detectLanguageFromChunk } from './utils';

const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const TEMPERATURE = 0.7;
const MAX_TOKENS = 2500;
const SYSTEM_PROMPT = 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.';

function createUserPrompt(chunk: string): string {
  return `Generate 1 multiple-choice question based on this function to test understanding:

${chunk}

Then i want you to

Return ONLY valid JSON:
[
  {
    "snippet": "functionName",
    "quiz": {
      "type": "multiple-choice",
      "question": "hard coding question",
      "options": ["option A", "option B", "option C", "option D"],
      "answer": "A",
      "explanation": "why option A is correct"
    }
  }
]`;
}

export const multipleChoicePlugin: QuestionPlugin = {
  type: 'multiple-choice',
  
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const generated: RawQuestion[] = [];
    
    try {
      let response: Response | null = null;
      
      // Retry logic
      for (let attempt = 0; attempt < retry.attempts; attempt++) {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        if (abortSignal) abortSignal.addEventListener('abort', onAbort);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          response = await fetch(OPENAI_API_URL, {
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
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
          if (response && (response.ok || response.status !== 429)) break;
        } catch (e: any) {
          clearTimeout(timeoutId);
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
          if (e && e.name === 'AbortError') throw e;
        }
        
        const backoff = retry.backoffBaseMs * Math.pow(2, attempt);
        await delay(backoff);
      }

      if (response && response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content as string;
        
        try {
          // Clean AI response
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace(/^```json\s*/, '');
          if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace(/^```\s*/, '');
          if (cleanContent.endsWith('```')) cleanContent = cleanContent.replace(/\s*```$/, '');
          const jsonStart = cleanContent.indexOf('[');
          if (jsonStart > 0) cleanContent = cleanContent.substring(jsonStart);
          const jsonEnd = cleanContent.lastIndexOf(']');
          if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) cleanContent = cleanContent.substring(0, jsonEnd + 1);
          
          const parsed = JSON.parse(cleanContent);

          parsed.forEach((question: any) => {
            // Detect and inject language from chunk
            const langInfo = detectLanguageFromChunk(params.chunk);
            question.quiz.language = langInfo.name;
            question.quiz.languageColor = langInfo.color;
            question.quiz.languageBgColor = langInfo.bgColor;
            
            // CRITICAL: Inject the actual code chunk as codeContext, removing leading comment lines
            const lines = params.chunk.split('\n');
            let firstCodeLine = 0;
            while (firstCodeLine < lines.length && lines[firstCodeLine].trim().startsWith('//')) {
              firstCodeLine++;
            }
            question.quiz.codeContext = lines.slice(firstCodeLine).join('\n').trim();
            
            console.log(`📝 Multiple-choice question language: ${langInfo.name}`);
            
            // Validate question structure
            if (!validateQuestionStructure(question)) {
              console.warn('⚠️ Invalid question structure, skipping');
              return;
            }
            
            // Validate options array exists
            if (!question.quiz.options || !Array.isArray(question.quiz.options) || question.quiz.options.length < 2) {
              console.warn('⚠️ Invalid or missing options array, skipping');
              return;
            }
            
            // Validate answer field (A, B, C, D format)
            const answerLetter = question.quiz.answer?.toUpperCase();
            const letterToIndex: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const answerIndex = letterToIndex[answerLetter];
            
            if (answerIndex === undefined || answerIndex < 0 || answerIndex >= question.quiz.options.length) {
              console.warn(`⚠️ Invalid answer letter "${question.quiz.answer}" for ${question.quiz.options.length} options, skipping`);
              return;
            }
            
            // Store the correct answer TEXT
            const correctAnswerText = question.quiz.options[answerIndex];
            question.quiz.correctAnswerText = correctAnswerText;
            
            console.log(`✅ MCQ Question: "${question.quiz.question}"`);
            console.log(`✅ Correct Answer (${answerLetter}): "${correctAnswerText}"`);
            console.log(`📋 All options:`, question.quiz.options);
            console.log(`📄 Code Context: ${params.chunk.substring(0, 100)}...`);
            
            generated.push(question);
          });
        } catch (err) {
          console.error('❌ JSON parse error for multiple-choice:', err);
        }
      }
    } catch (error) {
      console.error('❌ Plugin-level error in multiple-choice:', error);
    }
    
    console.log(`📊 MultipleChoice: Generated ${generated.length} questions from this chunk`);
    return generated;
  }
};
