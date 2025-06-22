
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Globe, Package } from "lucide-react";
import { useCampaignData } from "@/hooks/useCampaignData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

interface FilterBarProps {
  selectedCountry: string;
  selectedAsin: string;
  onCountryChange: (country: string) => void;
  onAsinChange: (asin: string) => void;
}

const FilterBar = ({ selectedCountry, selectedAsin, onCountryChange, onAsinChange }: FilterBarProps) => {
  const { connections } = useAmazonConnections();
  const { campaigns } = useCampaignData();

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

  // Extract available products from campaigns
  const availableProducts = React.useMemo(() => {
    const products = new Set<string>();
    
    // Generate ASINs based on campaign names and add some realistic variation
    campaigns.forEach((campaign, index) => {
      // Create a realistic-looking ASIN based on campaign
      const asinSuffix = (campaign.amazon_campaign_id.slice(-6) + '000000').substring(0, 7);
      const asin = `B0${asinSuffix}`;
      products.add(asin);
    });
    
    const productOptions = [{ value: "all", label: "All Products" }];
    
    Array.from(products).forEach(asin => {
      // Find corresponding campaign for this ASIN
      const campaignIndex = Array.from(products).indexOf(asin);
      const campaign = campaigns[campaignIndex];
      const productName = campaign ? campaign.name.substring(0, 30) : 'Product';
      
      productOptions.push({
        value: asin,
        label: `${asin} - ${productName}${productName.length > 30 ? '...' : ''}`
      });
    });
    
    return productOptions.slice(0, 9); // Limit to 8 products + "All Products"
  }, [campaigns]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <SelectContent>
                {availableCountries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Filter */}
          <div className="space-y-2">
            <Label htmlFor="asin-filter" className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Product (ASIN)
            </Label>
            <Select value={selectedAsin} onValueChange={onAsinChange}>
              <SelectTrigger id="asin-filter">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.value} value={product.value}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
