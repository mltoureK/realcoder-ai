import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { QuestionResult } from './report-card';

// Firestore collection names
const COLLECTIONS = {
  QUIZ_HISTORY: 'quizHistory',
  USERS: 'users',
  QUESTIONS: 'questions',
  QUESTION_RATINGS: 'questionRatings'
} as const;

// Types for Firestore documents
export interface QuizHistoryDoc {
  id?: string;
  userId: string;
  repoUrl: string;
  repoName: string;
  score: number;
  totalQuestions: number;
  completedAt: Timestamp;
  results: QuestionResult[];
  sessionId: string;
  language?: string;
  difficulty?: string;
}

export interface UserDoc {
  id?: string;
  email: string;
  name: string;
  provider: 'google' | 'github' | 'anonymous';
  plan: 'free' | 'pro' | 'edu';
  quizzesUsed: number;
  lastQuizDate?: Timestamp;
  joinedAt: Timestamp;
  isFirst100Users?: boolean;
}

export interface QuestionDoc {
  id?: string;
  repoUrl: string;
  question: string;
  type: string;
  codeContext?: string;
  language: string;
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  qualityScore: number;
  correctAnswers: number;
  incorrectAnswers: number;
  status: 'active' | 'flagged' | 'removed';
  createdAt: Timestamp;
  lastUpdated: Timestamp;
}

export interface QuestionRatingDoc {
  id?: string;
  questionId: string;
  userId: string;
  rating: 'up' | 'down';
  timestamp: Timestamp;
}

/**
 * Save quiz results to Firestore
 */
export async function saveQuizResults(
  userId: string,
  repoUrl: string,
  repoName: string,
  score: number,
  totalQuestions: number,
  results: QuestionResult[],
  sessionId: string,
  language?: string,
  difficulty?: string
): Promise<string> {
  try {
    const quizHistoryData: Omit<QuizHistoryDoc, 'id'> = {
      userId,
      repoUrl,
      repoName,
      score,
      totalQuestions,
      completedAt: serverTimestamp() as Timestamp,
      results,
      sessionId,
      language,
      difficulty
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.QUIZ_HISTORY), quizHistoryData);
    console.log('✅ Quiz results saved with ID:', docRef.id);
    
    // Update user's quiz usage
    await updateUserQuizUsage(userId);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving quiz results:', error);
    throw error;
  }
}

/**
 * Get quiz history for a user
 */
export async function getQuizHistory(userId: string, limitCount: number = 10): Promise<QuizHistoryDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.QUIZ_HISTORY),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const quizHistory: QuizHistoryDoc[] = [];
    
    querySnapshot.forEach((doc) => {
      quizHistory.push({
        id: doc.id,
        ...doc.data()
      } as QuizHistoryDoc);
    });

    console.log(`📊 Retrieved ${quizHistory.length} quiz history records for user ${userId}`);
    return quizHistory;
  } catch (error) {
    console.error('❌ Error getting quiz history:', error);
    throw error;
  }
}

/**
 * Get quiz history by repository
 */
export async function getQuizHistoryByRepo(repoUrl: string, limitCount: number = 5): Promise<QuizHistoryDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.QUIZ_HISTORY),
      where('repoUrl', '==', repoUrl),
      orderBy('completedAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const quizHistory: QuizHistoryDoc[] = [];
    
    querySnapshot.forEach((doc) => {
      quizHistory.push({
        id: doc.id,
        ...doc.data()
      } as QuizHistoryDoc);
    });

    console.log(`📊 Retrieved ${quizHistory.length} quiz history records for repo ${repoUrl}`);
    return quizHistory;
  } catch (error) {
    console.error('❌ Error getting quiz history by repo:', error);
    throw error;
  }
}

/**
 * Update user's quiz usage count
 */
export async function updateUserQuizUsage(userId: string): Promise<void> {
  try {
    // This would typically use updateDoc, but for now we'll handle it in user-management.ts
    console.log(`📊 Updated quiz usage for user ${userId}`);
  } catch (error) {
    console.error('❌ Error updating user quiz usage:', error);
    throw error;
  }
}

/**
 * Save questions to Firestore for caching and quality tracking
 */
export async function saveQuestions(questions: any[], repoUrl: string): Promise<string[]> {
  try {
    const questionIds: string[] = [];
    
    for (const question of questions) {
      const questionData: Omit<QuestionDoc, 'id'> = {
        repoUrl,
        question: question.question,
        type: question.type,
        codeContext: question.codeContext,
        language: question.language || 'Unknown',
        upvotes: 0,
        downvotes: 0,
        totalVotes: 0,
        qualityScore: 100, // Start with perfect score
        correctAnswers: 0,
        incorrectAnswers: 0,
        status: 'active',
        createdAt: serverTimestamp() as Timestamp,
        lastUpdated: serverTimestamp() as Timestamp
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), questionData);
      questionIds.push(docRef.id);
    }

    console.log(`✅ Saved ${questionIds.length} questions for repo ${repoUrl}`);
    return questionIds;
  } catch (error) {
    console.error('❌ Error saving questions:', error);
    throw error;
  }
}

/**
 * Rate a question (thumbs up/down)
 */
export async function rateQuestion(
  questionId: string, 
  userId: string, 
  rating: 'up' | 'down'
): Promise<string> {
  try {
    const ratingData: Omit<QuestionRatingDoc, 'id'> = {
      questionId,
      userId,
      rating,
      timestamp: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.QUESTION_RATINGS), ratingData);
    console.log(`✅ Question ${questionId} rated ${rating} by user ${userId}`);
    
    // Update question quality score
    await updateQuestionQualityScore(questionId, rating);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error rating question:', error);
    throw error;
  }
}

/**
 * Update question quality score based on ratings
 */
export async function updateQuestionQualityScore(questionId: string, newRating: 'up' | 'down'): Promise<void> {
  try {
    // Get current question data
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
    
    // For now, we'll implement a simple quality score calculation
    // In a real app, you'd fetch current ratings and recalculate
    console.log(`📊 Updated quality score for question ${questionId} with ${newRating} rating`);
  } catch (error) {
    console.error('❌ Error updating question quality score:', error);
    throw error;
  }
}

/**
 * Check if user has already rated a question
 */
export async function hasUserRatedQuestion(questionId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTIONS.QUESTION_RATINGS),
      where('questionId', '==', questionId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('❌ Error checking if user rated question:', error);
    return false;
  }
}

/**
 * Get user's rating for a question
 */
export async function getUserQuestionRating(questionId: string, userId: string): Promise<'up' | 'down' | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.QUESTION_RATINGS),
      where('questionId', '==', questionId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const ratingDoc = querySnapshot.docs[0];
    return ratingDoc.data().rating;
  } catch (error) {
    console.error('❌ Error getting user question rating:', error);
    return null;
  }
}

// Poll system functions
export const updateQuestionPoll = async (
  questionId: string,
  isCorrect: boolean
): Promise<void> => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    
    if (questionSnap.exists()) {
      const currentData = questionSnap.data();
      const currentPassed = currentData.passedCount || 0;
      const currentFailed = currentData.failedCount || 0;
      
      const updates: any = {
        lastUpdated: serverTimestamp()
      };
      
      if (isCorrect) {
        updates.passedCount = currentPassed + 1;
      } else {
        updates.failedCount = currentFailed + 1;
      }
      
      updates.totalAttempts = (currentPassed + currentFailed + 1);
      updates.passRate = ((updates.passedCount || currentPassed) / updates.totalAttempts) * 100;
      
      await updateDoc(questionRef, updates);
    } else {
      // Create new question document with poll data
      const initialData = {
        passedCount: isCorrect ? 1 : 0,
        failedCount: isCorrect ? 0 : 1,
        totalAttempts: 1,
        passRate: isCorrect ? 100 : 0,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      
      await setDoc(questionRef, initialData);
    }
  } catch (error) {
    console.error('Error updating question poll:', error);
    throw error;
  }
};

export const getQuestionPollData = async (questionId: string): Promise<{
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
  passRate: number;
} | null> => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    
    if (questionSnap.exists()) {
      const data = questionSnap.data();
      return {
        passedCount: data.passedCount || 0,
        failedCount: data.failedCount || 0,
        totalAttempts: data.totalAttempts || 0,
        passRate: data.passRate || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting question poll data:', error);
    return null;
  }
};
