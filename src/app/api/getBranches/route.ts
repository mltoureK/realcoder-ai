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

    const response = await fetch(branchesUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
    }

    const branches = await response.json();
    
    // Extract branch names and mark default branch
    const branchList = branches.map((branch: any) => ({
      name: branch.name,
      isDefault: branch.name === branches.find((b: any) => b.protected)?.name || branch.name === 'main' || branch.name === 'master'
    }));

    // Sort: default first, then alphabetically
    branchList.sort((a: any, b: any) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('✅ Found branches:', branchList.map(b => b.name));

    return NextResponse.json({
      success: true,
      branches: branchList,
      defaultBranch: branchList.find(b => b.isDefault)?.name || 'main'
    });

  } catch (error) {
    console.error('❌ Error fetching branches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}
