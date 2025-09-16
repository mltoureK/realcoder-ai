// Quiz Generation Service - Step by step quiz creation
// This handles the process of generating quizzes from repository code

import { RepositoryInfo, GitHubFile } from './github-service';

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'select-all' | 'predict-output' | 'drag-drop' | 'code-execution' | 'function-rearrange' | 'function-variant' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  codeContext?: string;
  language: string;
  variants?: Array<{
    id: string;
    code: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export interface QuizSession {
  id: string;
  title: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  lives: number;
  lastLifeRefill: Date;
  completed: boolean;
  repositoryInfo: RepositoryInfo;
}

// Step 1: Analyze code patterns and extract concepts
export function analyzeCodePatterns(files: GitHubFile[]): any {
  console.log('🧠 Step 1: Analyzing code patterns and extracting concepts');
  
  const analysis = {
    functions: [] as string[],
    variables: [] as string[],
    classes: [] as string[],
    imports: [] as string[],
    patterns: [] as string[],
    languages: new Set<string>()
  };
  
  files.forEach(file => {
    analysis.languages.add(file.language);
    
    // Extract functions (basic regex patterns)
    const functionMatches = file.content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\(|let\s+(\w+)\s*=\s*\(|var\s+(\w+)\s*=\s*\()/g);
    if (functionMatches) {
      analysis.functions.push(...functionMatches);
    }
    
    // Extract variables
    const variableMatches = file.content.match(/(?:const|let|var)\s+(\w+)/g);
    if (variableMatches) {
      analysis.variables.push(...variableMatches);
    }
    
    // Extract classes
    const classMatches = file.content.match(/class\s+(\w+)/g);
    if (classMatches) {
      analysis.classes.push(...classMatches);
    }
    
    // Extract imports
    const importMatches = file.content.match(/import\s+.*from\s+['"][^'"]+['"]/g);
    if (importMatches) {
      analysis.imports.push(...importMatches);
    }
  });
  
  console.log('📊 Code Analysis Results:');
  console.log('  - Functions found:', analysis.functions.length);
  console.log('  - Variables found:', analysis.variables.length);
  console.log('  - Classes found:', analysis.classes.length);
  console.log('  - Imports found:', analysis.imports.length);
  console.log('  - Languages:', Array.from(analysis.languages));
  
  return analysis;
}

// Step 2: Generate quiz questions based on code analysis
export async function generateQuizQuestions(repositoryInfo: RepositoryInfo, options: {
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: string[];
  numQuestions: number;
}): Promise<QuizQuestion[]> {
  console.log('🎯 Step 2: Generating quiz questions');
  console.log('📋 Options:', options);
  
  // Analyze the code first
  const analysis = analyzeCodePatterns(repositoryInfo.files);
  
  const questions: QuizQuestion[] = [];
  const questionId = Date.now().toString();
  
  // For now, generate mock questions based on the analysis
  // TODO: Replace with actual OpenAI API calls
  
  if (options.questionTypes.includes('multiple-choice')) {
    questions.push({
      id: `${questionId}-1`,
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
      language: 'javascript',
      codeContext: repositoryInfo.files[0]?.content.substring(0, 200) + '...'
    });
  }
  
  if (options.questionTypes.includes('fill-blank')) {
    questions.push({
      id: `${questionId}-2`,
      type: 'fill-blank',
      question: 'Complete the function declaration: function _____() { }',
      options: ['functionName', 'func', 'def', 'method'],
      correctAnswer: 'functionName',
      explanation: 'In JavaScript, function names should be descriptive and follow camelCase naming convention.',
      difficulty: 'easy',
      language: 'javascript',
      codeContext: repositoryInfo.files[0]?.content.substring(0, 200) + '...'
    });
  }
  
  if (options.questionTypes.includes('predict-output')) {
    questions.push({
      id: `${questionId}-3`,
      type: 'predict-output',
      question: 'What will be the output of: console.log(2 + "2")?',
      options: ['4', '22', 'NaN', 'Error'],
      correctAnswer: '22',
      explanation: 'JavaScript performs type coercion. When adding a number and string, the number is converted to a string, resulting in string concatenation.',
      difficulty: 'medium',
      language: 'javascript',
      codeContext: repositoryInfo.files[0]?.content.substring(0, 200) + '...'
    });
  }
  
  console.log('✅ Generated', questions.length, 'questions');
  return questions;
}

// Step 3: Create quiz session with lives system
export function createQuizSession(repositoryInfo: RepositoryInfo, questions: QuizQuestion[]): QuizSession {
  console.log('🎮 Step 3: Creating quiz session with lives system');
  
  const session: QuizSession = {
    id: Date.now().toString(),
    title: `Quiz: ${repositoryInfo.owner}/${repositoryInfo.repo}`,
    questions,
    currentQuestionIndex: 0,
    score: 0,
    lives: 3, // Start with 3 lives
    lastLifeRefill: new Date(),
    completed: false,
    repositoryInfo
  };
  
  console.log('🎯 Quiz Session Created:');
  console.log('  - Title:', session.title);
  console.log('  - Questions:', session.questions.length);
  console.log('  - Lives:', session.lives);
  console.log('  - Repository:', `${session.repositoryInfo.owner}/${session.repositoryInfo.repo}`);
  
  return session;
}

// Step 4: Calculate lives based on time passed
export function calculateLives(lastRefill: Date): number {
  const now = new Date();
  const hoursSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);
  const livesGained = Math.floor(hoursSinceRefill / 8); // 1 life every 8 hours
  return Math.min(3, livesGained); // Max 3 lives
}

// Step 5: Check if lives can be refilled
export function canRefillLives(lastRefill: Date): boolean {
  const now = new Date();
  const hoursSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);
  return hoursSinceRefill >= 8;
}

// Main function that orchestrates the entire quiz generation process
export async function generateQuizFromRepository(
  repositoryInfo: RepositoryInfo,
  options: {
    difficulty: 'easy' | 'medium' | 'hard';
    questionTypes: string[];
    numQuestions: number;
  }
): Promise<QuizSession> {
  console.log('🚀 Starting quiz generation process');
  console.log('📁 Repository:', `${repositoryInfo.owner}/${repositoryInfo.repo}`);
  console.log('📊 Files:', repositoryInfo.totalFiles);
  console.log('🌐 Languages:', repositoryInfo.languages);
  
  // Step 1: Analyze code patterns
  const analysis = analyzeCodePatterns(repositoryInfo.files);
  
  // Step 2: Generate questions
  const questions = await generateQuizQuestions(repositoryInfo, options);
  
  // Step 3: Create quiz session
  const session = createQuizSession(repositoryInfo, questions);
  
  console.log('🎉 Quiz generation complete!');
  console.log('📋 Final Summary:');
  console.log('  - Session ID:', session.id);
  console.log('  - Questions:', session.questions.length);
  console.log('  - Lives:', session.lives);
  console.log('  - Ready to start!');
  
  return session;
}

// Helper function to get time until next life refill
export function getTimeUntilNextRefill(lastRefill: Date): string {
  const now = new Date();
  const hoursSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);
  const hoursUntilRefill = Math.max(0, 8 - hoursSinceRefill);
  
  const hours = Math.floor(hoursUntilRefill);
  const minutes = Math.floor((hoursUntilRefill - hours) * 60);
  
  return `${hours}h ${minutes}m`;
}
