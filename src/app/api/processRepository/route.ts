// API Route: /api/processRepository
// Server-side GitHub repository processing with tarball download for scalability

import { NextRequest, NextResponse } from 'next/server';
import { FileProcessor, FileInfo } from '@/lib/fileProcessor';
import { processGitHubRepositoryWithCache, clearExpiredCache, getCacheStats } from '@/lib/github-tarball-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    console.log('📡 /processRepository API called with URL:', url);
    
    // Clean up expired cache entries
    clearExpiredCache();
    
    // Log cache stats for monitoring
    const cacheStats = getCacheStats();
    console.log('💾 Cache stats:', cacheStats);

    // Use the new tarball service for scalable processing
    const repositoryInfo = await processGitHubRepositoryWithCache(url);
    
    // Convert to the format expected by the file processor
    const fileContents: FileInfo[] = repositoryInfo.files.map(file => ({
      path: file.path,
      content: file.content,
      language: file.language,
      size: file.size,
      relevanceScore: file.relevanceScore || 10
    }));
    
    const primaryLanguage = repositoryInfo.primaryLanguage;
    
    console.log('🎯 Repository processed via tarball:', {
      owner: repositoryInfo.owner,
      repo: repositoryInfo.repo,
      files: fileContents.length,
      primaryLanguage
    });

    // Create FileProcessor instance and combine file contents
    const fileProcessor = new FileProcessor();
    const combinedCode = fileProcessor.combineFileContents(fileContents);
    
    // Generate insights
    const insights = {
      totalLines: fileContents.reduce((sum, f) => sum + f.content.split('\n').length, 0),
      avgFileSize: Math.round(fileContents.reduce((sum, f) => sum + f.size, 0) / fileContents.length),
      topFiles: fileContents.slice(0, 5).map(f => ({ path: f.path, score: f.relevanceScore })),
      cacheHit: getCacheStats().keys.includes(url.toLowerCase()),
      processingMethod: 'tarball'
    };
    
    console.log('🎉 Repository processing complete!');

    return NextResponse.json({
      success: true,
      repositoryInfo: {
        owner: repositoryInfo.owner,
        repo: repositoryInfo.repo,
        branch: repositoryInfo.branch,
        files: fileContents,
        languages: repositoryInfo.languages,
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