'use client';

import { useState, useEffect } from 'react';
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
  const [cachedQuestionCount, setCachedQuestionCount] = useState<number>(0);
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

  // Refresh cached question count when hidePassedQuestions toggle changes
  useEffect(() => {
    if (githubRepo.owner && githubRepo.repo && user) {
      const refreshCacheCount = async () => {
        try {
          const repoUrl = `https://github.com/${githubRepo.owner}/${githubRepo.repo}`;
          const { getCachedQuestions } = await import('@/lib/quiz-history');
          const cached = await getCachedQuestions(repoUrl, 50, hidePassedQuestions ? user.uid : undefined);
          setCachedQuestionCount(cached.length);
          console.log(`🔄 Cache count refreshed: ${cached.length} questions (hidePassed: ${hidePassedQuestions})`);
        } catch (error) {
          console.error('Error refreshing cache count:', error);
        }
      };
      
      refreshCacheCount();
    }
  }, [hidePassedQuestions, githubRepo.owner, githubRepo.repo, user]);

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
    setAvailableBranches([]);
    setSelectedBranch('');
    setAvailableLanguages([]);
    setSelectedLanguages([]);
    setRepositoryFiles([]);
    
    // Switch to GitHub tab when selecting from curated repos
    setActiveTab('github');
    
    // Force trigger the GitHub URL change handler
    await handleGitHubUrlChange(url);
  };

  // Process repository and detect languages
  const processRepository = async (url: string) => {
    try {
      console.log('🔍 Processing repository for language detection:', url);
      
      const repoResponse = await fetch('/api/processRepository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      if (!repoResponse.ok) {
        throw new Error(`Failed to process repository: ${repoResponse.status}`);
      }
      
      const repoData = await repoResponse.json();
      
      if (!repoData.success) {
        throw new Error(repoData.error || 'Repository processing failed');
      }
      
      console.log('✅ Repository processed successfully');
      console.log('📁 Files received from API:', repoData.repositoryInfo.files?.length || 0);
      
      // Store repository files for later use
      setRepositoryFiles(repoData.repositoryInfo.files || []);
      
      // Use language data from backend (GitHub-style analysis)
      if (repoData.repositoryInfo.languagePercentages && repoData.repositoryInfo.languageCounts) {
        const detectedLanguages = Object.entries(repoData.repositoryInfo.languagePercentages)
          .map(([language, percentage]) => ({
            name: language,
            percentage: percentage as number,
            fileCount: (repoData.repositoryInfo.languageCounts as { [key: string]: number })[language] || 0
          }))
          .sort((a, b) => (b.percentage as number) - (a.percentage as number));        
        setAvailableLanguages(detectedLanguages);
        setSelectedLanguages(detectedLanguages.map(lang => lang.name)); // Default to all languages
        
        console.log("🎯 Using backend language analysis:", detectedLanguages);
      } else {
        // Fallback to local detection if backend data not available
        const detectedLanguages = detectLanguagesFromFiles(repoData.repositoryInfo.files);
        setAvailableLanguages(detectedLanguages);
        setSelectedLanguages(detectedLanguages.map(lang => lang.name));
        
        console.log("🔍 Fallback to local language detection:", detectedLanguages);
      }      
      return repoData;
    } catch (error) {
      console.error('❌ Error processing repository:', error);
      throw error;
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
      '.conf': 'Config'
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleGitHubUrlChange = async (url: string) => {
    setGithubUrl(url);
    setAvailableBranches([]);
    setSelectedBranch('');
    
    // Extract owner and repo from any GitHub URL format using regex
    // Handles: github.com/owner/repo, github.com/owner/repo/tree/main, github.com/owner/repo/blob/main/file.js, etc.
    const githubUrlRegex = /github\.com\/([^\/\?#]+)\/([^\/\?#]+)/;
    const match = url.match(githubUrlRegex);
    
    if (match) {
      const [, owner, repo] = match;
      // Remove .git suffix if present and clean up any trailing slashes or query params
      const cleanRepo = repo.replace(/\.git$/, '').split('?')[0].split('#')[0];
      setGithubRepo({ owner, repo: cleanRepo });
      
      // Fetch available branches
      await fetchBranches(url);
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
        const { getCachedQuestions } = await import('@/lib/quiz-history');
        const cached = await getCachedQuestions(repoUrl, 50, hidePassedQuestions ? user?.uid : undefined);
        setCachedQuestionCount(cached.length);
        console.log(`📦 Cache status: ${cached.length} questions available for ${repoUrl}`);
        
        // If we have enough cached questions, show them immediately
        if (cached.length >= 15) {
          console.log('⚡ Showing cached questions immediately (15+ available)');
          const shuffled = cached.sort(() => Math.random() - 0.5);
          const selectedQuestions = shuffled.slice(0, 15).map((q) => ({
            ...q,
            isCached: true
          }));
          
          const cachedSession = {
            id: Date.now().toString(),
            title: 'Community Reviewed Quiz',
            questions: selectedQuestions,
            currentQuestionIndex: 0,
            score: 0,
            lives: 3,
            lastLifeRefill: new Date(),
            completed: false,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: data.defaultBranch || 'main'
            },
            isCached: true
          };
          
          setQuizSession(cachedSession);
          setIsLoading(false);
          setShowLoadingOverlay(false);
          return; // Skip repository processing
        }
        
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
        
        // CACHE CHECK: Try to load cached questions first
        const repoUrl = `https://github.com/${githubRepo.owner}/${githubRepo.repo}`;
        console.log('🔍 Checking for cached questions for:', repoUrl);
        
        const { getCachedQuestions } = await import('@/lib/quiz-history');
        const cachedQuestions = await getCachedQuestions(repoUrl, 50, hidePassedQuestions ? user?.uid : undefined);
        
        setCachedQuestionCount(cachedQuestions.length); // Update state for UI display
        
        console.log(`📦 Found ${cachedQuestions.length} cached questions for ${repoUrl}`);
        if (cachedQuestions.length > 0) {
          console.log('📋 First cached question:', cachedQuestions[0]);
        }
        
        // STRATEGY: If ≥50 cached, use only cached. If <50, use up to 10 cached + generate rest
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
            completed: false,
            repositoryInfo: {
              owner: githubRepo.owner,
              repo: githubRepo.repo,
              branch: selectedBranch || 'main'
            },
            isCached: true
          };
          
          setQuizSession(cachedSession);
          setIsLoading(false);
          setShowLoadingOverlay(false);
          return; // Skip API generation
        } else if (cachedQuestions.length > 0 && cachedQuestions.length < 50) {
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
        
        // Use stored repository files and filter by selected languages
        const filteredFiles = repositoryFiles.filter((file: any) => {
          if (selectedLanguages.length === 0) return true; // If no languages selected, include all
          
          const ext = file.path.split('.').pop()?.toLowerCase();
          const languageMap: { [key: string]: string } = {
            '.cs': 'C#', '.js': 'JavaScript', '.ts': 'TypeScript', '.jsx': 'JavaScript', '.tsx': 'TypeScript',
            '.py': 'Python', '.java': 'Java', '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++', '.c': 'C', '.h': 'C',
            '.go': 'Go', '.rs': 'Rust', '.php': 'PHP', '.rb': 'Ruby', '.swift': 'Swift', '.kt': 'Kotlin'
          };
          
          const fileLanguage = languageMap[`.${ext}`];
          return fileLanguage && selectedLanguages.includes(fileLanguage);
        });
        
        console.log(`📊 Filtered ${filteredFiles.length} files for selected languages:`, selectedLanguages);
        
        // Generate quiz from filtered files
        const combinedCode = filteredFiles.map((file: any) => 
          `// ${file.path}\n${file.content}`
        ).join('\n\n');
        
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
        setQuizSession(initialSession);
        
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
                  const updated = { ...prev, questions: [...prev.questions, evt.question] };
                  console.log('🔄 Updated quiz session with', updated.questions.length, 'questions');
                  return updated;
                });
              } else if (evt.type === 'done') {
                console.log('✅ Stream done:', evt.count);
                
                // Merge cached questions if any
                const cachedToMerge = (window as any).__cachedQuestionsToMerge;
                if (cachedToMerge && cachedToMerge.length > 0) {
                  console.log(`🔄 Merging ${cachedToMerge.length} cached questions with generated ones`);
                  setQuizSession((prev: any) => {
                    if (!prev) return prev;
                    // Cached questions FIRST, then new ones
                    const allQuestions = [...cachedToMerge, ...prev.questions];
                    const finalQuestions = allQuestions.slice(0, 15);
                    
                    console.log('✅ Final quiz composition:', {
                      total: finalQuestions.length,
                      cached: finalQuestions.filter(q => q.isCached).length,
                      new: finalQuestions.filter(q => !q.isCached).length,
                      order: finalQuestions.map((q, i) => `Q${i+1}: ${q.isCached ? 'CACHED' : 'NEW'}`)
                    });
                    
                    return {
                      ...prev,
                      questions: finalQuestions, // Cached first, then new
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
        setQuizSession(initialSession);
        
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
                  const updated = { ...prev, questions: [...prev.questions, evt.question] };
                  console.log('🔄 Updated quiz session with', updated.questions.length, 'questions');
                  return updated;
                });
              } else if (evt.type === 'done') {
                console.log('✅ Stream done:', evt.count);
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
      return githubRepo.owner && githubRepo.repo && selectedBranch;
    } else {
      return githubRepo.owner && githubRepo.repo && selectedBranch;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                RealCoder AI
              </h1>
              <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                Beta
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
              ) : user ? (
                <UserProfile />
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Learn from Real Code
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload your project files or connect a GitHub repository to generate personalized quizzes and test your coding knowledge.
          </p>
        </div>

        {/* Founder Counter - Above the fold */}
        <FounderCounter />

        {/* Input Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📁 Upload Files
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'github'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🐙 GitHub Repo
            </button>
            <button
              onClick={() => setActiveTab('curated')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'curated'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🎯 Curated Repos
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {quizLimit.weeklyRemaining} quizzes remaining this week
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {quizLimit.monthlyRemaining} remaining this month • Resets {new Date(quizLimit.weekResetDate || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Upgrade
                </button>
              </div>
            </div>
          )}

          {/* Generate Quiz Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                  {cachedQuestionCount > 0 ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <div className="text-sm font-bold text-green-800 dark:text-green-200">
                            {cachedQuestionCount >= 50 ? '⚡ INSTANT QUIZ' : `${cachedQuestionCount} Cached Questions`}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            {cachedQuestionCount >= 50 
                              ? 'All questions from community (no loading!)' 
                              : `${Math.min(10, cachedQuestionCount)} will load instantly`}
                          </div>
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
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <LoadingScreen />
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
