
import { supabase } from '@/integrations/supabase/client';
import { getWeeklyDateRanges, formatDateForQuery } from '@/utils/weeklyDateUtils';

export const fetchWeeklyHistoricalData = async (campaignIds: string[]) => {
  const { today, last7DaysStart, previous7DaysStart, previous7DaysEnd } = getWeeklyDateRanges();

  // Fetch current week data
  const { data: currentWeekData } = await supabase
    .from('campaign_metrics_history')
    .select('*')
    .in('campaign_id', campaignIds)
    .gte('date', formatDateForQuery(last7DaysStart))
    .lte('date', formatDateForQuery(today));

  // Fetch previous week data
  const { data: previousWeekData } = await supabase
    .from('campaign_metrics_history')
    .select('*')
    .in('campaign_id', campaignIds)
    .gte('date', formatDateForQuery(previous7DaysStart))
    .lt('date', formatDateForQuery(previous7DaysEnd));

  return {
    currentWeekData: currentWeekData || [],
    previousWeekData: previousWeekData || []
  };
};
