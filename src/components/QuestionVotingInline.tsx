'use client';

import { useState } from 'react';

interface QuestionVotingInlineProps {
  questionId: string;
  questionIndex: number;
  userId?: string;
  onRatingChange?: (questionId: string, rating: 'up' | 'down') => void;
}

export default function QuestionVotingInline({ 
  questionId, 
  questionIndex, 
  userId, 
  onRatingChange 
}: QuestionVotingInlineProps) {
  const [userRating, setUserRating] = useState<'up' | 'down' | null>(null);

  const handleRating = (rating: 'up' | 'down') => {
    const finalQuestionId = questionId || `q-${questionIndex}`;
    
    // Store rating locally first
    setUserRating(rating);
    console.log(`✅ Rated question ${finalQuestionId} as ${rating}`);
    
    // If userId is available, also save to Firebase
    if (userId && onRatingChange) {
      onRatingChange(finalQuestionId, rating);
    }
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Rate this question:
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleRating('up')}
              disabled={userRating !== null}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
                userRating === 'up'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : userRating !== null
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <span>👍</span>
              <span className="text-sm">Good</span>
            </button>
            <button
              onClick={() => handleRating('down')}
              disabled={userRating !== null}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
                userRating === 'down'
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                  : userRating !== null
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <span>👎</span>
              <span className="text-sm">Needs work</span>
            </button>
          </div>
        </div>
        {userRating && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Thanks for your feedback!
          </div>
        )}
      </div>
    </div>
  );
}
