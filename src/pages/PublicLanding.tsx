
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/landing/CosmicBackground";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingCompanyInfo from "@/components/landing/LandingCompanyInfo";
import LandingFooter from "@/components/landing/LandingFooter";

const PublicLanding = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    console.log('PublicLanding: Component mounted');
    console.log('PublicLanding: Current URL:', window.location.href);
    console.log('PublicLanding: Current pathname:', window.location.pathname);
    console.log('PublicLanding: User:', user?.email || 'No user', 'Loading:', loading);
    
    // CRITICAL: This is a public page - NEVER redirect automatically
    console.log('PublicLanding: This is a public page, no redirects should happen');
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <CosmicBackground />
      <LandingHeader user={user} />
      <LandingHero user={user} />
      <LandingFeatures />
      <LandingCompanyInfo />
      <LandingFooter />
    </div>
  );
};

export default PublicLanding;
