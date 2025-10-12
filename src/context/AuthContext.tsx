'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { initializeUser } from '@/lib/user-management';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Initialize user in Firebase if signed in
      if (user) {
        try {
          console.log('👤 User signed in:', user.email || 'Anonymous');
          
          // Determine auth provider
          const provider = user.providerData[0]?.providerId.includes('google') ? 'google' 
            : user.providerData[0]?.providerId.includes('github') ? 'github' 
            : 'anonymous';
          
          // Initialize user document in Firestore
          await initializeUser(user.uid, {
            email: user.email || 'anonymous@example.com',
            name: user.displayName || 'Anonymous User',
            provider: provider
          });
          
          console.log('✅ User initialized in Firebase');
        } catch (error) {
          console.error('❌ Error initializing user:', error);
        }
      } else {
        console.log('👤 User signed out');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
