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
          "rounded-full bg-gradient-to-r from-card/90 to-secondary/80 text-secondary-foreground",
          "border border-border/50 px-4 py-2.5 flex items-center gap-3 shadow-lg backdrop-blur-sm",
          "transition-all duration-300 hover:shadow-xl hover:scale-105",
          `hover:border-${accentColor}/30`,
          className
        )}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
      >
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
        <div className={`w-px h-4 bg-${accentColor}/30`} />
        <span className="font-semibold text-foreground">{value}</span>
        {change && (
          <span className={cn("text-xs font-medium flex items-center gap-1", changeColor)} aria-label={`Change ${change.direction} ${change.value}`}>
            {arrow} {change.value}
          </span>
        )}
        
        {/* Subtle inner glow */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-${accentColor}/5 to-transparent opacity-50`} />
      </div>
    </div>
  );
};

export default KpiChip;
