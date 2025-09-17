import React from "react";
import { cn } from "@/lib/utils";

interface KpiChipProps {
  label: string;
  value: string;
  change?: { value: string; direction: "up" | "down" };
  className?: string;
  primary?: boolean;
  compact?: boolean;
}

const KpiChip: React.FC<KpiChipProps> = ({ 
  label, 
  value, 
  change, 
  className, 
  primary = false,
  compact = false 
}) => {
  const changeColor = change?.direction === "up" ? "text-emerald-500" : change?.direction === "down" ? "text-red-500" : "text-muted-foreground";
  const arrow = change?.direction === "up" ? "▲" : change?.direction === "down" ? "▼" : null;
  
  return (
    <div 
      className={cn(
        "rounded-lg bg-card border shadow-sm transition-all duration-200 hover:shadow-md",
        primary 
          ? "px-6 py-4 flex flex-col gap-2" 
          : compact
          ? "px-3 py-2 flex items-center gap-2"
          : "px-4 py-3 flex items-center gap-3",
        className
      )}
    >
      {primary ? (
        // Primary layout - stacked vertically for prominence
        <>
          <span className="text-xs uppercase tracking-wide text-muted-foreground/80 font-medium">{label}</span>
          <div className="flex items-baseline justify-between">
            <span className={cn("font-bold text-foreground", compact ? "text-lg" : "text-2xl")}>{value}</span>
            {change && (
              <span className={cn("text-xs font-medium flex items-center gap-1", changeColor)} aria-label={`Change ${change.direction} ${change.value}`}>
                {arrow} {change.value}
              </span>
            )}
          </div>
        </>
      ) : (
        // Secondary/compact layout - horizontal
        <>
          <span className={cn("uppercase tracking-wide text-muted-foreground/80 font-medium", compact ? "text-xs" : "text-xs")}>{label}</span>
          {!compact && <div className="w-px h-4 bg-border/50" />}
          <span className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{value}</span>
          {change && (
            <span className={cn("text-xs font-medium flex items-center gap-1", changeColor)} aria-label={`Change ${change.direction} ${change.value}`}>
              {arrow} {change.value}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default KpiChip;
