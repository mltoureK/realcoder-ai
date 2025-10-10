/**
 * Question type utilities for handling flexible schemas across different question types
 * FLATTENED STRUCTURE: All fields stored at root level (no nested 'data' object)
 */

export interface BaseQuestion {
  id: string;
  type: string;
  question: string;
  language?: string;
  difficulty?: string;
  repoUrl?: string;
  snippet?: string; // Function name or identifier from code
  codeContext?: string; // The actual code snippet
}

// Question type interfaces for the 5 active question types
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswer: string;
  explanation: string;
  answer?: string; // Raw answer from AI (e.g., "2")
}

export interface FunctionVariantQuestion extends BaseQuestion {
  type: 'function-variant';
  variants: Array<{
    id: string;
    code: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export interface SelectAllQuestion extends BaseQuestion {
  type: 'select-all';
  options: string[] | Array<{text: string, isCorrect: boolean}>; // Can be array of strings or objects
  correctAnswers: string[]; // Array of correct option indices/letters
  explanation: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  options: string[];
  correctAnswer: string;
  explanation: string;
  answer?: string; // Raw answer from AI (e.g., "TRUE")
}

export interface OrderSequenceQuestion extends BaseQuestion {
  type: 'order-sequence';
  steps: Array<{
    id: string;
    code: string;
    isDistractor?: boolean;
    explanation?: string;
  }>;
  correctOrder: string[]; // Array of step IDs in correct order
  acceptableOrders?: string[][]; // Multiple valid orders
  constraints?: any[]; // Precedence constraints
  explanation: string;
}

export type Question = 
  | MultipleChoiceQuestion 
  | FunctionVariantQuestion 
  | SelectAllQuestion 
  | TrueFalseQuestion 
  | OrderSequenceQuestion;

/**
 * Flattened Firebase document structure
 * ALL fields at root level for easy editing and querying
 */
export interface StoredQuestion {
  // Core identification
  questionId: string;
  repoUrl: string;
  repoKey: string;
  type: string;
  
  // Question content (ALWAYS at root)
  snippet: string;
  question: string;
  language: string;
  difficulty: string;
  codeContext: string;
  explanation: string;
  
  // Multiple-choice & True-false fields
  options?: string[] | Array<{text: string, isCorrect: boolean}>;
  correctAnswer?: string;
  answer?: string; // Raw AI answer
  
  // Select-all fields
  correctAnswers?: string[];
  
  // Function-variant fields
  variants?: Array<{
    id: string;
    code: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  
  // Order-sequence fields
  steps?: Array<{
    id: string;
    code: string;
    isDistractor?: boolean;
    explanation?: string;
  }>;
  correctOrder?: string[];
  acceptableOrders?: string[][];
  constraints?: any[];
  
  // Metrics
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  approvalRate: number;
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
  passRate: number;
  
  // Status
  status: 'active' | 'removed' | 'flagged';
  createdAt: any; // Firestore timestamp
  lastUpdated: any; // Firestore timestamp
}

/**
 * Normalize a question for storage in Firebase
 * FLATTENED: All fields at root level, no nested 'data' object
 */
export const normalizeQuestionForStorage = (question: any): Partial<StoredQuestion> => {
  // Ensure we have a valid repoUrl
  const repoUrl = question.repoUrl || '';
  const repoKey = repoUrl 
    ? repoUrl.replace('https://github.com/', '').replace('/', '-')
    : 'unknown-repo';

  // Base fields (ALWAYS included)
  const stored: Partial<StoredQuestion> = {
    questionId: question.id || '',
    repoUrl: repoUrl,
    repoKey,
    type: question.type || '',
    snippet: question.snippet || '',
    question: question.question || '',
    language: question.language || 'JavaScript',
    difficulty: question.difficulty || 'medium',
    codeContext: question.codeContext || '',
    explanation: question.explanation || '',
    upvotes: 0,
    downvotes: 0,
    totalVotes: 0,
    approvalRate: 0,
    passedCount: 0,
    failedCount: 0,
    totalAttempts: 0,
    passRate: 0,
    status: 'active'
  };

  // Add type-specific fields (ALL at root level)
  switch (question.type) {
    case 'multiple-choice':
      stored.options = question.options || [];
      stored.correctAnswer = question.correctAnswer || '';
      stored.answer = question.answer || '';
      break;
      
    case 'function-variant':
      stored.variants = (question.variants || []).map((v: any) => ({
        id: v.id || '',
        code: v.code || '',
        isCorrect: v.isCorrect || false,
        explanation: v.explanation || ''
      }));
      break;
      
    case 'select-all':
      stored.options = question.options || [];
      stored.correctAnswers = question.correctAnswers || [];
      break;
      
    case 'true-false':
      stored.options = question.options || ['True', 'False'];
      stored.correctAnswer = question.correctAnswer || '';
      stored.answer = question.answer || '';
      break;
      
    case 'order-sequence':
      stored.steps = (question.steps || []).map((s: any) => ({
        id: s.id || '',
        code: s.code || '',
        isDistractor: s.isDistractor || false,
        explanation: s.explanation || ''
      }));
      stored.correctOrder = question.correctOrder || [];
      stored.acceptableOrders = question.acceptableOrders || [];
      stored.constraints = question.constraints || [];
      break;
      
    default:
      console.warn(`Unknown question type: ${question.type}`);
  }

  return stored;
};

/**
 * Denormalize a stored question back to its original format
 */
export const denormalizeQuestionFromStorage = (storedQuestion: StoredQuestion): Question => {
  const baseQuestion = {
    id: storedQuestion.questionId,
    type: storedQuestion.type,
    snippet: storedQuestion.snippet,
    question: storedQuestion.question,
    language: storedQuestion.language,
    difficulty: storedQuestion.difficulty,
    repoUrl: storedQuestion.repoUrl,
    codeContext: storedQuestion.codeContext
  };

  // Reconstruct type-specific fields from root level
  switch (storedQuestion.type) {
    case 'multiple-choice':
      return {
        ...baseQuestion,
        type: 'multiple-choice',
        options: storedQuestion.options as string[] || [],
        correctAnswer: storedQuestion.correctAnswer || '',
        explanation: storedQuestion.explanation || ''
      } as MultipleChoiceQuestion;
      
    case 'function-variant':
      return {
        ...baseQuestion,
        type: 'function-variant',
        variants: storedQuestion.variants || []
      } as FunctionVariantQuestion;
      
    case 'select-all':
      return {
        ...baseQuestion,
        type: 'select-all',
        options: storedQuestion.options || [],
        correctAnswers: storedQuestion.correctAnswers || [],
        explanation: storedQuestion.explanation || ''
      } as SelectAllQuestion;
      
    case 'true-false':
      return {
        ...baseQuestion,
        type: 'true-false',
        options: storedQuestion.options as string[] || ['True', 'False'],
        correctAnswer: storedQuestion.correctAnswer || '',
        explanation: storedQuestion.explanation || ''
      } as TrueFalseQuestion;
      
    case 'order-sequence':
      return {
        ...baseQuestion,
        type: 'order-sequence',
        steps: storedQuestion.steps || [],
        correctOrder: storedQuestion.correctOrder || [],
        acceptableOrders: storedQuestion.acceptableOrders,
        constraints: storedQuestion.constraints,
        explanation: storedQuestion.explanation || ''
      } as OrderSequenceQuestion;
      
    default:
      throw new Error(`Unknown question type: ${storedQuestion.type}`);
  }
};

/**
 * Extract repository information from a repo URL
 */
export const extractRepoInfo = (repoUrl: string) => {
  const match = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }
  
  const [, owner, repo] = match;
  return {
    owner,
    repo,
    repoKey: `${owner}-${repo}`
  };
};

/**
 * Validate question data based on type
 */
export const validateQuestionData = (question: any): boolean => {
  if (!question.id || !question.type) {
    console.warn('[validateQuestionData] Missing id or type:', {id: question.id, type: question.type});
    return false;
  }

  switch (question.type) {
    case 'multiple-choice':
      return !!(question.options && question.correctAnswer);
      
    case 'function-variant':
      return !!(question.variants && Array.isArray(question.variants) && question.variants.length > 0);
      
    case 'select-all':
      return !!(question.options && question.correctAnswers);
      
    case 'true-false':
      return !!(question.options && question.correctAnswer);
      
    case 'order-sequence':
      return !!(question.steps && question.correctOrder);
      
    default:
      console.warn('[validateQuestionData] Unknown question type:', question.type);
      return false;
  }
};
