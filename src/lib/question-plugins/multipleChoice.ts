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
                { role: 'user', content: `Generate 1 multiple-choice question from this code chunk.\n\nStrict requirements:\n1) Pick ONE real function from the chunk.\n2) Provide top-level 'codeContext' with the exact function body (trim to 8–12 most relevant lines if long).\n3) Ask about BEHAVIOR/RETURN VALUE/SIDE EFFECTS (no trivia).\n4) Distractors MUST be genuinely confusable and code-grounded: only realistic mistakes (off-by-one boundary, wrong branch/condition, swapped args, wrong return shape, missing effect). Avoid trivial wrong answers and avoid giveaways (unique keywords, different tone, extra qualifiers).\n5) Option parity: keep options similar in style and complexity (same tense/voice; roughly similar length) but do NOT rely on length tricks.\n6) Randomize option order.\n7) Provide numeric 'answer' (1-based) and a brief 'explanation' citing the exact token/branch that proves it.\n\nCODE CHUNK:\n${chunk}\n\nCRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.\n\nFormat:\n[\n  {\n    \"snippet\": \"function name from code\",\n    \"codeContext\": \"function foo(a){return a+1}\",\n    \"quiz\": {\n      \"type\": \"multiple-choice\",\n      \"question\": \"What does [FUNCTION] do?\",\n      \"options\": [\n        \"A\", \"B\", \"C\", \"D\"\n      ],\n      \"answer\": \"1\",\n      \"explanation\": \"why this is correct\"\n    }\n  }\n]` }
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
            // Attach minimal context header when available
            if (!question.quiz.question && question.snippet) {
              question.quiz.question = `What does ${question.snippet} do?`;
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


