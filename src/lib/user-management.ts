import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
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
  FREE_WEEK: 3,          // 3 quizzes per week for free users
  FREE_MONTH: 10,        // 10 quizzes per month for free users
  PREMIUM_WEEK: -1,      // Unlimited for premium
  PREMIUM_MONTH: -1,     // Unlimited for premium
  FIRST_100_WEEK: 5,     // 5 quizzes per week for first 100 users
  FIRST_100_MONTH: 15,   // 15 quizzes per month for first 100 users
} as const;

/**
 * Get next Monday at midnight (start of week)
 */
export function getNextMonday(): Date {
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((7 - now.getDay() + 1) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

/**
 * Get first day of next month at midnight
 */
export function getFirstOfNextMonth(): Date {
  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return firstOfNextMonth;
}

/**
 * Check if reset dates need updating
 */
function needsWeekReset(weekResetDate?: Timestamp): boolean {
  if (!weekResetDate) return true;
  return weekResetDate.toDate().getTime() <= Date.now();
}

function needsMonthReset(monthResetDate?: Timestamp): boolean {
  if (!monthResetDate) return true;
  return monthResetDate.toDate().getTime() <= Date.now();
}

/**
 * Initialize user document
 * Creates a new user with all required fields
 */
export async function initializeUser(
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
      // User exists, update last seen and check for resets
      const existingData = userSnap.data() as UserDoc;
      
      const updates: Record<string, unknown> = {
        lastSeen: serverTimestamp()
      };
      
      // Check if we need to reset weekly count
      if (needsWeekReset(existingData.weekResetDate)) {
        updates.quizzesThisWeek = 0;
        updates.weekResetDate = Timestamp.fromDate(getNextMonday());
        console.log(`🔄 Reset weekly quiz count for user ${userId}`);
      }
      
      // Check if we need to reset monthly count
      if (needsMonthReset(existingData.monthResetDate)) {
        updates.quizzesThisMonth = 0;
        updates.monthResetDate = Timestamp.fromDate(getFirstOfNextMonth());
        console.log(`🔄 Reset monthly quiz count for user ${userId}`);
      }
      
      await updateDoc(userRef, updates);
      
      return { id: userId, ...existingData, ...updates } as UserDoc;
    } else {
      // Create new user
      const isFirst100Users = await checkIfFirst100Users();
      
      const newUserData: Omit<UserDoc, 'id'> = {
        email: userData.email,
        name: userData.name,
        provider: userData.provider,
        plan: 'free',
        
        // Usage tracking
        quizzesUsed: 0, // Legacy field
        quizzesThisWeek: 0,
        quizzesThisMonth: 0,
        totalQuizzes: 0,
        
        // Reset dates
        weekResetDate: Timestamp.fromDate(getNextMonday()),
        monthResetDate: Timestamp.fromDate(getFirstOfNextMonth()),
        
        // Premium fields
        isPremium: false,
        isFounder: false,
        
        // Timestamps
        joinedAt: serverTimestamp() as Timestamp,
        lastSeen: serverTimestamp() as Timestamp,
        
        // Legacy
        isFirst100Users
      };

      await setDoc(userRef, newUserData);
      console.log(`✅ Created new user ${userId} (First 100: ${isFirst100Users})`);
      
      return { id: userId, ...newUserData } as UserDoc;
    }
  } catch (error) {
    console.error('❌ Error initializing user:', error);
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
 * Check quiz limit with weekly and monthly logic
 * Premium users have unlimited access
 * Free users: 3/week, 10/month
 * First 100 users: 5/week, 15/month
 */
export async function checkQuizLimit(userId: string): Promise<{
  canTake: boolean;
  reason?: string;
  weeklyRemaining: number;
  monthlyRemaining: number;
  weeklyLimit: number;
  monthlyLimit: number;
  weekResetDate?: Date;
  monthResetDate?: Date;
  isPremium: boolean;
}> {
  try {
    const user = await getUser(userId);
    if (!user) {
      return {
        canTake: false,
        reason: 'User not found',
        weeklyRemaining: 0,
        monthlyRemaining: 0,
        weeklyLimit: 0,
        monthlyLimit: 0,
        isPremium: false
      };
    }

    // Check for resets
    let weeklyUsed = user.quizzesThisWeek || 0;
    let monthlyUsed = user.quizzesThisMonth || 0;
    let weekResetDate = user.weekResetDate?.toDate();
    let monthResetDate = user.monthResetDate?.toDate();

    // Reset if needed
    if (needsWeekReset(user.weekResetDate)) {
      weeklyUsed = 0;
      weekResetDate = getNextMonday();
    }
    
    if (needsMonthReset(user.monthResetDate)) {
      monthlyUsed = 0;
      monthResetDate = getFirstOfNextMonth();
    }

    // Premium users have unlimited access
    if (user.isPremium) {
      return {
        canTake: true,
        weeklyRemaining: -1, // Unlimited
        monthlyRemaining: -1, // Unlimited
        weeklyLimit: -1,
        monthlyLimit: -1,
        weekResetDate,
        monthResetDate,
        isPremium: true
      };
    }

    // Determine limits based on user type
    let weeklyLimit: number;
    let monthlyLimit: number;
    
    if (user.isFirst100Users) {
      weeklyLimit = USAGE_LIMITS.FIRST_100_WEEK;
      monthlyLimit = USAGE_LIMITS.FIRST_100_MONTH;
    } else {
      weeklyLimit = USAGE_LIMITS.FREE_WEEK;
      monthlyLimit = USAGE_LIMITS.FREE_MONTH;
    }

    const weeklyRemaining = Math.max(0, weeklyLimit - weeklyUsed);
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);

    // Check both limits
    if (weeklyUsed >= weeklyLimit) {
      return {
        canTake: false,
        reason: `Weekly limit reached (${weeklyLimit} quizzes/week)`,
        weeklyRemaining: 0,
        monthlyRemaining,
        weeklyLimit,
        monthlyLimit,
        weekResetDate,
        monthResetDate,
        isPremium: false
      };
    }

    if (monthlyUsed >= monthlyLimit) {
      return {
        canTake: false,
        reason: `Monthly limit reached (${monthlyLimit} quizzes/month)`,
        weeklyRemaining,
        monthlyRemaining: 0,
        weeklyLimit,
        monthlyLimit,
        weekResetDate,
        monthResetDate,
        isPremium: false
      };
    }

    return {
      canTake: true,
      weeklyRemaining,
      monthlyRemaining,
      weeklyLimit,
      monthlyLimit,
      weekResetDate,
      monthResetDate,
      isPremium: false
    };
  } catch (error) {
    console.error('❌ Error checking quiz limit:', error);
    return {
      canTake: false,
      reason: 'Error checking limit',
      weeklyRemaining: 0,
      monthlyRemaining: 0,
      weeklyLimit: 0,
      monthlyLimit: 0,
      isPremium: false
    };
  }
}

/**
 * Increment quiz count
 * Updates both weekly and monthly counters
 */
export async function incrementQuizCount(userId: string): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error(`❌ User ${userId} not found`);
      return;
    }

    const userData = userSnap.data() as UserDoc;
    
    // Check for resets before incrementing
    let quizzesThisWeek = userData.quizzesThisWeek || 0;
    let quizzesThisMonth = userData.quizzesThisMonth || 0;
    const updates: Record<string, unknown> = {};
    
    if (needsWeekReset(userData.weekResetDate)) {
      quizzesThisWeek = 0;
      updates.weekResetDate = Timestamp.fromDate(getNextMonday());
      console.log(`🔄 Reset weekly count before increment for user ${userId}`);
    }
    
    if (needsMonthReset(userData.monthResetDate)) {
      quizzesThisMonth = 0;
      updates.monthResetDate = Timestamp.fromDate(getFirstOfNextMonth());
      console.log(`🔄 Reset monthly count before increment for user ${userId}`);
    }
    
    // Increment counters
    updates.quizzesThisWeek = quizzesThisWeek + 1;
    updates.quizzesThisMonth = quizzesThisMonth + 1;
    updates.totalQuizzes = (userData.totalQuizzes || 0) + 1;
    updates.quizzesUsed = (userData.quizzesUsed || 0) + 1; // Legacy field
    updates.lastQuizDate = serverTimestamp();

    await updateDoc(userRef, updates);

    console.log(`📊 Quiz count updated for ${userId}: Week=${updates.quizzesThisWeek}, Month=${updates.quizzesThisMonth}, Total=${updates.totalQuizzes}`);
  } catch (error) {
    console.error('❌ Error incrementing quiz count:', error);
    throw error;
  }
}

/**
 * Update user premium status (called by Stripe webhooks)
 */
export async function updateUserPremiumStatus(
  userId: string,
  premiumData: {
    isPremium: boolean;
    isFounder?: boolean;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  }
): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`⚠️ User ${userId} doesn't exist, creating with premium status`);
      // Create user with premium status
      const newUserData: Record<string, unknown> = {
        email: '',
        name: 'Premium User',
        provider: 'anonymous',
        plan: 'free',
        quizzesUsed: 0,
        quizzesThisWeek: 0,
        quizzesThisMonth: 0,
        totalQuizzes: 0,
        weekResetDate: Timestamp.fromDate(getNextMonday()),
        monthResetDate: Timestamp.fromDate(getFirstOfNextMonth()),
        joinedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        ...premiumData,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userRef, newUserData);
      console.log(`✅ Created user ${userId} with premium status`);
      return;
    }

    // Update existing user
    const updates: Record<string, unknown> = {
      ...premiumData,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(userRef, updates);

    console.log(`✅ Updated premium status for user ${userId}:`, {
      isPremium: premiumData.isPremium,
      isFounder: premiumData.isFounder,
      subscriptionStatus: premiumData.subscriptionStatus
    });
  } catch (error) {
    console.error('❌ Error updating user premium status:', error);
    throw error;
  }
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
 * Legacy function for backward compatibility
 * Deprecated: Use initializeUser instead
 */
export async function createOrUpdateUser(
  userId: string,
  userData: {
    email: string;
    name: string;
    provider: 'google' | 'github' | 'anonymous';
  }
): Promise<UserDoc> {
  return initializeUser(userId, userData);
}

/**
 * Legacy function for backward compatibility
 * Deprecated: Use incrementQuizCount instead
 */
export async function updateUserQuizUsage(userId: string): Promise<void> {
  return incrementQuizCount(userId);
}

/**
 * Legacy function for backward compatibility
 * Deprecated: Use checkQuizLimit instead
 */
export async function canUserTakeQuiz(userId: string): Promise<{
  canTake: boolean;
  remaining: number;
  limit: number;
  resetDate?: Date;
}> {
  const result = await checkQuizLimit(userId);
  return {
    canTake: result.canTake,
    remaining: Math.min(result.weeklyRemaining, result.monthlyRemaining),
    limit: Math.min(result.weeklyLimit, result.monthlyLimit),
    resetDate: result.weekResetDate
  };
}

/**
 * Get user's badge status
 */
export function getUserBadges(user: UserDoc): string[] {
  const badges: string[] = [];

  if (user.isFounder) {
    badges.push('🏆 Founder');
  }

  if (user.isPremium && !user.isFounder) {
    badges.push('⭐ Premium');
  }

  if (user.isFirst100Users) {
    badges.push('🎯 Early Adopter');
  }

  const totalQuizzes = user.totalQuizzes || 0;
  if (totalQuizzes >= 100) {
    badges.push('🔥 Century Club');
  } else if (totalQuizzes >= 50) {
    badges.push('💪 Quiz Master');
  } else if (totalQuizzes >= 10) {
    badges.push('📚 Learner');
  }

  return badges;
}

/**
 * Get user quiz statistics
 */
export async function getUserQuizStats(userId: string): Promise<{
  totalQuizzes: number;
  quizzesThisWeek: number;
  quizzesThisMonth: number;
  weeklyLimit: number;
  monthlyLimit: number;
  isPremium: boolean;
}> {
  try {
    const user = await getUser(userId);
    if (!user) {
      return {
        totalQuizzes: 0,
        quizzesThisWeek: 0,
        quizzesThisMonth: 0,
        weeklyLimit: USAGE_LIMITS.FREE_WEEK,
        monthlyLimit: USAGE_LIMITS.FREE_MONTH,
        isPremium: false
      };
    }

    // Reset counters if needed
    let quizzesThisWeek = user.quizzesThisWeek || 0;
    let quizzesThisMonth = user.quizzesThisMonth || 0;
    
    if (needsWeekReset(user.weekResetDate)) {
      quizzesThisWeek = 0;
    }
    
    if (needsMonthReset(user.monthResetDate)) {
      quizzesThisMonth = 0;
    }

    // Determine limits
    let weeklyLimit: number;
    let monthlyLimit: number;
    
    if (user.isPremium) {
      weeklyLimit = -1;
      monthlyLimit = -1;
    } else if (user.isFirst100Users) {
      weeklyLimit = USAGE_LIMITS.FIRST_100_WEEK;
      monthlyLimit = USAGE_LIMITS.FIRST_100_MONTH;
    } else {
      weeklyLimit = USAGE_LIMITS.FREE_WEEK;
      monthlyLimit = USAGE_LIMITS.FREE_MONTH;
    }

    return {
      totalQuizzes: user.totalQuizzes || 0,
      quizzesThisWeek,
      quizzesThisMonth,
      weeklyLimit,
      monthlyLimit,
      isPremium: user.isPremium || false
    };
  } catch (error) {
    console.error('❌ Error getting user quiz stats:', error);
    return {
      totalQuizzes: 0,
      quizzesThisWeek: 0,
      quizzesThisMonth: 0,
      weeklyLimit: USAGE_LIMITS.FREE_WEEK,
      monthlyLimit: USAGE_LIMITS.FREE_MONTH,
      isPremium: false
    };
  }
}
