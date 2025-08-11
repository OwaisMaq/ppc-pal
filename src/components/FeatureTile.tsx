import React from "react";
import { cn } from "@/lib/utils";

interface FeatureTileProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  className?: string;
}

const FeatureTile: React.FC<FeatureTileProps> = ({ title, subtitle, imageUrl, className }) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border shadow-md",
        "bg-gradient-to-br from-muted to-background",
        "transition-transform duration-200 hover:scale-[1.01]",
        className
      )}
      role="article"
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-80"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/30 to-transparent" aria-hidden="true" />
      <div className="relative p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
};

export default FeatureTile;
