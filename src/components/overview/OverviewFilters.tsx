import { DateRangePicker } from "@/components/DateRangePicker";
import { ASINFilter } from "@/components/ASINFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

export type DatePreset = 'last_week' | 'last_month' | 'last_90_days' | 'custom';

interface OverviewFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  selectedASIN: string | null;
  onASINChange: (asin: string | null) => void;
  // Future: brand and marketplace filters
}

const presetRanges: Record<Exclude<DatePreset, 'custom'>, () => DateRange> = {
  last_week: () => ({
    from: subDays(new Date(), 7),
    to: new Date()
  }),
  last_month: () => ({
    from: subDays(new Date(), 30),
    to: new Date()
  }),
  last_90_days: () => ({
    from: subDays(new Date(), 90),
    to: new Date()
  })
};

export const OverviewFilters = ({
  dateRange,
  onDateRangeChange,
  datePreset,
  onDatePresetChange,
  selectedASIN,
  onASINChange
}: OverviewFiltersProps) => {
  const handlePresetChange = (preset: DatePreset) => {
    onDatePresetChange(preset);
    if (preset !== 'custom') {
      onDateRangeChange(presetRanges[preset]());
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    // If user manually picks a date, switch to custom
    if (range && datePreset !== 'custom') {
      onDatePresetChange('custom');
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_week">Last 7 days</SelectItem>
            <SelectItem value="last_month">Last 30 days</SelectItem>
            <SelectItem value="last_90_days">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <DateRangePicker 
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">ASIN:</span>
        <ASINFilter 
          selectedASIN={selectedASIN}
          onASINChange={onASINChange}
        />
      </div>
    </div>
  );
};