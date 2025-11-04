'use client';

interface ReportPromptProps {
  onConfirm: () => void;
  onSkip: () => void;
}

export function ReportPrompt({ onConfirm, onSkip }: ReportPromptProps) {
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
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            We can analyze your answers and generate personalized bug-fix tickets.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 w-full">
            <button
              className="py-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
              onClick={onConfirm}
            >
              Yes
            </button>
            <button
              className="py-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              onClick={onSkip}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

