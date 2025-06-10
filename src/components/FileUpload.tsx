
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/excelProcessor";
import { AdvertisingData } from "@/pages/Index";

interface FileUploadProps {
  onFileUpload: (data: AdvertisingData) => void;
}

const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    try {
      console.log("Processing file:", file.name);
      const data = await parseExcelFile(file);
      onFileUpload(data);
    } catch (error) {
      console.error("File parsing error:", error);
      toast.error("Failed to parse Excel file. Please check the format and try again.");
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50' : ''}
        ${isDragReject ? 'border-red-400 bg-red-50' : ''}
        ${!isDragActive ? 'border-gray-300 hover:border-gray-400' : ''}
        ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Processing file...</p>
          </>
        ) : isDragReject ? (
          <>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-red-600">Please upload a valid Excel file (.xlsx or .xls)</p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              {isDragActive ? (
                <Upload className="h-12 w-12 text-blue-600" />
              ) : (
                <FileSpreadsheet className="h-12 w-12 text-gray-400" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? "Drop your file here" : "Upload Amazon Advertising Data"}
              </p>
              <p className="text-gray-500 mt-1">
                Drag and drop your Excel workbook, or click to browse
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Supports .xlsx and .xls files
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
