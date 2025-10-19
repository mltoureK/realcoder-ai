import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, removeComments, shuffleVariants, validateQuestionStructure, detectLanguageFromChunk } from './utils';

const MIN_CORRECT_STEPS = 5;
const MAX_CORRECT_STEPS = 10;
const MAX_DISTRACTOR_STEPS = 3;

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
                1. Use the SAME programming language as the code chunk provided\n2. Test PROGRAMMING KNOWLEDGE, not repository-specific function names or trivia\n3. Use GENERIC code patterns that could apply to any codebase\n4. Focus on UNIVERSAL concepts\n5. Provide BETWEEN 5 and 10 real execution steps in the same language as the chunk (label them step1...stepN without gaps)\n6. Include EXACTLY 3 educational distractors that test common programming mistakes (id them distractorA/B/C and set "isDistractor": true)\n7. Make questions about CODING ABILITY, not memorizing specific variable names\n8. Test logical thinking and execution flow understanding\n9. Avoid repository-specific function signatures, variable names, or business logic\n10. Prepend a brief, neutral background context (1-2 sentences) directly in the question string, describing what the function is supposed to do and the realistic scenario. Do not include code/file names or repo-specific terms\n11. If multiple valid execution orders exist, include either an "acceptableOrders" field (array of arrays of step IDs) or a "constraints" field (array of precedence pairs like ["step1","step2"] or {"before":"step1","after":"step3"}) so the grader can accept all valid answers\n12. When alternates exist (e.g., step2 and step3 are independent), you MUST populate "acceptableOrders" with all valid sequences (or provide "constraints"); do NOT leave it empty\n13. Keep complete code blocks for each step (do not truncate; include relevant function calls, conditionals, and async handling as needed)\n14. Explanations must highlight how data or control flow moves from one step to the next\n15. Focus on the actual execution order, not just surface-level code structure\n16. If you add step7-step10, update every part of the payload (steps, correctOrder, acceptableOrders, constraints) so IDs stay consistent\n\nFormat:\n[\n  {\n    "snippet": "actual function name from the code chunk",\n    "quiz": {\n      "type": "order-sequence",\n      "question": "[Background: Provide a concise, neutral 1-2 sentence context that explains what the function is intended to do and the realistic scenario, without using code/file names or repo-specific terms.] In this context, what is the correct execution order for this function?",\n      "steps": [\n        {\n          "id": "step1",\n          "code": "[First logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes first]"\n        },\n        {\n          "id": "step2",\n          "code": "[Second logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes second]"\n        },\n        {\n          "id": "step3",\n          "code": "[Third logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes third]"\n        },\n        {\n          "id": "step4",\n          "code": "[Fourth logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes fourth]"\n        },\n        {\n          "id": "step5",\n          "code": "[Fifth logical step in the same programming language as the code chunk]",\n          "explanation": "[Why this step comes fifth]"\n        },\n        {\n          "id": "step6",\n          "code": "[Sixth logical step in the same programming language as the code chunk — continue by adding step7, step8, step9, step10 only if the logic truly needs them]",\n          "explanation": "[Why this step comes sixth]"\n        },\n        {\n          "id": "distractorA",\n          "code": "[Realistic but incorrect step that tests a common mistake]",\n          "explanation": "[Why this step would fail or cause issues]",\n          "isDistractor": true\n        },\n        {\n          "id": "distractorB",\n          "code": "[Another realistic but incorrect step that tests a different mistake]",\n          "explanation": "[Why this step would fail or cause issues]",\n          "isDistractor": true\n        },\n        {\n          "id": "distractorC",\n          "code": "[A third realistic distractor covering a different misconception]",\n          "explanation": "[Why this step would fail or cause issues]",\n          "isDistractor": true\n        }\n      ],\n      "correctOrder": ["step1", "step2", "step3", "step4", "step5", "step6"],\n      "acceptableOrders": [\n        ["step1", "step2", "step3", "step4", "step5", "step6"],\n        ["step1", "step3", "step2", "step4", "step5", "step6"]\n      ],\n      "constraints": [\n        { "before": "step1", "after": "step3" }\n      ],\n      "explanation": "[Clear explanation (at least 5 sentences) of why this order is correct and what would happen if steps were reordered]"\n    }\n  }\n]` }
              ],
              temperature: 0.7,
              max_tokens: 2600
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
                removeComments(String(code || ''))
                  .toLowerCase()
                  .replace(/\s+/g, ' ')
                  .replace(/[{}();,]/g, '')
                  .trim();

              const codeMap = new Map<string, any>(); // normalized code -> step

              for (const step of question.quiz.steps) {
                if (!step) continue;
                const normalizedCode = normalizeCode(step.code || '');
                if (!normalizedCode) continue; // Skip empty steps

                const existing = codeMap.get(normalizedCode);
                if (!existing) {
                  codeMap.set(normalizedCode, step);
                  continue;
                }

                if (!existing.isDistractor && step.isDistractor) {
                  // Keep existing (correct)
                  continue;
                }

                if (existing.isDistractor && !step.isDistractor) {
                  console.log(`🔀 Duplicate detected: replacing distractor with correct step`);
                  codeMap.set(normalizedCode, step);
                  continue;
                }

                console.log(`⚠️ Duplicate detected: keeping first ${step.isDistractor ? 'distractor' : 'correct'} step`);
              }

              const uniqueSteps = Array.from(codeMap.values());
              const stepMapById = new Map<string, any>();
              for (const step of uniqueSteps) {
                if (!step || typeof step.id !== 'string') continue;
                if (!stepMapById.has(step.id)) {
                  stepMapById.set(step.id, step);
                } else {
                  console.log(`⚠️ Duplicate step id detected (${step.id}) - keeping the first instance`);
                }
              }

              const rawCorrectOrder = Array.isArray(question.quiz.correctOrder) ? question.quiz.correctOrder : [];
              const sanitizedCorrectOrder = rawCorrectOrder
                .map((id: any) => String(id))
                .filter((id) => {
                  const step = stepMapById.get(id);
                  return step && !step.isDistractor;
                });

              const dedupedCorrectOrder = sanitizedCorrectOrder.filter((id, idx) => sanitizedCorrectOrder.indexOf(id) === idx);
              let finalCorrectOrder = dedupedCorrectOrder.slice(0, MAX_CORRECT_STEPS);

              if (finalCorrectOrder.length < MIN_CORRECT_STEPS) {
                const fallbackOrder = uniqueSteps
                  .filter((step: any) => step && !step.isDistractor && typeof step.id === 'string')
                  .map((step: any) => step.id)
                  .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx);
                finalCorrectOrder = fallbackOrder.slice(0, MAX_CORRECT_STEPS);
              }

              if (finalCorrectOrder.length < MIN_CORRECT_STEPS) {
                console.warn(`⚠️ Skipping question: need at least ${MIN_CORRECT_STEPS} correct steps, but only found ${finalCorrectOrder.length}`);
                return;
              }

              question.quiz.correctOrder = finalCorrectOrder;
              const allowedCorrectIds = new Set(finalCorrectOrder);

              const sanitizedSteps: any[] = [];
              const keptStepIds = new Set<string>();
              const keptDistractorIds: string[] = [];

              for (const step of uniqueSteps) {
                if (!step || typeof step.id !== 'string' || keptStepIds.has(step.id)) continue;

                if (step.isDistractor) {
                  if (keptDistractorIds.length >= MAX_DISTRACTOR_STEPS) continue;
                  keptDistractorIds.push(step.id);
                  keptStepIds.add(step.id);
                  sanitizedSteps.push(step);
                  continue;
                }

                if (allowedCorrectIds.has(step.id)) {
                  keptStepIds.add(step.id);
                  sanitizedSteps.push(step);
                }
              }

              const correctStepCount = sanitizedSteps.filter((s: any) => !s.isDistractor).length;
              if (correctStepCount !== finalCorrectOrder.length) {
                console.warn(`⚠️ Skipping question: sanitized steps (${correctStepCount}) do not match correctOrder length (${finalCorrectOrder.length})`);
                return;
              }

              const validStepIds = new Set([...finalCorrectOrder, ...keptDistractorIds]);
              question.quiz.steps = sanitizedSteps.filter((step: any) => step && validStepIds.has(step.id));

              if (Array.isArray(question.quiz.acceptableOrders)) {
                const normalizedOrders = question.quiz.acceptableOrders
                  .filter((order: any) => Array.isArray(order))
                  .map((order: any[]) =>
                    order
                      .map((id: any) => String(id))
                      .filter((id: string) => allowedCorrectIds.has(id))
                  )
                  .filter((order: string[]) => order.length === finalCorrectOrder.length && new Set(order).size === order.length);

                if (normalizedOrders.length > 0) {
                  question.quiz.acceptableOrders = normalizedOrders;
                } else {
                  delete question.quiz.acceptableOrders;
                }
              }

              if (Array.isArray(question.quiz.constraints)) {
                const sanitizedConstraints = question.quiz.constraints.filter((constraint: any) => {
                  if (Array.isArray(constraint) && constraint.length === 2) {
                    const [before, after] = constraint.map((id: any) => String(id));
                    return allowedCorrectIds.has(before) && allowedCorrectIds.has(after);
                  }
                  if (constraint && typeof constraint === 'object' && 'before' in constraint && 'after' in constraint) {
                    const before = String(constraint.before);
                    const after = String(constraint.after);
                    return allowedCorrectIds.has(before) && allowedCorrectIds.has(after);
                  }
                  return false;
                });

                if (sanitizedConstraints.length > 0) {
                  question.quiz.constraints = sanitizedConstraints;
                } else {
                  delete question.quiz.constraints;
                }
              }

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
