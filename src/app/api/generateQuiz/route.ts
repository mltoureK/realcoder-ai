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
  chunkIndex: number
): Promise<any[]> {
  const generatedQuestions = [];
  
  // Generate function-variant questions for this chunk
  if (questionTypes.includes('function-variant')) {
    try {
      console.log(`🔄 Generating function-variant questions for chunk ${chunkIndex + 1}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Generate 1-2 function-variant quiz questions based on this code chunk:

${codeChunk}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

Format:
[
  {
    "snippet": "function name from code",
    "quiz": {
      "type": "function-variant",
      "question": "Which version correctly implements [FUNCTION]?",
      "variants": [
        {
          "id": "A",
          "code": "function code",
          "isCorrect": true,
          "explanation": "why correct"
        },
        {
          "id": "B",
          "code": "function with bug",
          "isCorrect": false,
          "explanation": "why wrong"
        },
        {
          "id": "C",
          "code": "function with different bug",
          "isCorrect": false,
          "explanation": "why wrong"
        },
        {
          "id": "D",
          "code": "function with another bug",
          "isCorrect": false,
          "explanation": "why wrong"
        }
      ]
    }
  }
]` 
            }
          ],
          temperature: 0.3,
          max_tokens: 3000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

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
          
          const jsonStart = cleanContent.indexOf('[');
          if (jsonStart > 0) {
            cleanContent = cleanContent.substring(jsonStart);
          }
          
          const jsonEnd = cleanContent.lastIndexOf(']');
          if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) {
            cleanContent = cleanContent.substring(0, jsonEnd + 1);
          }
          
          const parsedQuestions = JSON.parse(cleanContent);
          
          // Process variants
          parsedQuestions.forEach((question: any) => {
            if (question.quiz?.variants) {
              question.quiz.variants = shuffleVariants(question.quiz.variants);
              question.quiz.variants.forEach((variant: any) => {
                variant.code = removeComments(variant.code);
              });
              question.quiz.variants = balanceVariantVerbosity(question.quiz.variants);
            }
          });
          
          generatedQuestions.push(...parsedQuestions);
          console.log(`✅ Generated ${parsedQuestions.length} function-variant questions for chunk ${chunkIndex + 1}`);
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
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          max_tokens: 2000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

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
          
          const jsonStart = cleanContent.indexOf('[');
          if (jsonStart > 0) {
            cleanContent = cleanContent.substring(jsonStart);
          }
          
          const jsonEnd = cleanContent.lastIndexOf(']');
          if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) {
            cleanContent = cleanContent.substring(0, jsonEnd + 1);
          }
          
          const parsedQuestions = JSON.parse(cleanContent);
          generatedQuestions.push(...parsedQuestions);
          console.log(`✅ Generated ${parsedQuestions.length} multiple-choice questions for chunk ${chunkIndex + 1}`);
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
      
      // Generate questions using OpenAI with your actual prompts
      const generatedQuestions = [];
      
      // Generate function-variant questions
      if (questionTypes.includes('function-variant')) {
        try {
          console.log('🔄 Generating function-variant questions...');
          
          // Add timeout to prevent long waits
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  content: `Generate exactly 3 function-variant quiz questions based on this code:

${code}

CRITICAL: Return ONLY valid JSON array. No text before or after. No markdown. No explanations.

Format:
[
  {
    "snippet": "function name from code",
    "quiz": {
      "type": "function-variant",
      "question": "Which version correctly implements [FUNCTION]?",
      "variants": [
        {
          "id": "A",
          "code": "function code",
          "isCorrect": true,
          "explanation": "why correct"
        },
        {
          "id": "B",
          "code": "function with bug",
          "isCorrect": false,
          "explanation": "why wrong"
        },
        {
          "id": "C",
          "code": "function with different bug",
          "isCorrect": false,
          "explanation": "why wrong"
        },
        {
          "id": "D",
          "code": "function with another bug",
          "isCorrect": false,
          "explanation": "why wrong"
        }
      ]
    }
  }
]` 
                }
              ],
              temperature: 0.3, // Lower temperature for more consistent formatting
              max_tokens: 4000
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

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
          console.log('🔄 Generating multiple-choice questions...');
          
          // Add timeout to prevent long waits
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  content: `Generate exactly 2 multiple-choice questions based on this code:

${code}

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
              temperature: 0.3, // Lower temperature for more consistent formatting
              max_tokens: 3000
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          console.log('📡 OpenAI multiple-choice response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            
            console.log('📝 Multiple-choice response length:', content.length);
            
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
              
              // Remove any text before the first [
              const jsonStart = cleanContent.indexOf('[');
              if (jsonStart > 0) {
                cleanContent = cleanContent.substring(jsonStart);
              }
              
              // Remove any text after the last ]
              const jsonEnd = cleanContent.lastIndexOf(']');
              if (jsonEnd > 0 && jsonEnd < cleanContent.length - 1) {
                cleanContent = cleanContent.substring(0, jsonEnd + 1);
              }
              
              const parsedQuestions = JSON.parse(cleanContent);
              console.log('✅ Successfully parsed multiple-choice JSON, questions count:', parsedQuestions.length);
              
              // Validate the parsed questions
              if (!Array.isArray(parsedQuestions)) {
                throw new Error('AI response is not an array');
              }
              
              if (parsedQuestions.length === 0) {
                throw new Error('AI generated 0 questions');
              }
              
              generatedQuestions.push(...parsedQuestions);
              console.log(`✅ Generated ${parsedQuestions.length} multiple-choice questions`);
            } catch (parseError) {
              console.error('❌ Failed to parse multiple-choice response:', parseError);
              const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
              throw new Error(`Failed to parse multiple-choice questions: ${errorMessage}`);
            }
          } else {
            const errorText = await response.text();
            console.error('❌ OpenAI multiple-choice API error response:', errorText);
            throw new Error(`OpenAI multiple-choice API error: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.error('❌ Multiple-choice generation error:', error);
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Multiple-choice generation timed out after 20 seconds');
          }
          throw new Error(`Failed to generate multiple-choice questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

