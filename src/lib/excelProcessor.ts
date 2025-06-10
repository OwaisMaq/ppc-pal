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

    // Recreate all original sheets with exact same structure
    originalStructure.sheetNames.forEach(sheetName => {
      const originalSheetData = originalStructure!.sheetStructures[sheetName];
      let sheetData = originalSheetData.originalData;

      // Determine which optimized data to use based on sheet name/content
      const lowerSheetName = sheetName.toLowerCase();
      
      if (lowerSheetName.includes('portfolio') && data.portfolios.length > 0) {
        sheetData = data.portfolios;
      } else if (lowerSheetName.includes('campaign') && data.campaigns.length > 0) {
        sheetData = data.campaigns;
      } else if ((lowerSheetName.includes('adgroup') || lowerSheetName.includes('ad group')) && data.adGroups.length > 0) {
        sheetData = data.adGroups;
      } else if ((lowerSheetName.includes('keyword') || lowerSheetName.includes('targeting')) && data.keywords.length > 0) {
        sheetData = data.keywords;
      } else {
        // Try to detect based on original headers
        const headers = originalSheetData.headers;
        const lowerHeaders = headers.map((h: string) => h.toLowerCase());
        
        if (lowerHeaders.some(h => h.includes('keyword') || h.includes('targeting')) && data.keywords.length > 0) {
          sheetData = data.keywords;
        } else if (lowerHeaders.some(h => h.includes('campaign')) && data.campaigns.length > 0) {
          sheetData = data.campaigns;
        } else if (lowerHeaders.some(h => h.includes('adgroup') || h.includes('ad group')) && data.adGroups.length > 0) {
          sheetData = data.adGroups;
        } else if (lowerHeaders.some(h => h.includes('portfolio')) && data.portfolios.length > 0) {
          sheetData = data.portfolios;
        }
        // If no match found, keep original data
      }

      // Ensure the data maintains the exact same column structure
      if (sheetData && sheetData.length > 0) {
        const processedData = sheetData.map((row: any) => {
          const newRow: any = {};
          // Maintain exact same column order and names from original
          originalSheetData.headers.forEach((header: string) => {
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
