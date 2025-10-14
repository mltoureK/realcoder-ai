import { NextRequest, NextResponse } from 'next/server';
import { doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Starting account deletion for user:', userId);

    // Start a batch to delete all user-related data
    const batch = writeBatch(db);

    // Delete user document
    const userRef = doc(db, 'users', userId);
    batch.delete(userRef);

    // Delete user's quiz history
    const quizHistoryQuery = query(
      collection(db, 'quizHistory'),
      where('userId', '==', userId)
    );
    const quizHistorySnapshot = await getDocs(quizHistoryQuery);
    quizHistorySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's question ratings
    const questionRatingsQuery = query(
      collection(db, 'questionRatings'),
      where('userId', '==', userId)
    );
    const questionRatingsSnapshot = await getDocs(questionRatingsQuery);
    questionRatingsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's cached questions (if any are user-specific)
    // Note: We might want to keep community questions, so we'll be selective here
    const cachedQuestionsQuery = query(
      collection(db, 'questions'),
      where('createdBy', '==', userId)
    );
    const cachedQuestionsSnapshot = await getDocs(cachedQuestionsQuery);
    cachedQuestionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit the batch deletion
    await batch.commit();

    console.log('✅ Account deletion completed:', {
      userId,
      deletedQuizHistory: quizHistorySnapshot.size,
      deletedQuestionRatings: questionRatingsSnapshot.size,
      deletedCachedQuestions: cachedQuestionsSnapshot.size
    });

    // Note: Firebase Auth user deletion should be handled on the client side
    // as it requires the user to be authenticated

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data deleted successfully',
      deletedRecords: {
        quizHistory: quizHistorySnapshot.size,
        questionRatings: questionRatingsSnapshot.size,
        cachedQuestions: cachedQuestionsSnapshot.size
      }
    });

  } catch (error: unknown) {
    console.error('Error deleting account:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to delete account', details: errorMessage },
      { status: 500 }
    );
  }
}
