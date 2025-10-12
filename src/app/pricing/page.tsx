'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FounderCounter from '@/components/FounderCounter';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    // Check if user is logged in
    if (!user) {
      alert('Please sign in to upgrade to Founder tier');
      router.push('/');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting upgrade process for user:', user.uid);

      // Call create-checkout-session API
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          isFounder: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { sessionId, url } = await response.json();
      console.log('✅ Checkout session created:', sessionId);

      // Redirect to Stripe checkout using URL (simpler approach)
      console.log('🔄 Redirecting to Stripe checkout...');
      
      if (url) {
        // Use the URL directly (recommended by Stripe)
        window.location.href = url;
      } else {
        // Fallback: dynamically import Stripe and use redirectToCheckout
        const { getStripe } = await import('@/lib/stripe');
        const stripe = await getStripe();
        
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }
        
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
        
        if (stripeError) {
          throw new Error(stripeError.message);
        }
      }
    } catch (err) {
      console.error('❌ Error during upgrade:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout process');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                RealCoder AI
              </h1>
              <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                Beta
              </span>
            </Link>
            <Link
              href="/"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Start learning from real code today. Upgrade to Founder tier for unlimited access.
          </p>
        </div>

        {/* Founder Counter - Show urgency */}
        <FounderCounter />

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Free Tier */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-8 flex flex-col">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Free
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$0</span>
                <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Perfect for trying out RealCoder AI
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8 flex-grow">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong className="font-semibold">5 quizzes per week</strong>
                </span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Upload your own code files
                </span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  GitHub repository integration
                </span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  AI-generated questions
                </span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Progress tracking
                </span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Community question bank access
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/"
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
            >
              Get Started Free
            </Link>
          </div>

          {/* Founder Tier */}
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-2xl border-2 border-purple-400 p-8 flex flex-col relative overflow-hidden transform hover:scale-105 transition-transform">
            {/* LIMITED TIME Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                LIMITED TIME
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-pink-400/20 pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center mb-2">
                  <span className="text-3xl">🏆</span>
                  <h3 className="text-2xl font-bold text-white ml-2">
                    Founder Tier
                  </h3>
                </div>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-white">$5</span>
                  <span className="text-xl text-white/90 ml-2">/month</span>
                </div>
                <p className="text-sm text-white/90 mt-2 font-medium">
                  Lock in lifetime founder pricing
                </p>
              </div>

              {/* Savings Badge */}
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <div className="text-white font-bold text-lg mb-1">
                    🎉 Save $60/year
                  </div>
                  <div className="text-white/90 text-sm">
                    Compared to regular pricing at <span className="line-through">$10/month</span>
                  </div>
                  <div className="text-white/80 text-xs mt-2">
                    Regular price after founder tier closes
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold">
                    ⚡ Unlimited quizzes
                  </span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">
                    🏅 Exclusive founder badge
                  </span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">
                    💎 Priority support
                  </span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">
                    🚀 Early access to new features
                  </span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">
                    🔒 Lifetime pricing guarantee
                  </span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">
                    💪 Support indie development
                  </span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-300 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">
                    Everything in Free, plus more
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-white text-purple-600 py-4 px-6 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  '🚀 Upgrade to Founder Tier'
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-400 rounded-lg">
                  <p className="text-white text-sm text-center">{error}</p>
                </div>
              )}

              <p className="text-white/80 text-xs text-center mt-4">
                ✓ Cancel anytime • No long-term commitment
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What happens when the 100 founder spots are filled?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                The price will increase to $10/month for new subscribers. As a founder, you'll keep the $5/month pricing forever.
              </p>
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel my subscription?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can cancel anytime. No questions asked. If you cancel and resubscribe later, you'll still have founder pricing.
              </p>
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major credit cards through Stripe, our secure payment processor.
              </p>
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                How does the founder badge work?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Founder members get an exclusive badge displayed on their profile, showing you're an early supporter of RealCoder AI.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to level up your coding skills?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Join the first 100 founders and lock in lifetime pricing while learning from real-world code.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-8 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Become a Founder Now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

