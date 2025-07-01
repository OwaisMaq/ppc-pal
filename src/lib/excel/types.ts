
import * as XLSX from 'xlsx';
import { AdvertisingData } from '@/types/common';

export interface ExcelParseResult {
  data: AdvertisingData;
  errors: string[];
  warnings: string[];
}

export interface ExcelExportOptions {
  includeMetrics: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Add missing type definitions
export type EntityType = 'keyword' | 'campaign' | 'adgroup' | 'portfolio' | 'product_targeting' | 'asset_group' | 'negative_keyword';

export type ProductType = 'Sponsored Products' | 'Sponsored Brands' | 'Sponsored Display';

export type CampaignType = 'Automatic' | 'Manual' | 'Video' | 'Audio' | 'Custom';

export type MatchType = 'broad' | 'phrase' | 'exact' | 'negative_broad' | 'negative_phrase' | 'negative_exact';

export interface OriginalWorkbookStructure {
  sheets: string[];
  entityTypes: EntityType[];
}

export interface OptimizationMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
  conversionRate: number;
}

export interface ReportData {
  campaigns: any[];
  keywords: any[];
  adGroups: any[];
  metrics: OptimizationMetrics;
}
