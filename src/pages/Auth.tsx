
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthForm from "@/components/auth/AuthForm";
import AuthFooter from "@/components/auth/AuthFooter";

// Cleanup function to remove stale auth data
const cleanupAuthState = () => {
  console.log('Auth: Cleaning up auth state');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Auth: Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Auth: Removing sessionStorage key:', key);
      sessionStorage.removeItem(key);
    }
  });
};

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  // Only redirect authenticated users who are specifically trying to access the auth page
  useEffect(() => {
    console.log('Auth: useEffect triggered, loading:', loading, 'user:', user?.email || 'No user', 'pathname:', location.pathname);
    
    // CRITICAL: Only redirect if:
    // 1. Auth loading is complete
    // 2. User is authenticated 
    // 3. User is specifically on the /auth page (not other pages)
    // 4. We're not currently loading auth state
    if (!loading && user && location.pathname === '/auth') {
      console.log('Auth: Authenticated user on /auth page, redirecting to /dashboard');
      // Use replace to prevent back button issues
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Auth: Starting sign in process');
      
      // Clean up before sign in
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Auth: Sign out during sign in cleanup failed (continuing)');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        console.log('Auth: Sign in successful, redirecting to /dashboard');
        toast.success("Welcome back!");
        // Navigate to dashboard after successful sign in
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Auth: Starting sign up process');
      
      // Clean up before sign up
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Auth: Sign out during sign up cleanup failed (continuing)');
      }

      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.user) {
        console.log('Auth: Sign up successful');
        toast.success("Account created successfully! Please check your email to confirm your account.");
        // Don't redirect immediately for signup - wait for email confirmation
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      if (error.message.includes("already registered")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading only when we're specifically on the auth page and auth is loading
  if (loading && location.pathname === '/auth') {
    console.log('Auth: Showing loading spinner while auth state loads');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated and on auth page, don't render the form (redirect will happen)
  if (user && location.pathname === '/auth') {
    console.log('Auth: User authenticated on auth page, showing loading during redirect');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('Auth: Rendering auth form');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthHeader />
        
        <AuthForm
          formData={formData}
          showPassword={showPassword}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onTogglePassword={() => setShowPassword(!showPassword)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
        
        <AuthFooter />
      </div>
    </div>
  );
};

export default Auth;
