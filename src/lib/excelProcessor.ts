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
          
          // Store original sheet structure
          originalStructure!.sheetStructures[sheetName] = {
            originalData: jsonData,
            headers: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
            range: worksheet['!ref'] || 'A1'
          };
          
          console.log(`Sheet ${sheetName} has ${jsonData.length} rows`);
          
          // Determine data type based on sheet name or content
          const lowerSheetName = sheetName.toLowerCase();
          
          if (lowerSheetName.includes('portfolio')) {
            result.portfolios = jsonData;
          } else if (lowerSheetName.includes('campaign')) {
            result.campaigns = jsonData;
          } else if (lowerSheetName.includes('adgroup') || lowerSheetName.includes('ad group')) {
            result.adGroups = jsonData;
          } else if (lowerSheetName.includes('keyword') || lowerSheetName.includes('targeting')) {
            result.keywords = jsonData;
          } else {
            // Try to auto-detect based on column headers
            const firstRow = jsonData[0] as any;
            if (firstRow) {
              const headers = Object.keys(firstRow).map(h => h.toLowerCase());
              
              if (headers.some(h => h.includes('keyword') || h.includes('targeting'))) {
                result.keywords = [...result.keywords, ...jsonData];
              } else if (headers.some(h => h.includes('campaign'))) {
                result.campaigns = [...result.campaigns, ...jsonData];
              } else if (headers.some(h => h.includes('adgroup') || h.includes('ad group'))) {
                result.adGroups = [...result.adGroups, ...jsonData];
              } else if (headers.some(h => h.includes('portfolio'))) {
                result.portfolios = [...result.portfolios, ...jsonData];
              } else {
                // Default to keywords if uncertain
                result.keywords = [...result.keywords, ...jsonData];
              }
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

export const exportToExcel = async (data: AdvertisingData) => {
  try {
    if (!originalStructure) {
      throw new Error("Original file structure not found. Please upload a file first.");
    }

    const workbook = XLSX.utils.book_new();

    // Only recreate sheets that existed in the original file, maintaining their exact structure
    originalStructure.sheetNames.forEach(sheetName => {
      const originalSheetData = originalStructure!.sheetStructures[sheetName];
      let sheetData = originalSheetData.originalData;
      const originalHeaders = originalSheetData.headers;

      console.log(`Processing sheet: ${sheetName}`);
      console.log(`Original headers:`, originalHeaders);

      // Determine the correct data type for this sheet based on its original content
      // Look at the original data to determine what type of entity this sheet contains
      if (originalSheetData.originalData.length > 0) {
        const firstRow = originalSheetData.originalData[0];
        const headers = Object.keys(firstRow).map(h => h.toLowerCase());
        
        // Check if this sheet contains keyword data by looking at headers
        const isKeywordSheet = headers.some(h => 
          h.includes('keyword') || 
          h.includes('targeting') || 
          h.includes('match type') || 
          h.includes('bid') || 
          h.includes('max cpc')
        );
        
        // Check if this sheet contains campaign data
        const isCampaignSheet = headers.some(h => 
          h.includes('campaign') && 
          !h.includes('keyword') && 
          !h.includes('targeting')
        );
        
        // Check if this sheet contains ad group data
        const isAdGroupSheet = headers.some(h => 
          h.includes('adgroup') || h.includes('ad group')
        ) && !isKeywordSheet;
        
        // Check if this sheet contains portfolio data
        const isPortfolioSheet = headers.some(h => 
          h.includes('portfolio')
        );

        // Only use optimized data if it matches the sheet type
        if (isKeywordSheet && data.keywords.length > 0) {
          console.log(`Using optimized keyword data for sheet: ${sheetName}`);
          sheetData = data.keywords;
        } else if (isCampaignSheet && data.campaigns.length > 0) {
          console.log(`Using optimized campaign data for sheet: ${sheetName}`);
          sheetData = data.campaigns;
        } else if (isAdGroupSheet && data.adGroups.length > 0) {
          console.log(`Using optimized ad group data for sheet: ${sheetName}`);
          sheetData = data.adGroups;
        } else if (isPortfolioSheet && data.portfolios.length > 0) {
          console.log(`Using optimized portfolio data for sheet: ${sheetName}`);
          sheetData = data.portfolios;
        } else {
          console.log(`Keeping original data for sheet: ${sheetName} (no matching optimized data)`);
          // Keep original data if no matching optimized data
        }
      }

      // Ensure the data maintains the exact same column structure as original
      if (sheetData && sheetData.length > 0) {
        const processedData = sheetData.map((row: any) => {
          const newRow: any = {};
          // Maintain exact same column order and names from original
          originalHeaders.forEach((header: string) => {
            newRow[header] = row[header] !== undefined ? row[header] : '';
          });
          return newRow;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(processedData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      } else {
        // Keep original data if no optimized data available
        const worksheet = XLSX.utils.json_to_sheet(originalSheetData.originalData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
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
