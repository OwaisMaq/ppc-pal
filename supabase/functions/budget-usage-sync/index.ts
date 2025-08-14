import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Encryption helpers (same as sync-amazon-data)
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey() {
  const secret = Deno.env.get('ENCRYPTION_KEY') || '';
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt','decrypt']);
}

async function decryptText(enc: string): Promise<string> {
  try {
    if (!enc || !enc.includes(':')) return enc;
    const [ivB64, dataB64] = enc.split(':');
    const iv = fromBase64(ivB64);
    const key = await getKey();
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(dataB64));
    return textDecoder.decode(buf);
  } catch { return enc; }
}

async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      
      const status = res.status;
      if (status === 408 || status === 429 || (status >= 500 && status <= 599)) {
        console.warn(`Transient ${status} for ${url}, attempt ${attempt + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      console.warn(`Network error for ${url} attempt ${attempt + 1}/${maxAttempts}:`, err);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  return await fetch(url, options);
}

interface BudgetUsageData {
  campaignId: string;
  date: string;
  budget: {
    amount: number;
    currency: string;
    budgetType: string;
  };
  usage: {
    amount: number;
    percentage: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const { connectionId, dateRangeDays = 30 } = await req.json();
    
    console.log('Syncing budget usage for connection:', connectionId);

    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Connection not found');
    }

    const accessToken = await decryptText(connection.access_token);
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    
    if (!clientId) {
      throw new Error('Amazon Client ID not configured');
    }

    if (connection.status !== 'active') {
      throw new Error('Connection is not active');
    }

    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com';
    
    // First get all campaigns for this connection
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id, name')
      .eq('connection_id', connectionId);

    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns found for budget usage sync');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No campaigns to sync budget usage for',
        processed: 0
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Found ${campaigns.length} campaigns for budget usage sync`);

    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch budget usage data from Amazon API
    // Using campaigns endpoint with budget usage parameters
    const campaignIds = campaigns.map(c => c.amazon_campaign_id);
    const budgetUsageData: BudgetUsageData[] = [];

    // Process campaigns in batches to avoid request size limits
    const batchSize = 50;
    for (let i = 0; i < campaignIds.length; i += batchSize) {
      const batch = campaignIds.slice(i, i + batchSize);
      
      console.log(`Processing budget usage batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(campaignIds.length/batchSize)}`);

      // Amazon's Budget Usage API endpoint
      const budgetResponse = await fetchWithRetry(`${apiEndpoint}/budgets/usage/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignIds: batch,
          startDate,
          endDate,
          timeUnit: 'DAILY'
        })
      });

      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        
        // Process the response data
        if (budgetData.usage && Array.isArray(budgetData.usage)) {
          for (const usageEntry of budgetData.usage) {
            if (usageEntry.campaignId && usageEntry.date) {
              budgetUsageData.push({
                campaignId: usageEntry.campaignId.toString(),
                date: usageEntry.date,
                budget: {
                  amount: usageEntry.budget?.amount || 0,
                  currency: usageEntry.budget?.currency || 'USD',
                  budgetType: usageEntry.budget?.budgetType || 'DAILY'
                },
                usage: {
                  amount: usageEntry.usage?.amount || 0,
                  percentage: usageEntry.usage?.percentage || 0
                }
              });
            }
          }
        }
      } else {
        console.warn(`Budget usage API failed for batch: ${budgetResponse.status}`);
        // Continue with other batches even if one fails
      }

      // Add small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Retrieved ${budgetUsageData.length} budget usage records`);

    // Store budget usage data in database
    let processed = 0;
    for (const usage of budgetUsageData) {
      // Find the internal campaign ID
      const campaign = campaigns.find(c => c.amazon_campaign_id === usage.campaignId);
      if (!campaign) continue;

      const { error: upsertError } = await supabase
        .from('campaign_budget_usage')
        .upsert({
          campaign_id: campaign.id,
          date: usage.date,
          period_type: usage.budget.budgetType,
          currency: usage.budget.currency,
          budget_amount: usage.budget.amount,
          usage_amount: usage.usage.amount,
          usage_percentage: usage.usage.percentage,
          window_start: `${usage.date}T00:00:00.000Z`,
          window_end: `${usage.date}T23:59:59.999Z`
        }, {
          onConflict: 'campaign_id, date, period_type'
        });

      if (upsertError) {
        console.error('Error storing budget usage:', upsertError);
      } else {
        processed++;
      }
    }

    console.log(`Successfully processed ${processed} budget usage records`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      dateRange: `${startDate} to ${endDate}`,
      campaigns: campaigns.length
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("Budget usage sync error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Unexpected error during budget usage sync" 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});