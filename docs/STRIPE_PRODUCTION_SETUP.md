# Stripe Production Setup for Vercel

## 🚀 Getting Your MVP Ready

This guide will help you configure Stripe for production deployment on Vercel.

## 📋 Prerequisites

- ✅ Stripe account (you already have this)
- ✅ Vercel CLI installed (✅ Done)
- ✅ GitHub repository connected to Vercel
- ✅ Local Stripe integration working

## 🔧 Step 1: Get Production Stripe Keys

### 1.1 Switch to Live Mode in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click the **"Test mode"** toggle in the top left to switch to **"Live mode"**
3. You'll see a warning - click **"Activate your account"** if prompted

### 1.2 Get Production API Keys

1. Go to [API Keys](https://dashboard.stripe.com/apikeys) (in Live mode)
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Copy your **Secret key** (starts with `sk_live_`)

⚠️ **Important**: Production keys charge real money!

## 🌐 Step 2: Configure Vercel Environment Variables

### 2.1 Using Vercel CLI (Recommended)

```bash
# Navigate to your project
cd /Users/moos/Documents/Dev/ai-apps/realcoder-ai-nextjs

# Login to Vercel (if not already logged in)
vercel login

# Link your project (if not already linked)
vercel link

# Add production environment variables
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# Paste your pk_live_... key when prompted

vercel env add STRIPE_SECRET_KEY production
# Paste your sk_live_... key when prompted

vercel env add NEXT_PUBLIC_BASE_URL production
# Enter your production URL (e.g., https://your-app.vercel.app)

vercel env add STRIPE_WEBHOOK_SECRET production
# We'll get this in Step 3

# Add other required environment variables
vercel env add OPENAI_API_KEY production
# Paste your OpenAI API key

vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production
# Copy these from your existing .env.local file
```

### 2.2 Alternative: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each environment variable for **Production** environment

## 🔗 Step 3: Set Up Production Webhook

### 3.1 Deploy to Vercel First

```bash
# Deploy your current code
vercel --prod
```

This will give you a URL like `https://your-app-name.vercel.app`

### 3.2 Create Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) (in Live mode)
2. Click **"Add endpoint"**
3. Enter your webhook URL: `https://your-app-name.vercel.app/api/webhooks/stripe`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**

### 3.3 Get Webhook Secret

1. Click on your newly created webhook
2. Click **"Reveal"** next to the signing secret
3. Copy the secret (starts with `whsec_`)

### 3.4 Add Webhook Secret to Vercel

```bash
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste your whsec_... secret when prompted
```

### 3.5 Redeploy

```bash
vercel --prod
```

## 🧪 Step 4: Test Production Integration

### 4.1 Test with Real Payment (Small Amount)

1. Go to your production site
2. Try to create a checkout session
3. Use a test card: `4242 4242 4242 4242`
4. Complete the payment flow

### 4.2 Monitor Webhook Events

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Check the **"Recent deliveries"** tab
4. Verify events are being received successfully

## 🔒 Step 5: Security Considerations

### 5.1 Environment Variables

- ✅ Never commit production keys to Git
- ✅ Use Vercel's environment variable system
- ✅ Different keys for test vs production

### 5.2 Webhook Security

- ✅ Webhook signature verification is implemented
- ✅ Only process events from Stripe
- ✅ Log all webhook events for debugging

## 📊 Step 6: Monitoring & Analytics

### 6.1 Stripe Dashboard

- Monitor payments in [Payments](https://dashboard.stripe.com/payments)
- Check customer data in [Customers](https://dashboard.stripe.com/customers)
- Review subscription analytics in [Subscriptions](https://dashboard.stripe.com/subscriptions)

### 6.2 Vercel Analytics

- Check function logs in Vercel Dashboard
- Monitor API route performance
- Set up error tracking

## 🚨 Troubleshooting

### Common Issues

**Webhook not receiving events:**
- Check webhook URL is correct
- Verify webhook secret is set
- Check Vercel function logs

**Payment not processing:**
- Verify API keys are production keys
- Check Stripe Dashboard for errors
- Ensure customer creation is working

**Environment variables not loading:**
- Redeploy after adding env vars
- Check variable names match exactly
- Verify environment (production vs preview)

### Getting Help

1. Check [Stripe Docs](https://stripe.com/docs)
2. Review [Vercel Docs](https://vercel.com/docs)
3. Check your Vercel function logs
4. Monitor Stripe webhook logs

## 🎯 Next Steps

Once everything is working:

1. ✅ Test the full payment flow
2. ✅ Monitor webhook events
3. ✅ Set up error tracking
4. ✅ Consider adding customer portal for subscription management
5. ✅ Implement proper user subscription status tracking in Firebase

## 💰 Pricing Reminder

- **Founder Tier**: $5.00/month (500 cents)
- **Limited to 100 spots** (implement this in your app logic)
- **Promotion codes enabled** for early adopters

Your Stripe integration is now ready for production! 🚀
