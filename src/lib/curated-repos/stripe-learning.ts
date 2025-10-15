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
    name: 'Stripe Checkout Single Subscription',
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
    name: 'Stripe Payment Element',
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
    name: 'Stripe Webhook Verification',
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
    name: 'Stripe Checkout One-time Payments',
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
    name: 'Stripe Subscription Use Cases',
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
    name: 'Stripe Marketplace',
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
    name: 'Stripe Tax Calculation',
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
    name: 'Stripe Invoice Generation',
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
    name: 'Stripe Customer Portal',
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
    name: 'Stripe Fraud Prevention',
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
    name: 'Stripe Multi-Currency',
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
    name: 'Stripe Reporting',
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
    name: 'Stripe Connect Onboarding',
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
    name: 'Stripe Custom Payment Flow',
    url: 'https://github.com/stripe-samples/custom-payment-flow',
    description: 'Custom payment integration - learn advanced API patterns',
    language: 'JavaScript',
    difficulty: 'Expert',
    stars: 'Official',
    category: 'Custom Integration',
    icon: '⚙️',
    isProduction: true
  },
  {
    name: 'Stripe Connect Custom Accounts',
    url: 'https://github.com/stripe-samples/connect-account-onboarding',
    description: 'Connect custom accounts - learn advanced marketplace patterns',
    language: 'JavaScript',
    difficulty: 'Expert',
    stars: 'Official',
    category: 'Connect Accounts',
    icon: '🏪',
    isProduction: true
  },

  // Full-Stack Project Examples
  {
    name: 'Stripe Next.js TypeScript',
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
    name: 'Stripe Django Payment Intents',
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
    name: 'Stripe React Native',
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
    name: 'Stripe Serverless Functions',
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
    name: 'Stripe Microservices Payments',
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
