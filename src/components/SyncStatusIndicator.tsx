import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SyncStatusIndicatorProps {
  onSyncAll: () => Promise<void>;
  loading: boolean;
}

export const SyncStatusIndicator = ({ onSyncAll, loading }: SyncStatusIndicatorProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div>
        <h3 className="text-sm font-medium">Data Sync Status</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Keep your data up to date with Amazon Ads
        </p>
      </div>
      <Button
        onClick={onSyncAll}
        disabled={loading}
        size="sm"
        variant="outline"
      >
        {loading ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All
          </>
        )}
      </Button>
    </div>
  );
};
