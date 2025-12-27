import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface ConfidenceMeterProps {
  /** Score from 0-100 */
  score: number;
  /** Label for the meter */
  label: string;
  /** Optional description */
  description?: string;
  /** Visual variant */
  variant?: 'bar' | 'radial';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * ConfidenceMeter - Automation Health Visualization
 * 
 * Shows "Automation Health" or "Budget Safety" levels as a simple
 * progress bar or radial gauge. Part of the "Watchful Guardian" design system.
 */
export const ConfidenceMeter = ({
  score,
  label,
  description,
  variant = 'bar',
  size = 'md',
  className
}: ConfidenceMeterProps) => {
  const getStatusColor = () => {
    if (score >= 70) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-error';
  };

  const getStatusIcon = () => {
    if (score >= 70) return <CheckCircle className="h-4 w-4 text-success" />;
    if (score >= 40) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <AlertTriangle className="h-4 w-4 text-error" />;
  };

  const getStatusLabel = () => {
    if (score >= 70) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Low';
  };

  const sizeConfig = {
    sm: { bar: 'h-1.5', text: 'text-xs' },
    md: { bar: 'h-2', text: 'text-sm' },
    lg: { bar: 'h-3', text: 'text-base' }
  };

  if (variant === 'radial') {
    const radius = size === 'sm' ? 24 : size === 'md' ? 32 : 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="relative">
          <svg
            className="transform -rotate-90"
            width={radius * 2 + 8}
            height={radius * 2 + 8}
          >
            {/* Background circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={4}
            />
            {/* Progress circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              fill="none"
              stroke={score >= 70 ? 'hsl(var(--success))' : score >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--error))'}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-display font-bold", sizeConfig[size].text)}>
              {score}%
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    );
  }

  // Bar variant (default)
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-medium text-foreground", sizeConfig[size].text)}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusIcon()}
          <span className={cn("font-medium", sizeConfig[size].text)}>
            {getStatusLabel()}
          </span>
        </div>
      </div>
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", sizeConfig[size].bar)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", getStatusColor())}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default ConfidenceMeter;
