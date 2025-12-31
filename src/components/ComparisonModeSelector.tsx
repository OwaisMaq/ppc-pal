import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const comparisonOptions = [
  { value: "previous", label: "Previous Period", icon: CalendarRange },
  { value: "last-year", label: "Last Year", icon: CalendarClock },
  { value: "custom", label: "Custom", icon: Calendar },
] as const;

export function ComparisonModeSelector({
  mode,
  onModeChange,
  customRange,
  onCustomRangeChange,
  className
}: ComparisonModeSelectorProps) {
  const selectedOption = comparisonOptions.find(opt => opt.value === mode);
  const Icon = selectedOption?.icon || CalendarRange;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Compare to:
        </span>
        <Select value={mode} onValueChange={(value) => onModeChange(value as ComparisonMode)}>
          <SelectTrigger className="w-[160px] h-9">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {comparisonOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {mode === "custom" && (
          <DateRangePicker 
            value={customRange}
            onChange={onCustomRangeChange}
          />
        )}
      </div>
    </div>
  );
}