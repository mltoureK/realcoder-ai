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
  
  // Legacy field (deprecated - use quizzesThisMonth instead)
  quizzesUsed: number;
  
  // New usage tracking fields
  quizzesThisWeek: number;
  quizzesThisMonth: number;
  totalQuizzes: number;
  
  // Reset dates
  weekResetDate?: Timestamp;
  monthResetDate?: Timestamp;
  lastQuizDate?: Timestamp;
  
  // Premium fields
  isPremium?: boolean;
  isFounder?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  
  // Timestamps
  joinedAt: Timestamp;
  lastSeen?: Timestamp;
  upgradedAt?: Timestamp;
  updatedAt?: string;
  
  // Legacy fields
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
 * Get quiz history by repository and user
 */
export async function getUserQuizHistoryByRepo(
  repoUrl: string, 
  userId: string, 
  limitCount: number = 10
): Promise<QuizHistoryDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.QUIZ_HISTORY),
      where('userId', '==', userId),
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

    console.log(`📊 Retrieved ${quizHistory.length} quiz history records for user ${userId} and repo ${repoUrl}`);
    return quizHistory;
  } catch (error) {
    console.error('❌ Error getting user quiz history by repo:', error);
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
export async function saveQuestions(questions: unknown[], repoUrl: string): Promise<string[]> {
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
    doc(db, COLLECTIONS.QUESTIONS, questionId);
    
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
  isCorrect: boolean,
  questionData?: unknown // Optional: full question data to save on first poll
): Promise<void> => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    
    if (questionSnap.exists()) {
      const currentData = questionSnap.data();
      const currentPassed = currentData.passedCount || 0;
      const currentFailed = currentData.failedCount || 0;
      
      const updates: Record<string, unknown> = {
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
      // Create new question document with FULL data if provided
      let initialData: Record<string, unknown> = {
        questionId: questionId,
        upvotes: 0,
        downvotes: 0,
        totalVotes: 0,
        approvalRate: 0,
        status: 'active',
        passedCount: isCorrect ? 1 : 0,
        failedCount: isCorrect ? 0 : 1,
        totalAttempts: 1,
        passRate: isCorrect ? 100 : 0,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      
      // If full question data is provided, include it immediately
      if (questionData) {
        console.log(`📊 [updateQuestionPoll] Saving FULL question data on first poll`);
        const normalized = normalizeQuestionForStorage(questionData);
        initialData = {
          ...normalized,
          ...initialData // Keep poll metrics
        };
      } else {
        console.log(`📊 [updateQuestionPoll] No question data provided - creating minimal poll document`);
      }
      
      await setDoc(questionRef, initialData, { merge: true });
      console.log(`📊 Created question document for ${questionId} with ${questionData ? 'FULL' : 'minimal'} data`);
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
  _initialQualityScore = 85
): Promise<void> => {
  try {
    console.log(`🔍 [addQuestionToBank] Starting with question:`, question);
    console.log(`🔍 [addQuestionToBank] Repository URL:`, repoUrl);
    console.log(`🔍 [addQuestionToBank] Question keys:`, Object.keys(question));
    console.log(`🔍 [addQuestionToBank] Question type:`, question.type);
    console.log(`🔍 [addQuestionToBank] Question text:`, question.question);
    console.log(`🔍 [addQuestionToBank] Question snippet:`, (question as Record<string, unknown>).snippet);
    console.log(`🔍 [addQuestionToBank] Question codeContext:`, (question as Record<string, unknown>).codeContext);
    console.log(`🔍 [addQuestionToBank] Question options:`, (question as Record<string, unknown>).options);
    console.log(`🔍 [addQuestionToBank] Question correctAnswers:`, (question as Record<string, unknown>).correctAnswers);
    console.log(`🔍 [addQuestionToBank] Question variants:`, (question as Record<string, unknown>).variants);
    console.log(`🔍 [addQuestionToBank] Question steps:`, (question as Record<string, unknown>).steps);
    console.log(`🔍 [addQuestionToBank] Question explanation:`, (question as Record<string, unknown>).explanation);
    
    if (!validateQuestionData(question)) {
      console.error(`❌ [addQuestionToBank] Validation failed for question:`, question);
      throw new Error('Invalid question data');
    }

    const { repoKey } = extractRepoInfo(repoUrl);
    console.log(`🔍 [addQuestionToBank] Extracted repo key:`, repoKey);
    
    const bankRef = doc(db, COLLECTIONS.QUESTION_BANKS, repoKey);
    const bankSnap = await getDoc(bankRef);
    
    // Normalize question for storage
    const normalizedQuestion = normalizeQuestionForStorage(question);
    console.log(`🔍 [addQuestionToBank] Normalized question:`, normalizedQuestion);
    
    const now = Timestamp.now(); // Use actual timestamp instead of serverTimestamp for arrays
    
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

    console.log(`🔍 [addQuestionToBank] Final stored question:`, storedQuestion);

    // ALSO save to the main questions collection with complete data
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, question.id);
    console.log(`🔍 [addQuestionToBank] Saving to questions collection with ID:`, question.id);
    console.log(`🔍 [addQuestionToBank] Document to save:`, JSON.stringify(storedQuestion, null, 2));
    await setDoc(questionRef, storedQuestion, { merge: true });
    console.log(`✅ Question ${question.id} saved to questions collection with complete data`);
    
    // For questionBanks array, convert serverTimestamp to actual timestamp
    const storedQuestionForArray = {
      ...storedQuestion,
      createdAt: now,
      lastUpdated: now
    };
    
    if (bankSnap.exists()) {
      const currentData = bankSnap.data();
      const existingQuestions = currentData.questions || [];
      
      // Check if question already exists
      const questionExists = existingQuestions.some((q: StoredQuestion) => q.questionId === question.id);
      
      if (!questionExists) {
        await updateDoc(bankRef, {
          questions: [...existingQuestions, storedQuestionForArray],
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
        questions: [storedQuestionForArray],
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
    if (totalVotes >= 10 && approvalRate < 30) {
      questions[questionIndex].status = 'removed';
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

/**
 * Get cached questions for a repository
 * Returns upvoted questions from the question bank
 * Optionally filters out questions the user has already passed
 */
export const getCachedQuestions = async (
  repoUrl: string,
  limitCount: number = 50,
  userId?: string
): Promise<Question[]> => {
  try {
    console.log(`🔍 [getCachedQuestions] Querying cached questions for: ${repoUrl}`);
    console.log(`🔍 [getCachedQuestions] Query conditions: upvotes > 0, orderBy upvotes desc, limit ${limitCount}`);
    
    // Try the optimized query first - check for questions with upvotes OR active status
    const q = query(
      collection(db, COLLECTIONS.QUESTIONS),
      where('repoUrl', '==', repoUrl),
      where('upvotes', '>', 0),
      orderBy('upvotes', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const questions: Question[] = [];
    
    querySnapshot.forEach((doc) => {
      const storedQuestion = doc.data() as StoredQuestion;
      try {
        const question = denormalizeQuestionFromStorage(storedQuestion);
        questions.push(question);
      } catch (error) {
        console.error(`❌ Error denormalizing question ${doc.id}:`, error);
      }
    });
    
    console.log(`✅ Retrieved ${questions.length} cached questions for ${repoUrl}`);
    
    // Filter out questions user has already passed (if userId provided)
    if (userId) {
      try {
        console.log(`🔍 [getCachedQuestions] Filtering out passed questions for user: ${userId}`);
        const userHistory = await getUserQuizHistoryByRepo(repoUrl, userId, 20);
        
        // Extract question IDs the user has already passed
        const passedQuestionIds = userHistory
          .flatMap(quiz => quiz.results || [])
          .filter(result => result.isCorrect)
          .map(result => result.questionId);
        
        console.log(`📊 [getCachedQuestions] User has passed ${passedQuestionIds.length} questions`);
        
        if (passedQuestionIds.length > 0) {
          const originalCount = questions.length;
          const filteredQuestions = questions.filter(q => !passedQuestionIds.includes(q.id));
          console.log(`🎯 [getCachedQuestions] Filtered out ${originalCount - filteredQuestions.length} passed questions`);
          return filteredQuestions.slice(0, limitCount);
        }
      } catch (filterError) {
        console.warn('⚠️ Error filtering passed questions, returning all questions:', filterError);
      }
    }
    
    return questions;
  } catch (error: unknown) {
    console.error('❌ Error getting cached questions:', error);
    console.error('❌ Error details:', {
      message: (error as Error).message,
      code: (error as Record<string, unknown>).code,
      stack: (error as Error).stack
    });
    
    // If composite index doesn't exist, try simpler query
    const needsIndex = (error as Record<string, unknown>).code === 'failed-precondition' || 
                       (error as Error).message?.includes('index') ||
                       (error as Error).message?.includes('requires an index');
    
    if (needsIndex) {
      console.warn('⚠️ Composite index not found, trying simpler query');
      console.log('📝 Create index here:', (error as Error).message);
      console.log('🔍 Debug - needsIndex check passed:', { 
        code: (error as Record<string, unknown>).code, 
        hasIndexInMessage: (error as Error).message?.includes('index'),
        hasRequiresInMessage: (error as Error).message?.includes('requires an index')
      });
      
      // Extract the index creation URL if available
      const urlMatch = (error as Error).message?.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
      if (urlMatch) {
        console.log('🔗 Quick link to create index:', urlMatch[1]);
      }
      
      try {
        // Ultra-simple query - just get by repoUrl, filter everything else in memory
        const simpleQ = query(
          collection(db, COLLECTIONS.QUESTIONS),
          where('repoUrl', '==', repoUrl)
        );
        
        const querySnapshot = await getDocs(simpleQ);
        const questions: Question[] = [];
        
        querySnapshot.forEach((doc) => {
          const storedQuestion = doc.data() as StoredQuestion;
          try {
            // Filter in memory: only include questions with upvotes > 0 (status is optional)
            if ((storedQuestion.upvotes || 0) > 0) {
              const question = denormalizeQuestionFromStorage(storedQuestion);
              questions.push(question);
            }
          } catch (denormError) {
            console.error(`❌ Error denormalizing question ${doc.id}:`, denormError);
          }
        });
        
        // Sort in memory by upvotes (descending)
        questions.sort((a, b) => {
          const aUpvotes = (a as Record<string, unknown>).upvotes || 0;
          const bUpvotes = (b as Record<string, unknown>).upvotes || 0;
          return bUpvotes - aUpvotes;
        });
        
        // Apply limit in memory
        const limitedQuestions = questions.slice(0, limitCount);
        
        console.log(`✅ Retrieved ${limitedQuestions.length} cached questions (ultra-simple query) for ${repoUrl}`);
        
        // Filter out questions user has already passed (if userId provided)
        if (userId) {
          try {
            console.log(`🔍 [getCachedQuestions] Filtering out passed questions for user: ${userId} (fallback query)`);
            const userHistory = await getUserQuizHistoryByRepo(repoUrl, userId, 20);
            
            // Extract question IDs the user has already passed
            const passedQuestionIds = userHistory
              .flatMap(quiz => quiz.results || [])
              .filter(result => result.isCorrect)
              .map(result => result.questionId);
            
            console.log(`📊 [getCachedQuestions] User has passed ${passedQuestionIds.length} questions (fallback query)`);
            
            if (passedQuestionIds.length > 0) {
              const originalCount = limitedQuestions.length;
              const filteredQuestions = limitedQuestions.filter(q => !passedQuestionIds.includes(q.id));
              console.log(`🎯 [getCachedQuestions] Filtered out ${originalCount - filteredQuestions.length} passed questions (fallback query)`);
              return filteredQuestions.slice(0, limitCount);
            }
          } catch (filterError) {
            console.warn('⚠️ Error filtering passed questions (fallback query), returning all questions:', filterError);
          }
        }
        
        return limitedQuestions;
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        return [];
      }
    }
    
    return [];
  }
};
