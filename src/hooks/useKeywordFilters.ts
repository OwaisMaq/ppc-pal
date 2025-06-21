
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

  const filteredKeywords = useMemo(() => {
    return keywords.filter(keyword => {
      const matchesSearch = keyword.keyword_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (keyword.campaign_name && keyword.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || keyword.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [keywords, searchTerm, statusFilter]);

  const mockProductData = useMemo(() => {
    return campaigns.map((campaign, index) => ({
      id: campaign.id,
      asin: `B0${String(index + 1).padStart(7, '0')}`,
      productName: campaign.name,
      category: campaign.campaign_type || 'Sponsored Products',
      price: campaign.sales && campaign.orders ? (campaign.sales / campaign.orders) : 0,
      units: campaign.orders,
      revenue: campaign.sales,
      sessions: campaign.clicks * 10, // Estimate sessions as 10x clicks
      sessionPercentage: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      conversionRate: campaign.clicks > 0 ? (campaign.orders / campaign.clicks) * 100 : 0,
      averageRating: 4.0 + Math.random() * 1, // Mock rating
      reviews: Math.floor(Math.random() * 1000) + 100, // Mock reviews
      rank: index + 1,
      status: campaign.status === 'enabled' ? 'In Stock' : 'Out of Stock'
    }));
  }, [campaigns]);

  const filteredProducts = useMemo(() => {
    return mockProductData.filter(product => {
      const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.asin.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || product.status.toLowerCase().includes(statusFilter.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [mockProductData, searchTerm, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredKeywords,
    filteredProducts
  };
};
