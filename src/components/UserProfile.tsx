'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import Link from 'next/link';

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const getUserDisplayName = () => {
    if (user.isAnonymous) return 'Guest User';
    return user.displayName || user.email?.split('@')[0] || 'User';
  };

  const getUserAvatar = () => {
    if (user.isAnonymous) {
      return (
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      );
    }
    
    if (user.photoURL) {
      return (
        <img 
          src={user.photoURL} 
          alt={getUserDisplayName()}
          className="w-8 h-8 rounded-full"
        />
      );
    }
    
    return (
      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-sm font-medium">
          {getUserDisplayName().charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {getUserAvatar()}
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {getUserDisplayName()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user.isAnonymous ? 'Guest' : 'Signed in'}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {getUserDisplayName()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user.isAnonymous ? 'Guest Account' : user.email}
            </div>
          </div>
          
          {user.isAnonymous && (
            <div className="px-4 py-2">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Guest accounts have limited features
              </div>
              <button className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                Sign in for full access
              </button>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          
          <div className="px-4 py-2">
            <Link
              href="/dashboard"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </Link>
          </div>
          
          <div className="px-4 py-2">
            <Link
              href="/pricing"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pricing
            </Link>
          </div>
          
          <div className="px-4 py-2">
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full text-left text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
