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

// Simple delay utility for retries
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// Add comprehensive question validation function
function validateQuestionStructure(question: any): boolean {
  // Basic structure check
  if (!question || typeof question !== 'object') {
    return false;
  }
  
  // Must have quiz property
  if (!question.quiz || typeof question.quiz !== 'object') {
    return false;
  }
  
  // Must have type and question
  if (!question.quiz.type || !question.quiz.question) {
    return false;
  }
  
  // For function-variant questions
  if (question.quiz.type === 'function-variant') {
    if (!Array.isArray(question.quiz.variants) || question.quiz.variants.length === 0) {
      return false;
    }
    
    // Each variant must have required properties
    return question.quiz.variants.every((variant: any) => 
      variant && 
      variant.id && 
      variant.code && 
      typeof variant.isCorrect === 'boolean' &&
      variant.explanation
    );
  }
  
  // For multiple-choice questions
  if (question.quiz.type === 'multiple-choice') {
    if (!Array.isArray(question.quiz.options) || question.quiz.options.length === 0) {
      return false;
    }
    
    if (!question.quiz.answer || !question.quiz.explanation) {
      return false;
    }
    
    return true;
  }
  
  // Unknown question type
  return false;
}

// Smart code chunking function
function createSmartCodeChunks(code: string, maxTokensPerChunk: number = 25000): string[] {
  // Split code into files (assuming format: // filename\ncontent)
  const fileRegex = /\/\/ ([^\n]+)\n([\s\S]*?)(?=\/\/ [^\n]+\n|$)/g;
  const files: { name: string; content: string; size: number }[] = [];
  
  let match;
  while ((match = fileRegex.exec(code)) !== null) {
    const filename = match[1];
    const content = match[2].trim();
    
    // Skip irrelevant files
    if (isIrrelevantFile(filename)) continue;
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(content.length / 4);
    
    files.push({
      name: filename,
      content: content,
      size: estimatedTokens
    });
  }
  
  // If no files were found (no filename comments), treat the entire code as one file
  if (files.length === 0) {
    const estimatedTokens = Math.ceil(code.length / 4);
    files.push({
      name: 'main.js',
      content: code,
      size: estimatedTokens
    });
  }
  
  // Group files logically
  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkTokens = 0;
  
  for (const file of files) {
    // If adding this file would exceed limit, start new chunk
    if (currentChunkTokens + file.size > maxTokensPerChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      currentChunkTokens = 0;
    }
    
    // Add file to current chunk
    currentChunk += `// ${file.name}\n${file.content}\n\n`;
    currentChunkTokens += file.size;
  }
  
  // Add final chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`📦 Created ${chunks.length} code chunks from ${files.length} relevant files`);
  return chunks;
}

// Filter out irrelevant files
function isIrrelevantFile(filename: string): boolean {
  const irrelevantPatterns = [
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /\.md$/,
    /\.txt$/,
    /\.log$/,
    /\.gitignore$/,
    /\.env/,
    /\.config\./,
    /tsconfig\.json$/,
    /next\.config\./,
    /\.d\.ts$/,
    /node_modules/,
    /dist\//,
    /build\//,
    /\.min\./,
    /\.bundle\./,
    /\.map$/
  ];
  
  return irrelevantPatterns.some(pattern => pattern.test(filename));
}

// Generate questions for a single code chunk
async function generateQuestionsForChunk(
  codeChunk: string, 
  questionTypes: string[], 
  openaiApiKey: string,
  chunkIndex: number,
  questionsPerChunk: number = 2
): Promise<any[]> {
  const generatedQuestions: any[] = [];
  
  // Generate function-variant questions for this chunk
  if (questionTypes.includes('function-variant')) {
    try {
      console.log(`🔄 Generating function-variant questions for chunk ${chunkIndex + 1}...`);
      
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { 
                  role: 'system', 
                  content: 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.' 
                },
                { 
                  role: 'user', 
                  content: `Generate ${questionsPerChunk} function-variant quiz questions based on this code chunk:

${codeChunk}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

IMPORTANT REQUIREMENTS:
1. ONLY generate questions about functions that actually exist in the provided code chunk
2. The function name in "snippet" must match a real function from the code
3. The correct variant must be the actual function implementation from the code
4. Incorrect variants should have realistic bugs (off-by-one, wrong variable names, missing checks, etc.)
5. ALL variants must be similar in length (±30 characters and/or ±2 lines)
6. Each variant must be syntactically valid JavaScript/TypeScript
7. LENGTH BALANCING RULE: Randomize the length of the correct answer. The correct answer should NOT always be the longest or most verbose option.

Format:
[
  {
    "snippet": "actual function name from the code chunk",
    "quiz": {
      "type": "function-variant",
      "question": "Which version correctly implements [ACTUAL_FUNCTION_NAME]?",
      "variants": [
        {
          "id": "A",
          "code": "the actual function implementation from the code chunk",
          "isCorrect": true,
          "explanation": "This is the correct implementation from the original code"
        },
        {
          "id": "B",
          "code": "function with realistic bug (similar length)",
          "isCorrect": false,
          "explanation": "why this specific bug makes it wrong"
        },
        {
          "id": "C",
          "code": "function with different realistic bug (similar length)",
          "isCorrect": false,
          "explanation": "why this specific bug makes it wrong"
        },
        {
          "id": "D",
          "code": "function with another realistic bug (similar length)",
          "isCorrect": false,
          "explanation": "why this specific bug makes it wrong"
        }
      ]
    }
  }
]` 
                }
              ],
              temperature: 0.3,
              max_tokens: 2000
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response && (response.ok || response.status !== 429)) break;
        } catch (e) {
          clearTimeout(timeoutId);
          if (e instanceof Error && e.name === 'AbortError') throw e;
        }
        const backoff = 500 * Math.pow(2, attempt);
        console.warn(`⚠️ Function-variant 429 retry in ${backoff}ms (attempt ${attempt + 1})`);
        await delay(backoff);
      }

      if (response && response.ok) {
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
          
          const jsonStart = cleanContent.indexOf('[');
          if (jsonStart > 0) {
            cleanContent = cleanContent.substring(jsonStart);
          }
          
          const jsonEnd = cleanContent.lastIndexOf(']');
          if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) {
            cleanContent = cleanContent.substring(0, jsonEnd + 1);
          }
          
          const parsedQuestions = JSON.parse(cleanContent);
          
          // Validate and process each question
          parsedQuestions.forEach((question: any, qIndex: number) => {
            // Validate question structure
            if (!validateQuestionStructure(question)) {
              console.warn(`⚠️ Skipping malformed question ${qIndex + 1} in chunk ${chunkIndex + 1}:`, question);
              return;
            }
            
            // Process variants if they exist
            if (question.quiz.variants && Array.isArray(question.quiz.variants)) {
              question.quiz.variants = shuffleVariants(question.quiz.variants);
              question.quiz.variants.forEach((variant: any) => {
                if (variant && variant.code) {
                  variant.code = removeComments(variant.code);
                }
              });
              question.quiz.variants = balanceVariantVerbosity(question.quiz.variants);
            }
            
            // Only add valid questions
            generatedQuestions.push(question);
          });
          
          console.log(`✅ Generated ${generatedQuestions.length} valid function-variant questions for chunk ${chunkIndex + 1}`);
        } catch (parseError) {
          console.error(`❌ Failed to parse function-variant response for chunk ${chunkIndex + 1}:`, parseError);
        }
      }
    } catch (error) {
      console.error(`❌ Function-variant generation error for chunk ${chunkIndex + 1}:`, error);
    }
  }

  // Generate multiple-choice questions for this chunk
  if (questionTypes.includes('multiple-choice')) {
    try {
      console.log(`🔄 Generating multiple-choice questions for chunk ${chunkIndex + 1}...`);
      
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { 
                  role: 'system', 
                  content: 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.' 
                },
                { 
                  role: 'user', 
                  content: `Generate 1 multiple-choice question based on this code chunk:

${codeChunk}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

Format:
[
  {
    "snippet": "function name from code",
    "quiz": {
      "type": "multiple-choice",
      "question": "What does [FUNCTION] do?",
      "options": [
        "Option A description",
        "Option B description", 
        "Option C description",
        "Option D description"
      ],
      "answer": "1",
      "explanation": "why this is correct"
    }
  }
]` 
                }
              ],
              temperature: 0.3,
              max_tokens: 1500
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response && (response.ok || response.status !== 429)) break;
        } catch (e) {
          clearTimeout(timeoutId);
          if (e instanceof Error && e.name === 'AbortError') throw e;
        }
        const backoff = 500 * Math.pow(2, attempt);
        console.warn(`⚠️ Multiple-choice 429 retry in ${backoff}ms (attempt ${attempt + 1})`);
        await delay(backoff);
      }

      if (response && response.ok) {
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
          
          const jsonStart = cleanContent.indexOf('[');
          if (jsonStart > 0) {
            cleanContent = cleanContent.substring(jsonStart);
          }
          
          const jsonEnd = cleanContent.lastIndexOf(']');
          if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) {
            cleanContent = cleanContent.substring(0, jsonEnd + 1);
          }
          
          const parsedQuestions = JSON.parse(cleanContent);
          
          // Validate and process each question
          const validQuestions: any[] = [];
          const invalidQuestions: any[] = [];
          
          parsedQuestions.forEach((question: any, qIndex: number) => {
            if (validateQuestionStructure(question)) {
              validQuestions.push(question);
            } else {
              invalidQuestions.push({
                index: qIndex,
                question: question,
                reason: 'Invalid structure'
              });
            }
          });
          
          // Log what we found
          console.log(`✅ Found ${validQuestions.length} valid multiple-choice questions`);
          if (invalidQuestions.length > 0) {
            console.warn(`⚠️ Found ${invalidQuestions.length} invalid multiple-choice questions:`, invalidQuestions);
          }
          
          // Only proceed if we have valid questions
          if (validQuestions.length === 0) {
            console.warn(`⚠️ No valid multiple-choice questions found for chunk ${chunkIndex + 1}`);
            // Skip this question type and continue processing
          } else {
            // Process only valid questions
            validQuestions.forEach((question: any) => {
              generatedQuestions.push(question);
            });
            
            console.log(`✅ Generated ${validQuestions.length} valid multiple-choice questions for chunk ${chunkIndex + 1}`);
          }
          

        } catch (parseError) {
          console.error(`❌ Failed to parse multiple-choice response for chunk ${chunkIndex + 1}:`, parseError);
        }
      }
    } catch (error) {
      console.error(`❌ Multiple-choice generation error for chunk ${chunkIndex + 1}:`, error);
    }
  }
  
  return generatedQuestions;
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
    console.log('🤖 Using OpenAI to generate questions based on actual code');
    
    // Clean code to remove irrelevant files before chunking
    const cleanCode = code?.replace(/\/\/ deps\/.*$/gm, '')  // Remove dependency files
                         .replace(/\/\/ .*\.cc$/gm, '')      // Remove C++ files  
                         .replace(/\/\/ .*\.h$/gm, '')       // Remove header files
                         .replace(/\/\/ .*\.cpp$/gm, '')     // Remove C++ source files
                         .replace(/\/\/ .*v8dll.*$/gm, '');  // Remove V8 engine internals
    
    // Chunk code to avoid token limits and generate per chunk
    const generatedQuestions: any[] = [];
    const desiredTotal = typeof numQuestions === 'number' && numQuestions > 0 ? numQuestions : 5;
    const chunks = createSmartCodeChunks(cleanCode || '', 4000); // Smaller chunks for more variety
    
    // Randomize chunk order to ensure variety in function selection across different runs
    const shuffledChunks = shuffleVariants(chunks);
    console.log(`🧩 Generating across ${chunks.length} chunks, aiming for ${desiredTotal} questions`);
    console.log(`🎲 Randomized chunk order to ensure variety in function selection`);
    
    // If we have fewer chunks than desired questions, generate multiple questions per chunk
    const questionsPerChunk = Math.ceil(desiredTotal / Math.max(shuffledChunks.length, 1));
    
    for (let i = 0; i < shuffledChunks.length; i++) {
      if (generatedQuestions.length >= desiredTotal) break;
      const chunkQuestions = await generateQuestionsForChunk(shuffledChunks[i], questionTypes, openaiApiKey, i, questionsPerChunk);
      for (const q of chunkQuestions) {
        if (generatedQuestions.length < desiredTotal) {
          generatedQuestions.push(q);
        } else {
          break;
        }
      }
    }

    // Randomize the generated questions to ensure variety in function selection
    // This prevents the same functions from appearing repeatedly
    const shuffledGeneratedQuestions = shuffleVariants(generatedQuestions);
    
    // Log the randomization for debugging
    console.log(`🎲 Randomized ${shuffledGeneratedQuestions.length} questions for variety`);
    console.log(`📝 Selected functions:`, shuffledGeneratedQuestions.map(q => q.snippet).slice(0, 5));
    
    // Convert the generated questions to the format expected by your quiz interface
      questions = shuffledGeneratedQuestions.map((q, index) => {
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
            variants: questionData.variants || []
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

