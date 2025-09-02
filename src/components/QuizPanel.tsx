'use client';

import { useState } from 'react';
import { QuizData } from '@/types/code';

interface QuizPanelProps {
  quizData: QuizData | null;
  onClose: () => void;
}

export default function QuizPanel({ quizData, onClose }: QuizPanelProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Mock quiz data for now
  const mockQuiz: QuizData = {
    id: '1',
    title: 'JavaScript Fundamentals Quiz',
    questions: [
      {
        id: '1',
        question: 'What does the console.log() function do?',
        type: 'multiple-choice',
        options: [
          'Displays text in the browser',
          'Outputs text to the console',
          'Creates a new variable',
          'Stops the program execution'
        ],
        correctAnswer: 'Outputs text to the console',
        explanation: 'console.log() is used to output text and data to the browser console for debugging purposes.'
      },
      {
        id: '2',
        question: 'Which of the following is a valid way to declare a variable in JavaScript?',
        type: 'multiple-choice',
        options: [
          'var myVariable = 5;',
          'let myVariable = 5;',
          'const myVariable = 5;',
          'All of the above'
        ],
        correctAnswer: 'All of the above',
        explanation: 'JavaScript supports three ways to declare variables: var, let, and const.'
      }
    ],
    passingScore: 70
  };

  const quiz = quizData || mockQuiz;
  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleAnswerSelect = (answer: string) => {
    if (currentQuestion.type === 'multiple-choice') {
      setSelectedAnswers([answer]);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
    } else {
      setShowResults(true);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((question, index) => {
      if (question.correctAnswer === selectedAnswers[index]) {
        correct++;
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score >= quiz.passingScore;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quiz Results
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center">
          <div className={`text-4xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {score}%
          </div>
          <div className={`text-lg mb-4 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {passed ? '🎉 Congratulations! You passed!' : '😔 Keep practicing!'}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You got {score}% correct out of {quiz.questions.length} questions.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={handleRetakeQuiz}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retake Quiz
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {quiz.title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {currentQuestion.question}
        </h4>

        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  selectedAnswers.includes(option)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <button
          onClick={handleNextQuestion}
          disabled={selectedAnswers.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

