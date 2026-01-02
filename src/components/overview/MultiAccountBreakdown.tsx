import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalFilters, getMarketplaceFlag, getMarketplaceName } from '@/context/GlobalFiltersContext';
import { useRollups, RollupBreakdown } from '@/hooks/useRollups';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiAccountBreakdownProps {
  from: Date;
  to: Date;
}

export function MultiAccountBreakdown({ from, to }: MultiAccountBreakdownProps) {
  const { isMultiAccountMode, selectedProfileIds, baseCurrency, connections } = useGlobalFilters();
  const { breakdown, loading, fetchBreakdown } = useRollups();
  const [dimension, setDimension] = useState<'profile' | 'marketplace'>('profile');

  useEffect(() => {
    if (isMultiAccountMode && selectedProfileIds.length > 0) {
      fetchBreakdown({
        profileIds: selectedProfileIds,
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
        base: baseCurrency,
        dimension,
        limit: 10,
      });
    }
  }, [isMultiAccountMode, selectedProfileIds, from, to, baseCurrency, dimension]);

  if (!isMultiAccountMode) return null;

  // Get currency symbol
  const currencySymbol = baseCurrency === 'GBP' ? '£' : 
                         baseCurrency === 'EUR' ? '€' : 
                         baseCurrency === 'USD' ? '$' : baseCurrency;

  // If loading or no breakdown data, show placeholder with connection info
  const showPlaceholder = loading || breakdown.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Performance by Profile</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {baseCurrency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {showPlaceholder ? (
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              // Show connected profiles as placeholder
              connections
                .filter(c => selectedProfileIds.includes(c.profile_id))
                .slice(0, 5)
                .map(conn => (
                  <div 
                    key={conn.profile_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getMarketplaceFlag(conn.marketplace_id)}</span>
                      <div>
                        <p className="text-sm font-medium">{conn.profile_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{getMarketplaceName(conn.marketplace_id)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">No data yet</span>
                  </div>
                ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {breakdown.map((item, index) => {
              const isPositiveAcos = item.acos < 25; // Below 25% is good
              
              return (
                <div 
                  key={item.key}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    index === 0 ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">
                      {getMarketplaceFlag(item.label) || '📊'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.clicks.toLocaleString()} clicks · {item.impressions.toLocaleString()} impr
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {currencySymbol}{item.spendBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">spend</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {currencySymbol}{item.salesBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">sales</p>
                    </div>
                    
                    <div className={cn(
                      "flex items-center gap-1 min-w-[60px] justify-end",
                      isPositiveAcos ? "text-success" : "text-warning"
                    )}>
                      {isPositiveAcos ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      <span className="text-sm font-medium">{item.acos.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
