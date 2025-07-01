
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdvertisingData } from '@/types/common';
import FileUpload from './FileUpload';
import DataPreview from './DataPreview';
import { Upload, CheckCircle } from 'lucide-react';

interface UploadSectionProps {
  onDataUploaded?: (data: AdvertisingData) => void;
}

const UploadSection = ({ onDataUploaded }: UploadSectionProps) => {
  const [uploadedData, setUploadedData] = useState<AdvertisingData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDataParsed = async (data: AdvertisingData) => {
    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      setUploadedData(data);
      setIsProcessing(false);
      onDataUploaded?.(data);
    }, 2000);
  };

  const handleConfirmUpload = () => {
    if (uploadedData) {
      // Process the upload
      console.log('Processing upload:', uploadedData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Upload
          </CardTitle>
          <CardDescription>
            Upload your advertising data to get started with analysis and optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload onDataParsed={handleDataParsed} />
        </CardContent>
      </Card>

      {isProcessing && (
        <Alert>
          <AlertDescription>
            Processing your data... Please wait while we analyze your files.
          </AlertDescription>
        </Alert>
      )}

      {uploadedData && (
        <>
          <DataPreview data={uploadedData} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Upload Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={handleConfirmUpload}>
                  Continue to Analysis
                </Button>
                <Button variant="outline" onClick={() => setUploadedData(null)}>
                  Upload Different File
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default UploadSection;
