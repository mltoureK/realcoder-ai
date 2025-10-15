import { CuratedRepo } from './types';

export const RUST_LEARNING_PATH: CuratedRepo[] = [
  // Beginner - Core Rust Concepts
  {
    name: 'Rustlings',
    url: 'https://github.com/rust-lang/rustlings',
    description: 'Small exercises to get you used to reading and writing Rust code - 45k+ stars',
    language: 'Rust',
    difficulty: 'Beginner',
    stars: '45k+',
    category: 'Learning Exercises',
    icon: '🦀',
    isProduction: true
  },
  {
    name: 'Rust by Example',
    url: 'https://github.com/rust-lang/rust-by-example',
    description: 'Learn Rust with examples - 15k+ stars',
    language: 'Rust',
    difficulty: 'Beginner',
    stars: '15k+',
    category: 'Learning Examples',
    icon: '📚',
    isProduction: true
  },

  // Intermediate - Web Development
  {
    name: 'Actix Web Examples',
    url: 'https://github.com/actix/examples',
    description: 'Community showcase and examples of Actix web usage - 3k+ stars',
    language: 'Rust',
    difficulty: 'Intermediate',
    stars: '3k+',
    category: 'Web Examples',
    icon: '🌐',
    isProduction: true
  },
  {
    name: 'Warp Examples',
    url: 'https://github.com/seanmonstar/warp/tree/master/examples',
    description: 'Warp web framework examples and tutorials',
    language: 'Rust',
    difficulty: 'Intermediate',
    stars: '8k+',
    category: 'Web Examples',
    icon: '🌊',
    isProduction: true
  },

  // Advanced - Production Applications
  {
    name: 'Ripgrep',
    url: 'https://github.com/BurntSushi/ripgrep',
    description: 'Line-oriented search tool that recursively searches directories - 42k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '42k+',
    category: 'Command Line Tool',
    icon: '🔍',
    isProduction: true
  },
  {
    name: 'fd',
    url: 'https://github.com/sharkdp/fd',
    description: 'A simple, fast and user-friendly alternative to find - 30k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '30k+',
    category: 'Command Line Tool',
    icon: '📁',
    isProduction: true
  },
  {
    name: 'bat',
    url: 'https://github.com/sharkdp/bat',
    description: 'A cat(1) clone with wings - 45k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '45k+',
    category: 'Command Line Tool',
    icon: '🦇',
    isProduction: true
  },
  {
    name: 'exa',
    url: 'https://github.com/ogham/exa',
    description: 'A modern replacement for ls - 25k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '25k+',
    category: 'Command Line Tool',
    icon: '📋',
    isProduction: true
  },

  // Database & Storage
  {
    name: 'Diesel',
    url: 'https://github.com/diesel-rs/diesel',
    description: 'A safe, extensible ORM and Query Builder for Rust - 12k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '12k+',
    category: 'ORM',
    icon: '⛽',
    isProduction: true
  },
  {
    name: 'SQLx',
    url: 'https://github.com/launchbadge/sqlx',
    description: 'Async, pure Rust SQL crate featuring compile-time checked queries - 12k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '12k+',
    category: 'Database',
    icon: '🗄️',
    isProduction: true
  },

  // Networking & HTTP
  {
    name: 'Reqwest',
    url: 'https://github.com/seanmonstar/reqwest',
    description: 'An easy and powerful HTTP Client for Rust - 8k+ stars',
    language: 'Rust',
    difficulty: 'Intermediate',
    stars: '8k+',
    category: 'HTTP Client',
    icon: '🌐',
    isProduction: true
  },
  {
    name: 'Hyper',
    url: 'https://github.com/hyperium/hyper',
    description: 'An HTTP library for Rust - 15k+ stars',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '15k+',
    category: 'HTTP Library',
    icon: '⚡',
    isProduction: true
  }
];
