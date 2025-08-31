import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardKPIs {
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  clicks: number;
  impressions: number;
  cpc: number;
  ctr: number;
  cvr: number;
  conversions: number;
  duration_ms?: number;
}

export interface DashboardTableRow {
  id: string;
  name: string;
  clicks: number;
  impressions: number;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  cpc: number;
  ctr: number;
  cvr: number;
  conversions: number;
}

export interface TimeseriesPoint {
  date: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
}

export type DashboardLevel = 'campaign' | 'ad_group' | 'target' | 'search_term' | 'placement';

export interface UseDashboardDataParams {
  profileId?: string;
  from?: string;
  to?: string;
  level?: DashboardLevel;
  entityId?: string;
  limit?: number;
}

export function useDashboardKPIs(params: UseDashboardDataParams) {
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!params.profileId || !params.from || !params.to || !user) return;

    async function fetchKPIs() {
      setLoading(true);
      setError(null);

      try {
        const { data: authData } = await supabase.auth.getSession();
        const token = authData.session?.access_token;

        if (!token) {
          throw new Error('No authentication token');
        }

        const url = new URL(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/dashboard/kpis`);
        url.searchParams.set('profileId', params.profileId);
        url.searchParams.set('from', params.from);
        url.searchParams.set('to', params.to);
        if (params.level) url.searchParams.set('level', params.level);

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch KPIs');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchKPIs();
  }, [params.profileId, params.from, params.to, params.level, user]);

  return { data, loading, error };
}

export function useDashboardTable(params: UseDashboardDataParams) {
  const [data, setData] = useState<{ rows: DashboardTableRow[]; duration_ms?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!params.profileId || !params.from || !params.to || !user) return;

    async function fetchTable() {
      setLoading(true);
      setError(null);

      try {
        const { data: authData } = await supabase.auth.getSession();
        const token = authData.session?.access_token;

        if (!token) {
          throw new Error('No authentication token');
        }

        const url = new URL(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/dashboard/table`);
        url.searchParams.set('profileId', params.profileId);
        url.searchParams.set('from', params.from);
        url.searchParams.set('to', params.to);
        if (params.level) url.searchParams.set('level', params.level);
        if (params.entityId) url.searchParams.set('entityId', params.entityId);
        if (params.limit) url.searchParams.set('limit', params.limit.toString());

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch table data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchTable();
  }, [params.profileId, params.from, params.to, params.level, params.entityId, params.limit, user]);

  return { data, loading, error };
}

export function useDashboardTimeseries(params: UseDashboardDataParams) {
  const [data, setData] = useState<{ points: TimeseriesPoint[]; duration_ms?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!params.profileId || !params.from || !params.to || !params.entityId || !user) return;

    async function fetchTimeseries() {
      setLoading(true);
      setError(null);

      try {
        const { data: authData } = await supabase.auth.getSession();
        const token = authData.session?.access_token;

        if (!token) {
          throw new Error('No authentication token');
        }

        const url = new URL(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/dashboard/timeseries`);
        url.searchParams.set('profileId', params.profileId);
        url.searchParams.set('from', params.from);
        url.searchParams.set('to', params.to);
        url.searchParams.set('entityId', params.entityId);
        if (params.level) url.searchParams.set('level', params.level);

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch timeseries data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchTimeseries();
  }, [params.profileId, params.from, params.to, params.entityId, params.level, user]);

  return { data, loading, error };
}