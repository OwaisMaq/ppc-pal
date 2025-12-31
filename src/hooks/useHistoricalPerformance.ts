import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DailyPerformance {
  date: string;
  spend: number;
  sales: number;
  acos: number;
}

export interface PerformanceMilestone {
  date: string;
  type: 'first_optimization' | 'trust_80';
  label: string;
}

export interface HistoricalPerformanceResult {
  data: DailyPerformance[];
  milestones: PerformanceMilestone[];
  loading: boolean;
  error: string | null;
}

export const useHistoricalPerformance = (
  profileId: string | undefined,
  automatedOnly: boolean = false
): HistoricalPerformanceResult => {
  const [data, setData] = useState<DailyPerformance[]>([]);
  const [milestones, setMilestones] = useState<PerformanceMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // If automatedOnly, first get campaign IDs that have been optimized (have bid_states)
        let automatedCampaignIds: string[] | null = null;
        
        if (automatedOnly) {
          const { data: bidStatesData } = await supabase
            .from('bid_states')
            .select('campaign_id')
            .eq('profile_id', profileId)
            .not('campaign_id', 'is', null);
          
          automatedCampaignIds = [...new Set(
            (bidStatesData || [])
              .map((bs: any) => bs.campaign_id)
              .filter(Boolean)
          )];
          
          // If no automated campaigns, return empty data
          if (automatedCampaignIds.length === 0) {
            setData([]);
            setMilestones([]);
            setLoading(false);
            return;
          }
        }

        // Fetch historical performance data and milestones in parallel
        const [performanceRes, firstOptRes, trustRes] = await Promise.all([
          // Get daily aggregated performance
          supabase
            .from('campaign_performance_history')
            .select(`
              date,
              spend,
              sales,
              acos,
              campaign_id,
              campaigns!inner(profile_id, id)
            `)
            .eq('campaigns.profile_id', profileId)
            .eq('attribution_window', '14d')
            .order('date', { ascending: true }),
          
          // Get first optimization run date
          supabase
            .from('bid_optimizer_runs')
            .select('started_at')
            .eq('profile_id', profileId)
            .eq('status', 'completed')
            .order('started_at', { ascending: true })
            .limit(1),
          
          // Get when model first hit 80%+ confidence
          supabase
            .from('bid_states')
            .select('created_at, confidence_level, observations_count')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: true })
        ]);

        if (performanceRes.error) throw performanceRes.error;

        // Filter by automated campaigns if needed
        let filteredData = performanceRes.data || [];
        if (automatedOnly && automatedCampaignIds) {
          filteredData = filteredData.filter((row: any) => 
            automatedCampaignIds!.includes(row.campaign_id)
          );
        }

        // Aggregate by date
        const dateMap = new Map<string, { spend: number; sales: number }>();
        
        filteredData.forEach((row: any) => {
          const date = row.date;
          if (!dateMap.has(date)) {
            dateMap.set(date, { spend: 0, sales: 0 });
          }
          const existing = dateMap.get(date)!;
          existing.spend += row.spend || 0;
          existing.sales += row.sales || 0;
        });

        // Convert to array with calculated ACOS
        const performanceData: DailyPerformance[] = Array.from(dateMap.entries())
          .map(([date, values]) => ({
            date,
            spend: values.spend,
            sales: values.sales,
            acos: values.sales > 0 ? (values.spend / values.sales) * 100 : 0,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(performanceData);

        // Build milestones
        const milestonesArr: PerformanceMilestone[] = [];

        // First optimization milestone
        if (firstOptRes.data && firstOptRes.data.length > 0) {
          const firstOptDate = firstOptRes.data[0].started_at?.split('T')[0];
          if (firstOptDate) {
            milestonesArr.push({
              date: firstOptDate,
              type: 'first_optimization',
              label: 'First Optimization',
            });
          }
        }

        // Trust 80% milestone
        if (trustRes.data && trustRes.data.length > 0) {
          const highTrustRecord = trustRes.data.find(
            (r: any) => r.confidence_level === 'high' || (r.observations_count && r.observations_count >= 30)
          );
          if (highTrustRecord) {
            const trustDate = highTrustRecord.created_at?.split('T')[0];
            if (trustDate) {
              milestonesArr.push({
                date: trustDate,
                type: 'trust_80',
                label: '80% Model Trust',
              });
            }
          }
        }

        setMilestones(milestonesArr);
      } catch (err) {
        console.error('Error fetching historical performance:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileId, automatedOnly]);

  return { data, milestones, loading, error };
};
