import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { CampaignData } from "@/hooks/useCampaignMetrics";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { BudgetUsageMap } from "@/hooks/useBudgetUsage";

interface CampaignDataTableProps {
  campaigns: CampaignData[];
  loading?: boolean;
  budgetUsage?: BudgetUsageMap;
}

type SortField = 'name' | 'spend' | 'sales' | 'acos' | 'roas' | 'clicks';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const formatPercentage = (num: number) => {
  return `${num.toFixed(2)}%`;
};

const getStatusColor = (status: string | undefined) => {
  if (!status) {
    return 'bg-gray-100 text-gray-800';
  }
  
  switch (status.toLowerCase()) {
    case 'enabled':
      return 'bg-green-100 text-green-800';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800';
    case 'archived':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

const getAcosColor = (acos: number) => {
  if (acos <= 15) return "text-green-600";
  if (acos <= 30) return "text-yellow-600";
  return "text-red-600";
};

export const CampaignDataTable = ({ campaigns, loading, budgetUsage }: CampaignDataTableProps) => {
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'spend':
        aValue = a.spend || 0;
        bValue = b.spend || 0;
        break;
      case 'sales':
        aValue = a.sales || 0;
        bValue = b.sales || 0;
        break;
      case 'acos':
        aValue = a.acos || 0;
        bValue = b.acos || 0;
        break;
      case 'roas':
        aValue = a.roas || 0;
        bValue = b.roas || 0;
        break;
      case 'clicks':
        aValue = a.clicks || 0;
        bValue = b.clicks || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No campaigns found. Sync your Amazon data to see campaign performance.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance ({campaigns.length} campaigns)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="h-8 p-0 font-semibold"
                  >
                    Campaign Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('spend')}
                    className="h-8 p-0 font-semibold"
                  >
                    Spend
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Usage Today</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('sales')}
                    className="h-8 p-0 font-semibold"
                  >
                    Sales
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('clicks')}
                    className="h-8 p-0 font-semibold"
                  >
                    Clicks
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('acos')}
                    className="h-8 p-0 font-semibold"
                  >
                    ACOS
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('roas')}
                    className="h-8 p-0 font-semibold"
                  >
                    ROAS
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.slice(0, 20).map((campaign) => {
                const usage = budgetUsage?.[campaign.id];
                const budgetVal = (campaign as any).daily_budget ?? usage?.budget_amount ?? null;
                const calcPct = (() => {
                  if (!usage) return null;
                  if (usage.usage_percentage != null) return Number(usage.usage_percentage);
                  if (usage.usage_amount != null && budgetVal) {
                    const v = (Number(usage.usage_amount) / Number(budgetVal)) * 100;
                    return Number(v.toFixed(2));
                  }
                  return null;
                })();
                const pctClamped = calcPct != null ? Math.max(0, Math.min(100, calcPct)) : null;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-[200px] truncate" title={campaign.name}>
                        {campaign.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(campaign.spend || 0)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {budgetVal != null ? formatCurrency(Number(budgetVal) || 0) : '-'}
                    </TableCell>
                    <TableCell>
                      {pctClamped != null ? (
                        <div className="min-w-[160px]">
                          <Progress value={pctClamped} />
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatCurrency(Number(usage?.usage_amount || 0))} / {formatCurrency(Number(budgetVal || usage?.budget_amount || 0))} ({Math.round(pctClamped)}%)
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(campaign.sales || 0)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatNumber(campaign.clicks || 0)}
                    </TableCell>
                    <TableCell className={`font-mono ${getAcosColor(campaign.acos || 0)}`}>
                      {formatPercentage(campaign.acos || 0)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {(campaign.roas || 0).toFixed(2)}x
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {campaign.campaign_type || 'SP'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {campaigns.length > 20 && (
          <div className="flex items-center justify-center pt-4">
            <p className="text-sm text-muted-foreground">
              Showing top 20 campaigns out of {campaigns.length} total
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};