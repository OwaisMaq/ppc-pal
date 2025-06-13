
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AdvertisingData } from '@/pages/Index';

// Store original workbook structure
interface OriginalWorkbookStructure {
  sheetNames: string[];
  sheetStructures: { [sheetName: string]: any };
  originalWorkbook: XLSX.WorkBook;
}

let originalStructure: OriginalWorkbookStructure | null = null;

// Amazon required headers mapping
const AMAZON_REQUIRED_HEADERS = {
  keyword: ['Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Max Bid'],
  campaign: ['Product', 'Entity', 'Operation', 'Campaign', 'Campaign Budget', 'Campaign Budget Type'],
  adgroup: ['Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Ad Group Default Bid'],
  portfolio: ['Product', 'Entity', 'Operation', 'Portfolio', 'Portfolio Budget']
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

const ensureAmazonCompatibleHeaders = (data: any[], originalHeaders: string[], entityType: string): any[] => {
  if (!data.length) return data;

  console.log(`Ensuring Amazon compatibility for ${entityType} with original headers:`, originalHeaders);

  // Amazon requires specific first three columns: Product, Entity, Operation
  const processedData = data.map(row => {
    const newRow: any = {};
    
    // Ensure Amazon required first three columns exist
    newRow['Product'] = row['Product'] || 'Sponsored Products';
    
    // Set Entity based on data type and existing data
    if (row['Entity']) {
      newRow['Entity'] = row['Entity'];
    } else {
      // Infer entity type from data structure
      if (entityType === 'keyword' && (row['Keyword'] || row['keyword'])) {
        newRow['Entity'] = 'Keyword';
      } else if (entityType === 'campaign' && (row['Campaign'] || row['campaign'])) {
        newRow['Entity'] = 'Campaign';
      } else if (entityType === 'adgroup' && (row['Ad Group'] || row['adgroup'] || row['AdGroup'])) {
        newRow['Entity'] = 'Ad Group';
      } else if (entityType === 'portfolio' && (row['Portfolio'] || row['portfolio'])) {
        newRow['Entity'] = 'Portfolio';
      } else {
        newRow['Entity'] = 'Keyword'; // Default fallback
      }
    }
    
    newRow['Operation'] = row['Operation'] || 'update';

    // Copy all other original columns in their original order
    originalHeaders.forEach(header => {
      if (header !== 'Product' && header !== 'Entity' && header !== 'Operation') {
        newRow[header] = row[header];
      }
    });

    return newRow;
  });

  return processedData;
};

export const exportToExcel = async (data: AdvertisingData) => {
  try {
    if (!originalStructure) {
      throw new Error("Original file structure not found. Please upload a file first.");
    }

    const workbook = XLSX.utils.book_new();

    // Recreate sheets maintaining exact original structure and order
    originalStructure.sheetNames.forEach(sheetName => {
      const originalSheetData = originalStructure!.sheetStructures[sheetName];
      let sheetData = originalSheetData.originalData;
      const originalHeaders = originalSheetData.headers;

      console.log(`Processing sheet: ${sheetName}`);
      console.log(`Original headers:`, originalHeaders);

      // Determine entity type from original data
      let entityType = 'keyword'; // default
      if (originalSheetData.originalData.length > 0) {
        const sampleRow = originalSheetData.originalData[0];
        const entityValue = sampleRow.Entity || '';
        
        if (entityValue === 'Campaign') {
          entityType = 'campaign';
        } else if (entityValue === 'Ad Group') {
          entityType = 'adgroup';
        } else if (entityValue === 'Portfolio') {
          entityType = 'portfolio';
        } else if (entityValue === 'Keyword' || entityValue === 'Product Targeting') {
          entityType = 'keyword';
        }
      }

      // Use optimized data if available and matches entity type
      if (entityType === 'keyword' && data.keywords.length > 0) {
        console.log(`Using optimized keyword data for sheet: ${sheetName}`);
        sheetData = data.keywords;
      } else if (entityType === 'campaign' && data.campaigns.length > 0) {
        console.log(`Using optimized campaign data for sheet: ${sheetName}`);
        sheetData = data.campaigns;
      } else if (entityType === 'adgroup' && data.adGroups.length > 0) {
        console.log(`Using optimized ad group data for sheet: ${sheetName}`);
        sheetData = data.adGroups;
      } else if (entityType === 'portfolio' && data.portfolios.length > 0) {
        console.log(`Using optimized portfolio data for sheet: ${sheetName}`);
        sheetData = data.portfolios;
      }

      // Ensure Amazon-compatible structure
      const amazonCompatibleData = ensureAmazonCompatibleHeaders(sheetData, originalHeaders, entityType);
      
      // Create worksheet with exact column order as original
      const worksheet = XLSX.utils.json_to_sheet(amazonCompatibleData, {
        header: originalHeaders.length > 0 ? originalHeaders : ['Product', 'Entity', 'Operation']
      });
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(dataBlob, `amazon-ads-optimized-${timestamp}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
};
