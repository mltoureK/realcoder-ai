# Stripe Webhook Testing Guide

## Overview
This guide will help you test the Stripe webhook integration for Task 3.

## Prerequisites
- ✅ Stripe CLI installed and authenticated
- ✅ `STRIPE_WEBHOOK_SECRET` added to `.env.local`
- ✅ Webhook forwarding running: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
- ✅ Next.js dev server running on `localhost:3000`

## Testing Steps

### 1. Start Your Development Environment

**Terminal 1 - Start Next.js Dev Server:**
```bash
npm run dev
```

**Terminal 2 - Start Stripe Webhook Forwarding:**
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

You should see output like:
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

### 2. Test with Stripe CLI (Quick Test)

You can trigger test events directly using the Stripe CLI:

```bash
# Test checkout.session.completed event
stripe trigger checkout.session.completed

# Test customer.subscription.deleted event
stripe trigger customer.subscription.deleted
```

**Note:** These test events won't have your custom metadata, so they may fail validation. For full testing, use the real checkout flow below.

### 3. Test with Real Checkout Flow (Recommended)

#### Step 1: Create a test checkout session
```bash
node test-checkout.js
```

Or make a POST request to your API:
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "userEmail": "test@example.com",
    "isFounder": true
  }'
```

#### Step 2: Complete the checkout
1. Copy the returned `url` from the response
2. Open it in your browser
3. Use Stripe test card: `4242 4242 4242 4242`
4. Use any future expiry date (e.g., 12/25)
5. Use any 3-digit CVC (e.g., 123)
6. Complete the checkout

#### Step 3: Verify webhook was received
Check the terminal running `stripe listen`. You should see:
```
2025-10-12 02:00:00   --> checkout.session.completed [evt_xxx]
2025-10-12 02:00:00  <--  [200] POST http://localhost:3000/api/stripe-webhook [evt_xxx]
```

#### Step 4: Check Firebase
Verify the user document was updated in Firebase:
- `isPremium`: `true`
- `isFounder`: `true`
- `stripeCustomerId`: `cus_xxx`
- `stripeSubscriptionId`: `sub_xxx`
- `subscriptionStatus`: `active`

### 4. Test Subscription Cancellation

#### Option A: Cancel via Stripe Dashboard
1. Go to [Stripe Dashboard → Customers](https://dashboard.stripe.com/test/customers)
2. Find your test customer
3. Click on their subscription
4. Click "Cancel subscription"
5. Choose "Cancel immediately"

#### Option B: Cancel via API
```bash
# First, get the subscription ID from the customer in Firebase
stripe subscriptions cancel sub_xxx
```

#### Verify:
- Check webhook logs in the terminal
- Verify Firebase user is updated:
  - `isPremium`: `false`
  - `subscriptionStatus`: `canceled`

## Webhook Event Handlers

The webhook route handles these events:

### 1. `checkout.session.completed`
- **Triggered:** When a customer completes checkout
- **Action:** Updates Firebase user with premium status
- **Updates:**
  - `isPremium`: `true`
  - `isFounder`: based on metadata
  - `stripeCustomerId`: Stripe customer ID
  - `stripeSubscriptionId`: Stripe subscription ID
  - `subscriptionStatus`: `active`

### 2. `customer.subscription.deleted`
- **Triggered:** When a subscription is canceled
- **Action:** Removes premium status from user
- **Updates:**
  - `isPremium`: `false`
  - `subscriptionStatus`: `canceled`

### 3. `customer.subscription.updated`
- **Triggered:** When subscription status changes
- **Action:** Updates premium status based on subscription status
- **Updates:**
  - `isPremium`: `true` if status is `active` or `trialing`, `false` otherwise
  - `subscriptionStatus`: current status

## Common Issues & Solutions

### Issue: Webhook not receiving events
**Solution:** 
- Ensure `stripe listen` is running in a separate terminal
- Verify the forwarding URL matches your dev server
- Check that Next.js dev server is running

### Issue: "No userId in metadata" error
**Solution:**
- Ensure you're using the real checkout flow, not CLI triggers
- Verify the checkout session includes userId in metadata
- Check that customer has userId in metadata

### Issue: Firebase update fails
**Solution:**
- Verify Firebase is initialized correctly
- Check that the user document exists in Firestore
- Ensure Firebase rules allow updates to user documents

### Issue: Webhook signature verification fails
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the one from `stripe listen`
- Restart Next.js dev server after updating `.env.local`
- Check for extra whitespace in the secret

## Production Deployment

When deploying to production:

1. **Create a production webhook endpoint** in [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)

2. **Add your production URL:**
   ```
   https://your-domain.com/api/stripe-webhook
   ```

3. **Select events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

4. **Copy the signing secret** and add to production environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx (production secret)
   ```

5. **Test in production** using Stripe Dashboard's "Send test webhook" feature

## Testing Checklist

- [ ] Can create checkout session with userId in metadata
- [ ] Customer is created/updated with userId in metadata
- [ ] Completing checkout triggers `checkout.session.completed`
- [ ] Webhook successfully updates Firebase user
- [ ] User has `isPremium: true` and correct `isFounder` value
- [ ] Canceling subscription triggers `customer.subscription.deleted`
- [ ] Webhook removes premium status from user
- [ ] All webhook events return 200 status
- [ ] Error cases are handled gracefully

## Next Steps

After completing testing:
- [ ] Test with multiple users
- [ ] Test edge cases (network failures, malformed data)
- [ ] Set up monitoring/logging for webhook events
- [ ] Document for your team
- [ ] Prepare for production deployment

