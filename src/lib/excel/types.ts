
import * as XLSX from 'xlsx';
import { AdvertisingData } from '@/pages/Index';

export interface OriginalWorkbookStructure {
  sheetNames: string[];
  sheetStructures: { [sheetName: string]: any };
  originalWorkbook: XLSX.WorkBook;
}

export type EntityType = 'keyword' | 'campaign' | 'adgroup' | 'portfolio' | 'product_targeting' | 'asset_group' | 'negative_keyword';

export type ProductType = 'Sponsored Products' | 'Sponsored Brands' | 'Sponsored Display';

export type CampaignType = 'Automatic' | 'Manual' | 'Video' | 'Audio' | 'Custom';

export type MatchType = 'broad' | 'phrase' | 'exact' | 'negative_broad' | 'negative_phrase' | 'negative_exact';

export interface GroupedDataByProductType {
  [productType: string]: {
    keywords: any[];
    campaigns: any[];
    adGroups: any[];
    portfolios: any[];
    productTargeting: any[];
    assetGroups: any[];
    negativeKeywords: any[];
  };
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
  entityType: EntityType;
  productType: ProductType;
  campaignType?: CampaignType;
  metrics: OptimizationMetrics;
  [key: string]: any;
}
