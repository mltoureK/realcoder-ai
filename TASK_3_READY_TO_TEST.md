# ✅ Task 3: Stripe Webhooks - READY TO TEST!

## 🎉 Setup Complete!

All setup tasks are complete and verified:

- ✅ Stripe CLI installed
- ✅ Stripe CLI authenticated (account: acct_1LHfVSD6l0yPpU4i)
- ✅ Webhook secret generated and saved to `.env.local`
- ✅ Webhook secret: `whsec_9285d8078d780f664cd32d92e61613628f0cceb9cd12517a8339d73e5abf9672`
- ✅ Webhook route created: `src/app/api/stripe-webhook/route.ts`
- ✅ Handles `checkout.session.completed` event ✅
- ✅ Handles `customer.subscription.deleted` event ✅
- ✅ Updates `isPremium` and `isFounder` in Firebase ✅

## 🧪 Testing Instructions

### Step 1: Start Dev Server & Webhook Listener

Open **TWO terminal windows**:

**Terminal 1 - Dev Server:**
```bash
npm run dev
```

**Terminal 2 - Webhook Listener:**
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

You should see:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

### Step 2: Run the Test Script

In **Terminal 3**, run:
```bash
./quick-test-webhook.sh
```

Or manually test:
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-'$(date +%s)'",
    "userEmail": "test@example.com",
    "isFounder": true
  }'
```

### Step 3: Complete the Checkout

1. Copy the `url` from the response
2. Open it in your browser
3. Use test card: `4242 4242 4242 4242`
4. Expiry: `12/25`
5. CVC: `123`
6. Complete the payment

### Step 4: Verify Webhook Received

In **Terminal 2** (stripe listen), you should see:
```
--> checkout.session.completed [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe-webhook
```

In **Terminal 1** (dev server), you should see detailed logs:
```
🔔 Webhook Event Received: checkout.session.completed
   Event ID: evt_xxx
   
💳 Checkout Session Completed
   Session ID: cs_xxx
   User ID: test-user-xxx
   Is Founder: true
   
🔥 Updating Firebase user: test-user-xxx

✅ User test-user-xxx updated successfully
   isPremium: true
   isFounder: true
   subscriptionStatus: active
```

### Step 5: Verify Firebase

Check Firebase Console for the user document. Should have:
```json
{
  "isPremium": true,
  "isFounder": true,
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx",
  "subscriptionStatus": "active",
  "updatedAt": "2025-10-12T..."
}
```

### Step 6: Test Subscription Cancellation (Optional)

1. Go to https://dashboard.stripe.com/test/customers
2. Find your test customer by email
3. Click on the subscription
4. Click "Cancel subscription" → "Cancel immediately"
5. Check Terminal 2 for:
   ```
   --> customer.subscription.deleted [evt_xxx]
   <-- [200] POST http://localhost:3000/api/stripe-webhook
   ```
6. Verify Firebase user now has:
   ```json
   {
     "isPremium": false,
     "subscriptionStatus": "canceled"
   }
   ```

## ✅ Success Criteria

All tasks complete when:
- ✅ Checkout session created successfully
- ✅ `checkout.session.completed` webhook received (200 response)
- ✅ Firebase user updated with `isPremium: true, isFounder: true`
- ✅ `customer.subscription.deleted` webhook received (200 response)
- ✅ Firebase user updated with `isPremium: false`

## 🚀 Quick Test Commands

**Start everything:**
```bash
# Terminal 1
npm run dev

# Terminal 2  
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Terminal 3
./quick-test-webhook.sh
```

**Check logs:**
```bash
# Check if webhook secret is set
grep STRIPE_WEBHOOK_SECRET .env.local

# Verify webhook route exists
ls -la src/app/api/stripe-webhook/route.ts
```

## 📚 Additional Resources

- `quick-test-webhook.sh` - Automated test script
- `test-webhook-full.js` - Interactive guided test
- `TASK_3_COMPLETE.md` - Complete documentation
- `WEBHOOK_TESTING_GUIDE.md` - Detailed testing guide

## 🎉 You're Ready!

All setup is complete. Just run the tests and verify the webhooks fire! 🚀

