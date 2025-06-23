
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCompanyInfo from '@/components/landing/LandingCompanyInfo';
import LandingFooter from '@/components/landing/LandingFooter';
import CosmicBackground from '@/components/landing/CosmicBackground';
import CookieConsent from '@/components/CookieConsent';

const PublicLanding = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <LandingHeader user={user} />
        <LandingHero user={user} />
        <LandingFeatures />
        <LandingCompanyInfo />
        <LandingFooter />
      </div>
      <CookieConsent />
    </div>
  );
};

export default PublicLanding;
