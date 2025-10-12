// Test script to trigger Stripe webhook events locally
// Run with: node test-webhook-trigger.js

// This script uses the Stripe CLI to trigger test events
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function triggerWebhook(eventType) {
  console.log(`\n🔔 Triggering ${eventType} event...`);
  
  try {
    const { stdout, stderr } = await execPromise(`stripe trigger ${eventType}`);
    
    if (stderr && !stderr.includes('Ready!')) {
      console.error('❌ Error:', stderr);
    }
    
    if (stdout) {
      console.log('✅ Event triggered successfully!');
      console.log(stdout);
    }
  } catch (error) {
    console.error('❌ Failed to trigger event:', error.message);
  }
}

async function main() {
  console.log('🧪 Stripe Webhook Testing Script\n');
  console.log('This will trigger test webhook events to your local server.');
  console.log('Make sure you have:');
  console.log('  1. Next.js dev server running (npm run dev)');
  console.log('  2. Stripe webhook forwarding active (stripe listen)\n');
  
  const eventType = process.argv[2];
  
  if (!eventType) {
    console.log('Available test events:');
    console.log('  • checkout.session.completed');
    console.log('  • customer.subscription.deleted');
    console.log('  • customer.subscription.updated');
    console.log('\nUsage: node test-webhook-trigger.js <event-type>');
    console.log('Example: node test-webhook-trigger.js checkout.session.completed');
    process.exit(0);
  }
  
  await triggerWebhook(eventType);
}

main();

