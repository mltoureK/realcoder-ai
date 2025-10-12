import { doc, getDoc, updateDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

// Firestore collection and document structure
const CONFIG_COLLECTION = 'config';
const FOUNDER_TIER_DOC = 'founderTier';

export interface FounderTierConfig {
  totalSlots: number;
  claimedSlots: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
}

/**
 * Initialize the founder tier config in Firebase
 * This should be run once to set up the collection
 */
export async function initializeFounderTierConfig(): Promise<FounderTierConfig> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, FOUNDER_TIER_DOC);
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      console.log('✅ Founder tier config already exists');
      return configSnap.data() as FounderTierConfig;
    }

    // Create initial config
    const initialConfig: FounderTierConfig = {
      totalSlots: 100,
      claimedSlots: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(configRef, initialConfig);
    console.log('✅ Founder tier config initialized:', initialConfig);
    
    return initialConfig;
  } catch (error) {
    console.error('❌ Error initializing founder tier config:', error);
    throw error;
  }
}

/**
 * Get the current founder tier status
 * Returns information about available slots and whether it's active
 */
export async function getFounderTierStatus(): Promise<{
  available: boolean;
  slotsRemaining: number;
  totalSlots: number;
  claimedSlots: number;
  isActive: boolean;
}> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, FOUNDER_TIER_DOC);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      console.log('⚠️ Founder tier config not found, initializing...');
      const config = await initializeFounderTierConfig();
      
      return {
        available: config.isActive && config.claimedSlots < config.totalSlots,
        slotsRemaining: config.totalSlots - config.claimedSlots,
        totalSlots: config.totalSlots,
        claimedSlots: config.claimedSlots,
        isActive: config.isActive
      };
    }

    const config = configSnap.data() as FounderTierConfig;
    
    // Ensure numeric values are properly converted
    const totalSlots = Number(config.totalSlots) || 100;
    const claimedSlots = Number(config.claimedSlots) || 0;
    const slotsRemaining = totalSlots - claimedSlots;
    const available = config.isActive && slotsRemaining > 0;

    console.log('🔍 Firebase data:', {
      raw: config,
      converted: { totalSlots, claimedSlots, slotsRemaining, isActive: config.isActive }
    });

    return {
      available,
      slotsRemaining: Math.max(0, slotsRemaining),
      totalSlots,
      claimedSlots,
      isActive: config.isActive
    };
  } catch (error) {
    console.error('❌ Error getting founder tier status:', error);
    throw error;
  }
}

/**
 * Claim a founder slot for a user
 * This uses a Firebase transaction to ensure atomic updates and prevent race conditions
 * Automatically closes the founder tier when reaching 100 slots
 */
export async function claimFounderSlot(userId: string): Promise<{
  success: boolean;
  slotNumber?: number;
  message: string;
  slotsRemaining?: number;
}> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, FOUNDER_TIER_DOC);

    // Use a transaction to ensure atomic updates
    const result = await runTransaction(db, async (transaction) => {
      const configSnap = await transaction.get(configRef);

      if (!configSnap.exists()) {
        // Initialize if it doesn't exist
        console.log('⚠️ Founder tier config not found, initializing in transaction...');
        const initialConfig: FounderTierConfig = {
          totalSlots: 100,
          claimedSlots: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transaction.set(configRef, initialConfig);
        
        // Claim the first slot
        const updatedConfig: FounderTierConfig = {
          ...initialConfig,
          claimedSlots: 1,
          updatedAt: new Date().toISOString()
        };
        transaction.set(configRef, updatedConfig);
        
        return {
          success: true,
          slotNumber: 1,
          message: `🎉 Founder slot #1 claimed successfully!`,
          slotsRemaining: 99
        };
      }

      const config = configSnap.data() as FounderTierConfig;

      // Check if founder tier is still active
      if (!config.isActive) {
        return {
          success: false,
          message: '❌ Founder tier is no longer active'
        };
      }

      // Check if slots are available
      if (config.claimedSlots >= config.totalSlots) {
        return {
          success: false,
          message: '❌ All founder slots have been claimed'
        };
      }

      // Claim the slot
      const newClaimedSlots = config.claimedSlots + 1;
      const slotsRemaining = config.totalSlots - newClaimedSlots;
      
      // Auto-close when reaching 100 slots
      const shouldClose = newClaimedSlots >= config.totalSlots;
      
      const updates: Partial<FounderTierConfig> = {
        claimedSlots: newClaimedSlots,
        updatedAt: new Date().toISOString()
      };

      if (shouldClose) {
        updates.isActive = false;
        updates.closedAt = new Date().toISOString();
      }

      transaction.update(configRef, updates as any);

      const message = shouldClose
        ? `🎉 Founder slot #${newClaimedSlots} claimed! All 100 founder slots are now claimed. 🔒`
        : `🎉 Founder slot #${newClaimedSlots} claimed successfully!`;

      return {
        success: true,
        slotNumber: newClaimedSlots,
        message,
        slotsRemaining: Math.max(0, slotsRemaining)
      };
    });

    console.log(`\n🏆 FOUNDER SLOT CLAIMED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Slot Number: ${result.slotNumber || 'N/A'}`);
    console.log(`   Slots Remaining: ${result.slotsRemaining !== undefined ? result.slotsRemaining : 'N/A'}`);
    console.log(`   Message: ${result.message}`);

    return result;
  } catch (error) {
    console.error('❌ Error claiming founder slot:', error);
    throw error;
  }
}

/**
 * Manually close the founder tier
 * This can be used for testing or manual intervention
 */
export async function closeFounderTier(): Promise<void> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, FOUNDER_TIER_DOC);
    
    await updateDoc(configRef, {
      isActive: false,
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Founder tier manually closed');
  } catch (error) {
    console.error('❌ Error closing founder tier:', error);
    throw error;
  }
}

/**
 * Reopen the founder tier
 * This can be used for testing or if you want to add more slots
 */
export async function reopenFounderTier(): Promise<void> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, FOUNDER_TIER_DOC);
    
    await updateDoc(configRef, {
      isActive: true,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Founder tier reopened');
  } catch (error) {
    console.error('❌ Error reopening founder tier:', error);
    throw error;
  }
}

/**
 * Get founder tier statistics
 * Useful for admin dashboard or monitoring
 */
export async function getFounderTierStats(): Promise<{
  config: FounderTierConfig;
  percentageClaimed: number;
  isFull: boolean;
}> {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, FOUNDER_TIER_DOC);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      throw new Error('Founder tier config not found');
    }

    const config = configSnap.data() as FounderTierConfig;
    const percentageClaimed = (config.claimedSlots / config.totalSlots) * 100;
    const isFull = config.claimedSlots >= config.totalSlots;

    return {
      config,
      percentageClaimed: Math.round(percentageClaimed * 100) / 100,
      isFull
    };
  } catch (error) {
    console.error('❌ Error getting founder tier stats:', error);
    throw error;
  }
}

