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

    // Fetch repository tree
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/main?recursive=1`;
    console.log('�� GitHub API Call:', apiUrl);
    
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
    
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      console.error('❌ GitHub API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `GitHub API error: ${response.status} - ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
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
        branch: 'main',
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
