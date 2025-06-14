
import { EntityType, ProductType } from './types';

// Amazon required headers for each entity type - updated with actual Amazon requirements
export const AMAZON_REQUIRED_HEADERS: Record<EntityType, string[]> = {
  keyword: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Max Bid', 'Keyword ID'
  ],
  campaign: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Campaign Budget', 'Campaign Budget Type', 'Campaign ID'
  ],
  adgroup: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Ad Group Default Bid', 'Ad Group ID'
  ],
  portfolio: [
    'Product', 'Entity', 'Operation', 'Portfolio', 'Portfolio Budget', 'Portfolio ID'
  ]
};

// Valid Amazon product types
export const AMAZON_PRODUCT_TYPES: Record<string, ProductType> = {
  'Sponsored Products': 'Sponsored Products',
  'Sponsored Brands': 'Sponsored Brands', 
  'Sponsored Display': 'Sponsored Display'
};
