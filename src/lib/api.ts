// API service layer for RealCoder AI
// Migrated from vanilla.js version

export interface GitHubRepo {
  owner: string;
  repo: string;
  branch?: string;
}

export interface UploadedFile {
  name: string;
  content: string;
  language: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'select-all' | 'predict-output' | 'drag-drop' | 'code-execution' | 'function-rearrange';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  codeContext?: string;
}

export interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  lives: number;
  lastLifeRefill: Date;
  completed: boolean;
}

// GitHub API Integration
export async function fetchGitHubRepo(repo: GitHubRepo): Promise<UploadedFile[]> {
  try {
    const branch = repo.branch || 'main';
    const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${branch}?recursive=1`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    const files: UploadedFile[] = [];
    
    // Filter for code files
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'];
    
    for (const item of data.tree) {
      if (item.type === 'blob' && codeExtensions.some(ext => item.path.endsWith(ext))) {
        const fileContent = await fetchGitHubFile(repo.owner, repo.repo, item.sha);
        files.push({
          name: item.path,
          content: fileContent,
          language: getLanguageFromExtension(item.path)
        });
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error fetching GitHub repo:', error);
    throw error;
  }
}

async function fetchGitHubFile(owner: string, repo: string, sha: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`);
  const data = await response.json();
  return atob(data.content); // Decode base64 content
}

function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust'
  };
  return languageMap[ext || ''] || 'javascript';
}

// Quiz Generation
export async function generateQuizFromCode(files: UploadedFile[], options: {
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: string[];
  numQuestions: number;
}): Promise<QuizQuestion[]> {
  try {
    // Combine all code content
    const combinedCode = files.map(file => `// ${file.name}\n${file.content}`).join('\n\n');
    
    // TODO: Replace with actual OpenAI API call
    // For now, return mock questions based on the code
    return generateMockQuestions(combinedCode, options);
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw error;
  }
}

function generateMockQuestions(code: string, options: any): QuizQuestion[] {
  // Mock quiz generation - replace with actual OpenAI integration
  const questions: QuizQuestion[] = [];
  
  // Extract functions and variables from code
  const functions = code.match(/function\s+(\w+)/g) || [];
  const variables = code.match(/const\s+(\w+)|let\s+(\w+)|var\s+(\w+)/g) || [];
  
  // Generate multiple choice questions
  if (options.questionTypes.includes('multiple-choice')) {
    questions.push({
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
      codeContext: code.substring(0, 200) + '...'
    });
  }
  
  // Generate fill-in-the-blank questions
  if (options.questionTypes.includes('fill-blank')) {
    questions.push({
      id: '2',
      type: 'fill-blank',
      question: 'Complete the function declaration: function _____() { }',
      options: ['functionName', 'func', 'def', 'method'],
      correctAnswer: 'functionName',
      explanation: 'In JavaScript, function names should be descriptive and follow camelCase naming convention.',
      difficulty: 'easy',
      codeContext: code.substring(0, 200) + '...'
    });
  }
  
  return questions;
}

// Lives System
export function calculateLives(lastRefill: Date): number {
  const now = new Date();
  const hoursSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);
  const livesGained = Math.floor(hoursSinceRefill / 8);
  return Math.min(3, livesGained);
}

export function canRefillLives(lastRefill: Date): boolean {
  const now = new Date();
  const hoursSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);
  return hoursSinceRefill >= 8;
}

// File Upload Processing
export function processUploadedFiles(files: File[]): Promise<UploadedFile[]> {
  return Promise.all(
    files.map(async (file) => {
      const content = await file.text();
      return {
        name: file.name,
        content,
        language: getLanguageFromExtension(file.name)
      };
    })
  );
}
