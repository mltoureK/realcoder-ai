'use client';

import { useState, useEffect, useRef } from 'react';

interface CuratedRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  stars: string;
  category: string;
  icon: string;
  isProduction: boolean;
}

const CURATED_REPOS: { [key: string]: CuratedRepo[] } = {
  'JavaScript': [
    // Real-World Full-Stack Apps
    {
      name: 'ReactJS-Spring-Boot-CRUD',
      url: 'https://github.com/RameshMF/ReactJS-Spring-Boot-CRUD-Full-Stack-App',
      description: 'Full-stack CRUD application using React frontend and Spring Boot backend - 711 stars',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '711',
      category: 'Full-Stack App',
      icon: '🚀',
      isProduction: true
    },
    {
      name: 'RealWorld',
      url: 'https://github.com/gothinkster/realworld',
      description: 'The mother of all demo apps - Exemplifies full-stack apps built with different frontends/backends',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '80k+',
      category: 'Full-Stack App',
      icon: '🌍',
      isProduction: true
    },
    {
      name: 'FreeCodeCamp',
      url: 'https://github.com/freeCodeCamp/freeCodeCamp',
      description: 'FreeCodeCamp.org\'s open source codebase and curriculum - 400k+ stars',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '400k+',
      category: 'Education Platform',
      icon: '📚',
      isProduction: true
    },
    {
      name: 'Ghost',
      url: 'https://github.com/TryGhost/Ghost',
      description: 'Turn your audience into a business. Publishing, memberships, subscriptions and newsletters',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '45k+',
      category: 'CMS Platform',
      icon: '👻',
      isProduction: true
    },
    {
      name: 'Meteor',
      url: 'https://github.com/meteor/meteor',
      description: 'Meteor, the JavaScript App Platform - used by companies like Qualcomm, IKEA',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '44k+',
      category: 'Full-Stack Platform',
      icon: '☄️',
      isProduction: true
    },

    // Animation & Graphics Libraries
    {
      name: 'Framer Motion',
      url: 'https://github.com/framer/motion',
      description: 'A production-ready motion library for React - used by Netflix, Airbnb, Spotify',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '25k+',
      category: 'Animation Library',
      icon: '🎬',
      isProduction: true
    },
    {
      name: 'Lottie',
      url: 'https://github.com/airbnb/lottie-web',
      description: 'Render After Effects animations on the web - used by Airbnb, Google, Microsoft',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '18k+',
      category: 'Animation Library',
      icon: '🎨',
      isProduction: true
    },
    {
      name: 'GSAP',
      url: 'https://github.com/greensock/GSAP',
      description: 'Professional-grade animation library for the modern web - used by Disney, Google, Apple',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '18k+',
      category: 'Animation Library',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Three.js',
      url: 'https://github.com/mrdoob/three.js',
      description: 'JavaScript 3D library - used by Google, Microsoft, NASA',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '95k+',
      category: '3D Graphics',
      icon: '🎮',
      isProduction: true
    },
    {
      name: 'A-Frame',
      url: 'https://github.com/aframevr/aframe',
      description: 'Web framework for building virtual reality experiences - used by Mozilla, Google',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '16k+',
      category: 'VR Framework',
      icon: '🥽',
      isProduction: true
    },

    // Search Engines & Data
    {
      name: 'Algolia Places',
      url: 'https://github.com/algolia/places',
      description: 'Turn any input into an address autocomplete - used by Airbnb, Stripe, Slack',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '1k+',
      category: 'Search Engine',
      icon: '🔍',
      isProduction: true
    },
    {
      name: 'Elasticsearch.js',
      url: 'https://github.com/elastic/elasticsearch-js',
      description: 'Official Elasticsearch client for Node.js - used by GitHub, Stack Overflow',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '1k+',
      category: 'Search Engine',
      icon: '🔎',
      isProduction: true
    },
    {
      name: 'Lunr.js',
      url: 'https://github.com/olivernn/lunr.js',
      description: 'A bit like Solr, but much smaller and not as bright - used by Jekyll, GitBook',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '8k+',
      category: 'Search Engine',
      icon: '🌙',
      isProduction: true
    },
    {
      name: 'Fuse.js',
      url: 'https://github.com/krisk/Fuse',
      description: 'Lightweight fuzzy-search library - used by VS Code, Slack',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '20k+',
      category: 'Search Engine',
      icon: '🔍',
      isProduction: true
    },

    // Finance & Trading Apps
    {
      name: 'TradingView',
      url: 'https://github.com/tradingview/charting_library',
      description: 'TradingView Charting Library - used by Binance, Coinbase, Robinhood',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '8k+',
      category: 'Finance App',
      icon: '📈',
      isProduction: true
    },
    {
      name: 'Yahoo Finance API',
      url: 'https://github.com/gadicc/node-yahoo-finance2',
      description: 'Yahoo Finance API for Node.js - used by financial applications',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '1k+',
      category: 'Finance API',
      icon: '💰',
      isProduction: true
    },
    {
      name: 'Crypto Trading Bot',
      url: 'https://github.com/ccxt/ccxt',
      description: 'A JavaScript / Python / PHP cryptocurrency trading API with support for 100+ exchanges',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '30k+',
      category: 'Crypto Trading',
      icon: '₿',
      isProduction: true
    },
    {
      name: 'Stripe.js',
      url: 'https://github.com/stripe/stripe-js',
      description: 'Stripe JavaScript SDK - used by millions of businesses for payments',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '1k+',
      category: 'Payment Processing',
      icon: '💳',
      isProduction: true
    },

    // Production Frameworks
    {
      name: 'Express',
      url: 'https://github.com/expressjs/express',
      description: 'Fast, unopinionated, minimalist web framework for Node.js - used by Uber, Netflix',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '65k+',
      category: 'Backend Framework',
      icon: '🚀',
      isProduction: true
    },
    {
      name: 'Koa',
      url: 'https://github.com/koajs/koa',
      description: 'Next generation web framework for Node.js - used by Alibaba, Tencent',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '35k+',
      category: 'Backend Framework',
      icon: '🌊',
      isProduction: true
    },
    {
      name: 'Fastify',
      url: 'https://github.com/fastify/fastify',
      description: 'Fast and low overhead web framework for Node.js - used by Microsoft, IBM',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '30k+',
      category: 'Backend Framework',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'NestJS',
      url: 'https://github.com/nestjs/nest',
      description: 'A progressive Node.js framework for building efficient and scalable server-side applications',
      language: 'TypeScript',
      difficulty: 'Advanced',
      stars: '65k+',
      category: 'Backend Framework',
      icon: '🏗️',
      isProduction: true
    },

    // Data Visualization
    {
      name: 'D3.js',
      url: 'https://github.com/d3/d3',
      description: 'Bring data to life with SVG, Canvas and HTML - used by New York Times, Bloomberg',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '110k+',
      category: 'Data Visualization',
      icon: '📊',
      isProduction: true
    },
    {
      name: 'Chart.js',
      url: 'https://github.com/chartjs/Chart.js',
      description: 'Simple yet flexible JavaScript charting for designers & developers - used by millions',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '65k+',
      category: 'Charts',
      icon: '📈',
      isProduction: true
    },
    {
      name: 'Observable Plot',
      url: 'https://github.com/observablehq/plot',
      description: 'A concise API for exploratory data visualization - used by Observable, GitHub',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '3k+',
      category: 'Data Visualization',
      icon: '📊',
      isProduction: true
    },
    {
      name: 'Recharts',
      url: 'https://github.com/recharts/recharts',
      description: 'Redefined chart library built with React and D3 - used by Airbnb, Netflix',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '22k+',
      category: 'React Charts',
      icon: '📊',
      isProduction: true
    },

    // Real-time & WebSocket
    {
      name: 'Socket.io',
      url: 'https://github.com/socketio/socket.io',
      description: 'Realtime application framework for Node.js - used by Microsoft, Zendesk',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '65k+',
      category: 'Real-time',
      icon: '🔌',
      isProduction: true
    },
    {
      name: 'Pusher',
      url: 'https://github.com/pusher/pusher-js',
      description: 'Pusher JavaScript client - used by GitHub, Mailchimp, Buffer',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '1k+',
      category: 'Real-time',
      icon: '📡',
      isProduction: true
    },
    {
      name: 'Ably',
      url: 'https://github.com/ably/ably-js',
      description: 'Ably JavaScript client library - used by BBC, HubSpot, Cisco',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '200+',
      category: 'Real-time',
      icon: '⚡',
      isProduction: true
    },

    // Maps & Geolocation
    {
      name: 'Leaflet',
      url: 'https://github.com/Leaflet/Leaflet',
      description: 'JavaScript library for mobile-friendly interactive maps - used by GitHub, Foursquare',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '40k+',
      category: 'Maps',
      icon: '🗺️',
      isProduction: true
    },
    {
      name: 'Mapbox GL JS',
      url: 'https://github.com/mapbox/mapbox-gl-js',
      description: 'Interactive, thoroughly customizable maps in the browser - used by Uber, Airbnb',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '8k+',
      category: 'Maps',
      icon: '🗺️',
      isProduction: true
    },
    {
      name: 'Google Maps API',
      url: 'https://github.com/googlemaps/js-api-loader',
      description: 'Google Maps JavaScript API loader - used by millions of websites',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '1k+',
      category: 'Maps',
      icon: '🌍',
      isProduction: true
    },

    // Testing & Quality
    {
      name: 'Jest',
      url: 'https://github.com/facebook/jest',
      description: 'Delightful JavaScript Testing Framework - used by Facebook, Airbnb, Netflix',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '45k+',
      category: 'Testing Framework',
      icon: '🧪',
      isProduction: true
    },
    {
      name: 'Cypress',
      url: 'https://github.com/cypress-io/cypress',
      description: 'Fast, easy and reliable testing for anything that runs in a browser - used by Microsoft, GitHub',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '45k+',
      category: 'Testing Framework',
      icon: '🎯',
      isProduction: true
    },
    {
      name: 'Playwright',
      url: 'https://github.com/microsoft/playwright',
      description: 'Playwright enables reliable end-to-end testing for modern web apps - used by Microsoft, Google',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '60k+',
      category: 'Testing Framework',
      icon: '🎭',
      isProduction: true
    },
    {
      name: 'Storybook',
      url: 'https://github.com/storybookjs/storybook',
      description: 'Build component-driven UIs faster - used by Airbnb, GitHub, Shopify',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '85k+',
      category: 'Component Development',
      icon: '📚',
      isProduction: true
    },

    // Build Tools & Bundlers
    {
      name: 'Webpack',
      url: 'https://github.com/webpack/webpack',
      description: 'A bundler for javascript and friends - used by Facebook, Google, Microsoft',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '65k+',
      category: 'Build Tool',
      icon: '📦',
      isProduction: true
    },
    {
      name: 'Vite',
      url: 'https://github.com/vitejs/vite',
      description: 'Next generation frontend tooling - used by Vue, Svelte, React communities',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '65k+',
      category: 'Build Tool',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Rollup',
      url: 'https://github.com/rollup/rollup',
      description: 'Next-generation ES module bundler - used by Vue, React, Angular',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '25k+',
      category: 'Build Tool',
      icon: '📦',
      isProduction: true
    },
    {
      name: 'Parcel',
      url: 'https://github.com/parcel-bundler/parcel',
      description: 'The zero configuration build tool for the web - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '45k+',
      category: 'Build Tool',
      icon: '📦',
      isProduction: true
    },

    // Utility Libraries
    {
      name: 'Lodash',
      url: 'https://github.com/lodash/lodash',
      description: 'A modern JavaScript utility library delivering modularity, performance & extras - used by millions',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '60k+',
      category: 'Utility Library',
      icon: '📦',
      isProduction: true
    },
    {
      name: 'Axios',
      url: 'https://github.com/axios/axios',
      description: 'Promise based HTTP client for the browser and node.js - used by millions of projects',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '105k+',
      category: 'HTTP Client',
      icon: '🌐',
      isProduction: true
    },
    {
      name: 'Moment.js',
      url: 'https://github.com/moment/moment',
      description: 'Parse, validate, manipulate, and display dates in JavaScript - used by millions',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '48k+',
      category: 'Date Library',
      icon: '📅',
      isProduction: true
    },
    {
      name: 'Day.js',
      url: 'https://github.com/iamkun/dayjs',
      description: '2KB immutable date time library alternative to Moment.js - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '45k+',
      category: 'Date Library',
      icon: '📅',
      isProduction: true
    },

    // State Management
    {
      name: 'Redux',
      url: 'https://github.com/reduxjs/redux',
      description: 'Predictable state container for JavaScript apps - used by Facebook, Netflix, Airbnb',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '60k+',
      category: 'State Management',
      icon: '🔄',
      isProduction: true
    },
    {
      name: 'MobX',
      url: 'https://github.com/mobxjs/mobx',
      description: 'Simple, scalable state management - used by Microsoft, Netflix, Amazon',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '27k+',
      category: 'State Management',
      icon: '🔄',
      isProduction: true
    },
    {
      name: 'Zustand',
      url: 'https://github.com/pmndrs/zustand',
      description: 'Small, fast and scalable bearbones state-management solution - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '40k+',
      category: 'State Management',
      icon: '🐻',
      isProduction: true
    },

    // Node.js Production
    {
      name: 'Node.js',
      url: 'https://github.com/nodejs/node',
      description: 'Node.js JavaScript runtime built on Chrome\'s V8 JavaScript engine - used by Netflix, Uber, PayPal',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '100k+',
      category: 'Runtime',
      icon: '🟢',
      isProduction: true
    },
    {
      name: 'PM2',
      url: 'https://github.com/Unitech/pm2',
      description: 'Production Process Manager for Node.js applications - used by millions of production apps',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '40k+',
      category: 'Process Manager',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Nodemon',
      url: 'https://github.com/remy/nodemon',
      description: 'Monitor for any changes in your node.js application and automatically restart the server',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '25k+',
      category: 'Development Tool',
      icon: '👁️',
      isProduction: true
    }
  ],
  'React': [
    // React Core & Ecosystem
    {
      name: 'React',
      url: 'https://github.com/facebook/react',
      description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces - used by Facebook, Netflix, Airbnb',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '220k+',
      category: 'React Core',
      icon: '⚛️',
      isProduction: true
    },
    {
      name: 'Next.js',
      url: 'https://github.com/vercel/next.js',
      description: 'The React Framework for Production - used by Vercel, Netflix, TikTok',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '110k+',
      category: 'React Framework',
      icon: '▲',
      isProduction: true
    },
    {
      name: 'React Router',
      url: 'https://github.com/remix-run/react-router',
      description: 'Declarative routing for React - used by millions of React applications',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '52k+',
      category: 'React Router',
      icon: '🛣️',
      isProduction: true
    },
    {
      name: 'Redux Toolkit',
      url: 'https://github.com/reduxjs/redux-toolkit',
      description: 'The official, opinionated, batteries-included toolset for efficient Redux development - used by Facebook, Netflix',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '10k+',
      category: 'React State',
      icon: '🔄',
      isProduction: true
    },
    {
      name: 'React Query',
      url: 'https://github.com/tanstack/react-query',
      description: 'Powerful data synchronization for React - used by thousands of production apps',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '40k+',
      category: 'React Data',
      icon: '📊',
      isProduction: true
    },

    // React UI Libraries
    {
      name: 'Material-UI',
      url: 'https://github.com/mui/material-ui',
      description: 'React components for faster and easier web development - used by Google, Microsoft, Amazon',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '90k+',
      category: 'React UI',
      icon: '🎨',
      isProduction: true
    },
    {
      name: 'Ant Design',
      url: 'https://github.com/ant-design/ant-design',
      description: 'An enterprise-class UI design language and React UI library - used by Alibaba, Tencent, Baidu',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '90k+',
      category: 'React UI',
      icon: '🐜',
      isProduction: true
    },
    {
      name: 'Chakra UI',
      url: 'https://github.com/chakra-ui/chakra-ui',
      description: 'Simple, modular and accessible component library for React - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '35k+',
      category: 'React UI',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'React Bootstrap',
      url: 'https://github.com/react-bootstrap/react-bootstrap',
      description: 'Bootstrap components built with React - used by millions of websites',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '22k+',
      category: 'React UI',
      icon: '🎨',
      isProduction: true
    },
    {
      name: 'React Hook Form',
      url: 'https://github.com/react-hook-form/react-hook-form',
      description: 'Performant, flexible and extensible forms with easy validation - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Beginner',
      stars: '35k+',
      category: 'React Forms',
      icon: '📝',
      isProduction: true
    },

    // React Animation & Graphics
    {
      name: 'Framer Motion',
      url: 'https://github.com/framer/motion',
      description: 'A production-ready motion library for React - used by Netflix, Airbnb, Spotify',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '25k+',
      category: 'React Animation',
      icon: '🎬',
      isProduction: true
    },
    {
      name: 'React Spring',
      url: 'https://github.com/pmndrs/react-spring',
      description: 'A spring-physics based animation library for React - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '28k+',
      category: 'React Animation',
      icon: '🌸',
      isProduction: true
    },
    {
      name: 'React Three Fiber',
      url: 'https://github.com/pmndrs/react-three-fiber',
      description: 'A React renderer for Three.js - used by creative agencies and game studios',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '25k+',
      category: 'React 3D',
      icon: '🎮',
      isProduction: true
    },
    {
      name: 'React DnD',
      url: 'https://github.com/react-dnd/react-dnd',
      description: 'Drag and Drop for React - used by Trello, Notion, Figma',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '20k+',
      category: 'React Interaction',
      icon: '🖱️',
      isProduction: true
    },

    // React Data & Charts
    {
      name: 'Recharts',
      url: 'https://github.com/recharts/recharts',
      description: 'Redefined chart library built with React and D3 - used by Airbnb, Netflix',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '22k+',
      category: 'React Charts',
      icon: '📊',
      isProduction: true
    },
    {
      name: 'React Table',
      url: 'https://github.com/tanstack/react-table',
      description: 'Headless UI for building powerful tables & datagrids - used by thousands of enterprise apps',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '25k+',
      category: 'React Data',
      icon: '📋',
      isProduction: true
    },
    {
      name: 'React Virtual',
      url: 'https://github.com/tanstack/react-virtual',
      description: 'Headless UI for Virtualizing Large Element Lists - used by enterprise applications',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '8k+',
      category: 'React Performance',
      icon: '⚡',
      isProduction: true
    },

    // React Testing
    {
      name: 'React Testing Library',
      url: 'https://github.com/testing-library/react-testing-library',
      description: 'Simple and complete testing utilities for React - used by Facebook, Airbnb, Netflix',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '18k+',
      category: 'React Testing',
      icon: '🧪',
      isProduction: true
    },
    {
      name: 'Enzyme',
      url: 'https://github.com/enzymejs/enzyme',
      description: 'JavaScript Testing utilities for React - used by thousands of projects',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '20k+',
      category: 'React Testing',
      icon: '🧪',
      isProduction: true
    },

    // React Native
    {
      name: 'React Native',
      url: 'https://github.com/facebook/react-native',
      description: 'A framework for building native apps with React - used by Facebook, Instagram, WhatsApp',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '115k+',
      category: 'React Native',
      icon: '📱',
      isProduction: true
    },
    {
      name: 'Expo',
      url: 'https://github.com/expo/expo',
      description: 'An open-source platform for making universal native apps with React - used by thousands of mobile apps',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '25k+',
      category: 'React Native',
      icon: '🚀',
      isProduction: true
    },

    // React Full-Stack Examples
    {
      name: 'ReactJS-Spring-Boot-CRUD',
      url: 'https://github.com/RameshMF/ReactJS-Spring-Boot-CRUD-Full-Stack-App',
      description: 'Full-stack CRUD application using React frontend and Spring Boot backend - 711 stars',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '711',
      category: 'React Full-Stack',
      icon: '🚀',
      isProduction: true
    },
    {
      name: 'React Admin',
      url: 'https://github.com/marmelab/react-admin',
      description: 'A frontend Framework for building B2B applications - used by thousands of admin panels',
      language: 'JavaScript',
      difficulty: 'Advanced',
      stars: '25k+',
      category: 'React Admin',
      icon: '⚙️',
      isProduction: true
    },
    {
      name: 'React Dashboard',
      url: 'https://github.com/flatlogic/react-dashboard',
      description: 'React Dashboard - a web application admin template - used by thousands of dashboards',
      language: 'JavaScript',
      difficulty: 'Intermediate',
      stars: '1k+',
      category: 'React Dashboard',
      icon: '📊',
      isProduction: true
    }
  ],
  'Java': [
    // Google Production Apps
    {
      name: 'Guava',
      url: 'https://github.com/google/guava',
      description: 'Google core libraries for Java - used in production across Google services',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '50k+',
      category: 'Google Production',
      icon: '🔧',
      isProduction: true
    },
    {
      name: 'Gson',
      url: 'https://github.com/google/gson',
      description: 'A Java serialization/deserialization library to convert Java Objects into JSON and back',
      language: 'Java',
      difficulty: 'Beginner',
      stars: '23k+',
      category: 'Google Production',
      icon: '📄',
      isProduction: true
    },
    {
      name: 'Auto',
      url: 'https://github.com/google/auto',
      description: 'Google Auto - a collection of source code generators for Java',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '7k+',
      category: 'Google Production',
      icon: '🤖',
      isProduction: true
    },
    {
      name: 'Truth',
      url: 'https://github.com/google/truth',
      description: 'Google Truth - fluent assertions for Java and Android',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '3k+',
      category: 'Google Production',
      icon: '✅',
      isProduction: true
    },
    {
      name: 'Error Prone',
      url: 'https://github.com/google/error-prone',
      description: 'Google Error Prone - catches common Java mistakes as compile-time errors',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '7k+',
      category: 'Google Production',
      icon: '🐛',
      isProduction: true
    },

    // Netflix Production Apps
    {
      name: 'Hystrix',
      url: 'https://github.com/Netflix/Hystrix',
      description: 'Netflix Hystrix - a latency and fault tolerance library designed to isolate points of access',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '23k+',
      category: 'Netflix Production',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Eureka',
      url: 'https://github.com/Netflix/eureka',
      description: 'Netflix Eureka - a REST based service for locating services for the purpose of load balancing',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '12k+',
      category: 'Netflix Production',
      icon: '🔍',
      isProduction: true
    },
    {
      name: 'Ribbon',
      url: 'https://github.com/Netflix/ribbon',
      description: 'Netflix Ribbon - a client side IPC library with built-in software load balancers',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '4k+',
      category: 'Netflix Production',
      icon: '🎀',
      isProduction: true
    },
    {
      name: 'Zuul',
      url: 'https://github.com/Netflix/zuul',
      description: 'Netflix Zuul - an edge service that provides dynamic routing, monitoring, resiliency, security',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '13k+',
      category: 'Netflix Production',
      icon: '🚪',
      isProduction: true
    },
    {
      name: 'Conductor',
      url: 'https://github.com/Netflix/conductor',
      description: 'Netflix Conductor - a workflow orchestration engine that runs in the cloud',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '9k+',
      category: 'Netflix Production',
      icon: '🎼',
      isProduction: true
    },

    // Apache Production Apps
    {
      name: 'Apache Kafka',
      url: 'https://github.com/apache/kafka',
      description: 'Apache Kafka - distributed event streaming platform used by LinkedIn, Uber, Airbnb',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '25k+',
      category: 'Apache Production',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Apache Spark',
      url: 'https://github.com/apache/spark',
      description: 'Apache Spark - unified analytics engine for large-scale data processing used by Uber, Netflix',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '40k+',
      category: 'Apache Production',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Apache Hadoop',
      url: 'https://github.com/apache/hadoop',
      description: 'Apache Hadoop - distributed storage and processing of big data used by Facebook, Yahoo',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '15k+',
      category: 'Apache Production',
      icon: '🐘',
      isProduction: true
    },
    {
      name: 'Apache Lucene',
      url: 'https://github.com/apache/lucene',
      description: 'Apache Lucene - high-performance text search engine used by Elasticsearch, Solr',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '15k+',
      category: 'Apache Production',
      icon: '🔎',
      isProduction: true
    },
    {
      name: 'Apache Tomcat',
      url: 'https://github.com/apache/tomcat',
      description: 'Apache Tomcat - Java servlet container used by millions of web applications',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '8k+',
      category: 'Apache Production',
      icon: '🐱',
      isProduction: true
    },
    {
      name: 'Apache Maven',
      url: 'https://github.com/apache/maven',
      description: 'Apache Maven - software project management and comprehension tool used by most Java projects',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '4k+',
      category: 'Apache Production',
      icon: '🏗️',
      isProduction: true
    },
    {
      name: 'Apache Commons',
      url: 'https://github.com/apache/commons-lang',
      description: 'Apache Commons Lang - helper utilities for java.lang API used in production systems',
      language: 'Java',
      difficulty: 'Beginner',
      stars: '2k+',
      category: 'Apache Production',
      icon: '🛠️',
      isProduction: true
    },
    {
      name: 'Apache Camel',
      url: 'https://github.com/apache/camel',
      description: 'Apache Camel - integration framework for enterprise application integration',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '5k+',
      category: 'Apache Production',
      icon: '🐪',
      isProduction: true
    },
    {
      name: 'Apache Struts',
      url: 'https://github.com/apache/struts',
      description: 'Apache Struts - elegant, extensible framework for creating enterprise-ready Java web applications',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '1k+',
      category: 'Apache Production',
      icon: '🎭',
      isProduction: true
    },
    {
      name: 'Apache Tika',
      url: 'https://github.com/apache/tika',
      description: 'Apache Tika - content detection and analysis toolkit used by search engines',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Apache Production',
      icon: '📄',
      isProduction: true
    },

    // Spring Production Apps
    {
      name: 'Spring Boot',
      url: 'https://github.com/spring-projects/spring-boot',
      description: 'Spring Boot - production-ready applications used by Pivotal, VMware, and thousands of companies',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '70k+',
      category: 'Spring Production',
      icon: '🍃',
      isProduction: true
    },
    {
      name: 'Spring Framework',
      url: 'https://github.com/spring-projects/spring-framework',
      description: 'Spring Framework - comprehensive programming model used in enterprise applications worldwide',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '55k+',
      category: 'Spring Production',
      icon: '🌱',
      isProduction: true
    },
    {
      name: 'Spring Security',
      url: 'https://github.com/spring-projects/spring-security',
      description: 'Spring Security - authentication and authorization framework used in production systems',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '8k+',
      category: 'Spring Production',
      icon: '🔒',
      isProduction: true
    },
    {
      name: 'Spring Data',
      url: 'https://github.com/spring-projects/spring-data-jpa',
      description: 'Spring Data JPA - data access layer used in enterprise applications',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Spring Production',
      icon: '🗄️',
      isProduction: true
    },
    {
      name: 'Spring Cloud',
      url: 'https://github.com/spring-projects/spring-cloud',
      description: 'Spring Cloud - microservices framework used in distributed systems',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '5k+',
      category: 'Spring Production',
      icon: '☁️',
      isProduction: true
    },

    // Elastic Production Apps
    {
      name: 'Elasticsearch',
      url: 'https://github.com/elastic/elasticsearch',
      description: 'Elasticsearch - distributed search and analytics engine used by GitHub, Stack Overflow, eBay',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '70k+',
      category: 'Elastic Production',
      icon: '🔍',
      isProduction: true
    },
    {
      name: 'Logstash',
      url: 'https://github.com/elastic/logstash',
      description: 'Logstash - data processing pipeline used by Elastic Stack in production',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '14k+',
      category: 'Elastic Production',
      icon: '📊',
      isProduction: true
    },
    {
      name: 'Kibana',
      url: 'https://github.com/elastic/kibana',
      description: 'Kibana - data visualization and exploration used in Elastic Stack production deployments',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '19k+',
      category: 'Elastic Production',
      icon: '📈',
      isProduction: true
    },

    // Hibernate Production Apps
    {
      name: 'Hibernate ORM',
      url: 'https://github.com/hibernate/hibernate-orm',
      description: 'Hibernate ORM - object-relational mapping framework used in enterprise applications',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '5k+',
      category: 'Hibernate Production',
      icon: '🗄️',
      isProduction: true
    },
    {
      name: 'Hibernate Validator',
      url: 'https://github.com/hibernate/hibernate-validator',
      description: 'Hibernate Validator - bean validation framework used in production systems',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Hibernate Production',
      icon: '✅',
      isProduction: true
    },

    // Testing Production Apps
    {
      name: 'JUnit 5',
      url: 'https://github.com/junit-team/junit5',
      description: 'JUnit 5 - testing framework used by millions of Java projects in production',
      language: 'Java',
      difficulty: 'Beginner',
      stars: '8k+',
      category: 'Testing Production',
      icon: '🧪',
      isProduction: true
    },
    {
      name: 'Mockito',
      url: 'https://github.com/mockito/mockito',
      description: 'Mockito - mocking framework used in production testing across Java applications',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '15k+',
      category: 'Testing Production',
      icon: '🎭',
      isProduction: true
    },
    {
      name: 'TestNG',
      url: 'https://github.com/cbeust/testng',
      description: 'TestNG - testing framework inspired by JUnit and NUnit used in production',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Testing Production',
      icon: '🧪',
      isProduction: true
    },
    {
      name: 'AssertJ',
      url: 'https://github.com/assertj/assertj-core',
      description: 'AssertJ - fluent assertions for Java used in production testing',
      language: 'Java',
      difficulty: 'Beginner',
      stars: '2k+',
      category: 'Testing Production',
      icon: '✅',
      isProduction: true
    },

    // Jackson Production Apps
    {
      name: 'Jackson Core',
      url: 'https://github.com/FasterXML/jackson-core',
      description: 'Jackson Core - high-performance JSON processor used in production systems',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Jackson Production',
      icon: '📄',
      isProduction: true
    },
    {
      name: 'Jackson Databind',
      url: 'https://github.com/FasterXML/jackson-databind',
      description: 'Jackson Databind - data binding package for Jackson used in production',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Jackson Production',
      icon: '📄',
      isProduction: true
    },

    // Netty Production Apps
    {
      name: 'Netty',
      url: 'https://github.com/netty/netty',
      description: 'Netty - asynchronous network application framework used by Twitter, Facebook, LinkedIn',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '32k+',
      category: 'Netty Production',
      icon: '🌐',
      isProduction: true
    },

    // Dropwizard Production Apps
    {
      name: 'Dropwizard',
      url: 'https://github.com/dropwizard/dropwizard',
      description: 'Dropwizard - Java framework for developing ops-friendly, high-performance, RESTful web services',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '8k+',
      category: 'Dropwizard Production',
      icon: '🎯',
      isProduction: true
    },

    // Vert.x Production Apps
    {
      name: 'Vert.x',
      url: 'https://github.com/eclipse-vertx/vert.x',
      description: 'Vert.x - toolkit for building reactive applications on the JVM used in production',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '15k+',
      category: 'Vert.x Production',
      icon: '⚡',
      isProduction: true
    },

    // Quarkus Production Apps
    {
      name: 'Quarkus',
      url: 'https://github.com/quarkusio/quarkus',
      description: 'Quarkus - Kubernetes Native Java stack tailored for OpenJDK HotSpot and GraalVM',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '15k+',
      category: 'Quarkus Production',
      icon: '⚡',
      isProduction: true
    },

    // Micronaut Production Apps
    {
      name: 'Micronaut',
      url: 'https://github.com/micronaut-projects/micronaut-core',
      description: 'Micronaut - modern, JVM-based, full-stack framework for building modular, easily testable microservice applications',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '6k+',
      category: 'Micronaut Production',
      icon: '🚀',
      isProduction: true
    },

    // Lombok Production Apps
    {
      name: 'Lombok',
      url: 'https://github.com/projectlombok/lombok',
      description: 'Lombok - Java library that automatically plugs into your editor and build tools used in production',
      language: 'Java',
      difficulty: 'Beginner',
      stars: '13k+',
      category: 'Lombok Production',
      icon: '🛠️',
      isProduction: true
    },

    // SLF4J Production Apps
    {
      name: 'SLF4J',
      url: 'https://github.com/qos-ch/slf4j',
      description: 'SLF4J - Simple Logging Facade for Java used in production logging',
      language: 'Java',
      difficulty: 'Beginner',
      stars: '1k+',
      category: 'SLF4J Production',
      icon: '📝',
      isProduction: true
    },

    // Logback Production Apps
    {
      name: 'Logback',
      url: 'https://github.com/qos-ch/logback',
      description: 'Logback - logging framework for Java used in production systems',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '2k+',
      category: 'Logback Production',
      icon: '📝',
      isProduction: true
    },

    // Caffeine Production Apps
    {
      name: 'Caffeine',
      url: 'https://github.com/ben-manes/caffeine',
      description: 'Caffeine - high performance, near optimal caching library used in production',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '15k+',
      category: 'Caffeine Production',
      icon: '⚡',
      isProduction: true
    },

    // OkHttp Production Apps
    {
      name: 'OkHttp',
      url: 'https://github.com/square/okhttp',
      description: 'OkHttp - HTTP client for Java and Android used by Square, Google, and millions of apps',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '45k+',
      category: 'Square Production',
      icon: '🌐',
      isProduction: true
    },

    // Retrofit Production Apps
    {
      name: 'Retrofit',
      url: 'https://github.com/square/retrofit',
      description: 'Retrofit - type-safe HTTP client for Android and Java used in production mobile apps',
      language: 'Java',
      difficulty: 'Intermediate',
      stars: '42k+',
      category: 'Square Production',
      icon: '🔄',
      isProduction: true
    },

    // RxJava Production Apps
    {
      name: 'RxJava',
      url: 'https://github.com/ReactiveX/RxJava',
      description: 'RxJava - Reactive Extensions for the JVM used by Netflix, Uber, and production systems',
      language: 'Java',
      difficulty: 'Advanced',
      stars: '48k+',
      category: 'ReactiveX Production',
      icon: '⚡',
      isProduction: true
    }
  ],
  'Python': [
    {
      name: 'Django',
      url: 'https://github.com/django/django',
      description: 'The Web framework for perfectionists with deadlines',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '75k+',
      category: 'Web Framework',
      icon: '🎸',
      isProduction: true
    },
    {
      name: 'Flask',
      url: 'https://github.com/pallets/flask',
      description: 'The Python micro framework for building web applications',
      language: 'Python',
      difficulty: 'Beginner',
      stars: '65k+',
      category: 'Web Framework',
      icon: '🌶️',
      isProduction: true
    },
    {
      name: 'FastAPI',
      url: 'https://github.com/tiangolo/fastapi',
      description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '70k+',
      category: 'Web Framework',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'NumPy',
      url: 'https://github.com/numpy/numpy',
      description: 'The fundamental package for scientific computing with Python',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '25k+',
      category: 'Scientific Computing',
      icon: '🔢',
      isProduction: true
    },
    {
      name: 'Pandas',
      url: 'https://github.com/pandas-dev/pandas',
      description: 'Flexible and powerful data analysis and manipulation library for Python',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '42k+',
      category: 'Data Analysis',
      icon: '🐼',
      isProduction: true
    },
    {
      name: 'Requests',
      url: 'https://github.com/psf/requests',
      description: 'A simple, yet elegant HTTP library for Python',
      language: 'Python',
      difficulty: 'Beginner',
      stars: '52k+',
      category: 'HTTP Library',
      icon: '🌐',
      isProduction: true
    },
    {
      name: 'Scikit-learn',
      url: 'https://github.com/scikit-learn/scikit-learn',
      description: 'Machine Learning in Python',
      language: 'Python',
      difficulty: 'Advanced',
      stars: '60k+',
      category: 'Machine Learning',
      icon: '🤖',
      isProduction: true
    },
    {
      name: 'TensorFlow',
      url: 'https://github.com/tensorflow/tensorflow',
      description: 'An Open Source Machine Learning Framework',
      language: 'Python',
      difficulty: 'Advanced',
      stars: '180k+',
      category: 'Machine Learning',
      icon: '🧠',
      isProduction: true
    },
    {
      name: 'Celery',
      url: 'https://github.com/celery/celery',
      description: 'Distributed Task Queue',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '22k+',
      category: 'Task Queue',
      icon: '🥬',
      isProduction: true
    },
    {
      name: 'Pytest',
      url: 'https://github.com/pytest-dev/pytest',
      description: 'The pytest framework makes it easy to write small tests',
      language: 'Python',
      difficulty: 'Beginner',
      stars: '12k+',
      category: 'Testing Framework',
      icon: '🧪',
      isProduction: true
    },
    {
      name: 'PyTorch',
      url: 'https://github.com/pytorch/pytorch',
      description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration',
      language: 'Python',
      difficulty: 'Advanced',
      stars: '75k+',
      category: 'Machine Learning',
      icon: '🔥',
      isProduction: true
    },
    {
      name: 'OpenCV',
      url: 'https://github.com/opencv/opencv',
      description: 'Open Source Computer Vision Library',
      language: 'Python',
      difficulty: 'Advanced',
      stars: '75k+',
      category: 'Computer Vision',
      icon: '👁️',
      isProduction: true
    },
    {
      name: 'Matplotlib',
      url: 'https://github.com/matplotlib/matplotlib',
      description: 'matplotlib: plotting with Python',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '20k+',
      category: 'Data Visualization',
      icon: '📊',
      isProduction: true
    },
    {
      name: 'Scrapy',
      url: 'https://github.com/scrapy/scrapy',
      description: 'A fast high-level web crawling and web scraping framework for Python',
      language: 'Python',
      difficulty: 'Intermediate',
      stars: '50k+',
      category: 'Web Scraping',
      icon: '🕷️',
      isProduction: true
    },
    {
      name: 'Beautiful Soup',
      url: 'https://github.com/BeautifulSoup/bs4',
      description: 'Beautiful Soup is a Python library for pulling data out of HTML and XML files',
      language: 'Python',
      difficulty: 'Beginner',
      stars: '15k+',
      category: 'Web Scraping',
      icon: '🍲',
      isProduction: true
    }
  ],
  'PHP': [
    {
      name: 'Laravel',
      url: 'https://github.com/laravel/laravel',
      description: 'A PHP framework for web artisans',
      language: 'PHP',
      difficulty: 'Intermediate',
      stars: '75k+',
      category: 'Web Framework',
      icon: '🎨',
      isProduction: true
    },
    {
      name: 'Symfony',
      url: 'https://github.com/symfony/symfony',
      description: 'The Symfony PHP framework',
      language: 'PHP',
      difficulty: 'Advanced',
      stars: '30k+',
      category: 'Web Framework',
      icon: '🎭',
      isProduction: true
    },
    {
      name: 'WordPress',
      url: 'https://github.com/WordPress/WordPress',
      description: 'WordPress, Git-ified. Synced via SVN every 15 minutes',
      language: 'PHP',
      difficulty: 'Intermediate',
      stars: '20k+',
      category: 'CMS',
      icon: '📝',
      isProduction: true
    },
    {
      name: 'Composer',
      url: 'https://github.com/composer/composer',
      description: 'Dependency Manager for PHP',
      language: 'PHP',
      difficulty: 'Beginner',
      stars: '28k+',
      category: 'Package Manager',
      icon: '🎼',
      isProduction: true
    },
    {
      name: 'PHPUnit',
      url: 'https://github.com/sebastianbergmann/phpunit',
      description: 'The PHP Unit Testing framework',
      language: 'PHP',
      difficulty: 'Intermediate',
      stars: '19k+',
      category: 'Testing Framework',
      icon: '🧪',
      isProduction: true
    },
    {
      name: 'Monolog',
      url: 'https://github.com/Seldaek/monolog',
      description: 'Sends your logs to files, sockets, inboxes, databases and various web services',
      language: 'PHP',
      difficulty: 'Beginner',
      stars: '20k+',
      category: 'Logging',
      icon: '📝',
      isProduction: true
    },
    {
      name: 'Guzzle',
      url: 'https://github.com/guzzle/guzzle',
      description: 'Guzzle, an extensible PHP HTTP client',
      language: 'PHP',
      difficulty: 'Intermediate',
      stars: '23k+',
      category: 'HTTP Client',
      icon: '🌐',
      isProduction: true
    },
    {
      name: 'Twig',
      url: 'https://github.com/twigphp/Twig',
      description: 'Twig, the flexible, fast, and secure template engine for PHP',
      language: 'PHP',
      difficulty: 'Beginner',
      stars: '8k+',
      category: 'Template Engine',
      icon: '🌿',
      isProduction: true
    },
    {
      name: 'Doctrine',
      url: 'https://github.com/doctrine/orm',
      description: 'Doctrine Object Relational Mapper (ORM) for PHP',
      language: 'PHP',
      difficulty: 'Advanced',
      stars: '10k+',
      category: 'ORM',
      icon: '🗄️',
      isProduction: true
    },
    {
      name: 'Carbon',
      url: 'https://github.com/briannesbitt/Carbon',
      description: 'A simple PHP API extension for DateTime',
      language: 'PHP',
      difficulty: 'Beginner',
      stars: '16k+',
      category: 'Date Library',
      icon: '📅',
      isProduction: true
    },
    {
      name: 'CodeIgniter',
      url: 'https://github.com/codeigniter4/CodeIgniter4',
      description: 'Open Source PHP Framework (originally from EllisLab)',
      language: 'PHP',
      difficulty: 'Beginner',
      stars: '8k+',
      category: 'Web Framework',
      icon: '🚀',
      isProduction: true
    },
    {
      name: 'CakePHP',
      url: 'https://github.com/cakephp/cakephp',
      description: 'CakePHP: The Rapid Development Framework for PHP',
      language: 'PHP',
      difficulty: 'Intermediate',
      stars: '8k+',
      category: 'Web Framework',
      icon: '🍰',
      isProduction: true
    },
    {
      name: 'Yii',
      url: 'https://github.com/yiisoft/yii2',
      description: 'Yii 2: The Fast, Secure and Professional PHP Framework',
      language: 'PHP',
      difficulty: 'Intermediate',
      stars: '14k+',
      category: 'Web Framework',
      icon: '🎯',
      isProduction: true
    },
    {
      name: 'Zend Framework',
      url: 'https://github.com/laminas/laminas',
      description: 'Laminas is an open source continuation of the Zend Framework',
      language: 'PHP',
      difficulty: 'Advanced',
      stars: '3k+',
      category: 'Web Framework',
      icon: '⚡',
      isProduction: true
    },
    {
      name: 'Drupal',
      url: 'https://github.com/drupal/drupal',
      description: 'Drupal is an open source content management platform',
      language: 'PHP',
      difficulty: 'Advanced',
      stars: '4k+',
      category: 'CMS',
      icon: '💧',
      isProduction: true
    }
  ]
};

export default function CuratedRepos({ onRepoSelect }: { onRepoSelect: (url: string) => void }) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('JavaScript');
  const [searchTerm, setSearchTerm] = useState('');
  const [isScrolling, setIsScrolling] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const languages = Object.keys(CURATED_REPOS);
  const repoPool = CURATED_REPOS[selectedLanguage];
  const filteredRepos = repoPool.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const highlightedCategories = Array.from(new Set(repoPool.map(repo => repo.category))).slice(0, 3);

  // Infinite scrolling effect
  useEffect(() => {
    if (!isScrolling || filteredRepos.length === 0) return;

    const startScrolling = () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }

      scrollIntervalRef.current = setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const scrollAmount = 1; // pixels per interval
          const maxScroll = container.scrollHeight - container.clientHeight;
          
          if (container.scrollTop >= maxScroll) {
            // Reset to top for infinite loop
            container.scrollTop = 0;
          } else {
            container.scrollTop += scrollAmount;
          }
        }
      }, 50); // 50ms interval for smooth scrolling
    };

    startScrolling();

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isScrolling, filteredRepos.length, selectedLanguage, searchTerm]);

  // Pause scrolling on hover
  const handleMouseEnter = () => {
    setIsScrolling(false);
  };

  const handleMouseLeave = () => {
    setIsScrolling(true);
  };

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-8 shadow-[0_25px_70px_-35px_rgba(45,212,191,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_65%)]" />
        <div className="pointer-events-none absolute right-[-120px] top-[-140px] h-[280px] w-[280px] rounded-full bg-fuchsia-500/25 blur-[120px]" />
        <div className="pointer-events-none absolute left-[-160px] bottom-[-160px] h-[320px] w-[320px] rounded-full bg-cyan-400/20 blur-[140px]" />

      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                Curated
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Repository Collection
              </h3>
              <p className="mt-2 text-sm text-slate-300/90 sm:text-base">
                Hand-picked, production-grade codebases that generate the highest quality quiz questions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {languages.map((language) => {
              const isActive = selectedLanguage === language;
              return (
                <button
                  key={language}
                  onClick={() => {
                    setSelectedLanguage(language);
                    setSearchTerm('');
                  }}
                  className={`group relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-400/30 via-sky-400/20 to-fuchsia-400/30 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)]'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/30 hover:bg-cyan-400/10'
                  }`}
                >
                  <span className="relative z-10">{language}</span>
                  {isActive && (
                    <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),_transparent_65%)] opacity-90" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {highlightedCategories.map((category) => (
              <span key={category} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                {category}
              </span>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={`Search ${selectedLanguage} repositories...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/70 focus:ring-offset-2 focus:ring-offset-[#05040f]"
            />
          </div>
        </header>

        <div className="relative rounded-2xl border border-white/10 bg-white/5">
          <div 
            ref={scrollContainerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="max-h-[26rem] overflow-y-auto px-2 py-3 sm:px-3 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredRepos.map((repo) => {
                const difficultyBg =
                  repo.difficulty === 'Beginner'
                    ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                    : repo.difficulty === 'Intermediate'
                    ? 'bg-amber-500/15 text-amber-200 border-amber-400/30'
                    : 'bg-rose-500/15 text-rose-200 border-rose-400/30';

                return (
                  <div
                    key={repo.url}
                    onClick={() => onRepoSelect(repo.url)}
                    className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/30 to-slate-900/50 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_12px_40px_-12px_rgba(59,130,246,0.45)]"
                  >
                    <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_65%)]" />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-white">
                        <span className="text-xl">{repo.icon}</span>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{repo.name}</p>
                          <p className="text-[11px] text-slate-400">{repo.category}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200">
                        ⭐ {repo.stars}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-300">
                      {repo.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${difficultyBg}`}>
                        {repo.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-cyan-200 group-hover:text-cyan-100">
                        Select
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l3.999 4a1 1 0 010 1.414l-3.999 4a1 1 0 11-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRepos.length === 0 && (
              <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-400">
                  No matches
                </div>
                <p className="text-sm text-slate-300">
                  Try another keyword or explore a different language.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
          Uses 1 life · Selecting a curated repo streams fresh questions tailored to that codebase.
        </footer>
      </div>
      </section>
    </>
  );
}
