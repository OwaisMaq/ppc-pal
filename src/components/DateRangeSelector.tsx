import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useState } from 'react';

interface DateRangeSelectorProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (range: {
    startDate: string;
    endDate: string;
  }) => void;
}

export const DateRangeSelector = ({
  dateRange,
  onDateRangeChange
}: DateRangeSelectorProps) => {
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: new Date(dateRange.startDate),
    to: new Date(dateRange.endDate)
  });

  const handleRangeChange = (range: DateRange | undefined) => {
    setCalendarRange(range);
    if (range?.from && range?.to) {
      onDateRangeChange({
        startDate: range.from.toISOString().split('T')[0],
        endDate: range.to.toISOString().split('T')[0]
      });
    }
  };

  const formatDateRange = () => {
    if (calendarRange?.from) {
      if (calendarRange?.to) {
        return `${format(calendarRange.from, 'LLL dd, y')} - ${format(calendarRange.to, 'LLL dd, y')}`;
      }
      return format(calendarRange.from, 'LLL dd, y');
    }
    return 'Pick a date range';
  };

  return (
    <div className="flex flex-col space-y-2">
      <Label>Date Range</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-80 justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={calendarRange?.from}
            selected={calendarRange}
            onSelect={handleRangeChange}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};