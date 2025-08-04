import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentationSource {
  id: string;
  url: string;
  title: string;
  content: string;
  last_scraped_at: string;
  version_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source_type_enum: 'manual' | 'openapi' | 'github' | 'rss' | 'crawler';
  api_spec_data?: any;
  github_repo?: string;
  github_branch?: string;
  parsing_config?: any;
  last_analysis_at?: string;
  analysis_results?: any;
  content_type?: string;
}

export interface SyncJob {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  sources_processed: number;
  sources_updated: number;
  sources_failed: number;
  error_details?: any;
}

export const useDocumentationSync = () => {
  const [documentation, setDocumentation] = useState<DocumentationSource[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchDocumentation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documentation_sources')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDocumentation(data || []);
    } catch (error) {
      console.error('Error fetching documentation:', error);
      toast.error('Failed to fetch documentation sources');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('documentation_sync_jobs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncJobs(data || []);
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
    }
  };

  const triggerSync = async (useEnhanced = true) => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const functionName = useEnhanced ? 'enhanced-documentation-sync' : 'sync-documentation';
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(
          `Documentation sync completed! ${data.updated} sources updated, ${data.processed} processed`
        );
        
        // Refresh data after sync
        await Promise.all([fetchDocumentation(), fetchSyncJobs()]);
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast.error('Failed to sync documentation');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchOpenAPIDoc = async (url: string, title: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-openapi-docs', {
        body: {
          url,
          title,
          sourceType: 'openapi'
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('OpenAPI documentation fetched successfully!');
        await fetchDocumentation();
        return data.sourceId;
      } else {
        throw new Error(data?.error || 'Failed to fetch OpenAPI documentation');
      }
    } catch (error) {
      console.error('Error fetching OpenAPI doc:', error);
      toast.error('Failed to fetch OpenAPI documentation');
      return null;
    }
  };

  const analyzeCompliance = async (
    connectionId?: string, 
    analysisType: 'full' | 'authentication' | 'error_handling' | 'rate_limiting' = 'full'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-api-compliance', {
        body: {
          connectionId,
          analysisType
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Compliance analysis completed! Score: ${(data.complianceScore * 100).toFixed(1)}%`);
        return data;
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing compliance:', error);
      toast.error('Failed to analyze API compliance');
      return null;
    }
  };

  const addDocumentationSource = async (
    url: string, 
    title: string, 
    sourceType: 'manual' | 'openapi' | 'github' = 'manual',
    githubRepo?: string,
    githubBranch: string = 'main'
  ) => {
    try {
      const insertData: any = {
        url,
        title,
        content: 'Pending sync...',
        version_hash: 'pending',
        source_type_enum: sourceType
      };

      if (sourceType === 'github') {
        insertData.github_repo = githubRepo;
        insertData.github_branch = githubBranch;
      }

      const { error } = await supabase
        .from('documentation_sources')
        .insert(insertData);

      if (error) throw error;
      
      toast.success('Documentation source added successfully');
      await fetchDocumentation();
    } catch (error) {
      console.error('Error adding documentation source:', error);
      toast.error('Failed to add documentation source');
    }
  };

  const toggleDocumentationSource = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('documentation_sources')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Documentation source ${isActive ? 'enabled' : 'disabled'}`);
      await fetchDocumentation();
    } catch (error) {
      console.error('Error updating documentation source:', error);
      toast.error('Failed to update documentation source');
    }
  };

  return {
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
  };
};