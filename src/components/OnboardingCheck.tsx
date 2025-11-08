import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

export const OnboardingCheck = ({ children }: { children: React.ReactNode }) => {
  const { needsOnboarding, loading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if already on onboarding or auth pages
    if (loading || location.pathname === '/onboarding' || location.pathname.startsWith('/auth')) {
      return;
    }

    if (needsOnboarding) {
      navigate('/onboarding');
    }
  }, [needsOnboarding, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return <>{children}</>;
};
