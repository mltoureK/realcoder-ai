'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeResults,
  generateRecommendations,
  QuestionResult,
  computeRepoIQ,
  generateStrengthsWeaknesses,
  FailedQuestion,
  StrengthsWeaknesses,
  Breakdown,
} from '@/lib/report-card';
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

function getDefaultFixSnippet(ticket: Ticket): string {
  const base = [
    '// Fix this code and/or add applicable comments.',
    '// You will be graded on: logic correctness, problem solving approach, code quality.',
  ].join('\n');
  return `${base}\n${ticket.bugSnippet || ''}`;
}

type Props = {
  results: QuestionResult[];
  failedQuestions?: FailedQuestion[];
  onClose: () => void;
  onRetry: () => void;
  initialTickets?: Ticket[];
  ticketsLoading?: boolean;
  ticketsPlanned?: number | null;
  totalStreamedQuestions?: number;
  shareEnabled?: boolean;
  shareStatus?: 'idle' | 'loading' | 'success' | 'error';
  onShareClick?: () => void;
};

export default function ReportCard({
  results,
  failedQuestions = [],
  onClose,
  onRetry,
  initialTickets,
  ticketsLoading = false,
  ticketsPlanned = null,
  totalStreamedQuestions,
  shareEnabled = false,
  shareStatus = 'idle',
  onShareClick
}: Props) {
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
  const [fullscreenTicketId, setFullscreenTicketId] = useState<string | null>(null);
  const [collapsedTickets, setCollapsedTickets] = useState<Record<string, boolean>>(() => ({}));
  const robotSrc = '/report-bot.png';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateSW = async () => {
      try {
        const strengthsWeaknesses = await generateStrengthsWeaknesses(analysis, results, failedQuestions, totalStreamedQuestions);
        setSw(strengthsWeaknesses);
      } catch (error) {
        console.error('Error generating strengths and weaknesses:', error);
        setSw({ strengths: [], weaknesses: [] });
      }
    };
    generateSW();
  }, [analysis, results, failedQuestions, totalStreamedQuestions]);

  useEffect(() => {
    if (!initialTickets || initialTickets.length === 0) return;
    const mapped = initialTickets.map(
      (t) =>
        ({
          id: t.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: t.title,
          description: t.description,
          createdAt: Date.now(),
          done: false,
          language: (t as any).language,
          bugSnippet: (t as any).bugSnippet || (t as any).buggyCode,
          fixedSnippet: (t as any).fixedSnippet || (t as any).solutionCode,
          solutionText: (t as any).solutionText || (t as any).explanation,
        } as Ticket),
    );
    setTickets((prev) => {
      const byTitle: Record<string, Ticket> = {};
      for (const t of [...prev, ...mapped]) {
        byTitle[t.title] = byTitle[t.title] || t;
      }
      const merged = Object.values(byTitle);
      setCollapsedTickets((current) => {
        const next: Record<string, boolean> = {};
        for (const ticket of merged) {
          next[ticket.id] = current[ticket.id] ?? true;
        }
        return next;
      });
      return merged;
    });
  }, [initialTickets]);

  useEffect(() => {
    setCollapsedTickets((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const ticket of tickets) {
        const existing = prev[ticket.id];
        const value = existing === undefined ? true : existing;
        next[ticket.id] = value;
        if (existing !== value) changed = true;
      }
      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  }, [tickets]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!fullscreenTicketId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreenTicketId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenTicketId]);

  function isInTickets(title: string): boolean {
    return tickets.some((t) => t.title === title);
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
    setTickets((prev) => [t, ...prev]);
    setCollapsedTickets((prev) => ({ ...prev, [t.id]: true }));
  }

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
      solutionText: 'Use block scoping (let) or capture via IIFE so each timeout sees its own value.',
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
      solutionText: 'Default args are evaluated once. Use None sentinel and create a new list per call.',
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
      solutionText: 'Guard against null by reversing equals (constant on the left) or using Optional.',
    },
  ];

  function addBugTicketRandom() {
    const pick = sampleBugTickets[Math.floor(Math.random() * sampleBugTickets.length)];
    const t: Ticket = {
      ...pick,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      done: false,
    };
    setTickets((prev) => [t, ...prev]);
    setCollapsedTickets((prev) => ({ ...prev, [t.id]: true }));
    setCollapsedTickets((prev) => ({ ...prev, [t.id]: true }));
  }

  function toggleDone(id: string) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function toggleCollapsed(id: string) {
    setCollapsedTickets((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? false),
    }));
  }

  function removeTicket(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setUserCodeById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setUserExplanationById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setGradeResultsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCollapsedTickets((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function clearAllTickets() {
    setTickets([]);
    setUserCodeById({});
    setUserExplanationById({});
    setGradeResultsById({});
    setCollapsedTickets({});
    setFullscreenTicketId(null);
    setOpenResultTicketId(null);
  }

  async function copyTicket(id: string) {
    const t = tickets.find((ticket) => ticket.id === id);
    if (!t) return;
    const text = `Title: ${t.title}\n\n${t.description}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}
  }

  const answeredAccuracyPercentage = Math.round(analysis.overall.accuracy * 100);
  const totalQuestionsDenominator = Math.max(
    totalStreamedQuestions ?? 0,
    analysis.overall.total
  );
  const overallPercentage = totalQuestionsDenominator > 0
    ? Math.round((analysis.overall.correct / totalQuestionsDenominator) * 100)
    : 0;
  const passed = answeredAccuracyPercentage >= 70;
  const numDone = tickets.filter((t) => t.done).length;
  const allHandled = tickets.length === 0 || tickets.every((t) => t.done);
  let pendingSkeletonCount = 0;
  if (ticketsLoading) {
    if (typeof ticketsPlanned === 'number') {
      pendingSkeletonCount = Math.max(ticketsPlanned - tickets.length, 0);
    } else if (tickets.length === 0) {
      pendingSkeletonCount = 1;
    }
  }
  const showEmptyTicketsState = tickets.length === 0 && pendingSkeletonCount === 0;

  async function reviewTickets() {
    if (!allHandled) return;
    setIsReviewing(true);
    try {
      const submissions = tickets.map((t) => ({
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
        body: JSON.stringify({ submissions }),
      });
      const data = await resp.json();
      const map: Record<string, any> = {};
      for (const r of data.results || []) map[r.id] = r;
      setGradeResultsById(map);
    } catch (_) {
      // keep quiet for now
    } finally {
      setIsReviewing(false);
    }
  }

  const codeBlockStyle = useMemo(
    () => ({
      margin: 0,
      padding: '0.75rem',
      fontSize: '0.8rem',
      overflowX: 'auto' as const,
      maxWidth: '100%',
    }),
    [],
  );

  const compactCodeBlockStyle = useMemo(
    () => ({
      margin: 0,
      padding: '0.5rem',
      fontSize: '0.7rem',
      overflowX: 'auto' as const,
      maxWidth: '100%',
    }),
    [],
  );

  const formatCodeForDisplay = useCallback((code?: string) => {
    if (!code) return '';
    const trimmed = code.trim();
    if (/\n/.test(trimmed)) {
      return trimmed;
    }

    let formatted = trimmed
      .replace(/\r\n/g, '\n')
      .replace(/}\s*else\s*{/g, '}\nelse {')
      .replace(/\)\s*{/g, ') {')
      .replace(/{\s*/g, '{\n')
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

  const sectionCardClass =
    'rounded-3xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80 p-5 sm:p-6';
  const sectionTitleClass = 'text-sm font-semibold text-slate-700 dark:text-slate-200';
  const languageEntries = Object.entries(analysis.byLanguage || {}) as Array<[string, Breakdown]>;
  const typeEntriesRaw = Object.entries(analysis.byType || {}) as Array<[string, Breakdown]>;
  const typeEntriesFiltered = typeEntriesRaw.filter(([, breakdown]) => breakdown.total > 0);
  const typeBreakdownEntries = (typeEntriesFiltered.length > 0 ? typeEntriesFiltered : typeEntriesRaw).map(
    ([label, breakdown]) => [label, breakdown] as [string, Breakdown],
  );
  const weakLanguages = analysis.weaknesses.languages.slice(0, 3);
  const weakTypes = analysis.weaknesses.types.slice(0, 3);

  return (
    <div ref={scrollContainerRef} className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex min-h-full w-full justify-center px-2 py-4 sm:px-4 sm:py-8">
        <div className="w-full max-w-5xl">
          <div className="flex flex-col gap-6 p-3 sm:p-6 lg:p-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_transparent_55%)] opacity-30" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
            >
              Back to Home
            </button>
            <div className="relative z-10 grid items-start gap-6 p-6 sm:p-8 md:grid-cols-[1.5fr,1fr]">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
                  <span>{passed ? 'Momentum Locked' : 'Growth Sprint'}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-semibold sm:text-4xl">Your Report Card</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
                    {passed
                      ? 'You cleared the bar. Double down on the habits that got you here and push into the advanced drills below.'
                      : 'You are one focused session away. Target the weak spots we flagged, then rerun the quiz to lock in the gains.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-white/90 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Correct</div>
                    <div className="mt-1 text-2xl font-semibold">{analysis.overall.correct}</div>
                    <div className="text-[11px] text-white/70">Out of {totalQuestionsDenominator}</div>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Accuracy</div>
                    <div className="mt-1 text-2xl font-semibold">{answeredAccuracyPercentage}%</div>
                  <div className="text-[11px] text-white/70">
                    {analysis.overall.total ? (
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-emerald-400/80 text-[9px] font-bold text-emerald-950">✓</span>
                          <span>{analysis.overall.correct}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-rose-400/80 text-[9px] font-bold text-rose-950">✕</span>
                          <span>{analysis.overall.incorrect}</span>
                        </span>
                      </span>
                    ) : (
                      'No attempts yet'
                    )}
                  </div>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-white/20 bg-white/10 p-3 sm:col-span-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Tickets Done</div>
                    <div className="mt-1 text-2xl font-semibold">{numDone}</div>
                    <div className="text-[11px] text-white/70">
                      {tickets.length === 0 ? 'No tickets yet' : `${numDone}/${tickets.length} completed`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/95 p-5 text-indigo-950 shadow-xl backdrop-blur dark:bg-slate-900/95 dark:text-slate-100">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">Overall Score</div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-4xl font-bold">{overallPercentage}%</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {analysis.overall.correct} / {totalQuestionsDenominator}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {passed
                      ? 'Solid execution. Stack harder practice tickets and keep the momentum sharp.'
                      : 'Focus on the weak spots next, then retake the quiz to push the score over the finish line.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative h-16 w-16 rounded-2xl border border-white/30 bg-cover bg-center shadow-lg"
                      style={{ backgroundImage: `url(${robotSrc})` }}
                      aria-label="Repo IQ Robot"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/70">Repo IQ</div>
                      <div className="mt-2 text-3xl font-semibold">{repoIQ.score}</div>
                      <ul className="mt-2 space-y-1 text-xs text-white/85">
                        {repoIQ.reasoning.slice(0, 2).map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-0.5 text-white/60">-</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className={sectionCardClass}>
              <h3 className={`${sectionTitleClass} mb-3`}>Strengths</h3>
              {sw.strengths.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We didn't pull explicit highlights this run, but your accuracy trend is still moving in the right direction.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sw.strengths.map((s, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5">✅</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className={sectionCardClass}>
              <h3 className={`${sectionTitleClass} mb-3`}>Weak Spots</h3>
              {sw.weaknesses.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No glaring gaps detected. Push into tougher variants to raise the ceiling.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sw.weaknesses.map((w, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 text-amber-500">⚠️</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`${sectionCardClass}`}>
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className={sectionTitleClass}>Performance Trends</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Aim your next reps where the bars dip. The lift shows up fast.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      By Language
                    </div>
                    <div className="space-y-3">
                      {languageEntries.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Language data will appear once your attempts include tagged languages.
                        </p>
                      ) : (
                        languageEntries.map(([lang, breakdown]) => {
                          const pct = Math.round(breakdown.accuracy * 100);
                          return (
                            <div key={lang}>
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{lang}</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      By Question Type
                    </div>
                    <div className="space-y-3">
                      {typeBreakdownEntries.map(([type, breakdown]) => {
                        const pct = Math.round(breakdown.accuracy * 100);
                        const label = type.split('-').join(' ');
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                              <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{label}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={sectionCardClass}>
              <h3 className={sectionTitleClass}>Focus Areas</h3>
              <div className="mt-3 space-y-4">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Weak Languages</div>
                  {weakLanguages.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nothing critical stood out from your language breakdown.</p>
                  ) : (
                    <ul className="space-y-1">
                      {weakLanguages.map((lang) => (
                        <li key={lang} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          <span>{lang}</span>
                          <span className="text-[10px] uppercase tracking-wide text-rose-500">needs reps</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Weak Question Types</div>
                  {weakTypes.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No standout weak types detected this run.</p>
                  ) : (
                    <ul className="space-y-1">
                      {weakTypes.map((type) => (
                        <li key={type} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          <span className="capitalize">{type}</span>
                          <span className="text-[10px] uppercase tracking-wide text-rose-500">target next</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className={`${sectionCardClass} space-y-5`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Targeted Tickets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Log the misses, fix them with code plus explanation, then push for automated grading.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {tickets.length > 0 && (
                  <button
                    onClick={clearAllTickets}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={addBugTicketRandom}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500"
                >
                  Add Code Bug Ticket
                </button>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {numDone}/{tickets.length} completed
                </div>
                {ticketsLoading && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-300" />
                    <span>Generating tickets…</span>
                  </div>
                )}
              </div>
            </div>
            {showEmptyTicketsState ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No tickets yet - add one from a failed question or pull a sample to keep your reps moving.
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.length > 0 && (
                  <AnimatePresence initial={false}>
                    {tickets.map((t) => {
                      const codeValue = userCodeById[t.id] ?? getDefaultFixSnippet(t);
                      const isFullscreen = fullscreenTicketId === t.id;
                      const languageLabel = (t.language || 'javascript').toUpperCase();
                      const isCollapsed = collapsedTickets[t.id] ?? true;
                      return (
                        <motion.div
                          key={t.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                          className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${
                            t.done
                              ? 'border-emerald-300/70 bg-emerald-50/40 dark:border-emerald-700/70 dark:bg-emerald-900/20'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-semibold ${
                                  t.done
                                    ? 'text-emerald-700 line-through decoration-emerald-400/70 dark:text-emerald-300'
                                    : 'text-slate-800 dark:text-slate-100'
                                }`}
                              >
                                {t.title}
                              </div>
                              <p
                                className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${
                                  t.done ? 'line-through decoration-slate-400/60' : ''
                                }`}
                              >
                                {t.description}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => toggleCollapsed(t.id)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                {isCollapsed ? 'Expand' : 'Collapse'}
                              </button>
                            </div>
                          </div>

                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div
                              key="ticket-body"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 flex flex-col gap-4 lg:flex-row">
                                <div className="min-w-0 flex-1 space-y-3">
                                  {t.bugSnippet && (
                                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                      <div className="bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                                        Buggy Code
                                      </div>
                                      <SyntaxHighlighter
                                        language={t.language || 'javascript'}
                                        style={vscDarkPlus}
                                        wrapLongLines
                                        customStyle={codeBlockStyle}
                                      >
                                        {formatCodeForDisplay(t.bugSnippet)}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                  <div className="space-y-3">
                                    <div
                                      className={`overflow-hidden rounded-xl border shadow-inner transition ${
                                        isFullscreen
                                          ? 'border-indigo-300/70 ring-2 ring-indigo-300/40'
                                          : 'border-slate-200 dark:border-slate-700'
                                      } bg-[#0d1117] text-slate-200 dark:bg-slate-950/80`}
                                    >
                                      <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                        <div className="flex items-center gap-2">
                                          <span className="hidden items-center gap-1.5 pr-3 text-xs text-slate-500 sm:flex">
                                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
                                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                                          </span>
                                          <span>Your Fix</span>
                                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                                            {languageLabel}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => setFullscreenTicketId(t.id)}
                                            className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-200 transition hover:bg-white/10"
                                          >
                                            Full Screen
                                          </button>
                                        </div>
                                      </div>
                                      <textarea
                                        className="h-56 w-full resize-y bg-[#0d1117] px-4 py-4 font-mono text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 caret-emerald-400 outline-none border-t border-white/5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                                        value={codeValue}
                                        onChange={(e) => setUserCodeById((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                        spellCheck={false}
                                      />
                                      <div className="flex items-center justify-between border-t border-white/5 bg-[#161b22] px-4 py-2 text-[11px] text-slate-400">
                                        <span>Spaces: 2</span>
                                        <span>UTF-8</span>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        Written Explanation
                                      </div>
                                      <textarea
                                        className="h-28 w-full resize-y rounded-xl border border-slate-300/60 bg-[#0d1117] p-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700"
                                        placeholder="Explain what was wrong and why your change fixes it."
                                        value={userExplanationById[t.id] ?? ''}
                                        onChange={(e) => setUserExplanationById((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                        spellCheck={false}
                                      />
                                    </div>
                                  </div>
                                  {gradeResultsById[t.id] && t.fixedSnippet && (
                                    <div className="overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-700">
                                      <div className="bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                                        Authoritative Fix
                                      </div>
                                      <SyntaxHighlighter
                                        language={t.language || 'javascript'}
                                        style={vscDarkPlus}
                                        wrapLongLines
                                        customStyle={codeBlockStyle}
                                      >
                                        {formatCodeForDisplay(t.fixedSnippet)}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                  {gradeResultsById[t.id] && t.solutionText && (
                                    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 text-xs text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200">
                                      <strong>Solution:</strong> {t.solutionText}
                                    </div>
                                  )}
                                  {t.sourceQuestion && (
                                    <div className="space-y-2 rounded-xl border border-sky-200/70 bg-sky-50/60 p-3 text-xs text-sky-800 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200">
                                      <div className="font-semibold text-sky-700 dark:text-sky-200">Based on failed question</div>
                                      <div>
                                        <strong>Type:</strong> {t.sourceQuestion.type}
                                      </div>
                                      <div>
                                        <strong>Question:</strong> {t.sourceQuestion.question}
                                      </div>
                                      {t.sourceQuestion.codeContext && (
                                        <div>
                                          <strong>Code Context:</strong>
                                          <div className="mt-2 overflow-hidden rounded-lg border border-sky-200 dark:border-sky-700">
                                            <SyntaxHighlighter
                                              language={t.language || 'javascript'}
                                              style={vscDarkPlus}
                                              wrapLongLines
                                              customStyle={compactCodeBlockStyle}
                                            >
                                              {formatCodeForDisplay(t.sourceQuestion.codeContext)}
                                            </SyntaxHighlighter>
                                          </div>
                                        </div>
                                      )}
                                      <div>
                                        <strong>Your Answer:</strong> {t.sourceQuestion.userAnswer}
                                      </div>
                                      <div>
                                        <strong>Correct Answer:</strong> {t.sourceQuestion.correctAnswer}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex w-full flex-col gap-2 lg:max-w-[220px]">
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                      const hasCode = (userCodeById[t.id] ?? '').trim().length > 0;
                                      const hasText = (userExplanationById[t.id] ?? '').trim().length > 0;
                                      if (!t.done && (!hasCode || !hasText)) return;
                                      toggleDone(t.id);
                                    }}
                                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                      t.done
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40'
                                    }`}
                                  >
                                    {t.done ? 'Reopen Ticket' : 'Mark as Complete'}
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => copyTicket(t.id)}
                                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    Copy Summary
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => removeTicket(t.id)}
                                    className="w-full rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50"
                                  >
                                    Delete
                                  </motion.button>
                                  {gradeResultsById[t.id] && (
                                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                                      <div className="font-semibold text-slate-700 dark:text-slate-200">
                                        Grading {gradeResultsById[t.id].pass ? '✅' : '❌'}
                                      </div>
                                      <div>Weighted Score: {gradeResultsById[t.id].weightedScore}/10</div>
                                      <div>
                                        Code: {gradeResultsById[t.id].codeScore}/10 • Written: {gradeResultsById[t.id].writtenScore}/10
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Feedback: {gradeResultsById[t.id].feedback}
                                      </div>
                                      <button
                                        onClick={() => setOpenResultTicketId(t.id)}
                                        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                                      >
                                        View Breakdown
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                )}
                {pendingSkeletonCount > 0 && (
                  <div className="space-y-3">
                    {Array.from({ length: pendingSkeletonCount }).map((_, idx) => (
                      <div
                        key={`ticket-skeleton-${idx}`}
                        className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40"
                      >
                        <div className="flex flex-col gap-3 animate-pulse">
                          <div className="h-3 w-3/5 rounded bg-slate-200 dark:bg-slate-700" />
                          <div className="h-3 w-4/5 rounded bg-slate-200/80 dark:bg-slate-800" />
                          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300/70 bg-white/80 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-500">
                            Generating ticket…
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Finish or clear the queue, then send it for grading to get AI coaching on your fix.
              </div>
              <button
                onClick={reviewTickets}
                disabled={!allHandled || isReviewing || tickets.length === 0}
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !allHandled || tickets.length === 0
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {isReviewing ? 'Reviewing...' : 'Review Tickets'}
              </button>
            </div>
          </section>

          <div className={`${sectionCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              {passed ? 'Nice work. Keep going! 🔥' : "You're close - a little focused practice will do wonders."}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                onClick={onRetry}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
              >
                Retake Quiz
              </button>
              {shareEnabled && onShareClick && (
                <button
                  onClick={onShareClick}
                  disabled={shareStatus === 'loading'}
                  className={`w-full rounded-xl border px-4 py-2 text-sm font-semibold transition sm:w-auto ${
                    shareStatus === 'loading'
                      ? 'cursor-wait border-indigo-200 text-indigo-300 dark:border-indigo-500/40 dark:text-indigo-400'
                      : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-900/30'
                  }`}
                >
                  {shareStatus === 'loading' ? 'Preparing…' : 'Share'}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {fullscreenTicketId && (() => {
        const fullscreenTicket = tickets.find((ticket) => ticket.id === fullscreenTicketId);
        if (!fullscreenTicket) return null;
        const fullscreenValue = userCodeById[fullscreenTicket.id] ?? getDefaultFixSnippet(fullscreenTicket);
        const fullscreenLanguage = (fullscreenTicket.language || 'javascript').toUpperCase();
        return (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0d1117] shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700 bg-[#161b22] px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">Your Fix - Full Screen</div>
                  <div className="text-xs text-slate-400">{fullscreenTicket.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-indigo-500/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                    {fullscreenLanguage}
                  </span>
                  <button
                    onClick={() => setFullscreenTicketId(null)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
              <textarea
                autoFocus
                className="flex-1 w-full resize-none bg-[#0d1117] px-6 py-5 font-mono text-sm leading-relaxed text-slate-100 caret-emerald-400 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                value={fullscreenValue}
                onChange={(e) =>
                  setUserCodeById((prev) => ({
                    ...prev,
                    [fullscreenTicket.id]: e.target.value,
                  }))
                }
                spellCheck={false}
              />
              <div className="flex items-center justify-between border-t border-slate-700 bg-[#161b22] px-5 py-3 text-xs text-slate-400">
                <span>Esc to exit full screen</span>
                <div className="flex items-center gap-4">
                  <span>Spaces: 2</span>
                  <span>UTF-8</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {openResultTicketId && gradeResultsById[openResultTicketId] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ticket Results</div>
              <button
                onClick={() => setOpenResultTicketId(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <span className="sr-only">Close</span>✕
              </button>
            </div>
            <div className="space-y-5 px-6 py-5">
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
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Overview</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Weighted: <strong>{r.weightedScore}/10</strong> • Code: <strong>{r.codeScore}/10</strong> • Written:{' '}
                        <strong>{r.writtenScore}/10</strong> • {r.pass ? 'Pass ✅' : 'Fail ❌'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Code Criteria</div>
                      <div className="mt-2 space-y-2">
                        {codeBars.map((b, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                              <span>{b.label}</span>
                              <span>
                                {b.value}/{b.max}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
                              <div className={`h-2 ${b.color}`} style={{ width: `${Math.max(0, Math.min(100, (b.value / b.max) * 100))}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Written Criteria</div>
                      <div className="mt-2 space-y-2">
                        {writtenBars.map((b, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                              <span>{b.label}</span>
                              <span>
                                {b.value}/{b.max}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
                              <div className={`h-2 ${b.color}`} style={{ width: `${Math.max(0, Math.min(100, (b.value / b.max) * 100))}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Feedback</div>
                      <div className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{r.feedback}</div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <button
                onClick={() => setOpenResultTicketId(null)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
