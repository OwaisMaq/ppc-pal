
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from 'lucide-react';
import { AdvertisingData } from '@/types/common';

interface FileUploadProps {
  onDataLoaded: (data: AdvertisingData) => void;
}

const FileUpload = ({ onDataLoaded }: FileUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Mock data loading for now
    const mockData: AdvertisingData = {
      campaigns: [],
      keywords: [],
      adGroups: []
    };
    onDataLoaded(mockData);
  }, [onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Data
        </CardTitle>
        <CardDescription>
          Upload your advertising data files (Excel or CSV format)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <>
              <p className="text-gray-600 mb-2">Drag & drop files here, or click to select</p>
              <Button variant="outline">Browse Files</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
