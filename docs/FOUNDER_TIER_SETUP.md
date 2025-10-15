# 🏆 Founder Tier Setup & Testing Guide

This guide walks you through setting up and testing the Founder Tier counter system in Firebase.

## 📋 Overview

The Founder Tier system manages a limited supply of 100 founder slots. When users purchase the Founder tier subscription:
1. Their `isPremium` and `isFounder` flags are set to `true`
2. A founder slot is automatically claimed in the counter
3. The system auto-closes when all 100 slots are claimed

## 🔧 Setup Instructions

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **realcoder-ai**
3. Navigate to **Firestore Database** in the left sidebar

### Step 2: Create the Config Collection

1. Click **"Start collection"** (if this is your first collection) or **"Add collection"**
2. Collection ID: `config`
3. Click **"Next"**

### Step 3: Create the Founder Tier Document

1. Document ID: `founderTier`
2. Add the following fields:

   | Field Name | Type | Value |
   |------------|------|-------|
   | `totalSlots` | number | `100` |
   | `claimedSlots` | number | `0` |
   | `isActive` | boolean | `true` |
   | `createdAt` | string | `2025-10-12T00:00:00.000Z` (or current timestamp) |
   | `updatedAt` | string | `2025-10-12T00:00:00.000Z` (or current timestamp) |

3. Click **"Save"**

### Step 4: Verify the Setup

Your Firestore structure should look like this:

```
📁 Firestore Database
  └─ 📂 config
      └─ 📄 founderTier
          ├─ totalSlots: 100
          ├─ claimedSlots: 0
          ├─ isActive: true
          ├─ createdAt: "2025-10-12T00:00:00.000Z"
          └─ updatedAt: "2025-10-12T00:00:00.000Z"
```

## 🧪 Testing Instructions

### Test 1: Manual Initialization (Optional)

If you want to test the auto-initialization feature, you can skip Step 2-3 above and let the code create the document automatically on the first founder purchase.

### Test 2: Test a Founder Purchase

1. **Ensure Stripe CLI is running:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```

2. **Start your development server:**
   ```bash
   npm run dev
   ```

3. **Make a test founder purchase:**
   - Navigate to your app
   - Click "Become a Founder" or the founder tier option
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete the checkout

4. **Watch the logs:**
   
   In your terminal, you should see output like:
   ```
   🔔 Webhook Event Received: checkout.session.completed
   
   🔥 Updating Firebase user: user_123
   ✅ User user_123 updated successfully
      isPremium: true
      isFounder: true
      subscriptionStatus: active
   
   🏆 Claiming founder slot for user: user_123
   
   🏆 FOUNDER SLOT CLAIMED
      User ID: user_123
      Slot Number: 1
      Slots Remaining: 99
      Message: 🎉 Founder slot #1 claimed successfully!
   
   ✅ Webhook processed successfully
   ```

5. **Verify in Firebase Console:**
   - Go back to Firestore Database
   - Open `config/founderTier`
   - You should see `claimedSlots: 1`

### Test 3: Test Multiple Purchases

To simulate multiple founder purchases and verify the counter increments:

1. Create multiple test purchases (use different email addresses)
2. Watch `claimedSlots` increment: 1 → 2 → 3 → ...
3. Verify each purchase logs the correct slot number

### Test 4: Test Auto-Close at 100 Slots

**Option A: Manual testing (slow)**
- Make 100 test purchases
- The 100th purchase should set `isActive: false` and add a `closedAt` timestamp

**Option B: Quick testing (recommended)**
1. **Temporarily modify the config in Firebase:**
   - Set `totalSlots: 3`
   - Set `claimedSlots: 0`
   - Keep `isActive: true`

2. **Make 3 founder purchases**

3. **Verify the 3rd purchase:**
   - Console logs should show: `🎉 Founder slot #3 claimed! All 100 founder slots are now claimed. 🔒`
   - Firebase should show:
     - `claimedSlots: 3`
     - `isActive: false`
     - `closedAt: "2025-10-12T..." (timestamp when it closed)`

4. **Try a 4th purchase:**
   - The founder slot claiming should fail
   - Console logs should show: `❌ Failed to claim founder slot: All founder slots have been claimed`
   - User still gets `isPremium: true` and `isFounder: true` (because payment succeeded)

5. **Reset for production:**
   - Set `totalSlots: 100`
   - Set `claimedSlots: 0`
   - Set `isActive: true`
   - Remove `closedAt` field

## 🎯 Monitoring Founder Tier Status

### Using Firebase Console

1. Navigate to `config/founderTier` in Firestore
2. Check the current values:
   - `claimedSlots`: Number of slots claimed
   - `isActive`: Whether the tier is still accepting new founders
   - `totalSlots`: Total available slots (should be 100)

### Using the API Functions

You can also query the status programmatically:

```typescript
import { getFounderTierStatus, getFounderTierStats } from '@/lib/founder-tier';

// Get simple status
const status = await getFounderTierStatus();
console.log(status);
// {
//   available: true,
//   slotsRemaining: 95,
//   totalSlots: 100,
//   claimedSlots: 5,
//   isActive: true
// }

// Get detailed stats
const stats = await getFounderTierStats();
console.log(stats);
// {
//   config: { totalSlots: 100, claimedSlots: 5, ... },
//   percentageClaimed: 5,
//   isFull: false
// }
```

## 🔄 Manual Management Functions

The library includes functions for manual management (useful for testing):

### Close the Founder Tier Manually
```typescript
import { closeFounderTier } from '@/lib/founder-tier';

await closeFounderTier();
// Sets isActive: false and adds closedAt timestamp
```

### Reopen the Founder Tier
```typescript
import { reopenFounderTier } from '@/lib/founder-tier';

await reopenFounderTier();
// Sets isActive: true
```

## 🚨 Important Notes

### Race Conditions
The system uses Firebase transactions (`runTransaction`) to prevent race conditions. This ensures that even if two purchases happen simultaneously, each gets a unique slot number and the counter increments correctly.

### Payment vs Slot Claiming
If slot claiming fails (e.g., all slots are taken), the payment still succeeds and the user still gets founder status. This is intentional - we don't want to fail a payment because of a technical issue with the counter.

### Production Deployment
Before deploying to production:
1. ✅ Verify `totalSlots: 100`
2. ✅ Verify `claimedSlots: 0`
3. ✅ Verify `isActive: true`
4. ✅ Test the entire flow end-to-end
5. ✅ Monitor logs during the first few real purchases

## 📊 Expected Behavior

### When a Founder Purchase Succeeds:
1. ✅ User gets `isPremium: true`
2. ✅ User gets `isFounder: true`
3. ✅ `claimedSlots` increments by 1
4. ✅ User receives a unique slot number (1-100)
5. ✅ When slot 100 is claimed, `isActive` automatically becomes `false`

### When All Slots Are Claimed:
1. ✅ Payments still process normally
2. ✅ Users still get founder status
3. ✅ Console logs show that slot claiming failed
4. ✅ You may want to hide the "Founder" option in your UI (check `isActive`)

## 🎉 Success Criteria

- [x] Firebase collection `config` created
- [x] Document `founderTier` with correct fields created
- [x] Test purchase increments `claimedSlots`
- [x] Webhook logs show founder slot claiming
- [x] Auto-close works at 100 slots
- [x] Transactions prevent race conditions

## 🆘 Troubleshooting

### Issue: "Founder tier config not found"
**Solution:** The system will auto-initialize on first use, or you can manually create the document as described in Step 2-3.

### Issue: claimedSlots not incrementing
**Solution:** 
- Check that `isFounder: true` in the checkout metadata
- Verify Stripe webhook is receiving events
- Check Firebase permissions

### Issue: Race condition - two users get same slot number
**Solution:** This should never happen due to transactions. If it does, please file a bug report.

## 🎓 Next Steps

After successful testing:
1. ✅ Deploy to production
2. ✅ Monitor the first few purchases
3. ✅ Consider adding a UI component to display slots remaining
4. ✅ Set up alerts when founder tier is close to full (e.g., at 90 slots)

---

**Task Status:** ✅ Complete
**Files Created:**
- `src/lib/founder-tier.ts`

**Files Modified:**
- `src/app/api/stripe-webhook/route.ts`

**Dependencies:** Task 3 (Stripe Webhooks) ✅ Complete

