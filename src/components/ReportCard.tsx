'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [fullscreenTicketId, setFullscreenTicketId] = useState<string | null>(null);
  const [collapsedTickets, setCollapsedTickets] = useState<Record<string, boolean>>(() => ({}));
  const robotSrc = '/report-bot.png';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateSW = async () => {
      try {
        const strengthsWeaknesses = await generateStrengthsWeaknesses(analysis, results, failedQuestions);
        setSw(strengthsWeaknesses);
      } catch (error) {
        console.error('Error generating strengths and weaknesses:', error);
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
  }, [initialTickets && initialTickets.length]);

useEffect(() => {
  try {
    localStorage.setItem('rc_tickets', JSON.stringify(tickets));
  } catch (_) {}
}, [tickets]);

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

  async function copyTicket(id: string) {
    const t = tickets.find((ticket) => ticket.id === id);
    if (!t) return;
    const text = `Title: ${t.title}\n\n${t.description}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}
  }

  const percentage = Math.round(analysis.overall.accuracy * 100);
  const passed = percentage >= 70;
  const numDone = tickets.filter((t) => t.done).length;
  const allHandled = tickets.length === 0 || tickets.every((t) => t.done);

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

  const sectionCardClass =
    'rounded-3xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80 p-5 sm:p-6';
  const sectionTitleClass = 'text-sm font-semibold text-slate-700 dark:text-slate-200';
  const languageEntries = Object.entries(analysis.byLanguage || {}) as Array<[string, Breakdown]>;
  const typeEntriesRaw = Object.entries(analysis.byType || {}) as Array<[string, Breakdown]>;
  const typeEntriesFiltered = typeEntriesRaw.filter(([, breakdown]) => breakdown.total > 0);
  const typeBreakdownEntries = (typeEntriesFiltered.length > 0 ? typeEntriesFiltered : typeEntriesRaw).map(
    ([label, breakdown]) => [label, breakdown] as [string, Breakdown],
  );
  const topResources = recs.resources.slice(0, 3);
  const topExercises = recs.exercises.slice(0, 2);
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
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                    <div className="text-[11px] text-white/70">Out of {analysis.overall.total}</div>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Accuracy</div>
                    <div className="mt-1 text-2xl font-semibold">{percentage}%</div>
                    <div className="text-[11px] text-white/70">
                      {analysis.overall.total ? `${analysis.overall.correct} ✅ / ${analysis.overall.incorrect} ❌` : 'No attempts yet'}
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
                    <span className="text-4xl font-bold">{percentage}%</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {analysis.overall.correct} / {analysis.overall.total}
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

          <div className="grid gap-4 lg:grid-cols-3">
            <section className={`${sectionCardClass} lg:col-span-2`}>
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
              <h3 className={sectionTitleClass}>Next Moves</h3>
              <div className="mt-3 space-y-4">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Resources
                  </div>
                  {topResources.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      We'll surface curated resources once we have more signal.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {topResources.map((resource) => (
                        <li key={resource.title}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                          >
                            {resource.title}
                          </a>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{resource.reason}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Exercises
                  </div>
                  {topExercises.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Complete a run to unlock targeted drills for rapid improvement.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {topExercises.map((exercise) => (
                        <li
                          key={exercise.title}
                          className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-700/70 dark:bg-slate-800/60"
                        >
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{exercise.title}</div>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {exercise.description}
                          </p>
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
                <button
                  onClick={addBugTicketRandom}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500"
                >
                  Add Code Bug Ticket
                </button>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {numDone}/{tickets.length} completed
                </div>
              </div>
            </div>
            {tickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No tickets yet - add one from a failed question or pull a sample to keep your reps moving.
              </div>
            ) : (
              <div className="space-y-4">
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
                                        {t.bugSnippet}
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
                                        className="h-48 w-full resize-y bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-500 outline-none focus:ring-0 sm:text-sm"
                                        value={codeValue}
                                        onChange={(e) => setUserCodeById((prev) => ({ ...prev, [t.id]: e.target.value }))}
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
                                        className="h-24 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"
                                        placeholder="Explain what was wrong and why your change fixes it."
                                        value={userExplanationById[t.id] ?? ''}
                                        onChange={(e) => setUserExplanationById((prev) => ({ ...prev, [t.id]: e.target.value }))}
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
                                        {t.fixedSnippet}
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
                                              {t.sourceQuestion.codeContext}
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
                className="flex-1 w-full resize-none bg-transparent px-6 py-5 font-mono text-sm leading-relaxed text-slate-100 outline-none focus:ring-0"
                value={fullscreenValue}
                onChange={(e) =>
                  setUserCodeById((prev) => ({
                    ...prev,
                    [fullscreenTicket.id]: e.target.value,
                  }))
                }
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
