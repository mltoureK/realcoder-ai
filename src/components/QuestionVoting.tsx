'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  rateQuestion, 
  hasUserRatedQuestion, 
  getUserQuestionRating,
  QuestionDoc 
} from '@/lib/quiz-history';
import { 
  calculateQualityMetrics, 
  getQualityScoreColor, 
  getQualityScoreBg 
} from '@/lib/question-quality';

interface QuestionVotingProps {
  questionId: string;
  userId: string;
  question: QuestionDoc;
  onRatingChange?: (questionId: string, rating: 'up' | 'down') => void;
  compact?: boolean;
}

export default function QuestionVoting({ 
  questionId, 
  userId, 
  question, 
  onRatingChange,
  compact = false 
}: QuestionVotingProps) {
  const [userRating, setUserRating] = useState<'up' | 'down' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [metrics, setMetrics] = useState(calculateQualityMetrics(question));

  useEffect(() => {
    checkUserRating();
  }, [questionId, userId]);

  const checkUserRating = async () => {
    try {
      const [rated, rating] = await Promise.all([
        hasUserRatedQuestion(questionId, userId),
        getUserQuestionRating(questionId, userId)
      ]);
      
      setHasRated(rated);
      setUserRating(rating);
    } catch (error) {
      console.error('Error checking user rating:', error);
    }
  };

  const handleRating = async (rating: 'up' | 'down') => {
    if (isLoading || hasRated) return;

    try {
      setIsLoading(true);
      await rateQuestion(questionId, userId, rating);
      
      setUserRating(rating);
      setHasRated(true);
      
      // Update local metrics
      const newMetrics = calculateQualityMetrics({
        ...question,
        upvotes: rating === 'up' ? question.upvotes + 1 : question.upvotes,
        downvotes: rating === 'down' ? question.downvotes + 1 : question.downvotes
      });
      setMetrics(newMetrics);
      
      onRatingChange?.(questionId, rating);
      
      // Show success feedback
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error rating question:', error);
      setIsLoading(false);
    }
  };

  const getRatingButtonClass = (type: 'up' | 'down') => {
    const baseClass = 'flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200';
    
    if (userRating === type) {
      return `${baseClass} ${
        type === 'up' 
          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' 
          : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
      }`;
    }
    
    if (hasRated) {
      return `${baseClass} bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed`;
    }
    
    return `${baseClass} bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Quality Score Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityScoreBg(metrics.qualityScore)} ${getQualityScoreColor(metrics.qualityScore)}`}>
          {metrics.qualityScore}%
        </div>
        
        {/* Voting Buttons */}
        <div className="flex items-center space-x-1">
          <motion.button
            whileHover={{ scale: hasRated ? 1 : 1.05 }}
            whileTap={{ scale: hasRated ? 1 : 0.95 }}
            onClick={() => handleRating('up')}
            disabled={isLoading || hasRated}
            className={getRatingButtonClass('up')}
          >
            <motion.span
              animate={userRating === 'up' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              👍
            </motion.span>
            <span className="text-sm">{metrics.upvotes}</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: hasRated ? 1 : 1.05 }}
            whileTap={{ scale: hasRated ? 1 : 0.95 }}
            onClick={() => handleRating('down')}
            disabled={isLoading || hasRated}
            className={getRatingButtonClass('down')}
          >
            <motion.span
              animate={userRating === 'down' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              👎
            </motion.span>
            <span className="text-sm">{metrics.downvotes}</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Question Quality
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityScoreBg(metrics.qualityScore)} ${getQualityScoreColor(metrics.qualityScore)}`}>
          {metrics.qualityScore}% Quality
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {metrics.upvotes}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Upvotes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {metrics.downvotes}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Downvotes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {metrics.totalVotes}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Votes</div>
        </div>
      </div>

      {/* Quality Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            metrics.status === 'excellent' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
            metrics.status === 'good' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
            metrics.status === 'fair' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
            metrics.status === 'poor' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' :
            'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {metrics.status === 'excellent' ? '⭐ Excellent' :
             metrics.status === 'good' ? '👍 Good' :
             metrics.status === 'fair' ? '👌 Fair' :
             metrics.status === 'poor' ? '⚠️ Poor' :
             '🚩 Flagged'}
          </span>
        </div>
      </div>

      {/* Voting Buttons */}
      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hasRated ? 'Thanks for your feedback!' : 'How would you rate this question?'}
        </div>
        
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: hasRated ? 1 : 1.02 }}
            whileTap={{ scale: hasRated ? 1 : 0.98 }}
            onClick={() => handleRating('up')}
            disabled={isLoading || hasRated}
            className={getRatingButtonClass('up')}
          >
            <motion.span
              animate={userRating === 'up' ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="text-lg"
            >
              👍
            </motion.span>
            <span>Good Question</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: hasRated ? 1 : 1.02 }}
            whileTap={{ scale: hasRated ? 1 : 0.98 }}
            onClick={() => handleRating('down')}
            disabled={isLoading || hasRated}
            className={getRatingButtonClass('down')}
          >
            <motion.span
              animate={userRating === 'down' ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="text-lg"
            >
              👎
            </motion.span>
            <span>Needs Improvement</span>
          </motion.button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Submitting rating...</span>
          </div>
        )}
      </div>

      {/* Quality Explanation */}
      {metrics.totalVotes > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Quality Score:</strong> Based on {metrics.totalVotes} vote{metrics.totalVotes !== 1 ? 's' : ''} 
            ({metrics.approvalRate}% approval rate). 
            {metrics.needsReview && (
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                This question has been flagged for review.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
