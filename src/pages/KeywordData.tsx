
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useKeywordData } from '@/hooks/useKeywordData';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useKeywordFilters } from '@/hooks/useKeywordFilters';
import KeywordDataHeader from '@/components/keyword-data/KeywordDataHeader';

const KeywordData = () => {
  const [activeTab, setActiveTab] = useState('keywords');
  
  const { connections } = useAmazonConnections();
  const { keywords, loading: keywordsLoading } = useKeywordData();
  const { campaigns, loading: campaignsLoading } = useCampaignData();

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredKeywords,
    filteredProducts
  } = useKeywordFilters(keywords, campaigns);

  const loading = keywordsLoading || campaignsLoading;

  // Calculate real statistics
  const totalKeywords = keywords.length;
  const totalProducts = campaigns.length;
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
  const averageRoas = campaigns.length > 0 ? 
    campaigns.reduce((sum, c) => {
      const roas = c.spend > 0 ? c.sales / c.spend : 0;
      return sum + roas;
    }, 0) / campaigns.length : 0;

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <KeywordDataHeader />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!keywords.length && !campaigns.length) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <KeywordDataHeader />
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {connections.length === 0 
                ? "No Amazon accounts connected yet. Connect your Amazon Ads account to view keyword and campaign data."
                : "No campaign data available yet. Sync your Amazon account to import campaign and keyword data."
              }
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <KeywordDataHeader />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Keyword data functionality has been simplified. Amazon integration components have been removed.
          </AlertDescription>
        </Alert>
      </div>
    </AuthenticatedLayout>
  );
};

export default KeywordData;
