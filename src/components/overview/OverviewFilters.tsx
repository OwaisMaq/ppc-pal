import { DateRangePicker } from "@/components/DateRangePicker";
import { ASINFilter } from "@/components/ASINFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

export type DatePreset = 'last_week' | 'last_month' | 'last_90_days' | 'custom';

// Common Amazon marketplace IDs mapped to friendly names
const MARKETPLACE_NAMES: Record<string, string> = {
  'ATVPDKIKX0DER': 'US',
  'A2EUQ1WTGCTBG2': 'CA',
  'A1F83G8C2ARO7P': 'UK',
  'A1PA6795UKMFR9': 'DE',
  'A13V1IB3VIYZZH': 'FR',
  'A1RKKUPIHCS9HS': 'ES',
  'APJ6JRA9NG5V4': 'IT',
  'A1805IZSGTT6HS': 'NL',
  'A2Q3Y263D00KWC': 'BR',
  'A1AM78C64UM0Y8': 'MX',
  'A39IBJ37TRP1C6': 'AU',
  'A1VC38T7YXB528': 'JP',
  'AAHKV2X7AFYLW': 'CN',
  'A21TJRUUN4KGV': 'IN',
  'A19VAU5U5O7RUS': 'SG',
  'A2VIGQ35RCS4UG': 'AE',
  'A33AVAJ2PDY3EV': 'TR',
  'ARBP9OOSHTCHU': 'EG',
  'A17E79C6D8DWNP': 'SA',
  'A2NODRKZP88ZB9': 'SE',
  'A1C3SOZRARQ6R3': 'PL',
  'A1XWSKTGKNRHRK': 'BE',
};

export interface MarketplaceOption {
  id: string;
  name: string;
}

export interface BrandOption {
  id: string;
  term: string;
}

interface OverviewFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  selectedASIN: string | null;
  onASINChange: (asin: string | null) => void;
  // Marketplace filter
  marketplaces?: MarketplaceOption[];
  selectedMarketplace: string | null;
  onMarketplaceChange: (marketplaceId: string | null) => void;
  // Brand filter
  brands?: BrandOption[];
  selectedBrand: string | null;
  onBrandChange: (brandId: string | null) => void;
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

export const getMarketplaceName = (marketplaceId: string | null | undefined): string => {
  if (!marketplaceId) return 'Unknown';
  return MARKETPLACE_NAMES[marketplaceId] || marketplaceId;
};

export const OverviewFilters = ({
  dateRange,
  onDateRangeChange,
  datePreset,
  onDatePresetChange,
  selectedASIN,
  onASINChange,
  marketplaces = [],
  selectedMarketplace,
  onMarketplaceChange,
  brands = [],
  selectedBrand,
  onBrandChange
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

  const hasMarketplaces = marketplaces.length > 0;
  const hasBrands = brands.length > 0;

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Date Preset */}
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

      {/* Custom Date Range */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <DateRangePicker 
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      )}

      {/* Marketplace Filter */}
      {hasMarketplaces && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Marketplace:</span>
          <Select 
            value={selectedMarketplace || "all"} 
            onValueChange={(val) => onMarketplaceChange(val === "all" ? null : val)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {marketplaces.map((mp) => (
                <SelectItem key={mp.id} value={mp.id}>
                  {mp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Brand Filter */}
      {hasBrands && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Brand:</span>
          <Select 
            value={selectedBrand || "all"} 
            onValueChange={(val) => onBrandChange(val === "all" ? null : val)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ASIN Filter */}
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
