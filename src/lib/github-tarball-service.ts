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
  
  const response = await fetch(tarballUrl, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log('✅ Tarball downloaded:', buffer.length, 'bytes');
  
  return buffer;
}

// Extract and filter code files from tarball
export async function extractCodeFiles(tarballBuffer: Buffer, targetLanguages: string[] = ['javascript', 'typescript', 'python', 'java']): Promise<GitHubFile[]> {
  console.log('📂 Extracting code files from tarball');
  
  const files: GitHubFile[] = [];
  const codeExtensions = getCodeExtensions(targetLanguages);
  
  return new Promise((resolve, reject) => {
    const stream = new Readable();
    stream.push(tarballBuffer);
    stream.push(null);
    
    const parser = tar.t({
      filter: (path: string) => {
        // Skip directories and non-code files
        if (path.endsWith('/')) return false;
        
        // Skip common non-code directories
        const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];
        if (skipDirs.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) {
          return false;
        }
        
        // Only include code files
        const extension = '.' + path.split('.').pop()?.toLowerCase();
        return codeExtensions.includes(extension);
      }
    });
    
    const extractedFiles: { path: string; content: Buffer }[] = [];
    
    parser.on('entry', (entry) => {
      const chunks: Buffer[] = [];
      
      entry.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      entry.on('end', () => {
        const content = Buffer.concat(chunks);
        // Remove the root directory prefix from path
        const cleanPath = entry.path.split('/').slice(1).join('/');
        if (cleanPath) {
          extractedFiles.push({ path: cleanPath, content });
        }
      });
    });
    
    parser.on('end', () => {
      // Process extracted files
      for (const file of extractedFiles) {
        try {
          const content = file.content.toString('utf-8');
          const extension = '.' + file.path.split('.').pop()?.toLowerCase();
          const language = getLanguageFromExtension(extension);
          
          // Calculate relevance score
          const relevanceScore = calculateRelevanceScore(file.path, content);
          
          files.push({
            path: file.path,
            content,
            language,
            size: content.length,
            relevanceScore
          });
          
          console.log('✅ Extracted:', file.path, `(${content.length} chars, score: ${relevanceScore})`);
      } catch {
        console.warn('⚠️ Skipping binary file:', file.path);
      }
      }
      
      console.log('📁 Successfully extracted', files.length, 'code files');
      resolve(files);
    });
    
    parser.on('error', reject);
    
    stream.pipe(parser);
  });
}

// Calculate relevance score for file prioritization
function calculateRelevanceScore(path: string, content: string): number {
  let score = 10; // Base score
  
  // Boost main files
  const mainFiles = ['index', 'main', 'app', 'server', 'client'];
  if (mainFiles.some(name => path.toLowerCase().includes(name))) {
    score += 15;
  }
  
  // Boost by file type
  if (path.endsWith('.ts') || path.endsWith('.tsx')) score += 10;
  if (path.endsWith('.js') || path.endsWith('.jsx')) score += 8;
  if (path.endsWith('.py')) score += 8;
  
  // Boost files with more functions/classes
  const functionCount = (content.match(/function\s+\w+|class\s+\w+|def\s+\w+/g) || []).length;
  score += Math.min(functionCount * 2, 20);
  
  // Penalize test files and configs
  if (path.includes('test') || path.includes('spec') || path.includes('config')) {
    score -= 5;
  }
  
  // Penalize very small or very large files
  if (content.length < 100) score -= 10;
  if (content.length > 50000) score -= 5;
  
  return Math.max(score, 1);
}

function getCodeExtensions(languages: string[]): string[] {
  const extensionMap: { [key: string]: string[] } = {
    javascript: ['.js', '.jsx', '.mjs'],
    typescript: ['.ts', '.tsx', '.d.ts'],
    python: ['.py', '.pyx', '.pyi'],
    java: ['.java'],
    cpp: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.h'],
    c: ['.c', '.h'],
    csharp: ['.cs'],
    php: ['.php'],
    ruby: ['.rb'],
    go: ['.go'],
    rust: ['.rs'],
    swift: ['.swift'],
    kotlin: ['.kt', '.kts']
  };
  
  const extensions = new Set<string>();
  
  for (const lang of languages) {
    const langExtensions = extensionMap[lang.toLowerCase()] || [];
    langExtensions.forEach(ext => extensions.add(ext));
  }
  
  // Always include common extensions if none specified
  if (extensions.size === 0) {
    ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'].forEach(ext => extensions.add(ext));
  }
  
  return Array.from(extensions);
}

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
    '.kts': 'kotlin'
  };
  
  return languageMap[extension] || 'unknown';
}

// Prepare repository data for quiz generation
export function prepareRepositoryForQuiz(files: GitHubFile[]): RepositoryInfo {
  console.log('📊 Preparing repository data for quiz generation');
  
  // Sort files by relevance score (highest first)
  const sortedFiles = files.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  
  // Take top files for processing (limit to avoid overwhelming AI)
  const maxFiles = 50;
  const topFiles = sortedFiles.slice(0, maxFiles);
  
  // Determine languages and primary language
  const languages = [...new Set(topFiles.map(f => f.language).filter(l => l !== 'unknown'))];
  const languageCounts = languages.reduce((acc, lang) => {
    acc[lang] = topFiles.filter(f => f.language === lang).length;
    return acc;
  }, {} as { [key: string]: number });
  
  const primaryLanguage = Object.entries(languageCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'javascript';
  
  console.log('📋 Repository analysis complete:', {
    totalFiles: topFiles.length,
    languages,
    primaryLanguage
  });
  
  return {
    owner: '',
    repo: '',
    branch: '',
    files: topFiles,
    languages,
    totalFiles: topFiles.length,
    primaryLanguage
  };
}

// Main function with caching
export async function processGitHubRepositoryWithCache(url: string): Promise<RepositoryInfo> {
  console.log('🚀 Starting GitHub repository processing with cache for:', url);
  
  // Check cache first
  const cacheKey = url.toLowerCase();
  const cached = repositoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('🎯 Cache hit! Returning cached repository data');
    return cached.data;
  }
  
  try {
    // Parse URL
    const repoInfo = parseGitHubUrl(url);
    if (!repoInfo) {
      throw new Error('Invalid GitHub URL');
    }
    
    // Download tarball (single API call!)
    const tarballBuffer = await downloadRepositoryTarball(repoInfo.owner, repoInfo.repo, repoInfo.branch);
    
    // Extract and filter code files
    const files = await extractCodeFiles(tarballBuffer);
    
    // Prepare for quiz generation
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

// Get cache stats for monitoring
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: repositoryCache.size,
    keys: Array.from(repositoryCache.keys())
  };
}
