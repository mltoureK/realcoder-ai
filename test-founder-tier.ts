/**
 * Test script for Founder Tier functionality
 * 
 * This script tests the founder tier counter system.
 * Run with: npx tsx test-founder-tier.ts
 */

import { 
  initializeFounderTierConfig,
  getFounderTierStatus,
  getFounderTierStats,
  claimFounderSlot,
  closeFounderTier,
  reopenFounderTier 
} from './src/lib/founder-tier';

async function runTests() {
  console.log('\n🧪 Testing Founder Tier System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Initialize config
    console.log('\n📋 Test 1: Initialize Founder Tier Config');
    console.log('-' .repeat(60));
    const config = await initializeFounderTierConfig();
    console.log('✅ Config initialized:', config);

    // Test 2: Get status
    console.log('\n📊 Test 2: Get Founder Tier Status');
    console.log('-' .repeat(60));
    const status = await getFounderTierStatus();
    console.log('✅ Status:', status);

    // Test 3: Claim a slot
    console.log('\n🏆 Test 3: Claim Founder Slot');
    console.log('-' .repeat(60));
    const claimResult = await claimFounderSlot('test-user-1');
    console.log('✅ Claim result:', claimResult);

    // Test 4: Get updated status
    console.log('\n📊 Test 4: Get Updated Status');
    console.log('-' .repeat(60));
    const updatedStatus = await getFounderTierStatus();
    console.log('✅ Updated status:', updatedStatus);

    // Test 5: Get detailed stats
    console.log('\n📈 Test 5: Get Detailed Stats');
    console.log('-' .repeat(60));
    const stats = await getFounderTierStats();
    console.log('✅ Stats:', {
      claimedSlots: stats.config.claimedSlots,
      totalSlots: stats.config.totalSlots,
      percentageClaimed: `${stats.percentageClaimed}%`,
      isFull: stats.isFull,
      isActive: stats.config.isActive
    });

    // Test 6: Try claiming another slot
    console.log('\n🏆 Test 6: Claim Another Slot');
    console.log('-' .repeat(60));
    const claimResult2 = await claimFounderSlot('test-user-2');
    console.log('✅ Claim result:', claimResult2);

    // Test 7: Manual close
    console.log('\n🔒 Test 7: Manually Close Founder Tier');
    console.log('-' .repeat(60));
    await closeFounderTier();
    console.log('✅ Founder tier closed');

    // Test 8: Try claiming when closed
    console.log('\n🚫 Test 8: Try Claiming When Closed');
    console.log('-' .repeat(60));
    const claimResult3 = await claimFounderSlot('test-user-3');
    console.log(claimResult3.success ? '❌ Should have failed' : '✅ Correctly rejected:', claimResult3.message);

    // Test 9: Reopen
    console.log('\n🔓 Test 9: Reopen Founder Tier');
    console.log('-' .repeat(60));
    await reopenFounderTier();
    console.log('✅ Founder tier reopened');

    // Test 10: Final status
    console.log('\n📊 Test 10: Final Status');
    console.log('-' .repeat(60));
    const finalStatus = await getFounderTierStatus();
    console.log('✅ Final status:', finalStatus);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('=' .repeat(60) + '\n');

    console.log('\n📝 Summary:');
    console.log(`   Total Slots: ${finalStatus.totalSlots}`);
    console.log(`   Claimed Slots: ${finalStatus.claimedSlots}`);
    console.log(`   Slots Remaining: ${finalStatus.slotsRemaining}`);
    console.log(`   Is Active: ${finalStatus.isActive}`);
    console.log(`   Available for Purchase: ${finalStatus.available}`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Test with actual Stripe checkout');
    console.log('   2. Verify webhook integration');
    console.log('   3. Monitor claimedSlots in Firebase Console');
    console.log('   4. Test auto-close at 100 slots\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('   Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Stack trace:', error instanceof Error ? error.stack : 'N/A');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting Founder Tier Tests...\n');
  console.log('⚠️  Note: This will modify your Firebase database.');
  console.log('   Make sure you\'re using a test environment!\n');
  
  runTests()
    .then(() => {
      console.log('✅ Test suite finished successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };

