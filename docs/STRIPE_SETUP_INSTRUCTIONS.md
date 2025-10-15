# Stripe Setup Instructions - Task 2

## ✅ Completed

- [x] Installed `stripe` and `@stripe/stripe-js` packages
- [x] Created `src/lib/stripe.ts` with Stripe client
- [x] Exported FOUNDER_PRICE = 500 ($5.00)
- [x] Created `src/app/api/create-checkout-session/route.ts`
- [x] Implemented POST handler with subscription checkout
- [x] Included userId and isFounder in metadata
- [x] Set success_url and cancel_url

## 🔧 Setup Required

### Step 1: Create `.env.local` file

Create a file named `.env.local` in the root directory with:

```bash
# Stripe API Keys (from Task 1)
# Get these from: https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# Base URL for redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Stripe Webhook Secret (add this in Task 3)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 2: Add Your Stripe Keys

1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Replace the placeholder values in `.env.local`

### Step 3: Add Your Existing Environment Variables

Copy any existing Firebase, OpenAI, or other API keys you're already using into `.env.local`

## 🧪 Testing the Endpoint

### Option 1: Using the test script

```bash
# Start your Next.js dev server
npm run dev

# In another terminal, run:
node test-checkout.js
```

You should see:
```
✅ Success! Checkout session created:
Session ID: cs_test_...
Checkout URL: https://checkout.stripe.com/...
```

### Option 2: Using curl

```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "userEmail": "test@example.com",
    "isFounder": true
  }'
```

### Option 3: Using your browser console

Open http://localhost:3000, open DevTools Console, and run:

```javascript
fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user-123',
    userEmail: 'test@example.com',
    isFounder: true
  })
})
.then(r => r.json())
.then(data => {
  console.log('Session ID:', data.sessionId);
  console.log('Checkout URL:', data.url);
  // Open checkout in new tab
  window.open(data.url, '_blank');
});
```

## 📋 What Got Created

### `src/lib/stripe.ts`
- Server-side Stripe client instance
- Client-side Stripe promise for frontend use
- Pricing constants (FOUNDER_PRICE = 500 cents = $5.00)
- Product metadata for founder tier

### `src/app/api/create-checkout-session/route.ts`
- POST endpoint that creates Stripe checkout sessions
- Accepts: userId, userEmail, isFounder
- Creates subscription checkout with founder pricing
- Stores metadata for webhook processing (Task 3)
- Returns sessionId and checkout URL
- Handles success/cancel redirects

## 🎯 Next Steps

Once you've tested and confirmed the endpoint works:
- ✅ Mark Task 2 complete
- Move to **Task 3: Implement Stripe Webhooks**

## 🐛 Troubleshooting

**Error: "STRIPE_SECRET_KEY is not defined"**
- Make sure `.env.local` exists with your Stripe keys
- Restart your dev server after adding env variables

**Error: "Invalid API Key"**
- Double-check you're using TEST keys (pk_test_ and sk_test_)
- Make sure there are no extra spaces in `.env.local`

**Can't find test-checkout.js**
- It's in your project root
- Make sure your dev server is running on port 3000

## 💰 Pricing Breakdown

- `FOUNDER_PRICE = 500` = 500 cents = **$5.00/month**
- This will be charged monthly as a subscription
- In Task 6, we'll limit this to 100 spots total


