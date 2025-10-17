/**
 * Function Extractor
 * Uses GPT to extract complete functions from a file
 * This ensures we always have complete, working code for question generation
 */

import { getChunkLogger } from './chunk-logger';

export interface ExtractedFunction {
  name: string;
  fullCode: string;
  language: string;
  lineCount: number;
  description?: string;
}

const MIN_TIMEOUT_MS = Number(process.env.OPENAI_FUNCTION_EXTRACTOR_MIN_TIMEOUT_MS ?? 15000);
const MAX_TIMEOUT_MS = Number(process.env.OPENAI_FUNCTION_EXTRACTOR_MAX_TIMEOUT_MS ?? 45000);
const TIMEOUT_PER_KB_MS = Number(process.env.OPENAI_FUNCTION_EXTRACTOR_TIMEOUT_PER_KB_MS ?? 80);

/**
 * Extract all complete functions from a file using GPT
 */
export async function extractFunctionsFromFile(
  fileContent: string,
  fileName: string,
  apiKey: string
): Promise<ExtractedFunction[]> {
  console.log(`🔍 Extracting functions from ${fileName}...`);
  const startTime = Date.now();
  const logDuration = (status: string): void => {
    const durationMs = Date.now() - startTime;
    const seconds = (durationMs / 1000).toFixed(2);
    console.log(`⏱️ ${fileName}: ${status} after ${seconds}s`);
  };

  const totalChars = fileContent.length;
  const fileLineCount = fileContent.split('\n').length;
  const fileSizeKb = Math.max(1, Math.round(totalChars / 1024));

  // Skip extremely large files to prevent timeouts
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit (much more reasonable)
  if (totalChars > MAX_FILE_SIZE) {
    console.log(`⚠️ Skipping ${fileName} - too large (${Math.round(totalChars / 1024 / 1024)}MB > ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit, ${totalChars} chars, ${fileLineCount} lines)`);
    logDuration('skipped (too large)');
    return [];
  }

  // Skip minified files (they're hard to parse and not useful for questions)
  if (fileName.includes('.min.') || fileName.includes('.minified') || 
      (totalChars > 1000 && fileLineCount < 10)) {
    console.log(`⚠️ Skipping ${fileName} - appears to be minified code (${totalChars} chars, ${fileLineCount} lines)`);
    logDuration('skipped (minified)');
    return [];
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const clearTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  try {
    // Compute OpenAI timeout based on file size, with configurable bounds
    const estimatedTimeout = MIN_TIMEOUT_MS + fileSizeKb * TIMEOUT_PER_KB_MS;
    const timeoutMs = Math.min(MAX_TIMEOUT_MS, estimatedTimeout);
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    console.log(`⏱️ Using ${(timeoutMs/1000).toFixed(2)}s timeout for ${fileName} (${fileSizeKb}KB, ${fileLineCount} lines, ${totalChars} chars)`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract complete functions from code. Return ONLY JSON array.'
          },
          {
            role: 'user',
            content: `Extract substantial functions from: ${fileName}

${fileContent}

Return JSON:
[
  {
    "name": "functionName",
    "fullCode": "complete function code",
    "language": "JavaScript|TypeScript|Python|Java|etc",
    "lineCount": 15,
    "description": "what it does"
  }
]

Skip: stubs, simple returns, empty functions, <5 lines, <100 chars.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    clearTimer();

    if (!response.ok) {
      console.error(`❌ Function extraction failed for ${fileName}: ${response.status}`);
      logDuration(`failed (HTTP ${response.status})`);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content as string;

    // Clean the response
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '');
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '');
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/\s*```$/, '');
    }

    const jsonStart = cleanContent.indexOf('[');
    if (jsonStart > 0) {
      cleanContent = cleanContent.substring(jsonStart);
    }

    const parsed = JSON.parse(cleanContent);

    if (!Array.isArray(parsed)) {
      console.error(`❌ Invalid response format for ${fileName}`);
      logDuration('failed (invalid format)');
      return [];
    }

    // Filter out invalid extractions and stub functions
    const validFunctions = parsed.filter(func => {
      if (!func.name || !func.fullCode) return false;
      if (func.fullCode.length < 100) return false; // At least 100 chars (not just stubs)
      if (func.lineCount < 5) return false; // At least 5 lines
      if (func.fullCode.match(/^\s*\{\s*\}\s*$/)) return false; // Not empty body
      
      // Reject stub functions with mostly comments
      const codeWithoutComments = func.fullCode
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .trim();
      
      // Count actual code lines (non-empty, non-comment)
      const actualCodeLines = codeWithoutComments.split('\n').filter(line => line.trim().length > 0).length;
      if (actualCodeLines < 4) return false; // At least 4 lines of actual code
      
      // Reject functions that just return the input unchanged
      if (func.fullCode.match(/return\s+\w+\s*;?\s*\}\s*$/)) {
        const simpleReturn = true; // Just returns a variable
        if (actualCodeLines <= 3) return false; // Too simple
      }
      
      return true;
    });

    console.log(`✅ Extracted ${validFunctions.length}/${parsed.length} complete functions from ${fileName}`);

    // Log function extraction with FULL function code
    if (validFunctions.length > 0) {
      const logger = getChunkLogger();
      const functionSummary = validFunctions.map(f => ({
        name: f.name,
        lineCount: f.lineCount,
        language: f.language,
        fullCode: f.fullCode
      }));
      logger.logFunctionExtraction(fileName, functionSummary);
    }

    logDuration(`completed (${validFunctions.length} functions)`);
    return validFunctions;

  } catch (error) {
    clearTimer();
    controller.abort();
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      console.warn(`⏰ Timeout extracting functions from ${fileName} (${fileSizeKb}KB, ${fileLineCount} lines) - file may be too large or complex`);
      logDuration('timed out');
      return [];
    }
    
    console.error(`❌ Error extracting functions from ${fileName}:`, error);
    logDuration('failed (exception)');
    return [];
  }
}

/**
 * Extract functions from multiple files with batching and concatenation for efficiency
 * Returns an async generator that yields functions as they're extracted
 */
export async function* extractFunctionsFromFilesStreaming(
  files: Array<{ name: string; content: string; score: number }>,
  apiKey: string,
  maxFiles: number = 8
): AsyncGenerator<ExtractedFunction[], void, unknown> {
  console.log(`🎯 Starting streaming function extraction from up to ${maxFiles} files...`);

  // CRITICAL: Filter out extremely large files and minified files
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit (much more reasonable)
  const manageableFiles = files.filter(file => {
    // Skip large files
    if (file.content.length > MAX_FILE_SIZE) return false;
    
    // Skip minified files
    if (file.name.includes('.min.') || file.name.includes('.minified')) return false;
    
    // Skip files that look minified (long content with few lines)
    if (file.content.length > 1000 && file.content.split('\n').length < 10) return false;
    
    return true;
  });
  
  if (manageableFiles.length === 0) {
    console.log('⚠️ No manageable files found (all too large or minified)');
    return;
  }
  
  console.log(`📊 Filtered files: ${manageableFiles.length}/${files.length} are manageable size (≤${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB, not minified)`);

  // CRITICAL: Add randomization to prevent repetitive questions
  // Shuffle files before scoring to add variety
  const shuffledFiles = [...manageableFiles].sort(() => Math.random() - 0.5);
  
  // Sort by score but with some randomness (take top 2x, then shuffle)
  const topCandidates = shuffledFiles
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles * 2); // Get 2x candidates
  
  // Shuffle candidates and take maxFiles for more variety
  const selectedFiles = topCandidates
    .sort(() => Math.random() - 0.5)
    .slice(0, maxFiles);

  console.log(`📊 Selected ${selectedFiles.length} files with randomization for diversity`);

  // Group small files together to maximize API efficiency
  const MIN_CHARS_PER_CALL = 1500;
  const MAX_CHARS_PER_CALL = 12000;
  
  const batches: Array<{ files: typeof selectedFiles; totalChars: number }> = [];
  let currentBatch: typeof selectedFiles = [];
  let currentChars = 0;

  for (const file of selectedFiles) {
    const fileChars = file.content.length;
    
    // If file is huge, extract it alone
    if (fileChars > MAX_CHARS_PER_CALL) {
      if (currentBatch.length > 0) {
        batches.push({ files: currentBatch, totalChars: currentChars });
        currentBatch = [];
        currentChars = 0;
      }
      batches.push({ files: [file], totalChars: fileChars });
      continue;
    }
    
    // If adding this file would exceed max, start new batch
    if (currentChars + fileChars > MAX_CHARS_PER_CALL && currentBatch.length > 0) {
      batches.push({ files: currentBatch, totalChars: currentChars });
      currentBatch = [file];
      currentChars = fileChars;
    } else {
      currentBatch.push(file);
      currentChars += fileChars;
    }
  }
  
  // Add remaining batch
  if (currentBatch.length > 0) {
    batches.push({ files: currentBatch, totalChars: currentChars });
  }

  console.log(`📦 Created ${batches.length} extraction batches (concatenating small files for efficiency)`);

  if (batches.length === 0) {
    console.log('⚠️ No batches to extract after filtering');
    return;
  }

  const maxConcurrencyEnv = Number(process.env.OPENAI_FUNCTION_EXTRACTOR_CONCURRENCY ?? 3);
  const maxConcurrentBatches = Math.max(1, Math.min(maxConcurrencyEnv, batches.length));
  console.log(`🧵 Using parallel extraction with concurrency=${maxConcurrentBatches}`);

  type BatchResult = {
    batchIndex: number;
    functions: ExtractedFunction[];
    batchLabel: string;
  };

  const makeBatchPromise = (batchIndex: number): Promise<BatchResult> => {
    const batch = batches[batchIndex];
    console.log(`⚡ Dispatching batch ${batchIndex + 1}/${batches.length} (${batch.files.length} files, ${batch.totalChars} chars)...`);

    const concatenatedContent = batch.files
      .map(f => `// File: ${f.name}\n${f.content}\n\n`)
      .join('\n\n');

    const batchName = batch.files.length === 1
      ? batch.files[0].name
      : `[${batch.files.length} files: ${batch.files.map(f => f.name.split('/').pop()).join(', ')}]`;

    return extractFunctionsFromFile(concatenatedContent, batchName, apiKey)
      .then(functions => ({
        batchIndex,
        functions,
        batchLabel: batchName
      }))
      .catch(error => {
        console.error(`❌ Batch ${batchIndex + 1} failed during extraction:`, error);
        return {
          batchIndex,
          functions: [],
          batchLabel: batchName
        };
      });
  };

  const inFlight: Array<{ promise: Promise<BatchResult> }> = [];
  let nextBatchToStart = 0;

  const startNextBatch = () => {
    if (nextBatchToStart >= batches.length) return;
    const promise = makeBatchPromise(nextBatchToStart);
    inFlight.push({ promise });
    nextBatchToStart++;
  };

  // Prime initial concurrency window
  while (inFlight.length < maxConcurrentBatches && nextBatchToStart < batches.length) {
    startNextBatch();
  }

  // Drain batches, yielding as soon as each completes
  while (inFlight.length > 0) {
    const raceResult = await Promise.race(
      inFlight.map(item =>
        item.promise.then(result => ({ item, result }))
      )
    );

    const { item, result } = raceResult;
    const index = inFlight.indexOf(item);
    if (index !== -1) {
      inFlight.splice(index, 1);
    }

    if (result.functions.length > 0) {
      console.log(`✅ Batch ${result.batchIndex + 1} (${result.batchLabel}) extracted ${result.functions.length} functions - yielding immediately!`);
      yield result.functions;
    } else {
      console.log(`⚠️ Batch ${result.batchIndex + 1} (${result.batchLabel}) returned no functions`);
    }

    // Refill concurrency window
    if (nextBatchToStart < batches.length) {
      startNextBatch();
    }
  }

  console.log(`🎉 Streaming extraction complete!`);
}

/**
 * Extract functions from multiple high-score files (legacy non-streaming version)
 */
export async function extractFunctionsFromFiles(
  files: Array<{ name: string; content: string; score: number }>,
  apiKey: string,
  maxFiles: number = 8
): Promise<ExtractedFunction[]> {
  console.log(`🎯 Extracting functions from files (non-streaming mode)...`);
  
  const allFunctions: ExtractedFunction[] = [];
  
  for await (const batchFunctions of extractFunctionsFromFilesStreaming(files, apiKey, maxFiles)) {
    allFunctions.push(...batchFunctions);
  }
  
  console.log(`✅ Total functions extracted: ${allFunctions.length}`);
  return allFunctions;
}

/**
 * Convert extracted functions into chunks for question generation
 */
export function functionsToChunks(functions: ExtractedFunction[]): string[] {
  console.log(`📦 Converting ${functions.length} functions to chunks...`);

  const chunks = functions.map(func => {
    return `// Function: ${func.name} (${func.language})\n// ${func.description || 'No description'}\n\n${func.fullCode}`;
  });

  console.log(`✅ Created ${chunks.length} function-based chunks (all complete)`);

  return chunks;
}
