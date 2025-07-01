
import { useState, useMemo } from 'react';
import { Campaign } from '@/types/common';

interface CampaignFilters {
  status: string[];
  dateRange: string;
  searchQuery: string;
}

export const useCampaignFilter = (campaigns: Campaign[] = []) => {
  const [filters, setFilters] = useState<CampaignFilters>({
    status: [],
    dateRange: '30d',
    searchQuery: ''
  });

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(campaign.status)) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery && !campaign.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [campaigns, filters]);

  const updateFilters = (newFilters: Partial<CampaignFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    filters,
    filteredCampaigns,
    updateFilters,
    totalCampaigns: campaigns.length,
    filteredCount: filteredCampaigns.length
  };
};
