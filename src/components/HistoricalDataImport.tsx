import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface HistoricalDataImportProps {
  profileId: string;
}

export const HistoricalDataImport = ({ profileId }: HistoricalDataImportProps) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const quickRanges = [
    { label: "Last 30 Days", days: 30 },
    { label: "Last 60 Days", days: 60 },
    { label: "Last 90 Days", days: 90 },
  ];

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(start);
    setEndDate(end);
  };

  const handleImport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      toast({
        title: "Date range too large",
        description: "Maximum import range is 90 days",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('historical-import', {
        body: {
          profileId,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          reportTypes: ['campaign', 'adgroup', 'keyword', 'target']
        }
      });

      if (error) throw error;

      toast({
        title: "Import started",
        description: `Historical data import started for ${daysDiff} days. Reports will be processed in the background.`,
      });

      console.log('Import response:', data);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to start historical data import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Historical Data Import
        </CardTitle>
        <CardDescription>
          Import historical performance data from Amazon Ads (up to 90 days)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Range Buttons */}
        <div className="space-y-2">
          <Label>Quick Ranges</Label>
          <div className="flex flex-wrap gap-2">
            {quickRanges.map((range) => (
              <Button
                key={range.days}
                variant="outline"
                size="sm"
                onClick={() => handleQuickRange(range.days)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Range Pickers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) =>
                    date > new Date() || date < subDays(new Date(), 90)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) =>
                    date > new Date() || date < subDays(new Date(), 90)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Import Info */}
        {startDate && endDate && startDate < endDate && (
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p className="font-medium">Import Range:</p>
            <p className="text-muted-foreground">
              {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              {" "}({Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days)
            </p>
          </div>
        )}

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={!startDate || !endDate || isImporting}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import Historical Data
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Note: Historical imports may take several minutes to complete. Reports will be processed in the background and data will appear once processing is finished.
        </p>
      </CardContent>
    </Card>
  );
};
