# 🧪 Test Stripe Webhooks - Step by Step

## ✅ Current Status
- Dev server running on: **http://localhost:3000**
- Webhook secret configured in `.env.local`
- All code ready to test

## 🚀 Test Instructions (Follow These Steps)

### Step 1: Start Stripe Webhook Listener

Open a **NEW terminal** and run:

```bash
cd /Users/moos/Documents/Dev/ai-apps/realcoder-ai-nextjs
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

You should see:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

✅ **Keep this terminal open** - you'll see webhook events here

---

### Step 2: Create a Test Checkout

Open **ANOTHER new terminal** and run:

```bash
cd /Users/moos/Documents/Dev/ai-apps/realcoder-ai-nextjs

curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-12345",
    "userEmail": "test@example.com",
    "isFounder": true
  }'
```

This will return a response with a `url` field.

---

### Step 3: Complete the Test Payment

1. **Copy the `url`** from the response
2. **Open it in your browser**
3. **Fill in the test card details:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: `12/25` (any future date)
   - CVC: `123`
   - ZIP: `12345`
4. **Click "Subscribe"**

---

### Step 4: Verify Webhook Fired

Go back to the terminal running `stripe listen`.

You should see:
```
--> checkout.session.completed [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe-webhook [evt_xxx]
```

✅ The `[200]` means the webhook was received and processed successfully!

---

### Step 5: Check Server Logs

You should see detailed logs showing:

```
🔔 Webhook Event Received: checkout.session.completed
   Event ID: evt_xxx
   
💳 Checkout Session Completed
   Session ID: cs_xxx
   User ID: test-user-12345
   Is Founder: true
   
🔥 Updating Firebase user: test-user-12345

✅ User test-user-12345 updated successfully
   isPremium: true
   isFounder: true
   subscriptionStatus: active
```

---

### Step 6: Verify Firebase (Optional)

Go to your Firebase Console and check the `users` collection.

The user document for `test-user-12345` should have:
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

---

## ✅ Success Criteria

Your test is successful when:
- ✅ Checkout session created (got URL back)
- ✅ Payment completed in browser
- ✅ Webhook received (200 response in stripe listen terminal)
- ✅ Server logs show Firebase update
- ✅ Firebase user has `isPremium: true`

---

## 🔄 Test Subscription Cancellation (Optional)

### Cancel the Subscription

1. Go to: https://dashboard.stripe.com/test/customers
2. Search for: `test@example.com`
3. Click on the customer
4. Click on their subscription
5. Click **"Cancel subscription"** → **"Cancel immediately"**

### Verify Cancellation Webhook

In the `stripe listen` terminal, you should see:
```
--> customer.subscription.deleted [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe-webhook [evt_xxx]
```

### Check Firebase

The user should now have:
```json
{
  "isPremium": false,
  "subscriptionStatus": "canceled"
}
```

---

## 🎉 Done!

Once you see the webhook fire and Firebase update, Task 3 is complete!

**Move on to the next step.**

---

## 🐛 Troubleshooting

### Issue: "stripe: command not found"
Run: `brew install stripe/stripe-cli/stripe`

### Issue: Webhook returns 401 or signature error
- Make sure webhook secret in `.env.local` matches the one from `stripe listen`
- Restart the dev server after updating `.env.local`

### Issue: No webhook received
- Make sure `stripe listen` is running
- Check that you're using `localhost:3000` in the listen command
- Verify dev server is running on port 3000

---

## 📞 Quick Commands Reference

**Start dev server:**
```bash
npm run dev
```

**Start webhook listener:**
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

**Create test checkout:**
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "userEmail": "test@example.com", "isFounder": true}'
```

**Test card:** `4242 4242 4242 4242`

