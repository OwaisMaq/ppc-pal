import React from "react";
import { cn } from "@/lib/utils";

interface KpiChipProps {
  label: string;
  value: string;
  change?: { value: string; direction: "up" | "down" };
  className?: string;
}

const KpiChip: React.FC<KpiChipProps> = ({ label, value, change, className }) => {
  const changeColor = change?.direction === "up" ? "text-emerald-500" : change?.direction === "down" ? "text-red-500" : "text-muted-foreground";
  const arrow = change?.direction === "up" ? "▲" : change?.direction === "down" ? "▼" : null;
  
  return (
    <div 
      className={cn(
        "rounded-lg bg-card border shadow-sm",
        "px-4 py-3 flex items-center gap-3",
        "transition-all duration-200 hover:shadow-md",
        className
      )}
    >
        <span className="text-xs uppercase tracking-wide text-muted-foreground/80 font-medium">{label}</span>
        <div className="w-px h-4 bg-border/50" />
        <span className="font-semibold text-foreground">{value}</span>
        {change && (
          <span className={cn("text-xs font-medium flex items-center gap-1", changeColor)} aria-label={`Change ${change.direction} ${change.value}`}>
            {arrow} {change.value}
          </span>
        )}
    </div>
  );
};

export default KpiChip;
