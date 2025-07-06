
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { errorTracker } from '@/services/errorTracker';
import { toast } from 'sonner';

export const useAuthActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn: authSignIn, signUp: authSignUp } = useAuth();

  const signIn = async (email: string, password: string) => {
    console.log('=== Sign In Attempt ===');
    setIsLoading(true);
    
    try {
      const result = await authSignIn(email, password);
      
      if (result.error) {
        console.error('Sign in error:', result.error);
        
        errorTracker.captureError(result.error.message, {
          component: 'Auth',
          action: 'signin',
          metadata: { email }
        });
        
        toast.error("Sign In Failed", {
          description: result.error.message
        });
        
        throw new Error(result.error.message);
      }
      
      console.log('Sign in successful');
      toast.success("Welcome back!", {
        description: "You have been signed in successfully"
      });
      
      return result;
      
    } catch (error) {
      console.error('Sign in error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      
      errorTracker.captureError(errorMessage, {
        component: 'Auth',
        action: 'signin',
        metadata: { email }
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('=== Sign Up Attempt ===');
    setIsLoading(true);
    
    try {
      const result = await authSignUp(email, password);
      
      if (result.error) {
        console.error('Sign up error:', result.error);
        
        errorTracker.captureError(result.error.message, {
          component: 'Auth',
          action: 'signup',
          metadata: { email }
        });
        
        toast.error("Sign Up Failed", {
          description: result.error.message
        });
        
        throw new Error(result.error.message);
      }
      
      console.log('Sign up successful');
      toast.success("Account Created!", {
        description: "Please check your email to verify your account"
      });
      
      return result;
      
    } catch (error) {
      console.error('Sign up error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      
      errorTracker.captureError(errorMessage, {
        component: 'Auth',
        action: 'signup',
        metadata: { email }
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    isLoading
  };
};
