/**
 * Compatibility Layer for Amazon Field Mapping
 * 
 * This module provides backward compatibility for components that still 
 * expect legacy field names while transitioning to Amazon-standard naming.
 */

import { Campaign, AdGroup, Keyword, Target } from './types';

// Legacy compatible interfaces
export interface LegacyCampaign extends Campaign {
  spend: number;
  sales: number;
  orders: number;
}

export interface LegacyAdGroup extends AdGroup {
  spend: number;
  sales: number;  
  orders: number;
}

export interface LegacyKeyword extends Keyword {
  spend: number;
  sales: number;
  orders: number;
}

export interface LegacyTarget extends Target {
  spend: number;
  sales: number;
  orders: number;
}

/**
 * Adds legacy field aliases to a campaign for backward compatibility
 */
export const addLegacyFields = <T extends Campaign | AdGroup | Keyword | Target>(entity: T): T & { spend: number; sales: number; orders: number } => {
  const campaignAdgroupKeyword = entity as Campaign | AdGroup | Keyword;
  const target = entity as Target;
  
  return {
    ...entity,
    // Use 14d attribution as default for legacy compatibility
    spend: (campaignAdgroupKeyword as any).cost_legacy || (campaignAdgroupKeyword as any).cost_14d || (target as any).spend || 0,
    sales: (campaignAdgroupKeyword as any).attributed_sales_legacy || (campaignAdgroupKeyword as any).attributed_sales_14d || (target as any).sales || 0,
    orders: (campaignAdgroupKeyword as any).attributed_conversions_legacy || (campaignAdgroupKeyword as any).attributed_conversions_14d || (target as any).orders || 0,
  };
};

/**
 * Adds legacy field aliases to an array of entities
 */
export const addLegacyFieldsToArray = <T extends Campaign | AdGroup | Keyword | Target>(
  entities: T[]
): (T & { spend: number; sales: number; orders: number })[] => {
  return entities.map(entity => addLegacyFields(entity));
};

/**
 * Gets the best available value for spend/cost across attribution windows
 */
export const getBestSpend = (entity: Campaign | AdGroup | Keyword): number => {
  return entity.cost_legacy || entity.cost_14d || entity.cost_7d || entity.cost_30d || entity.cost_1d || 0;
};

/**
 * Gets the best available value for sales across attribution windows
 */
export const getBestSales = (entity: Campaign | AdGroup | Keyword): number => {
  return entity.attributed_sales_legacy || entity.attributed_sales_14d || entity.attributed_sales_7d || entity.attributed_sales_30d || entity.attributed_sales_1d || 0;
};

/**
 * Gets the best available value for orders/conversions across attribution windows
 */
export const getBestOrders = (entity: Campaign | AdGroup | Keyword): number => {
  return entity.attributed_conversions_legacy || entity.attributed_conversions_14d || entity.attributed_conversions_7d || entity.attributed_conversions_30d || entity.attributed_conversions_1d || 0;
};