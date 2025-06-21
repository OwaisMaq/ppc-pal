import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const useAuthRedirect = () => {
  const [authTimeout, setAuthTimeout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  // Timeout fallback to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Auth: Auth loading timeout reached, forcing loading to false');
        setAuthTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Only redirect authenticated users who are specifically trying to access the auth page
  useEffect(() => {
    console.log('Auth: useEffect triggered, loading:', loading, 'user:', user?.email || 'No user', 'pathname:', location.pathname);
    
    // Wait for auth to finish loading before making any decisions (unless timeout)
    if (loading && !authTimeout) {
      console.log('Auth: Still loading auth state, waiting...');
      return;
    }
    
    // Only redirect if user is authenticated and specifically on /auth page
    if (user && location.pathname === '/auth') {
      console.log('Auth: Authenticated user on /auth page, redirecting to /dashboard');
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate, location.pathname, authTimeout]);

  return {
    user,
    loading,
    authTimeout,
    location
  };
};
