export type QuestionType = 'multiple-choice' | 'fill-blank' | 'select-all' | 'order-sequence' | 'function-variant' | 'true-false';

export type QuestionResult = {
  questionId: string;
  type: QuestionType;
  language?: string | null;
  isCorrect: boolean;
  selectedAnswers: string[];
  correctAnswers: string[];
};

export type FailedQuestion = {
  questionId: string;
  type: QuestionType;
  language?: string | null;
  question: string;
  codeContext?: string;
  selectedAnswers: string[];
  correctAnswers: string[];
  explanation?: string;
  // For function-variant questions
  variants?: Array<{
    id: string;
    code: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  // For order-sequence questions
  steps?: Array<{
    id: string;
    code: string;
    explanation: string;
  }>;
  // For select-all questions
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
};

export type Breakdown = {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number; // 0..1
};

export type Analysis = {
  overall: Breakdown;
  byLanguage: Record<string, Breakdown>;
  byType: Record<QuestionType, Breakdown>;
  weaknesses: {
    languages: string[];
    types: QuestionType[];
  };
};

export type RepoIQ = {
  score: number; // 0..100
  reasoning: string[];
};

export type StrengthsWeaknesses = {
  strengths: string[];
  weaknesses: string[];
};

export function analyzeResults(results: QuestionResult[]): Analysis {
  const overall: Breakdown = {
    total: results.length,
    correct: results.filter(r => r.isCorrect).length,
    incorrect: results.filter(r => !r.isCorrect).length,
    accuracy: results.length === 0 ? 0 : results.filter(r => r.isCorrect).length / results.length
  };

  const byLanguage: Record<string, Breakdown> = {};
  const byType = {
    'multiple-choice': initBreakdown(),
    'fill-blank': initBreakdown(),
    'select-all': initBreakdown(),
    'order-sequence': initBreakdown(),
    'function-variant': initBreakdown(),
    'true-false': initBreakdown()
  } as Record<QuestionType, Breakdown>;

  for (const r of results) {
    // Type breakdown
    const t = byType[r.type];
    t.total += 1;
    if (r.isCorrect) t.correct += 1; else t.incorrect += 1;

    // Language breakdown
    const lang = (r.language || 'Unknown').trim();
    if (!byLanguage[lang]) byLanguage[lang] = initBreakdown();
    byLanguage[lang].total += 1;
    if (r.isCorrect) byLanguage[lang].correct += 1; else byLanguage[lang].incorrect += 1;
  }

  // finalize accuracy
  Object.values(byLanguage).forEach(b => b.accuracy = b.total === 0 ? 0 : b.correct / b.total);
  (Object.keys(byType) as QuestionType[]).forEach(k => {
    const b = byType[k];
    b.accuracy = b.total === 0 ? 0 : b.correct / b.total;
  });

  const weaknesses = {
    languages: Object.entries(byLanguage)
      .filter(([, b]) => b.total >= 1 && b.accuracy < 0.8)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .map(([name]) => name),
    types: (Object.entries(byType) as [QuestionType, Breakdown][]) 
      .filter(([, b]) => b.total >= 1 && b.accuracy < 0.8)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .map(([name]) => name)
  };

  return { overall, byLanguage, byType, weaknesses };
}

export function computeRepoIQ(analysis: Analysis): RepoIQ {
  // Weighted by type difficulty: function-variant/select-all/order-sequence harder
  const weights: Record<QuestionType, number> = {
    'multiple-choice': 1.0,
    'fill-blank': 1.0,
    'true-false': 0.8,
    'select-all': 1.3,
    'order-sequence': 1.4,
    'function-variant': 1.5
  };

  let weightedTotal = 0;
  let weightedCorrect = 0;
  (Object.keys(analysis.byType) as QuestionType[]).forEach((t) => {
    const b = analysis.byType[t];
    const w = weights[t] || 1.0;
    weightedTotal += b.total * w;
    weightedCorrect += b.correct * w;
  });

  const base = weightedTotal === 0 ? 0 : (weightedCorrect / weightedTotal) * 100;
  // Boost slightly if user covered 3+ languages well
  const strongLangs = Object.values(analysis.byLanguage).filter(b => b.total >= 2 && b.accuracy >= 0.8).length;
  const bonus = Math.min(5, strongLangs * 1.5);
  const score = Math.round(Math.max(0, Math.min(100, base + bonus)));

  const reasoning: string[] = [];
  reasoning.push(`Accuracy weighted by difficulty: ${Math.round(base)}%`);
  if (bonus > 0) reasoning.push(`+${bonus} bonus for consistent performance across languages`);
  if (analysis.weaknesses.types.length > 0) reasoning.push(`Focus on: ${analysis.weaknesses.types.slice(0,3).join(', ')}`);

  return { score, reasoning };
}

export async function generateStrengthsWeaknesses(analysis: Analysis, results: QuestionResult[], failedQuestions: FailedQuestion[]): Promise<StrengthsWeaknesses> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Extract concepts from passed questions (strengths)
  const passedQuestions = results.filter(r => r.isCorrect);
  if (passedQuestions.length > 0) {
    const strengthConcepts = await extractConceptsFromFunctions(passedQuestions, failedQuestions, 'strengths');
    strengths.push(...strengthConcepts);
  }

  // Extract concepts from failed questions (weaknesses) - limit to 3 most recent failed questions
  if (failedQuestions.length > 0) {
    const recentFailedQuestions = failedQuestions.slice(0, 3);
    const weaknessConcepts = await extractConceptsFromFunctions([], recentFailedQuestions, 'weaknesses');
    weaknesses.push(...weaknessConcepts);
  }

  // Fallbacks if no concepts extracted
  if (strengths.length === 0) strengths.push('Steady fundamentals across categories—keep building breadth and cadence.');
  if (weaknesses.length === 0) weaknesses.push('No glaring gaps—raise the ceiling with harder variants and time‑boxed runs.');

  return { strengths, weaknesses };
}

async function extractConceptsFromFunctions(passedQuestions: QuestionResult[], failedQuestions: FailedQuestion[], type: 'strengths' | 'weaknesses'): Promise<string[]> {
  try {
    const questionsToAnalyze = type === 'strengths' ? passedQuestions : failedQuestions;
    
    if (questionsToAnalyze.length === 0) return [];

    // Prepare function data for AI analysis
    const functionData = questionsToAnalyze.slice(0, 5).map((q, index) => {
      if (type === 'strengths') {
        const result = q as QuestionResult;
        // For strengths, we need to find the corresponding failed question to get the full question content
        const correspondingFailed = failedQuestions.find(fq => fq.questionId === result.questionId);
        if (correspondingFailed && correspondingFailed.codeContext) {
          return {
            function: `Function ${index + 1}`,
            code: correspondingFailed.codeContext,
            language: result.language || 'Unknown',
            type: result.type
          };
        }
        return null;
      } else {
        const failed = q as FailedQuestion;
        if (failed.codeContext) {
          return {
            function: `Function ${index + 1}`,
            code: failed.codeContext,
            language: failed.language || 'Unknown',
            type: failed.type
          };
        }
        return null;
      }
    }).filter(Boolean);

    if (functionData.length === 0) return getFallbackConcepts(type);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a programming concept analyzer. Analyze code functions and provide detailed, specific insights about programming skills demonstrated or needed. Return ONLY a JSON array of detailed concept descriptions, no additional text.'
          },
          {
            role: 'user',
            content: `Analyze these ${type === 'strengths' ? 'functions the user got correct' : 'functions the user got wrong'} and provide 5 detailed, specific insights about the programming concepts that ${type === 'strengths' ? 'this function demonstrates understanding of' : 'this function requires understanding of'}.

Functions to analyze:
${functionData.map(f => `${f.function} (${f.language}, ${f.type}):
\`\`\`${f.language.toLowerCase()}
${f.code}
\`\`\``).join('\n\n')}

Return format: ["detailed insight 1", "detailed insight 2", "detailed insight 3", "detailed insight 4", "detailed insight 5"]

For ${type === 'strengths' ? 'strengths' : 'weaknesses'}, provide specific insights about what programming concepts ${type === 'strengths' ? 'are demonstrated by getting this function right' : 'are required to understand this function properly'}, such as:
- "Understanding of ${type === 'strengths' ? 'async/await patterns and Promise handling' : 'async/await patterns and Promise handling'}"
- "Knowledge of ${type === 'strengths' ? 'array methods and functional programming' : 'array methods and functional programming'}"
- "Grasp of ${type === 'strengths' ? 'error handling and defensive programming' : 'error handling and defensive programming'}"
- "Understanding of ${type === 'strengths' ? 'object destructuring and modern syntax' : 'object destructuring and modern syntax'}"
- "Knowledge of ${type === 'strengths' ? 'closure and scope concepts' : 'closure and scope concepts'}"

Focus on specific programming skills, patterns, and concepts that ${type === 'strengths' ? 'are demonstrated by correctly answering questions about these functions' : 'are needed to properly understand and work with these functions'}.`
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return getFallbackConcepts(type);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      return getFallbackConcepts(type);
    }

    const concepts = JSON.parse(content);
    if (Array.isArray(concepts) && concepts.length > 0) {
      return concepts.slice(0, 5);
    }

    return getFallbackConcepts(type);
  } catch (error) {
    console.error('Error extracting concepts:', error);
    return getFallbackConcepts(type);
  }
}

function getFallbackConcepts(type: 'strengths' | 'weaknesses'): string[] {
  if (type === 'strengths') {
    return [
      'Solid understanding of programming fundamentals and core concepts',
      'Good problem-solving approach and logical reasoning skills',
      'Strong code comprehension and reading abilities',
      'Effective syntax mastery and language familiarity',
      'Consistent performance across different question types'
    ];
  } else {
    return [
      'Need to improve error handling and edge case management',
      'Focus on advanced programming patterns and best practices',
      'Strengthen understanding of performance optimization techniques',
      'Enhance debugging skills and problem isolation abilities',
      'Develop deeper knowledge of complex programming concepts'
    ];
  }
}

function initBreakdown(): Breakdown {
  return { total: 0, correct: 0, incorrect: 0, accuracy: 0 };
}

export type Recommendation = {
  title: string;
  url: string;
  reason: string;
};

export type Exercise = {
  title: string;
  description: string;
};

export type Recommendations = {
  resources: Recommendation[];
  exercises: Exercise[];
};

export function generateRecommendations(analysis: Analysis): Recommendations {
  const resources: Recommendation[] = [];
  const exercises: Exercise[] = [];

  // Map languages to curated resources
  const languageResources: Record<string, Recommendation[]> = {
    'JavaScript': [
      { title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', reason: 'Strengthen core JS concepts and language mechanics.' },
      { title: 'You Don\'t Know JS (book series)', url: 'https://github.com/getify/You-Dont-Know-JS', reason: 'Deep dive into tricky JS behaviors.' }
    ],
    'TypeScript': [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', reason: 'Types, generics, and narrowing done right.' },
      { title: 'Effective TypeScript (book)', url: 'https://effectivetypescript.com/', reason: 'Best practices and patterns with TS.' }
    ],
    'Python': [
      { title: 'Python Tutorial (docs)', url: 'https://docs.python.org/3/tutorial/', reason: 'Solidify Python fundamentals and idioms.' },
      { title: 'Real Python', url: 'https://realpython.com/', reason: 'Hands-on tutorials and guides.' }
    ],
    'Go': [
      { title: 'A Tour of Go', url: 'https://go.dev/tour/welcome/1', reason: 'Language syntax and concurrency basics.' },
      { title: 'Effective Go', url: 'https://go.dev/doc/effective_go', reason: 'Write idiomatic, readable Go.' }
    ],
    'Rust': [
      { title: 'The Rust Book', url: 'https://doc.rust-lang.org/book/', reason: 'Ownership, borrowing, and lifetimes mastery.' },
      { title: 'Rust By Example', url: 'https://doc.rust-lang.org/rust-by-example/', reason: 'Examples-first learning path.' }
    ],
    'Java': [
      { title: 'The Java® Tutorials', url: 'https://docs.oracle.com/javase/tutorial/', reason: 'Core libraries and OOP concepts.' }
    ],
    'C#': [
      { title: 'C# Fundamentals (MS Docs)', url: 'https://learn.microsoft.com/dotnet/csharp/', reason: 'Language features and .NET basics.' }
    ],
    'React': [
      { title: 'React Docs – Learn', url: 'https://react.dev/learn', reason: 'Modern React mental model and patterns.' }
    ]
  };

  // Map question types to conceptual resources
  const typeResources: Record<QuestionType, Recommendation[]> = {
    'multiple-choice': [
      { title: 'Code Reading Strategies', url: 'https://martinfowler.com/ieeeSoftware/code-reading.html', reason: 'Improve careful reading and elimination strategies.' }
    ],
    'fill-blank': [
      { title: 'Clean Code Naming', url: 'https://www.oreilly.com/library/view/clean-code/9780136083238/', reason: 'Strengthen naming and API design intuition.' }
    ],
    'select-all': [
      { title: 'Trick Questions in Programming', url: 'https://jvns.ca/blog/good-questions/', reason: 'Learn to spot multiple true statements and edge cases.' }
    ],
    'order-sequence': [
      { title: 'Asynchrony & Control Flow (JS Guide)', url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous', reason: 'Reason about execution order and dependencies.' }
    ],
    'function-variant': [
      { title: 'Code Review Best Practices', url: 'https://google.github.io/eng-practices/review/reviewer/', reason: 'Evaluate different implementations critically.' }
    ],
    'true-false': [
      { title: 'Common Language Gotchas', url: 'https://github.com/denysdovhan/wtfjs', reason: 'Sharpen instincts for subtle truths.' }
    ]
  };

  // Exercises per language (parameterized where helpful)
  const languageExercises: Record<string, Exercise[]> = {
    'JavaScript': [
      { title: 'Debounce & Throttle (2 parts)', description: 'Programming exercise (2 parts)\nPoints: 2/2\n\nPart 1 — Debounce\n- Implement debounce(fn, delay) that delays calls until input settles.\n- Add options: { leading?: boolean, trailing?: boolean } with sane defaults.\n- Acceptance: write 3 tests covering rapid calls, leading=true, trailing=false.\n\nPart 2 — Throttle\n- Implement throttle(fn, interval) with leading+trailing support.\n- Acceptance: 3 tests proving at-most-one call per interval and trailing flush.' },
      { title: 'Promise Retry with Backoff', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Implement retry(fn, { attempts, baseMs }) with exponential backoff and jitter.\n- Provide cancel() to stop further retries.\n- Acceptance: mock a flaky function; verify retries, delays, and cancel behavior.' }
    ],
    'TypeScript': [
      { title: 'Type-safe API Client (2 parts)', description: 'Programming exercise (2 parts)\nPoints: 2/2\n\nPart 1 — Fetch Wrapper\n- Implement request<T>(input, init) that returns Promise<T>.\n- Parse JSON safely; surface typed errors.\n\nPart 2 — Zod Integration\n- Accept a schema to validate responses.\n- Acceptance: failing schema throws typed error; passing schema narrows T.' },
      { title: 'Discriminated Unions State Machine', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Model a login state machine with discriminated unions and exhaustive switch.\n- States: idle | pending | success | error.\n- Acceptance: compile-time exhaustiveness; unit tests for transitions.' }
    ],
    'Python': [
      { title: 'Mini ETL Pipeline', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Read CSV, transform records (normalize names, filter invalid), output JSON.\n- Acceptance: pytest for IO paths, edge rows, and schema compliance.' }
    ],
    'Go': [
      { title: 'Concurrent Worker Pool', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Build a worker pool processing jobs with context cancellation.\n- Acceptance: tests verify max concurrency, graceful shutdown, and timeouts.' }
    ],
    'Rust': [
      { title: 'CLI Todo with Result', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Build a CLI todo app; use Result for error handling, borrow when possible.\n- Acceptance: tests for add/list/complete; no panics on bad input.' }
    ],
    'React': [
      { title: 'Accessible Combobox', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Build a combobox: keyboard navigation, aria-* roles, active-descendant.\n- Acceptance: testing-library verifies keyboard focus and ARIA compliance.' }
    ]
  };

  // Exercises by type
  const typeExercises: Record<QuestionType, Exercise[]> = {
    'multiple-choice': [
      { title: 'Concept Flashcards Sprint', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Draft 10 flashcards on missed concepts with a one-sentence rationale.\n- Acceptance: spaced repetition deck; a 2-minute rapid self-quiz run.' }
    ],
    'fill-blank': [
      { title: 'Naming Refactor Kata', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Pick a 100–200 line module; improve names and function signatures.\n- Acceptance: diff with before/after and tests still pass.' }
    ],
    'select-all': [
      { title: 'Truth Table Builder', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- For 3 topics, author 5 statements each; mark all that apply with a why.\n- Acceptance: at least 15 statements with concise explanations.' }
    ],
    'order-sequence': [
      { title: 'Request Pipeline Ordering', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Sketch an async request lifecycle; place logging, auth, cache, fetch, retries.\n- Acceptance: sequence diagram plus code scaffold with TODOs.' }
    ],
    'function-variant': [
      { title: 'Compare Implementations', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Implement 2 versions; measure readability and perf on a micro-benchmark.\n- Acceptance: short write-up choosing one with trade-offs listed.' }
    ],
    'true-false': [
      { title: 'Gotcha Catalog', description: 'Programming exercise (1 part)\nPoints: 1/1\n\n- Collect 10 language gotchas with minimal repros and expected vs actual.\n- Acceptance: runnable snippets and a one-line lesson per item.' }
    ]
  };

  // Add recommendations for weak languages and types
  for (const lang of analysis.weaknesses.languages) {
    if (languageResources[lang]) resources.push(...languageResources[lang]);
    if (languageExercises[lang]) exercises.push(...languageExercises[lang]);
  }

  for (const t of analysis.weaknesses.types) {
    resources.push(...(typeResources[t] || []));
    exercises.push(...(typeExercises[t] || []));
  }

  // Fallbacks if user aced everything
  if (resources.length === 0) {
    resources.push({ title: 'Keep leveling up: Advanced Code Review', url: 'https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html', reason: 'Sharpen architectural thinking and design tradeoffs.' });
  }
  if (exercises.length === 0) {
    exercises.push({ title: 'Build something small, end-to-end', description: 'Pick a tiny app and ship it with tests and a README.' });
  }

  // De-duplicate by title
  const dedupResources = Object.values(resources.reduce((acc, r) => { acc[r.title] = r; return acc; }, {} as Record<string, Recommendation>));
  const dedupExercises = Object.values(exercises.reduce((acc, e) => { acc[e.title] = e; return acc; }, {} as Record<string, Exercise>));

  return { resources: dedupResources, exercises: dedupExercises };
}


