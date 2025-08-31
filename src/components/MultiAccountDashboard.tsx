import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRollups } from '@/hooks/useRollups';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Download, Globe } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface MultiAccountDashboardProps {
  defaultEnabled?: boolean;
}

export const MultiAccountDashboard = ({ defaultEnabled = false }: MultiAccountDashboardProps) => {
  const { connections } = useAmazonConnections();
  const { kpis, breakdown, loading, fetchKpis, fetchBreakdown, exportKpisCSV } = useRollups();
  
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [baseCurrency, setBaseCurrency] = useState('GBP');
  const [dimension, setDimension] = useState<'marketplace' | 'profile' | 'campaignType'>('profile');
  
  const dateRange = {
    from: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  };

  useEffect(() => {
    if (connections.length > 0 && selectedProfiles.length === 0) {
      setSelectedProfiles(connections.map(conn => conn.profile_id));
    }
  }, [connections, selectedProfiles.length]);

  useEffect(() => {
    if (enabled && selectedProfiles.length > 0) {
      fetchKpis({
        profileIds: selectedProfiles,
        from: dateRange.from,
        to: dateRange.to,
        base: baseCurrency
      });

      fetchBreakdown({
        profileIds: selectedProfiles,
        from: dateRange.from,
        to: dateRange.to,
        base: baseCurrency,
        dimension,
        limit: 5
      });
    }
  }, [enabled, selectedProfiles, baseCurrency, dimension, fetchKpis, fetchBreakdown]);

  const handleProfileToggle = (profileId: string, checked: boolean) => {
    if (checked) {
      setSelectedProfiles(prev => [...prev, profileId]);
    } else {
      setSelectedProfiles(prev => prev.filter(id => id !== profileId));
    }
  };

  const handleExport = () => {
    if (selectedProfiles.length > 0) {
      exportKpisCSV({
        profileIds: selectedProfiles,
        from: dateRange.from,
        to: dateRange.to,
        base: baseCurrency
      });
    }
  };

  if (!enabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Multi-Account View</h3>
              <p className="text-sm text-muted-foreground">
                Combine metrics across all your Amazon profiles with currency normalization
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Multi-Account Dashboard</CardTitle>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="base-currency">Base Currency</Label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dimension">Breakdown By</Label>
              <Select value={dimension} onValueChange={(value: any) => setDimension(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">Profile</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="campaignType">Campaign Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleExport} disabled={!kpis}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Profile Selection */}
          <div className="space-y-2">
            <Label>Selected Profiles ({selectedProfiles.length}/{connections.length})</Label>
            <div className="flex flex-wrap gap-2">
              {connections.map(conn => (
                <div key={conn.id} className="flex items-center space-x-2">
                  <Switch
                    checked={selectedProfiles.includes(conn.profile_id)}
                    onCheckedChange={(checked) => handleProfileToggle(conn.profile_id, checked)}
                  />
                  <Label className="text-sm">
                    {conn.profile_name || conn.profile_id}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {baseCurrency === 'GBP' && '£'}
                {baseCurrency === 'USD' && '$'}
                {baseCurrency === 'EUR' && '€'}
                {kpis.totalSpend.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Spend</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {baseCurrency === 'GBP' && '£'}
                {baseCurrency === 'USD' && '$'}
                {baseCurrency === 'EUR' && '€'}
                {kpis.totalSales.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Sales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{kpis.avgACOS.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg ACOS</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{kpis.avgROAS.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Avg ROAS</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{kpis.totalClicks.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Clicks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {baseCurrency === 'GBP' && '£'}
                {baseCurrency === 'USD' && '$'}
                {baseCurrency === 'EUR' && '€'}
                {kpis.avgCPC.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Avg CPC</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top {dimension === 'profile' ? 'Profiles' : dimension === 'marketplace' ? 'Marketplaces' : 'Campaign Types'} by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown.map((item, index) => (
                <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.clicks.toLocaleString()} clicks • {item.acos.toFixed(1)}% ACOS
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {baseCurrency === 'GBP' && '£'}
                      {baseCurrency === 'USD' && '$'}
                      {baseCurrency === 'EUR' && '€'}
                      {item.spendBase.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {baseCurrency === 'GBP' && '£'}
                      {baseCurrency === 'USD' && '$'}
                      {baseCurrency === 'EUR' && '€'}
                      {item.salesBase.toFixed(2)} sales
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">Loading multi-account data...</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};