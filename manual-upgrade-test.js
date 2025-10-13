// Manual script to upgrade a user to premium (bypass Stripe)
// Use this ONLY for testing if webhook isn't working
// Run: node manual-upgrade-test.js <your-user-id>

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function upgradeToPremium(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('\n📊 BEFORE:');
    console.log('isPremium:', userDoc.data().isPremium);
    console.log('isFounder:', userDoc.data().isFounder);
    
    // Update to premium
    await userRef.update({
      isPremium: true,
      isFounder: true, // Set to false if you want regular premium
      subscriptionStatus: 'active',
      updatedAt: new Date().toISOString()
    });
    
    console.log('\n✅ UPDATED!');
    
    // Verify
    const updated = await userRef.get();
    console.log('\n📊 AFTER:');
    console.log('isPremium:', updated.data().isPremium);
    console.log('isFounder:', updated.data().isFounder);
    console.log('subscriptionStatus:', updated.data().subscriptionStatus);
    
    console.log('\n✅ Done! Refresh your app and you should have unlimited access.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node manual-upgrade-test.js <your-user-id>');
  console.log('\nGet your user ID from browser console:');
  console.log('  firebase.auth().currentUser.uid');
  process.exit(1);
}

upgradeToPremium(userId);

