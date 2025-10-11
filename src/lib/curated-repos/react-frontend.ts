import { CuratedRepo } from './types';

// React Frontend learning path - r/reactjs top repos + viral 2025
export const REACT_FRONTEND_REPOS: CuratedRepo[] = [
  // Start with React itself
  {
    name: 'React (Core)',
    url: 'https://github.com/facebook/react',
    description: 'The library for web UIs - 240k stars, learn React internals',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: '240k+',
    category: 'React Core',
    icon: '⚛️',
    isProduction: true
  },
  // State Management - r/reactjs essentials
  {
    name: 'Zustand',
    url: 'https://github.com/pmndrs/zustand',
    description: '🔥 VIRAL: Minimalist state - 48k stars, r/reactjs loves this',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '48k+',
    category: 'State Management',
    icon: '🐻',
    isProduction: true
  },
  {
    name: 'Jotai',
    url: 'https://github.com/pmndrs/jotai',
    description: 'Primitive atomic state - 18k stars, r/reactjs trending',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '18k+',
    category: 'State Management',
    icon: '👻',
    isProduction: true
  },
  {
    name: 'Redux Toolkit',
    url: 'https://github.com/reduxjs/redux-toolkit',
    description: 'Official Redux toolset - 11k stars, enterprise standard',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '11k+',
    category: 'State Management',
    icon: '🔧',
    isProduction: true
  },
  {
    name: 'Valtio',
    url: 'https://github.com/pmndrs/valtio',
    description: 'Proxy-state made simple - 9k stars, reactive magic',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '9k+',
    category: 'State Management',
    icon: '🪄',
    isProduction: true
  },
  // UI Components - r/reactjs favorites
  {
    name: 'shadcn/ui',
    url: 'https://github.com/shadcn-ui/ui',
    description: '🔥🔥 VIRAL #1: Beautiful components - 75k stars, r/reactjs obsessed',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '75k+',
    category: 'UI Library',
    icon: '🎨',
    isProduction: true
  },
  {
    name: 'Radix UI',
    url: 'https://github.com/radix-ui/primitives',
    description: 'Unstyled primitives - 15k stars, foundation of shadcn/ui',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '15k+',
    category: 'UI Primitives',
    icon: '🔷',
    isProduction: true
  },
  {
    name: 'Headless UI',
    url: 'https://github.com/tailwindlabs/headlessui',
    description: 'Tailwind components - 26k stars, r/tailwindcss essential',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '26k+',
    category: 'UI Components',
    icon: '🎯',
    isProduction: true
  },
  {
    name: 'Material UI',
    url: 'https://github.com/mui/material-ui',
    description: 'React components - 94k stars, enterprise standard',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '94k+',
    category: 'UI Library',
    icon: '🎨',
    isProduction: true
  },
  {
    name: 'Ant Design',
    url: 'https://github.com/ant-design/ant-design',
    description: 'Enterprise UI - 92k stars, used by Alibaba, Tencent',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '92k+',
    category: 'UI Library',
    icon: '🐜',
    isProduction: true
  },
  {
    name: 'Chakra UI',
    url: 'https://github.com/chakra-ui/chakra-ui',
    description: 'Accessible components - 38k stars, r/reactjs favorite',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '38k+',
    category: 'UI Library',
    icon: '⚡',
    isProduction: true
  },
  // Data & Forms - r/reactjs essentials
  {
    name: 'TanStack Query',
    url: 'https://github.com/TanStack/query',
    description: 'Powerful data sync - 42k stars, r/reactjs essential',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '42k+',
    category: 'Data Fetching',
    icon: '🔄',
    isProduction: true
  },
  {
    name: 'React Hook Form',
    url: 'https://github.com/react-hook-form/react-hook-form',
    description: 'Performant forms - 42k stars, r/reactjs best forms',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '42k+',
    category: 'Forms',
    icon: '📝',
    isProduction: true
  },
  {
    name: 'React Table',
    url: 'https://github.com/TanStack/table',
    description: 'Headless tables - 25k stars, enterprise data grids',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '25k+',
    category: 'Data Tables',
    icon: '📋',
    isProduction: true
  },
  {
    name: 'SWR',
    url: 'https://github.com/vercel/swr',
    description: 'React Hooks for data fetching - 30k stars, Vercel magic',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '30k+',
    category: 'Data Fetching',
    icon: '🎣',
    isProduction: true
  },
  // Animation - r/reactjs creative
  {
    name: 'Framer Motion',
    url: 'https://github.com/framer/motion',
    description: '🔥 VIRAL: Production animations - 24k stars, Netflix, Spotify use it',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '24k+',
    category: 'Animation',
    icon: '🎬',
    isProduction: true
  },
  {
    name: 'React Spring',
    url: 'https://github.com/pmndrs/react-spring',
    description: 'Spring-physics - 28k stars, r/reactjs creative choice',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '28k+',
    category: 'Animation',
    icon: '🌸',
    isProduction: true
  },
  {
    name: 'Auto Animate',
    url: 'https://github.com/formkit/auto-animate',
    description: '🔥 VIRAL: Zero-config animations - 12k stars, r/reactjs trending',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '12k+',
    category: 'Animation',
    icon: '✨',
    isProduction: true
  },
  // Charts & Visualization
  {
    name: 'Recharts',
    url: 'https://github.com/recharts/recharts',
    description: 'React charts - 24k stars, Airbnb standard',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '24k+',
    category: 'Charts',
    icon: '📊',
    isProduction: true
  },
  {
    name: 'Victory',
    url: 'https://github.com/FormidableLabs/victory',
    description: 'Composable chart library - 11k stars, r/dataviz favorite',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '11k+',
    category: 'Charts',
    icon: '🏆',
    isProduction: true
  },
  // Testing - r/reactjs quality
  {
    name: 'React Testing Library',
    url: 'https://github.com/testing-library/react-testing-library',
    description: 'Simple testing - 19k stars, r/reactjs standard',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '19k+',
    category: 'Testing',
    icon: '🧪',
    isProduction: true
  },
  {
    name: 'Vitest',
    url: 'https://github.com/vitest-dev/vitest',
    description: '🔥 VIRAL: Vite-native testing - 13k stars, blazing fast',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '13k+',
    category: 'Testing',
    icon: '⚡',
    isProduction: true
  },
  // Modern Tools - r/reactjs 2025 hype
  {
    name: 'React Email',
    url: 'https://github.com/resend/react-email',
    description: '🔥🔥 VIRAL: Build emails in React - 14k stars, r/reactjs game changer',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '14k+',
    category: 'Email',
    icon: '📧',
    isProduction: true
  },
  {
    name: 'Million.js',
    url: 'https://github.com/aidenybai/million',
    description: '🔥 VIRAL: 70% faster React - 16k stars, r/reactjs performance king',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '16k+',
    category: 'Performance',
    icon: '⚡',
    isProduction: true
  },
  {
    name: 'React Aria',
    url: 'https://github.com/adobe/react-spectrum',
    description: 'Adobe accessibility - 13k stars, a11y gold standard',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '13k+',
    category: 'Accessibility',
    icon: '♿',
    isProduction: true
  },
  {
    name: 'React DnD',
    url: 'https://github.com/react-dnd/react-dnd',
    description: 'Drag and drop - 21k stars, used by Trello, Notion',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '21k+',
    category: 'Interaction',
    icon: '🖱️',
    isProduction: true
  },
  {
    name: 'React Router',
    url: 'https://github.com/remix-run/react-router',
    description: 'Declarative routing - 53k stars, routing standard',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: '53k+',
    category: 'Routing',
    icon: '🛣️',
    isProduction: true
  },
  {
    name: 'React Three Fiber',
    url: 'https://github.com/pmndrs/react-three-fiber',
    description: '3D in React - 27k stars, r/threejs React renderer',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '27k+',
    category: '3D Graphics',
    icon: '🎮',
    isProduction: true
  },
  {
    name: 'Remotion',
    url: 'https://github.com/remotion-dev/remotion',
    description: '🔥 VIRAL: Video with React - 20k stars, r/reactjs mind-blowing',
    language: 'TypeScript',
    difficulty: 'Advanced',
    stars: '20k+',
    category: 'Video',
    icon: '🎥',
    isProduction: true
  }
];

