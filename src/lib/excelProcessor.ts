
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AdvertisingData } from '@/pages/Index';

export const parseExcelFile = async (file: File): Promise<AdvertisingData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        console.log("Workbook sheets:", workbook.SheetNames);
        
        const result: AdvertisingData = {
          portfolios: [],
          campaigns: [],
          adGroups: [],
          keywords: []
        };

        // Parse each sheet
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
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
    const workbook = XLSX.utils.book_new();

    // Add each data type as a separate sheet
    if (data.portfolios && data.portfolios.length > 0) {
      const portfolioSheet = XLSX.utils.json_to_sheet(data.portfolios);
      XLSX.utils.book_append_sheet(workbook, portfolioSheet, "Portfolios");
    }

    if (data.campaigns && data.campaigns.length > 0) {
      const campaignSheet = XLSX.utils.json_to_sheet(data.campaigns);
      XLSX.utils.book_append_sheet(workbook, campaignSheet, "Campaigns");
    }

    if (data.adGroups && data.adGroups.length > 0) {
      const adGroupSheet = XLSX.utils.json_to_sheet(data.adGroups);
      XLSX.utils.book_append_sheet(workbook, adGroupSheet, "Ad Groups");
    }

    if (data.keywords && data.keywords.length > 0) {
      const keywordSheet = XLSX.utils.json_to_sheet(data.keywords);
      XLSX.utils.book_append_sheet(workbook, keywordSheet, "Keywords");
    }

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
