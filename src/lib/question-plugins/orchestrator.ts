import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { shuffleVariants } from './utils';
import { tinyJudge } from '../judge';

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
  onQuestion?: (q: RawQuestion) => void;
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

  // Group by plugin and round-robin schedule to avoid starvation
  const shuffledTasks = shuffleVariants(tasks);
  const tasksByType: Record<string, Array<{ plugin: QuestionPlugin; chunk: string }>> = {};
  for (const t of shuffledTasks) {
    const key = t.plugin.type;
    if (!tasksByType[key]) tasksByType[key] = [];
    tasksByType[key].push(t);
  }
  const perTypePointers: Record<string, number> = {};
  Object.keys(tasksByType).forEach(k => (perTypePointers[k] = 0));

  const budgetedTasks: Array<{ plugin: QuestionPlugin; chunk: string }> = [];
  const budget = Math.min(settings.maxCalls, shuffledTasks.length);
  // First pass: reserve up to 2 tasks per plugin
  const typesInOrder = plugins.map(p => p.type);
  for (let r = 0; r < 2 && budgetedTasks.length < budget; r++) {
    for (const type of typesInOrder) {
      if (budgetedTasks.length >= budget) break;
      const list = tasksByType[type];
      const ptr = perTypePointers[type];
      if (list && ptr < list.length) {
        budgetedTasks.push(list[ptr]);
        perTypePointers[type] = ptr + 1;
      }
    }
  }
  // Second pass: fill remaining slots round-robin
  while (budgetedTasks.length < budget) {
    let progressed = false;
    for (const type of typesInOrder) {
      if (budgetedTasks.length >= budget) break;
      const list = tasksByType[type];
      const ptr = perTypePointers[type];
      if (list && ptr < list.length) {
        budgetedTasks.push(list[ptr]);
        perTypePointers[type] = ptr + 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const results: RawQuestion[] = [];
  let stopRequested = false;
  // Track counts per question type to enforce minimum quotas (e.g., ensure at least one fill-blank)
  const countsByType: Record<string, number> = {};
  const requiredByType: Record<string, number> = {};
  // Require at least one fill-blank if that plugin was requested
  if (plugins.some(p => p.type === 'fill-blank')) {
    requiredByType['fill-blank'] = 1;
  }

  const isComplete = (): boolean => {
    if (results.length < numQuestions) return false;
    for (const [type, min] of Object.entries(requiredByType)) {
      if ((countsByType[type] || 0) < min) return false;
    }
    return true;
  };

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
          // Optional tiny judge sampling
          let accept = true;
          if (process.env.ENABLE_TINY_JUDGE) {
            const rate = Number(process.env.JUDGE_SAMPLE_RATE ?? 0.3);
            const roll = Math.random();
            if (roll < rate) {
              const quiz: any = (q as any).quiz || {};
              const judgeInput = {
                type: quiz.type,
                question: quiz.question,
                options: quiz.options,
                variants: quiz.variants,
                codeContext: (q as any).codeContext
              } as any;
              try {
                const verdict = await tinyJudge(judgeInput, apiKey);
                accept = verdict.ok;
              } catch {}
            }
          }
          if (!accept) continue;
          results.push(q);
          try { args.onQuestion && args.onQuestion(q); } catch {}
          const qType = (q as any)?.quiz?.type as string | undefined;
          if (qType) countsByType[qType] = (countsByType[qType] || 0) + 1;
          if (isComplete()) { stopRequested = true; break; }
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


