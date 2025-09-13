import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, validateQuestionStructure } from './utils';

export const multipleChoicePlugin: QuestionPlugin = {
  type: 'multiple-choice',
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
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
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.' },
                { role: 'user', content: `Generate 1 multiple-choice question based on this code chunk:\n\n${chunk}\n\nCRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.\n\nIMPORTANT REQUIREMENTS:\n1. ONLY generate questions about functions that actually exist in the provided code chunk\n2. The function name in "snippet" must match a real function from the code\n3. Include the actual function code in the "codeContext" field\n4. The correct answer should be based on the actual function implementation\n5. Create realistic incorrect options that are plausible but wrong\n\nFormat:\n[\n  {\n    \"snippet\": \"function name from code\",\n    \"quiz\": {\n      \"type\": \"multiple-choice\",\n      \"question\": \"What does the function [FUNCTION_NAME] do?\",\n      \"codeContext\": \"the actual function implementation from the code chunk\",\n      \"options\": [\n        \"Correct description of what the function actually does\",\n        \"Plausible but incorrect description\", \n        \"Another plausible but incorrect description\",\n        \"Third plausible but incorrect description\"\n      ],\n      \"answer\": \"1\",\n      \"explanation\": \"why this is correct based on the actual function code\"\n    }\n  }\n]` }
              ],
              temperature: 0.3,
              max_tokens: 1500
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
          if (response && (response.ok || response.status !== 429)) break;
        } catch (e: any) {
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
            // Debug: Log what the AI generated
            console.log('🔍 Multiple Choice AI generated:', JSON.stringify(question, null, 2));
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


