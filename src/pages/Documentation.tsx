import { DocumentationManager } from "@/components/DocumentationManager";
import { DocumentationSyncTrigger } from "@/components/DocumentationSyncTrigger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Documentation() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Amazon Ads API Documentation</h1>
          <p className="text-muted-foreground">
            Manage and sync Amazon Ads API documentation sources for enhanced AI optimization.
          </p>
        </div>
        
        <Tabs defaultValue="sync" className="w-full">
          <TabsList>
            <TabsTrigger value="sync">Sync & Analysis</TabsTrigger>
            <TabsTrigger value="manage">Manage Sources</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sync">
            <DocumentationSyncTrigger />
          </TabsContent>
          
          <TabsContent value="manage">
            <DocumentationManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}