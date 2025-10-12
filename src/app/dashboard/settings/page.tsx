'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUser } from '@/lib/user-management';
import { UserDoc } from '@/lib/quiz-history';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

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
          
          if (userData) {
            setFormData({
              name: userData.name || user.displayName || '',
              email: userData.email || user.email || '',
            });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load account settings');
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [user, authLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !userDoc) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update user profile in Firebase Auth (if needed)
      // Note: Email updates require re-authentication in Firebase
      
      // Update user document in Firestore
      const response = await fetch('/api/update-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          updates: {
            name: formData.name,
            email: formData.email,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Refresh user data
      const updatedUserData = await getUser(user.uid);
      setUserDoc(updatedUserData);
      
      setSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      return;
    }

    if (!confirm('This will permanently delete your account and all associated data. Type DELETE to confirm.')) {
      return;
    }

    try {
      // Call delete account API
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out and redirect
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please contact support.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
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
            {error || 'Please sign in to access your settings.'}
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
            Account Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your personal information and account preferences.
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Profile Information
          </h3>
          
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your display name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your email address"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Note: Changing your email may require re-authentication.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Account Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                User ID
              </label>
              <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                {user.uid}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Authentication Provider
              </label>
              <p className="text-gray-900 dark:text-white">
                {user.providerData[0]?.providerId === 'google.com' ? 'Google' :
                 user.providerData[0]?.providerId === 'github.com' ? 'GitHub' :
                 'Anonymous'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Member Since
              </label>
              <p className="text-gray-900 dark:text-white">
                {userDoc?.joinedAt ? new Date(userDoc.joinedAt.toDate()).toLocaleDateString() : 'Unknown'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Last Sign In
              </label>
              <p className="text-gray-900 dark:text-white">
                {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Subscription
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">
                {userDoc?.isFounder ? '🏆 Founder Tier' : userDoc?.isPremium ? '⭐ Premium' : '🆓 Free Plan'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userDoc?.isFounder 
                  ? 'Unlimited access with lifetime pricing'
                  : userDoc?.isPremium 
                  ? 'Unlimited access to all features'
                  : 'Limited to basic features'
                }
              </p>
            </div>
            <Link
              href="/dashboard/subscription"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-6">
            Danger Zone
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Delete Account</h4>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
