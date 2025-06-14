
import { EntityType, ProductType } from './types';

// Amazon required headers for each entity type
export const AMAZON_REQUIRED_HEADERS: Record<EntityType, string[]> = {
  keyword: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Max Bid'
  ],
  campaign: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Campaign Budget', 'Campaign Budget Type'
  ],
  adgroup: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Ad Group Default Bid'
  ],
  portfolio: [
    'Product', 'Entity', 'Operation', 'Portfolio', 'Portfolio Budget'
  ]
};

// Valid Amazon product types
export const AMAZON_PRODUCT_TYPES: Record<string, ProductType> = {
  'Sponsored Products': 'Sponsored Products',
  'Sponsored Brands': 'Sponsored Brands', 
  'Sponsored Display': 'Sponsored Display'
};
