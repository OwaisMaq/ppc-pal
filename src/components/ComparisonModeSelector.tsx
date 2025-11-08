import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarRange, CalendarClock } from "lucide-react";
import { DateRangePicker } from "./DateRangePicker";
import { DateRange } from "react-day-picker";

export type ComparisonMode = "previous" | "last-year" | "custom";

interface ComparisonModeSelectorProps {
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
  className?: string;
}

export function ComparisonModeSelector({
  mode,
  onModeChange,
  customRange,
  onCustomRangeChange,
  className
}: ComparisonModeSelectorProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Compare to:
          </span>
          <ToggleGroup 
            type="single" 
            value={mode} 
            onValueChange={(value) => value && onModeChange(value as ComparisonMode)}
            className="justify-start"
          >
            <ToggleGroupItem value="previous" aria-label="Compare to previous period" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline">Previous Period</span>
              <span className="sm:hidden">Previous</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="last-year" aria-label="Compare to same period last year" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              <span className="hidden sm:inline">Last Year</span>
              <span className="sm:hidden">YoY</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="custom" aria-label="Compare to custom period" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Custom</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {mode === "custom" && (
          <div className="flex items-center gap-3 pl-0 sm:pl-[108px]">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Custom Range:
            </span>
            <DateRangePicker 
              value={customRange}
              onChange={onCustomRangeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
