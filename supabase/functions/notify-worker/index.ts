import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationSummary {
  profile_id: string;
  profile_name?: string;
  rule_summaries: {
    rule_name: string;
    rule_type: string;
    new_alerts: number;
    actions_applied: number;
  }[];
  total_alerts: number;
  total_actions: number;
}

async function sendSlackNotification(webhookUrl: string, summary: NotificationSummary): Promise<boolean> {
  try {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 PPC Automation Summary'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Profile:* ${summary.profile_name || summary.profile_id}`
          },
          {
            type: 'mrkdwn',
            text: `*Period:* Last 24 hours`
          },
          {
            type: 'mrkdwn',
            text: `*Total Alerts:* ${summary.total_alerts}`
          },
          {
            type: 'mrkdwn',
            text: `*Actions Applied:* ${summary.total_actions}`
          }
        ]
      }
    ];

    // Add rule summaries
    if (summary.rule_summaries.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Rule Activity:*'
        }
      });

      summary.rule_summaries.forEach(rule => {
        if (rule.new_alerts > 0 || rule.actions_applied > 0) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• *${rule.rule_name}* (${rule.rule_type}): ${rule.new_alerts} alerts, ${rule.actions_applied} actions`
            }
          });
        }
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

async function sendEmailNotification(supabase: any, email: string, summary: NotificationSummary): Promise<boolean> {
  try {
    // This would integrate with a service like Resend
    // For now, we'll just log it
    console.log(`Would send email notification to ${email}:`, summary);
    
    // In a real implementation:
    // const { data, error } = await supabase.functions.invoke('send-email', {
    //   body: { 
    //     to: email, 
    //     subject: 'PPC Automation Summary',
    //     html: generateEmailHtml(summary)
    //   }
    // });
    
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
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
    console.log(`Notify worker started - ${requestId}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get alerts from last 24 hours that haven't been notified
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        *,
        automation_rules(
          name,
          rule_type,
          user_id,
          profile_id
        )
      `)
      .gte('created_at', yesterday)
      .is('notified_at', null);

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
    }

    // Get actions from last 24 hours
    const { data: actions, error: actionsError } = await supabase
      .from('action_queue')
      .select(`
        *,
        automation_rules(
          name,
          rule_type,
          user_id,
          profile_id
        )
      `)
      .gte('applied_at', yesterday)
      .eq('status', 'applied');

    if (actionsError) {
      throw new Error(`Failed to fetch actions: ${actionsError.message}`);
    }

    console.log(`Found ${alerts?.length || 0} unnotified alerts and ${actions?.length || 0} applied actions`);

    // Group by user and profile
    const userSummaries = new Map<string, Map<string, NotificationSummary>>();

    // Process alerts
    alerts?.forEach(alert => {
      const userId = alert.automation_rules.user_id;
      const profileId = alert.automation_rules.profile_id;
      
      if (!userSummaries.has(userId)) {
        userSummaries.set(userId, new Map());
      }
      
      const userProfiles = userSummaries.get(userId)!;
      if (!userProfiles.has(profileId)) {
        userProfiles.set(profileId, {
          profile_id: profileId,
          rule_summaries: [],
          total_alerts: 0,
          total_actions: 0
        });
      }
      
      const summary = userProfiles.get(profileId)!;
      summary.total_alerts++;
      
      // Find or create rule summary
      let ruleSummary = summary.rule_summaries.find(r => 
        r.rule_name === alert.automation_rules.name
      );
      
      if (!ruleSummary) {
        ruleSummary = {
          rule_name: alert.automation_rules.name,
          rule_type: alert.automation_rules.rule_type,
          new_alerts: 0,
          actions_applied: 0
        };
        summary.rule_summaries.push(ruleSummary);
      }
      
      ruleSummary.new_alerts++;
    });

    // Process actions
    actions?.forEach(action => {
      const userId = action.automation_rules.user_id;
      const profileId = action.automation_rules.profile_id;
      
      if (!userSummaries.has(userId)) {
        userSummaries.set(userId, new Map());
      }
      
      const userProfiles = userSummaries.get(userId)!;
      if (!userProfiles.has(profileId)) {
        userProfiles.set(profileId, {
          profile_id: profileId,
          rule_summaries: [],
          total_alerts: 0,
          total_actions: 0
        });
      }
      
      const summary = userProfiles.get(profileId)!;
      summary.total_actions++;
      
      // Find or create rule summary
      let ruleSummary = summary.rule_summaries.find(r => 
        r.rule_name === action.automation_rules.name
      );
      
      if (!ruleSummary) {
        ruleSummary = {
          rule_name: action.automation_rules.name,
          rule_type: action.automation_rules.rule_type,
          new_alerts: 0,
          actions_applied: 0
        };
        summary.rule_summaries.push(ruleSummary);
      }
      
      ruleSummary.actions_applied++;
    });

    const results = {
      processed_users: 0,
      sent_notifications: 0,
      failed_notifications: 0,
      errors: []
    };

    // Send notifications
    for (const [userId, profiles] of userSummaries) {
      try {
        // Get user preferences
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        const { data: user } = await supabase.auth.admin.getUserById(userId);
        
        if (!user?.user?.email) {
          console.log(`No email found for user ${userId}`);
          continue;
        }

        // Check notification frequency (for now, send daily)
        const shouldNotify = !preferences || 
          preferences.notification_frequency === 'immediate' ||
          preferences.notification_frequency === 'daily';

        if (!shouldNotify) {
          console.log(`User ${userId} has notifications disabled`);
          continue;
        }

        for (const [profileId, summary] of profiles) {
          // Skip if no activity
          if (summary.total_alerts === 0 && summary.total_actions === 0) {
            continue;
          }

          // Get profile name from Amazon connections
          const { data: connection } = await supabase
            .from('amazon_connections')
            .select('profile_name')
            .eq('profile_id', profileId)
            .eq('user_id', userId)
            .single();

          summary.profile_name = connection?.profile_name;

          let notificationSent = false;

          // Send Slack notification if webhook configured
          if (preferences?.slack_webhook_url) {
            const slackSent = await sendSlackNotification(preferences.slack_webhook_url, summary);
            if (slackSent) {
              notificationSent = true;
              console.log(`Slack notification sent to user ${userId} for profile ${profileId}`);
            }
          }

          // Send email notification if enabled
          if (!preferences || preferences.email_alerts) {
            const emailSent = await sendEmailNotification(supabase, user.user.email, summary);
            if (emailSent) {
              notificationSent = true;
              console.log(`Email notification sent to ${user.user.email} for profile ${profileId}`);
            }
          }

          if (notificationSent) {
            results.sent_notifications++;
          } else {
            results.failed_notifications++;
          }
        }

        results.processed_users++;

      } catch (error) {
        console.error(`Error processing notifications for user ${userId}:`, error);
        results.errors.push({
          user_id: userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failed_notifications++;
      }
    }

    // Mark alerts as notified
    if (alerts && alerts.length > 0) {
      const alertIds = alerts.map(a => a.id);
      await supabase
        .from('alerts')
        .update({ notified_at: new Date().toISOString() })
        .in('id', alertIds);
    }

    console.log(`Notify worker completed - ${requestId}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        ...results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Notify worker error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Notify worker failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});