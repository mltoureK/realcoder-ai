// Quick script to check your premium status in Firebase
// Run: node check-user-premium.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // Make sure you have this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserPremiumStatus(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found in Firebase');
      return;
    }
    
    const userData = userDoc.data();
    console.log('\n📊 Your User Document:');
    console.log('===================================');
    console.log('Email:', userData.email);
    console.log('Name:', userData.name);
    console.log('isPremium:', userData.isPremium);
    console.log('isFounder:', userData.isFounder);
    console.log('subscriptionStatus:', userData.subscriptionStatus);
    console.log('stripeCustomerId:', userData.stripeCustomerId);
    console.log('stripeSubscriptionId:', userData.stripeSubscriptionId);
    console.log('updatedAt:', userData.updatedAt);
    console.log('===================================\n');
    
    if (userData.isPremium) {
      console.log('✅ You ARE marked as premium in Firebase!');
    } else {
      console.log('❌ You are NOT marked as premium in Firebase');
      console.log('   This means the Stripe webhook did not update your account');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

// Replace with YOUR Firebase User ID
const YOUR_USER_ID = process.argv[2];

if (!YOUR_USER_ID) {
  console.log('Usage: node check-user-premium.js <your-user-id>');
  console.log('\nTo find your user ID:');
  console.log('1. Open browser console on your app');
  console.log('2. Run: firebase.auth().currentUser.uid');
  process.exit(1);
}

checkUserPremiumStatus(YOUR_USER_ID);

