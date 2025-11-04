'use client';

import { QuizSession } from '@/lib/quiz-service';
import { AnimatePresence, motion } from 'framer-motion';

interface QuizHeaderProps {
  quizSession: QuizSession;
  onClose: () => void;
  hasQuestion: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: any;
  score: number;
  accuracyPercentage: number;
  totalStreamedQuestions: number;
  questionTimeLeft: number;
  questionTimeTotal: number;
  overallTimeLeft: number;
  overallTimeTotal: number;
  lives: number;
  maxLives: number;
  showStreamingWarning: boolean;
  onRestoreLife: () => void;
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function QuizHeader({
  quizSession,
  onClose,
  hasQuestion,
  currentQuestionIndex,
  totalQuestions,
  currentQuestion,
  score,
  accuracyPercentage,
  totalStreamedQuestions,
  questionTimeLeft,
  questionTimeTotal,
  overallTimeLeft,
  overallTimeTotal,
  lives,
  maxLives,
  showStreamingWarning,
  onRestoreLife
}: QuizHeaderProps) {
  const progressPct = totalQuestions > 0 ? Math.min(100, ((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;
  const questionPct = questionTimeTotal > 0 ? (questionTimeLeft / questionTimeTotal) * 100 : 0;
  const overallPct = overallTimeTotal > 0 ? (overallTimeLeft / overallTimeTotal) * 100 : 0;

  return (
    <>
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
                    {currentQuestion?.isCached && (
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

              <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm text-sm font-semibold text-slate-900 dark:text-slate-100">
                Score&nbsp;<span className="text-base">{score}</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm text-sm">
                Accuracy&nbsp;
                <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {totalStreamedQuestions > 0 ? `${accuracyPercentage}%` : '—'}
                </span>
                {totalStreamedQuestions > 0 && (
                  <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                    ({score}/{totalStreamedQuestions})
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3 sm:gap-4 w-full sm:w-auto text-sm">
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
                      style={{ width: `${Math.max(0, questionPct)}%` }}
                    ></div>
                  </div>
                </div>

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
                      style={{ width: `${Math.max(0, overallPct)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 shadow-sm">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Lives</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxLives }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (i >= lives && lives < maxLives) {
                          onRestoreLife();
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
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-slate-900 dark:bg-slate-100 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showStreamingWarning && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
    </>
  );
}

