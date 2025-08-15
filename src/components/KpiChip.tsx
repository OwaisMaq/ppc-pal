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
  
  // Dynamic accent colors for different KPIs
  const accentColors = ["electric-purple", "electric-orange", "electric-blue", "electric-green"];
  const accentColor = accentColors[label.length % accentColors.length];

  return (
    <div className="relative">
      {/* Subtle floating accent */}
      <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-${accentColor}/40 animate-pulse blur-sm`} aria-hidden="true" />
      
      <div 
        className={cn(
          "rounded-2xl bg-card/50 text-card-foreground border border-border/20",
          "px-4 py-3 flex items-center gap-3 shadow-lg backdrop-blur-sm",
          "transition-all duration-300 hover:shadow-xl hover:bg-card/80",
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
    </div>
  );
};

export default KpiChip;
