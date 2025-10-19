import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { balanceVariantVerbosity, delay, removeComments, shuffleVariants, validateQuestionStructure, removeDuplicateVariants, detectLanguageFromChunk } from './utils';

export const functionVariantPlugin: QuestionPlugin = {
  type: 'function-variant',
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const questionsPerChunk = 1; // Generate 1 question per function for diversity
    
    // Randomize length for EACH incorrect variant individually (50% chance each)
    const variantBLength = Math.random() < 0.5 ? " - Make this variant LONGER than the correct answer by adding extra verbose code or comments" : "";
    const variantCLength = Math.random() < 0.5 ? " - Make this variant LONGER than the correct answer by adding extra verbose code or comments" : "";
    const variantDLength = Math.random() < 0.5 ? " - Make this variant LONGER than the correct answer by adding extra verbose code or comments" : "";

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
                { role: 'user', content: `Generate ${questionsPerChunk} hard difficulty function-variant quiz questions that can be answered based on the json snippet function that the question uses from the code chunk:\n\n${chunk}\n\nCRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.\n\nIMPORTANT REQUIREMENTS:\n1. ONLY generate questions about functions that actually exist in the provided code chunk\n2. The function name in \"snippet\" A functionfrom the code\n3. The correct variant must be the actual function implementation from the code\n4. Incorrect variants should have realistic bugs\n

FOCUS ON UNIVERSAL PROGRAMMING CONCEPTS:


AVOID:
- Repository-specific trivia


EXPLANATION REQUIREMENTS:
- Explain WHY the correct answer is right
- Explain WHY incorrect answers are wrong
- Include practical examples
- Focus on learning value

Format:\n[\n  {\n    \"snippet\": \"show complete function(and code)  that the question uses from the code chunk\",\n    \"quiz\": {\n      \"type\": \"function-variant\",\n     
                 \"question\": \"Ask the user to select the function that accomplishes very specific instructions that only the correct answer accomplishes [insert function purpose] and watchout for [List 3 errors that the wrong answers have]".\",
      \"variants\": [\n        {\n          \"id\": \"A\",\n          \"code\": \"Display full function from the code chunk\",\n          \"isCorrect\": true,\n          \"explanation\": \"Detailed explanation (3-5 sentences) with a humorous snarky tone that makes user feel smart for getting it right\"\n        },\n        {\n          \"id\": \"B\",\n          \"code\": \"Display full correct function from the code chunk with a functional error added to it${variantBLength}\",\n          \"isCorrect\": false,\n          \"explanation\": \"Longer explanation (3-5 sentences) on why this specific bug is wrong in a condescending tone\"\n        },\n        {\n          \"id\": \"C\",\n          \"code\": \"Display full correct function from the code chunk with a functional error added to it${variantCLength}\",\n          \"isCorrect\": false,\n          \"explanation\": \"Encouraging and funny explanation (3-5 sentences) on why this specific bug is wrong. \"\n        },\n        {\n          \"id\": \"D\",\n          \"code\": \"correct function with a functional error added to it${variantDLength}\",\n          \"isCorrect\": false,\n          \"explanation\": \"Here is why this specific bug is wrong (3-5 sentences), and here is an example to further explain that\"\n        }\n      ]\n    }\n  }\n]` }
              ],
              temperature: 0.7,
              max_tokens: 2500 // First, explain the purpose of the function in the application. Then, 
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
            // Detect and inject language from chunk
            const langInfo = detectLanguageFromChunk(chunk);
            question.quiz.language = langInfo.name;
            question.quiz.languageColor = langInfo.color;
            question.quiz.languageBgColor = langInfo.bgColor;
            console.log(`📝 Function-variant question language: ${langInfo.name}`);
            
            // Normalize AI response - fix common field name issues
            if (question.quiz && question.quiz.variants && Array.isArray(question.quiz.variants)) {
              question.quiz.variants.forEach((variant: any) => {
                // Fix label -> id
                if (variant.label && !variant.id) {
                  variant.id = variant.label;
                  delete variant.label;
                }
                // Ensure isCorrect is boolean
                if (typeof variant.isCorrect === 'string') {
                  variant.isCorrect = variant.isCorrect.toLowerCase() === 'true';
                }
                // Add missing explanation if needed
                if (!variant.explanation) {
                  variant.explanation = variant.isCorrect ? 'This is the correct implementation.' : 'This implementation has an error.';
                }
              });
            }
            
            if (!validateQuestionStructure(question)) return;
            if (question.quiz.variants && Array.isArray(question.quiz.variants)) {
              // Remove duplicate variants before processing
              const filteredVariants = removeDuplicateVariants(question.quiz.variants);
              if (filteredVariants === null) {
                console.warn('⚠️ Skipping question - all variants were duplicates of correct answer');
                return;
              }
              
              question.quiz.variants = filteredVariants;
              
              // Check if correct answer is an empty function body - if so, skip this question
              const correctVariant = question.quiz.variants.find((v: any) => v.isCorrect === true);
              if (correctVariant && correctVariant.code) {
                const cleanCode = removeComments(correctVariant.code).trim();
                // Check if function body is empty (just braces with whitespace)
                // Matches: "function name() { }", "returnType functionName() { }", "public static void main(String[] args) { }", etc.
                if (cleanCode.match(/^\s*(?:(?:public|private|protected|static|final|abstract|synchronized|native|strictfp|[\w<>\[\]]+)\s+)*[\w_]+\s*\([^)]*\)\s*(?:throws\s+\w+(?:\s*,\s*\w+)*)?\s*\{\s*\}\s*$/)) {
                  console.warn('⚠️ Skipping question - correct answer is an empty function body');
                  return;
                }
              }
              
              question.quiz.variants = shuffleVariants(question.quiz.variants);
              question.quiz.variants.forEach((variant: any) => {
                if (variant && typeof variant.code === 'string') {
                  variant.code = variant.code.trimEnd();
                }
              });
              question.quiz.variants = balanceVariantVerbosity(question.quiz.variants);
            }
            generated.push(question);
          });
        } catch (err) {
          console.error('❌ JSON parse error for function-variant:', err);
        }
      }
    } catch (error) {
      console.error('❌ Plugin-level error in function-variant:', error);
    }
    console.log(`📊 FunctionVariant: Generated ${generated.length} questions from this chunk`);
    return generated;
  }
};

