import { type CuratedRepo } from './types';

export const WEBSOCKET_NETWORKING_PATH: CuratedRepo[] = [
  // Beginner - WebSocket Basics
  {
    name: 'WebSocket Fundamentals',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
    description: 'Master the WebSocket API - learn handshake, frames, and real-time communication basics',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: 'MDN',
    category: 'API Documentation',
    icon: '📚',
    isProduction: true
  },
  {
    name: 'ws (WebSocket Library)',
    url: 'https://github.com/websockets/ws',
    description: 'Pure WebSocket implementation for Node.js - 20k+ stars, battle-tested',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: '20k+',
    category: 'WebSocket Library',
    icon: '⚡',
    isProduction: true
  },
  {
    name: 'WebSocket Chat Example',
    url: 'https://github.com/websockets/ws/tree/master/examples/chat',
    description: 'Simple chat application using pure WebSocket - learn the fundamentals',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: 'Example',
    category: 'Chat Application',
    icon: '💬',
    isProduction: true
  },

  // Intermediate - Performance & Scaling
  {
    name: 'uWebSockets.js',
    url: 'https://github.com/uNetworking/uWebSockets.js',
    description: 'Ultra-fast WebSocket server - 15k+ stars, C++ performance in JavaScript',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: '15k+',
    category: 'High Performance',
    icon: '🚀',
    isProduction: true
  },
  {
    name: 'ws vs Socket.IO Benchmark',
    url: 'https://github.com/uNetworking/uWebSockets.js#benchmarks',
    description: 'Performance comparison - learn when to use pure WebSocket vs frameworks',
    language: 'Benchmark',
    difficulty: 'Intermediate',
    stars: 'Benchmark',
    category: 'Performance Analysis',
    icon: '📊',
    isProduction: true
  },
  {
    name: 'Cluster WebSocket Example',
    url: 'https://github.com/websockets/ws/tree/master/examples/express-session-parse',
    description: 'Scaling WebSocket with Node.js clusters - production-ready patterns',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: 'Example',
    category: 'Scaling',
    icon: '⚙️',
    isProduction: true
  },

  // Advanced - Production Patterns
  {
    name: 'Redis Adapter for ws',
    url: 'https://github.com/socketio/socket.io-redis-adapter',
    description: 'Redis adapter for scaling WebSocket across multiple servers',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: '3k+',
    category: 'Scaling',
    icon: '🔴',
    isProduction: true
  },
  {
    name: 'WebSocket Load Testing',
    url: 'https://github.com/obs-websocket-community-projects/obs-websocket-js',
    description: 'Load testing WebSocket connections - learn performance optimization',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: '1k+',
    category: 'Testing',
    icon: '🧪',
    isProduction: true
  },
  {
    name: 'WebSocket Security Best Practices',
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#websockets',
    description: 'OWASP security guidelines for WebSocket implementations',
    language: 'Security',
    difficulty: 'Advanced',
    stars: 'OWASP',
    category: 'Security',
    icon: '🔒',
    isProduction: true
  }
];
