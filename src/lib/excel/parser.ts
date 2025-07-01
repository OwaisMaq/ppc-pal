
import * as XLSX from 'xlsx';
import { AdvertisingData } from '@/types/common';

export const parseExcelFile = async (file: File): Promise<AdvertisingData> => {
  // Mock parser since Amazon functionality has been removed
  console.log('Excel parse (mock):', file.name);
  
  return {
    campaigns: [],
    keywords: [],
    adGroups: [],
    connections: []
  };
};
