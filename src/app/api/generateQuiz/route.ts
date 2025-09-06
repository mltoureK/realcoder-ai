// API Route: /api/generateQuiz
// Migrated from original vanilla.js logic
// Builds quiz based on code with question types: Multiple choice, drag-n-drop

import { NextRequest, NextResponse } from 'next/server';
import { orchestrateGeneration } from '@/lib/question-plugins/orchestrator';
import { functionVariantPlugin } from '@/lib/question-plugins/functionVariant';
import { multipleChoicePlugin } from '@/lib/question-plugins/multipleChoice';
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
    const chunks = createSmartCodeChunks(cleanCode || '', 4000);

    // Select plugins per requested types
    const availablePlugins: Record<string, any> = {
      'function-variant': functionVariantPlugin,
      'multiple-choice': multipleChoicePlugin
    };
    const selectedPlugins = (Array.isArray(questionTypes) ? questionTypes : [])
      .map((t: string) => availablePlugins[t])
      .filter(Boolean);

    const desiredTotal = typeof numQuestions === 'number' && numQuestions > 0 ? numQuestions : 5;
    const settings = {
      concurrency: Number(process.env.OPENAI_CONCURRENCY ?? 4),
      maxCalls: Number(process.env.OPENAI_MAX_CALLS_PER_REQUEST ?? 12),
      timeouts: {
        'function-variant': Number(process.env.OPENAI_TIMEOUT_FUNCTION_VARIANT_MS ?? 30000),
        'multiple-choice': Number(process.env.OPENAI_TIMEOUT_MCQ_MS ?? 20000)
      },
      retries: { attempts: 3, backoffBaseMs: 500 }
    };

    const rawGenerated = await orchestrateGeneration({
      chunks,
      plugins: selectedPlugins,
      numQuestions: desiredTotal,
      settings,
      apiKey: openaiApiKey,
      options: { difficulty: difficulty || 'medium' }
    });

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
          return {
            id: (index + 1).toString(),
            type: questionData.type,
            question: questionData.question || 'Missing question text',
            options: questionData.options || [],
            correctAnswer: questionData.options ? questionData.options[parseInt(questionData.answer) - 1] : null,
            explanation: questionData.explanation || '',
            difficulty: 'medium',
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

