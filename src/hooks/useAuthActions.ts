
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Cleanup function to remove stale auth data
const cleanupAuthState = () => {
  console.log('Auth: Cleaning up auth state');
  
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Auth: Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Auth: Removing sessionStorage key:', key);
      sessionStorage.removeItem(key);
    }
  });
};

export const useAuthActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
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
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        console.log('Auth: Sign in successful, redirecting to /dashboard');
        toast.success("Welcome back!");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      let errorMessage = "Failed to sign in";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account";
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
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
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.user) {
        console.log('Auth: Sign up successful');
        toast.success("Account created successfully! Please check your email to confirm your account.");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      let errorMessage = "Failed to create account";
      
      if (error.message.includes("already registered")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (error.message.includes("Password should be")) {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    signIn,
    signUp
  };
};
