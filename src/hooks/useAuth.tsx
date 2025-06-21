
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cleanup function to remove stale auth data
const cleanupAuthState = () => {
  console.log('AuthProvider: Cleaning up auth state');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('AuthProvider: Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('AuthProvider: Removing sessionStorage key:', key);
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider: Auth event:', event, 'User:', session?.user?.email || 'No user');
        console.log('AuthProvider: Current path:', window.location.pathname);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // Always set loading to false when auth state changes
        
        // Clean up on sign out
        if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, cleaning up');
          cleanupAuthState();
        }
        
        console.log('AuthProvider: Auth state updated, loading set to false');
      }
    );

    // THEN check for existing session with proper error handling
    const checkSession = async () => {
      try {
        console.log('AuthProvider: Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          // Even if there's an error, we should stop loading
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        console.log('AuthProvider: Existing session check result:', session?.user?.email || 'No existing session');
        console.log('AuthProvider: Current path during session check:', window.location.pathname);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
        
        console.log('AuthProvider: Session loaded, loading set to false');
      } catch (error) {
        console.error('AuthProvider: Unexpected error during session check:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      console.log('AuthProvider: Cleaning up auth state listener');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out user');
      
      // Clean up auth state first
      cleanupAuthState();
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Navigate to landing page instead of forcing reload
      window.location.href = '/';
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
      // Even if sign out fails, clean up and redirect
      cleanupAuthState();
      window.location.href = '/';
    }
  };

  console.log('AuthProvider: Rendering with user:', user?.email || 'No user', 'loading:', loading, 'current path:', window.location.pathname);

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
