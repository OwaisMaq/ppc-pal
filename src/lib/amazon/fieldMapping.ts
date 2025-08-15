/**
 * Amazon Advertising API Field Mapping Utility
 * 
 * This utility provides mapping between Amazon's official field names 
 * and user-friendly display names, ensuring consistency across the application.
 */

// Amazon's official field names (raw data layer)
export interface AmazonRawFields {
  // Traffic metrics
  impressions: number;
  clicks: number;
  cost: number; // Amazon's official term (not "spend")
  
  // Conversion metrics with attribution windows
  attributedConversions1d?: number;
  attributedConversions7d?: number;
  attributedConversions14d?: number;
  attributedConversions30d?: number;
  
  attributedSales1d?: number;
  attributedSales7d?: number;
  attributedSales14d?: number;
  attributedSales30d?: number;
}

// User-friendly field names (aggregated data layer)
export interface UserFriendlyFields {
  impressions: number;
  clicks: number;
  
  // Attribution window specific fields
  cost_1d?: number;
  cost_7d?: number;
  cost_14d?: number;
  cost_30d?: number;
  
  attributed_sales_1d?: number;
  attributed_sales_7d?: number;
  attributed_sales_14d?: number;
  attributed_sales_30d?: number;
  
  attributed_conversions_1d?: number;
  attributed_conversions_7d?: number;
  attributed_conversions_14d?: number;
  attributed_conversions_30d?: number;
}

// Legacy field names for backward compatibility
export interface LegacyFields {
  spend: number; // Maps to cost
  sales: number; // Maps to attributed_sales
  orders: number; // Maps to attributed_conversions
}

/**
 * Maps Amazon's raw field names to user-friendly field names
 */
export const mapAmazonToUserFriendly = (amazonData: AmazonRawFields): UserFriendlyFields => {
  return {
    impressions: amazonData.impressions,
    clicks: amazonData.clicks,
    cost_1d: amazonData.cost,
    cost_7d: amazonData.cost,
    cost_14d: amazonData.cost,
    cost_30d: amazonData.cost,
    attributed_sales_1d: amazonData.attributedSales1d,
    attributed_sales_7d: amazonData.attributedSales7d,
    attributed_sales_14d: amazonData.attributedSales14d,
    attributed_sales_30d: amazonData.attributedSales30d,
    attributed_conversions_1d: amazonData.attributedConversions1d,
    attributed_conversions_7d: amazonData.attributedConversions7d,
    attributed_conversions_14d: amazonData.attributedConversions14d,
    attributed_conversions_30d: amazonData.attributedConversions30d,
  };
};

/**
 * Maps user-friendly field names back to Amazon's official field names
 */
export const mapUserFriendlyToAmazon = (userData: UserFriendlyFields): AmazonRawFields => {
  return {
    impressions: userData.impressions,
    clicks: userData.clicks,
    cost: userData.cost_14d || 0, // Default to 14d attribution
    attributedSales1d: userData.attributed_sales_1d,
    attributedSales7d: userData.attributed_sales_7d,
    attributedSales14d: userData.attributed_sales_14d,
    attributedSales30d: userData.attributed_sales_30d,
    attributedConversions1d: userData.attributed_conversions_1d,
    attributedConversions7d: userData.attributed_conversions_7d,
    attributedConversions14d: userData.attributed_conversions_14d,
    attributedConversions30d: userData.attributed_conversions_30d,
  };
};

/**
 * Maps legacy field names to new user-friendly field names
 */
export const mapLegacyToUserFriendly = (legacyData: LegacyFields): UserFriendlyFields => {
  return {
    impressions: 0, // Not available in legacy format
    clicks: 0, // Not available in legacy format
    cost_14d: legacyData.spend, // Default mapping
    attributed_sales_14d: legacyData.sales, // Default mapping
    attributed_conversions_14d: legacyData.orders, // Default mapping
  };
};

/**
 * Display names for UI components
 */
export const DISPLAY_NAMES = {
  // Traffic metrics
  impressions: 'Impressions',
  clicks: 'Clicks',
  cost: 'Spend', // Keep "Spend" for user display
  
  // Attribution window specific
  cost_1d: 'Spend (1d)',
  cost_7d: 'Spend (7d)',
  cost_14d: 'Spend (14d)',
  cost_30d: 'Spend (30d)',
  
  attributed_sales_1d: 'Sales (1d)',
  attributed_sales_7d: 'Sales (7d)',
  attributed_sales_14d: 'Sales (14d)',
  attributed_sales_30d: 'Sales (30d)',
  
  attributed_conversions_1d: 'Orders (1d)',
  attributed_conversions_7d: 'Orders (7d)',
  attributed_conversions_14d: 'Orders (14d)',
  attributed_conversions_30d: 'Orders (30d)',
  
  // Calculated metrics
  acos: 'ACOS',
  roas: 'ROAS',
  ctr: 'CTR',
  cpc: 'CPC',
  conversion_rate: 'Conv. Rate',
};

/**
 * Field descriptions for tooltips and help text
 */
export const FIELD_DESCRIPTIONS = {
  cost: "Amazon's term for advertising spend",
  attributed_sales: "Sales attributed to advertising within the attribution window",
  attributed_conversions: "Orders attributed to advertising within the attribution window",
  attribution_window: "Time window (1d, 7d, 14d, 30d) used to attribute conversions to ad interactions",
};

/**
 * Gets the appropriate field name based on attribution window preference
 */
export const getAttributedField = (baseField: string, attributionWindow: '1d' | '7d' | '14d' | '30d' = '14d'): string => {
  return `${baseField}_${attributionWindow}`;
};

/**
 * Validates if a field name follows Amazon's naming convention
 */
export const isAmazonField = (fieldName: string): boolean => {
  const amazonFields = [
    'impressions', 'clicks', 'cost',
    'attributedSales1d', 'attributedSales7d', 'attributedSales14d', 'attributedSales30d',
    'attributedConversions1d', 'attributedConversions7d', 'attributedConversions14d', 'attributedConversions30d'
  ];
  return amazonFields.includes(fieldName);
};

/**
 * Validates if a field name follows our user-friendly convention
 */
export const isUserFriendlyField = (fieldName: string): boolean => {
  const userFriendlyPattern = /^(cost|attributed_sales|attributed_conversions)_(1d|7d|14d|30d)$/;
  return userFriendlyPattern.test(fieldName) || ['impressions', 'clicks'].includes(fieldName);
};