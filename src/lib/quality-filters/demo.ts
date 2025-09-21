/**
 * Demo script showing the modular quality filter system
 * This demonstrates how each question type gets routed to its specific quality filter
 */

import { qualityFilterOrchestrator } from './QualityFilterOrchestrator';
import type { QualityRatingRequest } from './BaseQualityFilter';

// Sample questions for each type
const sampleQuestions: Record<string, QualityRatingRequest> = {
  'function-variant': {
    type: 'function-variant',
    question: 'Which implementation correctly adds an item to an array?',
    variants: [
      {
        code: 'arr.push(item)',
        isCorrect: true,
        explanation: 'push() adds item to the end of the array'
      },
      {
        code: 'arr.concat(item)',
        isCorrect: false,
        explanation: 'concat() returns a new array, doesn\'t modify original'
      },
      {
        code: 'arr.unshift(item)',
        isCorrect: false,
        explanation: 'unshift() adds to the beginning, not the end'
      }
    ],
    snippet: 'const items = [1, 2, 3];'
  },
  
  'multiple-choice': {
    type: 'multiple-choice',
    question: 'What does the async/await pattern help with in JavaScript?',
    options: [
      'Making code run faster',
      'Handling asynchronous operations more elegantly',
      'Reducing memory usage',
      'Converting synchronous code to asynchronous'
    ],
    correctAnswers: [1], // Second option (index 1) is correct
    explanation: 'async/await provides a cleaner syntax for handling promises and asynchronous operations'
  },
  
  'true-false': {
    type: 'true-false',
    question: 'The fetch() API always returns a resolved promise, even for HTTP error status codes like 404.',
    correctAnswers: [0], // First option (false) is correct
    explanation: 'fetch() only rejects on network errors, not HTTP error status codes. You need to check response.ok for HTTP errors.',
    snippet: 'fetch("/api/data").then(response => { if (!response.ok) throw new Error("HTTP error"); })'
  },
  
  'select-all': {
    type: 'select-all',
    question: 'Which of the following are valid ways to handle errors in async functions?',
    options: [
      'try/catch blocks',
      'Promise.catch()',
      'if/else statements',
      'Error boundaries'
    ],
    correctAnswers: [0, 1], // First two options (indices 0 and 1) are correct
    explanation: 'try/catch and Promise.catch() are standard error handling patterns for async functions'
  },
  
  'fill-blank': {
    type: 'fill-blank',
    question: 'Complete the function: function fetchData() { return ____.fetch(url); }',
    options: ['window', 'global', 'this', 'fetch'],
    correctAnswers: [0], // First option (window) is correct
    explanation: 'fetch is available on the window object in browsers',
    snippet: 'function fetchData(url) { return window.fetch(url); }'
  }
};

/**
 * Demo function showing how the modular quality filter system works
 */
export async function demonstrateModularQualityFilters(): Promise<void> {
  console.log('🎯 DEMONSTRATING MODULAR QUALITY FILTER SYSTEM');
  console.log('=' .repeat(60));
  
  // Show supported types
  console.log('📋 Supported question types:', qualityFilterOrchestrator.getSupportedTypes());
  console.log('');
  
  // Test each question type
  for (const [type, question] of Object.entries(sampleQuestions)) {
    console.log(`🔍 Testing ${type} question:`);
    console.log(`   Question: ${question.question}`);
    
    try {
      const shouldKeep = await qualityFilterOrchestrator.shouldKeepQuestion(question);
      console.log(`   Result: ${shouldKeep ? '✅ ACCEPTED' : '❌ REJECTED'}`);
      
      // Get type-specific stats
      const stats = qualityFilterOrchestrator.getTypeStats(type);
      console.log(`   Type stats: ${stats.total} total, ${stats.accepted} accepted, avg: ${stats.avgScore}/10`);
      
    } catch (error) {
      console.error(`   Error testing ${type}:`, error);
    }
    
    console.log('');
  }
  
  // Show final summary
  console.log('📊 FINAL SUMMARY:');
  qualityFilterOrchestrator.displayQualityRatingSummary();
  
  // Reset stats for clean testing
  qualityFilterOrchestrator.resetStats();
}

/**
 * Demo function showing how to use specific quality filters directly
 */
export async function demonstrateDirectFilterUsage(): Promise<void> {
  console.log('🎯 DEMONSTRATING DIRECT FILTER USAGE');
  console.log('=' .repeat(60));
  
  const { FunctionVariantQualityFilter } = await import('./FunctionVariantQualityFilter');
  const { MultipleChoiceQualityFilter } = await import('./MultipleChoiceQualityFilter');
  
  // Create specific filter instances
  const functionVariantFilter = new FunctionVariantQualityFilter();
  const mcqFilter = new MultipleChoiceQualityFilter();
  
  console.log('🔧 Using FunctionVariantQualityFilter directly:');
  const shouldKeep1 = await functionVariantFilter.shouldKeepQuestion(sampleQuestions['function-variant']);
  console.log(`   Result: ${shouldKeep1 ? '✅ ACCEPTED' : '❌ REJECTED'}`);
  
  console.log('🔧 Using MultipleChoiceQualityFilter directly:');
  const shouldKeep2 = await mcqFilter.shouldKeepQuestion(sampleQuestions['multiple-choice']);
  console.log(`   Result: ${shouldKeep2 ? '✅ ACCEPTED' : '❌ REJECTED'}`);
}

// Export for potential use in tests or manual demonstration
export { sampleQuestions };
