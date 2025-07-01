
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvertisingData } from '@/types/common';

interface DataPreviewProps {
  data: AdvertisingData | null;
}

const DataPreview = ({ data }: DataPreviewProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription>No data available to preview</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Preview</CardTitle>
        <CardDescription>Overview of your imported data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{data.campaigns?.length || 0}</div>
            <div className="text-sm text-gray-600">Campaigns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.keywords?.length || 0}</div>
            <div className="text-sm text-gray-600">Keywords</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.adGroups?.length || 0}</div>
            <div className="text-sm text-gray-600">Ad Groups</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataPreview;
