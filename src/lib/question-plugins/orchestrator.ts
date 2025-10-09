import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { shuffleVariants } from './utils';
import { tinyJudge } from '../judge';
import { qualityFilterOrchestrator } from '../quality-filters/QualityFilterOrchestrator';
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
  
  // Custom call allocation: more select-all, less multiple-choice
  const callAllocation: Record<string, number> = {
    // Reduce total budget to ~10 calls overall for local testing speed
    'select-all': 3,
    'multiple-choice': 2,
    'function-variant': 2,
    'order-sequence': 2,
    'true-false': 1
  };
  
  // Randomize chunk selection for each plugin call to ensure diversity
  for (const plugin of plugins) {
    const calls = callAllocation[plugin.type] || Math.max(1, Math.floor(budget / plugins.length));
    for (let call = 1; call <= calls; call++) {
      // Pick a random chunk instead of round-robin for better diversity
      const randomChunk = shuffledChunks[Math.floor(Math.random() * shuffledChunks.length)];
      budgetedTasks.push({ plugin, chunk: randomChunk });
      console.log(`🎯 Scheduled: ${plugin.type} call ${call}/${calls} (random chunk)`);
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
      console.log(`✅ Quality Generation Complete: ${results.length} questions generated and rated`);
      qualityFilterOrchestrator.displayQualityRatingSummary();
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
          
          // Simple quality rating: Just rate the question 1-10 without filtering
          const quiz: any = (q as any).quiz || {};
          
          // Convert letter-based correctAnswers to numbers for quality filter
          let correctAnswersForFilter = quiz.correctAnswers;
          if (Array.isArray(quiz.correctAnswers) && quiz.correctAnswers.length > 0) {
            if (typeof quiz.correctAnswers[0] === 'string') {
              // Convert letters to numbers for quality filter
              correctAnswersForFilter = quiz.correctAnswers.map((letter: string) => {
                const charCode = letter.charCodeAt(0);
                return charCode - 65; // A=0, B=1, C=2, etc.
              });
            }
          }
          
          const qualityInput = {
            type: quiz.type,
            question: quiz.question,
            options: quiz.options,
            variants: quiz.variants,
            codeContext: (q as any).codeContext,
            snippet: (q as any).snippet,
            explanation: quiz.explanation,
            correctAnswers: correctAnswersForFilter
          };
          
          try {
            const rating = await qualityFilterOrchestrator.rateQuestionQuality(qualityInput);
            console.log(`📊 Question rated ${rating.score}/10: ${quiz.question?.substring(0, 50)}...`);
            // Store the rating in the question object
            q.qualityRating = rating.score;
            apiCallsSuccessful++;
          } catch (error) {
            console.error('❌ Error in quality rating:', error);
            apiCallsSuccessful++; // Still count as successful since we're not filtering
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
  console.log(`🎯 Quality rating enabled: YES (1-10 scale)`);
  
  if (results.length < numQuestions && apiCallsMade < budgetedTasks.length) {
    console.log(`⚠️  WARNING: Stopped early with ${budgetedTasks.length - apiCallsMade} unused API calls remaining`);
  }

  // Log session summary
  chunkLogger.logSessionSummary(results.length, chunks.length);

  return results.slice(0, numQuestions);
}


