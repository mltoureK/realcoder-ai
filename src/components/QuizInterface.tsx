'use client';

import { useState, useEffect } from 'react';
import { QuizSession } from '@/lib/quiz-service';

interface QuizInterfaceProps {
  quizSession: QuizSession;
  onClose: () => void;
}

export default function QuizInterface({ quizSession, onClose }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [lives] = useState(999); // Unlimited lives
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [showExplanations, setShowExplanations] = useState(false);
  const [shakingNext, setShakingNext] = useState(false);

  const totalQuestions = Array.isArray(quizSession.questions) ? quizSession.questions.length : 0;
  const hasQuestion = totalQuestions > 0 && currentQuestionIndex < totalQuestions;
  const currentQuestion: any = hasQuestion ? quizSession.questions[currentQuestionIndex] : undefined;

  // Reset variant index when question changes
  useEffect(() => {
    setCurrentVariantIndex(0);
  }, [currentQuestion]);

  const handleAnswerSelect = (answer: string) => {
    if (!hasQuestion) return;
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'fill-blank' || currentQuestion.type === 'function-variant') {
      setSelectedAnswers([answer]);
    } else if (currentQuestion.type === 'select-all') {
      setSelectedAnswers(prev => 
        prev.includes(answer) 
          ? prev.filter(a => a !== answer)
          : [...prev, answer]
      );
    } else if (currentQuestion.type === 'order-sequence') {
      // For order-sequence, we handle this in the drag-and-drop UI
      // This function is not used for order-sequence
    }
  };

  const handleSubmitAnswer = () => {
    if (!hasQuestion || selectedAnswers.length === 0) return;

    let isCorrect = false;
    
    if (currentQuestion.type === 'function-variant') {
      // For function-variant, find the correct variant
      const correctVariant = currentQuestion.variants?.find((v: any) => v.isCorrect);
      isCorrect = correctVariant ? selectedAnswers.includes(correctVariant.id) : false;
    } else if (currentQuestion.type === 'order-sequence') {
      // For order-sequence, check if the order matches exactly
      const correctOrder = currentQuestion.correctOrder || [];
      isCorrect = selectedAnswers.length === correctOrder.length &&
        selectedAnswers.every((stepId, index) => stepId === correctOrder[index]);
    } else {
      // For other question types
      isCorrect = Array.isArray(currentQuestion.correctAnswer)
        ? (currentQuestion.correctAnswer as string[]).every((answer: string) => selectedAnswers.includes(answer)) &&
          selectedAnswers.every((answer: string) => (currentQuestion.correctAnswer as string[]).includes(answer))
        : selectedAnswers.includes(currentQuestion.correctAnswer);
    }

    if (isCorrect) {
      setScore(prev => prev + 1);
      setShowExplanations(true);
    } else {
      // No lives lost - unlimited lives!
      // Just show the correct answer
      setShowExplanations(true);
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    const nextAvailable = nextIndex < totalQuestions;
    if (nextAvailable) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setCurrentVariantIndex(0);
      setShowExplanations(false);
    } else {
      // Not yet loaded → trigger a brief shake
      setShakingNext(true);
      setTimeout(() => setShakingNext(false), 600);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setScore(0);
    // Lives stay unlimited
    setCurrentVariantIndex(0);
    setShowExplanations(false);
  };

  const handleVariantNavigation = (direction: 'prev' | 'next') => {
    if (currentQuestion.type === 'function-variant' && currentQuestion.variants) {
      if (direction === 'prev' && currentVariantIndex > 0) {
        setCurrentVariantIndex(currentVariantIndex - 1);
      } else if (direction === 'next' && currentVariantIndex < currentQuestion.variants.length - 1) {
        setCurrentVariantIndex(currentVariantIndex + 1);
      }
    }
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedAnswers([variantId]);
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            {currentQuestion.options?.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedAnswers.includes(option)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswers.includes(option)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedAnswers.includes(option) && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-lg">{option}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'fill-blank':
        // Render a Duolingo-like drag-to-fill experience
        // Find the blank and render a drop zone that accepts option chips
        const qText = currentQuestion.question || '';
        const parts = qText.split('____');
        const filledToken = selectedAnswers[0];
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-base text-gray-700 dark:text-gray-200 font-mono whitespace-pre-wrap">
                {parts[0]}
                <span
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const token = e.dataTransfer.getData('text/plain');
                    if (token) handleAnswerSelect(token);
                  }}
                  className={`inline-flex items-center px-3 py-1 rounded-md border-2 mx-1 select-none ${
                    filledToken
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200'
                      : 'border-dashed border-blue-400 text-blue-600 dark:text-blue-300'
                  }`}
                  role="button"
                >
                  {filledToken || '____'}
                </span>
                {parts.length > 1 ? parts[1] : ''}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tip: drag a token below into the blank or click a token to select.</p>
            </div>

            {/* Draggable tokens */}
            <div className="flex flex-wrap gap-3">
              {currentQuestion.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', option)}
                  onClick={() => handleAnswerSelect(option)}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                    selectedAnswers.includes(option)
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      case 'function-variant':
        if (!currentQuestion.variants || currentQuestion.variants.length === 0) {
          return <div>No variants available</div>;
        }

        const currentVariant = currentQuestion.variants[currentVariantIndex];
        const totalVariants = currentQuestion.variants.length;
        const isFirstVariant = currentVariantIndex === 0;
        const isLastVariant = currentVariantIndex === totalVariants - 1;

        return (
          <div className="space-y-8">
            {/* Navigation Header */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
              <button
                onClick={() => handleVariantNavigation('prev')}
                disabled={isFirstVariant}
                className={`flex items-center space-x-3 px-5 py-3 rounded-lg transition-all font-medium ${
                  isFirstVariant
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline text-base">Previous</span>
              </button>

              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Variant {currentVariantIndex + 1} of {totalVariants}
                </div>
                <div className="text-base text-gray-600 dark:text-gray-400 font-medium">
                  Option {currentVariantIndex + 1}
                </div>
              </div>

              <button
                onClick={() => handleVariantNavigation('next')}
                disabled={isLastVariant}
                className={`flex items-center space-x-3 px-5 py-3 rounded-lg transition-all font-medium ${
                  isLastVariant
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <span className="hidden sm:inline text-base">Next</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Code Display */}
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-8">
              <div className="mb-6">
                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  Analyze this code variant and determine if it&apos;s correct:
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <pre className="text-base font-mono text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  <code>{currentVariant.code}</code>
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleVariantSelect(currentVariant.id)}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                  selectedAnswers.includes(currentVariant.id)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {selectedAnswers.includes(currentVariant.id) ? '✓ Selected' : 'Select This Variant'}
              </button>
              
              {!isLastVariant && (
                <button
                  onClick={() => handleVariantNavigation('next')}
                  className="flex-1 sm:flex-none py-3 px-6 rounded-lg font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Skip to Next
                </button>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center space-x-3">
              {currentQuestion.variants.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentVariantIndex(index)}
                  className={`w-4 h-4 rounded-full transition-all hover:scale-110 ${
                    index === currentVariantIndex
                      ? 'bg-blue-600 shadow-lg'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        );

      case 'order-sequence':
        return (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                💡 Drag and drop the steps below to arrange them in the correct execution order for this function
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                Pay attention to dependencies, async operations, and error handling patterns
              </p>
            </div>

            {/* Draggable Steps Bank */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Steps:</h3>
              <div className="grid gap-3">
                {currentQuestion.steps?.map((step: any, index: number) => (
                  <div
                    key={step.id}
                    draggable
                    className={`p-4 bg-white dark:bg-gray-800 border-2 rounded-lg cursor-move hover:border-blue-300 dark:hover:border-blue-500 transition-all ${
                      selectedAnswers.includes(step.id) ? 'opacity-50' : ''
                    } ${
                      showExplanations && step.isDistractor 
                        ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', step.id);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        showExplanations && step.isDistractor 
                          ? 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {showExplanations && step.isDistractor ? '⚠️' : '⋮⋮'}
                      </div>
                      <div className="flex-1">
                        <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {step.code}
                        </pre>
                        {showExplanations && (
                          <p className={`text-xs mt-1 ${
                            step.isDistractor 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {step.explanation}
                          </p>
                        )}
                        {showExplanations && step.isDistractor && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full">
                            Distractor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drop Zone for Ordered Steps */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Correct Order:</h3>
              <div
                className="min-h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
                  const stepId = e.dataTransfer.getData('text/plain');
                  if (stepId && !selectedAnswers.includes(stepId)) {
                    setSelectedAnswers([...selectedAnswers, stepId]);
                  }
                }}
              >
                {selectedAnswers.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>Drag steps here to build the correct order</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAnswers.map((stepId, index) => {
                      const step = currentQuestion.steps?.find((s: any) => s.id === stepId);
                      if (!step) return null;
                      return (
                        <div
                          key={stepId}
                          className={`flex items-center space-x-3 p-3 border rounded-lg ${
                            showExplanations && step.isDistractor 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                            showExplanations && step.isDistractor 
                              ? 'bg-red-600' 
                              : 'bg-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200">
                              {step.code}
                            </pre>
                            {showExplanations && step.isDistractor && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                ⚠️ This is a distractor step - not part of the correct sequence
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAnswers(selectedAnswers.filter(id => id !== stepId));
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Question type not supported</div>;
    }
  };

  if (showResults) {
    const percentage = Math.round((score / quizSession.questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className={`text-6xl mb-4 ${passed ? 'text-green-500' : 'text-red-500'}`}>
            {passed ? '🎉' : '😔'}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </h2>
          
          <div className={`text-4xl font-bold mb-4 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {percentage}%
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You got {score} out of {quizSession.questions.length} questions correct.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {quizSession.title}
              </h1>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Progress */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {hasQuestion ? (
                  <>Question {currentQuestionIndex + 1} of {totalQuestions}</>
                ) : (
                  <>Loading questions…</>
                )}
              </div>
              
              {/* Score */}
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Score: {score}
              </div>
              
              {/* Lives - Show as Unlimited */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Lives:</span>
                <div className="flex space-x-1">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    ∞ Unlimited
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${hasQuestion ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {!hasQuestion ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10/12" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
              <div className="flex justify-end">
                <button className={`bg-green-600 text-white py-3 px-8 rounded-lg font-medium opacity-60 cursor-not-allowed ${shakingNext ? 'animate-shake' : ''}`} onClick={handleNextQuestion}>
                  Next Question
                </button>
              </div>
            </div>
          ) : (
          <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {currentQuestion.question}
            </h2>
            
            {currentQuestion.codeContext && (currentQuestion.type === 'function-variant' || currentQuestion.type === 'multiple-choice') && (
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Code Context:</p>
                <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {currentQuestion.codeContext}
                </pre>
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="mb-8">
            {renderQuestion()}
          </div>

          {/* Explanations */}
          {showExplanations && currentQuestion.type === 'function-variant' && currentQuestion.variants && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Answer Explanations
              </h3>
              <div className="space-y-4">
                {currentQuestion.variants.map((variant: any, index: number) => {
                  const isSelected = selectedAnswers.includes(variant.id);
                  const isCorrect = variant.isCorrect;
                  const isUserCorrect = isSelected === isCorrect;
                  
                  return (
                    <div
                      key={variant.id}
                      className={`p-4 rounded-lg border-2 ${
                        isCorrect
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isCorrect
                            ? 'border-green-500 bg-green-500'
                            : 'border-red-500 bg-red-500'
                        }`}>
                          <span className="text-white text-sm font-bold">
                            {isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Option {index + 1}
                            </span>
                            {isSelected && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isUserCorrect
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {isUserCorrect ? 'Your Answer ✓' : 'Your Answer ✗'}
                              </span>
                            )}
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-600">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap overflow-x-auto">
                              <code>{variant.code}</code>
                            </pre>
                          </div>
                          <p className={`text-sm ${
                            isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {variant.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            {!showExplanations ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswers.length === 0}
                className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className={`bg-green-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors ${shakingNext ? 'animate-shake' : ''}`}
              >
                {currentQuestionIndex === quizSession.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </button>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
} 
