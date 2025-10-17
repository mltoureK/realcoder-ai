import { NextRequest, NextResponse } from 'next/server';
import { getPrefetchKeyForRequest, scheduleQuizPrefetch } from '@/lib/quiz-prefetch';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, repositoryInfo, questionTypes, difficulty, numQuestions } = body ?? {};

    if (typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing code payload for prefetch' },
        { status: 400 }
      );
    }

    const prefetchKey = getPrefetchKeyForRequest(repositoryInfo ?? null, code);

    // Fire and forget prefetch; scheduleQuizPrefetch handles dedupe internally
    void scheduleQuizPrefetch({
      repositoryInfo,
      code,
      questionTypes,
      difficulty,
      numQuestions
    });

    return NextResponse.json({
      success: true,
      queued: true,
      key: prefetchKey
    });
  } catch (error) {
    console.error('❌ Error scheduling quiz prefetch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to schedule quiz prefetch' },
      { status: 500 }
    );
  }
}

