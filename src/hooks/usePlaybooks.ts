import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface PlaybookTemplate {
  key: string;
  name: string;
  description: string;
  defaultParams: any;
  requiredParams: string[];
}

export interface Playbook {
  id: string;
  user_id: string;
  name: string;
  description: string;
  template_key: string;
  params: any;
  mode: 'dry_run' | 'auto';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaybookRun {
  id: string;
  playbook_id: string;
  profile_id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed';
  steps: any;
  actions_enqueued: number;
  alerts_created: number;
  error: string | null;
}

export function usePlaybooks() {
  const [templates, setTemplates] = useState<PlaybookTemplate[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchPlaybooks();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('playbooks/templates', {
        method: 'GET',
      });

      if (error) throw error;

      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    }
  };

  const fetchPlaybooks = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('playbooks/list', {
        method: 'GET',
      });

      if (error) throw error;

      setPlaybooks(data.playbooks || []);
    } catch (err: any) {
      console.error('Error fetching playbooks:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch playbooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createPlaybook = async (playbookData: {
    name: string;
    description?: string;
    templateKey: string;
    params: any;
    mode?: 'dry_run' | 'auto';
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('playbooks/create', {
        method: 'POST',
        body: playbookData,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Playbook created successfully',
      });

      await fetchPlaybooks();
      return data.playbook;
    } catch (err: any) {
      console.error('Error creating playbook:', err);
      toast({
        title: 'Error',
        description: 'Failed to create playbook',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const runPlaybook = async (playbookId: string, profileId: string, mode: 'dry_run' | 'auto' = 'dry_run') => {
    try {
      const { data, error } = await supabase.functions.invoke('playbooks/run', {
        method: 'POST',
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Playbook ${mode === 'dry_run' ? 'simulated' : 'executed'} successfully`,
      });

      await fetchRuns(playbookId);
      return data;
    } catch (err: any) {
      console.error('Error running playbook:', err);
      toast({
        title: 'Error',
        description: 'Failed to run playbook',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const togglePlaybook = async (playbookId: string, enabled: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('playbooks/toggle', {
        method: 'POST',
        body: { playbookId, enabled },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Playbook ${enabled ? 'enabled' : 'disabled'}`,
      });

      await fetchPlaybooks();
      return data.playbook;
    } catch (err: any) {
      console.error('Error toggling playbook:', err);
      toast({
        title: 'Error',
        description: 'Failed to update playbook',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const fetchRuns = async (playbookId?: string) => {
    try {
      const url = playbookId ? `playbooks/runs?playbookId=${playbookId}` : 'playbooks/runs';
      const { data, error } = await supabase.functions.invoke(url, {
        method: 'GET',
      });

      if (error) throw error;

      setRuns(data.runs || []);
    } catch (err: any) {
      console.error('Error fetching runs:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch playbook runs',
        variant: 'destructive',
      });
    }
  };

  const deletePlaybook = async (playbookId: string) => {
    try {
      const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', playbookId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Playbook deleted successfully',
      });

      await fetchPlaybooks();
    } catch (err: any) {
      console.error('Error deleting playbook:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete playbook',
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    templates,
    playbooks,
    runs,
    loading,
    error,
    fetchPlaybooks,
    createPlaybook,
    runPlaybook,
    togglePlaybook,
    fetchRuns,
    deletePlaybook,
  };
}