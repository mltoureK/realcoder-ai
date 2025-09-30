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
  // Disabled: do not alter variant lengths; return as-is
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
      return false;
    }

    // Optional: acceptableOrders (array of arrays of step ids)
    if (question.quiz.acceptableOrders !== undefined) {
      const stepsSet = new Set((question.quiz.steps || []).map((s: any) => s.id));
      const ao = question.quiz.acceptableOrders;
      const aoValid = Array.isArray(ao) && ao.every((arr: any) => Array.isArray(arr) && arr.every((id: any) => typeof id === 'string' && stepsSet.has(id)));
      if (!aoValid) {
        console.log('🚫 Validator: order-sequence invalid acceptableOrders:', question.quiz.acceptableOrders);
        return false;
      }
    }

    // Optional: constraints (array of pairs or objects referencing step ids)
    if (question.quiz.constraints !== undefined) {
      const stepsSet = new Set((question.quiz.steps || []).map((s: any) => s.id));
      const cs = question.quiz.constraints;
      const csValid = Array.isArray(cs) && cs.every((c: any) => {
        if (Array.isArray(c) && c.length === 2) {
          const [before, after] = c;
          return typeof before === 'string' && typeof after === 'string' && stepsSet.has(before) && stepsSet.has(after);
        }
        if (c && typeof c === 'object' && 'before' in c && 'after' in c) {
          return typeof c.before === 'string' && typeof c.after === 'string' && stepsSet.has(c.before) && stepsSet.has(c.after);
        }
        return false;
      });
      if (!csValid) {
        console.log('🚫 Validator: order-sequence invalid constraints:', question.quiz.constraints);
        return false;
      }
    }

    return true;
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
    const correctAnswers = question.quiz.correctAnswers;
    if (!Array.isArray(options) || options.length === 0) {
      console.log('🚫 Validator: select-all missing options:', question.quiz);
      return false;
    }
    if (!Array.isArray(correctAnswers)) {
      console.log('🚫 Validator: select-all missing correctAnswers array:', question.quiz);
      return false;
    }
    
    // Allow empty correctAnswers if options have isCorrect flags (will be processed later)
    if (correctAnswers.length === 0) {
      if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && 'isCorrect' in options[0]) {
        return true; // Valid - will be processed later
      }
      console.log('🚫 Validator: select-all empty correctAnswers and no isCorrect flags:', question.quiz);
      return false;
    }
    
    // Validate that all correctAnswers are valid letters (A, B, C, D, E, F)
    const validLetters = correctAnswers.every((letter: any) => {
      if (typeof letter !== 'string' || letter.length !== 1) return false;
      const charCode = letter.charCodeAt(0);
      return charCode >= 65 && charCode < 65 + options.length; // A=65, check if within A-F range
    });
    if (!validLetters) {
      console.log('🚫 Validator: select-all invalid letters:', { correctAnswers, optionsLength: options.length });
    }
    return validLetters;
  }

  console.log('🚫 Validator: Unknown question type:', question.quiz.type);
  return false;
}

export function createSmartCodeChunks(code: string, maxTokensPerChunk: number = 25000): string[] {
  const fileRegex = /\/\/ ([^\n]+)\n([\s\S]*?)(?=\/\/ [^\n]+\n|$)/g;
  const files: { name: string; content: string; size: number; functionCount: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = fileRegex.exec(code)) !== null) {
    const filename = match[1];
    const content = match[2].trim();
    if (isIrrelevantFile(filename)) continue;
    const estimatedTokens = Math.ceil(content.length / 4);
    const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+|public\s+\w+\s*\(|private\s+\w+\s*\(/g) || []).length;
    files.push({ name: filename, content, size: estimatedTokens, functionCount });
  }

  if (files.length === 0) {
    const estimatedTokens = Math.ceil(code.length / 4);
    const functionCount = (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+|public\s+\w+\s*\(|private\s+\w+\s*\(/g) || []).length;
    files.push({ name: 'main.js', content: code, size: estimatedTokens, functionCount });
  }

  // Sort files by function count (descending) to prioritize function-rich files
  files.sort((a, b) => b.functionCount - a.functionCount);

  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkTokens = 0;
  let currentChunkFunctions = 0;
  
  for (const file of files) {
    // If adding this file would exceed limits, start a new chunk
    if ((currentChunkTokens + file.size > maxTokensPerChunk || currentChunkFunctions > 0) && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      currentChunkTokens = 0;
      currentChunkFunctions = 0;
    }
    
    currentChunk += `// ${file.name}\n${file.content}\n\n`;
    currentChunkTokens += file.size;
    currentChunkFunctions += file.functionCount;
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



