
import * as XLSX from 'xlsx';
import { AdvertisingData } from '@/pages/Index';
import { OriginalWorkbookStructure, EntityType, ReportData } from './types';
import { AMAZON_PRODUCT_TYPES, AMAZON_CAMPAIGN_TYPES } from './constants';

// Store original workbook structure
let originalStructure: OriginalWorkbookStructure | null = null;

export const getOriginalStructure = (): OriginalWorkbookStructure | null => {
  return originalStructure;
};

// Enhanced entity detection based on Amazon report patterns
const detectEntityType = (data: any[], sheetName: string): EntityType => {
  if (!data.length) return 'keyword';
  
  const sampleRow = data[0];
  const headers = Object.keys(sampleRow);
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Check for explicit Entity column
  const entityColumn = sampleRow['Entity'] || sampleRow['entity'];
  if (entityColumn) {
    const entityValue = entityColumn.toLowerCase();
    if (entityValue.includes('keyword') || entityValue.includes('targeting')) return 'keyword';
    if (entityValue.includes('campaign')) return 'campaign';
    if (entityValue.includes('ad group') || entityValue.includes('adgroup')) return 'adgroup';
    if (entityValue.includes('portfolio')) return 'portfolio';
    if (entityValue.includes('product targeting')) return 'product_targeting';
    if (entityValue.includes('asset group')) return 'asset_group';
    if (entityValue.includes('negative')) return 'negative_keyword';
  }
  
  // Enhanced header-based detection
  if (lowerHeaders.some(h => h.includes('keyword text') || h.includes('targeting expression'))) {
    return 'keyword';
  }
  if (lowerHeaders.some(h => h.includes('product targeting') || h.includes('asin'))) {
    return 'product_targeting';
  }
  if (lowerHeaders.some(h => h.includes('negative keyword'))) {
    return 'negative_keyword';
  }
  if (lowerHeaders.some(h => h.includes('asset group'))) {
    return 'asset_group';
  }
  if (lowerHeaders.some(h => h.includes('campaign budget') || h.includes('campaign type'))) {
    return 'campaign';
  }
  if (lowerHeaders.some(h => h.includes('ad group default bid') || h.includes('adgroup default bid'))) {
    return 'adgroup';
  }
  if (lowerHeaders.some(h => h.includes('portfolio budget'))) {
    return 'portfolio';
  }
  
  // Fallback to sheet name analysis
  const lowerSheetName = sheetName.toLowerCase();
  if (lowerSheetName.includes('keyword')) return 'keyword';
  if (lowerSheetName.includes('campaign')) return 'campaign';
  if (lowerSheetName.includes('adgroup') || lowerSheetName.includes('ad group')) return 'adgroup';
  if (lowerSheetName.includes('portfolio')) return 'portfolio';
  if (lowerSheetName.includes('targeting') || lowerSheetName.includes('product')) return 'product_targeting';
  if (lowerSheetName.includes('negative')) return 'negative_keyword';
  
  return 'keyword'; // Default fallback
};

// Enhanced metrics extraction from Amazon reports
const extractMetrics = (row: any): any => {
  const metrics = { ...row };
  
  // Normalize common metric field names
  const fieldMappings = {
    'Impressions': ['impressions', 'impr', 'Impr.', 'Impression'],
    'Clicks': ['clicks', 'Click', 'Clicks'],
    'Spend': ['spend', 'cost', 'Cost', 'Ad Spend', 'Total Spend', 'Spend (Advertised currency)', 'Spend (Campaign currency)'],
    'Sales': ['sales', 'Attributed Sales 7d', 'Attributed Sales 14d', 'Total Sales'],
    'Orders': ['orders', 'Purchases', 'Attributed Units Ordered 7d', 'Attributed Conversions 7d', 'Attributed Conversions 14d', 'Total Orders'],
    'CTR': ['ctr', 'CTR', 'Click-Through Rate', 'Click Through Rate', 'Click thru rate (CTR)', 'clickThroughRate'],
    'CPC': ['cpc', 'CPC', 'Cost Per Click', 'Avg. CPC', 'Avg CPC', 'costPerClick'],
    'ACOS': ['acos', 'ACOS', 'ACoS', 'Advertising Cost of Sales', 'ACOS (%)'],
    'ROAS': ['roas', 'RoAS', 'ROAS', 'Return on Ad Spend', 'Return On Advertising Spend']
  };
  
  Object.entries(fieldMappings).forEach(([standardName, variations]) => {
    const foundField = variations.find(variation => 
      Object.keys(row).find(key => key.toLowerCase() === variation.toLowerCase())
    );
    if (foundField) {
      const originalKey = Object.keys(row).find(key => key.toLowerCase() === foundField.toLowerCase());
      if (originalKey && row[originalKey] !== undefined) {
        metrics[standardName] = row[originalKey];
      }
    }
  });
  
  return metrics;
};

export const parseExcelFile = async (file: File): Promise<AdvertisingData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        console.log("Enhanced parser - Workbook sheets:", workbook.SheetNames);
        
        // Store original structure for later export
        originalStructure = {
          sheetNames: [...workbook.SheetNames],
          sheetStructures: {},
          originalWorkbook: workbook
        };

        const result: AdvertisingData & { 
          productTargeting?: any[]; 
          assetGroups?: any[]; 
          negativeKeywords?: any[] 
        } = {
          portfolios: [],
          campaigns: [],
          adGroups: [],
          keywords: [],
          productTargeting: [],
          assetGroups: [],
          negativeKeywords: []
        };

        // Enhanced parsing for each sheet
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) return;
          
          // Detect entity type using enhanced logic
          const entityType = detectEntityType(jsonData, sheetName);
          
          // Extract and normalize metrics
          const processedData = jsonData.map(row => extractMetrics(row));
          
          // Store original sheet structure
          const originalHeaders = Object.keys(jsonData[0]);
          originalStructure!.sheetStructures[sheetName] = {
            originalData: processedData,
            headers: originalHeaders,
            range: worksheet['!ref'] || 'A1',
            entityType: entityType
          };
          
          console.log(`Enhanced parser - Sheet ${sheetName}:`);
          console.log(`  Entity type: ${entityType}`);
          console.log(`  Headers: ${originalHeaders.length}`);
          console.log(`  Rows: ${processedData.length}`);
          
          // Distribute data based on detected entity type
          switch (entityType) {
            case 'keyword':
              result.keywords = [...result.keywords, ...processedData];
              break;
            case 'campaign':
              result.campaigns = [...result.campaigns, ...processedData];
              break;
            case 'adgroup':
              result.adGroups = [...result.adGroups, ...processedData];
              break;
            case 'portfolio':
              result.portfolios = [...result.portfolios, ...processedData];
              break;
            case 'product_targeting':
              result.productTargeting = [...(result.productTargeting || []), ...processedData];
              break;
            case 'asset_group':
              result.assetGroups = [...(result.assetGroups || []), ...processedData];
              break;
            case 'negative_keyword':
              result.negativeKeywords = [...(result.negativeKeywords || []), ...processedData];
              break;
          }
        });

        console.log("Enhanced parsing completed:", {
          keywords: result.keywords?.length || 0,
          campaigns: result.campaigns?.length || 0,
          adGroups: result.adGroups?.length || 0,
          portfolios: result.portfolios?.length || 0,
          productTargeting: result.productTargeting?.length || 0,
          assetGroups: result.assetGroups?.length || 0,
          negativeKeywords: result.negativeKeywords?.length || 0
        });
        
        resolve(result);
      } catch (error) {
        console.error("Enhanced parser error:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
};
