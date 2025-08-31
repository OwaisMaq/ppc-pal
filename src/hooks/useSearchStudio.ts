import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SearchTerm {
  profile_id: string;
  campaign_id: string;
  ad_group_id: string;
  search_term: string;
  clicks_14d: number;
  impressions_14d: number;
  cost_14d_micros: number;
  conv_14d: number;
  sales_14d_micros: number;
  spend_14d: number;
  sales_14d: number;
  acos_14d: number;
  ctr_14d: number;
  cvr_14d: number;
  is_brand: boolean;
  is_ignored: boolean;
}

export interface SearchTermsFilters {
  profileId: string;
  from?: string;
  to?: string;
  q?: string;
  minClicks?: number;
  minSpend?: number;
  minImpr?: number;
  maxACOS?: number;
  minCVR?: number;
  includeBrand?: boolean;
  includeIgnored?: boolean;
  campaignId?: string;
  adGroupId?: string;
  hasConversion?: boolean;
  actionable?: 'harvest' | 'negative' | 'all';
  sort?: string;
  limit?: number;
}

export interface BulkKeywordPromotion {
  profileId: string;
  campaignId: string;
  adGroupId: string;
  searchTerm: string;
  matchType: 'exact' | 'phrase';
  bidMicros?: number;
}

export interface BulkNegative {
  profileId: string;
  scope: 'campaign' | 'ad_group';
  campaignId?: string;
  adGroupId?: string;
  negativeType: 'keyword' | 'product';
  matchType?: 'exact' | 'phrase';
  value: string;
}

export interface BrandTerm {
  id: string;
  profile_id: string;
  term: string;
  created_at: string;
}

export const useSearchStudio = () => {
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [brandTerms, setBrandTerms] = useState<BrandTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSearchTerms = useCallback(async (filters: SearchTermsFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const { data, error } = await supabase.functions.invoke('search-studio', {
        body: null,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/terms?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setSearchTerms(result.data || []);

      return result.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch search terms';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const bulkPromoteKeywords = useCallback(async (promotions: BulkKeywordPromotion[]) => {
    try {
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/bulk/promote-keywords`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promotions)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: 'Keywords Queued',
        description: `${result.queued} keywords queued for promotion`
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to promote keywords';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const bulkAddNegatives = useCallback(async (negatives: BulkNegative[]) => {
    try {
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/bulk/add-negatives`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(negatives)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: 'Negatives Queued',
        description: `${result.queued} negatives queued for addition`
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add negatives';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const addToIgnoreList = useCallback(async (profileId: string, searchTerm: string, reason?: string) => {
    try {
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/ignore-list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileId, searchTerm, reason })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      toast({
        title: 'Search Term Ignored',
        description: `"${searchTerm}" added to ignore list`
      });

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to ignore list';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const exportSearchTerms = useCallback(async (filters: SearchTermsFilters) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search-terms-${filters.profileId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Search terms exported to CSV'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export search terms';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const importNegativesCSV = useCallback(async (csvFile: File) => {
    try {
      const csvContent = await csvFile.text();
      
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/import/negatives`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'text/plain'
        },
        body: csvContent
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: 'Import Complete',
        description: `${result.inserted} negatives imported, ${result.skipped} skipped`
      });

      if (result.errors && result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import negatives';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const fetchBrandTerms = useCallback(async (profileId: string) => {
    try {
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/brand-terms?profileId=${profileId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setBrandTerms(result.data || []);
      return result.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch brand terms';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  const addBrandTerm = useCallback(async (profileId: string, term: string) => {
    try {
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/brand-terms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileId, term })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setBrandTerms(prev => [...prev, result.data]);
      
      toast({
        title: 'Brand Term Added',
        description: `"${term}" added to brand terms`
      });

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add brand term';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const deleteBrandTerm = useCallback(async (id: string) => {
    try {
      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-studio/brand-terms/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setBrandTerms(prev => prev.filter(bt => bt.id !== id));
      
      toast({
        title: 'Brand Term Deleted',
        description: 'Brand term removed'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete brand term';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  return {
    searchTerms,
    brandTerms,
    loading,
    error,
    fetchSearchTerms,
    bulkPromoteKeywords,
    bulkAddNegatives,
    addToIgnoreList,
    exportSearchTerms,
    importNegativesCSV,
    fetchBrandTerms,
    addBrandTerm,
    deleteBrandTerm
  };
};