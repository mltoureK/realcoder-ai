import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { balanceVariantVerbosity, delay, removeComments, shuffleVariants, validateQuestionStructure, removeDuplicateVariants, detectLanguageFromChunk } from './utils';

export const orderSequencePlugin: QuestionPlugin = {
  type: 'order-sequence',
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const questionsPerChunk = 1;

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
                { role: 'user', content: `Generate ${questionsPerChunk} order-sequence quiz questions (with detailed necessary context to answer question fairly) that test UNIVERSAL programming concepts inspired by this code:
                \n\n${chunk}\n\nCRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.\n\nIMPORTANT REQUIREMENTS:
                1. Use the SAME programming language as the code chunk provided\n2. Test PROGRAMMING KNOWLEDGE, not repository-specific function names or trivia\n3. Use GENERIC code patterns that could apply to any codebase\n4. Focus on UNIVERSAL concepts:
                 5. Steps should be REALISTIC code in the same language as the chunk\n6. Include 2-3 educational distractors that test common programming mistakes
                 7. Make questions about CODING ABILITY, not memorizing specific variable names\n8. Test logical thinking and execution flow understanding\n9. Avoid repository-specific function signatures, variable names, or business logic\n10. Prepend a brief, neutral background context (1-2 sentences) directly in the question string, describing what the function is supposed to do and the realistic scenario. Do not include code/file names or repo-specific terms\n11. If multiple valid execution orders exist, include either an "acceptableOrders" field (array of arrays of step IDs) or a "constraints" field (array of precedence pairs like ["A","B"] or {"before":"A","after":"B"}) so the grader can accept all valid answers\n12. When alternates exist (e.g., step1 and step2 are independent), you MUST populate "acceptableOrders" with all valid sequences (or provide "constraints"); do NOT leave it empty
                 BREAKDOWN APPROACH:\n- Analyze the function's logical flow and dependencies\n- Identify initialization, processing, and cleanup phases\n- Consider async operations, error handling, and resource management\n- Break down into 4-6 logical steps that must happen in sequence\n- Include 2 realistic distractors that represent common mistakes\n- Focus on the actual execution order, not just code structure\n\nFormat:\n[\n  {\n    "snippet": "actual function name from the code chunk",\n    "quiz": {\n      "type": "order-sequence",\n      "question": "[Background: Provide a concise, neutral 1-2 sentence context that explains what the function is intended to do and the realistic scenario, without using code/file names or repo-specific terms.] In this context, what is the correct execution order for this function?",\n      "steps": [\n        {\n          "id": "step1",\n          "code": "[First logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes first]"\n        },\n        {\n          "id": "step2",\n          "code": "[Second logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes second]"\n        },\n        {\n          "id": "step3",\n          "code": "[Third logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes third]"\n        },\n        {\n          "id": "step4",\n          "code": "[Final logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes last]"\n        },\n        {\n          "id": "distractor1",\n          "code": "[Realistic but incorrect step that tests a common mistake]",\n          "explanation": "[Why this step would fail or cause issues]",\n          "isDistractor": true\n        },\n        {\n          "id": "distractor2",\n          "code": "[Another realistic but incorrect step that tests a different mistake]",\n          "explanation": "[Why this step would fail or cause issues]",\n          "isDistractor": true\n        }
      ],
      "correctOrder": ["step1", "step2", "step3", "step4"],
      "acceptableOrders": [
        ["step1", "step2", "step3", "step4"],
        ["step2", "step1", "step3", "step4"]
      ],
      "constraints": [],
      "explanation": "[Clear explanation (at least 5 sentences) of why this order is correct and what would happen if steps were reordered]"
    }
  }
]` }
              ],
              temperature: 0.7,
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
            
            // Detect and inject language from chunk
            const langInfo = detectLanguageFromChunk(chunk);
            question.quiz.language = langInfo.name;
            question.quiz.languageColor = langInfo.color;
            question.quiz.languageBgColor = langInfo.bgColor;
            console.log(`📝 Order-sequence question language: ${langInfo.name}`);
            
            if (question.quiz.steps && Array.isArray(question.quiz.steps)) {
              // Smart deduplication: normalize code and prefer correct steps over distractors
              const normalizeCode = (code: string) => 
                code.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[;,]/g, '');
              
              const codeMap = new Map<string, any>(); // normalized code -> step
              
              for (const step of question.quiz.steps) {
                const normalizedCode = normalizeCode(step.code || '');
                
                if (!normalizedCode) continue; // Skip empty steps
                
                if (!codeMap.has(normalizedCode)) {
                  // First time seeing this code
                  codeMap.set(normalizedCode, step);
                } else {
                  // Duplicate detected - prefer correct step over distractor
                  const existing = codeMap.get(normalizedCode);
                  if (!existing.isDistractor && step.isDistractor) {
                    // Keep existing (correct)
                    console.log(`🔀 Duplicate detected: keeping correct step, discarding distractor`);
                  } else if (existing.isDistractor && !step.isDistractor) {
                    // Replace with correct step
                    console.log(`🔀 Duplicate detected: replacing distractor with correct step`);
                    codeMap.set(normalizedCode, step);
                  } else {
                    // Both same type - keep first one
                    console.log(`⚠️ Duplicate detected: keeping first ${step.isDistractor ? 'distractor' : 'correct'} step`);
                  }
                }
              }
              
              const uniqueSteps = Array.from(codeMap.values());
              
              // Validate we still have enough correct steps
              const correctSteps = uniqueSteps.filter((s: any) => !s.isDistractor);
              const correctOrderIds = question.quiz.correctOrder || [];
              
              if (correctSteps.length < correctOrderIds.length) {
                console.warn(`⚠️ Skipping question: after deduplication, only ${correctSteps.length} correct steps remain but ${correctOrderIds.length} needed`);
                return;
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
