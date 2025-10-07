'use client';

import React, { useEffect, useState } from 'react';
import { analyzeResults, generateRecommendations, QuestionResult, computeRepoIQ, generateStrengthsWeaknesses, FailedQuestion, StrengthsWeaknesses } from '@/lib/report-card';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Ticket = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  done: boolean;
  language?: string;
  bugSnippet?: string;
  fixedSnippet?: string;
  solutionText?: string;
  sourceQuestion?: {
    type: string;
    question: string;
    codeContext?: string;
    userAnswer: string;
    correctAnswer: string;
  };
};

type Props = {
  results: QuestionResult[];
  failedQuestions?: FailedQuestion[];
  onClose: () => void;
  onRetry: () => void;
  initialTickets?: Ticket[];
};

export default function ReportCard({ results, failedQuestions = [], onClose, onRetry, initialTickets }: Props) {
  const analysis = analyzeResults(results);
  const recs = generateRecommendations(analysis);
  const repoIQ = computeRepoIQ(analysis);
  const [sw, setSw] = useState<StrengthsWeaknesses>({ strengths: [], weaknesses: [] });

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userCodeById, setUserCodeById] = useState<Record<string, string>>({});
  const [userExplanationById, setUserExplanationById] = useState<Record<string, string>>({});
  const [gradeResultsById, setGradeResultsById] = useState<Record<string, any>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [openResultTicketId, setOpenResultTicketId] = useState<string | null>(null);
  const robotSrc = '/report-bot.png';

  // Generate strengths and weaknesses using AI analysis
  useEffect(() => {
    const generateSW = async () => {
      try {
        const strengthsWeaknesses = await generateStrengthsWeaknesses(analysis, results, failedQuestions);
        setSw(strengthsWeaknesses);
      } catch (error) {
        console.error('Error generating strengths and weaknesses:', error);
        // Fallback to empty arrays
        setSw({ strengths: [], weaknesses: [] });
      }
    };
    generateSW();
  }, [analysis, results, failedQuestions]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rc_tickets');
      if (raw) setTickets(JSON.parse(raw));
    } catch (_) {}
  }, []);

  // Merge in server-provided initial tickets on mount or when provided
  useEffect(() => {
    if (!initialTickets || initialTickets.length === 0) return;
    // Map server Ticket shape (buggyCode/solutionCode) into local Ticket fields
    const mapped = initialTickets.map((t) => ({
      id: t.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title: t.title,
      description: t.description,
      createdAt: Date.now(),
      done: false,
      language: (t as any).language,
      bugSnippet: (t as any).bugSnippet || (t as any).buggyCode,
      fixedSnippet: (t as any).fixedSnippet || (t as any).solutionCode,
      solutionText: (t as any).solutionText || (t as any).explanation,
    } as Ticket));
    setTickets(prev => {
      const byTitle: Record<string, Ticket> = {};
      for (const t of [...prev, ...mapped]) {
        byTitle[t.title] = byTitle[t.title] || t;
      }
      return Object.values(byTitle);
    });
  }, [initialTickets && initialTickets.length]);

  useEffect(() => {
    try {
      localStorage.setItem('rc_tickets', JSON.stringify(tickets));
    } catch (_) {}
  }, [tickets]);

  function isInTickets(title: string): boolean {
    return tickets.some(t => t.title === title);
  }

  function addTicket(title: string, description: string) {
    if (isInTickets(title)) return;
    const t: Ticket = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      createdAt: Date.now(),
      done: false,
    };
    setTickets(prev => [t, ...prev]);
  }

  // Sample bug tickets and helper to add one
  const sampleBugTickets: Ticket[] = [
    {
      id: 'sample-js-closure',
      title: 'JS: Fix closure bug in loop',
      description: 'Console logs print 3,3,3 instead of 0,1,2.',
      createdAt: Date.now(),
      done: false,
      language: 'javascript',
      bugSnippet: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}`,
      fixedSnippet: `for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n// or capture with IIFE:\nfor (var i = 0; i < 3; i++) {\n  ((j) => setTimeout(() => console.log(j), 0))(i);\n}`,
      solutionText: 'Use block scoping (let) or capture via IIFE so each timeout sees its own value.'
    },
    {
      id: 'sample-py-mutable-default',
      title: 'Python: Mutable default arg bug',
      description: 'List parameter grows across calls unexpectedly.',
      createdAt: Date.now(),
      done: false,
      language: 'python',
      bugSnippet: `def append_item(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nprint(append_item(1))  # [1]\nprint(append_item(2))  # [1, 2] (unexpected)\n`,
      fixedSnippet: `def append_item(item, bucket=None):\n    if bucket is None:\n        bucket = []\n    bucket.append(item)\n    return bucket\n`,
      solutionText: 'Default args are evaluated once. Use None sentinel and create a new list per call.'
    },
    {
      id: 'sample-java-null-check',
      title: 'Java: NullPointerException on equals',
      description: 'equals called on possibly null string.',
      createdAt: Date.now(),
      done: false,
      language: 'java',
      bugSnippet: `String role = user.getRole();\nif (role.equals("admin")) {\n    grantAccess();\n}\n`,
      fixedSnippet: `String role = user.getRole();\nif ("admin".equals(role)) {\n    grantAccess();\n}\n// or Optional.ofNullable(role).filter("admin"::equals).ifPresent(r -> grantAccess());\n`,
      solutionText: 'Guard against null by reversing equals (constant on the left) or using Optional.'
    }
  ];

  function addBugTicketRandom() {
    const pick = sampleBugTickets[Math.floor(Math.random() * sampleBugTickets.length)];
    const t: Ticket = { ...pick, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), done: false };
    setTickets(prev => [t, ...prev]);
  }

  function toggleDone(id: string) {
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function removeTicket(id: string) {
    setTickets(prev => prev.filter(t => t.id !== id));
    setUserCodeById(prev => { const n = { ...prev }; delete n[id]; return n; });
    setUserExplanationById(prev => { const n = { ...prev }; delete n[id]; return n; });
    setGradeResultsById(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function copyTicket(id: string) {
    const t = tickets.find(x => x.id === id);
    if (!t) return;
    const text = `Title: ${t.title}\n\n${t.description}`;
    try {
      await navigator.clipboard.writeText(text);
      // no toast UI yet; keep silent
    } catch (_) {}
  }

  const percentage = Math.round(analysis.overall.accuracy * 100);
  const passed = percentage >= 70;
  const numDone = tickets.filter(t => t.done).length;
  const allHandled = tickets.length === 0 || tickets.every(t => t.done);

  async function reviewTickets() {
    if (!allHandled) return;
    setIsReviewing(true);
    try {
      const submissions = tickets.map(t => ({
        id: t.id,
        language: (t.language || 'javascript') as any,
        buggyCode: t.bugSnippet || '',
        authoritativeSolutionCode: t.fixedSnippet || '',
        authoritativeSolutionText: t.solutionText || '',
        userCode: userCodeById[t.id] || '',
        userExplanation: userExplanationById[t.id] || '',
        title: t.title,
        description: t.description,
      }));
      const resp = await fetch('/api/gradeTickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions })
      });
      const data = await resp.json();
      const map: Record<string, any> = {};
      for (const r of data.results || []) map[r.id] = r;
      setGradeResultsById(map);
    } catch (_) {
      // silent for now
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 overflow-y-auto">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {passed ? '🎯' : '🔁'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Report Card</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Personalized insights, resources, and exercises</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Overall Score and Repo IQ in header */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                <div className="text-xs opacity-80">Overall Score</div>
                <div className="text-2xl font-bold">{percentage}%</div>
                <div className="text-xs opacity-90">{analysis.overall.correct} / {analysis.overall.total}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-lg bg-center bg-cover select-none"
                  style={{ backgroundImage: `url(${robotSrc})` }}
                  aria-label="Repo IQ Robot"
                />
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg flex flex-col items-center justify-center">
                    <div className="text-[8px] opacity-80">IQ</div>
                    <div className="text-lg font-bold">{repoIQ.score}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 grid gap-4">
          <div className="grid gap-4">
            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Strengths</div>
                <ul className="space-y-2">
                  {sw.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="mr-2">✅</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Weaknesses</div>
                <ul className="space-y-2">
                  {sw.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="mr-2">⚠️</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">By Language</div>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(analysis.byLanguage).map(([lang, b]) => {
                    const pct = Math.round(b.accuracy * 100);
                    return (
                      <div key={lang}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300">{lang}</span>
                          <span className="text-gray-600 dark:text-gray-400">{pct}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} className="h-2 rounded-full bg-indigo-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">By Question Type</div>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(analysis.byType).map(([t, b]) => {
                    const pct = Math.round(b.accuracy * 100);
                    return (
                      <div key={t}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300">{t}</span>
                          <span className="text-gray-600 dark:text-gray-400">{pct}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} className="h-2 rounded-full bg-blue-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>


            {/* Tickets Panel */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tickets</div>
                <div className="flex items-center gap-2">
                  <button onClick={addBugTicketRandom} className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Add Code Bug Ticket</button>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{numDone}/{tickets.length} completed</div>
                </div>
              </div>
              {tickets.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No tickets yet — add from Targeted Exercises.</div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {tickets.map(t => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className={`relative p-3 rounded-lg border overflow-hidden ${t.done ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}
                      >
                        {t.done && (
                          <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 0.8 }}
                            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className={`text-sm font-semibold ${t.done ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{t.title}</div>
                            <div className={`text-xs mt-1 ${t.done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{t.description}</div>
                            {t.bugSnippet && (
                              <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">Buggy Code</div>
                                <SyntaxHighlighter language={t.language || 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.75rem', fontSize: '0.8rem' }}>
                                  {t.bugSnippet}
                                </SyntaxHighlighter>
                              </div>
                            )}

                            {/* User Code Editor */}
                            <div className="mt-2">
                              <div className="px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400">Your Fix</div>
                              <textarea
                                className="w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 font-mono"
                                rows={8}
                                value={userCodeById[t.id] ?? (`// Fix this code and/or add applicable comments. You will be graded on: logic correctness, problem solving approach, code quality.\n${t.bugSnippet || ''}`)}
                                onChange={(e) => setUserCodeById(prev => ({ ...prev, [t.id]: e.target.value }))}
                              />
                            </div>

                            {/* User Written Explanation */}
                            <div className="mt-2">
                              <div className="px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400">Written Explanation</div>
                              <textarea
                                className="w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2"
                                rows={4}
                                placeholder="Explain what was wrong and why your change fixes it."
                                value={userExplanationById[t.id] ?? ''}
                                onChange={(e) => setUserExplanationById(prev => ({ ...prev, [t.id]: e.target.value }))}
                              />
                            </div>
                            {t.done && t.fixedSnippet && (
                              <div className="mt-2 rounded-md border border-green-200 dark:border-green-800 overflow-hidden">
                                <div className="px-2 py-1 text-[10px] text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">Fixed Code</div>
                                <SyntaxHighlighter language={t.language || 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.75rem', fontSize: '0.8rem' }}>
                                  {t.fixedSnippet}
                                </SyntaxHighlighter>
                              </div>
                            )}
                            {t.done && t.solutionText && (
                              <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                                <strong>Solution:</strong> {t.solutionText}
                              </div>
                            )}
                            {t.sourceQuestion && (
                              <div className="mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Based on failed question:</div>
                                <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                                  <strong>Type:</strong> {t.sourceQuestion.type}
                                </div>
                                <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                                  <strong>Question:</strong> {t.sourceQuestion.question}
                                </div>
                                {t.sourceQuestion.codeContext && (
                                  <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                                    <strong>Code Context:</strong>
                                    <div className="mt-1 rounded border border-blue-200 dark:border-blue-700 overflow-hidden">
                                      <SyntaxHighlighter language={t.language || 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.7rem' }}>
                                        {t.sourceQuestion.codeContext}
                                      </SyntaxHighlighter>
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                                  <strong>Your Answer:</strong> {t.sourceQuestion.userAnswer}
                                </div>
                                <div className="text-xs text-blue-700 dark:text-blue-400">
                                  <strong>Correct Answer:</strong> {t.sourceQuestion.correctAnswer}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => {
                                const hasCode = (userCodeById[t.id] ?? '').trim().length > 0;
                                const hasText = (userExplanationById[t.id] ?? '').trim().length > 0;
                                if (!t.done && (!hasCode || !hasText)) return; // require both before completing
                                toggleDone(t.id);
                              }}
                              className={`text-xs px-2 py-1 rounded-md ${t.done ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}
                            >
                              {t.done ? 'Mark Open' : 'Complete Ticket'}
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => copyTicket(t.id)} className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Copy</motion.button>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => removeTicket(t.id)} className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Delete</motion.button>
                          </div>
                          {/* Grading Result */}
                          {gradeResultsById[t.id] && (
                            <div className="mt-3 text-xs">
                              <div className="font-semibold">Grading Result {gradeResultsById[t.id].pass ? '✅' : '❌'}</div>
                              <div className="mt-1">Weighted Score: {gradeResultsById[t.id].weightedScore}/10 (Code {gradeResultsById[t.id].codeScore}/10, Written {gradeResultsById[t.id].writtenScore}/10)</div>
                              <div className="mt-1">Feedback: {gradeResultsById[t.id].feedback}</div>
                              <button onClick={() => setOpenResultTicketId(t.id)} className="mt-2 px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700">View Details</button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Review Tickets CTA */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">Complete all tickets or delete them to enable review.</div>
                <button
                  onClick={reviewTickets}
                  disabled={!allHandled || isReviewing || tickets.length === 0}
                  className={`px-3 py-2 rounded-md text-sm ${(!allHandled || tickets.length===0) ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {isReviewing ? 'Reviewing…' : 'Review Tickets'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Modal */}
        {openResultTicketId && gradeResultsById[openResultTicketId] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Ticket Results</div>
                <button onClick={() => setOpenResultTicketId(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
              </div>
              <div className="p-5 space-y-5">
                {(() => {
                  const r = gradeResultsById[openResultTicketId];
                  const codeBars = [
                    { label: 'Logic Correctness', value: r.codeBreakdown?.logicCorrectness ?? 0, max: 3, color: 'bg-emerald-600' },
                    { label: 'Problem Solving', value: r.codeBreakdown?.problemSolving ?? 0, max: 3, color: 'bg-sky-600' },
                    { label: 'Code Quality', value: r.codeBreakdown?.codeQuality ?? 0, max: 2, color: 'bg-indigo-600' },
                  ];
                  const writtenBars = [
                    { label: 'Clarity', value: r.writtenBreakdown?.clarity ?? 0, max: 1, color: 'bg-amber-600' },
                    { label: 'Accuracy', value: r.writtenBreakdown?.accuracy ?? 0, max: 0.5, color: 'bg-lime-600' },
                    { label: 'Professionalism', value: r.writtenBreakdown?.professionalism ?? 0, max: 0.5, color: 'bg-purple-600' },
                  ];
                  return (
                    <>
                      <div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Overview</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300">Weighted: <strong>{r.weightedScore}/10</strong> • Code: <strong>{r.codeScore}/10</strong> • Written: <strong>{r.writtenScore}/10</strong> • {r.pass ? 'Pass ✅' : 'Fail ❌'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Code Criteria</div>
                        <div className="space-y-2">
                          {codeBars.map((b, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400"><span>{b.label}</span><span>{b.value}/{b.max}</span></div>
                              <div className="w-full h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                <div className={`h-2 ${b.color}`} style={{ width: `${Math.max(0, Math.min(100, (b.value/b.max)*100))}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Written Criteria</div>
                        <div className="space-y-2">
                          {writtenBars.map((b, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400"><span>{b.label}</span><span>{b.value}/{b.max}</span></div>
                              <div className="w-full h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                <div className={`h-2 ${b.color}`} style={{ width: `${Math.max(0, Math.min(100, (b.value/b.max)*100))}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Feedback</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{r.feedback}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button onClick={() => setOpenResultTicketId(null)} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-3 sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {passed ? 'Nice work. Keep going! 🔥' : 'You\'re close — a little focused practice will do wonders.'}
          </div>
          <div className="flex gap-3">
            <button onClick={onRetry} className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Retake Quiz</button>
            <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}