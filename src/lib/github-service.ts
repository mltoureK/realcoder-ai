// GitHub Service - Step by step repository processing
// This handles the complete flow from GitHub URL to code extraction

export interface GitHubFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  branch: string;
  files: GitHubFile[];
  languages: string[];
  totalFiles: number;
}

// Step 1: Parse GitHub URL and extract repository info
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  console.log('🔍 Step 1: Parsing GitHub URL:', url);
  
  const githubUrlRegex = /github\.com\/([^\/\?#]+)\/([^\/\?#]+)/;
  const match = url.match(githubUrlRegex);
  
  if (match) {
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '').split('?')[0].split('#')[0];
    
    console.log('✅ Extracted:', { owner, repo: cleanRepo });
    return { owner, repo: cleanRepo };
  }
  
  console.log('❌ Invalid GitHub URL');
  return null;
}

// Step 2: Fetch repository tree (file structure)
export async function fetchRepositoryTree(owner: string, repo: string, branch: string = 'main'): Promise<any[]> {
  console.log('🌳 Step 2: Fetching repository tree for', `${owner}/${repo}`, 'branch:', branch);
  
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    console.log('📡 API Call:', apiUrl);
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken && githubToken !== 'your_github_token_here') {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📁 Found', data.tree.length, 'files in repository');
    
    return data.tree;
  } catch (error) {
    console.error('❌ Error fetching repository tree:', error);
    throw error;
  }
}

// Step 3: Filter files by programming language
export function filterCodeFiles(files: any[], targetLanguages: string[] = ['javascript', 'typescript', 'python', 'java']): any[] {
  console.log('🔍 Step 3: Filtering files by language:', targetLanguages);
  
  const codeExtensions: { [key: string]: string } = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust'
  };
  
  const codeFiles = files.filter(file => {
    if (file.type !== 'blob') return false;
    
    const extension = '.' + file.path.split('.').pop()?.toLowerCase();
    const language = codeExtensions[extension];
    
    return language && targetLanguages.includes(language);
  });
  
  console.log('✅ Found', codeFiles.length, 'code files');
  return codeFiles;
}

// Step 4: Fetch file contents
export async function fetchFileContents(owner: string, repo: string, files: any[]): Promise<GitHubFile[]> {
  console.log('📄 Step 4: Fetching file contents for', files.length, 'files');
  
  const fileContents: GitHubFile[] = [];
  
  for (const file of files) {
    try {
      console.log('📥 Fetching:', file.path);
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      // Add GitHub token if available
      const githubToken = process.env.GITHUB_TOKEN;
      if (githubToken && githubToken !== 'your_github_token_here') {
        headers['Authorization'] = `token ${githubToken}`;
      }
      
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`, { headers });
      
      if (!response.ok) {
        console.warn('⚠️ Skipping file due to API error:', file.path);
        continue;
      }
      
      const data = await response.json();
      const content = atob(data.content); // Decode base64 content
      
      const extension = '.' + file.path.split('.').pop()?.toLowerCase();
      const language = getLanguageFromExtension(extension);
      
      fileContents.push({
        path: file.path,
        content,
        language,
        size: file.size
      });
      
      console.log('✅ Fetched:', file.path, `(${content.length} chars)`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('❌ Error fetching file:', file.path, error);
    }
  }
  
  console.log('✅ Successfully fetched', fileContents.length, 'files');
  return fileContents;
}

// Step 5: Analyze repository and prepare for quiz generation
export function prepareRepositoryForQuiz(files: GitHubFile[]): RepositoryInfo {
  console.log('📊 Step 5: Preparing repository data for quiz generation');
  
  const languages = [...new Set(files.map(file => file.language))];
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  console.log('📈 Repository Analysis:');
  console.log('  - Total files:', files.length);
  console.log('  - Languages:', languages);
  console.log('  - Total size:', totalSize, 'bytes');
  
  // Group files by language for better quiz generation
  const filesByLanguage = files.reduce((acc, file) => {
    if (!acc[file.language]) {
      acc[file.language] = [];
    }
    acc[file.language].push(file);
    return acc;
  }, {} as { [key: string]: GitHubFile[] });
  
  console.log('📁 Files by language:');
  Object.entries(filesByLanguage).forEach(([lang, files]) => {
    console.log(`  - ${lang}: ${files.length} files`);
  });
  
  return {
    owner: '', // Will be set by caller
    repo: '', // Will be set by caller
    branch: 'main',
    files,
    languages,
    totalFiles: files.length
  };
}

// Helper function to get language from file extension
function getLanguageFromExtension(extension: string): string {
  const languageMap: { [key: string]: string } = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust'
  };
  
  return languageMap[extension] || 'unknown';
}

// Main function that orchestrates the entire process
export async function processGitHubRepository(url: string): Promise<RepositoryInfo> {
  console.log('🚀 Starting GitHub repository processing for:', url);
  
  // Step 1: Parse URL
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    throw new Error('Invalid GitHub URL');
  }
  
  // Step 2: Fetch repository tree
  const tree = await fetchRepositoryTree(repoInfo.owner, repoInfo.repo);
  
  // Step 3: Filter code files
  const codeFiles = filterCodeFiles(tree);
  
  // Step 4: Fetch file contents
  const fileContents = await fetchFileContents(repoInfo.owner, repoInfo.repo, codeFiles);
  
  // Step 5: Prepare for quiz generation
  const repositoryInfo = prepareRepositoryForQuiz(fileContents);
  repositoryInfo.owner = repoInfo.owner;
  repositoryInfo.repo = repoInfo.repo;
  
  console.log('🎉 Repository processing complete!');
  console.log('📋 Summary:', {
    owner: repositoryInfo.owner,
    repo: repositoryInfo.repo,
    files: repositoryInfo.totalFiles,
    languages: repositoryInfo.languages
  });
  
  return repositoryInfo;
}
