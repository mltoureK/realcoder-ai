# 🚀 Switching from Test to Production

## ✅ Super Easy! Just 3 Environment Variables

Switching from Stripe test mode to production is literally just updating 3 environment variables. Everything else stays the same!

### Test Mode (Current)
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from stripe listen)
```

### Production Mode (When Ready)
```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
```

That's it! No code changes needed. 🎉

---

## 📋 Complete Production Checklist

### Step 1: Get Production Keys (2 minutes)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. **Toggle to "Live" mode** (top right corner - switch from "Test" to "Live")
3. Copy your **live** keys:
   - Secret key: `sk_live_...`
   - Publishable key: `pk_live_...`

### Step 2: Create Production Webhook (5 minutes)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Make sure you're in **Live mode** (top right)
3. Click **"Add endpoint"**
4. Enter your production URL:
   ```
   https://your-domain.com/api/stripe-webhook
   ```
5. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.updated`
6. Click **"Add endpoint"**
7. Click **"Reveal" to see the signing secret** → Copy `whsec_...`

### Step 3: Update Production Environment Variables

**For Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add/Update:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_... (from step 2)
   ```
3. Deploy!

**For other platforms:** Same idea - just set those 3 env vars.

### Step 4: Test in Production (5 minutes)

1. Use a real card (start with a small amount, like $1)
2. Complete checkout
3. Check Stripe Dashboard → Webhooks → Your endpoint
4. Should see successful webhook deliveries
5. Check Firebase to verify user was updated

---

## 🔄 Key Differences: Test vs Production

### Test Mode (Development)
- Uses `stripe listen` for local testing
- Webhook secret from CLI (temporary, expires)
- Test card: `4242 4242 4242 4242`
- No real money
- Events show in test mode dashboard

### Production Mode (Live)
- Uses Stripe Dashboard webhook endpoint
- Webhook secret from Dashboard (permanent)
- Real credit cards only
- Real money transactions
- Events show in live mode dashboard

---

## 🎯 The Beauty of This Setup

**Your Code Doesn't Change!** 

The same code works for both test and production:

```typescript
// This works in BOTH test and prod
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

Stripe automatically knows which mode you're in based on the key:
- `sk_test_...` → Test mode
- `sk_live_...` → Live mode

---

## ⚠️ Important Production Notes

### 1. Webhook Secret is Different!
- **Test:** From `stripe listen` (temporary)
- **Production:** From Dashboard (permanent)
- Don't mix them up!

### 2. Test Cards Don't Work in Production
- `4242 4242 4242 4242` only works in test mode
- Production requires real, valid credit cards

### 3. Dashboard Toggling
- Stripe Dashboard has a toggle (top right): **Test ↔ Live**
- Always check which mode you're in!
- Test data and live data are completely separate

### 4. Webhook Testing in Production
- Stripe Dashboard has a "Send test webhook" feature
- You can test webhooks without real transactions
- Very useful for debugging

---

## 🧪 Testing Strategy

### Phase 1: Local Testing (Current)
```
stripe listen → localhost:3000
Test cards → Test webhooks → Test Firebase
```

### Phase 2: Staging/Production Testing
```
Stripe Dashboard webhook → your-domain.com
Real cards → Real webhooks → Real Firebase
```

### Recommended Flow:
1. ✅ Test thoroughly in test mode (what you're doing now)
2. ✅ Deploy to staging with test keys
3. ✅ Switch to live keys
4. ✅ Test with a $1 transaction
5. ✅ Verify webhook + Firebase update
6. ✅ Go live!

---

## 🔒 Security Best Practices

### Never Commit to Git:
- ❌ `sk_test_...` or `sk_live_...`
- ❌ `whsec_...`
- ❌ Any `.env` files

### Always Use Environment Variables:
- ✅ `.env.local` for local dev (in `.gitignore`)
- ✅ Vercel/platform env vars for production
- ✅ Different values per environment

### Rotate Secrets If Exposed:
- Dashboard → Generate new keys
- Dashboard → Delete old webhook, create new one
- Update environment variables
- Redeploy

---

## 📊 Quick Reference

| What | Test Mode | Production |
|------|-----------|------------|
| **Secret Key** | `sk_test_...` | `sk_live_...` |
| **Publishable Key** | `pk_test_...` | `pk_live_...` |
| **Webhook Source** | `stripe listen` | Dashboard |
| **Webhook Secret** | CLI (temporary) | Dashboard (permanent) |
| **Test Cards** | ✅ Works | ❌ Doesn't work |
| **Real Money** | ❌ No charges | ✅ Real charges |
| **Dashboard Toggle** | "Test" | "Live" |

---

## 🎉 Bottom Line

**Switching to production = 3 environment variables.**

No code changes, no configuration changes, no complexity. 

That's the beauty of Stripe! 🚀

---

## 🆘 Troubleshooting Production

### Webhooks not firing?
1. Check Stripe Dashboard → Webhooks → Your endpoint
2. Look at delivery attempts (shows errors)
3. Verify URL is correct (https, not http)
4. Check webhook secret matches

### Checkout not working?
1. Toggle Dashboard to "Live" mode
2. Verify you're using `pk_live_...` key
3. Check browser console for errors
4. Try with a different card

### User not updating in Firebase?
1. Check webhook delivery was successful (200 response)
2. Check your server logs
3. Verify userId is in webhook metadata
4. Check Firebase rules allow updates

---

## ✅ You're Ready!

When you're ready to go live:
1. Get live keys from Dashboard
2. Create webhook endpoint in Dashboard  
3. Update 3 environment variables
4. Deploy
5. Test with $1
6. 🎉 Launch!

Total time: ~15 minutes

