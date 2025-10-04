'use client';

import React, { useEffect, useState } from 'react';
import { analyzeResults, generateRecommendations, QuestionResult, computeRepoIQ, generateStrengthsWeaknesses } from '@/lib/report-card';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = {
  results: QuestionResult[];
  onClose: () => void;
  onRetry: () => void;
};

export default function ReportCard({ results, onClose, onRetry }: Props) {
  const analysis = analyzeResults(results);
  const recs = generateRecommendations(analysis);
  const repoIQ = computeRepoIQ(analysis);
  const sw = generateStrengthsWeaknesses(analysis);

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
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rc_tickets');
      if (raw) setTickets(JSON.parse(raw));
    } catch (_) {}
  }, []);

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
      bugSnippet: `String role = user.getRole();\nif (role.equals(\"admin\")) {\n    grantAccess();\n}\n`,
      fixedSnippet: `String role = user.getRole();\nif (\"admin\".equals(role)) {\n    grantAccess();\n}\n// or Optional.ofNullable(role).filter(\"admin\"::equals).ifPresent(r -> grantAccess());\n`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
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

        {/* Body */}
        <div className="p-6 grid gap-6 md:grid-cols-3">
          {/* Overall card */}
          <div className="col-span-1 md:col-span-1">
            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg">
              <div className="text-sm opacity-80">Overall Score</div>
              <div className="mt-2 text-5xl font-extrabold">{percentage}%</div>
              <div className="mt-2 text-sm opacity-90">{analysis.overall.correct} correct / {analysis.overall.total} total</div>
            </div>
            <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg">
              <div className="text-sm opacity-80">Repo IQ</div>
              <div className="mt-2 text-4xl font-extrabold">{repoIQ.score}</div>
              <ul className="mt-2 text-xs opacity-90 space-y-1 list-disc list-inside">
                {repoIQ.reasoning.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            {/* Weakness chips */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Focus Areas</div>
              <div className="flex flex-wrap gap-2">
                {analysis.weaknesses.languages.length === 0 && analysis.weaknesses.types.length === 0 ? (
                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">No major gaps — nice!</span>
                ) : (
                  <>
                    {analysis.weaknesses.languages.map(lang => (
                      <span key={lang} className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">{lang}</span>
                    ))}
                    {analysis.weaknesses.types.map(t => (
                      <span key={t} className="px-3 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{t}</span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="col-span-1 md:col-span-2 grid gap-6">
            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Strengths</div>
                <ul className="space-y-2">
                  {sw.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="mr-2">✅</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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
              <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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

            {/* Recommendations */
            }
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Recommended Learning</div>
              <div className="grid gap-3 md:grid-cols-2">
                {recs.resources.map((r) => (
                  <a key={r.title} href={r.url} target="_blank" rel="noreferrer" className="group p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{r.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{r.reason}</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Exercises → Click to create tickets */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Targeted Exercises</div>
              <div className="grid gap-3 md:grid-cols-2">
                {recs.exercises.map((e) => (
                  <motion.button
                    key={e.title}
                    onClick={() => addTicket(e.title, e.description)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`text-left p-4 rounded-lg border bg-white dark:bg-gray-900 transition-colors ${
                      isInTickets(e.title)
                        ? 'border-green-300 dark:border-green-700 hover:border-green-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{e.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{e.description}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${
                        isInTickets(e.title)
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      }`}>
                        {isInTickets(e.title) ? 'In Tickets' : 'Add as Ticket'}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Tickets Panel */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tickets</div>
                <div className="flex items-center gap-2">
                  <button onClick={addBugTicketRandom} className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Add Code Bug Ticket</button>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tickets.length} total</div>
                </div>
              </div>
              {tickets.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No tickets yet — add from Targeted Exercises.</div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
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
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => toggleDone(t.id)} className={`text-xs px-2 py-1 rounded-md ${t.done ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                              {t.done ? 'Mark Open' : (t.bugSnippet ? 'Solve Ticket' : 'Mark Done')}
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => copyTicket(t.id)} className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Copy</motion.button>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => removeTicket(t.id)} className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Delete</motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

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


