
import * as XLSX from 'xlsx';
import { AdvertisingData } from '@/pages/Index';
import { OriginalWorkbookStructure } from './types';

// Store original workbook structure
let originalStructure: OriginalWorkbookStructure | null = null;

export const getOriginalStructure = (): OriginalWorkbookStructure | null => {
  return originalStructure;
};

export const parseExcelFile = async (file: File): Promise<AdvertisingData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        console.log("Workbook sheets:", workbook.SheetNames);
        
        // Store original structure for later export
        originalStructure = {
          sheetNames: [...workbook.SheetNames],
          sheetStructures: {},
          originalWorkbook: workbook
        };

        const result: AdvertisingData = {
          portfolios: [],
          campaigns: [],
          adGroups: [],
          keywords: []
        };

        // Parse each sheet and store original structure
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Store original sheet structure with exact headers
          const originalHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          originalStructure!.sheetStructures[sheetName] = {
            originalData: jsonData,
            headers: originalHeaders,
            range: worksheet['!ref'] || 'A1'
          };
          
          console.log(`Sheet ${sheetName} headers:`, originalHeaders);
          console.log(`Sheet ${sheetName} has ${jsonData.length} rows`);
          
          // Determine data type based on Entity column or sheet content
          const entityTypes = jsonData.map((row: any) => row.Entity || '').filter(Boolean);
          const uniqueEntities = [...new Set(entityTypes)];
          
          console.log(`Sheet ${sheetName} entities:`, uniqueEntities);
          
          // Classify based on Entity column values (Amazon standard)
          if (uniqueEntities.includes('Keyword') || uniqueEntities.includes('Product Targeting')) {
            result.keywords = [...result.keywords, ...jsonData];
          } else if (uniqueEntities.includes('Campaign')) {
            result.campaigns = [...result.campaigns, ...jsonData];
          } else if (uniqueEntities.includes('Ad Group')) {
            result.adGroups = [...result.adGroups, ...jsonData];
          } else if (uniqueEntities.includes('Portfolio')) {
            result.portfolios = [...result.portfolios, ...jsonData];
          } else {
            // Fallback to sheet name analysis
            const lowerSheetName = sheetName.toLowerCase();
            if (lowerSheetName.includes('keyword') || lowerSheetName.includes('targeting')) {
              result.keywords = [...result.keywords, ...jsonData];
            } else if (lowerSheetName.includes('campaign')) {
              result.campaigns = [...result.campaigns, ...jsonData];
            } else if (lowerSheetName.includes('adgroup') || lowerSheetName.includes('ad group')) {
              result.adGroups = [...result.adGroups, ...jsonData];
            } else if (lowerSheetName.includes('portfolio')) {
              result.portfolios = [...result.portfolios, ...jsonData];
            } else {
              // Default to keywords if uncertain
              result.keywords = [...result.keywords, ...jsonData];
            }
          }
        });

        console.log("Parsed data:", result);
        resolve(result);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
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
