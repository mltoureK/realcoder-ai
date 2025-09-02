export interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

export interface AIGenerationOptions {
  complexity: 'simple' | 'intermediate' | 'advanced';
  style: 'functional' | 'object-oriented' | 'procedural';
  comments: boolean;
  naming: 'camelCase' | 'snake_case' | 'PascalCase';
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'drag-drop' | 'input';
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore: number;
}

