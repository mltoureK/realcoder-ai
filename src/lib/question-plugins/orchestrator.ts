import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { shuffleVariants } from './utils';
import { tinyJudge } from '../judge';
import { shouldKeepQuestion, displayQualityRatingSummary } from '../quality-filter';

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
  onQuestion?: (q: RawQuestion) => Promise<void> | void;
}

export async function orchestrateGeneration(args: OrchestrateArgs): Promise<RawQuestion[]> {
  const { chunks, plugins, numQuestions, settings, apiKey, options, onQuestion } = args;
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
  
  console.log(`🎯 Quality Generation Target: ${numQuestions} excellent questions (8/10+)`);
  console.log(`📊 Generation Budget: ${budget} API calls across ${chunks.length} chunks and ${plugins.length} plugins`);
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
  let apiCallsMade = 0;
  let apiCallsSuccessful = 0;
  let apiCallsRejected = 0;
  // Track counts per question type to enforce minimum quotas (e.g., ensure at least one fill-blank)
  const countsByType: Record<string, number> = {};
  const requiredByType: Record<string, number> = {};
  // Require at least one fill-blank if that plugin was requested
  if (plugins.some(p => p.type === 'fill-blank')) {
    requiredByType['fill-blank'] = 1;
  }
  // Require at least one true-false if that plugin was requested (cost-effective)
  if (plugins.some(p => p.type === 'true-false')) {
    requiredByType['true-false'] = 1;
  }

  const isComplete = (): boolean => {
    // Only stop early if we have enough questions AND have met type requirements
    if (results.length >= numQuestions) {
      for (const [type, min] of Object.entries(requiredByType)) {
        if ((countsByType[type] || 0) < min) {
          console.log(`📊 Type requirement not met: ${type} has ${countsByType[type] || 0}/${min}`);
          return false;
        }
      }
      console.log(`✅ Quality Generation Complete: ${results.length} excellent questions (7/10+) generated`);
      displayQualityRatingSummary();
      return true;
    }
    
    // Continue making calls until we reach target or exhaust budget
    console.log(`📊 Quality Generation Status: ${results.length}/${numQuestions} questions (need ${numQuestions - results.length} more)`);
    return false;
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
        apiCallsMade++;
        console.log(`📞 API Call ${apiCallsMade}/${budgetedTasks.length} (${task.plugin.type})`);
        
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
          
          // Quality filter: Rate ALL questions and only keep 8/10+ ones (if enabled)
          let accept = true;
          if (process.env.ENABLE_QUALITY_FILTER !== 'false') {
            const quiz: any = (q as any).quiz || {};
            const qualityInput = {
              type: quiz.type,
              question: quiz.question,
              options: quiz.options,
              variants: quiz.variants,
              codeContext: (q as any).codeContext,
              snippet: (q as any).snippet,
              explanation: quiz.explanation
            };
            
            try {
              accept = await shouldKeepQuestion(qualityInput);
              if (!accept) {
                apiCallsRejected++;
                console.log(`🚫 Question rejected by quality filter: ${quiz.question?.substring(0, 50)}...`);
                continue;
              }
              apiCallsSuccessful++;
              console.log(`✅ Question passed quality filter: ${quiz.question?.substring(0, 50)}...`);
            } catch (error) {
              apiCallsRejected++;
              console.error('❌ Error in quality filter:', error);
              // If quality filter fails, reject the question for safety
              continue;
            }
          }
          results.push(q);
          try {
            if (onQuestion) {
              console.log('🎯 Orchestrator calling onQuestion for:', (q as any)?.quiz?.type);
              await onQuestion(q);
            }
          } catch (e) {
            console.error('❌ Error in onQuestion callback:', e);
          }
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

  // Log API call summary
  console.log('\n📊 API CALL SUMMARY:');
  console.log(`📞 Total API calls made: ${apiCallsMade}/${budgetedTasks.length} (${Math.round(apiCallsMade/budgetedTasks.length*100)}% of budget)`);
  console.log(`✅ Successful questions: ${apiCallsSuccessful}`);
  console.log(`🚫 Rejected questions: ${apiCallsRejected}`);
  console.log(`📋 Final questions generated: ${results.length}/${numQuestions} (${Math.round(results.length/numQuestions*100)}% of target)`);
  console.log(`🎯 Quality filter enabled: ${process.env.ENABLE_QUALITY_FILTER !== 'false' ? 'YES' : 'NO'}`);
  
  if (results.length < numQuestions && apiCallsMade < budgetedTasks.length) {
    console.log(`⚠️  WARNING: Stopped early with ${budgetedTasks.length - apiCallsMade} unused API calls remaining`);
  }

  return results.slice(0, numQuestions);
}


