
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from 'lucide-react';

const KeywordDataHeader = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Keyword Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          Amazon functionality has been removed. No keyword data is available.
        </p>
      </CardContent>
    </Card>
  );
};

export default KeywordDataHeader;
