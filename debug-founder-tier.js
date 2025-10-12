/**
 * Quick debug script to test founder tier connection
 * Run with: node debug-founder-tier.js
 */

// Simple test without TypeScript
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCBl_h4ZqtE_gc9b1g6dA5lnSfWFn9O94c",
  authDomain: "realcoder-ai.firebaseapp.com",
  projectId: "realcoder-ai",
  storageBucket: "realcoder-ai.firebasestorage.app",
  messagingSenderId: "288006974673",
  appId: "1:288006974673:web:7e21aea71bb5cc29ece9f0",
  measurementId: "G-SDZL6DXXS7"
};

async function debugFounderTier() {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase initialized');
    
    // Try to read the founder tier document
    const configRef = doc(db, 'config', 'founderTier');
    console.log('📄 Attempting to read config/founderTier...');
    
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const data = configSnap.data();
      console.log('✅ Document exists!');
      console.log('📊 Document data:', data);
      
      // Check each field
      console.log('\n🔍 Field analysis:');
      console.log(`  totalSlots: ${data.totalSlots} (type: ${typeof data.totalSlots})`);
      console.log(`  claimedSlots: ${data.claimedSlots} (type: ${typeof data.claimedSlots})`);
      console.log(`  isActive: ${data.isActive} (type: ${typeof data.isActive})`);
      console.log(`  createdAt: ${data.createdAt} (type: ${typeof data.createdAt})`);
      console.log(`  updatedAt: ${data.updatedAt} (type: ${typeof data.updatedAt})`);
      
      // Simulate the getFounderTierStatus logic
      const slotsRemaining = data.totalSlots - data.claimedSlots;
      const available = data.isActive && slotsRemaining > 0;
      
      console.log('\n🎯 Status calculation:');
      console.log(`  slotsRemaining: ${slotsRemaining}`);
      console.log(`  available: ${available}`);
      console.log(`  Component should show: ${available}`);
      
    } else {
      console.log('❌ Document does not exist!');
      console.log('💡 You need to create the config/founderTier document in Firebase Console');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message);
  }
}

debugFounderTier();
