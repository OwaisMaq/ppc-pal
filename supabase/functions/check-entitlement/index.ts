import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EntitlementCheck {
  feature: string;
  limit?: string;
  value?: number;
}

interface EntitlementResponse {
  allowed: boolean;
  plan: string;
  feature_value?: boolean;
  limit_value?: number;
  current_usage?: number;
  message?: string;
}

async function checkEntitlement(
  supabase: any, 
  userId: string, 
  check: EntitlementCheck
): Promise<EntitlementResponse> {
  
  // Get user's billing subscription
  const { data: billing, error: billingError } = await supabase
    .from('billing_subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (billingError) {
    console.error('Failed to get billing subscription:', billingError);
    return {
      allowed: false,
      plan: 'free',
      message: 'Error checking subscription'
    };
  }

  const plan = billing?.plan || 'free';
  const status = billing?.status || 'active';

  // If subscription is not active, fall back to free plan
  if (status !== 'active' && status !== 'trialing') {
    return {
      allowed: false,
      plan: 'free',
      message: 'Subscription is not active'
    };
  }

  // Get plan entitlements
  const { data: entitlements, error: entitlementsError } = await supabase
    .from('plan_entitlements')
    .select('features, limits')
    .eq('plan', plan)
    .single();

  if (entitlementsError || !entitlements) {
    console.error('Failed to get plan entitlements:', entitlementsError);
    return {
      allowed: false,
      plan,
      message: 'Error checking plan entitlements'
    };
  }

  // Check feature entitlement
  if (check.feature) {
    const featureAllowed = entitlements.features[check.feature] === true;
    
    if (!featureAllowed) {
      return {
        allowed: false,
        plan,
        feature_value: false,
        message: `Feature '${check.feature}' not available in ${plan} plan`
      };
    }

    // If no limit check needed, feature is allowed
    if (!check.limit) {
      return {
        allowed: true,
        plan,
        feature_value: true
      };
    }
  }

  // Check limit entitlement
  if (check.limit) {
    const limitValue = entitlements.limits[check.limit];
    
    if (typeof limitValue !== 'number') {
      return {
        allowed: false,
        plan,
        message: `Limit '${check.limit}' not defined for ${plan} plan`
      };
    }

    const currentValue = check.value || 0;
    
    return {
      allowed: currentValue < limitValue,
      plan,
      limit_value: limitValue,
      current_usage: currentValue,
      message: currentValue >= limitValue ? `Limit exceeded: ${currentValue}/${limitValue}` : undefined
    };
  }

  return {
    allowed: true,
    plan
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const checks: EntitlementCheck[] = Array.isArray(body) ? body : [body];

    // Process entitlement checks
    const results: Record<string, EntitlementResponse> = {};
    
    for (const check of checks) {
      const key = check.feature || check.limit || 'unknown';
      results[key] = await checkEntitlement(supabase, user.id, check);
    }

    // If single check, return just the result
    const response = checks.length === 1 ? results[Object.keys(results)[0]] : results;

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Entitlement check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Entitlement check failed',
        message: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});