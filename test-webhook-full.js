#!/usr/bin/env node
// Full end-to-end test for Stripe webhooks
// Run with: node test-webhook-full.js

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testCheckoutFlow() {
  console.log('\n🧪 Stripe Webhook Full Integration Test\n');
  console.log('This script will guide you through testing the complete webhook flow.\n');

  // Check prerequisites
  console.log('📋 Prerequisites Checklist:');
  console.log('  1. Next.js dev server running (npm run dev)');
  console.log('  2. Stripe CLI installed (brew install stripe/stripe-cli/stripe)');
  console.log('  3. Stripe CLI authenticated (stripe login)');
  console.log('  4. Webhook forwarding active (stripe listen --forward-to localhost:3000/api/stripe-webhook)');
  console.log('  5. STRIPE_WEBHOOK_SECRET in .env.local\n');

  const ready = await prompt('Are all prerequisites ready? (yes/no): ');
  if (ready.toLowerCase() !== 'yes' && ready.toLowerCase() !== 'y') {
    console.log('\n❌ Please complete prerequisites first. See WEBHOOK_TESTING_GUIDE.md for help.\n');
    rl.close();
    return;
  }

  // Step 1: Create test user ID
  console.log('\n\n📝 Step 1: Test User Setup');
  console.log('─────────────────────────────');
  const defaultUserId = `test-user-${Date.now()}`;
  const userId = await prompt(`Enter test user ID (default: ${defaultUserId}): `) || defaultUserId;
  const defaultEmail = 'test@example.com';
  const userEmail = await prompt(`Enter test user email (default: ${defaultEmail}): `) || defaultEmail;
  
  console.log(`\n✅ Test user: ${userId}`);
  console.log(`✅ Test email: ${userEmail}`);

  // Step 2: Create checkout session
  console.log('\n\n💳 Step 2: Create Checkout Session');
  console.log('────────────────────────────────────');
  console.log('Creating checkout session...\n');

  const checkoutUrl = 'http://localhost:3000/api/create-checkout-session';
  
  console.log('Run this curl command in a new terminal:\n');
  console.log(`curl -X POST ${checkoutUrl} \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify({
    userId: userId,
    userEmail: userEmail,
    isFounder: true
  }, null, 2)}'`);
  
  console.log('\n\nOr use this fetch command in your browser console:\n');
  console.log(`fetch('${checkoutUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '${userId}',
    userEmail: '${userEmail}',
    isFounder: true
  })
})
.then(r => r.json())
.then(data => {
  console.log('Checkout URL:', data.url);
  window.open(data.url, '_blank');
});`);

  await prompt('\n\nPress Enter after you\'ve created the checkout session...');

  // Step 3: Complete checkout
  console.log('\n\n🎯 Step 3: Complete Test Checkout');
  console.log('───────────────────────────────────');
  console.log('Use Stripe test card details:');
  console.log('  Card number: 4242 4242 4242 4242');
  console.log('  Expiry: Any future date (e.g., 12/25)');
  console.log('  CVC: Any 3 digits (e.g., 123)');
  console.log('  ZIP: Any 5 digits (e.g., 12345)\n');

  await prompt('Complete the checkout and press Enter when done...');

  // Step 4: Verify webhook
  console.log('\n\n🔔 Step 4: Verify Webhook Reception');
  console.log('─────────────────────────────────────');
  console.log('Check your terminal running "stripe listen"');
  console.log('You should see:');
  console.log('  --> checkout.session.completed [evt_xxx]');
  console.log('  <-- [200] POST http://localhost:3000/api/stripe-webhook [evt_xxx]\n');

  const webhookReceived = await prompt('Did you see the webhook event? (yes/no): ');
  
  if (webhookReceived.toLowerCase() === 'yes' || webhookReceived.toLowerCase() === 'y') {
    console.log('✅ Webhook received successfully!');
  } else {
    console.log('❌ Webhook not received. Check:');
    console.log('  1. Is "stripe listen" running?');
    console.log('  2. Is the Next.js dev server running?');
    console.log('  3. Check server logs for errors');
  }

  // Step 5: Verify Firebase
  console.log('\n\n🔥 Step 5: Verify Firebase Update');
  console.log('──────────────────────────────────');
  console.log(`Check Firebase for user: ${userId}`);
  console.log('Expected fields:');
  console.log('  ✓ isPremium: true');
  console.log('  ✓ isFounder: true');
  console.log('  ✓ stripeCustomerId: cus_xxx');
  console.log('  ✓ stripeSubscriptionId: sub_xxx');
  console.log('  ✓ subscriptionStatus: "active"');
  console.log('  ✓ updatedAt: [timestamp]\n');

  const firebaseVerified = await prompt('Firebase updated correctly? (yes/no): ');
  
  if (firebaseVerified.toLowerCase() === 'yes' || firebaseVerified.toLowerCase() === 'y') {
    console.log('✅ Firebase updated successfully!');
  } else {
    console.log('❌ Firebase not updated. Check:');
    console.log('  1. User document exists in Firestore');
    console.log('  2. Firebase initialization is correct');
    console.log('  3. Check webhook route logs for errors');
  }

  // Step 6: Test cancellation
  console.log('\n\n🚫 Step 6: Test Subscription Cancellation');
  console.log('───────────────────────────────────────────');
  
  const testCancellation = await prompt('Test subscription cancellation? (yes/no): ');
  
  if (testCancellation.toLowerCase() === 'yes' || testCancellation.toLowerCase() === 'y') {
    console.log('\nTo cancel subscription:');
    console.log('1. Go to: https://dashboard.stripe.com/test/customers');
    console.log(`2. Search for: ${userEmail}`);
    console.log('3. Click on the customer');
    console.log('4. Click on their subscription');
    console.log('5. Click "Cancel subscription"');
    console.log('6. Choose "Cancel immediately"\n');
    
    await prompt('Press Enter after canceling the subscription...');
    
    console.log('\n🔔 Verify cancellation webhook:');
    console.log('  --> customer.subscription.deleted [evt_xxx]');
    console.log('  <-- [200] POST http://localhost:3000/api/stripe-webhook [evt_xxx]\n');
    
    console.log('🔥 Verify Firebase update:');
    console.log('  ✓ isPremium: false');
    console.log('  ✓ subscriptionStatus: "canceled"\n');
    
    await prompt('Press Enter when verified...');
    console.log('✅ Cancellation test complete!');
  }

  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('════════════════');
  console.log('✅ Checkout session created');
  console.log(`${webhookReceived.toLowerCase() === 'yes' || webhookReceived.toLowerCase() === 'y' ? '✅' : '❌'} Webhook received`);
  console.log(`${firebaseVerified.toLowerCase() === 'yes' || firebaseVerified.toLowerCase() === 'y' ? '✅' : '❌'} Firebase updated`);
  console.log(`${testCancellation.toLowerCase() === 'yes' || testCancellation.toLowerCase() === 'y' ? '✅' : '⏭️ '} Cancellation tested`);
  
  console.log('\n\n🎉 Test complete!');
  console.log('\nNext steps:');
  console.log('  1. Test with additional users');
  console.log('  2. Test edge cases (network failures, invalid data)');
  console.log('  3. Review WEBHOOK_TESTING_GUIDE.md for production setup');
  console.log('  4. Set up monitoring for webhook events\n');

  rl.close();
}

testCheckoutFlow().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});

