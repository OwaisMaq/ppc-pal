
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Globe, Package } from "lucide-react";

interface FilterBarProps {
  selectedCountry: string;
  selectedAsin: string;
  onCountryChange: (country: string) => void;
  onAsinChange: (asin: string) => void;
}

const FilterBar = ({ selectedCountry, selectedAsin, onCountryChange, onAsinChange }: FilterBarProps) => {
  // Mock data for countries and ASINs with product titles
  const countries = [
    { value: "all", label: "All Countries" },
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "UK", label: "United Kingdom" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "IT", label: "Italy" },
    { value: "ES", label: "Spain" },
    { value: "JP", label: "Japan" },
    { value: "AU", label: "Australia" },
  ];

  const asinOptions = [
    { value: "all", label: "All Products" },
    { value: "B07XJ8C8F5", label: "B07XJ8C8F5 - Wireless Bluetooth Headphones" },
    { value: "B08N5WRWNW", label: "B08N5WRWNW - Smart Fitness Tracker" },
    { value: "B09JQVH9X2", label: "B09JQVH9X2 - Portable Phone Charger" },
    { value: "B0BCTZTL1F", label: "B0BCTZTL1F - LED Desk Lamp with USB" },
    { value: "B08HLMS2C6", label: "B08HLMS2C6 - Ergonomic Office Chair" },
    { value: "B07ZPKN6YR", label: "B07ZPKN6YR - Stainless Steel Water Bottle" },
    { value: "B09M3BFF3L", label: "B09M3BFF3L - Wireless Mouse Pad" },
    { value: "B0B7QBXL2P", label: "B0B7QBXL2P - Kitchen Knife Set" },
  ];

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
                {countries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ASIN Filter */}
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
                {asinOptions.map((asin) => (
                  <SelectItem key={asin.value} value={asin.value}>
                    {asin.label}
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
