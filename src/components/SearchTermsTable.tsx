import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchStudio, SearchTerm, BulkKeywordPromotion, BulkNegative } from '@/hooks/useSearchStudio';
import { Plus, Minus, Eye } from 'lucide-react';

interface SearchTermsTableProps {
  searchTerms: SearchTerm[];
  loading: boolean;
  profileId: string;
}

export const SearchTermsTable = ({ searchTerms, loading, profileId }: SearchTermsTableProps) => {
  const { bulkPromoteKeywords, bulkAddNegatives, addToIgnoreList } = useSearchStudio();
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<'promote' | 'negative' | 'ignore'>('promote');
  const [matchType, setMatchType] = useState<'exact' | 'phrase'>('exact');
  const [negativeScope, setNegativeScope] = useState<'campaign' | 'ad_group'>('ad_group');
  const [negativeType, setNegativeType] = useState<'keyword' | 'product'>('keyword');

  const handleSelectTerm = (termKey: string, checked: boolean) => {
    const newSelected = new Set(selectedTerms);
    if (checked) {
      newSelected.add(termKey);
    } else {
      newSelected.delete(termKey);
    }
    setSelectedTerms(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allTermKeys = searchTerms.map(term => 
        `${term.profile_id}-${term.campaign_id}-${term.ad_group_id}-${term.search_term}`
      );
      setSelectedTerms(new Set(allTermKeys));
      setShowBulkActions(true);
    } else {
      setSelectedTerms(new Set());
      setShowBulkActions(false);
    }
  };

  const getSelectedTerms = () => {
    return searchTerms.filter(term => 
      selectedTerms.has(`${term.profile_id}-${term.campaign_id}-${term.ad_group_id}-${term.search_term}`)
    );
  };

  const handleBulkAction = async () => {
    const selected = getSelectedTerms();
    if (selected.length === 0) return;

    try {
      if (bulkAction === 'promote') {
        const promotions: BulkKeywordPromotion[] = selected.map(term => ({
          profileId: term.profile_id,
          campaignId: term.campaign_id,
          adGroupId: term.ad_group_id,
          searchTerm: term.search_term,
          matchType,
          bidMicros: term.spend_14d > 0 && term.clicks_14d > 0 
            ? Math.round((term.spend_14d / term.clicks_14d) * 1000000) 
            : 1000000
        }));
        await bulkPromoteKeywords(promotions);
      } else if (bulkAction === 'negative') {
        const negatives: BulkNegative[] = selected.map(term => ({
          profileId: term.profile_id,
          scope: negativeScope,
          campaignId: term.campaign_id,
          adGroupId: negativeScope === 'ad_group' ? term.ad_group_id : undefined,
          negativeType,
          matchType: negativeType === 'keyword' ? matchType : undefined,
          value: term.search_term
        }));
        await bulkAddNegatives(negatives);
      } else if (bulkAction === 'ignore') {
        for (const term of selected) {
          await addToIgnoreList(term.profile_id, term.search_term, 'Bulk ignore from Search Term Studio');
        }
      }

      // Clear selection after successful action
      setSelectedTerms(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const getRecommendedAction = (term: SearchTerm) => {
    if (term.is_brand) return null;
    if (term.is_ignored) return null;
    
    if (term.conv_14d >= 2 && term.acos_14d <= 0.35) {
      return { type: 'harvest', label: 'Harvest', variant: 'default' as const };
    }
    
    if (term.clicks_14d >= 20 && term.conv_14d === 0 && term.spend_14d >= 5) {
      return { type: 'negative', label: 'Negative', variant: 'destructive' as const };
    }
    
    return null;
  };

  if (loading) {
    return <div className="text-center py-8">Loading search terms...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {selectedTerms.size} search terms selected
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Action:</Label>
                <Select value={bulkAction} onValueChange={(value: any) => setBulkAction(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promote">Promote</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="ignore">Ignore</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkAction === 'promote' && (
                <div className="flex items-center gap-2">
                  <Label>Match:</Label>
                  <Select value={matchType} onValueChange={(value: any) => setMatchType(value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="phrase">Phrase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {bulkAction === 'negative' && (
                <>
                  <div className="flex items-center gap-2">
                    <Label>Type:</Label>
                    <Select value={negativeType} onValueChange={(value: any) => setNegativeType(value)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keyword">Keyword</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label>Scope:</Label>
                    <Select value={negativeScope} onValueChange={(value: any) => setNegativeScope(value)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ad_group">Ad Group</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {negativeType === 'keyword' && (
                    <div className="flex items-center gap-2">
                      <Label>Match:</Label>
                      <Select value={matchType} onValueChange={(value: any) => setMatchType(value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exact">Exact</SelectItem>
                          <SelectItem value="phrase">Phrase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <Button onClick={handleBulkAction} size="sm">
                Apply to {selectedTerms.size} terms
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search Terms Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left">
                    <Checkbox
                      checked={selectedTerms.size === searchTerms.length && searchTerms.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left">Search Term</th>
                  <th className="p-3 text-left">Campaign</th>
                  <th className="p-3 text-right">Clicks</th>
                  <th className="p-3 text-right">Impressions</th>
                  <th className="p-3 text-right">Spend</th>
                  <th className="p-3 text-right">Sales</th>
                  <th className="p-3 text-right">Conv</th>
                  <th className="p-3 text-right">ACOS</th>
                  <th className="p-3 text-right">CTR</th>
                  <th className="p-3 text-right">CVR</th>
                  <th className="p-3 text-center">Flags</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {searchTerms.map((term) => {
                  const termKey = `${term.profile_id}-${term.campaign_id}-${term.ad_group_id}-${term.search_term}`;
                  const isSelected = selectedTerms.has(termKey);
                  const recommendedAction = getRecommendedAction(term);

                  return (
                    <tr key={termKey} className={`border-b hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}>
                      <td className="p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectTerm(termKey, checked as boolean)}
                        />
                      </td>
                      <td className="p-3 font-medium">{term.search_term}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {term.campaign_id.substring(0, 20)}...
                      </td>
                      <td className="p-3 text-right">{term.clicks_14d.toLocaleString()}</td>
                      <td className="p-3 text-right">{term.impressions_14d.toLocaleString()}</td>
                      <td className="p-3 text-right">${term.spend_14d.toFixed(2)}</td>
                      <td className="p-3 text-right">${term.sales_14d?.toFixed(2) || '0.00'}</td>
                      <td className="p-3 text-right">{term.conv_14d}</td>
                      <td className="p-3 text-right">
                        {term.acos_14d ? `${(term.acos_14d * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="p-3 text-right">
                        {term.ctr_14d ? `${(term.ctr_14d * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td className="p-3 text-right">
                        {term.cvr_14d ? `${(term.cvr_14d * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {term.is_brand && <Badge variant="secondary" className="text-xs">Brand</Badge>}
                          {term.is_ignored && <Badge variant="outline" className="text-xs">Ignored</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {recommendedAction && (
                          <Badge variant={recommendedAction.variant} className="text-xs">
                            {recommendedAction.label}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {searchTerms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No search terms found for the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};