import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { balanceVariantVerbosity, delay, removeComments, shuffleVariants, validateQuestionStructure, removeDuplicateVariants } from './utils';

export const functionVariantPlugin: QuestionPlugin = {
  type: 'function-variant',
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const questionsPerChunk = 2;

    const generated: RawQuestion[] = [];
    try {
      let response: Response | null = null;
      for (let attempt = 0; attempt < retry.attempts; attempt++) {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        if (abortSignal) abortSignal.addEventListener('abort', onAbort);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.' },
                { role: 'user', content: `Generate ${questionsPerChunk} function-variant quiz questions that test programming knowledge based on this code chunk:\n\n${chunk}\n\nCRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.\n\nIMPORTANT REQUIREMENTS:\n1. ONLY generate questions about functions that actually exist in the provided code chunk\n2. The function name in \"snippet\" must match a real function from the code\n3. The correct variant must be the actual function implementation from the code\n4. Incorrect variants should have realistic bugs (off-by-one, wrong variable names, missing checks, etc.)\n5. ALL variants must be similar in length (±30 characters and/or ±2 lines)\n
                6. Each variant must be syntactically valid code in the programming language used\n
                7. CRITICAL LENGTH RULE: ALL variants must be roughly the same length (±20% line count). The correct answer should NEVER be obviously longer or more detailed than incorrect options.\n8. EQUAL COMPLEXITY: Make all variants equally complex-looking. Avoid making correct answer obviously more sophisticated.\n9. SCENARIO CONTEXT: Create realistic development scenarios that explain WHY this function exists
9. GENERIC PATTERNS: Focus on universal programming patterns, not specific app functionality. Test concepts like error handling, data validation, async operations, state management, etc.
10. AVOID REPO-SPECIFIC: Don't use specific function names in the question. Instead, describe the general pattern or concept being tested.
11. BALANCED EXPLANATIONS: Make ALL explanations roughly the same length. Don't make correct explanation obviously more detailed.

FOCUS ON UNIVERSAL PROGRAMMING CONCEPTS:


AVOID:
- Repository-specific trivia
- Domain-specific business logic
- Cosmetic formatting differences
- Game-specific mechanics
- Chatbot/AI-specific implementations

EXPLANATION REQUIREMENTS:
- Explain WHY the correct answer is right
- Explain WHY incorrect answers are wrong
- Include practical examples
- Focus on learning value

Format:\n[\n  {\n    \"snippet\": \"actual function name from the code chunk\",\n    \"quiz\": {\n      \"type\": \"function-variant\",\n     
                 \"question\": \"In [REALISTIC_APP_CONTEXT] with [SPECIFIC_CONTEXT], how should this function be implemented to accomplish[UNIVERSAL_GOAL/CONSTRAINT]?\",
      \"variants\": [\n        {\n          \"id\": \"A\",\n          \"code\": \"the actual function implementation from the code chunk\",\n          \"isCorrect\": true,\n          \"explanation\": \"Detailed explanation on why this is correct implementation from the original code\"\n        },\n        {\n          \"id\": \"B\",\n          \"code\": \"function with realistic bug (similar length)\",\n          \"isCorrect\": false,\n          \"explanation\": \"Detailed explanation on why this specific bug is wrong, and here is an example to further explain that\"\n        },\n        {\n          \"id\": \"C\",\n          \"code\": \"function with different realistic bug (similar length)\",\n          \"isCorrect\": false,\n          \"explanation\": \"Detailed explanation on why this specific bug is wrong, and here is an example to further explain that\"\n        },\n        {\n          \"id\": \"D\",\n          \"code\": \"function with another realistic bug (similar length)\",\n          \"isCorrect\": false,\n          \"explanation\": \"Here is why this specific bug is wrong, and here is an example to further explain that\"\n        }\n      ]\n    }\n  }\n]` }
              ],
              temperature: 0.8,
              max_tokens: 2000
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
          if (response && (response.ok || response.status !== 429)) break;
        } catch (e: any) {
          clearTimeout(timeoutMs as unknown as NodeJS.Timeout);
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
            if (!validateQuestionStructure(question)) return;
            if (question.quiz.variants && Array.isArray(question.quiz.variants)) {
              // Remove duplicate variants before processing
              const filteredVariants = removeDuplicateVariants(question.quiz.variants);
              if (filteredVariants === null) {
                console.warn('⚠️ Skipping question - all variants were duplicates of correct answer');
                return;
              }
              
              question.quiz.variants = filteredVariants;
              question.quiz.variants = shuffleVariants(question.quiz.variants);
              question.quiz.variants.forEach((variant: any) => {
                if (variant && variant.code) variant.code = removeComments(variant.code);
              });
              question.quiz.variants = balanceVariantVerbosity(question.quiz.variants);
            }
            generated.push(question);
          });
        } catch (err) {
          // swallow parse errors per-chunk
        }
      }
    } catch (error) {
      // swallow plugin-level errors to let orchestrator continue
    }
    return generated;
  }
};


