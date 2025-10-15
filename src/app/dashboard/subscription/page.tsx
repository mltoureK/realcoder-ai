'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUser } from '@/lib/user-management';
import { UserDoc } from '@/lib/quiz-history';
import Link from 'next/link';

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Local-only hint to show scheduled cancellation end date after user clicks cancel
  const [cancelAtUnix, setCancelAtUnix] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Fetch user data
  useEffect(() => {
    if (user && !authLoading) {
      const fetchUserData = async () => {
        try {
          setLoading(true);
          setError(null);

          const userData = await getUser(user.uid);
          setUserDoc(userData);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load subscription data');
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [user, authLoading]);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      // Call Stripe API to cancel subscription
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Capture Stripe period end to show messaging
      const payload = await response.json();
      const endUnix = payload?.subscription?.current_period_end ?? null;
      if (typeof endUnix === 'number') setCancelAtUnix(endUnix);

      // Refresh user data
      const userData = await getUser(user!.uid);
      setUserDoc(userData);

      alert('Cancellation scheduled. You will retain access until the end of your current billing period.');
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (!user || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Please sign in to access your subscription.'}
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const isActive = userDoc?.subscriptionStatus === 'active';
  const isTrialing = userDoc?.subscriptionStatus === 'trialing';
  const isCancelled = userDoc?.subscriptionStatus === 'canceled';
  const isCancelScheduled = !!cancelAtUnix || isCancelled;

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
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Subscription Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your subscription, billing, and account settings.
          </p>
          {isCancelled && (
            <div className="mt-4 p-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
              <span className="font-medium">Cancellation scheduled.</span> You will retain access until the end of your current billing period{cancelAtUnix ? ` (${new Date(cancelAtUnix * 1000).toLocaleDateString()})` : ''}.
            </div>
          )}
        </div>

        {/* Subscription Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Plan
            </h3>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              userDoc?.isFounder 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : userDoc?.isPremium
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {userDoc?.isFounder ? '🏆 Founder Tier' : userDoc?.isPremium ? '⭐ Premium' : '🆓 Free'}
            </div>
          </div>

          {userDoc?.isFounder || userDoc?.isPremium ? (
            <div className="space-y-4">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Plan Type
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userDoc?.isFounder ? 'Founder Tier' : 'Premium'}
                  </p>
                  {userDoc?.isFounder && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                      Lifetime pricing locked in
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Monthly Cost
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${userDoc?.isFounder ? '5.00' : '10.00'}/month
                  </p>
                  {userDoc?.isFounder && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Save $60/year vs regular pricing
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isCancelScheduled ? 'bg-red-500' :
                      isActive ? 'bg-green-500' : 
                      isTrialing ? 'bg-blue-500' : 
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-gray-900 dark:text-white font-medium capitalize">
                      {isCancelScheduled
                        ? (cancelAtUnix
                            ? `cancellation scheduled • active until ${new Date(cancelAtUnix * 1000).toLocaleDateString()}`
                            : 'canceled')
                        : (userDoc?.subscriptionStatus || 'Unknown')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Features
                  </label>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900 dark:text-white">✅ Unlimited quizzes</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {userDoc?.isFounder ? '✅ Founder badge' : '✅ Premium badge'}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">✅ Priority support</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                  {!(isCancelled || cancelAtUnix) ? (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  ) : (
                    <div className="text-red-600 dark:text-red-400">
                      <p className="font-medium">Subscription Cancelled</p>
                      <p className="text-sm">
                        {cancelAtUnix
                          ? `You retain access until ${new Date(cancelAtUnix * 1000).toLocaleDateString()}.`
                          : 'You will retain access until the end of your billing period.'}
                      </p>
                    </div>
                  )}
                  
                  <Link
                    href="/pricing"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    Change Plan
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Free User Upgrade Prompt */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Upgrade to Premium
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Unlock unlimited quizzes, premium features, and priority support with our premium subscription.
              </p>
              <Link
                href="/pricing"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                View Pricing Plans
              </Link>
            </div>
          )}
        </div>

        {/* Billing Information */}
        {(userDoc?.isFounder || userDoc?.isPremium) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Billing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Next Billing Date
                </label>
                {!isCancelScheduled && (
                  <p className="text-gray-900 dark:text-white">
                    {userDoc?.lastQuizDate 
                      ? new Date(userDoc.lastQuizDate.toDate().getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                )}
                {isCancelScheduled && (
                  <p className="text-gray-900 dark:text-white">Cancelled</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Payment Method
                </label>
                <p className="text-gray-900 dark:text-white">
                  Card ending in **** (managed by Stripe)
                </p>
              </div>
            </div>
            {/* Removed Stripe billing blurb per request */}
          </div>
        )}

        {/* Account Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Actions
          </h3>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-gray-900 dark:text-white font-medium">View Dashboard</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-900 dark:text-white font-medium">Account Settings</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-900 dark:text-white font-medium">Take a Quiz</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
