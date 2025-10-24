// API Route: /api/generateQuiz
// Migrated from original vanilla.js logic
// Builds quiz based on code with question types: Multiple choice, drag-n-drop

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { orchestrateGeneration } from '@/lib/question-plugins/orchestrator';
import { functionVariantPlugin } from '@/lib/question-plugins/functionVariant';
import { multipleChoicePlugin } from '@/lib/question-plugins/multipleChoice';
import { orderSequencePlugin } from '@/lib/question-plugins/orderSequence';
import { trueFalsePlugin } from '@/lib/question-plugins/trueFalse';
import { selectAllPlugin } from '@/lib/question-plugins/selectAll';
import { 
  shuffleVariants,
  removeComments,
  balanceVariantVerbosity
} from '@/lib/question-plugins/utils';
import { extractFunctionsFromFiles, extractFunctionsFromFilesStreaming, functionsToChunks } from '@/lib/function-extractor';
import { parseCombinedCode } from '@/lib/quiz-code-utils';
import { getPrefetchedChunks, getPrefetchKeyForRequest, storePrefetchedChunks } from '@/lib/quiz-prefetch';

// Route now uses plugin-based orchestrator; helpers moved to shared utils.


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, questionTypes, difficulty, numQuestions, repositoryInfo } = body;
    const streamParam = request.nextUrl?.searchParams?.get('stream');

    console.log('📡 /generateQuiz API called with:', { 
      codeLength: code?.length, 
      questionTypes, 
      difficulty, 
      numQuestions,
      repositoryInfo 
    });

        // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    let questions: unknown[] = [];
    
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.log('⚠️ OpenAI API key not configured, returning error');
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
        },
        { status: 400 }
      );
    }

    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    const formatVariantCode = (code: string): string => {
      if (!code) return '';

      let formatted = code
        .replace(/\r\n/g, '\n')
        .replace(/}\s*else\s*{/g, '}\nelse {')
        .replace(/\)\s*{/g, ') {')
        .replace(/\{\s*/g, '{\n')
        .replace(/;\s*/g, ';\n')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/\n+/g, '\n');

      const rawLines = formatted
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      let indent = 0;
      const INDENT = '  ';
      const indentedLines = rawLines.map((line) => {
        if (/^[}\])]/.test(line)) {
          indent = Math.max(indent - 1, 0);
        }

        const currentLine = `${INDENT.repeat(indent)}${line}`;

        if (/(\{|\[|\()\s*$/.test(line) || line === 'else') {
          indent += 1;
        }

        return currentLine;
      });

      return indentedLines.join('\n').trim();
    };

    const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
      let timeoutHandle: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Lesson generation timed out')), ms);
      });
      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle);
      }
    };

    const generateLesson = async (concept: string, codeContext: string, questionType: string): Promise<string> => {
      if (!concept?.trim()) return '';

      const prompt = `
You are an expert programming educator. Create a brief lesson that teaches the concept being tested.

**Lesson Requirements:**
- **Concept**: ${concept}
- **Why Learn This**: Why is this important for developers?
- **Key Points**: 2-3 essential things to remember
- **Real Example**: How is this used in actual projects?

**Tone:** Encouraging and practical
**Length:** 4-5 sentences maximum
**Focus:** What developers actually need to know

**Code Context:** ${codeContext || 'Not provided'}
**Question Type:** ${questionType}

Generate a lesson that prepares the learner for this question.
      `;

      try {
        const response = await withTimeout(
          openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
          }),
          Number(process.env.LESSON_GENERATION_TIMEOUT_MS ?? 6000)
        );

        const content = response.choices?.[0]?.message?.content?.trim();
        if (content) {
          return content;
        }
        return buildFallbackLesson(concept, codeContext, questionType);
      } catch (lessonError) {
        console.error('❌ Error generating lesson:', lessonError);
        return buildFallbackLesson(concept, codeContext, questionType);
      }
    };

    console.log('🤖 Using OpenAI to generate questions based on actual code');
    
    // NEW APPROACH: Extract complete functions from high-score files
    console.log('🔍 Step 1: Parsing files from code...');
    const parsedFiles = parseCombinedCode(code || '');
    console.log(`📊 Parsed ${parsedFiles.length} files from repository`);
    const prefetchKey = getPrefetchKeyForRequest(repositoryInfo ?? null, code || '');
    const prefetchedEntry = getPrefetchedChunks(prefetchKey);
    const prefetchedChunks = prefetchedEntry?.chunks ?? [];

    // Select plugins per requested types
    const availablePlugins: Record<string, unknown> = {
      'function-variant': functionVariantPlugin,
      'multiple-choice': multipleChoicePlugin,
      'order-sequence': orderSequencePlugin,
      'true-false': trueFalsePlugin,
      'select-all': selectAllPlugin
    };
    // Enable all 5 question types (select-all first to ensure it runs before hitting target)
    const defaultQuestionTypes = ['select-all', 'function-variant', 'order-sequence', 'true-false', 'multiple-choice'];
    const requestedTypes = defaultQuestionTypes;
    
    const selectedPlugins = requestedTypes
      .map((t: string) => availablePlugins[t])
      .filter(Boolean);
    
    console.log('🎯 Selected question types:', requestedTypes);

    const desiredTotal = typeof numQuestions === 'number' && numQuestions > 0 ? numQuestions : 30;
    const settings = {
      concurrency: Number(process.env.OPENAI_CONCURRENCY ?? 4),
      // Reduce overall API calls for faster testing
      maxCalls: Number(process.env.OPENAI_MAX_CALLS_PER_REQUEST ?? 10),
      timeouts: {
        'function-variant': Number(process.env.OPENAI_TIMEOUT_FUNCTION_VARIANT_MS ?? 30000),
        'multiple-choice': Number(process.env.OPENAI_TIMEOUT_MCQ_MS ?? 10000),
        'true-false': Number(process.env.OPENAI_TIMEOUT_TRUE_FALSE_MS ?? 12500),
        'select-all': Number(process.env.OPENAI_TIMEOUT_SELECT_ALL_MS ?? 30000),
        'order-sequence': Number(process.env.OPENAI_TIMEOUT_ORDER_SEQUENCE_MS ?? 12500)
      },
      retries: { attempts: 3, backoffBaseMs: 500 }
    };

    // Helper to map raw -> UI
    const mapToUi = (q: unknown, index: number) => {
      console.log('🔍 mapToUi called with:', JSON.stringify(q, null, 2));
      const rawRecord = typeof q === 'object' && q !== null ? (q as Record<string, unknown>) : undefined;
      const questionData = rawRecord?.quiz as Record<string, unknown> | undefined;
      if (!questionData || typeof questionData !== 'object') {
        return {
          id: `q-${Date.now().toString(36)}-${index}`,
          type: 'unknown',
          question: 'Unable to parse generated question',
          options: [],
          correctAnswer: null,
          explanation: 'The AI returned an unexpected format.',
          difficulty: 'medium',
          variants: [],
          lesson: ''
        };
      }
      // Create deterministic ID based on content hash to ensure consistency
      let contentHash = '';
      try {
        const serialized = JSON.stringify(q);
        contentHash = Buffer.from(serialized, 'utf8').toString('base64').replace(/=+$/, '').slice(0, 8);
      } catch (hashError) {
        console.warn('⚠️ Failed to create content hash, using timestamp fallback:', hashError);
        contentHash = Date.now().toString(36).slice(-8);
      }
      
      if (questionData.type === 'function-variant') {
        const variantsValue = (questionData as { variants?: unknown }).variants;
        const variantArray = Array.isArray(variantsValue) ? variantsValue : [];
        const sanitizedVariants = variantArray
          .filter(
            (variant): variant is Record<string, unknown> & { code?: unknown } =>
              typeof variant === 'object' && variant !== null
          )
          .map((variant) => ({
            ...variant,
            code:
              typeof variant.code === 'string'
                ? formatVariantCode(removeComments(variant.code))
                : variant.code
          }));

        return {
          id: `q-${contentHash}-${index}`,
          type: questionData.type,
          snippet: (typeof q === 'object' && q !== null && (q as { snippet?: string }).snippet) ?? '',
          question: questionData.question || 'Missing question text',
          options: [],
          correctAnswer: null,
          explanation: '',
          difficulty: 'medium',
          qualityRating: (typeof q === 'object' && q !== null && (q as { qualityRating?: unknown }).qualityRating) ?? null,
          language: questionData.language,
          languageColor: questionData.languageColor,
          languageBgColor: questionData.languageBgColor,
          codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext) || '',
          variants: sanitizedVariants,
          lesson: ''
        };
      } else if (questionData.type === 'multiple-choice') {
        const optionsValue = (questionData as { options?: unknown }).options;
        const opts = Array.isArray(optionsValue) ? optionsValue : [];
        
        // CRITICAL FIX: Use correctAnswerText if available (set by randomization)
        // Otherwise fall back to calculating from answer index
        let correctAnswerValue =
          typeof (questionData as { correctAnswerText?: unknown }).correctAnswerText === 'string'
            ? (questionData as { correctAnswerText?: string }).correctAnswerText
            : null;
        
        if (!correctAnswerValue) {
          const answerValue = (questionData as { answer?: unknown }).answer;
          const ansNum =
            typeof answerValue === 'number'
              ? Math.trunc(answerValue)
              : typeof answerValue === 'string'
                ? parseInt(answerValue, 10)
                : Number.NaN;
          let idx = -1;
          if (!Number.isNaN(ansNum)) {
            if (ansNum >= 1 && ansNum <= opts.length) idx = ansNum - 1;
            else if (ansNum >= 0 && ansNum < opts.length) idx = ansNum;
          }
          correctAnswerValue = idx >= 0 ? (opts[idx] as unknown) : null;
        }
        
        const correctAnswerLog =
          typeof correctAnswerValue === 'string'
            ? correctAnswerValue
            : JSON.stringify(correctAnswerValue ?? null);
        console.log(`✅ MCQ Correct Answer: "${correctAnswerLog}" (from ${typeof (questionData as { correctAnswerText?: unknown }).correctAnswerText === 'string' ? 'correctAnswerText' : 'answer index'})`);
        
        return {
          id: `q-${contentHash}-${index}`,
          type: questionData.type,
          snippet: (typeof q === 'object' && q !== null && (q as { snippet?: string }).snippet) ?? '',
          question: questionData.question || 'Missing question text',
          options: opts,
          correctAnswer: correctAnswerValue,
          answer: questionData.answer || '',
          explanation: questionData.explanation || '',
          difficulty: 'medium',
          qualityRating: (typeof q === 'object' && q !== null && (q as { qualityRating?: unknown }).qualityRating) ?? null,
          language: questionData.language,
          languageColor: questionData.languageColor,
          languageBgColor: questionData.languageBgColor,
          codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext) || '',
          variants: [],
          lesson: ''
        };
      } else if (questionData.type === 'order-sequence') {
        return {
          id: `q-${contentHash}-${index}`,
          type: questionData.type,
          snippet: (typeof q === 'object' && q !== null && (q as { snippet?: string }).snippet) ?? '',
          question: questionData.question || 'Arrange the steps in correct order',
          options: questionData.steps || [],
          correctAnswer: questionData.correctOrder || [],
          explanation: questionData.explanation || '',
          difficulty: 'medium',
          qualityRating: (typeof q === 'object' && q !== null && (q as { qualityRating?: unknown }).qualityRating) ?? null,
          language: questionData.language,
          languageColor: questionData.languageColor,
          languageBgColor: questionData.languageBgColor,
          codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext) || '',
          steps: questionData.steps || [],
          correctOrder: questionData.correctOrder || [],
          acceptableOrders: questionData.acceptableOrders || [],
          constraints: questionData.constraints || [],
          variants: [],
          lesson: ''
        };
        } else if (questionData.type === 'true-false') {
        const opts = questionData.options || ['True', 'False'];
        const answer = questionData.answer;
        let idx = -1;
        
        // Handle string answers (TRUE, FALSE, True, False, etc.) - case insensitive
        if (typeof answer === 'string') {
          const normalizedAnswer = answer.toLowerCase().trim();
          if (normalizedAnswer === 'true') idx = 0;
          else if (normalizedAnswer === 'false') idx = 1;
        }
        
        return {
          id: `q-${contentHash}-${index}`,
          type: questionData.type,
          snippet: (typeof q === 'object' && q !== null && (q as { snippet?: string }).snippet) ?? '',
          question: questionData.question || 'Is this statement true or false?',
          options: opts,
          correctAnswer: idx >= 0 ? opts[idx] : null,
          answer: questionData.answer || '',
          explanation: questionData.explanation || '',
          difficulty: 'medium',
          qualityRating: (typeof q === 'object' && q !== null && (q as { qualityRating?: unknown }).qualityRating) ?? null,
          language: questionData.language,
          languageColor: questionData.languageColor,
          languageBgColor: questionData.languageBgColor,
          codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext) || '',
          variants: [],
          lesson: ''
        };
      } else if (questionData.type === 'select-all') {
        const opts = questionData.options || [];
        const correctAnswers = questionData.correctAnswers || [];
        
        return {
          id: `q-${contentHash}-${index}`,
          type: questionData.type,
          snippet: (typeof q === 'object' && q !== null && (q as { snippet?: string }).snippet) ?? '',
          question: questionData.question || 'Select all that apply',
          options: opts,
          correctAnswers: correctAnswers, // Array of indices
          correctAnswer: null, // Not used for select-all
          explanation: questionData.explanation || '',
          difficulty: 'medium',
          qualityRating: (typeof q === 'object' && q !== null && (q as { qualityRating?: unknown }).qualityRating) ?? null,
          language: questionData.language,
          languageColor: questionData.languageColor,
          languageBgColor: questionData.languageBgColor,
          codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext) || '',
          variants: [],
          lesson: ''
        };
      } else {
        return {
          id: (index + 1).toString(),
          type: questionData.type || 'unknown',
          question: questionData.question || 'Missing question text',
          options: questionData.options || [],
          correctAnswer: null,
          explanation: questionData.explanation || '',
          difficulty: 'medium',
          variants: questionData.variants || [],
          lesson: ''
        };
      }
    };

    // Streaming path: NDJSON when stream=1
    // NEW: Start streaming questions as soon as first batch of functions is extracted
    if (streamParam === '1') {
      const encoder = new TextEncoder();
      let counter = 0;
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const processChunkBatch = async (
            batchChunks: string[],
            sourceLabel: string,
            targetOverride?: number
          ) => {
            if (batchChunks.length === 0) return;
            const remaining = desiredTotal - questionsGenerated;
            if (remaining <= 0) return;

            const estimate = Math.max(1, Math.ceil(desiredTotal * (batchChunks.length / 8)));
            const target = Math.min(remaining, targetOverride ?? estimate);

            if (target <= 0) return;

            console.log(`🎯 Streaming ${target} questions from ${sourceLabel} (${batchChunks.length} chunks)`);            

            await orchestrateGeneration({
              chunks: batchChunks,
              plugins: selectedPlugins,
              numQuestions: target,
              settings,
              apiKey: openaiApiKey,
              options: { difficulty: difficulty || 'medium' },
              onQuestion: async (q) => {
                let ui;
                try {
                  ui = mapToUi(q, counter);
                } catch (mapError) {
                  console.error('❌ mapToUi failed during streaming:', mapError);
                  return;
                }
                try {
                  ui.lesson = await generateLesson(ui.question, ui.codeContext ?? '', ui.type);
                } catch (lessonError) {
                  console.error('❌ Failed to attach lesson (streaming):', lessonError);
                }

                if (ui.variants && ui.variants.length > 0) {
                  ui.variants = shuffleVariants(ui.variants);
                  ui.variants = balanceVariantVerbosity(ui.variants);
                }
                counter += 1;
                questionsGenerated += 1;
                console.log(`📤 Streaming question ${counter} from ${sourceLabel}`);
                try {
                  const jsonString = JSON.stringify({ type: 'question', question: ui });
                  controller.enqueue(encoder.encode(jsonString + '\n'));
                } catch (error) {
                  console.error('❌ Error in onQuestion callback:', error);
                }
              }
            });
          };

          let questionsGenerated = 0;
          let batchCount = 0;
          const allChunks: string[] = [];
          let totalExtractedFunctions = 0;

          try {
            // Emit meta first
            const meta = { type: 'meta', expectedTotal: desiredTotal };
            controller.enqueue(encoder.encode(JSON.stringify(meta) + '\n'));

            if (prefetchedChunks.length > 0) {
              batchCount += 1;
              allChunks.push(...prefetchedChunks);
              totalExtractedFunctions = prefetchedEntry?.functionsCount ?? prefetchedChunks.length;
              console.log(`⚡ FAST MODE: Using ${prefetchedChunks.length} prefetched chunks for streaming`);
              await processChunkBatch(prefetchedChunks, 'prefetch-cache', desiredTotal);
            } else {
              console.log('⚡ FAST MODE: Starting streaming function extraction...');
              const functionGenerator = extractFunctionsFromFilesStreaming(parsedFiles, openaiApiKey, 8);

              for await (const batchFunctions of functionGenerator) {
                batchCount += 1;
                const batchChunks = functionsToChunks(batchFunctions);
                allChunks.push(...batchChunks);
                totalExtractedFunctions += batchFunctions.length;

                console.log(`⚡ Batch ${batchCount}: Got ${batchFunctions.length} functions (${batchChunks.length} chunks), total chunks: ${allChunks.length}`);

                if (batchCount === 1 && batchChunks.length > 0) {
                  console.log(`🚀 FIRST QUESTIONS INCOMING! Starting question generation with ${batchChunks.length} initial chunks...`);
                }

                await processChunkBatch(batchChunks, `batch-${batchCount}`);

                if (questionsGenerated >= desiredTotal) {
                  console.log(`✅ Generated ${questionsGenerated} questions, stopping early`);
                  break;
                }
              }
            }

            if (allChunks.length === 0 && questionsGenerated === 0) {
              console.log('🔄 No functions extracted, falling back to raw code chunks...');

              const rawChunks = parsedFiles
                .slice(0, 5)
                .map(file => {
                  const content = file.content.length > 2000
                    ? file.content.substring(0, 2000) + '\n// ... (truncated)'
                    : file.content;
                  return `// File: ${file.name}\n${content}`;
                });

              if (rawChunks.length > 0) {
                await processChunkBatch(rawChunks, 'raw-code-fallback', desiredTotal);
              }
            }

            if (questionsGenerated < desiredTotal && allChunks.length > 0) {
              const remaining = desiredTotal - questionsGenerated;
              console.log(`🔄 Generating remaining ${remaining} questions from all ${allChunks.length} chunks`);
              await processChunkBatch(allChunks, 'all-chunks', remaining);
            }

            if (prefetchKey && (totalExtractedFunctions > 0 || prefetchedChunks.length > 0)) {
              const functionsCount = totalExtractedFunctions || prefetchedEntry?.functionsCount || prefetchedChunks.length;
              storePrefetchedChunks(prefetchKey, allChunks, functionsCount);
            }

            try {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', count: counter }) + '\n'));
              console.log(`🎉 Streaming complete! Generated ${counter} questions from ${batchCount} batches`);
            } catch (error) {
              console.error('❌ Error encoding final message:', error);
            }
          } catch (e) {
            console.error('❌ Streaming error:', e);
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: 'stream-failed' }) + '\n'));
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Non-streaming path: Use prefetched chunks when available, otherwise extract now
    console.log('🔍 Step 2: Preparing function chunks for non-streaming mode...');
    let chunks: string[] = [];
    let extractedFunctionsCount = 0;
    const usingPrefetch = prefetchedChunks.length > 0;

    if (usingPrefetch) {
      chunks = prefetchedChunks.slice();
      extractedFunctionsCount = prefetchedEntry?.functionsCount ?? prefetchedChunks.length;
      console.log(`♻️ Using ${chunks.length} prefetched chunks (functions: ${extractedFunctionsCount})`);
      if (prefetchKey) {
        storePrefetchedChunks(prefetchKey, chunks, extractedFunctionsCount);
      }
    } else {
      const extractedFunctions = await extractFunctionsFromFiles(parsedFiles, openaiApiKey, 8);
      extractedFunctionsCount = extractedFunctions.length;
      console.log(`✅ Extracted ${extractedFunctionsCount} complete functions`);
      chunks = functionsToChunks(extractedFunctions);
      console.log(`📦 Created ${chunks.length} function-based chunks (fresh extraction)`);
      if (prefetchKey && extractedFunctionsCount > 0) {
        storePrefetchedChunks(prefetchKey, chunks, extractedFunctionsCount);
      }
    }

    let rawGenerated = await orchestrateGeneration({
      chunks,
      plugins: selectedPlugins,
      numQuestions: desiredTotal,
      settings,
      apiKey: openaiApiKey,
      options: { difficulty: difficulty || 'medium' }
    });

    // Fallback: attempt direct select-all generation if none were generated
    if (Array.isArray(requestedTypes) && requestedTypes.includes('select-all')) {
      const hasSelectAll = rawGenerated.some((q: unknown) => (q as Record<string, unknown>)?.quiz?.type === 'select-all');
      if (!hasSelectAll && chunks && chunks.length > 0) {
        try {
          console.log('🛟 Fallback: attempting direct select-all generation on first chunk');
          const sa = await selectAllPlugin.generate({
            chunk: chunks[0],
            options: { difficulty: difficulty || 'medium', numQuestions: desiredTotal },
            apiKey: openaiApiKey,
            timeoutMs: Number(process.env.OPENAI_TIMEOUT_SELECT_ALL_MS ?? 45000),
            retry: { attempts: 2, backoffBaseMs: 600 }
          });
          if (Array.isArray(sa) && sa.length > 0) {
            rawGenerated = [...rawGenerated, sa[0]];
            console.log('✅ Fallback select-all produced 1 question');
          } else {
            console.log('⚠️ Fallback select-all returned no questions');
          }
        } catch (e) {
          console.warn('❌ Fallback select-all generation failed:', e);
        }
      }
    }


    const shuffledGeneratedQuestions = shuffleVariants(rawGenerated);
    console.log(`🎲 Randomized ${shuffledGeneratedQuestions.length} questions for variety`);
    console.log(`📝 Selected functions:`, shuffledGeneratedQuestions.map((q: unknown) => (q as Record<string, unknown>).snippet).slice(0, 5));
    
    // Convert to UI format
    questions = shuffledGeneratedQuestions
      .map((q: unknown, index: number) => {
        try {
          return mapToUi(q, index);
        } catch (mapError) {
          console.error('❌ mapToUi failed (non-streaming):', mapError);
      return {
        id: `fallback-${index}`,
        type: 'unknown',
        question: 'Unable to render this question',
        options: [],
        correctAnswer: null,
        explanation: 'An unexpected error occurred while preparing the quiz question.',
        difficulty: 'medium',
        variants: [],
        lesson: ''
      };
    }
  })
  .filter(Boolean);

    await Promise.allSettled(
      (questions as Array<Record<string, unknown>>).map(async (question) => {
        if (!question) return;
        const concept = typeof question.question === 'string' ? question.question : '';
        const codeContext = typeof question.codeContext === 'string' ? question.codeContext : '';
        const questionType = typeof question.type === 'string' ? question.type : 'unknown';
        const lesson = await generateLesson(concept, codeContext, questionType);
        question.lesson = lesson;
      })
    );
      
      // Shuffle variants for all questions to randomize correct answer position and balance verbosity
      questions.forEach((question: unknown) => {
        if ((question as Record<string, unknown>)?.variants && (question as Record<string, unknown>).variants.length > 0) {
          (question as Record<string, unknown>).variants = shuffleVariants((question as Record<string, unknown>).variants);
          (question as Record<string, unknown>).variants = balanceVariantVerbosity((question as Record<string, unknown>).variants);
        }
      });
    

    const quizSession = {
      id: Date.now().toString(),
      title: 'Generated Quiz',
      questions,
      currentQuestionIndex: 0,
      score: 0,
      lives: 3,
      lastLifeRefill: new Date(),
      completed: false,
      repositoryInfo: repositoryInfo || null
    };

    return NextResponse.json({
      success: true,
      quiz: quizSession,
      message: 'Quiz generated successfully'
    });

  } catch (error) {
    console.error('❌ Error in /generateQuiz:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
