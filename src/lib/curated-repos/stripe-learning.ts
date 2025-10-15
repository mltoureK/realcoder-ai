import { type CuratedRepo } from './types';

export const STRIPE_LEARNING_PATH: CuratedRepo[] = [
  // Beginner - Stripe Fundamentals & Official SDKs
  {
    name: 'Stripe Node.js SDK',
    url: 'https://github.com/stripe/stripe-node',
    description: 'Official Stripe SDK for Node.js - 4k+ stars, learn server-side payment processing',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: '4k+',
    category: 'Official SDK',
    icon: '🟢',
    isProduction: true
  },
  {
    name: 'Stripe Python SDK',
    url: 'https://github.com/stripe/stripe-python',
    description: 'Official Stripe SDK for Python - 2k+ stars, Django/Flask payment integration',
    language: 'Python',
    difficulty: 'Beginner',
    stars: '2k+',
    category: 'Official SDK',
    icon: '🐍',
    isProduction: true
  },
  {
    name: 'Stripe React Elements',
    url: 'https://github.com/stripe/react-stripe-js',
    description: 'Official React components for Stripe - 3k+ stars, beautiful payment forms',
    language: 'TypeScript',
    difficulty: 'Beginner',
    stars: '3k+',
    category: 'Official SDK',
    icon: '⚛️',
    isProduction: true
  },

  // Beginner Projects - Simple Payment Flows
  {
    name: 'Stripe Checkout Demo',
    url: 'https://github.com/stripe-samples/checkout-single-subscription',
    description: 'Simple subscription checkout - learn one-time and recurring payments',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: 'Official',
    category: 'Demo Project',
    icon: '💳',
    isProduction: true
  },
  {
    name: 'Payment Element Demo',
    url: 'https://github.com/stripe-samples/payment-element',
    description: 'Modern payment form with Payment Element - learn the latest Stripe UI',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: 'Official',
    category: 'Demo Project',
    icon: '🎨',
    isProduction: true
  },
  {
    name: 'Webhook Demo',
    url: 'https://github.com/stripe-samples/webhook-signature-verification',
    description: 'Webhook signature verification - learn secure event handling',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: 'Official',
    category: 'Security',
    icon: '🔒',
    isProduction: true
  },

  // Intermediate - E-commerce & Subscriptions
  {
    name: 'E-commerce Store',
    url: 'https://github.com/stripe-samples/checkout-one-time-payments',
    description: 'Complete e-commerce checkout - learn shopping cart integration',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'E-commerce',
    icon: '🛒',
    isProduction: true
  },
  {
    name: 'SaaS Subscription App',
    url: 'https://github.com/stripe-samples/subscription-use-cases',
    description: 'Full SaaS subscription management - learn recurring billing patterns',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'SaaS',
    icon: '📊',
    isProduction: true
  },
  {
    name: 'Marketplace Demo',
    url: 'https://github.com/stripe-samples/marketplace',
    description: 'Multi-party marketplace - learn Connect platform and split payments',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Marketplace',
    icon: '🏪',
    isProduction: true
  },

  // Intermediate - Advanced Features
  {
    name: 'Tax Calculation Demo',
    url: 'https://github.com/stripe-samples/tax-calculation',
    description: 'Automated tax calculation - learn international tax handling',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Tax',
    icon: '🧮',
    isProduction: true
  },
  {
    name: 'Invoice Generation',
    url: 'https://github.com/stripe-samples/invoice-generation',
    description: 'Automated invoice creation - learn billing and invoicing workflows',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Invoicing',
    icon: '📄',
    isProduction: true
  },
  {
    name: 'Customer Portal',
    url: 'https://github.com/stripe-samples/customer-portal',
    description: 'Self-service customer portal - learn subscription management UI',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Customer Portal',
    icon: '👤',
    isProduction: true
  },

  // Advanced - Production Patterns
  {
    name: 'Fraud Prevention',
    url: 'https://github.com/stripe-samples/fraud-prevention',
    description: 'Advanced fraud detection - learn Radar rules and risk management',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: 'Official',
    category: 'Security',
    icon: '🛡️',
    isProduction: true
  },
  {
    name: 'Multi-Currency Support',
    url: 'https://github.com/stripe-samples/multi-currency',
    description: 'International payments - learn currency conversion and localization',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: 'Official',
    category: 'International',
    icon: '🌍',
    isProduction: true
  },
  {
    name: 'Payment Analytics',
    url: 'https://github.com/stripe-samples/reporting',
    description: 'Payment reporting dashboard - learn analytics and business intelligence',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: 'Official',
    category: 'Analytics',
    icon: '📈',
    isProduction: true
  },

  // Expert - Enterprise Features
  {
    name: 'Connect Platform',
    url: 'https://github.com/stripe-samples/connect-onboarding-for-marketplaces',
    description: 'Full Connect platform - learn multi-party payment orchestration',
    language: 'JavaScript',
    difficulty: 'Expert',
    stars: 'Official',
    category: 'Connect Platform',
    icon: '🔗',
    isProduction: true
  },
  {
    name: 'Advanced Webhooks',
    url: 'https://github.com/stripe-samples/webhook-signature-verification',
    description: 'Production webhook handling - learn event processing at scale',
    language: 'JavaScript',
    difficulty: 'Expert',
    stars: 'Official',
    category: 'Webhooks',
    icon: '🪝',
    isProduction: true
  },
  {
    name: 'Custom Payment Flow',
    url: 'https://github.com/stripe-samples/custom-payment-flow',
    description: 'Custom payment integration - learn advanced API patterns',
    language: 'JavaScript',
    difficulty: 'Expert',
    stars: 'Official',
    category: 'Custom Integration',
    icon: '⚙️',
    isProduction: true
  },

  // Full-Stack Project Examples
  {
    name: 'Next.js E-commerce',
    url: 'https://github.com/stripe-samples/nextjs-typescript-react',
    description: 'Full-stack Next.js e-commerce - learn modern React payment integration',
    language: 'TypeScript',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Full-Stack',
    icon: '🚀',
    isProduction: true
  },
  {
    name: 'Django Payment App',
    url: 'https://github.com/stripe-samples/django-payment-intents',
    description: 'Python Django payment app - learn backend payment processing',
    language: 'Python',
    difficulty: 'Intermediate',
    stars: 'Official',
    category: 'Full-Stack',
    icon: '🐍',
    isProduction: true
  },
  {
    name: 'React Native Payments',
    url: 'https://github.com/stripe-samples/react-native',
    description: 'Mobile payment app - learn cross-platform payment integration',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: 'Official',
    category: 'Mobile',
    icon: '📱',
    isProduction: true
  },

  // Advanced Full-Stack Projects
  {
    name: 'Serverless Payments',
    url: 'https://github.com/stripe-samples/serverless-functions',
    description: 'AWS Lambda payment processing - learn serverless payment architecture',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: 'Official',
    category: 'Serverless',
    icon: '☁️',
    isProduction: true
  },
  {
    name: 'Microservices Payments',
    url: 'https://github.com/stripe-samples/microservices-payments',
    description: 'Distributed payment system - learn microservices payment patterns',
    language: 'JavaScript',
    difficulty: 'Expert',
    stars: 'Official',
    category: 'Microservices',
    icon: '🔧',
    isProduction: true
  }
];
