
import { useAuthHandlers } from "@/hooks/useAuthHandlers";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import AuthHeader from "./AuthHeader";
import AuthForm from "./AuthForm";
import AuthFooter from "./AuthFooter";

const AuthContainer = () => {
  const {
    formData,
    showPassword,
    isLoading,
    handleInputChange,
    handleSignIn,
    handleSignUp,
    setShowPassword
  } = useAuthHandlers();

  const { user, loading, authTimeout, location } = useAuthRedirect();

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

export default AuthContainer;
