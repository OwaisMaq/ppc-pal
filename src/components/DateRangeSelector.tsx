import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useDateRange } from "@/context/DateRangeContext";

interface DateRangeSelectorProps {
  className?: string;
}

export const DateRangeSelector = ({ className = "w-40" }: DateRangeSelectorProps) => {
  const { dateRangeDays, setDateRangeDays } = useDateRange();

  return (
    <Select value={String(dateRangeDays)} onValueChange={(v) => setDateRangeDays(parseInt(v))}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Range" />
      </SelectTrigger>
      <SelectContent className="z-50 bg-background border shadow-md">
        <SelectItem value="1">Today</SelectItem>
        <SelectItem value="7">7 days</SelectItem>
        <SelectItem value="14">14 days</SelectItem>
        <SelectItem value="30">30 days</SelectItem>
        <SelectItem value="90">90 days</SelectItem>
      </SelectContent>
    </Select>
  );
};