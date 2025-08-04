import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentationSync } from "@/hooks/useDocumentationSync";
import { RefreshCw, Plus, ExternalLink, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const DocumentationManager = () => {
  const {
    documentation,
    syncJobs,
    isLoading,
    isSyncing,
    fetchDocumentation,
    fetchSyncJobs,
    triggerSync,
    addDocumentationSource,
    toggleDocumentationSource
  } = useDocumentationSync();

  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetchDocumentation();
    fetchSyncJobs();
  }, []);

  const handleAddSource = async () => {
    if (!newUrl.trim() || !newTitle.trim()) return;
    
    await addDocumentationSource(newUrl.trim(), newTitle.trim());
    setNewUrl("");
    setNewTitle("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'completed_with_errors':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Completed with Errors</Badge>;
      case 'in_progress':
        return <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Amazon Ads Documentation Manager</CardTitle>
            <CardDescription>
              Manage and sync Amazon Ads API documentation to enhance AI optimization accuracy
            </CardDescription>
          </div>
          <Button 
            onClick={triggerSync} 
            disabled={isSyncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sources" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sources">Documentation Sources</TabsTrigger>
            <TabsTrigger value="sync-history">Sync History</TabsTrigger>
            <TabsTrigger value="add-source">Add Source</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sources" className="space-y-4">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4">Loading documentation sources...</div>
              ) : documentation.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No documentation sources found
                </div>
              ) : (
                documentation.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{doc.title}</h4>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{doc.url}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Last scraped: {formatDistanceToNow(new Date(doc.last_scraped_at))} ago</span>
                          <span>Content: {doc.content.length.toLocaleString()} characters</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={doc.is_active}
                          onCheckedChange={(checked) => toggleDocumentationSource(doc.id, checked)}
                        />
                        <Label className="text-sm">Active</Label>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="sync-history" className="space-y-4">
            <div className="space-y-3">
              {syncJobs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No sync jobs found
                </div>
              ) : (
                syncJobs.map((job) => (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.started_at))} ago
                        </span>
                      </div>
                      {job.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          Duration: {formatDistanceToNow(new Date(job.started_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Processed:</span> {job.sources_processed}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Updated:</span> {job.sources_updated}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span> {job.sources_failed}
                      </div>
                    </div>
                    {job.error_details && Array.isArray(job.error_details) && job.error_details.length > 0 && (
                      <div className="mt-2">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground">
                            View Errors ({job.error_details.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                            {job.error_details.map((error: any, index: number) => (
                              <div key={index} className="text-xs text-red-600">
                                {error.url}: {error.error}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="add-source" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter documentation title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://advertising.amazon.com/API/docs/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddSource}
                disabled={!newUrl.trim() || !newTitle.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Documentation Source
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Suggested Amazon Ads API Documentation URLs:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• API Overview & Authentication</div>
                <div>• Campaign Management Best Practices</div>
                <div>• Keyword Optimization Guidelines</div>
                <div>• Bid Management Strategies</div>
                <div>• Reporting & Analytics APIs</div>
                <div>• Rate Limiting & Error Handling</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};