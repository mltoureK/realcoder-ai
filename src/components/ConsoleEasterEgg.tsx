'use client';

import { useEffect } from 'react';

export default function ConsoleEasterEgg() {
  useEffect(() => {
    // Create the ASCII art and message
    const asciiArt = `
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║  ┌─────────────────────────────────────────────────────────┐ ║
    ║  │                                                         │ ║
    ║  │    👨‍💻 "Hey there, curious developer!" 👩‍💻            │ ║
    ║  │                                                         │ ║
    ║  │  🚫 "Quit poking around in my console!" 🚫             │ ║
    ║  │                                                         │ ║
    ║  │  💡 "But since you're here, here's a fun fact:" 💡      │ ║
    ║  │                                                         │ ║
    ║  │  🎯 RealCoder AI was built to help developers learn    │ ║
    ║  │     from real-world code through interactive quizzes!   │ ║
    ║  │                                                         │ ║
    ║  │  🔧 Built with: Next.js, TypeScript, Tailwind CSS,     │ ║
    ║  │     Firebase, Stripe, and lots of ☕                   │ ║
    ║  │                                                         │ ║
    ║  │  🚀 Want to contribute? Check out the source code!     │ ║
    ║  │                                                         │ ║
    ║  │  👋 Happy coding, fellow developer! 👋                 │ ║
    ║  │                                                         │ ║
    ║  └─────────────────────────────────────────────────────────┘ ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    `;

    const styles = [
      'color: #3B82F6; font-weight: bold; font-size: 14px;',
      'color: #EF4444; font-weight: bold; font-size: 12px;',
      'color: #10B981; font-weight: bold; font-size: 12px;',
      'color: #F59E0B; font-weight: bold; font-size: 12px;',
      'color: #8B5CF6; font-weight: bold; font-size: 12px;',
      'color: #06B6D4; font-weight: bold; font-size: 12px;',
      'color: #84CC16; font-weight: bold; font-size: 12px;',
      'color: #F97316; font-weight: bold; font-size: 12px;',
      'color: #EC4899; font-weight: bold; font-size: 12px;',
      'color: #6366F1; font-weight: bold; font-size: 12px;',
      'color: #14B8A6; font-weight: bold; font-size: 12px;',
      'color: #A855F7; font-weight: bold; font-size: 12px;',
      'color: #EAB308; font-weight: bold; font-size: 12px;',
      'color: #DC2626; font-weight: bold; font-size: 12px;',
      'color: #059669; font-weight: bold; font-size: 12px;',
      'color: #7C3AED; font-weight: bold; font-size: 12px;',
      'color: #0EA5E9; font-weight: bold; font-size: 12px;',
      'color: #65A30D; font-weight: bold; font-size: 12px;',
      'color: #EA580C; font-weight: bold; font-size: 12px;',
      'color: #DB2777; font-weight: bold; font-size: 12px;'
    ];

    // Log the ASCII art with styling
    console.log('%c' + asciiArt, styles.join(' '));

    // Add some additional fun console messages
    console.log(
      '%c🎮 Easter Egg Found!',
      'color: #FF6B6B; font-size: 16px; font-weight: bold; background: #FFE66D; padding: 4px 8px; border-radius: 4px;'
    );

    console.log(
      '%cYou found the developer console! 🕵️‍♂️',
      'color: #4ECDC4; font-size: 14px; font-weight: bold;'
    );

    console.log(
      '%c💡 Pro tip: RealCoder AI uses advanced AI to generate questions from your actual code!',
      'color: #45B7D1; font-size: 12px; font-style: italic;'
    );

    console.log(
      '%c🚀 Built with love by developers, for developers!',
      'color: #96CEB4; font-size: 12px; font-weight: bold;'
    );

    // Add some technical info (but not too much)
    console.group('%c🔧 Technical Stack', 'color: #6C5CE7; font-weight: bold;');
    console.log('Frontend: Next.js 15.5.2 with TypeScript');
    console.log('Styling: Tailwind CSS');
    console.log('Database: Firebase Firestore');
    console.log('Authentication: Firebase Auth');
    console.log('Payments: Stripe');
    console.log('AI: OpenAI GPT-4');
    console.groupEnd();

    // Add a fun challenge
    console.group('%c🎯 Developer Challenge', 'color: #FD79A8; font-weight: bold;');
    console.log('Can you find all the console easter eggs in this app?');
    console.log('Hint: Try opening the console on different pages! 🕵️‍♀️');
    console.groupEnd();

    // Add some fun facts
    console.group('%c📊 Fun Facts', 'color: #00B894; font-weight: bold;');
    console.log('🤖 RealCoder AI can generate questions from any programming language');
    console.log('📚 Questions are based on real-world code patterns');
    console.log('🏆 Founder tier users get lifetime pricing at $5/month');
    console.log('🎨 The app has full dark mode support');
    console.log('📱 Completely mobile responsive');
    console.groupEnd();

  }, []);

  // This component doesn't render anything visible
  return null;
}
