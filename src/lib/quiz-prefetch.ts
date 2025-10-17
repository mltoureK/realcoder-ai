import { extractFunctionsFromFilesStreaming, functionsToChunks, ExtractedFunction } from './function-extractor';
import { makePrefetchKey, parseCombinedCode } from './quiz-code-utils';

const PREFETCH_TTL_MS = Number(process.env.QUIZ_PREFETCH_TTL_MS ?? 15 * 60 * 1000); // 15 minutes default

export interface PrefetchEntry {
  key: string;
  createdAt: number;
  chunks: string[];
  functionsCount: number;
}

const prefetchCache = new Map<string, PrefetchEntry>();
const inFlightPrefetches = new Map<string, Promise<void>>();

export function getPrefetchedChunks(key: string): PrefetchEntry | null {
  const entry = prefetchCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.createdAt;
  if (age > PREFETCH_TTL_MS) {
    prefetchCache.delete(key);
    return null;
  }
  return entry;
}

export function hasFreshPrefetch(key: string): boolean {
  return getPrefetchedChunks(key) !== null;
}

export function clearPrefetch(key: string): void {
  prefetchCache.delete(key);
  inFlightPrefetches.delete(key);
}

export function storePrefetchedChunks(key: string, chunks: string[], functionsCount: number): void {
  if (!chunks || chunks.length === 0) return;
  prefetchCache.set(key, {
    key,
    createdAt: Date.now(),
    chunks,
    functionsCount
  });
}

interface SchedulePrefetchParams {
  repositoryInfo?: { owner?: string; repo?: string; branch?: string };
  code: string;
  questionTypes?: string[];
  difficulty?: string;
  numQuestions?: number;
  maxFiles?: number;
}

export function scheduleQuizPrefetch(params: SchedulePrefetchParams): Promise<void> {
  const { repositoryInfo, code, maxFiles = 8 } = params;
  if (!code || code.trim().length === 0) {
    console.warn('⚠️ [Prefetch] Skipping prefetch - empty code payload');
    return Promise.resolve();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.warn('⚠️ [Prefetch] Skipping prefetch - OpenAI API key missing');
    return Promise.resolve();
  }

  const cacheKey = makePrefetchKey(repositoryInfo ?? null, code);
  const cached = getPrefetchedChunks(cacheKey);
  if (cached) {
    console.log(`♻️ [Prefetch] Cache hit for ${cacheKey}, skipping new prefetch`);
    return Promise.resolve();
  }

  const existingPromise = inFlightPrefetches.get(cacheKey);
  if (existingPromise) {
    console.log(`⏳ [Prefetch] Prefetch already in progress for ${cacheKey}`);
    return existingPromise;
  }

  const promise = (async () => {
    try {
      console.log(`🚀 [Prefetch] Starting background extraction for ${cacheKey}`);
      const parsedFiles = parseCombinedCode(code);
      if (parsedFiles.length === 0) {
        console.warn(`⚠️ [Prefetch] No files parsed for ${cacheKey}, aborting prefetch`);
        return;
      }

      const extracted: ExtractedFunction[] = [];

      for await (const batch of extractFunctionsFromFilesStreaming(parsedFiles, apiKey, maxFiles)) {
        extracted.push(...batch);
      }

      if (extracted.length === 0) {
        console.warn(`⚠️ [Prefetch] No functions extracted for ${cacheKey}`);
        return;
      }

      const chunks = functionsToChunks(extracted);
      storePrefetchedChunks(cacheKey, chunks, extracted.length);

      console.log(`✅ [Prefetch] Stored ${chunks.length} chunks (${extracted.length} functions) for ${cacheKey}`);
    } catch (error) {
      console.error(`❌ [Prefetch] Failed for ${cacheKey}:`, error);
      prefetchCache.delete(cacheKey);
    } finally {
      inFlightPrefetches.delete(cacheKey);
    }
  })();

  inFlightPrefetches.set(cacheKey, promise);
  return promise;
}

export function getPrefetchKeyForRequest(
  repositoryInfo: { owner?: string; repo?: string; branch?: string } | null | undefined,
  code: string
): string {
  return makePrefetchKey(repositoryInfo ?? null, code);
}
