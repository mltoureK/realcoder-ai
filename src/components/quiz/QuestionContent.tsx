'use client';

import { Dispatch, SetStateAction } from 'react';
import { detectLanguage } from '@/lib/question-plugins/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getHighlighterLanguage } from './language';

interface QuestionContentProps {
  question: any;
  selectedAnswers: string[];
  setSelectedAnswers: Dispatch<SetStateAction<string[]>>;
  onAnswerSelect: (answer: string) => void;
  showExplanations: boolean;
  sanitizeExplanation: (text?: string | null) => string;
  currentVariantIndex: number;
  onVariantNavigation: (direction: 'prev' | 'next') => void;
  onVariantSelect: (variantId: string) => void;
  isVariantCodeExpanded: boolean;
  setIsVariantCodeExpanded: Dispatch<SetStateAction<boolean>>;
}

export function QuestionContent({
  question,
  selectedAnswers,
  setSelectedAnswers,
  onAnswerSelect,
  showExplanations,
  sanitizeExplanation,
  currentVariantIndex,
  onVariantNavigation,
  onVariantSelect,
  isVariantCodeExpanded,
  setIsVariantCodeExpanded
}: QuestionContentProps) {
  if (!question) return null;
  
  switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            {question.options?.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => onAnswerSelect(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedAnswers.includes(option)
                    ? 'border-slate-300 bg-slate-100 dark:bg-slate-800/60'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswers.includes(option)
                      ? 'border-slate-900 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedAnswers.includes(option) && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-lg leading-relaxed break-words">{option}</span>
                </div>
              </button>
            ))}
          </div>
        );
      case 'fill-blank':
        // Render a Duolingo-like drag-to-fill experience
        // Find the blank and render a drop zone that accepts option chips
        const qText = question.question || '';
        const parts = qText.split('____');
        const filledToken = selectedAnswers[0];
        return (
          <div className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-base text-gray-700 dark:text-gray-200 font-mono whitespace-pre-wrap">
                {parts[0]}
                <span
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const token = e.dataTransfer.getData('text/plain');
                    if (token) onAnswerSelect(token);
                  }}
                  className={`inline-flex items-center px-3 py-1 rounded-md border-2 mx-1 select-none ${
                    filledToken
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200'
                      : 'border-dashed border-slate-400 text-slate-700 dark:text-slate-200'
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
              {question.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', option)}
                  onClick={() => onAnswerSelect(option)}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                    selectedAnswers.includes(option)
                      ? 'border-blue-600 bg-slate-100 dark:bg-slate-800/70 text-blue-700 dark:text-blue-200'
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
        if (!question.variants || question.variants.length === 0) {
          return <div>No variants available</div>;
        }

        const currentVariant = question.variants[currentVariantIndex];
        const totalVariants = question.variants.length;
        const isFirstVariant = currentVariantIndex === 0;
        const isLastVariant = currentVariantIndex === totalVariants - 1;
        
        // Use language from quiz JSON if available
        console.log('🔍 Function-variant question data:', { 
          language: question.language, 
          languageColor: question.languageColor,
          languageBgColor: question.languageBgColor 
        });
        const fvLang = question.language 
          ? { name: question.language, color: question.languageColor || 'text-gray-600', bgColor: question.languageBgColor || 'bg-gray-100' }
          : detectLanguage(''); // fallback
        console.log('🎨 Using language badge:', fvLang);
        const variantLineCount = typeof currentVariant?.code === 'string' ? currentVariant.code.split('\n').length : 0;
        const shouldClampVariant = variantLineCount > 36;

        return (
          <div className="space-y-6 sm:space-y-8">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 bg-slate-100 dark:bg-slate-800/80 p-4 sm:p-6 rounded-xl">
              <button
                onClick={() => onVariantNavigation('prev')}
                disabled={isFirstVariant}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium w-full sm:w-auto ${
                  isFirstVariant
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm sm:text-base">Previous</span>
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
                onClick={() => onVariantNavigation('next')}
                disabled={isLastVariant}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium w-full sm:w-auto ${
                  isLastVariant
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="text-sm sm:text-base">Next</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Code Display */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-gray-700">
                <p className="text-sm text-gray-300 font-medium">
                  Analyze this code variant and determine if it&apos;s correct
                </p>
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${fvLang.bgColor} ${fvLang.color}`}>
                  {fvLang.name}
                </span>
              </div>
              <div className={`relative ${shouldClampVariant && !isVariantCodeExpanded ? 'max-h-72 overflow-hidden' : ''}`}>
                <div className={`overflow-x-auto ${shouldClampVariant && !isVariantCodeExpanded ? 'max-h-72 overflow-y-auto' : 'overflow-y-auto'}`}>
                  <SyntaxHighlighter
                    language={getHighlighterLanguage(fvLang.name)}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      borderRadius: 0,
                      width: '100%'
                    }}
                    wrapLongLines={true}
                    showLineNumbers={true}
                  >
                    {currentVariant.code}
                  </SyntaxHighlighter>
                </div>
                {shouldClampVariant && !isVariantCodeExpanded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/80 to-transparent" />
                )}
              </div>
              {shouldClampVariant && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-slate-100 dark:bg-slate-800/80/60 flex justify-center">
                  <button
                    onClick={() => setIsVariantCodeExpanded((prev) => !prev)}
                    className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    {isVariantCodeExpanded ? 'Collapse Code' : 'Expand Full Code'}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => onVariantSelect(currentVariant.id)}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                  selectedAnswers.includes(currentVariant.id)
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200'
                }`}
              >
                {selectedAnswers.includes(currentVariant.id) ? '✓ Selected' : 'Select This Variant'}
              </button>
              
              {!isLastVariant && (
                <button
                  onClick={() => onVariantNavigation('next')}
                  className="w-full sm:w-auto flex-1 sm:flex-none py-3 px-6 rounded-lg font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Skip to Next
                </button>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2">
              {question.variants.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentVariantIndex(index)}
                  className={`w-4 h-4 rounded-full transition-all hover:scale-110 ${
                    index === currentVariantIndex
                      ? 'bg-slate-900 shadow-lg dark:bg-slate-100'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        );

      case 'order-sequence':
        // Calculate how many correct steps are needed
        const correctStepCount = question.correctOrder?.length || 0;
        const stepsRemaining = Math.max(0, correctStepCount - selectedAnswers.length);
        const isAtLimit = selectedAnswers.length >= correctStepCount;
        
        // Use language from quiz JSON if available, otherwise detect
        console.log('🔍 Order-sequence question data:', { 
          language: question.language, 
          languageColor: question.languageColor,
          languageBgColor: question.languageBgColor 
        });
        const quizLang = question.language 
          ? { name: question.language, color: question.languageColor || 'text-gray-600', bgColor: question.languageBgColor || 'bg-gray-100' }
          : detectLanguage(''); // fallback
        console.log('🎨 Using language badge:', quizLang);
        
        return (
          <div className="space-y-6">
            {/* Language Badge at Top */}
            <div className="flex items-center justify-between">
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${quizLang.bgColor} ${quizLang.color}`}>
                {quizLang.name}
              </span>
            </div>
            
            {/* Instructions */}
            <div className="bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                    💡 Click on steps or drag and drop to arrange them in the correct execution order for this function
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                    Pay attention to dependencies, async operations, and error handling patterns
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stepsRemaining}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    {stepsRemaining === 1 ? 'step left' : 'steps left'}
                  </div>
                </div>
              </div>
            </div>

            {/* Draggable Steps Bank */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Steps:
                {isAtLimit && (
                  <span className="ml-3 text-sm text-orange-600 dark:text-orange-400 font-normal">
                    ⚠️ Step limit reached - remove a step from your answer to add a different one
                  </span>
                )}
              </h3>
              <div className="grid gap-3">
                {question.steps?.map((step: any, index: number) => {
                  const isAlreadySelected = selectedAnswers.includes(step.id);
                  const isDisabled = isAtLimit && !isAlreadySelected;
                  
                  return (
                    <div
                      key={step.id}
                      draggable={!isDisabled}
                      className={`p-4 bg-white dark:bg-gray-800 border-2 rounded-lg transition-all ${
                        isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-500'
                      } ${
                        isAlreadySelected ? 'opacity-50' : ''
                      } ${
                        showExplanations && step.isDistractor 
                          ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      onDragStart={(e) => {
                        if (isDisabled) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('text/plain', step.id);
                      }}
                      onClick={() => {
                        if (isDisabled || isAlreadySelected) return;
                        
                        // Add step to selected answers (click-to-add functionality)
                        setSelectedAnswers(prev => [...prev, step.id]);
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-3 space-y-3 sm:space-y-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          showExplanations && step.isDistractor 
                            ? 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {showExplanations && step.isDistractor ? '⚠️' : (isAlreadySelected ? '✓' : '+')}
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                          <div className="overflow-x-auto">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                              {step.code}
                            </pre>
                          </div>
                        {showExplanations && (
                          <p className={`text-xs mt-1 ${
                            step.isDistractor 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {sanitizeExplanation(step.explanation)}
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
                  );
                })}
              </div>
            </div>

            {/* Drop Zone for Ordered Steps */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Correct Order:
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400 font-normal">
                  ({selectedAnswers.length} / {correctStepCount} steps)
                </span>
              </h3>
              <div
                className="min-h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-slate-100 dark:bg-slate-800/80"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-slate-400', 'bg-slate-100', 'dark:bg-slate-800/60');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-slate-400', 'bg-slate-100', 'dark:bg-slate-800/60');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-slate-400', 'bg-slate-100', 'dark:bg-slate-800/60');
                  const stepId = e.dataTransfer.getData('text/plain');
                  if (!stepId) return;
                  
                  setSelectedAnswers(prev => {
                    const next = [...prev];
                    const existingIdx = next.indexOf(stepId);
                    
                    if (existingIdx >= 0) {
                      // Already selected - just reorder to end
                      next.splice(existingIdx, 1);
                      next.push(stepId);
                      return next;
                    }
                    
                    // Not selected yet - check limit
                    if (next.length >= correctStepCount) {
                      console.log('⚠️ Cannot add more steps - limit reached');
                      return prev; // Don't add, return unchanged
                    }
                    
                    // Add to end
                    next.push(stepId);
                    return next;
                  });
                }}
              >
                {selectedAnswers.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>Drag {correctStepCount} step{correctStepCount === 1 ? '' : 's'} here to build the correct order</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAnswers.map((stepId, index) => {
                      const step = question.steps?.find((s: any) => s.id === stepId);
                      if (!step) return null;
                      return (
                        <div
                          key={stepId}
                          draggable
                          className={`flex items-center space-x-3 p-3 border rounded-lg transition-shadow duration-150 ${
                            showExplanations && step.isDistractor 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                          }`}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', stepId);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const target = e.currentTarget as HTMLDivElement;
                            const rect = target.getBoundingClientRect();
                            const isAfter = e.clientY > rect.top + rect.height / 2;
                            // Visual cue: thin line at top or bottom using inset box-shadow
                            target.classList.add('border-blue-400');
                            target.style.boxShadow = isAfter
                              ? 'inset 0 -3px 0 0 rgba(59, 130, 246, 1)'
                              : 'inset 0 3px 0 0 rgba(59, 130, 246, 1)';
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget as HTMLDivElement;
                            target.classList.remove('border-blue-400');
                            target.style.boxShadow = '';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const target = e.currentTarget as HTMLDivElement;
                            target.classList.remove('border-blue-400');
                            target.style.boxShadow = '';
                            const draggedId = e.dataTransfer.getData('text/plain');
                            if (!draggedId) return;
                            setSelectedAnswers(prev => {
                              const next = [...prev];
                              const fromIdx = next.indexOf(draggedId);
                              const rect = target.getBoundingClientRect();
                              const isAfter = e.clientY > rect.top + rect.height / 2;
                              let toIdx = index + (isAfter ? 1 : 0);
                              // Clamp destination bounds
                              if (toIdx < 0) toIdx = 0;
                              if (toIdx > next.length) toIdx = next.length;
                              if (fromIdx === -1) {
                                // Insert from bank at computed position
                                // Check limit before inserting new step
                                if (next.length >= correctStepCount) {
                                  console.log('⚠️ Cannot add more steps - limit reached');
                                  return prev;
                                }
                                if (!next.includes(draggedId)) next.splice(toIdx, 0, draggedId);
                                return next;
                              }
                              if (fromIdx === toIdx || fromIdx === toIdx - 1) {
                                // No-op move (dropping to same place)
                                return next;
                              }
                              const [moved] = next.splice(fromIdx, 1);
                              if (fromIdx < toIdx) toIdx -= 1; // account for removal shift
                              next.splice(toIdx, 0, moved);
                              return next;
                            });
                          }}
                        >
                          <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                            showExplanations && step.isDistractor 
                              ? 'bg-red-600' 
                              : 'bg-slate-900 dark:bg-slate-100'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="overflow-x-auto">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                {step.code}
                              </pre>
                            </div>
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

              {/* Solution panel: show authoritative correct order with per-step explanations */}
              {showExplanations && Array.isArray(question.correctOrder) && Array.isArray(question.steps) && (
                <div className="mt-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Solution: Authoritative Order</h4>
                  <div className="space-y-2">
                    {question.correctOrder.map((id: string, idx: number) => {
                      const step = question.steps.find((s: any) => s.id === id);
                      if (!step) return null;
                      const userIndex = selectedAnswers.indexOf(id);
                      const userMatchedPosition = userIndex === idx;
                      return (
                        <div
                          key={id}
                          className={`p-3 rounded-lg border-2 ${userMatchedPosition ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-blue-200 bg-white dark:bg-gray-800 dark:border-blue-900/40'}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${userMatchedPosition ? 'bg-green-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}>{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="overflow-x-auto">
                                <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{step.code}</pre>
                              </div>
                              {step.explanation && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{sanitizeExplanation(step.explanation)}</p>
                              )}
                              {!userMatchedPosition && userIndex >= 0 && (
                                <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-300">You placed this at position {userIndex + 1}.</p>
                              )}
                              {step.isDistractor && (
                                <span className="inline-block mt-1 px-2 py-1 text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full">Distractor</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {question.explanation && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Overall Explanation:</strong> {sanitizeExplanation(question.explanation)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-6">
            {/* True/False Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {question.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => onAnswerSelect(option)}
                  className={`p-6 rounded-xl border-2 transition-all text-center ${
                    selectedAnswers.includes(option)
                      ? 'border-slate-300 bg-slate-100 dark:bg-slate-800/60 text-blue-700 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl font-bold ${
                      selectedAnswers.includes(option)
                        ? 'border-slate-900 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {option === 'True' ? '✓' : '✗'}
                    </div>
                    <span className="text-xl font-semibold leading-relaxed break-words">{option}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Additional context or hint */}
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                💡 Consider the code behavior, edge cases, and JavaScript runtime characteristics
              </p>
            </div>
          </div>
        );

      case 'select-all':
        return (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                📝 Select all statements that are correct. You can select multiple options.
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                Read each option carefully and check all that apply to the given code.
              </p>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-3">
              {question.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => onAnswerSelect(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedAnswers.includes(option)
                      ? 'border-slate-300 bg-slate-100 dark:bg-slate-800/60'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      selectedAnswers.includes(option)
                        ? 'border-slate-900 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedAnswers.includes(option) && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-base leading-relaxed break-words">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selection Counter */}
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {selectedAnswers.length === 0 
                  ? "No options selected yet"
                  : `${selectedAnswers.length} option${selectedAnswers.length === 1 ? '' : 's'} selected`
                }
              </p>
            </div>
          </div>
        );

      default:
        return <div>Question type not supported</div>;
    }
  }
