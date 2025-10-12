'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUser, getUserQuizStats, getUserBadges } from '@/lib/user-management';
import { UserDoc } from '@/lib/quiz-history';
import Link from 'next/link';

interface DashboardStats {
  totalQuizzes: number;
  quizzesThisWeek: number;
  quizzesThisMonth: number;
  weeklyLimit: number;
  monthlyLimit: number;
  isPremium: boolean;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

          // Fetch user document and stats in parallel
          const [userData, userStats] = await Promise.all([
            getUser(user.uid),
            getUserQuizStats(user.uid)
          ]);

          setUserDoc(userData);
          setStats(userStats);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load dashboard data');
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
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
            {error || 'Please sign in to access your dashboard.'}
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

  const badges = userDoc ? getUserBadges(userDoc) : [];

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return 'text-green-600 dark:text-green-400'; // Unlimited
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getUsageBarColor = (used: number, limit: number) => {
    if (limit === -1) return 'bg-green-500'; // Unlimited
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
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
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {userDoc?.name || user.displayName || 'User'}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account, track your progress, and explore premium features.
          </p>
        </div>

        {/* User Badges */}
        {badges.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Badges
            </h3>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg"
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Quizzes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalQuizzes || 0}
                </p>
              </div>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
                <p className={`text-2xl font-bold ${getUsageColor(stats?.quizzesThisWeek || 0, stats?.weeklyLimit || 0)}`}>
                  {stats?.quizzesThisWeek || 0}
                  {stats?.weeklyLimit !== -1 && `/${stats?.weeklyLimit}`}
                  {stats?.weeklyLimit === -1 && ' ∞'}
                </p>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                <p className={`text-2xl font-bold ${getUsageColor(stats?.quizzesThisMonth || 0, stats?.monthlyLimit || 0)}`}>
                  {stats?.quizzesThisMonth || 0}
                  {stats?.monthlyLimit !== -1 && `/${stats?.monthlyLimit}`}
                  {stats?.monthlyLimit === -1 && ' ∞'}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${userDoc?.isFounder ? 'bg-yellow-100 dark:bg-yellow-900' : userDoc?.isPremium ? 'bg-purple-100 dark:bg-purple-900' : 'bg-gray-100 dark:bg-gray-900'}`}>
                <svg className={`w-6 h-6 ${userDoc?.isFounder ? 'text-yellow-600 dark:text-yellow-400' : userDoc?.isPremium ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account</p>
                <p className={`text-lg font-bold ${userDoc?.isFounder ? 'text-yellow-600 dark:text-yellow-400' : userDoc?.isPremium ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {userDoc?.isFounder ? '🏆 Founder' : userDoc?.isPremium ? '⭐ Premium' : '🆓 Free'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Progress Bars */}
        {stats && stats.weeklyLimit !== -1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Usage This Week
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {stats.quizzesThisWeek} of {stats.weeklyLimit} quizzes used
                  </span>
                  <span className={getUsageColor(stats.quizzesThisWeek, stats.weeklyLimit)}>
                    {Math.round((stats.quizzesThisWeek / stats.weeklyLimit) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${getUsageBarColor(stats.quizzesThisWeek, stats.weeklyLimit)}`}
                    style={{ width: `${Math.min((stats.quizzesThisWeek / stats.weeklyLimit) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Start Quiz */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Start Learning</h3>
            <p className="text-blue-100 mb-4">
              Generate a new quiz from your code or explore curated repositories.
            </p>
            <Link
              href="/"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-block"
            >
              Take a Quiz
            </Link>
          </div>

          {/* Subscription Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Subscription
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {userDoc?.isFounder 
                ? 'You have founder tier with unlimited access and lifetime pricing!'
                : userDoc?.isPremium 
                ? 'You have premium access with unlimited quizzes.'
                : 'Upgrade to unlock unlimited quizzes and premium features.'
              }
            </p>
            {userDoc?.isFounder || userDoc?.isPremium ? (
              <Link
                href="/dashboard/subscription"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
              >
                Manage Subscription
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all inline-block"
              >
                Upgrade Now
              </Link>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Name
              </label>
              <p className="text-gray-900 dark:text-white">
                {userDoc?.name || user.displayName || 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white">
                {userDoc?.email || user.email || 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Member Since
              </label>
              <p className="text-gray-900 dark:text-white">
                {userDoc?.joinedAt ? new Date(userDoc.joinedAt.toDate()).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Last Seen
              </label>
              <p className="text-gray-900 dark:text-white">
                {userDoc?.lastSeen ? new Date(userDoc.lastSeen.toDate()).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/dashboard/settings"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Edit Account Settings →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
