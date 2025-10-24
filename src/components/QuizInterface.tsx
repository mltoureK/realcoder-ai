'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QuizSession } from '@/lib/quiz-service';
import { detectLanguage } from '@/lib/question-plugins/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReportCard from '@/components/ReportCard';
import { QuestionResult, FailedQuestion } from '@/lib/report-card';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionVotingButtons from './QuestionVotingButtons';
import QuestionPoll from './QuestionPoll';
import { addQuestionToBank, saveQuizResults, rateQuestion } from '@/lib/quiz-history';
import { useAuth } from '@/context/AuthContext';

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
    'SQL': 'sql',
    'Ada': 'ada',
    'Assembly': 'asm6502'
  };
  return langMap[lang] || 'javascript';
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const shareCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateShareLink = useCallback(() => {
    setShareStatus('loading');
    setShareError(null);
    setShareCopied(false);

    if (typeof window === 'undefined') {
      setShareError('Sharing is only available in the browser.');
      setShareStatus('error');
      return;
    }

    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.hash = '';
      setShareUrl(currentUrl.toString());
      setShareStatus('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error generating share link';
      setShareError(message);
      setShareStatus('error');
    }
  }, []);

  const handleOpenShareModal = useCallback(() => {
    setIsShareModalOpen(true);
    generateShareLink();
  }, [generateShareLink]);

  const closeShareModal = useCallback(() => {
    setIsShareModalOpen(false);
    setShareStatus('idle');
    setShareError(null);
    setShareUrl('');
    if (shareCopyTimeoutRef.current) {
      clearTimeout(shareCopyTimeoutRef.current);
      shareCopyTimeoutRef.current = null;
    }
    setShareCopied(false);
  }, []);

  const retryShare = useCallback(() => {
    generateShareLink();
  }, [generateShareLink]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    if (typeof window === 'undefined') {
      setShareError('Sharing is only available in the browser.');
      setShareStatus('error');
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setShareCopied(true);
      if (shareCopyTimeoutRef.current) {
        clearTimeout(shareCopyTimeoutRef.current);
      }
      shareCopyTimeoutRef.current = setTimeout(() => setShareCopied(false), 2000);
    } catch (error) {
      console.error('❌ Failed to copy share link:', error);
      setShareError('Could not copy link to clipboard');
      setShareStatus('error');
    }
  }, [shareUrl]);
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

  useEffect(() => {
    return () => {
      if (shareCopyTimeoutRef.current) {
        clearTimeout(shareCopyTimeoutRef.current);
      }
    };
  }, []);

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

  function formatTime(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
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
        const qText = currentQuestion.question || '';
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
                    if (token) handleAnswerSelect(token);
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
              {currentQuestion.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', option)}
                  onClick={() => handleAnswerSelect(option)}
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
        const variantLineCount = typeof currentVariant?.code === 'string' ? currentVariant.code.split('\n').length : 0;
        const shouldClampVariant = variantLineCount > 36;

        return (
          <div className="space-y-6 sm:space-y-8">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 bg-slate-100 dark:bg-slate-800/80 p-4 sm:p-6 rounded-xl">
              <button
                onClick={() => handleVariantNavigation('prev')}
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
                onClick={() => handleVariantNavigation('next')}
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
                onClick={() => handleVariantSelect(currentVariant.id)}
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
                  onClick={() => handleVariantNavigation('next')}
                  className="w-full sm:w-auto flex-1 sm:flex-none py-3 px-6 rounded-lg font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Skip to Next
                </button>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2">
              {currentQuestion.variants.map((_: any, index: number) => (
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
                {currentQuestion.steps?.map((step: any, index: number) => {
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
              {showExplanations && Array.isArray(currentQuestion.correctOrder) && Array.isArray(currentQuestion.steps) && (
                <div className="mt-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
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

                  {currentQuestion.explanation && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Overall Explanation:</strong> {sanitizeExplanation(currentQuestion.explanation)}</p>
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
              {currentQuestion.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
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
                className="py-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                onClick={() => {
                  setIsGeneratingReport(true);
                  setShowReportPrompt(false);
                  setReportRequestId(Date.now());
                  setIsTicketStreamPending(true);
                  setTicketStreamPlanned(null);
                }}
              >
                Yes
              </button>
              <button
                className="py-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                onClick={() => {
                  // Skip server generation; still show local report UI
                  setGeneratedTickets([]);
                  setShowReportPrompt(false);
                  setShowResults(true);
                  setIsTicketStreamPending(false);
                  setTicketStreamPlanned(null);
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

  const shareStatusLabel = {
    loading: 'Generating share link…',
    success: 'Share link ready',
    error: shareError ?? 'Could not generate share link',
    idle: ''
  };

  // Loading screen while generating report
  if (isGeneratingReport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
          <div
            className="w-48 h-48 rounded-xl bg-center bg-cover"
            style={{ backgroundImage: `url(/report-bot.png)` }}
            aria-label="Loading"
          />
          <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">Generating your report card…</div>
          <div className="mt-3 w-full">
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
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
    <div
      className="fixed inset-0 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 z-50 overflow-y-auto overflow-x-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Header */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur shadow border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="w-full max-w-full sm:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3 sm:gap-4 text-slate-900 dark:text-slate-100">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-semibold leading-snug break-words">
                {quizSession.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-start sm:justify-end gap-3">
              {/* Progress */}
              <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm text-sm leading-relaxed break-words">
                {hasQuestion ? (
                  <>
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                    {quizSession.isStreaming && totalQuestions === 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 rounded-full">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        Streaming...
                      </span>
                    )}
                    {currentQuestion.isCached && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Community reviewed
                      </span>
                    )}
                  </>
                ) : (
                  <>Loading questions…</>
                )}
              </div>

              {/* Score */}
              <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm text-sm font-semibold text-slate-900 dark:text-slate-100">
                Score&nbsp;<span className="text-base">{score}</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm text-sm">
                Accuracy&nbsp;<span className="text-base font-semibold text-slate-900 dark:text-slate-100">{totalStreamedQuestions > 0 ? `${accuracyPercentage}%` : '—'}</span>
                {totalStreamedQuestions > 0 && (
                  <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                    ({score}/{totalStreamedQuestions})
                  </span>
                )}
              </div>

              {/* Timers */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3 sm:gap-4 w-full sm:w-auto text-sm">
                {/* Per-question timer */}
                <div className="w-full sm:w-44 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Q Time</span>
                    <span className={`${questionTimeLeft <= 3 ? 'text-red-600 dark:text-red-400 animate-pulse' : (questionTimeTotal > 0 && questionTimeLeft / questionTimeTotal <= 0.2 ? 'text-red-600 dark:text-red-400' : '')}`}>
                      {formatTime(questionTimeLeft)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${questionTimeLeft <= 3 ? 'bg-red-500 animate-pulse' : (questionTimeTotal > 0 && questionTimeLeft / questionTimeTotal <= 0.2 ? 'bg-red-500 animate-pulse' : 'bg-slate-900 dark:bg-slate-100')} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${questionTimeTotal > 0 ? (questionTimeLeft / questionTimeTotal) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                {/* Overall timer */}
                <div className="w-full sm:w-44 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Total</span>
                    <span className={`${overallTimeTotal > 0 && overallTimeLeft / overallTimeTotal <= 0.15 ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {formatTime(overallTimeLeft)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${overallTimeTotal > 0 && overallTimeLeft / overallTimeTotal <= 0.15 ? 'bg-red-500 animate-pulse' : 'bg-slate-900 dark:bg-slate-100'} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${overallTimeTotal > 0 ? (overallTimeLeft / overallTimeTotal) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Lives */}
              <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Lives</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: MAX_LIVES }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (i >= lives && lives < MAX_LIVES) {
                          setLives(prev => Math.min(MAX_LIVES, prev + 1));
                        }
                      }}
                      className={`w-4 h-4 rounded-full transition-colors ${
                        i < lives
                          ? 'bg-rose-500 hover:bg-rose-600'
                          : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 cursor-pointer'
                      }`}
                      title={i >= lives ? 'Click to restore life' : 'Life active'}
                    />
                  ))}
                </div>
              </div>

              {/* Settings Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Wait for complete stream:</span>
                {/* Streaming toggle removed: always allow streaming, finishing permitted with warning if incomplete */}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-slate-900 dark:bg-slate-100 h-2 rounded-full transition-all duration-300"
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
                  <div className="font-semibold">Slow down tiger! 🐅</div>
                  <div className="text-sm opacity-90">Wait for all questions to finish loading before you can finish the quiz.</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {renderQuestion()}
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
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Share this quiz</div>
              <button
                onClick={closeShareModal}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <span className="sr-only">Close</span>✕
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              {shareStatus === 'loading' && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                  <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-500" />
                  {shareStatusLabel.loading}
                </div>
              )}

              {shareStatus === 'error' && (
                <div className="space-y-4">
                  <p className="text-sm text-rose-600 dark:text-rose-300">
                    {shareStatusLabel.error}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={retryShare}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={closeShareModal}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {shareStatus === 'success' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Anyone with this link can take the same quiz. Share it with teammates, friends, or your study group.
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 sm:text-xs">
                      <code className="break-all">{shareUrl}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyShareLink}
                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        {shareCopied ? 'Link Copied' : 'Copy Link'}
                      </button>
                      {!shareCopied && (
                        <button
                          onClick={closeShareModal}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {shareStatus === 'idle' && (
                <p className="text-sm text-slate-500 dark:text-slate-300">Preparing share link…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
