export type QuestionType =
  | 'multiple-choice'
  | 'fill-blank'
  | 'select-all'
  | 'predict-output'
  | 'drag-drop'
  | 'code-execution'
  | 'function-rearrange'
  | 'function-variant'
  | 'order-sequence';

export interface RepoContext {
  owner?: string;
  repo?: string;
  languages?: string[];
}

export interface GenerateParams {
  chunk: string;
  options: {
    difficulty: 'easy' | 'medium' | 'hard';
    numQuestions: number;
  };
  apiKey: string;
  timeoutMs: number;
  retry: { attempts: number; backoffBaseMs: number };
  abortSignal?: AbortSignal;
  repoContext?: RepoContext;
}

export interface RawQuestion {
  snippet?: string;
  // `quiz` remains loosely typed to preserve current route behavior without forcing a schema here
  quiz: any;
}

export interface QuestionPlugin {
  type: QuestionType;
  generate(params: GenerateParams): Promise<RawQuestion[]>;
}


