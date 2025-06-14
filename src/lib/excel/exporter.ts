
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AdvertisingData } from '@/pages/Index';
import { EntityType, GroupedDataByProductType } from './types';
import { AMAZON_REQUIRED_HEADERS } from './constants';
import { normalizeAmazonData } from './normalizer';
import { getOriginalStructure } from './parser';

const createAmazonCompatibleSheet = (data: any[], entityType: EntityType, sheetName: string) => {
  if (!data.length) {
    console.log(`No data for ${entityType} sheet: ${sheetName}`);
    return XLSX.utils.json_to_sheet([]);
  }

  // Normalize data for Amazon format
  const normalizedData = normalizeAmazonData(data, entityType);
  
  // Get required headers for this entity type
  const requiredHeaders = AMAZON_REQUIRED_HEADERS[entityType] || AMAZON_REQUIRED_HEADERS.keyword;
  
  // Ensure all rows have all required columns with default values
  const completeData = normalizedData.map(row => {
    const completeRow: any = {};
    
    // Add all required headers in correct order
    requiredHeaders.forEach(header => {
      completeRow[header] = row[header] || '';
    });
    
    return completeRow;
  });

  console.log(`Creating ${entityType} sheet with ${completeData.length} rows and headers:`, requiredHeaders);
  
  // Create worksheet with exact Amazon header order
  return XLSX.utils.json_to_sheet(completeData, {
    header: requiredHeaders
  });
};

const groupDataByProductType = (data: AdvertisingData): GroupedDataByProductType => {
  return {
    'Sponsored Products': {
      keywords: data.keywords.filter(k => !k.Product || k.Product === 'Sponsored Products'),
      campaigns: data.campaigns.filter(c => !c.Product || c.Product === 'Sponsored Products'),
      adGroups: data.adGroups.filter(a => !a.Product || a.Product === 'Sponsored Products'),
      portfolios: data.portfolios.filter(p => !p.Product || p.Product === 'Sponsored Products')
    },
    'Sponsored Brands': {
      keywords: data.keywords.filter(k => k.Product === 'Sponsored Brands'),
      campaigns: data.campaigns.filter(c => c.Product === 'Sponsored Brands'),
      adGroups: data.adGroups.filter(a => a.Product === 'Sponsored Brands'),
      portfolios: data.portfolios.filter(p => p.Product === 'Sponsored Brands')
    },
    'Sponsored Display': {
      keywords: data.keywords.filter(k => k.Product === 'Sponsored Display'),
      campaigns: data.campaigns.filter(c => c.Product === 'Sponsored Display'),
      adGroups: data.adGroups.filter(a => a.Product === 'Sponsored Display'),
      portfolios: data.portfolios.filter(p => p.Product === 'Sponsored Display')
    }
  };
};

export const exportToExcel = async (data: AdvertisingData) => {
  try {
    const originalStructure = getOriginalStructure();
    
    if (!originalStructure) {
      throw new Error("Original file structure not found. Please upload a file first.");
    }

    const workbook = XLSX.utils.book_new();

    // Group data by product type to ensure Amazon compatibility
    const dataByProductType = groupDataByProductType(data);

    // Create separate sheets for each entity type and product type combination
    Object.entries(dataByProductType).forEach(([productType, typeData]) => {
      if (typeData.keywords.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.keywords, 'keyword', `${productType} Keywords`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Keywords`);
      }
      
      if (typeData.campaigns.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.campaigns, 'campaign', `${productType} Campaigns`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Campaigns`);
      }
      
      if (typeData.adGroups.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.adGroups, 'adgroup', `${productType} Ad Groups`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Ad Groups`);
      }
      
      if (typeData.portfolios.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.portfolios, 'portfolio', `${productType} Portfolios`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Portfolios`);
      }
    });

    // If no sheets were created, create a default keywords sheet
    if (workbook.SheetNames.length === 0) {
      console.log("No valid data found, creating default Sponsored Products Keywords sheet");
      const defaultData = data.keywords.length > 0 ? data.keywords : [{}];
      const worksheet = createAmazonCompatibleSheet(defaultData, 'keyword', 'Sponsored Products Keywords');
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sponsored Products Keywords');
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(dataBlob, `amazon-ads-optimized-${timestamp}.xlsx`);
    
    console.log("Excel export completed successfully with Amazon-compatible format");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
};
