// API Route: /api/processRepository
// Server-side GitHub repository processing with tarball download for scalability

import { NextRequest, NextResponse } from 'next/server';
import { FileProcessor, FileInfo } from '@/lib/fileProcessor';
import { 
  processGitHubRepositoryWithCache, 
  clearExpiredCache, 
  getCacheStats,
  parseGitHubUrl,
  downloadRepositoryTarball,
  extractCodeFiles,
  prepareRepositoryForQuiz
} from '@/lib/github-tarball-service';

// Increase timeout for large repositories
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    console.log('📡 /processRepository API called with URL:', url);
    const streamParam = request.nextUrl?.searchParams?.get('stream');
    
    // Clean up expired cache entries
    clearExpiredCache();
    
    // Log cache stats for monitoring
    const cacheStats = getCacheStats();
    console.log('💾 Cache stats:', cacheStats);

    if (streamParam === '1') {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          try {
            const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
            send({ type: 'meta', message: 'starting' });

            const info = parseGitHubUrl(url);
            if (!info) {
              send({ type: 'error', message: 'Invalid GitHub URL' });
              controller.close();
              return;
            }

            send({ type: 'stage', stage: 'downloading', repo: `${info.owner}/${info.repo}`, branch: info.branch });
            const tarball = await downloadRepositoryTarball(info.owner, info.repo, info.branch);
            send({ type: 'stage', stage: 'extracting' });

            const files = await extractCodeFiles(tarball, (path) => {
              try { send({ type: 'file', path }); } catch {}
            });
            send({ type: 'stage', stage: 'preparing', files: files.length });

            const repositoryInfo = prepareRepositoryForQuiz(files);
            repositoryInfo.owner = info.owner;
            repositoryInfo.repo = info.repo;
            repositoryInfo.branch = info.branch || 'main';

            send({ type: 'result', repositoryInfo: {
              owner: repositoryInfo.owner,
              repo: repositoryInfo.repo,
              branch: repositoryInfo.branch,
              files: repositoryInfo.files,
              languages: repositoryInfo.languages,
              totalFiles: repositoryInfo.totalFiles,
              primaryLanguage: repositoryInfo.primaryLanguage,
              languagePercentages: repositoryInfo.languagePercentages,
              languageCounts: repositoryInfo.languageCounts
            }});
            send({ type: 'done' });
          } catch (e) {
            send({ type: 'error', message: 'stream-failed' });
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Use the new tarball service for scalable processing (non-streaming)
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