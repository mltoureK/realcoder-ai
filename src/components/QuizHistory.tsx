'use client';

import { useState, useEffect } from 'react';
import { QuizHistoryDoc, getQuizHistory, getUserQuizStats } from '@/lib/quiz-history';
import { getUser, canUserTakeQuiz, getUserBadges } from '@/lib/user-management';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizHistoryProps {
  userId: string;
  onRetakeQuiz?: (repoUrl: string, repoName: string) => void;
  onClose?: () => void;
}

export default function QuizHistory({ userId, onRetakeQuiz, onClose }: QuizHistoryProps) {
  const [quizHistory, setQuizHistory] = useState<QuizHistoryDoc[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'recent' | 'top'>('recent');
  const [usageInfo, setUsageInfo] = useState<any>(null);

  useEffect(() => {
    loadQuizData();
  }, [userId]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      const [history, stats, user, usage] = await Promise.all([
        getQuizHistory(userId, 20),
        getUserQuizStats(userId),
        getUser(userId),
        canUserTakeQuiz(userId)
      ]);

      setQuizHistory(history);
      setUserStats(stats);
      setUserInfo(user);
      setUsageInfo(usage);
    } catch (err) {
      console.error('Error loading quiz data:', err);
      setError('Failed to load quiz history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const filteredHistory = () => {
    let filtered = [...quizHistory];
    
    switch (filter) {
      case 'recent':
        // Already sorted by date in descending order
        break;
      case 'top':
        filtered = filtered.sort((a, b) => {
          const scoreA = (a.score / a.totalQuestions) * 100;
          const scoreB = (b.score / b.totalQuestions) * 100;
          return scoreB - scoreA;
        });
        break;
      case 'all':
      default:
        break;
    }
    
    return filtered;
  };

  const badges = userInfo ? getUserBadges(userInfo) : [];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading History</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={loadQuizData}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="ml-4 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quiz History
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {userInfo?.name || 'Your'} quiz performance and progress
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* User Stats & Usage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Overall Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Quizzes:</span>
                <span className="font-medium text-gray-900 dark:text-white">{userStats?.totalQuizzes || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Average Score:</span>
                <span className="font-medium text-gray-900 dark:text-white">{userStats?.averageScore || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Best Score:</span>
                <span className="font-medium text-gray-900 dark:text-white">{userStats?.bestScore || 0}%</span>
              </div>
            </div>
          </div>

          {/* Usage Limit */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                <span className={`font-medium ${usageInfo?.canTake ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {usageInfo?.remaining || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Limit:</span>
                <span className="font-medium text-gray-900 dark:text-white">{usageInfo?.limit || 0}</span>
              </div>
              {usageInfo?.resetDate && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Resets: {usageInfo.resetDate.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Badges</h3>
            <div className="space-y-2">
              {badges.length > 0 ? (
                badges.map((badge, index) => (
                  <div key={index} className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium mr-2 mb-2">
                    🏆 {badge}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No badges yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'recent', label: 'Recent', icon: '🕒' },
              { key: 'top', label: 'Best Scores', icon: '🏆' },
              { key: 'all', label: 'All', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quiz History List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quiz Sessions ({filteredHistory().length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {filteredHistory().map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {quiz.repoName}
                        </h3>
                        {quiz.language && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {quiz.language}
                          </span>
                        )}
                        {quiz.difficulty && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                            {quiz.difficulty}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <span>📅 {formatDate(quiz.completedAt)}</span>
                        <span>📝 {quiz.totalQuestions} questions</span>
                        <span>⏱️ Session ID: {quiz.sessionId.slice(-8)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Score Display */}
                      <div className={`px-4 py-2 rounded-lg ${getScoreBg(quiz.score, quiz.totalQuestions)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(quiz.score, quiz.totalQuestions)}`}>
                          {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                          {quiz.score}/{quiz.totalQuestions}
                        </div>
                      </div>

                      {/* Retake Button */}
                      {onRetakeQuiz && (
                        <button
                          onClick={() => onRetakeQuiz(quiz.repoUrl, quiz.repoName)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Retake Quiz
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2">
                    {quiz.results.slice(0, 6).map((result, resultIndex) => (
                      <div
                        key={resultIndex}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          result.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                        title={`Q${resultIndex + 1}: ${result.isCorrect ? 'Correct' : 'Incorrect'}`}
                      >
                        {result.isCorrect ? '✓' : '✗'}
                      </div>
                    ))}
                    {quiz.results.length > 6 && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400">
                        +{quiz.results.length - 6}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredHistory().length === 0 && (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Quiz History</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You haven't taken any quizzes yet. Start your first quiz to see your progress here!
              </p>
              {onRetakeQuiz && (
                <button
                  onClick={() => onRetakeQuiz('', 'Start Your First Quiz')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Take Your First Quiz
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
