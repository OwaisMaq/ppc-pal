
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Globe, Target, Package } from "lucide-react";
import { useCampaignData } from "@/hooks/useCampaignData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAsinData } from "@/hooks/useAsinData";

interface FilterBarProps {
  selectedCountry: string;
  selectedAsin: string;
  selectedProduct: string;
  onCountryChange: (country: string) => void;
  onAsinChange: (asin: string) => void;
  onProductChange: (product: string) => void;
}

const FilterBar = ({ 
  selectedCountry, 
  selectedAsin, 
  selectedProduct,
  onCountryChange, 
  onAsinChange,
  onProductChange 
}: FilterBarProps) => {
  const { connections } = useAmazonConnections();
  const { campaigns } = useCampaignData();
  const { asinOptions } = useAsinData(campaigns);

  // Extract available countries from connections
  const availableCountries = React.useMemo(() => {
    const countries = new Set<string>();
    connections.forEach(conn => {
      if (conn.marketplace_id) {
        countries.add(conn.marketplace_id);
      }
    });
    
    const countryOptions = [{ value: "all", label: "All Countries" }];
    
    // Map marketplace IDs to readable names
    const marketplaceLabels: { [key: string]: string } = {
      "US": "United States",
      "CA": "Canada", 
      "UK": "United Kingdom",
      "DE": "Germany",
      "FR": "France",
      "IT": "Italy",
      "ES": "Spain",
      "JP": "Japan",
      "AU": "Australia",
      "NL": "Netherlands"
    };
    
    Array.from(countries).forEach(country => {
      countryOptions.push({
        value: country,
        label: marketplaceLabels[country] || country
      });
    });
    
    return countryOptions;
  }, [connections]);

  // Extract available campaigns
  const availableCampaigns = React.useMemo(() => {
    const campaignOptions = [{ value: "all", label: "All Campaigns" }];
    
    campaigns.forEach(campaign => {
      const statusIndicator = campaign.status === 'enabled' ? '🟢' : 
                             campaign.status === 'paused' ? '🟡' : '🔴';
      
      campaignOptions.push({
        value: campaign.id,
        label: `${statusIndicator} ${campaign.name.substring(0, 40)}${campaign.name.length > 40 ? '...' : ''}`
      });
    });
    
    return campaignOptions.slice(0, 21); // Limit to 20 campaigns + "All Campaigns"
  }, [campaigns]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Country Filter */}
          <div className="space-y-2">
            <Label htmlFor="country-filter" className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              Country
            </Label>
            <Select value={selectedCountry} onValueChange={onCountryChange}>
              <SelectTrigger id="country-filter">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {availableCountries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ASIN/Product Filter */}
          <div className="space-y-2">
            <Label htmlFor="asin-filter" className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Product (ASIN)
            </Label>
            <Select value={selectedProduct} onValueChange={onProductChange}>
              <SelectTrigger id="asin-filter">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {asinOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Filter by specific product ASIN
            </p>
          </div>

          {/* Campaign Filter */}
          <div className="space-y-2">
            <Label htmlFor="campaign-filter" className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Campaign
            </Label>
            <Select value={selectedAsin} onValueChange={onAsinChange}>
              <SelectTrigger id="campaign-filter">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {availableCampaigns.map((campaign) => (
                  <SelectItem key={campaign.value} value={campaign.value}>
                    {campaign.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              🟢 Active • 🟡 Paused • 🔴 Archived
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
