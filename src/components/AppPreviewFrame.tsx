import React from "react";
import { cn } from "@/lib/utils";

interface AppPreviewFrameProps {
  className?: string;
  children?: React.ReactNode;
  title?: string;
}

const AppPreviewFrame: React.FC<AppPreviewFrameProps> = ({ className, children, title = "PPC Pal Preview" }) => {
  return (
    <div className="relative">
      {/* Floating accent shapes around preview */}
      <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-electric-purple/20 animate-float blur-sm" aria-hidden="true" />
      <div className="absolute -bottom-4 -left-4 w-8 h-8 rounded-lg bg-electric-orange/20 animate-float-slow rotate-45 blur-sm" aria-hidden="true" />
      
      <div
        className={cn(
          "rounded-3xl border border-border/40 backdrop-blur-xl shadow-2xl relative overflow-hidden",
          "bg-gradient-to-br from-card/90 via-card/70 to-muted/50",
          "ring-1 ring-electric-purple/10",
          className
        )}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        role="region"
        aria-label={title}
      >
        {/* Enhanced window bar with gradient */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50 bg-gradient-to-r from-background/80 to-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-red-400 to-red-500 shadow-sm" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm" aria-hidden="true" />
            </div>
            <div className="w-px h-4 bg-border/50 ml-2" />
            <div className="text-xs text-muted-foreground font-medium tracking-wide">{title}</div>
          </div>
        </div>
        
        {/* Content area with subtle glow */}
        <div className="p-6 sm:p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-purple/30 to-transparent" />
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppPreviewFrame;
