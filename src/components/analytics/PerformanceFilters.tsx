import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useASINs } from '@/hooks/useASINs';

export type TimePeriod = '24h' | '7d' | '30d';

interface PerformanceFiltersProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  selectedASIN: string | null;
  onASINChange: (asin: string | null) => void;
}

export function PerformanceFilters({
  period,
  onPeriodChange,
  selectedASIN,
  onASINChange,
}: PerformanceFiltersProps) {
  const { asins, loading } = useASINs();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Time Period Toggle */}
      <ToggleGroup 
        type="single" 
        value={period} 
        onValueChange={(value) => value && onPeriodChange(value as TimePeriod)}
        className="bg-muted p-1 rounded-lg"
      >
        <ToggleGroupItem 
          value="24h" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
        >
          24h
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="7d" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
        >
          7d
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="30d" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
        >
          30d
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Product (ASIN) Selector */}
      <Select 
        value={selectedASIN || 'all'} 
        onValueChange={(value) => onASINChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Products" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Products</SelectItem>
          {loading ? (
            <SelectItem value="loading" disabled>Loading...</SelectItem>
          ) : (
            asins.map((asinInfo) => (
              <SelectItem key={asinInfo.asin} value={asinInfo.asin}>
                {asinInfo.label || asinInfo.asin}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
