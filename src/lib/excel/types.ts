
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
