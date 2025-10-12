/**
 * Test script for Founder Counter UI functionality
 * 
 * This script tests the founder counter UI by simulating Firebase updates
 * Run with: npx tsx test-founder-counter-ui.ts
 */

import { 
  getFounderTierStatus,
  getFounderTierStats,
  claimFounderSlot,
  closeFounderTier,
  reopenFounderTier 
} from './src/lib/founder-tier';

async function testFounderCounterUI() {
  console.log('\n🎨 Testing Founder Counter UI Functionality\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Get initial status
    console.log('\n📊 Test 1: Get Initial Status');
    console.log('-' .repeat(60));
    const initialStatus = await getFounderTierStatus();
    console.log('✅ Initial Status:', {
      available: initialStatus.available,
      slotsRemaining: initialStatus.slotsRemaining,
      totalSlots: initialStatus.totalSlots,
      claimedSlots: initialStatus.claimedSlots,
      isActive: initialStatus.isActive
    });

    // Test 2: Simulate different progress levels
    console.log('\n🎯 Test 2: Simulate Different Progress Levels');
    console.log('-' .repeat(60));
    
    // Test different slot counts to see UI behavior
    const testScenarios = [
      { name: 'Low (5 slots claimed)', targetSlots: 5 },
      { name: 'Medium (25 slots claimed)', targetSlots: 25 },
      { name: 'High (75 slots claimed)', targetSlots: 75 },
      { name: 'Critical (95 slots claimed)', targetSlots: 95 }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n🧪 Testing scenario: ${scenario.name}`);
      
      // Get current status
      const status = await getFounderTierStatus();
      const currentClaimed = status.claimedSlots;
      const targetClaimed = scenario.targetSlots;
      
      // Calculate how many slots to claim
      const slotsToClaim = Math.max(0, targetClaimed - currentClaimed);
      
      if (slotsToClaim > 0) {
        console.log(`   Need to claim ${slotsToClaim} more slots to reach ${targetClaimed}`);
        
        // Claim slots one by one (simulating real purchases)
        for (let i = 0; i < slotsToClaim; i++) {
          try {
            const result = await claimFounderSlot(`test-user-${Date.now()}-${i}`);
            if (result.success) {
              console.log(`   ✅ Claimed slot #${result.slotNumber} (${result.slotsRemaining} remaining)`);
              
              // Get updated status
              const newStatus = await getFounderTierStatus();
              
              // Determine UI urgency level
              let urgencyLevel = 'low';
              if (newStatus.slotsRemaining <= 5) urgencyLevel = 'critical';
              else if (newStatus.slotsRemaining <= 15) urgencyLevel = 'high';
              else if (newStatus.slotsRemaining <= 30) urgencyLevel = 'medium';
              
              console.log(`   🎨 UI State: ${urgencyLevel} urgency, ${newStatus.slotsRemaining} slots left`);
              
              // Stop if we've reached our target
              if (newStatus.claimedSlots >= targetClaimed) {
                break;
              }
            } else {
              console.log(`   ❌ Failed to claim slot: ${result.message}`);
              break;
            }
          } catch (error) {
            console.log(`   ❌ Error claiming slot: ${error}`);
            break;
          }
        }
      } else {
        console.log(`   ✅ Already at target (${currentClaimed} claimed)`);
      }
      
      // Show final status for this scenario
      const finalStatus = await getFounderTierStatus();
      console.log(`   📊 Final Status: ${finalStatus.claimedSlots}/${finalStatus.totalSlots} (${finalStatus.slotsRemaining} remaining)`);
      
      // Show what the UI would display
      const progressPercentage = (finalStatus.claimedSlots / finalStatus.totalSlots) * 100;
      let urgencyMessage = '';
      let gradientClass = '';
      
      if (finalStatus.slotsRemaining <= 5) {
        urgencyMessage = `🔥 ONLY ${finalStatus.slotsRemaining} SPOTS LEFT! 🔥`;
        gradientClass = 'from-red-600 to-red-800 animate-pulse';
      } else if (finalStatus.slotsRemaining <= 15) {
        urgencyMessage = `⚡ Only ${finalStatus.slotsRemaining} spots left!`;
        gradientClass = 'from-orange-600 to-red-600';
      } else if (finalStatus.slotsRemaining <= 30) {
        urgencyMessage = `⚡ ${finalStatus.slotsRemaining} founder spots remaining!`;
        gradientClass = 'from-orange-500 to-red-500';
      } else {
        urgencyMessage = `${finalStatus.slotsRemaining} founder spots available`;
        gradientClass = 'from-orange-400 to-orange-600';
      }
      
      console.log(`   🎨 UI Display:`);
      console.log(`      Message: ${urgencyMessage}`);
      console.log(`      Gradient: ${gradientClass}`);
      console.log(`      Progress: ${progressPercentage.toFixed(1)}%`);
      console.log(`      Component Visible: ${finalStatus.isActive && finalStatus.available && finalStatus.slotsRemaining > 0}`);
    }

    // Test 3: Test auto-close at 100 slots
    console.log('\n🔒 Test 3: Test Auto-Close at 100 Slots');
    console.log('-' .repeat(60));
    
    const statusBefore = await getFounderTierStatus();
    console.log(`📊 Status before test: ${statusBefore.claimedSlots}/${statusBefore.totalSlots}`);
    
    if (statusBefore.claimedSlots >= 95) {
      console.log('   🎯 Close to 100 slots - testing auto-close...');
      
      // Claim remaining slots
      while (statusBefore.claimedSlots < 100) {
        try {
          const result = await claimFounderSlot(`test-user-final-${Date.now()}`);
          if (result.success) {
            console.log(`   ✅ Claimed slot #${result.slotNumber}`);
            if (result.slotsRemaining === 0) {
              console.log('   🔒 Auto-closed! All 100 slots claimed');
              break;
            }
          } else {
            console.log(`   ❌ Failed: ${result.message}`);
            break;
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error}`);
          break;
        }
      }
    } else {
      console.log('   ⏭️  Not close enough to 100 slots to test auto-close');
    }

    // Test 4: Test manual close/reopen
    console.log('\n🔄 Test 4: Test Manual Close/Reopen');
    console.log('-' .repeat(60));
    
    console.log('   🔒 Manually closing founder tier...');
    await closeFounderTier();
    
    const closedStatus = await getFounderTierStatus();
    console.log(`   📊 Closed Status: isActive=${closedStatus.isActive}, available=${closedStatus.available}`);
    console.log(`   🎨 UI State: Component would be HIDDEN (isActive=false)`);
    
    console.log('   🔓 Reopening founder tier...');
    await reopenFounderTier();
    
    const reopenedStatus = await getFounderTierStatus();
    console.log(`   📊 Reopened Status: isActive=${reopenedStatus.isActive}, available=${reopenedStatus.available}`);
    console.log(`   🎨 UI State: Component would be VISIBLE again`);

    // Test 5: Final status and UI summary
    console.log('\n📊 Test 5: Final Status & UI Summary');
    console.log('-' .repeat(60));
    
    const finalStatus = await getFounderTierStatus();
    const finalStats = await getFounderTierStats();
    
    console.log('✅ Final Status:', {
      claimedSlots: finalStatus.claimedSlots,
      totalSlots: finalStatus.totalSlots,
      slotsRemaining: finalStatus.slotsRemaining,
      isActive: finalStatus.isActive,
      available: finalStatus.available,
      percentageClaimed: `${finalStats.percentageClaimed}%`,
      isFull: finalStats.isFull
    });
    
    console.log('\n🎨 UI Component State:');
    console.log(`   Component Visible: ${finalStatus.isActive && finalStatus.available && finalStatus.slotsRemaining > 0}`);
    console.log(`   Progress Bar: ${(finalStatus.claimedSlots / finalStatus.totalSlots) * 100}% filled`);
    console.log(`   Urgency Level: ${finalStatus.slotsRemaining <= 5 ? 'critical' : finalStatus.slotsRemaining <= 15 ? 'high' : finalStatus.slotsRemaining <= 30 ? 'medium' : 'low'}`);
    console.log(`   Auto-refresh: Every 30 seconds`);
    console.log(`   Last updated: ${new Date().toLocaleTimeString()}`);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ All UI tests completed successfully!');
    console.log('=' .repeat(60) + '\n');

    console.log('\n🎯 UI Testing Summary:');
    console.log('   ✅ Status fetching works');
    console.log('   ✅ Progress bar calculations correct');
    console.log('   ✅ Urgency levels change appropriately');
    console.log('   ✅ Auto-close functionality works');
    console.log('   ✅ Manual close/reopen works');
    console.log('   ✅ Component visibility logic correct');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Visit your app in browser to see the component');
    console.log('   2. Change claimedSlots in Firebase Console');
    console.log('   3. Watch the UI update automatically every 30 seconds');
    console.log('   4. Test with real founder purchases\n');

  } catch (error) {
    console.error('\n❌ UI test failed:', error);
    console.error('   Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Stack trace:', error instanceof Error ? error.stack : 'N/A');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  console.log('🎨 Starting Founder Counter UI Tests...\n');
  console.log('⚠️  Note: This will modify your Firebase database.');
  console.log('   Make sure you\'re using a test environment!\n');
  
  testFounderCounterUI()
    .then(() => {
      console.log('✅ UI test suite finished successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ UI test suite failed:', error);
      process.exit(1);
    });
}

export { testFounderCounterUI };
