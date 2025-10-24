'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import { generateQuizFromRepository } from '@/lib/quiz-service';
import QuizInterface from '@/components/QuizInterface';
import CuratedRepos from '@/components/CuratedRepos';
import Auth from '@/components/Auth';
import UserProfile from '@/components/UserProfile';
import { useAuth } from '@/context/AuthContext';
import { checkQuizLimit, incrementQuizCount } from '@/lib/user-management';
import { FiUpload, FiGithub, FiTarget } from 'react-icons/fi';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'github' | 'curated'>('curated');
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
        lives: 5,
        lastLifeRefill: new Date(),
        completed: true,
        repositoryInfo: {
          owner: githubRepo.owner,
          repo: githubRepo.repo,
          branch: selectedBranch || 'main'
        },
        isCached: true,
        isStreaming: false,
        expectedTotalQuestions: selectedQuestions.length
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
            lives: 5,
            lastLifeRefill: new Date(),
            completed: false,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: selectedBranch || 'main'
            },
            isCached: true,
            isStreaming: true, // Mark that we're still streaming new questions
            expectedTotalQuestions: cachedToUse.length
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
        const cachedMergeList = typeof window !== 'undefined' && Array.isArray((window as any).__cachedQuestionsToMerge)
          ? (window as any).__cachedQuestionsToMerge
          : null;

        const initialSession = {
          id: Date.now().toString(),
          title: 'Generated Quiz',
          questions: [] as any[],
          currentQuestionIndex: 0,
          score: 0,
          lives: 5,
          lastLifeRefill: new Date(),
          completed: false,
          repositoryInfo: {
            owner: githubRepo.owner,
            repo: githubRepo.repo,
            branch: selectedBranch || 'main'
          },
          isStreaming: true,
          expectedTotalQuestions: cachedMergeList?.length
        } as any;
        const mergingCachedQuestions = Boolean(cachedMergeList && cachedMergeList.length > 0);
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
                const cachedCount = (typeof window !== 'undefined' && Array.isArray((window as any).__cachedQuestionsToMerge))
                  ? (window as any).__cachedQuestionsToMerge.length
                  : 0;
                setQuizSession((prev: any) => {
                  if (!prev) return prev;
                  const totalExpected = typeof evt.expectedTotal === 'number'
                    ? evt.expectedTotal + cachedCount
                    : prev.expectedTotalQuestions;
                  return { ...prev, expectedTotalQuestions: totalExpected };
                });
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
          lives: 5,
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
    <div className="relative min-h-screen overflow-hidden bg-[#05040f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 right-[-140px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-160px] h-[380px] w-[380px] rounded-full bg-fuchsia-500/20 blur-[150px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,_rgba(34,211,238,0.12)_0%,_transparent_45%,_rgba(244,114,182,0.1)_80%)]" />
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-cyan-400/15 bg-black/40 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:h-20 sm:px-6">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold tracking-tight text-cyan-100 drop-shadow sm:text-2xl">
                RealCoder AI
              </h1>
              <span className="ml-2 rounded-full border border-cyan-400/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80 shadow-[0_0_14px_rgba(34,211,238,0.35)] sm:ml-3">
                Beta
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {loading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/60 border-t-transparent"></div>
              ) : user ? (
                <UserProfile />
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="rounded-full bg-cyan-500/90 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-black shadow-[0_0_18px_rgba(34,211,238,0.55)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_22px_rgba(34,211,238,0.7)] sm:text-base"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-cyan-400/20 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.45em] text-cyan-200/80 backdrop-blur">
              Learn by shipping
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
                Master real-world code, faster.
              </span>
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Generate quizzes from any repository, sharpen your intuition, and explore curated codebases, all inside a neon-powered workspace tuned for developers.
            </p>
          </div>

          {/* Input Card */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-black/60 p-5 shadow-[0_0_45px_rgba(56,189,248,0.15)] backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"></div>
            <div className="pointer-events-none absolute inset-y-4 left-0 w-px bg-cyan-400/10"></div>
            <div className="pointer-events-none absolute inset-y-4 right-0 w-px bg-cyan-400/10"></div>
            {/* Tab Navigation */}
            <div className="mb-6 grid grid-cols-3 gap-2 rounded-full border border-cyan-400/20 bg-white/5 p-1 backdrop-blur sm:mb-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center justify-center rounded-full px-2 py-2 text-[11px] font-medium uppercase tracking-wide transition-all sm:text-xs ${
                  activeTab === 'upload'
                    ? 'border border-cyan-300/60 bg-cyan-400/20 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.4)]'
                    : 'text-slate-400 hover:text-cyan-100'
                }`}
              >
                <FiUpload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Upload Files</span>
                <span className="sm:hidden">Upload</span>
              </button>
              <button
                onClick={() => setActiveTab('github')}
                className={`flex items-center justify-center rounded-full px-2 py-2 text-[11px] font-medium uppercase tracking-wide transition-all sm:text-xs ${
                  activeTab === 'github'
                    ? 'border border-cyan-300/60 bg-cyan-400/20 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.4)]'
                    : 'text-slate-400 hover:text-cyan-100'
                }`}
              >
                <FiGithub className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">GitHub Repo</span>
                <span className="sm:hidden">GitHub</span>
              </button>
              <button
                onClick={() => setActiveTab('curated')}
                className={`flex items-center justify-center rounded-full px-2 py-2 text-[11px] font-medium uppercase tracking-wide transition-all sm:text-xs ${
                  activeTab === 'curated'
                    ? 'border border-cyan-300/60 bg-cyan-400/20 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.4)]'
                    : 'text-slate-400 hover:text-cyan-100'
                }`}
              >
                <FiTarget className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Curated Repos</span>
                <span className="sm:hidden">Curated</span>
              </button>
            </div>

            {/* Controls Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
            </div>
          </div>

          {/* Upload Files Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                  Select Project Files
                </label>
                <div className="group relative overflow-hidden rounded-xl border border-cyan-400/30 bg-white/5 p-6 text-center transition-all hover:border-cyan-300/70 hover:shadow-[0_0_28px_rgba(34,211,238,0.35)] sm:p-8">
                  <div className="pointer-events-none absolute inset-2 rounded-lg border border-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
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
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10">
                        <svg className="h-7 w-7 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">
                          Drop files here or click to upload
                        </p>
                        <p className="text-sm text-slate-300/80">
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
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-200/90">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 backdrop-blur">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-500/15 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                            {file.name.split('.').pop()?.toUpperCase()}
                          </div>
                          <span className="text-sm text-white">{file.name}</span>
                        </div>
                        <span className="text-xs text-slate-400">
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
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => handleGitHubUrlChange(e.target.value)}
                  placeholder="e.g., https://github.com/facebook/react"
                  className={`w-full rounded-xl border bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-300/80 focus:border-cyan-300 ${
                    githubRepo.owner && githubRepo.repo 
                      ? 'border-emerald-400/60 shadow-[0_0_18px_rgba(16,185,129,0.35)] focus:ring-emerald-300/80'
                      : 'border-white/10 hover:border-cyan-200/40'
                  }`}
                />
                {githubRepo.owner && githubRepo.repo && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-emerald-300">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
                    <span>Repository found: {githubRepo.owner}/{githubRepo.repo}</span>
                  </div>
                )}
                {githubUrl && !githubRepo.owner && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-rose-300">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Invalid GitHub URL format</span>
                  </div>
                )}
              </div>

              {/* Branch Selector */}
              {githubRepo.owner && githubRepo.repo && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                    Select Branch
                  </label>
                  {isLoadingBranches ? (
                    <div className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                      <div className="flex items-center space-x-3 text-sm text-slate-300">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/70 border-t-transparent"></div>
                        <span>Loading branches...</span>
                      </div>
                    </div>
                  ) : availableBranches.length > 0 ? (
                    <select
                      value={selectedBranch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-300/80 focus:border-cyan-300"
                    >
                      {availableBranches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name} {branch.isDefault ? '(default)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-300">
                      No branches found
                    </div>
                  )}
                  {selectedBranch && (
                    <div className="mt-2 text-sm text-cyan-200">
                      Selected branch: <span className="font-mono text-cyan-100">{selectedBranch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Language Selection */}
              {availableLanguages.length > 0 && (
                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                    Select Programming Languages to Test
                  </label>
                  
                  {/* GitHub-style Language Bar */}
                  <div className="mb-4">
                    <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur">
                      {availableLanguages.map((language, index) => (
                        <div
                          key={language.name}
                          className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs text-slate-200 transition-colors hover:bg-cyan-400/10"
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
                          <span className="text-sm font-medium text-white truncate">
                            {language.name}
                          </span>
                          <span className="ml-2 text-[11px] text-cyan-100/70">
                            {language.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Language Checkboxes */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {availableLanguages.map((language) => (
                      <label key={language.name} className="flex cursor-pointer items-center space-x-3 rounded-xl border border-white/8 bg-white/5 p-3 text-sm transition-all duration-200 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-400/5 hover:shadow-[0_0_22px_rgba(56,189,248,0.25)]">
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
                          className="rounded border-white/20 text-cyan-300 focus:ring-cyan-300 focus:ring-offset-0 focus:ring-offset-transparent"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {language.name}
                          </div>
                          <div className="text-xs text-cyan-100/70">
                            {language.fileCount} files ({language.percentage}%)
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="text-slate-300">
                      {selectedLanguages.length > 0 ? (
                        <span className="text-emerald-300">
                          {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} selected
                        </span>
                      ) : (
                        <span className="text-rose-300">
                          No languages selected
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
                      className="font-semibold text-cyan-200 transition-colors hover:text-cyan-100"
                    >
                      {selectedLanguages.length === availableLanguages.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Trending Repositories */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70">Try trending repositories</p>
                  <button
                    onClick={loadTrendingRepos}
                    disabled={isLoadingTrending}
                    className="text-xs font-semibold text-cyan-200 transition-colors hover:text-cyan-100 disabled:opacity-40"
                  >
                    {isLoadingTrending ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {trendingRepos.length > 0 ? (
                  <div className="space-y-3">
                    {/* Popular Quick Access */}
                    <div>
                      <p className="mb-2 text-xs text-slate-300/80">Popular:</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {trendingRepos.slice(0, 6).map((repo) => (
                          <button
                            key={repo.url}
                            onClick={() => handleRepositorySelect(repo.url)}
                            className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-cyan-100 transition-colors hover:border-cyan-200/60 hover:bg-cyan-400/20"
                            title={repo.description}
                          >
                            {repo.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Categorized List */}
                    <div>
                      <p className="mb-2 text-xs text-slate-300/80">Browse by category:</p>
                      <div className="max-h-40 space-y-2 overflow-y-auto">
                        {['Frontend Framework', 'Backend Framework', 'Language', 'Build Tool'].map(category => {
                          const categoryRepos = trendingRepos.filter(repo => repo.category === category);
                          if (categoryRepos.length === 0) return null;
                          
                          return (
                            <div key={category} className="space-y-1">
                              <p className="text-xs font-medium text-cyan-200/80">{category}:</p>
                              <div className="flex flex-wrap gap-1 text-[11px]">
                                {categoryRepos.slice(0, 4).map(repo => (
                                  <button
                                    key={repo.url}
                                    onClick={() => handleRepositorySelect(repo.url)}
                                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-cyan-100 transition-colors hover:border-cyan-300/40 hover:bg-cyan-400/10"
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
                  <div className="flex flex-wrap gap-2 text-xs">
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
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-cyan-100 transition-colors hover:border-cyan-300/40 hover:bg-cyan-400/10"
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
            <div className="space-y-6 animate-fadeIn">
              <CuratedRepos onRepoSelect={handleRepositorySelect} />
            </div>
          )}

          {/* Quiz Limit Display (only for non-premium users) */}
          {user && quizLimit && !quizLimit.isPremium && (
            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-black/50 p-5 shadow-[0_0_30px_rgba(56,189,248,0.1)] backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {user.isAnonymous ? (
                    <>
                      <p className="text-sm font-semibold text-cyan-100">
                        {quizLimit.weeklyRemaining} quizzes remaining (anonymous)
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        Sign up to get 5 quizzes per week • Unlimited with premium
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-cyan-100">
                        {quizLimit.weeklyRemaining} quizzes remaining this week
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {quizLimit.monthlyRemaining} remaining this month • Resets {new Date(quizLimit.weekResetDate || Date.now()).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/70 to-cyan-400/80 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-black shadow-[0_0_24px_rgba(232,121,249,0.35)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(56,189,248,0.4)]"
                >
                  {user.isAnonymous ? 'Sign Up' : 'Upgrade'}
                </button>
              </div>
            </div>
          )}

          {/* Generate Quiz Button */}
          <div className="mt-10 border-t border-white/10 pt-8">
            {/* Time Estimate Warning for repos without cache */}
            {activeTab === 'github' && githubRepo.owner && githubRepo.repo && availableBranches.length > 0 && displayedCachedQuestionCount < 15 && (
              <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-black/60 p-5 shadow-[0_0_35px_rgba(56,189,248,0.15)] backdrop-blur">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                      Building Your Quiz
                    </h4>
                    <p className="mb-3 text-sm leading-relaxed text-slate-200">
                      {displayedCachedQuestionCount === 0
                        ? hidePassedQuestions && user && hiddenQuestionDelta > 0
                          ? 'No questions remain after filtering out the ones you already passed.'
                          : 'This repository is new to our system.'
                        : `This repository has ${displayedCachedQuestionCount} question${displayedCachedQuestionCount !== 1 ? 's' : ''} in our database.`}
                      We're creating fresh questions tailored to this codebase.
                    </p>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                        How you can help:
                      </p>
                      <ul className="ml-4 list-disc space-y-1 text-xs text-slate-200">
                        <li>Let the generation finish (perfect time for a coffee break!)</li>
                        <li>Rate questions after taking the quiz</li>
                        <li>Future quizzes will load instantly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateQuiz}
              disabled={!canGenerateQuiz() || isLoading}
              className="w-full rounded-full border border-cyan-400/30 bg-gradient-to-r from-cyan-500/80 via-sky-500/80 to-fuchsia-500/70 px-6 py-3 text-base font-semibold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_36px_rgba(244,114,182,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#05040f] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400 disabled:shadow-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/40 border-t-transparent"></div>
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
              <p className="text-xs text-center text-slate-400">
                Uses 1 life • Quiz will be generated based on your code
              </p>
              
              {/* Cache Status - Always show for GitHub repos after branch loads */}
              {activeTab === 'github' && githubRepo.owner && githubRepo.repo && availableBranches.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  {displayedCachedQuestionCount > 0 ? (
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 px-4 py-3 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <div className="text-sm font-semibold text-emerald-200">
                            {displayedCachedQuestionCount >= 50 ? '⚡ INSTANT QUIZ' : `${displayedCachedQuestionCount} Cached Questions`}
                          </div>
                          <div className="text-xs text-emerald-200/80">
                            {displayedCachedQuestionCount >= 50 
                              ? 'All questions from community (no loading!)' 
                              : displayedCachedQuestionCount >= 8
                              ? 'All cached + generating new ones to build cache'
                              : hiddenQuestionDelta > 0
                              ? 'You already passed those cached questions—new ones will stream in'
                              : `${Math.min(10, displayedCachedQuestionCount)} will load instantly`}
                          </div>
                          {hidePassedQuestions && user && hiddenQuestionDelta > 0 && (
                            <div className="text-[11px] text-emerald-200/70">
                              Hiding {hiddenQuestionDelta} passed question{hiddenQuestionDelta !== 1 ? 's' : ''} (from {cachedQuestionCountAll} total)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-3 text-xs text-slate-200">
                        <svg className="h-4 w-4 text-cyan-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>No cached questions yet - be the first to build the question bank!</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Hide Passed Questions Toggle - Only show for logged-in users */}
              {activeTab === 'github' && user && (
                <div className="mt-3 flex items-center justify-center">
                  <label className="flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/10">
                    <input
                      type="checkbox"
                      checked={hidePassedQuestions}
                      onChange={(e) => setHidePassedQuestions(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/60 text-cyan-300 focus:ring-cyan-300 focus:ring-offset-0"
                    />
                    <span>Hide questions I've already passed</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:mt-20 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-white/5 p-6 text-center shadow-[0_0_30px_rgba(56,189,248,0.12)] backdrop-blur">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-200">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Smart Questions</h3>
            <p className="text-sm text-slate-300">
              Questions crafted from your actual code patterns and logic.
            </p>
          </div>
          
          <div className="rounded-2xl border border-cyan-400/15 bg-white/5 p-6 text-center shadow-[0_0_30px_rgba(56,189,248,0.12)] backdrop-blur">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-200">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Learn by Doing</h3>
            <p className="text-sm text-slate-300">
              Practice with real-world code from popular repositories and your own projects.
            </p>
          </div>
          
          <div className="rounded-2xl border border-cyan-400/15 bg-white/5 p-6 text-center shadow-[0_0_30px_rgba(56,189,248,0.12)] backdrop-blur">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-200">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Track Progress</h3>
            <p className="text-sm text-slate-300">
              Monitor your learning progress and identify areas for improvement.
            </p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-400/20 bg-black/80 p-8 shadow-[0_0_45px_rgba(56,189,248,0.3)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_70%)]" />
            <div className="relative">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute right-4 top-4 text-cyan-200/70 transition-colors hover:text-cyan-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-fuchsia-500/40 via-cyan-400/30 to-transparent text-white shadow-[0_0_26px_rgba(244,114,182,0.4)]">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">Quiz Limit Reached</h3>
                <p className="mt-2 text-sm text-slate-300">{quizLimit?.reason}</p>

                <div className="mt-6 rounded-xl border border-cyan-400/20 bg-white/5 p-5 text-left">
                  <h4 className="mb-3 text-base font-semibold text-white">🏆 Unlock More Quizzes</h4>
                  <ul className="space-y-2 text-sm text-slate-200">
                    <li>✅ Increase your weekly quiz allowance</li>
                    <li>✅ Save and revisit quiz history</li>
                    <li>✅ Access premium curated repositories</li>
                    <li>✅ Priority question generation during peak hours</li>
                  </ul>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-cyan-300/40 hover:bg-cyan-400/10"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      router.push('/pricing');
                    }}
                    className="flex-1 rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/80 to-cyan-400/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-black shadow-[0_0_26px_rgba(244,114,182,0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(56,189,248,0.45)]"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
