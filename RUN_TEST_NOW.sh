#!/bin/bash
# Quick test runner for Task 3 Stripe Webhooks
# This will help you test the complete flow

echo "🧪 Task 3: Stripe Webhooks Test"
echo "================================"
echo ""

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Dev server not running!"
    echo ""
    echo "Please start it in another terminal:"
    echo "  npm run dev"
    echo ""
    read -p "Press Enter when dev server is running..."
fi

echo "✅ Dev server is running"
echo ""

# Generate test user
TEST_USER="test-user-$(date +%s)"
TEST_EMAIL="test-${TEST_USER}@example.com"

echo "👤 Test User:"
echo "   ID: $TEST_USER"
echo "   Email: $TEST_EMAIL"
echo ""

echo "📝 IMPORTANT: Make sure stripe listen is running in another terminal:"
echo "   stripe listen --forward-to localhost:3000/api/stripe-webhook"
echo ""
read -p "Press Enter when stripe listen is running..."

echo ""
echo "💳 Creating checkout session..."

# Create checkout
RESPONSE=$(curl -s -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$TEST_USER\", \"userEmail\": \"$TEST_EMAIL\", \"isFounder\": true}")

URL=$(echo $RESPONSE | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$URL" ]; then
    echo "❌ Failed to create checkout"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Checkout created!"
echo ""
echo "🌐 Opening checkout page..."
echo "   $URL"
echo ""

# Open browser
open "$URL" 2>/dev/null || echo "Open this URL: $URL"

echo "🧪 Test Card:"
echo "   Card: 4242 4242 4242 4242"
echo "   Expiry: 12/25"
echo "   CVC: 123"
echo ""
echo "📋 What to check:"
echo "   1. Complete the checkout in your browser"
echo "   2. Check 'stripe listen' terminal for webhook event"
echo "   3. Check dev server logs for Firebase update"
echo "   4. Verify Firebase user has isPremium: true"
echo ""
echo "   User ID to check: $TEST_USER"
echo ""

