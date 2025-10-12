#!/bin/bash

# Quick Webhook Test Script
# Usage: ./quick-test-webhook.sh

echo "🧪 Quick Stripe Webhook Test"
echo "=============================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo ""
    echo "📝 Create .env.local with:"
    echo "   STRIPE_SECRET_KEY=sk_test_..."
    echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
    echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
    echo ""
    echo "See TASK_3_SETUP_GUIDE.md for details"
    exit 1
fi

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found!"
    echo ""
    echo "📦 Install with: brew install stripe/stripe-cli/stripe"
    exit 1
fi

# Generate test user
TEST_USER_ID="test-user-$(date +%s)"
TEST_EMAIL="test-${TEST_USER_ID}@example.com"

echo "✅ Prerequisites OK"
echo ""
echo "👤 Test User:"
echo "   ID: $TEST_USER_ID"
echo "   Email: $TEST_EMAIL"
echo ""
echo "📝 Make sure you have these running:"
echo "   Terminal 1: npm run dev"
echo "   Terminal 2: stripe listen --forward-to localhost:3000/api/stripe-webhook"
echo ""
read -p "Press Enter when ready..."

echo ""
echo "💳 Creating checkout session..."
echo ""

# Create checkout session
RESPONSE=$(curl -s -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"userEmail\": \"$TEST_EMAIL\",
    \"isFounder\": true
  }")

# Extract URL
CHECKOUT_URL=$(echo $RESPONSE | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CHECKOUT_URL" ]; then
    echo "❌ Failed to create checkout session"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Checkout session created!"
echo ""
echo "🌐 Opening checkout page..."
echo "   URL: $CHECKOUT_URL"
echo ""

# Open in browser
if command -v open &> /dev/null; then
    open "$CHECKOUT_URL"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$CHECKOUT_URL"
else
    echo "Open this URL manually: $CHECKOUT_URL"
fi

echo ""
echo "🧪 Test Card Details:"
echo "   Card: 4242 4242 4242 4242"
echo "   Expiry: 12/25"
echo "   CVC: 123"
echo "   ZIP: 12345"
echo ""
echo "📋 After checkout, verify:"
echo "   1. Webhook received (check 'stripe listen' terminal)"
echo "   2. Firebase user updated with isPremium: true"
echo "   3. User ID: $TEST_USER_ID"
echo ""

