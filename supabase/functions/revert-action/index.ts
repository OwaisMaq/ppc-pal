/**
 * Revert Action Edge Function
 * Reverses a previously applied action via Amazon Ads API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAmazonAdsClient } from '../_shared/amazon-ads-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevertRequest {
  action_id: string;
  reason?: string;
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
    // Get authorization header to identify user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RevertRequest = await req.json();
    const { action_id, reason } = body;

    if (!action_id) {
      return new Response(
        JSON.stringify({ error: 'Missing action_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RevertAction] Reverting action ${action_id} for user ${user.id}`);

    // Fetch the action with authorization check
    const { data: action, error: actionError } = await supabase
      .from('action_queue')
      .select(`
        *,
        automation_rules!action_queue_rule_id_fkey (user_id)
      `)
      .eq('id', action_id)
      .single();

    if (actionError || !action) {
      console.error(`[RevertAction] Action not found:`, actionError);
      return new Response(
        JSON.stringify({ error: 'Action not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this action
    if (action.automation_rules?.user_id !== user.id && action.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to revert this action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if action can be reverted
    if (action.status !== 'applied') {
      return new Response(
        JSON.stringify({ error: 'Only applied actions can be reverted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action.reverted_at) {
      return new Response(
        JSON.stringify({ error: 'Action has already been reverted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Amazon API client
    const client = await createAmazonAdsClient(supabase, action.profile_id);
    
    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Failed to establish Amazon API connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine revert action based on original action type
    let revertResult: { success: boolean; error?: string; apiResponse?: unknown };
    const payload = action.payload;
    const beforeState = action.before_state || {};

    try {
      switch (action.action_type) {
        case 'pause_campaign':
          // Revert by enabling the campaign
          revertResult = await client.updateCampaignState(payload.campaign_id, 'enabled');
          break;

        case 'enable_campaign':
          // Revert by pausing the campaign
          revertResult = await client.updateCampaignState(payload.campaign_id, 'paused');
          break;

        case 'update_campaign_budget':
          // Revert to previous budget
          if (beforeState.daily_budget_micros || payload.old_budget) {
            const previousBudget = (beforeState.daily_budget_micros || payload.old_budget) / 1000000;
            revertResult = await client.updateCampaignBudget(payload.campaign_id, previousBudget);
          } else {
            revertResult = { success: false, error: 'No previous budget recorded' };
          }
          break;

        case 'pause_keyword':
          revertResult = await client.updateKeywordState(payload.keyword_id, 'enabled');
          break;

        case 'enable_keyword':
          revertResult = await client.updateKeywordState(payload.keyword_id, 'paused');
          break;

        case 'set_bid':
        case 'set_keyword_bid':
          // Revert to previous bid
          if (beforeState.bid_micros || payload.old_bid) {
            const previousBid = (beforeState.bid_micros || payload.old_bid) / 1000000;
            if (payload.target_id) {
              revertResult = await client.updateTargetBid(payload.target_id, previousBid);
            } else if (payload.keyword_id) {
              revertResult = await client.updateKeywordBid(payload.keyword_id, previousBid);
            } else {
              revertResult = { success: false, error: 'No target or keyword ID found' };
            }
          } else {
            revertResult = { success: false, error: 'No previous bid recorded' };
          }
          break;

        case 'pause_target':
          revertResult = await client.updateTargetState(payload.target_id, 'enabled');
          break;

        case 'enable_target':
          revertResult = await client.updateTargetState(payload.target_id, 'paused');
          break;

        case 'pause_ad_group':
          revertResult = await client.updateAdGroupState(payload.ad_group_id, 'enabled');
          break;

        case 'enable_ad_group':
          revertResult = await client.updateAdGroupState(payload.ad_group_id, 'paused');
          break;

        case 'negative_keyword':
        case 'create_keyword':
          // Cannot easily revert keyword creation - would need to archive/delete
          revertResult = { 
            success: false, 
            error: 'Keyword creation cannot be automatically reverted. Please archive the keyword manually in Amazon Ads console.' 
          };
          break;

        default:
          revertResult = { 
            success: false, 
            error: `Revert not implemented for action type: ${action.action_type}` 
          };
      }
    } catch (apiError) {
      revertResult = { 
        success: false, 
        error: apiError instanceof Error ? apiError.message : 'API call failed' 
      };
    }

    if (revertResult.success) {
      // Mark action as reverted
      await supabase
        .from('action_queue')
        .update({
          reverted_at: new Date().toISOString(),
          revert_reason: reason || 'User requested revert',
        })
        .eq('id', action_id);

      // Update outcome status if exists
      await supabase
        .from('action_outcomes')
        .update({
          outcome_status: 'inconclusive',
        })
        .eq('action_id', action_id);

      console.log(`[RevertAction] Successfully reverted action ${action_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Action reverted successfully',
          apiResponse: revertResult.apiResponse,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`[RevertAction] Failed to revert action ${action_id}:`, revertResult.error);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: revertResult.error || 'Failed to revert action',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[RevertAction] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Revert action failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
