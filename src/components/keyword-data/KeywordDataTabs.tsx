
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Download } from 'lucide-react';
import KeywordDataFilters from './KeywordDataFilters';
import KeywordDataTable from './KeywordDataTable';
import CampaignDataTable from './CampaignDataTable';
import { KeywordData } from '@/hooks/useKeywordData';
import { CampaignData } from '@/hooks/useCampaignData';

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

interface KeywordDataTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  filteredKeywords: KeywordData[];
  filteredProducts: MockProductData[];
  campaigns: CampaignData[];
}

const KeywordDataTabs = ({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  filteredKeywords,
  filteredProducts,
  campaigns
}: KeywordDataTabsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance Data</CardTitle>
            <CardDescription>
              Detailed analysis of keyword and campaign performance metrics from your Amazon Ads account
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="keywords" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Keywords ({filteredKeywords.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Campaigns ({filteredProducts.length})
            </TabsTrigger>
          </TabsList>

          <KeywordDataFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />

          <TabsContent value="keywords" className="overflow-x-auto">
            <KeywordDataTable keywords={filteredKeywords} />
          </TabsContent>

          <TabsContent value="products" className="overflow-x-auto">
            <CampaignDataTable campaigns={campaigns} filteredProducts={filteredProducts} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KeywordDataTabs;
