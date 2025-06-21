
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Target, Upload, Settings, BarChart3 } from 'lucide-react';
import GoalsPreferences from '@/components/product-setup/GoalsPreferences';
import ProductInfo from '@/components/product-setup/ProductInfo';
import AutomationPreferences from '@/components/product-setup/AutomationPreferences';
import InventoryHealth from '@/components/product-setup/InventoryHealth';

const ProductSetup = () => {
  const [activeTab, setActiveTab] = useState("goals");

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            Product Setup
          </h1>
          <p className="text-gray-600">
            Configure your product settings, goals, and automation preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals & Preferences
            </TabsTrigger>
            <TabsTrigger value="product-info" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Product Info
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Inventory Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals">
            <GoalsPreferences />
          </TabsContent>

          <TabsContent value="product-info">
            <ProductInfo />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationPreferences />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryHealth />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
};

export default ProductSetup;
