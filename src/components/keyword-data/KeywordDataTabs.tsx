
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

const KeywordDataTabs = () => {
  return (
    <Tabs defaultValue="keywords" className="w-full">
      <TabsList>
        <TabsTrigger value="keywords">Keywords</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
      </TabsList>
      
      <TabsContent value="keywords">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              No keyword data available - Amazon functionality has been removed.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="products">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              No product data available - Amazon functionality has been removed.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default KeywordDataTabs;
