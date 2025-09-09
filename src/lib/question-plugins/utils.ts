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

  const avgIncorrectLength = incorrectVariants.reduce((sum: number, v: any) => sum + (v.code?.length || 0), 0) / incorrectVariants.length;
  const correctLength = correctVariant.code?.length || 0;

  if (correctLength > avgIncorrectLength * 1.5) {
    const longestIncorrect = incorrectVariants.reduce((longest: any, current: any) =>
      (current.code?.length || 0) > (longest.code?.length || 0) ? current : longest
    );
    if (longestIncorrect && typeof longestIncorrect.code === 'string' && longestIncorrect.code.includes('return')) {
      longestIncorrect.code = longestIncorrect.code.replace(
        /return ([^;]+);/,
        'const result = $1\n  return result;'
      );
    }
  }

  if (correctLength < avgIncorrectLength * 0.7) {
    const shortestIncorrect = incorrectVariants.reduce((shortest: any, current: any) =>
      (current.code?.length || 0) < (shortest.code?.length || 0) ? current : shortest
    );
    if (shortestIncorrect && typeof shortestIncorrect.code === 'string' && shortestIncorrect.code.includes('if (')) {
      shortestIncorrect.code = shortestIncorrect.code.replace(
        /if \(([^)]+)\)\s*{([^}]+)}/,
        'return $1 ? $2 : false;'
      );
    }
  }

  return variants;
}

// Ensure displayed code lengths are similar to avoid giveaway by verbosity
export function balanceDisplayedLengths(variants: any[]): any[] {
  if (!Array.isArray(variants) || variants.length < 2) return variants;
  const correct = variants.find((v: any) => v && v.isCorrect);
  if (!correct || typeof correct.code !== 'string') return variants;
  const target = Math.max(0, Math.floor(correct.code.length * 0.9)); // aim within ~10%

  variants.forEach((v: any) => {
    if (!v || v.isCorrect || typeof v.code !== 'string') return;
    if (v.code.length < target) {
      const deficit = target - v.code.length;
      const padLines = Math.min(6, Math.ceil(deficit / 80));
      v.code = v.code + '\n'.repeat(padLines); // harmless whitespace
    }
  });
  return variants;
}

export function validateQuestionStructure(question: any): boolean {
  if (!question || typeof question !== 'object') return false;
  if (!question.quiz || typeof question.quiz !== 'object') return false;
  if (!question.quiz.type || !question.quiz.question) return false;

  if (question.quiz.type === 'function-variant') {
    if (!Array.isArray(question.quiz.variants) || question.quiz.variants.length === 0) return false;
    return question.quiz.variants.every((variant: any) =>
      variant && variant.id && variant.code && typeof variant.isCorrect === 'boolean' && variant.explanation
    );
  }

  if (question.quiz.type === 'multiple-choice') {
    if (!Array.isArray(question.quiz.options) || question.quiz.options.length === 0) return false;
    const ans = question.quiz.answer;
    if (ans === undefined || ans === null) return false;
    let idx = -1;
    if (typeof ans === 'number') {
      idx = ans >= 1 && ans <= question.quiz.options.length ? ans - 1 : ans;
    } else {
      const parsed = parseInt(ans, 10);
      if (!Number.isNaN(parsed)) {
        idx = parsed >= 1 && parsed <= question.quiz.options.length ? parsed - 1 : parsed;
      } else {
        idx = question.quiz.options.indexOf(ans);
      }
    }
    if (idx < 0 || idx >= question.quiz.options.length) return false;
    if (!question.quiz.explanation) return false;
    return true;
  }

  if (question.quiz.type === 'fill-blank') {
    if (!Array.isArray(question.quiz.options) || question.quiz.options.length === 0) return false;
    const ans = question.quiz.answer;
    if (ans === undefined || ans === null) return false;
    let idx = -1;
    if (typeof ans === 'number') {
      idx = ans >= 1 && ans <= question.quiz.options.length ? ans - 1 : ans;
    } else {
      const parsed = parseInt(ans, 10);
      if (!Number.isNaN(parsed)) {
        idx = parsed >= 1 && parsed <= question.quiz.options.length ? parsed - 1 : parsed;
      } else {
        idx = question.quiz.options.indexOf(ans);
      }
    }
    if (idx < 0 || idx >= question.quiz.options.length) return false;
    if (!question.quiz.explanation) return false;
    return true;
  }

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


