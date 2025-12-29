import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Loader2,
  DollarSign,
  Ban
} from 'lucide-react';
import { useBulkOperations, BulkOperationType } from '@/hooks/useBulkOperations';
import { toast } from 'sonner';

interface BulkActionsBarProps {
  profileId: string;
  selectedIds: string[];
  entityType: 'campaign' | 'ad_group' | 'keyword' | 'target';
  onClear: () => void;
  onComplete?: () => void;
}

export const BulkActionsBar = ({ 
  profileId, 
  selectedIds, 
  entityType, 
  onClear,
  onComplete 
}: BulkActionsBarProps) => {
  const { executeBulkOperation, loading } = useBulkOperations(profileId);
  const [bidPercent, setBidPercent] = useState(10);
  const [absoluteBid, setAbsoluteBid] = useState('');
  const [negativeKeywords, setNegativeKeywords] = useState('');
  const [matchType, setMatchType] = useState<'exact' | 'phrase' | 'broad'>('exact');

  const handleOperation = async (type: BulkOperationType, value?: number) => {
    const operation = {
      type,
      entityType,
      entityIds: selectedIds,
      value,
      matchType,
      negativeKeywords: negativeKeywords.split('\n').map(k => k.trim()).filter(Boolean),
    };

    const result = await executeBulkOperation(operation);
    if (result.success) {
      onClear();
      onComplete?.();
    }
  };

  if (selectedIds.length === 0) return null;

  const entityLabel = entityType === 'ad_group' ? 'ad group' : entityType;
  const pluralLabel = selectedIds.length > 1 ? `${entityLabel}s` : entityLabel;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="font-medium">
          {selectedIds.length} {pluralLabel} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 px-2"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Enable */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOperation('enable')}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          Enable
        </Button>

        {/* Pause */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOperation('pause')}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />}
          Pause
        </Button>

        {/* Bid Increase */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Bid +
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Increase by %</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={bidPercent}
                    onChange={(e) => setBidPercent(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleOperation('bid_increase', bidPercent)}
                disabled={loading}
              >
                Apply +{bidPercent}% to {selectedIds.length} {pluralLabel}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bid Decrease */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              <TrendingDown className="h-4 w-4 mr-1" />
              Bid -
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Decrease by %</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={bidPercent}
                    onChange={(e) => setBidPercent(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleOperation('bid_decrease', bidPercent)}
                disabled={loading}
              >
                Apply -{bidPercent}% to {selectedIds.length} {pluralLabel}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Set Bid (for keywords/targets) */}
        {(entityType === 'keyword' || entityType === 'target') && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <DollarSign className="h-4 w-4 mr-1" />
                Set Bid
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>New bid ($)</Label>
                  <Input
                    type="number"
                    value={absoluteBid}
                    onChange={(e) => setAbsoluteBid(e.target.value)}
                    min={0.02}
                    max={1000}
                    step={0.01}
                    placeholder="0.50"
                  />
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleOperation('set_bid', Number(absoluteBid))}
                  disabled={loading || !absoluteBid}
                >
                  Set ${absoluteBid} on {selectedIds.length} {pluralLabel}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Add Negatives (for campaigns/ad groups) */}
        {(entityType === 'campaign' || entityType === 'ad_group') && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <Ban className="h-4 w-4 mr-1" />
                Add Negatives
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="phrase">Phrase</SelectItem>
                      <SelectItem value="broad">Broad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Keywords (one per line)</Label>
                  <textarea
                    value={negativeKeywords}
                    onChange={(e) => setNegativeKeywords(e.target.value)}
                    placeholder="keyword one&#10;keyword two&#10;keyword three"
                    className="w-full h-24 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                  />
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleOperation('add_negative')}
                  disabled={loading || !negativeKeywords.trim()}
                >
                  Add to {selectedIds.length} {pluralLabel}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
