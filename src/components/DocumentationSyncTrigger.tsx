import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  processed?: number;
  updated?: number;
  failed?: number;
  error?: string;
}

export const DocumentationSyncTrigger = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const triggerSync = async () => {
    setIsLoading(true);
    setSyncResult(null);
    setAnalysisResult(null);

    try {
      console.log('Triggering documentation sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-documentation', {
        body: {}
      });

      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      console.log('Sync result:', data);
      setSyncResult(data);

      if (data?.success) {
        toast.success(`Documentation sync completed! ${data.updated || 0} sources updated`);
        
        // Wait a moment then analyze the content
        setTimeout(() => analyzeContent(), 2000);
      } else {
        toast.error('Documentation sync failed');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      setSyncResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to trigger documentation sync');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeContent = async () => {
    try {
      console.log('Analyzing scraped content...');
      
      // Get all documentation sources with their content
      const { data: sources, error } = await supabase
        .from('documentation_sources')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!sources || sources.length === 0) {
        setAnalysisResult('No documentation sources found to analyze.');
        return;
      }

      // Analyze the content for key API insights
      const insights = analyzeDocumentationContent(sources);
      setAnalysisResult(insights);
      
    } catch (error) {
      console.error('Error analyzing content:', error);
      setAnalysisResult('Error occurred while analyzing content');
    }
  };

  const analyzeDocumentationContent = (sources: any[]) => {
    let analysis = '## Amazon Ads API Documentation Analysis\n\n';
    
    const totalSources = sources.length;
    const sourcesWithContent = sources.filter(s => s.content && s.content.length > 100);
    const averageContentLength = sourcesWithContent.reduce((sum, s) => sum + s.content.length, 0) / sourcesWithContent.length;

    analysis += `**Sources Overview:**\n`;
    analysis += `- Total Sources: ${totalSources}\n`;
    analysis += `- Sources with Substantial Content: ${sourcesWithContent.length}\n`;
    analysis += `- Average Content Length: ${Math.round(averageContentLength)} characters\n\n`;

    // Look for key API concepts in the content
    const keyTopics = [
      'rate limiting', 'rate limit', 'throttling',
      'authentication', 'oauth', 'access token',
      'pagination', 'limit', 'offset',
      'error handling', 'error code', 'http status',
      'versioning', 'version', 'compatibility',
      'endpoints', 'api endpoint', 'url',
      'reporting api', 'sponsored products', 'campaigns'
    ];

    const topicFindings: Record<string, string[]> = {};
    
    sourcesWithContent.forEach(source => {
      const content = source.content.toLowerCase();
      keyTopics.forEach(topic => {
        if (content.includes(topic)) {
          if (!topicFindings[topic]) topicFindings[topic] = [];
          topicFindings[topic].push(source.title);
        }
      });
    });

    analysis += `**Key Topics Found:**\n`;
    Object.entries(topicFindings).forEach(([topic, sources]) => {
      if (sources.length > 0) {
        analysis += `- **${topic}**: Found in ${sources.length} source(s)\n`;
      }
    });

    analysis += `\n**Potential Integration Issues to Address:**\n`;
    
    // Check for version inconsistencies
    const v2Sources = sourcesWithContent.filter(s => s.content.includes('2.0') || s.content.includes('v2'));
    const v3Sources = sourcesWithContent.filter(s => s.content.includes('3.0') || s.content.includes('v3'));
    
    if (v2Sources.length > 0 && v3Sources.length > 0) {
      analysis += `- **Version Mixing**: Found both v2.0 (${v2Sources.length} sources) and v3.0 (${v3Sources.length} sources) references - ensure consistent API version usage\n`;
    }

    // Check for rate limiting documentation
    const rateLimitSources = sourcesWithContent.filter(s => 
      s.content.toLowerCase().includes('rate limit') || 
      s.content.toLowerCase().includes('throttling')
    );
    
    if (rateLimitSources.length > 0) {
      analysis += `- **Rate Limiting**: Found rate limiting documentation in ${rateLimitSources.length} source(s) - review current implementation\n`;
    }

    // Check for error handling patterns
    const errorSources = sourcesWithContent.filter(s => 
      s.content.toLowerCase().includes('error') || 
      s.content.toLowerCase().includes('http status')
    );
    
    if (errorSources.length > 0) {
      analysis += `- **Error Handling**: Found error handling documentation in ${errorSources.length} source(s) - validate current error handling\n`;
    }

    analysis += `\n**Next Steps:**\n`;
    analysis += `1. Review version consistency across all API calls\n`;
    analysis += `2. Implement proper rate limiting based on official guidelines\n`;
    analysis += `3. Enhance error handling for all documented error scenarios\n`;
    analysis += `4. Update API endpoints to match official documentation\n`;

    return analysis;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Documentation Sync & Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={triggerSync} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing Documentation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Trigger Documentation Sync
            </>
          )}
        </Button>

        {syncResult && (
          <Alert className={syncResult.success ? "border-green-500" : "border-red-500"}>
            {syncResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription>
              {syncResult.success ? (
                <div>
                  <p className="font-medium">Sync completed successfully!</p>
                  {syncResult.processed && (
                    <p className="text-sm mt-1">
                      Processed: {syncResult.processed}, Updated: {syncResult.updated || 0}, Failed: {syncResult.failed || 0}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium">Sync failed</p>
                  {syncResult.error && (
                    <p className="text-sm mt-1">{syncResult.error}</p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
                {analysisResult}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};