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

// Comprehensive cleanup function to remove all auth data
const cleanupAuthState = () => {
  console.log('AuthProvider: Performing comprehensive auth state cleanup');
  
  try {
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || 
          key.startsWith('supabase-auth-') || key.includes('supabase_auth')) {
        console.log('AuthProvider: Removing localStorage key:', key);
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') ||
          key.startsWith('supabase-auth-') || key.includes('supabase_auth')) {
        console.log('AuthProvider: Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      }
    });

    // Clear auth-related cookies that might be causing the size issue
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token', 
      'supabase-auth-token',
      'supabase-refresh-token',
      'sb-ucbkcxupzjbblnzyiyui-auth-token'
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Clear cookie for current domain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      // Clear for subdomain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      // Clear for root domain
      const rootDomain = window.location.hostname.split('.').slice(-2).join('.');
      if (rootDomain !== window.location.hostname) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
      }
    });

    console.log('AuthProvider: Auth cleanup completed successfully');
  } catch (error) {
    console.error('AuthProvider: Error during auth cleanup:', error);
  }
};

// Define protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/feedback', '/data-management'];

const isProtectedRoute = (pathname: string) => {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    // Clean up any existing large tokens that might cause 400 errors
    cleanupAuthState();
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider: Auth event:', event, 'User:', session?.user?.email || 'No user');
        console.log('AuthProvider: Current path:', window.location.pathname);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clean up on sign out
        if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, cleaning up');
          cleanupAuthState();
        }
        
        // CRITICAL: Do NOT check subscription or redirect for any events
        // Let the components handle their own routing logic
        console.log('AuthProvider: Auth state updated, no automatic redirects');
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Existing session check:', session?.user?.email || 'No existing session');
      console.log('AuthProvider: Current path during session check:', window.location.pathname);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // CRITICAL: Do NOT perform any automatic redirects here
      console.log('AuthProvider: Session loaded, letting components handle routing');
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth state listener');
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
