'use client';

import React, { useState, useEffect } from 'react';
import { getQuestionPollData, updateQuestionPoll } from '@/lib/quiz-history';

interface QuestionPollProps {
  questionId?: string;
  questionIndex: number;
  showExplanations: boolean;
  isCorrect: boolean;
  shouldUpdate?: boolean;
  questionData?: any; // Full question object for saving complete data
  repoUrl?: string; // Repository URL for saving
  onPollUpdate?: (questionId: string, isCorrect: boolean) => void;
}

export default function QuestionPoll({ 
  questionId, 
  questionIndex, 
  showExplanations,
  isCorrect,
  shouldUpdate = true,
  questionData,
  repoUrl,
  onPollUpdate 
}: QuestionPollProps) {
  const [pollData, setPollData] = useState({
    totalAttempts: 0,
    passed: 0,
    failed: 0,
    passRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset whenever we switch to a new question
    setPollData({
      totalAttempts: 0,
      passed: 0,
      failed: 0,
      passRate: 0
    });
    setLoading(true);
  }, [questionId]);

  useEffect(() => {
    const loadPollData = async () => {
      // Use the actual questionId, don't fall back to generic IDs
      if (!questionId) {
        console.warn('❌ QuestionPoll: No questionId provided, skipping poll update');
        setLoading(false);
        return;
      }
      
      console.log(`🔍 [QuestionPoll] Updating poll for questionId: ${questionId}, isCorrect: ${isCorrect}, shouldUpdate: ${shouldUpdate}`);
      
      try {
        // Update poll with current result AND full question data
        const questionWithRepo = questionData ? {
          ...questionData,
          repoUrl: repoUrl
        } : undefined;

        if (shouldUpdate) {
          await updateQuestionPoll(questionId, isCorrect, questionWithRepo, repoUrl);
        }
        
        // Get updated poll data
        const data = await getQuestionPollData(questionId, repoUrl, questionWithRepo);
        
        if (data) {
          setPollData({
            totalAttempts: data.totalAttempts,
            passed: data.passedCount,
            failed: data.failedCount,
            passRate: Math.round(data.passRate * 10) / 10 // Round to 1 decimal
          });
        } else {
          // Fallback to actual data (no mock data)
          setPollData({
            totalAttempts: 1,
            passed: isCorrect ? 1 : 0,
            failed: isCorrect ? 0 : 1,
            passRate: isCorrect ? 100 : 0
          });
        }
        
        // Call parent callback
        if (shouldUpdate && onPollUpdate) {
          onPollUpdate(questionId, isCorrect);
        }
      } catch (error) {
        console.error('Error loading poll data:', error);
        // Use actual data as fallback (no mock data)
        setPollData({
          totalAttempts: 1,
          passed: isCorrect ? 1 : 0,
          failed: isCorrect ? 0 : 1,
          passRate: isCorrect ? 100 : 0
        });
      } finally {
        setLoading(false);
      }
    };

    console.log(`🔍 [QuestionPoll] useEffect triggered:`, { 
      showExplanations, 
      questionId, 
      shouldUpdate, 
      willUpdate: showExplanations && questionId && shouldUpdate 
    });
    
    if (showExplanations && questionId && shouldUpdate) {
      console.log(`🚀 [QuestionPoll] About to call loadPollData for ${questionId}`);
      loadPollData();
    } else if (showExplanations && questionId) {
      console.log(`ℹ️ [QuestionPoll] Fetching poll data without updating for ${questionId}`);
      loadPollData();
    } else {
      console.log(`❌ [QuestionPoll] Skipping loadPollData:`, { 
        showExplanations, 
        questionId: !!questionId, 
        shouldUpdate 
      });
    }
  }, [showExplanations, isCorrect, questionId, questionIndex, shouldUpdate, onPollUpdate, questionData, repoUrl]);

  // Only show when explanations are visible
  if (!showExplanations) return null;

  if (loading) {
    return (
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">Loading community stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Community Stats
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex items-center space-x-1">
              <span className="font-semibold">{pollData.passed}</span>
              <span>passed</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold">{pollData.failed}</span>
              <span>failed</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold">{pollData.passRate}%</span>
              <span>pass rate</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400">
          {pollData.totalAttempts} total attempts
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pollData.passRate}%` }}
          ></div>
        </div>
      </div>

      {/* Your result indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            You {isCorrect ? 'passed' : 'failed'} this question
          </span>
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400">
          {isCorrect ? 'Well done!' : 'Keep practicing!'}
        </div>
      </div>
    </div>
  );
}
