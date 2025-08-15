import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useASINs } from "@/hooks/useASINs";
import { Badge } from "@/components/ui/badge";

interface ASINFilterProps {
  selectedASIN: string | null;
  onASINChange: (asin: string | null) => void;
  className?: string;
}

export const ASINFilter = ({ selectedASIN, onASINChange, className = "w-64" }: ASINFilterProps) => {
  const { asins, loading } = useASINs();

  const handleValueChange = (value: string) => {
    if (value === "all") {
      onASINChange(null);
    } else {
      onASINChange(value);
    }
  };

  const displayValue = selectedASIN || "all";

  return (
    <Select value={displayValue} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading ASINs..." : "Select ASIN"} />
      </SelectTrigger>
      <SelectContent className="z-50 bg-background border shadow-md">
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <span className="font-medium">Total (All ASINs)</span>
            <Badge variant="secondary" className="text-xs">
              {asins.length}
            </Badge>
          </div>
        </SelectItem>
        {asins.map((asinInfo) => (
          <SelectItem key={asinInfo.asin} value={asinInfo.asin}>
            <div className="flex items-center gap-2">
              {asinInfo.label ? (
                <span>{asinInfo.label} ({asinInfo.asin})</span>
              ) : (
                <span>{asinInfo.asin}</span>
              )}
            </div>
          </SelectItem>
        ))}
        {!loading && asins.length === 0 && (
          <SelectItem value="none" disabled>
            No ASINs found
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};