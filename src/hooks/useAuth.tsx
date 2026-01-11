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

// Only cleanup on explicit sign out - don't touch valid session data
const cleanupAuthState = () => {
  try {
    // Only clear cookies, leave localStorage alone (Supabase manages it)
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token', 
      'supabase-auth-token',
      'supabase-refresh-token',
      'sb-ucbkcxupzjbblnzyiyui-auth-token'
    ];
    
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      const rootDomain = window.location.hostname.split('.').slice(-2).join('.');
      if (rootDomain !== window.location.hostname) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
      }
    });
  } catch (error) {
    // Auth cleanup error - non-critical, continue
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clean up on sign out
        if (event === 'SIGNED_OUT') {
          cleanupAuthState();
        }
        
        // CRITICAL: Do NOT check subscription or redirect for any events
        // Let the components handle their own routing logic
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // CRITICAL: Do NOT perform any automatic redirects here
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Navigate to landing page instead of forcing reload
      window.location.href = '/';
    } catch (error) {
      // Even if sign out fails, clean up and redirect
      cleanupAuthState();
      window.location.href = '/';
    }
  };

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
