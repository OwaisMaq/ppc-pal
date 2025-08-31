import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

export type DateRange = {
  from: Date;
  to: Date;
};

export type DatePreset = '7D' | '14D' | '30D' | '90D' | 'custom';

interface DashboardFiltersProps {
  selectedProfile?: string;
  onProfileChange: (profileId: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedPreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  granularity: 'day' | 'week' | 'month';
  onGranularityChange: (granularity: 'day' | 'week' | 'month') => void;
}

const datePresets: { label: string; value: DatePreset; days: number }[] = [
  { label: 'Last 7 Days', value: '7D', days: 7 },
  { label: 'Last 14 Days', value: '14D', days: 14 },
  { label: 'Last 30 Days', value: '30D', days: 30 },
  { label: 'Last 90 Days', value: '90D', days: 90 },
  { label: 'Custom Range', value: 'custom', days: 0 },
];

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  selectedProfile,
  onProfileChange,
  dateRange,
  onDateRangeChange,
  selectedPreset,
  onPresetChange,
  granularity,
  onGranularityChange,
}) => {
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const handlePresetChange = (preset: DatePreset) => {
    onPresetChange(preset);
    
    if (preset !== 'custom') {
      const presetData = datePresets.find(p => p.value === preset);
      if (presetData) {
        const to = new Date();
        const from = subDays(to, presetData.days);
        onDateRangeChange({ from, to });
      }
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return "Select date range";
    
    if (selectedPreset !== 'custom') {
      const preset = datePresets.find(p => p.value === selectedPreset);
      return preset?.label || "Date range";
    }
    
    return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`;
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card border rounded-lg">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Profile</label>
        <Select value={selectedProfile} onValueChange={onProfileChange} disabled={connectionsLoading}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select profile" />
          </SelectTrigger>
          <SelectContent>
            {connections?.map((connection) => (
              <SelectItem key={connection.id} value={connection.profile_id}>
                {connection.profile_name || connection.profile_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Date Range</label>
        <div className="flex gap-2">
          {datePresets.slice(0, 4).map((preset) => (
            <Button
              key={preset.value}
              variant={selectedPreset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedPreset === 'custom' ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
                onClick={() => {
                  if (selectedPreset !== 'custom') {
                    onPresetChange('custom');
                  }
                  setIsCalendarOpen(true);
                }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onDateRangeChange({ from: range.from, to: range.to });
                    onPresetChange('custom');
                    setIsCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Chart Granularity</label>
        <Select value={granularity} onValueChange={onGranularityChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};