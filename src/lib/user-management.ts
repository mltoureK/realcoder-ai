import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { UserDoc } from './quiz-history';

// Firestore collection names
const COLLECTIONS = {
  USERS: 'users',
  QUIZ_HISTORY: 'quizHistory'
} as const;

// Usage limits
export const USAGE_LIMITS = {
  FREE: 3, // 3 quizzes per month for free users
  PRO: 100, // 100 quizzes per month for pro users
  EDU: 50, // 50 quizzes per month for edu users
  FIRST_100_USERS: 10 // 10 quizzes per month for first 100 users
} as const;

/**
 * Create or update user document
 */
export async function createOrUpdateUser(
  userId: string,
  userData: {
    email: string;
    name: string;
    provider: 'google' | 'github' | 'anonymous';
  }
): Promise<UserDoc> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // User exists, update last seen
      await updateDoc(userRef, {
        lastSeen: serverTimestamp()
      });
      return { id: userId, ...userSnap.data() } as UserDoc;
    } else {
      // Create new user
      const isFirst100Users = await checkIfFirst100Users();
      
      const newUserData: Omit<UserDoc, 'id'> = {
        email: userData.email,
        name: userData.name,
        provider: userData.provider,
        plan: isFirst100Users ? 'free' : 'free', // All start as free, but first 100 get bonus
        quizzesUsed: 0,
        joinedAt: serverTimestamp() as Timestamp,
        isFirst100Users
      };

      await setDoc(userRef, newUserData);
      console.log(`✅ Created new user ${userId} with plan: ${newUserData.plan}`);
      
      return { id: userId, ...newUserData } as UserDoc;
    }
  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
    throw error;
  }
}

/**
 * Get user document
 */
export async function getUser(userId: string): Promise<UserDoc | null> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userId, ...userSnap.data() } as UserDoc;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting user:', error);
    throw error;
  }
}

/**
 * Update user's quiz usage count
 */
export async function updateUserQuizUsage(userId: string): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as UserDoc;
      const newUsageCount = (userData.quizzesUsed || 0) + 1;
      
      await updateDoc(userRef, {
        quizzesUsed: newUsageCount,
        lastQuizDate: serverTimestamp()
      });

      console.log(`📊 Updated quiz usage for user ${userId}: ${newUsageCount}`);
    }
  } catch (error) {
    console.error('❌ Error updating user quiz usage:', error);
    throw error;
  }
}

/**
 * Check if user can take more quizzes this month
 */
export async function canUserTakeQuiz(userId: string): Promise<{
  canTake: boolean;
  remaining: number;
  limit: number;
  resetDate?: Date;
}> {
  try {
    const user = await getUser(userId);
    if (!user) {
      return { canTake: false, remaining: 0, limit: 0 };
    }

    const limit = getUserMonthlyLimit(user);
    const used = user.quizzesUsed || 0;
    const remaining = Math.max(0, limit - used);
    const canTake = remaining > 0;

    // Calculate reset date (first day of next month)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      canTake,
      remaining,
      limit,
      resetDate
    };
  } catch (error) {
    console.error('❌ Error checking user quiz eligibility:', error);
    return { canTake: false, remaining: 0, limit: 0 };
  }
}

/**
 * Get user's monthly quiz limit based on their plan
 */
export function getUserMonthlyLimit(user: UserDoc): number {
  if (user.plan === 'pro') return USAGE_LIMITS.PRO;
  if (user.plan === 'edu') return USAGE_LIMITS.EDU;
  if (user.isFirst100Users) return USAGE_LIMITS.FIRST_100_USERS;
  return USAGE_LIMITS.FREE;
}

/**
 * Check if user is in the first 100 users
 */
export async function checkIfFirst100Users(): Promise<boolean> {
  try {
    const q = query(collection(db, COLLECTIONS.USERS));
    const querySnapshot = await getDocs(q);
    
    const totalUsers = querySnapshot.size;
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    return totalUsers < 100;
  } catch (error) {
    console.error('❌ Error checking first 100 users:', error);
    return false;
  }
}

/**
 * Get user's quiz statistics
 */
export async function getUserQuizStats(userId: string): Promise<{
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  languagesAttempted: string[];
  favoriteRepos: string[];
}> {
  try {
    const q = query(
      collection(db, COLLECTIONS.QUIZ_HISTORY),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const quizzes = querySnapshot.docs.map(doc => doc.data());

    const totalQuizzes = quizzes.length;
    const scores = quizzes.map(q => (q.score / q.totalQuestions) * 100);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    const languagesAttempted = [...new Set(quizzes.map(q => q.language).filter(Boolean))];
    const favoriteRepos = [...new Set(quizzes.map(q => q.repoName))];

    return {
      totalQuizzes,
      averageScore: Math.round(averageScore),
      bestScore: Math.round(bestScore),
      languagesAttempted,
      favoriteRepos
    };
  } catch (error) {
    console.error('❌ Error getting user quiz stats:', error);
    return {
      totalQuizzes: 0,
      averageScore: 0,
      bestScore: 0,
      languagesAttempted: [],
      favoriteRepos: []
    };
  }
}

/**
 * Reset user's monthly quiz usage (called monthly)
 */
export async function resetMonthlyUsage(): Promise<void> {
  try {
    const q = query(collection(db, COLLECTIONS.USERS));
    const querySnapshot = await getDocs(q);

    const batch = [];
    querySnapshot.forEach((doc) => {
      batch.push(updateDoc(doc.ref, {
        quizzesUsed: 0,
        lastQuizDate: serverTimestamp()
      }));
    });

    await Promise.all(batch);
    console.log(`✅ Reset monthly usage for ${batch.length} users`);
  } catch (error) {
    console.error('❌ Error resetting monthly usage:', error);
    throw error;
  }
}

/**
 * Upgrade user plan
 */
export async function upgradeUserPlan(userId: string, newPlan: 'pro' | 'edu'): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      plan: newPlan,
      upgradedAt: serverTimestamp()
    });

    console.log(`✅ Upgraded user ${userId} to plan: ${newPlan}`);
  } catch (error) {
    console.error('❌ Error upgrading user plan:', error);
    throw error;
  }
}

/**
 * Get user's badge status
 */
export function getUserBadges(user: UserDoc): string[] {
  const badges: string[] = [];

  if (user.isFirst100Users) {
    badges.push('Real Code Tester');
  }

  if (user.plan === 'pro') {
    badges.push('Pro User');
  }

  if (user.plan === 'edu') {
    badges.push('Education User');
  }

  // Add more badge logic based on quiz performance, etc.
  return badges;
}
