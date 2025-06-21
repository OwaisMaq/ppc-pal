
import React from 'react';
import { Database } from 'lucide-react';

const KeywordDataHeader = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
        <Database className="h-8 w-8 text-blue-600" />
        Keyword/Product Data
      </h1>
      <p className="text-gray-600">
        Manage and analyze your keyword and product performance data
      </p>
    </div>
  );
};

export default KeywordDataHeader;
