import * as tar from 'tar';
import { Readable } from 'stream';

export interface GitHubFile {
  path: string;
  content: string;
  language: string;
  size: number;
  relevanceScore?: number;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  branch: string;
  files: GitHubFile[];
  languages: string[];
  totalFiles: number;
  primaryLanguage: string;
  combinedCode?: string;
  insights?: Record<string, unknown>;
  languagePercentages?: { [key: string]: number };
  languageCounts?: { [key: string]: number };
}

// In-memory cache for processed repositories
const repositoryCache = new Map<string, { data: RepositoryInfo; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  console.log('🔍 Step 1: Parsing GitHub URL:', url);
  
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
    /^([^\/]+)\/([^\/]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      // Try 'main' first, fallback to 'master' for older repos
      const branch = match[3] || 'main';
      
      console.log('✅ Parsed successfully:', { owner, repo, branch });
      return { owner, repo, branch };
    }
  }
  
  console.log('❌ Invalid GitHub URL');
  return null;
}

// Download repository as tarball (single API call)
export async function downloadRepositoryTarball(owner: string, repo: string, branch: string = 'main'): Promise<Buffer> {
  console.log('📦 Downloading tarball for', `${owner}/${repo}`, 'branch:', branch);
  
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${branch}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'RealCoder-AI'
  };
  
  // Add GitHub token if available for higher rate limits
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken && githubToken !== 'your_github_token_here') {
    headers['Authorization'] = `token ${githubToken}`;
  }
  
  const response = await fetch(tarballUrl, { 
    headers,
    // Add timeout for large repositories
    signal: AbortSignal.timeout(60000) // 60 second timeout
  });
  
  if (!response.ok) {
    console.error('❌ GitHub API error:', response.status, response.statusText);
    throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log('✅ Tarball downloaded:', buffer.length, 'bytes');
  
  if (buffer.length === 0) {
    throw new Error('Empty tarball received from GitHub');
  }
  
  // Check if repository is too large (over 50MB)
  if (buffer.length > 50 * 1024 * 1024) {
    console.warn('⚠️ Repository is very large:', Math.round(buffer.length / 1024 / 1024), 'MB');
    console.warn('⚠️ This may cause processing issues or timeouts');
  }
  
  return buffer;
}

// Extract and filter code files from tarball
export async function extractCodeFiles(buffer: Buffer, onFile?: (path: string) => void): Promise<GitHubFile[]> {
  return new Promise((resolve, reject) => {
    const files: GitHubFile[] = [];
    const stream = Readable.from(buffer);
    
    const parser = tar.list({
      onentry: (entry) => {
        const chunks: Buffer[] = [];
        
        entry.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        entry.on('end', () => {
          try {
            const content = Buffer.concat(chunks).toString('utf8');
            const filePath = entry.path;
            
            // Skip binary files and very large files
            if (content.length === 0 || content.length > 100000) {
              return;
            }
            
            // Skip non-code files
            if (!isCodeFile(filePath)) {
              return;
            }
            
            // Get language from file extension
            const extension = '.' + filePath.split('.').pop()?.toLowerCase();
            const language = getLanguageFromExtension(extension);
            
            // Calculate relevance score
            const relevanceScore = calculateRelevanceScore(filePath, content);
            
            files.push({
              path: filePath,
              content,
              language,
              size: content.length,
              relevanceScore
            });
            
            console.log('✅ Extracted:', filePath, `(${content.length} chars, score: ${relevanceScore})`);
            try { if (onFile) onFile(filePath); } catch {}
        } catch {
          console.warn('⚠️ Skipping binary file:', entry.path);
        }
        });
      }
    });
    
    stream.on('end', () => {
      console.log('📁 Successfully extracted', files.length, 'code files');
      resolve(files);
    });
    
    stream.on('error', reject);
    parser.on('error', reject);
    
    stream.pipe(parser);
  });
}

// Check if file is a code file
function isCodeFile(path: string): boolean {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.py', '.java', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
    '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs', '.vb',
    '.r', '.m', '.mm', '.pl', '.pm', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.sql',
    '.html', '.htm', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.toml',
    '.ini', '.cfg', '.md', '.txt', '.dockerfile', '.dockerignore', '.gitignore', '.gitattributes',
    '.editorconfig'
  ];
  
  const extension = '.' + path.split('.').pop()?.toLowerCase();
  return codeExtensions.includes(extension);
}

// Enhanced language detection from file extensions
function getLanguageFromExtension(extension: string): string {
  const languageMap: { [key: string]: string } = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.d.ts': 'typescript',
    '.py': 'python',
    '.pyx': 'python',
    '.pyi': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.c++': 'cpp',
    '.hpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.clj': 'clojure',
    '.hs': 'haskell',
    '.ml': 'ocaml',
    '.fs': 'fsharp',
    '.vb': 'vbnet',
    '.r': 'r',
    '.m': 'objective-c',
    '.mm': 'objective-c',
    '.pl': 'perl',
    '.pm': 'perl',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    '.ps1': 'powershell',
    '.psm1': 'powershell',
    '.sql': 'sql',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.md': 'markdown',
    '.txt': 'text',
    '.dockerfile': 'dockerfile',
    '.dockerignore': 'dockerignore',
    '.gitignore': 'gitignore',
    '.gitattributes': 'gitattributes',
    '.editorconfig': 'editorconfig'
  };
  
  return languageMap[extension.toLowerCase()] || 'unknown';
}

// Enhanced relevance scoring that's more fair to different languages
function calculateRelevanceScore(path: string, content: string): number {
  let score = 10; // Base score
  
  // Boost main files
  const mainFiles = ['index', 'main', 'app', 'server', 'client', 'startup', 'program'];
  if (mainFiles.some(name => path.toLowerCase().includes(name))) {
    score += 15;
  }
  
  // Boost by file type (more balanced scoring)
  if (path.endsWith('.ts') || path.endsWith('.tsx')) score += 10;
  if (path.endsWith('.js') || path.endsWith('.jsx')) score += 8;
  if (path.endsWith('.py')) score += 8;
  if (path.endsWith('.cs')) score += 12; // C# files are important
  if (path.endsWith('.java')) score += 10;
  if (path.endsWith('.cpp') || path.endsWith('.c')) score += 10;
  if (path.endsWith('.go')) score += 10;
  if (path.endsWith('.rs')) score += 10;
  if (path.endsWith('.php')) score += 8;
  if (path.endsWith('.rb')) score += 8;
  
  // Boost files in important directories
  const importantDirs = ['src', 'lib', 'app', 'core', 'engine', 'framework'];
  if (importantDirs.some(dir => path.toLowerCase().includes(`/${dir}/`))) {
    score += 5;
  }
  
  // Enhanced function/class counting for multiple languages
  const functionPatterns = [
    /function\s+\w+/g, // JavaScript functions
    /class\s+\w+/g, // Classes
    /def\s+\w+/g, // Python functions
    /public\s+\w+/g, /private\s+\w+/g, /protected\s+\w+/g, // C# methods
    /public\s+class\s+\w+/g, /private\s+class\s+\w+/g, // C# classes
    /func\s+\w+/g, // Go functions
    /fn\s+\w+/g, // Rust functions
    /public\s+function\s+\w+/g, /private\s+function\s+\w+/g, // PHP functions
    /public\s+class\s+\w+/g, /private\s+class\s+\w+/g, // PHP classes
    /def\s+\w+/g, // Ruby methods
    /module\s+\w+/g, // Ruby modules
  ];
  
  const functionCount = functionPatterns.reduce((count, pattern) => {
    return count + (content.match(pattern) || []).length;
  }, 0);
  
  score += Math.min(functionCount * 2, 20);
  
  // Penalize test files and configs
  if (path.includes('test') || path.includes('spec') || path.includes('config') || path.includes('__tests__')) {
    score -= 5;
  }
  
  // Penalize very small or very large files
  if (content.length < 100) score -= 10;
  if (content.length > 50000) score -= 5;
  
  return Math.max(score, 1);
}

// FIXED: Prepare repository data for quiz generation with proper language detection
export function prepareRepositoryForQuiz(files: GitHubFile[]): RepositoryInfo {
  console.log('📊 Preparing repository data for quiz generation');
  console.log('🔍 Analyzing ALL files for accurate language detection...');
  
  // STEP 1: Analyze ALL files for language detection (like GitHub does)
  const allLanguages = [...new Set(files.map(f => f.language).filter(l => l !== 'unknown'))];
  const allLanguageCounts = allLanguages.reduce((acc, lang) => {
    acc[lang] = files.filter(f => f.language === lang).length;
    return acc;
  }, {} as { [key: string]: number });
  
  const allLanguageBytes = allLanguages.reduce((acc, lang) => {
    acc[lang] = files.filter(f => f.language === lang).reduce((sum, f) => sum + f.size, 0);
    return acc;
  }, {} as { [key: string]: number });
  
  // Calculate percentages by bytes (like GitHub)
  const totalBytes = Object.values(allLanguageBytes).reduce((sum, bytes) => sum + bytes, 0);
  const languagePercentages = allLanguages.reduce((acc, lang) => {
    acc[lang] = totalBytes > 0 ? Math.round((allLanguageBytes[lang] / totalBytes) * 100) : 0;
    return acc;
  }, {} as { [key: string]: number });
  
  // Determine primary language (highest percentage)
  const primaryLanguage = Object.entries(languagePercentages)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'javascript';
  
  console.log('🎯 GitHub-style language analysis:', {
    totalFiles: files.length,
    allLanguages,
    allLanguageCounts,
    allLanguageBytes,
    languagePercentages,
    primaryLanguage
  });
  
  // STEP 2: Select top files for quiz generation (but keep language info from full analysis)
  const sortedFiles = files.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  const maxFiles = 100;
  const topFiles = sortedFiles.slice(0, maxFiles);
  
  console.log('📋 Selected top files for quiz generation:', {
    selectedFiles: topFiles.length,
    selectedLanguages: [...new Set(topFiles.map(f => f.language).filter(l => l !== 'unknown'))]
  });
  
  return {
    owner: '',
    repo: '',
    branch: '',
    files: topFiles, // Use top files for quiz generation
    languages: allLanguages, // But use ALL languages for detection
    totalFiles: files.length, // Total files in repository
    primaryLanguage, // Determined from ALL files
    languagePercentages, // Percentages from ALL files
    languageCounts: allLanguageCounts // Counts from ALL files
  };
}

// Main function with caching
export async function processGitHubRepositoryWithCache(url: string): Promise<RepositoryInfo> {
  const cacheKey = url.toLowerCase();
  
  // Check cache first
  const cached = repositoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('🎯 Cache hit! Returning cached repository data');
    return cached.data;
  }
  
  try {
    console.log('🚀 Starting repository processing for:', url);
    
    // Parse URL
    const repoInfo = parseGitHubUrl(url);
    if (!repoInfo) {
      throw new Error('Invalid GitHub URL');
    }
    
    console.log('📋 Parsed repository info:', repoInfo);
    
    // Download tarball (single API call!)
    console.log('📦 Downloading tarball...');
    const tarballBuffer = await downloadRepositoryTarball(repoInfo.owner, repoInfo.repo, repoInfo.branch);
    
    // Extract and filter code files
    console.log('🔍 Extracting code files...');
    const files = await extractCodeFiles(tarballBuffer);
    console.log('📁 Extracted', files.length, 'files');
    
    if (files.length === 0) {
      throw new Error('No code files found in repository');
    }
    
    // Prepare for quiz generation
    console.log('⚙️ Preparing repository for quiz generation...');
    const repositoryInfo = prepareRepositoryForQuiz(files);
    repositoryInfo.owner = repoInfo.owner;
    repositoryInfo.repo = repoInfo.repo;
    repositoryInfo.branch = repoInfo.branch || 'main';
    
    // Cache the result
    repositoryCache.set(cacheKey, {
      data: repositoryInfo,
      timestamp: Date.now()
    });
    
    console.log('🎉 Repository processing complete and cached!');
    console.log('📋 Summary:', {
      owner: repositoryInfo.owner,
      repo: repositoryInfo.repo,
      files: repositoryInfo.totalFiles,
      languages: repositoryInfo.languages,
      primaryLanguage: repositoryInfo.primaryLanguage
    });
    
    return repositoryInfo;
    
  } catch (error) {
    console.error('❌ Error processing repository:', error);
    throw error;
  }
}

// Clear old cache entries periodically
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of repositoryCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      repositoryCache.delete(key);
    }
  }
}

// Get cache statistics
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: repositoryCache.size,
    keys: Array.from(repositoryCache.keys())
  };
}
