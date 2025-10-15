# 🚀 Task 6 Quick Start Guide

## ✅ What's Complete

Task 6: Founder Tier Counter is **100% COMPLETE** and ready for testing!

## 🎯 Quick Setup (5 minutes)

### Step 1: Create Firebase Collection
1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to Firestore Database
3. Create collection: `config`
4. Create document: `founderTier`
5. Add these fields:
   ```
   totalSlots: 100 (number)
   claimedSlots: 0 (number)
   isActive: true (boolean)
   createdAt: "2025-10-12T00:00:00.000Z" (string)
   updatedAt: "2025-10-12T00:00:00.000Z" (string)
   ```

### Step 2: Test It
```bash
# Run the test script
npx tsx test-founder-tier.ts
```

### Step 3: Test with Stripe
```bash
# Make sure Stripe CLI is running
stripe listen --forward-to localhost:3000/api/stripe-webhook

# In another terminal
npm run dev

# Then make a test founder purchase in your app
```

## 📊 What Happens Now

When someone buys the Founder tier:

```
1. Payment processes via Stripe ✓
2. Webhook fires: checkout.session.completed
3. User gets isPremium: true, isFounder: true
4. Founder slot is automatically claimed
5. claimedSlots increments: 0 → 1 → 2 → ... → 100
6. At slot 100, isActive automatically becomes false
7. Console logs show: "🎉 Founder slot #[X] claimed!"
```

## 🔍 How to Monitor

### Firebase Console
- Go to `config/founderTier`
- Watch `claimedSlots` increment with each purchase

### Your Terminal
Watch for logs like:
```
🏆 FOUNDER SLOT CLAIMED
   User ID: user_123
   Slot Number: 45
   Slots Remaining: 55
```

## 🎉 That's It!

The system is fully automated. No manual intervention needed!

## 📚 Full Docs
- **Setup Guide:** `FOUNDER_TIER_SETUP.md`
- **Complete Details:** `TASK_6_COMPLETE.md`
- **Test Script:** `test-founder-tier.ts`

---

**Ready to test?** Just create the Firebase document and make a test purchase! 🚀

