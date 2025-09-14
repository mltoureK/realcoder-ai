'use client';

import { useState } from 'react';
import { generateQuizFromRepository } from '@/lib/quiz-service';
import QuizInterface from '@/components/QuizInterface';
import StreamingQuizGenerator from '@/components/StreamingQuizGenerator';

interface GitHubRepo {
  owner: string;
  repo: string;
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [githubRepo, setGithubRepo] = useState<GitHubRepo>({ owner: '', repo: '' });
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<Array<{name: string, isDefault: boolean}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'github'>('upload');
  const [quizSession, setQuizSession] = useState<any>(null);
  const [streamingQuiz, setStreamingQuiz] = useState<{
    code: string;
    questionTypes: string[];
    difficulty: string;
    numQuestions: number;
  } | null>(null);

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
      } else {
        console.error('❌ Failed to fetch branches:', data.error);
        setAvailableBranches([]);
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      setAvailableBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Starting quiz generation process...');
      
      if (activeTab === 'github' && githubUrl) {
        console.log('📁 Processing GitHub repository:', githubUrl);
        
        // Step 1: Call the new server-side API route for GitHub processing
        const repoResponse = await fetch('/api/processRepository', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: selectedBranch ? `${githubUrl}/tree/${selectedBranch}` : githubUrl 
          })
        });
        
        console.log('📡 Repository API response status:', repoResponse.status);
        
        if (!repoResponse.ok) {
          const errorText = await repoResponse.text();
          console.error('❌ Repository API error:', errorText);
          throw new Error(`Failed to process repository: ${repoResponse.status}`);
        }
        
        const repoData = await repoResponse.json();
        console.log('📊 Repository data received:', repoData);
        
        if (!repoData.success) {
          throw new Error(repoData.error || 'Repository processing failed');
        }
        
        console.log('✅ Repository processed successfully');
        
        // Step 2: Stream from /generateQuiz
        const combinedCode = repoData.repositoryInfo.files.map((file: any) => 
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
            questionTypes: ['function-variant', 'multiple-choice'/*, 'fill-blank'*/],
            difficulty: 'medium',
            numQuestions: 15
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
          completed: false
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
            questionTypes: ['function-variant', 'multiple-choice'/*, 'fill-blank'*/],
            difficulty: 'medium',
            numQuestions: 10
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
          completed: false
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
    }
  };

  const canGenerateQuiz = () => {
    if (activeTab === 'upload') {
      return selectedFiles.length > 0;
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
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Lives:</span>
                <div className="flex space-x-1">
                  {[1, 2, 3].map((life) => (
                    <div key={life} className="w-4 h-4 bg-red-500 rounded-full"></div>
                  ))}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Refills in 6h 23m</span>
              </div>
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
                      onChange={(e) => setSelectedBranch(e.target.value)}
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
              
              {/* Example Repos */}
                              <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try these popular repositories:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'https://github.com/facebook/react',
                      'https://github.com/microsoft/TypeScript',
                      'https://github.com/nodejs/node',
                      'https://github.com/vercel/next.js'
                    ].map((url) => (
                      <button
                        key={url}
                        onClick={() => setGithubUrl(url)}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {url.replace('https://github.com/', '')}
                      </button>
                    ))}
                  </div>
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
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              Uses 1 life • Quiz will be generated based on your code
            </p>
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
    </div>
  );
}
