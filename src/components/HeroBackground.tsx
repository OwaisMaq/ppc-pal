import React from "react";
import FloatingShapes from "./FloatingShapes";

interface HeroBackgroundProps {
  imageUrl?: string;
  children?: React.ReactNode;
}

const HeroBackground: React.FC<HeroBackgroundProps> = ({ imageUrl, children }) => {
  return (
    <section className="relative isolate overflow-hidden min-h-screen">
      {/* Floating geometric shapes */}
      <FloatingShapes density="medium" />
      
      {/* Background image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Hero background decorative"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="eager"
        />
      )}
      
      {/* Dynamic gradient overlay */}
      <div 
        className="absolute inset-0 opacity-90" 
        style={{ background: 'var(--gradient-hero)' }}
        aria-hidden="true" 
      />
      
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-electric-purple/5 via-transparent to-electric-orange/5" aria-hidden="true" />
      
      {/* Enhanced vignette with electric glow */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_60%,transparent_90%)] bg-gradient-to-r from-electric-blue/10 via-electric-purple/10 to-electric-orange/10" />

      <div className="container relative mx-auto px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-24 flex flex-col justify-center min-h-screen">
        {children}
      </div>
    </section>
  );
};

export default HeroBackground;
