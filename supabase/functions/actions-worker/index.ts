/**
 * Actions Worker Edge Function
 * Processes queued optimization actions and executes them via Amazon Advertising API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { 
  createAmazonAdsClient, 
  AmazonAdsApiClient, 
  ApiResponse 
} from '../_shared/amazon-ads-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionPayload {
  campaign_id?: string;
  ad_group_id?: string;
  target_id?: string;
  keyword_id?: string;
  keyword_text?: string;
  match_type?: string;
  bid_micros?: number;
  daily_budget_micros?: number;
  state?: 'enabled' | 'paused' | 'archived';
  placement_top?: number;
  placement_product_page?: number;
  reason?: string;
  [key: string]: any;
}

interface QueuedAction {
  id: string;
  rule_id: string;
  profile_id: string;
  action_type: string;
  payload: ActionPayload;
  idempotency_key: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  apiResponse?: any;
  requestId?: string;
}

/**
 * Process a single action using the Amazon Ads API
 */
class ActionProcessor {
  constructor(
    private supabase: any,
    private client: AmazonAdsApiClient
  ) {}

  async processAction(action: QueuedAction): Promise<ActionResult> {
    try {
      console.log(`[ActionProcessor] Processing ${action.action_type} for action ${action.id}`);

      switch (action.action_type) {
        case 'pause_campaign':
          return await this.pauseCampaign(action.payload);
        case 'enable_campaign':
          return await this.enableCampaign(action.payload);
        case 'update_campaign_budget':
          return await this.updateCampaignBudget(action.payload);
        case 'create_keyword':
          return await this.createKeyword(action.payload);
        case 'negative_keyword':
          return await this.addNegativeKeyword(action.payload);
        case 'set_bid':
          return await this.setBid(action.payload);
        case 'set_keyword_bid':
          return await this.setKeywordBid(action.payload);
        case 'pause_keyword':
          return await this.pauseKeyword(action.payload);
        case 'enable_keyword':
          return await this.enableKeyword(action.payload);
        case 'pause_target':
          return await this.pauseTarget(action.payload);
        case 'enable_target':
          return await this.enableTarget(action.payload);
        case 'set_placement_adjust':
          return await this.setPlacementAdjust(action.payload);
        case 'pause_ad_group':
          return await this.pauseAdGroup(action.payload);
        case 'enable_ad_group':
          return await this.enableAdGroup(action.payload);
        case 'update_ad_group_bid':
          return await this.updateAdGroupBid(action.payload);
        default:
          return { 
            success: false, 
            error: `Unknown action type: ${action.action_type}` 
          };
      }
    } catch (error) {
      console.error(`[ActionProcessor] Error processing action ${action.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ========== CAMPAIGN ACTIONS ==========

  private async pauseCampaign(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.campaign_id) {
      return { success: false, error: 'Missing campaign_id' };
    }

    console.log(`[ActionProcessor] Pausing campaign ${payload.campaign_id}`);
    const response = await this.client.updateCampaignState(payload.campaign_id, 'paused');
    
    return this.formatResult(response, `Campaign ${payload.campaign_id} paused`);
  }

  private async enableCampaign(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.campaign_id) {
      return { success: false, error: 'Missing campaign_id' };
    }

    console.log(`[ActionProcessor] Enabling campaign ${payload.campaign_id}`);
    const response = await this.client.updateCampaignState(payload.campaign_id, 'enabled');
    
    return this.formatResult(response, `Campaign ${payload.campaign_id} enabled`);
  }

  private async updateCampaignBudget(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.campaign_id || !payload.daily_budget_micros) {
      return { success: false, error: 'Missing campaign_id or daily_budget_micros' };
    }

    // Convert micros to dollars
    const dailyBudget = payload.daily_budget_micros / 1000000;
    
    console.log(`[ActionProcessor] Updating campaign ${payload.campaign_id} budget to ${dailyBudget}`);
    const response = await this.client.updateCampaignBudget(payload.campaign_id, dailyBudget);
    
    return this.formatResult(response, `Campaign ${payload.campaign_id} budget updated to ${dailyBudget}`);
  }

  private async setPlacementAdjust(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.campaign_id) {
      return { success: false, error: 'Missing campaign_id' };
    }

    const adjustments: Array<{ predicate: 'PLACEMENT_TOP' | 'PLACEMENT_PRODUCT_PAGE'; percentage: number }> = [];
    
    if (payload.placement_top !== undefined) {
      adjustments.push({ predicate: 'PLACEMENT_TOP', percentage: payload.placement_top });
    }
    if (payload.placement_product_page !== undefined) {
      adjustments.push({ predicate: 'PLACEMENT_PRODUCT_PAGE', percentage: payload.placement_product_page });
    }

    if (adjustments.length === 0) {
      return { success: false, error: 'No placement adjustments specified' };
    }

    console.log(`[ActionProcessor] Setting placement adjustments for campaign ${payload.campaign_id}`);
    const response = await this.client.updateCampaignBidding(payload.campaign_id, { adjustments });
    
    return this.formatResult(response, `Campaign ${payload.campaign_id} placement adjustments updated`);
  }

  // ========== KEYWORD ACTIONS ==========

  private async createKeyword(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.ad_group_id || !payload.keyword_text || !payload.match_type) {
      return { success: false, error: 'Missing required fields: ad_group_id, keyword_text, match_type' };
    }

    // Convert micros to dollars for bid
    const bid = payload.bid_micros ? payload.bid_micros / 1000000 : undefined;

    console.log(`[ActionProcessor] Creating keyword "${payload.keyword_text}" in ad group ${payload.ad_group_id}`);
    const response = await this.client.createKeyword({
      adGroupId: payload.ad_group_id,
      keywordText: payload.keyword_text,
      matchType: payload.match_type as 'broad' | 'phrase' | 'exact',
      bid,
      state: 'enabled',
    });
    
    return this.formatResult(response, `Keyword "${payload.keyword_text}" created`);
  }

  private async addNegativeKeyword(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.keyword_text || !payload.match_type) {
      return { success: false, error: 'Missing required fields: keyword_text, match_type' };
    }

    const matchType = payload.match_type.startsWith('negative') 
      ? payload.match_type as 'negativeExact' | 'negativePhrase'
      : `negative${payload.match_type.charAt(0).toUpperCase() + payload.match_type.slice(1)}` as 'negativeExact' | 'negativePhrase';

    let response: ApiResponse;

    if (payload.ad_group_id && payload.campaign_id) {
      // Ad group level negative keyword
      console.log(`[ActionProcessor] Creating ad group negative keyword "${payload.keyword_text}"`);
      response = await this.client.createAdGroupNegativeKeyword(
        payload.campaign_id,
        payload.ad_group_id,
        payload.keyword_text,
        matchType
      );
    } else if (payload.campaign_id) {
      // Campaign level negative keyword
      console.log(`[ActionProcessor] Creating campaign negative keyword "${payload.keyword_text}"`);
      response = await this.client.createCampaignNegativeKeyword(
        payload.campaign_id,
        payload.keyword_text,
        matchType
      );
    } else {
      return { success: false, error: 'Missing campaign_id for negative keyword' };
    }
    
    return this.formatResult(response, `Negative keyword "${payload.keyword_text}" created`);
  }

  private async setKeywordBid(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.keyword_id || !payload.bid_micros) {
      return { success: false, error: 'Missing keyword_id or bid_micros' };
    }

    const bid = payload.bid_micros / 1000000;
    
    console.log(`[ActionProcessor] Setting keyword ${payload.keyword_id} bid to ${bid}`);
    const response = await this.client.updateKeywordBid(payload.keyword_id, bid);
    
    return this.formatResult(response, `Keyword ${payload.keyword_id} bid updated to ${bid}`);
  }

  private async pauseKeyword(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.keyword_id) {
      return { success: false, error: 'Missing keyword_id' };
    }

    console.log(`[ActionProcessor] Pausing keyword ${payload.keyword_id}`);
    const response = await this.client.updateKeywordState(payload.keyword_id, 'paused');
    
    return this.formatResult(response, `Keyword ${payload.keyword_id} paused`);
  }

  private async enableKeyword(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.keyword_id) {
      return { success: false, error: 'Missing keyword_id' };
    }

    console.log(`[ActionProcessor] Enabling keyword ${payload.keyword_id}`);
    const response = await this.client.updateKeywordState(payload.keyword_id, 'enabled');
    
    return this.formatResult(response, `Keyword ${payload.keyword_id} enabled`);
  }

  // ========== TARGET ACTIONS ==========

  private async setBid(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.target_id || !payload.bid_micros) {
      return { success: false, error: 'Missing target_id or bid_micros' };
    }

    const bid = payload.bid_micros / 1000000;
    
    console.log(`[ActionProcessor] Setting target ${payload.target_id} bid to ${bid}`);
    const response = await this.client.updateTargetBid(payload.target_id, bid);
    
    return this.formatResult(response, `Target ${payload.target_id} bid updated to ${bid}`);
  }

  private async pauseTarget(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.target_id) {
      return { success: false, error: 'Missing target_id' };
    }

    console.log(`[ActionProcessor] Pausing target ${payload.target_id}`);
    const response = await this.client.updateTargetState(payload.target_id, 'paused');
    
    return this.formatResult(response, `Target ${payload.target_id} paused`);
  }

  private async enableTarget(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.target_id) {
      return { success: false, error: 'Missing target_id' };
    }

    console.log(`[ActionProcessor] Enabling target ${payload.target_id}`);
    const response = await this.client.updateTargetState(payload.target_id, 'enabled');
    
    return this.formatResult(response, `Target ${payload.target_id} enabled`);
  }

  // ========== AD GROUP ACTIONS ==========

  private async pauseAdGroup(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.ad_group_id) {
      return { success: false, error: 'Missing ad_group_id' };
    }

    console.log(`[ActionProcessor] Pausing ad group ${payload.ad_group_id}`);
    const response = await this.client.updateAdGroupState(payload.ad_group_id, 'paused');
    
    return this.formatResult(response, `Ad group ${payload.ad_group_id} paused`);
  }

  private async enableAdGroup(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.ad_group_id) {
      return { success: false, error: 'Missing ad_group_id' };
    }

    console.log(`[ActionProcessor] Enabling ad group ${payload.ad_group_id}`);
    const response = await this.client.updateAdGroupState(payload.ad_group_id, 'enabled');
    
    return this.formatResult(response, `Ad group ${payload.ad_group_id} enabled`);
  }

  private async updateAdGroupBid(payload: ActionPayload): Promise<ActionResult> {
    if (!payload.ad_group_id || !payload.bid_micros) {
      return { success: false, error: 'Missing ad_group_id or bid_micros' };
    }

    const bid = payload.bid_micros / 1000000;
    
    console.log(`[ActionProcessor] Setting ad group ${payload.ad_group_id} default bid to ${bid}`);
    const response = await this.client.updateAdGroupBid(payload.ad_group_id, bid);
    
    return this.formatResult(response, `Ad group ${payload.ad_group_id} default bid updated to ${bid}`);
  }

  // ========== HELPERS ==========

  private formatResult(response: ApiResponse, successMessage: string): ActionResult {
    if (response.success) {
      console.log(`[ActionProcessor] Success: ${successMessage}`);
      return {
        success: true,
        apiResponse: response.data,
        requestId: response.requestId,
      };
    } else {
      console.error(`[ActionProcessor] Failed: ${response.error}`);
      return {
        success: false,
        error: response.error,
        apiResponse: response.data,
        requestId: response.requestId,
      };
    }
  }
}

/**
 * Check if user has permission to auto-apply actions based on plan
 */
async function checkAutoApplyPermission(
  supabase: any, 
  ruleId: string, 
  actionType: string
): Promise<boolean> {
  const { data: rule } = await supabase
    .from('automation_rules')
    .select('mode, user_id, rule_type')
    .eq('id', ruleId)
    .single();

  if (!rule || rule.mode === 'dry_run') {
    return false;
  }

  // If mode is 'suggestion', actions require manual approval
  if (rule.mode === 'suggestion') {
    return false;
  }

  // Get user's plan
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('plan')
    .eq('user_id', rule.user_id)
    .single();
  
  const plan = subscription?.plan || 'free';
  
  // Check action permissions by plan
  switch (plan) {
    case 'free':
      return false; // No auto-apply for free tier
    case 'starter':
      // Starter: only keyword management
      return ['create_keyword', 'negative_keyword', 'pause_keyword', 'enable_keyword'].includes(actionType);
    case 'pro':
      return true; // All actions allowed
    default:
      return false;
  }
}

/**
 * Main handler
 */
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
    console.log(`[ActionsWorker] Started - ${requestId}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get queued actions (batch of 25)
    const { data: actions, error: actionsError } = await supabase
      .from('action_queue')
      .select('*')
      .eq('status', 'queued')
      .order('created_at')
      .limit(25);

    if (actionsError) {
      throw new Error(`Failed to fetch actions: ${actionsError.message}`);
    }

    console.log(`[ActionsWorker] Found ${actions?.length || 0} queued actions`);
    
    const results = {
      processed_actions: 0,
      successful_actions: 0,
      failed_actions: 0,
      skipped_actions: 0,
      errors: [] as Array<{ action_id: string; error: string }>,
    };

    // Group actions by profile_id for efficient API client reuse
    const actionsByProfile = new Map<string, QueuedAction[]>();
    for (const action of actions || []) {
      const profileActions = actionsByProfile.get(action.profile_id) || [];
      profileActions.push(action);
      actionsByProfile.set(action.profile_id, profileActions);
    }

    // Process actions grouped by profile
    for (const [profileId, profileActions] of actionsByProfile) {
      // Create Amazon API client for this profile
      const client = await createAmazonAdsClient(supabase, profileId);
      
      if (!client) {
        console.error(`[ActionsWorker] Failed to create API client for profile ${profileId}`);
        
        // Mark all actions for this profile as failed
        for (const action of profileActions) {
          await supabase
            .from('action_queue')
            .update({
              status: 'failed',
              error: 'Failed to establish Amazon API connection - token may be expired',
              applied_at: new Date().toISOString(),
            })
            .eq('id', action.id);
          
          results.failed_actions++;
          results.errors.push({
            action_id: action.id,
            error: 'Failed to establish Amazon API connection',
          });
        }
        continue;
      }

      const processor = new ActionProcessor(supabase, client);

      for (const action of profileActions) {
        try {
          // Check if user can auto-apply this action
          const canAutoApply = await checkAutoApplyPermission(supabase, action.rule_id, action.action_type);
          
          if (!canAutoApply) {
            console.log(`[ActionsWorker] Action ${action.id} skipped - no auto-apply permission`);
            
            await supabase
              .from('action_queue')
              .update({
                status: 'skipped',
                error: 'Auto-apply not permitted for this plan/rule combination',
                applied_at: new Date().toISOString(),
              })
              .eq('id', action.id);
            
            results.skipped_actions++;
            continue;
          }

          // Process the action
          const result = await processor.processAction(action);
          
          // Prepare update data
          const updateData: any = {
            applied_at: new Date().toISOString(),
          };

          if (result.success) {
            updateData.status = 'applied';
            updateData.amazon_request_id = result.requestId;
            updateData.amazon_api_response = result.apiResponse;
            results.successful_actions++;
            console.log(`[ActionsWorker] Action ${action.id} applied successfully`);
          } else {
            updateData.status = 'failed';
            updateData.error = result.error;
            updateData.amazon_request_id = result.requestId;
            updateData.amazon_api_response = result.apiResponse;
            results.failed_actions++;
            console.log(`[ActionsWorker] Action ${action.id} failed: ${result.error}`);
          }

          await supabase
            .from('action_queue')
            .update(updateData)
            .eq('id', action.id);

          results.processed_actions++;

        } catch (error) {
          console.error(`[ActionsWorker] Error processing action ${action.id}:`, error);
          
          await supabase
            .from('action_queue')
            .update({
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              applied_at: new Date().toISOString(),
            })
            .eq('id', action.id);
          
          results.failed_actions++;
          results.errors.push({
            action_id: action.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // Rate limiting delay between actions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[ActionsWorker] Completed - ${requestId}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        ...results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ActionsWorker] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Actions worker failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
