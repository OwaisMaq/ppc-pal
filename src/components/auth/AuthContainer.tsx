
import { useAuth } from "@/contexts/AuthContext";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import AuthHeader from "./AuthHeader";
import AuthForm from "./AuthForm";
import AuthFooter from "./AuthFooter";

const AuthContainer = () => {
  const { user, loading } = useAuth();
  const { location, authTimeout } = useAuthRedirect();
  const authForm = useAuthForm();
  const { isLoading, signIn, signUp } = useAuthActions();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.validateForm(false)) return;
    
    try {
      await signIn(authForm.formData.email, authForm.formData.password);
    } catch (error) {
      // Error is already handled in useAuthActions
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.validateForm(true)) return;
    
    try {
      await signUp(authForm.formData.email, authForm.formData.password);
      authForm.resetForm();
    } catch (error) {
      // Error is already handled in useAuthActions
    }
  };

  // Show loading only when auth state is actually loading and no timeout
  if (loading && !authTimeout) {
    console.log('Auth: Showing loading spinner while auth state loads');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is authenticated and on auth page, show loading while redirect happens
  if (user && location.pathname === '/auth') {
    console.log('Auth: User authenticated on auth page, showing loading during redirect');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('Auth: Rendering auth form');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthHeader />
        
        <AuthForm
          formData={authForm.formData}
          errors={authForm.errors}
          showPassword={authForm.showPassword}
          isLoading={isLoading}
          onInputChange={authForm.handleInputChange}
          onTogglePassword={() => authForm.setShowPassword(!authForm.showPassword)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
        
        <AuthFooter />
      </div>
    </div>
  );
};

export default AuthContainer;
