import React from "react";
import { cn } from "@/lib/utils";

interface FeatureTileProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  className?: string;
}

const FeatureTile: React.FC<FeatureTileProps> = ({ title, subtitle, imageUrl, className }) => {
  // Vibrant gradient combinations inspired by Neura
  const gradients = [
    "from-electric-purple/20 via-electric-purple/10 to-electric-blue/20",
    "from-electric-orange/20 via-electric-pink/10 to-electric-orange/20", 
    "from-electric-green/20 via-electric-blue/10 to-brand/20"
  ];
  
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
  
  return (
    <div className="relative">
      {/* Floating decorative elements */}
      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-electric-purple/30 animate-float-reverse blur-sm" aria-hidden="true" />
      <div className="absolute -bottom-1 -left-2 w-4 h-4 rounded-sm bg-electric-orange/30 animate-float rotate-45 blur-sm" aria-hidden="true" />
      
      <div
        className={cn(
          "group relative overflow-hidden rounded-3xl border border-border/30 shadow-xl",
          "bg-gradient-to-br", randomGradient,
          "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-electric-purple/20",
          "backdrop-blur-sm",
          className
        )}
        role="article"
        style={{ boxShadow: 'var(--glow-primary)' }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60 transition-all duration-500 group-hover:opacity-75 group-hover:scale-105"
            loading="lazy"
          />
        )}
        
        {/* Enhanced gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" aria-hidden="true" />
        
        {/* Subtle accent border */}
        <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 group-hover:ring-electric-purple/20 transition-colors duration-300" />
        
        <div className="relative p-6 sm:p-8 h-full flex flex-col justify-end">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-electric-purple transition-colors duration-300">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-electric-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
        </div>
      </div>
    </div>
  );
};

export default FeatureTile;
