
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AdvertisingData } from '@/types/common';

export const exportToExcel = (data: AdvertisingData, filename: string) => {
  // Mock export since Amazon functionality has been removed
  console.log('Excel export (mock):', filename);
  
  const ws = XLSX.utils.json_to_sheet([{ message: 'No data available' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};
