import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FeatureTileProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const FeatureTile: React.FC<FeatureTileProps> = ({ title, subtitle, imageUrl, className, actionLabel, onAction }) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card shadow-sm",
        "transition-all duration-200 hover:shadow-md",
        className
      )}
      role="article"
    >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
            loading="lazy"
          />
        )}
        
        {/* Clean overlay */}
        <div className="absolute inset-0 bg-card/80" aria-hidden="true" />
        
        <div className="relative p-6 h-full flex flex-col justify-between min-h-[200px]">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          
          {actionLabel && onAction && (
            <div className="mt-4">
              <Button 
                variant="translucent" 
                size="sm" 
                onClick={onAction}
                className="w-full"
              >
                {actionLabel}
              </Button>
            </div>
          )}
        </div>
    </div>
  );
};

export default FeatureTile;
