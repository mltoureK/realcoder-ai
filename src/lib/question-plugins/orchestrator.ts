import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { shuffleVariants } from './utils';
import { getChunkLogger } from '../chunk-logger';

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

  // Initialize chunk logger
  const chunkLogger = getChunkLogger();

  // Create scheduled tasks with custom allocation
  const budgetedTasks: Array<{ plugin: QuestionPlugin; chunk: string }> = [];
  const budget = settings.maxCalls;
  const shuffledChunks = shuffleVariants(chunks);
  
  console.log(`🎯 Quality Generation Target: ${numQuestions} questions (rated 1-10)`);
  console.log(`📊 Generation Budget: ${budget} API calls`);
  
  // Balanced allocation for all question types
  const callAllocation: Record<string, number> = {
    'select-all': Math.max(1, Math.floor(budget * 0.25)),
    'multiple-choice': Math.max(1, Math.floor(budget * 0.25)),
    'function-variant': Math.max(1, Math.floor(budget * 0.2)),
    'order-sequence': Math.max(1, Math.floor(budget * 0.15)),
    'true-false': Math.max(1, Math.floor(budget * 0.15))
  };
  
  // Assign different functions to each plugin call to ensure diversity
  let chunkIndex = 0;
  for (const plugin of plugins) {
    const calls = callAllocation[plugin.type] || Math.max(1, Math.floor(budget / plugins.length));
    for (let call = 1; call <= calls; call++) {
      // Pick next unique chunk (function) to ensure no duplicates
      const chunk = shuffledChunks[chunkIndex % shuffledChunks.length];
      budgetedTasks.push({ plugin, chunk });
      console.log(`🎯 Scheduled: ${plugin.type} call ${call}/${calls} (function ${chunkIndex + 1})`);
      chunkIndex++;
    }
  }
  
  // Shuffle the task order itself so plugin types don't always run in same sequence
  const shuffledTasks = shuffleVariants(budgetedTasks);
  budgetedTasks.length = 0;
  budgetedTasks.push(...shuffledTasks);
  
  console.log(`📊 Scheduled ${budgetedTasks.length} total calls (custom allocation, randomized order)`);

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
  // Require at least one function-variant if that plugin was requested
  if (plugins.some(p => p.type === 'function-variant')) {
    requiredByType['function-variant'] = 1;
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
      console.log(`✅ Question Generation Complete: ${results.length} questions generated (community will decide quality)`);
      return true;
    }
    
    // Continue making calls until we reach target or exhaust budget
    console.log(`📊 Generation Status: ${results.length}/${numQuestions} questions (need ${numQuestions - results.length} more)`);
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
        
        // Log chunk usage for this question generation
        const chunkIndex = chunks.findIndex(chunk => chunk === task.chunk);
        chunkLogger.logQuestionGeneration(
          task.plugin.type,
          chunkIndex,
          task.chunk,
          generated.length
        );
        
        for (const q of generated) {
          if (stopRequested) break;
          
          // No AI quality filtering - let the community decide!
          console.log(`✅ Question generated: ${(q as any)?.quiz?.question?.substring(0, 50)}...`);
          
          results.push(q);
          apiCallsSuccessful++;
          
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
  console.log(`🎯 Quality rating enabled: YES (1-10 scale)`);
  
  if (results.length < numQuestions && apiCallsMade < budgetedTasks.length) {
    console.log(`⚠️  WARNING: Stopped early with ${budgetedTasks.length - apiCallsMade} unused API calls remaining`);
  }

  // Log session summary
  chunkLogger.logSessionSummary(results.length, chunks.length);

  return results.slice(0, numQuestions);
}


