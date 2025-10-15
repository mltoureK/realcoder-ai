import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    console.log('🔍 Getting branches for URL:', url);

    // Parse the GitHub URL
    const urlPattern = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/;
    const match = url.match(urlPattern);
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub URL' },
        { status: 400 }
      );
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    // Fetch branches from GitHub API
    const branchesUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/branches`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RealCoder-AI'
    };
    
    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken && githubToken !== 'your_github_token_here') {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds
    
    let response;
    let lastError;
    
    try {
      // Retry up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Branch fetch attempt ${attempt}/3`);
          response = await fetch(branchesUrl, { 
            headers,
            signal: controller.signal,
            // Add some additional fetch options for reliability
            cache: 'no-cache',
            redirect: 'follow'
          });
          if (response.ok) {
            break;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Branch fetch attempt ${attempt} failed:`, error);
          if (attempt === 3) {
            throw error;
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
    }

    const branches = await response.json();
    
    // Get repository info to find the actual default branch
    const repoUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
    let defaultBranchName = 'main'; // fallback
    
    try {
      const repoController = new AbortController();
      const repoTimeoutId = setTimeout(() => repoController.abort(), 10000); // 10 seconds for repo info
      
      try {
        const repoResponse = await fetch(repoUrl, { 
          headers,
          signal: repoController.signal,
          cache: 'no-cache'
        });
        
        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          defaultBranchName = repoData.default_branch || 'main';
          console.log('🔍 Repository default branch from API:', defaultBranchName);
        } else {
          console.warn('⚠️ Failed to get repository info, using fallback branch');
        }
      } finally {
        clearTimeout(repoTimeoutId);
      }
    } catch (error) {
      console.warn('⚠️ Error getting repository info, using fallback branch:', error);
    }
    
    // Extract branch names and mark default branch
    const branchList = branches.map((branch: any) => ({
      name: branch.name,
      isDefault: branch.name === defaultBranchName
    }));

    // Sort: default first, then alphabetically
    branchList.sort((a: any, b: any) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('✅ Found branches:', branchList.map(b => b.name));

    console.log('🎯 Returning default branch:', defaultBranchName);
    
    return NextResponse.json({
      success: true,
      branches: branchList,
      defaultBranch: defaultBranchName
    });

  } catch (error) {
    console.error('❌ Error fetching branches:', error);
    
    // Return fallback branches if API call fails
    const fallbackBranches = [
      { name: 'main', isDefault: true },
      { name: 'master', isDefault: false },
      { name: 'develop', isDefault: false },
      { name: 'dev', isDefault: false }
    ];
    
    console.log('🔄 Returning fallback branches due to API failure');
    
    return NextResponse.json({
      success: true,
      branches: fallbackBranches,
      defaultBranch: 'main',
      fallback: true,
      error: 'API timeout - using common branch names'
    });
  }
}
