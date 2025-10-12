# Task 8: Quick Test Guide - Pricing Page 🧪

## Quick Start (2 minutes)

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Visit the Pricing Page
```
http://localhost:3000/pricing
```

## What You Should See ✅

### Header
- ✅ "RealCoder AI" logo with Beta badge
- ✅ "Back to Home" link

### Hero Section
- ✅ "Choose Your Plan" headline
- ✅ Description text
- ✅ FounderCounter component (if slots available)

### Pricing Grid
- ✅ Two cards side by side (Free and Founder)
- ✅ Free tier: $0/month, 7 features
- ✅ Founder tier: $5/month, premium gradient, 7 features
- ✅ "LIMITED TIME" badge on Founder card
- ✅ "Save $60/year" savings display

### FAQ Section
- ✅ 4 FAQ items with questions/answers

### Bottom CTA
- ✅ Gradient banner with upgrade button

## Quick Tests

### Test 1: Visual Check (30 seconds)
✅ Cards display side by side
✅ Founder card has purple/blue gradient
✅ Text is readable in both light/dark mode
✅ FounderCounter shows at top

### Test 2: Responsive Design (30 seconds)
1. Resize browser to mobile width
2. ✅ Cards stack vertically
3. ✅ All text remains readable
4. ✅ Buttons are full width

### Test 3: Dark Mode (15 seconds)
1. Toggle system dark mode
2. ✅ Page adapts to dark theme
3. ✅ All text remains readable
4. ✅ Gradients still look good

### Test 4: Navigation (15 seconds)
1. Click "Back to Home"
2. ✅ Returns to homepage
3. Click "Get Started Free"
4. ✅ Returns to homepage

### Test 5: Upgrade Flow - Not Logged In (30 seconds)
1. Make sure you're logged out
2. Click "Upgrade to Founder Tier"
3. ✅ See alert: "Please sign in to upgrade"
4. ✅ Redirected to home page

### Test 6: Upgrade Flow - Logged In (2 minutes)
1. Sign in to your account
2. Return to `/pricing`
3. Click "Upgrade to Founder Tier"
4. ✅ Button shows loading spinner
5. ✅ Redirects to Stripe Checkout page
6. ✅ See RealCoder AI subscription details

**Optional:** Complete the Stripe checkout
- Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC
- ✅ Payment succeeds
- ✅ Returns to success URL
- ✅ Check Firebase: user has `isPremium: true`

## Visual Checklist

### Free Tier Card
- [ ] $0/month pricing
- [ ] 7 green checkmarks
- [ ] Gray button
- [ ] Clean white/gray design

### Founder Tier Card
- [ ] $5/month pricing
- [ ] Purple to blue gradient background
- [ ] "LIMITED TIME" badge (top right)
- [ ] "Save $60/year" savings box
- [ ] 7 yellow checkmarks
- [ ] White button with purple text
- [ ] Glow effect
- [ ] Hover: slight scale up

### FounderCounter
- [ ] Shows above pricing cards
- [ ] Progress bar
- [ ] "X of 100 spots" text
- [ ] Auto-refreshes every 30s

## Browser Test Matrix

Test in at least 2 browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Safari
- [ ] Firefox

All should render correctly with:
- [ ] Proper gradients
- [ ] Animations working
- [ ] No layout shifts
- [ ] Stripe redirect works

## Common Issues & Fixes

### Issue: FounderCounter not showing
**Fix:** Check Firebase config and `founderTier` collection
```bash
# Check the FOUNDER_TIER_SETUP.md guide
cat FOUNDER_TIER_SETUP.md
```

### Issue: Upgrade button does nothing
**Fix:** Check browser console for errors
1. Open DevTools (F12)
2. Check Console tab
3. Look for API errors
4. Verify Stripe keys are set

### Issue: Stripe redirect fails
**Fix:** Verify environment variables
```bash
# .env.local should have:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Issue: Dark mode looks broken
**Fix:** Clear browser cache and reload

### Issue: Mobile layout broken
**Fix:** Verify Tailwind CSS is loaded
```bash
# Check if globals.css imports Tailwind
cat src/app/globals.css
```

## Performance Check

### Page Load
- [ ] Page loads in < 2 seconds
- [ ] No layout shift
- [ ] Images load fast
- [ ] FounderCounter loads smoothly

### Interactions
- [ ] Button clicks are instant
- [ ] Hover effects are smooth (60fps)
- [ ] Loading spinner shows immediately
- [ ] No jank or lag

## Accessibility Check

### Keyboard Navigation
- [ ] Tab through all buttons
- [ ] Enter key activates buttons
- [ ] Focus indicators visible
- [ ] Logical tab order

### Screen Reader
- [ ] Headings are semantic (h2, h3, h4)
- [ ] Buttons have descriptive text
- [ ] Images have alt text (if any)
- [ ] Link text is meaningful

## Integration Test (Full Flow)

### End-to-End Founder Upgrade:
1. [ ] Start with logged-out state
2. [ ] Visit `/pricing`
3. [ ] Try to upgrade (get blocked)
4. [ ] Sign in
5. [ ] Return to `/pricing`
6. [ ] Click upgrade
7. [ ] See loading state
8. [ ] Redirect to Stripe
9. [ ] Complete payment (use test card)
10. [ ] Return to app
11. [ ] Check Firebase: user.isPremium = true
12. [ ] Check Firebase: user.isFounder = true
13. [ ] Visit home page
14. [ ] See unlimited quiz access

## Success Criteria ✅

All of these should be TRUE:

- [ ] Page loads without errors
- [ ] Both cards display correctly
- [ ] FounderCounter shows (if active)
- [ ] Upgrade button works when logged in
- [ ] Stripe redirect works
- [ ] Mobile layout looks good
- [ ] Dark mode works
- [ ] FAQ section displays
- [ ] All navigation works
- [ ] No console errors

## Next: Production Deploy

Once all tests pass:

1. [ ] Test with real Stripe account (not test mode)
2. [ ] Verify webhooks work in production
3. [ ] Set production Stripe keys
4. [ ] Update NEXT_PUBLIC_BASE_URL to production domain
5. [ ] Deploy to Vercel/hosting
6. [ ] Test production upgrade flow
7. [ ] Monitor first few real transactions

## Debugging Commands

```bash
# Check server logs
npm run dev | grep -i "stripe\|error\|checkout"

# Test API endpoint directly
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","userEmail":"test@example.com","isFounder":true}'

# Check environment variables
env | grep STRIPE
env | grep NEXT_PUBLIC

# Verify Stripe CLI webhook forwarding (if testing webhooks)
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## Tips for Demo

When showing to others:

1. **Start clean:** Clear browser cache, fresh session
2. **Show both modes:** Light and dark theme
3. **Show mobile:** Resize browser or use real phone
4. **Show urgency:** Point out FounderCounter and limited spots
5. **Show savings:** Highlight $60/year savings
6. **Complete checkout:** Use test card to show full flow
7. **Show success:** Return to app, show unlimited access

## Estimated Test Time

- Quick visual check: **2 minutes**
- Full manual testing: **10 minutes**
- Full integration test: **15 minutes**
- Cross-browser testing: **20 minutes**
- Complete QA: **30 minutes**

---

## ✅ Ready to Test!

1. `npm run dev`
2. Visit `http://localhost:3000/pricing`
3. Follow the tests above
4. Report any issues

**Expected Result:** Beautiful pricing page with working Stripe integration! 🎉

