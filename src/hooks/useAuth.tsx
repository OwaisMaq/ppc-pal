
import { useState, useEffect, createContext, useContext } from 'react';
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider: Auth event:', event, 'User:', session?.user?.email || 'No user');
        console.log('AuthProvider: Current path:', window.location.pathname);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only check subscription status when user logs in, not on every auth change
        // and only if we're not on a public page
        if (event === 'SIGNED_IN' && session?.user) {
          const currentPath = window.location.pathname;
          const isPublicPage = ['/', '/company', '/about', '/contact', '/privacy'].includes(currentPath);
          
          console.log('AuthProvider: User signed in, current path:', currentPath, 'isPublicPage:', isPublicPage);
          
          if (!isPublicPage) {
            setTimeout(() => {
              checkSubscriptionStatus(session);
            }, 100);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Existing session check:', session?.user?.email || 'No existing session');
      console.log('AuthProvider: Current path during session check:', window.location.pathname);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Only check subscription status for existing session if not on public page
      if (session?.user) {
        const currentPath = window.location.pathname;
        const isPublicPage = ['/', '/company', '/about', '/contact', '/privacy'].includes(currentPath);
        
        console.log('AuthProvider: Existing session found, current path:', currentPath, 'isPublicPage:', isPublicPage);
        
        if (!isPublicPage) {
          setTimeout(() => {
            checkSubscriptionStatus(session);
          }, 100);
        }
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const checkSubscriptionStatus = async (session: Session) => {
    try {
      console.log('AuthProvider: Checking subscription status for:', session.user.email);
      await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error('AuthProvider: Error checking subscription status:', error);
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Force page reload and redirect to public landing
      window.location.href = '/';
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
    }
  };

  console.log('AuthProvider: Rendering with user:', user?.email || 'No user', 'loading:', loading);

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
