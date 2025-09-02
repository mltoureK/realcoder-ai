'use client';

import { useState } from 'react';
import { AIGenerationOptions } from '@/types/code';

interface AIControlsProps {
  onGenerateCode: (prompt: string, options: AIGenerationOptions) => void;
  isGenerating: boolean;
}

export default function AIControls({ onGenerateCode, isGenerating }: AIControlsProps) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<AIGenerationOptions>({
    complexity: 'intermediate',
    style: 'functional',
    comments: true,
    naming: 'camelCase'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerateCode(prompt.trim(), options);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        AI Code Generator
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Describe what you want to build:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a function that sorts an array of numbers in ascending order"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            rows={4}
            disabled={isGenerating}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Complexity Level:
          </label>
          <select
            value={options.complexity}
            onChange={(e) => setOptions(prev => ({ ...prev, complexity: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isGenerating}
          >
            <option value="simple">Simple</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Coding Style:
          </label>
          <select
            value={options.style}
            onChange={(e) => setOptions(prev => ({ ...prev, style: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isGenerating}
          >
            <option value="functional">Functional</option>
            <option value="object-oriented">Object-Oriented</option>
            <option value="procedural">Procedural</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Naming Convention:
          </label>
          <select
            value={options.naming}
            onChange={(e) => setOptions(prev => ({ ...prev, naming: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isGenerating}
          >
            <option value="camelCase">camelCase</option>
            <option value="snake_case">snake_case</option>
            <option value="PascalCase">PascalCase</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="comments"
            checked={options.comments}
            onChange={(e) => setOptions(prev => ({ ...prev, comments: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isGenerating}
          />
          <label htmlFor="comments" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Include comments
          </label>
        </div>

        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Be specific about what you want to build. Include details about inputs, outputs, and any special requirements.
        </p>
      </div>
    </div>
  );
}

