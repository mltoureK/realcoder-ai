import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { shuffleVariants } from './utils';

interface OrchestrateArgs {
  chunks: string[];
  plugins: QuestionPlugin[];
  numQuestions: number;
  settings: {
    concurrency: number;
    maxCalls: number;
    timeouts: Record<string, number>;
    retries: { attempts: number; backoffBaseMs: number };
  };
  apiKey: string;
  options: { difficulty: 'easy' | 'medium' | 'hard' };
}

export async function orchestrateGeneration(args: OrchestrateArgs): Promise<RawQuestion[]> {
  const { chunks, plugins, numQuestions, settings, apiKey, options } = args;
  if (plugins.length === 0 || chunks.length === 0) return [];

  const tasks: Array<{ plugin: QuestionPlugin; chunk: string }> = [];
  const shuffledChunks = shuffleVariants(chunks);
  for (const plugin of plugins) {
    for (const chunk of shuffledChunks) {
      tasks.push({ plugin, chunk });
    }
  }

  // Shuffle tasks so we interleave plugin types across chunks
  const shuffledTasks = shuffleVariants(tasks);
  const budgetedTasks = shuffledTasks.slice(0, Math.min(settings.maxCalls, shuffledTasks.length));

  const results: RawQuestion[] = [];
  let stopRequested = false;

  let nextIndex = 0;
  const active: Array<Promise<void>> = [];
  const controllers: AbortController[] = [];

  const startOne = (taskIndex: number): Promise<void> => {
    const task = budgetedTasks[taskIndex];
    const controller = new AbortController();
    controllers.push(controller);
    const timeoutMs = settings.timeouts[task.plugin.type] ?? 20000;

    const p = (async () => {
      if (stopRequested) return;
      try {
        const generated = await task.plugin.generate({
          chunk: task.chunk,
          options: { difficulty: options.difficulty, numQuestions },
          apiKey,
          timeoutMs,
          retry: settings.retries,
          abortSignal: controller.signal
        } as GenerateParams);
        if (stopRequested) return;
        for (const q of generated) {
          if (stopRequested) break;
          results.push(q);
          if (results.length >= numQuestions) {
            stopRequested = true;
            break;
          }
        }
      } catch (e) {
        // ignore per-task errors
      }
    })().finally(() => {
      const idx = active.indexOf(p as unknown as Promise<void>);
      if (idx >= 0) active.splice(idx, 1);
    });

    return p as unknown as Promise<void>;
  };

  const abortAll = () => {
    for (const c of controllers) {
      try { c.abort(); } catch {}
    }
  };

  while (nextIndex < budgetedTasks.length && !stopRequested) {
    while (active.length < settings.concurrency && nextIndex < budgetedTasks.length && !stopRequested) {
      active.push(startOne(nextIndex++));
    }
    if (active.length === 0) break;
    await Promise.race(active);
  }

  if (stopRequested) abortAll();
  await Promise.allSettled(active);

  return results.slice(0, numQuestions);
}


