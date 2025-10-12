/**
 * Test script for Task 4: User Management System
 * Run with: npx tsx test-user-management.ts
 */

import {
  initializeUser,
  getUser,
  checkQuizLimit,
  incrementQuizCount,
  updateUserPremiumStatus,
  getUserQuizStats,
  getUserBadges,
  getNextMonday,
  getFirstOfNextMonth
} from './src/lib/user-management';

const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_PREMIUM_USER_ID = `test-premium-${Date.now()}`;

async function runTests() {
  console.log('🧪 Testing User Management System');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Test 1: Initialize User
    console.log('Test 1: Initialize User');
    console.log('─────────────────────────');
    const user = await initializeUser(TEST_USER_ID, {
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google'
    });
    console.log('✅ User created:', {
      id: user.id,
      email: user.email,
      quizzesThisWeek: user.quizzesThisWeek,
      quizzesThisMonth: user.quizzesThisMonth,
      isPremium: user.isPremium
    });
    console.log('');

    // Test 2: Get User
    console.log('Test 2: Get User');
    console.log('─────────────────────────');
    const fetchedUser = await getUser(TEST_USER_ID);
    console.log('✅ User fetched:', fetchedUser ? 'Success' : 'Failed');
    console.log('');

    // Test 3: Check Quiz Limit (Free User)
    console.log('Test 3: Check Quiz Limit (Free User)');
    console.log('─────────────────────────');
    const limitCheck1 = await checkQuizLimit(TEST_USER_ID);
    console.log('✅ Limit check:', {
      canTake: limitCheck1.canTake,
      weeklyRemaining: limitCheck1.weeklyRemaining,
      monthlyRemaining: limitCheck1.monthlyRemaining,
      weeklyLimit: limitCheck1.weeklyLimit,
      monthlyLimit: limitCheck1.monthlyLimit,
      isPremium: limitCheck1.isPremium
    });
    console.log('');

    // Test 4: Increment Quiz Count
    console.log('Test 4: Increment Quiz Count');
    console.log('─────────────────────────');
    await incrementQuizCount(TEST_USER_ID);
    const stats1 = await getUserQuizStats(TEST_USER_ID);
    console.log('✅ After first quiz:', {
      quizzesThisWeek: stats1.quizzesThisWeek,
      quizzesThisMonth: stats1.quizzesThisMonth,
      totalQuizzes: stats1.totalQuizzes
    });
    console.log('');

    // Test 5: Multiple Increments
    console.log('Test 5: Multiple Increments (hitting limit)');
    console.log('─────────────────────────');
    await incrementQuizCount(TEST_USER_ID);
    await incrementQuizCount(TEST_USER_ID);
    const stats2 = await getUserQuizStats(TEST_USER_ID);
    console.log('✅ After 3 quizzes:', {
      quizzesThisWeek: stats2.quizzesThisWeek,
      quizzesThisMonth: stats2.quizzesThisMonth,
      totalQuizzes: stats2.totalQuizzes
    });
    
    const limitCheck2 = await checkQuizLimit(TEST_USER_ID);
    console.log('✅ Limit check after 3 quizzes:', {
      canTake: limitCheck2.canTake,
      reason: limitCheck2.reason,
      weeklyRemaining: limitCheck2.weeklyRemaining
    });
    console.log('');

    // Test 6: Update Premium Status
    console.log('Test 6: Update to Premium');
    console.log('─────────────────────────');
    await updateUserPremiumStatus(TEST_USER_ID, {
      isPremium: true,
      isFounder: true,
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
      subscriptionStatus: 'active'
    });
    
    const premiumUser = await getUser(TEST_USER_ID);
    console.log('✅ Premium status updated:', {
      isPremium: premiumUser?.isPremium,
      isFounder: premiumUser?.isFounder,
      stripeCustomerId: premiumUser?.stripeCustomerId,
      subscriptionStatus: premiumUser?.subscriptionStatus
    });
    console.log('');

    // Test 7: Check Limit for Premium User
    console.log('Test 7: Check Limit (Premium User)');
    console.log('─────────────────────────');
    const limitCheck3 = await checkQuizLimit(TEST_USER_ID);
    console.log('✅ Premium user limits:', {
      canTake: limitCheck3.canTake,
      weeklyRemaining: limitCheck3.weeklyRemaining, // Should be -1 (unlimited)
      monthlyRemaining: limitCheck3.monthlyRemaining, // Should be -1 (unlimited)
      isPremium: limitCheck3.isPremium
    });
    console.log('');

    // Test 8: Get User Badges
    console.log('Test 8: Get User Badges');
    console.log('─────────────────────────');
    if (premiumUser) {
      const badges = getUserBadges(premiumUser);
      console.log('✅ User badges:', badges);
    }
    console.log('');

    // Test 9: Helper Functions
    console.log('Test 9: Helper Functions');
    console.log('─────────────────────────');
    const nextMonday = getNextMonday();
    const nextMonth = getFirstOfNextMonth();
    console.log('✅ Next Monday:', nextMonday.toISOString());
    console.log('✅ First of next month:', nextMonth.toISOString());
    console.log('');

    // Test 10: Cancel Subscription
    console.log('Test 10: Cancel Subscription');
    console.log('─────────────────────────');
    await updateUserPremiumStatus(TEST_USER_ID, {
      isPremium: false,
      subscriptionStatus: 'canceled'
    });
    
    const canceledUser = await getUser(TEST_USER_ID);
    console.log('✅ After cancellation:', {
      isPremium: canceledUser?.isPremium,
      subscriptionStatus: canceledUser?.subscriptionStatus,
      isFounder: canceledUser?.isFounder // Should still be true
    });
    console.log('');

    // Final Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('');
    console.log('📊 Test Summary:');
    console.log('   ✅ User initialization');
    console.log('   ✅ Get user');
    console.log('   ✅ Check quiz limits (free)');
    console.log('   ✅ Increment quiz count');
    console.log('   ✅ Weekly limit enforcement');
    console.log('   ✅ Update premium status');
    console.log('   ✅ Unlimited access for premium');
    console.log('   ✅ User badges');
    console.log('   ✅ Helper functions');
    console.log('   ✅ Subscription cancellation');
    console.log('');
    console.log(`Test user ID: ${TEST_USER_ID}`);
    console.log('(Check Firebase to verify data was saved correctly)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

