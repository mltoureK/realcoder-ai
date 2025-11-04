'use client';

interface ReportLoadingOverlayProps {
  loadingPct: number;
  funTips: string[];
}

export function ReportLoadingOverlay({ loadingPct, funTips }: ReportLoadingOverlayProps) {
  const tip = funTips[Math.floor(loadingPct / 10) % funTips.length];

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
          {tip}
        </div>
      </div>
    </div>
  );
}

