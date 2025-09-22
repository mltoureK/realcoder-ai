import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { balanceVariantVerbosity, delay, removeComments, shuffleVariants, validateQuestionStructure, removeDuplicateVariants } from './utils';

export const orderSequencePlugin: QuestionPlugin = {
  type: 'order-sequence',
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const questionsPerChunk = 3;

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
                { role: 'user', content: `Generate ${questionsPerChunk} order-sequence quiz questions (with detailed necessary context to answer question fairly) that test UNIVERSAL programming concepts inspired by this code:\n\n${chunk}\n\nCRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.\n\nIMPORTANT REQUIREMENTS:\n1. Test PROGRAMMING KNOWLEDGE, not repository-specific function names or trivia\n2. Use GENERIC code patterns that could apply to any codebase\n3. Focus on UNIVERSAL concepts: async/await, error handling, data validation, API calls, etc.\n4. Steps should be REALISTIC code like "const response = await fetch(url)" not "setSpecificFunctionName()"\n5. Include 2-3 educational distractors that test common programming mistakes\n6. Make questions about CODING ABILITY, not memorizing specific variable names\n7. Test logical thinking and execution flow understanding\n8. Avoid repository-specific function signatures, variable names, or business logic\n\nSMART BREAKDOWN PATTERNS:\n- Async functions: initialization → validation → API calls → data processing → return/error handling\n- Data processing: input validation → transformation → filtering → output formatting → return\n- File operations: path validation → file existence check → read/write → error handling → cleanup\n- API integration: URL construction → headers setup → request → response validation → data extraction\n- Authentication: credential validation → token generation → storage → verification → cleanup\n- Database operations: connection → query construction → execution → result processing → connection cleanup\n- Error handling: try block → operation → catch block → error processing → finally cleanup\n- Promise chains: initial promise → then/catch → data transformation → final then/catch → return\n- Event handling: event listener → event validation → handler execution → cleanup/unsubscribe\n- State management: state initialization → action dispatch → reducer processing → state update → side effects\n\nFormat:\n[\n  {\n    "snippet": "actual function name from the code chunk",\n    "quiz": {\n      "type": "order-sequence",\n      "question": "In [REALISTIC_APP_CONTEXT], what is the correct execution order for this function?",\n      "steps": [\n        {\n          "id": "step1",\n          "code": "const result = await fetch(url);",\n          "explanation": "First, we make the API call to get the data"\n        },\n        {\n          "id": "step2",\n          "code": "if (!result.ok) throw new Error('Request failed');",\n          "explanation": "Then we validate the response status before proceeding"\n        },\n        {\n          "id": "step3",\n          "code": "const data = await result.json();",\n          "explanation": "Next, we parse the JSON response into usable data"\n        },\n        {\n          "id": "step4",\n          "code": "return data.items.filter(item => item.active);",\n          "explanation": "Finally, we filter and return the processed data"\n        },\n        {\n          "id": "distractor1",\n          "code": "const data = await result.json();",\n          "explanation": "This would fail because we haven't validated the response yet",\n          "isDistractor": true\n        },\n        {\n          "id": "distractor2",\n          "code": "const result = fetch(url);",\n          "explanation": "This is missing await, which would return a Promise instead of the response",\n          "isDistractor": true\n        }\n      ],\n      "correctOrder": ["step1", "step2", "step3", "step4"],\n      "explanation": "This order ensures proper async handling: fetch → validate → parse → process → return. Skipping validation or parsing before validation would cause runtime errors."\n    }\n  }\n]` }
              ],
              temperature: 0.85,
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
            if (question.quiz.steps && Array.isArray(question.quiz.steps)) {
              // Remove duplicate steps based on code content
              const seenCodes = new Set();
              const uniqueSteps = [];
              
              for (const step of question.quiz.steps) {
                const codeKey = step.code?.trim();
                if (!seenCodes.has(codeKey)) {
                  seenCodes.add(codeKey);
                  uniqueSteps.push(step);
                }
              }
              
              question.quiz.steps = uniqueSteps;
              
              // Shuffle the steps for presentation (correctOrder remains the same)
              question.quiz.steps = shuffleVariants(question.quiz.steps);
              question.quiz.steps.forEach((step: any) => {
                if (step && step.code) step.code = removeComments(step.code);
              });
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
