/**
 * Quick script to reset your quiz count for testing
 * Run with: npx tsx reset-quiz-count.ts YOUR_USER_ID
 */

import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './src/lib/firebase';
import { getNextMonday, getFirstOfNextMonth } from './src/lib/user-management';

async function resetQuizCount(userId: string) {
  console.log(`🔄 Resetting quiz count for user: ${userId}`);
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error(`❌ User ${userId} not found in Firebase`);
      return;
    }
    
    const userData = userSnap.data();
    console.log('📊 Current state:', {
      quizzesThisWeek: userData.quizzesThisWeek,
      quizzesThisMonth: userData.quizzesThisMonth,
      totalQuizzes: userData.totalQuizzes
    });
    
    await updateDoc(userRef, {
      quizzesThisWeek: 0,
      quizzesThisMonth: 0,
      weekResetDate: Timestamp.fromDate(getNextMonday()),
      monthResetDate: Timestamp.fromDate(getFirstOfNextMonth())
    });
    
    console.log('✅ Quiz count reset!');
    console.log('📊 New state:', {
      quizzesThisWeek: 0,
      quizzesThisMonth: 0,
      weekResetDate: getNextMonday().toISOString(),
      monthResetDate: getFirstOfNextMonth().toISOString()
    });
    console.log('\n🎉 You can now test! Refresh the page and you should see "5 quizzes remaining"');
    
  } catch (error) {
    console.error('❌ Error resetting quiz count:', error);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('❌ Please provide a user ID');
  console.log('Usage: npx tsx reset-quiz-count.ts YOUR_USER_ID');
  console.log('\nTo find your user ID:');
  console.log('1. Sign in to your app');
  console.log('2. Open browser console');
  console.log('3. Look for "📊 Quiz limit:" log message');
  console.log('   OR');
  console.log('4. Check Firebase Console → users collection');
  process.exit(1);
}

resetQuizCount(userId);

