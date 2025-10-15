# Task 3: Stripe Webhooks - Setup & Testing Guide

## ✅ Current Status

The webhook implementation is **COMPLETE**! The following files are already created:
- ✅ `src/app/api/stripe-webhook/route.ts` - Webhook handler
- ✅ `src/app/api/create-checkout-session/route.ts` - Checkout session creation
- ✅ `src/lib/stripe.ts` - Stripe configuration
- ✅ Test scripts and guides

## 🚀 Quick Start (5 minutes)

### Step 1: Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### Step 2: Login to Stripe

```bash
stripe login
```

This will open your browser to authenticate.

### Step 3: Set Up Environment Variables

Create or update `.env.local`:

```bash
# Copy example file
cp .env.example .env.local
```

Then add your Stripe keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys):

```env
# Use TEST keys for development
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# This will be set in Step 4
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 4: Start Webhook Forwarding

In a **new terminal window**, run:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx (^C to quit)
```

**Copy the `whsec_...` secret** and add it to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### Step 5: Start Dev Server

In another terminal:

```bash
npm run dev
```

## 🧪 Testing the Webhooks

### Automated Test (Recommended)

Run the interactive test script:

```bash
node test-webhook-full.js
```

This will guide you through:
1. Creating a checkout session
2. Completing test payment
3. Verifying webhook reception
4. Checking Firebase updates
5. Testing subscription cancellation

### Manual Test

#### Test 1: Successful Checkout

1. **Create a test user in Firebase** (or use existing)

2. **Create checkout session**:
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "userEmail": "test@example.com",
    "isFounder": true
  }'
```

3. **Open the returned URL** and complete checkout with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

4. **Check webhook logs** (in the `stripe listen` terminal):
```
--> checkout.session.completed [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe-webhook
```

5. **Verify Firebase** - User should now have:
```json
{
  "isPremium": true,
  "isFounder": true,
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx",
  "subscriptionStatus": "active"
}
```

#### Test 2: Subscription Cancellation

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/customers

2. **Find your test customer** by email

3. **Cancel the subscription**:
   - Click on customer → Subscription
   - Click "Cancel subscription"
   - Choose "Cancel immediately"

4. **Check webhook logs**:
```
--> customer.subscription.deleted [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe-webhook
```

5. **Verify Firebase** - User should now have:
```json
{
  "isPremium": false,
  "subscriptionStatus": "canceled"
}
```

## 🔍 What the Webhook Does

### Event: `checkout.session.completed`

When a user completes payment:

```javascript
{
  isPremium: true,
  isFounder: true,  // From metadata
  stripeCustomerId: "cus_xxx",
  stripeSubscriptionId: "sub_xxx",
  subscriptionStatus: "active",
  updatedAt: "2025-10-12T..."
}
```

### Event: `customer.subscription.deleted`

When a subscription is canceled:

```javascript
{
  isPremium: false,
  subscriptionStatus: "canceled",
  updatedAt: "2025-10-12T..."
}
```

### Event: `customer.subscription.updated`

When subscription status changes (e.g., past_due, trialing):

```javascript
{
  isPremium: ['active', 'trialing'].includes(status),
  subscriptionStatus: status,  // "active", "past_due", "unpaid", etc.
  updatedAt: "2025-10-12T..."
}
```

## ✅ Testing Checklist

- [ ] Stripe CLI installed and authenticated
- [ ] Webhook forwarding running (`stripe listen`)
- [ ] `STRIPE_WEBHOOK_SECRET` in `.env.local`
- [ ] Dev server running (`npm run dev`)
- [ ] Can create checkout session
- [ ] Can complete test checkout
- [ ] Webhook receives `checkout.session.completed`
- [ ] Firebase user updated with premium status
- [ ] Can cancel subscription
- [ ] Webhook receives `customer.subscription.deleted`
- [ ] Firebase user premium status removed

## 🐛 Troubleshooting

### Webhook not receiving events

**Check:**
- Is `stripe listen` running?
- Is Next.js dev server running on port 3000?
- Is the webhook secret correct in `.env.local`?

**Fix:**
```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### "No userId in metadata" error

**Cause:** The webhook needs userId to know which Firebase user to update.

**Fix:** Always create checkout sessions through the API (not Stripe Dashboard directly):
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id", "userEmail": "user@example.com", "isFounder": true}'
```

### Firebase update fails

**Check:**
- User document exists in Firestore
- Firebase is initialized correctly
- Firebase rules allow updates

**Debug:**
```javascript
// Check your Firebase rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Webhook signature verification fails

**Fix:**
1. Copy the exact secret from `stripe listen` output
2. Update `.env.local` (no quotes, no extra spaces)
3. Restart Next.js dev server
4. Try again

## 📚 Additional Resources

- **WEBHOOK_TESTING_GUIDE.md** - Detailed testing procedures
- **STRIPE_SETUP_INSTRUCTIONS.md** - Complete Stripe setup
- **test-webhook-full.js** - Interactive test script
- **test-checkout.js** - Simple checkout test
- **test-webhook-trigger.js** - Trigger test events

## 🚀 Production Deployment

When ready for production:

1. **Create production webhook** in [Stripe Dashboard](https://dashboard.stripe.com/webhooks):
   ```
   Endpoint URL: https://your-domain.com/api/stripe-webhook
   Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated
   ```

2. **Update environment variables** with production values:
   - `STRIPE_SECRET_KEY` (live key: `sk_live_...`)
   - `STRIPE_WEBHOOK_SECRET` (from dashboard, not CLI)
   - `NEXT_PUBLIC_BASE_URL`

3. **Test in production** using Stripe Dashboard's test mode

## 🎉 You're Done!

Task 3 is complete when you can:
- ✅ Create checkout sessions with user metadata
- ✅ Complete test payments successfully
- ✅ Receive webhook events in your app
- ✅ Update Firebase users with premium status
- ✅ Handle subscription cancellations

**Next:** Integrate the checkout flow into your UI!

