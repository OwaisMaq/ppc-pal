import React from "react";

interface HeroBackgroundProps {
  imageUrl?: string;
  children?: React.ReactNode;
}

const HeroBackground: React.FC<HeroBackgroundProps> = ({ imageUrl, children }) => {
  return (
    <section className="relative overflow-hidden min-h-screen bg-background">
      {/* Background image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Hero background decorative"
          className="absolute inset-0 h-full w-full object-cover opacity-10"
          loading="eager"
        />
      )}
      
      {/* Clean subtle overlay */}
      <div className="absolute inset-0 bg-background/90" aria-hidden="true" />

      <div className="container relative mx-auto px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-24 flex flex-col justify-center min-h-screen">
        {children}
      </div>
    </section>
  );
};

export default HeroBackground;
