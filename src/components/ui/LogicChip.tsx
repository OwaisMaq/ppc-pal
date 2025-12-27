import { cn } from "@/lib/utils";
import { Brain, Info, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LogicChipProps {
  /** The condition that triggered the action (e.g., "ACOS > 40%") */
  trigger: string;
  /** The action that was taken (e.g., "Bid -10%") */
  action: string;
  /** Optional detailed explanation */
  details?: string;
  /** Visual style variant */
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

/**
 * LogicChip - Explainable Automation Component
 * 
 * Displays the reasoning behind automated actions in a clear If/Then format.
 * Part of the "Watchful Guardian" design system for transparent automation.
 */
export const LogicChip = ({
  trigger,
  action,
  details,
  variant = 'default',
  className
}: LogicChipProps) => {
  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary text-xs font-medium transition-colors duration-200",
        variant === 'compact' ? "px-2 py-0.5" : "px-3 py-1",
        variant === 'inline' && "bg-transparent border-0 px-0",
        "hover:bg-muted hover:border-border",
        className
      )}
    >
      {variant !== 'inline' && (
        <Brain className="h-3 w-3 text-muted-foreground" />
      )}
      <span className="text-muted-foreground">[</span>
      <span className="text-primary font-medium">{trigger}</span>
      <span className="text-muted-foreground">]</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">[</span>
      <span className="text-success font-medium">{action}</span>
      <span className="text-muted-foreground">]</span>
    </div>
  );

  if (details) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm">{details}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default LogicChip;
