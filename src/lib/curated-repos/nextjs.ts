import { CuratedRepo } from './types';

// Next.js production repos for learning path - r/nextjs favorites
export const NEXTJS_REPOS: CuratedRepo[] = [
  // Start with the core framework itself
  {
    name: 'Next.js Framework (Core)',
    url: 'https://github.com/vercel/next.js',
    description: 'The React Framework for Production - learn Next.js internals, App Router, Server Components',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '128k+',
    category: 'Framework Core',
    icon: '▲',
    isProduction: true
  },
  
  // Production SaaS Applications
  {
    name: 'Cal.com',
    url: 'https://github.com/calcom/cal.com',
    description: 'Open-source Calendly alternative - 32k stars, r/nextjs top SaaS',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '32k+',
    category: 'SaaS Platform',
    icon: '📅',
    isProduction: true
  },
  {
    name: 'Dub',
    url: 'https://github.com/dubinc/dub',
    description: '🔥 VIRAL: Link management - 18k stars, r/nextjs trending',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '18k+',
    category: 'SaaS Platform',
    icon: '🔗',
    isProduction: true
  },
  {
    name: 'Plane',
    url: 'https://github.com/makeplane/plane',
    description: 'Open-source Jira alternative - 30k stars, r/nextjs project management',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '30k+',
    category: 'Project Management',
    icon: '✈️',
    isProduction: true
  },
  {
    name: 'Formbricks',
    url: 'https://github.com/formbricks/formbricks',
    description: 'Open-source survey platform - 7k stars, Typeform alternative',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '7k+',
    category: 'Survey Platform',
    icon: '📝',
    isProduction: true
  },
  {
    name: 'Documenso',
    url: 'https://github.com/documenso/documenso',
    description: 'Open-source DocuSign alternative - 8k stars',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '8k+',
    category: 'Document Platform',
    icon: '📄',
    isProduction: true
  },
  
  // E-commerce & Business
  {
    name: 'Vercel Commerce',
    url: 'https://github.com/vercel/commerce',
    description: 'Next.js commerce template with Shopify - 11k stars',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '11k+',
    category: 'E-commerce',
    icon: '🛍️',
    isProduction: true
  },
  {
    name: 'Taxonomy (shadcn)',
    url: 'https://github.com/shadcn-ui/taxonomy',
    description: 'Modern Next.js 13+ starter - 18k stars, r/nextjs SaaS template',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '18k+',
    category: 'SaaS Starter',
    icon: '🚀',
    isProduction: true
  },
  {
    name: 'Next.js Subscription Payments',
    url: 'https://github.com/vercel/nextjs-subscription-payments',
    description: 'Subscription payments with Stripe - 6k stars, r/nextjs payments',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '6k+',
    category: 'Payments',
    icon: '💳',
    isProduction: true
  },
  
  // Content & CMS
  {
    name: 'Hashnode',
    url: 'https://github.com/Hashnode/starter-kit',
    description: 'Next.js blog starter kit - 5k stars, headless CMS',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '5k+',
    category: 'Blog Platform',
    icon: '📝',
    isProduction: true
  },
  {
    name: 'Mintlify',
    url: 'https://github.com/mintlify/starter',
    description: 'Beautiful documentation - 3k stars, r/nextjs docs platform',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '3k+',
    category: 'Documentation',
    icon: '📚',
    isProduction: true
  },
  {
    name: 'Novel (Notion Editor)',
    url: 'https://github.com/steven-tey/novel',
    description: '🔥 VIRAL: Notion-style editor - 13k stars, r/nextjs AI-powered',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '13k+',
    category: 'Editor',
    icon: '✍️',
    isProduction: true
  },
  
  // AI & Developer Tools
  {
    name: 'ChatGPT UI',
    url: 'https://github.com/mckaywrigley/chatbot-ui',
    description: '🔥 VIRAL: ChatGPT UI - 28k stars, r/nextjs AI chat',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '28k+',
    category: 'AI Platform',
    icon: '🤖',
    isProduction: true
  },
  {
    name: 'Vercel AI SDK',
    url: 'https://github.com/vercel/ai',
    description: 'Build AI apps - 10k stars, r/nextjs AI essential',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '10k+',
    category: 'AI SDK',
    icon: '🧠',
    isProduction: true
  },
  {
    name: 'OpenStatus',
    url: 'https://github.com/openstatusHQ/openstatus',
    description: 'Status page platform - 6k stars, monitoring',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '6k+',
    category: 'Monitoring',
    icon: '📊',
    isProduction: true
  },
  
  // Platform & Infrastructure
  {
    name: 'Vercel Platforms',
    url: 'https://github.com/vercel/platforms',
    description: 'Multi-tenant platform - 6k stars, build Substack/Medium',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '6k+',
    category: 'Multi-tenant',
    icon: '🏢',
    isProduction: true
  },
  {
    name: 'Next.js App Router Examples',
    url: 'https://github.com/vercel/next.js/tree/canary/examples',
    description: 'Official examples - 128k stars, covers every feature',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '128k+',
    category: 'Examples',
    icon: '📘',
    isProduction: true
  },
  
  // UI Component Libraries
  {
    name: 'shadcn/ui',
    url: 'https://github.com/shadcn-ui/ui',
    description: '🔥🔥 VIRAL: Radix + Tailwind - 75k stars, r/nextjs obsessed',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '75k+',
    category: 'UI Library',
    icon: '🎨',
    isProduction: true
  },
  {
    name: 'Next UI',
    url: 'https://github.com/nextui-org/nextui',
    description: 'Modern React UI library - 22k stars, r/nextjs beautiful',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '22k+',
    category: 'UI Library',
    icon: '🎨',
    isProduction: true
  },
  
  // Analytics & Marketing
  {
    name: 'Plausible Analytics',
    url: 'https://github.com/plausible/analytics',
    description: 'Privacy-friendly analytics - 20k stars, Google Analytics alternative',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '20k+',
    category: 'Analytics',
    icon: '📊',
    isProduction: true
  }
];

