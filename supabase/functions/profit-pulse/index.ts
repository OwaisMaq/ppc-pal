import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SavingsBreakdown {
  negativeKeywords: number;
  pausedTargets: number;
  bidOptimisation: number;
  acosImprovement: number;
  total: number;
}

interface WeekOverWeek {
  thisWeekSpend: number;
  lastWeekSpend: number;
  spendDelta: number;
  thisWeekSales: number;
  lastWeekSales: number;
  salesDelta: number;
  thisWeekAcos: number;
  lastWeekAcos: number;
}

interface ProfitPulseData {
  profileId: string;
  profileName: string;
  weekStart: string;
  weekEnd: string;
  actionsApplied: number;
  savings: SavingsBreakdown;
  winRate: number;
  totalOutcomes: number;
  positiveOutcomes: number;
  alertsRaised: number;
  quickWinsCount: number;
  quickWinsDetail: string;
  wow: WeekOverWeek;
}

function calculateSavingsFromActions(actions: any[]): SavingsBreakdown {
  let negativeKeywords = 0;
  let pausedTargets = 0;
  let bidOptimisation = 0;
  let acosImprovement = 0;

  actions.forEach((action) => {
    const payload = action.payload as any;

    switch (action.action_type) {
      case 'negative_keyword':
      case 'negative_product': {
        const avgCpc = payload?.estimated_cpc || 1.50;
        const preventedClicks = (payload?.historical_clicks || 10) * 7; // 7 days for weekly
        negativeKeywords += preventedClicks * avgCpc;
        break;
      }
      case 'pause_target':
      case 'pause_campaign': {
        const dailySpend = payload?.daily_spend || payload?.avg_daily_spend || 10;
        const daysSincePause = Math.min(
          7,
          Math.ceil(
            (Date.now() - new Date(action.applied_at || action.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
          )
        );
        pausedTargets += dailySpend * daysSincePause * 0.8;
        break;
      }
      case 'set_bid': {
        const oldBid = payload?.old_bid || payload?.current_bid || 0;
        const newBid = payload?.new_bid || 0;
        const bidReduction = oldBid - newBid;
        if (bidReduction > 0) {
          const estimatedClicks = payload?.estimated_clicks || 100;
          bidOptimisation += bidReduction * estimatedClicks;
        }
        break;
      }
      case 'acos_optimization': {
        const oldAcos = payload?.old_acos || 0;
        const newAcos = payload?.new_acos || 0;
        const sales = payload?.attributed_sales || 0;
        if (oldAcos > newAcos) {
          acosImprovement += ((oldAcos - newAcos) / 100) * sales;
        }
        break;
      }
    }
  });

  return {
    negativeKeywords,
    pausedTargets,
    bidOptimisation,
    acosImprovement,
    total: negativeKeywords + pausedTargets + bidOptimisation + acosImprovement,
  };
}

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function buildSlackBlocks(data: ProfitPulseData): any[] {
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 PPC Pal Weekly Profit Pulse' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Profile:* ${data.profileName || data.profileId}` },
        { type: 'mrkdwn', text: `*Week of* ${data.weekStart} – ${data.weekEnd}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Savings This Week:*\n+${formatCurrency(data.savings.total)}` },
        { type: 'mrkdwn', text: `*Actions Applied:*\n${data.actionsApplied}` },
      ],
    },
  ];

  if (data.totalOutcomes > 0) {
    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Win Rate:*\n${data.winRate.toFixed(0)}% positive outcomes` },
      ],
    });
  }

  // Savings breakdown
  const breakdownLines: string[] = [];
  if (data.savings.negativeKeywords > 0) breakdownLines.push(`• Wasted clicks blocked: ${formatCurrency(data.savings.negativeKeywords)}`);
  if (data.savings.bidOptimisation > 0) breakdownLines.push(`• Bids optimised: ${formatCurrency(data.savings.bidOptimisation)}`);
  if (data.savings.pausedTargets > 0) breakdownLines.push(`• Underperformers paused: ${formatCurrency(data.savings.pausedTargets)}`);
  if (data.savings.acosImprovement > 0) breakdownLines.push(`• ACoS improvements: ${formatCurrency(data.savings.acosImprovement)}`);

  if (breakdownLines.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Breakdown:*\n${breakdownLines.join('\n')}` },
    });
  }

  // Week-over-week
  if (data.wow.thisWeekSpend > 0 || data.wow.lastWeekSpend > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Week-over-Week:*\n• Spend: ${formatCurrency(data.wow.thisWeekSpend)} (${formatPercent(data.wow.spendDelta)})\n• Sales: ${formatCurrency(data.wow.thisWeekSales)} (${formatPercent(data.wow.salesDelta)})\n• ACoS: ${data.wow.thisWeekAcos.toFixed(1)}%${data.wow.lastWeekAcos > 0 ? ` (was ${data.wow.lastWeekAcos.toFixed(1)}%)` : ''}`,
        },
      }
    );
  }

  // Quick wins
  if (data.quickWinsCount > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Quick Wins Available:*\n${data.quickWinsDetail}` },
      }
    );
  }

  // Alerts
  if (data.alertsRaised > 0) {
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `⚠️ ${data.alertsRaised} alert${data.alertsRaised !== 1 ? 's' : ''} raised this week` },
      ],
    });
  }

  return blocks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const weekStart = weekAgo.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    const weekEnd = now.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });

    // Get all users with notification preferences set to weekly (or all users with slack webhooks)
    const { data: userPrefs } = await supabase
      .from('user_prefs')
      .select('user_id, slack_webhook, email, digest_frequency')
      .eq('digest_frequency', 'weekly');

    if (!userPrefs || userPrefs.length === 0) {
      console.log('No users with weekly digest frequency configured');
      return new Response(
        JSON.stringify({ success: true, message: 'No weekly subscribers', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const pref of userPrefs) {
      try {
        if (!pref.slack_webhook) {
          console.log(`User ${pref.user_id} has no Slack webhook, skipping`);
          continue;
        }

        // Get user's connections/profiles
        const { data: connections } = await supabase
          .from('amazon_connections')
          .select('profile_id, profile_name')
          .eq('user_id', pref.user_id);

        if (!connections || connections.length === 0) continue;

        for (const conn of connections) {
          // 1. Actions applied this week
          const { data: actions } = await supabase
            .from('action_queue')
            .select('*')
            .eq('profile_id', conn.profile_id)
            .eq('status', 'applied')
            .gte('applied_at', weekAgo.toISOString())
            .lte('applied_at', now.toISOString());

          const actionsApplied = actions?.length || 0;
          const savings = calculateSavingsFromActions(actions || []);

          // 2. Outcome win rate
          const { data: outcomes } = await supabase
            .from('action_outcomes')
            .select('outcome_status')
            .eq('profile_id', conn.profile_id)
            .gte('created_at', weekAgo.toISOString());

          const totalOutcomes = outcomes?.length || 0;
          const positiveOutcomes = outcomes?.filter(o => o.outcome_status === 'positive').length || 0;
          const winRate = totalOutcomes > 0 ? (positiveOutcomes / totalOutcomes) * 100 : 0;

          // 3. Alerts raised
          const { data: alerts } = await supabase
            .from('alerts')
            .select('id')
            .eq('profile_id', conn.profile_id)
            .gte('created_at', weekAgo.toISOString());

          const alertsRaised = alerts?.length || 0;

          // 4. Quick wins — high ACoS keywords
          const { data: highAcosKeywords } = await supabase
            .from('keywords')
            .select('id')
            .eq('profile_id', conn.profile_id)
            .gt('acos', 50)
            .eq('status', 'enabled');

          const quickWinsCount = highAcosKeywords?.length || 0;
          const quickWinsDetail = quickWinsCount > 0
            ? `${quickWinsCount} keyword${quickWinsCount !== 1 ? 's' : ''} with ACoS over 50%`
            : 'No quick wins right now — nice work!';

          // 5. Week-over-week performance
          const { data: thisWeekPerf } = await supabase
            .from('campaign_performance_history')
            .select('spend, sales')
            .eq('profile_id', conn.profile_id)
            .gte('date', weekAgo.toISOString().split('T')[0])
            .lte('date', now.toISOString().split('T')[0]);

          const { data: lastWeekPerf } = await supabase
            .from('campaign_performance_history')
            .select('spend, sales')
            .eq('profile_id', conn.profile_id)
            .gte('date', twoWeeksAgo.toISOString().split('T')[0])
            .lt('date', weekAgo.toISOString().split('T')[0]);

          const thisWeekSpend = thisWeekPerf?.reduce((s, r) => s + (r.spend || 0), 0) || 0;
          const thisWeekSales = thisWeekPerf?.reduce((s, r) => s + (r.sales || 0), 0) || 0;
          const lastWeekSpend = lastWeekPerf?.reduce((s, r) => s + (r.spend || 0), 0) || 0;
          const lastWeekSales = lastWeekPerf?.reduce((s, r) => s + (r.sales || 0), 0) || 0;

          const spendDelta = lastWeekSpend > 0 ? ((thisWeekSpend - lastWeekSpend) / lastWeekSpend) * 100 : 0;
          const salesDelta = lastWeekSales > 0 ? ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100 : 0;
          const thisWeekAcos = thisWeekSales > 0 ? (thisWeekSpend / thisWeekSales) * 100 : 0;
          const lastWeekAcos = lastWeekSales > 0 ? (lastWeekSpend / lastWeekSales) * 100 : 0;

          // Skip profiles with zero activity
          if (actionsApplied === 0 && alertsRaised === 0 && thisWeekSpend === 0) {
            continue;
          }

          const pulseData: ProfitPulseData = {
            profileId: conn.profile_id,
            profileName: conn.profile_name || conn.profile_id,
            weekStart,
            weekEnd,
            actionsApplied,
            savings,
            winRate,
            totalOutcomes,
            positiveOutcomes,
            alertsRaised,
            quickWinsCount,
            quickWinsDetail,
            wow: {
              thisWeekSpend,
              lastWeekSpend,
              spendDelta,
              thisWeekSales,
              lastWeekSales,
              salesDelta,
              thisWeekAcos,
              lastWeekAcos,
            },
          };

          // Send Slack notification
          const blocks = buildSlackBlocks(pulseData);
          const slackResp = await fetch(pref.slack_webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
          });

          if (slackResp.ok) {
            totalSent++;
            console.log(`Profit Pulse sent for profile ${conn.profile_id} to user ${pref.user_id}`);
          } else {
            const errText = await slackResp.text();
            console.error(`Slack send failed for user ${pref.user_id}: ${errText}`);
            errors.push(`Slack failed for ${pref.user_id}: ${slackResp.status}`);
          }

          // Email delivery via Resend
          const resendKey = Deno.env.get('RESEND_API_KEY');
          if (resendKey && pref.email) {
            try {
              const resend = new Resend(resendKey);
              const breakdownHtml = [];
              if (pulseData.savings.negativeKeywords > 0) breakdownHtml.push(`<li>Wasted clicks blocked: ${formatCurrency(pulseData.savings.negativeKeywords)}</li>`);
              if (pulseData.savings.bidOptimisation > 0) breakdownHtml.push(`<li>Bids optimised: ${formatCurrency(pulseData.savings.bidOptimisation)}</li>`);
              if (pulseData.savings.pausedTargets > 0) breakdownHtml.push(`<li>Underperformers paused: ${formatCurrency(pulseData.savings.pausedTargets)}</li>`);
              if (pulseData.savings.acosImprovement > 0) breakdownHtml.push(`<li>ACoS improvements: ${formatCurrency(pulseData.savings.acosImprovement)}</li>`);

              await resend.emails.send({
                from: 'PPC Pal <noreply@ppc-pal.com>',
                to: [pref.email],
                subject: `Weekly Profit Pulse — ${formatCurrency(pulseData.savings.total)} saved`,
                html: `
                  <h2>📊 PPC Pal Weekly Profit Pulse</h2>
                  <p><strong>Profile:</strong> ${pulseData.profileName}</p>
                  <p><strong>Week of</strong> ${pulseData.weekStart} – ${pulseData.weekEnd}</p>
                  <hr/>
                  <h3>Savings This Week: +${formatCurrency(pulseData.savings.total)}</h3>
                  <p>Actions Applied: ${pulseData.actionsApplied}</p>
                  ${pulseData.totalOutcomes > 0 ? `<p>Win Rate: ${pulseData.winRate.toFixed(0)}% positive outcomes</p>` : ''}
                  ${breakdownHtml.length > 0 ? `<h4>Breakdown:</h4><ul>${breakdownHtml.join('')}</ul>` : ''}
                  ${pulseData.wow.thisWeekSpend > 0 ? `
                    <h4>Week-over-Week:</h4>
                    <ul>
                      <li>Spend: ${formatCurrency(pulseData.wow.thisWeekSpend)} (${formatPercent(pulseData.wow.spendDelta)})</li>
                      <li>Sales: ${formatCurrency(pulseData.wow.thisWeekSales)} (${formatPercent(pulseData.wow.salesDelta)})</li>
                      <li>ACoS: ${pulseData.wow.thisWeekAcos.toFixed(1)}%</li>
                    </ul>
                  ` : ''}
                  ${pulseData.quickWinsCount > 0 ? `<p><strong>Quick Wins:</strong> ${pulseData.quickWinsDetail}</p>` : ''}
                  <hr/>
                  <p style="color:#666;font-size:12px;">Sent by PPC Pal • <a href="https://ppc-pal.lovable.app/settings">Manage preferences</a></p>
                `,
              });
              totalSent++;
              console.log(`Email sent to ${pref.email} for profile ${conn.profile_id}`);
            } catch (emailErr) {
              console.error(`Email send failed for ${pref.email}:`, emailErr);
              errors.push(`Email failed for ${pref.email}: ${emailErr instanceof Error ? emailErr.message : 'Unknown'}`);
            }
          }
        }
      } catch (userErr) {
        console.error(`Error processing user ${pref.user_id}:`, userErr);
        errors.push(`User ${pref.user_id}: ${userErr instanceof Error ? userErr.message : 'Unknown'}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Profit Pulse error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
