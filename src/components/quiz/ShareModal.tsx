'use client';

import { ShareStatus } from './useShareLink';

interface ShareModalProps {
  isOpen: boolean;
  status: ShareStatus;
  shareUrl: string;
  shareError: string | null;
  shareCopied: boolean;
  onClose: () => void;
  onRetry: () => void;
  onCopy: () => void;
}

const shareStatusLabel = {
  loading: 'Generating share link…',
  success: 'Share link ready',
  error: 'Could not generate share link',
  idle: ''
} as const;

export function ShareModal({
  isOpen,
  status,
  shareUrl,
  shareError,
  shareCopied,
  onClose,
  onRetry,
  onCopy
}: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Share this quiz</div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <span className="sr-only">Close</span>✕
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
              <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-500" />
              {shareStatusLabel.loading}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-rose-600 dark:text-rose-300">
                {shareError ?? shareStatusLabel.error}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={onRetry}
                  className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {status === 'success' && (
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
                    onClick={onCopy}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    {shareCopied ? 'Link Copied' : 'Copy Link'}
                  </button>
                  {!shareCopied && (
                    <button
                      onClick={onClose}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-300">Preparing share link…</p>
          )}
        </div>
      </div>
    </div>
  );
}

