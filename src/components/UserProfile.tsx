'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

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
          
          <div className="px-4 py-2">
            <button
              onClick={signOut}
              className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
