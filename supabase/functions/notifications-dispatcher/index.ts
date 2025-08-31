import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationBatch {
  user_id: string;
  notifications: any[];
  preferences: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Notifications dispatcher started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get queued notifications
    const { data: queuedNotifications, error: fetchError } = await supabase
      .from('notifications_outbox')
      .select(`
        *,
        user_prefs (
          slack_webhook,
          email,
          digest_frequency
        )
      `)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!queuedNotifications || queuedNotifications.length === 0) {
      console.log(`[${requestId}] No queued notifications found`);
      return new Response(
        JSON.stringify({ success: true, processed: 0, requestId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Found ${queuedNotifications.length} queued notifications`);

    // Group notifications by user and channel for batching
    const batches = new Map<string, NotificationBatch>();

    for (const notification of queuedNotifications) {
      const userPrefs = notification.user_prefs;
      if (!userPrefs) continue;

      const batchKey = `${notification.user_id}|${notification.channel}`;
      
      if (!batches.has(batchKey)) {
        batches.set(batchKey, {
          user_id: notification.user_id,
          notifications: [],
          preferences: userPrefs,
        });
      }

      batches.get(batchKey)!.notifications.push(notification);
    }

    let processed = 0;
    let errors = 0;

    // Process each batch
    for (const [batchKey, batch] of batches) {
      try {
        const [userId, channel] = batchKey.split('|');
        
        if (batch.preferences.digest_frequency === 'instant') {
          // Send individual notifications
          for (const notification of batch.notifications) {
            const success = await sendNotification(notification, channel, batch.preferences, requestId);
            if (success) {
              await markNotificationSent(supabase, notification.id);
              processed++;
            } else {
              await markNotificationFailed(supabase, notification.id, 'Send failed');
              errors++;
            }
          }
        } else {
          // Send digest
          const success = await sendDigest(batch.notifications, channel, batch.preferences, requestId);
          if (success) {
            for (const notification of batch.notifications) {
              await markNotificationSent(supabase, notification.id);
              processed++;
            }
          } else {
            for (const notification of batch.notifications) {
              await markNotificationFailed(supabase, notification.id, 'Digest send failed');
              errors++;
            }
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Error processing batch ${batchKey}:`, error);
        // Mark all notifications in this batch as failed
        for (const notification of batch.notifications) {
          await markNotificationFailed(supabase, notification.id, error.message);
          errors++;
        }
      }
    }

    console.log(`[${requestId}] Notifications processing completed: processed=${processed}, errors=${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        batches: batches.size,
        requestId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Notifications dispatcher error:`, error);
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendNotification(
  notification: any,
  channel: string,
  preferences: any,
  requestId: string
): Promise<boolean> {
  try {
    if (channel === 'slack' && preferences.slack_webhook) {
      return await sendSlackNotification(notification, preferences.slack_webhook, requestId);
    } else if (channel === 'email' && preferences.email) {
      return await sendEmailNotification(notification, preferences.email, requestId);
    }
    return false;
  } catch (error) {
    console.error(`[${requestId}] Error sending ${channel} notification:`, error);
    return false;
  }
}

async function sendSlackNotification(
  notification: any,
  webhookUrl: string,
  requestId: string
): Promise<boolean> {
  try {
    const deepLink = notification.payload?.entity_id 
      ? `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/dashboard?entity=${notification.payload.entity_id}`
      : `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/dashboard`;

    const slackMessage = {
      text: notification.subject,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: notification.subject,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: notification.body,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View in Dashboard",
              },
              url: deepLink,
              style: "primary",
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    const success = response.ok;
    if (!success) {
      console.error(`[${requestId}] Slack webhook failed:`, response.status, await response.text());
    }

    return success;
  } catch (error) {
    console.error(`[${requestId}] Slack notification error:`, error);
    return false;
  }
}

async function sendEmailNotification(
  notification: any,
  email: string,
  requestId: string
): Promise<boolean> {
  try {
    // For now, log the email that would be sent
    // In production, you'd integrate with your email provider (SendGrid, etc.)
    console.log(`[${requestId}] Would send email to ${email}:`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Body: ${notification.body}`);
    
    // Return true to simulate successful email sending
    // Replace with actual email service integration
    return true;
  } catch (error) {
    console.error(`[${requestId}] Email notification error:`, error);
    return false;
  }
}

async function sendDigest(
  notifications: any[],
  channel: string,
  preferences: any,
  requestId: string
): Promise<boolean> {
  try {
    // Group notifications by severity
    const critical = notifications.filter(n => n.subject.includes('CRITICAL'));
    const warnings = notifications.filter(n => n.subject.includes('WARN'));
    const info = notifications.filter(n => !n.subject.includes('CRITICAL') && !n.subject.includes('WARN'));

    const digestSubject = `PPC Pal Alert Digest (${notifications.length} alerts)`;
    
    let digestBody = `## Alert Summary\n\n`;
    if (critical.length > 0) digestBody += `🔴 **${critical.length} Critical alerts**\n`;
    if (warnings.length > 0) digestBody += `🟡 **${warnings.length} Warning alerts**\n`;
    if (info.length > 0) digestBody += `ℹ️ **${info.length} Info alerts**\n`;
    
    digestBody += `\n---\n\n`;

    // Add details for critical and warning alerts
    [...critical, ...warnings].slice(0, 10).forEach(notification => {
      digestBody += `**${notification.subject}**\n${notification.body}\n\n`;
    });

    if (notifications.length > 10) {
      digestBody += `*... and ${notifications.length - 10} more alerts*\n\n`;
    }

    digestBody += `[View all alerts in dashboard](${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/alerts)`;

    const digestNotification = {
      subject: digestSubject,
      body: digestBody,
      payload: { digest: true, count: notifications.length },
    };

    if (channel === 'slack' && preferences.slack_webhook) {
      return await sendSlackNotification(digestNotification, preferences.slack_webhook, requestId);
    } else if (channel === 'email' && preferences.email) {
      return await sendEmailNotification(digestNotification, preferences.email, requestId);
    }

    return false;
  } catch (error) {
    console.error(`[${requestId}] Digest sending error:`, error);
    return false;
  }
}

async function markNotificationSent(supabase: any, notificationId: string) {
  await supabase
    .from('notifications_outbox')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

async function markNotificationFailed(supabase: any, notificationId: string, error: string) {
  await supabase
    .from('notifications_outbox')
    .update({
      status: 'failed',
      error: error.slice(0, 500), // Truncate long errors
    })
    .eq('id', notificationId);
}