import { NextResponse } from 'next/server';

// Curated list of high-quality, educational repositories
const TRENDING_REPOS = [
  // Frontend Frameworks & Libraries
  {
    url: 'https://github.com/facebook/react',
    name: 'React',
    description: 'JavaScript library for building user interfaces',
    language: 'JavaScript',
    category: 'Frontend Framework',
    difficulty: 'Intermediate',
    stars: '220k+',
    topics: ['hooks', 'components', 'virtual-dom', 'jsx']
  },
  {
    url: 'https://github.com/vercel/next.js',
    name: 'Next.js',
    description: 'Full-stack React framework with SSR/SSG',
    language: 'JavaScript',
    category: 'Full-stack Framework',
    difficulty: 'Advanced',
    stars: '120k+',
    topics: ['ssr', 'routing', 'api-routes', 'optimization']
  },
  {
    url: 'https://github.com/vuejs/vue',
    name: 'Vue.js',
    description: 'Progressive JavaScript framework',
    language: 'JavaScript',
    category: 'Frontend Framework',
    difficulty: 'Beginner',
    stars: '205k+',
    topics: ['reactive', 'components', 'directives', 'router']
  },
  
  // Backend & Runtime
  {
    url: 'https://github.com/nodejs/node',
    name: 'Node.js',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    language: 'JavaScript',
    category: 'Runtime',
    difficulty: 'Advanced',
    stars: '104k+',
    topics: ['event-loop', 'streams', 'modules', 'async']
  },
  {
    url: 'https://github.com/expressjs/express',
    name: 'Express.js',
    description: 'Fast, unopinionated web framework for Node.js',
    language: 'JavaScript',
    category: 'Web Framework',
    difficulty: 'Intermediate',
    stars: '64k+',
    topics: ['middleware', 'routing', 'http', 'api']
  },
  {
    url: 'https://github.com/nestjs/nest',
    name: 'NestJS',
    description: 'Progressive Node.js framework with TypeScript',
    language: 'TypeScript',
    category: 'Backend Framework',
    difficulty: 'Advanced',
    stars: '65k+',
    topics: ['decorators', 'dependency-injection', 'microservices', 'graphql']
  },

  // Languages & Compilers
  {
    url: 'https://github.com/microsoft/TypeScript',
    name: 'TypeScript',
    description: 'Superset of JavaScript with static typing',
    language: 'TypeScript',
    category: 'Language',
    difficulty: 'Intermediate',
    stars: '98k+',
    topics: ['types', 'generics', 'interfaces', 'compiler']
  },
  {
    url: 'https://github.com/rust-lang/rust',
    name: 'Rust',
    description: 'Systems programming language focused on safety',
    language: 'Rust',
    category: 'Language',
    difficulty: 'Advanced',
    stars: '94k+',
    topics: ['memory-safety', 'concurrency', 'performance', 'ownership']
  },
  {
    url: 'https://github.com/golang/go',
    name: 'Go',
    description: 'Programming language built for efficiency',
    language: 'Go',
    category: 'Language',
    difficulty: 'Intermediate',
    stars: '120k+',
    topics: ['goroutines', 'channels', 'interfaces', 'garbage-collection']
  },

  // Development Tools
  {
    url: 'https://github.com/webpack/webpack',
    name: 'Webpack',
    description: 'Module bundler for modern JavaScript applications',
    language: 'JavaScript',
    category: 'Build Tool',
    difficulty: 'Advanced',
    stars: '64k+',
    topics: ['bundling', 'loaders', 'plugins', 'code-splitting']
  },
  {
    url: 'https://github.com/vitejs/vite',
    name: 'Vite',
    description: 'Next-generation frontend tooling',
    language: 'JavaScript',
    category: 'Build Tool',
    difficulty: 'Intermediate',
    stars: '65k+',
    topics: ['hot-reload', 'esm', 'rollup', 'dev-server']
  },
  {
    url: 'https://github.com/eslint/eslint',
    name: 'ESLint',
    description: 'Pluggable JavaScript linter',
    language: 'JavaScript',
    category: 'Developer Tool',
    difficulty: 'Intermediate',
    stars: '24k+',
    topics: ['linting', 'code-quality', 'rules', 'ast']
  },

  // Database & Storage
  {
    url: 'https://github.com/prisma/prisma',
    name: 'Prisma',
    description: 'Type-safe database toolkit',
    language: 'TypeScript',
    category: 'ORM',
    difficulty: 'Intermediate',
    stars: '37k+',
    topics: ['orm', 'database', 'migrations', 'type-safety']
  },
  {
    url: 'https://github.com/supabase/supabase',
    name: 'Supabase',
    description: 'Open source Firebase alternative',
    language: 'TypeScript',
    category: 'Backend Service',
    difficulty: 'Intermediate',
    stars: '68k+',
    topics: ['database', 'auth', 'realtime', 'storage']
  },

  // State Management & Testing
  {
    url: 'https://github.com/reduxjs/redux',
    name: 'Redux',
    description: 'Predictable state container for JavaScript apps',
    language: 'JavaScript',
    category: 'State Management',
    difficulty: 'Intermediate',
    stars: '60k+',
    topics: ['state', 'actions', 'reducers', 'middleware']
  },
  {
    url: 'https://github.com/jestjs/jest',
    name: 'Jest',
    description: 'JavaScript testing framework',
    language: 'JavaScript',
    category: 'Testing',
    difficulty: 'Intermediate',
    stars: '44k+',
    topics: ['testing', 'mocking', 'snapshots', 'coverage']
  },

  // AI/ML & Data
  {
    url: 'https://github.com/huggingface/transformers',
    name: 'Transformers',
    description: 'State-of-the-art machine learning library',
    language: 'Python',
    category: 'AI/ML',
    difficulty: 'Advanced',
    stars: '128k+',
    topics: ['nlp', 'transformers', 'pytorch', 'tensorflow']
  },
  {
    url: 'https://github.com/openai/openai-python',
    name: 'OpenAI Python',
    description: 'Official OpenAI Python library',
    language: 'Python',
    category: 'AI/ML',
    difficulty: 'Intermediate',
    stars: '20k+',
    topics: ['gpt', 'api-client', 'completions', 'embeddings']
  }
];

export async function GET() {
  try {
    console.log('📈 Fetching trending repositories list');
    
    // Group repositories by category
    const categories = TRENDING_REPOS.reduce((acc, repo) => {
      if (!acc[repo.category]) {
        acc[repo.category] = [];
      }
      acc[repo.category].push(repo);
      return acc;
    }, {} as Record<string, typeof TRENDING_REPOS>);

    console.log('✅ Returning', TRENDING_REPOS.length, 'trending repositories');
    
    return NextResponse.json({
      success: true,
      repositories: TRENDING_REPOS,
      categories: Object.keys(categories),
      categorized: categories,
      total: TRENDING_REPOS.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching trending repositories:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending repositories' },
      { status: 500 }
    );
  }
}
