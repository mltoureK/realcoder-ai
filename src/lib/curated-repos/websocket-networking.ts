import { type CuratedRepo } from './types';

export const WEBSOCKET_NETWORKING_PATH: CuratedRepo[] = [
  // Beginner - WebSocket Basics
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
    name: 'Socket.IO',
    url: 'https://github.com/socketio/socket.io',
    description: 'Real-time bidirectional event-based communication - 65k+ stars, battle-tested',
    language: 'JavaScript',
    difficulty: 'Beginner',
    stars: '65k+',
    category: 'Real-time Framework',
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
    name: 'Socket.IO Client',
    url: 'https://github.com/socketio/socket.io-client',
    description: 'Socket.IO client library - 10k+ stars, official client implementation',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: '10k+',
    category: 'Client Library',
    icon: '📱',
    isProduction: true
  },
  {
    name: 'Engine.IO',
    url: 'https://github.com/socketio/engine.io',
    description: 'Real-time engine for Socket.IO - 7k+ stars, learn transport abstraction',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    stars: '7k+',
    category: 'Transport Layer',
    icon: '⚙️',
    isProduction: true
  },

  // Advanced - Production Patterns
  {
    name: 'Socket.IO Redis Adapter',
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
    name: 'Socket.IO Admin UI',
    url: 'https://github.com/socketio/socket.io-admin-ui',
    description: 'Admin UI for Socket.IO - 1k+ stars, learn monitoring and debugging',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: '1k+',
    category: 'Monitoring',
    icon: '📊',
    isProduction: true
  },
  {
    name: 'Socket.IO Protocol',
    url: 'https://github.com/socketio/socket.io-protocol',
    description: 'Socket.IO protocol implementation - learn real-time communication protocols',
    language: 'JavaScript',
    difficulty: 'Advanced',
    stars: 'Official',
    category: 'Protocol',
    icon: '🔒',
    isProduction: true
  }
];
