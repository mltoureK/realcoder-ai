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

/**
 * Extract language from chunk header (e.g., "// src/utils/helper.js")
 * Falls back to syntax detection if no file extension found
 */
export function detectLanguageFromChunk(chunk: string): { name: string; color: string; bgColor: string } {
  // Try to extract file extension from chunk header (format: "// filename.ext")
  const headerMatch = chunk.match(/^\/\/\s*([^\n]+)/);
  if (headerMatch) {
    const filename = headerMatch[1].trim();
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch) {
      const ext = extMatch[1].toLowerCase();
      const langInfo = getLanguageFromExtension(ext);
      if (langInfo) {
        console.log(`🔍 Language detected from chunk header: ${filename} → ${langInfo.name}`);
        return langInfo;
      }
    }
  }
  
  // Fallback to syntax detection
  return detectLanguageFromSyntax(chunk);
}

/**
 * Map file extension to language info
 */
function getLanguageFromExtension(ext: string): { name: string; color: string; bgColor: string } | null {
  const extMap: Record<string, { name: string; color: string; bgColor: string }> = {
    'js': { name: 'JavaScript', color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
    'jsx': { name: 'React', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
    'ts': { name: 'TypeScript', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    'tsx': { name: 'React TS', color: 'text-blue-500 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    'py': { name: 'Python', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    'go': { name: 'Go', color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
    'rs': { name: 'Rust', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    'java': { name: 'Java', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    'cs': { name: 'C#', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    'php': { name: 'PHP', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
    'rb': { name: 'Ruby', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    'c': { name: 'C', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
    'cpp': { name: 'C++', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
    'h': { name: 'C/C++', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
    'swift': { name: 'Swift', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    'kt': { name: 'Kotlin', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    'scala': { name: 'Scala', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    'sh': { name: 'Shell', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    'sql': { name: 'SQL', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
    'ada': { name: 'Ada', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    'adb': { name: 'Ada', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    'ads': { name: 'Ada', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    's': { name: 'Assembly', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900/30' },
    'asm': { name: 'Assembly', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900/30' },
  };
  
  return extMap[ext] || null;
}

/**
 * Detect programming language from code syntax (fallback)
 * Returns language name and color scheme
 */
function detectLanguageFromSyntax(code: string): { name: string; color: string; bgColor: string } {
  const c = code.toLowerCase();
  
  // Language detection patterns (order matters - more specific first)
  if (c.includes('func ') && c.includes(':=')) return { name: 'Go', color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' };
  if (c.includes('def ') && (c.includes('self') || c.includes('import '))) return { name: 'Python', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
  if (c.includes('fn ') && (c.includes('let mut') || c.includes('&str'))) return { name: 'Rust', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30' };
  if ((c.includes('procedure ') || c.includes('function ')) && c.includes('begin') && c.includes('end')) {
    return { name: 'Ada', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' };
  }
  if ((c.includes(' mov') || c.includes('\tmov') || c.includes(' jmp') || c.includes('.globl') || c.includes('.section'))) {
    return { name: 'Assembly', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900/30' };
  }
  if ((c.includes('public ') || c.includes('private ')) && (c.includes('class ') || c.includes('interface '))) {
    if (c.includes('system.out') || c.includes('string[]')) return { name: 'Java', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    if (c.includes('console.') || c.includes('namespace ')) return { name: 'C#', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/30' };
  }
  if (c.includes('function ') || c.includes('const ') || c.includes('let ') || c.includes('=>')) {
    if (c.includes('interface ') || c.includes(': string') || c.includes(': number')) return { name: 'TypeScript', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    return { name: 'JavaScript', color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
  }
  if (c.includes('<?php') || c.includes('function ') && c.includes('$')) return { name: 'PHP', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' };
  if (c.includes('#include') || (c.includes('int ') && c.includes('void '))) return { name: 'C/C++', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };
  if (c.includes('sub ') || c.includes('my $')) return { name: 'Perl', color: 'text-blue-800 dark:text-blue-200', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
  if (c.includes('def ') && c.includes('end')) return { name: 'Ruby', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
  if (c.includes('package ') && c.includes('func ')) return { name: 'Go', color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' };
  
  // Default fallback
  return { name: 'Code', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' };
}

// Backwards compatibility alias
export const detectLanguage = detectLanguageFromChunk;

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

export function createSmartCodeChunks(code: string, maxTokensPerChunk: number = 8000): string[] {
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

  // OPTION 2: Don't chunk at all - use full files
  // This ensures complete files are never cut off
  // Each chunk = one complete file with all its functions
  const chunks: string[] = [];
  
  console.log(`📦 Creating file-based chunks (no splitting): ${files.length} files`);
  
  for (const file of files) {
    const fileChunk = `// ${file.name}\n${file.content}`;
    chunks.push(fileChunk);
    console.log(`📄 Chunk created: ${file.name} (${file.content.length} chars, ${file.functionCount} functions)`);
  }
  
  console.log(`✅ Created ${chunks.length} complete file chunks (no cutoffs)`);
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
  return removeComments(String(code || ''))
    .replace(/\s+/g, ' ')
    .replace(/[{}();,]/g, '')
    .trim()
    .toLowerCase();
}

