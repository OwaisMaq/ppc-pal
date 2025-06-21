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
    return <div>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative overflow-hidden">
      <CosmicBackground />
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingCompanyInfo />
      <LandingFooter />
      <CookieConsent />
    </div>
  );
};

export default PublicLanding;
