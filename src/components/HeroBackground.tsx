import React from "react";

interface HeroBackgroundProps {
  imageUrl?: string;
  children?: React.ReactNode;
}

const HeroBackground: React.FC<HeroBackgroundProps> = ({ imageUrl, children }) => {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Hero background decorative"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" aria-hidden="true" />
      {/* Light vignette */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />

      <div className="container relative mx-auto px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-24">
        {children}
      </div>
    </section>
  );
};

export default HeroBackground;
