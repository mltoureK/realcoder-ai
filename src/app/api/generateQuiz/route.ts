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
  cleanCodeForChunking,
  createSmartCodeChunks,
  shuffleVariants,
  removeComments,
  balanceVariantVerbosity,
  validateQuestionStructure
} from '@/lib/question-plugins/utils';

// Route now uses plugin-based orchestrator; helpers moved to shared utils.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, questionTypes, difficulty, numQuestions } = body;
    const streamParam = request.nextUrl?.searchParams?.get('stream');

    console.log('📡 /generateQuiz API called with:', { 
      codeLength: code?.length, 
      questionTypes, 
      difficulty, 
      numQuestions 
    });

        // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    let questions = [] as any[];
    
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
    
    // Clean + chunk code
    const cleanCode = cleanCodeForChunking(code || '');
    const chunks = createSmartCodeChunks(cleanCode || '', 2000);

    // Select plugins per requested types
    const availablePlugins: Record<string, any> = {
      'function-variant': functionVariantPlugin,
      'multiple-choice': multipleChoicePlugin,
      'order-sequence': orderSequencePlugin,
      'true-false': trueFalsePlugin,
      'select-all': selectAllPlugin
    };
    // Force function-variant only to maximize function-variant generation
    const defaultQuestionTypes = ['function-variant'];
    const requestedTypes = ['function-variant'];
    
    const selectedPlugins = requestedTypes
      .map((t: string) => availablePlugins[t])
      .filter(Boolean);
    
    console.log('🎯 Selected question types:', requestedTypes);

    const desiredTotal = typeof numQuestions === 'number' && numQuestions > 0 ? numQuestions :30;
    const settings = {
      concurrency: Number(process.env.OPENAI_CONCURRENCY ?? 4),
      maxCalls: Number(process.env.OPENAI_MAX_CALLS_PER_REQUEST ?? 15),
      timeouts: {
        'function-variant': Number(process.env.OPENAI_TIMEOUT_FUNCTION_VARIANT_MS ?? 30000),
        'multiple-choice': Number(process.env.OPENAI_TIMEOUT_MCQ_MS ?? 20000),
        'true-false': Number(process.env.OPENAI_TIMEOUT_TRUE_FALSE_MS ?? 15000),
        'select-all': Number(process.env.OPENAI_TIMEOUT_SELECT_ALL_MS ?? 60000),
        'order-sequence': Number(process.env.OPENAI_TIMEOUT_ORDER_SEQUENCE_MS ?? 25000)
      },
      retries: { attempts: 3, backoffBaseMs: 500 }
    };

    // Helper to map raw -> UI
    const mapToUi = (q: any, index: number) => {
      console.log('🔍 mapToUi called with:', JSON.stringify(q, null, 2));
      const questionData = q.quiz;
      if (questionData.type === 'function-variant') {
        return {
          id: (index + 1).toString(),
          type: questionData.type,
          question: questionData.question || 'Missing question text',
          options: [],
          correctAnswer: null,
          explanation: '',
          difficulty: 'medium',
          variants: (questionData.variants || []).map((v: any) => ({
            ...v,
            code: typeof v.code === 'string' ? removeComments(v.code) : v.code
          }))
        };
      } else if (questionData.type === 'multiple-choice') {
        const opts = questionData.options || [];
        const ansNum = parseInt(questionData.answer);
        let idx = -1;
        if (!isNaN(ansNum)) {
          if (ansNum >= 1 && ansNum <= opts.length) idx = ansNum - 1;
          else if (ansNum >= 0 && ansNum < opts.length) idx = ansNum;
        }
        return {
          id: (index + 1).toString(),
          type: questionData.type,
          question: questionData.question || 'Missing question text',
          options: opts,
          correctAnswer: idx >= 0 ? opts[idx] : null,
          explanation: questionData.explanation || '',
          difficulty: 'medium',
          codeContext: questionData.codeContext || q.codeContext,
          variants: []
        } as any;
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
          codeContext: questionData.codeContext || q.codeContext,
          variants: []
        } as any;
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
          codeContext: questionData.codeContext || q.codeContext,
          variants: []
        } as any;
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
        } as any;
      }
    };

    // Streaming path: NDJSON when stream=1
    if (streamParam === '1') {
      const encoder = new TextEncoder();
      let counter = 0;
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          try {
            // Emit meta first
            const meta = { type: 'meta', expectedTotal: desiredTotal };
            controller.enqueue(encoder.encode(JSON.stringify(meta) + '\n'));

            await orchestrateGeneration({
              chunks,
              plugins: selectedPlugins,
              numQuestions: desiredTotal,
              settings,
              apiKey: openaiApiKey,
              options: { difficulty: difficulty || 'medium' },
              onQuestion: async (q) => {
                console.log('🔍 onQuestion callback received:', JSON.stringify(q, null, 2));
                const ui = mapToUi(q as any, counter);
                console.log('🔍 mapToUi returned:', JSON.stringify(ui, null, 2));
                // Shuffle variants if present and balance
                if (ui.variants && ui.variants.length > 0) {
                  ui.variants = shuffleVariants(ui.variants);
                  ui.variants = balanceVariantVerbosity(ui.variants);
                }
                counter += 1;
                console.log('📤 Streaming question', counter, ':', ui.type, ui.question?.substring(0, 50) + '...');
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'question', question: ui }) + '\n'));
              }
            });
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', count: counter }) + '\n'));
          } catch (e) {
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

    let rawGenerated = await orchestrateGeneration({
      chunks,
      plugins: selectedPlugins,
      numQuestions: desiredTotal,
      settings,
      apiKey: openaiApiKey,
      options: { difficulty: difficulty || 'medium' }
    });

    // Fallback: disabled for non-function-variant types while focusing solely on function-variant
    if (Array.isArray(requestedTypes) && requestedTypes.includes('select-all')) {
      const hasSelectAll = rawGenerated.some((q: any) => q?.quiz?.type === 'select-all');
      if (!hasSelectAll && chunks.length > 0) {
        try {
          console.log('🛟 Fallback: attempting direct select-all generation on first chunk');
          const sa = await selectAllPlugin.generate({
            chunk: chunks[0],
            options: { difficulty: difficulty || 'medium', numQuestions: desiredTotal },
            apiKey: openaiApiKey,
            timeoutMs: Number(process.env.OPENAI_TIMEOUT_SELECT_ALL_MS ?? 45000),
            retry: { attempts: 2, backoffBaseMs: 600 }
          } as any);
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
    console.log(`📝 Selected functions:`, shuffledGeneratedQuestions.map((q: any) => q.snippet).slice(0, 5));
    
    // Convert to UI format
      questions = shuffledGeneratedQuestions.map((q: any, index: number) => {
        // Add debugging and safety checks
        console.log(`🔍 Processing question ${index + 1}:`, JSON.stringify(q, null, 2));
        
        if (!q || !q.quiz) {
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
        
        const questionData = q.quiz;
        
        if (questionData.type === 'function-variant') {
          return {
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Missing question text',
            options: [],
            correctAnswer: null,
            explanation: '',
            difficulty: 'medium',
            variants: (questionData.variants || []).map((v: any) => ({
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
          console.log('🔍 MCQ Processing - q.codeContext:', q.codeContext);
          const finalCodeContext = questionData.codeContext || q.codeContext;
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
            codeContext: questionData.codeContext || q.codeContext,
            variants: []
          } as any;
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
            codeContext: questionData.codeContext || q.codeContext,
            variants: []
          } as any;
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
      questions.forEach((question: any) => {
        if (question.variants && question.variants.length > 0) {
          question.variants = shuffleVariants(question.variants);
          question.variants = balanceVariantVerbosity(question.variants);
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
      completed: false
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

