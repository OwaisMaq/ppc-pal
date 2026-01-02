import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnomalyDetectionRequest {
  profileId?: string;
  scope?: 'campaign' | 'ad_group' | 'account';
  window?: 'intraday' | 'daily';
  trigger?: 'manual' | 'scheduled';
}

interface MetricData {
  entity_id: string;
  metric: string;
  value: number;
  ts: string;
}

interface BaselineData {
  median: number;
  mad: number;
}

interface UserSettings {
  enabled: boolean;
  intraday_enabled: boolean;
  daily_enabled: boolean;
  warn_threshold: number;
  critical_threshold: number;
  metric_thresholds: Record<string, { warn: number; critical: number }>;
  intraday_cooldown_hours: number;
  daily_cooldown_hours: number;
  notify_on_warn: boolean;
  notify_on_critical: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  intraday_enabled: true,
  daily_enabled: true,
  warn_threshold: 3.0,
  critical_threshold: 5.0,
  metric_thresholds: {},
  intraday_cooldown_hours: 6,
  daily_cooldown_hours: 48,
  notify_on_warn: false,
  notify_on_critical: true,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Anomalies runner started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse params from URL or body
    let profileId: string | null = null;
    let scope: 'campaign' | 'ad_group' | 'account' = 'campaign';
    let window: 'intraday' | 'daily' = 'intraday';
    let trigger: 'manual' | 'scheduled' = 'manual';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      profileId = url.searchParams.get('profileId');
      scope = url.searchParams.get('scope') as typeof scope || 'campaign';
      window = url.searchParams.get('window') as typeof window || 'intraday';
      trigger = url.searchParams.get('trigger') as typeof trigger || 'manual';
    } else {
      try {
        const body = await req.json();
        profileId = body.profileId || null;
        scope = body.scope || 'campaign';
        window = body.window || 'intraday';
        trigger = body.trigger || 'scheduled';
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    console.log(`[${requestId}] Processing anomaly detection: profileId=${profileId}, scope=${scope}, window=${window}, trigger=${trigger}`);

    // Start run tracking
    const runData = {
      profile_id: profileId || 'all',
      scope,
      time_window: window,
      started_at: new Date().toISOString(),
    };

    const { data: run, error: runError } = await supabase
      .from('anomaly_runs')
      .insert(runData)
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create anomaly run: ${runError.message}`);
    }

    let totalChecked = 0;
    let totalAnomalies = 0;
    let profilesSkipped = 0;

    // Get active profiles to check
    let profilesQuery = supabase.from('amazon_connections').select('profile_id, user_id');
    if (profileId) {
      profilesQuery = profilesQuery.eq('profile_id', profileId);
    }
    profilesQuery = profilesQuery.eq('status', 'active');

    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const profileList = profiles || [];
    console.log(`[${requestId}] Found ${profileList.length} profiles to check`);

    for (const profile of profileList) {
      try {
        // Fetch user settings for this profile
        const userSettings = await getUserSettings(supabase, profile.user_id, profile.profile_id);
        
        // Check if detection is enabled for this window type
        if (!userSettings.enabled) {
          console.log(`[${requestId}] Skipping profile ${profile.profile_id}: detection disabled`);
          profilesSkipped++;
          continue;
        }
        
        if (window === 'intraday' && !userSettings.intraday_enabled) {
          console.log(`[${requestId}] Skipping profile ${profile.profile_id}: intraday detection disabled`);
          profilesSkipped++;
          continue;
        }
        
        if (window === 'daily' && !userSettings.daily_enabled) {
          console.log(`[${requestId}] Skipping profile ${profile.profile_id}: daily detection disabled`);
          profilesSkipped++;
          continue;
        }

        const anomalies = await detectAnomaliesForProfile(
          supabase, 
          profile.profile_id, 
          profile.user_id,
          scope, 
          window, 
          userSettings,
          requestId
        );
        totalChecked += anomalies.checked;
        totalAnomalies += anomalies.found;

        // Create alerts for warn/critical anomalies based on user notification settings
        for (const anomaly of anomalies.detected) {
          const shouldNotify = 
            (anomaly.severity === 'critical' && userSettings.notify_on_critical) ||
            (anomaly.severity === 'warn' && userSettings.notify_on_warn);
          
          if (anomaly.severity === 'warn' || anomaly.severity === 'critical') {
            await createAnomalyAlert(supabase, anomaly, profile.profile_id, shouldNotify);
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Error processing profile ${profile.profile_id}:`, error);
      }
    }

    // Update run status
    await supabase
      .from('anomaly_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        checked: totalChecked,
        anomalies_found: totalAnomalies,
      })
      .eq('id', run.id);

    console.log(`[${requestId}] Anomaly detection completed: checked=${totalChecked}, found=${totalAnomalies}, skipped=${profilesSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        runId: run.id,
        profilesChecked: profileList.length - profilesSkipped,
        profilesSkipped,
        totalChecked,
        anomaliesFound: totalAnomalies,
        requestId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Anomaly detection error:`, error);
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getUserSettings(
  supabase: any,
  userId: string,
  profileId: string
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('anomaly_detection_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.warn(`Failed to fetch user settings for ${profileId}: ${error.message}`);
    return DEFAULT_SETTINGS;
  }

  if (!data) {
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
    intraday_enabled: data.intraday_enabled ?? DEFAULT_SETTINGS.intraday_enabled,
    daily_enabled: data.daily_enabled ?? DEFAULT_SETTINGS.daily_enabled,
    warn_threshold: data.warn_threshold ?? DEFAULT_SETTINGS.warn_threshold,
    critical_threshold: data.critical_threshold ?? DEFAULT_SETTINGS.critical_threshold,
    metric_thresholds: data.metric_thresholds ?? DEFAULT_SETTINGS.metric_thresholds,
    intraday_cooldown_hours: data.intraday_cooldown_hours ?? DEFAULT_SETTINGS.intraday_cooldown_hours,
    daily_cooldown_hours: data.daily_cooldown_hours ?? DEFAULT_SETTINGS.daily_cooldown_hours,
    notify_on_warn: data.notify_on_warn ?? DEFAULT_SETTINGS.notify_on_warn,
    notify_on_critical: data.notify_on_critical ?? DEFAULT_SETTINGS.notify_on_critical,
  };
}

function getSeverityFromZScore(
  zScore: number, 
  metric: string, 
  settings: UserSettings
): string {
  const absZ = Math.abs(zScore);
  
  // Check for metric-specific thresholds
  const metricThresholds = settings.metric_thresholds?.[metric];
  const warnThreshold = metricThresholds?.warn ?? settings.warn_threshold;
  const criticalThreshold = metricThresholds?.critical ?? settings.critical_threshold;
  
  if (absZ >= criticalThreshold) return 'critical';
  if (absZ >= warnThreshold) return 'warn';
  return 'info';
}

async function detectAnomaliesForProfile(
  supabase: any,
  profileId: string,
  userId: string,
  scope: string,
  window: string,
  settings: UserSettings,
  requestId: string
) {
  console.log(`[${requestId}] Detecting anomalies for profile ${profileId}, scope ${scope}, window ${window}`);

  const metrics = ['spend', 'sales', 'acos', 'cvr', 'ctr', 'cpc', 'impressions'];
  let checked = 0;
  let found = 0;
  const detected: any[] = [];

  // Get cooldown hours from user settings
  const cooldownHours = window === 'intraday' 
    ? settings.intraday_cooldown_hours 
    : settings.daily_cooldown_hours;

  for (const metric of metrics) {
    try {
      // Get current data points
      const currentData = await getCurrentMetricData(supabase, profileId, scope, metric, window);
      if (!currentData || currentData.length === 0) continue;

      for (const dataPoint of currentData) {
        checked++;

        // Get baseline for this entity/metric
        const baseline = await getBaseline(supabase, profileId, scope, dataPoint.entity_id, metric, window, dataPoint.ts);
        if (!baseline) continue;

        // Calculate robust z-score
        const { data: zScoreData } = await supabase.rpc('calculate_robust_z_score', {
          p_value: dataPoint.value,
          p_median: baseline.median,
          p_mad: baseline.mad,
        });

        const zScore = zScoreData || 0;
        
        // Use user-configurable thresholds for severity
        const severity = getSeverityFromZScore(zScore, metric, settings);

        // Only flag significant anomalies and relevant directions
        const shouldFlag = shouldFlagAnomaly(metric, dataPoint.value, baseline.median, severity);
        if (!shouldFlag) continue;

        // Generate fingerprint for deduplication
        const bucket = window === 'intraday' 
          ? new Date(dataPoint.ts).toISOString().slice(0, 13) + ':00:00.000Z' // hour bucket
          : new Date(dataPoint.ts).toISOString().slice(0, 10); // date bucket

        const { data: fingerprint } = await supabase.rpc('generate_anomaly_fingerprint', {
          p_profile_id: profileId,
          p_scope: scope,
          p_entity_id: dataPoint.entity_id,
          p_metric: metric,
          p_time_window: window,
          p_bucket: bucket,
        });

        // Check for recent anomalies with same fingerprint using user's cooldown
        const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

        const { data: existingAnomalies } = await supabase
          .from('anomalies')
          .select('severity')
          .eq('fingerprint', fingerprint)
          .gte('created_at', cooldownTime)
          .order('created_at', { ascending: false })
          .limit(1);

        // Skip if recent anomaly exists and severity didn't increase
        if (existingAnomalies && existingAnomalies.length > 0) {
          const existingSeverity = existingAnomalies[0].severity;
          const severityLevels: Record<string, number> = { info: 1, warn: 2, critical: 3 };
          if (severityLevels[severity] <= severityLevels[existingSeverity]) {
            continue;
          }
        }

        // Create anomaly record
        const anomaly = {
          profile_id: profileId,
          scope,
          entity_id: dataPoint.entity_id,
          metric,
          time_window: window,
          ts: dataPoint.ts,
          value: dataPoint.value,
          baseline: baseline.median,
          score: zScore,
          direction: dataPoint.value > baseline.median ? 'spike' : 'dip',
          severity,
          fingerprint,
          state: 'new',
        };

        const { error: insertError } = await supabase
          .from('anomalies')
          .upsert(anomaly, { onConflict: 'fingerprint,ts' });

        if (!insertError) {
          detected.push(anomaly);
          found++;
          console.log(`[${requestId}] Anomaly detected: ${metric} ${anomaly.direction} (${severity}) for ${scope} ${dataPoint.entity_id}`);
        }
      }
    } catch (error) {
      console.error(`[${requestId}] Error processing metric ${metric}:`, error);
    }
  }

  return { checked, found, detected };
}

async function getCurrentMetricData(
  supabase: any,
  profileId: string,
  scope: string,
  metric: string,
  window: string
): Promise<MetricData[]> {
  
  if (window === 'intraday') {
    // Get hourly AMS data for today
    const today = new Date().toISOString().slice(0, 10);
    const { data: trafficData } = await supabase
      .from('ams_messages_sp_traffic')
      .select('campaign_id, ad_group_id, cost, clicks, impressions, hour_start')
      .eq('profile_id', profileId)
      .gte('hour_start', today + 'T00:00:00.000Z')
      .lt('hour_start', today + 'T23:59:59.999Z');

    const { data: conversionData } = await supabase
      .from('ams_messages_sp_conversion')
      .select('campaign_id, ad_group_id, attributed_sales, attributed_conversions, hour_start')
      .eq('profile_id', profileId)
      .gte('hour_start', today + 'T00:00:00.000Z')
      .lt('hour_start', today + 'T23:59:59.999Z');

    // Aggregate by hour and entity
    return aggregateHourlyData(trafficData || [], conversionData || [], scope, metric);
  } else {
    // Get daily data from v3 facts for yesterday/today
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    if (scope === 'campaign') {
      const { data } = await supabase
        .from('v_campaign_daily')
        .select('campaign_id, cost_micros, sales_7d_micros, conv_7d, clicks, impressions, date')
        .eq('profile_id', profileId)
        .in('date', [yesterday, today]);

      return (data || []).map((row: any) => ({
        entity_id: row.campaign_id,
        metric,
        value: calculateMetricValue(row, metric),
        ts: row.date + 'T23:59:59.999Z',
      })).filter((item: any) => item.value !== null);
    }
    
    // For ad_group scope, would need similar logic with ad group data
    return [];
  }
}

function aggregateHourlyData(trafficData: any[], conversionData: any[], scope: string, metric: string): MetricData[] {
  const hourlyAgg = new Map();

  // Aggregate traffic data
  trafficData.forEach(row => {
    const entityId = scope === 'campaign' ? row.campaign_id : row.ad_group_id;
    const hour = row.hour_start.slice(0, 13) + ':00:00.000Z';
    const key = `${entityId}|${hour}`;

    if (!hourlyAgg.has(key)) {
      hourlyAgg.set(key, {
        entity_id: entityId,
        hour,
        cost: 0,
        clicks: 0,
        impressions: 0,
        sales: 0,
        conversions: 0,
      });
    }

    const agg = hourlyAgg.get(key);
    agg.cost += row.cost || 0;
    agg.clicks += row.clicks || 0;
    agg.impressions += row.impressions || 0;
  });

  // Aggregate conversion data
  conversionData.forEach(row => {
    const entityId = scope === 'campaign' ? row.campaign_id : row.ad_group_id;
    const hour = row.hour_start.slice(0, 13) + ':00:00.000Z';
    const key = `${entityId}|${hour}`;

    if (!hourlyAgg.has(key)) {
      hourlyAgg.set(key, {
        entity_id: entityId,
        hour,
        cost: 0,
        clicks: 0,
        impressions: 0,
        sales: 0,
        conversions: 0,
      });
    }

    const agg = hourlyAgg.get(key);
    agg.sales += row.attributed_sales || 0;
    agg.conversions += row.attributed_conversions || 0;
  });

  // Convert to metric data points
  return Array.from(hourlyAgg.values()).map(agg => ({
    entity_id: agg.entity_id,
    metric,
    value: calculateMetricValue(agg, metric),
    ts: agg.hour,
  })).filter(item => item.value !== null);
}

function calculateMetricValue(data: any, metric: string): number | null {
  switch (metric) {
    case 'spend':
      return (data.cost_micros || data.cost || 0) / (data.cost_micros ? 1000000 : 1);
    case 'sales':
      return (data.sales_7d_micros || data.sales || 0) / (data.sales_7d_micros ? 1000000 : 1);
    case 'acos':
      const spend = (data.cost_micros || data.cost || 0) / (data.cost_micros ? 1000000 : 1);
      const sales = (data.sales_7d_micros || data.sales || 0) / (data.sales_7d_micros ? 1000000 : 1);
      return sales > 0 ? (spend / sales) * 100 : null;
    case 'cvr':
      return data.clicks > 0 ? ((data.conv_7d || data.conversions || 0) / data.clicks) * 100 : null;
    case 'ctr':
      return data.impressions > 0 ? (data.clicks / data.impressions) * 100 : null;
    case 'cpc':
      const cpcSpend = (data.cost_micros || data.cost || 0) / (data.cost_micros ? 1000000 : 1);
      return data.clicks > 0 ? cpcSpend / data.clicks : null;
    case 'impressions':
      return data.impressions || 0;
    default:
      return null;
  }
}

async function getBaseline(
  supabase: any,
  profileId: string,
  scope: string,
  entityId: string,
  metric: string,
  window: string,
  currentTs: string
): Promise<BaselineData | null> {
  
  const currentDate = new Date(currentTs);
  const daysBack = 28;
  const startDate = new Date(currentDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

  if (window === 'intraday') {
    // Get same hour-of-week for last 28 days
    const currentHour = currentDate.getUTCHours();
    const currentDayOfWeek = currentDate.getUTCDay();

    // Build array of historical same-hour timestamps
    const historicalHours: string[] = [];
    for (let i = 7; i <= daysBack; i += 7) {
      const histDate = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000);
      if (histDate.getUTCDay() === currentDayOfWeek) {
        const histHour = new Date(histDate.getFullYear(), histDate.getMonth(), histDate.getDate(), currentHour);
        historicalHours.push(histHour.toISOString().slice(0, 13) + ':00:00.000Z');
      }
    }

    if (historicalHours.length === 0) return null;

    // Query AMS data for these hours
    const { data: trafficData } = await supabase
      .from('ams_messages_sp_traffic')
      .select('cost, clicks, impressions')
      .eq('profile_id', profileId)
      .eq(scope === 'campaign' ? 'campaign_id' : 'ad_group_id', entityId)
      .in('hour_start', historicalHours);

    const { data: conversionData } = await supabase
      .from('ams_messages_sp_conversion')
      .select('attributed_sales, attributed_conversions')
      .eq('profile_id', profileId)
      .eq(scope === 'campaign' ? 'campaign_id' : 'ad_group_id', entityId)
      .in('hour_start', historicalHours);

    // Combine and calculate metric values
    const values = historicalHours.map(hour => {
      const traffic = trafficData?.find((t: any) => t.hour_start === hour) || {};
      const conversion = conversionData?.find((c: any) => c.hour_start === hour) || {};
      const combined = { ...traffic, sales: conversion.attributed_sales || 0, conversions: conversion.attributed_conversions || 0 };
      return calculateMetricValue(combined, metric);
    }).filter((v): v is number => v !== null);

    return calculateBaselineStats(values);

  } else {
    // Daily baseline - get last 28 days excluding today
    const endDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000); // yesterday
    
    if (scope === 'campaign') {
      const { data } = await supabase
        .from('v_campaign_daily')
        .select('cost_micros, sales_7d_micros, conv_7d, clicks, impressions')
        .eq('profile_id', profileId)
        .eq('campaign_id', entityId)
        .gte('date', startDate.toISOString().slice(0, 10))
        .lte('date', endDate.toISOString().slice(0, 10));

      const values = (data || []).map((row: any) => calculateMetricValue(row, metric)).filter((v: any): v is number => v !== null);
      return calculateBaselineStats(values);
    }

    return null;
  }
}

function calculateBaselineStats(values: number[]): BaselineData | null {
  if (values.length < 3) return null; // Need minimum data points

  // Calculate median
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Calculate MAD (Median Absolute Deviation)
  const deviations = values.map(v => Math.abs(v - median));
  const sortedDeviations = deviations.sort((a, b) => a - b);
  const mad = sortedDeviations.length % 2 === 0
    ? (sortedDeviations[sortedDeviations.length / 2 - 1] + sortedDeviations[sortedDeviations.length / 2]) / 2
    : sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  return { median, mad };
}

function shouldFlagAnomaly(metric: string, value: number, baseline: number, severity: string): boolean {
  if (severity === 'info') return false;

  const isSpike = value > baseline;
  
  // Define which directions to flag for each metric
  const flagRules: Record<string, boolean> = {
    spend: isSpike, // Flag spend spikes
    sales: !isSpike, // Flag sales dips
    acos: isSpike, // Flag ACOS spikes
    cvr: !isSpike, // Flag CVR drops
    ctr: !isSpike, // Flag CTR drops
    cpc: isSpike, // Flag CPC spikes
    impressions: !isSpike, // Flag impression dips
  };

  return flagRules[metric] || false;
}

async function createAnomalyAlert(
  supabase: any, 
  anomaly: any, 
  profileId: string,
  shouldNotify: boolean
) {
  try {
    // Find user for this profile
    const { data: connection } = await supabase
      .from('amazon_connections')
      .select('user_id')
      .eq('profile_id', profileId)
      .single();

    if (!connection) return;

    // Check if user has existing automation rules to link to
    const { data: existingRules } = await supabase
      .from('automation_rules')
      .select('id')
      .eq('user_id', connection.user_id)
      .eq('profile_id', profileId)
      .limit(1);

    const ruleId = existingRules?.[0]?.id || null;

    // Create alert
    const alert = {
      rule_id: ruleId, // May be null for anomaly alerts
      profile_id: profileId,
      entity_type: anomaly.scope,
      entity_id: anomaly.entity_id,
      title: `${anomaly.metric.toUpperCase()} ${anomaly.direction} detected`,
      message: `${anomaly.scope} ${anomaly.entity_id} shows ${anomaly.metric} ${anomaly.direction} of ${anomaly.value.toFixed(2)} vs baseline ${anomaly.baseline.toFixed(2)} (z-score: ${anomaly.score.toFixed(2)})`,
      level: anomaly.severity,
      state: 'new',
      data: {
        anomaly_id: null,
        metric: anomaly.metric,
        value: anomaly.value,
        baseline: anomaly.baseline,
        score: anomaly.score,
        direction: anomaly.direction,
      },
    };

    await supabase.from('alerts').insert(alert);

    // Only queue notifications if user has opted in for this severity level
    if (!shouldNotify) return;

    // Queue notification if user has preferences
    const { data: userPrefs } = await supabase
      .from('user_prefs')
      .select('*')
      .eq('user_id', connection.user_id)
      .single();

    if (userPrefs && (userPrefs.slack_webhook || userPrefs.email)) {
      const notificationChannels: string[] = [];
      if (userPrefs.slack_webhook) notificationChannels.push('slack');
      if (userPrefs.email) notificationChannels.push('email');

      for (const channel of notificationChannels) {
        const notification = {
          user_id: connection.user_id,
          channel,
          subject: `${anomaly.severity.toUpperCase()}: ${anomaly.metric.toUpperCase()} ${anomaly.direction}`,
          body: `Anomaly detected in ${anomaly.scope} ${anomaly.entity_id}:\n\n${anomaly.metric}: ${anomaly.value.toFixed(2)} (baseline: ${anomaly.baseline.toFixed(2)})\nZ-score: ${anomaly.score.toFixed(2)}\nSeverity: ${anomaly.severity}`,
          payload: {
            anomaly_id: null,
            profile_id: profileId,
            entity_type: anomaly.scope,
            entity_id: anomaly.entity_id,
          },
          status: 'queued',
        };

        await supabase.from('notifications_outbox').insert(notification);
      }
    }
  } catch (error) {
    console.error('Error creating anomaly alert:', error);
  }
}
