import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionPayload {
  campaign_id?: string;
  ad_group_id?: string;
  target_id?: string;
  keyword_text?: string;
  match_type?: string;
  bid_micros?: number;
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

class ActionProcessor {
  constructor(private supabase: any) {}

  async processAction(action: QueuedAction): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Processing action ${action.id}: ${action.action_type}`);

      // Get Amazon connection for this profile
      const { data: connection, error: connError } = await this.supabase
        .from('amazon_connections')
        .select('*')
        .eq('profile_id', action.profile_id)
        .single();

      if (connError || !connection) {
        throw new Error(`No Amazon connection found for profile ${action.profile_id}`);
      }

      // Simulate API calls based on action type
      switch (action.action_type) {
        case 'pause_campaign':
          return await this.pauseCampaign(connection, action.payload);
        case 'create_keyword':
          return await this.createKeyword(connection, action.payload);
        case 'negative_keyword':
          return await this.addNegativeKeyword(connection, action.payload);
        case 'set_bid':
          return await this.setBid(connection, action.payload);
        case 'set_placement_adjust':
          return await this.setPlacementAdjust(connection, action.payload);
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }
    } catch (error) {
      console.error(`Error processing action ${action.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async pauseCampaign(connection: any, payload: ActionPayload): Promise<{ success: boolean; error?: string }> {
    console.log(`Would pause campaign ${payload.campaign_id} for profile ${connection.profile_id}`);
    
    // In a real implementation, this would call the Amazon Ads API
    // For now, we'll simulate a successful pause
    await this.simulateApiDelay();
    
    // Log the action for audit purposes
    console.log(`Campaign ${payload.campaign_id} paused due to ${payload.reason}`);
    
    return { success: true };
  }

  private async createKeyword(connection: any, payload: ActionPayload): Promise<{ success: boolean; error?: string }> {
    console.log(`Would create keyword "${payload.keyword_text}" (${payload.match_type}) in ad group ${payload.ad_group_id}`);
    
    await this.simulateApiDelay();
    
    // Validate required fields
    if (!payload.keyword_text || !payload.ad_group_id || !payload.match_type) {
      return { success: false, error: 'Missing required fields for keyword creation' };
    }
    
    console.log(`Keyword "${payload.keyword_text}" created with bid ${payload.bid_micros} micros`);
    
    return { success: true };
  }

  private async addNegativeKeyword(connection: any, payload: ActionPayload): Promise<{ success: boolean; error?: string }> {
    console.log(`Would add negative keyword "${payload.keyword_text}" (${payload.match_type})`);
    
    await this.simulateApiDelay();
    
    if (!payload.keyword_text || !payload.match_type) {
      return { success: false, error: 'Missing required fields for negative keyword' };
    }
    
    console.log(`Negative keyword "${payload.keyword_text}" added to ${payload.ad_group_id ? 'ad group' : 'campaign'}`);
    
    return { success: true };
  }

  private async setBid(connection: any, payload: ActionPayload): Promise<{ success: boolean; error?: string }> {
    console.log(`Would set bid for target ${payload.target_id} to ${payload.bid_micros} micros`);
    
    await this.simulateApiDelay();
    
    if (!payload.target_id || !payload.bid_micros) {
      return { success: false, error: 'Missing required fields for bid update' };
    }
    
    console.log(`Bid updated for target ${payload.target_id}`);
    
    return { success: true };
  }

  private async setPlacementAdjust(connection: any, payload: ActionPayload): Promise<{ success: boolean; error?: string }> {
    console.log(`Would set placement adjustment for campaign ${payload.campaign_id}`);
    
    await this.simulateApiDelay();
    
    if (!payload.campaign_id) {
      return { success: false, error: 'Missing campaign_id for placement adjustment' };
    }
    
    console.log(`Placement adjustment set for campaign ${payload.campaign_id}`);
    
    return { success: true };
  }

  private async simulateApiDelay(): Promise<void> {
    // Simulate API call delay and rate limiting
    const delay = Math.random() * 500 + 200; // 200-700ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Check if user can auto-apply actions
async function checkAutoApplyPermission(supabase: any, ruleId: string, actionType: string): Promise<boolean> {
  const { data: rule } = await supabase
    .from('automation_rules')
    .select(`
      mode,
      user_id,
      rule_type
    `)
    .eq('id', ruleId)
    .single();

  if (!rule || rule.mode === 'dry_run') {
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
      return ['create_keyword', 'negative_keyword'].includes(actionType);
    case 'pro':
      return true; // All actions allowed
    default:
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
    console.log(`Actions worker started - ${requestId}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const processor = new ActionProcessor(supabase);
    
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

    console.log(`Found ${actions?.length || 0} queued actions`);
    
    const results = {
      processed_actions: 0,
      successful_actions: 0,
      failed_actions: 0,
      skipped_actions: 0,
      errors: []
    };

    for (const action of actions || []) {
      try {
        // Check if user can auto-apply this action
        const canAutoApply = await checkAutoApplyPermission(supabase, action.rule_id, action.action_type);
        
        if (!canAutoApply) {
          console.log(`Action ${action.id} skipped - no auto-apply permission`);
          
          // Mark as skipped
          await supabase
            .from('action_queue')
            .update({
              status: 'skipped',
              error: 'Auto-apply not permitted for this plan/rule combination',
              applied_at: new Date().toISOString()
            })
            .eq('id', action.id);
          
          results.skipped_actions++;
          continue;
        }

        // Process the action
        const result = await processor.processAction(action);
        
        if (result.success) {
          // Mark as applied
          await supabase
            .from('action_queue')
            .update({
              status: 'applied',
              applied_at: new Date().toISOString()
            })
            .eq('id', action.id);
          
          results.successful_actions++;
          console.log(`Action ${action.id} applied successfully`);
        } else {
          // Mark as failed
          await supabase
            .from('action_queue')
            .update({
              status: 'failed',
              error: result.error,
              applied_at: new Date().toISOString()
            })
            .eq('id', action.id);
          
          results.failed_actions++;
          console.log(`Action ${action.id} failed: ${result.error}`);
        }

        results.processed_actions++;

      } catch (error) {
        console.error(`Error processing action ${action.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('action_queue')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            applied_at: new Date().toISOString()
          })
          .eq('id', action.id);
        
        results.failed_actions++;
        results.errors.push({
          action_id: action.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Actions worker completed - ${requestId}:`, results);

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
    console.error('Actions worker error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Actions worker failed',
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