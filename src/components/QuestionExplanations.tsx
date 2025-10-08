'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Map our language names to syntax highlighter language codes
function getHighlighterLanguage(lang: string): string {
  const langMap: Record<string, string> = {
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'React': 'jsx',
    'React TS': 'tsx',
    'Python': 'python',
    'Java': 'java',
    'Go': 'go',
    'Rust': 'rust',
    'C#': 'csharp',
    'C': 'c',
    'C++': 'cpp',
    'PHP': 'php',
    'Ruby': 'ruby',
    'Swift': 'swift',
    'Kotlin': 'kotlin',
    'Scala': 'scala',
    'Shell': 'bash',
    'SQL': 'sql'
  };
  return langMap[lang] || 'javascript';
}

interface QuestionExplanationsProps {
  question: any;
  selectedAnswers: string[];
  showExplanations: boolean;
}

export default function QuestionExplanations({
  question,
  selectedAnswers,
  showExplanations
}: QuestionExplanationsProps) {
  if (!showExplanations) return null;

  const renderFunctionVariantExplanations = () => (
    <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Answer Explanations
      </h3>
      <div className="space-y-4">
        {question.variants.map((variant: any, index: number) => {
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
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-3">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700">
                      <span className="text-xs text-gray-400 font-medium">Code</span>
                      {question.language && (
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${question.languageBgColor || 'bg-gray-700'} ${question.languageColor || 'text-gray-300'}`}>
                          {question.language}
                        </span>
                      )}
                    </div>
                    <SyntaxHighlighter
                      language={getHighlighterLanguage(question.language || 'JavaScript')}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        borderRadius: 0
                      }}
                      showLineNumbers={true}
                    >
                      {variant.code}
                    </SyntaxHighlighter>
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
  );

  const renderTrueFalseExplanations = () => (
    <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Answer Explanation
      </h3>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border-2 ${
          Array.isArray(question.correctAnswer) 
            ? selectedAnswers.every((answer: string) => question.correctAnswer.includes(answer)) &&
              question.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
            : selectedAnswers.includes(question.correctAnswer)
            ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
            : 'border-red-200 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              Array.isArray(question.correctAnswer) 
                ? selectedAnswers.every((answer: string) => question.correctAnswer.includes(answer)) &&
                  question.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                : selectedAnswers.includes(question.correctAnswer)
                ? 'border-green-500 bg-green-500'
                : 'border-red-500 bg-red-500'
            }`}>
              <span className="text-white text-sm font-bold">
                {Array.isArray(question.correctAnswer) 
                  ? selectedAnswers.every((answer: string) => question.correctAnswer.includes(answer)) &&
                    question.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                  : selectedAnswers.includes(question.correctAnswer) ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Your Answer: {selectedAnswers[0] || 'None'}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  | Correct Answer: {question.correctAnswer}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  Array.isArray(question.correctAnswer) 
                    ? selectedAnswers.every((answer: string) => question.correctAnswer.includes(answer)) &&
                      question.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                    : selectedAnswers.includes(question.correctAnswer)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {Array.isArray(question.correctAnswer) 
                    ? selectedAnswers.every((answer: string) => question.correctAnswer.includes(answer)) &&
                      question.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                    : selectedAnswers.includes(question.correctAnswer) ? 'Correct ✓' : 'Incorrect ✗'}
                </span>
              </div>
              <p className={`text-sm ${
                Array.isArray(question.correctAnswer) 
                  ? selectedAnswers.every((answer: string) => question.correctAnswer.includes(answer)) &&
                    question.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                  : selectedAnswers.includes(question.correctAnswer)
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMultipleChoiceExplanations = () => (
    <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Answer Explanation
      </h3>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border-2 ${
          selectedAnswers.includes(question.correctAnswer)
            ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
            : 'border-red-200 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selectedAnswers.includes(question.correctAnswer)
                ? 'border-green-500 bg-green-500'
                : 'border-red-500 bg-red-500'
            }`}>
              <span className="text-white text-sm font-bold">
                {selectedAnswers.includes(question.correctAnswer) ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Your Answer: {selectedAnswers[0] || 'None'}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  | Correct Answer: {question.correctAnswer}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedAnswers.includes(question.correctAnswer)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {selectedAnswers.includes(question.correctAnswer) ? 'Correct ✓' : 'Incorrect ✗'}
                </span>
              </div>
              <p className={`text-sm ${
                selectedAnswers.includes(question.correctAnswer)
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSelectAllExplanations = () => (
    <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Answer Explanation
      </h3>
      <div className="space-y-3">
        {question.options?.map((option: string, index: number) => {
          const correctAnswers = question.correctAnswers || [];
          
          // Convert letter answers (A, B, C) to option indices for comparison
          const correctIndices = correctAnswers.map((letter: string) => {
            const charCode = letter.charCodeAt(0);
            return charCode - 65; // A=0, B=1, C=2, etc.
          });
          
          const isCorrectOption = correctIndices.includes(index);
          const isSelectedOption = selectedAnswers.includes(option);
          const isUserCorrect = isSelectedOption === isCorrectOption;
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                isCorrectOption
                  ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center flex-shrink-0 ${
                  isCorrectOption
                    ? 'border-green-500 bg-green-500'
                    : 'border-red-500 bg-red-500'
                }`}>
                  {isCorrectOption && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!isCorrectOption && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {isCorrectOption ? 'Correct' : 'Incorrect'}
                    </span>
                    {isSelectedOption && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isUserCorrect
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {isUserCorrect ? 'You selected ✓' : 'You selected ✗'}
                      </span>
                    )}
                    {!isSelectedOption && isCorrectOption && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        You missed this ⚠️
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {option}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Overall explanation */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Overall Explanation:</strong> {question.explanation}
          </p>
        </div>
      </div>
    </div>
  );

  switch (question.type) {
    case 'function-variant':
      return renderFunctionVariantExplanations();
    case 'true-false':
      return renderTrueFalseExplanations();
    case 'multiple-choice':
      return renderMultipleChoiceExplanations();
    case 'select-all':
      return renderSelectAllExplanations();
    default:
      return null;
  }
}
