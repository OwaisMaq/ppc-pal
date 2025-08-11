import React from "react";
import { cn } from "@/lib/utils";

interface AppPreviewFrameProps {
  className?: string;
  children?: React.ReactNode;
  title?: string;
}

const AppPreviewFrame: React.FC<AppPreviewFrameProps> = ({ className, children, title = "PPC Pal Preview" }) => {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-lg",
        "ring-1 ring-border/60",
        className
      )}
      role="region"
      aria-label={title}
    >
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400/90" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-amber-400/90" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/90" aria-hidden="true" />
        </div>
        <div className="mx-auto text-xs text-muted-foreground">{title}</div>
      </div>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default AppPreviewFrame;
