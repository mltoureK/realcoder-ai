'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import { generateQuizFromRepository } from '@/lib/quiz-service';
import QuizInterface from '@/components/QuizInterface';
import CuratedRepos from '@/components/CuratedRepos';
import Auth from '@/components/Auth';
import UserProfile from '@/components/UserProfile';
import FounderCounter from '@/components/FounderCounter';
import { useAuth } from '@/context/AuthContext';
import { checkQuizLimit, incrementQuizCount } from '@/lib/user-management';

interface GitHubRepo {
  owner: string;
  repo: string;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.cs': 'C#',
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.jsx': 'JavaScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.h': 'C',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.scala': 'Scala',
  '.clj': 'Clojure',
  '.hs': 'Haskell',
  '.ml': 'OCaml',
  '.fs': 'F#',
  '.vb': 'VB.NET',
  '.sh': 'Shell',
  '.ps1': 'PowerShell',
  '.bat': 'Batch',
  '.sql': 'SQL',
  '.ada': 'Ada',
  '.adb': 'Ada',
  '.ads': 'Ada',
  '.s': 'Assembly',
  '.asm': 'Assembly',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.xml': 'XML',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.ini': 'INI',
  '.cfg': 'Config',
  '.conf': 'Config'
};

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [githubRepo, setGithubRepo] = useState<GitHubRepo>({ owner: '', repo: '' });
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<Array<{name: string, isDefault: boolean}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'github' | 'curated'>('upload');
  const [quizSession, setQuizSession] = useState<any>(null);
  const [streamingQuiz, setStreamingQuiz] = useState<{
    code: string;
    questionTypes: string[];
    difficulty: string;
    numQuestions: number;
  } | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<Array<{name: string, percentage: number, fileCount: number}>>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [repositoryFiles, setRepositoryFiles] = useState<any[]>([]);
  const [trendingRepos, setTrendingRepos] = useState<any[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [cachedQuestionCountAll, setCachedQuestionCountAll] = useState<number>(0);
  const [cachedQuestionCountFiltered, setCachedQuestionCountFiltered] = useState<number>(0);
  const [hidePassedQuestions, setHidePassedQuestions] = useState(false);
  const [quizLimit, setQuizLimit] = useState<{
    canTake: boolean;
    weeklyRemaining: number;
    monthlyRemaining: number;
    weeklyLimit: number;
    monthlyLimit: number;
    isPremium: boolean;
    reason?: string;
    weekResetDate?: Date;
    monthResetDate?: Date;
  } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const prefetchSignatureRef = useRef<string | null>(null);
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayedCachedQuestionCount = hidePassedQuestions && user ? cachedQuestionCountFiltered : cachedQuestionCountAll;
  const hiddenQuestionDelta = Math.max(0, cachedQuestionCountAll - cachedQuestionCountFiltered);

  // Fetch quiz limit when user logs in
  useEffect(() => {
    if (user) {
      const fetchQuizLimit = async () => {
        try {
          const limit = await checkQuizLimit(user.uid);
          setQuizLimit(limit);
          console.log('📊 Quiz limit:', limit);
        } catch (error) {
          console.error('❌ Error fetching quiz limit:', error);
        }
      };
      fetchQuizLimit();
    } else {
      setQuizLimit(null);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  // Handle payment success (fallback for when webhook doesn't fire in test mode)
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const sessionId = urlParams.get('session_id');

      if (paymentStatus === 'success' && sessionId && user) {
        console.log('🎉 Payment success detected, verifying session...');
        
        try {
          const response = await fetch('/api/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });

          const data = await response.json();

          if (data.success) {
            console.log('✅ Checkout verified and user upgraded!', data);
            alert(data.message);
            
            // Refresh quiz limit to show unlimited access
            const limit = await checkQuizLimit(user.uid);
            setQuizLimit(limit);
            
            // Clean up URL
            window.history.replaceState({}, '', '/');
          } else {
            console.error('❌ Checkout verification failed:', data);
          }
        } catch (error) {
          console.error('❌ Error verifying checkout:', error);
        }
      } else if (paymentStatus === 'cancelled') {
        console.log('❌ Payment was cancelled');
        alert('Payment was cancelled. You can try again anytime!');
        window.history.replaceState({}, '', '/');
      }
    };

    if (user) {
      handlePaymentSuccess();
    }
  }, [user]);

  const fetchCachedQuestionCounts = useCallback(async (repoUrl: string) => {
    try {
      const { getCachedQuestions } = await import('@/lib/quiz-history');
      const allPromise = getCachedQuestions(repoUrl, 50);
      const userId = user?.uid;
      const filteredPromise = userId ? getCachedQuestions(repoUrl, 50, userId) : null;
      
      const allQuestions = await allPromise;
      const filteredQuestions = userId ? await filteredPromise! : allQuestions;
      
      setCachedQuestionCountAll(allQuestions.length);
      setCachedQuestionCountFiltered(filteredQuestions.length);
      
      console.log(`📦 Cache status: total ${allQuestions.length}, filtered ${filteredQuestions.length} for ${repoUrl}`);
      return { allQuestions, filteredQuestions };
    } catch (error) {
      console.error('Error refreshing cache count:', error);
      setCachedQuestionCountAll(0);
      setCachedQuestionCountFiltered(0);
      return { allQuestions: [], filteredQuestions: [] };
    }
  }, [user]);

  // Refresh cached counts when repository changes or hide toggle flips
  useEffect(() => {
    if (githubRepo.owner && githubRepo.repo) {
      const repoUrl = `https://github.com/${githubRepo.owner}/${githubRepo.repo}`;
      fetchCachedQuestionCounts(repoUrl);
    }
  }, [githubRepo.owner, githubRepo.repo, hidePassedQuestions, fetchCachedQuestionCounts]);

  // Load trending repositories
  const loadTrendingRepos = async () => {
    if (trendingRepos.length > 0) return; // Already loaded
    
    setIsLoadingTrending(true);
    try {
      console.log('📈 Loading trending repositories...');
      const response = await fetch('/api/trendingRepos');
      const data = await response.json();
      
      if (data.success) {
        setTrendingRepos(data.repositories);
        console.log('✅ Loaded', data.repositories.length, 'trending repositories');
      }
    } catch (error) {
      console.error('❌ Error loading trending repositories:', error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Handle repository selection (from trending or manual input)
  const handleRepositorySelect = async (url: string) => {
    console.log('📦 Repository selected:', url);
    setGithubUrl(url);
    
    // Clear previous state
    setQuizSession(null);
    setShowLoadingOverlay(false);
    setIsLoading(false);
    setAvailableBranches([]);
    setSelectedBranch('');
    setAvailableLanguages([]);
    setSelectedLanguages([]);
    setRepositoryFiles([]);
    prefetchSignatureRef.current = null;
    
    // Switch to GitHub tab when selecting from curated repos
    setActiveTab('github');
    
    // Force trigger the GitHub URL change handler
    await handleGitHubUrlChange(url);
  };

  const applyRepositoryData = (repositoryInfo: any) => {
    if (!repositoryInfo) {
      throw new Error('Missing repository info from server response');
    }

    console.log('✅ Repository processed successfully');
    console.log('📁 Files received from API:', repositoryInfo.files?.length || 0);

    setRepositoryFiles(repositoryInfo.files || []);

    let detectedLanguages: Array<{ name: string; percentage: number; fileCount: number }> = [];

    if (repositoryInfo.languagePercentages && repositoryInfo.languageCounts) {
      detectedLanguages = Object.entries(repositoryInfo.languagePercentages)
        .map(([language, percentage]) => ({
          name: language,
          percentage: percentage as number,
          fileCount: (repositoryInfo.languageCounts as { [key: string]: number })[language] || 0
        }))
        .sort((a, b) => (b.percentage as number) - (a.percentage as number));
      console.log('🎯 Using backend language analysis:', detectedLanguages);
    } else {
      detectedLanguages = detectLanguagesFromFiles(repositoryInfo.files || []);
      console.log('🔍 Fallback to local language detection:', detectedLanguages);
    }

    setAvailableLanguages(detectedLanguages);
    const defaultLanguageNames = detectedLanguages.map(lang => lang.name);
    setSelectedLanguages(defaultLanguageNames);

    const { code: initialCombinedCode, includedFiles } = buildCombinedCode(
      repositoryInfo.files || [],
      defaultLanguageNames
    );

    console.log('🧩 Combined code prepared for prefetch:', {
      includedFiles,
      hasCode: initialCombinedCode.length > 0
    });

    if (initialCombinedCode) {
      queuePrefetch(initialCombinedCode, 'repository-processed', defaultLanguageNames);
    }

    return {
      success: true,
      repositoryInfo
    };
  };

  const requestRepositoryInfo = async (url: string) => {
    console.log('🔍 Processing repository (standard) for language detection:', url);

    const repoResponse = await fetch('/api/processRepository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!repoResponse.ok) {
      const responseClone = repoResponse.clone();
      let errorMessage = `Failed to process repository: ${repoResponse.status}`;
      try {
        const errorJson = await repoResponse.json();
        if (errorJson?.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        try {
          const errorText = await responseClone.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          // ignore additional parsing errors
        }
      }
      throw new Error(errorMessage);
    }

    const repoData = await repoResponse.json();

    if (!repoData.success || !repoData.repositoryInfo) {
      throw new Error(repoData.error || 'Repository processing failed');
    }

    return repoData.repositoryInfo;
  };

  const requestRepositoryInfoStream = async (url: string) => {
    console.log('🔁 Attempting streaming repository processing:', url);

    const streamResponse = await fetch('/api/processRepository?stream=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!streamResponse.ok || !streamResponse.body) {
      throw new Error(`Failed to process repository via stream: ${streamResponse.status}`);
    }

    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let repositoryInfo: any = null;
    let streamError: string | null = null;

    const flushBuffer = () => {
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'result' && event.repositoryInfo) {
              repositoryInfo = event.repositoryInfo;
            } else if (event.type === 'error') {
              streamError = event.message || 'stream-error';
            }
          } catch (err) {
            console.warn('⚠️ Failed to parse processRepository stream payload:', err, line);
          }
        }
        newlineIndex = buffer.indexOf('\n');
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        flushBuffer();
      }
      if (done) {
        buffer += decoder.decode(new Uint8Array());
        flushBuffer();
        break;
      }
    }

    if (streamError) {
      throw new Error(streamError);
    }

    if (!repositoryInfo) {
      throw new Error('Streaming processor did not return repository info');
    }

    return repositoryInfo;
  };

  // Process repository and detect languages
  const processRepository = async (url: string) => {
    try {
      const repositoryInfo = await requestRepositoryInfo(url);
      return applyRepositoryData(repositoryInfo);
    } catch (primaryError) {
      console.error('❌ Error processing repository (standard path):', primaryError);
      try {
        const repositoryInfo = await requestRepositoryInfoStream(url);
        console.log('✅ Streaming fallback succeeded');
        return applyRepositoryData(repositoryInfo);
      } catch (streamError) {
        console.error('❌ Streaming fallback failed:', streamError);
        if (streamError instanceof Error) {
          const combinedMessage = `${streamError.message}${primaryError instanceof Error ? ` (primary: ${primaryError.message})` : ''}`;
          throw new Error(combinedMessage);
        }
        throw streamError;
      }
    }
  };

  // Language detection function
  const detectLanguagesFromFiles = (files: any[]): Array<{name: string, percentage: number, fileCount: number}> => {
    const languageMap: { [key: string]: string } = {
      '.cs': 'C#',
      '.js': 'JavaScript', 
      '.ts': 'TypeScript',
      '.jsx': 'JavaScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.cc': 'C++',
      '.cxx': 'C++',
      '.c': 'C',
      '.h': 'C',
      '.go': 'Go',
      '.rs': 'Rust',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.clj': 'Clojure',
      '.hs': 'Haskell',
      '.ml': 'OCaml',
      '.fs': 'F#',
      '.vb': 'VB.NET',
      '.sh': 'Shell',
      '.ps1': 'PowerShell',
      '.bat': 'Batch',
      '.sql': 'SQL',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.less': 'Less',
      '.xml': 'XML',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.toml': 'TOML',
      '.ini': 'INI',
      '.cfg': 'Config',
      '.conf': 'Config',
      '.ada': 'Ada',
      '.adb': 'Ada',
      '.ads': 'Ada',
      '.s': 'Assembly',
      '.asm': 'Assembly'
    };

    const languageCounts: { [key: string]: number } = {};
    let totalFiles = 0;
    
    files.forEach(file => {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext && languageMap[`.${ext}`]) {
        const language = languageMap[`.${ext}`];
        languageCounts[language] = (languageCounts[language] || 0) + 1;
        totalFiles++;
      }
    });

    // Convert to array with percentages
    return Object.entries(languageCounts)
      .filter(([_, count]) => count > 0)
      .map(([language, count]) => ({
        name: language,
        percentage: Math.round((count / totalFiles) * 100),
        fileCount: count
      }))
      .sort((a, b) => b.percentage - a.percentage);
  };

  const buildCombinedCode = useCallback((files: any[], languages: string[]): { code: string; includedFiles: number } => {
    if (!Array.isArray(files) || files.length === 0) {
      return { code: '', includedFiles: 0 };
    }

    const includeAll = languages.length === 0;
    const languageSet = new Set(languages);
    const chunks: string[] = [];
    let includedFiles = 0;

    files.forEach((file) => {
      if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') return;

      if (!includeAll) {
        const ext = `.${file.path.split('.').pop()?.toLowerCase() || ''}`;
        const mappedLanguage = EXTENSION_LANGUAGE_MAP[ext];
        if (!mappedLanguage || !languageSet.has(mappedLanguage)) {
          return;
        }
      }

      chunks.push(`// ${file.path}\n${file.content}`);
      includedFiles += 1;
    });

    return { code: chunks.join('\n\n'), includedFiles };
  }, []);

  const triggerPrefetch = useCallback(
    async (code: string, reason: string, languagesForSignature: string[]) => {
      if (!githubRepo.owner || !githubRepo.repo) {
        console.warn('⚠️ [Prefetch] Skipping prefetch - repository info missing');
        return;
      }
      if (!code || code.trim().length === 0) {
        console.warn('⚠️ [Prefetch] Skipping prefetch - empty code payload');
        return;
      }

      try {
        console.log(`🚀 [Prefetch] Scheduling quiz prefetch (${reason})`);
        const response = await fetch('/api/prefetchQuiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: selectedBranch || 'main'
            },
            questionTypes: ['function-variant', 'multiple-choice', 'order-sequence', 'true-false', 'select-all'],
            difficulty: 'medium',
            numQuestions: 15,
            languages: languagesForSignature
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [Prefetch] Failed to schedule prefetch:', errorText);
          return;
        }

        const data = await response.json();
        console.log('✅ [Prefetch] Prefetch queued:', data);
      } catch (error) {
        console.error('❌ [Prefetch] Error scheduling quiz prefetch:', error);
      }
    },
    [githubRepo.owner, githubRepo.repo, selectedBranch]
  );

  const queuePrefetch = useCallback(
    (code: string, reason: string, languagesOverride?: string[]) => {
      if (!code || code.trim().length === 0) return;
      if (!githubRepo.owner || !githubRepo.repo) return;

      const languages = (languagesOverride ?? selectedLanguages).slice().sort();
      const signature = `${githubRepo.owner}/${githubRepo.repo}@${selectedBranch || 'main'}|${languages.join(',')}|${code.length}`;

      if (prefetchSignatureRef.current === signature) {
        console.log(`♻️ [Prefetch] Skipping duplicate prefetch (${reason})`);
        return;
      }

      prefetchSignatureRef.current = signature;

      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }

      prefetchTimeoutRef.current = setTimeout(() => {
        triggerPrefetch(code, reason, languages).finally(() => {
          prefetchTimeoutRef.current = null;
        });
      }, 250);
    },
    [githubRepo.owner, githubRepo.repo, selectedBranch, selectedLanguages, triggerPrefetch]
  );

  useEffect(() => {
    if (!githubRepo.owner || !githubRepo.repo) return;
    if (repositoryFiles.length === 0) return;
    const { code } = buildCombinedCode(repositoryFiles, selectedLanguages);
    if (!code) return;
    queuePrefetch(code, 'language-selection');
  }, [
    githubRepo.owner,
    githubRepo.repo,
    selectedBranch,
    repositoryFiles,
    selectedLanguages,
    buildCombinedCode,
    queuePrefetch
  ]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const normalizeGitHubInput = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleGitHubUrlChange = async (url: string) => {
    const normalizedUrl = normalizeGitHubInput(url);
    setGithubUrl(url);
    setAvailableBranches([]);
    setSelectedBranch('');
    setQuizSession(null);
    setShowLoadingOverlay(false);
    setIsLoading(false);
    prefetchSignatureRef.current = null;
    
    // Extract owner and repo from any GitHub URL format using regex
    // Handles: github.com/owner/repo, github.com/owner/repo/tree/main, github.com/owner/repo/blob/main/file.js, etc.
    const githubUrlRegex = /github\.com\/([^\/\?#]+)\/([^\/\?#]+)/;
    const match = normalizedUrl.match(githubUrlRegex);
    
    if (match) {
      const [, owner, repo] = match;
      // Remove .git suffix if present and clean up any trailing slashes or query params
      const cleanRepo = repo.replace(/\.git$/, '').split('?')[0].split('#')[0];
      setGithubRepo({ owner, repo: cleanRepo });
      
      // Fetch available branches
      await fetchBranches(normalizedUrl);
    } else {
      setGithubRepo({ owner: '', repo: '' });
    }
  };

  const fetchBranches = async (url: string) => {
    setIsLoadingBranches(true);
    try {
      // Fetch branches
      const response = await fetch('/api/getBranches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAvailableBranches(data.branches);
        setSelectedBranch(data.defaultBranch);
        console.log('✅ Branches loaded:', data.branches.map((b: any) => b.name));
        console.log('🎯 Using default branch:', data.defaultBranch);
        
        // Check cache count for this repo
        const repoUrl = url.replace(/\/tree\/.*$/, ''); // Remove /tree/branch part
        const { filteredQuestions, allQuestions } = await fetchCachedQuestionCounts(repoUrl);
        console.log(`📦 Cache status updated after branch fetch for ${repoUrl}`, {
          total: allQuestions.length,
          filtered: filteredQuestions.length,
          hidePassed: hidePassedQuestions
        });
        
        // Also process the repository to detect languages using the correct branch
        const branchUrl = `${url}/tree/${data.defaultBranch}`;
        await processRepository(branchUrl);
      } else {
        console.error('❌ Failed to fetch branches:', data.error);
        // Check if we got fallback branches
        if (data.fallback) {
          console.log('🔄 Using fallback branches due to API timeout');
          setAvailableBranches(data.branches || []);
          setSelectedBranch(data.defaultBranch || 'main');
        } else {
          setAvailableBranches([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      // Set default fallback branches
      const fallbackBranches = [
        { name: 'main', isDefault: true },
        { name: 'master', isDefault: false }
      ];
      setAvailableBranches(fallbackBranches);
      setSelectedBranch('main');
      console.log('🔄 Using local fallback branches');
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Handle branch change and reprocess repository
  const handleBranchChange = async (branch: string) => {
    setSelectedBranch(branch);
    
    if (githubUrl) {
      // Reprocess repository with new branch
      const branchUrl = `${githubUrl}/tree/${branch}`;
      await processRepository(branchUrl);
    }
  };

  const handleGenerateQuiz = async () => {
    // Check if user is signed in
    if (!user) {
      setShowAuth(true);
      return;
    }

    // Check quiz limit before starting
    if (quizLimit && !quizLimit.canTake) {
      console.log('⚠️ Quiz limit reached:', quizLimit.reason);
      setShowUpgradeModal(true);
      return;
    }

    // CACHE CHECK: Load cached questions BEFORE starting loading states
    let cachedQuestions: any[] = [];
    if (activeTab === 'github' && githubUrl) {
      const repoUrl = `https://github.com/${githubRepo.owner}/${githubRepo.repo}`;
      console.log('🔍 Checking for cached questions for:', repoUrl);
      
      const { allQuestions, filteredQuestions } = await fetchCachedQuestionCounts(repoUrl);
      cachedQuestions = hidePassedQuestions && user ? filteredQuestions : allQuestions;
      
      console.log(`📦 Found ${cachedQuestions.length} cached questions for ${repoUrl} (total ${allQuestions.length}, filtered ${filteredQuestions.length})`);
      if (cachedQuestions.length > 0) {
        console.log('📋 First cached question:', cachedQuestions[0]);
      }
    }

    setIsLoading(true);
    setShowLoadingOverlay(true);
    try {
      console.log('🚀 Starting quiz generation process...');
      
      // Increment quiz count
      try {
        await incrementQuizCount(user.uid);
        // Refresh limit display
        const newLimit = await checkQuizLimit(user.uid);
        setQuizLimit(newLimit);
        console.log('✅ Quiz count incremented, new limit:', newLimit);
      } catch (error) {
        console.error('❌ Error incrementing quiz count:', error);
      }
      
      if (activeTab === 'github' && githubUrl) {
        console.log('📁 Generating quiz from stored repository files');
        console.log('🔍 Repository files available:', repositoryFiles.length);
        console.log('🔍 Selected languages:', selectedLanguages);
        
        if (repositoryFiles.length === 0) {
          throw new Error('No repository files available. Please ensure the repository was processed successfully.');
        }
        
        // STRATEGY: 
        // - < 8 cached: Use all cached + generate rest
        // - 8-49 cached: Use all cached + generate some new ones to build cache
        // - ≥ 50 cached: Use only cached, randomly select 15 each time
        if (cachedQuestions.length >= 50) {
          console.log('✅ Using ONLY cached questions (50+ available)');
          
          // Shuffle and pick 15 random cached questions
          const shuffled = cachedQuestions.sort(() => Math.random() - 0.5);
          const selectedQuestions = shuffled.slice(0, 15).map((q, index) => ({
            ...q,
            isCached: true // Mark as community reviewed
          }));
          
      console.log('✨ Selected cached questions:', selectedQuestions.map(q => ({
        id: q.id,
        type: q.type,
        isCached: q.isCached,
        question: q.question?.substring(0, 50)
      })));
      
      const cachedSession = {
        id: Date.now().toString(),
        title: 'Community Reviewed Quiz',
        questions: selectedQuestions,
        currentQuestionIndex: 0,
        score: 0,
        lives: 3,
        lastLifeRefill: new Date(),
        completed: true,
        repositoryInfo: {
          owner: githubRepo.owner,
          repo: githubRepo.repo,
          branch: selectedBranch || 'main'
        },
        isCached: true,
        isStreaming: false
      };
          
          setQuizSession(cachedSession);
          setIsLoading(false);
          setShowLoadingOverlay(false);
          return; // Skip API generation
        } else if (cachedQuestions.length >= 8 && cachedQuestions.length < 50) {
          // Use all cached + generate some new ones to build up cache
          console.log(`🔄 Using ALL ${cachedQuestions.length} cached questions + generating new ones to build cache`);
          
          const cachedToUse = cachedQuestions.map(q => ({
            ...q,
            isCached: true
          }));
          
          console.log('✨ Cached questions to use:', cachedToUse.map(q => ({
            id: q.id,
            type: q.type,
            isCached: q.isCached,
            question: q.question?.substring(0, 50)
          })));
          
          // IMMEDIATELY show cached questions - no loading delay!
          const cachedSession = {
            id: Date.now().toString(),
            title: 'Community Reviewed Quiz',
            questions: cachedToUse,
            currentQuestionIndex: 0,
            score: 0,
            lives: 3,
            lastLifeRefill: new Date(),
            completed: false,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: selectedBranch || 'main'
            },
            isCached: true,
            isStreaming: true // Mark that we're still streaming new questions
          };
          
          setQuizSession(cachedSession);
          setIsLoading(false);
          setShowLoadingOverlay(false);
          
          // Store for background streaming to add more questions
          (window as any).__cachedQuestionsToMerge = cachedToUse;
          
          // Continue to API generation to add more questions in background
          // Don't return here - we want to stream new questions too
        } else if (cachedQuestions.length > 0 && cachedQuestions.length < 8) {
          // Use up to 10 cached + generate the rest
          const numCached = Math.min(10, cachedQuestions.length);
          const cachedToUse = cachedQuestions.slice(0, numCached).map(q => ({
            ...q,
            isCached: true
          }));
          
          console.log(`🔄 Using ${numCached} cached questions + generating ${15 - numCached} new ones`);
          console.log('✨ Cached questions to use:', cachedToUse.map(q => ({
            id: q.id,
            type: q.type,
            isCached: q.isCached,
            question: q.question?.substring(0, 50)
          })));
          
          // We'll merge these with generated questions after the API call
          // Store temporarily
          (window as any).__cachedQuestionsToMerge = cachedToUse;
        } else {
          console.log('⚡ No cached questions found - generating all from scratch');
        }
        
        const { code: combinedCode, includedFiles } = buildCombinedCode(repositoryFiles, selectedLanguages);
        console.log(`📊 Filtered ${includedFiles} files for selected languages:`, selectedLanguages);

        if (!combinedCode) {
          throw new Error('No repository files matched the selected languages. Please adjust your selection and try again.');
        }

        queuePrefetch(combinedCode, 'generate-quiz');
        console.log('📤 Streaming quiz request with code length:', combinedCode.length);
        
        const quizResponse = await fetch('/api/generateQuiz?stream=1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: combinedCode,
            questionTypes: ['function-variant', 'multiple-choice', 'order-sequence', 'true-false', 'select-all'],
            difficulty: 'medium',
            numQuestions: 15,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: selectedBranch || 'main'
            }
          })
        });
        
        console.log('📡 Quiz stream response status:', quizResponse.status);
        if (!quizResponse.ok || !quizResponse.body) {
          const errorText = await quizResponse.text();
          console.error('❌ Quiz API error:', errorText);
          throw new Error(`Failed to stream quiz: ${quizResponse.status}`);
        }
        
        // Initialize empty session and mount UI early
        const initialSession = {
          id: Date.now().toString(),
          title: 'Generated Quiz',
          questions: [] as any[],
          currentQuestionIndex: 0,
          score: 0,
          lives: 3,
          lastLifeRefill: new Date(),
          completed: false,
          repositoryInfo: {
            owner: githubRepo.owner,
            repo: githubRepo.repo,
            branch: selectedBranch || 'main'
          }
        } as any;
        const mergingCachedQuestions = typeof window !== 'undefined'
          && Array.isArray((window as any).__cachedQuestionsToMerge)
          && (window as any).__cachedQuestionsToMerge.length > 0;
        setQuizSession((prev: any) => {
          if (prev && prev.isCached && mergingCachedQuestions) {
            console.log('♻️ Preserving cached quiz while streaming new questions');
            return { ...prev, isStreaming: true };
          }
          return initialSession;
        });
        
        const reader = quizResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let total = 0;
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === 'meta') {
                console.log('🧩 Expecting ~', evt.expectedTotal, 'questions');
              } else if (evt.type === 'question') {
                total += 1;
                console.log('📝 Received question', total, ':', evt.question);
                if (total === 1) {
                  setShowLoadingOverlay(false);
                }
                setQuizSession((prev: any) => {
                  if (!prev) return initialSession;
                  
                  // Check if we already have cached questions (8-49 case)
                  const cachedToMerge = (window as any).__cachedQuestionsToMerge;
                  if (cachedToMerge && cachedToMerge.length > 0) {
                    // We're adding to an existing cached quiz - add new questions to the end
                    const updated = { 
                      ...prev, 
                      questions: [...prev.questions, evt.question],
                      isStreaming: true // Keep streaming flag
                    };
                    console.log('🔄 Added new question to cached quiz. Total:', updated.questions.length);
                    return updated;
                  } else {
                    // Normal case - building quiz from scratch
                    const updated = { ...prev, questions: [...prev.questions, evt.question] };
                    console.log('🔄 Updated quiz session with', updated.questions.length, 'questions');
                    return updated;
                  }
                });
              } else if (evt.type === 'done') {
                console.log('✅ Stream done:', evt.count);
                
                // Handle completion for cached + streaming case
                const cachedToMerge = (window as any).__cachedQuestionsToMerge;
                if (cachedToMerge && cachedToMerge.length > 0) {
                  console.log(`🔄 Stream complete for cached quiz. Final composition:`, {
                    cached: cachedToMerge.length,
                    new: evt.count,
                    total: cachedToMerge.length + evt.count
                  });
                  
                  setQuizSession((prev: any) => {
                    if (!prev) return prev;
                    
                    // Mark streaming as complete
                    return {
                      ...prev,
                      isStreaming: false,
                      completed: true,  // ← ADD THIS LINE
                      title: 'Community Reviewed + AI Quiz'
                    };
                  });
                  
                  // Clear the temporary storage
                  delete (window as any).__cachedQuestionsToMerge;
                }
              } else if (evt.type === 'error') {
                console.warn('⚠️ Stream error event');
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse stream line', line);
            }
          }
        }
        
      } else if (activeTab === 'upload' && selectedFiles.length > 0) {
        console.log('📁 Processing uploaded files:', selectedFiles.length, 'files');
        
        // Process uploaded files and call your original API
        const fileContents = await Promise.all(
          selectedFiles.map(async (file) => {
            const content = await file.text();
            return `// ${file.name}\n${content}`;
          })
        );
        
        const combinedCode = fileContents.join('\n\n');
        
        console.log('📤 Streaming quiz request with code length:', combinedCode.length);
        
        const quizResponse = await fetch('/api/generateQuiz?stream=1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: combinedCode,
            questionTypes: ['function-variant', 'multiple-choice', 'order-sequence', 'true-false', 'select-all'],
            difficulty: 'medium',
            numQuestions: 10,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: selectedBranch || 'main'
            }
          })
        });
        
        console.log('📡 Quiz stream response status:', quizResponse.status);
        if (!quizResponse.ok || !quizResponse.body) {
          const errorText = await quizResponse.text();
          console.error('❌ Quiz API error:', errorText);
          throw new Error(`Failed to stream quiz: ${quizResponse.status}`);
        }
        
        // Initialize empty session and mount UI early
        const initialSession = {
          id: Date.now().toString(),
          title: 'Generated Quiz',
          questions: [] as any[],
          currentQuestionIndex: 0,
          score: 0,
          lives: 3,
          lastLifeRefill: new Date(),
          completed: false,
          repositoryInfo: {
            owner: githubRepo.owner,
            repo: githubRepo.repo,
            branch: selectedBranch || 'main'
          }
        } as any;
        const mergingCachedQuestions = typeof window !== 'undefined'
          && Array.isArray((window as any).__cachedQuestionsToMerge)
          && (window as any).__cachedQuestionsToMerge.length > 0;
        setQuizSession((prev: any) => {
          if (prev && prev.isCached && mergingCachedQuestions) {
            console.log('♻️ Preserving cached quiz while streaming new questions');
            return { ...prev, isStreaming: true };
          }
          return initialSession;
        });
        
        const reader = quizResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let total = 0;
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === 'meta') {
                console.log('🧩 Expecting ~', evt.expectedTotal, 'questions');
              } else if (evt.type === 'question') {
                total += 1;
                console.log('📝 Received question', total, ':', evt.question);
                if (total === 1) {
                  setShowLoadingOverlay(false);
                }
                setQuizSession((prev: any) => {
                  if (!prev) return initialSession;
                  
                  // Check if we already have cached questions (8-49 case)
                  const cachedToMerge = (window as any).__cachedQuestionsToMerge;
                  if (cachedToMerge && cachedToMerge.length > 0) {
                    // We're adding to an existing cached quiz - add new questions to the end
                    const updated = { 
                      ...prev, 
                      questions: [...prev.questions, evt.question],
                      isStreaming: true // Keep streaming flag
                    };
                    console.log('🔄 Added new question to cached quiz. Total:', updated.questions.length);
                    return updated;
                  } else {
                    // Normal case - building quiz from scratch
                    const updated = { ...prev, questions: [...prev.questions, evt.question] };
                    console.log('🔄 Updated quiz session with', updated.questions.length, 'questions');
                    return updated;
                  }
                });
              } else if (evt.type === 'done') {
                console.log('✅ Stream done:', evt.count);
                
                // Handle completion for normal (non-cached) case
                setQuizSession((prev: any) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    completed: true,
                    isStreaming: false
                  };
                });
              } else if (evt.type === 'error') {
                console.warn('⚠️ Stream error event');
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse stream line', line);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error generating quiz:', error);
      alert('Error generating quiz. Please try again.');
    } finally {
      setIsLoading(false);
      // If stream ended without first question for any reason, ensure overlay hides
      setShowLoadingOverlay(false);
    }
  };

  const canGenerateQuiz = () => {
    if (activeTab === 'upload') {
      return selectedFiles.length > 0;
    } else if (activeTab === 'curated') {
      // For curated (GitHub) path, ensure branch is selected and files are loaded
      return Boolean(githubRepo.owner && githubRepo.repo && selectedBranch && repositoryFiles.length > 0);
    } else {
      // For raw GitHub input, require branch + files loaded
      return Boolean(githubRepo.owner && githubRepo.repo && selectedBranch && repositoryFiles.length > 0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                RealCoder AI
              </h1>
              <span className="ml-2 sm:ml-3 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                Beta
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-600"></div>
              ) : user ? (
                <UserProfile />
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Learn from Real Code
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Upload your project files or connect a GitHub repository to generate personalized quizzes and test your coding knowledge.
          </p>
        </div>

        {/* Founder Counter - Above the fold */}
        <FounderCounter />

        {/* Input Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 sm:mb-8 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">📁 Upload Files</span>
              <span className="sm:hidden">📁 Upload</span>
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'github'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">🐙 GitHub Repo</span>
              <span className="sm:hidden">🐙 GitHub</span>
            </button>
            <button
              onClick={() => setActiveTab('curated')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'curated'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">🎯 Curated Repos</span>
              <span className="sm:hidden">🎯 Curated</span>
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
            </div>
          </div>

          {/* Upload Files Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Project Files
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-4">
                      <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          Drop files here or click to upload
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Supports JavaScript, TypeScript, Python, Java, C++, and more
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {file.name.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GitHub Repo Tab */}
          {activeTab === 'github' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => handleGitHubUrlChange(e.target.value)}
                  placeholder="e.g., https://github.com/facebook/react"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    githubRepo.owner && githubRepo.repo 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {githubRepo.owner && githubRepo.repo && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>✓ Repository found: {githubRepo.owner}/{githubRepo.repo}</span>
                  </div>
                )}
                {githubUrl && !githubRepo.owner && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Invalid GitHub URL format</span>
                  </div>
                )}
              </div>

              {/* Branch Selector */}
              {githubRepo.owner && githubRepo.repo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Branch
                  </label>
                  {isLoadingBranches ? (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading branches...</span>
                      </div>
                    </div>
                  ) : availableBranches.length > 0 ? (
                    <select
                      value={selectedBranch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {availableBranches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name} {branch.isDefault ? '(default)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-400">
                      No branches found
                    </div>
                  )}
                  {selectedBranch && (
                    <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                      ✓ Selected branch: <span className="font-mono">{selectedBranch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Language Selection */}
              {availableLanguages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Programming Languages to Test
                  </label>
                  
                  {/* GitHub-style Language Bar */}
                  <div className="mb-4">
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      {availableLanguages.map((language, index) => (
                        <div
                          key={language.name}
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          style={{
                            width: `${language.percentage}%`,
                            backgroundColor: selectedLanguages.includes(language.name) 
                              ? 'var(--language-color)' 
                              : 'transparent'
                          }}
                          onClick={() => {
                            if (selectedLanguages.includes(language.name)) {
                              setSelectedLanguages(selectedLanguages.filter(l => l !== language.name));
                            } else {
                              setSelectedLanguages([...selectedLanguages, language.name]);
                            }
                          }}
                        >
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {language.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {language.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Language Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availableLanguages.map((language) => (
                      <label key={language.name} className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedLanguages.includes(language.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLanguages([...selectedLanguages, language.name]);
                            } else {
                              setSelectedLanguages(selectedLanguages.filter(l => l !== language.name));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {language.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {language.fileCount} files ({language.percentage}%)
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      {selectedLanguages.length > 0 ? (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} selected
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">
                          ⚠️ No languages selected
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedLanguages.length === availableLanguages.length) {
                          setSelectedLanguages([]);
                        } else {
                          setSelectedLanguages(availableLanguages.map(lang => lang.name));
                        }
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      {selectedLanguages.length === availableLanguages.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Trending Repositories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Try trending repositories:</p>
                  <button
                    onClick={loadTrendingRepos}
                    disabled={isLoadingTrending}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    {isLoadingTrending ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {trendingRepos.length > 0 ? (
                  <div className="space-y-3">
                    {/* Popular Quick Access */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Popular:</p>
                      <div className="flex flex-wrap gap-2">
                        {trendingRepos.slice(0, 6).map((repo) => (
                          <button
                            key={repo.url}
                            onClick={() => handleRepositorySelect(repo.url)}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title={repo.description}
                          >
                            {repo.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Categorized List */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Browse by category:</p>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {['Frontend Framework', 'Backend Framework', 'Language', 'Build Tool'].map(category => {
                          const categoryRepos = trendingRepos.filter(repo => repo.category === category);
                          if (categoryRepos.length === 0) return null;
                          
                          return (
                            <div key={category} className="space-y-1">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{category}:</p>
                              <div className="flex flex-wrap gap-1">
                                {categoryRepos.slice(0, 4).map(repo => (
                                  <button
                                    key={repo.url}
                                    onClick={() => handleRepositorySelect(repo.url)}
                                    className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                    title={`${repo.description} • ${repo.stars} stars • ${repo.difficulty}`}
                                  >
                                    {repo.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {/* Fallback to basic popular repos */}
                    {[
                      { name: 'React', url: 'https://github.com/facebook/react' },
                      { name: 'TypeScript', url: 'https://github.com/microsoft/TypeScript' },
                      { name: 'Node.js', url: 'https://github.com/nodejs/node' },
                      { name: 'Next.js', url: 'https://github.com/vercel/next.js' }
                    ].map((repo) => (
                      <button
                        key={repo.url}
                        onClick={() => handleRepositorySelect(repo.url)}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {repo.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Curated Repos Tab */}
          {activeTab === 'curated' && (
            <div className="space-y-6">
              <CuratedRepos onRepoSelect={handleRepositorySelect} />
            </div>
          )}

          {/* Quiz Limit Display (only for non-premium users) */}
          {user && quizLimit && !quizLimit.isPremium && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  {user.isAnonymous ? (
                    <>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {quizLimit.weeklyRemaining} quizzes remaining (anonymous)
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Sign up to get 5 quizzes per week • Unlimited with premium
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {quizLimit.weeklyRemaining} quizzes remaining this week
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {quizLimit.monthlyRemaining} remaining this month • Resets {new Date(quizLimit.weekResetDate || Date.now()).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  {user.isAnonymous ? 'Sign Up' : 'Upgrade'}
                </button>
              </div>
            </div>
          )}

          {/* Generate Quiz Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Time Estimate Warning for repos without cache */}
            {activeTab === 'github' && githubRepo.owner && githubRepo.repo && availableBranches.length > 0 && displayedCachedQuestionCount < 15 && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-1">
                      ⏱️ First Generation Takes ~40 seconds
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                      {displayedCachedQuestionCount === 0
                        ? hidePassedQuestions && user && hiddenQuestionDelta > 0
                          ? 'No cached questions remain after hiding the ones you already passed.'
                          : 'This repository has no cached questions yet.'
                        : `This repository has only ${displayedCachedQuestionCount} cached question${displayedCachedQuestionCount !== 1 ? 's' : ''}.`}
                      The AI needs time to analyze the code and generate quality questions.
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded p-2 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                        💡 Help speed it up for everyone:
                      </p>
                      <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5 ml-4 list-disc">
                        <li>Wait for generation to complete (grab a ☕!)</li>
                        <li>Upvote good questions after taking the quiz</li>
                        <li>Next time it'll be instant with cached questions!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateQuiz}
              disabled={!canGenerateQuiz() || isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating Quiz...</span>
                </div>
              ) : displayedCachedQuestionCount >= 15 ? (
                <span>⚡ Generate Quiz (Instant!)</span>
              ) : (!repositoryFiles.length && activeTab !== 'upload') ? (
                'Loading repository files…'
              ) : (
                'Generate Quiz'
              )}
            </button>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Uses 1 life • Quiz will be generated based on your code
              </p>
              
              {/* Cache Status - Always show for GitHub repos after branch loads */}
              {activeTab === 'github' && githubRepo.owner && githubRepo.repo && availableBranches.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  {displayedCachedQuestionCount > 0 ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <div className="text-sm font-bold text-green-800 dark:text-green-200">
                            {displayedCachedQuestionCount >= 50 ? '⚡ INSTANT QUIZ' : `${displayedCachedQuestionCount} Cached Questions`}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            {displayedCachedQuestionCount >= 50 
                              ? 'All questions from community (no loading!)' 
                              : displayedCachedQuestionCount >= 8
                              ? 'All cached + generating new ones to build cache'
                              : hiddenQuestionDelta > 0
                              ? 'You already passed those cached questions—new ones will stream in'
                              : `${Math.min(10, displayedCachedQuestionCount)} will load instantly`}
                          </div>
                          {hidePassedQuestions && user && hiddenQuestionDelta > 0 && (
                            <div className="text-[11px] text-green-700 dark:text-green-300">
                              Hiding {hiddenQuestionDelta} passed question{hiddenQuestionDelta !== 1 ? 's' : ''} (from {cachedQuestionCountAll} total)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          No cached questions yet - be the first to build the question bank!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Hide Passed Questions Toggle - Only show for logged-in users */}
              {activeTab === 'github' && user && (
                <div className="flex items-center justify-center mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hidePassedQuestions}
                      onChange={(e) => setHidePassedQuestions(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Hide questions I've already passed
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Smart Questions</h3>
            <p className="text-gray-600 dark:text-gray-400">AI-generated questions based on your actual code patterns and logic.</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Learn by Doing</h3>
            <p className="text-gray-600 dark:text-gray-400">Practice with real-world code from popular repositories and your own projects.</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Track Progress</h3>
            <p className="text-gray-600 dark:text-gray-400">Monitor your learning progress and identify areas for improvement.</p>
          </div>
        </div>
      </main>

      {/* Full-Screen Quiz Interface */}
      {quizSession && (
        <QuizInterface 
          quizSession={quizSession} 
          onClose={() => setQuizSession(null)} 
        />
      )}

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <LoadingScreen 
            message="Generating your personalized quiz..."
            estimatedTime={displayedCachedQuestionCount >= 15 ? 10 : 40}
            showProgress={true}
          />
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <Auth onClose={() => setShowAuth(false)} />
      )}

      {/* Upgrade Modal (Simple placeholder - Task 9 will enhance this) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                Quiz Limit Reached
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {quizLimit?.reason}
              </p>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🏆 Upgrade to Founder Tier
                </h4>
                <ul className="text-sm text-left text-gray-700 dark:text-gray-300 space-y-2">
                  <li>✅ Unlimited quizzes</li>
                  <li>✅ Founder badge</li>
                  <li>✅ Lifetime pricing ($5/month)</li>
                  <li>✅ Support development</li>
                </ul>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    router.push('/pricing');
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
