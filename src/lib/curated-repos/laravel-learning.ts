import { type CuratedRepo } from './types';

export const LARAVEL_LEARNING_PATH: CuratedRepo[] = [
  // Beginner - Laravel Fundamentals
  {
    name: 'Laravel Framework',
    url: 'https://github.com/laravel/laravel',
    description: 'The PHP framework for web artisans - 75k+ stars, learn the fundamentals',
    language: 'PHP',
    difficulty: 'Beginner',
    stars: '75k+',
    category: 'Core Framework',
    icon: '🚀',
    isProduction: true
  },
  {
    name: 'Laravel Documentation',
    url: 'https://github.com/laravel/docs',
    description: 'Official Laravel documentation repository - 2k+ stars, learn routing and controllers',
    language: 'Markdown',
    difficulty: 'Beginner',
    stars: '2k+',
    category: 'Documentation',
    icon: '📚',
    isProduction: true
  },
  {
    name: 'Laravel Breeze',
    url: 'https://github.com/laravel/breeze',
    description: 'Minimal Laravel authentication starter kit - 3k+ stars, learn auth basics',
    language: 'PHP',
    difficulty: 'Beginner',
    stars: '3k+',
    category: 'Authentication',
    icon: '🔐',
    isProduction: true
  },

  // Beginner Projects - Basic Applications
  {
    name: 'Laravel UI',
    url: 'https://github.com/laravel/ui',
    description: 'Frontend scaffolding for Laravel - 2k+ stars, learn UI integration',
    language: 'PHP',
    difficulty: 'Beginner',
    stars: '2k+',
    category: 'Frontend Integration',
    icon: '🎨',
    isProduction: true
  },
  {
    name: 'Laravel Jetstream',
    url: 'https://github.com/laravel/jetstream',
    description: 'Beautiful application scaffolding - 4k+ stars, learn modern Laravel patterns',
    language: 'PHP',
    difficulty: 'Beginner',
    stars: '4k+',
    category: 'Application Scaffolding',
    icon: '✈️',
    isProduction: true
  },
  {
    name: 'Laravel Fortify',
    url: 'https://github.com/laravel/fortify',
    description: 'Backend authentication implementation - 3k+ stars, learn auth backends',
    language: 'PHP',
    difficulty: 'Beginner',
    stars: '3k+',
    category: 'Authentication Backend',
    icon: '🏰',
    isProduction: true
  },

  // Intermediate - Advanced Features
  {
    name: 'Laravel Sanctum',
    url: 'https://github.com/laravel/sanctum',
    description: 'Laravel Sanctum provides authentication for SPAs - 4k+ stars',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: '4k+',
    category: 'API Authentication',
    icon: '🛡️',
    isProduction: true
  },
  {
    name: 'Laravel Livewire',
    url: 'https://github.com/livewire/livewire',
    description: 'Full-stack framework for Laravel - 22k+ stars, build dynamic UIs',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: '22k+',
    category: 'Full-Stack Framework',
    icon: '⚡',
    isProduction: true
  },
  {
    name: 'Laravel Broadcasting',
    url: 'https://github.com/laravel/broadcasting',
    description: 'Real-time events with WebSockets - learn real-time features',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Real-time',
    icon: '📡',
    isProduction: true
  },
  {
    name: 'Laravel Echo',
    url: 'https://github.com/laravel/echo',
    description: 'JavaScript library for WebSocket connections - 7k+ stars',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: '7k+',
    category: 'Real-time Client',
    icon: '📻',
    isProduction: true
  },
  {
    name: 'Laravel Queue',
    url: 'https://github.com/laravel/queue',
    description: 'Queue service for Laravel - learn background job processing',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Background Jobs',
    icon: '⏳',
    isProduction: true
  },

  // Intermediate Projects - Real Applications
  {
    name: 'Bagisto E-commerce',
    url: 'https://github.com/bagisto/bagisto',
    description: 'Free and open source e-commerce platform built with Laravel - 8k+ stars',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: '8k+',
    category: 'E-commerce',
    icon: '🛒',
    isProduction: true
  },
  {
    name: 'Laravel Filament',
    url: 'https://github.com/filamentphp/filament',
    description: 'Beautiful admin panel for Laravel - 15k+ stars, learn admin interfaces',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: '15k+',
    category: 'Admin Panel',
    icon: '📊',
    isProduction: true
  },
  {
    name: 'Laravel Orchid',
    url: 'https://github.com/orchidsoftware/platform',
    description: 'Administrative interface for Laravel - 4k+ stars, alternative admin panel',
    language: 'PHP',
    difficulty: 'Intermediate',
    stars: '4k+',
    category: 'Admin Panel',
    icon: '🌺',
    isProduction: true
  },

  // Advanced - Production Features
  {
    name: 'Laravel Nova',
    url: 'https://github.com/laravel/nova',
    description: 'Beautiful admin panel for Laravel - learn admin interfaces',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '5k+',
    category: 'Admin Panel',
    icon: '👑',
    isProduction: true
  },
  {
    name: 'Laravel Cashier',
    url: 'https://github.com/laravel/cashier',
    description: 'Subscription billing with Stripe - 3k+ stars, learn SaaS billing',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '3k+',
    category: 'Subscription Billing',
    icon: '💳',
    isProduction: true
  },
  {
    name: 'Laravel Horizon',
    url: 'https://github.com/laravel/horizon',
    description: 'Queue monitoring dashboard - 5k+ stars, learn background jobs',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '5k+',
    category: 'Queue Monitoring',
    icon: '🌅',
    isProduction: true
  },
  {
    name: 'Laravel Telescope',
    url: 'https://github.com/laravel/telescope',
    description: 'Debug assistant for Laravel - 5k+ stars, learn debugging',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '5k+',
    category: 'Debugging',
    icon: '🔭',
    isProduction: true
  },

  // Advanced Projects - Production Applications
  {
    name: 'Laravel Tenancy',
    url: 'https://github.com/stancl/tenancy',
    description: 'Multi-tenant Laravel applications - 3k+ stars, learn tenancy patterns',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '3k+',
    category: 'Multi-tenancy',
    icon: '🏢',
    isProduction: true
  },
  {
    name: 'Laravel Packager',
    url: 'https://github.com/Jeroen-G/laravel-packager',
    description: 'Laravel package development tool - 1k+ stars, learn package creation',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '1k+',
    category: 'Package Development',
    icon: '📦',
    isProduction: true
  },
  {
    name: 'Laravel Tinker',
    url: 'https://github.com/laravel/tinker',
    description: 'Interactive REPL for Laravel - 2k+ stars, learn debugging and testing',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '2k+',
    category: 'Development Tools',
    icon: '🔧',
    isProduction: true
  },

  // Expert - Enterprise Features
  {
    name: 'Laravel Passport',
    url: 'https://github.com/laravel/passport',
    description: 'OAuth2 server implementation - 3k+ stars, learn API authentication',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '3k+',
    category: 'OAuth2 Server',
    icon: '🎫',
    isProduction: true
  },
  {
    name: 'Laravel Scout',
    url: 'https://github.com/laravel/scout',
    description: 'Full-text search for Eloquent - 2k+ stars, learn search integration',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '2k+',
    category: 'Full-text Search',
    icon: '🔍',
    isProduction: true
  },
  {
    name: 'Laravel Socialite',
    url: 'https://github.com/laravel/socialite',
    description: 'Social authentication for Laravel - 5k+ stars, learn OAuth',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '5k+',
    category: 'Social Auth',
    icon: '🌐',
    isProduction: true
  },
  {
    name: 'Laravel Vapor',
    url: 'https://github.com/laravel/vapor',
    description: 'Serverless deployment for Laravel - learn AWS Lambda deployment',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '1k+',
    category: 'Serverless',
    icon: '☁️',
    isProduction: true
  },

  // Expert Projects - Enterprise Applications
  {
    name: 'Laravel Dusk',
    url: 'https://github.com/laravel/dusk',
    description: 'Laravel browser automation and testing - 2k+ stars, learn E2E testing',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '2k+',
    category: 'Browser Testing',
    icon: '🌅',
    isProduction: true
  },
  {
    name: 'Laravel Valet',
    url: 'https://github.com/laravel/valet',
    description: 'Laravel development environment - 4k+ stars, learn local development',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '4k+',
    category: 'Development Environment',
    icon: '🏎️',
    isProduction: true
  },
  {
    name: 'Laravel Sail',
    url: 'https://github.com/laravel/sail',
    description: 'Laravel development environment using Docker - 1k+ stars, learn containerized dev',
    language: 'PHP',
    difficulty: 'Expert',
    stars: '1k+',
    category: 'Docker Development',
    icon: '⛵',
    isProduction: true
  }
];
