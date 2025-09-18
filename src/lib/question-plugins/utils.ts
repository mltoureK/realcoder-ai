// General-purpose array shuffle (Fisher-Yates)
export function shuffleVariants<T>(variants: T[]): T[] {
  const shuffled = [...variants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function removeComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*[\r\n]/gm, '')
    .trim();
}

export function balanceVariantVerbosity(variants: any[]): any[] {
  if (variants.length < 2) return variants;
  const correctVariant = variants.find((v: any) => v && v.isCorrect);
  const incorrectVariants = variants.filter((v: any) => v && !v.isCorrect);
  if (!correctVariant || incorrectVariants.length === 0) return variants;

  // Calculate lengths more strictly (line count + character count)
  const getVariantComplexity = (variant: any) => {
    const code = variant.code || '';
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;
    const chars = code.length;
    return { lines, chars, code };
  };

  const correctComplexity = getVariantComplexity(correctVariant);
  const incorrectComplexities = incorrectVariants.map(getVariantComplexity);
  const avgIncorrectLines = incorrectComplexities.reduce((sum, c) => sum + c.lines, 0) / incorrectComplexities.length;
  const avgIncorrectChars = incorrectComplexities.reduce((sum, c) => sum + c.chars, 0) / incorrectComplexities.length;

  // Much stricter threshold: 20% difference instead of 50%
  const lineThreshold = 0.2;
  const charThreshold = 0.3;

  // If correct answer is significantly longer, pad shorter incorrect answers
  if (correctComplexity.lines > avgIncorrectLines * (1 + lineThreshold) || 
      correctComplexity.chars > avgIncorrectChars * (1 + charThreshold)) {
    
    console.log(`⚖️ Correct answer too long (${correctComplexity.lines} lines vs avg ${avgIncorrectLines.toFixed(1)}), padding incorrect answers`);
    
    incorrectVariants.forEach((variant, index) => {
      const complexity = incorrectComplexities[index];
      if (complexity.lines < correctComplexity.lines * 0.8) {
        // Add padding to make it look more substantial
        if (variant.code.includes('return') && !variant.code.includes('const result')) {
          variant.code = variant.code.replace(
            /return ([^;\n]+);?/,
            'const result = $1;\n  return result;'
          );
        } else if (variant.code.includes('{') && !variant.code.includes('//')) {
          // Add a comment to increase apparent complexity
          variant.code = variant.code.replace('{', '{\n  // Validate input parameters');
        }
      }
    });
  }

  // If correct answer is significantly shorter, trim longer incorrect answers  
  if (correctComplexity.lines < avgIncorrectLines * (1 - lineThreshold) ||
      correctComplexity.chars < avgIncorrectChars * (1 - charThreshold)) {
    
    console.log(`⚖️ Correct answer too short (${correctComplexity.lines} lines vs avg ${avgIncorrectLines.toFixed(1)}), trimming incorrect answers`);
    
    incorrectVariants.forEach(variant => {
      // Simplify overly verbose incorrect answers
      if (variant.code.includes('const result') && variant.code.includes('return result')) {
        variant.code = variant.code.replace(
          /const result = ([^;\n]+);?\s*return result;?/,
          'return $1;'
        );
      }
      // Remove unnecessary comments
      variant.code = variant.code.replace(/\s*\/\/[^\n]*\n/g, '\n');
    });
  }

  return variants;
}

export function validateQuestionStructure(question: any): boolean {
  if (!question || typeof question !== 'object') {
    console.log('🚫 Validator: Question is not an object:', question);
    return false;
  }
  if (!question.quiz || typeof question.quiz !== 'object') {
    console.log('🚫 Validator: Question.quiz is missing or not an object:', question);
    return false;
  }
  if (!question.quiz.type || !question.quiz.question) {
    console.log('🚫 Validator: Missing type or question:', { type: question.quiz?.type, question: question.quiz?.question });
    return false;
  }

  if (question.quiz.type === 'function-variant') {
    if (!Array.isArray(question.quiz.variants) || question.quiz.variants.length === 0) {
      console.log('🚫 Validator: function-variant missing variants:', question.quiz);
      return false;
    }
    const valid = question.quiz.variants.every((variant: any) =>
      variant && variant.id && variant.code && typeof variant.isCorrect === 'boolean' && variant.explanation
    );
    if (!valid) {
      console.log('🚫 Validator: function-variant has invalid variants:', question.quiz.variants);
    }
    return valid;
  }

  if (question.quiz.type === 'multiple-choice') {
    if (!Array.isArray(question.quiz.options) || question.quiz.options.length === 0) {
      console.log('🚫 Validator: multiple-choice missing options:', question.quiz);
      return false;
    }
    if (!question.quiz.answer || !question.quiz.explanation) {
      console.log('🚫 Validator: multiple-choice missing answer/explanation:', { answer: question.quiz.answer, explanation: question.quiz.explanation });
      return false;
    }
    return true;
  }

  if (question.quiz.type === 'order-sequence') {
    if (!Array.isArray(question.quiz.steps) || question.quiz.steps.length === 0) {
      console.log('🚫 Validator: order-sequence missing steps:', question.quiz);
      return false;
    }
    if (!Array.isArray(question.quiz.correctOrder) || question.quiz.correctOrder.length === 0) {
      console.log('🚫 Validator: order-sequence missing correctOrder:', question.quiz);
      return false;
    }
    const valid = question.quiz.steps.every((step: any) =>
      step && step.id && step.code && step.explanation
    );
    if (!valid) {
      console.log('🚫 Validator: order-sequence has invalid steps:', question.quiz.steps);
    }
    return valid;
  }

  if (question.quiz.type === 'true-false') {
    if (!Array.isArray(question.quiz.options) || question.quiz.options.length !== 2) {
      console.log('🚫 Validator: true-false wrong options count:', question.quiz);
      return false;
    }
    if (!question.quiz.answer || !question.quiz.explanation) {
      console.log('🚫 Validator: true-false missing answer/explanation:', { answer: question.quiz.answer, explanation: question.quiz.explanation });
      return false;
    }
    // Ensure options are "True" and "False"
    const options = question.quiz.options;
    const hasTrueFalse = options.includes('True') && options.includes('False');
    if (!hasTrueFalse) {
      console.log('🚫 Validator: true-false options not True/False:', options);
    }
    return hasTrueFalse;
  }

  // Support for select-all questions
  if (question.quiz.type === 'select-all') {
    const options = question.quiz.options;
    const indices = question.quiz.correctAnswers;
    if (!Array.isArray(options) || options.length === 0) {
      console.log('🚫 Validator: select-all missing options:', question.quiz);
      return false;
    }
    if (!Array.isArray(indices)) {
      console.log('🚫 Validator: select-all missing correctAnswers array:', question.quiz);
      return false;
    }
    if (!question.quiz.explanation) {
      console.log('🚫 Validator: select-all missing explanation:', question.quiz);
      return false;
    }
    // Validate that all indices are integers within bounds
    const validIndices = indices.every((i: any) => Number.isInteger(i) && i >= 0 && i < options.length);
    if (!validIndices) {
      console.log('🚫 Validator: select-all invalid indices:', { indices, optionsLength: options.length });
    }
    return validIndices;
  }

  console.log('🚫 Validator: Unknown question type:', question.quiz.type);
  return false;
}

export function createSmartCodeChunks(code: string, maxTokensPerChunk: number = 25000): string[] {
  const fileRegex = /\/\/ ([^\n]+)\n([\s\S]*?)(?=\/\/ [^\n]+\n|$)/g;
  const files: { name: string; content: string; size: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = fileRegex.exec(code)) !== null) {
    const filename = match[1];
    const content = match[2].trim();
    if (isIrrelevantFile(filename)) continue;
    const estimatedTokens = Math.ceil(content.length / 4);
    files.push({ name: filename, content, size: estimatedTokens });
  }

  if (files.length === 0) {
    const estimatedTokens = Math.ceil(code.length / 4);
    files.push({ name: 'main.js', content: code, size: estimatedTokens });
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkTokens = 0;
  for (const file of files) {
    if (currentChunkTokens + file.size > maxTokensPerChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      currentChunkTokens = 0;
    }
    currentChunk += `// ${file.name}\n${file.content}\n\n`;
    currentChunkTokens += file.size;
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

export function isIrrelevantFile(filename: string): boolean {
  const irrelevantPatterns = [
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /\.md$/,
    /\.txt$/,
    /\.log$/,
    /\.gitignore$/,
    /\.env/,
    /\.config\./,
    /tsconfig\.json$/,
    /next\.config\./,
    /\.d\.ts$/,
    /node_modules/,
    /dist\//,
    /build\//,
    /\.min\./,
    /\.bundle\./,
    /\.map$/
  ];
  return irrelevantPatterns.some(pattern => pattern.test(filename));
}

export function cleanCodeForChunking(code: string): string {
  return code
    .replace(/\/\/ deps\/.*$/gm, '')
    .replace(/\/\/ .*\.cc$/gm, '')
    .replace(/\/\/ .*\.h$/gm, '')
    .replace(/\/\/ .*\.cpp$/gm, '')
    .replace(/\/\/ .*v8dll.*$/gm, '');
}

export function removeDuplicateVariants(variants: any[]): any[] | null {
  if (!Array.isArray(variants) || variants.length < 2) return variants;
  
  // First, remove duplicates among all variants (not just against correct answer)
  const seenCodes = new Set<string>();
  const uniqueVariants: any[] = [];
  
  for (const variant of variants) {
    if (!variant) continue;
    
    const normalizedCode = normalizeCodeForComparison(variant.code || '');
    
    if (!seenCodes.has(normalizedCode)) {
      seenCodes.add(normalizedCode);
      uniqueVariants.push(variant);
    }
  }
  
  // Check if we have both correct and incorrect variants remaining
  const hasCorrect = uniqueVariants.some(v => v && v.isCorrect === true);
  const hasIncorrect = uniqueVariants.some(v => v && v.isCorrect === false);
  
  // If we don't have both correct and incorrect variants, discard the question
  if (!hasCorrect || !hasIncorrect || uniqueVariants.length < 2) {
    return null;
  }
  
  return uniqueVariants;
}

function normalizeCodeForComparison(code: string): string {
  return code
    .replace(/\s+/g, ' ')
    .replace(/[{}();,]/g, '')
    .trim()
    .toLowerCase();
}



