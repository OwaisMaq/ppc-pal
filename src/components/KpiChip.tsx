import React from "react";
import { cn } from "@/lib/utils";

interface KpiChipProps {
  label: string;
  value: string;
  change?: { value: string; direction: "up" | "down" };
  className?: string;
}

const KpiChip: React.FC<KpiChipProps> = ({ label, value, change, className }) => {
  const changeColor = change?.direction === "up" ? "text-emerald-600" : change?.direction === "down" ? "text-red-600" : "text-muted-foreground";
  const arrow = change?.direction === "up" ? "▲" : change?.direction === "down" ? "▼" : null;

  return (
    <div className={cn("rounded-full bg-secondary text-secondary-foreground/90 border px-4 py-2 flex items-center gap-3 shadow-sm", className)}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
      {change && (
        <span className={cn("text-xs font-medium", changeColor)} aria-label={`Change ${change.direction} ${change.value}`}>
          {arrow} {change.value}
        </span>
      )}
    </div>
  );
};

export default KpiChip;
