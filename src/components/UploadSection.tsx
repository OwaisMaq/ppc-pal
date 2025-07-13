
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import DataPreview from "@/components/DataPreview";
import { AdvertisingData } from "@/pages/Index";

interface UploadSectionProps {
  uploadedData: AdvertisingData | null;
  onFileUpload: (data: AdvertisingData) => void;
}

const UploadSection = ({ uploadedData, onFileUpload }: UploadSectionProps) => {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Amazon Data
          </CardTitle>
          <CardDescription>
            Upload your Excel workbook containing portfolio, campaign, ad group, and keyword data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload onFileUpload={onFileUpload} />
        </CardContent>
      </Card>

      {uploadedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Data Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataPreview data={uploadedData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadSection;
