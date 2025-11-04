'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QuizSession } from '@/lib/quiz-service';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReportCard from '@/components/ReportCard';
import { QuestionResult, FailedQuestion } from '@/lib/report-card';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionVotingButtons from './QuestionVotingButtons';
import QuestionPoll from './QuestionPoll';
import { addQuestionToBank, saveQuizResults, rateQuestion } from '@/lib/quiz-history';
import { useAuth } from '@/context/AuthContext';
import { QuizHeader } from './quiz/QuizHeader';
import { ShareModal } from './quiz/ShareModal';
import { ReportPrompt } from './quiz/ReportPrompt';
import { ReportLoadingOverlay } from './quiz/ReportLoadingOverlay';
import { QuestionContent } from './quiz/QuestionContent';
import { useShareLink } from './quiz/useShareLink';
import { getHighlighterLanguage } from './quiz/language';

interface QuizInterfaceProps {
  quizSession: QuizSession;
  onClose: () => void;
}

const STARTING_LIVES = 5;
const MAX_LIVES = 5;

export default function QuizInterface({ quizSession, onClose }: QuizInterfaceProps) {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<any[]>([]);
  const [loadingPct, setLoadingPct] = useState(0);
  
  const [showStreamingWarning, setShowStreamingWarning] = useState(false);
  const [showFullscreenCode, setShowFullscreenCode] = useState(false);
  const [isVariantCodeExpanded, setIsVariantCodeExpanded] = useState(false);

  const funTips = [
    'Remember to trace the data flow through each branch before committing to an answer.',
    'Double-check the assumptions a function makes about its arguments.',
    'When in doubt, rewrite the snippet in plain English to expose hidden logic.',
    'Look for error handling—what happens when inputs are unexpected?',
    'Scan the return paths; many bugs come from one branch returning too early.',
    'Complex conditions often hide the real intention. Simplify them mentally first.',
    'Name collisions and shadowed variables can change behavior—watch the scopes.',
    'Before optimising, ensure you understand the baseline behaviour of the code.',
  ];

  const sanitizeExplanation = useCallback((text?: string | null) => {
    if (!text) return text ?? '';
    return text.replace(/—/g, ',');
  }, []);

  const formatVariantForDisplay = useCallback((code?: string) => {
    if (!code) return '';
    const trimmed = code.trim();
    if (/\n/.test(trimmed)) {
      return trimmed;
    }

    let formatted = trimmed
      .replace(/\r\n/g, '\n')
      .replace(/}\s*else\s*{/g, '}\nelse {')
      .replace(/\)\s*{/g, ') {')
      .replace(/\{\s*/g, '{\n')
      .replace(/;\s*/g, ';\n')
      .replace(/\s*}\s*/g, '\n}\n')
      .replace(/\n+/g, '\n');

    const rawLines = formatted
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let indent = 0;
    const INDENT = '  ';
    const indentedLines = rawLines.map((line) => {
      if (/^[}\])]/.test(line)) {
        indent = Math.max(indent - 1, 0);
      }

      const currentLine = `${INDENT.repeat(indent)}${line}`;

      if (/(\{|\[|\()\s*$/.test(line) || line === 'else') {
        indent += 1;
      }

      return currentLine;
    });

    return indentedLines.join('\n').trim();
  }, []);

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [showExplanations, setShowExplanations] = useState(false);
  const [shakingNext, setShakingNext] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [failedQuestions, setFailedQuestions] = useState<FailedQuestion[]>([]);
  const [questionRatings, setQuestionRatings] = useState<Record<string, 'up' | 'down'>>({});
  const [pollUpdatedQuestions, setPollUpdatedQuestions] = useState<Set<string>>(new Set());
  const [hasSavedResults, setHasSavedResults] = useState(false);
  const [reportRequestId, setReportRequestId] = useState<number | null>(null);
  const [isTicketStreamPending, setIsTicketStreamPending] = useState(false);
  const [ticketStreamPlanned, setTicketStreamPlanned] = useState<number | null>(null);
  const {
    isShareModalOpen,
    shareStatus,
    shareUrl,
    shareError,
    shareCopied,
    handleOpenShareModal,
    closeShareModal,
    retryShare,
    handleCopyShareLink
  } = useShareLink();
  const [isCodeContextExpanded, setIsCodeContextExpanded] = useState(false);

  const totalQuestions = Array.isArray(quizSession.questions) ? quizSession.questions.length : 0;
  const hasQuestion = totalQuestions > 0 && currentQuestionIndex < totalQuestions;

  const isStreamFinished = useMemo(() => {
    if (quizSession.completed) return true;
    if (!quizSession.isStreaming) return true;
    if (totalQuestions === 0) return false;
    return currentQuestionIndex >= totalQuestions - 1;
  }, [quizSession.completed, quizSession.isStreaming, currentQuestionIndex, totalQuestions]);

  const totalStreamedQuestions = totalQuestions;
  const answeredQuestions = Math.max(results.length, currentQuestionIndex + (showExplanations ? 1 : 0));
  const accuracyPercentage = answeredQuestions > 0 ? Math.round((score / answeredQuestions) * 100) : 0;

  // Timers: per-question and overall (increase as questions stream in)
  const [questionTimeTotal, setQuestionTimeTotal] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [overallTimeTotal, setOverallTimeTotal] = useState(0);
  const [overallTimeLeft, setOverallTimeLeft] = useState(0);
  const lastAccumulatedCountRef = useRef(0);

  // Drive the loading bar and fetch when generating (must be before any early returns)
  useEffect(() => {
    if (!reportRequestId) return;

    let pct = 0;
    const id = setInterval(() => {
      pct = Math.min(95, pct + Math.random() * 12);
      setLoadingPct(Math.round(pct));
    }, 250);

    const abortController = new AbortController();
    let cancelled = false;
    const ticketsBuffer: any[] = [];

    setGeneratedTickets([]);
    setIsTicketStreamPending(true);
    setTicketStreamPlanned(null);

    const handleLine = (line: string) => {
      if (cancelled) return;
      try {
        const event = JSON.parse(line);
        if (event.type === 'ticket' && event.ticket) {
          ticketsBuffer.push(event.ticket);
          setGeneratedTickets([...ticketsBuffer]);
        } else if (event.type === 'meta' && typeof event.ticketsPlanned === 'number') {
          setTicketStreamPlanned(event.ticketsPlanned);
        } else if (event.type === 'error') {
          throw new Error(event.message || 'report-card-stream-error');
        }
      } catch (error) {
        console.error('❌ Failed to process report card stream line:', error, line);
      }
    };

    const processBuffer = (decoderState: { buffer: string; done: boolean }, flush = false) => {
      const { done } = decoderState;
      let { buffer } = decoderState;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) handleLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
      if ((flush || done) && buffer.trim().length > 0) {
        handleLine(buffer.trim());
        buffer = '';
      }
      decoderState.buffer = buffer;
    };

    (async () => {
      const decoderState = { buffer: '', done: false };
      const decoder = new TextDecoder();
      try {
        console.log(`🚀 Streaming /api/reportCard request ${reportRequestId} with`, results.length, 'results');
        const res = await fetch('/api/reportCard?stream=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results, failedQuestions }),
          signal: abortController.signal
        });

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => '');
          throw new Error(`Report card request failed: ${res.status} ${errorText}`);
        }

        const reader = res.body.getReader();
        setShowResults(true);
        setIsGeneratingReport(false);

        while (true) {
          const { value, done } = await reader.read();
          decoderState.done = done;
          if (value) {
            decoderState.buffer += decoder.decode(value, { stream: !done });
            processBuffer(decoderState);
          }
          if (done) break;
        }

        // Flush any remaining buffered content
        decoderState.buffer += decoder.decode(new Uint8Array(), { stream: false });
        processBuffer(decoderState, true);

        if (!cancelled) {
          setGeneratedTickets([...ticketsBuffer]);
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        console.error('reportCard error', e);
      } finally {
        if (!cancelled) {
          setLoadingPct(100);
          setIsGeneratingReport(false);
          setShowResults(true);
          setReportRequestId(null);
          setIsTicketStreamPending(false);
          setTicketStreamPlanned(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(id);
      abortController.abort();
    };
  }, [reportRequestId, results, failedQuestions]);

  // totalQuestions/hasQuestion moved up to ensure availability for memo hooks
  const currentQuestion: any = hasQuestion ? quizSession.questions[currentQuestionIndex] : undefined;
  const codeContextLineCount = typeof currentQuestion?.codeContext === 'string' ? currentQuestion.codeContext.split('\n').length : 0;
  const shouldClampCodeContext = codeContextLineCount > 36;
  


  useEffect(() => {
    setIsCodeContextExpanded(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    setIsVariantCodeExpanded(false);
  }, [currentVariantIndex, currentQuestionIndex]);

  // Reset saved-results flag when session changes
  useEffect(() => {
    setHasSavedResults(false);
  }, [quizSession?.id]);

  const persistQuizResults = useCallback(async () => {
    if (hasSavedResults) return;
    if (!user) {
      console.log('⚠️ [QuizInterface] Skipping quiz result save - anonymous session');
      return;
    }
    if (!quizSession?.repositoryInfo) {
      console.warn('⚠️ [QuizInterface] Missing repository info, cannot save quiz results');
      return;
    }
    if (results.length === 0) {
      console.log('⚠️ [QuizInterface] No recorded results yet, skipping save');
      return;
    }

    try {
      const { owner, repo } = quizSession.repositoryInfo;
      const repoUrl = `https://github.com/${owner}/${repo}`;
      const repoName = `${owner}/${repo}`;
      const detectedLanguage = results.find(r => r.language)?.language || undefined;

      console.log('💾 [QuizInterface] Persisting quiz results:', {
        repoUrl,
        score,
        totalQuestions,
        resultsCount: results.length
      });

      await saveQuizResults(
        user.uid,
        repoUrl,
        repoName,
        score,
        totalQuestions,
        results,
        quizSession.id,
        detectedLanguage ?? undefined,
        undefined
      );

      setHasSavedResults(true);
      console.log('✅ [QuizInterface] Quiz results saved successfully');
    } catch (error) {
      console.error('❌ [QuizInterface] Failed to save quiz results:', error);
    }
  }, [
    hasSavedResults,
    user?.uid,
    quizSession?.repositoryInfo?.owner,
    quizSession?.repositoryInfo?.repo,
    quizSession?.id,
    results,
    score,
    totalQuestions
  ]);

  useEffect(() => {
    if (!hasSavedResults && (showReportPrompt || showResults)) {
      void persistQuizResults();
    }
  }, [hasSavedResults, showReportPrompt, showResults, persistQuizResults]);

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

  // Reset variant index and explanations when question changes
  useEffect(() => {
    setCurrentVariantIndex(0);
    setShowExplanations(false); // Reset explanations for new question
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
      
      // For select-all questions, give partial credit:
      // - No incorrect selections (all selected must be correct)
      // - At least one correct selection
      const hasCorrectSelections = selectedAnswers.some((answer: string) => correctOptions.includes(answer));
      const hasIncorrectSelections = selectedAnswers.some((answer: string) => !correctOptions.includes(answer));
      
      // Answer is correct if: has correct selections AND no incorrect selections
      isCorrect = hasCorrectSelections && !hasIncorrectSelections;
      correctAnswersResolved = correctOptions.filter(Boolean);
      
      console.log('🔍 Select-All Final Debug:', {
        selectedAnswers,
        correctOptions,
        hasCorrectSelections,
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
    const sanitizedExplanation = sanitizeExplanation(currentQuestion.explanation);
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
        explanation: sanitizedExplanation,
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
      console.log('✅ Answer correct - showing explanations');
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
        console.log('❌ Answer incorrect - showing explanations');
      }
    }
    
    // Debug: Check if current question has distractors
    if (currentQuestion.type === 'order-sequence' && currentQuestion.steps) {
      const distractors = currentQuestion.steps.filter((step: any) => step.isDistractor);
      console.log('🔍 Order sequence question - distractors found:', distractors.length, distractors);
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    const nextAvailable = nextIndex < totalQuestions;

    const isFinishingQuiz = !nextAvailable;

    if (isFinishingQuiz && totalQuestions === 0 && quizSession.isStreaming) {
      setShowStreamingWarning(true);
      setTimeout(() => setShowStreamingWarning(false), 3000);
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
    setLives(STARTING_LIVES);
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
    
    console.log(`📊 Question ${questionId} rated as: ${rating}`);

    const repoUrl = quizSession.repositoryInfo ? `https://github.com/${quizSession.repositoryInfo.owner}/${quizSession.repositoryInfo.repo}` : undefined;

    if (user?.uid) {
      try {
        await rateQuestion(questionId, user.uid, rating, repoUrl);
      } catch (error) {
        const message = (error as Error).message || '';
        if (message.includes('already rated')) {
          console.warn(`⚠️ User ${user?.uid} already rated question ${questionId}`);
          return;
        } else {
          console.error('❌ Error recording question rating:', error);
          return;
        }
      }
    } else {
      console.warn('❌ [QuizInterface] Cannot record rating without authenticated user');
      return;
    }

    setQuestionRatings(prev => ({
      ...prev,
      [questionId]: rating
    }));

    // Auto-save to question bank on upvote
    console.log(`🚨 [QuizInterface] Checking conditions:`, { 
      isUpvote: rating === 'up', 
      hasRepositoryInfo: !!quizSession.repositoryInfo,
      repositoryInfo: quizSession.repositoryInfo 
    });
    
    if (rating === 'up' && quizSession.repositoryInfo) {
      try {
        if (!repoUrl) {
          console.warn('❌ [QuizInterface] Missing repository URL while trying to save question to bank');
          return;
        }

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
          console.log(`🚨 [QuizInterface] Question validation check:`, {
            hasId: !!questionWithRepo.id,
            hasType: !!questionWithRepo.type,
            hasQuestion: !!questionWithRepo.question,
            hasOptions: !!questionWithRepo.options,
            hasCorrectAnswer: !!questionWithRepo.correctAnswer,
            hasVariants: !!questionWithRepo.variants,
            hasSteps: !!(questionWithRepo as any).steps
          });
          
          await addQuestionToBank(repoUrl, questionWithRepo as any, 85); // Start with high quality score
          console.log(`✅ Question added to ${repoUrl} question bank!`);
        } else {
          console.warn(`❌ [QuizInterface] Could not find question with ID: ${questionId}`);
        }
      } catch (error) {
        console.error('❌ Error adding question to bank:', error);
        console.error('❌ Error details:', (error as Error).message);
        console.error('❌ Error stack:', (error as Error).stack);
      }
    } else {
      console.log(`❌ [QuizInterface] Not saving to question bank:`, { 
        reason: rating !== 'up' ? 'not upvote' : 'no repository info',
        hasRepositoryInfo: !!quizSession.repositoryInfo,
        repositoryInfo: quizSession.repositoryInfo
      });
    }
    
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

    if (showResults) {
    return (
      <ReportCard
        results={results}
        failedQuestions={failedQuestions}
        onRetry={handleRetry}
        onClose={onClose}
        initialTickets={generatedTickets}
        ticketsLoading={isTicketStreamPending}
        ticketsPlanned={ticketStreamPlanned}
        totalStreamedQuestions={totalStreamedQuestions}
        shareEnabled
        shareStatus={shareStatus}
        onShareClick={handleOpenShareModal}
      />
    );
  }

  // Report prompt modal
  if (showReportPrompt) {
    return (
      <ReportPrompt
        onConfirm={() => {
          setIsGeneratingReport(true);
          setShowReportPrompt(false);
          setReportRequestId(Date.now());
          setIsTicketStreamPending(true);
          setTicketStreamPlanned(null);
        }}
        onSkip={() => {
          setGeneratedTickets([]);
          setShowReportPrompt(false);
          setShowResults(true);
          setIsTicketStreamPending(false);
          setTicketStreamPlanned(null);
        }}
      />
    );
  }

  // Loading screen while generating report
  if (isGeneratingReport) {
    return (
      <ReportLoadingOverlay loadingPct={loadingPct} funTips={funTips} />
    );
  }

  

  return (
    <div
      className="fixed inset-0 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 z-50 overflow-y-auto overflow-x-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <QuizHeader
        quizSession={quizSession}
        onClose={onClose}
        hasQuestion={hasQuestion}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        currentQuestion={currentQuestion}
        score={score}
        accuracyPercentage={accuracyPercentage}
        totalStreamedQuestions={totalStreamedQuestions}
        questionTimeLeft={questionTimeLeft}
        questionTimeTotal={questionTimeTotal}
        overallTimeLeft={overallTimeLeft}
        overallTimeTotal={overallTimeTotal}
        lives={lives}
        maxLives={MAX_LIVES}
        showStreamingWarning={showStreamingWarning}
        onRestoreLife={() => setLives(prev => Math.min(MAX_LIVES, prev + 1))}
      />

      {/* Question Card */}
      <div className="w-full max-w-full sm:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_-30px_rgba(15,23,42,0.65)] ring-1 ring-slate-200/80 dark:ring-slate-800/80 p-5 sm:p-7 lg:p-9 transition-colors">
          {!hasQuestion ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-11/12" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10/12" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-24" />
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
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/70 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-700 font-medium text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Community reviewed question
                </span>
              </div>
            )}
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-relaxed break-words mb-4">
              {currentQuestion.question}
            </h2>
            
            {currentQuestion.codeContext && (currentQuestion.type === 'function-variant' || currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false' || currentQuestion.type === 'select-all') && (
              <div className="rounded-lg mb-4 overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700">
                  <p className="text-sm text-gray-300 font-medium">Code Context</p>
                  <div className="flex items-center space-x-2">
                    {currentQuestion.language && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${currentQuestion.languageBgColor || 'bg-gray-700'} ${currentQuestion.languageColor || 'text-gray-300'}`}>
                        {currentQuestion.language}
                      </span>
                    )}
                    <button
                      onClick={() => setShowFullscreenCode(true)}
                      className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                      title="View in fullscreen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={`relative ${shouldClampCodeContext && !isCodeContextExpanded ? 'max-h-72 overflow-hidden' : ''}`}>
                  <div className={`overflow-x-auto ${shouldClampCodeContext && !isCodeContextExpanded ? 'max-h-72 overflow-y-auto' : 'overflow-y-auto'}`}>
                    <SyntaxHighlighter
                      language={getHighlighterLanguage(currentQuestion.language || 'JavaScript')}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: '0.75rem',
                        fontSize: '0.8125rem',
                        lineHeight: '1.5',
                        borderRadius: 0,
                        width: '100%'
                      }}
                      wrapLongLines={true}
                      showLineNumbers={true}
                    >
                      {currentQuestion.codeContext}
                    </SyntaxHighlighter>
                  </div>
                  {shouldClampCodeContext && !isCodeContextExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/80 to-transparent" />
                  )}
                </div>
                {shouldClampCodeContext && (
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80/60 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                    <button
                      onClick={() => setIsCodeContextExpanded((prev) => !prev)}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      {isCodeContextExpanded ? 'Collapse Code' : 'Expand Full Code'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Answer Options */}
          <div className="mb-8">
            <QuestionContent
              question={currentQuestion}
              selectedAnswers={selectedAnswers}
              setSelectedAnswers={setSelectedAnswers}
              onAnswerSelect={handleAnswerSelect}
              showExplanations={showExplanations}
              sanitizeExplanation={sanitizeExplanation}
              currentVariantIndex={currentVariantIndex}
              onVariantNavigation={handleVariantNavigation}
              onVariantSelect={handleVariantSelect}
              isVariantCodeExpanded={isVariantCodeExpanded}
              setIsVariantCodeExpanded={setIsVariantCodeExpanded}
            />
          </div>

          {/* Explanations for all question types */}
          {showExplanations && (currentQuestion.type === 'function-variant' && currentQuestion.variants) && (
            <div className="mb-8 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600 w-full max-w-full">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Answer Explanations
              </h3>
              <div className="space-y-4 w-full max-w-full">
                {currentQuestion.variants.map((variant: any, index: number) => {
                  const isSelected = selectedAnswers.includes(variant.id);
                  const isCorrect = variant.isCorrect;
                  const isUserCorrect = isSelected === isCorrect;
                  
                  return (
                    <div
                      key={variant.id}
                      className={`p-4 rounded-lg border-2 w-full max-w-full overflow-hidden ${
                        isCorrect
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 w-full max-w-full">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isCorrect
                            ? 'border-green-500 bg-green-500'
                            : 'border-red-500 bg-red-500'
                        }`}>
                          <span className="text-white text-sm font-bold">
                            {isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex-1 w-full max-w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2 mb-2">
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
                          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-3 w-full max-w-full">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700">
                              <span className="text-xs text-gray-400 font-medium">Code</span>
                              {currentQuestion.language && (
                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${currentQuestion.languageBgColor || 'bg-gray-700'} ${currentQuestion.languageColor || 'text-gray-300'}`}>
                                  {currentQuestion.language}
                                </span>
                              )}
                            </div>
                            <div className="overflow-x-auto w-full max-w-full">
                              <SyntaxHighlighter
                                language={getHighlighterLanguage(currentQuestion.language || 'JavaScript')}
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  padding: '0.75rem',
                                  fontSize: '0.8125rem',
                                  lineHeight: '1.5',
                                  borderRadius: 0,
                                  width: '100%'
                                }}
                                wrapLongLines={true}
                                showLineNumbers={true}
                              >
                                {formatVariantForDisplay(variant.code)}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                          <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
                            isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {sanitizeExplanation(variant.explanation)}
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
            <div className="mb-8 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
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
                        {sanitizeExplanation(currentQuestion.explanation)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanations for Multiple Choice */}
          {showExplanations && currentQuestion.type === 'multiple-choice' && (
            <div className="mb-8 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
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
                      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                        Correct Answer: {currentQuestion.correctAnswer}
                      </div>
                      <p className={`text-sm ${
                        selectedAnswers.includes(currentQuestion.correctAnswer)
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {sanitizeExplanation(currentQuestion.explanation)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanations for Select All */}
          {showExplanations && currentQuestion.type === 'select-all' && (
            <div className="mb-8 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
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
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Overall Explanation:</strong> {sanitizeExplanation(currentQuestion.explanation)}
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
            questionData={currentQuestion}
            repoUrl={quizSession?.repositoryInfo ? `https://github.com/${quizSession.repositoryInfo.owner}/${quizSession.repositoryInfo.repo}` : undefined}
            onPollUpdate={handlePollUpdate}
          />

          {/* Submit Button */}
          <div className="flex justify-end">
            {!showExplanations ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswers.length === 0}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 px-8 rounded-lg font-medium hover:bg-slate-700 dark:hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1 && totalQuestions === 0}
                  className={`py-3 px-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    currentQuestionIndex === totalQuestions - 1 && totalQuestions === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : `bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 focus:ring-slate-400 ${shakingNext ? 'animate-shake' : ''}`
                  }`}
                >
                  {currentQuestionIndex === quizSession.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
                {currentQuestionIndex === totalQuestions - 1 && totalQuestions === 0 && quizSession.isStreaming && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg">
                    Slow down tiger!
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-orange-500"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Fullscreen Code Modal */}
      <AnimatePresence>
        {showFullscreenCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
            onClick={() => setShowFullscreenCode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-white">Code Context</h3>
                  {currentQuestion.language && (
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${currentQuestion.languageBgColor || 'bg-gray-700'} ${currentQuestion.languageColor || 'text-gray-300'}`}>
                      {currentQuestion.language}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowFullscreenCode(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Code Content */}
              <div className="flex-1 overflow-auto">
                <div className="overflow-x-auto h-full">
                  <SyntaxHighlighter
                    language={getHighlighterLanguage(currentQuestion.language || 'JavaScript')}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      borderRadius: 0,
                      height: '100%',
                      width: '100%'
                    }}
                    wrapLongLines={true}
                    showLineNumbers={true}
                  >
                    {currentQuestion.codeContext}
                  </SyntaxHighlighter>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ShareModal
        isOpen={isShareModalOpen}
        status={shareStatus}
        shareUrl={shareUrl}
        shareError={shareError}
        shareCopied={shareCopied}
        onClose={closeShareModal}
        onRetry={retryShare}
        onCopy={handleCopyShareLink}
      />
    </div>
  );
} 
