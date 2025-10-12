'use client';

import { useState, useEffect, useRef } from 'react';
import { QuizSession } from '@/lib/quiz-service';
import { detectLanguage } from '@/lib/question-plugins/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReportCard from '@/components/ReportCard';
import { QuestionResult, FailedQuestion } from '@/lib/report-card';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionVotingButtons from './QuestionVotingButtons';
import QuestionPoll from './QuestionPoll';
import { addQuestionToBank } from '@/lib/quiz-history';

interface QuizInterfaceProps {
  quizSession: QuizSession;
  onClose: () => void;
}

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

export default function QuizInterface({ quizSession, onClose }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<any[]>([]);
  const [loadingPct, setLoadingPct] = useState(0);
  const [waitForCompleteStream, setWaitForCompleteStream] = useState(true);
  const [showStreamingWarning, setShowStreamingWarning] = useState(false);

  const funTips = [
    'Tip: Off-by-one bugs are 0-based 90% of the time.',
    'Fact: await Promise.all is faster than serial awaits.',
    'Tip: Prefer === over == unless you love surprises.',
    'Fact: map + filter beats pushing in for-loops for clarity.',
    'Tip: In Python, default args are evaluated once—beware lists.',
    'Fact: In Java, put constants on the left: "foo".equals(x).',
    'Tip: Throttle for rate limits; debounce for noisy inputs.',
    'Fact: NaN !== NaN. But Number.isNaN(NaN) is true.',
  ];

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [showExplanations, setShowExplanations] = useState(false);
  const [shakingNext, setShakingNext] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [failedQuestions, setFailedQuestions] = useState<FailedQuestion[]>([]);
  const [questionRatings, setQuestionRatings] = useState<Record<string, 'up' | 'down'>>({});
  const [pollUpdatedQuestions, setPollUpdatedQuestions] = useState<Set<string>>(new Set());

  // Timers: per-question and overall (increase as questions stream in)
  const [questionTimeTotal, setQuestionTimeTotal] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [overallTimeTotal, setOverallTimeTotal] = useState(0);
  const [overallTimeLeft, setOverallTimeLeft] = useState(0);
  const lastAccumulatedCountRef = useRef(0);

  // Drive the loading bar and fetch when generating (must be before any early returns)
  useEffect(() => {
    if (!isGeneratingReport) return;
    let pct = 0;
    const id = setInterval(() => {
      pct = Math.min(95, pct + Math.random() * 12);
      setLoadingPct(Math.round(pct));
    }, 250);
    (async () => {
      try {
        console.log('🚀 Calling /api/reportCard with', results.length, 'results');
        const res = await fetch('/api/reportCard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, failedQuestions }) });
        const data = await res.json();
        console.log('📊 Report card API response:', data);
        console.log('🎫 Generated tickets:', data.tickets?.length || 0);
        setGeneratedTickets(data.tickets || []);
      } catch (e) {
        console.error('reportCard error', e);
      } finally {
        setLoadingPct(100);
        setIsGeneratingReport(false);
        setShowResults(true);
      }
    })();
    return () => clearInterval(id);
  }, [isGeneratingReport, results]);

  const totalQuestions = Array.isArray(quizSession.questions) ? quizSession.questions.length : 0;
  const hasQuestion = totalQuestions > 0 && currentQuestionIndex < totalQuestions;
  const currentQuestion: any = hasQuestion ? quizSession.questions[currentQuestionIndex] : undefined;

  // Utility: derive seconds based on code line counts (6s per line)
  function computeTimeForQuestion(q: any): number {
    try {
      let source = '';
      if (q?.codeContext && typeof q.codeContext === 'string') {
        source = q.codeContext as string;
      } else if (q?.type === 'function-variant' && Array.isArray(q?.variants) && q.variants[0]?.code) {
        source = q.variants[0].code as string;
      } else if (q?.type === 'order-sequence' && Array.isArray(q?.steps)) {
        source = (q.steps as any[]).map(s => s?.code || '').join('\n');
      } else if (typeof q?.question === 'string') {
        // fallback: approximate from question text length (6s per approx line)
        const approxLines = Math.ceil((q.question as string).length / 60);
        return Math.max(30, Math.min(15 * 60, approxLines * 6));
      }
      const lineCount = Math.max(1, String(source).split('\n').length);
      // 6 seconds per line, clamp between 30s and 15m
      return Math.max(30, Math.min(15 * 60, lineCount * 6));
    } catch {
      return 60; // safe fallback
    }
  }

  function formatTime(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  // Reset variant index when question changes
  useEffect(() => {
    setCurrentVariantIndex(0);
  }, [currentQuestion]);

  // Establish per-question time on question change
  useEffect(() => {
    if (!hasQuestion) return;
    const secs = computeTimeForQuestion(currentQuestion);
    setQuestionTimeTotal(secs);
    setQuestionTimeLeft(secs);
  }, [hasQuestion, currentQuestion]);

  // Accumulate overall time as questions stream in
  useEffect(() => {
    const count = Array.isArray(quizSession.questions) ? quizSession.questions.length : 0;
    if (count > lastAccumulatedCountRef.current) {
      let add = 0;
      for (let i = lastAccumulatedCountRef.current; i < count; i++) {
        const q = quizSession.questions[i];
        add += computeTimeForQuestion(q);
      }
      setOverallTimeTotal(prev => prev + add);
      setOverallTimeLeft(prev => prev + add);
      lastAccumulatedCountRef.current = count;
    }
  }, [quizSession?.questions?.length]);

  // Ticking interval (pause while showing explanations)
  useEffect(() => {
    if (showExplanations) return;
    if (!hasQuestion) return;
    const id = setInterval(() => {
      setQuestionTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      setOverallTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [showExplanations, hasQuestion, currentQuestionIndex]);

  const handleAnswerSelect = (answer: string) => {
    if (!hasQuestion) return;
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'fill-blank' || currentQuestion.type === 'function-variant' || currentQuestion.type === 'true-false') {
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
    let correctAnswersResolved: string[] = [];
    
    if (currentQuestion.type === 'function-variant') {
      // For function-variant, find the correct variant
      const correctVariant = currentQuestion.variants?.find((v: any) => v.isCorrect);
      isCorrect = correctVariant ? selectedAnswers.includes(correctVariant.id) : false;
      correctAnswersResolved = correctVariant ? [correctVariant.id] : [];
    } else if (currentQuestion.type === 'order-sequence') {
      // Support multiple valid orders and partial-order constraints
      const correctOrder = currentQuestion.correctOrder || [];
      const acceptableOrders = Array.isArray(currentQuestion.acceptableOrders) ? currentQuestion.acceptableOrders : [];
      const constraints = Array.isArray(currentQuestion.constraints) ? currentQuestion.constraints : [];

      const exactMatch = () => (
        selectedAnswers.length === correctOrder.length &&
        selectedAnswers.every((stepId: string, index: number) => stepId === correctOrder[index])
      );

      const matchesAnyAcceptable = () => (
        acceptableOrders.some((ord: string[]) => (
          Array.isArray(ord) &&
          selectedAnswers.length === ord.length &&
          selectedAnswers.every((id: string, idx: number) => id === ord[idx])
        ))
      );

      const satisfiesConstraints = () => {
        if (!constraints || constraints.length === 0) return false;
        const pos = new Map<string, number>();
        selectedAnswers.forEach((id: string, idx: number) => pos.set(id, idx));
        const allPrecedenceHold = constraints.every((c: any) => {
          let before: string | undefined;
          let after: string | undefined;
          if (Array.isArray(c) && c.length === 2) {
            [before, after] = c as [string, string];
          } else if (c && typeof c === 'object' && 'before' in c && 'after' in c) {
            before = c.before;
            after = c.after;
          }
          if (!before || !after) return false;
          const i = pos.get(before);
          const j = pos.get(after);
          return i !== undefined && j !== undefined && i < j;
        });
        // require same length to avoid partial sequences being counted
        return allPrecedenceHold && selectedAnswers.length === correctOrder.length;
      };

      isCorrect = exactMatch() || matchesAnyAcceptable() || satisfiesConstraints();
      correctAnswersResolved = Array.isArray(correctOrder) ? [...correctOrder] : [];
    } else if (currentQuestion.type === 'select-all') {
      // For select-all, check if selected answers match the correct indices
      const correctAnswers = currentQuestion.correctAnswers || [];
      
      // Debug: Log the actual data structure
      console.log('🔍 Select-All Debug:', {
        correctAnswers,
        correctAnswersType: typeof correctAnswers[0],
        selectedAnswers,
        options: currentQuestion.options
      });
      
      // Convert letter answers (A, B, C) to option indices
      const correctIndices = correctAnswers.map((letter: string) => {
        const charCode = letter.charCodeAt(0);
        return charCode - 65; // A=0, B=1, C=2, etc.
      });
      
      // Get the actual option texts that are correct
      const correctOptions = correctIndices.map((index: number) => currentQuestion.options[index]);
      
      console.log('🔍 Select-All Debug (processed):', {
        correctIndices,
        correctOptions
      });
      
      // For select-all questions, user must select ALL correct options and NO incorrect options
      const hasAllCorrectSelections = correctOptions.every((option: string) => selectedAnswers.includes(option));
      const hasIncorrectSelections = selectedAnswers.some((answer: string) => !correctOptions.includes(answer));
      
      // Answer is correct if: selected ALL correct options AND no incorrect selections
      isCorrect = hasAllCorrectSelections && !hasIncorrectSelections;
      correctAnswersResolved = correctOptions.filter(Boolean);
      
      console.log('🔍 Select-All Final Debug:', {
        selectedAnswers,
        correctOptions,
        hasAllCorrectSelections,
        hasIncorrectSelections,
        finalResult: isCorrect
      });
    } else {
      // For other question types
      isCorrect = Array.isArray(currentQuestion.correctAnswer)
        ? (currentQuestion.correctAnswer as string[]).every((answer: string) => selectedAnswers.includes(answer)) &&
          selectedAnswers.every((answer: string) => (currentQuestion.correctAnswer as string[]).includes(answer))
        : selectedAnswers.includes(currentQuestion.correctAnswer);
      correctAnswersResolved = Array.isArray(currentQuestion.correctAnswer)
        ? [...(currentQuestion.correctAnswer as string[])]
        : [currentQuestion.correctAnswer];
    }

    // Record result for this question
    const qId = (currentQuestion.id && String(currentQuestion.id)) || String(currentQuestionIndex + 1);
    const lang = currentQuestion.language || null;
    const resultEntry: QuestionResult = {
      questionId: qId,
      type: currentQuestion.type,
      language: lang,
      isCorrect,
      selectedAnswers: [...selectedAnswers],
      correctAnswers: correctAnswersResolved.filter(Boolean)
    };
    setResults(prev => {
      if (prev.some(r => r.questionId === qId)) return prev;
      return [...prev, resultEntry];
    });

    // Store full question data for failed questions
    if (!isCorrect) {
      const failedQuestion: FailedQuestion = {
        questionId: qId,
        type: currentQuestion.type,
        language: lang,
        question: currentQuestion.question || '',
        codeContext: currentQuestion.codeContext,
        selectedAnswers: [...selectedAnswers],
        correctAnswers: correctAnswersResolved.filter(Boolean),
        explanation: currentQuestion.explanation,
        variants: currentQuestion.variants,
        steps: currentQuestion.steps,
        options: currentQuestion.options
      };
      setFailedQuestions(prev => {
        if (prev.some(fq => fq.questionId === qId)) return prev;
        return [...prev, failedQuestion];
      });
    }

    if (isCorrect) {
      setScore(prev => prev + 1);
      setShowExplanations(true);
    } else {
      // Decrement lives, apply time penalty, and pause timers until next
      const nextLives = Math.max(0, lives - 1);
      setLives(nextLives);
      const penalty = Math.min(60, Math.ceil(questionTimeTotal * 0.25));
      setQuestionTimeLeft(0);
      setOverallTimeLeft(prev => Math.max(0, prev - penalty));
      if (nextLives === 0) {
        // End quiz immediately on zero lives → show report prompt
        setShowReportPrompt(true);
      } else {
        setShowExplanations(true);
      }
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    const nextAvailable = nextIndex < totalQuestions;
    
    // Check if we're trying to finish the quiz before streaming is complete
    const isFinishingQuiz = !nextAvailable;
    const isStreamingComplete = quizSession.completed || false;
    
    if (isFinishingQuiz && waitForCompleteStream && !isStreamingComplete) {
      // Show warning animation and prevent finishing
      setShowStreamingWarning(true);
      setTimeout(() => setShowStreamingWarning(false), 2000);
      return;
    }
    
    if (nextAvailable) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setCurrentVariantIndex(0);
      setShowExplanations(false);
    } else {
      // Finished quiz → prompt to view report card
      setShowReportPrompt(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setScore(0);
    setLives(3);
    setCurrentVariantIndex(0);
    setShowExplanations(false);
    setResults([]);
    setFailedQuestions([]);
    setPollUpdatedQuestions(new Set());
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

  const handleQuestionRating = async (questionId: string, rating: 'up' | 'down') => {
    console.log(`🚨 [QuizInterface] handleQuestionRating called with:`, { questionId, rating });
    console.log(`🚨 [QuizInterface] Full quizSession:`, quizSession);
    
    setQuestionRatings(prev => ({
      ...prev,
      [questionId]: rating
    }));
    
    console.log(`📊 Question ${questionId} rated as: ${rating}`);
    
    // Auto-save to question bank on upvote
    console.log(`🚨 [QuizInterface] Checking conditions:`, { 
      isUpvote: rating === 'up', 
      hasRepositoryInfo: !!quizSession.repositoryInfo,
      repositoryInfo: quizSession.repositoryInfo 
    });
    
    if (rating === 'up' && quizSession.repositoryInfo) {
      try {
        const repoUrl = `https://github.com/${quizSession.repositoryInfo.owner}/${quizSession.repositoryInfo.repo}`;
        const currentQuestion = quizSession.questions.find(q => q.id === questionId);
        
        console.log(`🔍 [QuizInterface] Upvoting question:`, currentQuestion);
        console.log(`🔍 [QuizInterface] Repository URL:`, repoUrl);
        
        if (currentQuestion) {
          // Attach repoUrl to the question before saving
          const questionWithRepo = {
            ...currentQuestion,
            repoUrl: repoUrl
          };
          
          console.log(`🚨 [QuizInterface] About to call addQuestionToBank with complete data...`);
          await addQuestionToBank(repoUrl, questionWithRepo as any, 85); // Start with high quality score
          console.log(`✅ Question added to ${repoUrl} question bank!`);
        } else {
          console.warn(`❌ [QuizInterface] Could not find question with ID: ${questionId}`);
        }
      } catch (error) {
        console.error('❌ Error adding question to bank:', error);
      }
    } else {
      console.log(`❌ [QuizInterface] Not saving to question bank:`, { 
        reason: rating !== 'up' ? 'not upvote' : 'no repository info' 
      });
    }
    
    // TODO: Save rating to Firebase when ready
  };

  const handlePollUpdate = (questionId: string, isCorrect: boolean) => {
    console.log(`📈 [QuizInterface] Poll update: Question ${questionId} - ${isCorrect ? 'PASSED' : 'FAILED'}`);
    console.log(`📈 [QuizInterface] Current pollUpdatedQuestions:`, Array.from(pollUpdatedQuestions));
    // Track that this question has been polled
    setPollUpdatedQuestions(prev => {
      const newSet = new Set([...prev, questionId]);
      console.log(`📈 [QuizInterface] Updated pollUpdatedQuestions:`, Array.from(newSet));
      return newSet;
    });
    // TODO: Save to Firebase when ready
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
        
        // Use language from quiz JSON if available
        console.log('🔍 Function-variant question data:', { 
          language: currentQuestion.language, 
          languageColor: currentQuestion.languageColor,
          languageBgColor: currentQuestion.languageBgColor 
        });
        const fvLang = currentQuestion.language 
          ? { name: currentQuestion.language, color: currentQuestion.languageColor || 'text-gray-600', bgColor: currentQuestion.languageBgColor || 'bg-gray-100' }
          : detectLanguage(''); // fallback
        console.log('🎨 Using language badge:', fvLang);

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
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-gray-700">
                <p className="text-sm text-gray-300 font-medium">
                  Analyze this code variant and determine if it&apos;s correct
                </p>
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${fvLang.bgColor} ${fvLang.color}`}>
                  {fvLang.name}
                </span>
              </div>
              
              <SyntaxHighlighter
                language={getHighlighterLanguage(fvLang.name)}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '0.9375rem',
                  lineHeight: '1.6',
                  borderRadius: 0
                }}
                showLineNumbers={true}
              >
                {currentVariant.code}
              </SyntaxHighlighter>
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
        // Calculate how many correct steps are needed
        const correctStepCount = currentQuestion.correctOrder?.length || 0;
        const stepsRemaining = Math.max(0, correctStepCount - selectedAnswers.length);
        const isAtLimit = selectedAnswers.length >= correctStepCount;
        
        // Use language from quiz JSON if available, otherwise detect
        console.log('🔍 Order-sequence question data:', { 
          language: currentQuestion.language, 
          languageColor: currentQuestion.languageColor,
          languageBgColor: currentQuestion.languageBgColor 
        });
        const quizLang = currentQuestion.language 
          ? { name: currentQuestion.language, color: currentQuestion.languageColor || 'text-gray-600', bgColor: currentQuestion.languageBgColor || 'bg-gray-100' }
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                    💡 Drag and drop the steps below to arrange them in the correct execution order for this function
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
                {currentQuestion.steps?.map((step: any, index: number) => {
                  const isAlreadySelected = selectedAnswers.includes(step.id);
                  const isDisabled = isAtLimit && !isAlreadySelected;
                  
                  return (
                    <div
                      key={step.id}
                      draggable={!isDisabled}
                      className={`p-4 bg-white dark:bg-gray-800 border-2 rounded-lg transition-all ${
                        isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-move hover:border-blue-300 dark:hover:border-blue-500'
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
                      const step = currentQuestion.steps?.find((s: any) => s.id === stepId);
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

              {/* Solution panel: show authoritative correct order with per-step explanations */}
              {showExplanations && Array.isArray(currentQuestion.correctOrder) && Array.isArray(currentQuestion.steps) && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Solution: Authoritative Order</h4>
                  <div className="space-y-2">
                    {currentQuestion.correctOrder.map((id: string, idx: number) => {
                      const step = currentQuestion.steps.find((s: any) => s.id === id);
                      if (!step) return null;
                      const userIndex = selectedAnswers.indexOf(id);
                      const userMatchedPosition = userIndex === idx;
                      return (
                        <div
                          key={id}
                          className={`p-3 rounded-lg border-2 ${userMatchedPosition ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-blue-200 bg-white dark:bg-gray-800 dark:border-blue-900/40'}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${userMatchedPosition ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{idx + 1}</div>
                            <div className="flex-1">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{step.code}</pre>
                              {step.explanation && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{step.explanation}</p>
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

                  {currentQuestion.explanation && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Overall Explanation:</strong> {currentQuestion.explanation}</p>
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
              {currentQuestion.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className={`p-6 rounded-xl border-2 transition-all text-center ${
                    selectedAnswers.includes(option)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl font-bold ${
                      selectedAnswers.includes(option)
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {option === 'True' ? '✓' : '✗'}
                    </div>
                    <span className="text-xl font-semibold">{option}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Additional context or hint */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                📝 Select all statements that are correct. You can select multiple options.
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                Read each option carefully and check all that apply to the given code.
              </p>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-3">
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
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      selectedAnswers.includes(option)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedAnswers.includes(option) && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-base leading-relaxed">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selection Counter */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
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
  };

  if (showResults) {
    return (
      <ReportCard results={results} failedQuestions={failedQuestions} onRetry={handleRetry} onClose={onClose} initialTickets={generatedTickets} />
    );
  }

  // Report prompt modal
  if (showReportPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col items-center text-center">
            <div
              className="w-40 h-40 rounded-xl bg-center bg-cover"
              style={{ backgroundImage: `url(/report-bot.png)` }}
              aria-label="Report Bot"
            />
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Read your report card?</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">We can analyze your answers and generate personalized bug-fix tickets.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 w-full">
              <button
                className="py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                onClick={async () => {
                  setIsGeneratingReport(true);
                  setShowReportPrompt(false);
                }}
              >
                Yes
              </button>
              <button
                className="py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                onClick={() => {
                  // Skip server generation; still show local report UI
                  setGeneratedTickets([]);
                  setShowReportPrompt(false);
                  setShowResults(true);
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen while generating report
  if (isGeneratingReport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
          <div
            className="w-48 h-48 rounded-xl bg-center bg-cover"
            style={{ backgroundImage: `url(/report-bot.png)` }}
            aria-label="Loading"
          />
          <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">Generating your report card…</div>
          <div className="mt-3 w-full">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${loadingPct}%` }} />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center min-h-[32px]">
            {(funTips)[Math.floor(loadingPct / 10) % funTips.length]}
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
                  <>
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                    {currentQuestion.isCached && (
                      <span className="ml-3 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Community Reviewed
                      </span>
                    )}
                  </>
                ) : (
                  <>Loading questions…</>
                )}
              </div>
              
              {/* Score */}
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Score: {score}
              </div>
              
            {/* Timers */}
            <div className="hidden sm:flex items-center space-x-4">
              {/* Per-question timer */}
              <div className="w-40">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Q Time</span>
                  <span className={`${questionTimeLeft <= 3 ? 'text-red-600 dark:text-red-400 animate-pulse' : (questionTimeTotal > 0 && questionTimeLeft / questionTimeTotal <= 0.2 ? 'text-red-600 dark:text-red-400' : '')}`}>
                    {formatTime(questionTimeLeft)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${questionTimeLeft <= 3 ? 'bg-red-600 animate-pulse' : (questionTimeTotal > 0 && questionTimeLeft / questionTimeTotal <= 0.2 ? 'bg-red-600 animate-pulse' : 'bg-blue-600')} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${questionTimeTotal > 0 ? (questionTimeLeft / questionTimeTotal) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              {/* Overall timer */}
              <div className="w-40">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Total</span>
                  <span className={`${overallTimeTotal > 0 && overallTimeLeft / overallTimeTotal <= 0.15 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {formatTime(overallTimeLeft)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${overallTimeTotal > 0 && overallTimeLeft / overallTimeTotal <= 0.15 ? 'bg-red-600 animate-pulse' : 'bg-indigo-600'} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${overallTimeTotal > 0 ? (overallTimeLeft / overallTimeTotal) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

              {/* Lives */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Lives:</span>
                <div className="flex space-x-1">
                  {[0,1,2].map((i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (i >= lives && lives < 3) {
                          setLives(prev => Math.min(3, prev + 1));
                        }
                      }}
                      className={`w-4 h-4 rounded-full transition-colors ${
                        i < lives 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 cursor-pointer'
                      }`}
                      title={i >= lives ? 'Click to restore life' : 'Life active'}
                    ></button>
                  ))}
                </div>
              </div>

              {/* Settings Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Wait for complete stream:</span>
                <button
                  onClick={() => setWaitForCompleteStream(!waitForCompleteStream)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    waitForCompleteStream ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      waitForCompleteStream ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
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

      {/* Streaming Warning Animation */}
      <AnimatePresence>
        {showStreamingWarning && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg border border-red-400">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </motion.div>
                <div>
                  <div className="font-semibold">Quiz Still Streaming!</div>
                  <div className="text-sm opacity-90">Please wait for all questions to load before finishing.</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {/* Community Reviewed Badge - Prominent */}
            {currentQuestion.isCached && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300 rounded-lg border-2 border-green-300 dark:border-green-700 font-semibold text-sm shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ✨ Community Reviewed Question
                </span>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {currentQuestion.question}
            </h2>
            
            {currentQuestion.codeContext && (currentQuestion.type === 'function-variant' || currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false' || currentQuestion.type === 'select-all') && (
              <div className="rounded-lg mb-4 overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700">
                  <p className="text-sm text-gray-300 font-medium">Code Context</p>
                  {currentQuestion.language && (
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${currentQuestion.languageBgColor || 'bg-gray-700'} ${currentQuestion.languageColor || 'text-gray-300'}`}>
                      {currentQuestion.language}
                    </span>
                  )}
                </div>
                <SyntaxHighlighter
                  language={getHighlighterLanguage(currentQuestion.language || 'JavaScript')}
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
                  {currentQuestion.codeContext}
                </SyntaxHighlighter>
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="mb-8">
            {renderQuestion()}
          </div>

          {/* Explanations for all question types */}
          {showExplanations && (currentQuestion.type === 'function-variant' && currentQuestion.variants) && (
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
                          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-3">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700">
                              <span className="text-xs text-gray-400 font-medium">Code</span>
                              {currentQuestion.language && (
                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${currentQuestion.languageBgColor || 'bg-gray-700'} ${currentQuestion.languageColor || 'text-gray-300'}`}>
                                  {currentQuestion.language}
                                </span>
                              )}
                            </div>
                            <SyntaxHighlighter
                              language={getHighlighterLanguage(currentQuestion.language || 'JavaScript')}
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
          )}

          {/* Explanations for True/False and other question types */}
          {showExplanations && currentQuestion.type === 'true-false' && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Answer Explanation
              </h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  Array.isArray(currentQuestion.correctAnswer) 
                    ? selectedAnswers.every((answer: string) => currentQuestion.correctAnswer.includes(answer)) &&
                      currentQuestion.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                    : selectedAnswers.includes(currentQuestion.correctAnswer)
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      Array.isArray(currentQuestion.correctAnswer) 
                        ? selectedAnswers.every((answer: string) => currentQuestion.correctAnswer.includes(answer)) &&
                          currentQuestion.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                        : selectedAnswers.includes(currentQuestion.correctAnswer)
                        ? 'border-green-500 bg-green-500'
                        : 'border-red-500 bg-red-500'
                    }`}>
                      <span className="text-white text-sm font-bold">
                        {Array.isArray(currentQuestion.correctAnswer) 
                          ? selectedAnswers.every((answer: string) => currentQuestion.correctAnswer.includes(answer)) &&
                            currentQuestion.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                          : selectedAnswers.includes(currentQuestion.correctAnswer) ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Your Answer: {selectedAnswers[0] || 'None'}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          | Correct Answer: {currentQuestion.correctAnswer}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          Array.isArray(currentQuestion.correctAnswer) 
                            ? selectedAnswers.every((answer: string) => currentQuestion.correctAnswer.includes(answer)) &&
                              currentQuestion.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                            : selectedAnswers.includes(currentQuestion.correctAnswer)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {Array.isArray(currentQuestion.correctAnswer) 
                            ? selectedAnswers.every((answer: string) => currentQuestion.correctAnswer.includes(answer)) &&
                              currentQuestion.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                            : selectedAnswers.includes(currentQuestion.correctAnswer) ? 'Correct ✓' : 'Incorrect ✗'}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        Array.isArray(currentQuestion.correctAnswer) 
                          ? selectedAnswers.every((answer: string) => currentQuestion.correctAnswer.includes(answer)) &&
                            currentQuestion.correctAnswer.every((answer: string) => selectedAnswers.includes(answer))
                          : selectedAnswers.includes(currentQuestion.correctAnswer)
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanations for Multiple Choice */}
          {showExplanations && currentQuestion.type === 'multiple-choice' && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Answer Explanation
              </h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  selectedAnswers.includes(currentQuestion.correctAnswer)
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedAnswers.includes(currentQuestion.correctAnswer)
                        ? 'border-green-500 bg-green-500'
                        : 'border-red-500 bg-red-500'
                    }`}>
                      <span className="text-white text-sm font-bold">
                        {selectedAnswers.includes(currentQuestion.correctAnswer) ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Your Answer: {selectedAnswers[0] || 'None'}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          | Correct Answer: {currentQuestion.correctAnswer}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedAnswers.includes(currentQuestion.correctAnswer)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {selectedAnswers.includes(currentQuestion.correctAnswer) ? 'Correct ✓' : 'Incorrect ✗'}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        selectedAnswers.includes(currentQuestion.correctAnswer)
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanations for Select All */}
          {showExplanations && currentQuestion.type === 'select-all' && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Answer Explanation
              </h3>
              <div className="space-y-3">
                {currentQuestion.options?.map((option: string, index: number) => {
                  const correctAnswers = currentQuestion.correctAnswers || [];
                  
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
                    <strong>Overall Explanation:</strong> {currentQuestion.explanation}
                  </p>
                </div>
              </div>
          </div>
        )}

          {/* Question Voting Buttons */}
          <QuestionVotingButtons
            questionId={currentQuestion.id}
            questionIndex={currentQuestionIndex}
            showExplanations={showExplanations}
            currentRating={questionRatings[currentQuestion.id]}
            onRating={handleQuestionRating}
          />
          
          {/* Debug: Log current question data */}
          {showExplanations && console.log(`🔍 [QuizInterface] Current question data:`, {
            id: currentQuestion.id,
            type: currentQuestion.type,
            question: currentQuestion.question?.substring(0, 100) + '...',
            hasCodeContext: !!currentQuestion.codeContext,
            repositoryInfo: quizSession.repositoryInfo
          })}

          {/* Question Poll Stats */}
          <QuestionPoll
            questionId={currentQuestion.id}
            questionIndex={currentQuestionIndex}
            showExplanations={showExplanations}
            isCorrect={(() => {
              // Find the result for THIS specific question, not the last result
              const questionResult = results.find(r => r.questionId === currentQuestion.id);
              return questionResult?.isCorrect || false;
            })()}
            shouldUpdate={(() => {
              const shouldUpdate = !pollUpdatedQuestions.has(currentQuestion.id);
              console.log(`🔍 [QuizInterface] shouldUpdate for ${currentQuestion.id}:`, shouldUpdate, 'pollUpdatedQuestions:', Array.from(pollUpdatedQuestions));
              return shouldUpdate;
            })()}
            onPollUpdate={handlePollUpdate}
          />

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
