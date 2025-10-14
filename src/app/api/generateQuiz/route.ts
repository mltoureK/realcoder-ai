// API Route: /api/generateQuiz
// Migrated from original vanilla.js logic
// Builds quiz based on code with question types: Multiple choice, drag-n-drop

import { NextRequest, NextResponse } from 'next/server';
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

    console.log('🤖 Using OpenAI to generate questions based on actual code');
    
    // NEW APPROACH: Extract complete functions from high-score files
    console.log('🔍 Step 1: Parsing files from code...');
    const fileRegex = /\/\/ ([^\n]+)\n([\s\S]*?)(?=\/\/ [^\n]+\n|$)/g;
    const parsedFiles: Array<{ name: string; content: string; score: number }> = [];
    
    let match: RegExpExecArray | null;
    while ((match = fileRegex.exec(code || '')) !== null) {
      const filename = match[1];
      const content = match[2].trim();
      
      // Basic scoring: prefer TypeScript/JavaScript files with more functions
      let score = 10;
      if (filename.endsWith('.ts') || filename.endsWith('.tsx')) score += 30;
      if (filename.endsWith('.js') || filename.endsWith('.jsx')) score += 20;
      const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+/g) || []).length;
      score += functionCount * 10;
      
      parsedFiles.push({ name: filename, content, score });
    }
    
    console.log(`📊 Parsed ${parsedFiles.length} files from repository`);

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
        'multiple-choice': Number(process.env.OPENAI_TIMEOUT_MCQ_MS ?? 20000),
        'true-false': Number(process.env.OPENAI_TIMEOUT_TRUE_FALSE_MS ?? 25000),
        'select-all': Number(process.env.OPENAI_TIMEOUT_SELECT_ALL_MS ?? 60000),
        'order-sequence': Number(process.env.OPENAI_TIMEOUT_ORDER_SEQUENCE_MS ?? 25000)
      },
      retries: { attempts: 3, backoffBaseMs: 500 }
    };

    // Helper to map raw -> UI
    const mapToUi = (q: unknown, index: number) => {
      console.log('🔍 mapToUi called with:', JSON.stringify(q, null, 2));
      const questionData = (q as Record<string, unknown>)?.quiz as Record<string, unknown>;
      
      // Create deterministic ID based on content hash to ensure consistency
      const contentHash = btoa(JSON.stringify(q)).slice(0, 8);
      
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
                ? removeComments(variant.code)
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
          variants: sanitizedVariants
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
          variants: []
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
          variants: []
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
          variants: []
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
          variants: []
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
          variants: questionData.variants || []
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
          try {
            // Emit meta first
            const meta = { type: 'meta', expectedTotal: desiredTotal };
            controller.enqueue(encoder.encode(JSON.stringify(meta) + '\n'));

            console.log('⚡ FAST MODE: Starting streaming function extraction...');
            
            // Create async generator for function extraction
            const functionGenerator = extractFunctionsFromFilesStreaming(parsedFiles, openaiApiKey, 8);
            
            const allChunks: string[] = [];
            let batchCount = 0;
            let questionsGenerated = 0;
            
            // Process each batch of functions as they arrive
            for await (const batchFunctions of functionGenerator) {
              batchCount++;
              const batchChunks = functionsToChunks(batchFunctions);
              allChunks.push(...batchChunks);
              
              console.log(`⚡ Batch ${batchCount}: Got ${batchFunctions.length} functions (${batchChunks.length} chunks), total chunks: ${allChunks.length}`);
              
              // Start generating questions immediately after first batch
              if (batchCount === 1 && batchChunks.length > 0) {
                console.log(`🚀 FIRST QUESTIONS INCOMING! Starting question generation with ${batchChunks.length} initial chunks...`);
              }
              
              // Generate questions from this batch's chunks
              // Use a portion of the target based on available chunks
              const targetForThisBatch = Math.min(
                Math.ceil(desiredTotal * (batchChunks.length / 8)), // Estimate based on chunks
                desiredTotal - questionsGenerated
              );
              
              if (targetForThisBatch > 0 && batchChunks.length > 0) {
                await orchestrateGeneration({
                  chunks: batchChunks, // Only use this batch's chunks for variety
                  plugins: selectedPlugins,
                  numQuestions: targetForThisBatch,
                  settings,
                  apiKey: openaiApiKey,
                  options: { difficulty: difficulty || 'medium' },
                  onQuestion: async (q) => {
                    const ui = mapToUi(q, counter);
                    // Shuffle variants if present and balance
                    if (ui.variants && ui.variants.length > 0) {
                      ui.variants = shuffleVariants(ui.variants);
                      ui.variants = balanceVariantVerbosity(ui.variants);
                    }
                    counter += 1;
                    questionsGenerated += 1;
                    console.log(`📤 Streaming question ${counter} from batch ${batchCount}`);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'question', question: ui }) + '\n'));
                  }
                });
              }
              
              // Stop if we've generated enough questions
              if (questionsGenerated >= desiredTotal) {
                console.log(`✅ Generated ${questionsGenerated} questions, stopping early`);
                break;
              }
            }
            
            // If we still need more questions, generate from all chunks
            if (questionsGenerated < desiredTotal && allChunks.length > 0) {
              console.log(`🔄 Generating remaining ${desiredTotal - questionsGenerated} questions from all ${allChunks.length} chunks`);
              await orchestrateGeneration({
                chunks: allChunks,
                plugins: selectedPlugins,
                numQuestions: desiredTotal - questionsGenerated,
                settings,
                apiKey: openaiApiKey,
                options: { difficulty: difficulty || 'medium' },
                onQuestion: async (q) => {
                  const ui = mapToUi(q, counter);
                  if (ui.variants && ui.variants.length > 0) {
                    ui.variants = shuffleVariants(ui.variants);
                    ui.variants = balanceVariantVerbosity(ui.variants);
                  }
                  counter += 1;
                  controller.enqueue(encoder.encode(JSON.stringify({ type: 'question', question: ui }) + '\n'));
                }
              });
            }
            
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', count: counter }) + '\n'));
            console.log(`🎉 Streaming complete! Generated ${counter} questions from ${batchCount} batches`);
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

    // Non-streaming path: Extract all functions first, then generate
    console.log('🔍 Step 2: Extracting complete functions from top files...');
    const extractedFunctions = await extractFunctionsFromFiles(parsedFiles, openaiApiKey, 8);
    
    console.log(`✅ Extracted ${extractedFunctions.length} complete functions`);
    
    // Convert extracted functions to chunks (one function per chunk)
    const chunks = functionsToChunks(extractedFunctions);
    
    console.log(`📦 Created ${chunks.length} function-based chunks (all complete)`);

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
      questions = shuffledGeneratedQuestions.map((q: unknown, index: number) => {
        // Add debugging and safety checks
        console.log(`🔍 Processing question ${index + 1}:`, JSON.stringify(q, null, 2));
        
        if (!q || !(q as Record<string, unknown>)?.quiz) {
          console.warn(`⚠️ Question ${index + 1} has invalid structure:`, q);
          return {
            id: (index + 1).toString(),
            type: 'unknown',
            question: 'Invalid question structure',
            options: [],
            correctAnswer: null,
            explanation: 'This question could not be processed',
            difficulty: 'medium',
            variants: []
          };
        }
        
        const questionData = (q as Record<string, unknown>)?.quiz as Record<string, unknown>;
        
        if (questionData.type === 'function-variant') {
          return {
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Missing question text',
            options: [],
            correctAnswer: null,
            explanation: '',
            difficulty: 'medium',
            variants: (questionData.variants || []).map((v: unknown) => ({
              ...v,
              code: typeof v.code === 'string' ? removeComments(v.code) : v.code
            }))
          };
        } else if (questionData.type === 'multiple-choice') {
          const opts = questionData.options || [];
          const ansNum = parseInt(questionData.answer);
          let idx = -1;
          if (!isNaN(ansNum)) {
            if (ansNum >= 1 && ansNum <= opts.length) idx = ansNum - 1; // 1-based
            else if (ansNum >= 0 && ansNum < opts.length) idx = ansNum; // 0-based
          }
          // Debug: Check what codeContext we have
          console.log('🔍 MCQ Processing - questionData.codeContext:', questionData.codeContext);
          console.log("🔍 MCQ Processing - (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext):", (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext));
          const finalCodeContext = questionData.codeContext ?? (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext) ?? '';
          console.log('🔍 MCQ Processing - final codeContext:', finalCodeContext);
          
          return {
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Missing question text',
            options: opts,
            correctAnswer: idx >= 0 ? opts[idx] : null,
            explanation: questionData.explanation || '',
            difficulty: 'medium',
            // Include codeContext for MCQ so users can see the function code
            codeContext: finalCodeContext,
            variants: []
          };
        } else if (questionData.type === 'order-sequence') {
          return {
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Arrange the steps in correct order',
            options: questionData.steps || [],
            correctAnswer: questionData.correctOrder || [],
            explanation: questionData.explanation || '',
            difficulty: 'medium',
            steps: questionData.steps || [],
            correctOrder: questionData.correctOrder || [],
            acceptableOrders: questionData.acceptableOrders || [],
            constraints: questionData.constraints || [],
            variants: []
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
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Is this statement true or false?',
            options: opts,
            correctAnswer: idx >= 0 ? opts[idx] : null,
            explanation: questionData.explanation || '',
            difficulty: 'medium',
            codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext),
            variants: []
          };
        } else if (questionData.type === 'select-all') {
          const opts = questionData.options || [];
          const correctAnswers = questionData.correctAnswers || [];
          
          return {
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Select all that apply',
            options: opts,
            correctAnswers: correctAnswers, // Array of indices
            correctAnswer: null, // Not used for select-all
            explanation: questionData.explanation || '',
            difficulty: 'medium',
            codeContext: questionData.codeContext || (typeof q === 'object' && q !== null && (q as { codeContext?: string }).codeContext),
            variants: []
          };
        } else {
          // Fallback for unknown question types
          console.warn(`⚠️ Question ${index + 1} has unknown type: ${questionData.type}`);
          return {
            id: (index + 1).toString(),
            type: questionData.type || 'unknown',
            question: questionData.question || 'Missing question text',
            options: questionData.options || [],
            correctAnswer: null,
            explanation: questionData.explanation || '',
            difficulty: 'medium',
            variants: questionData.variants || []
          };
        }
      });
      
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
