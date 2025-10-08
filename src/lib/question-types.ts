/**
 * Question type utilities for handling flexible schemas across different question types
 */

export interface BaseQuestion {
  id: string;
  type: string;
  question: string;
  language?: string;
  difficulty?: string;
  repoUrl?: string;
  codeContext?: string; // The actual code snippet
  variants?: Array<{
    id: string;
    code: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

// Additional question types for compatibility with existing quiz system
export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank';
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PredictOutputQuestion extends BaseQuestion {
  type: 'predict-output';
  code: string;
  correctAnswer: string;
  explanation: string;
}

export interface DragDropQuestion extends BaseQuestion {
  type: 'drag-drop';
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface CodeExecutionQuestion extends BaseQuestion {
  type: 'code-execution';
  code: string;
  correctAnswer: string;
  explanation: string;
}

export interface FunctionRearrangeQuestion extends BaseQuestion {
  type: 'function-rearrange';
  steps: Array<{
    id: string;
    code: string;
  }>;
  correctOrder: string[];
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswer: string;
  explanation: string;
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
  options: string[];
  correctAnswers: string[]; // Array of correct option letters (A, B, C, etc.)
  explanation: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  options: string[];
  correctAnswer: string;
  explanation: string;
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
  explanation: string;
}

export type Question = 
  | MultipleChoiceQuestion 
  | FunctionVariantQuestion 
  | SelectAllQuestion 
  | TrueFalseQuestion 
  | OrderSequenceQuestion
  | FillBlankQuestion
  | PredictOutputQuestion
  | DragDropQuestion
  | CodeExecutionQuestion
  | FunctionRearrangeQuestion;

export interface StoredQuestion {
  questionId: string;
  repoUrl: string;
  repoKey: string;
  type: string;
  question: string;
  language: string;
  difficulty: string;
  codeContext: string; // The actual code snippet for re-display
  variants: Array<{
    id: string;
    code: string;
    isCorrect: boolean;
    explanation: string;
  }>; // For function-variant questions
  data: any; // Flexible data object for type-specific content
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  approvalRate: number;
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
  passRate: number;
  status: 'active' | 'removed' | 'flagged';
  createdAt: any; // Firestore timestamp
  lastUpdated: any; // Firestore timestamp
}

/**
 * Normalize a question for storage in Firebase
 */
export const normalizeQuestionForStorage = (question: Question): Partial<StoredQuestion> => {
  const repoKey = question.repoUrl 
    ? question.repoUrl.replace('https://github.com/', '').replace('/', '-')
    : 'unknown-repo';

  const baseQuestion = {
    questionId: question.id,
    repoUrl: question.repoUrl || '',
    repoKey,
    type: question.type,
    question: question.question,
    language: question.language || 'JavaScript',
    difficulty: question.difficulty || 'medium',
    codeContext: question.codeContext || '', // Store the actual code snippet
    variants: question.variants || [] // Store variants for function-variant questions
  };

  // Type-specific data normalization
  let data: any = {};
  
  switch (question.type) {
    case 'multiple-choice':
      data = {
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'function-variant':
      data = {
        variants: question.variants?.map(v => ({
          id: v.id,
          code: v.code,
          isCorrect: v.isCorrect,
          explanation: v.explanation
        })) || [],
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'select-all':
      data = {
        options: question.options,
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'true-false':
      data = {
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'order-sequence':
      data = {
        steps: question.steps.map(s => ({
          id: s.id,
          code: s.code,
          isDistractor: s.isDistractor || false,
          explanation: s.explanation || ''
        })),
        correctOrder: question.correctOrder,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'fill-blank':
      data = {
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'predict-output':
      data = {
        code: question.code,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'drag-drop':
      data = {
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'code-execution':
      data = {
        code: question.code,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    case 'function-rearrange':
      data = {
        steps: question.steps.map(s => ({
          id: s.id,
          code: s.code
        })),
        correctOrder: question.correctOrder,
        explanation: question.explanation,
        codeContext: question.codeContext || ''
      };
      break;
      
    default:
      console.warn(`Unknown question type: ${question.type}`);
      data = {};
  }

  return {
    ...baseQuestion,
    data,
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
};

/**
 * Denormalize a stored question back to its original format
 */
export const denormalizeQuestionFromStorage = (storedQuestion: StoredQuestion): Question => {
  const baseQuestion = {
    id: storedQuestion.questionId,
    type: storedQuestion.type,
    question: storedQuestion.question,
    language: storedQuestion.language,
    difficulty: storedQuestion.difficulty,
    repoUrl: storedQuestion.repoUrl
  };

  // Reconstruct type-specific fields
  switch (storedQuestion.type) {
    case 'multiple-choice':
      return {
        ...baseQuestion,
        type: 'multiple-choice',
        options: storedQuestion.data.options,
        correctAnswer: storedQuestion.data.correctAnswer,
        explanation: storedQuestion.data.explanation
      } as MultipleChoiceQuestion;
      
    case 'function-variant':
      return {
        ...baseQuestion,
        type: 'function-variant',
        variants: storedQuestion.data.variants
      } as FunctionVariantQuestion;
      
    case 'select-all':
      return {
        ...baseQuestion,
        type: 'select-all',
        options: storedQuestion.data.options,
        correctAnswers: storedQuestion.data.correctAnswers,
        explanation: storedQuestion.data.explanation
      } as SelectAllQuestion;
      
    case 'true-false':
      return {
        ...baseQuestion,
        type: 'true-false',
        options: storedQuestion.data.options,
        correctAnswer: storedQuestion.data.correctAnswer,
        explanation: storedQuestion.data.explanation
      } as TrueFalseQuestion;
      
    case 'order-sequence':
      return {
        ...baseQuestion,
        type: 'order-sequence',
        steps: storedQuestion.data.steps,
        correctOrder: storedQuestion.data.correctOrder,
        explanation: storedQuestion.data.explanation
      } as OrderSequenceQuestion;
      
    case 'fill-blank':
      return {
        ...baseQuestion,
        type: 'fill-blank',
        options: storedQuestion.data.options,
        correctAnswer: storedQuestion.data.correctAnswer,
        explanation: storedQuestion.data.explanation
      } as FillBlankQuestion;
      
    case 'predict-output':
      return {
        ...baseQuestion,
        type: 'predict-output',
        code: storedQuestion.data.code,
        correctAnswer: storedQuestion.data.correctAnswer,
        explanation: storedQuestion.data.explanation
      } as PredictOutputQuestion;
      
    case 'drag-drop':
      return {
        ...baseQuestion,
        type: 'drag-drop',
        options: storedQuestion.data.options,
        correctAnswer: storedQuestion.data.correctAnswer,
        explanation: storedQuestion.data.explanation
      } as DragDropQuestion;
      
    case 'code-execution':
      return {
        ...baseQuestion,
        type: 'code-execution',
        code: storedQuestion.data.code,
        correctAnswer: storedQuestion.data.correctAnswer,
        explanation: storedQuestion.data.explanation
      } as CodeExecutionQuestion;
      
    case 'function-rearrange':
      return {
        ...baseQuestion,
        type: 'function-rearrange',
        steps: storedQuestion.data.steps,
        correctOrder: storedQuestion.data.correctOrder,
        explanation: storedQuestion.data.explanation
      } as FunctionRearrangeQuestion;
      
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
  if (!question.id || !question.type || !question.question) {
    return false;
  }

  switch (question.type) {
    case 'multiple-choice':
      return !!(question.options && question.correctAnswer && question.explanation);
      
    case 'function-variant':
      return !!(question.variants && Array.isArray(question.variants));
      
    case 'select-all':
      return !!(question.options && question.correctAnswers && question.explanation);
      
    case 'true-false':
      return !!(question.options && question.correctAnswer && question.explanation);
      
    case 'order-sequence':
      return !!(question.steps && question.correctOrder && question.explanation);
      
    default:
      return false;
  }
};
