// API Route: /api/generateQuiz
// Migrated from original vanilla.js logic
// Builds quiz based on code with question types: Multiple choice, drag-n-drop

import { NextRequest, NextResponse } from 'next/server';

// Helper function to shuffle array and preserve correct answer mapping
function shuffleVariants(variants: any[]) {
  const shuffled = [...variants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper function to remove comments from code
function removeComments(code: string): string {
  return code
    // Remove single-line comments (// ...)
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments (/* ... */)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Clean up extra whitespace and empty lines
    .replace(/^\s*[\r\n]/gm, '')
    .trim();
}

// Helper function to balance variant verbosity
function balanceVariantVerbosity(variants: any[]): any[] {
  if (variants.length < 2) return variants;
  
  // Find the correct answer
  const correctVariant = variants.find(v => v.isCorrect);
  const incorrectVariants = variants.filter(v => !v.isCorrect);
  
  if (!correctVariant || incorrectVariants.length === 0) return variants;
  
  // Calculate average length of incorrect variants
  const avgIncorrectLength = incorrectVariants.reduce((sum, v) => sum + v.code.length, 0) / incorrectVariants.length;
  const correctLength = correctVariant.code.length;
  
  // If correct answer is significantly longer, make some incorrect ones longer too
  if (correctLength > avgIncorrectLength * 1.5) {
    // Make the longest incorrect variant more verbose
    const longestIncorrect = incorrectVariants.reduce((longest, current) => 
      current.code.length > longest.code.length ? current : longest
    );
    
    // Add some complexity to make it longer
    if (longestIncorrect.code.includes('return')) {
      longestIncorrect.code = longestIncorrect.code.replace(
        /return ([^;]+);/,
        'const result = $1;\n  return result;'
      );
    }
  }
  
  // If correct answer is significantly shorter, make some incorrect ones shorter too
  if (correctLength < avgIncorrectLength * 0.7) {
    // Make the shortest incorrect variant even shorter
    const shortestIncorrect = incorrectVariants.reduce((shortest, current) => 
      current.code.length < shortest.code.length ? current : shortest
    );
    
    // Simplify the code
    if (shortestIncorrect.code.includes('if (')) {
      shortestIncorrect.code = shortestIncorrect.code.replace(
        /if \(([^)]+)\)\s*{([^}]+)}/,
        'return $1 ? $2 : false;'
      );
    }
  }
  
  return variants;
}

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
    let questions = [];
    
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.log('⚠️ OpenAI API key not configured, using fallback questions');
      
      // Generate multiple fallback questions
      questions = [
        {
          id: '1',
          type: 'multiple-choice',
          question: 'What does console.log() do in JavaScript?',
          options: [
            'Displays text in the browser',
            'Outputs text to the console',
            'Creates a new variable',
            'Stops the program execution'
          ],
          correctAnswer: 'Outputs text to the console',
          explanation: 'console.log() is used to output text and data to the browser console for debugging purposes.',
          difficulty: 'easy',
          codeContext: code?.substring(0, 500) + '...'
        },
        {
          id: '2',
          type: 'multiple-choice',
          question: 'What is the purpose of the "async" keyword in JavaScript?',
          options: [
            'To make a function run faster',
            'To enable the use of "await" inside the function',
            'To prevent the function from being called',
            'To make the function return a promise'
          ],
          correctAnswer: 'To enable the use of "await" inside the function',
          explanation: 'The "async" keyword enables the use of "await" inside the function and makes it return a promise.',
          difficulty: 'medium',
          codeContext: code?.substring(0, 500) + '...'
        },
        {
          id: '3',
          type: 'multiple-choice',
          question: 'What does the "useState" hook do in React?',
          options: [
            'Manages component lifecycle',
            'Handles state in functional components',
            'Creates side effects',
            'Optimizes performance'
          ],
          correctAnswer: 'Handles state in functional components',
          explanation: 'useState is a React hook that allows functional components to manage state.',
          difficulty: 'medium',
          codeContext: code?.substring(0, 500) + '...'
        },
        {
          id: '4',
          type: 'multiple-choice',
          question: 'What is the correct way to handle errors in async functions?',
          options: [
            'Using try-catch blocks',
            'Using .then() and .catch()',
            'Using if-else statements',
            'Using switch statements'
          ],
          correctAnswer: 'Using try-catch blocks',
          explanation: 'try-catch blocks are the standard way to handle errors in async functions.',
          difficulty: 'medium',
          codeContext: code?.substring(0, 500) + '...'
        },
        {
          id: '5',
          type: 'multiple-choice',
          question: 'What is the purpose of the "export" keyword in JavaScript modules?',
          options: [
            'To import functions from other files',
            'To make functions available for import in other files',
            'To create private functions',
            'To optimize code performance'
          ],
          correctAnswer: 'To make functions available for import in other files',
          explanation: 'The export keyword makes functions, classes, or variables available for import in other modules.',
          difficulty: 'easy',
          codeContext: code?.substring(0, 500) + '...'
        }
      ];
    } else {
      console.log('🤖 Using OpenAI to generate questions based on actual code');
      
      // Generate questions using OpenAI with your actual prompts
      const generatedQuestions = [];
      
      // Generate function-variant questions
      if (questionTypes.includes('function-variant')) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: `You are an expert programming instructor creating function-variant quiz questions. Generate questions based on the provided code.` },
                { role: 'user', content: `CRITICAL: You MUST analyze the ACTUAL code provided below and create questions based ONLY on the specific functions, variables, and patterns found in that code.

Create exactly 3 function-variant questions that test understanding of the ACTUAL code provided:

${code}

REQUIREMENTS:
1. You MUST use ONLY functions, variables, and patterns that actually exist in the provided code
2. Each question MUST have exactly 4 variants (A, B, C, D)
3. ANSWER LENGTH BALANCE - Make correct and incorrect answers similar in length and complexity
4. The CORRECT variant should be a simplified but complete version of the actual function
5. The WRONG variants should have FUNDAMENTALLY DIFFERENT types of bugs:
   - Security vulnerabilities (XSS, injection, innerHTML with user input)
   - Performance problems (infinite loops, memory leaks, multiple event listeners)
   - Logic errors (wrong algorithms, incorrect calculations, wrong conditions)
   - API misuse (wrong methods, incorrect parameters, wrong event binding)
   - Edge case failures (missing null checks, boundary conditions, wrong error handling)
6. Make all possible answers close in code length, structure, and verbosity
7. Each variant must be a complete, syntactically valid function
8. Include detailed explanations for why each variant is correct or incorrect
9. Focus on REAL bugs that developers commonly make, not obvious syntax errors
10. Ensure the correct answer demonstrates the proper implementation pattern from the source code
11. BALANCE VERBOSITY - Correct answers should NOT be consistently longer or more detailed than incorrect ones

Return ONLY valid JSON in this exact format:
[
  {
    "snippet": "Name of the actual function or feature from the provided code",
    "quiz": {
      "type": "function-variant",
      "question": "Which version correctly implements the [ACTUAL FUNCTION NAME] from the provided code?",
      "variants": [
        {
          "id": "A",
          "code": "function code here",
          "isCorrect": true,
          "explanation": "This is correct because..."
        },
        {
          "id": "B", 
          "code": "function code with bug",
          "isCorrect": false,
          "explanation": "This is incorrect because it has a security vulnerability..."
        },
        {
          "id": "C",
          "code": "function code with different bug",
          "isCorrect": false,
          "explanation": "This is incorrect because it has a performance issue..."
        },
        {
          "id": "D",
          "code": "function code with another bug",
          "isCorrect": false,
          "explanation": "This is incorrect because it has incorrect logic..."
        }
      ]
    }
  }
]` }
              ],
              temperature: 0.7,
              max_tokens: 6000
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            
            try {
              // Clean the response - remove markdown code blocks if present
              let cleanContent = content.trim();
              
              // Remove ```json and ``` if present
              if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '');
              }
              if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '');
              }
              if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.replace(/\s*```$/, '');
              }
              
              console.log('🧹 Cleaned OpenAI response:', cleanContent.substring(0, 200) + '...');
              
              const parsedQuestions = JSON.parse(cleanContent);
              
              // Shuffle the variants for each AI-generated question and remove comments
              parsedQuestions.forEach((question: any) => {
                if (question.quiz.variants) {
                  question.quiz.variants = shuffleVariants(question.quiz.variants);
                  // Remove comments from code variants
                  question.quiz.variants.forEach((variant: any) => {
                    variant.code = removeComments(variant.code);
                  });
                  // Balance verbosity to prevent correct answers from being consistently longer
                  question.quiz.variants = balanceVariantVerbosity(question.quiz.variants);
                }
              });
              
              generatedQuestions.push(...parsedQuestions);
              
              console.log(`✅ Generated ${generatedQuestions.length} questions total`);
            } catch (parseError) {
              console.error('❌ Failed to parse OpenAI response:', parseError);
              console.error('🔍 Raw response:', content);
              const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
              throw new Error(`Failed to parse AI-generated questions: ${errorMessage}`);
            }
          }
        } catch (error) {
          console.error('❌ OpenAI API error:', error);
          throw new Error(`Failed to generate function-variant questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate multiple-choice questions
      if (questionTypes.includes('multiple-choice')) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are an expert programming instructor creating multiple-choice quiz questions. Generate questions based on the provided code.' },
                { role: 'user', content: `You are an expert programming instructor. Analyze the code below and create 2 multiple-choice questions that test understanding of the ACTUAL functions, variables, and patterns found in that code.

${code}

INSTRUCTIONS:
- Create exactly 2 questions based ONLY on functions/features that exist in the provided code
- Each question must have exactly 4 options (A, B, C, D) with only ONE correct answer
- All options must be plausible and well-written
- Include clear explanations for the correct answer
- Questions should test actual code understanding, not generic programming concepts

Return ONLY valid JSON in this format:
[
  {
    "snippet": "Name of the actual function from the code",
    "quiz": {
      "type": "multiple-choice",
      "question": "What does the [FUNCTION NAME] function do?",
      "options": [
        "Option A description",
        "Option B description", 
        "Option C description",
        "Option D description"
      ],
      "answer": "1",
      "explanation": "Detailed explanation of why this is correct."
    }
  }
]` }
              ],
              temperature: 0.7,
              max_tokens: 4000
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            
            try {
              let cleanContent = content.trim();
              if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '');
              }
              if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '');
              }
              if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.replace(/\s*```$/, '');
              }
              
              const parsedQuestions = JSON.parse(cleanContent);
              generatedQuestions.push(...parsedQuestions);
              console.log(`✅ Generated ${parsedQuestions.length} multiple-choice questions`);
            } catch (parseError) {
              console.error('❌ Failed to parse multiple-choice response:', parseError);
            }
          }
        } catch (error) {
          console.error('❌ Multiple-choice generation error:', error);
        }
      }

      // Convert the generated questions to the format expected by your quiz interface
      questions = generatedQuestions.map((q, index) => ({
        id: (index + 1).toString(),
        type: q.quiz.type,
        question: q.quiz.question,
        options: q.quiz.options || [],
        correctAnswer: q.quiz.options ? q.quiz.options[parseInt(q.quiz.answer) - 1] : null,
        explanation: q.quiz.explanation,
        difficulty: 'medium',
        codeContext: code?.substring(0, 1000) + '...',
        variants: q.quiz.variants || []
      }));
      
      // Shuffle variants for all questions to randomize correct answer position and remove comments
      questions.forEach((question: any) => {
        if (question.variants && question.variants.length > 0) {
          question.variants = shuffleVariants(question.variants);
          // Remove comments from code variants
          question.variants.forEach((variant: any) => {
            variant.code = removeComments(variant.code);
          });
          // Balance verbosity to prevent correct answers from being consistently longer
          question.variants = balanceVariantVerbosity(question.variants);
        }
      });
    }

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
