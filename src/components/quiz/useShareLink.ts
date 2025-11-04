'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ShareStatus = 'idle' | 'loading' | 'success' | 'error';

export function useShareLink() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
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

  useEffect(() => {
    return () => {
      if (shareCopyTimeoutRef.current) {
        clearTimeout(shareCopyTimeoutRef.current);
      }
    };
  }, []);

  return {
    isShareModalOpen,
    shareStatus,
    shareUrl,
    shareError,
    shareCopied,
    handleOpenShareModal,
    closeShareModal,
    retryShare,
    handleCopyShareLink
  };
}

