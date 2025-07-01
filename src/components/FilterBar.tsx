
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from 'lucide-react';

interface FilterBarProps {
  selectedCountry?: string;
  selectedAsin?: string;
  selectedProduct?: string;
  onCountryChange?: (value: string) => void;
  onAsinChange?: (value: string) => void;
  onProductChange?: (value: string) => void;
  onFilterChange?: (filters: any) => void;
}

const FilterBar = ({ 
  selectedCountry = 'all',
  selectedAsin = 'all',
  selectedProduct = 'all',
  onCountryChange,
  onAsinChange,
  onProductChange,
  onFilterChange 
}: FilterBarProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search campaigns..." 
              className="w-64"
            />
          </div>
          
          <Select value={selectedCountry} onValueChange={onCountryChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="de">Germany</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedAsin} onValueChange={onAsinChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProduct} onValueChange={onProductChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
