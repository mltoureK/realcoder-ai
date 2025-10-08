'use client';

interface QuestionVotingButtonsProps {
  questionId?: string;
  questionIndex: number;
  showExplanations: boolean;
  currentRating?: 'up' | 'down';
  onRating?: (questionId: string, rating: 'up' | 'down') => void;
}

export default function QuestionVotingButtons({ 
  questionId, 
  questionIndex, 
  showExplanations,
  currentRating,
  onRating 
}: QuestionVotingButtonsProps) {
  const handleRating = (rating: 'up' | 'down') => {
    console.log(`🔍 [QuestionVotingButtons] Rating clicked:`, { questionId, rating, hasCallback: !!onRating });
    
    if (!questionId) {
      console.warn('❌ [QuestionVotingButtons] No questionId provided, cannot vote');
      return;
    }
    
    // Call parent callback if provided
    if (onRating) {
      onRating(questionId, rating);
    } else {
      console.warn(`❌ [QuestionVotingButtons] No callback provided`);
    }
  };

  // Only show when explanations are visible
  if (!showExplanations) return null;

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
              disabled={currentRating !== undefined}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
                currentRating === 'up'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : currentRating !== undefined
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <span>👍</span>
              <span className="text-sm">Good</span>
            </button>
            <button
              onClick={() => handleRating('down')}
              disabled={currentRating !== undefined}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
                currentRating === 'down'
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                  : currentRating !== undefined
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <span>👎</span>
              <span className="text-sm">Needs work</span>
            </button>
          </div>
        </div>
        {currentRating && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Thanks for your feedback!
          </div>
        )}
      </div>
    </div>
  );
}
