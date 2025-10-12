// Test script for Stripe checkout session
// Run with: node test-checkout.js

const testCheckout = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-123',
        userEmail: 'test@example.com',
        isFounder: true,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Checkout session created:');
      console.log('Session ID:', data.sessionId);
      console.log('Checkout URL:', data.url);
      console.log('\n🔗 Open this URL in your browser to test the payment flow:');
      console.log(data.url);
    } else {
      console.error('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

testCheckout();


