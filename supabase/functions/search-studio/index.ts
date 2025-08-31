import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchTermsFilters {
  profileId: string;
  from?: string;
  to?: string;
  q?: string;
  minClicks?: number;
  minSpend?: number;
  minImpr?: number;
  maxACOS?: number;
  minCVR?: number;
  includeBrand?: boolean;
  includeIgnored?: boolean;
  campaignId?: string;
  adGroupId?: string;
  hasConversion?: boolean;
  actionable?: 'harvest' | 'negative' | 'all';
  sort?: string;
  limit?: number;
  cursor?: string;
}

interface BulkKeywordPromotion {
  profileId: string;
  campaignId: string;
  adGroupId: string;
  searchTerm: string;
  matchType: 'exact' | 'phrase';
  bidMicros?: number;
}

interface BulkNegative {
  profileId: string;
  scope: 'campaign' | 'ad_group';
  campaignId?: string;
  adGroupId?: string;
  negativeType: 'keyword' | 'product';
  matchType?: 'exact' | 'phrase';
  value: string;
}

// Check user entitlements
async function checkEntitlement(supabase: any, userId: string, action: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();
  
  const plan = subscription?.plan || 'free';
  
  switch (action) {
    case 'bulk_apply':
      return plan !== 'free';
    case 'import_csv':
      return plan !== 'free';
    case 'negative_product':
      return plan === 'pro';
    case 'lists_tab':
      return plan === 'pro';
    default:
      return true;
  }
}

// Generate idempotency key
function generateIdempotencyKey(payload: any): string {
  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  return crypto.randomUUID(); // Simplified for now
}

// Get search terms with filters
async function getSearchTerms(supabase: any, filters: SearchTermsFilters) {
  console.log('Fetching search terms with filters:', filters);
  
  let query = supabase
    .from('v_studio_search_terms')
    .select('*')
    .eq('profile_id', filters.profileId);

  // Apply filters
  if (filters.q) {
    query = query.ilike('search_term', `%${filters.q}%`);
  }
  
  if (filters.minClicks) {
    query = query.gte('clicks_14d', filters.minClicks);
  }
  
  if (filters.minSpend) {
    query = query.gte('spend_14d', filters.minSpend);
  }
  
  if (filters.minImpr) {
    query = query.gte('impressions_14d', filters.minImpr);
  }
  
  if (filters.maxACOS) {
    query = query.lte('acos_14d', filters.maxACOS);
  }
  
  if (filters.minCVR) {
    query = query.gte('cvr_14d', filters.minCVR);
  }
  
  if (!filters.includeBrand) {
    query = query.eq('is_brand', false);
  }
  
  if (!filters.includeIgnored) {
    query = query.eq('is_ignored', false);
  }
  
  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }
  
  if (filters.adGroupId) {
    query = query.eq('ad_group_id', filters.adGroupId);
  }
  
  if (filters.hasConversion !== undefined) {
    if (filters.hasConversion) {
      query = query.gt('conv_14d', 0);
    } else {
      query = query.eq('conv_14d', 0);
    }
  }

  // Apply actionable filter using heuristics
  if (filters.actionable === 'harvest') {
    query = query.gte('conv_14d', 2).lte('acos_14d', 0.35).eq('is_brand', false).eq('is_ignored', false);
  } else if (filters.actionable === 'negative') {
    query = query.gte('clicks_14d', 20).eq('conv_14d', 0).gte('spend_14d', 5).eq('is_brand', false).eq('is_ignored', false);
  }

  // Apply sorting
  const sortBy = filters.sort || 'spend_14d';
  const sortOrder = sortBy.startsWith('-') ? 'asc' : 'desc';
  const sortColumn = sortBy.replace('-', '');
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Apply limit
  const limit = Math.min(filters.limit || 100, 1000);
  query = query.limit(limit);

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch search terms: ${error.message}`);
  }

  return data || [];
}

// Export search terms to CSV
function exportToCSV(data: any[]): string {
  const headers = [
    'profile_id', 'campaign_id', 'ad_group_id', 'search_term', 'clicks', 'impressions',
    'spend', 'sales', 'conversions', 'acos', 'ctr', 'cvr', 'is_brand', 'is_ignored',
    'recommended_action', 'match_type_suggestion', 'bid_micros_suggestion'
  ];
  
  const rows = data.map(row => [
    row.profile_id, row.campaign_id, row.ad_group_id, row.search_term,
    row.clicks_14d, row.impressions_14d, row.spend_14d, row.sales_14d, row.conv_14d,
    row.acos_14d, row.ctr_14d, row.cvr_14d, row.is_brand, row.is_ignored,
    // Recommended action based on heuristics
    row.conv_14d >= 2 && row.acos_14d <= 0.35 && !row.is_brand ? 'harvest' :
    row.clicks_14d >= 20 && row.conv_14d === 0 && row.spend_14d >= 5 && !row.is_brand ? 'negative' : '',
    'exact', // Default match type suggestion
    row.spend_14d > 0 ? Math.round((row.spend_14d / row.clicks_14d) * 1000000) : 0 // Suggested bid in micros
  ]);
  
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  return csv;
}

// Parse CSV for negatives import
function parseNegativesCSV(csvContent: string) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const requiredHeaders = ['profile_id', 'scope', 'negative_type', 'value'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  const results: BulkNegative[] = [];
  const errors: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Validate required fields
      if (!row.profile_id || !row.scope || !row.negative_type || !row.value) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }
      
      // Validate scope
      if (!['campaign', 'ad_group'].includes(row.scope)) {
        errors.push(`Row ${i + 1}: Invalid scope. Must be 'campaign' or 'ad_group'`);
        continue;
      }
      
      // Validate scope requirements
      if (row.scope === 'campaign' && !row.campaign_id) {
        errors.push(`Row ${i + 1}: campaign_id required for campaign scope`);
        continue;
      }
      
      if (row.scope === 'ad_group' && (!row.campaign_id || !row.ad_group_id)) {
        errors.push(`Row ${i + 1}: campaign_id and ad_group_id required for ad_group scope`);
        continue;
      }
      
      // Validate negative type
      if (!['keyword', 'product'].includes(row.negative_type)) {
        errors.push(`Row ${i + 1}: Invalid negative_type. Must be 'keyword' or 'product'`);
        continue;
      }
      
      // Validate match type for keywords
      if (row.negative_type === 'keyword' && row.match_type && !['exact', 'phrase'].includes(row.match_type)) {
        errors.push(`Row ${i + 1}: Invalid match_type for keyword. Must be 'exact' or 'phrase'`);
        continue;
      }
      
      results.push({
        profileId: row.profile_id,
        scope: row.scope,
        campaignId: row.campaign_id || undefined,
        adGroupId: row.ad_group_id || undefined,
        negativeType: row.negative_type,
        matchType: row.match_type || (row.negative_type === 'keyword' ? 'exact' : undefined),
        value: row.value
      });
    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }
  
  return { results, errors };
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const path = url.pathname.replace('/search-studio', '');

  try {
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route handling
    if (req.method === 'GET' && path === '/terms') {
      const filters: SearchTermsFilters = {
        profileId: url.searchParams.get('profileId') || '',
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
        q: url.searchParams.get('q') || undefined,
        minClicks: url.searchParams.get('minClicks') ? parseInt(url.searchParams.get('minClicks')!) : undefined,
        minSpend: url.searchParams.get('minSpend') ? parseFloat(url.searchParams.get('minSpend')!) : undefined,
        minImpr: url.searchParams.get('minImpr') ? parseInt(url.searchParams.get('minImpr')!) : undefined,
        maxACOS: url.searchParams.get('maxACOS') ? parseFloat(url.searchParams.get('maxACOS')!) : undefined,
        minCVR: url.searchParams.get('minCVR') ? parseFloat(url.searchParams.get('minCVR')!) : undefined,
        includeBrand: url.searchParams.get('includeBrand') === 'true',
        includeIgnored: url.searchParams.get('includeIgnored') === 'true',
        campaignId: url.searchParams.get('campaignId') || undefined,
        adGroupId: url.searchParams.get('adGroupId') || undefined,
        hasConversion: url.searchParams.get('hasConversion') ? url.searchParams.get('hasConversion') === 'true' : undefined,
        actionable: (url.searchParams.get('actionable') as any) || 'all',
        sort: url.searchParams.get('sort') || undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
        cursor: url.searchParams.get('cursor') || undefined,
      };

      const data = await getSearchTerms(supabase, filters);
      
      return new Response(
        JSON.stringify({ data, count: data.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET' && path === '/export') {
      const profileId = url.searchParams.get('profileId');
      if (!profileId) {
        return new Response(
          JSON.stringify({ error: 'profileId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const filters: SearchTermsFilters = { profileId };
      const data = await getSearchTerms(supabase, filters);
      const csv = exportToCSV(data);
      
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="search-terms-${profileId}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (req.method === 'POST' && path === '/bulk/promote-keywords') {
      const canBulkApply = await checkEntitlement(supabase, user.id, 'bulk_apply');
      if (!canBulkApply) {
        return new Response(
          JSON.stringify({ error: 'Bulk apply requires starter or pro plan' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const promotions: BulkKeywordPromotion[] = await req.json();
      const results = [];

      for (const promo of promotions) {
        const idempotencyKey = generateIdempotencyKey({
          profile_id: promo.profileId,
          action: 'create_keyword',
          campaign_id: promo.campaignId,
          ad_group_id: promo.adGroupId,
          keyword_text: promo.searchTerm,
          match_type: promo.matchType
        });

        const { error } = await supabase
          .from('action_queue')
          .insert({
            rule_id: null, // Manual action
            profile_id: promo.profileId,
            action_type: 'create_keyword',
            payload: {
              campaign_id: promo.campaignId,
              ad_group_id: promo.adGroupId,
              keyword_text: promo.searchTerm,
              match_type: promo.matchType,
              bid_micros: promo.bidMicros || 1000000,
              reason: 'Manual promotion from Search Term Studio'
            },
            idempotency_key: idempotencyKey
          });

        results.push({ 
          searchTerm: promo.searchTerm, 
          success: !error, 
          error: error?.message 
        });
      }

      return new Response(
        JSON.stringify({ results, queued: results.filter(r => r.success).length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && path === '/bulk/add-negatives') {
      const canBulkApply = await checkEntitlement(supabase, user.id, 'bulk_apply');
      if (!canBulkApply) {
        return new Response(
          JSON.stringify({ error: 'Bulk apply requires starter or pro plan' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const negatives: BulkNegative[] = await req.json();
      const results = [];

      for (const negative of negatives) {
        // Check if negative product targeting is allowed
        if (negative.negativeType === 'product') {
          const canNegativeProduct = await checkEntitlement(supabase, user.id, 'negative_product');
          if (!canNegativeProduct) {
            results.push({ 
              value: negative.value, 
              success: false, 
              error: 'Negative product targeting requires pro plan' 
            });
            continue;
          }
        }

        const actionType = negative.negativeType === 'keyword' ? 'add_negative_keyword' : 'add_negative_product';
        const idempotencyKey = generateIdempotencyKey({
          profile_id: negative.profileId,
          action: actionType,
          scope: negative.scope,
          campaign_id: negative.campaignId,
          ad_group_id: negative.adGroupId,
          value: negative.value,
          match_type: negative.matchType
        });

        const { error } = await supabase
          .from('action_queue')
          .insert({
            rule_id: null, // Manual action
            profile_id: negative.profileId,
            action_type: actionType,
            payload: {
              scope: negative.scope,
              campaign_id: negative.campaignId,
              ad_group_id: negative.adGroupId,
              negative_type: negative.negativeType,
              match_type: negative.matchType,
              value: negative.value,
              reason: 'Manual negative from Search Term Studio'
            },
            idempotency_key: idempotencyKey
          });

        results.push({ 
          value: negative.value, 
          success: !error, 
          error: error?.message 
        });
      }

      return new Response(
        JSON.stringify({ results, queued: results.filter(r => r.success).length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && path === '/import/negatives') {
      const canImport = await checkEntitlement(supabase, user.id, 'import_csv');
      if (!canImport) {
        return new Response(
          JSON.stringify({ error: 'CSV import requires starter or pro plan' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const csvContent = await req.text();
      const { results, errors } = parseNegativesCSV(csvContent);
      
      // Enqueue valid negatives
      let queued = 0;
      for (const negative of results) {
        try {
          const actionType = negative.negativeType === 'keyword' ? 'add_negative_keyword' : 'add_negative_product';
          const idempotencyKey = generateIdempotencyKey({
            profile_id: negative.profileId,
            action: actionType,
            scope: negative.scope,
            value: negative.value
          });

          const { error } = await supabase
            .from('action_queue')
            .insert({
              rule_id: null,
              profile_id: negative.profileId,
              action_type: actionType,
              payload: negative,
              idempotency_key: idempotencyKey
            });

          if (!error) queued++;
        } catch (error) {
          errors.push(`Failed to queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          inserted: queued, 
          skipped: results.length - queued, 
          errors: errors.slice(0, 100) // Limit error list
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Brand terms management
    if (req.method === 'GET' && path === '/brand-terms') {
      const profileId = url.searchParams.get('profileId');
      if (!profileId) {
        return new Response(
          JSON.stringify({ error: 'profileId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('brand_terms')
        .select('*')
        .eq('profile_id', profileId)
        .order('term');

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && path === '/brand-terms') {
      const { profileId, term } = await req.json();
      
      const { data, error } = await supabase
        .from('brand_terms')
        .insert({ profile_id: profileId, term })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE' && path.startsWith('/brand-terms/')) {
      const id = path.split('/')[2];
      
      const { error } = await supabase
        .from('brand_terms')
        .delete()
        .eq('id', id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Ignore list management
    if (req.method === 'POST' && path === '/ignore-list') {
      const { profileId, searchTerm, reason } = await req.json();
      
      const { data, error } = await supabase
        .from('st_ignore_list')
        .insert({ 
          profile_id: profileId, 
          search_term: searchTerm, 
          reason: reason || 'Manual ignore from Search Term Studio' 
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search Studio API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});