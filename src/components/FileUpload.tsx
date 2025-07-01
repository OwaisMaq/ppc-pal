
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdvertisingData } from '@/types/common';

interface FileUploadProps {
  onDataParsed: (data: AdvertisingData) => void;
}

const FileUpload = ({ onDataParsed }: FileUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Mock file processing since Amazon functionality has been removed
    const mockData: AdvertisingData = {
      campaigns: [],
      keywords: [],
      adGroups: [],
      connections: []
    };
    
    onDataParsed(mockData);
  }, [onDataParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          File upload functionality is currently disabled as Amazon integration has been removed.
        </AlertDescription>
      </Alert>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? 'Drop files here' : 'Upload advertising data'}
          </p>
          <p className="text-gray-500">
            Drag and drop Excel or CSV files, or click to browse
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              .xlsx
            </span>
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              .csv
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
