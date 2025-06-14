
import * as XLSX from 'xlsx';
import { AdvertisingData } from '@/pages/Index';

export interface OriginalWorkbookStructure {
  sheetNames: string[];
  sheetStructures: { [sheetName: string]: any };
  originalWorkbook: XLSX.WorkBook;
}

export type EntityType = 'keyword' | 'campaign' | 'adgroup' | 'portfolio';

export type ProductType = 'Sponsored Products' | 'Sponsored Brands' | 'Sponsored Display';

export interface GroupedDataByProductType {
  [productType: string]: {
    keywords: any[];
    campaigns: any[];
    adGroups: any[];
    portfolios: any[];
  };
}
