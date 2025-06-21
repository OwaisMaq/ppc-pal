
import { supabase } from '@/integrations/supabase/client';

export const amazonConnectionService = {
  async fetchConnections() {
    console.log('Fetching Amazon connections...');
    
    const { data, error } = await supabase
      .from('amazon_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      throw error;
    }
    
    console.log('Fetched connections:', data?.length || 0, 'connections');
    return data || [];
  },

  async deleteConnection(connectionId: string) {
    const { error } = await supabase
      .from('amazon_connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  },

  async initiateOAuth(redirectUri: string) {
    console.log('Starting Amazon OAuth flow with redirect URI:', redirectUri);
    
    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
      throw new Error('No valid session found');
    }

    console.log('Session validated, calling edge function...');

    const { data, error } = await supabase.functions.invoke('amazon-oauth', {
      body: { action: 'initiate', redirectUri },
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    
    console.log('OAuth URL generated successfully');
    console.log('Redirecting to Amazon...');
    
    return data.authUrl;
  },

  async handleOAuthCallback(code: string, state: string, redirectUri: string) {
    console.log('Processing OAuth callback...');
    console.log('Code length:', code.length);
    console.log('State:', state);

    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
      throw new Error('No valid session found');
    }

    console.log('Session validated, calling callback edge function...');

    const { data, error } = await supabase.functions.invoke('amazon-oauth', {
      body: { 
        action: 'callback', 
        code, 
        state,
        redirectUri
      },
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
    });

    if (error) {
      console.error('Callback edge function error:', error);
      throw error;
    }
    
    console.log('Callback processed successfully:', data);
    return data;
  },

  async syncConnection(connectionId: string) {
    console.log('Starting data sync for connection:', connectionId);
    
    const { error } = await supabase.functions.invoke('sync-amazon-data', {
      body: { connectionId },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (error) throw error;
  }
};
