import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocumentationSync } from "@/hooks/useDocumentationSync";
import { RefreshCw, Plus, ExternalLink, Clock, CheckCircle, AlertCircle, FileText, Code, GitBranch, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    toggleDocumentationSource,
    fetchOpenAPIDoc,
    analyzeCompliance
  } = useDocumentationSync();

  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [sourceType, setSourceType] = useState<'manual' | 'openapi' | 'github'>('manual');
  const [githubRepo, setGithubRepo] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocumentation();
    fetchSyncJobs();
  }, []);

  const handleAddSource = async () => {
    if (!newUrl.trim() || !newTitle.trim()) return;
    
    setIsAddingSource(true);
    try {
      await addDocumentationSource(
        newUrl.trim(), 
        newTitle.trim(), 
        sourceType,
        sourceType === 'github' ? githubRepo : undefined,
        sourceType === 'github' ? githubBranch : undefined
      );
      setNewUrl("");
      setNewTitle("");
      setGithubRepo("");
      setGithubBranch("main");
      setSourceType('manual');
      toast({
        title: "Documentation source added",
        description: "The documentation source has been successfully added.",
      });
    } catch (error) {
      toast({
        title: "Error adding source",
        description: "Failed to add the documentation source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleQuickAddOpenAPI = async (url: string, title: string) => {
    setIsAddingSource(true);
    try {
      await fetchOpenAPIDoc(url, title);
      toast({
        title: "OpenAPI documentation fetched",
        description: `${title} has been successfully added and analyzed.`,
      });
    } catch (error) {
      toast({
        title: "Error fetching OpenAPI",
        description: "Failed to fetch the OpenAPI documentation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingSource(false);
    }
  };

  const amazonOpenAPISpecs = [
    {
      title: "Amazon Ads API - Sponsored Products",
      url: "https://advertising.amazon.com/API/docs/en-us/sponsored-products/3-0/openapi/prod",
      description: "Complete OpenAPI specification for Sponsored Products API v3.0"
    },
    {
      title: "Amazon Ads API - Sponsored Products v2",
      url: "https://advertising.amazon.com/API/docs/en-us/sponsored-products/2-0/openapi",
      description: "Legacy OpenAPI specification for Sponsored Products API v2.0"
    }
  ];

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
            onClick={() => triggerSync(true)} 
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
                          <div className="flex items-center gap-2">
                            {doc.source_type_enum === 'openapi' && <Code className="h-4 w-4 text-blue-500" />}
                            {doc.source_type_enum === 'github' && <GitBranch className="h-4 w-4 text-purple-500" />}
                            {doc.source_type_enum === 'manual' && <FileText className="h-4 w-4 text-gray-500" />}
                            <h4 className="font-medium">{doc.title}</h4>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.source_type_enum || 'manual'}
                            </Badge>
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{doc.url}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>Last scraped: {formatDistanceToNow(new Date(doc.last_scraped_at))} ago</span>
                          <span>Content: {doc.content.length.toLocaleString()} characters</span>
                          {doc.version_hash && (
                            <span>Version: {doc.version_hash.substring(0, 8)}</span>
                          )}
                        </div>
                        
                        {/* OpenAPI-specific metadata */}
                        {doc.api_spec_data && (
                          <div className="mt-2 p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Code className="h-3 w-3" />
                              <span className="text-xs font-medium">OpenAPI Specification</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <span>Version: {doc.api_spec_data.info?.version || 'Unknown'}</span>
                              <span>Paths: {Object.keys(doc.api_spec_data.paths || {}).length}</span>
                            </div>
                            {doc.last_analysis_at && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Last analyzed: {formatDistanceToNow(new Date(doc.last_analysis_at))} ago
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => analyzeCompliance(undefined, 'full')}
                                  className="h-6 px-2 text-xs"
                                >
                                  Re-analyze
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* GitHub-specific metadata */}
                        {doc.source_type_enum === 'github' && doc.github_repo && (
                          <div className="mt-2 p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <GitBranch className="h-3 w-3" />
                              <span className="text-xs font-medium">GitHub Repository</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span>Repo: {doc.github_repo}</span>
                              <span className="ml-2">Branch: {doc.github_branch || 'main'}</span>
                            </div>
                          </div>
                        )}
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
          
          <TabsContent value="add-source" className="space-y-6">
            {/* Quick Add Amazon OpenAPI Specs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Quick Add: Amazon Ads OpenAPI Specifications</h4>
              </div>
              <div className="grid gap-3">
                {amazonOpenAPISpecs.map((spec, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{spec.title}</h5>
                        <p className="text-xs text-muted-foreground mt-1">{spec.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{spec.url}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickAddOpenAPI(spec.url, spec.title)}
                        disabled={isAddingSource}
                        className="ml-2"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Add & Analyze
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Manual Add Form */}
            <div className="space-y-4">
              <h4 className="font-medium">Add Custom Documentation Source</h4>
              
              <div className="space-y-2">
                <Label htmlFor="source-type">Source Type</Label>
                <Select value={sourceType} onValueChange={(value: 'manual' | 'openapi' | 'github') => setSourceType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Manual Documentation
                      </div>
                    </SelectItem>
                    <SelectItem value="openapi">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        OpenAPI Specification
                      </div>
                    </SelectItem>
                    <SelectItem value="github">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        GitHub Repository
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="url">
                  {sourceType === 'github' ? 'GitHub Repository URL' : 'Documentation URL'}
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder={
                    sourceType === 'openapi' 
                      ? "https://advertising.amazon.com/API/docs/.../openapi" 
                      : sourceType === 'github'
                      ? "https://github.com/owner/repo"
                      : "https://advertising.amazon.com/API/docs/..."
                  }
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>

              {sourceType === 'github' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="github-repo">Repository (owner/repo)</Label>
                    <Input
                      id="github-repo"
                      placeholder="amazon-advertising/api-docs"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github-branch">Branch</Label>
                    <Input
                      id="github-branch"
                      placeholder="main"
                      value={githubBranch}
                      onChange={(e) => setGithubBranch(e.target.value)}
                    />
                  </div>
                </>
              )}

              <Button 
                onClick={handleAddSource}
                disabled={!newUrl.trim() || !newTitle.trim() || isAddingSource}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingSource ? 'Adding...' : 'Add Documentation Source'}
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