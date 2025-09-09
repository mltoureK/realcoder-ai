// API Route: /api/processRepository
// Server-side GitHub repository processing with environment variable access

import { NextRequest, NextResponse } from 'next/server';
import { FileProcessor, FileInfo } from '@/lib/fileProcessor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    console.log('�� /processRepository API called with URL:', url);

    // Parse GitHub URL
    const githubUrlRegex = /github\.com\/([^\/\?#]+)\/([^\/\?#]+)/;
    const match = url.match(githubUrlRegex);
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub URL' },
        { status: 400 }
      );
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '').split('?')[0].split('#')[0];

    console.log('✅ Extracted:', { owner, repo: cleanRepo });

    // Determine a valid branch: try repo default branch, then main/master, then any branch
    const repoMetaUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
    let chosenBranch = 'main';

    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    // Add GitHub token if available
    
    const githubToken = process.env.GITHUB_TOKEN;
    console.log('🔍 Debug - GITHUB_TOKEN value:', githubToken ? `${githubToken.substring(0, 10)}...` : 'undefined');
    console.log('🔍 Debug - GITHUB_TOKEN length:', githubToken ? githubToken.length : 0);
    
    if (githubToken && githubToken !== 'your_github_token_here' && githubToken.length > 10) {
      headers['Authorization'] = `token ${githubToken}`;
      console.log(' Using GitHub token');
    } else {
      console.log('⚠️ No GitHub token found, using unauthenticated requests');
      console.log('🔍 Debug - Token check failed because:', {
        exists: !!githubToken,
        isPlaceholder: githubToken === 'your_github_token_here',
        tooShort: githubToken && githubToken.length <= 10
      });
    }
    
    // 1) Try default branch from repo metadata
    try {
      const metaRes = await fetch(repoMetaUrl, { headers });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta && meta.default_branch) chosenBranch = meta.default_branch;
      }
    } catch {}

    async function fetchTreeForBranch(branch: string): Promise<any | null> {
      const url = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${branch}?recursive=1`;
      console.log('�� GitHub API Call:', url);
      try {
        const res = await fetch(url, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.tree)) return json;
        } else {
          console.warn('⚠️ Tree fetch failed for branch', branch, res.status, res.statusText);
        }
      } catch (e) {
        console.warn('⚠️ Error fetching tree for branch', branch, e);
      }
      return null;
    }

    // Try chosen default branch
    let data = await fetchTreeForBranch(chosenBranch);
    // Then try main/master fallbacks if needed
    if (!data && chosenBranch !== 'main') data = await fetchTreeForBranch('main');
    if (!data && chosenBranch !== 'master') data = await fetchTreeForBranch('master');
    // Then try any branch from list
    if (!data) {
      try {
        const branchesRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/branches`, { headers });
        if (branchesRes.ok) {
          const branches = await branchesRes.json();
          if (Array.isArray(branches) && branches.length > 0) {
            for (const b of branches) {
              const tree = await fetchTreeForBranch(b.name || b.branch || '');
              if (tree) { data = tree; chosenBranch = b.name || b.branch || chosenBranch; break; }
            }
          }
        }
      } catch {}
    }

    if (!data) {
      console.error('❌ GitHub API error: could not obtain repo tree from any branch');
      return NextResponse.json(
        { success: false, error: 'GitHub API error: failed to fetch repository tree from any branch' },
        { status: 502 }
      );
    }
    console.log('📁 Found', data.tree.length, 'files in repository');

    // Use the improved FileProcessor
    const fileProcessor = new FileProcessor();
    
    // Get repository insights
    const insights = fileProcessor.getRepositoryInsights(data.tree);
    console.log(`📊 Repository Insights:`, insights);
    
    // Filter and select relevant files using the enhanced logic
    const relevantFiles = fileProcessor.selectRelevantFiles(data.tree);
    console.log(`🎯 Selected ${relevantFiles.length} most relevant files for processing`);

    // Detect primary language
    const primaryLanguage = fileProcessor.detectPrimaryLanguage(relevantFiles);
    console.log(`🔍 Detected primary language: ${primaryLanguage}`);

    // Fetch file contents
    const fileContents: FileInfo[] = [];

    for (const file of relevantFiles) {
      try {
        console.log(`📥 Fetching: ${file.path} (score: ${file.relevanceScore})`);
        
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/blobs/${file.sha}`, { headers });
        
        if (!fileResponse.ok) {
          console.warn('⚠️ Skipping file due to API error:', file.path);
          continue;
        }
        
        const fileData = await fileResponse.json();
        const content = atob(fileData.content); // Decode base64 content
        
        const extension = '.' + file.path.split('.').pop()?.toLowerCase();
        const language = fileProcessor.getLanguageExtensions(primaryLanguage).includes(extension) ? primaryLanguage : 'unknown';
        
        fileContents.push({
          path: file.path,
          content,
          language,
          size: file.size,
          relevanceScore: file.relevanceScore
        });
        
        console.log(`✅ Fetched: ${file.path} (${content.length} chars, score: ${file.relevanceScore})`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('❌ Error fetching file:', file.path, error);
      }
    }

    // Combine file contents using the enhanced processor
    const combinedCode = fileProcessor.combineFileContents(fileContents);
    
    console.log('🎉 Repository processing complete!');

    return NextResponse.json({
      success: true,
      repositoryInfo: {
        owner,
        repo: cleanRepo,
        branch: chosenBranch,
        files: fileContents,
        languages: [...new Set(fileContents.map(f => f.language))],
        totalFiles: fileContents.length,
        primaryLanguage,
        combinedCode,
        insights
      }
    });

  } catch (error) {
    console.error('❌ Error in /processRepository:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process repository' },
      { status: 500 }
    );
  }
}
