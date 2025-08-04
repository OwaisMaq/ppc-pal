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

  const triggerSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-documentation');
      
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

  const addDocumentationSource = async (url: string, title: string) => {
    try {
      const { error } = await supabase
        .from('documentation_sources')
        .insert({
          url,
          title,
          content: 'Pending sync...',
          version_hash: 'pending'
        });

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
    toggleDocumentationSource
  };
};