import { EnhancedAmazonDashboard } from '@/components/EnhancedAmazonDashboard';
import { DocumentationManager } from '@/components/DocumentationManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EnhancedDashboard = () => {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Campaign Dashboard</TabsTrigger>
          <TabsTrigger value="documentation">AI Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <EnhancedAmazonDashboard />
        </TabsContent>
        
        <TabsContent value="documentation">
          <DocumentationManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedDashboard;