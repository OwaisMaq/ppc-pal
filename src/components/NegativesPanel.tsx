import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Download } from 'lucide-react';

interface NegativesSnapshot {
  id: string;
  profile_id: string;
  scope: string;
  campaign_id: string;
  ad_group_id: string;
  negative_type: string;
  match_type: string;
  value: string;
  state: string;
  last_seen_at: string;
}

interface NegativesPanelProps {
  profileId: string;
}

export const NegativesPanel = ({ profileId }: NegativesPanelProps) => {
  const [negatives, setNegatives] = useState<NegativesSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    keywords: 0,
    products: 0,
    campaigns: 0,
    adGroups: 0
  });

  useEffect(() => {
    if (profileId) {
      fetchNegatives();
    }
  }, [profileId]);

  const fetchNegatives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('negatives_snapshot')
        .select('*')
        .eq('profile_id', profileId)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;

      setNegatives(data || []);
      
      // Calculate summary
      const summary = (data || []).reduce((acc, negative) => {
        acc.total++;
        if (negative.negative_type === 'keyword') acc.keywords++;
        if (negative.negative_type === 'product') acc.products++;
        if (negative.scope === 'campaign') acc.campaigns++;
        if (negative.scope === 'ad_group') acc.adGroups++;
        return acc;
      }, { total: 0, keywords: 0, products: 0, campaigns: 0, adGroups: 0 });
      
      setSummary(summary);
    } catch (error) {
      console.error('Error fetching negatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportNegatives = () => {
    const csv = [
      // Headers
      ['profile_id', 'scope', 'campaign_id', 'ad_group_id', 'negative_type', 'match_type', 'value', 'state', 'last_seen_at'].join(','),
      // Data rows
      ...negatives.map(negative => [
        negative.profile_id,
        negative.scope,
        negative.campaign_id || '',
        negative.ad_group_id || '',
        negative.negative_type,
        negative.match_type || '',
        `"${negative.value}"`,
        negative.state,
        negative.last_seen_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `negatives-${profileId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedNegatives = negatives.reduce((acc, negative) => {
    const key = `${negative.scope}-${negative.campaign_id}-${negative.ad_group_id || ''}`;
    if (!acc[key]) {
      acc[key] = {
        scope: negative.scope,
        campaign_id: negative.campaign_id,
        ad_group_id: negative.ad_group_id,
        negatives: []
      };
    }
    acc[key].negatives.push(negative);
    return acc;
  }, {} as Record<string, { scope: string; campaign_id: string; ad_group_id: string; negatives: NegativesSnapshot[] }>);

  if (!profileId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Please select a profile to view negatives.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-muted-foreground">Total Negatives</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.keywords}</div>
            <div className="text-sm text-muted-foreground">Keywords</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.products}</div>
            <div className="text-sm text-muted-foreground">Products</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.campaigns}</div>
            <div className="text-sm text-muted-foreground">Campaign Level</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.adGroups}</div>
            <div className="text-sm text-muted-foreground">Ad Group Level</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Negatives</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportNegatives} disabled={negatives.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Negatives List */}
      {loading ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading negatives...
          </CardContent>
        </Card>
      ) : Object.keys(groupedNegatives).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No negative keywords or products found for this profile.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedNegatives).map(([key, group]) => (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {group.scope === 'campaign' ? 'Campaign' : 'Ad Group'} Level
                  <Badge variant="secondary" className="ml-2">
                    {group.negatives.length} negatives
                  </Badge>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Campaign: {group.campaign_id?.substring(0, 20)}...
                  {group.ad_group_id && (
                    <span> | Ad Group: {group.ad_group_id.substring(0, 20)}...</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {group.negatives.map((negative, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={negative.negative_type === 'keyword' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {negative.negative_type}
                        </Badge>
                        {negative.match_type && (
                          <Badge variant="outline" className="text-xs">
                            {negative.match_type}
                          </Badge>
                        )}
                        <span className="font-medium">{negative.value}</span>
                      </div>
                      <Badge 
                        variant={negative.state === 'enabled' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {negative.state}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};