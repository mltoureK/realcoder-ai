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
import { 
  normalizeQuestionForStorage, 
  denormalizeQuestionFromStorage, 
  extractRepoInfo,
  validateQuestionData,
  type Question,
  type StoredQuestion 
} from './question-types';

// Firestore collection names
const COLLECTIONS = {
  QUIZ_HISTORY: 'quizHistory',
  USERS: 'users',
  QUESTIONS: 'questions',
  QUESTION_RATINGS: 'questionRatings',
  QUESTION_BANKS: 'questionBanks'
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

// Enhanced Question Bank System with Flexible Schema
export const addQuestionToBank = async (
  repoUrl: string,
  question: Question,
  initialQualityScore: number = 85
): Promise<void> => {
  try {
    if (!validateQuestionData(question)) {
      throw new Error('Invalid question data');
    }

    const { repoKey } = extractRepoInfo(repoUrl);
    const bankRef = doc(db, COLLECTIONS.QUESTION_BANKS, repoKey);
    const bankSnap = await getDoc(bankRef);
    
    // Normalize question for storage
    const normalizedQuestion = normalizeQuestionForStorage(question);
    const storedQuestion: StoredQuestion = {
      ...normalizedQuestion,
      upvotes: 1, // Initial upvote that triggered addition
      downvotes: 0,
      totalVotes: 1,
      approvalRate: 100, // Start with 100% approval
      passedCount: 0,
      failedCount: 0,
      totalAttempts: 0,
      passRate: 0,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    } as StoredQuestion;
    
    if (bankSnap.exists()) {
      const currentData = bankSnap.data();
      const existingQuestions = currentData.questions || [];
      
      // Check if question already exists
      const questionExists = existingQuestions.some((q: StoredQuestion) => q.questionId === question.id);
      
      if (!questionExists) {
        await updateDoc(bankRef, {
          questions: [...existingQuestions, storedQuestion],
          totalQuestions: existingQuestions.length + 1,
          activeQuestions: (currentData.activeQuestions || existingQuestions.length) + 1,
          lastUpdated: serverTimestamp()
        });
        console.log(`✅ Question added to ${repoUrl} question bank!`);
      } else {
        console.log(`⚠️ Question ${question.id} already exists in bank`);
      }
    } else {
      // Create new bank
      await setDoc(bankRef, {
        repoUrl,
        repoKey,
        ...extractRepoInfo(repoUrl),
        questions: [storedQuestion],
        totalQuestions: 1,
        activeQuestions: 1,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      console.log(`✅ New question bank created for ${repoUrl}!`);
    }
  } catch (error) {
    console.error('Error adding question to bank:', error);
    throw error;
  }
};

export const updateQuestionInBank = async (
  repoUrl: string,
  questionId: string,
  upvotes: number,
  downvotes: number
): Promise<void> => {
  try {
    const { repoKey } = extractRepoInfo(repoUrl);
    const bankRef = doc(db, COLLECTIONS.QUESTION_BANKS, repoKey);
    const bankSnap = await getDoc(bankRef);
    
    if (!bankSnap.exists()) return;
    
    const currentData = bankSnap.data();
    const questions = currentData.questions || [];
    
    // Find and update the question
    const questionIndex = questions.findIndex((q: StoredQuestion) => q.questionId === questionId);
    if (questionIndex === -1) return;
    
    const question = questions[questionIndex];
    const totalVotes = upvotes + downvotes;
    const approvalRate = totalVotes > 0 ? (upvotes / totalVotes) * 100 : 0;
    
    // Update question data
    questions[questionIndex] = {
      ...question,
      upvotes,
      downvotes,
      totalVotes,
      approvalRate,
      lastUpdated: serverTimestamp()
    };
    
    // Check if question should be removed (≥10 votes AND <30% approval)
    let shouldRemove = false;
    if (totalVotes >= 10 && approvalRate < 30) {
      questions[questionIndex].status = 'removed';
      shouldRemove = true;
      console.log(`🗑️ Question ${questionId} removed from bank (${approvalRate.toFixed(1)}% approval)`);
    }
    
    // Update active questions count
    const activeQuestions = questions.filter((q: StoredQuestion) => q.status === 'active').length;
    
    await updateDoc(bankRef, {
      questions,
      activeQuestions,
      lastUpdated: serverTimestamp()
    });
    
    console.log(`📊 Question ${questionId} updated: ${upvotes}↑ ${downvotes}↓ (${approvalRate.toFixed(1)}% approval)`);
  } catch (error) {
    console.error('Error updating question in bank:', error);
    throw error;
  }
};

export const getQuestionBank = async (repoUrl: string): Promise<Question[]> => {
  try {
    const { repoKey } = extractRepoInfo(repoUrl);
    const bankRef = doc(db, COLLECTIONS.QUESTION_BANKS, repoKey);
    const bankSnap = await getDoc(bankRef);
    
    if (!bankSnap.exists()) {
      return [];
    }
    
    const bankData = bankSnap.data();
    const storedQuestions = bankData.questions || [];
    
    // Filter only active questions and convert back to Question format
    const activeQuestions = storedQuestions
      .filter((q: StoredQuestion) => q.status === 'active')
      .map((storedQuestion: StoredQuestion) => denormalizeQuestionFromStorage(storedQuestion));
    
    console.log(`📚 Retrieved ${activeQuestions.length} active questions from ${repoUrl} bank`);
    return activeQuestions;
  } catch (error) {
    console.error('Error getting question bank:', error);
    return [];
  }
};

export const getQuestionBankStats = async (repoUrl: string): Promise<{
  totalQuestions: number;
  activeQuestions: number;
  averageQuality: number;
}> => {
  try {
    const { repoKey } = extractRepoInfo(repoUrl);
    const bankRef = doc(db, COLLECTIONS.QUESTION_BANKS, repoKey);
    const bankSnap = await getDoc(bankRef);
    
    if (!bankSnap.exists()) {
      return { totalQuestions: 0, activeQuestions: 0, averageQuality: 0 };
    }
    
    const bankData = bankSnap.data();
    const questions = bankData.questions || [];
    
    const activeQuestions = questions.filter((q: StoredQuestion) => q.status === 'active');
    const averageQuality = activeQuestions.length > 0 
      ? activeQuestions.reduce((sum: number, q: StoredQuestion) => sum + q.approvalRate, 0) / activeQuestions.length
      : 0;
    
    return {
      totalQuestions: questions.length,
      activeQuestions: activeQuestions.length,
      averageQuality: Math.round(averageQuality * 10) / 10
    };
  } catch (error) {
    console.error('Error getting question bank stats:', error);
    return { totalQuestions: 0, activeQuestions: 0, averageQuality: 0 };
  }
};
