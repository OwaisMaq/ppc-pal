
import { useState, useMemo } from 'react';
import { KeywordData } from './useKeywordData';
import { CampaignData } from './useCampaignData';

interface MockProductData {
  id: string;
  asin: string;
  productName: string;
  category: string;
  price: number;
  units: number;
  revenue: number;
  sessions: number;
  sessionPercentage: number;
  conversionRate: number;
  averageRating: number;
  reviews: number;
  rank: number;
  status: string;
}

export const useKeywordFilters = (keywords: KeywordData[], campaigns: CampaignData[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Since Amazon functionality has been removed, return empty filtered data
  const filteredKeywords = useMemo(() => [], [keywords, searchTerm, statusFilter]);

  const mockProductData = useMemo(() => [], [campaigns]);

  const filteredProducts = useMemo(() => [], [mockProductData, searchTerm, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredKeywords,
    filteredProducts
  };
};
