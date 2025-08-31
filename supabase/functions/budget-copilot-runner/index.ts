import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BudgetAnalysisRequest {
  profileId?: string;
}

interface CampaignBudgetData {
  campaign_id: string;
  daily_budget_micros: number;
  current_spend_micros: number;
  status: string;
}

interface PacingAnalysis {
  pace_ratio: number;
  forecast_eod_spend_micros: number;
  action: 'increase' | 'decrease' | 'hold';
  suggested_budget_micros?: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Budget Copilot runner started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const url = new URL(req.url);
    const profileId = url.searchParams.get('profileId');

    console.log(`[${requestId}] Processing budget analysis: profileId=${profileId || 'all'}`);

    // Start run tracking
    const runData = {
      profile_id: profileId || 'all',
      started_at: new Date().toISOString(),
    };

    const { data: run, error: runError } = await supabase
      .from('budget_pacing_runs')
      .insert(runData)
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create budget pacing run: ${runError.message}`);
    }

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

    const profileData = profiles || [];
    console.log(`[${requestId}] Found ${profileData.length} profiles to check`);

    let totalChecked = 0;
    let totalRecommendations = 0;

    for (const profile of profileData) {
      try {
        const analysis = await analyzeBudgetPacingForProfile(supabase, profile.profile_id, profile.user_id, requestId);
        totalChecked += analysis.checked;
        totalRecommendations += analysis.recommendations;
      } catch (error) {
        console.error(`[${requestId}] Error processing profile ${profile.profile_id}:`, error);
      }
    }

    // Update run status
    await supabase
      .from('budget_pacing_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        campaigns_checked: totalChecked,
        recs_created: totalRecommendations,
      })
      .eq('id', run.id);

    console.log(`[${requestId}] Budget analysis completed: checked=${totalChecked}, recommendations=${totalRecommendations}`);

    return new Response(
      JSON.stringify({
        success: true,
        runId: run.id,
        profilesChecked: profileData.length,
        campaignsChecked: totalChecked,
        recommendationsCreated: totalRecommendations,
        requestId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Budget Copilot error:`, error);
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzeBudgetPacingForProfile(
  supabase: any,
  profileId: string,
  userId: string,
  requestId: string
) {
  console.log(`[${requestId}] Analyzing budget pacing for profile ${profileId}`);

  let checked = 0;
  let recommendations = 0;

  // Get user's subscription plan for entitlements
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const userPlan = subscription?.plan || 'free';

  // Get active campaigns with daily budgets
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, amazon_campaign_id, name, daily_budget, status')
    .eq('connection_id', (await supabase
      .from('amazon_connections')
      .select('id')
      .eq('profile_id', profileId)
      .single()
    ).data?.id)
    .eq('status', 'enabled')
    .not('daily_budget', 'is', null)
    .gt('daily_budget', 0);

  if (campaignsError || !campaigns || campaigns.length === 0) {
    console.log(`[${requestId}] No eligible campaigns found for profile ${profileId}`);
    return { checked, recommendations };
  }

  const today = new Date().toISOString().slice(0, 10);
  
  for (const campaign of campaigns) {
    try {
      checked++;

      // Check for recent changes (cooldown)
      const { data: recentChanges } = await supabase
        .from('budget_recommendations')
        .select('applied_at')
        .eq('profile_id', profileId)
        .eq('campaign_id', campaign.amazon_campaign_id)
        .eq('state', 'applied')
        .gte('applied_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2 hours ago
        .order('applied_at', { ascending: false })
        .limit(1);

      if (recentChanges && recentChanges.length > 0) {
        console.log(`[${requestId}] Skipping campaign ${campaign.amazon_campaign_id} due to recent change`);
        continue;
      }

      // Get today's spend so far from AMS data
      const currentSpend = await getCurrentSpend(supabase, profileId, campaign.amazon_campaign_id, today);
      
      // Analyze pacing
      const analysis = await analyzeCampaignPacing(
        supabase,
        profileId,
        campaign.amazon_campaign_id,
        campaign.daily_budget,
        currentSpend,
        today,
        requestId
      );

      if (analysis.action !== 'hold') {
        // Create recommendation
        const recommendation = {
          profile_id: profileId,
          campaign_id: campaign.amazon_campaign_id,
          day: today,
          current_budget_micros: Math.round(campaign.daily_budget * 1000000),
          spend_so_far_micros: Math.round(currentSpend * 1000000),
          forecast_eod_spend_micros: analysis.forecast_eod_spend_micros,
          pace_ratio: analysis.pace_ratio,
          action: analysis.action,
          suggested_budget_micros: analysis.suggested_budget_micros,
          reason: analysis.reason,
          mode: 'dry_run', // Default to dry run
          state: 'open',
        };

        const { error: insertError } = await supabase
          .from('budget_recommendations')
          .upsert(recommendation, { 
            onConflict: 'profile_id,campaign_id,day',
            ignoreDuplicates: false 
          });

        if (!insertError) {
          recommendations++;
          console.log(`[${requestId}] Created ${analysis.action} recommendation for campaign ${campaign.amazon_campaign_id}`);

          // Check if auto-apply is enabled and user has pro plan
          const autoApplyEnabled = userPlan === 'pro' && await isAutoApplyEnabled(supabase, userId, profileId, campaign.amazon_campaign_id);

          if (autoApplyEnabled && analysis.action !== 'hold') {
            await enqueueAutoBudgetAction(supabase, recommendation, userId, requestId);
          } else {
            // Create alert for manual action
            await createBudgetAlert(supabase, recommendation, campaign.name, userId, profileId);
          }
        }
      }
    } catch (error) {
      console.error(`[${requestId}] Error analyzing campaign ${campaign.amazon_campaign_id}:`, error);
    }
  }

  return { checked, recommendations };
}

async function getCurrentSpend(
  supabase: any,
  profileId: string,
  campaignId: string,
  today: string
): Promise<number> {
  try {
    // Get spend from AMS traffic data for today
    const { data: trafficData } = await supabase
      .from('ams_messages_sp_traffic')
      .select('cost')
      .eq('profile_id', profileId)
      .eq('campaign_id', campaignId)
      .gte('hour_start', today + 'T00:00:00.000Z')
      .lt('hour_start', today + 'T23:59:59.999Z');

    if (!trafficData || trafficData.length === 0) return 0;

    return trafficData.reduce((sum, row) => sum + (row.cost || 0), 0);
  } catch (error) {
    console.error('Error getting current spend:', error);
    return 0;
  }
}

async function analyzeCampaignPacing(
  supabase: any,
  profileId: string,
  campaignId: string,
  dailyBudget: number,
  currentSpend: number,
  today: string,
  requestId: string
): Promise<PacingAnalysis> {
  
  const now = new Date();
  const todayStart = new Date(today + 'T00:00:00.000Z');
  const hoursElapsed = Math.max(1, (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60));
  const hoursRemaining = Math.max(0, 24 - hoursElapsed);

  // Get historical hourly patterns for this campaign (last 14 comparable days)
  const historicalPattern = await getHistoricalHourlyPattern(supabase, profileId, campaignId, now.getDay(), requestId);
  
  // Calculate expected spend to this time based on pattern
  const expectedSpendRatio = calculateExpectedSpendRatio(hoursElapsed, historicalPattern);
  const expectedSpendToTime = dailyBudget * expectedSpendRatio;
  
  // Calculate pace ratio
  const paceRatio = expectedSpendToTime > 0 ? currentSpend / expectedSpendToTime : 0;

  // Forecast end-of-day spend using EWMA of recent hours + baseline remainder
  const forecastEodSpend = await forecastEndOfDaySpend(
    supabase,
    profileId,
    campaignId,
    currentSpend,
    hoursElapsed,
    hoursRemaining,
    historicalPattern,
    requestId
  );

  const forecastEodSpendMicros = Math.round(forecastEodSpend * 1000000);

  // Determine action
  let action: 'increase' | 'decrease' | 'hold' = 'hold';
  let suggestedBudgetMicros: number | undefined;
  let reason = '';

  const budgetMicros = Math.round(dailyBudget * 1000000);

  if (paceRatio > 1.25 || forecastEodSpend > dailyBudget * 1.1) {
    action = 'decrease';
    const targetBudget = Math.max(forecastEodSpend * 0.9, dailyBudget * 0.6);
    suggestedBudgetMicros = Math.round(clampBudgetChange(dailyBudget, targetBudget) * 1000000);
    reason = `Running fast vs baseline (pace ${paceRatio.toFixed(2)}). Forecast spend ${forecastEodSpend.toFixed(2)} on ${dailyBudget.toFixed(2)} budget. Suggest decrease to preserve remaining hours.`;
  } else if (paceRatio < 0.75 || forecastEodSpend < dailyBudget * 0.9) {
    action = 'increase';
    const targetBudget = Math.min(forecastEodSpend * 1.1, dailyBudget * 1.4);
    suggestedBudgetMicros = Math.round(clampBudgetChange(dailyBudget, targetBudget) * 1000000);
    reason = `Running slow vs baseline (pace ${paceRatio.toFixed(2)}). Forecast spend ${forecastEodSpend.toFixed(2)} on ${dailyBudget.toFixed(2)} budget. Suggest increase to capture more traffic.`;
  } else {
    reason = `Pacing normally (${paceRatio.toFixed(2)}). Forecast spend ${forecastEodSpend.toFixed(2)} vs budget ${dailyBudget.toFixed(2)}.`;
  }

  return {
    pace_ratio: paceRatio,
    forecast_eod_spend_micros: forecastEodSpendMicros,
    action,
    suggested_budget_micros: suggestedBudgetMicros,
    reason,
  };
}

async function getHistoricalHourlyPattern(
  supabase: any,
  profileId: string,
  campaignId: string,
  dayOfWeek: number,
  requestId: string
): Promise<number[]> {
  
  // Get last 14 days of comparable weekdays
  const patterns = [];
  const today = new Date();
  
  for (let i = 7; i <= 14; i += 7) { // 1 and 2 weeks ago
    const compareDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    if (compareDate.getDay() === dayOfWeek) {
      const dateStr = compareDate.toISOString().slice(0, 10);
      
      const { data: hourlyData } = await supabase
        .from('ams_messages_sp_traffic')
        .select('cost, hour_start')
        .eq('profile_id', profileId)
        .eq('campaign_id', campaignId)
        .gte('hour_start', dateStr + 'T00:00:00.000Z')
        .lt('hour_start', dateStr + 'T23:59:59.999Z')
        .order('hour_start');

      if (hourlyData && hourlyData.length > 0) {
        // Create 24-hour pattern
        const dayPattern = new Array(24).fill(0);
        let totalSpend = 0;
        
        hourlyData.forEach(row => {
          const hour = new Date(row.hour_start).getUTCHours();
          dayPattern[hour] = row.cost || 0;
          totalSpend += row.cost || 0;
        });

        // Normalize to percentages
        if (totalSpend > 0) {
          patterns.push(dayPattern.map(spend => spend / totalSpend));
        }
      }
    }
  }

  // Average the patterns
  if (patterns.length === 0) {
    // Fallback: even distribution
    return new Array(24).fill(1/24);
  }

  const avgPattern = new Array(24).fill(0);
  patterns.forEach(pattern => {
    pattern.forEach((pct, hour) => {
      avgPattern[hour] += pct / patterns.length;
    });
  });

  return avgPattern;
}

function calculateExpectedSpendRatio(hoursElapsed: number, hourlyPattern: number[]): number {
  if (hoursElapsed >= 24) return 1.0;
  
  const currentHour = Math.floor(hoursElapsed);
  const minutesFraction = (hoursElapsed - currentHour);
  
  let expectedRatio = 0;
  
  // Sum complete hours
  for (let h = 0; h < currentHour; h++) {
    expectedRatio += hourlyPattern[h];
  }
  
  // Add partial hour if applicable
  if (currentHour < 24 && minutesFraction > 0) {
    expectedRatio += hourlyPattern[currentHour] * minutesFraction;
  }
  
  return Math.min(1.0, expectedRatio);
}

async function forecastEndOfDaySpend(
  supabase: any,
  profileId: string,
  campaignId: string,
  currentSpend: number,
  hoursElapsed: number,
  hoursRemaining: number,
  historicalPattern: number[],
  requestId: string
): Promise<number> {
  
  if (hoursRemaining <= 0) return currentSpend;

  try {
    // Get last 3 hours of actual spend for EWMA trend
    const last3Hours = [];
    const now = new Date();
    
    for (let i = 1; i <= 3; i++) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hourStart.toISOString().slice(0, 13) + ':00:00.000Z';
      
      const { data } = await supabase
        .from('ams_messages_sp_traffic')
        .select('cost')
        .eq('profile_id', profileId)
        .eq('campaign_id', campaignId)
        .eq('hour_start', hourKey);

      last3Hours.push(data?.[0]?.cost || 0);
    }

    // Calculate EWMA trend (more weight on recent hours)
    let trendSpendPerHour = 0;
    if (last3Hours.length > 0) {
      const weights = [0.5, 0.3, 0.2]; // Most recent hour gets highest weight
      let weightSum = 0;
      
      last3Hours.forEach((spend, i) => {
        if (i < weights.length) {
          trendSpendPerHour += spend * weights[i];
          weightSum += weights[i];
        }
      });
      
      if (weightSum > 0) {
        trendSpendPerHour = trendSpendPerHour / weightSum;
      }
    }

    // Calculate baseline remaining spend based on historical pattern
    const currentHour = Math.floor(hoursElapsed);
    let remainingPatternRatio = 0;
    
    for (let h = currentHour + 1; h < 24; h++) {
      remainingPatternRatio += historicalPattern[h] || 0;
    }

    // Estimate baseline remaining spend (assume same daily total as current trajectory)
    const projectedDailySpend = hoursElapsed > 0 ? currentSpend / calculateExpectedSpendRatio(hoursElapsed, historicalPattern) : currentSpend;
    const baselineRemaining = projectedDailySpend * remainingPatternRatio;

    // Combine trend and baseline (70% trend, 30% baseline for shorter term accuracy)
    const trendRemaining = trendSpendPerHour * hoursRemaining;
    const forecastRemaining = (trendRemaining * 0.7) + (baselineRemaining * 0.3);

    return currentSpend + Math.max(0, forecastRemaining);
    
  } catch (error) {
    console.error(`[${requestId}] Error in forecast calculation:`, error);
    // Fallback: simple linear projection
    return hoursElapsed > 0 ? currentSpend * (24 / hoursElapsed) : currentSpend;
  }
}

function clampBudgetChange(currentBudget: number, targetBudget: number): number {
  // Limit to 20% change per adjustment
  const maxChange = currentBudget * 0.2;
  const change = targetBudget - currentBudget;
  
  if (Math.abs(change) > maxChange) {
    return currentBudget + (change > 0 ? maxChange : -maxChange);
  }
  
  return targetBudget;
}

async function isAutoApplyEnabled(
  supabase: any,
  userId: string,
  profileId: string,
  campaignId: string
): Promise<boolean> {
  // Check if user has auto-pilot enabled for this campaign
  // This could be stored in user preferences or campaign settings
  // For now, return false as default (manual approval required)
  return false;
}

async function enqueueAutoBudgetAction(
  supabase: any,
  recommendation: any,
  userId: string,
  requestId: string
) {
  try {
    // Create idempotency key
    const idempotencyKey = `budget_${recommendation.profile_id}_${recommendation.campaign_id}_${recommendation.day}_${recommendation.suggested_budget_micros}`;

    const action = {
      action_type: 'set_campaign_budget',
      profile_id: recommendation.profile_id,
      rule_id: null, // Budget copilot actions don't belong to a specific rule
      payload: {
        campaign_id: recommendation.campaign_id,
        budget_micros: recommendation.suggested_budget_micros,
        reason: 'budget_copilot_auto',
      },
      idempotency_key: idempotencyKey,
      status: 'queued',
    };

    const { error } = await supabase.from('action_queue').insert(action);
    
    if (!error) {
      // Update recommendation mode to auto
      await supabase
        .from('budget_recommendations')
        .update({ mode: 'auto' })
        .eq('id', recommendation.id);
        
      console.log(`[${requestId}] Enqueued auto budget action for campaign ${recommendation.campaign_id}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error enqueuing auto budget action:`, error);
  }
}

async function createBudgetAlert(
  supabase: any,
  recommendation: any,
  campaignName: string,
  userId: string,
  profileId: string
) {
  try {
    const alert = {
      rule_id: null, // Budget copilot alerts don't belong to a specific rule
      profile_id: profileId,
      entity_type: 'campaign',
      entity_id: recommendation.campaign_id,
      title: `Budget ${recommendation.action} recommended`,
      message: `Campaign "${campaignName}" ${recommendation.reason}`,
      level: recommendation.action === 'decrease' ? 'warn' : 'info',
      state: 'new',
      data: {
        recommendation_id: recommendation.id,
        current_budget: recommendation.current_budget_micros / 1000000,
        suggested_budget: recommendation.suggested_budget_micros ? recommendation.suggested_budget_micros / 1000000 : null,
        action: recommendation.action,
        pace_ratio: recommendation.pace_ratio,
      },
    };

    await supabase.from('alerts').insert(alert);
  } catch (error) {
    console.error('Error creating budget alert:', error);
  }
}