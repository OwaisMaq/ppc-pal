import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  Package,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { ProductGroup } from '@/hooks/useProductGroupedCampaigns';
import { CampaignLevelSelector, CampaignLevel } from './CampaignLevelSelector';

interface ProductSectionProps {
  product: ProductGroup;
  dayCount: number;
  selectedCampaigns: Set<string>;
  onCampaignSelect: (campaignId: string, selected: boolean) => void;
  onSelectAllInProduct: (campaignIds: string[], selected: boolean) => void;
  optimizationMap?: Map<string, boolean>;
  toggleOptimization?: (entityId: string, entityType: 'campaign' | 'adgroup' | 'keyword' | 'target', enabled: boolean) => void;
  optLoading?: boolean;
}

export const ProductSection = ({
  product,
  dayCount,
  selectedCampaigns,
  onCampaignSelect,
  onSelectAllInProduct,
  optimizationMap,
  toggleOptimization,
  optLoading,
}: ProductSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewLevel, setViewLevel] = useState<CampaignLevel>('campaigns');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'enabled') {
      return (
        <Badge variant="default" className="gap-1">
          <Play className="h-3 w-3" />
          Active
        </Badge>
      );
    } else if (statusLower === 'paused') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Pause className="h-3 w-3" />
          Paused
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const productCampaignIds = product.campaigns.map(c => c.campaign_id);
  const allSelected = productCampaignIds.every(id => selectedCampaigns.has(id));
  const someSelected = productCampaignIds.some(id => selectedCampaigns.has(id));

  // Counts for tabs (currently only campaigns are shown)
  const counts = {
    portfolios: 0,
    campaigns: product.campaigns.length,
    adGroups: 0,
    targets: 0,
    searchTerms: 0,
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              {/* Left side: Product info */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {product.label || product.asin}
                    </span>
                    {product.label && product.asin !== 'Uncategorized' && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {product.asin}
                      </Badge>
                    )}
                    {product.asin === 'Uncategorized' && (
                      <Badge variant="secondary" className="text-xs">
                        No ASIN detected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.campaigns.length} campaign{product.campaigns.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Right side: Summary metrics */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Spend</p>
                  <p className="font-semibold">{formatCurrency(product.metrics.spend)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sales</p>
                  <p className="font-semibold">{formatCurrency(product.metrics.sales)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">ACOS</p>
                  <div className="flex items-center justify-end gap-1">
                    {product.metrics.acos > 30 ? (
                      <TrendingUp className="h-3 w-3 text-destructive" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-success" />
                    )}
                    <span className="font-semibold">{product.metrics.acos.toFixed(1)}%</span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            {/* Level Selector Tabs */}
            <div className="py-4">
              <CampaignLevelSelector
                value={viewLevel}
                onChange={setViewLevel}
                counts={counts}
              />
            </div>

            {/* Data Table */}
            {viewLevel === 'campaigns' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onCheckedChange={(checked) => {
                          onSelectAllInProduct(productCampaignIds, !!checked);
                        }}
                      />
                    </TableHead>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-20">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" />
                              Auto-Opt
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enable Bayesian auto-optimization</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">ACOS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.campaigns.map(campaign => (
                    <TableRow
                      key={campaign.campaign_id}
                      className={selectedCampaigns.has(campaign.campaign_id) ? 'bg-muted/30' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCampaigns.has(campaign.campaign_id)}
                          onCheckedChange={(checked) => {
                            onCampaignSelect(campaign.campaign_id, !!checked);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell className="text-center">
                        {toggleOptimization && (
                          <Switch
                            checked={optimizationMap?.get(campaign.campaign_id) ?? true}
                            onCheckedChange={(checked) => 
                              toggleOptimization(campaign.campaign_id, 'campaign', checked)
                            }
                            disabled={optLoading}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.impressions)}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.daily_spend * dayCount)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.sales)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {campaign.acos > 30 ? (
                            <TrendingUp className="h-3 w-3 text-destructive" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-success" />
                          )}
                          {campaign.acos.toFixed(1)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Placeholder for other levels */}
            {viewLevel !== 'campaigns' && (
              <div className="py-8 text-center text-muted-foreground">
                <p>
                  {viewLevel === 'ad-groups' && 'Ad Groups'}
                  {viewLevel === 'targets' && 'Targets'}
                  {viewLevel === 'search-terms' && 'Search Terms'}
                  {viewLevel === 'portfolios' && 'Portfolios'}
                  {' '}view coming soon for product-level filtering
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
